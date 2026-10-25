import time
import uuid
from collections import defaultdict, deque
from typing import AsyncIterator

from fastapi import Depends, HTTPException, Request

from .auth import require_user


class SlidingWindow:
    """Allow at most `limit` hits per key in any rolling `window` seconds."""

    def __init__(self, limit: int, window: float, label: str):
        self.limit = limit
        self.window = window
        self.label = label
        self.hits: dict[str, deque] = defaultdict(deque)

    def retry_after(self, key: str) -> int | None:
        """Seconds until `key` may hit again, or None if it's allowed now."""
        now = time.monotonic()
        q = self.hits.get(key)
        if q is None:
            return None
        while q and q[0] <= now - self.window:
            q.popleft()
        if not q:
            del self.hits[key]
            return None
        if len(q) < self.limit:
            return None
        return max(1, int(q[0] + self.window - now) + 1)

    def add(self, key: str) -> None:
        self.hits[key].append(time.monotonic())
        if len(self.hits) > 10_000:
            cutoff = time.monotonic() - self.window
            for k in [k for k, q in self.hits.items() if not q or q[-1] <= cutoff]:
                del self.hits[k]

    def reset(self) -> None:
        self.hits.clear()


class StreamSlots:
    """Cap concurrent streams per key; slots older than `max_age` are reclaimed."""

    def __init__(self, limit: int, max_age: float):
        self.limit = limit
        self.max_age = max_age
        self.active: dict[str, dict[str, float]] = defaultdict(dict)

    def acquire(self, key: str) -> str:
        now = time.monotonic()
        slots = self.active[key]
        for slot_id in [s for s, started in slots.items() if now - started > self.max_age]:
            del slots[slot_id]
        if len(slots) >= self.limit:
            raise HTTPException(
                429,
                f"You already have {self.limit} generations running — wait for one to finish.",
                headers={"Retry-After": "10"},
            )
        slot_id = uuid.uuid4().hex
        slots[slot_id] = now
        return slot_id

    def release(self, key: str, slot_id: str) -> None:
        slots = self.active.get(key)
        if slots is not None:
            slots.pop(slot_id, None)
            if not slots:
                del self.active[key]

    def reset(self) -> None:
        self.active.clear()


IP_LIMIT = SlidingWindow(30, 60, "per minute")
ROUTE_LIMITS = {
    "generate": [SlidingWindow(5, 60, "per minute"), SlidingWindow(50, 86_400, "per day")],
    "revise": [SlidingWindow(20, 60, "per minute")],
}
STREAM_SLOTS = StreamSlots(limit=2, max_age=300)


def _enforce(windows: list[SlidingWindow], key: str, what: str) -> None:
    waits = [(w.retry_after(key), w) for w in windows]
    blocked = [(wait, w) for wait, w in waits if wait is not None]
    if blocked:
        wait, w = max(blocked, key=lambda b: b[0])
        raise HTTPException(
            429,
            f"Too many {what} ({w.limit} {w.label}) — try again in {wait}s.",
            headers={"Retry-After": str(wait)},
        )
    for w in windows:
        w.add(key)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def enforce_ip_limit(request: Request) -> None:
    _enforce([IP_LIMIT], client_ip(request), "requests from your network")


def rate_limited(route: str):
    """Dependency: IP limit, then auth, then per-user limits. Returns the user id."""
    windows = ROUTE_LIMITS[route]

    async def dependency(
        _ip: None = Depends(enforce_ip_limit),
        user_id: str = Depends(require_user),
    ) -> str:
        _enforce(windows, user_id, "requests")
        return user_id

    return dependency


async def release_when_done(stream: AsyncIterator[str], key: str, slot_id: str) -> AsyncIterator[str]:
    """Release the stream's concurrency slot when it finishes."""
    try:
        async for chunk in stream:
            yield chunk
    finally:
        STREAM_SLOTS.release(key, slot_id)
