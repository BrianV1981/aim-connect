from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, List, Optional
from urllib.parse import quote

from handoff.models import TranscriptRef, Turn


class GrokAdapter:
    name = "grok"

    def __init__(self, sessions_root: Optional[Path] = None):
        self.sessions_root = Path(
            sessions_root or (Path.home() / ".grok" / "sessions")
        )

    def _encoded_cwd(self, cwd: Path) -> Path:
        # Grok uses URL-encoded absolute path as directory name
        enc = quote(str(cwd.resolve()), safe="")
        return self.sessions_root / enc

    def resolve(self, session_id: Optional[str], cwd: Path) -> TranscriptRef:
        base = self._encoded_cwd(cwd)
        if session_id:
            path = base / session_id / "updates.jsonl"
            if not path.is_file():
                # scan all encoded dirs for this id
                for updates in self.sessions_root.glob(f"*/{session_id}/updates.jsonl"):
                    path = updates
                    break
                else:
                    raise FileNotFoundError(
                        f"Grok session not found: {session_id} under {self.sessions_root}"
                    )
            return TranscriptRef(
                session_id=session_id,
                path=path,
                host=self.name,
                cwd=str(cwd.resolve()),
            )
        # latest under this cwd
        if not base.is_dir():
            raise FileNotFoundError(f"No Grok sessions for cwd {cwd} ({base})")
        candidates = sorted(
            base.glob("*/updates.jsonl"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not candidates:
            raise FileNotFoundError(f"No updates.jsonl under {base}")
        path = candidates[0]
        sid = path.parent.name
        return TranscriptRef(
            session_id=sid, path=path, host=self.name, cwd=str(cwd.resolve())
        )

    def iter_turns(self, ref: TranscriptRef) -> Iterable[Turn]:
        with ref.path.open("r", encoding="utf-8", errors="replace") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    msg = json.loads(line)
                except json.JSONDecodeError:
                    continue
                params = msg.get("params") or {}
                update = params.get("update") or {}
                kind = update.get("sessionUpdate") or ""
                text = _flatten(update.get("content"))
                if kind == "user_message_chunk" and text.strip():
                    yield Turn(
                        role="user",
                        text=text.strip(),
                        timestamp=str(msg.get("timestamp", "")),
                    )
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
        roots = []
        if cwd:
            roots.append(self._encoded_cwd(cwd))
        else:
            if self.sessions_root.is_dir():
                roots.extend([p for p in self.sessions_root.iterdir() if p.is_dir()])
        for base in roots:
            if not base.is_dir():
                continue
            # decode cwd from dir name best-effort
            from urllib.parse import unquote

            try:
                decoded = unquote(base.name)
            except Exception:
                decoded = str(cwd) if cwd else None
            for updates in base.glob("*/updates.jsonl"):
                try:
                    mtime = updates.stat().st_mtime
                except OSError:
                    continue
                if mtime < since_mtime:
                    continue
                out.append(
                    TranscriptRef(
                        session_id=updates.parent.name,
                        path=updates,
                        host=self.name,
                        cwd=decoded if decoded and decoded.startswith("/") else (
                            str(cwd) if cwd else decoded
                        ),
                    )
                )
        out.sort(key=lambda r: r.path.stat().st_mtime, reverse=True)
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
