import json
import sqlite3
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import main
import routes_sessions


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def valid_token():
    tok = "test-admin-token-257"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 3600,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_sessions_strict_alphabetical_sort_and_browser_lease_enrichment(
    client, valid_token, tmp_path, monkeypatch
):
    """#257: /api/sessions returns strict alphabetical order (aim-auditor #1) and enriches has_browser_lease."""
    browser_state = tmp_path / "aim-browser-state"
    browser_state.mkdir(parents=True)
    (browser_state / "leases.json").write_text(
        json.dumps(
            {
                "ld-qa": {
                    "targetId": "TARGET_LD_1",
                    "actor": "aim-ld",
                    "session": "aim-ld",
                    "updatedAt": int(time.time() * 1000),
                }
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("AIM_BROWSER_STATE_DIR", str(browser_state))

    def fake_run(cmd, *args, **kwargs):
        m = MagicMock(returncode=0, stderr="")
        if cmd[:2] == ["tmux", "ls"]:
            # Intentionally unsorted tmux output
            m.stdout = "aim-youtube\naim-connect\naim-auditor\naim-ld\n"
        elif cmd[:2] == ["tmux", "list-panes"]:
            m.stdout = (
                f"aim-youtube@@@0@@@main@@@0@@@opencode@@@{tmp_path}@@@101@@@0\n"
                f"aim-connect@@@0@@@main@@@0@@@agy.real@@@{tmp_path}@@@102@@@1\n"
                f"aim-auditor@@@0@@@main@@@0@@@agy.real@@@{tmp_path}@@@103@@@0\n"
                f"aim-ld@@@0@@@main@@@0@@@agy.real@@@{tmp_path}@@@104@@@0\n"
            )
        elif cmd[:2] == ["tmux", "capture-pane"]:
            m.stdout = "Gemini 4 Argon | 120.0k in | 1.0k out\n> Ready\n"
        else:
            m.stdout = ""
        return m

    with patch("routes_sessions.subprocess.run", side_effect=fake_run), patch(
        "routes_sessions._resolve_agy_brain_tokens_by_workspace", return_value={}
    ):
        resp = client.get("/api/sessions", headers={"x-api-token": valid_token})
        assert resp.status_code == 200
        data = resp.json()
        assert data["sessions"] == ["aim-auditor", "aim-connect", "aim-ld", "aim-youtube"]
        by_name = {f["session_name"]: f for f in data["fleet"]}
        assert by_name["aim-ld"]["has_browser_lease"] is True
        assert by_name["aim-ld"]["browser_tab_id"] == "TARGET_LD_1"
        assert by_name["aim-auditor"]["has_browser_lease"] is False
        assert by_name["aim-auditor"]["browser_tab_id"] == ""


def test_project_history_vault_endpoints_and_turn_weaver(
    client, valid_token, tmp_path, monkeypatch
):
    """#257: GET /api/sessions/history & /api/sessions/history/{id}/turns index AGY DB + vault JSONL."""
    agy_dir = tmp_path / "agy_hist"
    agy_dir.mkdir(parents=True)
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

    # 2 AGY generations on aim-connect
    for cid, title, ts, tok_in, comp in [
        ("conv-gen-1", "Initial Fleet Cockpit", "2026-11-18 10:00:00+00:00", 290000, 0),
        ("conv-gen-2", "Emerald Matrix V4 Facelift", "2026-11-22 15:00:00+00:00", 184000, 0),
    ]:
        tx_dir = agy_dir / "brain" / cid / ".system_generated" / "logs"
        tx_dir.mkdir(parents=True)
        (tx_dir / "transcript.jsonl").write_text(
            "\n".join(
                [
                    json.dumps(
                        {
                            "step_index": 1,
                            "type": "USER_INPUT",
                            "created_at": ts,
                            "content": f"Execute mission: {title}",
                        }
                    ),
                    json.dumps(
                        {
                            "step_index": 2,
                            "type": "PLANNER_RESPONSE",
                            "created_at": ts,
                            "input_tokens": tok_in,
                            "cache_read_tokens": 0,
                            "content": f"Completed {title} cleanly.",
                            "tool_calls": [
                                {
                                    "name": "run_command",
                                    "arguments": {"CommandLine": "pytest -q"},
                                    "output": "199 passed",
                                }
                            ],
                        }
                    ),
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        if comp:
            with open(tx_dir / "transcript.jsonl", "a", encoding="utf-8") as fh:
                fh.write(json.dumps({"type": "CHECKPOINT", "content": "compacted"}) + "\n")
        conn.execute(
            "INSERT INTO conversation_summaries VALUES (?, ?, ?, 12, ?, ?, 'IDLE', 0)",
            (cid, title, title, ts, json.dumps(["file:///workspace/aim-connect"])),
        )
    conn.commit()
    conn.close()

    # Plus 1 Grok vault transcript on aim-connect
    vault_dir = tmp_path / "vault_hist"
    vault_dir.mkdir(parents=True)
    grok_file = vault_dir / "grok_aim-connect_gen15.jsonl"
    grok_file.write_text(
        "\n".join(
            [
                json.dumps({"role": "user", "content": "Pick up baton in Grok CLI"}),
                json.dumps({"role": "assistant", "content": "Baton received in Grok."}),
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setenv("AIM_AGY_APP_DATA_DIR", str(agy_dir))
    monkeypatch.setenv("AIM_FORENSICS_DIR", str(vault_dir))

    resp = client.get(
        "/api/sessions/history?session=aim-connect",
        headers={"x-api-token": valid_token},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["counts_by_project"].get("aim-connect", 0) >= 3
    records = [r for r in payload["records"] if r["session"] == "aim-connect"]
    assert len(records) == 3
    # Latest record is highest generation
    assert records[0]["gen"] == "GEN #03"
    assert records[-1]["gen"] == "GEN #01"
    vessels = {r["vessel"] for r in records}
    assert {"AGY", "GROK"}.issubset(vessels)

    # Fetch structured turns for conv-gen-2
    turns_resp = client.get(
        "/api/sessions/history/conv-gen-2/turns",
        headers={"x-api-token": valid_token},
    )
    assert turns_resp.status_code == 200
    turns_data = turns_resp.json()
    assert len(turns_data["turns"]) == 1
    assert "Emerald Matrix V4 Facelift" in turns_data["turns"][0]["operator"]
    assert "run_command" in turns_data["turns"][0]["tool"]
    assert "Completed Emerald Matrix V4 Facelift" in turns_data["turns"][0]["agent"]


def test_ticket_b_frontend_fleet_scrollback_and_history_contracts():
    """#257: Verify FleetSidebar, ScrollbackOverlay 2,000-line search, HistoryVault, & auto-collapse wiring."""
    sidebar_jsx = (FRONTEND_SRC / "components" / "FleetSidebar.jsx").read_text(encoding="utf-8")
    scroll_jsx = (FRONTEND_SRC / "components" / "ScrollbackOverlay.jsx").read_text(encoding="utf-8")
    history_jsx = (FRONTEND_SRC / "components" / "HistoryVault.jsx").read_text(encoding="utf-8")
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")

    # 1. FleetSidebar strict alphabetical localeCompare, filters, Spotlight & daemon bars
    assert "localeCompare" in sidebar_jsx
    assert "NO WEB" in sidebar_jsx
    assert "TMUX" in sidebar_jsx
    assert "DAEMON ONLINE" in sidebar_jsx
    assert "has_browser_lease" in sidebar_jsx
    assert "--spot-x" in sidebar_jsx

    # 2. ScrollbackOverlay 2,000-line multi-page live search + match jump
    assert "scroll-search-inp" in scroll_jsx
    assert "find-hit-mark" in scroll_jsx
    assert "active-hit" in scroll_jsx
    assert "Copy Selection" in scroll_jsx
    assert "Copy All" in scroll_jsx

    # 3. HistoryVault baton relay, copy ref, send to agent, flight record & operator bubble preferences
    assert "BATON RELAY" in history_jsx
    assert "COPY ID & REF" in history_jsx
    assert "SEND TO AGENT" in history_jsx
    assert "FLIGHT RECORD" in history_jsx
    assert "op-style-" in history_jsx
    assert "op-side-" in history_jsx

    # 4. App.jsx mounts HistoryVault, auto-collapses browser on non-browser nodes, and routes Ctrl+F to ScrollbackOverlay
    assert "<HistoryVault" in app_jsx
    assert "has_browser_lease" in app_jsx
