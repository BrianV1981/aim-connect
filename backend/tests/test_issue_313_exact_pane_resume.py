import json
import os
import sqlite3
import subprocess
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import main
import pane_sessions as ps
import tmux_workspace_manager as twm

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
RESUME_SCRIPT = WORKTREE_ROOT / "scripts" / "aim_pane_resume.py"
TMUX_WS_UTILS_JS = WORKTREE_ROOT / "frontend" / "src" / "tmuxWorkspaceUtils.js"

AGY_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"
AGY_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb"
AGY_C = "cccccccc-3333-4333-8333-cccccccccccc"
AGY_SUB = "dddddddd-4444-4444-8444-dddddddddddd"


@pytest.fixture
def admin_token():
    tok = "test-admin-token-313"
    main.VALID_API_TOKENS[tok] = {"expires": time.time() + 1800, "user": "admin", "role": "admin", "prefix": ""}
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


@pytest.fixture
def iso_env(tmp_path, monkeypatch):
    """Isolate every settings/manifest/tmux.conf path into tmp_path."""
    monkeypatch.setenv("AIM_TMUX_SETTINGS_FILE", str(tmp_path / "tmux_settings.json"))
    monkeypatch.setenv("AIM_DASHBOARD_CONFIG_FILE", str(tmp_path / "dash.json"))
    monkeypatch.setenv("AIM_TMUX_CONF", str(tmp_path / ".tmux.conf"))
    monkeypatch.setenv("AIM_PANE_SESSIONS_FILE", str(tmp_path / "pane_sessions.json"))
    return tmp_path


# ---------------------------------------------------------------------------
# Fixture stores (one per harness), all rooted in a fake $HOME
# ---------------------------------------------------------------------------


def _make_agy_store(home: Path, rows: list[tuple[str, str, str, str, int]]) -> None:
    """rows: (conversation_id, last_modified_time, cwd, parent_conversation_id, nesting_depth)"""
    app = home / ".gemini" / "antigravity-cli"
    app.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(app / "conversation_summaries.db")
    con.execute(
        "CREATE TABLE conversation_summaries (conversation_id text, last_modified_time datetime NOT NULL, "
        "workspace_uris text NOT NULL, parent_conversation_id text, nesting_depth integer)"
    )
    for cid, ts, cwd, parent, depth in rows:
        con.execute(
            "INSERT INTO conversation_summaries VALUES (?,?,?,?,?)",
            (cid, ts, json.dumps([f"file://{cwd}"]), parent, depth),
        )
    con.commit()
    con.close()


def _touch(path: Path, content: str, mtime: float) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    os.utime(path, (mtime, mtime))


def _make_all_stores(home: Path, cwd: str) -> None:
    _make_agy_store(
        home,
        [
            (AGY_A, "2026-11-26 07:00:00+00:00", cwd, "", 0),
            (AGY_B, "2026-11-26 08:00:00+00:00", cwd, "", 0),
            (AGY_SUB, "2026-11-26 09:00:00+00:00", cwd, AGY_B, 1),  # subagent: never a resume target
            (AGY_C, "2026-11-26 10:00:00+00:00", "/elsewhere", "", 0),  # other workspace
        ],
    )
    from urllib.parse import quote

    grok_dir = home / ".grok" / "sessions" / quote(cwd, safe="")
    _touch(grok_dir / "g-old" / "events.jsonl", "{}\n", 1000)
    _touch(grok_dir / "g-new" / "events.jsonl", "{}\n", 2000)

    oc_dir = home / ".local" / "share" / "opencode"
    oc_dir.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(oc_dir / "opencode.db")
    con.execute(
        "CREATE TABLE session (id text PRIMARY KEY, parent_id text, directory text NOT NULL, "
        "time_updated integer NOT NULL, time_archived integer)"
    )
    con.executemany(
        "INSERT INTO session VALUES (?,?,?,?,?)",
        [
            ("ses_old", None, cwd, 100, None),
            ("ses_new", None, cwd, 300, None),
            ("ses_child", "ses_new", cwd, 400, None),
            ("ses_archived", None, cwd, 500, 501),
        ],
    )
    con.commit()
    con.close()

    codex_dir = home / ".codex" / "sessions" / "2026" / "11" / "26"
    for name, sid, scwd, mt in (
        ("rollout-a", "019a-old", cwd, 1000),
        ("rollout-b", "019b-new", cwd, 2000),
        ("rollout-c", "019c-other", "/elsewhere", 3000),
    ):
        meta = {"type": "session_meta", "payload": {"id": sid, "cwd": scwd}}
        _touch(codex_dir / f"{name}.jsonl", json.dumps(meta) + "\n", mt)

    import re

    claude_dir = home / ".claude" / "projects" / re.sub(r"[^A-Za-z0-9]", "-", cwd)
    _touch(claude_dir / "c-old.jsonl", "{}\n", 1000)
    _touch(claude_dir / "c-new.jsonl", "{}\n", 2000)


