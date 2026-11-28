"""#323: Bridge OpenCode SKILL.md skills vs /slash commands across Fleet actions, composer menu, TUI wrappers, and bwrap."""

from __future__ import annotations

import asyncio
import os
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import main

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


@pytest.fixture
def admin_token():
    tok = "test-admin-token-323"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_sync_opencode_command_wrappers_idempotent_without_mtime_churn(tmp_path):
    import opencode_skills as ocs

    skills_dir = tmp_path / ".config" / "opencode" / "skills"
    (skills_dir / "aim-handoff").mkdir(parents=True)
    (skills_dir / "aim-handoff" / "SKILL.md").write_text(
        "---\nname: aim-handoff\ndescription: Ephemeral context handoff.\n---\n# Handoff\n",
        encoding="utf-8",
    )
    # Companion skill in ~/.opencode/skills (binary home) should also gain a wrapper!
    bin_skills = tmp_path / ".opencode" / "skills"
    (bin_skills / "aim-browser").mkdir(parents=True)
    (bin_skills / "aim-browser" / "SKILL.md").write_text(
        "---\nname: aim-browser\ndescription: Headed CDP browser.\n---\n# Browser\n",
        encoding="utf-8",
    )

    res1 = ocs.sync_opencode_command_wrappers(str(tmp_path))
    cmds_dir = tmp_path / ".config" / "opencode" / "commands"
    handoff_md = cmds_dir / "aim-handoff.md"
    browser_md = cmds_dir / "aim-browser.md"
    aim_md = cmds_dir / "aim.md"

    assert res1["written"] >= 2
    assert handoff_md.is_file() and browser_md.is_file() and aim_md.is_file()
    assert "$ARGUMENTS" in handoff_md.read_text(encoding="utf-8")

    # Backdate mtime and verify a second sync does NOT rewrite unchanged files (preserving proc_start >= mtime!)
    old_ts = time.time() - 3600
    os.utime(handoff_md, (old_ts, old_ts))
    res2 = ocs.sync_opencode_command_wrappers(str(tmp_path))
    assert res2["written"] == 0
    assert abs(handoff_md.stat().st_mtime - old_ts) < 2.0


def test_translate_opencode_skill_slash_handles_unwrapped_stale_and_wrapped_states(tmp_path):
    import opencode_skills as ocs

    skills_dir = tmp_path / ".config" / "opencode" / "skills" / "aim-handoff"
    skills_dir.mkdir(parents=True)
    (skills_dir / "SKILL.md").write_text("---\nname: aim-handoff\ndescription: Handoff\n---\n", encoding="utf-8")

    # 1. Non-opencode vessels pass /aim-handoff untouched
    assert (
        ocs.translate_opencode_skill_slash("/aim-handoff", vessel="agy", home_dir=str(tmp_path))
        == "/aim-handoff"
    )

    # 2. OpenCode builtins (/new, /models) pass untouched
    assert (
        ocs.translate_opencode_skill_slash("/models", vessel="opencode", home_dir=str(tmp_path))
        == "/models"
    )

    # 3. OpenCode skill WITHOUT a commands/*.md wrapper translates to skill-tool directive
    translated = ocs.translate_opencode_skill_slash(
        "/aim-handoff close out shift", vessel="opencode", home_dir=str(tmp_path)
    )
    assert 'Use the "aim-handoff" skill via the skill tool' in translated
    assert "close out shift" in translated

    # 4. Wrapper created AFTER OpenCode process started -> still translates so running session works without restart!
    ocs.sync_opencode_command_wrappers(str(tmp_path))
    stale_proc_start = time.time() - 600
    translated_stale = ocs.translate_opencode_skill_slash(
        "/aim-handoff",
        vessel="opencode",
        home_dir=str(tmp_path),
        proc_start_ts=stale_proc_start,
    )
    assert 'Use the "aim-handoff" skill via the skill tool' in translated_stale

    # 5. Wrapper existed BEFORE OpenCode process started -> passes native /aim-handoff through!
    fresh_proc_start = time.time() + 60
    assert (
        ocs.translate_opencode_skill_slash(
            "/aim-handoff",
            vessel="opencode",
            home_dir=str(tmp_path),
            proc_start_ts=fresh_proc_start,
        )
        == "/aim-handoff"
    )


