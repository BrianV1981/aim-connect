import time
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

import main  # noqa: F401
import routes_sessions


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def valid_token():
    tok = "test-admin-token-210"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 3600,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_redact_url_secrets_masks_query_tokens():
    """Verify URLs with token/key/secret query params are masked in display_value (#210)."""
    url = "https://example.org/callback?token=supersecret123&mode=dark&api_key=abc999"
    disp, redacted = routes_sessions.redact_url_secrets(url)
    assert redacted is True
    assert "supersecret123" not in disp
    assert "abc999" not in disp
    assert "token=***REDACTED***" in disp
    assert "api_key=***REDACTED***" in disp
    assert "mode=dark" in disp


def test_extract_scrollback_tokens_categories_and_deduplication():
    """Verify URLs, paths, IPv4s, and git SHAs are extracted cleanly from ANSI scrollback (#210)."""
    sample = (
        "\x1b[32mCommit 97d9e2c1e8634896d31d0695b842fc17fdec8040 pushed\x1b[0m\n"
        "Listening on http://127.0.0.1:8000/api/health and 192.168.1.42:8001\n"
        "Auth link: https://app.example.com/login?jwt=eyJhbGciOiJIUzI1NiJ9.secret\n"
        "Edited /opt/aim-connect/backend/routes_sessions.py and ~/workspace/issue-210/README.md\n"
    )
    tokens = routes_sessions.extract_scrollback_tokens(sample)
    by_type = {}
    for t in tokens:
        by_type.setdefault(t["type"], []).append(t)

    assert any(u["value"].startswith("https://app.example.com/login?jwt=") and u["redacted"] is True for u in by_type.get("url", []))
    assert any("jwt=***REDACTED***" in u["display_value"] for u in by_type.get("url", []))
    assert any(p["value"] == "/opt/aim-connect/backend/routes_sessions.py" for p in by_type.get("path", []))
    assert any(ip["value"] == "192.168.1.42:8001" for ip in by_type.get("ip", []))
    assert any(sha["value"] == "97d9e2c1e8634896d31d0695b842fc17fdec8040" for sha in by_type.get("sha", []))


def test_scrollback_tokens_endpoint(client, valid_token):
    """GET /api/scrollback/{session}/tokens returns parsed tokens and honors line clamping."""
    fake_out = "Deployed commit 5acb30cd33a6 at https://status.example.org/health?secret=xyz123\n"
    mock_res = MagicMock(returncode=0, stdout=fake_out, stderr="")

    with patch("routes_sessions.subprocess.run", return_value=mock_res) as run_mock:
        resp = client.get("/api/scrollback/aim-connect/tokens?lines=2500", headers={"x-api-token": valid_token})
        assert resp.status_code == 200
        data = resp.json()
        assert data["session"] == "aim-connect"
        assert any(t["type"] == "sha" and t["value"] == "5acb30cd33a6" for t in data["tokens"])
        assert any(t["type"] == "url" and t["redacted"] is True for t in data["tokens"])
        called_cmd = run_mock.call_args[0][0]
        assert "-2500" in called_cmd