# ---------------------------------------------------------------------------
# 1. Per-harness resume commands (the core #313 bug)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "harness,session_id,expected",
    [
        ("agy", "X1", "agy --conversation X1"),
        ("agy", None, "agy -c"),
        ("grok", "X2", "grok -r X2"),
        ("grok", None, "grok -c"),
        ("opencode", "ses_9", "opencode -s ses_9"),
        ("opencode", None, "opencode -c"),
        ("codex", "019x", "codex resume 019x"),
        ("codex", None, "codex resume --last"),
        ("claude", "c-1", "claude -r c-1"),
        ("claude", None, "claude -c"),
        ("gemini", "ignored", "gemini --resume latest"),
        ("gemini", None, "gemini --resume latest"),
        ("aider", "ignored", "aider"),
        ("aider", None, "aider"),
    ],
)
def test_build_agent_launch_command_uses_harness_correct_resume_syntax(iso_env, harness, session_id, expected):
    assert twm.build_agent_launch_command(harness, resume=True, skip_permissions=False, session_id=session_id) == expected


def test_codex_never_receives_dash_c_and_resume_off_launches_fresh(iso_env):
    for sid in (None, "019x"):
        cmd = twm.build_agent_launch_command("codex", resume=True, skip_permissions=False, session_id=sid)
        assert "-c" not in cmd.split()
    for harness in ("agy", "grok", "opencode", "codex", "claude", "gemini", "aider"):
        assert twm.build_agent_launch_command(harness, resume=False, skip_permissions=False) == harness


def test_agy_skip_permissions_flag_precedes_resume_and_ids_are_shell_quoted(iso_env):
    assert (
        twm.build_agent_launch_command("agy", resume=True, skip_permissions=True, session_id=AGY_A)
        == f"agy --dangerously-skip-permissions --conversation {AGY_A}"
    )
    assert twm.build_agent_launch_command("grok", resume=True, skip_permissions=False, session_id="a b;rm") == "grok -r 'a b;rm'"


# ---------------------------------------------------------------------------
# 2. Harness detection and explicit-ID parsing
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "argv,expected",
    [
        (["/home/u/.local/bin/agy.real", "--dangerously-skip-permissions", "-c"], "agy"),
        (["antigravity"], "agy"),
        (["grok", "-r", "x"], "grok"),
        (["opencode", "-c"], "opencode"),
        (["node", "/home/u/.npm-global/bin/codex"], "codex"),
        (["/usr/lib/node_modules/@openai/codex/vendor/codex", "resume"], "codex"),
        (["claude"], "claude"),
        (["node", "/usr/lib/node_modules/@anthropic-ai/claude-code/cli.js"], "claude"),
        (["node", "/usr/lib/node_modules/@google/gemini-cli/dist/index.js"], "gemini"),
        (["bash"], None),
        (["vim", "notes.md"], None),
        (["node", "server.js"], None),
    ],
)
def test_detect_harness_from_argv(argv, expected):
    assert ps.detect_harness(argv) == expected


