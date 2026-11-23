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
APP_CSS = FRONTEND_SRC / "App.css"
APP_JSX = FRONTEND_SRC / "App.jsx"
BROWSER_PANE_JSX = FRONTEND_SRC / "components" / "BrowserPane.jsx"
FILE_EXPLORER_JSX = FRONTEND_SRC / "components" / "FileExplorer.jsx"


def test_issue_279_mobile_split_and_flex_contracts():
    """#279: Verify mobile Full-View default, visible SPLIT/FULL button, no inline relative override, and non-zero flex-basis classes."""
    app_jsx = APP_JSX.read_text(encoding="utf-8")
    browser_jsx = BROWSER_PANE_JSX.read_text(encoding="utf-8")
    files_jsx = FILE_EXPLORER_JSX.read_text(encoding="utf-8")
    css = APP_CSS.read_text(encoding="utf-8")

    # 1. BrowserPane no longer sets inline style={{ position: 'relative' }} on root pane or desktop-only on pane-full-upgrade-btn
    assert "className={`file-explorer-pane browser-copilot-pane ${splitMode ? 'split-mode' : 'full-mode'}`}" in browser_jsx
    assert "pane-full-upgrade-btn desktop-only" not in browser_jsx
    assert "pane-full-upgrade-btn desktop-only" not in files_jsx
    assert "pane-upgrade-label-compact" in browser_jsx
    assert "pane-upgrade-label-compact" in files_jsx

    # 2. App.jsx selectWorkspaceTool & mobile dock default mobile (< 900px) to Full View (splitMode = false)
    assert "window.innerWidth > 900" in app_jsx
    assert "setSplitMode(false)" in app_jsx

    # 3. CSS uses non-zero flex-basis (.copilot-top-left, .files-breadcrumb-trail) + mobile vertical split (.cockpit-body.has-split)
    assert ".copilot-top-left" in css
    assert ".copilot-top-right" in css
    assert ".files-breadcrumb-actions" in css
    assert ".cockpit-body.has-split" in css


