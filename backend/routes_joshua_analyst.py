"""Native Zero-tmux Python JOSHUA Territory Analyst Engine (#268 / Option 1A).

Executes a direct JSON/SSE OpenAI-compatible tool-calling loop over each seat's
isolated `agent-<workspace_id>/` directory without spawning `tmux`, `bwrap` TUIs,
or `paste-buffer` bridges for subscriber chats.

Key security & isolation invariants:
1. Cryptographic per-email HMAC token verification (`get_gateway_signing_secret()`).
2. Strict path containment inside `AGENT_WORKSPACES_DIR/agent-<workspace_id>/`.
3. Read-only SQLite `mode=ro` + `PRAGMA query_only = ON` + C-level
   `sqlite3.set_authorizer` column allowlisting (`SAFE_MASTER_COLUMNS`).
4. Per-seat SQLite `conversations.db` for multi-thread history & 250 turns/mo metering.
5. Zero secret leakage: server/host DeepSeek or BYOK keys are never logged or echoed.
"""

from __future__ import annotations

import asyncio
import base64
import csv
import datetime as dt
import hashlib
import hmac
import html
import io
import ipaddress
import json
import logging
import os
import re
import socket
import sqlite3
import ssl
import time
import urllib.parse
import urllib.request
import uuid
import zipfile
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid, parseaddr
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape as xml_escape

import httpx
from fastapi import APIRouter, Header, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from main import AGENT_WORKSPACES_DIR, HOME_DIR
from routes_agents import _send_sandbox_relay_mime
from routes_sessions import (
    SPOKEN_PREFIX_RE,
    TTS_VOICE_CATALOG,
    _clean_spoken_text,
    _get_piper_voices_dir,
    _synthesize_edge_mp3,
    _synthesize_piper_wav,
    extract_spoken_summary,
)
from sandbox_smtp import get_gateway_signing_secret, smtp_configured, smtp_values
from ws_handler import resolve_workspace_id_for_email

router = APIRouter()
logger = logging.getLogger("aim-connect")

DEFAULT_MONTHLY_QUERY_LIMIT = 250
DEFAULT_LLM_BASE_URL = "https://api.deepseek.com"
DEFAULT_LLM_MODEL = "deepseek-flash"
MAX_TOOL_ROUNDS = 6
MAX_SQL_LIMIT = 150
EMAIL_RATE_LIMIT_PER_HOUR = 15
EMAIL_RATE_WINDOW_S = 3600
_analyst_email_timestamps: dict[str, list[float]] = {}

ALLOWED_TOKEN_PURPOSES = frozenset(
    {"ai-analyst", "mcp-access", "web-session", "ai-database"}
)

# Subscriber-safe positive column allowlist (identical to aim-mcp SAFE_MASTER_COLUMNS).
SAFE_MASTER_COLUMNS: tuple[str, ...] = (
    "business_name",
    "address",
    "mailing_address",
    "city",
    "state",
    "zip",
    "county",
    "owner_name",
    "owner_title",
    "contact_role",
    "corp_officer1_name",
    "corp_officer1_title",
    "officer1_name",
    "officer1_title",
    "officer2_name",
    "secondary_contacts",
    "contact_phone",
    "primary_phone",
    "secondary_phone",
    "phone",
    "contact_email",
    "email",
    "website_url",
    "website",
    "linkedin_url",
    "facebook_url",
    "instagram_url",
    "yelp_url",
    "anticipated_opening",
    "feed_summary",
    "news_headline",
    "news_url",
    "seats",
    "price",
    "property_type",
    "sales_angle",
    "consultant_pitch",
    "capacity_mgd",
    "expiration_date",
    "impacted_utility",
    "lead_score",
    "date_discovered",
    "last_updated_date",
)

SAFE_MASTER_COLUMNS_SET = frozenset(c.lower() for c in SAFE_MASTER_COLUMNS)
RAW_QUERY_ALLOWED_MASTER_COLUMNS = SAFE_MASTER_COLUMNS_SET | {"muted"}
SAFE_DOSSIER_COLUMNS_SET = frozenset({"date", "markdown_content"})
RAW_QUERY_ALLOWED_DOSSIER_COLUMNS = SAFE_DOSSIER_COLUMNS_SET | {"emailed"}

SAFE_WATER_ORG_COLUMNS_SET = frozenset(
    {
        "org_id",
        "org_name",
        "entity_type",
        "county",
        "city",
        "zip",
        "address",
        "official_website",
        "official_phone",
        "emergency_phone",
        "permit_count",
        "verification_status",
        "contact_count",
    }
)
SAFE_WATER_CONTACT_COLUMNS_SET = frozenset(
    {
        "org_id",
        "org_name",
        "county",
        "city",
        "contact_rank",
        "full_name",
        "role_title",
        "department",
        "email",
        "phone",
        "linkedin_url",
        "bio_summary",
        "source_url",
        "source_type",
    }
)

ALLOWED_TABLES = frozenset(
    {
        "master_leads",
        "daily_dossiers",
        "water_crm_organizations",
        "water_crm_contacts",
    }
)

_ALLOWED_SQLITE_ACTIONS = {
    sqlite3.SQLITE_SELECT,
    sqlite3.SQLITE_READ,
    sqlite3.SQLITE_FUNCTION,
}
if hasattr(sqlite3, "SQLITE_RECURSIVE"):
    _ALLOWED_SQLITE_ACTIONS.add(sqlite3.SQLITE_RECURSIVE)


# ── Auth & Workspace Helpers ───────────────────────────────────────────────


def _pad_b64(s: str) -> str:
    return s + "=" * (-len(s) % 4)


