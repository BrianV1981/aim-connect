import json
import logging
import os
import socket
import subprocess
import time

from fastapi.testclient import TestClient

from e2ee import encrypt_message


def test_admin_ws_write_to_pty_suppresses_per_frame_info_spam(monkeypatch, caplog):
    """Inbound Plane A keystrokes, resizes, and pings must not spam INFO logs (#241)."""
    import main
    import ws_handler

    secret = "test-e2ee-plane-a-secret"
    admin_token = "test-admin-ws-token-241"

    monkeypatch.setattr(ws_handler, "ENABLE_E2EE", True)
    monkeypatch.setattr(ws_handler, "E2EE_SECRET", secret)
    monkeypatch.setattr(ws_handler, "ALLOWED_IPS", "")
    ws_handler.auth_attempts.clear()
    monkeypatch.setitem(
        ws_handler.VALID_API_TOKENS,
        admin_token,
        {"expires": time.time() + 3600, "role": "admin", "prefix": ""},
    )

    parent_sock, peer_sock = socket.socketpair()
    parent_fd = parent_sock.detach()

    monkeypatch.setattr(ws_handler.pty, "fork", lambda: (424242, parent_fd))
    monkeypatch.setattr(ws_handler, "set_pty_size", lambda *_a, **_k: None)
    monkeypatch.setattr(ws_handler.os, "kill", lambda *_a, **_k: None)
    monkeypatch.setattr(ws_handler.os, "waitpid", lambda *_a, **_k: (424242, 0))
    async def _noop_async_tmux(*_a, **_kw):
        return (0, "aim-connect\n", "")

    monkeypatch.setattr(ws_handler, "_run_tmux_cmd", _noop_async_tmux)
    monkeypatch.setattr(
        ws_handler.subprocess,
        "run",
        lambda args, **_kw: subprocess.CompletedProcess(args, 0, stdout="aim-connect\n", stderr=""),
    )

    caplog.set_level(logging.INFO, logger="aim-connect")

    client = TestClient(main.app)
    try:
        with client.websocket_connect("/ws") as ws:
            ws.send_text(
                json.dumps({"type": "auth", "token": admin_token, "harness": "admin", "session": "aim-connect"})
            )
            auth_msg = json.loads(ws.receive_text())
            assert auth_msg["type"] == "auth_success"

            for ch in ("l", "s", "\r"):
                ws.send_text(encrypt_message(json.dumps({"type": "input", "payload": ch}), secret))
            ws.send_text(encrypt_message(json.dumps({"type": "resize", "rows": 40, "cols": 120}), secret))
            ws.send_text(encrypt_message(json.dumps({"type": "ping"}), secret))

            peer_sock.settimeout(2.0)
            received = b""
            while len(received) < 3:
                chunk = peer_sock.recv(64)
                if not chunk:
                    break
                received += chunk
            assert received == b"ls\r"
            # Allow resize & ping frames right behind 'ls\r' to be processed before EOF
            time.sleep(0.05)
            peer_sock.close()
    finally:
        try:
            peer_sock.close()
        except OSError:
            pass

    spam_records = [
        rec.getMessage()
        for rec in caplog.records
        if rec.levelno >= logging.INFO and "Processing message" in rec.getMessage()
    ]
    assert spam_records == [], f"Expected zero per-frame INFO spam records, got: {spam_records}"


