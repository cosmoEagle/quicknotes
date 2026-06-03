import ipaddress
from urllib.parse import urlparse

ALLOWED_SCHEMES = {"http", "https"}
BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254"}


def validate_url(url: str) -> None:
    """Raise ValueError for URLs that could reach internal/private services (SSRF)."""
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise ValueError(f"URL scheme '{parsed.scheme}' is not allowed. Use http or https.")
    host = (parsed.hostname or "").lower()
    if host in BLOCKED_HOSTS:
        raise ValueError("Requests to internal/private addresses are not allowed.")
    try:
        addr = ipaddress.ip_address(host)
        if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
            raise ValueError("Requests to private/link-local IPs are not allowed.")
    except ValueError as exc:
        if "not allowed" in str(exc):
            raise
        # Not a bare IP address — it's a hostname, which is fine
