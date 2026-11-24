import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
VOICE_UTILS_JS = FRONTEND_SRC / "voiceDictationUtils.js"


def test_voice_dictation_chat_preview_logic_in_node():
    """#286: Verify live interim preview, Chat View composer accumulation, punctuation joining, and voice send/macro triggers."""
    assert VOICE_UTILS_JS.is_file(), "Missing frontend/src/voiceDictationUtils.js"

    script = f"""
import {{
  classifyVoiceCommand,
  formatDictationTranscript,
  appendDictatedTextToComposer,
  buildComposerDisplayValue,
}} from {json.dumps(VOICE_UTILS_JS.as_uri())};

// 1. Interim display joins cleanly with committed composerText
const live1 = buildComposerDisplayValue('', 'check the');
const live2 = buildComposerDisplayValue('Mic check ', 'one two');
const livePunct = buildComposerDisplayValue('Hello ', ', world');

// 2. Finalized dictation formats punctuation and appends cleanly into Chat View composer
const f1 = formatDictationTranscript('mic check', {{ voiceAutoCapitalize: true, lastEndedSentence: true }});
const c1 = appendDictatedTextToComposer('', f1);
const f2 = formatDictationTranscript('period', {{ voiceAutoCapitalize: true, lastEndedWithSpace: true, lastEndedSentence: false }});
const c2 = appendDictatedTextToComposer(c1, f2);
const f3 = formatDictationTranscript('how are you question mark', {{ voiceAutoCapitalize: true, lastEndedWithSpace: true, lastEndedSentence: true }});
const c3 = appendDictatedTextToComposer(c2, f3);

// 3. Voice command classification (macro vs send/execute/enter vs dictation)
const cmdSend = classifyVoiceCommand('  Send ', {{ voiceAutoSend: true }});
const cmdExec = classifyVoiceCommand('execute', {{ voiceAutoExecute: true }});
const cmdMacro = classifyVoiceCommand('handoff', {{
  macroLibrary: [{{ label: 'Handoff', voiceTrigger: 'handoff', cmd: '/aim-handoff\\r' }}],
}});
const cmdText = classifyVoiceCommand('open yahoo finance');

console.log(JSON.stringify({{
  live1,
  live2,
  livePunct,
  c1,
  c2,
  c3,
  cmdSend,
  cmdExec,
  cmdMacro,
  cmdText,
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

    assert out["live1"] == "check the"
    assert out["live2"] == "Mic check one two"
    assert out["livePunct"] == "Hello, world"
    assert out["c1"] == "Mic check "
    assert out["c2"] == "Mic check. "
    assert out["c3"] == "Mic check. How are you? "
    assert out["cmdSend"] == {"kind": "submit", "macro": None}
    assert out["cmdExec"] == {"kind": "submit", "macro": None}
    assert out["cmdMacro"]["kind"] == "macro"
    assert out["cmdMacro"]["macro"]["cmd"] == "/aim-handoff\r"
    assert out["cmdText"] == {"kind": "dictation", "macro": None}


def test_issue_286_chat_view_voice_preview_wired_in_app():
    """#286: Verify App.jsx enables interimResults, routes Chat View dictation to composerText, and shows live interim preview."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")

    assert "voiceDictationUtils" in app_jsx
    assert "recognition.interimResults = true" in app_jsx
    assert "voiceInterimText" in app_jsx
    assert "buildComposerDisplayValue" in app_jsx
    assert "appendDictatedTextToComposer" in app_jsx
    assert "submitComposerPrompt" in app_jsx
    assert "agentStageModeRef" in app_jsx
