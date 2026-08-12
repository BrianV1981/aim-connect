from __future__ import annotations

from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class Turn:
    role: str  # user | assistant | system
    text: str
    timestamp: str = ""


@dataclass
class TranscriptRef:
    session_id: str
    path: Path
    host: str
    cwd: Optional[str] = None
    meta: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["path"] = str(self.path)
        return d


@dataclass
class JobResult:
    schema_version: int = 1
    system: str = ""  # handoff | wiki_batch | blackbox_cron
    status: str = "error"  # ok | empty | partial | error
    code: str = "ERROR"
    session_id: Optional[str] = None
    vessel: str = ""
    turn_count: int = 0
    paths: Dict[str, str] = field(default_factory=dict)
    gates: Dict[str, bool] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    extras: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
