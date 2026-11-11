"""LD-038 (#233) — Customer bwrap SMTP credential purge & loopback HMAC email relay."""

from __future__ import annotations

import asyncio
import base64
import email
import hashlib
import hmac
import json
import os
import stat
import subprocess
import time

import pytest
from fastapi.testclient import TestClient

from sandbox_smtp import (
    DEFAULT_SANDBOX_EMAIL_RELAY_URL,
    bwrap_smtp_setenv,
    mint_sandbox_relay_token,
    redact_bwrap_cmd,
    smtp_configured,
    smtp_values,
    verify_sandbox_relay_token,
)

TEST_SIGNING_SECRET = "ld038-test-signing-secret-do-not-use-in-prod"
TEST_SMTP_ENV = {
    "LEADDEED_DOWNLOAD_SIGNING_SECRET": TEST_SIGNING_SECRET,
    "LEADDEED_SMTP_HOST": "192.0.2.25",
    "LEADDEED_SMTP_PORT": "587",
    "LEADDEED_SMTP_USER": "mailer@example.org",
    "LEADDEED_SMTP_PASS": "p@ss word ultra-secret-smtp-99",
    "LEADDEED_SMTP_SECURE": "false",
    "LEADDEED_MAIL_FROM": "Sovereign Reports <mailer@example.org>",
}


class TestSmtpFlagsAndRelayTokens:
    def test_missing_is_empty(self):
        env = {"FOO": "bar"}
        assert smtp_values(env) == {}
        assert bwrap_smtp_setenv("operator@example.org", env) == ""
        assert smtp_configured(env) is False

    def test_missing_signing_secret_or_operator_email_emits_nothing(self):
        no_secret_env = {k: v for k, v in TEST_SMTP_ENV.items() if k != "LEADDEED_DOWNLOAD_SIGNING_SECRET"}
        assert smtp_configured(no_secret_env) is True
        assert bwrap_smtp_setenv("operator@example.org", no_secret_env) == ""
        assert bwrap_smtp_setenv("", TEST_SMTP_ENV) == ""

    def test_bwrap_smtp_setenv_never_emits_raw_smtp_credentials(self):
        flags = bwrap_smtp_setenv("Operator.One@Example.org", TEST_SMTP_ENV)
        assert "LEADDEED_EMAIL_RELAY_URL" in flags
        assert DEFAULT_SANDBOX_EMAIL_RELAY_URL in flags
        assert "LEADDEED_EMAIL_RELAY_TOKEN" in flags
        assert "LEADDEED_MAIL_FROM" in flags

        # Strict negative assertions: zero SMTP host/user/port/pass leakage into bwrap
        for forbidden in (
            "LEADDEED_SMTP_PASS",
            "LEADDEED_SMTP_USER",
            "LEADDEED_SMTP_HOST",
            "LEADDEED_SMTP_PORT",
            "LEADDEED_SMTP_SECURE",
            TEST_SMTP_ENV["LEADDEED_SMTP_PASS"],
            TEST_SMTP_ENV["LEADDEED_SMTP_HOST"],
        ):
            assert forbidden not in flags

    def test_mint_and_verify_sandbox_relay_token(self):
        tok = mint_sandbox_relay_token("  Alice.Operator@Example.ORG ", TEST_SIGNING_SECRET)
        assert tok
        assert verify_sandbox_relay_token(tok, TEST_SIGNING_SECRET) == "alice.operator@example.org"
        assert verify_sandbox_relay_token(tok, "wrong-secret") is None
        assert verify_sandbox_relay_token(tok + "tamper", TEST_SIGNING_SECRET) is None
        assert verify_sandbox_relay_token("", TEST_SIGNING_SECRET) is None
        assert verify_sandbox_relay_token(tok, "") is None

        # A dashboard analyst JWT (p != sandbox-email-relay) must NOT pass relay verification
        analyst_body = base64.urlsafe_b64encode(
            json.dumps({"p": "ai-analyst", "e": "alice.operator@example.org", "exp": int(time.time()) + 3600}).encode()
        ).decode().rstrip("=")
        analyst_sig = base64.urlsafe_b64encode(
            hmac.new(TEST_SIGNING_SECRET.encode(), analyst_body.encode(), hashlib.sha256).digest()
        ).decode().rstrip("=")
        assert verify_sandbox_relay_token(f"{analyst_body}.{analyst_sig}", TEST_SIGNING_SECRET) is None

    def test_redact_strips_relay_token_and_password(self):
        flags = bwrap_smtp_setenv("alice@example.org", TEST_SMTP_ENV)
        tok = mint_sandbox_relay_token("alice@example.org", TEST_SIGNING_SECRET)
        cmd = f"bwrap {flags}--setenv AIM_VESSEL_CLI grok"
        out = redact_bwrap_cmd(cmd)
        assert tok not in out
        assert "LEADDEED_EMAIL_RELAY_TOKEN" in out
        assert "***" in out
        assert "grok" in out


