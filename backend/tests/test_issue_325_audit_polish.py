"""Regression tests for #325 audit hygiene & DRY polish (CONN-015, CONN-008, CONN-009, CONN-010)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

import main  # noqa: F401  (import main before route modules to avoid circular import)
import dashboard_jwt
import routes_agents
import routes_api
import routes_fleet
import routes_webauthn


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_SECRET = "aim-connect-325-test-secret-not-prod"


def _mint_jwt(payload: dict, secret: str = TEST_SECRET, sig: str | None = None) -> str:
    body_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).decode("ascii").rstrip("=")
    mac = hmac.new(secret.encode("utf-8"), body_b64.encode("utf-8"), hashlib.sha256).digest()
    signature = sig if sig is not None else base64.urlsafe_b64encode(mac).decode("ascii").rstrip("=")
    return f"{body_b64}.{signature}"


def test_changelog_v180_clarifies_partial_165_without_claiming_byok_closed():
    """CONN-015: CHANGELOG.md v1.8.0 must note #165 partial shell=False/CSV scope without '(Closes #165)'."""
    changelog = (REPO_ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    assert "(Closes #165)" not in changelog
    assert "#165 partial" in changelog
    assert "Operator-gated" in changelog


def test_webauthn_token_schema_includes_prefix_across_admin_and_scoped_users(monkeypatch):
    """CONN-008: VALID_API_TOKENS minted by WebAuthn must carry 'prefix' for single-admin and multi-user roles."""
    monkeypatch.setattr(routes_webauthn, "VALID_API_TOKENS", main.VALID_API_TOKENS)
    client = TestClient(main.app)

    # 1. Single-user admin mode (users_db is None) -> prefix == ""
    monkeypatch.setattr(routes_webauthn, "users_db", None)
    with patch("routes_webauthn.webauthn_mgr.verify_authentication", return_value=True), patch(
        "routes_webauthn.save_tokens"
    ):
        resp = client.post(
            "/api/webauthn/authenticate/verify",
            json={"username": "admin", "response": {"id": "cred-admin"}},
        )
    assert resp.status_code == 200
    tok_admin = resp.json()["token"]
    try:
        entry = main.VALID_API_TOKENS[tok_admin]
        assert entry["role"] == "admin"
        assert entry["prefix"] == ""
    finally:
        main.VALID_API_TOKENS.pop(tok_admin, None)

    # 2. Multi-user non-admin configured with 'prefix' or 'sessions_prefix' -> enforces session prefix scoping
    monkeypatch.setattr(
        routes_webauthn,
        "users_db",
        {
            "bob": {"role": "user", "prefix": "bob-"},
            "carol": {"role": "user", "sessions_prefix": "carol-"},
            "root_ops": {"role": "admin", "prefix": "ignored-"},
        },
    )
    with patch("routes_webauthn.webauthn_mgr.verify_authentication", return_value=True), patch(
        "routes_webauthn.save_tokens"
    ):
        bob_resp = client.post(
            "/api/webauthn/authenticate/verify",
            json={"username": "bob", "response": {"id": "cred-bob"}},
        )
        carol_resp = client.post(
            "/api/webauthn/authenticate/verify",
            json={"username": "carol", "response": {"id": "cred-carol"}},
        )
        ops_resp = client.post(
            "/api/webauthn/authenticate/verify",
            json={"username": "root_ops", "response": {"id": "cred-ops"}},
        )

    assert bob_resp.status_code == 200
    assert carol_resp.status_code == 200
    assert ops_resp.status_code == 200
    tok_bob = bob_resp.json()["token"]
    tok_carol = carol_resp.json()["token"]
    tok_ops = ops_resp.json()["token"]
    try:
        assert main.VALID_API_TOKENS[tok_bob]["role"] == "user"
        assert main.VALID_API_TOKENS[tok_bob]["prefix"] == "bob-"
        assert main.VALID_API_TOKENS[tok_carol]["role"] == "user"
        assert main.VALID_API_TOKENS[tok_carol]["prefix"] == "carol-"
        assert main.VALID_API_TOKENS[tok_ops]["role"] == "admin"
        assert main.VALID_API_TOKENS[tok_ops]["prefix"] == ""

        with patch("routes_sessions.subprocess.run") as mock_run, patch(
            "routes_sessions.collect_fleet_telemetry", return_value=([], [])
        ):
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = "bob-dev\ncarol-dev\nops-root\n"
            sess_resp = client.get("/api/sessions", headers={"x-api-token": tok_bob})
        assert sess_resp.status_code == 200
        assert sess_resp.json()["sessions"] == ["bob-dev"]
    finally:
        for tk in (tok_bob, tok_carol, tok_ops):
            main.VALID_API_TOKENS.pop(tk, None)


def test_dashboard_jwt_verifier_is_dry_across_agents_ws_fleet_and_api(monkeypatch):
    """CONN-009 & CONN-010: routes_agents, ws_handler, routes_fleet, and routes_api share dashboard_jwt.verify_dashboard_jwt."""
    assert routes_agents._verify_dashboard_jwt is dashboard_jwt.verify_dashboard_jwt

    for rel in (
        "backend/routes_agents.py",
        "backend/ws_handler.py",
        "backend/routes_fleet.py",
        "backend/routes_api.py",
    ):
        src = (REPO_ROOT / rel).read_text(encoding="utf-8")
        assert "verify_dashboard_jwt" in src, f"{rel} does not import/use verify_dashboard_jwt"
        assert "urlsafe_b64decode" not in src, f"{rel} still duplicates inline base64url JWT decode"

    monkeypatch.setenv("AIM_GATEWAY_SIGNING_SECRET", TEST_SECRET)
    client = TestClient(main.app)

    valid_tok = _mint_jwt({"e": "operator@example.org", "exp": time.time() + 3600})
    expired_tok = _mint_jwt({"e": "operator@example.org", "exp": time.time() - 30})
    forged_tok = _mint_jwt({"e": "operator@example.org", "exp": time.time() + 3600}, sig="bad_sig")

    assert routes_api.verify_vercel_jwt(f"Bearer {valid_tok}") == "operator@example.org"

    # Fleet DELETE: 401 on missing/forged/expired JWT, 403 on foreign agent_id, 200 on owned session
    assert client.delete("/api/fleet/sessions/agent-foreign").status_code == 401
    assert client.delete(f"/api/fleet/sessions/agent-foreign?token={forged_tok}").status_code == 401
    assert client.delete(f"/api/fleet/sessions/agent-foreign?token={expired_tok}").status_code == 401
    assert client.delete(f"/api/fleet/sessions/agent-foreign?token={valid_tok}").status_code == 403

    fake_proc = AsyncMock()
    fake_proc.wait = AsyncMock(return_value=0)
    with patch("routes_fleet.resolve_workspace_id_for_email", return_value="op_testseat123"), patch(
        "routes_fleet.asyncio.create_subprocess_exec", return_value=fake_proc
    ) as mock_exec:
        del_resp = client.delete(
            f"/api/fleet/sessions/agent-op_testseat123-chat-1?token={valid_tok}"
        )
    assert del_resp.status_code == 200
    assert del_resp.json() == {"status": "killed", "agent_id": "agent-op_testseat123-chat-1"}
    mock_exec.assert_called_once_with("tmux", "kill-session", "-t", "agent-op_testseat123-chat-1")
