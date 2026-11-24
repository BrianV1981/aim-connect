import asyncio
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import main
import ws_handler

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"


@pytest.fixture
def admin_token():
    tok = "test-admin-token-288"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_execute_bracketed_paste_atomic_submit_uses_named_buffer_and_settle():
    """#288: When submit_enter=True, paste uses an isolated named buffer (-p -r -d -b), settles, then sends Enter."""
    spawned_cmds = []
    communicated_inputs = []
    sleeps = []

    class FakeProc:
        def __init__(self, stdout=b""):
            self.returncode = 0
            self._stdout = stdout

        async def communicate(self, input=None):
            if input is not None:
                communicated_inputs.append(input)
            return (self._stdout, b"")

        async def wait(self):
            return 0

    async def fake_exec(*cmd, **kwargs):
        spawned_cmds.append(list(cmd))
        return FakeProc()

    async def fake_sleep(sec):
        sleeps.append(sec)

    with (
        patch("ws_handler.asyncio.create_subprocess_exec", side_effect=fake_exec),
        patch("ws_handler.asyncio.sleep", side_effect=fake_sleep),
    ):
        ok = asyncio.run(
            ws_handler.execute_bracketed_paste(
                "aim-connect",
                "Run pytest now",
                submit_enter=True,
                settle_s=0.25,
            )
        )

    assert ok is True
    assert communicated_inputs == [b"Run pytest now"]
    assert sleeps == [0.25]
    assert len(spawned_cmds) == 3

    load_cmd, paste_cmd, enter_cmd = spawned_cmds
    assert load_cmd[:3] == ["tmux", "load-buffer", "-b"]
    buf_name = load_cmd[3]
    assert load_cmd[4] == "-"
    assert paste_cmd == ["tmux", "paste-buffer", "-p", "-r", "-d", "-b", buf_name, "-t", "aim-connect"]
    assert enter_cmd == ["tmux", "send-keys", "-t", "aim-connect", "Enter"]


def test_execute_bracketed_paste_confirms_slash_skill_if_still_sitting_in_prompt():
    """#288: If a single-token /skill command remains sitting unsubmitted at > prompt after Enter 1, send Enter 2."""
    spawned_cmds = []

    class FakeProc:
        def __init__(self, stdout=b""):
            self.returncode = 0
            self._stdout = stdout

        async def communicate(self, input=None):
            return (self._stdout, b"")

        async def wait(self):
            return 0

    async def fake_exec(*cmd, **kwargs):
        spawned_cmds.append(list(cmd))
        if cmd[:2] == ("tmux", "capture-pane"):
            # Simulate AGY after Enter 1 confirmed autocomplete and left "> /aim-handoff " on prompt
            return FakeProc(stdout=b"\n> /aim-handoff \n")
        return FakeProc()

    async def fake_sleep(_sec):
        return None

    with (
        patch("ws_handler.asyncio.create_subprocess_exec", side_effect=fake_exec),
        patch("ws_handler.asyncio.sleep", side_effect=fake_sleep),
    ):
        ok = asyncio.run(
            ws_handler.execute_bracketed_paste(
                "aim-connect",
                "/aim-handoff",
                submit_enter=True,
                settle_s=0.25,
            )
        )

    assert ok is True
    enter_calls = [c for c in spawned_cmds if c[:2] == ["tmux", "send-keys"] and c[-1] == "Enter"]
    assert len(enter_calls) == 2


def test_send_session_command_hardened_bracketed_named_buffer_and_slash_confirm(admin_token):
    """#288: POST /api/sessions/{name}/command uses named-buffer bracketed paste (-p -r -d), 0.25s settle, and Enter."""
    calls = []
    sleeps = []

    def fake_run(cmd, *args, **kwargs):
        calls.append(cmd)
        m = MagicMock()
        m.returncode = 0
        m.stderr = ""
        # Simulate prompt already cleared after Enter 1 (builtin command like /help)
        m.stdout = "Antigravity CLI v1.5.16\n" if cmd[:2] == ["tmux", "capture-pane"] else ""
        return m

    client = TestClient(main.app)
    with (
        patch("routes_sessions.subprocess.run", side_effect=fake_run),
        patch("routes_sessions.time.sleep", side_effect=lambda s: sleeps.append(s)),
    ):
        resp = client.post(
            "/api/sessions/aim-connect/command",
            headers={"x-api-token": admin_token},
            json={"command": "/aim-handoff"},
        )

    assert resp.status_code == 200
    assert resp.json()["status"] == "sent"
    assert sleeps[0] >= 0.25
    assert calls[0][:3] == ["tmux", "load-buffer", "-b"]
    buf_name = calls[0][3]
    assert calls[1] == ["tmux", "paste-buffer", "-p", "-r", "-d", "-b", buf_name, "-t", "aim-connect"]
    assert calls[2] == ["tmux", "send-keys", "-t", "aim-connect", "Enter"]


def test_frontend_submit_composer_prompt_uses_atomic_paste_submit():
    """#288: App.jsx submitComposerPrompt sends atomic { type: 'paste', submit: true } with zero 90ms setTimeout race."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    submit_block = app_jsx.split("const submitComposerPrompt = useCallback(() => {")[1].split("submitComposerPromptRef.current = submitComposerPrompt;")[0]
    assert "submit: true" in submit_block
    assert "setTimeout(() => sendCommand('\\r'), 90)" not in submit_block
