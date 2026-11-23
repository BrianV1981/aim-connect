import json
import subprocess
import threading
import time
from pathlib import Path

from fastapi.testclient import TestClient

import main
import routes_browser


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
HUD_UTILS_JS = FRONTEND_SRC / "browserHudUtils.js"
README_MD = WORKTREE_ROOT / "README.md"


def test_leases_lock_recovers_stale_dead_pid_and_serializes_concurrent_mutations(monkeypatch, tmp_path):
    """#274: .leases.lock must evict dead-PID lockfiles immediately and serialize parallel thread mutations."""
    state_dir = tmp_path / "aim-browser-state"
    state_dir.mkdir()
    monkeypatch.setenv("AIM_BROWSER_STATE_DIR", str(state_dir))

    lock_file = state_dir / ".leases.lock"
    # Plant a stale lock with a guaranteed non-existent dead PID (99999999)
    lock_file.write_text(json.dumps({"pid": 99_999_999, "ts": int(time.time() * 1000)}))

    start = time.monotonic()
    routes_browser._write_leases({"sub-initial": {"lease": "sub-initial", "targetId": "T0", "updatedAt": 1}})
    elapsed = time.monotonic() - start
    assert elapsed < 0.5, "Dead-PID .leases.lock should be evicted immediately without waiting full timeout"
    assert not lock_file.exists(), ".leases.lock must be cleaned up on exit"

    # Also test plain-text dead PID lockfile compatibility
    lock_file.write_text("99999999")
    routes_browser._write_leases({"sub-initial": {"lease": "sub-initial", "targetId": "T0", "updatedAt": 2}})
    assert not lock_file.exists()

    # Concurrent 12-thread read-modify-write stress test: zero lost leases
    barrier = threading.Barrier(12)

    def _worker(idx: int):
        barrier.wait(timeout=5.0)
        key = f"subagent-{idx}"

        def _add(curr: dict) -> tuple[dict, bool]:
            curr[key] = {
                "lease": key,
                "targetId": f"TAB_{idx}",
                "actor": key,
                "session": f"aim-node-{idx}",
                "updatedAt": int(time.time() * 1000),
            }
            return curr, True

        routes_browser._mutate_leases(_add)

    threads = [threading.Thread(target=_worker, args=(i,)) for i in range(12)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=8.0)

    final_leases = routes_browser._read_leases()
    assert not lock_file.exists()
    for i in range(12):
        assert f"subagent-{i}" in final_leases
        assert final_leases[f"subagent-{i}"]["targetId"] == f"TAB_{i}"


