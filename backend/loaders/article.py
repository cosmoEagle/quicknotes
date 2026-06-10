import httpx
from bs4 import BeautifulSoup

from ..utils.url_validation import validate_url

SKIP_TAGS = {"nav", "footer", "header", "aside", "script", "style", "noscript", "form", "button"}
MAX_CHARS = 80_000


def load_article(url: str) -> dict:
    """
    Fetches and cleans article text from a URL.
    Returns: { "text": cleaned text, "title": page title }
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }

    validate_url(url)

    try:
        response = httpx.get(url, headers=headers, follow_redirects=True, timeout=15.0)
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Could not fetch URL: HTTP {e.response.status_code}")
    except httpx.RequestError as e:
        raise ValueError(f"Network error fetching URL: {str(e)}")

    soup = BeautifulSoup(response.text, "html.parser")

    # Extract title
    title = soup.title.string.strip() if soup.title and soup.title.string else "Untitled"

    # Remove unwanted tags
    for tag in soup.find_all(SKIP_TAGS):
        tag.decompose()

    # Try to find main content area
    main_content = (
        soup.find("article")
        or soup.find("main")
        or soup.find(attrs={"role": "main"})
        or soup.find(id=lambda x: x and "content" in x.lower())
        or soup.body
    )

    if main_content:
        text = main_content.get_text(separator="\n", strip=True)
    else:
        text = soup.get_text(separator="\n", strip=True)

    # Clean up excessive whitespace
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned = "\n".join(lines)

    if not cleaned:
        raise ValueError("Could not extract readable text from this URL.")

    return {"text": cleaned[:MAX_CHARS], "title": title}