def verify_analyst_jwt(
    token: str = "",
    authorization: str | None = None,
) -> tuple[str, str]:
    """Verify HMAC-SHA256 analyst/gateway token and return (normalized_email, raw_token)."""
    raw_tok = ""
    if authorization and authorization.lower().startswith("bearer "):
        raw_tok = authorization[7:].strip()
    elif token:
        raw_tok = token.strip()

    if not raw_tok or "." not in raw_tok:
        raise HTTPException(status_code=401, detail="Missing or invalid analyst token")

    secret = get_gateway_signing_secret()
    if not secret:
        raise HTTPException(status_code=500, detail="Missing gateway signing secret")

    parts = raw_tok.split(".")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise HTTPException(status_code=401, detail="Malformed analyst token")

    body_b64, sig_b64 = parts
    expected_mac = hmac.new(
        secret.encode("utf-8"),
        body_b64.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    expected_sig = base64.urlsafe_b64encode(expected_mac).decode("ascii").rstrip("=")
    if not hmac.compare_digest(sig_b64.rstrip("="), expected_sig):
        raise HTTPException(status_code=401, detail="Invalid token signature")

    try:
        payload = json.loads(
            base64.urlsafe_b64decode(_pad_b64(body_b64)).decode("utf-8")
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token payload") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=401, detail="Invalid token payload")

    purpose = str(payload.get("p") or "").strip()
    if purpose and purpose not in ALLOWED_TOKEN_PURPOSES:
        raise HTTPException(status_code=401, detail="Invalid token purpose")

    email = str(payload.get("e") or "").strip().lower()
    exp = payload.get("exp")
    if not email or "@" not in email or exp is None:
        raise HTTPException(status_code=401, detail="Token missing email or expiry")
    if time.time() > float(exp):
        raise HTTPException(status_code=401, detail="Token expired")

    return email, raw_tok


def _resolve_seat_context(
    token: str = "",
    authorization: str | None = None,
) -> tuple[str, str, Path, str]:
    """Return (seat_email, operator_id, workspace_dir, raw_token)."""
    email, raw_tok = verify_analyst_jwt(token=token, authorization=authorization)
    wid = re.sub(r"[^a-zA-Z0-9_-]", "_", resolve_workspace_id_for_email(email))
    if not wid or ".." in wid:
        raise HTTPException(status_code=400, detail="Invalid workspace identifier")

    workspaces_root = Path(AGENT_WORKSPACES_DIR).resolve()
    ws_dir = (workspaces_root / f"agent-{wid}").resolve()
    if not ws_dir.is_relative_to(workspaces_root):
        raise HTTPException(status_code=403, detail="Workspace boundary violation")

    if not ws_dir.exists():
        # Provision minimal sovereign skeleton on-demand if directory does not exist yet
        ws_dir.mkdir(parents=True, exist_ok=True)
        (ws_dir / "shared_database").mkdir(exist_ok=True)
        (ws_dir / "memory-wiki" / "pages").mkdir(parents=True, exist_ok=True)
        (ws_dir / "exports").mkdir(exist_ok=True)

    return email, wid, ws_dir, raw_tok


def _secure_ws_path(ws_dir: Path, rel_or_abs: str) -> Path:
    root = ws_dir.resolve()
    raw = (rel_or_abs or "").strip()
    if not raw:
        raise ValueError("Empty path")
    candidate = (Path(raw) if os.path.isabs(raw) else (root / raw)).resolve()
    if candidate != root and not candidate.is_relative_to(root):
        raise PermissionError("Path traversal outside sovereign workspace blocked")
    return candidate


def _detect_workspace_pipeline(ws_dir: Path) -> str:
    env_file = ws_dir / ".env"
    if env_file.is_file():
        for ln in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            s = ln.strip()
            if s.startswith("PIPELINE_TYPE="):
                val = s.split("=", 1)[1].strip().strip("\"'").lower()
                if val in ("water", "hospitality", "commercial"):
                    return val
    agents_file = ws_dir / "AGENTS.md"
    if agents_file.is_file():
        head = agents_file.read_text(encoding="utf-8", errors="ignore")[:1200].lower()
        if "water & wastewater" in head:
            return "water"
        if "hospitality" in head:
            return "hospitality"
    return "commercial"


def _current_billing_month() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m")


def _get_monthly_limit() -> int:
    try:
        return max(1, int(os.environ.get("AIM_JOSHUA_MONTHLY_QUERY_LIMIT", str(DEFAULT_MONTHLY_QUERY_LIMIT))))
    except ValueError:
        return DEFAULT_MONTHLY_QUERY_LIMIT


# ── LLM Key Resolution (Never Logged or Returned) ──────────────────────────


def _resolve_llm_credentials(byok_key: str = "") -> tuple[str, str, str, bool]:
    """Return (api_key, base_url, default_model, is_byok). Never logs secrets."""
    base_url = (
        os.environ.get("AIM_JOSHUA_LLM_BASE_URL") or DEFAULT_LLM_BASE_URL
    ).strip().rstrip("/")
    default_model = (
        os.environ.get("AIM_JOSHUA_LLM_MODEL") or DEFAULT_LLM_MODEL
    ).strip()

    clean_byok = (byok_key or "").strip()
    if clean_byok:
        return clean_byok, base_url, default_model, True

    for env_name in ("AIM_JOSHUA_API_KEY", "DEEPSEEK_API_KEY"):
        val = (os.environ.get(env_name) or "").strip()
        if val:
            return val, base_url, default_model, False

    opencode_auth = Path(HOME_DIR) / ".local" / "share" / "opencode" / "auth.json"
    if opencode_auth.is_file():
        try:
            auth_data = json.loads(opencode_auth.read_text(encoding="utf-8"))
            if isinstance(auth_data, dict):
                ds = auth_data.get("deepseek")
                if isinstance(ds, dict) and (ds.get("key") or "").strip():
                    return str(ds["key"]).strip(), base_url, default_model, False
        except Exception:
            pass

    raise HTTPException(
        status_code=503,
        detail="J.O.S.H.U.A. LLM credentials are not configured on host.",
    )


# ── Per-Seat Conversations & Monthly Metering SQLite Store ─────────────────


def _open_conversations_db(ws_dir: Path) -> sqlite3.Connection:
    db_path = ws_dir / "conversations.db"
    conn = sqlite3.connect(str(db_path), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS threads (
            thread_id TEXT PRIMARY KEY,
            operator_id TEXT NOT NULL,
            seat_email TEXT NOT NULL,
            title TEXT NOT NULL,
            pinned INTEGER NOT NULL DEFAULT 0,
            created_at REAL NOT NULL,
            updated_at REAL NOT NULL,
            message_count INTEGER NOT NULL DEFAULT 0,
            last_preview TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_threads_seat_updated
            ON threads(operator_id, seat_email, updated_at DESC);

        CREATE TABLE IF NOT EXISTS messages (
            message_id TEXT PRIMARY KEY,
            thread_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            tool_events_json TEXT NOT NULL DEFAULT '[]',
            spoken_summary TEXT NOT NULL DEFAULT '',
            model TEXT NOT NULL DEFAULT '',
            created_at REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_messages_thread_created
            ON messages(thread_id, created_at ASC);

        CREATE TABLE IF NOT EXISTS seat_monthly_usage (
            operator_id TEXT NOT NULL,
            seat_email TEXT NOT NULL,
            billing_month TEXT NOT NULL,
            query_count INTEGER NOT NULL DEFAULT 0,
            monthly_limit INTEGER NOT NULL DEFAULT 250,
            power_pack_extra INTEGER NOT NULL DEFAULT 0,
            byok_query_count INTEGER NOT NULL DEFAULT 0,
            tokens_in INTEGER NOT NULL DEFAULT 0,
            tokens_out INTEGER NOT NULL DEFAULT 0,
            updated_at REAL NOT NULL,
            PRIMARY KEY (operator_id, seat_email, billing_month)
        );
        """
    )
    cols = {str(r[1]) for r in conn.execute("PRAGMA table_info(seat_monthly_usage)").fetchall()}
    if "power_pack_extra" not in cols:
        conn.execute("ALTER TABLE seat_monthly_usage ADD COLUMN power_pack_extra INTEGER NOT NULL DEFAULT 0")
    return conn


def get_seat_usage(ws_dir: Path, operator_id: str, seat_email: str) -> dict[str, Any]:
    month = _current_billing_month()
    base_limit = _get_monthly_limit()
    conn = _open_conversations_db(ws_dir)
    try:
        row = conn.execute(
            """
            SELECT query_count, power_pack_extra, byok_query_count, tokens_in, tokens_out
            FROM seat_monthly_usage
            WHERE operator_id = ? AND seat_email = ? AND billing_month = ?
            """,
            (operator_id, seat_email, month),
        ).fetchone()
        if not row:
            used = 0
            limit = base_limit
            byok_used = 0
        else:
            used = int(row["query_count"] or 0)
            limit = base_limit + max(0, int(row["power_pack_extra"] or 0))
            byok_used = int(row["byok_query_count"] or 0)
        return {
            "operator_id": operator_id,
            "seat_email": seat_email,
            "billing_month": month,
            "query_count": used,
            "monthly_limit": limit,
            "remaining": max(0, limit - used),
            "byok_query_count": byok_used,
        }
    finally:
        conn.close()


def reserve_or_increment_turn(
    ws_dir: Path,
    operator_id: str,
    seat_email: str,
    *,
    is_byok: bool = False,
    tokens_in: int = 0,
    tokens_out: int = 0,
    check_only: bool = False,
) -> dict[str, Any]:
    month = _current_billing_month()
    base_limit = _get_monthly_limit()
    now = time.time()
    conn = _open_conversations_db(ws_dir)
    try:
        conn.execute(
            """
            INSERT INTO seat_monthly_usage (
                operator_id, seat_email, billing_month, query_count, monthly_limit,
                power_pack_extra, byok_query_count, tokens_in, tokens_out, updated_at
            ) VALUES (?, ?, ?, 0, ?, 0, 0, 0, 0, ?)
            ON CONFLICT(operator_id, seat_email, billing_month) DO NOTHING
            """,
            (operator_id, seat_email, month, base_limit, now),
        )
        row = conn.execute(
            """
            SELECT query_count, power_pack_extra, byok_query_count
            FROM seat_monthly_usage
            WHERE operator_id = ? AND seat_email = ? AND billing_month = ?
            """,
            (operator_id, seat_email, month),
        ).fetchone()
        used = int(row["query_count"] or 0)
        limit = base_limit + max(0, int(row["power_pack_extra"] or 0))

        if not is_byok and used >= limit:
            conn.commit()
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Monthly J.O.S.H.U.A. allowance reached ({used}/{limit} queries for {month}). "
                    "Add a Power Pack (+2,000 queries/mo) or configure an optional BYOK API key in Settings."
                ),
            )

        if not check_only:
            if is_byok:
                conn.execute(
                    """
                    UPDATE seat_monthly_usage
                    SET byok_query_count = byok_query_count + 1,
                        tokens_in = tokens_in + ?,
                        tokens_out = tokens_out + ?,
                        updated_at = ?
                    WHERE operator_id = ? AND seat_email = ? AND billing_month = ?
                    """,
                    (tokens_in, tokens_out, now, operator_id, seat_email, month),
                )
            else:
                conn.execute(
                    """
                    UPDATE seat_monthly_usage
                    SET query_count = query_count + 1,
                        tokens_in = tokens_in + ?,
                        tokens_out = tokens_out + ?,
                        updated_at = ?
                    WHERE operator_id = ? AND seat_email = ? AND billing_month = ?
                    """,
                    (tokens_in, tokens_out, now, operator_id, seat_email, month),
                )
        conn.commit()
    finally:
        conn.close()
    return get_seat_usage(ws_dir, operator_id, seat_email)


# ── Read-Only SAFE_MASTER_COLUMNS SQLite Engine ────────────────────────────


def _white_label_signal_tier(raw_priority: Any) -> str:
    val = str(raw_priority or "").strip().upper()
    if not val:
        return "Verified Territory Signal"
    if val in ("AVAILABLE_PROPERTY", "WATCH_LOOPNET_ONLY"):
        return "Available Commercial Property"
    if val.startswith(("SUPER_HOT", "MULTI_HIT", "HOT_")):
        return "Priority Multi-Signal Convergence"
    if val.startswith("EXPANSION"):
        return "Verified Expansion Signal"
    if val.startswith("SINGLE_HIT") or val == "NEWS_RADAR":
        return "Verified Early-Stage Signal"
    if val.startswith(("WARM_", "WATCH")):
        return "Monitored Commercial Filing"
    return "Verified Territory Signal"


def _make_sqlite_authorizer(raw_user_query: bool):
    def _authorizer(
        action: int,
        arg1: str | None,
        arg2: str | None,
        dbname: str | None,
        source: str | None,
    ) -> int:
        if action not in _ALLOWED_SQLITE_ACTIONS:
            return sqlite3.SQLITE_DENY
        if action == sqlite3.SQLITE_FUNCTION:
            fn = (arg2 or "").lower()
            if fn in {"load_extension", "fts3_tokenizer"}:
                return sqlite3.SQLITE_DENY
            return sqlite3.SQLITE_OK
        if action == sqlite3.SQLITE_READ:
            tbl = (arg1 or "").lower()
            col = (arg2 or "").lower()
            if tbl.startswith("sqlite_") or tbl not in ALLOWED_TABLES:
                return sqlite3.SQLITE_DENY
            if raw_user_query and col:
                if tbl == "master_leads" and col not in RAW_QUERY_ALLOWED_MASTER_COLUMNS:
                    return sqlite3.SQLITE_IGNORE
                if tbl == "daily_dossiers" and col not in RAW_QUERY_ALLOWED_DOSSIER_COLUMNS:
                    return sqlite3.SQLITE_IGNORE
                if tbl == "water_crm_organizations" and col not in SAFE_WATER_ORG_COLUMNS_SET:
                    return sqlite3.SQLITE_IGNORE
                if tbl == "water_crm_contacts" and col not in SAFE_WATER_CONTACT_COLUMNS_SET:
                    return sqlite3.SQLITE_IGNORE
        return sqlite3.SQLITE_OK

    return _authorizer


def _get_table_columns(db_path: Path, table_name: str) -> set[str]:
    if table_name not in ALLOWED_TABLES or not db_path.is_file() or db_path.stat().st_size == 0:
        return set()
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
                (table_name,),
            ).fetchall()
        }
        if table_name not in tables:
            return set()
        return {
            str(row[1])
            for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        }
    finally:
        conn.close()


def _scrub_row(
    raw_row: dict[str, Any],
    *,
    raw_user_query: bool,
    table_hint: str,
    disallowed_physical_cols: set[str],
) -> dict[str, Any]:
    if table_hint == "daily_dossiers":
        return {k: v for k, v in raw_row.items() if k.lower() in SAFE_DOSSIER_COLUMNS_SET}
    if table_hint == "water_crm_organizations":
        return {k: v for k, v in raw_row.items() if k.lower() in SAFE_WATER_ORG_COLUMNS_SET}
    if table_hint == "water_crm_contacts":
        return {k: v for k, v in raw_row.items() if k.lower() in SAFE_WATER_CONTACT_COLUMNS_SET}

    if raw_user_query:
        out: dict[str, Any] = {}
        for k, v in raw_row.items():
            kl = k.lower()
            if kl in disallowed_physical_cols or kl == "muted":
                continue
            out[k] = v
        return out

    row_copy = dict(raw_row)
    raw_dbpr_seats = row_copy.pop("dbpr_seats", None)
    raw_seats = row_copy.pop("seats", None)
    raw_priority = row_copy.pop("priority_class", None)

    cleaned: dict[str, Any] = {}
    for k, v in row_copy.items():
        if k.lower() not in SAFE_MASTER_COLUMNS_SET:
            continue
        if v is None or v == "":
            continue
        cleaned[k] = v

    seating = (
        str(raw_seats).strip()
        if raw_seats not in (None, "")
        else (str(raw_dbpr_seats).strip() if raw_dbpr_seats not in (None, "") else "")
    )
    if seating:
        cleaned["seating_capacity"] = seating
    if raw_priority not in (None, ""):
        cleaned["signal_tier"] = _white_label_signal_tier(raw_priority)
    return cleaned


def execute_safe_joshua_sql(
    db_path: Path,
    query: str,
    *,
    raw_user_query: bool = True,
    params: tuple[Any, ...] = (),
    table_hint: str = "master_leads",
    max_rows: int = 100,
) -> dict[str, Any]:
    if not db_path.is_file() or db_path.stat().st_size == 0:
        return {"ok": False, "error": "Territory database (joshua.db) is not provisioned yet.", "rows": []}

    effective_query = (query or "").strip()
    if raw_user_query:
        if effective_query.endswith(";"):
            effective_query = effective_query[:-1].strip()
        if (
            not effective_query
            or ";" in effective_query
            or not re.match(r"^\s*(SELECT|WITH)\b", effective_query, re.IGNORECASE)
        ):
            return {
                "ok": False,
                "error": "Only single-statement read-only SELECT queries are permitted.",
                "rows": [],
            }
        if not re.search(r"\blimit\b", effective_query, re.IGNORECASE):
            effective_query = f"{effective_query} LIMIT {min(max_rows, MAX_SQL_LIMIT)}"

        ql = effective_query.lower()
        if "daily_dossiers" in ql and "master_leads" not in ql:
            table_hint = "daily_dossiers"
        elif "water_crm_contacts" in ql and "master_leads" not in ql:
            table_hint = "water_crm_contacts"
        elif "water_crm_organizations" in ql and "master_leads" not in ql:
            table_hint = "water_crm_organizations"

    master_cols = {c.lower() for c in _get_table_columns(db_path, "master_leads")}
    disallowed_physical_cols = master_cols - SAFE_MASTER_COLUMNS_SET

    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        try:
            if hasattr(conn, "enable_load_extension"):
                try:
                    conn.enable_load_extension(False)
                except Exception:
                    pass
            conn.execute("PRAGMA query_only = ON")
            conn.row_factory = sqlite3.Row
            conn.set_authorizer(_make_sqlite_authorizer(raw_user_query=raw_user_query))
            cur = conn.cursor()
            cur.execute(effective_query, params)
            fetched = cur.fetchmany(min(max_rows, MAX_SQL_LIMIT))
            rows = [
                _scrub_row(
                    dict(r),
                    raw_user_query=raw_user_query,
                    table_hint=table_hint,
                    disallowed_physical_cols=disallowed_physical_cols,
                )
                for r in fetched
            ]
        finally:
            conn.close()
        return {"ok": True, "rows": rows, "row_count": len(rows)}
    except Exception as exc:
        return {"ok": False, "error": f"SQL Error: {exc}", "rows": []}


# ── Pure-Stdlib OpenXML XLSX Writer ────────────────────────────────────────


def _excel_col_letter(col_idx_zero: int) -> str:
    n = col_idx_zero + 1
    letters: list[str] = []
    while n > 0:
        n, rem = divmod(n - 1, 26)
        letters.append(chr(65 + rem))
    return "".join(reversed(letters))


def write_minimal_xlsx(out_path: Path, columns: list[str], rows: list[dict[str, Any]]) -> None:
    """Write a clean, valid Excel .xlsx workbook using Python's built-in zipfile + XML."""
    sheet_rows_xml: list[str] = []

    def _cell_xml(r_idx: int, c_idx: int, val: Any) -> str:
        ref = f"{_excel_col_letter(c_idx)}{r_idx}"
        s = "" if val is None else str(val)
        # Strip XML-illegal control characters
        s = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", s)
        return f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{xml_escape(s)}</t></is></c>'

    header_cells = "".join(_cell_xml(1, i, col) for i, col in enumerate(columns))
    sheet_rows_xml.append(f'<row r="1">{header_cells}</row>')

    for row_num, row_dict in enumerate(rows, start=2):
        cells = "".join(_cell_xml(row_num, i, row_dict.get(col, "")) for i, col in enumerate(columns))
        sheet_rows_xml.append(f'<row r="{row_num}">{cells}</row>')

    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f"<sheetData>{''.join(sheet_rows_xml)}</sheetData>"
        "</worksheet>"
    )
    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="Leads" sheetId="1" r:id="rId1"/></sheets>'
        "</workbook>"
    )
    wb_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        'Target="worksheets/sheet1.xml"/>'
        "</Relationships>"
    )
    root_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="xl/workbook.xml"/>'
        "</Relationships>"
    )
    content_types_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        "</Types>"
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types_xml)
        zf.writestr("_rels/.rels", root_rels_xml)
        zf.writestr("xl/workbook.xml", workbook_xml)
        zf.writestr("xl/_rels/workbook.xml.rels", wb_rels_xml)
        zf.writestr("xl/worksheets/sheet1.xml", sheet_xml)


