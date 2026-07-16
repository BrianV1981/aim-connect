"""
Integration tests for three-factor auth, rate limiting, TOTP replay,
and session-name validation in aim-connect.
"""

import time

import pyotp
import pytest
from fastapi.testclient import TestClient

from tests.conftest import TEST_PASSWORD, TEST_PASSPHRASE, TEST_TOTP_SECRET

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_totp = pyotp.TOTP(TEST_TOTP_SECRET)


def _get_client():
    """Return a fresh TestClient bound to the (reloaded) app."""
    from main import app
    return TestClient(app)


def _valid_auth_payload() -> dict:
    """Build a payload that should succeed on first use."""
    return {
        "token": _totp.now(),
        "password": TEST_PASSWORD,
        "passphrase": TEST_PASSPHRASE,
    }


# ---------------------------------------------------------------------------
# Auth — happy path
# ---------------------------------------------------------------------------
class TestValidAuth:
    def test_valid_three_factor_login(self):
        """Correct passphrase + password + TOTP → 200 with api_token."""
        client = _get_client()
        resp = client.post("/api/auth", json=_valid_auth_payload())
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "api_token" in body
        assert len(body["api_token"]) == 64  # secrets.token_hex(32)


# ---------------------------------------------------------------------------
# Auth — individual factor failures
# ---------------------------------------------------------------------------
class TestAuthFactorFailures:
    def test_wrong_passphrase_fails(self):
        client = _get_client()
        payload = _valid_auth_payload()
        payload["passphrase"] = "wrong-passphrase"
        resp = client.post("/api/auth", json=payload)
        assert resp.status_code == 401
        assert "Invalid credentials" in resp.json()["detail"]

    def test_empty_passphrase_fails(self):
        client = _get_client()
        payload = _valid_auth_payload()
        payload["passphrase"] = ""
        resp = client.post("/api/auth", json=payload)
        assert resp.status_code == 401

    def test_wrong_totp_fails(self):
        client = _get_client()
        payload = _valid_auth_payload()
        payload["token"] = "000000"
        resp = client.post("/api/auth", json=payload)
        assert resp.status_code == 401

    def test_wrong_password_fails(self):
        client = _get_client()
        payload = _valid_auth_payload()
        payload["password"] = "wrong-password"
        resp = client.post("/api/auth", json=payload)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# TOTP replay protection
# ---------------------------------------------------------------------------
class TestTOTPReplay:
    def test_totp_replay_rejected(self):
        """Same valid TOTP code used twice → second attempt gets 401."""
        client = _get_client()
        payload = _valid_auth_payload()
        code = payload["token"]

        # First request should succeed
        resp1 = client.post("/api/auth", json=payload)
        assert resp1.status_code == 200, resp1.text

        # Second request with identical TOTP code must be rejected
        payload2 = {
            "token": code,
            "password": TEST_PASSWORD,
            "passphrase": TEST_PASSPHRASE,
        }
        resp2 = client.post("/api/auth", json=payload2)
        assert resp2.status_code == 401


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------
class TestRateLimiting:
    def test_rate_limiting(self):
        """5 consecutive failures → 6th attempt gets 429."""
        client = _get_client()
        bad_payload = {
            "token": "000000",
            "password": "nope",
            "passphrase": "nope",
        }
        for _ in range(5):
            r = client.post("/api/auth", json=bad_payload)
            assert r.status_code == 401

        # 6th attempt must hit the lockout
        resp = client.post("/api/auth", json=bad_payload)
        assert resp.status_code == 429
        assert "Too many attempts" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Session name validation
# ---------------------------------------------------------------------------
class TestSessionNameValidation:
    def test_invalid_session_name_rejected(self):
        """POST /api/sessions with special chars → 400."""
        from main import VALID_API_TOKENS
        import secrets

        client = _get_client()
        # Inject a valid token so the auth dependency passes
        token = secrets.token_hex(32)
        VALID_API_TOKENS[token] = time.time() + 3600

        resp = client.post(
            "/api/sessions",
            json={"name": "../evil;rm -rf /"},
            headers={"x-api-token": token},
        )
        assert resp.status_code == 400
        assert "Invalid session name" in resp.json()["detail"]

    def test_valid_session_name_format(self):
        """The regex must accept well-formed names."""
        from main import SESSION_NAME_RE

        for name in ["my-session", "test_123", "A", "a" * 64]:
            assert SESSION_NAME_RE.match(name), f"Rejected valid name: {name}"

        for name in ["", "a" * 65, "has space", "semi;colon", "../up"]:
            assert not SESSION_NAME_RE.match(name), f"Accepted invalid name: {name}"
