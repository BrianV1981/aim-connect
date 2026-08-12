"""Deterministic embed + LanceDB (or JSONL fallback) store for cleaned FR chunks."""
from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple


def chunk_text(text: str, max_chars: int = 1200) -> List[str]:
    parts: List[str] = []
    buf: List[str] = []
    size = 0
    for para in re.split(r"\n{2,}", text):
        p = para.strip()
        if not p:
            continue
        if size + len(p) > max_chars and buf:
            parts.append("\n\n".join(buf))
            buf = [p]
            size = len(p)
        else:
            buf.append(p)
            size += len(p)
    if buf:
        parts.append("\n\n".join(buf))
    return parts or [text[:max_chars]]


def hash_embed(text: str, dim: int = 64) -> List[float]:
    """Offline-stable pseudo-embedding (no API). Good enough for E2E + recall tests."""
    vec = [0.0] * dim
    tokens = re.findall(r"[a-z0-9_]+", text.lower())
    if not tokens:
        return vec
    for tok in tokens:
        h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
        vec[h % dim] += 1.0
        vec[(h >> 8) % dim] += 0.5
    # L2 normalize
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def store_chunks(
    *,
    db_dir: Path,
    session_id: str,
    project_root: str,
    chunks: List[str],
    table: str = "fr_chunks",
) -> Dict[str, Any]:
    db_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for i, ch in enumerate(chunks):
        rows.append(
            {
                "id": f"{session_id}:{i}",
                "session_id": session_id,
                "project_root": project_root,
                "chunk_index": i,
                "text": ch,
                "vector": hash_embed(ch),
            }
        )

    # Always write JSONL audit trail
    jsonl_path = db_dir / f"{session_id}.jsonl"
    with jsonl_path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps({k: v for k, v in r.items() if k != "vector"}) + "\n")

    lance_ok = False
    lance_error = None
    try:
        import lancedb  # type: ignore

        db = lancedb.connect(str(db_dir / "lancedb"))
        # drop prior rows for session by rewrite-simple table merge
        data = [
            {
                "id": r["id"],
                "session_id": r["session_id"],
                "project_root": r["project_root"],
                "chunk_index": r["chunk_index"],
                "text": r["text"],
                "vector": r["vector"],
            }
            for r in rows
        ]
        names = set()
        try:
            names = set(db.list_tables())  # type: ignore[attr-defined]
        except Exception:
            try:
                names = set(db.table_names())
            except Exception:
                names = set()
        if table in names:
            tbl = db.open_table(table)
            # delete existing for session if API supports
            try:
                tbl.delete(f"session_id = '{session_id}'")
            except Exception:
                pass
            tbl.add(data)
        else:
            db.create_table(table, data)
        lance_ok = True
    except Exception as e:
        lance_error = str(e)

    return {
        "chunk_count": len(rows),
        "jsonl_path": str(jsonl_path),
        "lance_ok": lance_ok,
        "lance_error": lance_error,
        "ids": [r["id"] for r in rows],
    }