def test_runtime_requirements_and_uvicorn_ws_flags(tmp_path):
    """Verify uvloop/httptools requirements, tuned Uvicorn WS flags, and Cloudflare HTTP/2 docs (#242)."""
    from pathlib import Path
    from tests.test_startup_topology import _make_mock_bin

    repo_root = Path(__file__).resolve().parents[2]
    req_txt = (repo_root / "backend" / "requirements.txt").read_text(encoding="utf-8")
    assert "uvloop" in req_txt and "sys_platform != 'win32'" in req_txt
    assert "httptools" in req_txt and "sys_platform != 'win32'" in req_txt

    startup_sh = repo_root / "startup.sh"
    startup_txt = startup_sh.read_text(encoding="utf-8")
    assert "--ws-ping-interval" in startup_txt
    assert "--ws-ping-timeout" in startup_txt
    assert "--ws-max-queue" in startup_txt

    # Verify detached tmux launch passes tuned WS flags when :8000 is down
    bin_dir, log_file = _make_mock_bin(
        tmp_path, lsof_8000="", lsof_8001="5311", pgrep_cf="5306", has_session=0
    )
    env = dict(os.environ)
    env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"
    res = subprocess.run(
        ["bash", str(startup_sh)],
        cwd=str(repo_root),
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert res.returncode == 0, res.stderr
    calls = log_file.read_text(encoding="utf-8")
    assert "--ws-ping-interval 30" in calls
    assert "--ws-ping-timeout 60" in calls
    assert "--ws-max-queue 128" in calls

    readme_txt = (repo_root / "README.md").read_text(encoding="utf-8")
    assert "protocol: http2" in readme_txt


def test_admin_ws_async_session_lookup_and_switch_session(monkeypatch):
    """Admin session lookup and switch_session must use async subprocesses, never blocking subprocess.run (#243)."""
    import ws_handler
    import main

    secret = "test-e2ee-plane-a-243"
    admin_token = "test-admin-ws-token-243"

    monkeypatch.setattr(ws_handler, "ENABLE_E2EE", True)
    monkeypatch.setattr(ws_handler, "E2EE_SECRET", secret)
    monkeypatch.setattr(ws_handler, "ALLOWED_IPS", "")
    ws_handler.auth_attempts.clear()
    monkeypatch.setitem(
        ws_handler.VALID_API_TOKENS,
        admin_token,
        {"expires": time.time() + 3600, "role": "admin", "prefix": ""},
    )

    parent_sock, peer_sock = socket.socketpair()
    parent_fd = parent_sock.detach()

    monkeypatch.setattr(ws_handler.pty, "fork", lambda: (515151, parent_fd))
    monkeypatch.setattr(ws_handler, "set_pty_size", lambda *_a, **_k: None)
    monkeypatch.setattr(ws_handler.os, "kill", lambda *_a, **_k: None)
    monkeypatch.setattr(ws_handler.os, "waitpid", lambda *_a, **_k: (515151, 0))

    def _forbid_sync_run(args, **_kw):
        raise AssertionError(f"Blocking subprocess.run called on event loop: {args}")

    async_cmds: list[list[str]] = []

    class _FakeAsyncProc:
        def __init__(self, rc=0, out=b"", err=b""):
            self.returncode = rc
            self._out = out
            self._err = err

        async def communicate(self, input=None):
            return self._out, self._err

        async def wait(self):
            return self.returncode

    async def _fake_create_subproc(*args, **_kw):
        cmd = list(args)
        async_cmds.append(cmd)
        if cmd[:2] == ["tmux", "ls"]:
            return _FakeAsyncProc(0, out=b"aim-connect-workspace\nagent-op_1-opencode\naim-alpha\n")
        if cmd[:2] == ["tmux", "has-session"]:
            return _FakeAsyncProc(0)
        if cmd[:2] == ["tmux", "list-clients"]:
            return _FakeAsyncProc(0, out=b"/dev/pts/77 111111\n/dev/pts/99 515151\n")
        if cmd[:2] == ["tmux", "switch-client"]:
            return _FakeAsyncProc(0)
        return _FakeAsyncProc(0)

    monkeypatch.setattr(ws_handler.subprocess, "run", _forbid_sync_run)
    monkeypatch.setattr(ws_handler.asyncio, "create_subprocess_exec", _fake_create_subproc)

    client = TestClient(main.app)
    try:
        with client.websocket_connect("/ws") as ws:
            # Omit 'session' so initial tmux ls + has-session execute
            ws.send_text(json.dumps({"type": "auth", "token": admin_token, "harness": "admin"}))
            auth_msg = json.loads(ws.receive_text())
            assert auth_msg["type"] == "auth_success"

            ws.send_text(
                encrypt_message(json.dumps({"type": "switch_session", "session": "aim-beta"}), secret)
            )
            ws.send_text(encrypt_message(json.dumps({"type": "input", "payload": "ok"}), secret))

            peer_sock.settimeout(2.0)
            assert peer_sock.recv(16) == b"ok"
            peer_sock.close()
    finally:
        try:
            peer_sock.close()
        except OSError:
            pass

    assert ["tmux", "ls", "-F", "#{session_name}"] in async_cmds
    assert ["tmux", "has-session", "-t", "aim-alpha"] in async_cmds
    assert ["tmux", "list-clients", "-F", "#{client_tty} #{client_pid}"] in async_cmds
    assert ["tmux", "switch-client", "-c", "/dev/pts/99", "-t", "aim-beta"] in async_cmds


def test_frontend_deduplicates_reconnect_switch_session():
    """App.jsx must skip redundant switch_session on auth_success when auth already bound the session (#243)."""
    from pathlib import Path

    repo_root = Path(__file__).resolve().parents[2]
    app_jsx = (repo_root / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
    assert "authRequestedSession" in app_jsx
    assert "activeSessionRef.current !== authRequestedSession" in app_jsx


