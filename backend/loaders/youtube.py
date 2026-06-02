import re
from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url: str) -> str:
    patterns = [
        r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


def load_youtube(url: str) -> dict:
    """
    Returns: { "text": full transcript text, "segments": list of {text, start} }
    Compatible with youtube-transcript-api >= 1.2.4 (instance-based API).
    """
    video_id = extract_video_id(url)

    api = YouTubeTranscriptApi()

    # Try English variants first, fall back to any available language
    for languages in (["en", "en-US", "en-GB"], None):
        try:
            if languages is not None:
                fetched = api.fetch(video_id, languages=languages)
            else:
                # list() finds available transcripts; fetch the first one
                transcript_list = api.list(video_id)
                transcript = next(iter(transcript_list))
                fetched = transcript.fetch()
            break
        except Exception:
            if languages is None:
                raise ValueError("No transcript available for this video.")
            continue
    else:
        raise ValueError("No English transcript found. Try a video with English captions.")

    # Each snippet is a dataclass with .text, .start, .duration
    normalized = [{"text": str(s.text), "start": float(s.start)} for s in fetched]
    full_text = " ".join(s["text"] for s in normalized)

    return {"text": full_text, "segments": normalized, "video_id": video_id}
