import io
import json
import subprocess
import time
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image
import pytest

import main
import node_identity as ni

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
FRONTEND_PUBLIC = WORKTREE_ROOT / "frontend" / "public"
SERVER_SWITCHER_UTILS_JS = FRONTEND_SRC / "serverSwitcherUtils.js"


@pytest.fixture
def admin_token():
    tok = "test-admin-token-306"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


@pytest.fixture
def customer_token():
    tok = "test-customer-token-306"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "tenant@example.com",
        "role": "customer",
        "prefix": "agent-tenant",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_node_identity_url_sanitization_monogram_and_env_parsing(monkeypatch, tmp_path):
    """#306: Reject javascript:/credential URLs, derive crisp monograms, and parse AIM_PEER_SERVERS."""
    assert ni.sanitize_server_url("javascript:alert(1)") == ""
    assert ni.sanitize_server_url("data:text/html,<h1>x</h1>") == ""
    assert ni.sanitize_server_url("https://user:pass@evil.example.com") == ""
    assert ni.sanitize_server_url("vps.example.com/") == "https://vps.example.com"
    assert ni.sanitize_server_url("localhost:8000/") == "http://localhost:8000"

    assert ni.derive_monogram("Cloud VPS") == "CV"
    assert ni.derive_monogram("9800X3D") == "980"
    assert ni.derive_monogram("Workstation", "98X") == "98X"
    assert ni.derive_monogram("A.I.M. Connect") == "AIM"

    peers = ni.parse_env_peer_servers(
        "Main Rig|https://aim.example.com|#00FFA3,Cloud VPS|vps.example.com|#38BDF8,javascript:alert(1)"
    )
    assert len(peers) == 2
    assert peers[0]["label"] == "Main Rig"
    assert peers[0]["url"] == "https://aim.example.com"
    assert peers[0]["color"] == "#00FFA3"
    assert peers[1]["url"] == "https://vps.example.com"


def test_node_info_endpoints_admin_rbac_and_persistence(monkeypatch, tmp_path, admin_token, customer_token):
    """#306: Public GET /api/node-info works before 3FA; PUT /api/node-info enforces admin RBAC & 0600 file perms."""
    auth_dir = tmp_path / "auth_state"
    auth_dir.mkdir()
    monkeypatch.setattr(main, "AUTH_STATE_DIR", str(auth_dir))
    monkeypatch.delenv("AIM_APP_NAME", raising=False)
    monkeypatch.delenv("AIM_NODE_LABEL", raising=False)
    monkeypatch.delenv("AIM_PEER_SERVERS", raising=False)

    client = TestClient(main.app)

    # Public read before login derives clean label from Host header without leaking OS hostname
    get_res = client.get("/api/node-info", headers={"host": "vps01.example.com"})
    assert get_res.status_code == 200
    init_body = get_res.json()
    assert init_body["host"] == "vps01.example.com"
    assert init_body["node_label"] == "VPS01"
    assert init_body["is_customized"] is False

    # Customer cannot mutate server identity
    forb = client.put(
        "/api/node-info",
        headers={"x-api-token": customer_token},
        json={"node_label": "HIJACK"},
    )
    assert forb.status_code == 403

    # Reject unsafe peer URL
    bad_url = client.put(
        "/api/node-info",
        headers={"x-api-token": admin_token},
        json={"peer_servers": [{"label": "Bad", "url": "javascript:alert(1)"}]},
    )
    assert bad_url.status_code == 400

    # Admin saves custom server identity + peer fleet
    put_res = client.put(
        "/api/node-info",
        headers={"x-api-token": admin_token, "host": "aim.example.com"},
        json={
            "node_label": "9800X3D Rig",
            "monogram": "98X",
            "app_color": "#38BDF8",
            "peer_servers": [
                {"label": "Cloud VPS", "url": "https://vps.example.com", "color": "#F59E0B"},
            ],
        },
    )
    assert put_res.status_code == 200
    saved = put_res.json()
    assert saved["node_label"] == "9800X3D Rig"
    assert saved["monogram"] == "98X"
    assert saved["app_color"] == "#38BDF8"
    assert saved["is_customized"] is True
    assert len(saved["peer_servers"]) == 1
    assert saved["peer_servers"][0]["url"] == "https://vps.example.com"

    id_file = auth_dir / "node_identity.json"
    assert id_file.is_file()
    assert (id_file.stat().st_mode & 0o777) == 0o600


