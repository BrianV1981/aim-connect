"""Clean session text for wiki/embed (Flight Recorder step)."""
from __future__ import annotations

from pathlib import Path
from typing import List

from handoff.models import Turn


def turns_to_flight_record(
    session_id: str,
    turns: List[Turn],
    *,
    source: str = "",
    mode: str = "cleaned",
) -> str:
    lines = [
        f"# Flight Recorder: {mode.upper()}",
        "",
        f"**Session ID:** `{session_id}`",
        f"**Source:** `{source}`",
        "",
    ]
    for t in turns:
        if t.role == "user":
            lines.append("## 👤 Operator")
            lines.append(f"> {t.text.strip()}")
            lines.append("")
        elif t.role == "assistant":
            lines.append("## 🤖 Agent")
            text = t.text.strip()
            if mode == "cleaned" and len(text) > 4000:
                text = text[:4000] + "\n… [truncated]"
            lines.append(text)
            lines.append("")
    return "\n".join(lines)


def write_flight_record(path: Path, content: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path
