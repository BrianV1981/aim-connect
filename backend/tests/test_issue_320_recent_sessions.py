"""#320: RECENT fleet filter — shared most-recently-opened session list with an adjustable count."""

import json
import os
import stat
import subprocess
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main
import recent_sessions as rs

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
SRC = WORKTREE_ROOT / "frontend" / "src"
FILTER_JS = SRC / "fleetFilterUtils.js"
SIDEBAR_JSX = SRC / "components" / "FleetSidebar.jsx"
SETTINGS_JSX = SRC / "components" / "SettingsModal.jsx"
HELP_JS = SRC / "settingsHelp.js"
APP_JSX = SRC / "App.jsx"


@pytest.fixture
def store(tmp_path, monkeypatch):
    path = tmp_path / "recent.json"
    monkeypatch.setenv("AIM_RECENT_SESSIONS_FILE", str(path))
    return path


def _tok(role="admin", user="admin", prefix=""):
    tok = f"test-320-{role}-{user}"
    main.VALID_API_TOKENS[tok] = {"expires": time.time() + 1800, "user": user, "role": role, "prefix": prefix}
    return tok


# ----------------------------------------------------------------------------- store
def test_record_is_mru_deduped_and_default_limit_8(store):
    for name in ["a", "b", "c", "a"]:
        rs.record_visit("admin", name)
    got = rs.get_recent("admin")
    assert got == {"limit": 8, "sessions": ["a", "c", "b"]}


def test_limit_clamps_and_lowering_is_non_destructive(store):
    for i in range(12):
        rs.record_visit("admin", f"s{i}")
    assert rs.set_limit("admin", 1)["limit"] == rs.MIN_LIMIT == 3
    assert rs.get_recent("admin")["sessions"] == ["s11", "s10", "s9"]
    assert rs.set_limit("admin", 999)["limit"] == rs.MAX_LIMIT == 30
    assert len(rs.get_recent("admin")["sessions"]) == 12  # history survived the lower limit


def test_store_caps_history_at_max_limit(store):
    for i in range(45):
        rs.record_visit("admin", f"s{i}")
    rs.set_limit("admin", 30)
    sessions = rs.get_recent("admin")["sessions"]
    assert len(sessions) == 30 and sessions[0] == "s44"


def test_users_are_isolated_and_file_is_private(store):
    rs.record_visit("admin", "mine")
    rs.record_visit("someone@example.com", "theirs")
    assert rs.get_recent("admin")["sessions"] == ["mine"]
    assert rs.get_recent("someone@example.com")["sessions"] == ["theirs"]
    assert stat.S_IMODE(os.stat(store).st_mode) == 0o600


def test_corrupt_store_degrades_to_empty(store):
    store.write_text("{not json", encoding="utf-8")
    assert rs.get_recent("admin") == {"limit": 8, "sessions": []}
    rs.record_visit("admin", "x")
    assert rs.get_recent("admin")["sessions"] == ["x"]


def test_user_key_shares_one_list_for_all_admin_logins():
    assert rs.user_key_for({"role": "admin", "user": "admin"}) == "admin"
    assert rs.user_key_for({"role": "admin", "user": "brian-passkey"}) == "admin"
    assert rs.user_key_for({"role": "user", "user": "op@example.com"}) == "user:op@example.com"


# ----------------------------------------------------------------------------- API
def test_api_round_trip_and_validation(store):
    client = TestClient(main.app)
    hdr = {"x-api-token": _tok()}
    assert client.get("/api/recent-sessions").status_code == 401
    assert client.get("/api/recent-sessions", headers=hdr).json() == {"limit": 8, "sessions": []}
    assert client.post("/api/recent-sessions", headers=hdr, json={"session": "aim-ld"}).status_code == 200
    client.post("/api/recent-sessions", headers=hdr, json={"session": "tbsoftwash-ai-book"})
    assert client.get("/api/recent-sessions", headers=hdr).json()["sessions"] == ["tbsoftwash-ai-book", "aim-ld"]
    assert client.post("/api/recent-sessions", headers=hdr, json={"session": "bad name;rm"}).status_code == 400
    resp = client.put("/api/recent-sessions/settings", headers=hdr, json={"limit": 5})
    assert resp.status_code == 200 and resp.json()["limit"] == 5


def test_api_non_admin_gets_own_list(store):
    client = TestClient(main.app)
    admin = {"x-api-token": _tok()}
    cust = {"x-api-token": _tok(role="user", user="cust@example.com", prefix="agent-cust")}
    client.post("/api/recent-sessions", headers=admin, json={"session": "aim-connect"})
    client.post("/api/recent-sessions", headers=cust, json={"session": "agent-cust-1"})
    assert client.get("/api/recent-sessions", headers=cust).json()["sessions"] == ["agent-cust-1"]
    assert client.get("/api/recent-sessions", headers=admin).json()["sessions"] == ["aim-connect"]


# ----------------------------------------------------------------------------- frontend
def test_filter_utils_recent_mode_node():
    script = f"""
import assert from 'node:assert/strict';
import {{ filterFleetItems, computeFleetFilterCounts }} from {json.dumps(FILTER_JS.as_uri())};
const items = ['aim-a', 'aim-b', 'aim-c', 'aim-d'].map((n) => ({{ session_name: n, vessel: 'agy', tokens_used: 5 }}));
const recent = ['aim-c', 'gone-session', 'aim-a'];
const out = filterFleetItems(items, {{ statusFilter: 'recent', recentSessions: recent }});
assert.deepEqual(out.map((i) => i.session_name), ['aim-c', 'aim-a']);  // MRU order, missing skipped
const all = filterFleetItems(items, {{ statusFilter: 'all', recentSessions: recent }});
assert.deepEqual(all.map((i) => i.session_name), ['aim-a', 'aim-b', 'aim-c', 'aim-d']);  // others untouched
const typed = filterFleetItems(items, {{ statusFilter: 'recent', recentSessions: recent, filterText: 'c' }});
assert.deepEqual(typed.map((i) => i.session_name), ['aim-c']);
assert.equal(computeFleetFilterCounts(items, [], recent).recent, 2);
"""
    proc = subprocess.run(["node", "--input-type=module", "-e", script], capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr


def test_sidebar_swaps_no_web_for_recent_and_app_records_visits():
    jsx = SIDEBAR_JSX.read_text(encoding="utf-8")
    assert "setStatusFilter('nobrowser')" not in jsx and "NO WEB (" not in jsx
    assert "setStatusFilter('recent')" in jsx and "RECENT ({counts.recent})" in jsx
    app = APP_JSX.read_text(encoding="utf-8")
    assert "/api/recent-sessions" in app
    assert "recentSessions={recentSessions}" in app


def test_recent_count_setting_has_plain_help():
    assert "recentSessions:" in HELP_JS.read_text(encoding="utf-8")
    settings = SETTINGS_JSX.read_text(encoding="utf-8")
    assert '<Help k="recentSessions" />' in settings and '<Summary k="recentSessions"' in settings