class TestSandboxEmailRelayEndpoint:
    @pytest.fixture(autouse=True)
    def _configure_relay_env(self, monkeypatch):
        import routes_agents

        for k, v in TEST_SMTP_ENV.items():
            monkeypatch.setenv(k, v)
        routes_agents._sandbox_relay_timestamps.clear()
        yield
        routes_agents._sandbox_relay_timestamps.clear()

    def _client(self) -> TestClient:
        from main import app

        return TestClient(app)

    def _valid_headers(self, operator_email: str = "alice@example.org", extra: dict | None = None) -> dict:
        tok = mint_sandbox_relay_token(operator_email, TEST_SIGNING_SECRET)
        hdrs = {"Authorization": f"Bearer {tok}"}
        if extra:
            hdrs.update(extra)
        return hdrs

    def test_blocks_cloudflare_and_proxy_headers_403(self):
        client = self._client()
        body = {
            "to": "alice@example.org",
            "subject": "Daily Briefing",
            "plain_text": "Hello operator",
            "html_text": "<p>Hello operator</p>",
        }
        for proxy_header in (
            {"CF-Connecting-IP": "203.0.113.10"},
            {"CF-Ray": "89abcdef01234567-MIA"},
            {"X-Forwarded-For": "203.0.113.10"},
            {"X-Real-IP": "203.0.113.10"},
            {"CDN-Loop": "cloudflare"},
            {"Host": "api.example.org"},
        ):
            res = client.post(
                "/api/sandbox/email-relay",
                json=body,
                headers=self._valid_headers("alice@example.org", proxy_header),
            )
            assert res.status_code == 403, f"Expected 403 for {proxy_header}, got {res.status_code}"

    def test_rejects_missing_or_forged_bearer_token_401(self, monkeypatch):
        client = self._client()
        body = {
            "to": "alice@example.org",
            "subject": "Daily Briefing",
            "plain_text": "Hello",
            "html_text": "<p>Hello</p>",
        }
        assert client.post("/api/sandbox/email-relay", json=body).status_code == 401
        assert (
            client.post(
                "/api/sandbox/email-relay",
                json=body,
                headers={"Authorization": "Bearer forged.signature"},
            ).status_code
            == 401
        )

        # Fails closed when signing secret is unset
        monkeypatch.delenv("LEADDEED_DOWNLOAD_SIGNING_SECRET", raising=False)
        assert (
            client.post(
                "/api/sandbox/email-relay",
                json=body,
                headers=self._valid_headers("alice@example.org"),
            ).status_code
            in (401, 500)
        )

    def test_locks_recipient_to_bound_operator_email_403(self):
        client = self._client()
        res = client.post(
            "/api/sandbox/email-relay",
            json={
                "to": "thirdparty@external.example",
                "subject": "Exfil attempt",
                "plain_text": "Blocked",
                "html_text": "<p>Blocked</p>",
            },
            headers=self._valid_headers("alice@example.org"),
        )
        assert res.status_code == 403

    def test_rejects_crlf_empty_fields_and_oversized_body_400(self):
        client = self._client()
        hdrs = self._valid_headers("alice@example.org")

        # CRLF header injection in subject
        assert (
            client.post(
                "/api/sandbox/email-relay",
                json={
                    "to": "alice@example.org",
                    "subject": "Report\r\nBcc: attacker@example.org",
                    "plain_text": "Hi",
                    "html_text": "<p>Hi</p>",
                },
                headers=hdrs,
            ).status_code
            == 400
        )

        # Empty subject
        assert (
            client.post(
                "/api/sandbox/email-relay",
                json={"to": "alice@example.org", "subject": "   ", "plain_text": "Hi", "html_text": ""},
                headers=hdrs,
            ).status_code
            == 400
        )

        # Empty body
        assert (
            client.post(
                "/api/sandbox/email-relay",
                json={"to": "alice@example.org", "subject": "Valid", "plain_text": "", "html_text": ""},
                headers=hdrs,
            ).status_code
            == 400
        )

        # Oversized (> 512 KB)
        assert (
            client.post(
                "/api/sandbox/email-relay",
                json={
                    "to": "alice@example.org",
                    "subject": "Huge",
                    "plain_text": "A" * (520 * 1024),
                    "html_text": "",
                },
                headers=hdrs,
            ).status_code
            == 400
        )

    def test_delivers_rfc_multipart_message_and_enforces_rate_limit(self, monkeypatch):
        import smtplib

        sent_deliveries: list[dict] = []

        class _FakeSMTP:
            def __init__(self, host, port, timeout=None, context=None):
                self.host = host
                self.port = port
                self.started_tls = False
                self.logged_in = None

            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

            def ehlo(self):
                return (250, b"ok")

            def starttls(self, context=None):
                self.started_tls = True
                return (220, b"ready")

            def login(self, user, password):
                self.logged_in = (user, password)

            def sendmail(self, from_addr, to_addrs, msg_str):
                sent_deliveries.append(
                    {
                        "host": self.host,
                        "port": self.port,
                        "started_tls": self.started_tls,
                        "logged_in": self.logged_in,
                        "from_addr": from_addr,
                        "to_addrs": to_addrs,
                        "msg_str": msg_str,
                    }
                )

        monkeypatch.setattr(smtplib, "SMTP", _FakeSMTP)
        monkeypatch.setattr(smtplib, "SMTP_SSL", _FakeSMTP)

        client = self._client()
        hdrs = self._valid_headers("Alice@Example.org")
        payload = {
            "to": "alice@example.org",
            "subject": "Morning Leads Digest",
            "plain_text": "Top 5 parcels attached.",
            "html_text": "<p><strong>Top 5</strong> parcels attached.</p>",
        }

        # First 15 within the sliding 1-hour window succeed
        for i in range(15):
            res = client.post("/api/sandbox/email-relay", json=payload, headers=hdrs)
            assert res.status_code == 200, f"Delivery {i + 1} failed: {res.text}"
            assert res.json()["ok"] is True

        # 16th within the hour hits 429 rate limit
        res_429 = client.post("/api/sandbox/email-relay", json=payload, headers=hdrs)
        assert res_429.status_code == 429
        assert len(sent_deliveries) == 15

        first = sent_deliveries[0]
        assert first["host"] == "192.0.2.25"
        assert first["port"] == 587
        assert first["started_tls"] is True
        assert first["logged_in"] == ("mailer@example.org", TEST_SMTP_ENV["LEADDEED_SMTP_PASS"])
        assert first["from_addr"] == "mailer@example.org"
        assert first["to_addrs"] == ["alice@example.org"]

        parsed = email.message_from_string(first["msg_str"])
        assert parsed["Subject"] == "Morning Leads Digest"
        assert parsed["To"] == "alice@example.org"
        assert parsed["From"] == "Sovereign Reports <mailer@example.org>"
        assert parsed["Date"]
        assert parsed["Message-ID"]
        assert parsed.get_content_type() == "multipart/alternative"


