import asyncio
import base64
import hashlib
import hmac
import json
import subprocess
import time

import pytest
from fastapi.testclient import TestClient

from e2ee import (
    decrypt_bytes,
    decrypt_message,
    derive_key,
    derive_session_transport_key,
    encrypt_bytes,
    encrypt_message,
)

TEST_SIGNING_SECRET = "ld039-test-signing-secret-do-not-use-in-prod"
TEST_STATIC_E2EE_SECRET = "static-operator-admin-e2ee-secret"


def _mint_jwt(email: str, secret: str = TEST_SIGNING_SECRET, ttl: int = 3600) -> str:
    payload = {"p": "ai-analyst", "e": email, "exp": int(time.time()) + ttl}
    body_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).decode("ascii").rstrip("=")
    sig = base64.urlsafe_b64encode(
        hmac.new(secret.encode("utf-8"), body_b64.encode("ascii"), hashlib.sha256).digest()
    ).decode("ascii").rstrip("=")
    return f"{body_b64}.{sig}"


def test_derive_key():
    key1 = derive_key("my-secret")
    key2 = derive_key("my-secret")
    key3 = derive_key("other-secret")
    assert key1 == key2
    assert key1 != key3
    assert len(key1) == 32  # 256-bit key


def test_encrypt_decrypt_message():
    secret = "test-secret-123"
    message = json.dumps({"type": "input", "payload": "ls -la\r"})

    encrypted_b64 = encrypt_message(message, secret)
    assert isinstance(encrypted_b64, str)
    assert encrypted_b64 != message

    decrypted = decrypt_message(encrypted_b64, secret)
    assert decrypted == message


def test_encrypt_decrypt_bytes():
    secret = "test-secret-123"
    data = b"\x1b[31mHello World\x1b[0m"

    encrypted_bytes = encrypt_bytes(data, secret)
    assert isinstance(encrypted_bytes, bytes)
    assert encrypted_bytes != data

    decrypted = decrypt_bytes(encrypted_bytes, secret)
    assert decrypted == data


def test_invalid_key_fails():
    secret1 = "key1"
    secret2 = "key2"
    msg = "test"

    encrypted = encrypt_message(msg, secret1)

    with pytest.raises(Exception):
        decrypt_message(encrypted, secret2)


