import json
import subprocess
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import main
import routes_sessions as rs

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
GATE_UTILS_JS = FRONTEND_SRC / "gatePromptUtils.js"


@pytest.fixture
def admin_token():
    tok = "test-admin-token-308"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_parse_pane_telemetry_extracts_opencode_permission_gate_and_stage2_confirm():
    """#308: Extract exact OpenCode Permission required question, patterns, and Stage 2 Confirm/Cancel."""
    oc_pane = "\n".join(
        [
            "  ┃  #542 [CLOSED] Epic: Upgrade to RAG 5.2",
            "  ┃  Click to expand",
            "",
            "     ▣  Build · DeepSeek V4.1 Flash 1017  23.7K (12%)",
            "",
            "  ┃",
            "  ┃  △ Permission required",
            "  ┃    ← Access external directory ~/aim-agents/aim-auditor/joshua_os",
            "  ┃",
            "  ┃  Patterns",
            "  ┃",
            "  ┃  - ~/aim-agents/aim-auditor/joshua_os/*",
            "  ┃",
            "  ┃   Allow once   Allow always   Reject  ctrl+f fullscreen  ⇆ select  enter confirm",
            "  ┃",
        ]
    )
    tel = rs.parse_pane_telemetry(oc_pane, command="opencode", session_name="aim-joshua")
    assert tel["vessel"] == "opencode"
    assert tel["status"] == "WAITING"
    assert tel["preview"].startswith("GATE: Access external directory")
    gate = tel["gate_info"]
    assert gate is not None
    assert gate["kind"] == "opencode_permission"
    assert gate["question"] == "Access external directory ~/aim-agents/aim-auditor/joshua_os"
    assert any("~/aim-agents/aim-auditor/joshua_os/*" in ln for ln in gate["details"])

    # Stage 2 after selecting Allow always ("Confirm   Cancel")
    oc_stage2 = "\n".join(
        [
            "     ▣  Build · DeepSeek V4.1 Flash 1017",
            "  ┃  Always allow these rules until OpenCode is restarted.",
            "  ┃  - ~/aim-agents/aim-auditor/joshua_os/*",
            "  ┃   Confirm   Cancel   ⇆ select   enter confirm",
        ]
    )
    tel2 = rs.parse_pane_telemetry(oc_stage2, command="opencode", session_name="aim-joshua")
    assert tel2["status"] == "WAITING"
    assert tel2["gate_info"]["kind"] == "opencode_confirm"
    assert "Always allow" in tel2["gate_info"]["question"]


def test_parse_pane_telemetry_extracts_numbered_choice_and_yn_prompts():
    """#308: Extract numbered tool-approval menus and standard [y/n] confirmation questions."""
    numbered_pane = "\n".join(
        [
            "● Bash(git push origin master)",
            "Do you want to proceed with running git push?",
            "❯ 1. Yes, run once",
            "  2. Yes, allow always in this workspace",
            "  3. No, cancel (Esc)",
            "Enter to select · Esc to cancel",
        ]
    )
    tel_num = rs.parse_pane_telemetry(numbered_pane, command="agy", session_name="aim-connect")
    assert tel_num["status"] == "WAITING"
    gate_num = tel_num["gate_info"]
    assert gate_num["kind"] == "numbered_choice"
    assert "Do you want to proceed" in gate_num["question"]
    assert len(gate_num["options"]) == 3
    assert gate_num["options"][0] == {"key": "1", "label": "Yes, run once"}

    yn_pane = "\n".join(
        [
            "[1/5] Preparing to promote 'fix/issue-308' to master...",
            "[CRITICAL INTERVENTION REQUIRED]",
            "Merge branch 'fix/issue-308' to master? (yes/no):",
        ]
    )
    tel_yn = rs.parse_pane_telemetry(yn_pane, command="python3", session_name="aim-joshua")
    assert tel_yn["status"] == "WAITING"
    gate_yn = tel_yn["gate_info"]
    assert gate_yn["kind"] == "yn_prompt"
    assert "Merge branch 'fix/issue-308' to master? (yes/no):" in gate_yn["question"]


