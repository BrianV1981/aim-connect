"""#315: OpenCode permission banner must keep the real question on narrow (mobile) panes.

On a 39-column pane OpenCode paints every row to the last column, so tmux marks the rows as
wrapped and `capture-pane -J` glues the whole permission modal into one long line. The parser
used to discard that line (it contains the `Allow once  Allow always` action bar) and fall back
to the generic "Approve requested action?".
"""

import main  # noqa: F401  (import order: main wires routes_sessions; avoids circular import)
import routes_sessions as rs

PANE_WIDTH = 39


def _row(text: str = "", modal: bool = True) -> str:
    """Render one full-width OpenCode TUI row (`  ┃  <text>` padded to the pane width)."""
    body = f"  ┃  {text}" if modal else f"     {text}"
    return body.ljust(PANE_WIDTH)[:PANE_WIDTH]


def _tmux_join(rows: list[str]) -> str:
    """Emulate `tmux capture-pane -J`: full-width wrapped rows are concatenated with no separator."""
    return "".join(rows)


def _narrow_permission_capture() -> str:
    scrollback = [
        "  Downstream consumer projects must nev",
        "     install, publishing a retrieval   ",
        "     benchmark, and adding optional    ",
    ]
    joined_modal = _tmux_join(
        [
            _row("Standardize **A-Mail (`amail` /"),
            _row("`aim-mail`, powered by [`aim-"),
            _row("mailbox…"),
            _row(),
            _row("Click to expand"),
            _row(),
            _row("▣  Build · DeepSeek V4.1 Flash", modal=False),
            _row("1017", modal=False),
            _row(),
            _row("△ Permission required"),
            _row("  ← Access external"),
            _row("    directory ~/aim-agents/"),
            _row("    aim-auditor/workspace"),
            _row(),
            _row("Patterns"),
            _row(),
            _row("- /home/user/aim-agents/aim-"),
            _row("auditor/workspace/*"),
            _row(),
            _row(" Allow once   Allow always   Rejec"),
        ]
    )
    footer = [
        _row(),
        _row("ctrl+f fullscreen  ⇆ select  enter"),
        _row(),
        " " * PANE_WIDTH,
    ]
    return "\n".join(scrollback + [joined_modal] + footer)


def test_narrow_pane_joined_modal_keeps_question_and_pattern():
    capture = _narrow_permission_capture()
    # Sanity: the modal really arrives as one glued line, exactly like the live phone capture.
    assert sum(1 for ln in capture.splitlines() if "Permission required" in ln and "Allow once" in ln) == 1

    tel = rs.parse_pane_telemetry(capture, command="opencode", session_name="aim-joshua")
    assert tel["vessel"] == "opencode"
    assert tel["status"] == "WAITING"
    gate = tel["gate_info"]
    assert gate["kind"] == "opencode_permission"
    assert gate["question"] == "Access external directory ~/aim-agents/aim-auditor/workspace"
    assert gate["question"] != "Approve requested action?"
    assert "Patterns" in gate["details"]
    assert "- /home/user/aim-agents/aim-auditor/workspace/*" in gate["details"]
    assert not any("Allow once" in d or "ctrl+f" in d or "Build ·" in d for d in gate["details"])
    assert tel["preview"] == "GATE: Access external directory ~/aim-agents/aim-auditor/workspace"


def test_narrow_pane_joined_stage2_confirm_rejoins_wrapped_sentence():
    capture = "\n".join(
        [
            _row("▣  Build · DeepSeek V4.1 Flash", modal=False),
            _tmux_join(
                [
                    _row("Always allow these rules until"),
                    _row("OpenCode is restarted."),
                    _row(),
                    _row("- /home/user/aim-agents/aim-"),
                    _row("auditor/workspace/*"),
                    _row(),
                    _row(" Confirm   Cancel   ⇆ select"),
                ]
            ),
        ]
    )
    tel = rs.parse_pane_telemetry(capture, command="opencode", session_name="aim-joshua")
    assert tel["status"] == "WAITING"
    gate = tel["gate_info"]
    assert gate["kind"] == "opencode_confirm"
    assert gate["question"] == "Always allow these rules until OpenCode is restarted."
    assert gate["details"] == ["- /home/user/aim-agents/aim-auditor/workspace/*"]


def test_wide_pane_unjoined_modal_unchanged():
    """Regression: separate-row (wide desktop) captures keep one detail per paragraph."""
    capture = "\n".join(
        [
            "     ▣  Build · DeepSeek V4.1 Flash 1017  23.7K (12%)",
            "  ┃",
            "  ┃  △ Permission required",
            "  ┃    ← Execute bash: git push origin master",
            "  ┃",
            "  ┃  Patterns",
            "  ┃",
            "  ┃  - git push *",
            "  ┃",
            "  ┃   Allow once   Allow always   Reject  ctrl+f fullscreen  ⇆ select  enter confirm",
            "  ┃",
        ]
    )
    gate = rs.parse_pane_telemetry(capture, command="opencode", session_name="aim-joshua")["gate_info"]
    assert gate["question"] == "Execute bash: git push origin master"
    assert gate["details"] == ["Patterns", "- git push *"]
