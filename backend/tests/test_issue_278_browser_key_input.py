import asyncio
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
from fastapi.testclient import TestClient

import main
import routes_browser


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
KEY_UTILS_JS = FRONTEND_SRC / "browserKeyUtils.js"


def test_browser_key_utils_maps_period_and_oem_punctuation_without_vk_delete_collision():
    """#278: '.' (ASCII 46) must map to VK_OEM_PERIOD (190), never VK_DELETE (46), while Delete stays 46."""
    assert KEY_UTILS_JS.is_file(), "Missing frontend/src/browserKeyUtils.js"

    script = f"""
import {{
  resolveWindowsVirtualKeyCode,
  resolveBrowserKeyAction,
}} from {json.dumps(KEY_UTILS_JS.as_uri())};

const periodKey = resolveBrowserKeyAction({{ key: '.', code: 'Period' }});
const periodNoCode = resolveBrowserKeyAction({{ key: '.', code: '' }});
const numpadDot = resolveBrowserKeyAction({{ key: '.', code: 'NumpadDecimal' }});
const numpadDel = resolveBrowserKeyAction({{ key: 'Delete', code: 'NumpadDecimal' }});
const realDelete = resolveBrowserKeyAction({{ key: 'Delete', code: 'Delete' }});
const shiftOnly = resolveBrowserKeyAction({{ key: 'Shift', code: 'ShiftLeft', shiftKey: true }});
const ctrlV = resolveBrowserKeyAction({{ key: 'v', code: 'KeyV', ctrlKey: true }});
const ctrlA = resolveBrowserKeyAction({{ key: 'a', code: 'KeyA', ctrlKey: true }});
const unicodeChar = resolveBrowserKeyAction({{ key: 'ñ', code: '' }});

const punctuationSample = [
  ['!', 'Digit1', true],
  ['@', 'Digit2', true],
  ['#', 'Digit3', true],
  ['$', 'Digit4', true],
  ['%', 'Digit5', true],
  ['^', 'Digit6', true],
  ['&', 'Digit7', true],
  ['*', 'Digit8', true],
  ['(', 'Digit9', true],
  [')', 'Digit0', true],
  ['-', 'Minus', false],
  ['_', 'Minus', true],
  ['=', 'Equal', false],
  ['+', 'Equal', true],
  ['[', 'BracketLeft', false],
  ['{{', 'BracketLeft', true],
  [']', 'BracketRight', false],
  ['}}', 'BracketRight', true],
  ['\\\\', 'Backslash', false],
  ['|', 'Backslash', true],
  [';', 'Semicolon', false],
  [':', 'Semicolon', true],
  ["'", 'Quote', false],
  ['"', 'Quote', true],
  [',', 'Comma', false],
  ['<', 'Comma', true],
  ['.', 'Period', false],
  ['>', 'Period', true],
  ['/', 'Slash', false],
  ['?', 'Slash', true],
  ['`', 'Backquote', false],
  ['~', 'Backquote', true],
];

const mappedPunctuation = punctuationSample.map(([key, code, shiftKey]) => ({{
  key,
  res: resolveBrowserKeyAction({{ key, code, shiftKey }}),
  fallbackVk: resolveWindowsVirtualKeyCode({{ key, code: '' }}),
}}));

console.log(JSON.stringify({{
  periodKey,
  periodNoCode,
  numpadDot,
  numpadDel,
  realDelete,
  shiftOnly,
  ctrlV,
  ctrlA,
  unicodeChar,
  mappedPunctuation,
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

    assert out["periodKey"]["action"] == "key"
    assert out["periodKey"]["windowsVirtualKeyCode"] == 190
    assert out["periodKey"]["text"] == "."

    assert out["periodNoCode"]["windowsVirtualKeyCode"] == 190
    assert out["numpadDot"]["windowsVirtualKeyCode"] == 110
    assert out["numpadDel"]["windowsVirtualKeyCode"] == 46
    assert out["numpadDel"]["text"] == ""
    assert out["realDelete"]["windowsVirtualKeyCode"] == 46
    assert out["realDelete"]["text"] == ""

    assert out["shiftOnly"] == {"action": "ignore"}
    assert out["ctrlV"] == {"action": "allow_paste"}
    assert out["ctrlA"]["action"] == "key"
    assert out["ctrlA"]["windowsVirtualKeyCode"] == 65
    assert out["ctrlA"]["text"] == ""
    assert out["unicodeChar"] == {"action": "insert_text", "text": "ñ"}

    # Forbidden nav/editing VK range (33..46 = PageUp..Delete) must NEVER be emitted for any punctuation
    for item in out["mappedPunctuation"]:
        vk = item["res"]["windowsVirtualKeyCode"]
        fb_vk = item["fallbackVk"]
        assert not (33 <= vk <= 46), f"Punctuation {item['key']!r} collided with nav/delete VK {vk}"
        assert not (33 <= fb_vk <= 46), f"Fallback punctuation {item['key']!r} collided with nav/delete VK {fb_vk}"
        assert item["res"]["text"] == item["key"]


def test_backend_normalize_cdp_key_params_heals_stale_ascii_punctuation():
    """#278: Backend normalizer guards against unrefreshed clients sending vk=46 for '.' while keeping Delete=46."""
    healed_dot = routes_browser._normalize_cdp_key_params(
        {
            "eventType": "keyDown",
            "key": ".",
            "code": "Period",
            "text": ".",
            "windowsVirtualKeyCode": 46,
            "modifiers": 0,
        }
    )
    assert healed_dot["windowsVirtualKeyCode"] == 190
    assert healed_dot["nativeVirtualKeyCode"] == 190
    assert healed_dot["text"] == "."
    assert healed_dot["unmodifiedText"] == "."

    healed_dash = routes_browser._normalize_cdp_key_params(
        {
            "eventType": "keyDown",
            "key": "-",
            "code": "",
            "text": "-",
            "windowsVirtualKeyCode": 45,
        }
    )
    assert healed_dash["windowsVirtualKeyCode"] == 189

    true_delete = routes_browser._normalize_cdp_key_params(
        {
            "eventType": "keyDown",
            "key": "Delete",
            "code": "Delete",
            "windowsVirtualKeyCode": 46,
        }
    )
    assert true_delete["windowsVirtualKeyCode"] == 46
    assert "text" not in true_delete


