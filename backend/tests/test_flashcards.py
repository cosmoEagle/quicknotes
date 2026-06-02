from backend.prompts.templates import build_flashcard_prompt


def test_prompt_includes_content_and_count():
    prompt = build_flashcard_prompt(
        content="Photosynthesis converts light to energy.",
        proficiency="intermediate",
        card_count=15,
        description="",
    )
    assert "Photosynthesis converts light to energy." in prompt
    assert "15" in prompt
    # Must instruct JSON-array output with the required keys
    assert "JSON" in prompt
    assert "question" in prompt
    assert "answer" in prompt
    assert "type" in prompt


def test_prompt_varies_by_proficiency():
    beginner = build_flashcard_prompt("X", "beginner", 10, "")
    expert = build_flashcard_prompt("X", "expert", 10, "")
    assert beginner != expert
    assert "beginner" in beginner.lower()
    assert "expert" in expert.lower()


def test_prompt_appends_description_when_present():
    with_desc = build_flashcard_prompt("X", "intermediate", 10, "focus on dates")
    without_desc = build_flashcard_prompt("X", "intermediate", 10, "")
    assert "focus on dates" in with_desc
    assert "focus on dates" not in without_desc


def test_prompt_caps_long_content():
    huge = "word " * 50_000
    prompt = build_flashcard_prompt(huge, "intermediate", 10, "")
    # content is capped at 60k chars; prompt should not balloon unbounded
    assert len(prompt) < 70_000


from backend.graph.flashcards import parse_flashcards


def test_parse_plain_json_array():
    raw = '[{"question": "Q1", "answer": "A1", "type": "definition"}]'
    cards = parse_flashcards(raw)
    assert cards == [{"question": "Q1", "answer": "A1", "type": "definition"}]


def test_parse_strips_markdown_code_fence():
    raw = '```json\n[{"question": "Q", "answer": "A", "type": "why"}]\n```'
    cards = parse_flashcards(raw)
    assert len(cards) == 1
    assert cards[0]["type"] == "why"


def test_parse_tolerates_leading_and_trailing_prose():
    raw = 'Here are your cards:\n[{"question": "Q", "answer": "A", "type": "how"}]\nHope this helps!'
    cards = parse_flashcards(raw)
    assert len(cards) == 1
    assert cards[0]["question"] == "Q"


def test_parse_defaults_unknown_type_to_definition():
    raw = '[{"question": "Q", "answer": "A", "type": "banana"}]'
    cards = parse_flashcards(raw)
    assert cards[0]["type"] == "definition"


def test_parse_skips_cards_missing_required_fields():
    raw = '[{"question": "Q", "answer": "A", "type": "why"}, {"question": "only q"}]'
    cards = parse_flashcards(raw)
    assert len(cards) == 1


def test_parse_returns_empty_on_garbage():
    assert parse_flashcards("not json at all") == []
    assert parse_flashcards("") == []


def test_parse_prose_with_brackets_before_array():
    raw = 'Note [important]: here you go\n[{"question": "Q", "answer": "A", "type": "why"}]'
    cards = parse_flashcards(raw)
    assert len(cards) == 1
    assert cards[0]["question"] == "Q"


def test_parse_prose_with_brackets_after_array():
    raw = '[{"question": "Q", "answer": "A", "type": "how"}]\n[end of list]'
    cards = parse_flashcards(raw)
    assert len(cards) == 1
    assert cards[0]["answer"] == "A"


def test_parse_clean_whole_string_json():
    raw = '[{"question": "Q", "answer": "A", "type": "apply"}]'
    cards = parse_flashcards(raw)
    assert len(cards) == 1


def test_parse_empty_array_returns_empty():
    assert parse_flashcards("[]") == []


def test_parse_top_level_object_not_array_returns_empty():
    assert parse_flashcards('{"question": "Q", "answer": "A", "type": "why"}') == []
