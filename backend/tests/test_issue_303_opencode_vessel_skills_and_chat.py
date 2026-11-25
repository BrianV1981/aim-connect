import json
import sqlite3
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import main
import routes_forensics as rf
import routes_sessions as rs


@pytest.fixture
def admin_token():
    tok = "test-admin-token-303"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_opencode_pane_with_gemini_in_scrollback_is_classified_as_opencode():
    """#303: Authoritative command='opencode' must NEVER be overridden by 'Gemini ' or 'agy --conversation' in scrollback."""
    pane_scrollback = """
    768-dim output config across Ollama/Gemini embeddings
    Resume with -c (or command below):
    agy --conversation=fa26d4c1-8685-49fb-96d7-339439258c33

    🔊 All systems are green and ready for directives.

    ▣  Build · DeepSeek V4.1 Flash 1017 · 28.2s
    ┃  Build auto · DeepSeek V4.1 Flash 1017 DeepSeek · high
                                                    23.7K (2%) · $0.00  ctrl+p commands
    """
    parsed = rs.parse_pane_telemetry(pane_scrollback, command="opencode", session_name="aim-joshua")
    assert parsed["vessel"] == "opencode"
    assert parsed["tokens_used"] == 23700
    assert parsed["context_pct"] == 2.0
    assert parsed["spoken_summary"] == "All systems are green and ready for directives."


def test_detect_session_vessel_and_strict_per_vessel_skill_scoping(tmp_path, admin_token):
    """#303: _detect_session_vessel passes command=... properly and _skill_dirs_for_vessel isolates .opencode/skills vs .gemini/skills."""
    cwd = tmp_path / "aim-joshua"
    (cwd / ".gemini" / "skills" / "agy-only-skill").mkdir(parents=True)
    (cwd / ".gemini" / "skills" / "agy-only-skill" / "SKILL.md").write_text(
        "---\nname: agy-only-skill\ndescription: AGY specific skill\n---\n",
        encoding="utf-8",
    )
    (cwd / ".opencode" / "skills" / "oc-only-skill").mkdir(parents=True)
    (cwd / ".opencode" / "skills" / "oc-only-skill" / "SKILL.md").write_text(
        "---\nname: oc-only-skill\ndescription: OpenCode specific skill\n---\n",
        encoding="utf-8",
    )
    (cwd / ".agents" / "skills" / "shared-agent-skill").mkdir(parents=True)
    (cwd / ".agents" / "skills" / "shared-agent-skill" / "SKILL.md").write_text(
        "---\nname: shared-agent-skill\ndescription: Cross-vessel skill\n---\n",
        encoding="utf-8",
    )

    mock_panes = MagicMock(returncode=0, stdout="1\topencode\n")
    mock_cap = MagicMock(returncode=0, stdout="Gemini mentioned in scrollback\n23.7K (2%) · $0.00  ctrl+p commands\n")

    with patch("routes_forensics.subprocess.run", side_effect=[mock_panes, mock_cap]):
        detected = rf._detect_session_vessel("aim-joshua", explicit_vessel="")
    assert detected == "opencode"

    oc_dirs = rf._skill_dirs_for_vessel("opencode", str(cwd))
    assert any(d.endswith(".opencode/skills") for d in oc_dirs)
    assert any(d.endswith(".agents/skills") for d in oc_dirs)
    assert not any(d.endswith(".gemini/skills") for d in oc_dirs)

    client = TestClient(main.app)
    with (
        patch("routes_forensics._detect_session_vessel", return_value="opencode"),
        patch("routes_forensics._resolve_session_cwd", return_value=str(cwd)),
        patch("routes_forensics.HOME_DIR", str(tmp_path / "empty_home")),
    ):
        resp = client.get("/api/sessions/aim-joshua/slash-commands", headers={"x-api-token": admin_token})
    assert resp.status_code == 200
    body = resp.json()
    assert body["vessel"] == "opencode"
    cmds = {c["cmd"]: c for c in body["commands"]}
    assert "/models" in cmds  # OpenCode builtin
    assert "/teamwork" not in cmds  # AGY-only builtin must NOT appear
    assert "/oc-only-skill" in cmds
    assert "/shared-agent-skill" in cmds
    assert "/agy-only-skill" not in cmds  # AGY-only repo skill must NOT leak


