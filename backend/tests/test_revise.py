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
