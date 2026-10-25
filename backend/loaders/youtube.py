import os
import re
from urllib.parse import urlparse

import httpx
from youtube_transcript_api import YouTubeTranscriptApi


YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"}


def extract_video_id(url: str) -> str:
    host = (urlparse(url.strip()).hostname or "").lower()
    if host not in YOUTUBE_HOSTS:
        raise ValueError(f"Not a YouTube URL: {url}")
    patterns = [
        r"(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/(?:embed|shorts|live)\/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


def _via_transcript_api(video_id: str) -> list:
    api = YouTubeTranscriptApi()
    for languages in (["en", "en-US", "en-GB"], None):
        try:
            if languages is not None:
                fetched = api.fetch(video_id, languages=languages)
            else:
                transcript_list = api.list(video_id)
                transcript = next(iter(transcript_list))
                fetched = transcript.fetch()
            return [{"text": str(s.text), "start": float(s.start)} for s in fetched]
        except Exception:
            if languages is None:
                raise
            continue
    raise ValueError("No English transcript found.")


def _via_supadata(video_id: str) -> list:
    api_key = os.getenv("SUPADATA_API_KEY", "")
    if not api_key:
        raise ValueError(
            "YouTube transcript extraction failed on this server (cloud IPs are blocked by YouTube). "
            "Set the SUPADATA_API_KEY environment variable to enable the Supadata fallback. "
            "Get a key at supadata.ai."
        )

    response = httpx.get(
        "https://api.supadata.ai/v1/youtube/transcript",
        params={"videoId": video_id, "text": "false"},
        headers={"x-api-key": api_key},
        timeout=20.0,
    )
    response.raise_for_status()
    data = response.json()
    content = data.get("content", [])
    if not content:
        raise ValueError("No transcript content returned by Supadata.")
    # Supadata returns offset in milliseconds; convert to seconds for consistency
    return [{"text": item["text"], "start": item["offset"] / 1000} for item in content]


def load_youtube(url: str) -> dict:
    """
    Returns: { "text": full transcript text, "segments": list of {text, start} }
    Tries youtube-transcript-api first; falls back to Supadata.ai for cloud IPs
    where YouTube blocks direct transcript requests.
    """
    video_id = extract_video_id(url)

    last_error = None
    for fetcher in (_via_transcript_api, _via_supadata):
        try:
            segments = fetcher(video_id)
            full_text = " ".join(s["text"] for s in segments)
            return {"text": full_text, "segments": segments, "video_id": video_id}
        except Exception as e:
            last_error = e
            continue

    raise ValueError(f"Could not fetch transcript: {last_error}")


def format_timestamp(seconds: float) -> str:
    """MM:SS under an hour, H:MM:SS after."""
    total = int(seconds)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def format_timestamped(segments: list, window: float = 30.0) -> str:
    """Render segments as `[MM:SS] text` lines, merged into ~window-second blocks."""
    lines: list[str] = []
    block_start = None
    block_text: list[str] = []
    for seg in segments:
        if block_start is None:
            block_start = seg["start"]
        elif seg["start"] - block_start >= window:
            lines.append(f"[{format_timestamp(block_start)}] {' '.join(block_text)}")
            block_start, block_text = seg["start"], []
        block_text.append(seg["text"])
    if block_text:
        lines.append(f"[{format_timestamp(block_start)}] {' '.join(block_text)}")
    return "\n".join(lines)
