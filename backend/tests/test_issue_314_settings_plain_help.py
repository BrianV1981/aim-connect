import json
import re
import subprocess
import time
from pathlib import Path

import pytest

import tmux_workspace_manager as twm

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
SRC = WORKTREE_ROOT / "frontend" / "src"
HELP_JS = SRC / "settingsHelp.js"
SETTINGS_JSX = SRC / "components" / "SettingsModal.jsx"


def _load_help() -> dict:
    script = f"""
import {{ SETTINGS_HELP, SUMMARY_JARGON }} from {json.dumps(HELP_JS.as_uri())};
console.log(JSON.stringify({{ help: SETTINGS_HELP, jargon: SUMMARY_JARGON }}));
"""
    proc = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True, timeout=10)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


@pytest.fixture(scope="module")
def help_data():
    return _load_help()


@pytest.fixture(scope="module")
def settings_jsx():
    return SETTINGS_JSX.read_text(encoding="utf-8")


def test_every_help_entry_has_plain_summary_and_bubble_details(help_data):
    entries = help_data["help"]
    assert len(entries) >= 50
    for key, entry in entries.items():
        assert isinstance(entry.get("summary"), str) and entry["summary"].strip(), key
        assert isinstance(entry.get("details"), str) and len(entry["details"]) >= 40, key
        assert len(entry["summary"]) <= 170, f"{key} summary too long for a one-line explanation"


def test_visible_summaries_contain_no_technical_jargon(help_data):
    offenders = []
    for key, entry in help_data["help"].items():
        text = f" {entry['summary'].lower()} "
        for term in help_data["jargon"]:
            t = term.lower()
            if t.strip().isalnum():
                hit = re.search(rf"\b{re.escape(t.strip())}\b", text)
            else:
                hit = t in text
            if hit:
                offenders.append((key, term))
    assert offenders == []


def test_settings_modal_references_only_defined_help_and_uses_all_of_it(help_data, settings_jsx):
    used = set(re.findall(r'<(?:Help|Summary) k="([A-Za-z0-9]+)"', settings_jsx))
    used |= set(re.findall(r"SETTINGS_HELP\.([A-Za-z0-9]+)\.", settings_jsx))
    used |= set(re.findall(r"'(voice[A-Z][A-Za-z]+)'\]", settings_jsx))  # dictation rows pass helpKey strings
    defined = set(help_data["help"])
    assert used - defined == set(), f"undefined help keys: {sorted(used - defined)}"
    assert defined - used == set(), f"help written but never shown: {sorted(defined - used)}"


def test_every_checkbox_setting_has_an_info_bubble(settings_jsx):
    labels = re.findall(r"<label\b.*?</label>", settings_jsx, flags=re.S)
    checkbox_labels = [blk for blk in labels if 'type="checkbox"' in blk]
    assert len(checkbox_labels) >= 12  # the 6 voice-typing rows render from one mapped <label>
    missing = [blk[:120] for blk in checkbox_labels if "<Help" not in blk]
    assert missing == []


def test_every_settings_card_title_or_row_offers_help(settings_jsx):
    # Each card (settings-group-card) must contain at least one help bubble.
    cards = settings_jsx.split('className="settings-group-card"')[1:]
    assert len(cards) >= 15
    for idx, card in enumerate(cards):
        body = card.split('className="settings-group-card"')[0]
        assert "<Help" in body, f"settings card #{idx + 1} has no ? help bubble"


@pytest.mark.parametrize("path", ["components/SettingsModal.jsx", "components/FleetSidebar.jsx", "components/CommandPalette.jsx"])
def test_no_stale_dash_c_wording_remains(path):
    text = (SRC / path).read_text(encoding="utf-8")
    for stale in ("RESTORE -C", "(-C)", "(-c)", "<code>-c</code>", "RESUME -C"):
        assert stale not in text, f"{stale!r} still in {path}"


def test_info_bubble_never_toggles_parent_checkbox_row():
    src = (SRC / "components" / "InfoBubble.jsx").read_text(encoding="utf-8")
    assert 'type="button"' in src
    assert "e.preventDefault()" in src and "e.stopPropagation()" in src
    assert "aria-expanded={open}" in src


def test_claude_is_selectable_default_agent(tmp_path, monkeypatch, settings_jsx):
    assert '<option value="claude">Claude Code (claude)</option>' in settings_jsx
    monkeypatch.setenv("AIM_TMUX_SETTINGS_FILE", str(tmp_path / "s.json"))
    monkeypatch.setenv("AIM_DASHBOARD_CONFIG_FILE", str(tmp_path / "d.json"))
    monkeypatch.setenv("AIM_TMUX_CONF", str(tmp_path / ".tmux.conf"))
    saved = twm.save_tmux_settings({"default_agent": "claude"})
    assert saved["default_agent"] == "claude"
    assert twm.load_tmux_settings()["default_agent"] == "claude"
    assert time.time() > 0