def test_per_target_hud_resolution_backend_and_frontend_node(monkeypatch, tmp_path):
    """#274: Backend _read_hud(target_id=...) and frontend browserHudUtils resolve hud.byTarget[targetId] without cross-tab clobber."""
    state_dir = tmp_path / "aim-browser-hud"
    state_dir.mkdir()
    monkeypatch.setenv("AIM_BROWSER_STATE_DIR", str(state_dir))
    monkeypatch.setenv("AIM_BROWSER_CDP_PORT", "65432")

    now_ms = int(time.time() * 1000)
    hud_payload = {
        "seq": 22,
        "ts": now_ms,
        "targetId": "TAB_B",
        "lease": "sub-2",
        "actor": "sub-2",
        "session": "aim-ld",
        "action": "type",
        "label": "search box",
        "x": 410,
        "y": 190,
        "byTarget": {
            "TAB_A": {
                "seq": 21,
                "ts": now_ms - 40,
                "targetId": "TAB_A",
                "lease": "sub-1",
                "actor": "sub-1",
                "session": "aim-connect",
                "action": "click",
                "label": "#submit-btn",
                "x": 640,
                "y": 520,
            },
            "TAB_B": {
                "seq": 22,
                "ts": now_ms,
                "targetId": "TAB_B",
                "lease": "sub-2",
                "actor": "sub-2",
                "session": "aim-ld",
                "action": "type",
                "label": "search box",
                "x": 410,
                "y": 190,
            },
            "TAB_STALE": {
                "seq": 5,
                "ts": now_ms - 30_000,
                "targetId": "TAB_STALE",
                "action": "click",
                "x": 10,
                "y": 10,
            },
        },
    }
    (state_dir / "hud.json").write_text(json.dumps(hud_payload))

    admin_tok = "h" * 64
    main.VALID_API_TOKENS[admin_tok] = {
        "expires": time.time() + 3600,
        "user": "operator",
        "role": "admin",
        "prefix": "",
    }
    try:
        client = TestClient(main.app)
        headers = {"X-API-Token": admin_tok}

        res_a = client.get("/api/browser/status?target_id=TAB_A", headers=headers)
        assert res_a.status_code == 200
        hud_a = res_a.json()["hud"]
        assert hud_a["targetId"] == "TAB_A"
        assert hud_a["label"] == "#submit-btn"
        assert "TAB_B" in hud_a["byTarget"]
        assert "TAB_STALE" not in hud_a["byTarget"]

        res_b = client.get("/api/browser/status?target_id=TAB_B", headers=headers)
        hud_b = res_b.json()["hud"]
        assert hud_b["targetId"] == "TAB_B"
        assert hud_b["label"] == "search box"

        # Unleased TAB_C does not steal TAB_B's cursor coordinates, while keeping byTarget map intact
        res_c = client.get("/api/browser/status?target_id=TAB_C", headers=headers)
        hud_c = res_c.json()["hud"]
        assert hud_c["targetId"] == ""
        assert "TAB_A" in hud_c["byTarget"]
    finally:
        main.VALID_API_TOKENS.pop(admin_tok, None)

    assert HUD_UTILS_JS.is_file(), "Missing frontend/src/browserHudUtils.js"
    node_script = f"""
import {{
  ingestHudPayload,
  resolveHudForTarget,
}} from {json.dumps(HUD_UTILS_JS.as_uri())};

const now = Date.now();
let map = ingestHudPayload({{}}, {{
  seq: 22,
  ts: now,
  targetId: 'TAB_B',
  actor: 'sub-2',
  action: 'type',
  label: 'search box',
  x: 410,
  y: 190,
  byTarget: {{
    TAB_A: {{ seq: 21, ts: now - 30, targetId: 'TAB_A', actor: 'sub-1', action: 'click', label: '#submit-btn', x: 640, y: 520 }},
    TAB_B: {{ seq: 22, ts: now, targetId: 'TAB_B', actor: 'sub-2', action: 'type', label: 'search box', x: 410, y: 190 }},
  }},
}}, now);

// Legacy single-slot fallback without targetId
const legacyMap = ingestHudPayload({{}}, {{ seq: 1, ts: now, actor: 'legacy-agent', action: 'click', x: 100, y: 200 }}, now);

console.log(JSON.stringify({{
  tabA: resolveHudForTarget(map, null, 'TAB_A', now),
  tabB: resolveHudForTarget(map, null, 'TAB_B', now),
  tabC: resolveHudForTarget(map, null, 'TAB_C', now),
  legacyAny: resolveHudForTarget(legacyMap, null, 'TAB_ANY', now),
}}));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", node_script],
        capture_output=True,
        text=True,
        timeout=4.0,
    )
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout.strip())
    assert out["tabA"]["label"] == "#submit-btn"
    assert out["tabB"]["label"] == "search box"
    assert out["tabC"] is None
    assert out["legacyAny"]["actor"] == "legacy-agent"


def test_readme_documents_operator_copilot_browser_under_how_to_use_ui():
    """#274: README.md must include step-by-step Operator Co-Pilot Browser documentation under How to Use the UI."""
    readme = README_MD.read_text(encoding="utf-8")
    assert "## 📖 How to Use the UI" in readme
    how_to_section = readme.split("## 📖 How to Use the UI", 1)[1].split("---", 1)[0]
    assert "Co-Pilot Browser (`🌐 BROWSER`)" in how_to_section
    assert "WATCH ONLY" in how_to_section
    assert "CONTROL ON" in how_to_section
    assert "TYPE / 2FA" in how_to_section
    assert "Screenshot-to-Conversation" in how_to_section
