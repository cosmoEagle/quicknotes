from langchain_core.tools import tool


def search_text(text: str, query: str, limit: int = 15) -> str:
    """Return the lines of `text` most relevant to `query`, ranked by how many
    query words they contain. Shared by the generation tools and the revise
    agent's consult_source tool."""
    lines = text.split("\n")
    query_words = query.lower().split()
    scored = []
    for i, line in enumerate(lines):
        line_lower = line.lower()
        score = sum(1 for word in query_words if word in line_lower)
        if score > 0:
            scored.append((score, i, line))
    scored.sort(reverse=True)
    top_lines = [line for _, _, line in scored[:limit]]
    return "\n".join(top_lines) if top_lines else "No relevant content found for that query."


def make_tools(content_text: str):
    """Create tools bound to the specific content for this request."""

    @tool
    def search_content(query: str) -> str:
        """Search the source content for specific information. Use this to find details, examples, or sections relevant to your query."""
        return search_text(content_text, query)

    @tool
    def get_content_stats() -> str:
        """Get statistics about the source content — word count, estimated length, and structure hints."""
        words = len(content_text.split())
        chars = len(content_text)
        lines = len(content_text.splitlines())
        paragraphs = len([p for p in content_text.split("\n\n") if p.strip()])
        return (
            f"Content statistics:\n"
            f"- Words: {words:,}\n"
            f"- Characters: {chars:,}\n"
            f"- Lines: {lines:,}\n"
            f"- Paragraphs: ~{paragraphs}\n"
            f"- Estimated read time: ~{words // 200} minutes"
        )

    return [search_content, get_content_stats]