@pytest.mark.parametrize(
    "harness,argv,expected",
    [
        ("agy", ["agy.real", "--conversation", AGY_A], AGY_A),
        ("agy", ["agy.real", f"--conversation={AGY_B}"], AGY_B),
        ("agy", ["agy.real", "-c"], None),
        ("grok", ["grok", "-r", "g1"], "g1"),
        ("grok", ["grok", "--resume", "g2"], "g2"),
        ("grok", ["grok", "-r", "--fork-session"], None),
        ("opencode", ["opencode", "-s", "ses_1"], "ses_1"),
        ("opencode", ["opencode", "--session=ses_2"], "ses_2"),
        ("codex", ["codex", "resume", "019a"], "019a"),
        ("codex", ["codex", "resume", "--last"], None),
        ("claude", ["claude", "--resume", "c1"], "c1"),
        ("claude", ["claude", "--session-id", "c2"], "c2"),
        ("gemini", ["gemini", "--resume", "3"], None),
    ],
)
def test_explicit_session_id_from_argv(harness, argv, expected):
    assert ps.explicit_session_id(harness, argv) == expected


def test_session_id_from_open_files():
    agy_fd = [f"/h/.gemini/antigravity-cli/conversations/{AGY_A}.db", "/dev/pts/3"]
    assert ps.session_id_from_open_files("agy", agy_fd) == AGY_A
    codex_fd = ["/h/.codex/sessions/2026/11/26/rollout-2026-11-26T01-02-03-019b1bbb-db60-7361-a2db-d06ba314704e.jsonl"]
    assert ps.session_id_from_open_files("codex", codex_fd) == "019b1bbb-db60-7361-a2db-d06ba314704e"
    claude_fd = [f"/h/.claude/projects/-home-u-repo/{AGY_C}.jsonl"]
    assert ps.session_id_from_open_files("claude", claude_fd) == AGY_C
    grok_fd = ["/h/.grok/sessions/%2Fhome%2Fu/01a21622-5132-77d2-bc01-9f876a30e081/events.jsonl"]
    assert ps.session_id_from_open_files("grok", grok_fd) == "01a21622-5132-77d2-bc01-9f876a30e081"
    assert ps.session_id_from_open_files("opencode", ["/h/.local/share/opencode/opencode.db"]) is None


# ---------------------------------------------------------------------------
# 3. Native store resolvers: newest-first, scoped to cwd, subagents excluded
# ---------------------------------------------------------------------------


def test_store_candidates_per_harness_newest_first_scoped_to_cwd(tmp_path):
    cwd = "/home/u/repo"
    _make_all_stores(tmp_path, cwd)
    home = str(tmp_path)
    assert ps.store_candidates("agy", cwd, home=home) == [AGY_B, AGY_A]
    assert ps.store_candidates("grok", cwd, home=home) == ["g-new", "g-old"]
    assert ps.store_candidates("opencode", cwd, home=home) == ["ses_new", "ses_old"]
    assert ps.store_candidates("codex", cwd, home=home) == ["019b-new", "019a-old"]
    assert ps.store_candidates("claude", cwd, home=home) == ["c-new", "c-old"]
    assert ps.store_candidates("gemini", cwd, home=home) == []
    assert ps.store_candidates("agy", "/no/such/dir", home=home) == []


# ---------------------------------------------------------------------------
# 4. Capture: two same-harness agents in one repo get DISTINCT conversations
# ---------------------------------------------------------------------------


def _panes(cwd: str):
    return [
        {"key": "work:0.0", "pane_pid": 100, "cwd": cwd},
        {"key": "work:0.1", "pane_pid": 200, "cwd": cwd},
        {"key": "work:1.0", "pane_pid": 300, "cwd": cwd},
        {"key": "notes:0.0", "pane_pid": 400, "cwd": cwd},
    ]