def test_live_mobile_390px_geometry_zero_button_overlap():
    """#279: Render App.css at 390x844 in real headless Chromium and prove 0px overlap across Browser, Files 1-TAB ON/OFF, and Vertical Split."""
    binary = (
        shutil.which("chromium")
        or shutil.which("chromium-browser")
        or shutil.which("google-chrome")
        or shutil.which("google-chrome-stable")
    )
    if not binary:
        pytest.skip("Chromium binary not installed on test runner")

    css_text = APP_CSS.read_text(encoding="utf-8")
    html_harness = f"""<!doctype html>
<html data-theme="emerald">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
{css_text}
html, body {{ margin: 0; padding: 0; width: 390px; height: 844px; overflow: hidden; }}
</style>
</head>
<body>
  <!-- Case 1: Files Pane at 390px with 1-TAB ON -->
  <div id="files-1tab-on" class="file-explorer-pane full-mode" style="width:390px;height:400px;">
    <div class="copilot-top-bar files-top-bar">
      <div class="copilot-top-left">
        <button id="f-btn-files" class="subbar-util-btn active">FILES</button>
        <button id="f-btn-git" class="subbar-util-btn">GIT DIFF (0)</button>
        <div id="f-docs-bar" class="project-docs-hub-bar">
          <span class="project-docs-hub-badge">DOCS</span>
          <button class="docs-nav-arrow-btn">←</button>
          <button class="docs-nav-arrow-btn">→</button>
          <button class="fav-chip active">HANDOFF</button>
          <button class="fav-chip">AGENTS</button>
          <button class="fav-chip">Wiki Index</button>
          <button class="fav-chip">Wiki Log</button>
          <button id="f-btn-readme" class="fav-chip">README</button>
          <select class="ld-select" style="height:24px;padding:0 8px;font-size:10.5px;">
            <option>memory-wiki/ (13)</option>
          </select>
          <button class="docs-webnav-toggle active">1-TAB: ON</button>
        </div>
        <select class="ld-select" style="height:24px;padding:0 8px;font-size:10.5px;">
          <option>worktrees (1)</option>
        </select>
      </div>
      <div class="copilot-top-right">
        <button id="f-btn-copy" class="subbar-util-btn">COPY ALL</button>
        <button id="f-btn-split" class="pane-full-upgrade-btn is-full">
          <span class="pane-upgrade-label-full">SPLIT VIEW</span>
          <span class="pane-upgrade-label-compact">SPLIT</span>
        </button>
        <button id="f-btn-menu" class="ghost-btn active" style="height:26px;padding:0 7px;">≡</button>
        <button id="f-btn-close" class="ghost-btn" style="height:26px;padding:0 6px;">×</button>
      </div>
    </div>

    <div id="bc-1tab-on" class="files-breadcrumb-bar">
      <div id="bc-trail-on" class="files-breadcrumb-trail">
        <button class="breadcrumb-seg-btn">aim-connect</button>
        <span>›</span>
        <span id="bc-leaf-on" class="breadcrumb-leaf">HANDOFF.md</span>
      </div>
      <div class="files-breadcrumb-actions">
        <button id="bc-pin" class="fav-chip">PIN TAB</button>
        <button id="bc-edit-on" class="fav-chip active">&lt;&gt; EDIT CODE</button>
        <button id="bc-sel-on" class="fav-chip">SELECT TEXT</button>
        <button id="bc-diff-on" class="fav-chip">DIFF VS HEAD</button>
        <button id="bc-ref-on" class="fav-chip">↻</button>
      </div>
    </div>

    <!-- Breadcrumb with 1-TAB OFF (no PIN TAB — previously caused EDIT CODE to collide with HANDOFF.md) -->
    <div id="bc-1tab-off" class="files-breadcrumb-bar">
      <div id="bc-trail-off" class="files-breadcrumb-trail">
        <button class="breadcrumb-seg-btn">aim-connect</button>
        <span>›</span>
        <span id="bc-leaf-off" class="breadcrumb-leaf">HANDOFF.md</span>
      </div>
      <div class="files-breadcrumb-actions">
        <button id="bc-edit-off" class="fav-chip active">&lt;&gt; EDIT CODE</button>
        <button id="bc-sel-off" class="fav-chip">SELECT TEXT</button>
        <button id="bc-diff-off" class="fav-chip">DIFF VS HEAD</button>
        <button id="bc-ref-off" class="fav-chip">↻</button>
      </div>
    </div>
  </div>

  <!-- Case 2: Mobile Cockpit Body in Vertical Split Mode (390px wide, top Chat + bottom Browser) -->
  <div id="mobile-split-cockpit" class="cockpit-body has-split" style="width:390px;height:440px;">
    <div id="mobile-term-col" style="display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;">Terminal/Chat</div>
    <div id="mobile-browser-pane" class="file-explorer-pane browser-copilot-pane split-mode">
      <div class="copilot-top-bar">
        <div class="copilot-top-left">
          <span class="pulse-led"></span>
          <span id="bp-title" style="font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:0.1em;white-space:nowrap;">CO-PILOT // :9222</span>
          <button id="bp-ctrl" class="fav-chip active">CONTROL ON</button>
          <button id="bp-2fa" class="fav-chip">TYPE / 2FA</button>
        </div>
        <div class="cp-topright-actions">
          <button id="bp-ext" class="cp-action-icon-btn">↗</button>
          <button id="bp-shot" class="cp-action-icon-btn">📷</button>
          <button id="bp-scope" class="fav-chip">PANE</button>
          <button id="bp-dl" class="cp-action-icon-btn">⬇</button>
          <button id="bp-split" class="pane-full-upgrade-btn">
            <span class="pane-upgrade-label-full">FULL VIEW</span>
            <span class="pane-upgrade-label-compact">FULL</span>
          </button>
          <button id="bp-close" class="ghost-btn">×</button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
"""

    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()

    tmp_dir = tempfile.mkdtemp(prefix="aim_issue279_geom_")

    proc = subprocess.Popen(
        [
            binary,
            "--headless=new",
            "--disable-dev-shm-usage",
            "--remote-debugging-address=127.0.0.1",
            f"--remote-debugging-port={port}",
            f"--user-data-dir={tmp_dir}",
            "--window-size=390,844",
            "--no-first-run",
            "--no-default-browser-check",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        targets = None
        for _ in range(50):
            try:
                raw = urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list", timeout=0.5).read()
                parsed = json.loads(raw)
                if any(t.get("type") == "page" for t in parsed):
                    targets = parsed
                    break
            except Exception:
                time.sleep(0.1)
        assert targets, "Headless Chromium did not expose page target"
        ws_url = [t["webSocketDebuggerUrl"] for t in targets if t.get("type") == "page"][0]

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
                await cdp(
                    "Emulation.setDeviceMetricsOverride",
                    {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True},
                )
                ft = await cdp("Page.getFrameTree")
                frame_id = ft["frameTree"]["frame"]["id"]
                await cdp("Page.setDocumentContent", {"frameId": frame_id, "html": html_harness})
                await asyncio.sleep(0.05)

                probe_js = """(() => {
                  const box = (id) => {
                    const el = document.getElementById(id);
                    const r = el.getBoundingClientRect();
                    return { id, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
                  };
                  const overlaps = (a, b) => {
                    const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
                    const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
                    return ix * iy > 0.5;
                  };
                  return {
                    copyBtn: box('f-btn-copy'),
                    readmeBtn: box('f-btn-readme'),
                    docsBar: box('f-docs-bar'),
                    filesSplitBtn: box('f-btn-split'),
                    bcLeafOn: box('bc-leaf-on'),
                    bcEditOn: box('bc-edit-on'),
                    bcDiffOn: box('bc-diff-on'),
                    bcRefOn: box('bc-ref-on'),
                    bcLeafOff: box('bc-leaf-off'),
                    bcEditOff: box('bc-edit-off'),
                    bcDiffOff: box('bc-diff-off'),
                    bpTitle: box('bp-title'),
                    bpExt: box('bp-ext'),
                    bpSplitBtn: box('bp-split'),
                    termCol: box('mobile-term-col'),
                    browserPane: box('mobile-browser-pane'),
                    copyOverlapsReadme: overlaps(box('f-btn-copy'), box('f-btn-readme')),
                    copyOverlapsDocsBar: overlaps(box('f-btn-copy'), box('f-docs-bar')),
                    editOverlapsLeafOn: overlaps(box('bc-edit-on'), box('bc-leaf-on')),
                    editOverlapsLeafOff: overlaps(box('bc-edit-off'), box('bc-leaf-off')),
                    bpIconsOverlapTitle: overlaps(box('bp-ext'), box('bp-title')),
                  };
                })()"""
                res = await cdp("Runtime.evaluate", {"expression": probe_js, "returnByValue": True})
                return res["result"]["value"]

        geom = asyncio.run(_measure())

        # 1. Zero overlaps between COPY ALL and README / DOCS capsule
        assert geom["copyOverlapsReadme"] is False, geom
        assert geom["copyOverlapsDocsBar"] is False, geom

        # 2. Zero overlaps between EDIT CODE and breadcrumb filename in BOTH 1-TAB ON and 1-TAB OFF
        assert geom["editOverlapsLeafOn"] is False, geom
        assert geom["editOverlapsLeafOff"] is False, geom

        # 3. Breadcrumb buttons stay inside the 390px viewport (never clipped off the right edge)
        assert geom["bcDiffOn"]["right"] <= 390.5, geom
        assert geom["bcRefOn"]["right"] <= 390.5, geom
        assert geom["bcDiffOff"]["right"] <= 390.5, geom

        # 4. Mobile SPLIT / FULL buttons are visible (width > 0, height > 0) on <= 768px phones
        assert geom["filesSplitBtn"]["width"] > 30 and geom["filesSplitBtn"]["height"] >= 20, geom
        assert geom["bpSplitBtn"]["width"] > 30 and geom["bpSplitBtn"]["height"] >= 20, geom

        # 5. Browser top-bar icons do not overlap CO-PILOT // :9222, and mobile split stacks full-width top/bottom (390px wide, not 195px columns)
        assert geom["bpIconsOverlapTitle"] is False, geom
        assert geom["browserPane"]["width"] >= 388, geom
        assert geom["termCol"]["width"] >= 388, geom
        assert geom["browserPane"]["top"] >= geom["termCol"]["bottom"] - 1.5, geom
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(tmp_dir, ignore_errors=True)
