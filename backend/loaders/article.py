import time

import httpx
from bs4 import BeautifulSoup

from ..utils.url_validation import BLOCKED_MSG, is_public_ip, validate_url

SKIP_TAGS = {"nav", "footer", "header", "aside", "script", "style", "noscript", "form", "button"}
MAX_CHARS = 80_000
MAX_BYTES = 5_000_000
MAX_REDIRECTS = 5
TOTAL_TIMEOUT = 20.0

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def _check_peer(response: httpx.Response) -> None:
    """Reject the response if the connected peer is not a public IP."""
    stream = response.extensions.get("network_stream")
    addr = stream.get_extra_info("server_addr") if stream else None
    if not addr or not is_public_ip(addr[0]):
        raise ValueError(BLOCKED_MSG)


def _fetch_html(url: str) -> str:
    """GET url with SSRF checks on every redirect hop, a size cap and a total deadline."""
    deadline = time.monotonic() + TOTAL_TIMEOUT
    with httpx.Client(headers=HEADERS, timeout=10.0, follow_redirects=False) as client:
        for _ in range(MAX_REDIRECTS + 1):
            validate_url(url)
            with client.stream("GET", url) as response:
                _check_peer(response)
                if response.is_redirect:
                    url = str(response.url.join(response.headers["location"]))
                    continue
                response.raise_for_status()
                body = bytearray()
                for chunk in response.iter_bytes():
                    body += chunk
                    if len(body) > MAX_BYTES:
                        raise ValueError("Page is too large (over 5 MB).")
                    if time.monotonic() > deadline:
                        raise ValueError("Timed out downloading the page.")
                return body.decode(response.encoding or "utf-8", errors="replace")
    raise ValueError("Too many redirects.")


def load_article(url: str) -> dict:
    """
    Fetches and cleans article text from a URL.
    Returns: { "text": cleaned text, "title": page title }
    """
    try:
        html = _fetch_html(url)
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Could not fetch URL: HTTP {e.response.status_code}")
    except httpx.RequestError as e:
        raise ValueError(f"Network error fetching URL: {str(e)}")

    soup = BeautifulSoup(html, "html.parser")

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
