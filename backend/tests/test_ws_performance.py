import json
import logging
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
