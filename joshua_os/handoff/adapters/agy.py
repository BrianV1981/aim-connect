from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Iterable, List, Optional

from handoff.models import TranscriptRef, Turn


class AgyAdapter:
    name = "agy"

    def __init__(self, brain_root: Optional[Path] = None):
        self.brain_root = Path(
            brain_root or (Path.home() / ".gemini" / "antigravity-cli" / "brain")
        )

    def resolve(self, session_id: Optional[str], cwd: Path) -> TranscriptRef:
        if session_id:
            path = self.brain_root / session_id / ".system_generated" / "logs" / "transcript.jsonl"
            if not path.is_file():
                raise FileNotFoundError(
                    f"AGY session not found: {session_id} under {self.brain_root}"
                )
            return TranscriptRef(
                session_id=session_id,
                path=path,
                host=self.name,
                cwd=str(cwd.resolve()),
            )
        
        # If no session_id is provided, find the most recently modified transcript.jsonl
        if not self.brain_root.is_dir():
            raise FileNotFoundError(f"No AGY brain root found at {self.brain_root}")
        
        candidates = sorted(
            self.brain_root.glob("*/.system_generated/logs/transcript.jsonl"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not candidates:
            raise FileNotFoundError(f"No transcript.jsonl found under {self.brain_root}")
        
        path = candidates[0]
        # path is brain/<session_id>/.system_generated/logs/transcript.jsonl
        sid = path.parent.parent.parent.name
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
                
                source = msg.get("source")
                msg_type = msg.get("type")
                
                if source == "USER_EXPLICIT" and msg_type == "USER_INPUT":
                    text = msg.get("content", "")
                    if text and text.strip():
                        yield Turn(
                            role="user",
                            text=text.strip(),
                            timestamp=msg.get("created_at", ""),
                        )
                elif source == "MODEL" and msg_type == "PLANNER_RESPONSE":
                    text = msg.get("content", "")
                    if text and text.strip():
                        yield Turn(
                            role="assistant",
                            text=text.strip(),
                            timestamp=msg.get("created_at", ""),
                        )

    def list_sessions(
        self, cwd: Optional[Path] = None, since_mtime: float = 0.0
    ) -> List[TranscriptRef]:
        out: List[TranscriptRef] = []
        if not self.brain_root.is_dir():
            return out
            
        for updates in self.brain_root.glob("*/.system_generated/logs/transcript.jsonl"):
            try:
                mtime = updates.stat().st_mtime
            except OSError:
                continue
            if mtime < since_mtime:
                continue
                
            sid = updates.parent.parent.parent.name
            out.append(
                TranscriptRef(
                    session_id=sid,
                    path=updates,
                    host=self.name,
                    cwd=str(cwd) if cwd else None,
                )
            )
            
        out.sort(key=lambda r: r.path.stat().st_mtime, reverse=True)
        return out
