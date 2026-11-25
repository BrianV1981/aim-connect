import json
import os
import subprocess
import time
from pathlib import Path
from unittest.mock import patch

import bcrypt
import pyotp
import pytest
from fastapi.testclient import TestClient

import main
import routes_auth

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
APP_REFRESH_UTILS_JS = FRONTEND_SRC / "appRefreshUtils.js"


@pytest.fixture
def admin_token():
    tok = "test-admin-token-304"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_get_frontend_build_id_stat_cache_and_invalidation(tmp_path):
    """#304: get_frontend_build_id stat-caches index-*.js and invalidates immediately on deploy."""
    missing_dir = tmp_path / "missing_dist"
    assert main.get_frontend_build_id(dist_dir=str(missing_dir)) == "dev"

    dist_dir = tmp_path / "dist"
    dist_dir.mkdir()
    index_file = dist_dir / "index.html"
    index_file.write_text(
        '<!doctype html><html><head>'
        '<script type="module" crossorigin src="/assets/index-OldHash1.js"></script>'
        "</head><body></body></html>",
        encoding="utf-8",
    )

    first_id = main.get_frontend_build_id(dist_dir=str(dist_dir))
    assert first_id == "index-OldHash1.js"

    # Subsequent calls with identical stat metadata must not re-open index.html
    with patch("builtins.open", side_effect=AssertionError("Should hit stat cache")):
        assert main.get_frontend_build_id(dist_dir=str(dist_dir)) == "index-OldHash1.js"

    # New Vite build writes a fresh index-*.js hash (bump mtime_ns explicitly for fast filesystems)
    index_file.write_text(
        '<!doctype html><html><head>'
        '<script type="module" crossorigin src="/assets/index-NewHash2_B.js"></script>'
        "</head><body></body></html>",
        encoding="utf-8",
    )
    st = index_file.stat()
    os.utime(index_file, ns=(st.st_atime_ns, st.st_mtime_ns + 1_000_000))

    assert main.get_frontend_build_id(dist_dir=str(dist_dir)) == "index-NewHash2_B.js"

    # Fallback when index.html has no Vite /assets/index-*.js script
    plain_dir = tmp_path / "plain"
    plain_dir.mkdir()
    plain_index = plain_dir / "index.html"
    plain_index.write_text("<html><body>custom</body></html>", encoding="utf-8")
    fallback_id = main.get_frontend_build_id(dist_dir=str(plain_dir))
    assert fallback_id.startswith("mtime-")


def test_piggybacked_build_id_on_sessions_auth_and_webauthn(tmp_path, monkeypatch, admin_token):
    """#304: /api/sessions, /api/auth, and /api/webauthn/authenticate/verify carry build_id & X-AIM-Build without breaking #247 passive expiry."""
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir()
    (dist_dir / "index.html").write_text(
        '<script type="module" src="/assets/index-Live304X.js"></script>',
        encoding="utf-8",
    )
    monkeypatch.setattr(main, "FRONTEND_DIST_PATH", str(dist_dir))

    client = TestClient(main.app)

    # 1. GET /api/sessions piggybacks build_id + X-AIM-Build AND preserves passive token expiry (#247)
    fixed_exp = time.time() + 900.0
    main.VALID_API_TOKENS[admin_token]["expires"] = fixed_exp
    with patch("routes_sessions.subprocess.run") as mock_run:
        mock_run.return_value.returncode = 0
        mock_run.return_value.stdout = "aim-connect\n"
        with patch("routes_sessions.collect_fleet_telemetry", return_value=([], [])):
            resp = client.get("/api/sessions", headers={"x-api-token": admin_token})
    assert resp.status_code == 200
    body = resp.json()
    assert body["build_id"] == "index-Live304X.js"
    assert resp.headers.get("x-aim-build") == "index-Live304X.js"
    assert main.VALID_API_TOKENS[admin_token]["expires"] == pytest.approx(fixed_exp, abs=0.01)

    # 2. POST /api/webauthn/authenticate/verify piggybacks build_id + X-AIM-Build
    with patch("routes_webauthn.webauthn_mgr.verify_authentication", return_value=True), patch(
        "routes_webauthn.save_tokens"
    ):
        wa_resp = client.post(
            "/api/webauthn/authenticate/verify",
            json={"username": "admin", "response": {"id": "cred-1"}},
        )
    assert wa_resp.status_code == 200
    wa_body = wa_resp.json()
    assert wa_body["build_id"] == "index-Live304X.js"
    assert wa_resp.headers.get("x-aim-build") == "index-Live304X.js"
    main.VALID_API_TOKENS.pop(wa_body["token"], None)

    # 3. POST /api/auth piggybacks build_id + X-AIM-Build
    secret = pyotp.random_base32()
    pw_hash = bcrypt.hashpw(b"pw-304", bcrypt.gensalt()).decode("utf-8")
    pp_hash = bcrypt.hashpw(b"pp-304", bcrypt.gensalt()).decode("utf-8")
    monkeypatch.setattr(routes_auth, "users_db", None)
    monkeypatch.setattr(routes_auth, "totp_instance", pyotp.TOTP(secret))
    monkeypatch.setattr(routes_auth, "admin_password_hash", pw_hash)
    monkeypatch.setattr(routes_auth, "admin_passphrase_hash", pp_hash)
    monkeypatch.setattr(routes_auth, "_last_used_totp", None)
    main.auth_attempts.clear()

    with patch("routes_auth.save_tokens"):
        auth_resp = client.post(
            "/api/auth",
            json={
                "token": pyotp.TOTP(secret).now(),
                "password": "pw-304",
                "passphrase": "pp-304",
            },
        )
    assert auth_resp.status_code == 200
    auth_body = auth_resp.json()
    assert auth_body["build_id"] == "index-Live304X.js"
    assert auth_resp.headers.get("x-aim-build") == "index-Live304X.js"
    main.VALID_API_TOKENS.pop(auth_body["api_token"], None)


