from backend.graph.tools import search_text


def test_search_text_returns_matching_lines():
    text = "The cat sat\nThe dog ran\nBirds fly high"
    result = search_text(text, "dog")
    assert "The dog ran" in result
    assert "The cat sat" not in result


def test_search_text_ranks_more_matches_first():
    text = "alpha beta\nalpha beta gamma\nzeta"
    result = search_text(text, "alpha beta gamma")
    assert result.splitlines()[0] == "alpha beta gamma"


def test_search_text_no_match_message():
    assert search_text("hello world", "xyzzy") == "No relevant content found for that query."


def test_search_text_respects_limit():
    text = "\n".join(f"match line {i}" for i in range(30))
    result = search_text(text, "match", limit=5)
    assert len(result.splitlines()) == 5


from backend.graph.revise import split_summary_and_notes, SUMMARY_MARK, NOTES_MARK


def test_split_well_formed():
    text = f"{SUMMARY_MARK}\nShortened to 3 bullets.\n{NOTES_MARK}\n- a\n- b\n- c"
    summary, notes = split_summary_and_notes(text)
    assert summary == "Shortened to 3 bullets."
    assert notes == "- a\n- b\n- c"


def test_split_missing_sentinels_falls_back():
    text = "Just some revised notes with no markers."
    summary, notes = split_summary_and_notes(text)
    assert summary == "Updated the notes."
    assert notes == "Just some revised notes with no markers."


def test_split_only_notes_mark_falls_back():
    text = f"{NOTES_MARK}\nsome notes"
    summary, notes = split_summary_and_notes(text)
    assert summary == "Updated the notes."
    assert notes == text.strip()


def test_split_marks_out_of_order_falls_back():
    text = f"{NOTES_MARK}\nnotes first\n{SUMMARY_MARK}\nsummary after"
    summary, notes = split_summary_and_notes(text)
    assert summary == "Updated the notes."
    assert notes == text.strip()


def test_split_empty_notes_section_falls_back():
    text = f"{SUMMARY_MARK}\nonly a summary\n{NOTES_MARK}\n   "
    summary, notes = split_summary_and_notes(text)
    assert summary == "Updated the notes."
    assert notes == text.strip()


def test_split_empty_summary_defaults():
    text = f"{SUMMARY_MARK}\n\n{NOTES_MARK}\nreal notes"
    summary, notes = split_summary_and_notes(text)
    assert summary == "Updated the notes."
    assert notes == "real notes"


from backend.prompts.templates import build_revise_prompt
from backend.graph.revise import split_summary_and_notes as _split


def test_revise_prompt_includes_notes_and_instruction():
    p = build_revise_prompt("# My Notes\n- point", "make it shorter", [])
    assert "# My Notes" in p
    assert "make it shorter" in p
    assert "consult_source" in p
    assert "<<SUMMARY>>" in p and "<<NOTES>>" in p


def test_revise_prompt_renders_history():
    history = [{"role": "user", "text": "add a TL;DR"}, {"role": "assistant", "text": "Added a TL;DR."}]
    p = build_revise_prompt("notes", "now shorten it", history)
    assert "add a TL;DR" in p
    assert "Added a TL;DR." in p


def test_revise_prompt_no_history_block_when_empty():
    p = build_revise_prompt("notes", "change", [])
    assert "Conversation so far" not in p


def test_revise_prompt_caps_long_notes():
    huge = "x " * 50_000
    p = build_revise_prompt(huge, "shorten", [])
    assert len(p) < 70_000


def test_revise_prompt_format_roundtrips_with_splitter():
    sample = "<<SUMMARY>>\nDid the thing.\n<<NOTES>>\n# Revised\n- a"
    summary, notes = _split(sample)
    assert summary == "Did the thing."
    assert notes == "# Revised\n- a"


import backend.graph.revise as revise_mod


def test_consult_source_extracts_once_and_searches(monkeypatch):
    calls = {"n": 0}

    def fake_loader(url):
        calls["n"] += 1
        return {"text": "alpha line\nbeta line\ngamma line"}

    monkeypatch.setattr(revise_mod, "load_article", fake_loader)
    tool = revise_mod.make_consult_source("article", "http://example.com")
    out1 = tool.invoke({"query": "beta"})
    out2 = tool.invoke({"query": "gamma"})
    assert "beta line" in out1
    assert "gamma line" in out2
    assert calls["n"] == 1  # extracted once, then cached


def test_consult_source_handles_extraction_failure(monkeypatch):
    def boom(url):
        raise RuntimeError("no network")

    monkeypatch.setattr(revise_mod, "load_article", boom)
    tool = revise_mod.make_consult_source("article", "http://example.com")
    out = tool.invoke({"query": "anything"})
    assert "could not be retrieved" in out
