"""Generic Supabase PostgREST client for subscriber-isolated support tickets."""
from __future__ import annotations

import datetime as dt
import os
import re
from typing import Any

import httpx

VALID_CATEGORIES = frozenset(
    {"bug", "feature_request", "enhancement", "data_request", "question"}
)
MAX_TICKETS_PER_HOUR = 10
MAX_COMMENTS_PER_HOUR = 30
_STRIP_INTERNAL_KEYS = frozenset(
    {
        "github_issue_number",
        "github_comment_id",
        "sync_status",
        "status_sync_pending",
        "github_synced_at",
        "github_updated_at",
    }
)


def _supabase_config() -> tuple[str, str]:
    url = (
        os.environ.get("SUPABASE_URL")
        or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        or ""
    ).strip().rstrip("/")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SECRET_KEY")
        or ""
    ).strip()
    if not url or not key:
        raise RuntimeError("Ticketing service is not configured on this server.")
    return url, key


def _headers(key: str, prefer: str = "") -> dict[str, str]:
    h = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _scrub_text(raw: Any) -> str:
    return re.sub(r"https?://github\.com/[^\s)]+", "[internal reference]", str(raw or ""), flags=re.I)


def _sanitize_ticket(row: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in row.items() if k not in _STRIP_INTERNAL_KEYS}
    if "description" in out:
        out["description"] = _scrub_text(out["description"])
    return out


def _sanitize_comment(row: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in row.items() if k not in _STRIP_INTERNAL_KEYS}
    if str(out.get("author_role") or "").lower() == "support":
        out["author_email"] = "support"
    if "body" in out:
        out["body"] = _scrub_text(out["body"])
    return out


async def _rest_request(
    method: str,
    path: str,
    *,
    params: dict[str, str] | None = None,
    json_body: dict[str, Any] | None = None,
    prefer: str = "",
    client: httpx.AsyncClient | None = None,
) -> httpx.Response:
    base_url, key = _supabase_config()
    url = f"{base_url}/rest/v1/{path.lstrip('/')}"
    headers = _headers(key, prefer=prefer)
    if client is not None:
        return await client.request(method, url, params=params, json=json_body, headers=headers, timeout=15.0)
    async with httpx.AsyncClient(timeout=15.0) as owned:
        return await owned.request(method, url, params=params, json=json_body, headers=headers)


def _one_hour_ago_iso() -> str:
    return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1)).isoformat()


async def list_tickets(
    email: str,
    *,
    status: str = "OPEN",
    limit: int = 25,
    client: httpx.AsyncClient | None = None,
) -> list[dict[str, Any]]:
    clean_email = email.strip().lower()
    st = (status or "OPEN").strip().upper()
    lim = max(1, min(int(limit or 25), 50))
    params: dict[str, str] = {
        "select": "id,ticket_number,submitter_email,operator_id,category,module_context,source,title,description,status,email_subscribed,created_at,updated_at,edited_at,closed_at",
        "submitter_email": f"ilike.{clean_email}",
        "order": "updated_at.desc,ticket_number.desc",
        "limit": str(lim),
    }
    if st in ("OPEN", "CLOSED"):
        params["status"] = f"eq.{st}"
    resp = await _rest_request("GET", "client_tickets", params=params, client=client)
    resp.raise_for_status()
    return [_sanitize_ticket(r) for r in resp.json()]


async def get_ticket_thread(
    email: str,
    ticket_number: int,
    *,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any] | None:
    clean_email = email.strip().lower()
    resp = await _rest_request(
        "GET",
        "client_tickets",
        params={
            "select": "id,ticket_number,submitter_email,operator_id,category,module_context,source,title,description,status,email_subscribed,created_at,updated_at,edited_at,closed_at",
            "ticket_number": f"eq.{int(ticket_number)}",
            "submitter_email": f"ilike.{clean_email}",
            "limit": "1",
        },
        client=client,
    )
    resp.raise_for_status()
    rows = resp.json()
    if not rows:
        return None
    ticket = _sanitize_ticket(rows[0])
    c_resp = await _rest_request(
        "GET",
        "client_ticket_comments",
        params={
            "select": "id,ticket_id,author_email,author_role,source,body,created_at,updated_at,edited_at",
            "ticket_id": f"eq.{ticket['id']}",
            "order": "created_at.asc",
        },
        client=client,
    )
    c_resp.raise_for_status()
    comments = [_sanitize_comment(c) for c in c_resp.json()]
    return {"ticket": ticket, "comments": comments}


