import asyncio

from langchain_core.tools import tool

from ..loaders.youtube import load_youtube
from ..loaders.pdf import load_pdf
from ..loaders.article import load_article
from .tools import search_text
from ..utils.url_validation import validate_url

SUMMARY_MARK = "<<SUMMARY>>"
NOTES_MARK = "<<NOTES>>"


def split_summary_and_notes(text: str) -> tuple[str, str]:
    """Split revise-agent output into (summary, notes).

    Expected format:
        <<SUMMARY>>
        one line
        <<NOTES>>
        full markdown

    Falls back to ("Updated the notes.", whole_text) whenever the sentinels are
    absent, out of order, or the notes section is empty — so format drift never
    drops the revised content.
    """
    if not text or not text.strip():
        return ("Updated the notes.", "")

    s_idx = text.find(SUMMARY_MARK)
    n_idx = text.find(NOTES_MARK)
    if s_idx == -1 or n_idx == -1 or n_idx < s_idx:
        return ("Updated the notes.", text.strip())

    summary = text[s_idx + len(SUMMARY_MARK):n_idx].strip()
    notes = text[n_idx + len(NOTES_MARK):].strip()

    if not notes:
        return ("Updated the notes.", text.strip())
    if not summary:
        summary = "Updated the notes."
    return (summary, notes)


def make_consult_source(source_type: str, content: str):
    """Build a tool that lazily re-extracts the ORIGINAL source and searches it.

    Extraction runs at most once (cached). On extraction failure the tool returns
    a benign message so the agent proceeds from the current notes alone.
    """
    cache: dict = {"text": None, "loaded": False}

    async def _ensure_text() -> str:
        if cache["loaded"]:
            return cache["text"] or ""
        cache["loaded"] = True
        try:
            if source_type == "youtube":
                result = await asyncio.to_thread(load_youtube, content)
                cache["text"] = result["text"]
            elif source_type == "pdf":
                result = await asyncio.to_thread(load_pdf, content)
                cache["text"] = result["text"]
            elif source_type == "article":
                validate_url(content)
                result = await asyncio.to_thread(load_article, content)
                cache["text"] = result["text"]
            else:
                cache["text"] = ""
        except Exception:
            cache["text"] = ""
        return cache["text"] or ""

    @tool
    async def consult_source(query: str) -> str:
        """Search the ORIGINAL source material for facts that are not already in the current notes. Use this ONLY when the requested change needs information beyond what the notes contain."""
        text = await _ensure_text()
        if not text:
            return "The original source could not be retrieved; work from the current notes only."
        return search_text(text, query)

    return consult_source