def test_api_sessions_exposes_gate_info_in_fleet_payload(admin_token):
    """#308: GET /api/sessions passes gate_info through on WAITING fleet items."""
    oc_capture = "\n".join(
        [
            "     ▣  Build · DeepSeek V4.1 Flash",
            "  ┃  △ Permission required",
            "  ┃    ← Execute bash: ./aim promote",
            "  ┃   Allow once   Allow always   Reject  ⇆ select  enter confirm",
        ]
    )

    def fake_run(cmd, *args, **kwargs):
        res = MagicMock()
        res.returncode = 0
        if cmd[:2] == ["tmux", "ls"]:
            res.stdout = "aim-joshua\n"
        elif cmd[:2] == ["tmux", "list-panes"]:
            res.stdout = "aim-joshua@@@0@@@main@@@0@@@opencode@@@/workspace/aim-joshua@@@1331@@@1@@@1700000001\n"
        elif cmd[:2] == ["tmux", "capture-pane"]:
            res.stdout = oc_capture
        else:
            res.stdout = ""
        return res

    client = TestClient(main.app)
    with patch("routes_sessions.subprocess.run", side_effect=fake_run), patch(
        "routes_sessions._read_browser_leases_telemetry", return_value=({}, {})
    ):
        resp = client.get("/api/sessions", headers={"x-api-token": admin_token})
    assert resp.status_code == 200
    fleet = resp.json()["fleet"]
    assert len(fleet) == 1
    assert fleet[0]["status"] == "WAITING"
    assert fleet[0]["gate_info"]["kind"] == "opencode_permission"
    assert fleet[0]["gate_info"]["question"] == "Execute bash: ./aim promote"


def test_frontend_gate_prompt_utils_and_live_transcript_wiring():
    """#308: Node ESM unit tests for gatePromptUtils.js (ensuring OpenCode Reject uses Esc, not n\\r) + JSX check."""
    assert GATE_UTILS_JS.is_file()

    node_script = f"""
import assert from 'node:assert/strict';
import {{ resolveGateBannerModel }} from {json.dumps(GATE_UTILS_JS.as_uri())};

assert.equal(resolveGateBannerModel({{ status: 'IDLE' }}), null);

// OpenCode permission modal -> Enter for Allow once, Right+Enter for Allow always, Esc for Reject (NEVER n\\r!)
const oc = resolveGateBannerModel({{
  status: 'WAITING',
  gate_info: {{
    kind: 'opencode_permission',
    title: 'Permission Required',
    question: 'Access external directory ~/aim-agents/aim-auditor/joshua_os',
    details: ['Patterns', '- ~/aim-agents/aim-auditor/joshua_os/*'],
  }},
}});
assert.equal(oc.question, 'Access external directory ~/aim-agents/aim-auditor/joshua_os');
assert.equal(oc.details.length, 2);
assert.deepEqual(
  oc.actions.map((a) => [a.label, a.payload]),
  [
    ['ALLOW ONCE', '\\r'],
    ['ALLOW ALWAYS', '\\x1b[C\\r'],
    ['REJECT (ESC)', '\\x1b'],
  ]
);

// Numbered choices -> 1\\r, 2\\r, Esc
const num = resolveGateBannerModel({{
  status: 'WAITING',
  gate_info: {{
    kind: 'numbered_choice',
    question: 'Run command?',
    details: [],
    options: [
      {{ key: '1', label: 'Yes' }},
      {{ key: '2', label: 'No' }},
    ],
  }},
}});
assert.equal(num.actions[0].payload, '1\\r');
assert.equal(num.actions[1].payload, '2\\r');
assert.equal(num.actions[2].payload, '\\x1b');

// Standard y/n fallback
const yn = resolveGateBannerModel({{
  status: 'WAITING',
  preview: 'GATE: Merge branch? (yes/no):',
  gate_info: null,
}});
assert.equal(yn.question, 'Merge branch? (yes/no):');
assert.equal(yn.actions[0].payload, 'y\\r');
assert.equal(yn.actions[1].payload, 'n\\r');
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", node_script],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"Node test failed:\\nSTDOUT: {proc.stdout}\\nSTDERR: {proc.stderr}"

    stage_jsx = (FRONTEND_SRC / "components" / "LiveTranscriptStage.jsx").read_text(encoding="utf-8")
    assert "resolveGateBannerModel" in stage_jsx
    assert "chat-gate-question" in stage_jsx
    assert "chat-gate-details" in stage_jsx