async def create_ticket(
    email: str,
    *,
    operator_id: str,
    category: str,
    title: str,
    description: str,
    module_context: str = "general",
    source: str = "joshua_analyst",
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    clean_email = email.strip().lower()
    cat = category.strip().lower() if category.strip().lower() in VALID_CATEGORIES else "question"
    clean_title = (title or "").strip()[:255]
    clean_desc = (description or "").strip()[:15000]
    clean_ctx = (module_context or "general").strip()[:100] or "general"
    if not clean_title or not clean_desc:
        raise ValueError("Both 'title' and 'description' are required.")

    rate_resp = await _rest_request(
        "GET",
        "client_tickets",
        params={
            "select": "id",
            "submitter_email": f"ilike.{clean_email}",
            "created_at": f"gt.{_one_hour_ago_iso()}",
        },
        client=client,
    )
    rate_resp.raise_for_status()
    if len(rate_resp.json()) >= MAX_TICKETS_PER_HOUR:
        raise RuntimeError(f"Hourly ticket rate limit ({MAX_TICKETS_PER_HOUR}/hr) reached.")

    ins = await _rest_request(
        "POST",
        "client_tickets",
        json_body={
            "submitter_email": clean_email,
            "operator_id": operator_id,
            "category": cat,
            "module_context": clean_ctx,
            "source": source,
            "title": clean_title,
            "description": clean_desc,
            "status": "OPEN",
            "email_subscribed": False,
            "sync_status": "PENDING_CREATE",
        },
        prefer="return=representation",
        client=client,
    )
    ins.raise_for_status()
    created = ins.json()
    return _sanitize_ticket(created[0] if isinstance(created, list) else created)


async def reply_ticket(
    email: str,
    *,
    ticket_number: int,
    body: str,
    source: str = "joshua_analyst",
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    clean_email = email.strip().lower()
    clean_body = (body or "").strip()[:15000]
    if not clean_body:
        raise ValueError("Comment body cannot be empty.")

    thread = await get_ticket_thread(clean_email, ticket_number, client=client)
    if not thread:
        raise LookupError(f"Ticket #{ticket_number} not found for your account.")
    ticket_id = thread["ticket"]["id"]

    rate_resp = await _rest_request(
        "GET",
        "client_ticket_comments",
        params={
            "select": "id",
            "author_email": f"ilike.{clean_email}",
            "created_at": f"gt.{_one_hour_ago_iso()}",
        },
        client=client,
    )
    rate_resp.raise_for_status()
    if len(rate_resp.json()) >= MAX_COMMENTS_PER_HOUR:
        raise RuntimeError(f"Hourly comment rate limit ({MAX_COMMENTS_PER_HOUR}/hr) reached.")

    ins = await _rest_request(
        "POST",
        "client_ticket_comments",
        json_body={
            "ticket_id": ticket_id,
            "author_email": clean_email,
            "author_role": "client",
            "source": source,
            "body": clean_body,
            "sync_status": "PENDING_CREATE",
        },
        prefer="return=representation",
        client=client,
    )
    ins.raise_for_status()
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
    await _rest_request(
        "PATCH",
        "client_tickets",
        params={"id": f"eq.{ticket_id}"},
        json_body={"updated_at": now_iso},
        client=client,
    )
    created = ins.json()
    return _sanitize_comment(created[0] if isinstance(created, list) else created)


async def edit_ticket_comment(
    email: str,
    *,
    comment_id: str,
    body: str,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    clean_email = email.strip().lower()
    clean_body = (body or "").strip()[:15000]
    cid = (comment_id or "").strip()
    if not cid or not clean_body:
        raise ValueError("Both 'comment_id' and 'body' are required.")

    c_resp = await _rest_request(
        "GET",
        "client_ticket_comments",
        params={
            "select": "id,ticket_id,author_email,github_comment_id",
            "id": f"eq.{cid}",
            "author_email": f"ilike.{clean_email}",
            "limit": "1",
        },
        client=client,
    )
    c_resp.raise_for_status()
    rows = c_resp.json()
    if not rows:
        raise LookupError("Comment not found or owned by another seat.")
    comment_row = rows[0]

    t_resp = await _rest_request(
        "GET",
        "client_tickets",
        params={
            "select": "id",
            "id": f"eq.{comment_row['ticket_id']}",
            "submitter_email": f"ilike.{clean_email}",
            "limit": "1",
        },
        client=client,
    )
    t_resp.raise_for_status()
    if not t_resp.json():
        raise LookupError("Parent ticket not found for your account.")

    now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
    next_sync = "PENDING_EDIT" if comment_row.get("github_comment_id") else "PENDING_CREATE"
    upd = await _rest_request(
        "PATCH",
        "client_ticket_comments",
        params={"id": f"eq.{cid}"},
        json_body={
            "body": clean_body,
            "edited_at": now_iso,
            "updated_at": now_iso,
            "sync_status": next_sync,
        },
        prefer="return=representation",
        client=client,
    )
    upd.raise_for_status()
    updated = upd.json()
    return _sanitize_comment(updated[0] if isinstance(updated, list) else updated)


async def close_ticket(
    email: str,
    *,
    ticket_number: int,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    clean_email = email.strip().lower()
    resp = await _rest_request(
        "GET",
        "client_tickets",
        params={
            "select": "id,github_issue_number",
            "ticket_number": f"eq.{int(ticket_number)}",
            "submitter_email": f"ilike.{clean_email}",
            "limit": "1",
        },
        client=client,
    )
    resp.raise_for_status()
    rows = resp.json()
    if not rows:
        raise LookupError(f"Ticket #{ticket_number} not found for your account.")
    row = rows[0]
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
    patch_body: dict[str, Any] = {
        "status": "CLOSED",
        "closed_at": now_iso,
        "updated_at": now_iso,
    }
    if row.get("github_issue_number"):
        patch_body["status_sync_pending"] = True
    upd = await _rest_request(
        "PATCH",
        "client_tickets",
        params={"id": f"eq.{row['id']}"},
        json_body=patch_body,
        prefer="return=representation",
        client=client,
    )
    upd.raise_for_status()
    updated = upd.json()
    return _sanitize_ticket(updated[0] if isinstance(updated, list) else updated)
