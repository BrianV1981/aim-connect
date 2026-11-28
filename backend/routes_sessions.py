import subprocess
import os
import io
import re
import time
import json
import wave
import hashlib
import sqlite3
import shutil
import logging
import uuid
from pydantic import BaseModel
from fastapi import APIRouter, Header, HTTPException, Depends, Request, Response
from main import (
    verify_token, require_admin, _get_user_from_token,
    is_direct_local_loopback, is_authorized_local_loopback, verify_token_or_loopback,
    SESSION_NAME_RE, AGENT_WORKSPACES_DIR, AIM_CONNECT_ROOT,
    ENABLE_E2EE, E2EE_SECRET, HOME_DIR, get_frontend_build_id,
)
from ws_handler import is_single_slash_command, pane_still_holds_slash_command
import tmux_workspace_manager as twm
import asyncio

router = APIRouter()
logger = logging.getLogger("aim-connect")

BRAILLE_SPINNER_RE = re.compile(r"[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⢿⣻⣽⣾⣷⣯⣟]")
THINKING_TEXT_RE = re.compile(
    r"(?:Working\.{2,}|Thinking\.{2,}|Running command|Generating|Executing|esc to cancel|ctrl\+c to interrupt|esc interrupt)",
    re.IGNORECASE,
)
# #317: OpenCode 1.17 busy bar (`⬝⬝■■■■⬝⬝  esc interrupt`) and Grok 1.0 status row
# (`⠹ Thinking…  3.0s ⇣1.49k [stop]`, drawn just above its `╭─╮` input box).
OPENCODE_BUSY_BAR_RE = re.compile(r"[⬝■]{4,}")
GROK_BUSY_ROW_RE = re.compile(r"[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⢿⣻⣽⣾⣷⣯⣟]\s+\S.*\[stop\]")
WAITING_TEXT_RE = re.compile(
    r"(?:\[[yY]/[nN]\]|\(y/n\)|\(yes/no\)|Allow once|Allow always|Permission required|Confirm\s+Cancel|Tell OpenCode what to do differently|Do you want to proceed|Select an option|Enter to select|Approve\?|Proceed\?)",
    re.IGNORECASE,
)
ERROR_TEXT_RE = re.compile(
    r"(?:Traceback \(most recent call last\)|\[ERROR\]|panic:|Auth Error|Connection refused)",
    re.IGNORECASE,
)
AGY_TOKENS_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*([kKmM]?)\s*in\s*\|\s*(\d+(?:\.\d+)?)\s*([kKmM]?)\s*out"
)
SLASH_TOKENS_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*([kKmM])\s*/\s*(\d+(?:\.\d+)?)\s*([kKmM])"
)
OPENCODE_TOKENS_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*([kKmM])\s*\(\s*(\d+(?:\.\d+)?)%\s*\)"
)
GENERIC_TOKENS_RE = re.compile(
    r"(\d+(?:,\d{3})+|\d+(?:\.\d+)?\s*[kKmM])\s*(?:tokens|tok|ctx)",
    re.IGNORECASE,
)
ANSI_ESCAPE_RE = re.compile(r"\x1b\[[0-9;?]*[a-zA-Z]")
HORIZONTAL_BORDER_RE = re.compile(r"^[─━═]{20,}$")
ACTIVE_SUBAGENT_STATUS_RE = re.compile(r"\b[1-9]\d*\s+subagent\(s\)", re.IGNORECASE)
ACTIVE_SUBAGENT_TRAY_RE = re.compile(r"^●\s*Agent\((?!.*\(ctrl\+o to expand\))", re.IGNORECASE)
TRAY_TIMESTAMP_PREFIX_RE = re.compile(r"^●\s*(?:\[\d{2}:\d{2}(?::\d{2})?\]\s*)?")


def _parse_token_number(num_str: str, suffix: str = "") -> int:
    cleaned = num_str.replace(",", "").strip()
    if not cleaned:
        return 0
    if cleaned[-1].lower() in ("k", "m") and not suffix:
        suffix = cleaned[-1].lower()
        cleaned = cleaned[:-1].strip()
    try:
        val = float(cleaned)
    except ValueError:
        return 0
    s = suffix.lower()
    if s == "k":
        return int(val * 1_000)
    if s == "m":
        return int(val * 1_000_000)
    return int(val)


def compute_30pct_rule_tier(
    context_pct: float,
    vessel: str = "",
    compaction_count: int = 0,
) -> str:
    """Context Saturation & Sticky-Red Compaction Tiers (#209, #228, #246):
    - Sticky-red rule: if compaction_count > 0, ALWAYS return 'critical' (never green/yellow once compacted).
    - AGY ('agy'): backend auto-compacts at 512,000 tokens (51.2% of 1M), so fire warning >= 30.0% (Save/Handoff)
      and critical >= 45.0% (approaching 512k cliff / point of no return).
    - Other vessels: standard 30%-Rule (warning >= 20.0%, critical >= 30.0%).
    """
    if compaction_count and compaction_count > 0:
        return "critical"
    if (vessel or "").lower() == "agy":
        if context_pct >= 45.0:
            return "critical"
        if context_pct >= 30.0:
            return "warning"
        return "normal"
    if context_pct >= 30.0:
        return "critical"
    if context_pct >= 20.0:
        return "warning"
    return "normal"


BORDER_AND_PROMPT_CHARS = "─━│┃╭╮╯╰┌┐┘└├┤┬┴┼═║╔╗╚╝╠╣╦╩╬▀▄╹╻>❯ "
SPOKEN_PREFIX_RE = re.compile(r"^🔊\s*(?:voice\s*:\s*|:\s*)?", re.IGNORECASE)


def _is_tui_chrome_line(line: str) -> bool:
    """Return True if a terminal line is a TUI border, prompt, or status bar footer."""
    raw_s = (line or "").strip()
    if raw_s.startswith(("▣", "╹", "▀", "╭", "╰")):
        return True
    stripped = (line or "").strip(BORDER_AND_PROMPT_CHARS)
    if not stripped or len(stripped) <= 2:
        return True
    low = stripped.lower()
    if (
        "? for shortcuts" in low
        or "ctrl+p commands" in low
        or "ctrl+x:shortcuts" in low
        or AGY_TOKENS_RE.search(stripped)
        or OPENCODE_TOKENS_RE.search(stripped)
        or SLASH_TOKENS_RE.search(stripped)
        or BRAILLE_SPINNER_RE.search(stripped)
    ):
        return True
    return False


