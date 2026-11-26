"""#316: Fleet preview must be a readable content row, not jumbled `capture-pane -J` fragments."""

import main  # noqa: F401  (import order: main wires routes_sessions; avoids circular import)
import routes_sessions as rs

PANE_WIDTH = 39


def _row(text: str = "", modal: bool = True) -> str:
    body = f"  ┃  {text}" if modal else f"     {text}"
    return body.ljust(PANE_WIDTH)[:PANE_WIDTH]


def _opencode_input_box() -> list[str]:
    return [
        _row(),
        _row(),
        _row("Bui ·DeepSeek V4.1 Flash 1017 D·h"),
        _row("ld                            e i"),
        "  ╹" + "▀" * 34,
        "   11.2K (1%) · $0.00 ctrl+p commands ",
    ]


def test_narrow_joined_opencode_idle_preview_is_last_content_row():
    joined = "".join(
        [
            _row("worker reported back:"),
            _row("=== CI poll ==="),
            _row("Minimal Smoke Test=in_progress"),
            _row(),
        ]
    )
    capture = "\n".join(
        [joined, _row("▣  Build · DeepSeek V4.1 Flash", modal=False), _row("1017 · 44.9s", modal=False)]
        + _opencode_input_box()
    )
    tel = rs.parse_pane_telemetry(capture, command="opencode", session_name="aim-joshua")
    assert tel["status"] == "IDLE"
    assert tel["preview"] == "Minimal Smoke Test=in_progress"


def test_wide_opencode_idle_preview_skips_input_box_and_footer():
    capture = "\n".join(
        [
            "     trips across the hierarchy, which is why caching matters so much for          ",
            "     everyday browsing speed.                                                      ",
            "     ▣  Build · DeepSeek V4.1 Flash 1017 · 3.1s                                    ",
            "  ┃                                                                               ",
            "  ┃  Build · DeepSeek V4.1 Flash 1017 DeepSeek · high                             ",
            "  ╹" + "▀" * 70,
            "                                         11.7K (1%) · $0.00  ctrl+p commands      ",
        ]
    )
    tel = rs.parse_pane_telemetry(capture, command="opencode", session_name="oc")
    assert tel["preview"] == "everyday browsing speed."


def test_agy_prompt_box_preview_uses_scrollback_not_footer():
    border = "─" * 60
    capture = "\n".join(
        [
            "  Promotion complete; backend recycled on :8000.",
            border,
            "> Auto mode: edits & safe commands auto-approved (shift+tab to cycle)",
            border,
            "? for shortcuts                                     auto · Gemini 4 Carbon · high",
        ]
    )
    tel = rs.parse_pane_telemetry(capture, command="agy.real", session_name="aim-connect")
    assert tel["preview"] == "Promotion complete; backend recycled on :8000."


def test_preview_never_contains_column_padding_runs():
    joined = "".join([_row("alpha line one"), _row("beta line two"), _row()])
    capture = "\n".join([joined] + _opencode_input_box())
    preview = rs.parse_pane_telemetry(capture, command="opencode", session_name="x")["preview"]
    assert preview == "beta line two"
    assert "  " not in preview and "┃" not in preview
