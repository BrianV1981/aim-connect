"""Fixture adapter — staged session history under a temp/fixture root."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, List, Optional

from handoff.models import TranscriptRef, Turn


class FixtureAdapter:
    """Reads staged Grok-like updates.jsonl trees:

    <root>/<session_id>/updates.jsonl
    optional meta.json: {"cwd": "/path/to/project"}
    """

    name = "fixture"

    def __init__(self, root: Path):
        self.root = Path(root)

    def resolve(self, session_id: Optional[str], cwd: Path) -> TranscriptRef:
        if not session_id:
            sessions = self.list_sessions(cwd)
            if not sessions:
                raise FileNotFoundError(f"no fixture sessions under {self.root}")
            return sessions[0]
        path = self.root / session_id / "updates.jsonl"
        if not path.is_file():
            raise FileNotFoundError(f"fixture session missing: {path}")
        meta_cwd = self._meta_cwd(session_id) or str(cwd)
        return TranscriptRef(
            session_id=session_id,
            path=path,
            host=self.name,
            cwd=meta_cwd,
        )

    def _meta_cwd(self, session_id: str) -> Optional[str]:
        meta = self.root / session_id / "meta.json"
        if meta.is_file():
            try:
                data = json.loads(meta.read_text(encoding="utf-8"))
                return data.get("cwd")
            except json.JSONDecodeError:
                return None
        return None

    def iter_turns(self, ref: TranscriptRef) -> Iterable[Turn]:
        # Grok updates format
        for line in ref.path.read_text(encoding="utf-8", errors="replace").splitlines():
            if not line.strip():
                continue
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            params = msg.get("params") or {}
            update = params.get("update") or {}
            kind = update.get("sessionUpdate") or ""
            content = update.get("content")
            text = _flatten(content)
            if kind == "user_message_chunk" and text.strip():
                yield Turn(role="user", text=text.strip(), timestamp=str(msg.get("timestamp", "")))
            elif kind == "agent_message_chunk" and text.strip():
                yield Turn(
                    role="assistant",
                    text=text.strip(),
                    timestamp=str(msg.get("timestamp", "")),
                )

    def list_sessions(
        self, cwd: Optional[Path] = None, since_mtime: float = 0.0
    ) -> List[TranscriptRef]:
        out: List[TranscriptRef] = []
        if not self.root.is_dir():
            return out
        for child in sorted(self.root.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if not child.is_dir():
                continue
            path = child / "updates.jsonl"
            if not path.is_file():
                continue
            try:
                mtime = path.stat().st_mtime
            except OSError:
                continue
            if mtime < since_mtime:
                continue
            sid = child.name
            meta_cwd = self._meta_cwd(sid)
            if cwd is not None:
                if not meta_cwd:
                    continue
                try:
                    if Path(meta_cwd).resolve() != Path(cwd).resolve():
                        continue
                except OSError:
                    continue
            out.append(
                TranscriptRef(
                    session_id=sid,
                    path=path,
                    host=self.name,
                    cwd=meta_cwd or (str(cwd) if cwd else None),
                )
            )
        return out


def _flatten(content) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        if content.get("type") == "text":
            return str(content.get("text") or "")
        return str(content.get("text") or content.get("message") or "")
    if isinstance(content, list):
        return "".join(_flatten(x) for x in content)
    return str(content)