def test_ws_spawn_injects_relay_only_and_writes_0600_log_outside_shared_tmp(tmp_path, monkeypatch):
    """ws_handler must never pass LEADDEED_SMTP_PASS to bwrap and must write 0600 log in BACKEND_DIR (LD-038)."""
    import routes_agents
    import routes_sessions
    import watchfiles
    import ws_handler
    from main import app

    for k, v in TEST_SMTP_ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setattr(ws_handler, "ENABLE_E2EE", False)

    fake_backend_dir = tmp_path / "isolated_backend"
    fake_backend_dir.mkdir(parents=True)
    monkeypatch.setattr(ws_handler, "BACKEND_DIR", str(fake_backend_dir), raising=False)

    wid = "op_ld038_seat_0000000000000001"
    seat = tmp_path / f"agent-{wid}"
    seat.mkdir(parents=True)
    (seat / "grok_data").mkdir(parents=True)

    monkeypatch.setattr(routes_agents, "AGENT_WORKSPACES_DIR", str(tmp_path))
    monkeypatch.setattr(ws_handler, "AGENT_WORKSPACES_DIR", str(tmp_path))
    monkeypatch.setattr(ws_handler, "resolve_workspace_id_for_email", lambda _e: wid)

    spawned_cmds: list[str] = []

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
            return _FakeProc(1)
        if cmd[:2] == ["tmux", "new-session"]:
            spawned_cmds.append(cmd[-1])
            return _FakeProc(0)
        return _FakeProc(0)

    def _fake_run(args, **_kwargs):
        return subprocess.CompletedProcess(list(args), 0, stdout="", stderr="")

    _real_sleep = asyncio.sleep

    async def _fast_sleep(_delay, *_a, **_k):
        await _real_sleep(0)

    async def _stall_awatch(*_a, **_k):
        parked = asyncio.Event()
        try:
            await parked.wait()
        except asyncio.CancelledError:
            return
        yield []

    monkeypatch.setattr(routes_sessions, "kill_all_user_sessions", _noop_kill)
    monkeypatch.setattr(ws_handler.asyncio, "create_subprocess_exec", _fake_exec)
    monkeypatch.setattr(ws_handler.subprocess, "run", _fake_run)
    monkeypatch.setattr(ws_handler.asyncio, "sleep", _fast_sleep)
    monkeypatch.setattr(watchfiles, "awatch", _stall_awatch)

    payload_b64 = base64.urlsafe_b64encode(
        json.dumps({"p": "ai-analyst", "e": "alice@example.org", "exp": int(time.time()) + 3600}).encode()
    ).decode().rstrip("=")
    sig_b64 = base64.urlsafe_b64encode(
        hmac.new(TEST_SIGNING_SECRET.encode(), payload_b64.encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    jwt_tok = f"{payload_b64}.{sig_b64}"

    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "auth", "token": jwt_tok, "harness": "grok"}))
        first = json.loads(ws.receive_text())
        assert first["type"] == "auth_success"

    assert len(spawned_cmds) == 1
    bwrap_cmd = spawned_cmds[0]
    expected_relay_tok = mint_sandbox_relay_token("alice@example.org", TEST_SIGNING_SECRET)

    assert "LEADDEED_EMAIL_RELAY_URL" in bwrap_cmd
    assert expected_relay_tok in bwrap_cmd
    assert "LEADDEED_SMTP_PASS" not in bwrap_cmd
    assert TEST_SMTP_ENV["LEADDEED_SMTP_PASS"] not in bwrap_cmd
    assert "LEADDEED_SMTP_USER" not in bwrap_cmd
    assert "LEADDEED_SMTP_HOST" not in bwrap_cmd

    log_file = fake_backend_dir / "bwrap_cmd.log"
    assert log_file.is_file()
    mode = stat.S_IMODE(os.stat(log_file).st_mode)
    assert mode == 0o600
    log_text = log_file.read_text(encoding="utf-8")
    assert expected_relay_tok not in log_text
    assert TEST_SMTP_ENV["LEADDEED_SMTP_PASS"] not in log_text
    assert "***" in log_text
