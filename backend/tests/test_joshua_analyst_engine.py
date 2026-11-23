"""TDD verification suite for Native Zero-tmux JOSHUA Analyst Engine (#268 / Option 1A)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import sqlite3
import time
import zipfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import main
import routes_joshua_analyst as rja


def _mint_analyst_token(secret: str, email: str, purpose: str = "ai-analyst", ttl: int = 3600) -> str:
    payload = {"p": purpose, "e": email.lower(), "exp": int(time.time()) + ttl}
    body = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("ascii").rstrip("=")
    sig = base64.urlsafe_b64encode(
        hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    ).decode("ascii").rstrip("=")
    return f"{body}.{sig}"


def _seed_seat_workspace(root: Path, wid: str, email: str, pipeline: str = "commercial") -> Path:
    ws = root / f"agent-{wid}"
    (ws / "shared_database").mkdir(parents=True, exist_ok=True)
    (ws / "memory-wiki" / "pages").mkdir(parents=True, exist_ok=True)
    (ws / ".env").write_text(
        f"OPERATOR_EMAIL={email}\nOPERATOR_ID={wid}\nPIPELINE_TYPE={pipeline}\n",
        encoding="utf-8",
    )
    (ws / "AGENTS.md").write_text(
        f"# J.O.S.H.U.A. ({pipeline.title()} Edition)\n",
        encoding="utf-8",
    )

    db_path = ws / "shared_database" / "joshua.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript(
        """
        CREATE TABLE master_leads (
            business_name TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            county TEXT,
            owner_name TEXT,
            owner_title TEXT,
            contact_phone TEXT,
            contact_email TEXT,
            seats TEXT,
            priority_class TEXT,
            dbpr_application_type TEXT,
            abt_action_description TEXT,
            pf_target_acquired INTEGER,
            lead_score INTEGER,
            muted INTEGER,
            date_discovered TEXT
        );
        CREATE TABLE daily_dossiers (
            date TEXT,
            markdown_content TEXT,
            emailed INTEGER
        );
        INSERT INTO master_leads VALUES (
            'SUNSET ARTISAN BISTRO LLC',
            '410 Central Ave',
            'St. Petersburg',
            'FL',
            '33701',
            'PINELLAS',
            'Elena Morales',
            'Managing Member',
            '(727) 555-0142',
            'elena@sunsetbistro.example',
            '85',
            'MULTI_HIT: LEASE_SIGNED',
            'SECRET_INTERNAL_DBPR_1030',
            'SECRET_INTERNAL_ABT_4COP',
            1,
            10500,
            0,
            '2026-11-22'
        );
        INSERT INTO master_leads VALUES (
            'MUTED QUARANTINE ENTRY',
            '999 Hidden Rd',
            'Tampa',
            'FL',
            '33602',
            'HILLSBOROUGH',
            'Hidden',
            'Owner',
            '(813) 555-0199',
            'hidden@example.com',
            '0',
            'MUTED_RESIDENTIAL',
            'INTERNAL',
            'INTERNAL',
            0,
            100,
            1,
            '2026-11-20'
        );
        INSERT INTO daily_dossiers VALUES (
            '2026-11-22',
            '# Daily Territory Briefing\n- Sunset Artisan Bistro opening on Central Ave.',
            1
        );
        """
    )
    conn.close()
    return ws


@pytest.fixture
def isolated_analyst_env(monkeypatch, tmp_path):
    secret = "unit_test_gateway_secret_268"
    ws_root = tmp_path / "agent_workspaces"
    ws_root.mkdir()
    monkeypatch.setenv("AIM_GATEWAY_SIGNING_SECRET", secret)
    monkeypatch.setenv("AIM_JOSHUA_API_KEY", "test_server_deepseek_key_never_echo")
    monkeypatch.setattr(main, "ALLOW_HTTP", True)
    monkeypatch.setattr(rja, "AGENT_WORKSPACES_DIR", str(ws_root))
    monkeypatch.setattr(
        rja,
        "resolve_workspace_id_for_email",
        lambda em: "op_11111111111111111111111111111111"
        if "alpha" in em
        else "op_22222222222222222222222222222222",
    )
    ws_a = _seed_seat_workspace(
        ws_root,
        "op_11111111111111111111111111111111",
        "alpha@tenant.example",
        pipeline="hospitality",
    )
    ws_b = _seed_seat_workspace(
        ws_root,
        "op_22222222222222222222222222222222",
        "bravo@tenant.example",
        pipeline="commercial",
    )
    return {
        "secret": secret,
        "ws_root": ws_root,
        "ws_a": ws_a,
        "ws_b": ws_b,
        "tok_a": _mint_analyst_token(secret, "alpha@tenant.example"),
        "tok_b": _mint_analyst_token(secret, "bravo@tenant.example"),
    }


def test_bootstrap_and_auth_fail_closed(isolated_analyst_env):
    client = TestClient(main.app)

    # Missing/forged token -> 401
    assert client.get("/api/joshua/bootstrap").status_code == 401
    assert client.get("/api/joshua/bootstrap?token=forged.sig").status_code == 401

    # Valid seat token -> <50ms zero-tmux bootstrap
    res = client.get(
        "/api/joshua/bootstrap",
        headers={"Authorization": f"Bearer {isolated_analyst_env['tok_a']}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ready"] is True
    assert body["operator_id"] == "op_11111111111111111111111111111111"
    assert body["pipeline_type"] == "hospitality"
    assert body["database_ready"] is True
    assert body["usage"]["monthly_limit"] == 250
    assert body["usage"]["query_count"] == 0
    assert body["usage"]["remaining"] == 250


def test_safe_master_columns_sqlite_authorizer_blocks_writes_and_internal_columns(isolated_analyst_env):
    db_path = isolated_analyst_env["ws_a"] / "shared_database" / "joshua.db"

    # 1. Blocks mutating SQL statements and multi-statement injections
    for bad_sql in (
        "DELETE FROM master_leads",
        "UPDATE master_leads SET city = 'HACKED'",
        "DROP TABLE master_leads",
        "SELECT business_name FROM master_leads; DROP TABLE master_leads",
        "SELECT name FROM sqlite_master",
        "PRAGMA table_info(master_leads)",
    ):
        res = rja.execute_safe_joshua_sql(db_path, bad_sql, raw_user_query=True)
        assert res["ok"] is False, f"Expected authorizer/validator to block: {bad_sql}"

    # 2. Masks internal columns on SELECT * via sqlite3.set_authorizer + _scrub_row
    res_star = rja.execute_safe_joshua_sql(
        db_path,
        "SELECT * FROM master_leads WHERE city = 'St. Petersburg'",
        raw_user_query=True,
    )
    assert res_star["ok"] is True
    assert len(res_star["rows"]) == 1
    row = res_star["rows"][0]
    assert row["business_name"] == "SUNSET ARTISAN BISTRO LLC"
    assert row["contact_phone"] == "(727) 555-0142"
    for forbidden_col in (
        "dbpr_application_type",
        "abt_action_description",
        "priority_class",
        "pf_target_acquired",
        "muted",
    ):
        assert forbidden_col not in row, f"Internal column leaked: {forbidden_col}"

    # 3. Direct read of a disallowed column returns NULL (SQLITE_IGNORE), never the secret string
    res_direct = rja.execute_safe_joshua_sql(
        db_path,
        "SELECT business_name, dbpr_application_type, abt_action_description FROM master_leads LIMIT 1",
        raw_user_query=True,
    )
    assert res_direct["ok"] is True
    raw_dump = json.dumps(res_direct["rows"])
    assert "SECRET_INTERNAL_DBPR_1030" not in raw_dump
    assert "SECRET_INTERNAL_ABT_4COP" not in raw_dump


def test_threads_isolation_profile_and_xlsx_csv_export(isolated_analyst_env):
    client = TestClient(main.app)
    hdr_a = {"Authorization": f"Bearer {isolated_analyst_env['tok_a']}"}
    hdr_b = {"Authorization": f"Bearer {isolated_analyst_env['tok_b']}"}

    # Create thread as Tenant A
    c_res = client.post("/api/joshua/threads", headers=hdr_a, json={"title": "Pinellas Ovens"})
    assert c_res.status_code == 200
    tid = c_res.json()["thread"]["thread_id"]

    # Tenant B cannot read, patch, or delete Tenant A's thread
    assert client.get(f"/api/joshua/threads/{tid}", headers=hdr_b).status_code == 404
    assert client.patch(f"/api/joshua/threads/{tid}", headers=hdr_b, json={"title": "Hijack"}).status_code == 404
    assert client.delete(f"/api/joshua/threads/{tid}", headers=hdr_b).status_code == 404

    # Tenant A can rename and list
    p_res = client.patch(f"/api/joshua/threads/{tid}", headers=hdr_a, json={"title": "Pinellas Pizza Ovens", "pinned": True})
    assert p_res.status_code == 200
    assert p_res.json()["thread"]["title"] == "Pinellas Pizza Ovens"
    assert p_res.json()["thread"]["pinned"] == 1

    # Save Rep Profile for Tenant A
    prof_res = client.put(
        "/api/joshua/profile",
        headers=hdr_a,
        json={
            "company_name": "Gulf Coast Kitchen Supply",
            "what_we_sell": "Commercial revolving pizza ovens and dough mixers",
            "target_geography": "Pinellas & Hillsborough",
        },
    )
    assert prof_res.status_code == 200
    assert (isolated_analyst_env["ws_a"] / "profile.md").is_file()
    assert not (isolated_analyst_env["ws_b"] / "profile.md").exists()

    # Export XLSX and verify valid OpenXML structure & zero internal column leakage
    exp_res = client.post(
        "/api/joshua/export",
        headers=hdr_a,
        json={
            "filename_stem": "sunset_export",
            "format": "xlsx",
            "sql_query": "SELECT * FROM master_leads WHERE city = 'St. Petersburg'",
        },
    )
    assert exp_res.status_code == 200
    exp_meta = exp_res.json()["export_file"]
    xlsx_path = isolated_analyst_env["ws_a"] / exp_meta["relative_path"]
    assert xlsx_path.is_file()
    with zipfile.ZipFile(xlsx_path, "r") as zf:
        sheet_xml = zf.read("xl/worksheets/sheet1.xml").decode("utf-8")
    assert "SUNSET ARTISAN BISTRO LLC" in sheet_xml
    assert "SECRET_INTERNAL_DBPR_1030" not in sheet_xml


def test_chat_tool_loop_streaming_and_250_monthly_quota_enforcement(isolated_analyst_env, monkeypatch):
    client = TestClient(main.app)
    hdr_a = {"Authorization": f"Bearer {isolated_analyst_env['tok_a']}"}

    call_counter = {"n": 0}

    async def fake_openai_chat(_http_client, *, base_url, api_key, model, messages, tools=None):
        call_counter["n"] += 1
        if call_counter["n"] == 1:
            return {
                "choices": [
                    {
                        "message": {
                            "content": "",
                            "tool_calls": [
                                {
                                    "id": "call_search_1",
                                    "type": "function",
                                    "function": {
                                        "name": "search_leads",
                                        "arguments": json.dumps({"city": "St. Petersburg", "has_phone": True}),
                                    },
                                }
                            ],
                        }
                    }
                ],
                "usage": {"prompt_tokens": 300, "completion_tokens": 40},
            }
        return {
            "choices": [
                {
                    "message": {
                        "content": (
                            "| Business | Phone | Seats |\n"
                            "|---|---|---|\n"
                            "| SUNSET ARTISAN BISTRO LLC | (727) 555-0142 | 85 |\n\n"
                            "🔊 I found Sunset Artisan Bistro in Saint Petersburg with 85 seats and a direct phone contact."
                        )
                    }
                }
            ],
            "usage": {"prompt_tokens": 450, "completion_tokens": 80},
        }

    monkeypatch.setattr(rja, "_call_openai_chat", fake_openai_chat)

    # 1. Execute SSE streaming turn (2 LLM hops = 1 metered user turn!)
    sse_res = client.post(
        "/api/joshua/chat",
        headers=hdr_a,
        json={"message": "Find St. Petersburg restaurant leads with phone numbers", "stream": True},
    )
    assert sse_res.status_code == 200
    assert "text/event-stream" in sse_res.headers.get("content-type", "")
    raw_sse = sse_res.text
    assert "event: tool_result" in raw_sse
    assert "SUNSET ARTISAN BISTRO LLC" in raw_sse
    assert "event: done" in raw_sse
    assert "test_server_deepseek_key_never_echo" not in raw_sse

    # Verify usage incremented by exactly 1 and thread persisted with table_preview
    boot = client.get("/api/joshua/bootstrap", headers=hdr_a).json()
    assert boot["usage"]["query_count"] == 1
    assert boot["usage"]["remaining"] == 249
    assert len(boot["threads"]) == 1
    tid = boot["threads"][0]["thread_id"]

    t_detail = client.get(f"/api/joshua/threads/{tid}", headers=hdr_a).json()
    assert len(t_detail["messages"]) == 2
    assert t_detail["messages"][1]["tool_events"][0]["table_preview"]["rows"][0]["seating_capacity"] == "85"

    # 2. Exhaust quota at custom limit=1 and verify 429 block vs BYOK override
    monkeypatch.setenv("AIM_JOSHUA_MONTHLY_QUERY_LIMIT", "1")
    blocked = client.post(
        "/api/joshua/chat",
        headers=hdr_a,
        json={"message": "Second query over server cap", "stream": False},
    )
    assert blocked.status_code == 429
    assert "allowance reached" in blocked.json()["detail"]

    # BYOK override succeeds without incrementing server query_count
    byok_ok = client.post(
        "/api/joshua/chat",
        headers={**hdr_a, "X-Joshua-BYOK-Key": "sk-user-byok-override"},
        json={"message": "Query using optional BYOK key", "stream": False},
    )
    assert byok_ok.status_code == 200
    assert byok_ok.json()["usage"]["query_count"] == 1
    assert byok_ok.json()["usage"]["byok_query_count"] == 1
