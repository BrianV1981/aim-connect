import json
import sqlite3
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def admin_token():
    tok = "test-admin-token-261"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def _init_agy_summary_db(agy_dir: Path, cid: str, workspace_uri: str = "file:///workspace/aim-connect"):
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
        "INSERT INTO conversation_summaries VALUES (?, ?, ?, 6, ?, ?, 'RUNNING', 0)",
        (
            cid,
            "Rewind Verification",
            "Rewind Verification",
            "2026-11-22 18:30:00+00:00",
            json.dumps([workspace_uri]),
        ),
    )
    conn.commit()
    conn.close()


def test_live_turns_and_history_cleanly_erase_rewound_step_index_ranges(
    client, admin_token, tmp_path, monkeypatch
):
    """#261: Append-only AGY transcript.jsonl step_index rollbacks after /rewind cleanly erase rewound turns."""
    agy_dir = tmp_path / "agy_rewind_rollback"
    agy_dir.mkdir(parents=True)
    cid = "conv-rewind-261-a"
    _init_agy_summary_db(agy_dir, cid)

    tx_dir = agy_dir / "brain" / cid / ".system_generated" / "logs"
    tx_dir.mkdir(parents=True)

    # Simulate append-only transcript where steps 3..4 were rewound and superseded by a new step 3..4
    steps = [
        {
            "step_index": 1,
            "type": "USER_INPUT",
            "created_at": "2026-11-22T18:00:00Z",
            "content": "<USER_REQUEST>Keep turn one intact.</USER_REQUEST>",
        },
        {
            "step_index": 2,
            "type": "PLANNER_RESPONSE",
            "created_at": "2026-11-22T18:00:05Z",
            "content": "Turn one response.\n\n🔊 Turn one complete.",
        },
        {
            "step_index": 3,
            "type": "USER_INPUT",
            "created_at": "2026-11-22T18:03:30Z",
            "content": "<USER_REQUEST>Rewound question that must disappear.</USER_REQUEST>",
        },
        {
            "step_index": 4,
            "type": "PLANNER_RESPONSE",
            "created_at": "2026-11-22T18:03:40Z",
            "content": "Rewound answer that must also disappear.",
        },
        # Operator executed /rewind in terminal, then submitted a new prompt at step_index=3
        {
            "step_index": 3,
            "type": "USER_INPUT",
            "created_at": "2026-11-22T18:07:38Z",
            "content": "<USER_REQUEST>Fresh post-rewind directive.</USER_REQUEST>",
        },
        {
            "step_index": 4,
            "type": "PLANNER_RESPONSE",
            "created_at": "2026-11-22T18:07:45Z",
            "content": "Fresh post-rewind answer.\n\n🔊 Fresh post-rewind summary.",
        },
    ]
    (tx_dir / "transcript.jsonl").write_text(
        "\n".join(json.dumps(s) for s in steps) + "\n",
        encoding="utf-8",
    )

    monkeypatch.setenv("AIM_AGY_APP_DATA_DIR", str(agy_dir))
    monkeypatch.setenv("AIM_FORENSICS_DIR", str(tmp_path / "empty_vault"))

    resp = client.get(
        "/api/sessions/aim-connect/live-turns",
        headers={"x-api-token": admin_token},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["turn_count"] == 2
    users = [t["user"] for t in data["turns"]]
    bodies = [t["body"] for t in data["turns"]]
    assert users == ["Keep turn one intact.", "Fresh post-rewind directive."]
    assert all("Rewound" not in u for u in users)
    assert all("Rewound" not in b for b in bodies)
    assert all("/rewind" not in u for u in users)

    hist = client.get(
        "/api/sessions/history?session=aim-connect",
        headers={"x-api-token": admin_token},
    )
    assert hist.status_code == 200
    rec = hist.json()["records"][0]
    assert rec["turns"] == 2


def test_live_turns_immediately_erases_rewound_steps_via_sqlite_ceiling_before_next_prompt(
    client, admin_token, tmp_path, monkeypatch
):
    """#261: Immediately after /rewind (before any new prompt is appended), SQLite conversations/<cid>.db caps active steps."""
    agy_dir = tmp_path / "agy_rewind_sqlite_cap"
    agy_dir.mkdir(parents=True)
    cid = "conv-rewind-261-b"
    _init_agy_summary_db(agy_dir, cid)

    tx_dir = agy_dir / "brain" / cid / ".system_generated" / "logs"
    tx_dir.mkdir(parents=True)
    steps = [
        {
            "step_index": 0,
            "type": "USER_INPUT",
            "created_at": "2026-11-22T18:10:00Z",
            "content": "<USER_REQUEST>First surviving prompt.</USER_REQUEST>",
        },
        {
            "step_index": 1,
            "type": "PLANNER_RESPONSE",
            "created_at": "2026-11-22T18:10:05Z",
            "content": "First surviving reply.",
        },
        {
            "step_index": 2,
            "type": "USER_INPUT",
            "created_at": "2026-11-22T18:12:00Z",
            "content": "<USER_REQUEST>Second prompt just rewound in terminal.</USER_REQUEST>",
        },
        {
            "step_index": 3,
            "type": "PLANNER_RESPONSE",
            "created_at": "2026-11-22T18:12:08Z",
            "content": "Second reply just rewound in terminal.",
        },
    ]
    (tx_dir / "transcript.jsonl").write_text(
        "\n".join(json.dumps(s) for s in steps) + "\n",
        encoding="utf-8",
    )

    # Create conversations/<cid>.db where AGY already deleted idx 2 and 3 upon /rewind
    conv_dir = agy_dir / "conversations"
    conv_dir.mkdir(parents=True)
    conv_db = conv_dir / f"{cid}.db"
    c_conn = sqlite3.connect(str(conv_db))
    c_conn.execute("CREATE TABLE steps (idx INTEGER PRIMARY KEY, step_type INTEGER NOT NULL DEFAULT 0)")
    c_conn.executemany("INSERT INTO steps (idx, step_type) VALUES (?, 0)", [(0,), (1,)])
    c_conn.commit()
    c_conn.close()

    monkeypatch.setenv("AIM_AGY_APP_DATA_DIR", str(agy_dir))
    monkeypatch.setenv("AIM_FORENSICS_DIR", str(tmp_path / "empty_vault_b"))

    resp = client.get(
        "/api/sessions/aim-connect/live-turns",
        headers={"x-api-token": admin_token},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["turn_count"] == 1
    assert payload["turns"][0]["user"] == "First surviving prompt."

    # Also verify full rewind back to 0 rows in `steps` erases all turns cleanly
    c_conn = sqlite3.connect(str(conv_db))
    c_conn.execute("DELETE FROM steps")
    c_conn.commit()
    c_conn.close()

    resp_empty = client.get(
        "/api/sessions/aim-connect/live-turns",
        headers={"x-api-token": admin_token},
    )
    assert resp_empty.status_code == 200
    assert resp_empty.json()["turn_count"] == 0


def test_issue_261_frontend_bottom_scroll_and_persistent_browser_contracts():
    """#261: Verify bottom-scroll anchoring on session switch and persistent Browser split-pane behavior."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    chat_jsx = (FRONTEND_SRC / "components" / "LiveTranscriptStage.jsx").read_text(encoding="utf-8")
    tmux_jsx = (FRONTEND_SRC / "components" / "TmuxServerStage.jsx").read_text(encoding="utf-8")
    browser_jsx = (FRONTEND_SRC / "components" / "BrowserPane.jsx").read_text(encoding="utf-8")

    # 1. LiveTranscriptStage waits for loadedFor === activeSession in useLayoutEffect before clearing needsBottomAnchorRef
    assert "useLayoutEffect" in chat_jsx
    assert "needsBottomAnchorRef" in chat_jsx
    assert "turnsData.loadedFor !== activeSession" in chat_jsx
    assert "onReconcileOptimistic" in chat_jsx

    # 2. TmuxServerStage & App.jsx scroll panes and xterm to bottom when switching sessions
    assert "needsInitialPaneScrollRef" in tmux_jsx
    assert "pre.scrollTop = pre.scrollHeight" in tmux_jsx
    assert "pendingSessionBottomScrollRef" in app_jsx
    assert "scrollToBottom" in app_jsx

    # 3. switchToSession never closes showBrowser when switching to another session
    switch_block = app_jsx.split("const switchToSession = (newSession) => {")[1].split("const sendSessionCommand")[0]
    assert "setShowBrowser(false)" not in switch_block
    assert "setPreferredBrowserTargetId" in switch_block

    # 4. BrowserPane keeps /ws/browser open across preferredTargetId changes and auto-focuses associated tab when present
    assert "[isOpen, connectScreencast, refreshStatus]" in browser_jsx
    assert "preferredTargetIdRef" in browser_jsx
    assert "if (byOwner && byOwner.id !== activeTargetRef.current)" in browser_jsx