def _clean_spoken_text(text: str) -> str:
    """Strip markdown tokens and collapse whitespace for natural TTS playback."""
    cleaned = re.sub(r"[`*_~]+", "", text or "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def extract_spoken_summary(raw_text: str, fallback: bool = False) -> str:
    """Extract the most recent `🔊 <spoken summary>` block from terminal output (#222)."""
    clean_text = ANSI_ESCAPE_RE.sub("", raw_text or "")
    raw_lines = clean_text.splitlines()

    for idx in range(len(raw_lines) - 1, -1, -1):
        line_body = raw_lines[idx].strip("│┃ ")
        if not line_body.startswith("🔊"):
            continue
        low_body = line_body.lower()
        if (
            "<1-2 sentence" in low_body
            or "<spoken summary>" in low_body
            or low_body.startswith("🔊 spoken summary")
            or low_body.startswith("🔊 auto-playback")
            or low_body in ("🔊", "🔊 speak")
        ):
            continue

        first_part = SPOKEN_PREFIX_RE.sub("", line_body).strip()
        parts = [first_part] if first_part else []

        for cont_idx in range(idx + 1, len(raw_lines)):
            raw_cont_line = raw_lines[cont_idx]
            if raw_cont_line.lstrip().startswith("┃"):
                break
            cont_raw = raw_cont_line.strip("│ ")
            if not cont_raw:
                continue
            if _is_tui_chrome_line(cont_raw):
                break
            if cont_raw.startswith(("🔊", "●", "•", "▣", "◆", "◈", "- ", "* ", "#", "> ", "❯ ")):
                break
            parts.append(cont_raw)

        candidate = _clean_spoken_text(" ".join(parts))
        if candidate:
            return candidate

    if fallback:
        for raw_ln in reversed(raw_lines):
            if _is_tui_chrome_line(raw_ln):
                continue
            cleaned = _clean_spoken_text(raw_ln.strip(BORDER_AND_PROMPT_CHARS))
            if cleaned:
                return cleaned[:240]

    return ""



def _split_pane_prompt_regions(lines: list[str]) -> tuple[list[str], str, list[str], bool]:
    """Locate a bottom TUI prompt box (`───` / `>` / `───`) and separate scrollback, spinner, and tray/footer."""
    if not lines:
        return [], "", [], False
    scan_floor = max(0, len(lines) - 16)
    for idx in range(len(lines) - 2, scan_floor - 1, -1):
        if not HORIZONTAL_BORDER_RE.match(lines[idx]):
            continue
        if not lines[idx + 1].startswith((">", "❯")):
            continue
        bottom_border_idx = None
        for j in range(idx + 2, len(lines)):
            if HORIZONTAL_BORDER_RE.match(lines[j]):
                bottom_border_idx = j
                break
        if bottom_border_idx is not None:
            above_prompt = lines[idx - 1] if idx > 0 else ""
            scrollback_end = (
                idx - 1
                if (idx > 0 and BRAILLE_SPINNER_RE.search(above_prompt))
                else idx
            )
            below_prompt = [
                ln for ln in lines[bottom_border_idx + 1 :]
                if not HORIZONTAL_BORDER_RE.match(ln)
            ]
            return lines[:scrollback_end], above_prompt, below_prompt, True
    return lines, "", lines[-4:], False


def _is_active_tray_task(line: str) -> bool:
    """Return True for active subagent or non-cron/non-daemon tray tasks (`● [HH:MM:SS] <task> running`)."""
    stripped = (line or "").strip()
    if not stripped.startswith("●"):
        return False
    if ACTIVE_SUBAGENT_TRAY_RE.search(stripped):
        return True
    if not stripped.lower().endswith(" running"):
        return False
    body = TRAY_TIMESTAMP_PREFIX_RE.sub("", stripped).strip().lower()
    if body.startswith(("cron ", "cron(", "daemon ", "daemon(")):
        return False
    return True


_GATE_BORDER_STRIP = "─━│┃╭╮╯╰┌┐┘└├┤┬┴┼═║╔╗╚╝╠╣╦╩╬ "
_OPENCODE_ACTION_BAR_RE = re.compile(
    r"(?:Allow once\s+Allow always|enter\s+confirm|⇆\s*select|ctrl\+f\s+fullscreen|\bConfirm\s+Cancel\b)",
    re.IGNORECASE,
)
_NUMBERED_OPTION_RE = re.compile(r"^(?:[❯>•*]\s*)?([1-9])[.)]\s+(.+)$")


def _strip_gate_line(raw: str) -> str:
    return (raw or "").strip(_GATE_BORDER_STRIP).strip()


def _explode_joined_modal_rows(lines: list[str]) -> list[str]:
    """Split `capture-pane -J`-joined OpenCode rows back into visual `┃ <row>` lines (#315).

    Lines with at most one `┃` (normal, unjoined rows) pass through untouched.
    """
    out: list[str] = []
    for ln in lines:
        if (ln or "").count("┃") < 2:
            out.append(ln)
            continue
        pieces = ln.split("┃")
        if pieces[0].strip():
            out.append(pieces[0])
        out.extend("┃" + piece for piece in pieces[1:])
    return out


def extract_waiting_gate_info(lines: list[str], vessel: str = "") -> dict | None:
    """Extract structured question, details, and gate kind from a WAITING terminal pane (#308)."""
    if not lines:
        return None
    tail = lines[-24:]
    tail_joined = "\n".join(tail)

    # 1. OpenCode TUI Permission / Confirmation Modal ("Permission required" / "Allow once  Allow always  Reject")
    is_oc_modal = bool(
        re.search(r"Permission required", tail_joined, re.IGNORECASE)
        or (re.search(r"\bAllow once\b", tail_joined, re.IGNORECASE) and re.search(r"\bReject\b", tail_joined, re.IGNORECASE))
        or (
            vessel == "opencode"
            and (
                re.search(r"Tell OpenCode what to do differently", tail_joined, re.IGNORECASE)
                or re.search(r"\bConfirm\s+Cancel\b", tail_joined, re.IGNORECASE)
            )
        )
    )
    if is_oc_modal:
        # #315: narrow panes make OpenCode rows full-width, so `capture-pane -J` glues the whole
        # modal into one line. Split it back into visual rows at the `┃` border first.
        tail = _explode_joined_modal_rows(tail)
        start_idx = None
        for i in range(len(tail) - 1, -1, -1):
            if re.search(r"Permission required|Tell OpenCode what to do differently", tail[i], re.IGNORECASE):
                start_idx = i
                break
        if start_idx is None:
            # Scan upward from bottom while inside the vertical `┃` modal block
            start_idx = max(0, len(tail) - 8)
            for i in range(len(tail) - 1, -1, -1):
                if tail[i].lstrip().startswith("┃") and "▣" not in tail[i]:
                    start_idx = i
                elif i < len(tail) - 2:
                    break

        modal_slice = tail[start_idx:]
        has_allow_once = any(re.search(r"\bAllow once\b", ln, re.IGNORECASE) for ln in modal_slice)
        kind = "opencode_permission" if has_allow_once else "opencode_confirm"
        title = "Permission Required" if has_allow_once else "Confirm Permission Action"

        # Group rows into blank-row-separated paragraphs, re-joining wrapped fragments (#315).
        paragraphs: list[str] = []
        current = ""
        for raw_ln in modal_slice:
            cleaned = _strip_gate_line(raw_ln)
            if not cleaned:
                if current:
                    paragraphs.append(current)
                current = ""
                continue
            if _OPENCODE_ACTION_BAR_RE.search(cleaned):
                continue
            if re.match(r"^(?:△\s*)?Permission required\s*$", cleaned, re.IGNORECASE):
                continue
            starts_new = bool(re.match(r"^(?:←|△|-\s|•\s|\*\s|\$\s)", cleaned))
            cleaned = re.sub(r"^(?:△\s*|←\s*)+", "", cleaned).strip()
            if not cleaned:
                continue
            if current and (starts_new or current.endswith((".", ":", "?", "!"))):
                paragraphs.append(current)
                current = ""
            if not current:
                current = cleaned
            elif current.endswith(("/", "-")):
                current += cleaned
            else:
                current += " " + cleaned
        if current:
            paragraphs.append(current)
        body_lines = [p[:240] for p in paragraphs]

        question = body_lines[0] if body_lines else ("Approve requested action?" if has_allow_once else "Confirm selected permission action?")
        details = body_lines[1:7]
        return {
            "kind": kind,
            "title": title,
            "question": question,
            "details": details,
            "options": [],
        }

    # 2. Numbered interactive choice menu (AGY / Claude / Codex: "1. Yes", "2. Allow always", "3. No")
    option_Start = None
    parsed_opts: list[dict] = []
    for idx in range(max(0, len(tail) - 14), len(tail)):
        cleaned = _strip_gate_line(tail[idx])
        if not cleaned or HORIZONTAL_BORDER_RE.match(cleaned):
            continue
        m = _NUMBERED_OPTION_RE.match(cleaned)
        if m:
            if option_Start is None:
                option_Start = idx
            parsed_opts.append({"key": m.group(1), "label": m.group(2).strip()[:90]})
    if len(parsed_opts) >= 2 and option_Start is not None:
        above_lines: list[str] = []
        for idx in range(max(0, option_Start - 6), option_Start):
            cleaned = _strip_gate_line(tail[idx])
            if not cleaned or HORIZONTAL_BORDER_RE.match(cleaned) or _is_tui_chrome_line(cleaned):
                continue
            above_lines.append(cleaned[:240])
        question = above_lines[-1] if above_lines else "Select an option to continue:"
        details = above_lines[:-1][-4:]
        return {
            "kind": "numbered_choice",
            "title": "Approval Required",
            "question": question,
            "details": details,
            "options": parsed_opts[:4],
        }

    # 3. Standard [y/n] / (yes/no) / Approve? / Proceed? prompt
    prompt_idx = None
    for i in range(len(tail) - 1, -1, -1):
        if WAITING_TEXT_RE.search(tail[i]):
            prompt_idx = i
            break
    if prompt_idx is not None:
        question = _strip_gate_line(tail[prompt_idx]).lstrip(">❯ ").strip()[:240]
        ctx_lines: list[str] = []
        for j in range(max(0, prompt_idx - 4), prompt_idx):
            cleaned = _strip_gate_line(tail[j])
            if not cleaned or HORIZONTAL_BORDER_RE.match(cleaned) or _is_tui_chrome_line(cleaned):
                continue
            ctx_lines.append(cleaned[:240])
        return {
            "kind": "yn_prompt",
            "title": "Confirmation Prompt",
            "question": question or "Confirmation required in terminal",
            "details": ctx_lines[-3:],
            "options": [],
        }

    return None


_PREVIEW_STRIP = "─━│┃╭╮╯╰┌┐┘└├┤┬┴┼═║╔╗╚╝╠╣╦╩╬> "
_MESSAGE_FOOTER_DURATION_RE = re.compile(r"(?:^|·)\s*\d+(?:\.\d+)?\s*(?:ms|s|m)\s*$")


def _pick_preview_line(lines: list[str]) -> str:
    """Pick the last meaningful content row for the fleet preview (#316).

    Splits `capture-pane -J`-joined narrow-pane rows apart, drops the OpenCode input box
    (`┃` rows above the `╹▀▀▀` base), TUI chrome, and message-footer durations, and collapses
    the column padding that full-width TUI rows carry.
    """
    rows = _explode_joined_modal_rows(lines)
    base_idx = max((i for i, ln in enumerate(rows) if ln.strip().startswith("╹")), default=None)
    if base_idx is not None:
        rows = rows[:base_idx]
        # Pop the input box: rows up to and including the `Agent · model` line, then its blank rows.
        seen_model_line = False
        while rows and rows[-1].strip().startswith("┃"):
            body = rows[-1].strip(_PREVIEW_STRIP)
            if not seen_model_line:
                seen_model_line = "·" in body
            elif body:
                break
            rows.pop()
    for ln in reversed(rows):
        if _is_tui_chrome_line(ln) or HORIZONTAL_BORDER_RE.match(ln.strip()):
            continue
        text = re.sub(r"\s{2,}", " ", ln.strip(_PREVIEW_STRIP)).strip()
        if len(text) <= 2 or _MESSAGE_FOOTER_DURATION_RE.search(text):
            continue
        return text[:100]
    return ""


def parse_pane_telemetry(pane_text: str, command: str = "", session_name: str = "") -> dict:
    """Parse captured tmux pane text and command into vessel, status, and 30%-Rule telemetry."""
    clean_text = ANSI_ESCAPE_RE.sub("", pane_text or "")
    lines = [ln.strip() for ln in clean_text.splitlines() if ln.strip()]
    tail_text = "\n".join(lines[-12:]) if lines else ""
    cmd_lower = (command or "").lower()
    sess_lower = (session_name or "").lower()

    # 1. Detect vessel — check authoritative pane_current_command FIRST before screen text (#303)
    if "agy" in cmd_lower or "antigravity" in cmd_lower:
        vessel = "agy"
    elif "grok" in cmd_lower:
        vessel = "grok"
    elif "opencode" in cmd_lower:
        vessel = "opencode"
    elif "codex" in cmd_lower:
        vessel = "codex"
    elif cmd_lower in ("uvicorn", "python3", "python", "cloudflared", "npm") or sess_lower == "aim-connect-workspace":
        vessel = "service"
    elif "OpenCode" in clean_text or "ctrl+p commands" in tail_text or OPENCODE_TOKENS_RE.search(tail_text) or "opencode" in sess_lower:
        vessel = "opencode"
    elif "Grok CLI" in clean_text or "Grok 4" in tail_text or "xAI" in clean_text:
        vessel = "grok"
    elif "Gemini " in clean_text or "Ctrl+P commands" in clean_text or AGY_TOKENS_RE.search(clean_text):
        vessel = "agy"
    elif cmd_lower == "node":
        vessel = "service"
    else:
        vessel = "shell"

    # 2. Detect status (WAITING / THINKING / ERROR / IDLE) across footer, subagents, & active tray tasks (#220, #231)
    scrollback_lines, above_prompt_line, footer_lines, has_prompt_box = _split_pane_prompt_regions(lines)
    footer_text = "\n".join(footer_lines) if footer_lines else ""
    has_active_tray_work = any(_is_active_tray_task(ln) for ln in footer_lines)
    busy_tail_text = "\n".join(lines[-8:]) if lines else ""
    if WAITING_TEXT_RE.search(footer_text):
        status = "WAITING"
    elif (
        BRAILLE_SPINNER_RE.search(footer_text)
        or (has_prompt_box and BRAILLE_SPINNER_RE.search(above_prompt_line))
        or THINKING_TEXT_RE.search(footer_text)
        or OPENCODE_BUSY_BAR_RE.search(footer_text)
        or GROK_BUSY_ROW_RE.search(busy_tail_text)
        or ACTIVE_SUBAGENT_STATUS_RE.search(footer_text)
        or has_active_tray_work
    ):
        status = "THINKING"
    elif ERROR_TEXT_RE.search(tail_text):
        status = "ERROR"
    else:
        status = "IDLE"

    # 3. Parse token usage & context saturation
    tokens_used = 0
    tokens_limit = 1_000_000 if vessel == "agy" else 200_000
    explicit_pct: float | None = None

    agy_matches = list(AGY_TOKENS_RE.finditer(clean_text))
    oc_matches = list(OPENCODE_TOKENS_RE.finditer(clean_text))
    slash_matches = list(SLASH_TOKENS_RE.finditer(clean_text))
    generic_matches = list(GENERIC_TOKENS_RE.finditer(clean_text))

    if vessel == "opencode" and oc_matches:
        m = oc_matches[-1]
        tokens_used = _parse_token_number(m.group(1), m.group(2))
        try:
            pct_val = float(m.group(3))
            if pct_val > 0:
                explicit_pct = round(pct_val, 1)
                tokens_limit = max(tokens_used, int(round(tokens_used * 100.0 / pct_val)))
        except ValueError:
            pass
    elif agy_matches:
        m = agy_matches[-1]
        tokens_used = _parse_token_number(m.group(1), m.group(2))
        tokens_limit = 1_000_000
    elif slash_matches:
        m = slash_matches[-1]
        tokens_used = _parse_token_number(m.group(1), m.group(2))
        parsed_limit = _parse_token_number(m.group(3), m.group(4))
        if parsed_limit > 0:
            tokens_limit = parsed_limit
    elif oc_matches:
        m = oc_matches[-1]
        tokens_used = _parse_token_number(m.group(1), m.group(2))
    elif generic_matches:
        m = generic_matches[-1]
        tokens_used = _parse_token_number(m.group(1))

    if explicit_pct is not None:
        context_pct = explicit_pct
    else:
        context_pct = round((tokens_used / tokens_limit) * 100.0, 1) if (tokens_used > 0 and tokens_limit > 0) else 0.0
    tier = compute_30pct_rule_tier(context_pct, vessel=vessel, compaction_count=0)

    # 4. Extract structured WAITING gate prompt (#308) & concise preview line
    gate_info = extract_waiting_gate_info(lines, vessel=vessel) if status == "WAITING" else None
    preview = ""
    if gate_info and gate_info.get("question"):
        preview = f"GATE: {gate_info['question']}"[:110]
    else:
        preview = _pick_preview_line(scrollback_lines if has_prompt_box else lines)
    if not preview and not gate_info:
        for ln in reversed(lines):
            stripped_borders = ln.strip("─━│┃╭╮╯╰┌┐┘└├┤┬┴┼═║╔╗╚╝╠╣╦╩╬> ")
            if stripped_borders and len(stripped_borders) > 2:
                preview = stripped_borders[:100]
                break

    spoken_summary = extract_spoken_summary(clean_text, fallback=False)
    digest_lines = [
        ln for ln in scrollback_lines
        if not _is_tui_chrome_line(ln) and not HORIZONTAL_BORDER_RE.match(ln)
    ]
    turn_digest = (
        hashlib.sha1("\n".join(digest_lines[-12:]).encode("utf-8")).hexdigest()[:12]
        if digest_lines
        else ""
    )

    return {
        "vessel": vessel,
        "status": status,
        "tokens_used": tokens_used,
        "tokens_limit": tokens_limit,
        "context_pct": context_pct,
        "compaction_count": 0,
        "tier": tier,
        "preview": preview,
        "gate_info": gate_info,
        "spoken_summary": spoken_summary,
        "turn_digest": turn_digest,
    }


def _get_git_branch(path: str) -> str:
    """Resolve current git branch for a directory without spawning git subprocesses when possible."""
    if not path or not os.path.isdir(path):
        return ""
    curr = os.path.abspath(path)
    for _ in range(6):
        dot_git = os.path.join(curr, ".git")
        head_file = None
        if os.path.isdir(dot_git):
            head_file = os.path.join(dot_git, "HEAD")
        elif os.path.isfile(dot_git):
            try:
                with open(dot_git, "r", encoding="utf-8", errors="ignore") as f:
                    first = f.readline().strip()
                if first.startswith("gitdir:"):
                    gitdir = first.split(":", 1)[1].strip()
                    if not os.path.isabs(gitdir):
                        gitdir = os.path.abspath(os.path.join(curr, gitdir))
                    head_file = os.path.join(gitdir, "HEAD")
            except OSError:
                pass
        if head_file and os.path.isfile(head_file):
            try:
                with open(head_file, "r", encoding="utf-8", errors="ignore") as f:
                    ref = f.readline().strip()
                if ref.startswith("ref: refs/heads/"):
                    return ref[len("ref: refs/heads/"):]
                return ref[:8]
            except OSError:
                return ""
        parent = os.path.dirname(curr)
        if parent == curr:
            break
        curr = parent
    return ""


SESSION_WORKSPACE_ALIASES = {
    "aim-dash": "aim-tmux-dashboard",
    "aim-cron": "aim-cron-dashboard",
}

_AGY_BRAIN_CACHE: dict = {"ts": 0.0, "by_key": {}, "compactions_by_key": {}}
_TRANSCRIPT_STAT_CACHE: dict[str, tuple[int, int, int, int]] = {}
_PANE_TELEMETRY_CACHE: dict[str, dict] = {}
_FLEET_SNAPSHOT_CACHE: dict = {"ts": 0.0, "sessions_key": (), "fleet": [], "panes": []}


def _normalize_workspace_root(path: str) -> str:
    """Normalize a file:// URI or filesystem path, stripping /workspace/issue-* worktree suffixes (#218)."""
    if not path:
        return ""
    cleaned = str(path).strip()
    if cleaned.startswith("file://"):
        cleaned = cleaned[len("file://"):]
    cleaned = cleaned.rstrip("/")
    if "/workspace/issue-" in cleaned:
        cleaned = cleaned.split("/workspace/issue-", 1)[0].rstrip("/")
    return cleaned


def _read_transcript_telemetry(transcript_path: str, tail_bytes: int = 131072) -> tuple[int, int]:
    """Return (latest_total_input_tokens, compaction_count) from AGY transcript.jsonl (#218, #225, #228).

    Counts all SYSTEM 'CHECKPOINT' compaction steps across the full file and extracts the latest
    PLANNER_RESPONSE (input_tokens + cache_read_tokens) from the tail, stat-cached by (mtime_ns, size).
    """
    if not transcript_path or not os.path.isfile(transcript_path):
        return 0, 0
    try:
        st = os.stat(transcript_path)
        cached_entry = _TRANSCRIPT_STAT_CACHE.get(transcript_path)
        if cached_entry and cached_entry[0] == st.st_mtime_ns and cached_entry[1] == st.st_size:
            return cached_entry[2], cached_entry[3]

        compaction_count = 0
        with open(transcript_path, "rb") as fh:
            for raw_ln in fh:
                if b"CHECKPOINT" in raw_ln:
                    try:
                        obj = json.loads(raw_ln.decode("utf-8", errors="replace"))
                        if obj.get("type") == "CHECKPOINT":
                            compaction_count += 1
                    except Exception:
                        pass

        total_in = 0
        with open(transcript_path, "rb") as fh:
            if st.st_size > tail_bytes:
                fh.seek(st.st_size - tail_bytes)
            raw_tail = fh.read().decode("utf-8", errors="replace")
        for line in reversed(raw_tail.splitlines()):
            line = line.strip()
            if not line or "PLANNER_RESPONSE" not in line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if obj.get("type") == "PLANNER_RESPONSE":
                inp = int(obj.get("input_tokens") or 0)
                cached = int(obj.get("cache_read_tokens") or 0)
                candidate = inp + cached
                if candidate > 0:
                    total_in = candidate
                    break

        if len(_TRANSCRIPT_STAT_CACHE) > 256:
            _TRANSCRIPT_STAT_CACHE.clear()
        _TRANSCRIPT_STAT_CACHE[transcript_path] = (st.st_mtime_ns, st.st_size, total_in, compaction_count)
        return total_in, compaction_count
    except OSError:
        return 0, 0


def _read_transcript_tail_tokens(transcript_path: str, tail_bytes: int = 131072) -> int:
    """Read last 128KB of AGY transcript.jsonl and return input_tokens + cache_read_tokens (#218, #225)."""
    total_in, _ = _read_transcript_telemetry(transcript_path, tail_bytes=tail_bytes)
    return total_in


def _resolve_agy_brain_telemetry_pair(
    app_data_dir: str = "",
    ttl_sec: float = 3.0,
    agent_workspaces_dir: str = "",
    include_compactions: bool = False,
):
    """Query conversation_summaries.db + transcript.jsonl for ground-truth AGY tokens & compactions (#218, #225, #228)."""
    now = time.time()
    if (
        not app_data_dir
        and not agent_workspaces_dir
        and (now - _AGY_BRAIN_CACHE["ts"]) < ttl_sec
        and _AGY_BRAIN_CACHE["by_key"]
    ):
        if include_compactions:
            return dict(_AGY_BRAIN_CACHE["by_key"]), dict(_AGY_BRAIN_CACHE.get("compactions_by_key", {}))
        return dict(_AGY_BRAIN_CACHE["by_key"])

    base_dir = app_data_dir or os.environ.get(
        "AIM_AGY_APP_DATA_DIR",
        os.path.join(HOME_DIR, ".gemini", "antigravity-cli"),
    )
    db_path = os.path.join(base_dir, "conversation_summaries.db")
    result: dict[str, int] = {}
    compactions: dict[str, int] = {}
    seen_roots: set[str] = set()
    if os.path.isfile(db_path):
        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=1.5)
            try:
                rows = conn.execute(
                    "SELECT conversation_id, workspace_uris FROM conversation_summaries "
                    "WHERE nesting_depth = 0 ORDER BY last_modified_time DESC"
                ).fetchall()
            finally:
                conn.close()

            for cid, raw_uris in rows:
                if not cid or not raw_uris:
                    continue
                try:
                    uris = json.loads(raw_uris) if isinstance(raw_uris, str) else []
                except Exception:
                    uris = []
                if not isinstance(uris, list):
                    continue
                for u in uris:
                    norm_root = _normalize_workspace_root(str(u))
                    if not norm_root or norm_root in seen_roots:
                        continue
                    transcript_path = os.path.join(
                        base_dir, "brain", str(cid), ".system_generated", "logs", "transcript.jsonl"
                    )
                    total_in, comp_cnt = _read_transcript_telemetry(transcript_path)
                    if total_in > 0 or comp_cnt > 0:
                        seen_roots.add(norm_root)
                        result[norm_root] = total_in
                        compactions[norm_root] = comp_cnt
                        repo_base = os.path.basename(norm_root)
                        if repo_base and repo_base not in result:
                            result[repo_base] = total_in
                            compactions[repo_base] = comp_cnt
        except Exception as e:
            logger.debug(f"AGY brain token resolution skipped: {e}")

    # Resolve bwrap-isolated tenant brain directories under AGENT_WORKSPACES_DIR/agent-*/brain (#225, #228)
    aw_root = agent_workspaces_dir or (AGENT_WORKSPACES_DIR if not app_data_dir else "")
    if aw_root and os.path.isdir(aw_root):
        try:
            for entry in os.scandir(aw_root):
                if not entry.is_dir() or not entry.name.startswith("agent-"):
                    continue
                brain_dir = os.path.join(entry.path, "brain")
                if not os.path.isdir(brain_dir):
                    continue
                candidates: list[tuple[float, str]] = []
                for conv_entry in os.scandir(brain_dir):
                    if not conv_entry.is_dir() or conv_entry.name.startswith("."):
                        continue
                    tpath = os.path.join(
                        conv_entry.path, ".system_generated", "logs", "transcript.jsonl"
                    )
                    if os.path.isfile(tpath):
                        try:
                            candidates.append((os.path.getmtime(tpath), tpath))
                        except OSError:
                            pass
                candidates.sort(key=lambda x: x[0], reverse=True)
                for _, tpath in candidates:
                    tok, comp_cnt = _read_transcript_telemetry(tpath)
                    if tok > 0 or comp_cnt > 0:
                        result[entry.name] = tok
                        compactions[entry.name] = comp_cnt
                        break
        except OSError:
            pass

    if not app_data_dir and not agent_workspaces_dir:
        _AGY_BRAIN_CACHE["ts"] = now
        _AGY_BRAIN_CACHE["by_key"] = dict(result)
        _AGY_BRAIN_CACHE["compactions_by_key"] = dict(compactions)
    if include_compactions:
        return result, compactions
    return result


