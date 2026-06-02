import tiktoken
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.language_models import BaseChatModel  # type: ignore[import]
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..prompts.templates import (
    MAP_SUMMARIZE_PROMPT,
    REDUCE_PROMPT,
    build_agent_prompt,
    build_flashcard_prompt,
)
from .flashcards import parse_flashcards
from .state import NoteState

TOKEN_LIMIT = 12_000


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
        splitter = RecursiveCharacterTextSplitter(chunk_size=4000, chunk_overlap=200)
        chunks = splitter.split_text(state["content_text"])

        # Map: summarize each chunk
        partial_summaries = []
        for chunk in chunks:
            prompt = MAP_SUMMARIZE_PROMPT.format(content=chunk)
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            partial_summaries.append(response.content)

        # Reduce: combine summaries
        combined = "\n\n---\n\n".join(partial_summaries)
        reduce_prompt = REDUCE_PROMPT.format(summaries=combined)
        final = await llm.ainvoke([HumanMessage(content=reduce_prompt)])

        return {"summarized_text": final.content}

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
            raw = response.content
            if isinstance(raw, list):
                raw = "".join(
                    block.get("text", "") if isinstance(block, dict) else str(block)
                    for block in raw
                )
            cards = parse_flashcards(str(raw))
            return {"cards": cards, "notes": ""}

        # For timestamped style with YouTube, inject timestamp data
        if state["style"] == "timestamped" and state.get("segments"):
            timestamp_lines = []
            for seg in state["segments"][:500]:  # cap to avoid overload
                minutes = int(seg["start"]) // 60
                seconds = int(seg["start"]) % 60
                timestamp_lines.append(f"[{minutes:02d}:{seconds:02d}] {seg['text']}")
            content = "\n".join(timestamp_lines)

        system_prompt = build_agent_prompt(state["style"], content, state.get("description", ""))

        from .tools import make_tools
        from langgraph.prebuilt import create_react_agent

        tools = make_tools(content)
        agent = create_react_agent(model=llm, tools=tools)

        result = await agent.ainvoke({
            "messages": [
                SystemMessage(content=system_prompt),
                HumanMessage(content="Generate the notes now."),
            ]
        })

        # Extract last AI message content
        final_message = result["messages"][-1]
        return {"notes": final_message.content, "cards": []}

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
