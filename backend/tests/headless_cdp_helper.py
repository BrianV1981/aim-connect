import json
import os
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from contextlib import contextmanager

import pytest


def find_working_chromium_binary() -> str | None:
    """Prefer native google-chrome on CI runners before snap wrappers, verifying `--version` succeeds."""
    for candidate in ("google-chrome-stable", "google-chrome", "chromium", "chromium-browser"):
        binary = shutil.which(candidate)
        if not binary:
            continue
        try:
            res = subprocess.run(
                [binary, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if res.returncode == 0:
                return binary
        except Exception:
            continue
    return None


@contextmanager
def launch_headless_cdp_page(prefix: str = "aim_cdp_test_", extra_args: list[str] | None = None):
    """Launch an isolated headless Chrome/Chromium instance and yield its first page webSocketDebuggerUrl."""
    binary = find_working_chromium_binary()
    if not binary:
        pytest.skip("Chromium/Chrome binary not installed on test runner")

    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()

    tmp_dir = tempfile.mkdtemp(prefix=prefix)
    env = os.environ.copy()
    env["DBUS_SESSION_BUS_ADDRESS"] = "/dev/null"

    cmd = [
        binary,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-background-networking",
        "--disable-extensions",
        "--disable-sync",
        "--remote-debugging-address=127.0.0.1",
        f"--remote-debugging-port={port}",
        f"--user-data-dir={tmp_dir}",
        "--no-first-run",
        "--no-default-browser-check",
        *(extra_args or []),
        "about:blank",
    ]
    proc = subprocess.Popen(
        cmd,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    try:
        targets = None
        for _ in range(180):
            if proc.poll() is not None:
                break
            try:
                raw = urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list", timeout=0.5).read()
                parsed = json.loads(raw)
                if any(t.get("type") == "page" and t.get("webSocketDebuggerUrl") for t in parsed):
                    targets = parsed
                    break
            except Exception:
                time.sleep(0.1)

        if not targets:
            rc = proc.poll()
            err_tail = ""
            if rc is not None and proc.stderr:
                try:
                    err_tail = proc.stderr.read().decode("utf-8", errors="replace")[-400:]
                except Exception:
                    err_tail = ""
            if rc is not None and ("snap" in err_tail.lower() or "sandbox" in err_tail.lower()):
                pytest.skip(f"Headless Chromium unavailable in restricted runner ({rc}): {err_tail}")
            raise AssertionError(
                f"Headless Chromium ({binary}) did not expose page target within 18s (rc={rc}): {err_tail}"
            )

        ws_url = [t["webSocketDebuggerUrl"] for t in targets if t.get("type") == "page"][0]
        yield ws_url
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        if proc.stderr:
            try:
                proc.stderr.close()
            except Exception:
                pass
        shutil.rmtree(tmp_dir, ignore_errors=True)