def test_derive_session_transport_key_vector_parity():
    """Verify bit-for-bit HMAC-SHA256 vector parity with LeadDeeds downloadTokens.ts (LD-039)."""
    token_a = _mint_jwt("tenant_a@example.com")
    token_b = _mint_jwt("tenant_b@example.com")

    expected_a = hmac.new(
        TEST_SIGNING_SECRET.encode("utf-8"),
        f"joshua-session-transport:{token_a}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    derived_a = derive_session_transport_key(token_a, f"  {TEST_SIGNING_SECRET}  ")
    derived_b = derive_session_transport_key(token_b, TEST_SIGNING_SECRET)

    assert derived_a == expected_a
    assert len(derived_a) == 64
    assert derived_a != derived_b
    assert derive_session_transport_key("", TEST_SIGNING_SECRET) == ""
    assert derive_session_transport_key(token_a, "") == ""

    payload = json.dumps({"type": "submit", "payload": "audit check"})
    cipher = encrypt_message(payload, derived_a)
    assert decrypt_message(cipher, derived_a) == payload
    with pytest.raises(Exception):
        decrypt_message(cipher, derived_b)
    with pytest.raises(Exception):
        decrypt_message(cipher, TEST_STATIC_E2EE_SECRET)


def test_ws_helpers_preserve_admin_default_and_honor_override(monkeypatch):
    """Plane A admin helpers default to E2EE_SECRET while explicit override isolates public sessions."""
    import ws_handler

    monkeypatch.setattr(ws_handler, "ENABLE_E2EE", True)
    monkeypatch.setattr(ws_handler, "E2EE_SECRET", TEST_STATIC_E2EE_SECRET)

    sent_frames: list[tuple[str, object]] = []

    class _DummyWS:
        def __init__(self, inbound: list[str] | None = None):
            self._inbound = list(inbound or [])

        async def send_bytes(self, data: bytes):
            sent_frames.append(("bytes", data))

        async def send_text(self, text: str):
            sent_frames.append(("text", text))

        async def receive_text(self) -> str:
            return self._inbound.pop(0)

    ws = _DummyWS()
    asyncio.run(ws_handler.ws_send_app_text(ws, "admin-frame"))
    kind, raw = sent_frames.pop()
    assert kind == "bytes"
    assert decrypt_bytes(raw, TEST_STATIC_E2EE_SECRET) == b"admin-frame"

    tenant_key = "per-jwt-derived-secret-material"
    asyncio.run(ws_handler.ws_send_app_text(ws, "tenant-frame", e2ee_secret=tenant_key))
    kind, raw = sent_frames.pop()
    assert kind == "bytes"
    assert decrypt_bytes(raw, tenant_key) == b"tenant-frame"
    with pytest.raises(Exception):
        decrypt_bytes(raw, TEST_STATIC_E2EE_SECRET)

    # Empty e2ee_secret override must NOT fall back to static E2EE_SECRET
    asyncio.run(ws_handler.ws_send_app_text(ws, "unencrypted-fallback", e2ee_secret=""))
    kind, raw = sent_frames.pop()
    assert kind == "text"
    assert raw == "unencrypted-fallback"

    enc_admin_input = encrypt_message(
        json.dumps({"type": "submit", "payload": "admin-ok"}), TEST_STATIC_E2EE_SECRET
    )
    ws_in = _DummyWS([enc_admin_input])
    parsed = asyncio.run(ws_handler.ws_drain_client_or_sleep(ws_in, timeout=0.5))
    assert parsed == {"type": "submit", "payload": "admin-ok"}


def test_public_ws_e2ee_per_jwt_transport_key_and_cross_tenant_rejection(tmp_path, monkeypatch):
    """Public agent-* WS must use per-JWT transport key and reject static E2EE_SECRET or other tenant keys (LD-039)."""
    import routes_agents
    import routes_sessions
    import watchfiles
    import ws_handler
    from main import app

    monkeypatch.setenv("LEADDEED_DOWNLOAD_SIGNING_SECRET", TEST_SIGNING_SECRET)
    monkeypatch.setattr(ws_handler, "ENABLE_E2EE", True)
    monkeypatch.setattr(ws_handler, "E2EE_SECRET", TEST_STATIC_E2EE_SECRET)

    wid_a = "op_ld039_tenanta_0000000000000001"
    seat_a = tmp_path / f"agent-{wid_a}"
    tx_dir = seat_a / "brain" / "conv-1" / ".system_generated" / "logs"
    tx_dir.mkdir(parents=True)
    tx_file = tx_dir / "transcript.jsonl"
    tx_file.write_text("", encoding="utf-8")
    (seat_a / "grok_data").mkdir(parents=True)

    monkeypatch.setattr(routes_agents, "AGENT_WORKSPACES_DIR", str(tmp_path))
    monkeypatch.setattr(ws_handler, "AGENT_WORKSPACES_DIR", str(tmp_path))
    monkeypatch.setattr(ws_handler, "resolve_workspace_id_for_email", lambda _e: wid_a)

    pasted_prompts: list[str] = []

    class _FakeProc:
        def __init__(self, returncode=0, stdout=b"", stderr=b""):
            self.returncode = returncode
            self._stdout = stdout
            self._stderr = stderr

        async def wait(self):
            return self.returncode

        async def communicate(self):
            return self._stdout, self._stderr

    async def _noop_kill(*_a, **_k):
        return None

    async def _fake_exec(*args, **_kwargs):
        cmd = list(args)
        if cmd[:2] == ["tmux", "has-session"]:
            return _FakeProc(0)
        if cmd[:2] == ["tmux", "list-panes"]:
            return _FakeProc(0, stdout=b"opencode\n")
        return _FakeProc(0)

    def _fake_run(args, **_kwargs):
        cmd = list(args)
        if cmd[:2] == ["tmux", "set-buffer"] and len(cmd) > 2:
            pasted_prompts.append(cmd[2])
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")

    _real_sleep = asyncio.sleep

    async def _fast_sleep(_delay, *_a, **_k):
        await _real_sleep(0)

    async def _scripted_awatch(*_a, **_k):
        # Write one live assistant response line and emit change so egress encrypts it
        await _real_sleep(0.02)
        entry = {
            "source": "MODEL",
            "type": "PLANNER_RESPONSE",
            "content": "Sovereign E2EE reply for Tenant A",
        }
        with open(tx_file, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry) + "\n")
        yield {(1, str(tx_file))}
        parked = asyncio.Event()
        try:
            await parked.wait()
        except asyncio.CancelledError:
            return

    monkeypatch.setattr(routes_sessions, "kill_all_user_sessions", _noop_kill)
    monkeypatch.setattr(ws_handler.asyncio, "create_subprocess_exec", _fake_exec)
    monkeypatch.setattr(ws_handler.subprocess, "run", _fake_run)
    monkeypatch.setattr(ws_handler.asyncio, "sleep", _fast_sleep)
    monkeypatch.setattr(watchfiles, "awatch", _scripted_awatch)

    token_a = _mint_jwt("tenant_a@example.com")
    token_b = _mint_jwt("tenant_b@example.com")
    key_a = derive_session_transport_key(token_a, TEST_SIGNING_SECRET)
    key_b = derive_session_transport_key(token_b, TEST_SIGNING_SECRET)

    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "auth", "token": token_a, "harness": "admin-cli"}))
        auth_ok = json.loads(ws.receive_text())
        assert auth_ok["type"] == "auth_success"

        # 1. Outbound transcript frame is encrypted with key_a (NOT static E2EE_SECRET or key_b)
        outbound_cipher = ws.receive_bytes()
        assert decrypt_bytes(outbound_cipher, key_a).decode("utf-8") == "Sovereign E2EE reply for Tenant A"
        with pytest.raises(Exception):
            decrypt_bytes(outbound_cipher, TEST_STATIC_E2EE_SECRET)
        with pytest.raises(Exception):
            decrypt_bytes(outbound_cipher, key_b)

        # 2. Frame encrypted with static E2EE_SECRET is rejected with ingest_error (no paste, no disconnect)
        forged_static = encrypt_message(
            json.dumps({"type": "submit", "payload": "evil-static-key-cmd"}),
            TEST_STATIC_E2EE_SECRET,
        )
        ws.send_text(forged_static)
        err_static = json.loads(ws.receive_text())
        assert err_static["type"] == "ingest_error"
        assert "mismatch" in err_static["message"].lower()
        assert pasted_prompts == []

        # 3. Frame encrypted with Tenant B's derived key is rejected on Tenant A's socket
        forged_tenant_b = encrypt_message(
            json.dumps({"type": "submit", "payload": "evil-cross-tenant-cmd"}),
            key_b,
        )
        ws.send_text(forged_tenant_b)
        err_b = json.loads(ws.receive_text())
        assert err_b["type"] == "ingest_error"
        assert pasted_prompts == []

        # 4. Encrypted ping + valid submit with Tenant A's derived key both succeed on the live socket
        ws.send_text(encrypt_message(json.dumps({"type": "ping"}), key_a))
        ws.send_text(
            encrypt_message(
                json.dumps({"type": "submit", "payload": "legitimate-tenant-a-prompt"}),
                key_a,
            )
        )
        # Allow async ingest loop to process before closing context
        time.sleep(0.05)

    assert pasted_prompts == ["legitimate-tenant-a-prompt"]
