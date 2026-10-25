import asyncio
import json
from typing import AsyncGenerator, Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from langchain.chat_models import init_chat_model

from ..loaders.youtube import format_timestamped, load_youtube
from ..loaders.pdf import load_pdf
from ..loaders.article import load_article
from ..graph.graph import create_note_graph
from ..graph.state import NoteState

router = APIRouter()

MAX_SOURCE_CHARS = 300_000
EXTRACT_TIMEOUT = 60
GENERATE_TIMEOUT = 180

PROVIDER_API_KEY_MAP = {
    "openai": "api_key",
    "anthropic": "api_key",
    "google_genai": "google_api_key",
    "groq": "api_key",
}


class GenerateRequest(BaseModel):
    source_type: Literal["youtube", "pdf", "article", "text"]
    content: str = Field(max_length=10_000_000)  # ~7.5 MB after base64 decode
    style: Literal["summary", "deep-dive", "flashcard", "timestamped"]
    description: str = Field(default="", max_length=5_000)
    provider: Literal["openai", "anthropic", "google_genai", "groq"]
    model: str             # e.g. "gemini-2.5-flash-lite"
    api_key: str
    proficiency: str = "intermediate"  # flashcard only
    card_count: int = Field(default=20, ge=1, le=50)  # flashcard only


def create_llm(provider: str, model: str, api_key: str):
    key_kwarg = PROVIDER_API_KEY_MAP.get(provider, "api_key")
    return init_chat_model(
        model=model,
        model_provider=provider,
        timeout=30.0,   # 30s per request; prevents silent hangs on rate limits
        max_retries=2,  # default is 6 — that's ~60s of retry silence
        **{key_kwarg: api_key},
    )


async def run_graph_stream(request: GenerateRequest) -> AsyncGenerator[str, None]:
    # Step 1: Extract content
    yield _sse("status", "Extracting content…")

    try:
        if request.source_type == "youtube":
            loaded = await asyncio.wait_for(asyncio.to_thread(load_youtube, request.content), EXTRACT_TIMEOUT)
            content_text = loaded["text"]
            segments = loaded.get("segments", [])
        elif request.source_type == "pdf":
            loaded = await asyncio.wait_for(asyncio.to_thread(load_pdf, request.content), EXTRACT_TIMEOUT)
            content_text = loaded["text"]
            segments = []
        elif request.source_type == "article":
            loaded = await asyncio.wait_for(asyncio.to_thread(load_article, request.content), EXTRACT_TIMEOUT)
            content_text = loaded["text"]
            segments = []
        elif request.source_type == "text":
            content_text = request.content
            segments = []
        else:
            yield _sse("error", f"Unknown source type: {request.source_type}")
            return
    except TimeoutError:
        yield _sse("error", "Content extraction timed out. The source may be too large or slow to respond.")
        return
    except Exception as e:
        yield _sse("error", f"Content extraction failed: {str(e)}")
        return

    if not content_text.strip():
        yield _sse("error", "No readable content found in the provided source.")
        return

    if request.style == "timestamped" and segments:
        content_text = format_timestamped(segments)

    if len(content_text) > MAX_SOURCE_CHARS:
        content_text = content_text[:MAX_SOURCE_CHARS]
        yield _sse("status", f"Source is very long — using the first {MAX_SOURCE_CHARS:,} characters.")

    yield _sse("status", "Building note graph…")

    # Step 2: Create LLM and graph
    try:
        llm = create_llm(request.provider, request.model, request.api_key)
    except Exception as e:
        yield _sse("error", f"Failed to initialize model: {str(e)}")
        return

    graph = create_note_graph(llm)

    initial_state: NoteState = {
        "source_type": request.source_type,
        "raw_content": request.content,
        "content_text": content_text,
        "segments": segments,
        "style": request.style,
        "description": request.description,
        "proficiency": request.proficiency,
        "card_count": request.card_count,
        "needs_chunking": False,
        "summarized_text": "",
        "notes": "",
        "cards": [],
        "error": None,
    }

    # Step 3: Run the graph and stream results
    yield _sse("status", "Generating notes…")
    notes_started = False

    # ── Flashcard style: run to completion, then emit one card per event ──
    if request.style == "flashcard":
        try:
            async with asyncio.timeout(GENERATE_TIMEOUT):
                final_state = await graph.ainvoke(initial_state)
        except TimeoutError:
            yield _sse("error", "Generation timed out. The API may be rate-limited — try again in a moment.")
            return
        except Exception as e:
            yield _sse("error", f"Generation failed: {str(e)}")
            return

        cards = final_state.get("cards", [])
        if not cards:
            yield _sse("error", "No flashcards could be generated from this content. Try a different model or regenerate.")
            return

        for card in cards:
            yield _sse("card", json.dumps(card))
        yield _sse("done", "")
        return

    # ── All other styles: token-stream the markdown ──
    try:
        async with asyncio.timeout(GENERATE_TIMEOUT):
            async for event in graph.astream_events(initial_state, version="v2"):
                event_type = event.get("event", "")

                # Stream tokens ONLY from the final agent node, not from map_summarize's inner LLM calls
                if event_type == "on_chat_model_stream" and event.get("metadata", {}).get("langgraph_node") == "generate_notes_agent":
                    chunk = event["data"].get("chunk")
                    if chunk and hasattr(chunk, "content"):
                        # content may be a plain string or a list of content blocks (Gemini)
                        content = chunk.content
                        if isinstance(content, list):
                            text = "".join(
                                block.get("text", "") if isinstance(block, dict) else str(block)
                                for block in content
                            )
                        else:
                            text = str(content) if content else ""
                        if text:
                            if not notes_started:
                                yield _sse("notes_start", "")
                                notes_started = True
                            yield _sse("token", text)

                # Detect when map_summarize is running (long content)
                elif event_type == "on_chain_start" and event.get("name") == "map_summarize":
                    yield _sse("status", "Summarizing long content…")

    except TimeoutError:
        yield _sse("error", "Generation timed out. The API may be rate-limited — try again in a moment.")
        return
    except Exception as e:
        yield _sse("error", f"Generation failed: {str(e)}")
        return

    if not notes_started:
        yield _sse("error", "No notes were generated. The content may be unreadable or the model returned an empty response — try regenerating or using a different model.")
        return

    yield _sse("done", "")


def _sse(event: str, data: str) -> str:
    payload = json.dumps({"event": event, "data": data})
    return f"data: {payload}\n\n"


@router.post("/generate")
async def generate_notes(request: GenerateRequest):
    return StreamingResponse(
        run_graph_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