def test_live_headless_chromium_email_typing_and_midword_period_edit():
    """#278: End-to-end empirical proof against real headless Chromium typing brianv1981@gmail.com and mid-word '.'."""
    binary = (
        shutil.which("chromium")
        or shutil.which("chromium-browser")
        or shutil.which("google-chrome")
        or shutil.which("google-chrome-stable")
    )
    if not binary:
        pytest.skip("Chromium binary not installed on test runner")

    node_Keygen = f"""
import {{ resolveBrowserKeyAction }} from {json.dumps(KEY_UTILS_JS.as_uri())};

const CODE_FOR_CHAR = {{
  ' ': ['Space', false],
  '!': ['Digit1', true], '@': ['Digit2', true], '#': ['Digit3', true], '$': ['Digit4', true],
  '%': ['Digit5', true], '^': ['Digit6', true], '&': ['Digit7', true], '*': ['Digit8', true],
  '(': ['Digit9', true], ')': ['Digit0', true],
  '-': ['Minus', false], '_': ['Minus', true], '=': ['Equal', false], '+': ['Equal', true],
  '[': ['BracketLeft', false], '{{': ['BracketLeft', true], ']': ['BracketRight', false], '}}': ['BracketRight', true],
  '\\\\': ['Backslash', false], '|': ['Backslash', true], ';': ['Semicolon', false], ':': ['Semicolon', true],
  "'": ['Quote', false], '"': ['Quote', true], ',': ['Comma', false], '<': ['Comma', true],
  '.': ['Period', false], '>': ['Period', true], '/': ['Slash', false], '?': ['Slash', true],
  '`': ['Backquote', false], '~': ['Backquote', true],
}};

function eventForChar(ch) {{
  if (ch >= 'a' && ch <= 'z') return {{ key: ch, code: 'Key' + ch.toUpperCase(), shiftKey: false }};
  if (ch >= 'A' && ch <= 'Z') return {{ key: ch, code: 'Key' + ch, shiftKey: true }};
  if (ch >= '0' && ch <= '9') return {{ key: ch, code: 'Digit' + ch, shiftKey: false }};
  const [code, shiftKey] = CODE_FOR_CHAR[ch] || ['', false];
  return {{ key: ch, code, shiftKey }};
}}

const fullSample = `brianv1981@gmail.com !@#$%^&*()-_=+[]{{}}\\\\|;:'",.<>/?~`;
const typoEmail = 'brianv1981@gmailcom';

console.log(JSON.stringify({{
  fullSample,
  fullActions: Array.from(fullSample).map((c) => resolveBrowserKeyAction(eventForChar(c))),
  typoActions: Array.from(typoEmail).map((c) => resolveBrowserKeyAction(eventForChar(c))),
  arrowLeft: resolveBrowserKeyAction({{ key: 'ArrowLeft', code: 'ArrowLeft' }}),
  dotAction: resolveBrowserKeyAction({{ key: '.', code: 'Period' }}),
  deleteAction: resolveBrowserKeyAction({{ key: 'Delete', code: 'Delete' }}),
}}));
"""
    gen_proc = subprocess.run(
        ["node", "--input-type=module", "-e", node_Keygen],
        capture_output=True,
        text=True,
        timeout=4.0,
    )
    assert gen_proc.returncode == 0, gen_proc.stderr
    generated = json.loads(gen_proc.stdout.strip())

    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()

    tmp_dir = tempfile.mkdtemp(prefix="aim_issue278_cdp_")
    proc = subprocess.Popen(
        [
            binary,
            "--headless=new",
            "--disable-dev-shm-usage",
            "--remote-debugging-address=127.0.0.1",
            f"--remote-debugging-port={port}",
            f"--user-data-dir={tmp_dir}",
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

        async def _drive():
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

                async def dispatch_action(act: dict):
                    down_params = routes_browser._normalize_cdp_key_params({**act, "eventType": "keyDown"})
                    up_params = routes_browser._normalize_cdp_key_params(
                        {
                            "eventType": "keyUp",
                            "key": act["key"],
                            "code": act["code"],
                            "windowsVirtualKeyCode": act["windowsVirtualKeyCode"],
                            "modifiers": act["modifiers"],
                        }
                    )
                    await cdp("Input.dispatchKeyEvent", down_params)
                    await cdp("Input.dispatchKeyEvent", up_params)

                await cdp("Runtime.enable")
                await cdp(
                    "Runtime.evaluate",
                    {
                        "expression": (
                            'document.body.innerHTML = "<input id=em type=email><input id=full type=text>";'
                            'document.getElementById("em").focus();'
                        )
                    },
                )

                # 1. Type "brianv1981@gmailcom", arrow left 3 times, type "." -> must become "brianv1981@gmail.com"
                for act in generated["typoActions"]:
                    await dispatch_action(act)
                for _ in range(3):
                    await dispatch_action(generated["arrowLeft"])
                await dispatch_action(generated["dotAction"])

                em_val = await cdp(
                    "Runtime.evaluate",
                    {"expression": 'document.getElementById("em").value', "returnByValue": True},
                )
                assert em_val["result"]["value"] == "brianv1981@gmail.com"

                # Verify real Delete key still forward-deletes 'c' when explicitly pressed
                await dispatch_action(generated["deleteAction"])
                em_after_del = await cdp(
                    "Runtime.evaluate",
                    {"expression": 'document.getElementById("em").value', "returnByValue": True},
                )
                assert em_after_del["result"]["value"] == "brianv1981@gmail.om"

                # 2. Type full email + every punctuation symbol sequentially
                await cdp("Runtime.evaluate", {"expression": 'document.getElementById("full").focus();'})
                for act in generated["fullActions"]:
                    await dispatch_action(act)
                full_val = await cdp(
                    "Runtime.evaluate",
                    {"expression": 'document.getElementById("full").value', "returnByValue": True},
                )
                assert full_val["result"]["value"] == generated["fullSample"]

        asyncio.run(_drive())
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        shutil.rmtree(tmp_dir, ignore_errors=True)
