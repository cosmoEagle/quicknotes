import asyncio
from typing import AsyncGenerator, Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent

from .generate import create_llm, _sse
from ..prompts.templates import build_revise_prompt
from ..graph.revise import split_summary_and_notes, make_consult_source

router = APIRouter()


class ReviseRequest(BaseModel):
    notes: str = Field(max_length=500_000)
    instruction: str = Field(max_length=5_000)
    history: list[dict] = []
    source_type: Literal["youtube", "pdf", "article", "text"]
    content: str
    provider: Literal["openai", "anthropic", "google_genai", "groq"]
    model: str
    api_key: str


async def run_revise_stream(request: ReviseRequest) -> AsyncGenerator[str, None]:
    yield _sse("status", "Revising…")

    try:
        llm = create_llm(request.provider, request.model, request.api_key)
    except Exception as e:
        yield _sse("error", f"Failed to initialize model: {str(e)}")
        return

    consult_source = make_consult_source(request.source_type, request.content)
    system_prompt = build_revise_prompt(request.notes, request.instruction, request.history)
    agent = create_react_agent(model=llm, tools=[consult_source])

    try:
        async with asyncio.timeout(120):
            result = await agent.ainvoke({
                "messages": [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=request.instruction),
                ]
            })
    except TimeoutError:
        yield _sse("error", "Revision timed out. The API may be rate-limited — try again in a moment.")
        return
    except Exception as e:
        yield _sse("error", f"Revision failed: {str(e)}")
        return

    final_message = result["messages"][-1]
    raw = final_message.content
    if isinstance(raw, list):
        raw = "".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in raw
        )
    summary, revised = split_summary_and_notes(str(raw))

    yield _sse("summary", summary)
    yield _sse("revised", revised)
    yield _sse("done", "")


@router.post("/revise")
async def revise_notes(request: ReviseRequest):
    return StreamingResponse(
        run_revise_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
