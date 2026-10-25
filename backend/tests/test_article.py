import http.server
import threading
import time

import pytest

from backend.loaders import article
from backend.loaders.article import load_article
from backend.utils.url_validation import is_public_ip, validate_url


class _Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/redirect":
            self.send_response(302)
            self.send_header("Location", "/page")
            self.end_headers()
            return
        if self.path == "/loop":
            self.send_response(302)
            self.send_header("Location", "/loop")
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        if self.path == "/huge":
            chunk = b"<p>" + b"x" * 65_536 + b"</p>"
            for _ in range(200):  # ~13 MB
                self.wfile.write(chunk)
            return
        if self.path == "/slow":
            for _ in range(10):
                self.wfile.write(b"<p>drip</p>")
                self.wfile.flush()
                time.sleep(0.3)
            return
        self.wfile.write(b"<html><title>T</title><body><article>INTERNAL-SECRET</article></body></html>")

    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def server():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


@pytest.fixture
def allow_loopback(monkeypatch):
    """Let the loader reach the local test server so size/redirect logic can be exercised."""
    monkeypatch.setattr(article, "validate_url", lambda url: None)
    monkeypatch.setattr(article, "is_public_ip", lambda ip: True)


@pytest.mark.parametrize("ip,expected", [
    ("8.8.8.8", True),
    ("2606:4700:4700::1111", True),
    ("127.0.0.1", False),
    ("10.1.2.3", False),
    ("192.168.0.1", False),
    ("169.254.169.254", False),
    ("100.64.0.1", False),       # CGNAT
    ("::1", False),
    ("::ffff:127.0.0.1", False),  # IPv4-mapped loopback
    ("fe80::1%eth0", False),
    ("224.0.0.1", False),
    ("not-an-ip", False),
])
def test_is_public_ip(ip, expected):
    assert is_public_ip(ip) is expected


@pytest.mark.parametrize("url", [
    "http://localhost/",
    "http://localhost./",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.1/",
])
def test_validate_url_blocks_internal(url):
    with pytest.raises(ValueError):
        validate_url(url)


@pytest.mark.parametrize("url", ["ftp://example.com/", "file:///etc/passwd", "http:///nohost"])
def test_validate_url_rejects_bad_scheme_or_host(url):
    with pytest.raises(ValueError):
        validate_url(url)


def test_peer_check_blocks_loopback_even_if_dns_check_passes(server, monkeypatch):
    # Simulates DNS rebinding: pre-flight check passes, but the socket lands on 127.0.0.1.
    monkeypatch.setattr(article, "validate_url", lambda url: None)
    with pytest.raises(ValueError, match="not allowed"):
        load_article(server + "/page")


def test_redirect_target_is_revalidated(server, monkeypatch):
    seen = []
    def fake_validate(url):
        seen.append(url)
        if url.endswith("/page"):
            raise ValueError("Requests to internal/private addresses are not allowed.")
    monkeypatch.setattr(article, "validate_url", fake_validate)
    monkeypatch.setattr(article, "is_public_ip", lambda ip: True)
    with pytest.raises(ValueError, match="not allowed"):
        load_article(server + "/redirect")
    assert seen == [server + "/redirect", server + "/page"]


def test_follows_redirect(server, allow_loopback):
    assert load_article(server + "/redirect")["text"] == "INTERNAL-SECRET"


def test_redirect_loop_is_capped(server, allow_loopback):
    with pytest.raises(ValueError, match="Too many redirects"):
        load_article(server + "/loop")


def test_huge_page_is_rejected(server, allow_loopback):
    with pytest.raises(ValueError, match="too large"):
        load_article(server + "/huge")


def test_slow_drip_hits_total_deadline(server, allow_loopback, monkeypatch):
    monkeypatch.setattr(article, "TOTAL_TIMEOUT", 0.5)
    with pytest.raises(ValueError, match="Timed out"):
        load_article(server + "/slow")
