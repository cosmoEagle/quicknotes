import asyncio
import json
import time

import pytest
from fastapi.testclient import TestClient
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from backend.graph import nodes
from backend.graph.graph import create_note_graph
from backend.loaders.youtube import extract_video_id, format_timestamp, format_timestamped
from backend.main import app
from backend.routers import generate


class SlowFakeLLM(BaseChatModel):
    """Echoes a tag for each prompt after a delay; records prompts and peak concurrency."""
    delay: float = 0.2
    prompts: list = []
    active: int = 0
    peak: int = 0

    @property
    def _llm_type(self) -> str:
        return "slow-fake"

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        raise NotImplementedError

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        prompt = "\n".join(str(m.content) for m in messages)
        self.prompts.append(prompt)
        self.active += 1
        self.peak = max(self.peak, self.active)
        await asyncio.sleep(self.delay)
        self.active -= 1
        # Map calls echo the chunk's first timestamp so ordering can be checked
        section = prompt.split("Content section:")[-1]
        marker = next((w for w in section.split() if w.startswith("[") and w.endswith("]") and w[1].isdigit()), "")
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=f"summary {marker}"))])


def _state(text, style="summary", segments=None):
    return {
        "source_type": "youtube", "raw_content": "", "content_text": text,
        "segments": segments or [], "style": style, "description": "",
        "proficiency": "intermediate", "card_count": 20, "needs_chunking": False,
        "summarized_text": "", "notes": "", "cards": [], "error": None,
    }


def test_map_summarize_runs_in_parallel_and_skips_reduce():
    llm = SlowFakeLLM(prompts=[])
    text = "word " * 60_000  # 300k chars -> ~10 chunks
    start = time.monotonic()
    final = asyncio.run(create_note_graph(llm).ainvoke(_state(text)))
    elapsed = time.monotonic() - start

    map_calls = [p for p in llm.prompts if p.startswith("Summarize the following section")]
    assert 8 <= len(map_calls) <= 12
    assert llm.peak == nodes.MAP_CONCURRENCY
    # summaries are short, so no reduce call: map calls + 1 notes call
    assert len(llm.prompts) == len(map_calls) + 1
    assert elapsed < len(llm.prompts) * llm.delay  # faster than fully sequential
    assert final["notes"].strip()


def test_timestamped_long_video_covers_whole_transcript_in_order():
    # 3-hour video, a segment every 4s (~2700 segments — old code kept only the first 500)
    segments = [{"text": f"topic{i} " * 8, "start": i * 4.0} for i in range(2700)]
    text = format_timestamped(segments)
    llm = SlowFakeLLM(prompts=[], delay=0.01)
    asyncio.run(create_note_graph(llm).ainvoke(_state(text, "timestamped", segments)))

    map_calls = [p for p in llm.prompts if "Summarize the following section" in p]
    assert len(map_calls) > 1
    assert all("timestamps" in p for p in map_calls)  # timestamp-preserving instructions
    final_prompt = llm.prompts[-1]
    source = final_prompt.split("Source content")[1]
    # gather keeps chunk order, so the summaries reach the notes call chronologically
    markers = [w for w in source.split() if w.startswith("[") and w.endswith("]") and w[1].isdigit()]
    assert markers[0] == "[00:00]" and markers[-1].startswith("[2:")  # reaches the 3rd hour
    to_secs = lambda m: sum(int(x) * 60 ** i for i, x in enumerate(reversed(m.strip("[]").split(":"))))
    assert [to_secs(m) for m in markers] == sorted(to_secs(m) for m in markers)


@pytest.mark.parametrize("secs,expected", [(0, "00:00"), (330, "05:30"), (3599, "59:59"),
                                           (3600, "1:00:00"), (3930, "1:05:30"), (6300, "1:45:00")])
def test_format_timestamp(secs, expected):
    assert format_timestamp(secs) == expected


def test_format_timestamped_merges_into_windows():
    segs = [{"text": f"s{i}", "start": i * 5.0} for i in range(12)]  # 0..55s
    assert format_timestamped(segs, window=30).splitlines() == [
        "[00:00] s0 s1 s2 s3 s4 s5",
        "[00:30] s6 s7 s8 s9 s10 s11",
    ]


@pytest.mark.parametrize("url", [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?si=abc&v=dQw4w9WgXcQ",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?t=10",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
])
def test_extract_video_id_accepts_youtube(url):
    assert extract_video_id(url) == "dQw4w9WgXcQ"


@pytest.mark.parametrize("url", ["https://evil.com/?youtu.be/dQw4w9WgXcQ", "https://notyoutube.com/watch?v=dQw4w9WgXcQ"])
def test_extract_video_id_rejects_other_hosts(url):
    with pytest.raises(ValueError):
        extract_video_id(url)


def _events(resp):
    return [json.loads(line[6:]) for line in resp.text.splitlines() if line.startswith("data: ")]


def test_generate_truncates_oversized_text(monkeypatch):
    seen = {}
    class FakeGraph:
        async def astream_events(self, state, version):
            seen["len"] = len(state["content_text"])
            return
            yield
    monkeypatch.setattr(generate, "create_llm", lambda *a: None)
    monkeypatch.setattr(generate, "create_note_graph", lambda llm: FakeGraph())
    body = dict(source_type="text", content="x" * 1_000_000, style="summary",
                provider="openai", model="m", api_key="k")
    events = _events(TestClient(app).post("/api/generate", json=body))
    assert seen["len"] == generate.MAX_SOURCE_CHARS
    assert any("very long" in e["data"] for e in events if e["event"] == "status")


def test_generate_extraction_timeout(monkeypatch):
    monkeypatch.setattr(generate, "EXTRACT_TIMEOUT", 0.2)
    monkeypatch.setattr(generate, "load_article", lambda url: time.sleep(1) or {"text": "x"})
    body = dict(source_type="article", content="https://example.com", style="summary",
                provider="openai", model="m", api_key="k")
    events = _events(TestClient(app).post("/api/generate", json=body))
    assert events[-1]["event"] == "error" and "timed out" in events[-1]["data"]


@pytest.mark.parametrize("override", [
    {"content": "x" * 10_000_001},
    {"history": [{"role": "user", "text": "hi"}] * 51},
    {"history": [{"role": "user", "text": {"nested": 1}}]},
])
def test_revise_rejects_oversized_or_malformed(override):
    body = {**dict(notes="n", instruction="i", source_type="text", content="c",
                   provider="openai", model="m", api_key="k"), **override}
    assert TestClient(app).post("/api/revise", json=body).status_code == 422
