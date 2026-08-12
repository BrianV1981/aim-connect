from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import List, Tuple

from handoff.models import Turn


REQUIRED_SECTIONS = (
    "Commander Summary",
    "Now",
    "Do Next",
    "Do Not Forget",
    "Evidence",
    "Self-check",
)


def build_packet(
    *,
    session_id: str,
    vessel: str,
    turns: List[Turn],
    source_path: str,
    archive_path: str = "",
    wiki_page: str = "",
    marker: str | None = None,
) -> Tuple[str, str]:
    """Return (markdown, marker_used)."""
    users = [t for t in turns if t.role == "user" and t.text.strip()]
    assistants = [t for t in turns if t.role == "assistant" and t.text.strip()]
    turn_count = len(users) + len(assistants)

    # marker: explicit test token or hash of last user texts
    if not marker:
        blob = "\n".join(u.text for u in users[-5:])
        marker = hashlib.sha256(blob.encode("utf-8", errors="replace")).hexdigest()[:16]

    do_not_forget = _extract_keep(users)
    do_next = _extract_next(users, assistants)
    summary = _summary(users)
    now_bits = _now_bits(users, assistants)

    generated = datetime.now(timezone.utc).isoformat()
    md = f"""# Continuity Packet
Schema-Version: 1
Session-Id: {session_id}
Vessel: {vessel}
Generated: {generated}
Turn-Count: {turn_count}

## Commander Summary
{summary}

## Now
{now_bits}

## Do Next
{do_next}

## Do Not Forget
{do_not_forget}

## Evidence
- source_path: {source_path}
- archive_path: {archive_path or "(none)"}
- wiki_page: {wiki_page or "(nightly)"}
- marker: {marker}

## Self-check
- marker: {marker}
- turn_count: {turn_count}
- status: ok
"""
    return md, marker


def validate_packet(md: str) -> List[str]:
    errors: List[str] = []
    if "Schema-Version: 1" not in md:
        errors.append("missing Schema-Version: 1")
    for sec in REQUIRED_SECTIONS:
        if f"## {sec}" not in md:
            errors.append(f"missing section: {sec}")
    # non-empty self-check marker
    m = re.search(r"(?m)^- marker:\s*(\S+)\s*$", md)
    if not m or not m.group(1).strip():
        errors.append("empty self-check marker")
    tc = re.search(r"(?m)^Turn-Count:\s*(\d+)\s*$", md)
    if not tc or int(tc.group(1)) < 1:
        errors.append("Turn-Count < 1")
    return errors


def _summary(users: List[Turn]) -> str:
    if not users:
        return "(no user turns)"
    first = users[0].text.strip().replace("\n", " ")
    last = users[-1].text.strip().replace("\n", " ")
    if len(first) > 400:
        first = first[:400] + "…"
    if len(last) > 400:
        last = last[:400] + "…"
    if first == last:
        return first
    return f"Start: {first}\n\nLatest: {last}"


def _now_bits(users: List[Turn], assistants: List[Turn]) -> str:
    lines = [
        f"- User turns: {len(users)}",
        f"- Assistant turns: {len(assistants)}",
    ]
    if users:
        tail = users[-1].text.strip().splitlines()[0][:200]
        lines.append(f"- Last user: {tail}")
    return "\n".join(lines)


def _extract_keep(users: List[Turn]) -> str:
    bullets: List[str] = []
    pat = re.compile(
        r"(?i)^(MUST|DO NOT|DON'T|MANDATE|OPERATOR:|\[\[KEEP\]\])\b.*"
    )
    for u in users:
        for line in u.text.splitlines():
            s = line.strip()
            if not s:
                continue
            if pat.match(s) or "[[KEEP]]" in s:
                bullets.append(f"- {s[:500]}")
    if not bullets:
        # last 3 user snippets as soft keep
        for u in users[-3:]:
            snip = u.text.strip().replace("\n", " ")
            if len(snip) > 240:
                snip = snip[:240] + "…"
            bullets.append(f"- {snip}")
    # dedupe preserve order
    seen = set()
    out = []
    for b in bullets:
        if b not in seen:
            seen.add(b)
            out.append(b)
    return "\n".join(out[:40]) if out else "- (none extracted)"


def _extract_next(users: List[Turn], assistants: List[Turn]) -> str:
    items: List[str] = []
    if users:
        last = users[-1].text.strip()
        first_line = last.splitlines()[0][:300]
        items.append(f"1. Address last Operator ask: {first_line}")
    todo_pat = re.compile(r"(?i)\b(TODO|NEXT|Do next|Follow-?up)\b[:\s-]*(.+)")
    for a in assistants[-5:]:
        for line in a.text.splitlines():
            m = todo_pat.search(line)
            if m:
                items.append(f"{len(items)+1}. {m.group(0).strip()[:300]}")
    if len(items) < 2:
        items.append(f"{len(items)+1}. Re-read continuity/CURRENT.md and AGENTS.md")
    if len(items) < 3:
        items.append(f"{len(items)+1}. Continue active goal without inventing a new pipeline")
    return "\n".join(items[:8])
