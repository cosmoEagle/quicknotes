from typing import TypedDict, Optional, List


class NoteState(TypedDict):
    source_type: str          # "youtube" | "pdf" | "article"
    raw_content: str          # URL or base64 string
    content_text: str         # extracted plain text
    segments: List[dict]      # YouTube timestamp segments [{text, start}]
    style: str                # "summary" | "deep-dive" | "flashcard" | "timestamped"
    description: str          # optional user instruction
    proficiency: str          # "beginner" | "intermediate" | "expert" (flashcard only)
    card_count: int           # approximate number of flashcards to generate
    needs_chunking: bool      # set by assess_length node
    summarized_text: str      # output of map_summarize (if chunking needed)
    notes: str                # final generated notes (markdown styles)
    cards: List[dict]         # parsed flashcards [{question, answer, type}] (flashcard only)
    error: Optional[str]      # any error message