def _resolve_agy_brain_tokens_by_workspace(
    app_data_dir: str = "",
    ttl_sec: float = 3.0,
    agent_workspaces_dir: str = "",
    include_compactions: bool = False,
):
    """Query conversation_summaries.db + transcript.jsonl for AGY tokens (and optional compactions) (#218, #225, #228)."""
    return _resolve_agy_brain_telemetry_pair(
        app_data_dir=app_data_dir,
        ttl_sec=ttl_sec,
        agent_workspaces_dir=agent_workspaces_dir,
        include_compactions=include_compactions,
    )


def _normalize_lease_waiting_human(raw_val: object, fallback_ts: int = 0) -> dict | None:
    if isinstance(raw_val, dict):
        reason = str(raw_val.get("reason") or "Human login / 2FA requested").strip()[:240]
        req_at = int(raw_val.get("requestedAt") or fallback_ts or 0)
        return {"reason": reason, "requestedAt": req_at}
    if isinstance(raw_val, str) and raw_val.strip():
        return {"reason": raw_val.strip()[:240], "requestedAt": int(fallback_ts or 0)}
    if raw_val is True:
        return {"reason": "Human login / 2FA requested", "requestedAt": int(fallback_ts or 0)}
    return None


def _match_lease_session_name(candidate: str, allowed_sessions: list[str] | None = None) -> str:
    raw = str(candidate or "").strip()
    if not raw or raw.lower() == "operator":
        return ""
    if not allowed_sessions:
        return raw
    lower = raw.lower()
    ordered = sorted(allowed_sessions, key=len, reverse=True)
    for name in ordered:
        if name.lower() == lower:
            return name
    for name in ordered:
        nl = name.lower()
        if lower.startswith(f"{nl}-") or lower.startswith(f"{nl}:") or lower.startswith(f"{nl}/"):
            return name
    for name in ordered:
        nl = name.lower()
        if nl.startswith("aim-") and len(nl) > 5:
            slug = nl[4:]
            if lower == slug or lower.startswith(f"{slug}-") or lower.endswith(f"-{slug}"):
                return name
    return raw if raw in allowed_sessions else ""


