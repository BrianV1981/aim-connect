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


def test_issue_279_280_mobile_no_split_and_header_declutter_contracts():
    """#279, #280: Split View locked strictly to widescreen (>900px); mobile hides duplicate Fleet/Settings/Split header controls."""
    app_jsx = APP_JSX.read_text(encoding="utf-8")
    browser_jsx = BROWSER_PANE_JSX.read_text(encoding="utf-8")
    files_jsx = FILE_EXPLORER_JSX.read_text(encoding="utf-8")
    css = APP_CSS.read_text(encoding="utf-8")

    # 1. Widescreen-only effectiveSplitMode gate in App.jsx
    assert "const effectiveSplitMode = splitMode && isWidescreen;" in app_jsx
    assert "splitMode={effectiveSplitMode}" in app_jsx

    # 2. Split button + top-row Fleet & Settings buttons carry desktop-only; mobile dock carries unread dot
    assert "pane-full-upgrade-btn desktop-only" in browser_jsx
    assert "pane-full-upgrade-btn desktop-only" in files_jsx
    assert "ghost-btn desktop-only ${showFleetSidebar ? 'active' : ''}" in app_jsx
    assert "ghost-btn desktop-only ${showSettings ? 'active' : ''}" in app_jsx

    # 3. Non-zero flex-basis header & breadcrumb classes remain active
    assert ".copilot-top-left" in css
    assert ".copilot-top-right" in css
    assert ".files-breadcrumb-actions" in css


def test_live_mobile_390px_geometry_zero_overlap_and_hidden_redundant_buttons():
    """#279, #280: Render App.css at 390x844 in real headless Chromium and prove 0px overlaps + hidden redundant mobile buttons."""
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
  <!-- Mobile Top Header: Fleet & Settings buttons hidden on mobile; Brand + Session + Keyboard + Status remain -->
  <header id="mob-hdr" class="app-header ld-header" style="width:390px;">
    <div class="hdr-cluster">
      <button id="hdr-fleet-btn" class="ghost-btn desktop-only">☰</button>
      <div id="hdr-brand" class="ld-brand"><strong>AIM</strong><span>CONNECT</span></div>
      <span id="hdr-sess" class="active-session-badge">aim-connect</span>
    </div>
    <div class="hdr-cluster">
      <button id="hdr-kb-btn" class="ghost-btn">⌨</button>
      <button id="hdr-settings-btn" class="ghost-btn desktop-only">⚙</button>
      <div id="hdr-status" class="status-indicator connected"></div>
    </div>
  </header>

  <!-- Files Pane at 390px (Full View only on mobile; Split button hidden) -->
  <div id="files-1tab-on" class="file-explorer-pane full-mode" style="width:390px;height:360px;">
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
        <button id="f-btn-split" class="pane-full-upgrade-btn desktop-only is-full">SPLIT VIEW</button>
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

  <!-- Browser Pane Full View at 390px (Split button hidden) -->
  <div id="mobile-browser-pane" class="file-explorer-pane browser-copilot-pane full-mode" style="width:390px;height:360px;">
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
        <button id="bp-split" class="pane-full-upgrade-btn desktop-only">SPLIT VIEW</button>
        <button id="bp-close" class="ghost-btn">×</button>
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

    tmp_dir = tempfile.mkdtemp(prefix="aim_issue280_geom_")

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
                    hdrFleetBtn: box('hdr-fleet-btn'),
                    hdrSettingsBtn: box('hdr-settings-btn'),
                    hdrKbBtn: box('hdr-kb-btn'),
                    filesSplitBtn: box('f-btn-split'),
                    bpSplitBtn: box('bp-split'),
                    bcDiffOn: box('bc-diff-on'),
                    bcRefOn: box('bc-ref-on'),
                    bcDiffOff: box('bc-diff-off'),
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

        # 1. Redundant mobile buttons (top Fleet, top Settings, Split buttons) are completely hidden (0x0) at 390px
        assert geom["hdrFleetBtn"]["width"] == 0 and geom["hdrFleetBtn"]["height"] == 0, geom
        assert geom["hdrSettingsBtn"]["width"] == 0 and geom["hdrSettingsBtn"]["height"] == 0, geom
        assert geom["filesSplitBtn"]["width"] == 0 and geom["filesSplitBtn"]["height"] == 0, geom
        assert geom["bpSplitBtn"]["width"] == 0 and geom["bpSplitBtn"]["height"] == 0, geom

        # 2. Keyboard toggle remains visible in top header
        assert geom["hdrKbBtn"]["width"] > 20 and geom["hdrKbBtn"]["height"] > 20, geom

        # 3. Zero button overlaps across Files (1-TAB ON & OFF) and Full-View Browser at 390px
        assert geom["copyOverlapsReadme"] is False, geom
        assert geom["copyOverlapsDocsBar"] is False, geom
        assert geom["editOverlapsLeafOn"] is False, geom
        assert geom["editOverlapsLeafOff"] is False, geom
        assert geom["bpIconsOverlapTitle"] is False, geom
        assert geom["bcDiffOn"]["right"] <= 390.5, geom
        assert geom["bcRefOn"]["right"] <= 390.5, geom
        assert geom["bcDiffOff"]["right"] <= 390.5, geom
        assert geom["browserPane"]["width"] >= 388, geom
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(tmp_dir, ignore_errors=True)
