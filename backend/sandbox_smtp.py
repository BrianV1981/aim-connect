"""Inject LeadDeed SMTP into customer bwrap sandboxes.

AGENTS.md tells Joshua that LEADDEED_SMTP_* is already in the environment.
bwrap only inherited AIM_VESSEL_CLI + BYOK keys, so agents asked customers
for the mail password. Pull values from aim-connect process env (loaded from
the host .env) and emit --setenv flags. Never log the raw values.
"""

from __future__ import annotations

import os
import shlex
from typing import Iterable, Mapping

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
        "GEMINI_API_KEY",
        "GOOGLE_GENERATIVE_AI_API_KEY",
        "XAI_API_KEY",
    }
)


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
    return all(k in vals for k in ("LEADDEED_SMTP_HOST", "LEADDEED_SMTP_PORT", "LEADDEED_SMTP_USER", "LEADDEED_SMTP_PASS"))


def bwrap_smtp_setenv(environ: Mapping[str, str] | None = None) -> str:
    """Quoted `--setenv KEY VALUE` flags, trailing space if any. Empty if unset."""
    parts: list[str] = []
    for key, val in smtp_values(environ).items():
        parts.append(f"--setenv {shlex.quote(key)} {shlex.quote(val)}")
    return (" ".join(parts) + " ") if parts else ""


def redact_bwrap_cmd(cmd: str, secrets: Iterable[str] = ()) -> str:
    """Strip known secret values from a bwrap command string before logging."""
    redacted = cmd
    extra = [s for s in secrets if s]
    env = smtp_values()
    extra.extend(env.get(k, "") for k in _REDACT_KEYS if env.get(k))
    for secret in extra:
        if secret:
            redacted = redacted.replace(secret, "***")
    return redacted
