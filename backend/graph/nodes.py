import asyncio

import tiktoken
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.language_models import BaseChatModel  # type: ignore[import]
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..prompts.templates import (
    build_map_prompt,
    build_reduce_prompt,
    build_agent_prompt,
    build_flashcard_prompt,
)
from .flashcards import parse_flashcards
from .state import NoteState

TOKEN_LIMIT = 12_000
CHUNK_CHARS = 30_000
MAP_CONCURRENCY = 5
PROMPT_CHAR_CAP = 60_000


def _text_of(response) -> str:
    raw = response.content
    if isinstance(raw, list):
        raw = "".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in raw
        )
    return str(raw)


def count_tokens(text: str) -> int:
    try:
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        return len(text) // 4


def make_nodes(llm: BaseChatModel):
    """Factory returning all node functions bound to the request's LLM."""

    def assess_length(state: NoteState) -> dict:
        token_count = count_tokens(state["content_text"])
        return {"needs_chunking": token_count > TOKEN_LIMIT}

    async def map_summarize(state: NoteState) -> dict:
        splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_CHARS, chunk_overlap=500)
        chunks = splitter.split_text(state["content_text"])
        timestamped = state["style"] == "timestamped" and bool(state.get("segments"))
        sem = asyncio.Semaphore(MAP_CONCURRENCY)

        async def summarize(chunk: str) -> str:
            async with sem:
                prompt = build_map_prompt(chunk, timestamped)
                return _text_of(await llm.ainvoke([HumanMessage(content=prompt)]))

        partial_summaries = await asyncio.gather(*(summarize(c) for c in chunks))

        combined = "\n\n---\n\n".join(partial_summaries)
        if len(combined) <= PROMPT_CHAR_CAP:
            return {"summarized_text": combined}
        final = await llm.ainvoke([HumanMessage(content=build_reduce_prompt(combined, timestamped))])
        return {"summarized_text": _text_of(final)}

    def route_after_assess(state: NoteState) -> str:
        return "map_summarize" if state["needs_chunking"] else "generate_notes_agent"

    async def generate_notes_agent(state: NoteState) -> dict:
        # Use summarized text if available (after chunking), else raw content
        content = state.get("summarized_text") or state["content_text"]

        # ── Flashcard style: structured JSON, not the ReAct/markdown path ──
        if state["style"] == "flashcard":
            prompt = build_flashcard_prompt(
                content=content,
                proficiency=state.get("proficiency", "intermediate"),
                card_count=state.get("card_count", 20),
                description=state.get("description", ""),
            )
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            cards = parse_flashcards(_text_of(response))
            return {"cards": cards, "notes": ""}

        system_prompt = build_agent_prompt(state["style"], content, state.get("description", ""))

        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content="Generate the notes now."),
        ])

        return {"notes": _text_of(response), "cards": []}

    async def format_output(state: NoteState) -> dict:
        # Flashcard runs intentionally leave notes empty (cards live in state["cards"]).
        if state.get("cards"):
            return {}
        notes = state.get("notes", "")
        if not notes:
            return {"notes": "# Error\n\nNo notes were generated. Please try again."}

        # Ensure the notes end with a clean newline
        notes = notes.strip() + "\n"
        return {"notes": notes}

    return {
        "assess_length": assess_length,
        "map_summarize": map_summarize,
        "route_after_assess": route_after_assess,
        "generate_notes_agent": generate_notes_agent,
        "format_output": format_output,
    }
