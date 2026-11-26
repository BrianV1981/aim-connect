"""#317: CHAT VIEW THINKING indicator for OpenCode 1.17 and Grok 1.0.

Fixtures are real `tmux capture-pane -p -J -S -120` frames captured from an isolated
`tmux -L aim317` socket (39-col narrow and 120-col wide) while each TUI was mid-turn / idle.
"""

from pathlib import Path

import pytest

import main  # noqa: F401  (import order: main wires routes_sessions; avoids circular import)
import routes_sessions as rs

FIXTURES = Path(__file__).parent / "fixtures" / "issue_317"


def _status(name: str, command: str) -> str:
    text = (FIXTURES / name).read_text(encoding="utf-8")
    return rs.parse_pane_telemetry(text, command=command, session_name="probe")["status"]


@pytest.mark.parametrize(
    "fixture,command",
    [
        ("opencode_narrow_busy.txt", "opencode"),
        ("opencode_wide_busy.txt", "opencode"),
        ("grok_narrow_thinking.txt", "grok"),
        ("grok_wide_responding.txt", "grok"),
    ],
)
def test_busy_frames_report_thinking(fixture, command):
    assert _status(fixture, command) == "THINKING"


@pytest.mark.parametrize(
    "fixture,command",
    [
        ("opencode_narrow_idle.txt", "opencode"),
        ("opencode_wide_idle.txt", "opencode"),
        ("grok_wide_idle.txt", "grok"),
    ],
)
def test_idle_frames_stay_idle(fixture, command):
    assert _status(fixture, command) == "IDLE"


def test_grok_stop_marker_in_old_scrollback_does_not_stick():
    """A finished Grok status row scrolled far above the input box must not keep THINKING alive."""
    lines = ["  ⠹ Thinking…       3.0s ⇣1.49k [stop]"] + [f"    answer paragraph line {i}" for i in range(12)] + [
        " ╭───────────────────────────────────╮",
        " │ ❯                                 │",
        " ╰─ Grok 4.7 (high) · always-approve─╯",
        " Ctrl+x:shortcuts",
    ]
    assert rs.parse_pane_telemetry("\n".join(lines), command="grok", session_name="probe")["status"] == "IDLE"
