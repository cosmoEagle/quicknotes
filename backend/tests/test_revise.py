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
