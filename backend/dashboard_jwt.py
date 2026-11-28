"""Shared dashboard magic-link HMAC-SHA256 JWT verification (#325 / CONN-009, CONN-010)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from fastapi import HTTPException

from sandbox_smtp import get_gateway_signing_secret


def _pad_b64(data: str) -> str:
    return data + "=" * (-len(data) % 4)


def verify_dashboard_jwt(token: str) -> dict:
    """Verify a dashboard magic-link HMAC-SHA256 JWT.

    Validates constant-time HMAC signature (`hmac.compare_digest`), requires
    non-empty `e` (email) and non-expired `exp` (Unix timestamp) fields.
    Returns the decoded payload dict on success; raises `HTTPException` on failure.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        parts = token.split(".")
        if len(parts) != 2 or not parts[0] or not parts[1]:
            raise HTTPException(status_code=401, detail="Invalid Token Format")
        payload_b64, signature_b64 = parts
        secret = get_gateway_signing_secret()
        if not secret:
            raise HTTPException(status_code=500, detail="Missing Secret")
        expected_mac = hmac.new(
            secret.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256
        ).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_mac).decode("ascii").rstrip("=")
        if not hmac.compare_digest(signature_b64.rstrip("="), expected_b64):
            raise HTTPException(status_code=401, detail="Unauthorized")
        payload_json = base64.urlsafe_b64decode(_pad_b64(payload_b64)).decode("utf-8")
        payload_data = json.loads(payload_json)
        if not isinstance(payload_data, dict):
            raise HTTPException(status_code=401, detail="Token Verification Failed")
        if not payload_data.get("e"):
            raise HTTPException(status_code=401, detail="Missing Email")
        exp = payload_data.get("exp")
        if exp is None:
            raise HTTPException(status_code=401, detail="Token Missing Expiry")
        if time.time() > float(exp):
            raise HTTPException(status_code=401, detail="Token Expired")
        return payload_data
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token Verification Failed") from exc
