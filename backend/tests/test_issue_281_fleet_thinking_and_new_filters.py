import json
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import pytest
import websockets


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
FLEET_FILTER_UTILS = FRONTEND_SRC / "fleetFilterUtils.js"
FLEET_SIDEBAR_JSX = FRONTEND_SRC / "components" / "FleetSidebar.jsx"
APP_JSX = FRONTEND_SRC / "App.jsx"
APP_CSS = FRONTEND_SRC / "App.css"


def test_fleet_filter_utils_thinking_new_and_unread_reconciliation_in_node():
    """#281: Verify THINKING & NEW filter counts/filtering and unread queue pruning on termination or THINKING resume."""
    assert FLEET_FILTER_UTILS.is_file(), "Missing frontend/src/fleetFilterUtils.js"

    script = f"""
import {{
  computeFleetFilterCounts,
  filterFleetItems,
  reconcileUnreadSessions,
}} from {json.dumps(FLEET_FILTER_UTILS.as_uri())};

const sampleItems = [
  {{ session_name: 'aim-connect', vessel: 'agy', status: 'THINKING', tokens_used: 180000, tier: 'normal', has_browser_lease: false }},
  {{ session_name: 'aim-ld', vessel: 'grok', status: 'IDLE', tokens_used: 90000, tier: 'warning', has_browser_lease: true }},
  {{ session_name: 'aim-mcp', vessel: 'opencode', status: 'IDLE', tokens_used: 45000, tier: 'normal', has_browser_lease: false }},
  {{ session_name: 'aim-connect-workspace', vessel: 'service', status: 'THINKING', tokens_used: 0, tier: 'normal', has_browser_lease: false }},
];

const unread = ['aim-ld', 'aim-mcp', 'aim-connect'];
const counts = computeFleetFilterCounts(sampleItems, unread);
const thinkingFiltered = filterFleetItems(sampleItems, {{ statusFilter: 'thinking', unreadSessions: unread }}).map((x) => x.session_name);
const newFiltered = filterFleetItems(sampleItems, {{ statusFilter: 'new', unreadSessions: unread }}).map((x) => x.session_name);
const newWithSearch = filterFleetItems(sampleItems, {{ statusFilter: 'new', filterText: 'mcp', unreadSessions: unread }}).map((x) => x.session_name);

// Reconcile: 'dead-sess' removed, 'aim-connect' (status THINKING) removed, 'active-sess' excluded, 'aim-browser' newly completed added
const prevUnread = ['aim-ld', 'dead-sess', 'aim-connect', 'active-sess'];
const liveSessions = ['aim-connect', 'aim-ld', 'aim-mcp', 'aim-browser', 'active-sess'];
const nextUnread = reconcileUnreadSessions(prevUnread, liveSessions, sampleItems, ['aim-browser', 'active-sess'], 'active-sess');
const unchangedCheck = reconcileUnreadSessions(nextUnread, liveSessions, sampleItems, [], 'active-sess');

console.log(JSON.stringify({{
  counts,
  thinkingFiltered,
  newFiltered,
  newWithSearch,
  nextUnread,
  preservedRef: unchangedCheck === nextUnread,
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

    # Raw service daemon ('aim-connect-workspace') is NOT counted as an AI THINKING session
    assert out["counts"]["thinking"] == 1
    # 'aim-connect' is THINKING so excluded from NEW; 'aim-ld' & 'aim-mcp' are IDLE unread -> 2
    assert out["counts"]["unread"] == 2
    assert out["thinkingFiltered"] == ["aim-connect"]
    assert out["newFiltered"] == ["aim-ld", "aim-mcp"]
    assert out["newWithSearch"] == ["aim-mcp"]
    assert out["nextUnread"] == ["aim-ld", "aim-browser"]
    assert out["preservedRef"] is True


from tests.headless_cdp_helper import find_working_chromium_binary, launch_headless_cdp_page


def test_fleet_sidebar_thinking_and_new_pills_fit_280px_without_overlap():
    """#281: Verify FleetSidebar.jsx wires THINKING & NEW pills and fits cleanly inside 280px width in headless Chromium."""
    sidebar_jsx = FLEET_SIDEBAR_JSX.read_text(encoding="utf-8")
    app_jsx = APP_JSX.read_text(encoding="utf-8")
    css_text = APP_CSS.read_text(encoding="utf-8")

    assert "THINKING ({counts.thinking})" in sidebar_jsx
    assert "NEW ({counts.unread})" in sidebar_jsx
    assert "reconcileUnreadSessions" in app_jsx

    if not find_working_chromium_binary():
        pytest.skip("Chromium binary not installed on test runner")

    html_harness = f"""<!doctype html>
<html data-theme="emerald">
<head>
<meta charset="utf-8" />
<style>
{css_text}
html, body {{ margin: 0; padding: 0; width: 390px; height: 600px; }}
</style>
</head>
<body>
  <aside id="sidebar" class="fleet-sidebar" style="width:280px;height:500px;position:relative;">
    <div class="fleet-sidebar-controls" style="padding:10px;">
      <div class="fleet-filter-pills">
        <button id="p-all" class="fleet-filter-pill active">ALL (12)</button>
        <button id="p-think" class="fleet-filter-pill has-thinking">THINKING (3)</button>
        <button id="p-new" class="fleet-filter-pill has-new">NEW (2)</button>
        <button id="p-noweb" class="fleet-filter-pill">NO WEB (9)</button>
        <button id="p-tmux" class="fleet-filter-pill">TMUX (2)</button>
        <button id="p-ctx" class="fleet-filter-pill">CTX &ge;30% (1)</button>
      </div>
    </div>
  </aside>
</body>
</html>
"""

    with launch_headless_cdp_page(
        prefix="aim_issue281_fleet_",
        extra_args=["--window-size=390,600"],
    ) as ws_url:
        import asyncio

        async def _measure():
            async with websockets.connect(ws_url) as ws:
                cid = 0

                async def cdp(method: str, params: dict | None = None) -> dict:
                    nonlocal cid
                    cid += 1
                    await ws.send(json.dumps({"id": cid, "method": method, "params": params or {}}))
                    while True:
                        msg = json.loads(await ws.recv())
                        if msg.get("id") == cid:
                            return msg.get("result") or {}

                await cdp("Page.enable")
                await cdp("Runtime.enable")
                ft = await cdp("Page.getFrameTree")
                await cdp("Page.setDocumentContent", {"frameId": ft["frameTree"]["frame"]["id"], "html": html_harness})
                await asyncio.sleep(0.05)

                probe_js = """(() => {
                  const ids = ['p-all', 'p-think', 'p-new', 'p-noweb', 'p-tmux', 'p-ctx'];
                  const boxes = ids.map((id) => {
                    const r = document.getElementById(id).getBoundingClientRect();
                    return { id, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
                  });
                  let anyOverlap = false;
                  for (let i = 0; i < boxes.length; i++) {
                    for (let j = i + 1; j < boxes.length; j++) {
                      const ix = Math.max(0, Math.min(boxes[i].right, boxes[j].right) - Math.max(boxes[i].left, boxes[j].left));
                      const iy = Math.max(0, Math.min(boxes[i].bottom, boxes[j].bottom) - Math.max(boxes[i].top, boxes[j].top));
                      if (ix * iy > 0.5) anyOverlap = true;
                    }
                  }
                  const sidebarRight = document.getElementById('sidebar').getBoundingClientRect().right;
                  return { boxes, anyOverlap, sidebarRight };
                })()"""
                res = await cdp("Runtime.evaluate", {"expression": probe_js, "returnByValue": True})
                return res["result"]["value"]

        geom = asyncio.run(_measure())
        assert geom["anyOverlap"] is False, geom
        for b in geom["boxes"]:
            assert b["width"] > 35 and b["height"] >= 18, b
            assert b["right"] <= geom["sidebarRight"], b
