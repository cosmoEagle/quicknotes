import re
import json
import os
import tempfile
from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url: str) -> str:
    patterns = [
        r"(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/(?:embed|shorts|live)\/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


def _via_transcript_api(video_id: str) -> dict:
    """Primary method — fast, but may fail from cloud/datacenter IPs."""
    api = YouTubeTranscriptApi()
    for languages in (["en", "en-US", "en-GB"], None):
        try:
            if languages is not None:
                fetched = api.fetch(video_id, languages=languages)
            else:
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

    normalized = [{"text": str(s.text), "start": float(s.start)} for s in fetched]
    full_text = " ".join(s["text"] for s in normalized)
    return {"text": full_text, "segments": normalized, "video_id": video_id}


def _via_ytdlp(url: str, video_id: str) -> dict:
    """Fallback — yt-dlp handles cloud IP restrictions better than youtube-transcript-api."""
    import yt_dlp  # lazy import — only loaded when the primary method fails

    with tempfile.TemporaryDirectory() as tmpdir:
        ydl_opts = {
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["en", "en-US", "en-GB"],
            "subtitlesformat": "json3",
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
            "outtmpl": os.path.join(tmpdir, "%(id)s"),
            "noplaylist": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            actual_id = info["id"]

        # Parse the json3 subtitle file for whichever language was downloaded
        for lang in ["en", "en-US", "en-GB"]:
            path = os.path.join(tmpdir, f"{actual_id}.{lang}.json3")
            if not os.path.exists(path):
                continue
            with open(path) as f:
                data = json.load(f)
            segments = []
            for event in data.get("events", []):
                if "segs" not in event:
                    continue
                text = "".join(s.get("utf8", "") for s in event["segs"]).strip()
                if text and text != "\n":
                    start_ms = event.get("tStartMs", 0)
                    segments.append({"text": text, "start": start_ms / 1000})
            full_text = " ".join(s["text"] for s in segments)
            if full_text.strip():
                return {"text": full_text, "segments": segments, "video_id": actual_id}

    raise ValueError("No transcript could be extracted for this video.")


def load_youtube(url: str) -> dict:
    """
    Returns: { "text": full transcript, "segments": [{text, start}], "video_id": str }

    Tries youtube-transcript-api first (fast, low overhead). Falls back to yt-dlp
    when that fails — yt-dlp handles cloud/datacenter IP restrictions more robustly.
    """
    video_id = extract_video_id(url)

    try:
        return _via_transcript_api(video_id)
    except Exception:
        # Primary method failed (common from cloud IPs) — try yt-dlp
        return _via_ytdlp(url, video_id)
