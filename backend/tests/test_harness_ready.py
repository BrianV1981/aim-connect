"""#191 — auth_success must not beat public harness spawn.

Fake JWT + isolated seat. Tmux is a recorder, never the host server.
"""

import asyncio
import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocket

TEST_SIGNING_SECRET = "aim-connect-test-hmac-secret-not-prod"
TEST_WID = "op_test191abcdef0123456789abcdef01"


def _mint(payload: dict, secret: str = TEST_SIGNING_SECRET) -> str:
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode()
    ).decode().rstrip("=")
    mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
    sig = base64.urlsafe_b64encode(mac).decode().rstrip("=")
    return f"{payload_b64}.{sig}"


def _token(email: str = "tester191@example.com") -> str:
    return _mint({"e": email, "exp": time.time() + 3600})


class _FakeProc:
    def __init__(self, returncode=0, stdout=b"", stderr=b""):
        self.returncode = returncode
        self._stdout = stdout
        self._stderr = stderr

    async def wait(self):
        return self.returncode

    async def communicate(self):
        return self._stdout, self._stderr


@pytest.fixture
def jwt_secret(monkeypatch):
    monkeypatch.setenv("LEADDEED_DOWNLOAD_SIGNING_SECRET", TEST_SIGNING_SECRET)
    return TEST_SIGNING_SECRET


@pytest.fixture
def isolated_seat(tmp_path, monkeypatch, jwt_secret):
    import routes_agents
    import ws_handler

    monkeypatch.setattr(routes_agents, "AGENT_WORKSPACES_DIR", str(tmp_path))
    monkeypatch.setattr(ws_handler, "AGENT_WORKSPACES_DIR", str(tmp_path))
    monkeypatch.setattr(routes_agents, "resolve_workspace_id_for_email", lambda _e: TEST_WID)
    monkeypatch.setattr(ws_handler, "resolve_workspace_id_for_email", lambda _e: TEST_WID)
    seat = tmp_path / f"agent-{TEST_WID}"
    seat.mkdir(parents=True)
    (seat / "grok_data").mkdir(parents=True)
    return seat


@pytest.fixture
def tmux_recorder(monkeypatch, isolated_seat):
    """Record tmux argv. Never touch the host tmux server."""
    import subprocess

    import routes_sessions
    import watchfiles
    import ws_handler

    events: list = []
    spawn_returncode = {"n": 0}

    async def _noop_kill(*_a, **_k):
        events.append("kill_sessions")

    async def _fake_exec(*args, **_kwargs):
        cmd = list(args)
        events.append(("exec", cmd))
        if cmd[:2] == ["tmux", "has-session"]:
            return _FakeProc(1)
        if cmd[:2] == ["tmux", "new-session"]:
            events.append("spawn")
            return _FakeProc(spawn_returncode["n"])
        return _FakeProc(0)

    def _fake_run(args, **kwargs):
        cmd = list(args)
        events.append(("run", cmd))
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")

    _real_sleep = asyncio.sleep

    async def _fast_sleep(delay, *a, **k):
        events.append(("sleep", delay))
        # Yield so TestClient can drain auth_success; do not spin.
        await _real_sleep(0)

    async def _stall_awatch(*_a, **_k):
        parked = asyncio.Event()
        try:
            await parked.wait()
        except asyncio.CancelledError:
            return
        yield []  # pragma: no cover — parked until cancel

    orig_send = WebSocket.send_text

    async def _wrapped_send(self, data):
        try:
            parsed = json.loads(data)
            if isinstance(parsed, dict) and parsed.get("type") in (
                "auth_success",
                "harness_ready",
            ):
                events.append(parsed["type"])
        except Exception:
            pass
        return await orig_send(self, data)

    monkeypatch.setattr(routes_sessions, "kill_all_user_sessions", _noop_kill)
    monkeypatch.setattr(ws_handler.asyncio, "create_subprocess_exec", _fake_exec)
    monkeypatch.setattr(ws_handler.subprocess, "run", _fake_run)
    monkeypatch.setattr(ws_handler.asyncio, "sleep", _fast_sleep)
    monkeypatch.setattr(watchfiles, "awatch", _stall_awatch)
    monkeypatch.setattr(WebSocket, "send_text", _wrapped_send)

    return events, spawn_returncode


def _client():
    from main import app

    return TestClient(app)


class TestPublicHarnessReady:
    def test_auth_success_not_emitted_before_spawn(self, tmux_recorder):
        events, _ = tmux_recorder
        client = _client()
        with client.websocket_connect("/ws") as ws:
            ws.send_text(
                json.dumps(
                    {
                        "type": "auth",
                        "token": _token(),
                        "harness": "admin-cli",
                    }
                )
            )
            first = json.loads(ws.receive_text())
            assert first["type"] == "auth_success"
            assert "spawn" in events
            assert events.index("spawn") < events.index("auth_success")

    def test_first_submit_after_spawn_lands_on_tmux_mock(self, tmux_recorder):
        events, _ = tmux_recorder
        client = _client()
        with client.websocket_connect("/ws") as ws:
            ws.send_text(
                json.dumps(
                    {
                        "type": "auth",
                        "token": _token(),
                        "harness": "admin-cli",
                    }
                )
            )
            assert json.loads(ws.receive_text())["type"] == "auth_success"
            ws.send_text(json.dumps({"type": "submit", "payload": "hello"}))

        runs = [e[1] for e in events if isinstance(e, tuple) and e[0] == "run"]
        set_buffers = [cmd for cmd in runs if cmd[:2] == ["tmux", "set-buffer"]]
        pastes = [cmd for cmd in runs if cmd[:2] == ["tmux", "paste-buffer"]]
        assert any(len(cmd) > 2 and cmd[2] == "hello" for cmd in set_buffers)
        assert pastes, "first submit must paste into the recorded tmux session"
        assert events.index("spawn") < events.index("auth_success")

    def test_paste_failure_sends_ingest_error(self, tmux_recorder, monkeypatch):
        events, _ = tmux_recorder
        import subprocess
        import ws_handler

        def _run(args, **kwargs):
            cmd = list(args)
            events.append(("run", cmd))
            rc = 1 if cmd[:2] == ["tmux", "paste-buffer"] else 0
            return subprocess.CompletedProcess(cmd, rc, stdout="", stderr="no pane")

        monkeypatch.setattr(ws_handler.subprocess, "run", _run)
        client = _client()
        with client.websocket_connect("/ws") as ws:
            ws.send_text(
                json.dumps(
                    {
                        "type": "auth",
                        "token": _token(),
                        "harness": "admin-cli",
                    }
                )
            )
            assert json.loads(ws.receive_text())["type"] == "auth_success"
            ws.send_text(json.dumps({"type": "submit", "payload": "hello"}))
            err = json.loads(ws.receive_text())
            assert err["type"] == "ingest_error"
            assert "not ready" in err["message"].lower()

    def test_spawn_failure_does_not_unlock(self, tmux_recorder):
        events, spawn_returncode = tmux_recorder
        spawn_returncode["n"] = 1
        client = _client()
        with client.websocket_connect("/ws") as ws:
            ws.send_text(
                json.dumps(
                    {
                        "type": "auth",
                        "token": _token(),
                        "harness": "admin-cli",
                    }
                )
            )
            try:
                first = json.loads(ws.receive_text())
            except Exception:
                first = None
        assert "auth_success" not in events
        assert "harness_ready" not in events
        if first is not None:
            assert first.get("type") not in ("auth_success", "harness_ready")