def test_dynamic_badged_pwa_manifest_svg_and_png_icons(monkeypatch, tmp_path):
    """#306: Customized servers render distinct manifest short_name, monogrammed SVG, and badged PNG icons."""
    auth_dir = tmp_path / "auth_icons"
    auth_dir.mkdir()
    dist_dir = tmp_path / "dist_icons"
    dist_dir.mkdir()

    # Copy real public manifest/icons into tmp dist_dir
    for name in ("manifest.json", "icon.svg", "icon-192.png", "apple-touch-icon.png"):
        (dist_dir / name).write_bytes((FRONTEND_PUBLIC / name).read_bytes())
    (dist_dir / "index.html").write_text(
        '<!doctype html><html><head><meta name="apple-mobile-web-app-title" content="AIM Connect" /><title>A.I.M. Connect</title><link rel="icon" href="/icon-192.png?v=4" /></head></html>',
        encoding="utf-8",
    )

    monkeypatch.setattr(main, "AUTH_STATE_DIR", str(auth_dir))
    ni.save_node_identity(
        str(auth_dir),
        {
            "node_label": "Cloud VPS",
            "monogram": "VPS",
            "app_color": "#F59E0B",
        },
    )

    manifest_resp = main._render_frontend_file(str(dist_dir), "manifest.json")
    manifest_data = json.loads(manifest_resp.body.decode("utf-8"))
    assert manifest_data["short_name"] == "Cloud VPS"
    assert manifest_data["theme_color"] == "#F59E0B"
    assert all("?v=" in ic["src"] and "?v=4" not in ic["src"] for ic in manifest_data["icons"])

    svg_resp = main._render_frontend_file(str(dist_dir), "icon.svg")
    svg_text = svg_resp.body.decode("utf-8")
    assert "VPS" in svg_text
    assert "#F59E0B" in svg_text

    png_resp = main._render_frontend_file(str(dist_dir), "icon-192.png")
    assert png_resp.media_type == "image/png"
    assert png_resp.body != (dist_dir / "icon-192.png").read_bytes()
    decoded_img = Image.open(io.BytesIO(png_resp.body))
    assert decoded_img.size == (192, 192)

    html_resp = main._render_frontend_file(str(dist_dir), "")
    html_text = html_resp.body.decode("utf-8")
    assert "<title>AIM Connect — Cloud VPS</title>" in html_text
    assert 'content="Cloud VPS"' in html_text


def test_frontend_server_switcher_utils_and_component_wiring():
    """#306: Node ESM unit tests for serverSwitcherUtils.js + AuthScreen/SettingsModal/CommandPalette wiring."""
    assert SERVER_SWITCHER_UTILS_JS.is_file()

    node_script = f"""
import assert from 'node:assert/strict';
import {{
  sanitizeClientServerUrl,
  isSameServerOrigin,
  upsertLocalServer,
  removeLocalServer,
  mergeServerDirectory,
}} from {json.dumps(SERVER_SWITCHER_UTILS_JS.as_uri())};

assert.equal(sanitizeClientServerUrl('javascript:alert(1)'), '');
assert.equal(sanitizeClientServerUrl('https://user:pw@host.example.com'), '');
assert.equal(sanitizeClientServerUrl('vps.example.com/'), 'https://vps.example.com');
assert.equal(sanitizeClientServerUrl('localhost:8000/'), 'http://localhost:8000');
assert.equal(isSameServerOrigin('https://aim.example.com', 'https://AIM.example.com/'), true);

const mem = {{}};
const storage = {{
  getItem: (k) => mem[k] ?? null,
  setItem: (k, v) => {{ mem[k] = v; }},
}};

const bad = upsertLocalServer(storage, {{ label: 'Bad', url: 'javascript:void(0)' }});
assert.equal(bad.ok, false);

const ok1 = upsertLocalServer(storage, {{ label: 'Lab Box', url: 'lab.example.com', color: '#a855f7' }});
assert.equal(ok1.ok, true);
assert.equal(ok1.entry.url, 'https://lab.example.com');

const merged = mergeServerDirectory({{
  currentOrigin: 'https://aim.example.com',
  nodeInfo: {{
    node_label: '9800X3D',
    app_color: '#00FFA3',
    peer_servers: [
      {{ label: 'Self Dup', url: 'https://aim.example.com', color: '#00FFA3' }},
      {{ label: 'Cloud VPS', url: 'https://vps.example.com', color: '#38BDF8' }},
    ],
  }},
  localServers: ok1.servers,
}});

assert.equal(merged.length, 3);
assert.equal(merged[0].isCurrent, true);
assert.equal(merged[0].label, '9800X3D');
assert.equal(merged[1].label, 'Cloud VPS');
assert.equal(merged[2].label, 'Lab Box');

const afterRemove = removeLocalServer(storage, 'https://lab.example.com');
assert.equal(afterRemove.length, 0);
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", node_script],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"Node test failed:\\nSTDOUT: {proc.stdout}\\nSTDERR: {proc.stderr}"

    auth_jsx = (FRONTEND_SRC / "components" / "AuthScreen.jsx").read_text(encoding="utf-8")
    assert "serverDirectory" in auth_jsx
    assert "onSwitchServer" in auth_jsx
    assert "SAVE &amp; SWITCH" in auth_jsx

    settings_jsx = (FRONTEND_SRC / "components" / "SettingsModal.jsx").read_text(encoding="utf-8")
    assert "SERVER IDENTITY &amp; MULTI-SERVER SWITCHER" in settings_jsx
    assert "LOGOUT &amp; SWITCH" in settings_jsx
    assert "SAVE SERVER IDENTITY" in settings_jsx

    cmd_jsx = (FRONTEND_SRC / "components" / "CommandPalette.jsx").read_text(encoding="utf-8")
    assert "SWITCH NODE" in cmd_jsx
