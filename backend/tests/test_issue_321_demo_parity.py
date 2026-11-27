"""#321: The GitHub Pages mock (docs/demo) mirrors #318 Fleet scroll memory and #320 RECENT."""

from pathlib import Path

DEMO = Path(__file__).resolve().parents[2] / "docs" / "demo"
APP_JS = (DEMO / "app.js").read_text(encoding="utf-8")
INDEX_HTML = (DEMO / "index.html").read_text(encoding="utf-8")


def test_mock_keeps_fleet_scroll_position_when_panel_closes():
    # The list is not rendered while the panel is closed, so the position must live in state.
    assert "fleetScrollTop: 0" in APP_JS
    assert "if (nextFleetList.isConnected) state.fleetScrollTop = nextFleetList.scrollTop" in APP_JS
    assert "nextFleetList.scrollTop = state.fleetScrollTop" in APP_JS


def test_mock_recent_updates_on_open_sorted_newest_first_with_limit():
    assert "function markRecentSession(" in APP_JS
    pick_handler = APP_JS.split("document.querySelectorAll('[data-pick-sess]')", 1)[1].split("});\n  });", 1)[0]
    assert "markRecentSession(picked)" in pick_handler
    assert "markRecentSession(s.name)" in APP_JS  # Cmd+K session switch too
    assert "state.recentSessions.slice(0, state.recentSessionsLimit)" in APP_JS
    assert "recentVisible.indexOf(a.name) - recentVisible.indexOf(b.name)" in APP_JS


def test_mock_has_recent_count_setting():
    assert "Recent Sessions to Keep" in APP_JS
    assert "data-recent-limit" in APP_JS
    for n in (3, 5, 8, 10, 15, 20, 30):
        assert f"[{', '.join(str(x) for x in (3, 5, 8, 10, 15, 20, 30))}]" in APP_JS


def test_mock_cache_buster_bumped():
    assert "app.js?v=321" in INDEX_HTML and "styles.css?v=321" in INDEX_HTML
