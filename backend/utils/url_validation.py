import ipaddress
import socket
from urllib.parse import urlparse

ALLOWED_SCHEMES = {"http", "https"}
BLOCKED_MSG = "Requests to internal/private addresses are not allowed."


def is_public_ip(ip: str) -> bool:
    """True only for globally routable unicast addresses."""
    try:
        addr = ipaddress.ip_address(ip.split("%", 1)[0])  # strip IPv6 zone id
    except ValueError:
        return False
    if addr.version == 6 and addr.ipv4_mapped:
        addr = addr.ipv4_mapped
    return addr.is_global and not addr.is_multicast


def validate_url(url: str) -> None:
    """Raise ValueError unless the URL is http(s) and its host resolves only to public IPs."""
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise ValueError(f"URL scheme '{parsed.scheme}' is not allowed. Use http or https.")
    host = parsed.hostname
    if not host:
        raise ValueError("URL has no host.")
    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError:
        raise ValueError("URL has an invalid port.")
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError):
        raise ValueError(f"Could not resolve host '{host}'.")
    if not infos or any(not is_public_ip(info[4][0]) for info in infos):
        raise ValueError(BLOCKED_MSG)
