import json
import sqlite3
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import main
import routes_sessions


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def admin_token():
    tok = "test-admin-token-260"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_live_turns_endpoint_strips_xml_envelopes_extracts_spoken_and_stays_passive(
    client, admin_token, tmp_path, monkeypatch
):
    """#260: GET /api/sessions/{name}/live-turns returns clean Operator + J.O.S.H.U.A. turns without sliding token TTL."""
    agy_dir = tmp_path / "agy_live_260"
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

    cid = "conv-live-260"
    tx_dir = agy_dir / "brain" / cid / ".system_generated" / "logs"
    tx_dir.mkdir(parents=True)
    steps = [
        {
            "step_index": 1,
            "type": "USER_INPUT",
            "created_at": "2026-11-22T17:10:00Z",
            "content": (
                "<CONTEXT_SUMMARY>truncated context</CONTEXT_SUMMARY>\n"
                "<USER_REQUEST>\nVerify all 7 Emerald Matrix parity upgrades.\n</USER_REQUEST>\n"
                "<ADDITIONAL_METADATA>time</ADDITIONAL_METADATA>"
            ),
        },
        {
            "step_index": 2,
            "type": "PLANNER_RESPONSE",
            "created_at": "2026-11-22T17:10:12Z",
            "input_tokens": 140000,
            "cache_read_tokens": 0,
            "content": (
                "All seven deliverables are verified green.\n\n"
                "🔊 All seven Emerald Matrix parity upgrades passed automated verification."
            ),
            "tool_calls": [
                {
                    "name": "run_command",
                    "arguments": {"CommandLine": "pytest -q"},
                    "output": "210 passed",
                }
            ],
        },
    ]
    (tx_dir / "transcript.jsonl").write_text(
        "\n".join(json.dumps(s) for s in steps) + "\n",
        encoding="utf-8",
    )
    conn.execute(
        "INSERT INTO conversation_summaries VALUES (?, ?, ?, 4, ?, ?, 'RUNNING', 0)",
        (
            cid,
            "Parity Verification",
            "Parity Verification",
            "2026-11-22 17:10:12+00:00",
            json.dumps(["file:///workspace/aim-connect"]),
        ),
    )
    conn.commit()
    conn.close()

    monkeypatch.setenv("AIM_AGY_APP_DATA_DIR", str(agy_dir))
    monkeypatch.setenv("AIM_FORENSICS_DIR", str(tmp_path / "empty_vault"))

    before_exp = main.VALID_API_TOKENS[admin_token]["expires"]
    resp = client.get(
        "/api/sessions/aim-connect/live-turns",
        headers={"x-api-token": admin_token},
    )
    assert resp.status_code == 200
    after_exp = main.VALID_API_TOKENS[admin_token]["expires"]
    assert after_exp == before_exp, "Background live-turns polling must not slide 4h token TTL (#247)"

    payload = resp.json()
    assert payload["session"] == "aim-connect"
    assert payload["vessel"] == "AGY"
    assert payload["turn_count"] == 1
    turn = payload["turns"][0]
    assert turn["user"] == "Verify all 7 Emerald Matrix parity upgrades."
    assert "<CONTEXT_SUMMARY>" not in turn["user"]
    assert "<ADDITIONAL_METADATA>" not in turn["user"]
    assert any("run_command(pytest -q)" in t for t in turn["tools"])
    assert "All seven deliverables are verified green." in turn["body"]
    assert "🔊" not in turn["body"]
    assert "All seven Emerald Matrix parity upgrades passed" in turn["spoken"]


def test_tmux_windows_and_exec_endpoints_and_fleet_window_count(
    client, admin_token
):
    """#260: GET /api/tmux/{name}/windows and POST /api/tmux/{name}/exec inspect and control multi-window tmux nodes."""
    now_epoch = int(time.time()) - 7500
    dispatched_cmds = []

    def fake_run(cmd, *args, **kwargs):
        dispatched_cmds.append(list(cmd))
        m = MagicMock(returncode=0, stderr="", stdout="")
        if cmd[:3] == ["tmux", "list-panes", "-s"]:
            m.stdout = (
                "0@@@servers@@@1@@@0@@@1@@@uvicorn@@@/opt/aim-connect/backend@@@901\n"
                "1@@@mcp@@@0@@@0@@@1@@@python3@@@/opt/aim-mcp@@@902\n"
                "2@@@cloudflared@@@0@@@0@@@1@@@cloudflared@@@/opt/aim-connect@@@903\n"
            )
        elif cmd[:3] == ["tmux", "list-panes", "-a"]:
            m.stdout = (
                "aim-connect-workspace@@@0@@@servers@@@0@@@uvicorn@@@/opt/aim-connect/backend@@@901@@@1@@@100\n"
                "aim-connect-workspace@@@1@@@mcp@@@0@@@python3@@@/opt/aim-mcp@@@902@@@1@@@100\n"
                "aim-connect-workspace@@@2@@@cloudflared@@@0@@@cloudflared@@@/opt/aim-connect@@@903@@@1@@@100\n"
            )
        elif cmd[:2] == ["tmux", "display-message"]:
            m.stdout = f"{now_epoch}\n"
        elif cmd[:2] == ["tmux", "capture-pane"]:
            m.stdout = "\x1b[32mINFO: Uvicorn running on 0.0.0.0:8000\x1b[0m\n"
        return m

    before_exp = main.VALID_API_TOKENS[admin_token]["expires"]
    with patch("routes_sessions.subprocess.run", side_effect=fake_run), patch(
        "routes_sessions._resolve_agy_brain_tokens_by_workspace", return_value={}
    ):
        fleet, _ = routes_sessions.collect_fleet_telemetry(["aim-connect-workspace"])
        assert fleet[0]["window_count"] == 3
        assert fleet[0]["pane_count"] == 3

        w_resp = client.get(
            "/api/tmux/aim-connect-workspace/windows",
            headers={"x-api-token": admin_token},
        )
        assert w_resp.status_code == 200
        assert main.VALID_API_TOKENS[admin_token]["expires"] == before_exp

        w_data = w_resp.json()
        assert w_data["window_count"] == 3
        assert len(w_data["windows"]) == 3
        assert w_data["windows"][0]["id"] == "0:servers"
        assert w_data["windows"][0]["active"] is True
        assert "INFO: Uvicorn running on 0.0.0.0:8000" in w_data["windows"][0]["lines"][0]
        assert w_data["uptime"].startswith("UP 2h")

        # Active command execution via 2-step buffer paste
        ex_resp = client.post(
            "/api/tmux/aim-connect-workspace/exec",
            headers={"x-api-token": admin_token},
            json={"target": "1.0", "command": "./startup.sh --status"},
        )
        assert ex_resp.status_code == 200
        assert ex_resp.json()["dispatched"] is True
        assert any(c[:3] == ["tmux", "select-window", "-t"] and c[3] == "aim-connect-workspace:1" for c in dispatched_cmds)
        assert any(c[:3] == ["tmux", "set-buffer", "--"] and c[3] == "./startup.sh --status" for c in dispatched_cmds)
        assert any(c[:3] == ["tmux", "paste-buffer", "-t"] and c[3] == "aim-connect-workspace:1.0" for c in dispatched_cmds)
        assert any(c[:3] == ["tmux", "send-keys", "-t"] and c[4] == "Enter" for c in dispatched_cmds)

        # Reject invalid target syntax
        bad_resp = client.post(
            "/api/tmux/aim-connect-workspace/exec",
            headers={"x-api-token": admin_token},
            json={"target": "../bad", "command": "ls"},
        )
        assert bad_resp.status_code == 400