def test_frontend_app_refresh_utils_and_ui_wiring():
    """#304: Node ESM tests for appRefreshUtils.js + SettingsModal/CommandPalette/AuthScreen/App wiring."""
    assert APP_REFRESH_UTILS_JS.is_file()

    node_script = f"""
import assert from 'node:assert/strict';
import {{
  AUTO_RELOAD_BUILD_STORAGE_KEY,
  normalizeBuildId,
  extractDomBuildId,
  evaluateBuildFreshness,
  performHardAppRefresh,
}} from {json.dumps(APP_REFRESH_UTILS_JS.as_uri())};

assert.equal(normalizeBuildId(''), '');
assert.equal(normalizeBuildId('dev'), '');
assert.equal(normalizeBuildId(' index-AbC_123.js '), 'index-AbC_123.js');

const fakeDoc = {{
  querySelectorAll: () => [
    {{ src: 'https://cdn.example.com/helper.js', getAttribute: () => 'https://cdn.example.com/helper.js' }},
    {{ src: 'https://aim.example.com/assets/index-n09Y-6cE.js', getAttribute: () => '/assets/index-n09Y-6cE.js' }},
  ],
}};
assert.equal(extractDomBuildId(fakeDoc), 'index-n09Y-6cE.js');
assert.equal(extractDomBuildId(null), '');

// Matching builds -> no update, no reload
assert.deepEqual(
  evaluateBuildFreshness({{
    bootBuildId: 'index-n09Y-6cE.js',
    serverBuildId: 'index-n09Y-6cE.js',
    context: 'auth',
  }}),
  {{
    normalizedBoot: 'index-n09Y-6cE.js',
    normalizedServer: 'index-n09Y-6cE.js',
    updateAvailable: false,
    shouldAutoReload: false,
  }}
);

// Stale mobile PWA re-authenticating -> auto-reload once
assert.deepEqual(
  evaluateBuildFreshness({{
    bootBuildId: 'index-OldPre300.js',
    serverBuildId: 'index-New304.js',
    context: 'auth',
    lastAutoReloadBuildId: '',
  }}),
  {{
    normalizedBoot: 'index-OldPre300.js',
    normalizedServer: 'index-New304.js',
    updateAvailable: true,
    shouldAutoReload: true,
  }}
);

// Loop guard: never auto-reload twice for the exact same target build
assert.deepEqual(
  evaluateBuildFreshness({{
    bootBuildId: 'index-OldPre300.js',
    serverBuildId: 'index-New304.js',
    context: 'auth',
    lastAutoReloadBuildId: 'index-New304.js',
  }}),
  {{
    normalizedBoot: 'index-OldPre300.js',
    normalizedServer: 'index-New304.js',
    updateAvailable: true,
    shouldAutoReload: false,
  }}
);

// Mid-session poll -> surface update badge, NEVER interrupt active typing
assert.deepEqual(
  evaluateBuildFreshness({{
    bootBuildId: 'index-OldPre300.js',
    serverBuildId: 'index-New304.js',
    context: 'poll',
  }}),
  {{
    normalizedBoot: 'index-OldPre300.js',
    normalizedServer: 'index-New304.js',
    updateAvailable: true,
    shouldAutoReload: false,
  }}
);

// Hard refresh clears SW + CacheStorage + revalidates pathname + reloads
const events = [];
const stored = {{}};
await performHardAppRefresh({{
  targetBuildId: 'index-New304.js',
  sessionStorageObj: {{ setItem: (k, v) => {{ stored[k] = v; events.push('session:' + k); }} }},
  serviceWorker: {{
    getRegistrations: async () => [{{ unregister: async () => events.push('sw:unregister') }}],
  }},
  cachesApi: {{
    keys: async () => ['v1-cache'],
    delete: async (k) => events.push('cache:delete:' + k),
  }},
  fetchFn: async (p, opts) => events.push('fetch:' + p + ':' + opts.cache),
  locationObj: {{
    pathname: '/',
    reload: () => events.push('location:reload'),
  }},
}});
assert.equal(stored[AUTO_RELOAD_BUILD_STORAGE_KEY], 'index-New304.js');
assert.deepEqual(events, [
  'session:aim-last-auto-reload-build',
  'sw:unregister',
  'cache:delete:v1-cache',
  'fetch:/:reload',
  'location:reload',
]);
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", node_script],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"Node test failed:\\nSTDOUT: {proc.stdout}\\nSTDERR: {proc.stderr}"

    settings_jsx = (FRONTEND_SRC / "components" / "SettingsModal.jsx").read_text(encoding="utf-8")
    assert "REFRESH APP" in settings_jsx
    assert "UPDATE & REFRESH" in settings_jsx
    assert "onRefreshApp" in settings_jsx

    cmd_jsx = (FRONTEND_SRC / "components" / "CommandPalette.jsx").read_text(encoding="utf-8")
    assert "app:hard-refresh" in cmd_jsx
    assert "REFRESH APP" in cmd_jsx

    auth_jsx = (FRONTEND_SRC / "components" / "AuthScreen.jsx").read_text(encoding="utf-8")
    assert "onRefreshApp" in auth_jsx

    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    assert "reconcileServerBuildId" in app_jsx
    assert "handleHardRefreshApp" in app_jsx
