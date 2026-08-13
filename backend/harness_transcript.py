"""Harness transcript extractors for live WS egress.

AGY writes PLANNER_RESPONSE lines to brain/**/transcript.jsonl.
Grok writes type=assistant lines to grok_data/sessions/**/chat_history.jsonl.

Both CLIs often emit a short \"I'll check…\" turn (sometimes with tool_calls)
and then a second assistant turn with the real answer — no user message in
between. Callers must keep watching and deliver every visible assistant text.
"""

from __future__ import annotations

import re
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


def extract_live_agent_text(record: dict) -> Optional[str]:
    """Harness-agnostic: AGY planner or Grok assistant."""
    return extract_agy_planner_text(record) or extract_grok_assistant_text(record)
