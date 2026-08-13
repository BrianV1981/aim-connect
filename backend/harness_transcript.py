"""Harness transcript extractors for live WS egress.

AGY writes PLANNER_RESPONSE lines to brain/**/transcript.jsonl.
Grok writes type=assistant lines to grok_data/sessions/**/chat_history.jsonl.
OpenCode writes assistant part.type=text rows to opencode_data/opencode.db (WAL).

All three often emit a short \"I'll check…\" turn (tools / tool-calls) and then
a second assistant turn with the real answer — no user message in between.
Callers must keep watching and deliver every visible assistant text.
"""

from __future__ import annotations

import json
import re
import sqlite3
from typing import Any, Optional

_USER_QUERY = re.compile(r"</?user_query>")
_SYSTEM_REMINDER = re.compile(r"<system-reminder>.*?</system-reminder>", re.DOTALL)


def _flatten_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text") or "")
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts)
    return ""


def _clean_user_visible(text: str) -> str:
    text = _USER_QUERY.sub("", text)
    text = _SYSTEM_REMINDER.sub("", text)
    return text.strip()


def extract_agy_planner_text(record: dict) -> Optional[str]:
    """Visible AGY / admin-cli planner text, or None."""
    if record.get("source") != "MODEL" or record.get("type") != "PLANNER_RESPONSE":
        return None
    text = _clean_user_visible(_flatten_content(record.get("content")))
    return text or None


def extract_grok_assistant_text(record: dict) -> Optional[str]:
    """Visible Grok assistant text, or None.

    Sends the \"I'll check…\" preview *and* the later real answer.
    Skips system/user/reasoning/tool_result and tool-only empty turns.
    """
    role = record.get("type") or record.get("role")
    if role not in ("assistant", "model"):
        return None
    if record.get("synthetic_reason") == "system_reminder":
        return None
    text = _clean_user_visible(_flatten_content(record.get("content")))
    return text or None


def extract_opencode_assistant_text(message: dict, part: dict) -> Optional[str]:
    """Visible OpenCode assistant text part, or None.

    OpenCode stores role on the message and type/text on the part.
    step-start / step-finish / tool / patch are not user-visible.
    """
    if message.get("role") != "assistant":
        return None
    if part.get("type") != "text":
        return None
    return _clean_user_visible(part.get("text") or "") or None


def opencode_max_part_ts(db_path: str) -> int:
    """Seed cursor so a new WS does not replay History. WAL-safe mode=ro."""
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        row = conn.execute("SELECT COALESCE(MAX(time_created), 0) FROM part").fetchone()
        return int(row[0] or 0)
    finally:
        conn.close()


def iter_new_opencode_assistant_texts(db_path: str, after_ts: int) -> list[tuple[int, str]]:
    """Assistant text parts newer than *after_ts*. Never uses nolock=1."""
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        rows = conn.execute(
            """
            SELECT p.time_created, m.data, p.data
            FROM part p
            JOIN message m ON m.id = p.message_id
            WHERE p.time_created > ?
            ORDER BY p.time_created ASC
            """,
            (after_ts,),
        ).fetchall()
    finally:
        conn.close()

    out: list[tuple[int, str]] = []
    for ts, mdata, pdata in rows:
        try:
            text = extract_opencode_assistant_text(json.loads(mdata), json.loads(pdata))
        except (TypeError, json.JSONDecodeError):
            continue
        if text:
            out.append((int(ts), text))
    return out


def extract_live_agent_text(record: dict) -> Optional[str]:
    """Harness-agnostic JSONL: AGY planner or Grok assistant."""
    return extract_agy_planner_text(record) or extract_grok_assistant_text(record)