def _export_rows_to_workspace(
    ws_dir: Path,
    operator_id: str,
    raw_token: str,
    rows: list[dict[str, Any]],
    filename_stem: str = "joshua_leads_export",
    fmt: str = "csv",
) -> dict[str, Any]:
    clean_fmt = "xlsx" if str(fmt or "").lower().strip() == "xlsx" else "csv"
    safe_stem = re.sub(r"[^a-zA-Z0-9_-]+", "_", (filename_stem or "joshua_leads_export").strip()).strip("_")[:60]
    if not safe_stem:
        safe_stem = "joshua_leads_export"
    ts = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d_%H%M%S")
    rel_path = f"exports/{safe_stem}_{ts}.{clean_fmt}"
    full_path = _secure_ws_path(ws_dir, rel_path)
    full_path.parent.mkdir(parents=True, exist_ok=True)

    # Scrub any accidental internal column names
    allowed_export_cols = (
        SAFE_MASTER_COLUMNS_SET
        | SAFE_WATER_ORG_COLUMNS_SET
        | SAFE_WATER_CONTACT_COLUMNS_SET
        | SAFE_DOSSIER_COLUMNS_SET
        | {"seating_capacity", "signal_tier"}
    )
    cleaned_rows: list[dict[str, Any]] = []
    ordered_cols: list[str] = []
    for r in rows[:500]:
        if not isinstance(r, dict):
            continue
        cr: dict[str, Any] = {}
        for k, v in r.items():
            if k.lower() in allowed_export_cols:
                cr[k] = v
                if k not in ordered_cols:
                    ordered_cols.append(k)
        if cr:
            cleaned_rows.append(cr)

    if not ordered_cols:
        ordered_cols = ["business_name", "address", "city", "zip", "owner_name", "contact_phone", "contact_email"]

    if clean_fmt == "xlsx":
        write_minimal_xlsx(full_path, ordered_cols, cleaned_rows)
    else:
        with open(full_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=ordered_cols)
            writer.writeheader()
            for r in cleaned_rows:
                writer.writerow({c: r.get(c, "") for c in ordered_cols})

    download_path = (
        f"/download/agent-{operator_id}"
        f"?filepath={urllib.parse.quote(rel_path)}"
        f"&token={urllib.parse.quote(raw_token)}"
    )
    return {
        "filename": full_path.name,
        "relative_path": rel_path,
        "format": clean_fmt,
        "row_count": len(cleaned_rows),
        "columns": ordered_cols,
        "download_path": download_path,
        "file_uri": f"file://{rel_path}",
    }


# ── Rep Profile & Sandbox Memory Helpers ───────────────────────────────────


class RepProfilePayload(BaseModel):
    company_name: str = ""
    what_we_sell: str = ""
    target_geography: str = ""
    ideal_decision_makers: str = ""
    outreach_style: str = ""
    exclusions: str = ""