def _get_browser_leases_path() -> str:
    custom = (os.environ.get("AIM_BROWSER_STATE_DIR") or "").strip()
    state_dir = os.path.abspath(custom) if custom else os.path.join(HOME_DIR, ".cache", "aim-browser")
    return os.path.join(state_dir, "leases.json")


def _read_browser_leases_telemetry(
    allowed_sessions: list[str] | None = None,
) -> tuple[dict[str, str], dict[str, dict]]:
    """Return (by_session_target_id, waiting_for_human_by_session) from leases.json (#257, #275)."""
    leases_path = _get_browser_leases_path()
    if not os.path.isfile(leases_path):
        return {}, {}
    try:
        with open(leases_path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    except Exception:
        return {}, {}
    if not isinstance(raw, dict):
        return {}, {}

    by_sess: dict[str, str] = {}
    waiting_by_sess: dict[str, dict] = {}
    for lease_key, meta in raw.items():
        if not isinstance(meta, dict):
            continue
        tid = str(meta.get("targetId") or "").strip()
        matched_sess = ""
        for cand in (meta.get("session"), meta.get("actor"), lease_key):
            matched_sess = _match_lease_session_name(str(cand or ""), allowed_sessions)
            if matched_sess:
                break
        if not matched_sess:
            continue
        if tid and matched_sess not in by_sess:
            by_sess[matched_sess] = tid
        waiting_info = _normalize_lease_waiting_human(
            meta.get("waitingForHuman"), int(meta.get("updatedAt") or 0)
        )
        if waiting_info and matched_sess not in waiting_by_sess:
            waiting_by_sess[matched_sess] = {
                "lease": str(lease_key),
                "targetId": tid,
                **waiting_info,
            }
            if tid:
                by_sess[matched_sess] = tid
    return by_sess, waiting_by_sess


def _read_browser_leases_by_session() -> dict[str, str]:
    """Return mapping of tmux session_name -> primary leased CDP targetId (#257)."""
    by_sess, _ = _read_browser_leases_telemetry()
    return by_sess


def collect_fleet_telemetry(allowed_sessions: list[str]) -> tuple[list[dict], list[dict]]:
    """Collect pane-level and session-level telemetry for all allowed tmux sessions."""
    allowed_sessions = sorted(allowed_sessions, key=lambda s: s.lower())
    allowed_set = set(allowed_sessions)
    if not allowed_set:
        return [], []

    now = time.time()
    is_real_subprocess = getattr(subprocess.run, "__module__", "") == "subprocess"
    leases_mtime_ns = 0
    try:
        leases_mtime_ns = os.stat(_get_browser_leases_path()).st_mtime_ns
    except OSError:
        leases_mtime_ns = 0
    sessions_key = (*allowed_sessions, f"__leases__:{leases_mtime_ns}")
    if (
        is_real_subprocess
        and _FLEET_SNAPSHOT_CACHE["sessions_key"] == sessions_key
        and (now - _FLEET_SNAPSHOT_CACHE["ts"]) < 2.0
        and _FLEET_SNAPSHOT_CACHE["fleet"]
    ):
        return list(_FLEET_SNAPSHOT_CACHE["fleet"]), list(_FLEET_SNAPSHOT_CACHE["panes"])

    fmt = "#{session_name}@@@#{window_index}@@@#{window_name}@@@#{pane_index}@@@#{pane_current_command}@@@#{pane_current_path}@@@#{pane_pid}@@@#{session_attached}@@@#{window_activity}"
    res = subprocess.run(["tmux", "list-panes", "-a", "-F", fmt], capture_output=True, text=True)
    if res.returncode != 0:
        return [], []

    try:
        resolved_brain = _resolve_agy_brain_tokens_by_workspace(include_compactions=True)
    except TypeError:
        resolved_brain = _resolve_agy_brain_tokens_by_workspace()
    if isinstance(resolved_brain, tuple) and len(resolved_brain) == 2:
        agy_brain_tokens, agy_brain_compactions = resolved_brain
    else:
        agy_brain_tokens = resolved_brain or {}
        agy_brain_compactions = {}

    panes = []
    by_session: dict[str, list[dict]] = {s: [] for s in allowed_sessions}

    for raw in res.stdout.splitlines():
        if not raw.strip():
            continue
        parts = raw.split("@@@")
        if len(parts) < 8:
            continue
        sess_name, win_idx, win_name, pane_idx, cmd, path, pid_str, attached_str = parts[:8]
        win_activity = parts[8].strip() if len(parts) >= 9 else ""
        if sess_name not in allowed_set:
            continue

        target = f"{sess_name}:{win_idx}.{pane_idx}"
        cached_pane = _PANE_TELEMETRY_CACHE.get(target)
        use_cached_pane = False
        if (
            is_real_subprocess
            and win_activity
            and cached_pane
            and cached_pane.get("win_activity") == win_activity
            and cached_pane.get("cmd") == cmd
            and cached_pane.get("path") == path
        ):
            age = now - cached_pane.get("ts", 0.0)
            prev_status = cached_pane.get("telemetry", {}).get("status", "IDLE")
            if (prev_status == "IDLE" and age < 30.0) or (prev_status != "IDLE" and age < 2.5):
                use_cached_pane = True

        if use_cached_pane:
            telemetry = dict(cached_pane["telemetry"])
        else:
            # Capture last 120 lines of the pane for status, token, & multi-paragraph 🔊 telemetry (#224)
            cap = subprocess.run(
                ["tmux", "capture-pane", "-t", target, "-p", "-J", "-S", "-120"],
                capture_output=True,
                text=True,
            )
            pane_text = cap.stdout if cap.returncode == 0 else ""
            telemetry = parse_pane_telemetry(pane_text, command=cmd, session_name=sess_name)
            if is_real_subprocess and win_activity:
                _PANE_TELEMETRY_CACHE[target] = {
                    "ts": now,
                    "win_activity": win_activity,
                    "cmd": cmd,
                    "path": path,
                    "telemetry": dict(telemetry),
                }
        branch = _get_git_branch(path)
        is_worktree = "/workspace/issue-" in (path or "")
        repo_name = os.path.basename(path.rstrip("/")) if path else ""

        norm_root = _normalize_workspace_root(path)
        main_repo_name = os.path.basename(norm_root) if norm_root else repo_name
        alias_repo = SESSION_WORKSPACE_ALIASES.get(sess_name, sess_name)
        base_agent_key = "-".join(sess_name.split("-")[:2]) if sess_name.startswith("agent-") else ""

        matched_key = ""
        for candidate_key in (base_agent_key, norm_root, main_repo_name, alias_repo):
            if candidate_key and (
                agy_brain_tokens.get(candidate_key, 0) > 0
                or agy_brain_compactions.get(candidate_key, 0) > 0
            ):
                matched_key = candidate_key
                break

        brain_total_in = int(agy_brain_tokens.get(matched_key, 0)) if matched_key else 0
        compaction_count = int(agy_brain_compactions.get(matched_key, 0)) if matched_key else 0

        if telemetry["vessel"] == "agy":
            telemetry["compaction_count"] = compaction_count
            if brain_total_in > 0:
                telemetry["tokens_used"] = brain_total_in
                telemetry["tokens_limit"] = 1_000_000
                telemetry["context_pct"] = round((brain_total_in / 1_000_000) * 100.0, 1)
            telemetry["tier"] = compute_30pct_rule_tier(
                telemetry["context_pct"],
                vessel="agy",
                compaction_count=compaction_count,
            )
        else:
            telemetry["compaction_count"] = 0

        pane_obj = {
            "session_name": sess_name,
            "window_index": int(win_idx) if win_idx.isdigit() else 0,
            "window_name": win_name,
            "pane_index": int(pane_idx) if pane_idx.isdigit() else 0,
            "target": target,
            "command": cmd,
            "path": path,
            "repo_name": repo_name,
            "branch": branch,
            "is_worktree": is_worktree,
            "pid": int(pid_str) if pid_str.isdigit() else None,
            "attached": attached_str == "1",
            **telemetry,
        }
        panes.append(pane_obj)
        by_session.setdefault(sess_name, []).append(pane_obj)

    browser_leases_by_sess, browser_waiting_by_sess = _read_browser_leases_telemetry(allowed_sessions)
    fleet = []
    for sess_name in allowed_sessions:
        sess_panes = by_session.get(sess_name, [])
        leased_tid = browser_leases_by_sess.get(sess_name, "")
        browser_human_hold = browser_waiting_by_sess.get(sess_name)
        if not sess_panes:
            fleet.append({
                "session_name": sess_name,
                "vessel": "shell",
                "status": "WAITING" if browser_human_hold else "IDLE",
                "path": "",
                "repo_name": "",
                "branch": "",
                "is_worktree": False,
                "tokens_used": 0,
                "tokens_limit": 200_000,
                "context_pct": 0.0,
                "compaction_count": 0,
                "tier": "normal",
                "preview": browser_human_hold["reason"] if browser_human_hold else "",
                "spoken_summary": "",
                "turn_digest": "",
                "has_browser_lease": bool(leased_tid or browser_human_hold),
                "browser_tab_id": leased_tid,
                "browser_waiting_for_human": browser_human_hold,
                "window_count": 0,
                "pane_count": 0,
                "panes": [],
            })
            continue

        # Prefer an AI vessel pane or THINKING pane as the primary summary for the session
        primary = sess_panes[0]
        for p in sess_panes:
            if p["vessel"] in ("agy", "grok", "opencode", "codex"):
                primary = p
                break
        any_thinking = any(p["status"] == "THINKING" for p in sess_panes)
        any_waiting = any(p["status"] == "WAITING" for p in sess_panes)
        any_error = any(p["status"] == "ERROR" for p in sess_panes)
        if browser_human_hold:
            agg_status = "WAITING"
        else:
            agg_status = (
                "THINKING"
                if any_thinking
                else ("WAITING" if any_waiting else ("ERROR" if any_error else primary["status"]))
            )

        waiting_pane = next((p for p in sess_panes if p.get("status") == "WAITING"), None)
        active_gate_info = (
            waiting_pane.get("gate_info")
            if waiting_pane
            else primary.get("gate_info")
        )
        effective_preview = (
            browser_human_hold["reason"]
            if browser_human_hold
            else (
                waiting_pane["preview"]
                if (waiting_pane and waiting_pane.get("preview"))
                else primary["preview"]
            )
        )

        fleet.append({
            "session_name": sess_name,
            "vessel": primary["vessel"],
            "status": agg_status,
            "command": primary["command"],
            "path": primary["path"],
            "repo_name": primary["repo_name"],
            "branch": primary["branch"],
            "is_worktree": primary["is_worktree"],
            "tokens_used": primary["tokens_used"],
            "tokens_limit": primary["tokens_limit"],
            "context_pct": primary["context_pct"],
            "compaction_count": primary.get("compaction_count", 0),
            "tier": primary["tier"],
            "preview": effective_preview,
            "gate_info": active_gate_info,
            "spoken_summary": primary.get("spoken_summary", ""),
            "turn_digest": primary.get("turn_digest", ""),
            "has_browser_lease": bool(leased_tid or browser_human_hold),
            "browser_tab_id": leased_tid,
            "browser_waiting_for_human": browser_human_hold,
            "attached": primary["attached"],
            "window_count": len({p["window_index"] for p in sess_panes}),
            "pane_count": len(sess_panes),
            "panes": sess_panes,
        })

    if is_real_subprocess:
        _FLEET_SNAPSHOT_CACHE["ts"] = now
        _FLEET_SNAPSHOT_CACHE["sessions_key"] = sessions_key
        _FLEET_SNAPSHOT_CACHE["fleet"] = list(fleet)
        _FLEET_SNAPSHOT_CACHE["panes"] = list(panes)

    return fleet, panes



async def kill_all_user_sessions(sanitized_email: str, exclude_session: str = ""):
    """Kill ALL tmux sessions for this email to enforce 1-email-1-session.
    
    This is the server-side safety net that guarantees no ghost sessions
    persist across harness switches, browser crashes, or failed frontend
    DELETE calls. Called before spawning a new session.
    
    Args:
        sanitized_email: The user's email sanitized for tmux naming
        exclude_session: Optional session name to keep alive (for reconnects)
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "tmux", "list-sessions", "-F", "#{session_name}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        if proc.returncode != 0:
            return  # No tmux server or no sessions — nothing to kill
        
        prefix = f"agent-{sanitized_email}"
        for session_name in stdout.decode().strip().split('\n'):
            session_name = session_name.strip()
            if not session_name:
                continue
            # Match sessions that are exactly the prefix or start with prefix-
            if session_name == prefix or session_name.startswith(f"{prefix}-"):
                if exclude_session and session_name == exclude_session:
                    continue
                logger.info(f"[HARNESS SWITCH] Killing orphan session: {session_name}")
                await asyncio.create_subprocess_exec(
                    "tmux", "kill-session", "-t", session_name
                )
    except Exception as e:
        logger.warning(f"[HARNESS SWITCH] Error during session cleanup for {sanitized_email}: {e}")


def _get_sessions_sync(x_api_token: str = None, is_local_admin: bool = False) -> dict:
    result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
    sessions = []
    if is_local_admin:
        role, prefix = ("admin", "")
    else:
        role, prefix = _get_user_from_token(x_api_token)
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            if line and not line.startswith("aim-client-"):
                # Non-admin users only see sessions with their prefix (or all if no prefix)
                if role == "admin" or not prefix or line.startswith(prefix):
                    sessions.append(line)
    sessions.sort(key=lambda s: s.lower())
    try:
        fleet, panes = collect_fleet_telemetry(sessions)
    except Exception as e:
        logger.warning(f"Fleet telemetry collection error: {e}")
        fleet, panes = [], []
    return {
        "sessions": sessions,
        "fleet": fleet,
        "panes": panes,
        "build_id": get_frontend_build_id(),
    }


@router.get("/api/sessions", dependencies=[Depends(verify_token)])
async def get_sessions(x_api_token: str = Header(None)) -> dict:
    return await asyncio.to_thread(_get_sessions_sync, x_api_token, False)


@router.get("/api/fleet/panes", dependencies=[Depends(verify_token_or_loopback)])
async def get_fleet_panes(request: Request, x_api_token: str = Header(None)) -> dict:
    """Return enriched pane and session telemetry for all allowed sessions (#209, #221, #236)."""
    local_ok = is_authorized_local_loopback(request)
    data = await asyncio.to_thread(_get_sessions_sync, x_api_token, local_ok)
    return {
        "sessions": data.get("sessions", []),
        "fleet": data.get("fleet", []),
        "panes": data.get("panes", []),
        "build_id": data.get("build_id", get_frontend_build_id()),
    }


class SessionCommandRequest(BaseModel):
    command: str
    vessel: str = ""


TMUX_PANE_TARGET_RE = re.compile(r"^\d+(?:\.\d+)?$")


def _format_tmux_uptime(created_epoch_str: str) -> str:
    try:
        created_ts = int(str(created_epoch_str or "").strip())
    except ValueError:
        return "ONLINE"
    if created_ts <= 0:
        return "ONLINE"
    elapsed = max(0, int(time.time()) - created_ts)
    days, rem = divmod(elapsed, 86400)
    hours, rem = divmod(rem, 3600)
    mins = rem // 60
    if days > 0:
        return f"UP {days}d {hours:02d}h {mins:02d}m"
    if hours > 0:
        return f"UP {hours}h {mins:02d}m"
    return f"UP {mins}m"


@router.get("/api/tmux/{name}/windows", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_tmux_session_windows(name: str) -> dict:
    """Return multi-window / multi-pane topology and recent scrollback for raw tmux server sessions (#260)."""
    if not SESSION_NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="Invalid session name.")

    fmt = (
        "#{window_index}@@@#{window_name}@@@#{window_active}@@@"
        "#{pane_index}@@@#{pane_active}@@@#{pane_current_command}@@@"
        "#{pane_current_path}@@@#{pane_pid}"
    )
    listed = subprocess.run(
        ["tmux", "list-panes", "-s", "-t", name, "-F", fmt],
        capture_output=True,
        text=True,
    )
    if listed.returncode != 0:
        raise HTTPException(status_code=404, detail=f"Tmux session '{name}' not found.")

    created_res = subprocess.run(
        ["tmux", "display-message", "-p", "-t", name, "#{session_created}"],
        capture_output=True,
        text=True,
    )
    uptime_str = _format_tmux_uptime(created_res.stdout if created_res.returncode == 0 else "")

    raw_rows = [ln for ln in listed.stdout.splitlines() if ln.strip()]
    win_counts: dict[str, int] = {}
    parsed_rows = []
    for ln in raw_rows[:8]:
        parts = ln.split("@@@")
        if len(parts) < 8:
            continue
        win_idx, win_name, win_act, pane_idx, pane_act, cmd, cwd, pid_str = parts[:8]
        win_counts[win_idx] = win_counts.get(win_idx, 0) + 1
        parsed_rows.append((win_idx, win_name, win_act, pane_idx, pane_act, cmd, cwd, pid_str))

    windows = []
    for win_idx, win_name, win_act, pane_idx, pane_act, cmd, cwd, pid_str in parsed_rows:
        target_rel = f"{win_idx}.{pane_idx}"
        full_target = f"{name}:{target_rel}"
        cap = subprocess.run(
            ["tmux", "capture-pane", "-t", full_target, "-p", "-J", "-S", "-80"],
            capture_output=True,
            text=True,
        )
        raw_cap = ANSI_ESCAPE_RE.sub("", cap.stdout if cap.returncode == 0 else "")
        cap_lines = [line.rstrip() for line in raw_cap.splitlines()]
        while cap_lines and not cap_lines[-1]:
            cap_lines.pop()

        multi_pane_in_win = win_counts.get(win_idx, 1) > 1
        pill_id = f"{win_idx}.{pane_idx}:{win_name}" if multi_pane_in_win else f"{win_idx}:{win_name}"
        is_focused = win_act == "1" and pane_act == "1"
        windows.append(
            {
                "id": pill_id,
                "target": target_rel,
                "window_index": int(win_idx) if win_idx.isdigit() else 0,
                "pane_index": int(pane_idx) if pane_idx.isdigit() else 0,
                "title": f"{pill_id}{'*' if is_focused else ''} ({cmd or 'shell'})",
                "active": is_focused,
                "cmd": cmd or "bash",
                "cwd": cwd or "",
                "pid": pid_str or "",
                "lines": cap_lines[-60:],
            }
        )

    return {
        "session": name,
        "uptime": uptime_str,
        "window_count": len(win_counts),
        "pane_count": len(windows),
        "windows": windows,
    }


class TmuxWindowExecRequest(BaseModel):
    target: str = "0.0"
    command: str = ""
    select_only: bool = False


@router.post("/api/tmux/{name}/exec", dependencies=[Depends(verify_token), Depends(require_admin)])
def exec_tmux_window_command(name: str, req: TmuxWindowExecRequest) -> dict:
    """Focus a tmux window/pane and optionally execute a raw shell command via 2-step buffer paste (#260)."""
    if not SESSION_NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="Invalid session name.")
    target_rel = (req.target or "0.0").strip()
    if not TMUX_PANE_TARGET_RE.match(target_rel):
        raise HTTPException(status_code=400, detail="Invalid window/pane target.")

    win_idx = target_rel.split(".", 1)[0]
    full_target = f"{name}:{target_rel}"
    try:
        subprocess.run(
            ["tmux", "select-window", "-t", f"{name}:{win_idx}"],
            capture_output=True,
            text=True,
            check=True,
        )
        if "." in target_rel:
            subprocess.run(
                ["tmux", "select-pane", "-t", full_target],
                capture_output=True,
                text=True,
                check=True,
            )
        cmd_text = (req.command or "").strip()
        dispatched = False
        if cmd_text and not req.select_only:
            subprocess.run(["tmux", "set-buffer", "--", cmd_text], capture_output=True, text=True, check=True)
            subprocess.run(["tmux", "paste-buffer", "-t", full_target], capture_output=True, text=True, check=True)
            time.sleep(0.08)
            subprocess.run(["tmux", "send-keys", "-t", full_target, "Enter"], capture_output=True, text=True, check=True)
            dispatched = True
        return {
            "status": "ok",
            "session": name,
            "target": target_rel,
            "dispatched": dispatched,
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Tmux window exec failed: {e.stderr or str(e)}")


@router.post("/api/sessions/{name}/command", dependencies=[Depends(verify_token), Depends(require_admin)])
def send_session_command(name: str, req: SessionCommandRequest) -> dict:
    """Safely inject a command or slash skill (e.g. /aim-memory-wiki, /aim-handoff) into a tmux session (#209, #288).

    Uses an isolated named tmux buffer (-b), bracketed paste (-p -r -d), a 0.25s TUI
    settle delay, separate Enter, and a capture-pane confirmation check for slash skills.
    """
    if not SESSION_NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="Invalid session name.")
    cmd_text = (req.command or "").strip()
    if not cmd_text:
        raise HTTPException(status_code=400, detail="Command cannot be empty.")

    if cmd_text.startswith("/"):
        from opencode_skills import inspect_tmux_pane_context, translate_opencode_skill_slash

        eff_vessel = (req.vessel or "").strip().lower()
        pane_cwd = ""
        proc_start_ts = None
        if callable(getattr(subprocess.run, "assert_called", None)):
            # Unit tests mocking routes_sessions.subprocess.run should stay hermetically isolated from host tmux
            pass
        else:
            det_vessel, pane_cwd, proc_start_ts = inspect_tmux_pane_context(name)
            if not eff_vessel:
                eff_vessel = det_vessel
        cmd_text = translate_opencode_skill_slash(
            cmd_text,
            vessel=eff_vessel,
            home_dir=HOME_DIR,
            cwd_path=pane_cwd,
            proc_start_ts=proc_start_ts,
        )

    buf_name = f"aim_cmd_{uuid.uuid4().hex[:10]}"
    try:
        subprocess.run(
            ["tmux", "load-buffer", "-b", buf_name, "-"],
            input=cmd_text,
            capture_output=True,
            text=True,
            check=True,
        )
        subprocess.run(
            ["tmux", "paste-buffer", "-p", "-r", "-d", "-b", buf_name, "-t", name],
            capture_output=True,
            text=True,
            check=True,
        )
        time.sleep(0.25)
        subprocess.run(["tmux", "send-keys", "-t", name, "Enter"], capture_output=True, text=True, check=True)
        if is_single_slash_command(cmd_text):
            time.sleep(0.15)
            cap = subprocess.run(
                ["tmux", "capture-pane", "-t", name, "-S", "-8", "-p"],
                capture_output=True,
                text=True,
            )
            if cap.returncode == 0 and pane_still_holds_slash_command(cap.stdout, cmd_text):
                subprocess.run(["tmux", "send-keys", "-t", name, "Enter"], capture_output=True, text=True, check=True)
        return {"status": "sent", "session": name, "command": cmd_text}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Tmux command injection failed: {e.stderr or str(e)}")


class SessionRequest(BaseModel):
    name: str
    cwd: str | None = None
    agent: str | None = None
    resume: bool | None = None
    skip_permissions: bool | None = None


class ResurrectSaveRequest(BaseModel):
    force: bool = False


class FastResumeRequest(BaseModel):
    agent: str | None = None


class TmuxBootSettingsUpdateRequest(BaseModel):
    default_agent: str | None = None
    auto_resume_c: bool | None = None
    skip_permissions: bool | None = None
    auto_restore_on_boot: bool | None = None
    empty_save_guardrail: bool | None = None
    show_sidebar_resurrect_bar: bool | None = None
    search_paths: list[str] | None = None
    sync_tmux_conf: bool = False


class HostBootControlRequest(BaseModel):
    action: str

class E2EESettingsRequest(BaseModel):
    secret: str

@router.post("/api/settings/e2ee", dependencies=[Depends(verify_token), Depends(require_admin)])
def update_e2ee_settings(req: E2EESettingsRequest):
    """Updates the backend E2EE_SECRET dynamically and writes it to .env"""
    global ENABLE_E2EE, E2EE_SECRET
    
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
    new_lines = []
    found_enable = False
    found_secret = False
    
    for line in lines:
        if line.startswith("ENABLE_E2EE="):
            new_lines.append("ENABLE_E2EE=true\n" if req.secret else "ENABLE_E2EE=false\n")
            found_enable = True
        elif line.startswith("E2EE_SECRET="):
            new_lines.append(f'E2EE_SECRET="{req.secret}"\n')
            found_secret = True
        else:
            new_lines.append(line)
            
    if not found_enable:
        new_lines.append("ENABLE_E2EE=true\n" if req.secret else "ENABLE_E2EE=false\n")
    if not found_secret:
        new_lines.append(f'E2EE_SECRET="{req.secret}"\n')
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
        
    ENABLE_E2EE = bool(req.secret)
    E2EE_SECRET = req.secret
    return {"status": "success", "message": "E2EE settings updated on backend."}


@router.post("/api/sessions", dependencies=[Depends(verify_token), Depends(require_admin)])
def create_session(req: SessionRequest) -> dict:
    """Spawns a new detached tmux session (optionally rooted in cwd and launching/resuming an AI agent -c) and enables mouse support (#300)."""
    if not SESSION_NAME_RE.match(req.name):
        raise HTTPException(status_code=400, detail="Invalid session name. Use only letters, numbers, hyphens, underscores (max 64 chars).")

    resolved_cwd: str | None = None
    if req.cwd and req.cwd.strip():
        expanded = os.path.realpath(os.path.expanduser(req.cwd.strip()))
        if not os.path.isdir(expanded):
            raise HTTPException(status_code=400, detail=f"Working directory does not exist: {req.cwd}")
        resolved_cwd = expanded

    launch_cmd = ""
    if req.agent and req.agent.strip():
        prefs = twm.load_tmux_settings()
        use_resume = prefs.get("auto_resume_c", True) if req.resume is None else bool(req.resume)
        use_skip = prefs.get("skip_permissions", False) if req.skip_permissions is None else bool(req.skip_permissions)
        try:
            launch_cmd = twm.build_agent_launch_command(
                req.agent,
                resume=use_resume,
                skip_permissions=use_skip,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    tmux_cmd = ["tmux", "new-session", "-d", "-s", req.name]
    if resolved_cwd:
        tmux_cmd.extend(["-c", resolved_cwd])

    result = subprocess.run(tmux_cmd, capture_output=True, text=True)
    if result.returncode == 0:
        subprocess.run(["tmux", "set-option", "-g", "mouse", "on"])
        if launch_cmd:
            subprocess.run(["tmux", "send-keys", "-t", req.name, launch_cmd, "Enter"], capture_output=True, text=True)
        return {
            "status": "success",
            "session": req.name,
            "cwd": resolved_cwd,
            "launched": launch_cmd,
        }
    return {"error": result.stderr}


@router.get("/api/tmux/resurrect/status", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_tmux_resurrect_status() -> dict:
    """Return tmux-resurrect installation status, snapshot session count, and Empty-Save Guardrail status (#300)."""
    return twm.get_resurrect_status()


@router.post("/api/tmux/resurrect/save", dependencies=[Depends(verify_token), Depends(require_admin)])
def save_tmux_resurrect_state(req: ResurrectSaveRequest) -> dict:
    """Save tmux workspace state via tmux-resurrect with #47 Empty-Save Guardrail protection (#300)."""
    try:
        return twm.save_tmux_workspace(force=req.force)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/api/tmux/resurrect/restore", dependencies=[Depends(verify_token), Depends(require_admin)])
def restore_tmux_resurrect_state() -> dict:
    """Restore tmux workspace state via tmux-resurrect with #37 dead-daemon aim_restore_tmp bootstrap (#300)."""
    try:
        return twm.restore_tmux_workspace()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/api/sessions/{name}/fast-resume", dependencies=[Depends(verify_token), Depends(require_admin)])
def fast_resume_session(name: str, req: FastResumeRequest) -> dict:
    """Fast-resume (-c) localized AI agent in an idle shell pane or shell-backed window (#300)."""
    if not SESSION_NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="Invalid session name.")
    try:
        return twm.fast_resume_session_agent(name, requested_agent=req.agent)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Fast resume failed: {exc}")


@router.get("/api/projects/repos", dependencies=[Depends(verify_token), Depends(require_admin)])
def list_local_git_repos() -> dict:
    """Discover local Git repositories (depth 2) and annotate active vs offline tmux sessions (#300)."""
    return {"repos": twm.discover_git_repos()}


@router.get("/api/tmux/settings", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_tmux_boot_settings() -> dict:
    """Return persistent TMUX & BOOT settings, resurrect status, and host WSL/systemd health (#300)."""
    return {
        "settings": twm.load_tmux_settings(),
        "resurrect": twm.get_resurrect_status(),
        "host_status": twm.get_host_boot_and_wsl_status(),
    }


@router.put("/api/tmux/settings", dependencies=[Depends(verify_token), Depends(require_admin)])
def update_tmux_boot_settings(req: TmuxBootSettingsUpdateRequest) -> dict:
    """Update persistent TMUX & BOOT settings and optionally sync ~/.tmux.conf @resurrect-processes (#300)."""
    patch_dict = req.model_dump(exclude={"sync_tmux_conf"}, exclude_none=True)
    try:
        saved = twm.save_tmux_settings(patch_dict, sync_tmux_conf=req.sync_tmux_conf)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {
        "status": "saved",
        "settings": saved,
        "resurrect": twm.get_resurrect_status(),
        "host_status": twm.get_host_boot_and_wsl_status(),
    }


@router.post("/api/tmux/host-control", dependencies=[Depends(verify_token), Depends(require_admin)])
def control_tmux_host_boot(req: HostBootControlRequest) -> dict:
    """Install/remove Linux systemd boot-restore unit or start/stop WSL keepalive process (#299, #300)."""
    from pathlib import Path

    try:
        return twm.execute_host_boot_control(req.action, Path(AIM_CONNECT_ROOT))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.delete("/api/sessions/{name}", dependencies=[Depends(verify_token), Depends(require_admin)])
def kill_session(name: str, delete_workspace: bool = False):

    import shutil
    import re
    result = subprocess.run(["tmux", "kill-session", "-t", name], capture_output=True, text=True)
    
    if delete_workspace:
        # Obliterate the workspace directory for the agent/subagent
        # Unified model: primary sessions use user_root_dir, fleet sub-agents use fleet_sessions/
        workspace_dir = None
        parts = name.split('-')
        if name.startswith('agent-') and len(parts) >= 2:
            base_agent = f"agent-{parts[1]}"
            user_root_dir = f"{AGENT_WORKSPACES_DIR}/{base_agent}"
            if len(parts) > 3:
                # Fleet sub-agent: only delete its conversation isolation dir
                sub_id = '-'.join(parts[2:])
                workspace_dir = f"{user_root_dir}/fleet_sessions/{sub_id}"
            else:
                # Primary session — delete the entire user workspace
                workspace_dir = user_root_dir
        else:
            # Fallback for generic non-agent workspaces
            workspace_dir = f"{AIM_CONNECT_ROOT}/workspace/{name}"
            
        if workspace_dir and os.path.exists(workspace_dir):
            try:
                shutil.rmtree(workspace_dir)
                logger.info(f"Obliterated workspace directory: {workspace_dir}")
            except Exception as e:
                logger.error(f"Failed to delete workspace directory {workspace_dir}: {e}")
                return {"status": "success", "warning": f"Session killed, but failed to delete workspace: {e}"}

    if result.returncode == 0 or "can't find session" in result.stderr:
        return {"status": "success"}
    return {"error": result.stderr}

SECRET_QUERY_RE = re.compile(
    r"([?&](?:token|api_token|access_token|key|api_key|secret|password|sig|signature|jwt)=)([^&#\s]+)",
    re.IGNORECASE,
)
URL_TOKEN_RE = re.compile(r"https?://[^\s\"'<>)\]]+")
PATH_TOKEN_RE = re.compile(r"(?:~|(?:/[a-zA-Z0-9._-]+)){2,}(?:/[a-zA-Z0-9._-]+)*")
IPV4_TOKEN_RE = re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?::\d{1,5})?\b")
GIT_SHA_TOKEN_RE = re.compile(r"\b[0-9a-f]{7,40}\b")


def redact_url_secrets(url: str) -> tuple[str, bool]:
    """Mask sensitive query parameter values in URL display strings (#210)."""
    redacted_url, count = SECRET_QUERY_RE.subn(r"\1***REDACTED***", url)
    return redacted_url, count > 0


def extract_scrollback_tokens(raw_text: str) -> list[dict]:
    """Extract deduplicated URLs, file paths, IPv4s, and git SHAs from terminal scrollback (#210)."""
    clean = ANSI_ESCAPE_RE.sub("", raw_text or "")
    items: list[dict] = []
    seen: set[tuple[str, str]] = set()

    # Walk lines in reverse so most recent tokens appear first
    for line in reversed(clean.splitlines()):
        for m in URL_TOKEN_RE.finditer(line):
            val = m.group(0).rstrip(".,;:!?)")
            key = ("url", val)
            if key not in seen:
                seen.add(key)
                disp, is_redacted = redact_url_secrets(val)
                items.append({
                    "type": "url",
                    "value": val,
                    "display_value": disp,
                    "redacted": is_redacted,
                })

        for m in IPV4_TOKEN_RE.finditer(line):
            val = m.group(0)
            key = ("ip", val)
            if key not in seen:
                seen.add(key)
                items.append({
                    "type": "ip",
                    "value": val,
                    "display_value": val,
                    "redacted": False,
                })

        for m in PATH_TOKEN_RE.finditer(line):
            val = m.group(0).rstrip(".,;:!?)")
            if val.startswith("//") or len(val) < 4:
                continue
            key = ("path", val)
            if key not in seen:
                seen.add(key)
                items.append({
                    "type": "path",
                    "value": val,
                    "display_value": val,
                    "redacted": False,
                })

        for m in GIT_SHA_TOKEN_RE.finditer(line):
            val = m.group(0)
            # Require both digits and hex letters to avoid plain integers or English hex words
            if not (any(c.isdigit() for c in val) and any(c in "abcdef" for c in val)):
                continue
            key = ("sha", val)
            if key not in seen:
                seen.add(key)
                items.append({
                    "type": "sha",
                    "value": val,
                    "display_value": val,
                    "redacted": False,
                })

    return items[:200]


@router.get("/api/scrollback/{session_name}", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_scrollback(session_name: str, lines: int = 2000):
    try:
        clamped_lines = max(100, min(5000, int(lines)))
        result = subprocess.run(
            ["tmux", "capture-pane", "-t", session_name, "-S", f"-{clamped_lines}", "-e", "-p"],
            capture_output=True,
            text=True,
            check=True
        )
        return {
            "scrollback": result.stdout,
            "tokens": extract_scrollback_tokens(result.stdout),
            "spoken_summary": extract_spoken_summary(result.stdout, fallback=True),
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/api/scrollback/{session_name}/tokens", dependencies=[Depends(verify_token), Depends(require_admin)])
def get_scrollback_tokens(session_name: str, lines: int = 2000):
    data = get_scrollback(session_name=session_name, lines=lines)
    if "error" in data:
        return data
    return {"session": session_name, "tokens": data.get("tokens", [])}


SAFE_VOICE_NAME_RE = re.compile(r"^[a-zA-Z0-9_-]{2,80}$")
_PIPER_VOICE_CACHE: dict[tuple[str, str], object] = {}

TTS_VOICE_CATALOG = [
    {
        "id": "piper:en_GB-alan-medium",
        "engine": "piper",
        "voice": "en_GB-alan-medium",
        "label": "⚡ Offline Piper — Alan (UK J.O.S.H.U.A. / JARVIS)",
        "offline": True,
    },
    {
        "id": "piper:en_US-ryan-medium",
        "engine": "piper",
        "voice": "en_US-ryan-medium",
        "label": "⚡ Offline Piper — Ryan (US Male)",
        "offline": True,
    },
    {
        "id": "piper:en_US-lessac-medium",
        "engine": "piper",
        "voice": "en_US-lessac-medium",
        "label": "⚡ Offline Piper — Lessac (US Female)",
        "offline": True,
    },
    {
        "id": "edge:en-GB-RyanNeural",
        "engine": "edge",
        "voice": "en-GB-RyanNeural",
        "label": "☁️ Edge Neural — Ryan (UK J.O.S.H.U.A. / JARVIS)",
        "offline": False,
    },
    {
        "id": "edge:en-US-BrianNeural",
        "engine": "edge",
        "voice": "en-US-BrianNeural",
        "label": "☁️ Edge Neural — Brian (US Male)",
        "offline": False,
    },
    {
        "id": "edge:en-US-AndrewNeural",
        "engine": "edge",
        "voice": "en-US-AndrewNeural",
        "label": "☁️ Edge Neural — Andrew (US Warm Male)",
        "offline": False,
    },
    {
        "id": "edge:en-US-AvaNeural",
        "engine": "edge",
        "voice": "en-US-AvaNeural",
        "label": "☁️ Edge Neural — Ava (US Female)",
        "offline": False,
    },
    {
        "id": "browser:default",
        "engine": "browser",
        "voice": "default",
        "label": "🌐 Browser Native Speech API",
        "offline": True,
    },
]


def _get_piper_voices_dir() -> str:
    return os.environ.get(
        "AIM_PIPER_VOICES_DIR",
        os.path.join(HOME_DIR, ".local", "share", "aim-voices", "piper"),
    )


def _synthesize_piper_wav(text: str, voice_name: str, voices_dir: str = "") -> bytes:
    """Synthesize WAV audio bytes locally using offline Piper ONNX (#223)."""
    if not SAFE_VOICE_NAME_RE.match(voice_name or ""):
        raise ValueError("Invalid Piper voice identifier")
    v_dir = voices_dir or _get_piper_voices_dir()
    onnx_path = os.path.join(v_dir, f"{voice_name}.onnx")
    if not os.path.isfile(onnx_path):
        raise FileNotFoundError(f"Piper voice model not found: {voice_name}")

    cache_key = (v_dir, voice_name)
    voice_obj = _PIPER_VOICE_CACHE.get(cache_key)
    if voice_obj is None:
        from piper.voice import PiperVoice

        voice_obj = PiperVoice.load(onnx_path)
        _PIPER_VOICE_CACHE[cache_key] = voice_obj

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        voice_obj.synthesize_wav(text, wf)
    return buf.getvalue()


async def _synthesize_edge_mp3(text: str, voice_name: str) -> bytes:
    """Synthesize MP3 audio bytes using Microsoft Edge Neural TTS (#223)."""
    if not SAFE_VOICE_NAME_RE.match(voice_name or ""):
        raise ValueError("Invalid Edge TTS voice identifier")
    import edge_tts

    comm = edge_tts.Communicate(text, voice_name)
    mp3_bytes = bytearray()
    async for chunk in comm.stream():
        if chunk.get("type") == "audio":
            mp3_bytes.extend(chunk.get("data") or b"")
    if not mp3_bytes:
        raise RuntimeError("Edge TTS returned empty audio stream")
    return bytes(mp3_bytes)


class TTSRequest(BaseModel):
    text: str
    voice: str = "piper:en_GB-alan-medium"


@router.get("/api/tts/voices", dependencies=[Depends(verify_token)])
def list_tts_voices() -> dict:
    """Return available Piper (offline), Edge (cloud neural), and Browser TTS voices (#223)."""
    v_dir = _get_piper_voices_dir()
    enriched = []
    for item in TTS_VOICE_CATALOG:
        entry = dict(item)
        if item["engine"] == "piper":
            entry["installed"] = os.path.isfile(os.path.join(v_dir, f"{item['voice']}.onnx"))
        else:
            entry["installed"] = True
        enriched.append(entry)
    return {"voices": enriched}


@router.post("/api/tts", dependencies=[Depends(verify_token)])
async def synthesize_tts(req: TTSRequest) -> Response:
    """Synthesize spoken summary audio via offline Piper ONNX or Edge Neural TTS with automatic offline fallback (#223, #224)."""
    raw_text = SPOKEN_PREFIX_RE.sub("", (req.text or "").strip()).strip()
    cleaned_text = _clean_spoken_text(raw_text)[:4000]
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="Text is required for TTS synthesis.")

    spec = (req.voice or "piper:en_GB-alan-medium").strip()
    if ":" in spec:
        engine, voice_name = spec.split(":", 1)
    else:
        engine, voice_name = ("piper", spec)
    engine = engine.lower().strip()
    voice_name = voice_name.strip()

    if engine == "edge":
        try:
            mp3_bytes = await _synthesize_edge_mp3(cleaned_text, voice_name)
            return Response(
                content=mp3_bytes,
                media_type="audio/mpeg",
                headers={"X-TTS-Engine": f"edge:{voice_name}"},
            )
        except Exception as e:
            logger.warning(f"Edge TTS failed ({e}); attempting offline Piper fallback.")
            fallback_voice = "en_GB-alan-medium"
            try:
                wav_bytes = await asyncio.to_thread(_synthesize_piper_wav, cleaned_text, fallback_voice)
                return Response(
                    content=wav_bytes,
                    media_type="audio/wav",
                    headers={"X-TTS-Engine": f"piper:{fallback_voice}"},
                )
            except Exception as fb_err:
                raise HTTPException(status_code=502, detail=f"TTS synthesis failed: {fb_err}")

    if engine == "piper":
        try:
            wav_bytes = await asyncio.to_thread(_synthesize_piper_wav, cleaned_text, voice_name)
            return Response(
                content=wav_bytes,
                media_type="audio/wav",
                headers={"X-TTS-Engine": f"piper:{voice_name}"},
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Piper synthesis failed: {e}")

    raise HTTPException(status_code=400, detail=f"Unsupported backend TTS engine: {engine}")




# ----------------------------------------------------------------------------- #320 RECENT sessions
import recent_sessions as recent_store  # noqa: E402


class RecentVisitRequest(BaseModel):
    session: str


class RecentSettingsRequest(BaseModel):
    limit: int


def _recent_user_key(x_api_token: str | None) -> str:
    from main import VALID_API_TOKENS

    return recent_store.user_key_for(VALID_API_TOKENS.get(x_api_token or ""))


@router.get("/api/recent-sessions", dependencies=[Depends(verify_token)])
def get_recent_sessions(x_api_token: str = Header(None)) -> dict:
    """Most-recently-opened sessions for this account, shared across devices (#320)."""
    return recent_store.get_recent(_recent_user_key(x_api_token))


@router.post("/api/recent-sessions", dependencies=[Depends(verify_token)])
def record_recent_session(req: RecentVisitRequest, x_api_token: str = Header(None)) -> dict:
    """Move a session the Operator just opened to the top of the RECENT list (#320)."""
    name = (req.session or "").strip()
    if not SESSION_NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="Invalid session name")
    return recent_store.record_visit(_recent_user_key(x_api_token), name)


@router.put("/api/recent-sessions/settings", dependencies=[Depends(verify_token)])
def update_recent_sessions_settings(req: RecentSettingsRequest, x_api_token: str = Header(None)) -> dict:
    """Set how many recent sessions RECENT shows (clamped 3-30; history beyond it is kept) (#320)."""
    return recent_store.set_limit(_recent_user_key(x_api_token), req.limit)
