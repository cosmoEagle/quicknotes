import pytest

from backend.main import app
from backend.utils import rate_limit
from backend.utils.auth import require_user


@pytest.fixture(autouse=True)
def _isolate_limits_and_auth():
    """Fresh limiter state per test; endpoints see a signed-in user unless a test
    removes the override to exercise real token verification."""
    rate_limit.IP_LIMIT.reset()
    for windows in rate_limit.ROUTE_LIMITS.values():
        for w in windows:
            w.reset()
    rate_limit.STREAM_SLOTS.reset()
    app.dependency_overrides[require_user] = lambda: "test-user"
    yield
    app.dependency_overrides.clear()