def test_send_session_command_translates_opencode_skill_when_unwrapped(tmp_path, admin_token):
    skills_dir = tmp_path / ".config" / "opencode" / "skills" / "aim-memory-wiki"
    skills_dir.mkdir(parents=True)
    (skills_dir / "SKILL.md").write_text("---\nname: aim-memory-wiki\ndescription: Wiki\n---\n", encoding="utf-8")

    pasted_inputs: list[str] = []

    def fake_run(cmd, *args, **kwargs):
        if cmd[:3] == ["tmux", "load-buffer", "-b"]:
            pasted_inputs.append(kwargs.get("input", ""))
        m = MagicMock(returncode=0, stdout="", stderr="")
        return m

    client = TestClient(main.app)
    with (
        patch("routes_sessions.HOME_DIR", str(tmp_path)),
        patch("routes_sessions.subprocess.run", side_effect=fake_run),
        patch("routes_sessions.time.sleep"),
    ):
        resp = client.post(
            "/api/sessions/aim-joshua/command",
            headers={"x-api-token": admin_token},
            json={"command": "/aim-memory-wiki", "vessel": "opencode"},
        )
    assert resp.status_code == 200
    assert len(pasted_inputs) == 1
    assert 'Use the "aim-memory-wiki" skill via the skill tool' in pasted_inputs[0]


def test_slash_commands_endpoint_discovers_opencode_commands_dir_and_syncs_wrappers(tmp_path, admin_token):
    cwd = tmp_path / "proj"
    (cwd / ".opencode" / "commands").mkdir(parents=True)
    (cwd / ".opencode" / "commands" / "deploy-preview.md").write_text(
        "---\ndescription: Deploy preview environment\n---\nRun preview deploy $ARGUMENTS\n",
        encoding="utf-8",
    )
    home = tmp_path / "home"
    (home / ".config" / "opencode" / "skills" / "aim-handoff").mkdir(parents=True)
    (home / ".config" / "opencode" / "skills" / "aim-handoff" / "SKILL.md").write_text(
        "---\nname: aim-handoff\ndescription: Handoff playbook\n---\n",
        encoding="utf-8",
    )

    client = TestClient(main.app)
    with (
        patch("routes_forensics._detect_session_vessel", return_value="opencode"),
        patch("routes_forensics._resolve_session_cwd", return_value=str(cwd)),
        patch("routes_forensics.HOME_DIR", str(home)),
    ):
        resp = client.get("/api/sessions/aim-joshua/slash-commands?vessel=opencode", headers={"x-api-token": admin_token})
    assert resp.status_code == 200
    cmds = {c["cmd"]: c for c in resp.json()["commands"]}
    assert "/deploy-preview" in cmds
    assert "/aim" in cmds  # Auto-synced generic wrapper
    assert "/aim-handoff" in cmds
    assert (home / ".config" / "opencode" / "commands" / "aim-handoff.md").is_file()


def test_bwrap_opencode_mounts_readonly_skills_and_commands(tmp_path):
    import opencode_skills as ocs

    home = tmp_path / "home"
    (home / ".config" / "opencode" / "skills").mkdir(parents=True)
    (home / ".config" / "opencode" / "commands").mkdir(parents=True)
    oc_cfg = tmp_path / "seat_cfg"
    oc_cfg.mkdir()

    flags = ocs.build_opencode_bwrap_skill_binds(str(home), str(oc_cfg))
    assert f"--ro-bind {home}/.config/opencode/skills {home}/.config/opencode/skills" in flags
    assert f"--ro-bind {home}/.config/opencode/commands {home}/.config/opencode/commands" in flags
    assert (oc_cfg / "skills").is_dir() and (oc_cfg / "commands").is_dir()


def test_frontend_passes_vessel_on_session_skill_actions():
    sidebar = (FRONTEND_SRC / "components" / "FleetSidebar.jsx").read_text(encoding="utf-8")
    app = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    assert "item.vessel" in sidebar
    assert "vessel" in app.split("const sendSessionCommand =", 1)[1].split("};", 1)[0]