def test_capture_assigns_distinct_ids_with_open_file_precision_first(tmp_path):
    cwd = "/home/u/repo"
    _make_all_stores(tmp_path, cwd)
    trees = {
        100: [(101, ["/home/u/.local/bin/agy.real", "-c"])],
        200: [(201, ["/home/u/.local/bin/agy.real", "-c"])],
        300: [(301, ["codex", "resume", "019a-old"])],
        400: [],  # idle shell: not an agent pane
    }
    # Pane work:0.1 holds AGY_B's conversation DB open -> precise; work:0.0 must NOT also get AGY_B.
    open_files = {201: [f"/x/.gemini/antigravity-cli/conversations/{AGY_B}.db"]}
    with (
        patch.object(ps, "process_tree", side_effect=lambda pid: trees.get(pid, [])),
        patch.object(ps, "open_files", side_effect=lambda pid: open_files.get(pid, [])),
    ):
        manifest = ps.capture_pane_sessions(_panes(cwd), home=str(tmp_path))

    panes = manifest["panes"]
    assert set(panes) == {"work:0.0", "work:0.1", "work:1.0"}
    assert panes["work:0.1"] == {"harness": "agy", "cwd": cwd, "session_id": AGY_B, "source": "open-file"}
    assert panes["work:0.0"]["session_id"] == AGY_A and panes["work:0.0"]["source"] == "store-recent"
    assert panes["work:1.0"]["session_id"] == "019a-old" and panes["work:1.0"]["source"] == "argv"
    assert manifest["version"] == 1 and isinstance(manifest["captured_at"], float)


def test_capture_without_precise_signals_still_never_duplicates(tmp_path):
    cwd = "/home/u/repo"
    _make_all_stores(tmp_path, cwd)
    trees = {
        100: [(101, ["agy.real", "-c"])],
        200: [(201, ["agy.real", "-c"])],
        300: [(301, ["agy.real", "-c"])],  # 3 agy panes, only 2 conversations exist for this cwd
    }
    with (
        patch.object(ps, "process_tree", side_effect=lambda pid: trees.get(pid, [])),
        patch.object(ps, "open_files", return_value=[]),
    ):
        manifest = ps.capture_pane_sessions(_panes(cwd)[:3], home=str(tmp_path))
    ids = [manifest["panes"][k]["session_id"] for k in ("work:0.0", "work:0.1", "work:1.0")]
    assert ids[:2] == [AGY_B, AGY_A]
    assert ids[2] is None and manifest["panes"]["work:1.0"]["source"] == "none"


def test_manifest_written_0600_and_round_trips(iso_env):
    manifest = {"version": 1, "captured_at": 1.0, "panes": {"a:0.0": {"harness": "grok", "cwd": "/r", "session_id": "g", "source": "argv"}}}
    path = ps.write_manifest(manifest)
    assert path == iso_env / "pane_sessions.json"
    assert (path.stat().st_mode & 0o777) == 0o600
    assert ps.read_manifest() == manifest
    path.write_text("{corrupt", encoding="utf-8")
    assert ps.read_manifest() == {"version": 1, "captured_at": None, "panes": {}}


# ---------------------------------------------------------------------------
# 5. Restore resolution
# ---------------------------------------------------------------------------


def test_resolve_restore_command_prefers_manifest_then_store_then_cli_latest(tmp_path):
    cwd = "/home/u/repo"
    _make_all_stores(tmp_path, cwd)
    manifest = {"panes": {"work:0.1": {"harness": "agy", "cwd": cwd, "session_id": AGY_A, "source": "open-file"}}}
    home = str(tmp_path)

    argv, source = ps.resolve_restore_argv("agy", "work:0.1", cwd, manifest, skip_permissions=True, home=home)
    assert argv == ["agy", "--dangerously-skip-permissions", "--conversation", AGY_A] and source == "manifest"

    # Unknown pane: newest conversation from the harness's own store for this cwd.
    argv, source = ps.resolve_restore_argv("opencode", "other:0.0", cwd, manifest, home=home)
    assert argv == ["opencode", "-s", "ses_new"] and source == "store-recent"

    # Manifest entry for a different harness is ignored.
    argv, source = ps.resolve_restore_argv("grok", "work:0.1", cwd, manifest, home=home)
    assert argv == ["grok", "-r", "g-new"] and source == "store-recent"

    # No store data at all: harness-correct CLI fallback.
    argv, source = ps.resolve_restore_argv("codex", "x:0.0", "/empty", {}, home=home)
    assert argv == ["codex", "resume", "--last"] and source == "cli-latest"
    argv, source = ps.resolve_restore_argv("aider", "x:0.0", "/empty", {}, home=home)
    assert argv == ["aider"] and source == "fresh"


