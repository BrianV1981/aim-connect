from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Optional, Protocol

from handoff.models import TranscriptRef, Turn


class HostAdapter(Protocol):
    name: str

    def resolve(
        self, session_id: Optional[str], cwd: Path
    ) -> TranscriptRef: ...

    def iter_turns(self, ref: TranscriptRef) -> Iterable[Turn]: ...

    def list_sessions(
        self, cwd: Optional[Path] = None, since_mtime: float = 0.0
    ) -> List[TranscriptRef]: ...
