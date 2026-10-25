import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from backend.main import app
from backend.routers import generate
from backend.utils import auth, rate_limit
from backend.utils.auth import require_user

SUPABASE_URL = "https://proj.supabase.co"
PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())
ORIGINAL_GET_JWKS_CLIENT = auth._get_jwks_client


class _FakeJWKS:
    def get_signing_key_from_jwt(self, token):
        class K:
            key = PRIVATE_KEY.public_key()
        return K()


def _token(sub="user-1", key=PRIVATE_KEY, **overrides):
    claims = {"sub": sub, "aud": "authenticated", "iss": f"{SUPABASE_URL}/auth/v1",
              "exp": int(time.time()) + 3600, **overrides}
    return jwt.encode(claims, key, algorithm="ES256")


@pytest.fixture
def real_auth(monkeypatch):
    app.dependency_overrides.pop(require_user, None)
    monkeypatch.setenv("SUPABASE_URL", SUPABASE_URL)
    monkeypatch.setattr(auth, "_get_jwks_client", lambda: _FakeJWKS())


@pytest.fixture
def fast_generate(monkeypatch):
    """Stub the pipeline so endpoint calls are instant and LLM-free."""
    async def fake_stream(request):
        yield generate._sse("done", "")
    monkeypatch.setattr(generate, "run_graph_stream", fake_stream)


BODY = dict(source_type="text", content="hello", style="summary",
            provider="openai", model="m", api_key="k")


def _post(client, token=None, path="/api/generate", body=BODY):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return client.post(path, json=body, headers=headers)


# ── auth ──────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("header", [None, "", "Basic abc", "Bearer "])
def test_missing_or_malformed_auth_is_401(real_auth, fast_generate, header):
    headers = {"Authorization": header} if header is not None else {}
    r = TestClient(app).post("/api/generate", json=BODY, headers=headers)
    assert r.status_code == 401


@pytest.mark.parametrize("token", [
    "not-a-jwt",
    _token(exp=int(time.time()) - 10),          # expired
    _token(aud="anon"),                          # wrong audience
    _token(iss="https://evil.supabase.co/auth/v1"),  # wrong issuer
    _token(key=OTHER_KEY),                       # signed by someone else
])
def test_invalid_tokens_are_401(real_auth, fast_generate, token):
    r = _post(TestClient(app), token)
    assert r.status_code == 401
    assert "sign in" in r.json()["detail"].lower()


def test_valid_token_is_accepted(real_auth, fast_generate):
    r = _post(TestClient(app), _token())
    assert r.status_code == 200
    assert json.loads(r.text.split("data: ", 1)[1])["event"] == "done"


def test_unconfigured_server_fails_closed(real_auth, fast_generate, monkeypatch):
    monkeypatch.delenv("SUPABASE_URL")
    monkeypatch.setattr(auth, "_get_jwks_client", ORIGINAL_GET_JWKS_CLIENT)
    monkeypatch.setattr(auth, "_jwks_client", None)
    assert _post(TestClient(app), _token()).status_code == 503


# ── per-user limits ───────────────────────────────────────────────────────

def test_generate_per_minute_limit_with_retry_after(real_auth, fast_generate):
    c = TestClient(app)
    tok = _token()
    for _ in range(5):
        assert _post(c, tok).status_code == 200
    r = _post(c, tok)
    assert r.status_code == 429
    assert 1 <= int(r.headers["Retry-After"]) <= 61
    assert "per minute" in r.json()["detail"]


def test_limits_are_per_user(real_auth, fast_generate):
    c = TestClient(app)
    for _ in range(5):
        _post(c, _token("alice"))
    assert _post(c, _token("alice")).status_code == 429
    assert _post(c, _token("bob")).status_code == 200


def test_daily_limit(real_auth, fast_generate, monkeypatch):
    minute, day = rate_limit.ROUTE_LIMITS["generate"]
    monkeypatch.setattr(minute, "limit", 1000)
    monkeypatch.setattr(rate_limit.IP_LIMIT, "limit", 1000)
    c = TestClient(app)
    for _ in range(day.limit):
        assert _post(c, _token()).status_code == 200
    r = _post(c, _token())
    assert r.status_code == 429 and "per day" in r.json()["detail"]


def test_rejected_request_does_not_consume_other_windows(monkeypatch):
    w1, w2 = rate_limit.SlidingWindow(1, 60, "a"), rate_limit.SlidingWindow(5, 60, "b")
    rate_limit._enforce([w1, w2], "k", "x")
    with pytest.raises(Exception):
        rate_limit._enforce([w1, w2], "k", "x")
    assert len(w2.hits["k"]) == 1


def test_sliding_window_expires(monkeypatch):
    now = [1000.0]
    monkeypatch.setattr(rate_limit.time, "monotonic", lambda: now[0])
    w = rate_limit.SlidingWindow(2, 60, "per minute")
    w.add("k"); w.add("k")
    assert w.retry_after("k") == 61
    now[0] += 30
    assert w.retry_after("k") == 31
    now[0] += 31
    assert w.retry_after("k") is None


# ── per-IP limit ──────────────────────────────────────────────────────────

def test_ip_limit_applies_before_auth(real_auth, fast_generate):
    c = TestClient(app)
    for _ in range(rate_limit.IP_LIMIT.limit):
        _post(c)  # unauthenticated: 401, but still counted against the IP
    r = _post(c, _token())
    assert r.status_code == 429 and "network" in r.json()["detail"]


# ── concurrent streams ────────────────────────────────────────────────────

def test_stream_slots_cap_and_release():
    slots = rate_limit.StreamSlots(limit=2, max_age=300)
    a, b = slots.acquire("u"), slots.acquire("u")
    with pytest.raises(Exception) as exc:
        slots.acquire("u")
    assert exc.value.status_code == 429
    slots.release("u", a)
    slots.acquire("u")
    slots.acquire("other")  # independent per user


def test_stale_slots_are_reclaimed(monkeypatch):
    now = [0.0]
    monkeypatch.setattr(rate_limit.time, "monotonic", lambda: now[0])
    slots = rate_limit.StreamSlots(limit=1, max_age=300)
    slots.acquire("u")
    now[0] = 301
    slots.acquire("u")  # leaked slot reclaimed instead of locking the user out


def test_slot_released_after_stream_completes(fast_generate):
    c = TestClient(app)
    for _ in range(4):  # more than the slot limit, sequentially — each releases on completion
        assert _post(c).status_code == 200
    assert not rate_limit.STREAM_SLOTS.active


def test_slot_released_when_stream_errors(monkeypatch):
    async def boom(request):
        yield generate._sse("status", "x")
        raise RuntimeError("mid-stream crash")
    monkeypatch.setattr(generate, "run_graph_stream", boom)
    c = TestClient(app, raise_server_exceptions=False)
    _post(c)
    assert not rate_limit.STREAM_SLOTS.active


def test_cors_allows_auth_header_and_exposes_retry_after(fast_generate):
    c = TestClient(app)
    origin = {"Origin": "http://localhost:3000"}
    pre = c.options("/api/generate", headers={**origin, "Access-Control-Request-Method": "POST",
                                              "Access-Control-Request-Headers": "authorization,content-type"})
    assert pre.status_code == 200
    assert "authorization" in pre.headers["access-control-allow-headers"].lower()
    for _ in range(5):
        c.post("/api/generate", json=BODY, headers=origin)
    limited = c.post("/api/generate", json=BODY, headers=origin)
    assert limited.status_code == 429
    assert "retry-after" in limited.headers["access-control-expose-headers"].lower()
