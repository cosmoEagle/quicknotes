import json
import re
from typing import List, Optional

VALID_TYPES = {"definition", "why", "how", "compare", "apply"}


def _extract_json_array(text: str) -> Optional[list]:
    """Return the first JSON array found in text, or None.

    Tries the whole string first (the well-behaved 'ONLY JSON' case), then
    scans from each '[' using raw_decode so stray brackets in surrounding
    prose don't derail extraction.
    """
    try:
        whole = json.loads(text)
        if isinstance(whole, list):
            return whole
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for i, ch in enumerate(text):
        if ch != "[":
            continue
        try:
            value, _ = decoder.raw_decode(text, i)
        except json.JSONDecodeError:
            continue
        if isinstance(value, list):
            return value
    return None


def parse_flashcards(raw: str) -> List[dict]:
    """Extract a list of {question, answer, type} cards from raw LLM output.

    Tolerates markdown code fences and surrounding prose. Returns [] on any
    failure so the caller can emit a clean error instead of crashing.
    """
    if not raw or not raw.strip():
        return []

    text = raw.strip()

    # Strip a leading/trailing markdown code fence if present.
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    data = _extract_json_array(text)
    if data is None:
        return []

    cards: List[dict] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        question = item.get("question")
        answer = item.get("answer")
        if not isinstance(question, str) or not isinstance(answer, str):
            continue
        if not question.strip() or not answer.strip():
            continue
        ctype = item.get("type")
        if ctype not in VALID_TYPES:
            ctype = "definition"
        cards.append({
            "question": question.strip(),
            "answer": answer.strip(),
            "type": ctype,
        })
    return cards
