import os
import subprocess
import time
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

import main  # noqa: F401 — ensure main initializes before routes_sessions
import routes_sessions


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def valid_token():
    tok = "test-admin-token-209"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 3600,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_compute_30pct_rule_tier_boundaries():
    """Verify J.O.S.H.U.A. 30%-Rule context saturation tiers (#209)."""
    assert routes_sessions.compute_30pct_rule_tier(0.0) == "normal"
    assert routes_sessions.compute_30pct_rule_tier(19.9) == "normal"
    assert routes_sessions.compute_30pct_rule_tier(20.0) == "warning"
    assert routes_sessions.compute_30pct_rule_tier(29.9) == "warning"
    assert routes_sessions.compute_30pct_rule_tier(30.0) == "critical"
    assert routes_sessions.compute_30pct_rule_tier(65.4) == "critical"


def test_parse_pane_telemetry_agy_thinking_and_critical_context():
    """AGY status bar with 463.2k in | 1.9k out and spinner -> agy, THINKING, 46.3%, critical."""
    pane_text = (
        "● Bash(pytest -q) (ctrl+o to expand)\n"
        "⢿ Working... (esc to cancel)\n"
        "Gemini 4 Argon · high | 463.2k in | 1.9k out | Ctrl+P commands\n"
    )
    res = routes_sessions.parse_pane_telemetry(pane_text, command="agy.real", session_name="aim-connect")
    assert res["vessel"] == "agy"
    assert res["status"] == "THINKING"
    assert res["tokens_used"] == 463200
    assert res["tokens_limit"] == 1000000
    assert res["context_pct"] == 46.3
    assert res["tier"] == "critical"


def test_parse_pane_telemetry_warning_and_normal_tiers():
    """Verify warning (20-30%) and normal (<20%) token parsing across vessel formats."""
    warn_pane = "Grok CLI v1.2\n50k / 200k tokens\n> Ready for prompt"
    res_warn = routes_sessions.parse_pane_telemetry(warn_pane, command="grok", session_name="aim-grok")
    assert res_warn["vessel"] == "grok"
    assert res_warn["status"] == "IDLE"
    assert res_warn["tokens_used"] == 50000
    assert res_warn["tokens_limit"] == 200000
    assert res_warn["context_pct"] == 25.0
    assert res_warn["tier"] == "warning"

    norm_pane = "Gemini 4 Argon | 125.0k in | 0.5k out\n> "
    res_norm = routes_sessions.parse_pane_telemetry(norm_pane, command="agy", session_name="aim-joshua")
    assert res_norm["vessel"] == "agy"
    assert res_norm["status"] == "IDLE"
    assert res_norm["tokens_used"] == 125000
    assert res_norm["context_pct"] == 12.5
    assert res_norm["tier"] == "normal"


def test_parse_pane_telemetry_error_and_service_detection():
    """Verify ERROR state detection and service vessel classification."""
    err_pane = "Starting server...\nTraceback (most recent call last):\n  File 'main.py', line 1\n"
    res = routes_sessions.parse_pane_telemetry(err_pane, command="uvicorn", session_name="aim-connect-workspace")
    assert res["vessel"] == "service"
    assert res["status"] == "ERROR"


def test_get_git_branch_standard_and_worktree(tmp_path):
    """_get_git_branch resolves both standard .git/HEAD and worktree .git file pointers."""
    repo_dir = tmp_path / "repo"
    git_dir = repo_dir / ".git"
    worktrees_dir = git_dir / "worktrees" / "issue-209"
    worktrees_dir.mkdir(parents=True)
    (git_dir / "HEAD").write_text("ref: refs/heads/master\n", encoding="utf-8")
    (worktrees_dir / "HEAD").write_text("ref: refs/heads/fix/issue-209\n", encoding="utf-8")

    assert routes_sessions._get_git_branch(str(repo_dir)) == "master"

    wt_dir = repo_dir / "workspace" / "issue-209"
    wt_dir.mkdir(parents=True)
    (wt_dir / ".git").write_text(f"gitdir: {worktrees_dir}\n", encoding="utf-8")
    assert routes_sessions._get_git_branch(str(wt_dir)) == "fix/issue-209"


def test_get_sessions_and_fleet_panes_endpoint(client, valid_token, tmp_path):
    """GET /api/sessions and GET /api/fleet/panes return backward-compatible sessions + fleet telemetry."""
    repo_dir = tmp_path / "aim-connect" / "workspace" / "issue-209"
    (repo_dir / ".git").mkdir(parents=True)
    (repo_dir / ".git" / "HEAD").write_text("ref: refs/heads/fix/issue-209\n", encoding="utf-8")

    def fake_run(cmd, *args, **kwargs):
        m = MagicMock()
        m.returncode = 0
        m.stderr = ""
        if cmd[:2] == ["tmux", "ls"]:
            m.stdout = "aim-connect\naim-joshua\n"
        elif cmd[:2] == ["tmux", "list-panes"]:
            m.stdout = (
                f"aim-connect@@@0@@@main@@@0@@@agy.real@@@{repo_dir}@@@1234@@@1\n"
                f"aim-joshua@@@0@@@main@@@0@@@agy.real@@@{tmp_path}@@@5678@@@0\n"
            )
        elif cmd[:2] == ["tmux", "capture-pane"]:
            target = cmd[cmd.index("-t") + 1]
            if target.startswith("aim-connect"):
                m.stdout = "⢿ Working...\nGemini 4 Argon | 310.0k in | 2.0k out\n"
            else:
                m.stdout = "Gemini 4 Argon | 110.0k in | 0.9k out\n> Ready\n"
        else:
            m.stdout = ""
        return m

    with patch("routes_sessions.subprocess.run", side_effect=fake_run), patch(
        "routes_sessions._resolve_agy_brain_tokens_by_workspace", return_value={}
    ):
        resp = client.get("/api/sessions", headers={"x-api-token": valid_token})
        assert resp.status_code == 200
        data = resp.json()
        assert data["sessions"] == ["aim-connect", "aim-joshua"]
        assert len(data["fleet"]) == 2
        c_meta = next(item for item in data["fleet"] if item["session_name"] == "aim-connect")
        assert c_meta["vessel"] == "agy"
        assert c_meta["status"] == "THINKING"
        assert c_meta["branch"] == "fix/issue-209"
        assert c_meta["is_worktree"] is True
        assert c_meta["context_pct"] == 31.0
        assert c_meta["tier"] == "critical"

        resp_panes = client.get("/api/fleet/panes", headers={"x-api-token": valid_token})
        assert resp_panes.status_code == 200
        assert len(resp_panes.json()["panes"]) == 2


def test_send_session_command_two_step_tmux_protocol(client, valid_token):
    """POST /api/sessions/{name}/command uses set-buffer + paste-buffer + separate Enter."""
    calls = []

    def fake_run(cmd, *args, **kwargs):
        calls.append(cmd)
        m = MagicMock()
        m.returncode = 0
        m.stdout = ""
        m.stderr = ""
        return m

    with patch("routes_sessions.subprocess.run", side_effect=fake_run), patch("routes_sessions.time.sleep"):
        resp = client.post(
            "/api/sessions/aim-connect/command",
            headers={"x-api-token": valid_token},
            json={"command": "/aim-memory-wiki"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "sent"
        assert calls == [
            ["tmux", "set-buffer", "--", "/aim-memory-wiki"],
            ["tmux", "paste-buffer", "-t", "aim-connect"],
            ["tmux", "send-keys", "-t", "aim-connect", "Enter"],
        ]

    # Invalid session name rejected
    bad_resp = client.post(
        "/api/sessions/bad;name/command",
        headers={"x-api-token": valid_token},
        json={"command": "/aim-handoff"},
    )
    assert bad_resp.status_code == 400


def test_execute_bracketed_paste_no_enter_sent():
    """execute_bracketed_paste loads buffer via stdin and pastes with -p -r without Enter (#216)."""
    import asyncio
    import ws_handler

    spawned_cmds = []
    communicated_inputs = []

    class FakeProc:
        def __init__(self):
            self.returncode = 0

        async def communicate(self, input=None):
            communicated_inputs.append(input)
            return (b"", b"")

        async def wait(self):
            return 0

    async def fake_create_subprocess_exec(*cmd, **kwargs):
        spawned_cmds.append(list(cmd))
        return FakeProc()

    with patch("ws_handler.asyncio.create_subprocess_exec", side_effect=fake_create_subprocess_exec):
        ok = asyncio.run(
            ws_handler.execute_bracketed_paste("aim-connect", "# HANDOFF\r\nLine 1\nLine 2\n\n")
        )
        assert ok is True
        assert communicated_inputs == [b"# HANDOFF\nLine 1\nLine 2"]
        assert spawned_cmds == [
            ["tmux", "load-buffer", "-"],
            ["tmux", "paste-buffer", "-p", "-r", "-t", "aim-connect"],
        ]
        # Must NEVER send Enter
        assert not any("Enter" in c for c in spawned_cmds)


def test_ws_handler_no_shadowed_imports_in_functions():
    """Ensure asyncio, re, os, json, subprocess are never shadowed by inner imports in ws_handler (#217)."""
    import ast
    import os
    import ws_handler

    with open(ws_handler.__file__, "r", encoding="utf-8") as fh:
        tree = ast.parse(fh.read())

    top_level_modules = {"asyncio", "re", "os", "json", "subprocess"}
    shadowed = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for child in ast.walk(node):
                if isinstance(child, ast.Import):
                    for alias in child.names:
                        bound_name = alias.asname or alias.name
                        if bound_name in top_level_modules:
                            shadowed.append((node.name, bound_name, child.lineno))
    assert shadowed == [], f"Shadowed top-level imports inside functions: {shadowed}"


def test_resolve_agy_brain_tokens_and_telemetry_enrichment(tmp_path):
    """_resolve_agy_brain_tokens_by_workspace sums input_tokens + cache_read_tokens and enriches fleet (#218)."""
    import json
    import sqlite3
    from routes_sessions import (
        _resolve_agy_brain_tokens_by_workspace,
        collect_fleet_telemetry,
    )

    app_data = tmp_path / "agy_data"
    app_data.mkdir(parents=True)
    db_path = app_data / "conversation_summaries.db"
    cid = "test-conv-218"
    tx_dir = app_data / "brain" / cid / ".system_generated" / "logs"
    tx_dir.mkdir(parents=True)
    tx_file = tx_dir / "transcript.jsonl"
    tx_file.write_text(
        json.dumps(
            {
                "step_index": 1,
                "type": "PLANNER_RESPONSE",
                "input_tokens": 2515,
                "cache_read_tokens": 241782,
                "output_tokens": 410,
            }
        )
        + "\n",
        encoding="utf-8",
    )

    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE conversation_summaries ("
        "conversation_id TEXT, workspace_uris TEXT, nesting_depth INTEGER, last_modified_time TEXT)"
    )
    repo_root = tmp_path / "aim-tmux-dashboard"
    repo_root.mkdir(parents=True)
    conn.execute(
        "INSERT INTO conversation_summaries VALUES (?, ?, 0, '2026-10-26 23:00:00')",
        (cid, json.dumps([f"file://{repo_root}/workspace/issue-45"])),
    )
    conn.commit()
    conn.close()

    tokens_map = _resolve_agy_brain_tokens_by_workspace(app_data_dir=str(app_data))
    assert tokens_map[str(repo_root)] == 244297
    assert tokens_map["aim-tmux-dashboard"] == 244297

    def fake_run(cmd, *args, **kwargs):
        m = MagicMock()
        m.returncode = 0
        m.stderr = ""
        if cmd[:2] == ["tmux", "list-panes"]:
            m.stdout = f"aim-dash@@@0@@@main@@@0@@@agy.real@@@{repo_root}@@@1234@@@1\n"
        elif cmd[:2] == ["tmux", "capture-pane"]:
            # TUI footer only shows uncached 2.5k in
            m.stdout = "Gemini 4 Argon | 2.5k in | 0.4k out\n"
        else:
            m.stdout = ""
        return m

    with patch("routes_sessions.subprocess.run", side_effect=fake_run), patch(
        "routes_sessions._resolve_agy_brain_tokens_by_workspace", return_value=tokens_map
    ):
        fleet, _ = collect_fleet_telemetry(["aim-dash"])
        assert len(fleet) == 1
        assert fleet[0]["tokens_used"] == 244297
        assert fleet[0]["tokens_limit"] == 1_000_000
        assert fleet[0]["context_pct"] == 24.4
        assert fleet[0]["tier"] == "critical"


def test_parse_pane_telemetry_waiting_and_historical_idle_detection():
    """Detect WAITING prompts on footer lines and avoid false THINKING on historical lines (#220)."""
    waiting_pane = (
        "● Run command: rm -rf tmp_build\n"
        "Do you want to proceed? [y/N]\n"
        "1. Allow once\n"
        "2. Allow always\n"
    )
    res_wait = routes_sessions.parse_pane_telemetry(waiting_pane, command="agy.real", session_name="aim-connect")
    assert res_wait["status"] == "WAITING"

    # Historical "Running command" 6 lines up should NOT trigger THINKING when footer is idle prompt
    idle_with_history = (
        "● Running command pytest -q\n"
        "136 passed in 1.12s\n"
        "All tests succeeded.\n"
        "Ready for next instruction.\n"
        "────────────────────────────────────────\n"
        "❯ \n"
        "────────────────────────────────────────\n"
        "? for shortcuts                                         Gemini 4 Argon | 120.0k in | 1.1k out\n"
    )
    res_idle = routes_sessions.parse_pane_telemetry(idle_with_history, command="agy.real", session_name="aim-connect")
    assert res_idle["status"] == "IDLE"


def test_is_direct_local_loopback_security_guard():
    """Verify is_direct_local_loopback only allows unproxied 127.0.0.1/::1 with localhost/127.0.0.1 Host (#221)."""
    from types import SimpleNamespace
    from main import is_direct_local_loopback

    def make_req(client_host, headers):
        return SimpleNamespace(client=SimpleNamespace(host=client_host), headers=headers)

    # Direct local loopback allowed
    assert is_direct_local_loopback(make_req("127.0.0.1", {"host": "127.0.0.1:8000"})) is True
    assert is_direct_local_loopback(make_req("::1", {"host": "localhost:8000"})) is True

    # Cloudflare tunnel or reverse proxy headers MUST be rejected even from 127.0.0.1
    assert (
        is_direct_local_loopback(
            make_req("127.0.0.1", {"host": "127.0.0.1:8000", "cf-connecting-ip": "203.0.113.5"})
        )
        is False
    )
    assert (
        is_direct_local_loopback(
            make_req("127.0.0.1", {"host": "127.0.0.1:8000", "x-forwarded-for": "203.0.113.5"})
        )
        is False
    )
    assert is_direct_local_loopback(make_req("127.0.0.1", {"host": "api.leaddeeds.com"})) is False
    assert is_direct_local_loopback(make_req("192.168.1.50", {"host": "localhost:8000"})) is False


def test_extract_spoken_summary_and_telemetry_integration(client, valid_token):
    """Verify 🔊 Spoken Summary extraction from pane output, multiline wraps, template filtering, and scrollback endpoint (#222)."""
    pane_with_summary = (
        "Updated AGENTS.md with the Spoken Summary rule:\n"
        "- Format: `🔊 <1-2 sentence natural spoken summary>`\n"
        "\n"
        "🔊 I have updated the agent rules to include a clean spoken summary line\n"
        "at the end of every reply. Would you like me to wire the browser UI?\n"
        "────────────────────────────────────────\n"
        "❯ \n"
        "────────────────────────────────────────\n"
        "? for shortcuts                                         Gemini 4 Argon | 140.2k in | 0.8k out\n"
    )
    summary = routes_sessions.extract_spoken_summary(pane_with_summary)
    assert summary == (
        "I have updated the agent rules to include a clean spoken summary line "
        "at the end of every reply. Would you like me to wire the browser UI?"
    )

    telemetry = routes_sessions.parse_pane_telemetry(
        pane_with_summary, command="agy.real", session_name="aim-connect"
    )
    assert telemetry["spoken_summary"] == summary

    # Without a 🔊 line, default extraction returns empty string, while fallback=True returns latest clean content line
    pane_without_tag = (
        "All 138 backend tests passed in 5.4s.\n"
        "────────────────────────────────────────\n"
        "❯ \n"
        "? for shortcuts                                         Gemini 4 Argon | 140.2k in | 0.8k out\n"
    )
    assert routes_sessions.extract_spoken_summary(pane_without_tag, fallback=False) == ""
    assert routes_sessions.extract_spoken_summary(pane_without_tag, fallback=True) == "All 138 backend tests passed in 5.4s."

    mock_res = MagicMock(returncode=0, stdout=pane_with_summary, stderr="")
    with patch("routes_sessions.subprocess.run", return_value=mock_res):
        resp = client.get("/api/scrollback/aim-connect?lines=200", headers={"x-api-token": valid_token})
        assert resp.status_code == 200
        data = resp.json()
        assert data["spoken_summary"] == summary

    # Multi-paragraph 🔊 spoken summary separated by blank lines up to the prompt border (#224)
    multi_para_pane = (
        "### Detailed Analysis\n"
        "- Item 1\n"
        "\n"
        "🔊 Here is the first paragraph of the spoken briefing explaining the architecture.\n"
        "It wraps across multiple terminal lines cleanly.\n"
        "\n"
        "Here is the second paragraph elaborating on trade-offs and offline Piper latency.\n"
        "Would you like me to proceed with this plan?\n"
        "────────────────────────────────────────\n"
        "❯ \n"
        "────────────────────────────────────────\n"
        "? for shortcuts                                         Gemini 4 Argon | 142.0k in | 1.2k out\n"
    )
    multi_summary = routes_sessions.extract_spoken_summary(multi_para_pane)
    assert "first paragraph of the spoken briefing" in multi_summary
    assert "second paragraph elaborating on trade-offs" in multi_summary
    assert "Would you like me to proceed with this plan?" in multi_summary



def test_tts_voices_and_synthesis_piper_and_edge(client, valid_token, monkeypatch):
    """Verify /api/tts/voices and /api/tts for Piper offline WAV, Edge MP3, and Edge-to-Piper offline fallback (#223)."""
    resp_v = client.get("/api/tts/voices", headers={"x-api-token": valid_token})
    assert resp_v.status_code == 200
    assert "media-src 'self' blob: data:" in resp_v.headers.get("content-security-policy", "")
    voices = resp_v.json().get("voices", [])
    voice_ids = {v["id"] for v in voices}
    assert "piper:en_GB-alan-medium" in voice_ids
    assert "edge:en-US-BrianNeural" in voice_ids
    assert "browser:default" in voice_ids

    # 1. Piper synthesis returns audio/wav
    with patch("routes_sessions._synthesize_piper_wav", return_value=b"RIFF1234WAVEfmt ") as mock_piper:
        r_piper = client.post(
            "/api/tts",
            headers={"x-api-token": valid_token},
            json={"text": "🔊 Offline neural synthesis ready.", "voice": "piper:en_GB-alan-medium"},
        )
        assert r_piper.status_code == 200
        assert r_piper.headers["content-type"].startswith("audio/wav")
        assert r_piper.headers.get("x-tts-engine") == "piper:en_GB-alan-medium"
        assert r_piper.content == b"RIFF1234WAVEfmt "
        assert mock_piper.call_args[0][0] == "Offline neural synthesis ready."

    # 2. Edge synthesis returns audio/mpeg
    async def fake_edge_ok(text, voice):
        return b"ID3-FAKE-MP3-BYTES"

    with patch("routes_sessions._synthesize_edge_mp3", side_effect=fake_edge_ok):
        r_edge = client.post(
            "/api/tts",
            headers={"x-api-token": valid_token},
            json={"text": "Cloud neural synthesis ready.", "voice": "edge:en-US-BrianNeural"},
        )
        assert r_edge.status_code == 200
        assert r_edge.headers["content-type"].startswith("audio/mpeg")
        assert r_edge.headers.get("x-tts-engine") == "edge:en-US-BrianNeural"
        assert r_edge.content == b"ID3-FAKE-MP3-BYTES"

    # 3. When Edge fails (e.g. offline), /api/tts automatically falls back to offline Piper WAV
    async def fake_edge_offline(text, voice):
        raise RuntimeError("Network unreachable")

    with patch("routes_sessions._synthesize_edge_mp3", side_effect=fake_edge_offline), patch(
        "routes_sessions._synthesize_piper_wav", return_value=b"RIFF-FALLBACK-WAV"
    ):
        r_fb = client.post(
            "/api/tts",
            headers={"x-api-token": valid_token},
            json={"text": "Fallback test.", "voice": "edge:en-US-BrianNeural"},
        )
        assert r_fb.status_code == 200
        assert r_fb.headers["content-type"].startswith("audio/wav")
        assert r_fb.headers.get("x-tts-engine") == "piper:en_GB-alan-medium"
        assert r_fb.content == b"RIFF-FALLBACK-WAV"


def test_agy_brain_tokens_override_inflated_tui_sum_and_beyond_40_rows(tmp_path):
    """Brain transcript tokens must override inflated multi-step TUI turn sums and resolve beyond row 40 (#225)."""
    import json
    import sqlite3
    from routes_sessions import (
        _resolve_agy_brain_tokens_by_workspace,
        collect_fleet_telemetry,
    )

    app_data = tmp_path / "agy_data_225"
    app_data.mkdir(parents=True)
    db_path = app_data / "conversation_summaries.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE conversation_summaries ("
        "conversation_id TEXT, workspace_uris TEXT, nesting_depth INTEGER, last_modified_time TEXT)"
    )

    # Insert 50 newer rows for a busy repo (aim-ld) so older workspaces sit past row 40
    busy_repo = tmp_path / "aim-ld"
    busy_repo.mkdir(parents=True)
    for i in range(50):
        cid = f"busy-conv-{i:03d}"
        if i == 0:
            tx_dir = app_data / "brain" / cid / ".system_generated" / "logs"
            tx_dir.mkdir(parents=True)
            (tx_dir / "transcript.jsonl").write_text(
                json.dumps(
                    {
                        "step_index": 1,
                        "type": "PLANNER_RESPONSE",
                        "input_tokens": 4500,
                        "cache_read_tokens": 62000,
                    }
                )
                + "\n",
                encoding="utf-8",
            )
        conn.execute(
            "INSERT INTO conversation_summaries VALUES (?, ?, 0, ?)",
            (cid, json.dumps([f"file://{busy_repo}"]), f"2026-10-28 08:{i:02d}:00"),
        )

    # Row #51: An aborted 0-token conversation for aim-ayrianna (should NOT mask Row #52)
    ayrianna_repo = tmp_path / "aim-ayrianna"
    ayrianna_repo.mkdir(parents=True)
    conn.execute(
        "INSERT INTO conversation_summaries VALUES (?, ?, 0, '2026-10-22 01:00:00')",
        ("ayrianna-empty", json.dumps([f"file://{ayrianna_repo}"])),
    )

    # Row #52: Active conversation for aim-ayrianna (140,397 tokens)
    tx_ayr = app_data / "brain" / "ayrianna-active" / ".system_generated" / "logs"
    tx_ayr.mkdir(parents=True)
    (tx_ayr / "transcript.jsonl").write_text(
        json.dumps(
            {
                "step_index": 42,
                "type": "PLANNER_RESPONSE",
                "input_tokens": 2397,
                "cache_read_tokens": 138000,
            }
        )
        + "\n",
        encoding="utf-8",
    )
    conn.execute(
        "INSERT INTO conversation_summaries VALUES (?, ?, 0, '2026-10-21 02:30:08')",
        ("ayrianna-active", json.dumps([f"file://{ayrianna_repo}"])),
    )

    # Row #53: aim-dash with 150,580 ground-truth tokens (while TUI shows 279.2k multi-step turn sum)
    dash_repo = tmp_path / "aim-tmux-dashboard"
    dash_repo.mkdir(parents=True)
    tx_dash = app_data / "brain" / "dash-active" / ".system_generated" / "logs"
    tx_dash.mkdir(parents=True)
    (tx_dash / "transcript.jsonl").write_text(
        json.dumps(
            {
                "step_index": 159,
                "type": "PLANNER_RESPONSE",
                "input_tokens": 3289,
                "cache_read_tokens": 147291,
            }
        )
        + "\n",
        encoding="utf-8",
    )
    conn.execute(
        "INSERT INTO conversation_summaries VALUES (?, ?, 0, '2026-10-20 12:00:00')",
        ("dash-active", json.dumps([f"file://{dash_repo}"])),
    )
    conn.commit()
    conn.close()

    # Isolated bwrap tenant workspace brain directory (agent-op_tenant1/brain/<cid>/.../transcript.jsonl)
    aw_root = tmp_path / "agent_workspaces"
    tenant_tx = aw_root / "agent-op_tenant1" / "brain" / "tenant-conv-1" / ".system_generated" / "logs"
    tenant_tx.mkdir(parents=True)
    (tenant_tx / "transcript.jsonl").write_text(
        json.dumps(
            {
                "step_index": 12,
                "type": "PLANNER_RESPONSE",
                "input_tokens": 4557,
                "cache_read_tokens": 215000,
            }
        )
        + "\n",
        encoding="utf-8",
    )

    tokens_map = _resolve_agy_brain_tokens_by_workspace(
        app_data_dir=str(app_data),
        agent_workspaces_dir=str(aw_root),
    )
    assert tokens_map[str(ayrianna_repo)] == 140397
    assert tokens_map["aim-ayrianna"] == 140397
    assert tokens_map[str(dash_repo)] == 150580
    assert tokens_map["agent-op_tenant1"] == 219557

    def fake_run(cmd, *args, **kwargs):
        m = MagicMock()
        m.returncode = 0
        m.stderr = ""
        if cmd[:2] == ["tmux", "list-panes"]:
            m.stdout = (
                f"aim-dash@@@0@@@main@@@0@@@agy.real@@@{dash_repo}@@@1234@@@1\n"
                f"aim-ayrianna@@@0@@@main@@@0@@@agy.real@@@{ayrianna_repo}@@@1235@@@0\n"
                f"agent-op_tenant1-admin-cli@@@0@@@main@@@0@@@bwrap@@@{tmp_path}/backend@@@1236@@@0\n"
            )
        elif cmd[:2] == ["tmux", "capture-pane"]:
            target = cmd[cmd.index("-t") + 1]
            if target.startswith("aim-dash"):
                # Multi-step turn sum in TUI (279.2k in) is higher than ground-truth context (150.6k)
                m.stdout = "279.2k in | 20.4k out | 3.7k thinking\n? for shortcuts   Gemini 4 Argon\n"
            elif target.startswith("agent-op_tenant1"):
                # bwrap tenant TUI shows 36.7k in while isolated brain transcript has 219,557
                m.stdout = "36.7k in | 1.8k out | 400 thinking\n? for shortcuts   Gemini 4 Argon\n"
            else:
                # 1-step cache-hit turn in TUI (2.5k in) is much lower than ground-truth context (140.4k)
                m.stdout = "2.5k in | 1.2k out | 256 thinking\n? for shortcuts   Gemini 4 Argon\n"
        else:
            m.stdout = ""
        return m

    with patch("routes_sessions.subprocess.run", side_effect=fake_run), patch(
        "routes_sessions._resolve_agy_brain_tokens_by_workspace", return_value=tokens_map
    ):
        fleet, _ = collect_fleet_telemetry(["aim-dash", "aim-ayrianna", "agent-op_tenant1-admin-cli"])
        by_name = {f["session_name"]: f for f in fleet}
        # aim-dash must use ground-truth 150,580 (15.1% normal), NOT inflated 279,200 (27.9% warning)
        assert by_name["aim-dash"]["tokens_used"] == 150580
        assert by_name["aim-dash"]["context_pct"] == 15.1
        assert by_name["aim-dash"]["tier"] == "normal"
        # aim-ayrianna must use ground-truth 140,397 (14.0%), NOT 2,500 (0.2%)
        assert by_name["aim-ayrianna"]["tokens_used"] == 140397
        assert by_name["aim-ayrianna"]["context_pct"] == 14.0
        assert by_name["aim-ayrianna"]["tier"] == "normal"
        # bwrap tenant session must use isolated brain transcript 219,557 (22.0% critical pre-cliff), NOT 36,700 (3.7%)
        assert by_name["agent-op_tenant1-admin-cli"]["tokens_used"] == 219557
        assert by_name["agent-op_tenant1-admin-cli"]["context_pct"] == 22.0
        assert by_name["agent-op_tenant1-admin-cli"]["tier"] == "critical"


def test_agy_pre_cliff_thresholds_and_sticky_red_compaction_tier():
    """AGY fires warning at 18% and critical at 22% ahead of ~25% cliff, and stays critical (red) whenever compacted (#228)."""
    # AGY uncompacted pre-cliff boundaries (18% warning, 22% critical)
    assert routes_sessions.compute_30pct_rule_tier(0.0, vessel="agy", compaction_count=0) == "normal"
    assert routes_sessions.compute_30pct_rule_tier(17.9, vessel="agy", compaction_count=0) == "normal"
    assert routes_sessions.compute_30pct_rule_tier(18.0, vessel="agy", compaction_count=0) == "warning"
    assert routes_sessions.compute_30pct_rule_tier(21.9, vessel="agy", compaction_count=0) == "warning"
    assert routes_sessions.compute_30pct_rule_tier(22.0, vessel="agy", compaction_count=0) == "critical"
    assert routes_sessions.compute_30pct_rule_tier(25.5, vessel="agy", compaction_count=0) == "critical"

    # Non-AGY vessels keep standard 20% warning / 30% critical
    assert routes_sessions.compute_30pct_rule_tier(19.9, vessel="grok", compaction_count=0) == "normal"
    assert routes_sessions.compute_30pct_rule_tier(20.0, vessel="grok", compaction_count=0) == "warning"
    assert routes_sessions.compute_30pct_rule_tier(29.9, vessel="opencode", compaction_count=0) == "warning"
    assert routes_sessions.compute_30pct_rule_tier(30.0, vessel="opencode", compaction_count=0) == "critical"

    # Sticky-red rule: ANY session with compaction_count > 0 MUST remain critical (red), even at 0%, 2%, or 5%
    assert routes_sessions.compute_30pct_rule_tier(0.0, vessel="agy", compaction_count=1) == "critical"
    assert routes_sessions.compute_30pct_rule_tier(2.0, vessel="agy", compaction_count=1) == "critical"
    assert routes_sessions.compute_30pct_rule_tier(5.0, vessel="agy", compaction_count=2) == "critical"
    assert routes_sessions.compute_30pct_rule_tier(12.4, vessel="agy", compaction_count=6) == "critical"


def test_agy_compaction_checkpoint_tracking_beyond_128kb_and_sticky_red_fleet(tmp_path):
    """Count full-file CHECKPOINT compactions (>128KB before EOF), ignore non-CHECKPOINT mentions, and keep fleet tier critical (#228)."""
    import json
    import sqlite3
    from pathlib import Path

    app_data = tmp_path / "agy_data_228"
    app_data.mkdir(parents=True)
    db_path = app_data / "conversation_summaries.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute(
        "CREATE TABLE conversation_summaries ("
        "conversation_id TEXT, workspace_uris TEXT, nesting_depth INTEGER, last_modified_time TEXT)"
    )

    # 1. Compacted session (2 real CHECKPOINTs, >150KB padding between them, plus false-positive CHECKPOINT text in USER_INPUT/GENERIC)
    compacted_repo = tmp_path / "aim-ld-content"
    compacted_repo.mkdir(parents=True)
    tx_compacted_dir = app_data / "brain" / "conv-compacted-2x" / ".system_generated" / "logs"
    tx_compacted_dir.mkdir(parents=True)
    tx_compacted = tx_compacted_dir / "transcript.jsonl"

    lines = [
        json.dumps({"step_index": 1, "type": "USER_INPUT", "content": "Mentioning CHECKPOINT in prompt should not count"}),
        json.dumps({"step_index": 2, "type": "PLANNER_RESPONSE", "input_tokens": 5000, "cache_read_tokens": 248000}),
        json.dumps({"step_index": 3, "source": "SYSTEM", "type": "CHECKPOINT", "content": "# Resuming from a compaction"}),
        # >150KB of intermediate steps so CHECKPOINT #1 sits outside the 128KB tail window
        json.dumps({"step_index": 4, "type": "GENERIC", "content": "CHECKPOINT " + ("x" * 160000)}),
        json.dumps({"step_index": 5, "type": "PLANNER_RESPONSE", "input_tokens": 4000, "cache_read_tokens": 250000}),
        json.dumps({"step_index": 6, "source": "SYSTEM", "type": "CHECKPOINT", "content": "# Resuming from a compaction"}),
        # Post-compaction window dropped down to 45,000 tokens (4.5%)
        json.dumps({"step_index": 7, "type": "PLANNER_RESPONSE", "input_tokens": 18729, "cache_read_tokens": 26271}),
    ]
    tx_compacted.write_text("\n".join(lines) + "\n", encoding="utf-8")
    conn.execute(
        "INSERT INTO conversation_summaries VALUES (?, ?, 0, '2026-10-31 22:00:00')",
        ("conv-compacted-2x", json.dumps([f"file://{compacted_repo}"])),
    )

    # 2. Uncompacted warning session at 18.6% (185,962 tokens)
    warn_repo = tmp_path / "aim-calendar"
    warn_repo.mkdir(parents=True)
    tx_warn_dir = app_data / "brain" / "conv-warn-18pct" / ".system_generated" / "logs"
    tx_warn_dir.mkdir(parents=True)
    (tx_warn_dir / "transcript.jsonl").write_text(
        json.dumps({"step_index": 10, "type": "PLANNER_RESPONSE", "input_tokens": 5962, "cache_read_tokens": 180000}) + "\n",
        encoding="utf-8",
    )
    conn.execute(
        "INSERT INTO conversation_summaries VALUES (?, ?, 0, '2026-10-31 21:00:00')",
        ("conv-warn-18pct", json.dumps([f"file://{warn_repo}"])),
    )

    # 3. Uncompacted pre-cliff critical session at 22.5% (225,000 tokens)
    cliff_repo = tmp_path / "aim-office"
    cliff_repo.mkdir(parents=True)
    tx_cliff_dir = app_data / "brain" / "conv-cliff-22pct" / ".system_generated" / "logs"
    tx_cliff_dir.mkdir(parents=True)
    (tx_cliff_dir / "transcript.jsonl").write_text(
        json.dumps({"step_index": 20, "type": "PLANNER_RESPONSE", "input_tokens": 5000, "cache_read_tokens": 220000}) + "\n",
        encoding="utf-8",
    )
    conn.execute(
        "INSERT INTO conversation_summaries VALUES (?, ?, 0, '2026-10-31 20:00:00')",
        ("conv-cliff-22pct", json.dumps([f"file://{cliff_repo}"])),
    )
    conn.commit()
    conn.close()

    # 4. Isolated bwrap tenant workspace with 1 compaction and 22,000 tokens (2.2%)
    aw_root = tmp_path / "agent_workspaces_228"
    tenant_tx_dir = aw_root / "agent-op_tenant2" / "brain" / "tenant-conv-c1" / ".system_generated" / "logs"
    tenant_tx_dir.mkdir(parents=True)
    (tenant_tx_dir / "transcript.jsonl").write_text(
        "\n".join(
            [
                json.dumps({"step_index": 1, "source": "SYSTEM", "type": "CHECKPOINT", "content": "# Resuming from a compaction"}),
                json.dumps({"step_index": 2, "type": "PLANNER_RESPONSE", "input_tokens": 22000, "cache_read_tokens": 0}),
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    tok_c, comp_c = routes_sessions._read_transcript_telemetry(str(tx_compacted))
    assert tok_c == 45000
    assert comp_c == 2

    tokens_map, compactions_map = routes_sessions._resolve_agy_brain_tokens_by_workspace(
        app_data_dir=str(app_data),
        agent_workspaces_dir=str(aw_root),
        include_compactions=True,
    )
    assert tokens_map["aim-ld-content"] == 45000
    assert compactions_map["aim-ld-content"] == 2
    assert compactions_map["aim-calendar"] == 0
    assert compactions_map["aim-office"] == 0
    assert tokens_map["agent-op_tenant2"] == 22000
    assert compactions_map["agent-op_tenant2"] == 1

    def fake_run(cmd, *args, **kwargs):
        m = MagicMock(returncode=0, stderr="")
        if cmd[:2] == ["tmux", "list-panes"]:
            m.stdout = (
                f"aim-ld-content@@@0@@@main@@@0@@@agy.real@@@{compacted_repo}@@@1001@@@1\n"
                f"aim-calendar@@@0@@@main@@@0@@@agy.real@@@{warn_repo}@@@1002@@@0\n"
                f"aim-office@@@0@@@main@@@0@@@agy.real@@@{cliff_repo}@@@1003@@@0\n"
                f"agent-op_tenant2-admin-cli@@@0@@@main@@@0@@@bwrap@@@{tmp_path}/backend@@@1004@@@0\n"
            )
        elif cmd[:2] == ["tmux", "capture-pane"]:
            m.stdout = "2.5k in | 0.5k out\n? for shortcuts   Gemini 4 Argon\n"
        else:
            m.stdout = ""
        return m

    with patch("routes_sessions.subprocess.run", side_effect=fake_run), patch(
        "routes_sessions._resolve_agy_brain_tokens_by_workspace",
        side_effect=lambda **kw: routes_sessions._resolve_agy_brain_telemetry_pair(
            app_data_dir=str(app_data),
            agent_workspaces_dir=str(aw_root),
            include_compactions=kw.get("include_compactions", False),
        ),
    ):
        fleet, panes = routes_sessions.collect_fleet_telemetry(
            ["aim-ld-content", "aim-calendar", "aim-office", "agent-op_tenant2-admin-cli"]
        )
        by_name = {f["session_name"]: f for f in fleet}

        # 4.5% compacted twice MUST stay critical (red), NEVER green!
        assert by_name["aim-ld-content"]["context_pct"] == 4.5
        assert by_name["aim-ld-content"]["compaction_count"] == 2
        assert by_name["aim-ld-content"]["tier"] == "critical"

        # 18.6% uncompacted -> early pre-cliff warning
        assert by_name["aim-calendar"]["context_pct"] == 18.6
        assert by_name["aim-calendar"]["compaction_count"] == 0
        assert by_name["aim-calendar"]["tier"] == "warning"

        # 22.5% uncompacted -> early pre-cliff critical
        assert by_name["aim-office"]["context_pct"] == 22.5
        assert by_name["aim-office"]["compaction_count"] == 0
        assert by_name["aim-office"]["tier"] == "critical"

        # 2.2% compacted once in bwrap tenant -> sticky critical (red)
        assert by_name["agent-op_tenant2-admin-cli"]["context_pct"] == 2.2
        assert by_name["agent-op_tenant2-admin-cli"]["compaction_count"] == 1
        assert by_name["agent-op_tenant2-admin-cli"]["tier"] == "critical"

    # Appending a 3rd CHECKPOINT invalidates stat cache and increments compaction_count to 3
    with open(tx_compacted, "a", encoding="utf-8") as fh:
        fh.write(json.dumps({"step_index": 8, "source": "SYSTEM", "type": "CHECKPOINT", "content": "# Resuming from a compaction"}) + "\n")
        fh.write(json.dumps({"step_index": 9, "type": "PLANNER_RESPONSE", "input_tokens": 19000, "cache_read_tokens": 0}) + "\n")
    tok_c3, comp_c3 = routes_sessions._read_transcript_telemetry(str(tx_compacted))
    assert tok_c3 == 19000
    assert comp_c3 == 3

    # Verify FleetSidebar.jsx & CommandPalette.jsx UI wiring (#228)
    repo_root = Path(__file__).resolve().parents[2]
    sidebar_jsx = (repo_root / "frontend" / "src" / "components" / "FleetSidebar.jsx").read_text(encoding="utf-8")
    palette_jsx = (repo_root / "frontend" / "src" / "components" / "CommandPalette.jsx").read_text(encoding="utf-8")
    app_css = (repo_root / "frontend" / "src" / "App.css").read_text(encoding="utf-8")

    assert "compaction_count" in sidebar_jsx
    assert "COMPACTED" in sidebar_jsx
    assert "25% CLIFF" in sidebar_jsx
    assert "is-compacted" in sidebar_jsx
    assert ".fleet-context-track.is-compacted" in app_css
    assert "compaction_count" in palette_jsx


def test_mobile_header_active_session_badge_and_no_redundant_fleet_home_button():
    """
    Issue #229:
    1. Header active-session pill must use a dedicated non-shrinking `.active-session-badge`
       (never `.fleet-branch-badge` with `overflow: hidden`, which Flexbox crushes to 0px on Android),
       and `.app-header > *` must enforce `flex-shrink: 0`.
    2. Redundant `🏠 Home` button must be removed from `FleetSidebar.jsx` since the `aim-connect`
       header logo already returns to the Welcome Screen.
    """
    import re
    from pathlib import Path

    repo_root = Path(__file__).resolve().parents[2]
    app_jsx = (repo_root / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
    sidebar_jsx = (repo_root / "frontend" / "src" / "components" / "FleetSidebar.jsx").read_text(encoding="utf-8")
    app_css = (repo_root / "frontend" / "src" / "App.css").read_text(encoding="utf-8")

    # 1. Redundant Home button removed from FleetSidebar, preserved on main header logo
    assert "🏠 Home" not in sidebar_jsx
    assert "Deselect session and return to A.I.M. Connect Home" not in sidebar_jsx
    assert "Return to A.I.M. Connect Welcome Screen" in app_jsx
    assert "switchToSession('')" in app_jsx

    # 2. Header active session uses dedicated `.active-session-badge`, not `.fleet-branch-badge`
    assert 'className="active-session-badge"' in app_jsx
    assert "fleet-branch-badge" not in app_jsx

    # 3. CSS guarantees header items and active-session-badge never flex-shrink on mobile
    header_child_match = re.search(r"\.app-header\s*>\s*\*\s*\{([^}]+)\}", app_css)
    assert header_child_match is not None, ".app-header > * rule missing in App.css"
    assert "flex-shrink: 0" in header_child_match.group(1)

    badge_match = re.search(r"\.active-session-badge\s*\{([^}]+)\}", app_css)
    assert badge_match is not None, ".active-session-badge rule missing in App.css"
    badge_rules = badge_match.group(1)
    assert "flex-shrink: 0" in badge_rules
    assert "white-space: nowrap" in badge_rules
    assert "overflow: hidden" not in badge_rules


def test_background_subagent_and_task_tray_keep_thinking_without_chime_oscillation():
    """
    Issue #231:
    1. Active background subagents (`1 subagent(s)` / `● Agent(...)` in tray) and active non-cron
       background tasks (`● [HH:MM:SS] ... running`) must keep `status == 'THINKING'` continuously
       even when the subagent step text is `Searching web` or plain reasoning (no foreground keyword).
    2. Standing idle `cron (...)` schedules alone at `? for shortcuts` must stay `status == 'IDLE'`.
    3. Foreground Braille spinners immediately above the prompt box must trigger `status == 'THINKING'`
       even when a multi-line tray pushes them past the bottom 4 raw lines, while unsubmitted drafts
       inside `> ...` or historical completed `● Agent(...) (ctrl+o to expand)` lines stay `IDLE`.
    4. `turn_digest` must remain stable across tray timer updates and change only when scrollback
       conversation content advances, with `App.jsx` guarding completion chimes via `lastChimedDigestRef`.
    """
    from pathlib import Path

    border = "─" * 60
    base_scrollback = (
        "  Certified Facility #255 and launched Facility #256 Verifier.\n"
        "  🔊 Our checkpoint is deployed and verifier two fifty-six is running now.\n"
    )

    # 1a. Subagent tray showing "Searching web · 1m30s" + standing cron -> THINKING
    subagent_search_pane = (
        f"{base_scrollback}"
        f"{border}\n"
        ">\n"
        f"{border}\n"
        "  ● Agent(water-single-facility-verifier: Facility #256 Verifier)  Searching web · 1m30s\n"
        "  ● [12:12:59] cron (daily at 06:00) running\n"
        f"{border}\n"
        "? for shortcuts                                         Gemini 4 Argon · high · 1 subagent(s) · 1 task(s) · /tasks\n"
    )
    res_sub_a = routes_sessions.parse_pane_telemetry(
        subagent_search_pane, command="agy.real", session_name="aim-ld"
    )
    assert res_sub_a["status"] == "THINKING"
    assert res_sub_a.get("turn_digest")

    # 1b. Subagent tray streaming plain reasoning text 4 minutes later -> STILL THINKING & identical turn_digest
    subagent_reasoning_pane = (
        f"{base_scrollback}"
        f"{border}\n"
        ">\n"
        f"{border}\n"
        "  ● Agent(water-single-facility-verifier: Facility #256 Verifier)  Initial hypothesis: inspecting permit contacts... · 5m23s\n"
        "  ● [12:12:59] cron (daily at 06:00) running\n"
        f"{border}\n"
        "? for shortcuts                                         Gemini 4 Argon · high · 1 subagent(s) · 1 task(s) · /tasks\n"
    )
    res_sub_b = routes_sessions.parse_pane_telemetry(
        subagent_reasoning_pane, command="agy.real", session_name="aim-ld"
    )
    assert res_sub_b["status"] == "THINKING"
    assert res_sub_b["turn_digest"] == res_sub_a["turn_digest"]

    # 2. Active non-cron background command in tray -> THINKING
    bg_task_pane = (
        f"{base_scrollback}"
        f"{border}\n"
        ">\n"
        f"{border}\n"
        "  ● [13:07:12] Next.js production build running\n"
        "  ● [12:12:59] cron (daily at 06:00) running\n"
        f"{border}\n"
        "? for shortcuts                                         Gemini 4 Argon · high · 2 task(s) · /tasks\n"
    )
    res_bg = routes_sessions.parse_pane_telemetry(
        bg_task_pane, command="agy.real", session_name="aim-ld"
    )
    assert res_bg["status"] == "THINKING"

    # 3. Foreground Braille spinner above prompt box with tray pushing it past lines[-4:] -> THINKING & stable digest
    spinner_above_tray_pane = (
        f"{base_scrollback}"
        "  ⣾   Inspecting database schema...\n"
        f"{border}\n"
        ">\n"
        f"{border}\n"
        "  ● [12:12:59] cron (daily at 06:00) running\n"
        f"{border}\n"
        "? for shortcuts                                         Gemini 4 Argon · high · 1 task(s) · /tasks\n"
    )
    res_spin = routes_sessions.parse_pane_telemetry(
        spinner_above_tray_pane, command="agy.real", session_name="aim-ld"
    )
    assert res_spin["status"] == "THINKING"
    assert res_spin["turn_digest"] == res_sub_a["turn_digest"]

    # 4. Standing idle cron schedule ONLY (even with historical "Generating"/"Running command" above prompt) -> IDLE
    idle_cron_only_pane = (
        "  ● Agent(research: Schema Audit)(Check tables) (ctrl+o to expand)\n"
        "  Fixed Generating and Running command parsing cleanly.\n"
        f"{base_scrollback}"
        f"{border}\n"
        ">\n"
        f"{border}\n"
        "  ● [12:12:59] cron (daily at 06:00) running\n"
        f"{border}\n"
        "? for shortcuts                                         Gemini 4 Argon · high · 1 task(s) · /tasks\n"
    )
    res_idle_cron = routes_sessions.parse_pane_telemetry(
        idle_cron_only_pane, command="agy.real", session_name="aim-ld"
    )
    assert res_idle_cron["status"] == "IDLE"

    # 5. Multi-line unsubmitted draft inside `> ...` prompt box mentioning "Generating" -> IDLE
    draft_in_prompt_pane = (
        f"{base_scrollback}"
        f"{border}\n"
        "> Please check why Generating and Running command\n"
        "triggered an extra chime earlier today.\n"
        f"{border}\n"
        "? for shortcuts                                         Gemini 4 Argon · high\n"
    )
    res_draft = routes_sessions.parse_pane_telemetry(
        draft_in_prompt_pane, command="agy.real", session_name="aim-connect"
    )
    assert res_draft["status"] == "IDLE"

    # 6. Advancing the conversation scrollback produces a distinct turn_digest
    advanced_pane = (
        f"{base_scrollback}"
        "  All 295 facilities certified and deployed cleanly.\n"
        "  🔊 All two hundred ninety-five facilities are now certified and live.\n"
        f"{border}\n"
        ">\n"
        f"{border}\n"
        "  ● [12:12:59] cron (daily at 06:00) running\n"
        f"{border}\n"
        "? for shortcuts                                         Gemini 4 Argon · high · 1 task(s) · /tasks\n"
    )
    res_advanced = routes_sessions.parse_pane_telemetry(
        advanced_pane, command="agy.real", session_name="aim-ld"
    )
    assert res_advanced["status"] == "IDLE"
    assert res_advanced["turn_digest"] != res_sub_a["turn_digest"]

    # 7. Frontend App.jsx wires lastChimedDigestRef & turn_digest deduplication
    repo_root = Path(__file__).resolve().parents[2]
    app_jsx = (repo_root / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
    assert "lastChimedDigestRef" in app_jsx
    assert "turn_digest" in app_jsx








