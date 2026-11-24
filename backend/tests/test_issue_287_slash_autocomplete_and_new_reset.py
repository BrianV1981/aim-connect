import json
import subprocess
import time
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import main

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
SLASH_UTILS_JS = FRONTEND_SRC / "slashCommandUtils.js"


@pytest.fixture
def admin_token():
    tok = "test-admin-token-287"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_slash_command_utils_filtering_completion_and_new_reset_in_node():
    """#287: Verify /hando prefix+segment matching, Enter completion with trailing space, and /new fresh-session reset logic."""
    assert SLASH_UTILS_JS.is_file(), "Missing frontend/src/slashCommandUtils.js"

    script = f"""
import {{
  extractActiveSlashToken,
  filterSlashCommands,
  completeSlashCommand,
  isSessionResetSlashCommand,
  computeTurnsSignature,
  shouldShowFreshSessionReset,
}} from {json.dumps(SLASH_UTILS_JS.as_uri())};

const commands = [
  {{ cmd: '/new', kind: 'builtin', description: 'Start fresh conversation' }},
  {{ cmd: '/compact', kind: 'builtin', description: 'Compact context' }},
  {{ cmd: '/aim-handoff', kind: 'skill', description: 'Run structured handoff' }},
  {{ cmd: '/custom-handoff', kind: 'skill', description: 'Custom handoff workflow' }},
  {{ cmd: '/aim-memory-wiki', kind: 'skill', description: 'Ingest wiki memory' }},
];

const tokOpen = extractActiveSlashToken('/hando');
const tokClosed = extractActiveSlashToken('/aim-handoff ');
const handoMatches = filterSlashCommands(commands, '/hando').map((c) => c.cmd);
const cMatches = filterSlashCommands(commands, '/comp').map((c) => c.cmd);
const afterSpace = filterSlashCommands(commands, '/aim-handoff ');
const completed = completeSlashCommand({{ cmd: '/aim-handoff' }});

const isNew = isSessionResetSlashCommand('/new');
const isHandoff = isSessionResetSlashCommand('/aim-handoff');

const prevTurns = [{{ user: 'hi', body: 'hello', spoken: 'hello' }}];
const marker = {{ prevSource: '/tmp/conv1/transcript.jsonl', prevSig: computeTurnsSignature(prevTurns) }};
const stillStale = shouldShowFreshSessionReset(marker, {{ source: '/tmp/conv1/transcript.jsonl', turns: prevTurns }});
const newFileArrived = shouldShowFreshSessionReset(marker, {{ source: '/tmp/conv2/transcript.jsonl', turns: [{{ user: 'next', body: 'ok', spoken: '' }}] }});
const newTurnArrived = shouldShowFreshSessionReset(marker, {{ source: '/tmp/conv1/transcript.jsonl', turns: [...prevTurns, {{ user: 'next', body: 'ok', spoken: '' }}] }});

console.log(JSON.stringify({{
  tokOpen,
  tokClosed,
  handoMatches,
  cMatches,
  afterSpace,
  completed,
  isNew,
  isHandoff,
  stillStale,
  newFileArrived,
  newTurnArrived,
}}));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        timeout=4.0,
    )
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout.strip())

    assert out["tokOpen"] == {"active": True, "query": "hando"}
    assert out["tokClosed"] == {"active": False, "query": ""}
    assert out["handoMatches"] == ["/aim-handoff", "/custom-handoff"]
    assert out["cMatches"] == ["/compact"]
    assert out["afterSpace"] == []
    assert out["completed"] == "/aim-handoff "
    assert out["isNew"] is True
    assert out["isHandoff"] is False
    assert out["stillStale"] is True
    assert out["newFileArrived"] is False
    assert out["newTurnArrived"] is False


def test_slash_commands_endpoint_discovers_builtin_and_custom_skills(tmp_path, admin_token):
    """#287: GET /api/sessions/{session}/slash-commands merges per-vessel builtins with live SKILL.md frontmatter."""
    skill_dir = tmp_path / "skills" / "custom-handoff"
    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text(
        "---\nname: custom-handoff\ndescription: Custom handoff flow for test\n---\n# Custom\n",
        encoding="utf-8",
    )

    client = TestClient(main.app)
    with (
        patch("routes_forensics._skill_dirs_for_vessel", return_value=[str(tmp_path / "skills")]),
        patch("routes_forensics._resolve_session_cwd", return_value=str(tmp_path)),
    ):
        resp = client.get(
            "/api/sessions/aim-connect/slash-commands?vessel=agy",
            headers={"x-api-token": admin_token},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["vessel"] == "agy"
    cmds = {item["cmd"]: item for item in data["commands"]}
    assert "/new" in cmds
    assert cmds["/new"]["kind"] == "builtin"
    assert "/custom-handoff" in cmds
    assert cmds["/custom-handoff"]["kind"] == "skill"
    assert "Custom handoff flow" in cmds["/custom-handoff"]["description"]


def test_issue_287_chat_view_slash_dropdown_and_reset_wired_in_frontend():
    """#287: Verify App.jsx, LiveTranscriptStage.jsx, and App.css wire slash autocomplete dropdown & /new reset banner."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    chat_jsx = (FRONTEND_SRC / "components" / "LiveTranscriptStage.jsx").read_text(encoding="utf-8")
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    assert "slashCommandUtils" in app_jsx
    assert "/slash-commands" in app_jsx
    assert "slashDropdownItems" in app_jsx
    assert "slash-autocomplete-popover" in app_jsx
    assert "chatResetBySession" in app_jsx
    assert "shouldShowFreshSessionReset" in chat_jsx
    assert "fresh-session-banner" in chat_jsx
    assert ".slash-autocomplete-popover" in css