def test_opencode_sqlite_live_turns_history_and_forensics(tmp_path, monkeypatch, admin_token):
    """#303: Verify opencode.db (?mode=ro) powers Chat View (/live-turns), History (/sessions/history), and Forensics."""
    proj_dir = tmp_path / "aim-joshua"
    proj_dir.mkdir(parents=True)

    oc_dir = tmp_path / "opencode_share"
    oc_dir.mkdir()
    db_path = oc_dir / "opencode.db"

    conn = sqlite3.connect(str(db_path))
    conn.execute(
        """
        CREATE TABLE session (
            id TEXT PRIMARY KEY,
            parent_id TEXT,
            title TEXT,
            directory TEXT,
            time_created INTEGER,
            time_updated INTEGER,
            tokens_input INTEGER,
            tokens_cache_read INTEGER
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE message (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            time_created INTEGER,
            data TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE part (
            id TEXT PRIMARY KEY,
            message_id TEXT,
            session_id TEXT,
            time_created INTEGER,
            data TEXT
        )
        """
    )

    now_ms = int(time.time() * 1000)
    conn.execute(
        "INSERT INTO session VALUES (?, NULL, ?, ?, ?, ?, ?, ?)",
        ("ses_test_oc_1", "J.O.S.H.U.A. standby verification", str(proj_dir), now_ms - 5000, now_ms, 23700, 0),
    )
    conn.execute(
        "INSERT INTO message VALUES (?, ?, ?, ?)",
        ("msg_u1", "ses_test_oc_1", now_ms - 4000, json.dumps({"role": "user"})),
    )
    conn.execute(
        "INSERT INTO part VALUES (?, ?, ?, ?, ?)",
        ("prt_u1", "msg_u1", "ses_test_oc_1", now_ms - 4000, json.dumps({"type": "text", "text": "Verify baseline checks"})),
    )
    conn.execute(
        "INSERT INTO message VALUES (?, ?, ?, ?)",
        ("msg_a1", "ses_test_oc_1", now_ms - 2000, json.dumps({"role": "assistant"})),
    )
    conn.execute(
        "INSERT INTO part VALUES (?, ?, ?, ?, ?)",
        ("prt_a1_r", "msg_a1", "ses_test_oc_1", now_ms - 2000, json.dumps({"type": "reasoning", "text": "Running doctor check."})),
    )
    conn.execute(
        "INSERT INTO part VALUES (?, ?, ?, ?, ?)",
        (
            "prt_a1_t",
            "msg_a1",
            "ses_test_oc_1",
            now_ms - 1500,
            json.dumps(
                {
                    "type": "tool",
                    "tool": "read",
                    "callID": "call_01",
                    "state": {
                        "status": "completed",
                        "input": {"filePath": f"{proj_dir}/AGENTS.md"},
                        "output": "# J.O.S.H.U.A.",
                    },
                }
            ),
        ),
    )
    conn.execute(
        "INSERT INTO part VALUES (?, ?, ?, ?, ?)",
        (
            "prt_a1_txt",
            "msg_a1",
            "ses_test_oc_1",
            now_ms - 1000,
            json.dumps({"type": "text", "text": "Baseline verified.\n\n🔊 All systems green on OpenCode."}),
        ),
    )
    conn.commit()
    conn.close()

    monkeypatch.setenv("AIM_OPENCODE_DATA_DIR", str(oc_dir))
    monkeypatch.setenv("AIM_AGY_APP_DATA_DIR", str(tmp_path / "no_agy"))
    monkeypatch.setenv("AIM_GROK_HOME", str(tmp_path / "no_grok"))
    monkeypatch.setenv("AIM_FORENSICS_DIR", str(tmp_path / "no_vault"))

    client = TestClient(main.app)
    with patch("routes_forensics._detect_active_session_pane_hint", return_value=("OC", str(proj_dir))):
        live_resp = client.get("/api/sessions/aim-joshua/live-turns", headers={"x-api-token": admin_token})
    assert live_resp.status_code == 200
    ldata = live_resp.json()
    assert ldata["vessel"] == "OC"
    assert ldata["turn_count"] == 1
    t0 = ldata["turns"][0]
    assert t0["user"] == "Verify baseline checks"
    assert t0["body"] == "Baseline verified."
    assert t0["spoken"] == "All systems green on OpenCode."
    assert any("read(" in pill and "AGENTS.md" in pill for pill in t0["tools"])

    hist_resp = client.get("/api/sessions/history?session=aim-joshua", headers={"x-api-token": admin_token})
    assert hist_resp.status_code == 200
    hrecs = hist_resp.json()["records"]
    assert len(hrecs) == 1
    assert hrecs[0]["vessel"] == "OC"
    assert hrecs[0]["id"] == "ses_test_oc_1"

    turns_resp = client.get("/api/sessions/history/ses_test_oc_1/turns", headers={"x-api-token": admin_token})
    assert turns_resp.status_code == 200
    assert turns_resp.json()["turn_count"] == 1
