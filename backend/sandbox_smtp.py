"""Loopback HMAC email relay token & flag helpers for customer bwrap sandboxes (#233 / LD-038).

Host SMTP credentials (`LEADDEED_SMTP_HOST`, `LEADDEED_SMTP_PORT`,
`LEADDEED_SMTP_USER`, `LEADDEED_SMTP_PASS`) remain strictly in the host
`aim-connect` process environment and are NEVER injected into customer `bwrap`
command lines or sandbox environments. Instead, each customer sandbox receives
`LEADDEED_EMAIL_RELAY_URL` and an HMAC-SHA256 `LEADDEED_EMAIL_RELAY_TOKEN`
cryptographically bound to that seat's verified operator email.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import shlex
from typing import Iterable, Mapping

DEFAULT_SANDBOX_EMAIL_RELAY_URL = "http://127.0.0.1:8000/api/sandbox/email-relay"
SANDBOX_RELAY_TOKEN_PURPOSE = "sandbox-email-relay"

SMTP_ENV_KEYS = (
    "LEADDEED_SMTP_HOST",
    "LEADDEED_SMTP_PORT",
    "LEADDEED_SMTP_USER",
    "LEADDEED_SMTP_PASS",
    "LEADDEED_SMTP_SECURE",
    "LEADDEED_MAIL_FROM",
)

_REDACT_KEYS = frozenset(
    {
        "LEADDEED_SMTP_PASS",
        "LEADDEED_SMTP_USER",
        "LEADDEED_EMAIL_RELAY_TOKEN",
        "GEMINI_API_KEY",
        "GOOGLE_GENERATIVE_AI_API_KEY",
        "XAI_API_KEY",
    }
)

_RELAY_TOKEN_FLAG_RE = re.compile(
    r"(--setenv\s+(?:'LEADDEED_EMAIL_RELAY_TOKEN'|\"LEADDEED_EMAIL_RELAY_TOKEN\"|LEADDEED_EMAIL_RELAY_TOKEN)\s+)(\S+)"
)


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def mint_sandbox_relay_token(operator_email: str, signing_secret: str) -> str:
    """Mint stateless HMAC-SHA256 bearer token locking email relay to operator_email."""
    norm_email = (operator_email or "").strip().lower()
    sec = (signing_secret or "").strip()
    if not norm_email or not sec or "@" not in norm_email or "\r" in norm_email or "\n" in norm_email:
        return ""
    payload_bytes = json.dumps(
        {"p": SANDBOX_RELAY_TOKEN_PURPOSE, "e": norm_email},
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    body_b64 = _b64url_encode(payload_bytes)
    mac = hmac.new(sec.encode("utf-8"), body_b64.encode("ascii"), hashlib.sha256).digest()
    sig_b64 = _b64url_encode(mac)
    return f"{body_b64}.{sig_b64}"


def verify_sandbox_relay_token(token: str, signing_secret: str) -> str | None:
    """Verify sandbox relay HMAC token using compare_digest and return normalized email or None."""
    tok = (token or "").strip()
    sec = (signing_secret or "").strip()
    if not tok or not sec or "." not in tok:
        return None
    parts = tok.split(".")
    if len(parts) != 2:
        return None
    body_b64, sig_b64 = parts
    if not body_b64 or not sig_b64:
        return None
    try:
        expected_mac = hmac.new(
            sec.encode("utf-8"), body_b64.encode("ascii"), hashlib.sha256
        ).digest()
        expected_sig = _b64url_encode(expected_mac)
        if not hmac.compare_digest(sig_b64.rstrip("="), expected_sig):
            return None
        payload = json.loads(_b64url_decode(body_b64).decode("utf-8"))
        if not isinstance(payload, dict):
            return None
        if payload.get("p") != SANDBOX_RELAY_TOKEN_PURPOSE:
            return None
        email = (payload.get("e") or "").strip().lower()
        if not email or "@" not in email or "\r" in email or "\n" in email:
            return None
        return email
    except Exception:
        return None


def smtp_values(environ: Mapping[str, str] | None = None) -> dict[str, str]:
    src = os.environ if environ is None else environ
    out: dict[str, str] = {}
    for key in SMTP_ENV_KEYS:
        val = (src.get(key) or "").strip()
        if val:
            out[key] = val
    return out


def smtp_configured(environ: Mapping[str, str] | None = None) -> bool:
    vals = smtp_values(environ)
    return all(
        k in vals
        for k in (
            "LEADDEED_SMTP_HOST",
            "LEADDEED_SMTP_PORT",
            "LEADDEED_SMTP_USER",
            "LEADDEED_SMTP_PASS",
        )
    )


def bwrap_smtp_setenv(
    operator_email: str = "",
    environ: Mapping[str, str] | None = None,
    relay_url: str = DEFAULT_SANDBOX_EMAIL_RELAY_URL,
) -> str:
    """Emit ONLY non-secret loopback relay flags (`--setenv KEY VALUE `) for bwrap."""
    src = os.environ if environ is None else environ
    if not smtp_configured(src):
        return ""
    signing_secret = (src.get("LEADDEED_DOWNLOAD_SIGNING_SECRET") or "").strip()
    relay_token = mint_sandbox_relay_token(operator_email, signing_secret)
    effective_url = (src.get("LEADDEED_EMAIL_RELAY_URL") or relay_url or "").strip()
    if not relay_token or not effective_url:
        return ""

    parts: list[str] = [
        f"--setenv LEADDEED_EMAIL_RELAY_URL {shlex.quote(effective_url)}",
        f"--setenv LEADDEED_EMAIL_RELAY_TOKEN {shlex.quote(relay_token)}",
    ]
    mail_from = (src.get("LEADDEED_MAIL_FROM") or "").strip()
    if mail_from:
        parts.append(f"--setenv LEADDEED_MAIL_FROM {shlex.quote(mail_from)}")
    return " ".join(parts) + " "


def redact_bwrap_cmd(cmd: str, secrets: Iterable[str] = ()) -> str:
    """Strip known secret values and relay tokens from a bwrap command string before logging."""
    redacted = _RELAY_TOKEN_FLAG_RE.sub(r"\1***", cmd)
    extra = [s for s in secrets if s]
    env = smtp_values()
    extra.extend(env.get(k, "") for k in _REDACT_KEYS if env.get(k))
    for secret in extra:
        if secret:
            redacted = redacted.replace(secret, "***")
    return redacted