def test_issue_260_frontend_all_seven_parity_contracts():
    """#260: Verify all 7 React UI & stage parity contracts against the :8090 Emerald Matrix spec."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    explorer_jsx = (FRONTEND_SRC / "components" / "FileExplorer.jsx").read_text(encoding="utf-8")
    browser_jsx = (FRONTEND_SRC / "components" / "BrowserPane.jsx").read_text(encoding="utf-8")
    sidebar_jsx = (FRONTEND_SRC / "components" / "FleetSidebar.jsx").read_text(encoding="utf-8")
    forensics_jsx = (FRONTEND_SRC / "components" / "ForensicsModal.jsx").read_text(encoding="utf-8")
    grabber_jsx = (FRONTEND_SRC / "components" / "TokenGrabberModal.jsx").read_text(encoding="utf-8")
    palette_jsx = (FRONTEND_SRC / "components" / "CommandPalette.jsx").read_text(encoding="utf-8")
    delete_jsx = (FRONTEND_SRC / "components" / "DeleteSessionModal.jsx").read_text(encoding="utf-8")
    chat_jsx = (FRONTEND_SRC / "components" / "LiveTranscriptStage.jsx").read_text(encoding="utf-8")
    tmux_jsx = (FRONTEND_SRC / "components" / "TmuxServerStage.jsx").read_text(encoding="utf-8")

    # 1. FileExplorer persistent 2-column split rail + Emerald Matrix top bar
    assert "copilot-top-bar" in explorer_jsx
    assert "files-split-body" in explorer_jsx
    assert "files-tree-rail" in explorer_jsx
    assert "pane-full-upgrade-btn" in explorer_jsx
    assert "HTTP 409 MTIME GUARD" in explorer_jsx
    assert "🧠 BRAIN:" not in explorer_jsx

    # 2. BrowserPane leased tab auto-focus & Lucide chrome
    assert "preferredBrowserTargetId" in app_jsx
    assert "preferredTargetId" in browser_jsx
    assert "LEASED TAB //" in browser_jsx
    assert "HAS NO OPEN BROWSER LEASE" in browser_jsx
    assert "copilot-tabs-row" in browser_jsx
    assert "➕ Tab" not in browser_jsx

    # 3. Compact .node-subbar without duplicate MIC/SPEAK buttons + stage toggles
    assert "MIC ON" not in app_jsx
    assert "subbar-lbl-collapse" in app_jsx
    assert "CHAT VIEW" in app_jsx
    assert "SPLIT GRID" in app_jsx

    # 4. Secondary modals migrated to .modal-veil + .ld-modal-card + Lucide icons
    for modal_src in (forensics_jsx, grabber_jsx, palette_jsx, delete_jsx):
        assert "modal-veil" in modal_src
        assert "ld-modal-card" in modal_src
        assert "<Icon" in modal_src
        assert "#1c305c" not in modal_src
        assert "#1a1a1a" not in modal_src

    # 5. FleetSidebar task-mode-chip & historyCounts
    assert "deriveTaskChip" in sidebar_jsx
    assert "task-mode-chip" in sidebar_jsx
    assert "GATE HOLD [y/n]" in sidebar_jsx
    assert "historyCounts" in sidebar_jsx

    # 6 & 7. LiveTranscriptStage & TmuxServerStage mounted and wired
    assert "<LiveTranscriptStage" in app_jsx
    assert "<TmuxServerStage" in app_jsx
    assert "/live-turns" in chat_jsx
    assert "transmission-block" in chat_jsx
    assert "spoken-brief-card" in chat_jsx
    assert "/api/tmux/" in tmux_jsx
    assert "tmux-pane-grid" in tmux_jsx