def read_rep_profile_data(ws_dir: Path) -> dict[str, str]:
    profile_json = ws_dir / "profile.json"
    profile_md = ws_dir / "profile.md"
    default_data = {
        "company_name": "",
        "what_we_sell": "",
        "target_geography": "",
        "ideal_decision_makers": "",
        "outreach_style": "",
        "exclusions": "",
        "markdown": "",
    }
    if profile_json.is_file():
        try:
            loaded = json.loads(profile_json.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                for k in default_data:
                    if k != "markdown" and isinstance(loaded.get(k), str):
                        default_data[k] = loaded[k]
        except Exception:
            pass
    if profile_md.is_file():
        default_data["markdown"] = profile_md.read_text(encoding="utf-8", errors="ignore")
    return default_data


async def _commit_workspace_memory(ws_dir: Path, paths: list[str], message: str) -> None:
    git_dir = ws_dir / ".git"
    if not git_dir.is_dir() or not paths:
        return
    env = {
        **os.environ,
        "GIT_AUTHOR_NAME": "J.O.S.H.U.A.",
        "GIT_AUTHOR_EMAIL": "joshua@localhost",
        "GIT_COMMITTER_NAME": "J.O.S.H.U.A.",
        "GIT_COMMITTER_EMAIL": "joshua@localhost",
    }
    try:
        p_add = await asyncio.create_subprocess_exec(
            "git",
            "add",
            "--",
            *paths,
            cwd=str(ws_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        await p_add.communicate()
        p_commit = await asyncio.create_subprocess_exec(
            "git",
            "commit",
            "-m",
            message[:120],
            cwd=str(ws_dir),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        await p_commit.communicate()
    except Exception:
        pass


async def save_rep_profile_data(ws_dir: Path, payload: RepProfilePayload) -> dict[str, str]:
    data = {
        "company_name": payload.company_name.strip()[:200],
        "what_we_sell": payload.what_we_sell.strip()[:1200],
        "target_geography": payload.target_geography.strip()[:600],
        "ideal_decision_makers": payload.ideal_decision_makers.strip()[:600],
        "outreach_style": payload.outreach_style.strip()[:600],
        "exclusions": payload.exclusions.strip()[:600],
    }
    md_lines = [
        "# Sales Rep & Territory Profile",
        "",
        f"- **Company / Team:** {data['company_name'] or 'Not specified'}",
        f"- **What We Sell:** {data['what_we_sell'] or 'Not specified'}",
        f"- **Target Geography (Counties / Cities / ZIPs):** {data['target_geography'] or 'All subscribed territory'}",
        f"- **Ideal Buyer Roles:** {data['ideal_decision_makers'] or 'Owner, Principal, GM, Director'}",
        f"- **Outreach Tone & Value Hook:** {data['outreach_style'] or 'Direct, consultative, Day-Zero focus'}",
        f"- **Exclusions / Skip Rules:** {data['exclusions'] or 'None specified'}",
        "",
    ]
    md_text = "\n".join(md_lines)
    (ws_dir / "profile.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    (ws_dir / "profile.md").write_text(md_text, encoding="utf-8")

    wiki_pages = ws_dir / "memory-wiki" / "pages"
    wiki_pages.mkdir(parents=True, exist_ok=True)
    (wiki_pages / "rep-profile.md").write_text(md_text, encoding="utf-8")

    await _commit_workspace_memory(
        ws_dir,
        ["profile.md", "memory-wiki/pages/rep-profile.md"],
        "Update rep profile preferences",
    )
    return {**data, "markdown": md_text}


# ── Public SSRF-Guarded Web Recon Helper ───────────────────────────────────


class _SimpleHTMLTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag.lower() in ("script", "style", "noscript", "svg"):
            self._skip += 1
        elif tag.lower() in ("p", "div", "br", "li", "tr", "h1", "h2", "h3"):
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in ("script", "style", "noscript", "svg") and self._skip > 0:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if self._skip == 0 and data.strip():
            self.parts.append(data.strip() + " ")

    def text(self) -> str:
        raw = "".join(self.parts)
        return "\n".join(
            re.sub(r"\s+", " ", ln).strip()
            for ln in raw.splitlines()
            if ln.strip()
        )


def _assert_public_url(url: str) -> str:
    parsed = urllib.parse.urlparse((url or "").strip())
    if parsed.scheme.lower() not in ("http", "https"):
        raise ValueError("Only http/https URLs are permitted.")
    host = (parsed.hostname or "").strip().rstrip(".")
    if not host or host.lower() in ("localhost", "localhost.localdomain"):
        raise ValueError("Blocked non-public hostname.")
    port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    infos = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    if not infos:
        raise ValueError("Unable to resolve hostname.")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise ValueError("Blocked non-public IP address.")
    return url


class _SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urllib.parse.urljoin(req.full_url, newurl)
        _assert_public_url(target)
        return super().redirect_request(req, fp, code, msg, headers, target)


def _run_public_web_recon_sync(query: str = "", url: str = "") -> dict[str, Any]:
    ua = "Mozilla/5.0 (X11; Linux x86_64) Chrome/126.0.0.0 Safari/537.36"
    ctx = ssl.create_default_context()
    opener = urllib.request.build_opener(_SafeRedirect(), urllib.request.HTTPSHandler(context=ctx))

    if url:
        _assert_public_url(url)
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        with opener.open(req, timeout=12) as resp:
            raw_html = resp.read(512_000).decode("utf-8", errors="replace")
        parser = _SimpleHTMLTextParser()
        parser.feed(raw_html)
        txt = parser.text()
        phones = list(
            dict.fromkeys(
                re.findall(r"(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\b\d{3})[-.\s]\d{3}[-.\s]\d{4}\b", txt)
            )
        )[:20]
        emails = [
            e
            for e in dict.fromkeys(
                re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,15}\b", txt)
            )
            if not e.lower().endswith((".png", ".jpg", ".gif", ".svg", ".webp", ".css", ".js"))
        ][:20]
        return {"url": url, "phones": phones, "emails": emails, "excerpt": txt[:4500]}

    ddg_url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": query})
    _assert_public_url(ddg_url)
    req = urllib.request.Request(ddg_url, headers={"User-Agent": ua})
    with opener.open(req, timeout=12) as resp:
        raw_html = resp.read(512_000).decode("utf-8", errors="replace")
    links = re.findall(
        r'<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        raw_html,
        flags=re.DOTALL | re.IGNORECASE,
    )
    snips = re.findall(
        r'<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>',
        raw_html,
        flags=re.DOTALL | re.IGNORECASE,
    )
    results = []
    for idx, (href, raw_title) in enumerate(links[:8]):
        clean_href = html.unescape(href)
        if "uddg=" in clean_href:
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(clean_href).query)
            if qs.get("uddg"):
                clean_href = qs["uddg"][0]
        results.append(
            {
                "title": re.sub(r"<[^>]+>", "", html.unescape(raw_title)).strip(),
                "url": clean_href,
                "snippet": re.sub(r"<[^>]+>", "", html.unescape(snips[idx])).strip()
                if idx < len(snips)
                else "",
            }
        )
    return {"query": query, "results": results}


# ── Native Tool Definitions & Dispatcher ───────────────────────────────────


JOSHUA_TOOLS_SCHEMA: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "describe_workspace_data",
            "description": "Inspect available tables, safe subscriber columns, row counts, and recent dossiers inside this subscriber's isolated territory workspace.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_leads",
            "description": "Search and filter this subscriber's territory leads in joshua.db with automatic contact prioritization and inline sortable table preview.",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "Optional business name, concept, or pitch keyword (e.g. 'pizza', 'dental', 'lift station')."},
                    "city": {"type": "string", "description": "Optional city filter (case-insensitive)."},
                    "county": {"type": "string", "description": "Optional county filter (case-insensitive)."},
                    "zip": {"type": "string", "description": "Optional 5-digit ZIP code filter."},
                    "has_phone": {"type": "boolean", "description": "When true, only return leads with a verified phone number."},
                    "has_email": {"type": "boolean", "description": "When true, only return leads with a contact email address."},
                    "min_seats": {"type": "integer", "description": "Optional minimum seating capacity for hospitality venues."},
                    "available_properties_only": {"type": "boolean", "description": "When true, return currently available commercial real estate properties."},
                    "limit": {"type": "integer", "description": "Max rows to return (1-100, default 25)."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "query_leads_sql",
            "description": "Execute a read-only SQL SELECT query against joshua.db (tables: master_leads, daily_dossiers, and water_crm_organizations/water_crm_contacts on water workspaces).",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Single-statement read-only SQL SELECT query with LIMIT."}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_daily_dossier",
            "description": "Read the latest daily briefing or curated territory dossier (todays_briefing.md, ONBOARDING_DOSSIER.md, or daily_dossiers table).",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Optional YYYY-MM-DD date or 'ONBOARDING_DOSSIER'. Leave empty for latest."}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_rep_profile",
            "description": "Read the subscriber's saved sales rep profile (what they sell, target geography, ideal buyer roles, outreach tone, and exclusions).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_rep_profile",
            "description": "Save or update the subscriber's persistent sales rep profile (profile.md + memory-wiki) when they tell you what they sell, target ZIPs/counties, or pitch rules.",
            "parameters": {
                "type": "object",
                "properties": {
                    "company_name": {"type": "string"},
                    "what_we_sell": {"type": "string"},
                    "target_geography": {"type": "string"},
                    "ideal_decision_makers": {"type": "string"},
                    "outreach_style": {"type": "string"},
                    "exclusions": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_memory_wiki",
            "description": "Search this seat's persistent memory-wiki/, HANDOFF.md, profile.md, foundry docs, and agent schema guide.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Keywords or topic to search in persistent sandbox memory."}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_memory_wiki",
            "description": "Persist territory insights, saved account lists, or session handoff notes into memory-wiki/pages/<slug>.md (and optionally HANDOFF.md).",
            "parameters": {
                "type": "object",
                "properties": {
                    "page_slug": {"type": "string", "description": "Short kebab-case slug, e.g. 'tampa-target-accounts'."},
                    "title": {"type": "string", "description": "Human-readable page title."},
                    "content": {"type": "string", "description": "Markdown content to store."},
                    "handoff_summary": {"type": "string", "description": "Optional updated tactical summary for HANDOFF.md."},
                },
                "required": ["page_slug", "title", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_recon",
            "description": "Search the public web or fetch a public business/municipal URL to verify phones, emails, and decision-maker titles.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Public web search query."},
                    "url": {"type": "string", "description": "Optional public https:// URL to fetch and extract contacts from."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "export_lead_table",
            "description": "Export a list of leads or a SQL SELECT query to a downloadable .csv or .xlsx spreadsheet inside the subscriber's workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename_stem": {"type": "string", "description": "Short descriptive filename stem, e.g. 'pinellas_hot_leads'."},
                    "format": {"type": "string", "enum": ["csv", "xlsx"], "description": "Spreadsheet format ('csv' or 'xlsx')."},
                    "sql_query": {"type": "string", "description": "Read-only SELECT query against joshua.db to populate the export."},
                    "rows": {"type": "array", "items": {"type": "object"}, "description": "Optional explicit array of row objects if not using sql_query."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "email_lead_report",
            "description": "Email a formatted Markdown + HTML lead report strictly to the authenticated subscriber's own email inbox.",
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {"type": "string", "description": "Concise email subject line."},
                    "markdown_body": {"type": "string", "description": "Markdown report body (automatically rendered to HTML + plain-text multipart)."},
                },
                "required": ["subject", "markdown_body"],
            },
        },
    },
]


def _markdown_to_email_html(md_text: str) -> str:
    escaped = html.escape(md_text or "")
    out = [
        '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #111; line-height: 1.55;">'
    ]
    in_table = False
    for raw_ln in escaped.splitlines():
        s = raw_ln.strip()
        if s.startswith("|") and s.endswith("|"):
            cells = [c.strip() for c in s.strip("|").split("|")]
            if all(re.fullmatch(r"[-:\s]+", c or "-") for c in cells):
                continue
            if not in_table:
                out.append('<table style="border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px;">')
                in_table = True
            out.append(
                "<tr>"
                + "".join(f'<td style="border: 1px solid #d1d5db; padding: 6px 8px;">{c}</td>' for c in cells)
                + "</tr>"
            )
            continue
        if in_table:
            out.append("</table>")
            in_table = False
        if s.startswith("### "):
            out.append(f"<h3>{s[4:]}</h3>")
        elif s.startswith("## "):
            out.append(f"<h2>{s[3:]}</h2>")
        elif s.startswith("# "):
            out.append(f"<h1>{s[2:]}</h1>")
        elif s.startswith("- "):
            out.append(f"<li>{s[2:]}</li>")
        elif s:
            bolded = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
            out.append(f"<p style='margin: 4px 0;'>{bolded}</p>")
    if in_table:
        out.append("</table>")
    out.append("</div>")
    return "\n".join(out)


async def dispatch_joshua_tool(
    tool_name: str,
    args: dict[str, Any],
    *,
    ws_dir: Path,
    operator_id: str,
    seat_email: str,
    raw_token: str,
) -> tuple[str, dict[str, Any]]:
    """Execute one native JOSHUA tool inside `ws_dir` and return (llm_json_str, ui_event_meta)."""
    db_path = ws_dir / "shared_database" / "joshua.db"

    if tool_name == "describe_workspace_data":
        tables_info: dict[str, Any] = {}
        if db_path.is_file() and db_path.stat().st_size > 0:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            try:
                existing_tables = [
                    r[0]
                    for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
                    if r[0] in ALLOWED_TABLES
                ]
                for tbl in existing_tables:
                    cnt = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
                    raw_cols = [str(r[1]) for r in conn.execute(f"PRAGMA table_info({tbl})").fetchall()]
                    if tbl == "master_leads":
                        safe_cols = [c for c in raw_cols if c.lower() in SAFE_MASTER_COLUMNS_SET]
                    elif tbl == "daily_dossiers":
                        safe_cols = [c for c in raw_cols if c.lower() in SAFE_DOSSIER_COLUMNS_SET]
                    elif tbl == "water_crm_organizations":
                        safe_cols = [c for c in raw_cols if c.lower() in SAFE_WATER_ORG_COLUMNS_SET]
                    else:
                        safe_cols = [c for c in raw_cols if c.lower() in SAFE_WATER_CONTACT_COLUMNS_SET]
                    tables_info[tbl] = {"row_count": cnt, "columns": safe_cols}
            finally:
                conn.close()
        dossiers_dir = ws_dir / "dossiers"
        dossier_files = (
            sorted([p.name for p in dossiers_dir.glob("*.md")], reverse=True)[:10]
            if dossiers_dir.is_dir()
            else []
        )
        out = {
            "pipeline_type": _detect_workspace_pipeline(ws_dir),
            "database_present": db_path.is_file(),
            "tables": tables_info,
            "has_todays_briefing": (ws_dir / "shared_database" / "todays_briefing.md").is_file(),
            "recent_dossier_files": dossier_files,
        }
        return json.dumps(out), {"tool": tool_name, "summary": "Inspected territory workspace schema"}

    if tool_name == "search_leads":
        existing_cols = _get_table_columns(db_path, "master_leads")
        if not existing_cols:
            msg = {"ok": False, "rows": [], "message": "No master_leads table found in joshua.db."}
            return json.dumps(msg), {"tool": tool_name, "summary": "0 leads found"}

        proj_cols = [c for c in SAFE_MASTER_COLUMNS if c in existing_cols]
        for helper in ("dbpr_seats", "priority_class"):
            if helper in existing_cols and helper not in proj_cols:
                proj_cols.append(helper)
        projection = ", ".join(proj_cols) if proj_cols else "business_name"

        where: list[str] = []
        params: list[Any] = []
        if "muted" in existing_cols:
            where.append("COALESCE(CAST(muted AS TEXT), '0') NOT IN ('1', 'true', 'TRUE')")
        if "priority_class" in existing_cols:
            where.append("COALESCE(priority_class, '') NOT LIKE 'MUTED%'")
            where.append("COALESCE(priority_class, '') NOT LIKE 'ARCHIVED_%'")

        if args.get("available_properties_only") and "priority_class" in existing_cols:
            where.append("priority_class IN ('AVAILABLE_PROPERTY', 'WATCH_LOOPNET_ONLY')")
        elif "priority_class" in existing_cols:
            where.append("COALESCE(priority_class, '') NOT IN ('AVAILABLE_PROPERTY', 'WATCH_LOOPNET_ONLY')")

        for geo_col in ("city", "county"):
            val = str(args.get(geo_col) or "").strip()
            if val and geo_col in existing_cols:
                where.append(f"UPPER({geo_col}) = UPPER(?)")
                params.append(val)

        zip_val = str(args.get("zip") or "").strip()
        if zip_val and "zip" in existing_cols:
            where.append("zip = ?")
            params.append(zip_val)

        kw = str(args.get("keyword") or "").strip()
        if kw:
            kw_cols = [
                c
                for c in ("business_name", "feed_summary", "consultant_pitch", "sales_angle", "property_type", "impacted_utility")
                if c in existing_cols
            ]
            if kw_cols:
                where.append("(" + " OR ".join(f"LOWER(COALESCE({c}, '')) LIKE ?" for c in kw_cols) + ")")
                params.extend([f"%{kw.lower()}%"] * len(kw_cols))

        if args.get("has_phone"):
            pcols = [c for c in ("contact_phone", "primary_phone", "phone") if c in existing_cols]
            if pcols:
                where.append("(" + " OR ".join(f"COALESCE(TRIM({c}), '') != ''" for c in pcols) + ")")

        if args.get("has_email"):
            ecols = [c for c in ("contact_email", "email") if c in existing_cols]
            if ecols:
                where.append("(" + " OR ".join(f"COALESCE(TRIM({c}), '') != ''" for c in ecols) + ")")

        min_seats = args.get("min_seats")
        if isinstance(min_seats, int) and min_seats > 0:
            scols = [c for c in ("seats", "dbpr_seats") if c in existing_cols]
            if scols:
                where.append("(" + " OR ".join(f"CAST(COALESCE({c}, '0') AS INTEGER) >= ?" for c in scols) + ")")
                params.extend([min_seats] * len(scols))

        try:
            limit = max(1, min(int(args.get("limit", 25)), 100))
        except (TypeError, ValueError):
            limit = 25

        order_parts: list[str] = []
        if "pf_target_acquired" in existing_cols:
            order_parts.append("pf_target_acquired DESC")
        if "lead_score" in existing_cols:
            order_parts.append("CAST(COALESCE(lead_score, '0') AS INTEGER) DESC")
        if "date_discovered" in existing_cols:
            order_parts.append("date_discovered DESC")
        order_sql = f" ORDER BY {', '.join(order_parts)}" if order_parts else ""
        where_sql = f" WHERE {' AND '.join(where)}" if where else ""
        params.append(limit)
        sql = f"SELECT {projection} FROM master_leads{where_sql}{order_sql} LIMIT ?"

        res = await asyncio.to_thread(
            execute_safe_joshua_sql,
            db_path,
            sql,
            raw_user_query=False,
            params=tuple(params),
            table_hint="master_leads",
            max_rows=limit,
        )
        rows = res.get("rows") or []
        ui_meta: dict[str, Any] = {
            "tool": tool_name,
            "summary": f"Found {len(rows)} matching territory leads",
            "row_count": len(rows),
        }
        if rows:
            cols = list(dict.fromkeys(k for r in rows for k in r.keys()))
            ui_meta["table_preview"] = {
                "title": f"Territory Search Results ({len(rows)} rows)",
                "columns": cols[:12],
                "rows": rows[:50],
            }
        return json.dumps({"ok": res.get("ok", True), "row_count": len(rows), "rows": rows[:40]}), ui_meta

    if tool_name == "query_leads_sql":
        raw_q = str(args.get("query") or "")
        res = await asyncio.to_thread(
            execute_safe_joshua_sql,
            db_path,
            raw_q,
            raw_user_query=True,
            max_rows=100,
        )
        rows = res.get("rows") or []
        ui_meta = {
            "tool": tool_name,
            "summary": (
                f"SQL returned {len(rows)} row(s)"
                if res.get("ok")
                else str(res.get("error") or "SQL query rejected")
            ),
            "row_count": len(rows),
        }
        if res.get("ok") and rows and "markdown_content" not in rows[0]:
            cols = list(dict.fromkeys(k for r in rows for k in r.keys()))
            ui_meta["table_preview"] = {
                "title": f"SQL Query Results ({len(rows)} rows)",
                "columns": cols[:12],
                "rows": rows[:50],
            }
        return json.dumps(res), ui_meta

    if tool_name == "get_daily_dossier":
        req_date = str(args.get("date") or "").strip()
        if req_date and re.fullmatch(r"[A-Za-z0-9_-]{4,32}", req_date):
            cand = ws_dir / "dossiers" / f"{req_date}.md"
            if cand.is_file():
                txt = cand.read_text(encoding="utf-8", errors="ignore")[:14000]
                return json.dumps({"date": req_date, "content": txt}), {
                    "tool": tool_name,
                    "summary": f"Loaded dossier {req_date}",
                }
        if db_path.is_file() and "daily_dossiers" in {
            t for t in ("daily_dossiers",) if _get_table_columns(db_path, t)
        }:
            if req_date:
                res = await asyncio.to_thread(
                    execute_safe_joshua_sql,
                    db_path,
                    "SELECT date, markdown_content FROM daily_dossiers WHERE date = ? LIMIT 1",
                    raw_user_query=False,
                    params=(req_date,),
                    table_hint="daily_dossiers",
                )
            else:
                res = await asyncio.to_thread(
                    execute_safe_joshua_sql,
                    db_path,
                    "SELECT date, markdown_content FROM daily_dossiers ORDER BY date DESC LIMIT 1",
                    raw_user_query=False,
                    table_hint="daily_dossiers",
                )
            rows = res.get("rows") or []
            if rows:
                d0 = rows[0]
                return json.dumps(
                    {
                        "date": d0.get("date", ""),
                        "content": str(d0.get("markdown_content") or "")[:14000],
                    }
                ), {"tool": tool_name, "summary": f"Loaded dossier {d0.get('date', 'latest')}"}

        brief = ws_dir / "shared_database" / "todays_briefing.md"
        if brief.is_file():
            return json.dumps(
                {"date": "todays_briefing", "content": brief.read_text(encoding="utf-8", errors="ignore")[:14000]}
            ), {"tool": tool_name, "summary": "Loaded todays_briefing.md"}

        return json.dumps({"ok": False, "message": "No daily dossier available yet."}), {
            "tool": tool_name,
            "summary": "No dossier found",
        }

    if tool_name == "read_rep_profile":
        prof = read_rep_profile_data(ws_dir)
        return json.dumps(prof), {"tool": tool_name, "summary": "Loaded Rep Profile"}

    if tool_name == "save_rep_profile":
        existing = read_rep_profile_data(ws_dir)
        merged = RepProfilePayload(
            company_name=str(args.get("company_name") if args.get("company_name") is not None else existing["company_name"]),
            what_we_sell=str(args.get("what_we_sell") if args.get("what_we_sell") is not None else existing["what_we_sell"]),
            target_geography=str(args.get("target_geography") if args.get("target_geography") is not None else existing["target_geography"]),
            ideal_decision_makers=str(args.get("ideal_decision_makers") if args.get("ideal_decision_makers") is not None else existing["ideal_decision_makers"]),
            outreach_style=str(args.get("outreach_style") if args.get("outreach_style") is not None else existing["outreach_style"]),
            exclusions=str(args.get("exclusions") if args.get("exclusions") is not None else existing["exclusions"]),
        )
        saved = await save_rep_profile_data(ws_dir, merged)
        return json.dumps({"ok": True, "profile": saved}), {
            "tool": tool_name,
            "summary": "Saved Rep Profile to workspace memory",
        }

    if tool_name == "search_memory_wiki":
        q = str(args.get("query") or "").strip().lower()
        terms = [t for t in re.split(r"\W+", q) if len(t) >= 2]
        candidates: list[Path] = []
        for p in (
            ws_dir / "profile.md",
            ws_dir / "HANDOFF.md",
            ws_dir / "memory-wiki" / "index.md",
            ws_dir / "memory-wiki" / "log.md",
            ws_dir / "joshua_os" / "joshua_os_docs" / "agent-guide.md",
        ):
            if p.is_file():
                candidates.append(p)
        pages_dir = ws_dir / "memory-wiki" / "pages"
        if pages_dir.is_dir():
            candidates.extend(sorted(pages_dir.glob("*.md")))
        foundry_dir = ws_dir / "joshua_os" / "foundry"
        if foundry_dir.is_dir():
            candidates.extend(sorted(foundry_dir.glob("*.md"))[:10])

        scored: list[tuple[int, str, str]] = []
        for fpath in candidates:
            txt = fpath.read_text(encoding="utf-8", errors="ignore")
            low = txt.lower()
            score = sum(low.count(t) for t in terms) if terms else 1
            if score > 0 or fpath.name in ("profile.md", "index.md"):
                rel = str(fpath.relative_to(ws_dir))
                scored.append((score, rel, txt[:2500]))
        scored.sort(key=lambda x: x[0], reverse=True)
        matches = [{"path": rel, "score": sc, "excerpt": ex} for sc, rel, ex in scored[:6]]
        return json.dumps({"query": q, "matches": matches}), {
            "tool": tool_name,
            "summary": f"Searched memory-wiki ({len(matches)} note(s) matched)",
        }

    if tool_name == "update_memory_wiki":
        raw_slug = str(args.get("page_slug") or "territory-notes").strip().lower()
        safe_slug = re.sub(r"[^a-z0-9_-]+", "-", raw_slug).strip("-")[:60] or "territory-notes"
        title = str(args.get("title") or safe_slug).strip()[:140]
        content = str(args.get("content") or "").strip()[:15000]
        handoff_summary = str(args.get("handoff_summary") or "").strip()[:4000]

        wiki_root = ws_dir / "memory-wiki"
        pages_dir = wiki_root / "pages"
        pages_dir.mkdir(parents=True, exist_ok=True)
        page_file = _secure_ws_path(ws_dir, f"memory-wiki/pages/{safe_slug}.md")
        body = content if content.startswith("#") else f"# {title}\n\n{content}\n"
        page_file.write_text(body, encoding="utf-8")

        index_file = wiki_root / "index.md"
        link_rel = f"pages/{safe_slug}.md"
        if index_file.is_file():
            idx_txt = index_file.read_text(encoding="utf-8", errors="ignore")
            if link_rel not in idx_txt:
                idx_txt = idx_txt.rstrip() + f"\n- [{title}]({link_rel})\n"
                index_file.write_text(idx_txt, encoding="utf-8")
        else:
            index_file.write_text(f"# Sandbox Memory Wiki\n\n- [{title}]({link_rel})\n", encoding="utf-8")

        log_file = wiki_root / "log.md"
        stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        with open(log_file, "a", encoding="utf-8") as lf:
            lf.write(f"\n## [{stamp}] wiki | {title} (`{link_rel}`)\n")

        touched = [f"memory-wiki/pages/{safe_slug}.md", "memory-wiki/index.md", "memory-wiki/log.md"]
        if handoff_summary:
            handoff_file = ws_dir / "HANDOFF.md"
            handoff_file.write_text(
                f"# J.O.S.H.U.A. — Sandbox Session Handoff\n\n> **Updated:** {stamp}\n> **Operator:** `{seat_email}` (`{operator_id}`)\n\n{handoff_summary}\n",
                encoding="utf-8",
            )
            touched.append("HANDOFF.md")

        await _commit_workspace_memory(ws_dir, touched, f"Update memory-wiki: {safe_slug}")
        return json.dumps({"ok": True, "path": f"memory-wiki/pages/{safe_slug}.md"}), {
            "tool": tool_name,
            "summary": f"Saved note to memory-wiki/pages/{safe_slug}.md",
        }

    if tool_name == "web_recon":
        q = str(args.get("query") or "").strip()
        u = str(args.get("url") or "").strip()
        try:
            res = await asyncio.to_thread(_run_public_web_recon_sync, q, u)
            return json.dumps({"ok": True, **res}), {
                "tool": tool_name,
                "summary": f"Web recon: {u or q}"[:80],
            }
        except Exception as exc:
            return json.dumps({"ok": False, "error": str(exc)}), {
                "tool": tool_name,
                "summary": f"Web recon blocked/failed: {exc}"[:80],
            }

    if tool_name == "export_lead_table":
        stem = str(args.get("filename_stem") or "joshua_leads_export")
        fmt = str(args.get("format") or "csv")
        sql_query = str(args.get("sql_query") or "").strip()
        rows_in = args.get("rows") if isinstance(args.get("rows"), list) else []
        if sql_query:
            sql_res = await asyncio.to_thread(
                execute_safe_joshua_sql,
                db_path,
                sql_query,
                raw_user_query=True,
                max_rows=300,
            )
            if not sql_res.get("ok"):
                return json.dumps(sql_res), {"tool": tool_name, "summary": "Export SQL failed"}
            rows_in = sql_res.get("rows") or []

        export_meta = await asyncio.to_thread(
            _export_rows_to_workspace,
            ws_dir,
            operator_id,
            raw_token,
            rows_in,
            stem,
            fmt,
        )
        ui_meta = {
            "tool": tool_name,
            "summary": f"Exported {export_meta['row_count']} rows to {export_meta['filename']}",
            "export_file": export_meta,
        }
        if rows_in:
            ui_meta["table_preview"] = {
                "title": export_meta["filename"],
                "columns": export_meta["columns"][:12],
                "rows": rows_in[:50],
            }
        return json.dumps({"ok": True, **export_meta}), ui_meta

    if tool_name == "email_lead_report":
        subject = re.sub(r"[\r\n]+", " ", str(args.get("subject") or "J.O.S.H.U.A. Territory Lead Report")).strip()[:250]
        md_body = str(args.get("markdown_body") or "").strip()
        if not md_body:
            return json.dumps({"ok": False, "error": "markdown_body cannot be empty"}), {
                "tool": tool_name,
                "summary": "Email skipped (empty body)",
            }

        now = time.time()
        recent = [ts for ts in _analyst_email_timestamps.get(seat_email, []) if ts > now - EMAIL_RATE_WINDOW_S]
        if len(recent) >= EMAIL_RATE_LIMIT_PER_HOUR:
            return json.dumps({"ok": False, "error": "Hourly email rate limit (15/hr) reached."}), {
                "tool": tool_name,
                "summary": "Email rate limit reached",
            }
        recent.append(now)
        _analyst_email_timestamps[seat_email] = recent

        if not smtp_configured():
            return json.dumps({"ok": False, "error": "Host SMTP relay is not configured."}), {
                "tool": tool_name,
                "summary": "SMTP not configured",
            }

        smtp_cfg = smtp_values()
        from_addr = (smtp_cfg.get("LEADDEED_MAIL_FROM") or smtp_cfg["LEADDEED_SMTP_USER"]).strip()
        parsed_from = parseaddr(from_addr)[1] or smtp_cfg["LEADDEED_SMTP_USER"]
        msg_domain = parsed_from.rsplit("@", 1)[-1].strip() if "@" in parsed_from else None

        msg = MIMEMultipart("alternative")
        msg.attach(MIMEText(md_body, "plain", "utf-8"))
        msg.attach(MIMEText(_markdown_to_email_html(md_body), "html", "utf-8"))
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = seat_email
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain=msg_domain)

        try:
            await asyncio.to_thread(_send_sandbox_relay_mime, msg, seat_email, smtp_cfg)
            return json.dumps({"ok": True, "to": seat_email, "subject": subject}), {
                "tool": tool_name,
                "summary": f"Emailed report to {seat_email}",
            }
        except Exception as exc:
            logger.error("JOSHUA email_lead_report failed for %s: %s", seat_email, exc)
            return json.dumps({"ok": False, "error": "SMTP delivery failed"}), {
                "tool": tool_name,
                "summary": "SMTP delivery failed",
            }

    return json.dumps({"ok": False, "error": f"Unknown tool: {tool_name}"}), {
        "tool": tool_name,
        "summary": f"Unknown tool {tool_name}",
    }


# ── System Prompt Builder ──────────────────────────────────────────────────


def _build_joshua_system_prompt(ws_dir: Path, seat_email: str, operator_id: str) -> str:
    pipeline_type = _detect_workspace_pipeline(ws_dir)
    agents_md_path = ws_dir / "AGENTS.md"
    if agents_md_path.is_file():
        persona = agents_md_path.read_text(encoding="utf-8", errors="ignore")[:7000]
    else:
        persona = (
            f"# J.O.S.H.U.A. ({pipeline_type.title()} Territory Analyst)\n"
            f"You are J.O.S.H.U.A., the sovereign territory intelligence analyst for {seat_email}."
        )

    prof = read_rep_profile_data(ws_dir)
    prof_md = (prof.get("markdown") or "").strip()

    wiki_idx = ws_dir / "memory-wiki" / "index.md"
    wiki_excerpt = wiki_idx.read_text(encoding="utf-8", errors="ignore")[:1800] if wiki_idx.is_file() else ""

    return (
        f"{persona}\n\n"
        "## NATIVE ENGINE EXECUTION RULES (OPTION 1A)\n"
        f"- Authenticated Subscriber Email: `{seat_email}` (Workspace ID: `{operator_id}`, Edition: `{pipeline_type}`).\n"
        "- Use your native function-calling tools (`search_leads`, `query_leads_sql`, `get_daily_dossier`, `describe_workspace_data`, `read_rep_profile`, `save_rep_profile`, `search_memory_wiki`, `update_memory_wiki`, `web_recon`, `export_lead_table`, `email_lead_report`) directly instead of writing shell commands.\n"
        "- Never expose internal pipeline architecture, scraper names, or raw internal column names; present clean business names, addresses, decision-makers, phones, emails, capacities/seats, and tailored outreach angles.\n"
        "- Whenever the user tells you what they sell, their company name, target counties/ZIPs, or pitch rules, call `save_rep_profile` (and `update_memory_wiki` for detailed notes) so you remember across every future session.\n"
        "- Always end your final response with a plain conversational English `🔊 <1-2 sentence spoken summary>` line (no markdown symbols, file paths, or code inside the `🔊` line).\n"
        + (f"\n## SAVED REP PROFILE\n{prof_md}\n" if prof_md else "")
        + (f"\n## SANDBOX MEMORY WIKI INDEX\n{wiki_excerpt}\n" if wiki_excerpt else "")
    )


def _ensure_spoken_summary_block(content: str) -> tuple[str, str]:
    extracted = extract_spoken_summary(content, fallback=False)
    if extracted:
        return content, extracted
    # Generate a clean 1-sentence plain-English fallback summary
    plain_lines = [
        re.sub(r"[#*`|_~\[\]\(\)>-]+", " ", ln).strip()
        for ln in (content or "").splitlines()
        if ln.strip() and not ln.strip().startswith("|")
    ]
    first_sentence = plain_lines[0][:200].strip() if plain_lines else "Your territory analysis is ready."
    if not first_sentence.endswith((".", "!", "?")):
        first_sentence += "."
    appended = (content or "").rstrip() + f"\n\n🔊 {first_sentence}"
    return appended, first_sentence


# ── LLM Tool-Calling Loop (JSON + Streaming SSE) ───────────────────────────


async def _call_openai_chat(
    client: httpx.AsyncClient,
    *,
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "stream": False,
    }
    if tools:
        body["tools"] = tools
        body["tool_choice"] = "auto"

    resp = await client.post(
        f"{base_url}/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=75.0,
    )
    if resp.status_code >= 400:
        logger.warning("JOSHUA LLM upstream returned HTTP %s", resp.status_code)
        raise HTTPException(
            status_code=502,
            detail=f"Upstream LLM returned HTTP {resp.status_code}.",
        )
    return resp.json()


# ── API Request Schemas & Routes ───────────────────────────────────────────


class CreateThreadRequest(BaseModel):
    title: str = "New Territory Chat"


class PatchThreadRequest(BaseModel):
    title: str | None = None
    pinned: bool | None = None


class ExportTableRequest(BaseModel):
    filename_stem: str = "joshua_leads_export"
    format: str = "csv"
    rows: list[dict[str, Any]] = Field(default_factory=list)
    sql_query: str = ""


class ChatTurnRequest(BaseModel):
    message: str
    thread_id: str = ""
    stream: bool = True
    model: str = ""
    byok_api_key: str = ""


class AnalystTTSRequest(BaseModel):
    text: str
    voice: str = "piper:en_GB-alan-medium"


def _list_threads_for_seat(
    ws_dir: Path,
    operator_id: str,
    seat_email: str,
    search_q: str = "",
) -> list[dict[str, Any]]:
    conn = _open_conversations_db(ws_dir)
    try:
        q = (search_q or "").strip().lower()
        if q:
            rows = conn.execute(
                """
                SELECT DISTINCT t.thread_id, t.title, t.pinned, t.created_at, t.updated_at,
                       t.message_count, t.last_preview
                FROM threads t
                LEFT JOIN messages m ON m.thread_id = t.thread_id
                WHERE t.operator_id = ? AND t.seat_email = ?
                  AND (LOWER(t.title) LIKE ? OR LOWER(COALESCE(m.content, '')) LIKE ?)
                ORDER BY t.pinned DESC, t.updated_at DESC
                LIMIT 60
                """,
                (operator_id, seat_email, f"%{q}%", f"%{q}%"),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT thread_id, title, pinned, created_at, updated_at, message_count, last_preview
                FROM threads
                WHERE operator_id = ? AND seat_email = ?
                ORDER BY pinned DESC, updated_at DESC
                LIMIT 60
                """,
                (operator_id, seat_email),
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/api/joshua/bootstrap")
async def joshua_bootstrap(
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """<50ms zero-tmux subscriber bootstrap returning workspace edition, quota, profile & threads."""
    seat_email, operator_id, ws_dir, _ = _resolve_seat_context(token=token, authorization=authorization)
    pipeline_type = _detect_workspace_pipeline(ws_dir)
    usage = get_seat_usage(ws_dir, operator_id, seat_email)
    profile = read_rep_profile_data(ws_dir)
    threads = _list_threads_for_seat(ws_dir, operator_id, seat_email)
    db_file = ws_dir / "shared_database" / "joshua.db"
    return {
        "ready": True,
        "engine": "aim-ld-joshua-native-v2",
        "operator_id": operator_id,
        "seat_email": seat_email,
        "pipeline_type": pipeline_type,
        "database_ready": db_file.is_file() and db_file.stat().st_size > 0,
        "default_model": DEFAULT_LLM_MODEL,
        "usage": usage,
        "profile": profile,
        "threads": threads,
    }


@router.get("/api/joshua/threads")
async def list_joshua_threads(
    q: str = Query(""),
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    seat_email, operator_id, ws_dir, _ = _resolve_seat_context(token=token, authorization=authorization)
    return {"threads": _list_threads_for_seat(ws_dir, operator_id, seat_email, search_q=q)}


@router.post("/api/joshua/threads")
async def create_joshua_thread(
    req: CreateThreadRequest,
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    seat_email, operator_id, ws_dir, _ = _resolve_seat_context(token=token, authorization=authorization)
    tid = "thr_" + uuid.uuid4().hex[:16]
    now = time.time()
    title = (req.title or "New Territory Chat").strip()[:120] or "New Territory Chat"
    conn = _open_conversations_db(ws_dir)
    try:
        conn.execute(
            """
            INSERT INTO threads (thread_id, operator_id, seat_email, title, pinned, created_at, updated_at, message_count, last_preview)
            VALUES (?, ?, ?, ?, 0, ?, ?, 0, '')
            """,
            (tid, operator_id, seat_email, title, now, now),
        )
        conn.commit()
    finally:
        conn.close()
    return {
        "thread": {
            "thread_id": tid,
            "title": title,
            "pinned": 0,
            "created_at": now,
            "updated_at": now,
            "message_count": 0,
            "last_preview": "",
        }
    }


@router.get("/api/joshua/threads/{thread_id}")
async def get_joshua_thread(
    thread_id: str,
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    seat_email, operator_id, ws_dir, _ = _resolve_seat_context(token=token, authorization=authorization)
    conn = _open_conversations_db(ws_dir)
    try:
        t_row = conn.execute(
            "SELECT * FROM threads WHERE thread_id = ? AND operator_id = ? AND seat_email = ?",
            (thread_id, operator_id, seat_email),
        ).fetchone()
        if not t_row:
            raise HTTPException(status_code=404, detail="Thread not found")
        m_rows = conn.execute(
            """
            SELECT message_id, role, content, tool_events_json, spoken_summary, model, created_at
            FROM messages
            WHERE thread_id = ?
            ORDER BY created_at ASC
            """,
            (thread_id,),
        ).fetchall()
        messages = []
        for mr in m_rows:
            d = dict(mr)
            try:
                d["tool_events"] = json.loads(d.pop("tool_events_json", "[]"))
            except Exception:
                d["tool_events"] = []
            messages.append(d)
        return {"thread": dict(t_row), "messages": messages}
    finally:
        conn.close()


@router.patch("/api/joshua/threads/{thread_id}")
async def patch_joshua_thread(
    thread_id: str,
    req: PatchThreadRequest,
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    seat_email, operator_id, ws_dir, _ = _resolve_seat_context(token=token, authorization=authorization)
    conn = _open_conversations_db(ws_dir)
    try:
        t_row = conn.execute(
            "SELECT * FROM threads WHERE thread_id = ? AND operator_id = ? AND seat_email = ?",
            (thread_id, operator_id, seat_email),
        ).fetchone()
        if not t_row:
            raise HTTPException(status_code=404, detail="Thread not found")
        new_title = (
            req.title.strip()[:120]
            if req.title is not None and req.title.strip()
            else t_row["title"]
        )
        new_pinned = int(bool(req.pinned)) if req.pinned is not None else int(t_row["pinned"])
        conn.execute(
            "UPDATE threads SET title = ?, pinned = ?, updated_at = ? WHERE thread_id = ?",
            (new_title, new_pinned, time.time(), thread_id),
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM threads WHERE thread_id = ?", (thread_id,)).fetchone()
        return {"thread": dict(updated)}
    finally:
        conn.close()


@router.delete("/api/joshua/threads/{thread_id}")
async def delete_joshua_thread(
    thread_id: str,
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    seat_email, operator_id, ws_dir, _ = _resolve_seat_context(token=token, authorization=authorization)
    conn = _open_conversations_db(ws_dir)
    try:
        cur = conn.execute(
            "DELETE FROM threads WHERE thread_id = ? AND operator_id = ? AND seat_email = ?",
            (thread_id, operator_id, seat_email),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Thread not found")
        conn.execute("DELETE FROM messages WHERE thread_id = ?", (thread_id,))
        conn.commit()
        return {"deleted": True, "thread_id": thread_id}
    finally:
        conn.close()


@router.get("/api/joshua/profile")
async def get_joshua_profile(
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    _, _, ws_dir, _ = _resolve_seat_context(token=token, authorization=authorization)
    return {"profile": read_rep_profile_data(ws_dir)}


@router.put("/api/joshua/profile")
async def put_joshua_profile(
    req: RepProfilePayload,
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    _, _, ws_dir, _ = _resolve_seat_context(token=token, authorization=authorization)
    saved = await save_rep_profile_data(ws_dir, req)
    return {"ok": True, "profile": saved}


@router.post("/api/joshua/export")
async def export_joshua_table_endpoint(
    req: ExportTableRequest,
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """Zero-turn-cost 1-click CSV / XLSX table export from inline chat table previews."""
    _, operator_id, ws_dir, raw_token = _resolve_seat_context(token=token, authorization=authorization)
    rows = req.rows
    if req.sql_query.strip():
        db_path = ws_dir / "shared_database" / "joshua.db"
        sql_res = await asyncio.to_thread(
            execute_safe_joshua_sql,
            db_path,
            req.sql_query.strip(),
            raw_user_query=True,
            max_rows=300,
        )
        if not sql_res.get("ok"):
            raise HTTPException(status_code=400, detail=sql_res.get("error") or "Invalid SQL export query")
        rows = sql_res.get("rows") or []

    meta = await asyncio.to_thread(
        _export_rows_to_workspace,
        ws_dir,
        operator_id,
        raw_token,
        rows,
        req.filename_stem,
        req.format,
    )
    return {"ok": True, "export_file": meta}


@router.get("/api/joshua/tts/voices")
async def list_joshua_tts_voices(
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    _resolve_seat_context(token=token, authorization=authorization)
    v_dir = _get_piper_voices_dir()
    voices = []
    for item in TTS_VOICE_CATALOG:
        entry = dict(item)
        if item["engine"] == "piper":
            entry["installed"] = os.path.isfile(os.path.join(v_dir, f"{item['voice']}.onnx"))
        else:
            entry["installed"] = True
        voices.append(entry)
    return {"voices": voices}


@router.post("/api/joshua/tts")
async def synthesize_joshua_tts(
    req: AnalystTTSRequest,
    token: str = Query(""),
    authorization: str | None = Header(default=None),
) -> Response:
    """Subscriber JWT-authenticated Neural TTS (Piper offline ONNX + Edge Neural fallback)."""
    _resolve_seat_context(token=token, authorization=authorization)
    raw_text = SPOKEN_PREFIX_RE.sub("", (req.text or "").strip()).strip()
    cleaned_text = _clean_spoken_text(raw_text)[:3000]
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="Text is required for TTS synthesis.")

    spec = (req.voice or "piper:en_GB-alan-medium").strip()
    engine, voice_name = spec.split(":", 1) if ":" in spec else ("piper", spec)
    engine = engine.lower().strip()
    voice_name = voice_name.strip()

    if engine == "edge":
        try:
            mp3_bytes = await _synthesize_edge_mp3(cleaned_text, voice_name)
            return Response(
                content=mp3_bytes,
                media_type="audio/mpeg",
                headers={"X-TTS-Engine": f"edge:{voice_name}"},
            )
        except Exception:
            wav_bytes = await asyncio.to_thread(_synthesize_piper_wav, cleaned_text, "en_GB-alan-medium")
            return Response(
                content=wav_bytes,
                media_type="audio/wav",
                headers={"X-TTS-Engine": "piper:en_GB-alan-medium"},
            )

    if engine == "piper":
        wav_bytes = await asyncio.to_thread(_synthesize_piper_wav, cleaned_text, voice_name)
        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={"X-TTS-Engine": f"piper:{voice_name}"},
        )

    raise HTTPException(status_code=400, detail="Unsupported TTS voice engine")


def _sse_pack(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, separators=(',', ':'))}\n\n"


@router.post("/api/joshua/chat")
async def joshua_chat_turn(
    req: ChatTurnRequest,
    token: str = Query(""),
    authorization: str | None = Header(default=None),
    x_joshua_byok_key: str | None = Header(default=None),
):
    """Execute a native zero-tmux JOSHUA analyst turn (SSE streaming or JSON)."""
    seat_email, operator_id, ws_dir, raw_token = _resolve_seat_context(token=token, authorization=authorization)
    user_text = (req.message or "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(user_text) > 12_000:
        raise HTTPException(status_code=400, detail="Message exceeds 12,000 character limit")

    if user_text == "/handoff":
        user_text = (
            "Please summarize our current session takeaways, update memory-wiki/ and HANDOFF.md "
            "using update_memory_wiki, and confirm what was saved."
        )

    supplied_byok = (x_joshua_byok_key or req.byok_api_key or "").strip()
    api_key, base_url, default_model, is_byok = _resolve_llm_credentials(byok_key=supplied_byok)
    active_model = default_model
    if req.model and req.model in ("deepseek-flash", "deepseek-chat", "deepseek-v4-pro"):
        if req.model == "deepseek-v4-pro" and not is_byok:
            active_model = default_model
        else:
            active_model = req.model

    # Pre-check monthly quota before starting turn (raises 429 cleanly if 250/250 reached without BYOK)
    reserve_or_increment_turn(
        ws_dir,
        operator_id,
        seat_email,
        is_byok=is_byok,
        check_only=True,
    )

    # Resolve or create thread & load prior history
    now = time.time()
    auto_title = re.sub(r"\s+", " ", user_text).strip()[:64]
    conn = _open_conversations_db(ws_dir)
    try:
        tid = (req.thread_id or "").strip()
        is_new_thread = False
        if tid:
            existing_t = conn.execute(
                "SELECT * FROM threads WHERE thread_id = ? AND operator_id = ? AND seat_email = ?",
                (tid, operator_id, seat_email),
            ).fetchone()
            if not existing_t:
                raise HTTPException(status_code=404, detail="Thread not found")
            thread_title = existing_t["title"]
            if thread_title == "New Territory Chat" and existing_t["message_count"] == 0:
                thread_title = auto_title
                conn.execute("UPDATE threads SET title = ? WHERE thread_id = ?", (thread_title, tid))
        else:
            tid = "thr_" + uuid.uuid4().hex[:16]
            thread_title = auto_title
            is_new_thread = True
            conn.execute(
                """
                INSERT INTO threads (thread_id, operator_id, seat_email, title, pinned, created_at, updated_at, message_count, last_preview)
                VALUES (?, ?, ?, ?, 0, ?, ?, 0, '')
                """,
                (tid, operator_id, seat_email, thread_title, now, now),
            )

        prior_rows = conn.execute(
            """
            SELECT role, content FROM messages
            WHERE thread_id = ?
            ORDER BY created_at DESC
            LIMIT 16
            """,
            (tid,),
        ).fetchall()
        prior_history = [
            {"role": "assistant" if r["role"] == "assistant" else "user", "content": r["content"]}
            for r in reversed(prior_rows)
            if r["role"] in ("user", "assistant")
        ]

        user_msg_id = "msg_" + uuid.uuid4().hex[:16]
        conn.execute(
            """
            INSERT INTO messages (message_id, thread_id, role, content, tool_events_json, spoken_summary, model, created_at)
            VALUES (?, ?, 'user', ?, '[]', '', '', ?)
            """,
            (user_msg_id, tid, user_text, now),
        )
        conn.execute(
            """
            UPDATE threads
            SET updated_at = ?, message_count = message_count + 1, last_preview = ?
            WHERE thread_id = ?
            """,
            (now, user_text[:140], tid),
        )
        conn.commit()
    finally:
        conn.close()

    system_prompt = _build_joshua_system_prompt(ws_dir, seat_email, operator_id)
    llm_messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        *prior_history,
        {"role": "user", "content": user_text},
    ]

    async def _execute_agent_loop_events():
        tool_events: list[dict[str, Any]] = []
        tokens_in = 0
        tokens_out = 0
        final_text = ""

        yield ("thread", {"thread_id": tid, "title": thread_title, "is_new": is_new_thread})

        async with httpx.AsyncClient() as client:
            for round_idx in range(MAX_TOOL_ROUNDS):
                yield ("status", {"step": round_idx + 1, "message": "Analyzing territory intelligence..."})
                completion = await _call_openai_chat(
                    client,
                    base_url=base_url,
                    api_key=api_key,
                    model=active_model,
                    messages=llm_messages,
                    tools=JOSHUA_TOOLS_SCHEMA,
                )
                usage_block = completion.get("usage") or {}
                tokens_in += int(usage_block.get("prompt_tokens") or 0)
                tokens_out += int(usage_block.get("completion_tokens") or 0)

                choices = completion.get("choices") or []
                if not choices:
                    break
                msg_obj = choices[0].get("message") or {}
                tool_calls = msg_obj.get("tool_calls") or []

                if not tool_calls:
                    final_text = str(msg_obj.get("content") or "").strip()
                    break

                llm_messages.append(
                    {
                        "role": "assistant",
                        "content": msg_obj.get("content") or "",
                        "tool_calls": tool_calls,
                    }
                )

                for tc in tool_calls:
                    tc_id = str(tc.get("id") or f"call_{uuid.uuid4().hex[:8]}")
                    fn = tc.get("function") or {}
                    t_name = str(fn.get("name") or "")
                    raw_args = fn.get("arguments") or "{}"
                    try:
                        parsed_args = json.loads(raw_args) if isinstance(raw_args, str) else dict(raw_args)
                    except Exception:
                        parsed_args = {}

                    yield ("tool_call", {"id": tc_id, "name": t_name})
                    tool_json, ui_meta = await dispatch_joshua_tool(
                        t_name,
                        parsed_args,
                        ws_dir=ws_dir,
                        operator_id=operator_id,
                        seat_email=seat_email,
                        raw_token=raw_token,
                    )
                    ui_meta["id"] = tc_id
                    tool_events.append(ui_meta)
                    yield ("tool_result", ui_meta)
                    llm_messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc_id,
                            "content": tool_json,
                        }
                    )
            else:
                # Final synthesis call without tools if MAX_TOOL_ROUNDS was reached
                completion = await _call_openai_chat(
                    client,
                    base_url=base_url,
                    api_key=api_key,
                    model=active_model,
                    messages=llm_messages,
                    tools=None,
                )
                choices = completion.get("choices") or []
                if choices:
                    final_text = str((choices[0].get("message") or {}).get("content") or "").strip()

        final_text, spoken = _ensure_spoken_summary_block(final_text)

        # Stream chunks cleanly for responsive progressive UI rendering
        chunk_size = 96
        for i in range(0, len(final_text), chunk_size):
            yield ("delta", {"text": final_text[i : i + chunk_size]})

        updated_usage = reserve_or_increment_turn(
            ws_dir,
            operator_id,
            seat_email,
            is_byok=is_byok,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            check_only=False,
        )

        asst_msg_id = "msg_" + uuid.uuid4().hex[:16]
        done_ts = time.time()
        conn2 = _open_conversations_db(ws_dir)
        try:
            conn2.execute(
                """
                INSERT INTO messages (message_id, thread_id, role, content, tool_events_json, spoken_summary, model, created_at)
                VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)
                """,
                (
                    asst_msg_id,
                    tid,
                    final_text,
                    json.dumps(tool_events),
                    spoken,
                    active_model,
                    done_ts,
                ),
            )
            conn2.execute(
                """
                UPDATE threads
                SET updated_at = ?, message_count = message_count + 1, last_preview = ?
                WHERE thread_id = ?
                """,
                (done_ts, spoken[:160], tid),
            )
            conn2.commit()
        finally:
            conn2.close()

        yield (
            "done",
            {
                "message_id": asst_msg_id,
                "thread_id": tid,
                "title": thread_title,
                "content": final_text,
                "spoken_summary": spoken,
                "tool_events": tool_events,
                "model": active_model,
                "usage": updated_usage,
            },
        )

    if not req.stream:
        done_payload: dict[str, Any] = {}
        async for ev_type, ev_data in _execute_agent_loop_events():
            if ev_type == "done":
                done_payload = ev_data
        return done_payload

    async def _sse_generator():
        try:
            async for ev_type, ev_data in _execute_agent_loop_events():
                yield _sse_pack(ev_type, ev_data)
        except HTTPException as http_exc:
            yield _sse_pack(
                "error",
                {"status_code": http_exc.status_code, "message": str(http_exc.detail)},
            )
        except Exception as exc:
            logger.error("Unhandled JOSHUA stream error for %s: %s", operator_id, exc)
            yield _sse_pack(
                "error",
                {"status_code": 500, "message": "J.O.S.H.U.A. encountered an unexpected error."},
            )

    return StreamingResponse(
        _sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )
