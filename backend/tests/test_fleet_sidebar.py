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
        assert fleet[0]["tier"] == "warning"


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