def test_resume_script_dry_run_prints_exact_command(iso_env, tmp_path):
    cwd = tmp_path / "repo"
    cwd.mkdir()
    ps.write_manifest(
        {"version": 1, "captured_at": 1.0, "panes": {"work:0.0": {"harness": "claude", "cwd": str(cwd), "session_id": "c-77", "source": "open-file"}}}
    )
    env = {**os.environ, "AIM_PANE_KEY": "work:0.0", "HOME": str(tmp_path)}
    proc = subprocess.run(
        [sys.executable, str(RESUME_SCRIPT), "claude", "--dry-run"],
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert proc.returncode == 0, proc.stderr
    assert proc.stdout.strip() == "claude -r c-77"


# ---------------------------------------------------------------------------
# 6. ~/.tmux.conf sync: wrapper rules for all 6 harnesses, backup, hooks preserved
# ---------------------------------------------------------------------------


def test_sync_tmux_conf_routes_every_agent_through_resume_script_and_backs_up_once(iso_env):
    conf = iso_env / ".tmux.conf"
    user_hook = "set -g @resurrect-hook-post-restore-all 'echo user-owned-hook'"
    original = "set -g mouse on\nset -g @resurrect-processes '\"~agy->agy -c\" ~node'\n" + user_hook + "\n"
    conf.write_text(original, encoding="utf-8")

    with patch("tmux_workspace_manager.subprocess.run"):
        twm.sync_resurrect_processes_in_tmux_conf(auto_resume_c=True, skip_permissions=True)

    backup = iso_env / ".tmux.conf.aim-bak"
    assert backup.read_text(encoding="utf-8") == original
    txt = conf.read_text(encoding="utf-8")
    script = str(RESUME_SCRIPT)
    assert f'"~agy->python3 {script} agy --dangerously-skip-permissions"' in txt
    for harness in ("grok", "opencode", "codex", "claude", "gemini"):
        assert f'"~{harness}->python3 {script} {harness}"' in txt
    assert "~node ~python3 ~cloudflared'" in txt
    assert txt.count("@resurrect-processes") == 1
    assert "-c\"" not in txt  # no blanket -c rules remain
    assert user_hook in txt  # user's restore hook untouched
    assert f"set -g @resurrect-hook-post-save-all 'python3 {script} --capture'" in txt

    # A second sync must not overwrite the pristine backup.
    conf.write_text(txt + "# edited later\n", encoding="utf-8")
    with patch("tmux_workspace_manager.subprocess.run"):
        twm.sync_resurrect_processes_in_tmux_conf(auto_resume_c=False, skip_permissions=False)
    assert backup.read_text(encoding="utf-8") == original
    txt2 = conf.read_text(encoding="utf-8")
    assert '"~agy->agy"' in txt2 and '"~codex->codex"' in txt2
    assert txt2.count("@resurrect-hook-post-save-all") == 1


def test_sync_preserves_foreign_post_save_hook(iso_env):
    conf = iso_env / ".tmux.conf"
    foreign = "set -g @resurrect-hook-post-save-all 'my-own-backup.sh'"
    conf.write_text(foreign + "\n", encoding="utf-8")
    with patch("tmux_workspace_manager.subprocess.run"):
        twm.sync_resurrect_processes_in_tmux_conf()
    txt = conf.read_text(encoding="utf-8")
    assert foreign in txt and "--capture" not in txt


# ---------------------------------------------------------------------------
# 7. Save verification, manifest capture, and dependency gating via the API
# ---------------------------------------------------------------------------


def _resurrect_fixture(tmp_path: Path, save_body: str) -> tuple[Path, Path]:
    rdir = tmp_path / "resurrect"
    rdir.mkdir()
    last = tmp_path / "last"
    last.write_text("pane\tw1\t0\npane\tw2\t0\npane\tw3\t0\n", encoding="utf-8")
    os.utime(last, (1000, 1000))
    (rdir / "save.sh").write_text(save_body.replace("$LAST", str(last)), encoding="utf-8")
    (rdir / "save.sh").chmod(0o755)
    (rdir / "restore.sh").write_text("#!/bin/bash\n", encoding="utf-8")
    return rdir, last


_REAL_RUN = subprocess.run  # patch() replaces subprocess.run module-wide; keep a real handle


def _run_shell_executes_script(cmd, *args, **kwargs):
    if cmd[:2] == ["tmux", "run-shell"]:
        return _REAL_RUN(["bash", cmd[2]], capture_output=True, text=True)
    return MagicMock(returncode=0, stdout="", stderr="")


def test_save_endpoint_verifies_snapshot_and_reports_exact_panes(iso_env, tmp_path, monkeypatch, admin_token):
    rdir, last = _resurrect_fixture(tmp_path, "#!/bin/bash\ntouch $LAST\n")
    monkeypatch.setenv("AIM_TMUX_RESURRECT_DIR", str(rdir))
    monkeypatch.setenv("AIM_TMUX_RESURRECT_LAST", str(last))
    hierarchy = {f"s{i}": {"windows": {}} for i in range(3)}
    fake_manifest = {
        "version": 1,
        "captured_at": 5.0,
        "panes": {
            "s0:0.0": {"harness": "agy", "cwd": "/r", "session_id": AGY_A, "source": "open-file"},
            "s1:0.0": {"harness": "grok", "cwd": "/r", "session_id": None, "source": "none"},
        },
    }
    client = TestClient(main.app)
    with (
        patch("tmux_workspace_manager.get_active_tmux_hierarchy", return_value=hierarchy),
        patch("tmux_workspace_manager.capture_and_store_pane_sessions", return_value=fake_manifest),
        patch("tmux_workspace_manager.subprocess.run", side_effect=_run_shell_executes_script),
    ):
        resp = client.post("/api/tmux/resurrect/save", json={"force": True}, headers={"x-api-token": admin_token})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "saved"
    assert body["agent_pane_count"] == 2 and body["exact_pane_count"] == 1
    assert body["last_saved_at"] > 1000


def test_save_endpoint_reports_unverified_when_snapshot_unchanged(iso_env, tmp_path, monkeypatch, admin_token):
    rdir, last = _resurrect_fixture(tmp_path, "#!/bin/bash\nexit 0\n")
    monkeypatch.setenv("AIM_TMUX_RESURRECT_DIR", str(rdir))
    monkeypatch.setenv("AIM_TMUX_RESURRECT_LAST", str(last))
    client = TestClient(main.app)
    with (
        patch("tmux_workspace_manager.get_active_tmux_hierarchy", return_value={f"s{i}": {} for i in range(3)}),
        patch("tmux_workspace_manager.capture_and_store_pane_sessions", return_value={"panes": {}}),
        patch("tmux_workspace_manager.subprocess.run", side_effect=_run_shell_executes_script),
    ):
        resp = client.post("/api/tmux/resurrect/save", json={"force": True}, headers={"x-api-token": admin_token})
    assert resp.status_code == 200
    assert resp.json()["status"] == "save_unverified"


def test_save_and_restore_without_resurrect_return_install_instructions(iso_env, tmp_path, monkeypatch, admin_token):
    monkeypatch.setenv("AIM_TMUX_RESURRECT_DIR", str(tmp_path / "missing"))
    client = TestClient(main.app)
    with patch("tmux_workspace_manager.get_active_tmux_hierarchy", return_value={}):
        status = client.get("/api/tmux/resurrect/status", headers={"x-api-token": admin_token}).json()
        save = client.post("/api/tmux/resurrect/save", json={"force": True}, headers={"x-api-token": admin_token})
        restore = client.post("/api/tmux/resurrect/restore", headers={"x-api-token": admin_token})
    assert status["installed"] is False
    assert "github.com/tmux-plugins/tmux-resurrect" in status["install_hint"]
    for resp in (save, restore):
        assert resp.status_code == 404
        assert "git clone https://github.com/tmux-plugins/tmux-resurrect" in resp.json()["detail"]


def test_restore_reports_exact_pane_count_from_manifest(iso_env, tmp_path, monkeypatch, admin_token):
    rdir, last = _resurrect_fixture(tmp_path, "#!/bin/bash\n")
    monkeypatch.setenv("AIM_TMUX_RESURRECT_DIR", str(rdir))
    monkeypatch.setenv("AIM_TMUX_RESURRECT_LAST", str(last))
    ps.write_manifest(
        {
            "version": 1,
            "captured_at": 9.0,
            "panes": {
                "a:0.0": {"harness": "agy", "cwd": "/r", "session_id": AGY_A, "source": "open-file"},
                "b:0.0": {"harness": "codex", "cwd": "/r", "session_id": "019a", "source": "argv"},
                "c:0.0": {"harness": "grok", "cwd": "/r", "session_id": None, "source": "none"},
            },
        }
    )
    client = TestClient(main.app)
    with (
        patch("tmux_workspace_manager.subprocess.run", return_value=MagicMock(returncode=0)),
        patch("tmux_workspace_manager.subprocess.Popen"),
    ):
        resp = client.post("/api/tmux/resurrect/restore", headers={"x-api-token": admin_token})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "restoring" and body["exact_pane_count"] == 2 and body["agent_pane_count"] == 3


# ---------------------------------------------------------------------------
# 8. Frontend toast copy derives from backend truth (run in Node)
# ---------------------------------------------------------------------------


def test_frontend_resurrect_result_messages():
    script = f"""
import {{ describeResurrectSaveResult, describeResurrectRestoreResult, resurrectGate }} from {json.dumps(TMUX_WS_UTILS_JS.as_uri())};
console.log(JSON.stringify({{
  saved: describeResurrectSaveResult({{ status: 'saved', active_session_count: 4, agent_pane_count: 3, exact_pane_count: 2 }}),
  unverified: describeResurrectSaveResult({{ status: 'save_unverified' }}),
  restored: describeResurrectRestoreResult({{ bootstrapped_daemon: false, agent_pane_count: 3, exact_pane_count: 3 }}),
  cold: describeResurrectRestoreResult({{ bootstrapped_daemon: true, agent_pane_count: 0, exact_pane_count: 0 }}),
  gateMissing: resurrectGate({{ installed: false, install_hint: 'HINT' }}),
  gateOk: resurrectGate({{ installed: true }}),
  gateUnknown: resurrectGate(null),
}}));
"""
    proc = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True, timeout=10)
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout.strip())
    assert out["saved"] == {"ok": True, "message": "Saved 4 tmux session(s) · 2/3 agent pane(s) pinned to exact conversations"}
    assert out["unverified"]["ok"] is False and "could not be verified" in out["unverified"]["message"]
    assert out["restored"] == "Restoring workspace · 3/3 agent pane(s) resuming their exact conversations..."
    assert out["cold"].startswith("Cold-boot tmux daemon started")
    assert out["gateMissing"] == {"disabled": True, "title": "HINT"}
    assert out["gateOk"]["disabled"] is False
    assert out["gateUnknown"]["disabled"] is False
