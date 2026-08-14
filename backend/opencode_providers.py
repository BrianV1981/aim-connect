"""OpenCode provider → env / --model / variant table (#163).

Confirmed on this host against `~/.opencode/bin/opencode` and models.dev:
- Google: GEMINI_API_KEY + GOOGLE_GENERATIVE_AI_API_KEY; --model google/...
- DeepSeek: DEEPSEEK_API_KEY; --model deepseek/...
DeepSeek V4 Flash/Pro expose variants low|medium|high|max (plus default).
TUI `opencode --auto` does **not** accept `--variant` (prints help). Apply
the selection via `~/.config/opencode/opencode.json` `agent.build.variant`.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass

# models.dev / `opencode models deepseek --verbose` on this host.
# "default" means omit the variant key (OpenCode's built-in default).
OPENCODE_MODEL_VARIANTS: dict[str, tuple[str, ...]] = {
    "deepseek/deepseek-v4-flash": ("low", "medium", "high", "max"),
    "deepseek/deepseek-v4-pro": ("low", "medium", "high", "max"),
}


OPENCODE_PROVIDERS: dict[str, dict] = {
    "google": {
        "env": ("GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"),
        "models": {
            "gemini-3.5-flash-lite": "google/gemini-flash-lite-latest",
            "gemini-3.5-flash": "google/gemini-flash-latest",
            "gemini-3.1-pro": "google/gemini-2.5-pro",
            "opencode": "google/gemini-flash-lite-latest",
            "admin-cli": "google/gemini-flash-lite-latest",
            "grok": "google/gemini-flash-lite-latest",
            "google/gemini-flash-lite-latest": "google/gemini-flash-lite-latest",
            "google/gemini-flash-latest": "google/gemini-flash-latest",
            "google/gemini-2.5-pro": "google/gemini-2.5-pro",
        },
        "default_model": "google/gemini-flash-lite-latest",
    },
    "deepseek": {
        "env": ("DEEPSEEK_API_KEY",),
        "models": {
            "deepseek/deepseek-chat": "deepseek/deepseek-chat",
            "deepseek/deepseek-reasoner": "deepseek/deepseek-reasoner",
            "deepseek/deepseek-v4-flash": "deepseek/deepseek-v4-flash",
            "deepseek/deepseek-v4-pro": "deepseek/deepseek-v4-pro",
            "deepseek-chat": "deepseek/deepseek-chat",
            "deepseek-reasoner": "deepseek/deepseek-reasoner",
            "deepseek-v4-flash": "deepseek/deepseek-v4-flash",
            "deepseek-v4-pro": "deepseek/deepseek-v4-pro",
        },
        "default_model": "deepseek/deepseek-chat",
    },
}


def infer_opencode_provider(model: str | None, explicit: str | None = None) -> str:
    if explicit and explicit in OPENCODE_PROVIDERS:
        return explicit
    mid = (model or "").strip()
    if mid.startswith("deepseek/") or mid.startswith("deepseek-"):
        return "deepseek"
    return "google"


def map_opencode_cli_model(provider: str, model: str | None) -> str:
    table = OPENCODE_PROVIDERS.get(provider) or OPENCODE_PROVIDERS["google"]
    mid = (model or "").strip()
    if mid in table["models"]:
        return table["models"][mid]
    if "/" in mid:
        return mid
    if mid:
        return f"{provider}/{mid}"
    return table["default_model"]


def opencode_env_pairs(provider: str, api_key: str) -> list[tuple[str, str]]:
    """Env names for the *active* provider only. Never emit the other key."""
    if not api_key:
        return []
    spec = OPENCODE_PROVIDERS.get(provider) or OPENCODE_PROVIDERS["google"]
    return [(name, api_key) for name in spec["env"]]


def opencode_bwrap_setenv(provider: str, api_key: str) -> str:
    flags = []
    for name, value in opencode_env_pairs(provider, api_key):
        flags.append(f"--setenv {name} '{value}' ")
    return "".join(flags)


def normalize_opencode_variant(cli_model: str, variant: str | None) -> str | None:
    """Return a real variant id, or None for default / unsupported."""
    raw = (variant or "").strip().lower()
    if not raw or raw == "default":
        return None
    allowed = OPENCODE_MODEL_VARIANTS.get(cli_model, ())
    if raw in allowed:
        return raw
    return None


def opencode_user_config(cli_model: str, variant: str | None) -> dict:
    """Sandbox ~/.config/opencode/opencode.json body."""
    cfg: dict = {
        "$schema": "https://opencode.ai/config.json",
        "model": cli_model,
    }
    nv = normalize_opencode_variant(cli_model, variant)
    if nv:
        cfg["agent"] = {"build": {"model": cli_model, "variant": nv}}
    return cfg


def write_opencode_user_config(config_dir: str, cli_model: str, variant: str | None) -> str:
    os.makedirs(config_dir, exist_ok=True)
    path = os.path.join(config_dir, "opencode.json")
    with open(path, "w") as fh:
        json.dump(opencode_user_config(cli_model, variant), fh, indent=2)
        fh.write("\n")
    return path


@dataclass(frozen=True)
class ResolvedOpencodeAuth:
    provider: str
    api_key: str
    ui_model: str
    cli_model: str
    variant: str | None
    byok_fingerprint: str


def resolve_opencode_auth(data: dict) -> ResolvedOpencodeAuth:
    """Prefer new opencode_* fields; fall back to legacy gemini_*."""
    ui_model = (
        data.get("opencode_model")
        or data.get("gemini_model")
        or "gemini-3.5-flash-lite"
    )
    provider = infer_opencode_provider(ui_model, data.get("opencode_provider"))
    api_key = data.get("opencode_api_key") or data.get("gemini_api_key") or ""
    cli_model = map_opencode_cli_model(provider, ui_model)
    variant = normalize_opencode_variant(
        cli_model,
        data.get("opencode_variant") or data.get("opencode_thinking"),
    )
    fingerprint = f"{provider}:{api_key}:{variant or 'default'}" if api_key else ""
    return ResolvedOpencodeAuth(
        provider=provider,
        api_key=api_key,
        ui_model=ui_model,
        cli_model=cli_model,
        variant=variant,
        byok_fingerprint=fingerprint,
    )
