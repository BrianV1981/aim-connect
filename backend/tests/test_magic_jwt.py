"""
Tripwire for the magic-link JWT verifier (audit #180 / CONN-007).

Calls the real `_verify_dashboard_jwt` and the /ws HMAC path.
Uses a test-only signing secret — never the live LEADDEED value.
Does not change product HMAC comparison.
"""

import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

# Distinct from any production secret. Do not print.
TEST_SIGNING_SECRET = "aim-connect-test-hmac-secret-not-prod"


def _mint(payload: dict, secret: str = TEST_SIGNING_SECRET, signature: str | None = None) -> str:
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode()
    ).decode().rstrip("=")
    mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
    sig = signature if signature is not None else base64.urlsafe_b64encode(mac).decode().rstrip("=")
    return f"{payload_b64}.{sig}"


def _valid_payload(**overrides) -> dict:
    data = {"e": "tester@example.com", "exp": time.time() + 3600}
    data.update(overrides)
    return data


@pytest.fixture
def jwt_secret(monkeypatch):
    monkeypatch.setenv("LEADDEED_DOWNLOAD_SIGNING_SECRET", TEST_SIGNING_SECRET)
    return TEST_SIGNING_SECRET


def _client():
    from main import app
    return TestClient(app)


def _verify(token: str):
    from routes_agents import _verify_dashboard_jwt
    return _verify_dashboard_jwt(token)


# ---------------------------------------------------------------------------
# HTTP verifier — real function, not a mock
# ---------------------------------------------------------------------------
class TestVerifyDashboardJwt:
    def test_valid_sig_email_exp_ok(self, jwt_secret):
        payload = _valid_payload()
        got = _verify(_mint(payload))
        assert got["e"] == payload["e"]
        assert float(got["exp"]) == pytest.approx(payload["exp"])

    def test_wrong_signature_401(self, jwt_secret):
        token = _mint(_valid_payload(), signature="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
        with pytest.raises(HTTPException) as ei:
            _verify(token)
        assert ei.value.status_code == 401

    def test_missing_exp_401(self, jwt_secret):
        with pytest.raises(HTTPException) as ei:
            _verify(_mint({"e": "tester@example.com"}))
        assert ei.value.status_code == 401
        assert "Expiry" in ei.value.detail

    def test_expired_exp_401(self, jwt_secret):
        with pytest.raises(HTTPException) as ei:
            _verify(_mint(_valid_payload(exp=time.time() - 60)))
        assert ei.value.status_code == 401
        assert "Expired" in ei.value.detail

    def test_missing_email_401(self, jwt_secret):
        with pytest.raises(HTTPException) as ei:
            _verify(_mint({"exp": time.time() + 3600}))
        assert ei.value.status_code == 401
        assert "Email" in ei.value.detail


# ---------------------------------------------------------------------------
# WS path — same HMAC/e/exp rules; reject-only (no PTY spawn)
# ---------------------------------------------------------------------------
def _ws_auth(token: str):
    client = _client()
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "auth", "token": token}))
        ws.receive_text()


class TestWsMagicJwtRejects:
    def test_wrong_signature_closes_1008(self, jwt_secret):
        token = _mint(_valid_payload(), signature="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
        with pytest.raises(WebSocketDisconnect) as ei:
            _ws_auth(token)
        assert ei.value.code == 1008

    def test_missing_exp_closes_1008(self, jwt_secret):
        with pytest.raises(WebSocketDisconnect) as ei:
            _ws_auth(_mint({"e": "tester@example.com"}))
        assert ei.value.code == 1008

    def test_expired_exp_closes_1008(self, jwt_secret):
        with pytest.raises(WebSocketDisconnect) as ei:
            _ws_auth(_mint(_valid_payload(exp=time.time() - 60)))
        assert ei.value.code == 1008

    def test_missing_email_closes_1008(self, jwt_secret):
        with pytest.raises(WebSocketDisconnect) as ei:
            _ws_auth(_mint({"exp": time.time() + 3600}))
        assert ei.value.code == 1008
