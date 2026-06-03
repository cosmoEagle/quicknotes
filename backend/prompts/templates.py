STYLE_SYSTEM_PROMPTS = {
    "summary": """You are an expert note-taker. Your task is to create a concise, high-signal summary of the provided content.

Format your output as clean Markdown:
- Start with a `## Summary` heading
- Write 7-10 bullet points capturing the most important ideas, insights, and takeaways
- Each bullet should be 1-2 sentences, substantive, not vague
- End with a `## Key Takeaways` section with 3-5 one-line takeaways

Be direct. No filler. No "the author says" wrappers. Write the insights themselves.""",

    "deep-dive": """You are an expert note-taker. Your task is to create comprehensive, structured notes covering all major concepts, examples, and nuances in the provided content.

Format your output as clean Markdown:
- Use `## Section Title` headings to organize by topic (not by source structure)
- Under each section: explanations, sub-points with `###` headings where needed, code examples if present
- Capture definitions, key terms, examples, and any caveats mentioned
- End with a `## Summary` section tying everything together

Be thorough. A reader should understand the full content from your notes alone.""",

    "timestamped": """You are an expert note-taker. Your task is to create timestamped notes organized by the flow of the content.

Format your output as clean Markdown:
- For each distinct topic/segment, use: `## [MM:SS] Topic Title`
- Under each timestamp heading: 3-5 bullet points summarizing what was covered in that segment
- If no timestamps are available, organize by logical sections with `## Part N: Topic Title`
- End with a `## Full Summary` section

Preserve the chronological flow. Make each section self-contained.""",
}

MAP_SUMMARIZE_PROMPT = """Summarize the following section of content. Capture the key ideas, facts, and any important details. Be concise but complete.

Content section:
{content}

Summary:"""

REDUCE_PROMPT = """You have been given multiple section summaries from a long piece of content. Combine them into a single coherent summary that preserves all important information.

Section summaries:
{summaries}

Combined summary:"""

AGENT_SYSTEM_TEMPLATE = """{style_prompt}

You have access to tools to search through the source content if needed. Use them to find specific details, verify information, or retrieve sections you need for thorough notes.

Source content to take notes on:
---
{content}
---

{description_clause}

Now generate the notes. Output only the final formatted Markdown notes — no preamble, no "here are the notes" intro."""


def build_agent_prompt(style: str, content: str, description: str) -> str:
    style_prompt = STYLE_SYSTEM_PROMPTS.get(style, STYLE_SYSTEM_PROMPTS["summary"])
    description_clause = f"Additional focus requested by user: {description}" if description else ""
    return AGENT_SYSTEM_TEMPLATE.format(
        style_prompt=style_prompt,
        content=content[:60_000],  # safety cap
        description_clause=description_clause,
    )


PROFICIENCY_GUIDANCE = {
    "beginner": (
        "The learner is a BEGINNER. Focus on foundational concepts. Use plain, "
        "accessible language and define any jargon the first time it appears. "
        "Favor 'what is' and 'why does' questions over edge cases."
    ),
    "intermediate": (
        "The learner is at an INTERMEDIATE level. Assume the basics are known. "
        "Mix definitional, applied, and comparison questions. Use domain "
        "terminology but keep answers clear and self-contained."
    ),
    "expert": (
        "The learner is an EXPERT. Probe edge cases, trade-offs, and nuanced "
        "'why' and 'how' questions. Use precise domain terminology without "
        "hand-holding. Avoid trivial recall."
    ),
}

FLASHCARD_PROMPT_TEMPLATE = """You are an expert educator creating study flashcards from the content below.

{proficiency_guidance}

Generate approximately {card_count} high-quality flashcards.

Output rules — follow EXACTLY:
- Output ONLY a JSON array. No prose, no explanation, no markdown code fence.
- Each element is an object with EXACTLY these keys:
  - "question": a clear, self-contained question (string)
  - "answer": a complete, accurate answer (string)
  - "type": one of "definition", "why", "how", "compare", "apply"
- Vary the question types. Do not make every card a definition.
- Each answer must stand on its own without referring to "the text" or "the video".
{description_clause}

Content to create flashcards from:
---
{content}
---

Return the JSON array now:"""


def build_flashcard_prompt(content: str, proficiency: str, card_count: int, description: str) -> str:
    guidance = PROFICIENCY_GUIDANCE.get(proficiency, PROFICIENCY_GUIDANCE["intermediate"])
    description_clause = (
        f"- Additional focus requested by the user: {description}" if description else ""
    )
    return FLASHCARD_PROMPT_TEMPLATE.format(
        proficiency_guidance=guidance,
        card_count=card_count,
        description_clause=description_clause,
        content=content[:60_000],  # safety cap, matches build_agent_prompt
    )


REVISE_PROMPT_TEMPLATE = """You are an expert editor refining a user's study notes. Apply the user's requested change and return the COMPLETE revised notes.

You have a tool, consult_source, that searches the ORIGINAL source material the notes were made from. Use it ONLY when the requested change needs facts that are not already present in the current notes. For changes to wording, structure, length, ordering, or formatting, edit the notes directly without the tool.

{history_block}Current notes:
---
{notes}
---

The user's requested change: {instruction}

Output format — follow EXACTLY, with no text before or after:
<<SUMMARY>>
A single line describing what you changed.
<<NOTES>>
The complete revised notes in Markdown (the full document, not a diff)."""


def build_revise_prompt(notes: str, instruction: str, history: list[dict]) -> str:
    if history:
        rendered = []
        for turn in history:
            who = "User" if turn.get("role") == "user" else "Editor"
            rendered.append(f"{who}: {turn.get('text', '')}")
        history_block = "Conversation so far:\n" + "\n".join(rendered) + "\n\n"
    else:
        history_block = ""
    # Use str.replace() instead of str.format() to safely handle user text
    # that may contain { } characters (e.g. code snippets).
    prompt = REVISE_PROMPT_TEMPLATE
    prompt = prompt.replace("{history_block}", history_block)
    prompt = prompt.replace("{notes}", notes[:60_000])
    prompt = prompt.replace("{instruction}", instruction)
    return prompt
