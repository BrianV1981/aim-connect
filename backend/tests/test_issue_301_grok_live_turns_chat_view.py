import json
import os
import sqlite3
import time
import urllib.parse
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def admin_token():
    tok = "test-admin-token-301"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_grok_live_turns_supersedes_stale_agy_and_parses_structured_blocks(tmp_path, monkeypatch, admin_token):
    """#301: Verify live Grok ~/.grok/sessions chat_history.jsonl is indexed, selected over stale AGY, and cleanly parsed."""
    proj_dir = tmp_path / "aim-agents" / "aim-auditor"
    proj_dir.mkdir(parents=True)

    # 1. Create an older AGY conversation_summaries.db + transcript.jsonl for aim-auditor
    agy_dir = tmp_path / "agy"
    agy_tx = agy_dir / "brain" / "cid-old-agy" / ".system_generated" / "logs" / "transcript.jsonl"
    agy_tx.parent.mkdir(parents=True)
    agy_tx.write_text(
        json.dumps({"step_index": 0, "type": "USER_INPUT", "content": "<USER_REQUEST>Old AGY prompt</USER_REQUEST>"}) + "\n"
        + json.dumps({"step_index": 1, "type": "PLANNER_RESPONSE", "content": "Old AGY reply\n\n🔊 Old AGY summary."}) + "\n",
        encoding="utf-8",
    )
    old_ts = time.time() - 7200
    os.utime(agy_tx, (old_ts, old_ts))

    db_path = agy_dir / "conversation_summaries.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        """
        CREATE TABLE conversation_summaries (
            conversation_id TEXT,
            title TEXT,
            preview TEXT,
            step_count INTEGER,
            last_modified_time TEXT,
            workspace_uris TEXT,
            status TEXT,
            nesting_depth INTEGER
        )
        """
    )
    conn.execute(
        "INSERT INTO conversation_summaries VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
        (
            "cid-old-agy",
            "Old AGY Session",
            "Old AGY",
            2,
            "2099-12-31T23:59:59Z",  # Even if UTC string looks huge, true mtime_epoch & active pane must win!
            json.dumps([f"file://{proj_dir}"]),
            "COMPLETED",
        ),
    )
    conn.commit()
    conn.close()

    # 2. Create a newer live Grok 4.7 session in ~/.grok/sessions/<urlencoded_cwd>/<uuid>/chat_history.jsonl
    grok_home = tmp_path / ".grok"
    encoded_cwd = urllib.parse.quote(str(proj_dir), safe="")
    grok_sess_dir = grok_home / "sessions" / encoded_cwd / "01a21212-grok-live"
    grok_sess_dir.mkdir(parents=True)

    (grok_home / "active_sessions.json").write_text(
        json.dumps([{"session_id": "01a21212-grok-live", "pid": 99999, "cwd": str(proj_dir)}]),
        encoding="utf-8",
    )
    (grok_sess_dir / "summary.json").write_text(
        json.dumps(
            {
                "info": {"id": "01a21212-grok-live", "cwd": str(proj_dir)},
                "generated_title": "AIM Auditor Baselines",
                "num_chat_messages": 12,
            }
        ),
        encoding="utf-8",
    )

    grok_lines = [
        {"type": "system", "content": "You are Grok 4.7."},
        {"type": "user", "content": [{"type": "text", "text": f"<user_info>\nWorkspace Path: {proj_dir}\n</user_info>"}]},
        {"type": "user", "synthetic_reason": "skills", "content": [{"type": "text", "text": "<system-reminder>skills</system-reminder>"}]},
        {
            "type": "user",
            "prompt_index": 0,
            "content": [{"type": "text", "text": "<user_query>\nwe need some new baselines\n</user_query>"}],
        },
        {
            "type": "reasoning",
            "summary": [{"type": "summary_text", "text": "Checking three unaudited repositories."}],
        },
        {
            "type": "assistant",
            "content": "The standing queue names three unaudited targets.",
            "tool_calls": [
                {"id": "tc-1", "name": "read_file", "arguments": json.dumps({"target_file": f"{proj_dir}/AGENTS.md"})}
            ],
        },
        {"type": "tool_result", "tool_call_id": "tc-1", "content": "# Auditor"},
        {
            "type": "assistant",
            "content": "Next I will pin each clean tip and verify CI.\n\n🔊 Auditing three repositories now.",
            "tool_calls": [
                {"id": "tc-2", "name": "run_terminal_command", "arguments": json.dumps({"command": "pytest -q"})}
            ],
        },
    ]
    chat_file = grok_sess_dir / "chat_history.jsonl"
    chat_file.write_text("\n".join(json.dumps(x) for x in grok_lines) + "\n", encoding="utf-8")

    monkeypatch.setenv("AIM_AGY_APP_DATA_DIR", str(agy_dir))
    monkeypatch.setenv("AIM_GROK_HOME", str(grok_home))
    monkeypatch.setenv("AIM_FORENSICS_DIR", str(tmp_path / "empty_vault"))

    client = TestClient(main.app)
    with patch("routes_forensics._detect_active_session_pane_hint", return_value=("GROK", str(proj_dir))):
        resp = client.get("/api/sessions/aim-auditor/live-turns", headers={"x-api-token": admin_token})
    assert resp.status_code == 200
    data = resp.json()
    assert data["vessel"] == "GROK"
    assert data["turn_count"] == 1

    turn = data["turns"][0]
    assert turn["user"] == "we need some new baselines"
    assert "{'type':" not in turn["user"]
    assert "<user_info>" not in turn["user"]
    assert "The standing queue names three unaudited targets." in turn["body"]
    assert "Next I will pin each clean tip and verify CI." in turn["body"]
    assert turn["spoken"] == "Auditing three repositories now."
    assert any("read_file(" in t and "AGENTS.md" in t for t in turn["tools"])
    assert any("run_terminal_command(pytest -q)" in t for t in turn["tools"])

    # Also verify /api/sessions/history lists both AGY (GEN #01) and GROK (GEN #02, is_current=True)
    hist_resp = client.get("/api/sessions/history?session=aim-auditor", headers={"x-api-token": admin_token})
    assert hist_resp.status_code == 200
    recs = hist_resp.json()["records"]
    assert len(recs) == 2
    assert recs[0]["vessel"] == "GROK"
    assert recs[0]["gen"] == "GEN #02"
    assert recs[0]["is_current"] is True
    assert recs[1]["vessel"] == "AGY"
    assert recs[1]["gen"] == "GEN #01"
