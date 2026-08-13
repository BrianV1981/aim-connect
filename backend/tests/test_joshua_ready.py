"""#189 — GET /api/joshua/ready and disk-first Grok OAuth status.

Uses a test HMAC + isolated AGENT_WORKSPACES_DIR. Does not spawn grok login.
"""

import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

TEST_SIGNING_SECRET = "aim-connect-test-hmac-secret-not-prod"
TEST_WID = "op_test189abcdef0123456789abcdef01"


def _mint(payload: dict, secret: str = TEST_SIGNING_SECRET) -> str:
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode()
    ).decode().rstrip("=")
    mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
    sig = base64.urlsafe_b64encode(mac).decode().rstrip("=")
    return f"{payload_b64}.{sig}"


def _token(email: str = "tester@example.com") -> str:
    return _mint({"e": email, "exp": time.time() + 3600})


@pytest.fixture
def jwt_secret(monkeypatch):
    monkeypatch.setenv("LEADDEED_DOWNLOAD_SIGNING_SECRET", TEST_SIGNING_SECRET)
    return TEST_SIGNING_SECRET


@pytest.fixture
def isolated_seat(tmp_path, monkeypatch, jwt_secret):
    import routes_agents
    import ws_handler

    monkeypatch.setattr(routes_agents, "AGENT_WORKSPACES_DIR", str(tmp_path))
    monkeypatch.setattr(routes_agents, "resolve_workspace_id_for_email", lambda _e: TEST_WID)
    monkeypatch.setattr(ws_handler, "resolve_workspace_id_for_email", lambda _e: TEST_WID)
    seat = tmp_path / f"agent-{TEST_WID}"
    (seat / "grok_data").mkdir(parents=True)
    return seat


def _client():
    from main import app
    return TestClient(app)


class TestJoshuaReady:
    def test_no_token_401(self, isolated_seat):
        res = _client().get("/api/joshua/ready", params={"harness": "grok"})
        assert res.status_code == 401

    def test_opencode_ready_without_auth_json(self, isolated_seat):
        res = _client().get(
            "/api/joshua/ready",
            params={"token": _token(), "harness": "opencode"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["ready"] is True
        assert body["harness"] == "opencode"
        assert body["workspace_id"] == TEST_WID

    def test_grok_missing_not_ready(self, isolated_seat):
        res = _client().get(
            "/api/joshua/ready",
            params={"token": _token(), "harness": "grok"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["ready"] is False
        assert body["grok_auth"] == "missing"
        assert body["workspace_id"] == TEST_WID

    def test_grok_zero_byte_not_ready(self, isolated_seat):
        (isolated_seat / "grok_data" / "auth.json").write_bytes(b"")
        res = _client().get(
            "/api/joshua/ready",
            params={"token": _token(), "harness": "grok"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["ready"] is False
        assert body["grok_auth"] == "empty"

    def test_grok_valid_token_ready(self, isolated_seat):
        (isolated_seat / "grok_data" / "auth.json").write_bytes(b"x" * 120)
        res = _client().get(
            "/api/joshua/ready",
            params={"token": _token(), "harness": "grok"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["ready"] is True
        assert body["grok_auth"] == "ok"
        assert body["workspace_id"] == TEST_WID


class TestGrokOauthDisk:
    def test_status_disk_success_without_memory(self, isolated_seat):
        (isolated_seat / "grok_data" / "auth.json").write_bytes(b"x" * 120)
        res = _client().get("/api/grok/oauth/status", params={"token": _token()})
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "success"
        assert body["source"] == "disk"
        assert body["workspace_id"] == TEST_WID

    def test_init_already_ready_does_not_delete(self, isolated_seat):
        auth = isolated_seat / "grok_data" / "auth.json"
        auth.write_bytes(b"x" * 120)
        res = _client().post("/api/grok/oauth/init", params={"token": _token()})
        assert res.status_code == 200
        body = res.json()
        assert body.get("already_ready") is True
        assert body["workspace_id"] == TEST_WID
        assert auth.is_file()
        assert auth.stat().st_size == 120

    def test_init_force_deletes_only_then_fails_parse(self, isolated_seat, monkeypatch):
        """force=1 may delete a good token. We stub spawn so no real grok login."""
        import asyncio
        import routes_agents

        auth = isolated_seat / "grok_data" / "auth.json"
        auth.write_bytes(b"x" * 120)

        class _FakeProc:
            stdout = None

        async def _boom(*_a, **_k):
            raise RuntimeError("spawn-blocked-in-test")

        monkeypatch.setattr(asyncio, "create_subprocess_shell", _boom)
        res = _client().post(
            "/api/grok/oauth/init",
            params={"token": _token(), "force": "1"},
        )
        assert res.status_code == 200
        body = res.json()
        assert "error" in body
        assert not auth.exists()
