import os
import subprocess
from pathlib import Path

from tests.test_startup_topology import _make_mock_bin


REPO_ROOT = Path(__file__).resolve().parents[2]
STARTUP_SH = REPO_ROOT / "startup.sh"
ROUTES_API_PY = REPO_ROOT / "backend" / "routes_api.py"


def test_no_personal_os_files_tracked_in_git():
    """Public git index must not track joshua_os/, HANDOFF.md, aim, or internal ticket dumps."""
    res = subprocess.run(
        ["git", "ls-files"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    tracked = res.stdout.splitlines()
    assert not any(f.startswith("joshua_os/") for f in tracked), "joshua_os/ must not be tracked in git"
    assert not any(f.startswith("memory-wiki/") for f in tracked), "memory-wiki/ must not be tracked in git"
    assert "HANDOFF.md" not in tracked, "HANDOFF.md must not be tracked in git"
    assert "aim" not in tracked, "aim wrapper must not be tracked in git"
    assert not any(f.startswith("docs/TICKET_") for f in tracked), "Internal TICKET docs must not be tracked"
    assert "docs/aim_connect_launch_plan.md" not in tracked


def test_gitignore_covers_local_operational_and_scratch_files():
    """git check-ignore must match local J.O.S.H.U.A. state, worktrees, and scratch artifacts (#172/#202)."""
    candidates = [
        "joshua_os/VERSION",
        "memory-wiki/index.md",
        "HANDOFF.md",
        "aim",
        "workspace/issue-202",
        "archive/scratch.txt",
        "planning-artifacts/plan.md",
        "aim-communicate.md",
        "testjay.md",
        "docs/transcript_abc.md",
        "docs/summary_abc.md",
        "docs/grok_session_abc.md",
        "backend/test_admin.py",
    ]
    res = subprocess.run(
        ["git", "check-ignore", *candidates],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    ignored = set(res.stdout.splitlines())
    missing = [c for c in candidates if c not in ignored]
    assert not missing, f"Files not covered by .gitignore: {missing}"


def test_no_hardcoded_operator_home_in_startup_or_routes():
    """startup.sh and backend/routes_api.py must not hardcode the operator home path."""
    forbidden_home = "/" + "home/kingb"
    startup_text = STARTUP_SH.read_text()
    routes_text = ROUTES_API_PY.read_text()
    assert forbidden_home not in startup_text, "startup.sh still hardcodes operator home path"
    assert forbidden_home not in routes_text, "backend/routes_api.py still hardcodes operator home path"


def test_no_personal_identifiers_or_fallback_secrets_in_any_tracked_file():
    """No git-tracked file may contain hardcoded operator paths, live SMTP IPs, client names, or fallback secrets (#204)."""
    res = subprocess.run(
        ["git", "ls-files"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    forbidden_tokens = [
        "/" + "home/kingb",
        "50.87." + "170.84",
        "CccWVy6" + "URQiMYS",
        "jeff.hale@" + "spectrum.com",
        "Olive" + "ira",
        "bluehost_" + "staging",
        "leaddeed-" + "fic",
    ]
    violations = []
    for rel_path in res.stdout.splitlines():
        if rel_path.endswith((".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg")):
            continue
        fpath = REPO_ROOT / rel_path
        if not fpath.is_file():
            continue
        text = fpath.read_text(encoding="utf-8", errors="ignore")
        for token in forbidden_tokens:
            if token in text:
                violations.append(f"{rel_path} contains forbidden token {token!r}")
    assert not violations, "Shareability violations found:\n" + "\n".join(violations)


def test_routes_api_verify_jwt_fails_closed_without_env_secret(monkeypatch):
    """routes_api.verify_vercel_jwt must fail closed when LEADDEED_DOWNLOAD_SIGNING_SECRET is unset (#204)."""
    import base64
    import hashlib
    import hmac
    import json
    import time
    import pytest
    from fastapi import HTTPException
    import routes_api

    monkeypatch.delenv("LEADDEED_DOWNLOAD_SIGNING_SECRET", raising=False)
    old_fallback = "CccWVy6" + "URQiMYS-UO0uSmWmNZ_fyUoxkW-njr7G6-PJ_gWlT45thhGsWtKuC0A53"
    payload = {"e": "tester@example.com", "exp": int(time.time()) + 3600}
    body_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    forged_sig = base64.urlsafe_b64encode(
        hmac.new(old_fallback.encode(), body_b64.encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    forged_token = f"Bearer {body_b64}.{forged_sig}"

    with pytest.raises(HTTPException) as exc_info:
        routes_api.verify_vercel_jwt(forged_token)
    assert exc_info.value.status_code in (401, 500)

    # Verify it succeeds when a valid env secret is configured
    test_secret = "test_only_signing_secret_for_204"
    monkeypatch.setenv("LEADDEED_DOWNLOAD_SIGNING_SECRET", test_secret)
    valid_sig = base64.urlsafe_b64encode(
        hmac.new(test_secret.encode(), body_b64.encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    assert routes_api.verify_vercel_jwt(f"Bearer {body_b64}.{valid_sig}") == "tester@example.com"


def test_no_leaddeeds_domain_defaults_in_runtime_code():
    """startup.sh, backend/main.py, and backend/routes_webauthn.py must not hardcode leaddeeds.com (#205)."""
    for rel in ("startup.sh", "backend/main.py", "backend/routes_webauthn.py"):
        text = (REPO_ROOT / rel).read_text(encoding="utf-8")
        assert "leaddeeds.com" not in text, f"{rel} still hardcodes leaddeeds.com"


def test_webauthn_rp_id_derives_from_request_host_when_env_unset(monkeypatch):
    """_resolve_rp_id uses request Host when WEBAUTHN_RP_ID is unset, and honors WEBAUTHN_RP_ID when set (#205)."""
    from starlette.requests import Request
    import routes_webauthn

    def _make_req(host: str) -> Request:
        scope = {
            "type": "http",
            "method": "GET",
            "path": "/api/webauthn/register/options",
            "headers": [(b"host", host.encode("utf-8"))],
            "query_string": b"",
            "server": ("127.0.0.1", 8000),
            "scheme": "https",
        }
        return Request(scope)

    monkeypatch.delenv("WEBAUTHN_RP_ID", raising=False)
    monkeypatch.setattr(routes_webauthn, "WEBAUTHN_RP_ID", "")
    assert routes_webauthn._resolve_rp_id(_make_req("terminal.example.org:8443")) == "terminal.example.org"

    monkeypatch.setenv("WEBAUTHN_RP_ID", "custom.example.com")
    assert routes_webauthn._resolve_rp_id(_make_req("terminal.example.org:8443")) == "custom.example.com"


def test_admin_initial_command_skips_agy_when_not_installed(monkeypatch, tmp_path):
    """Standalone clones without agy installed must not auto-send agy into new admin tmux sessions (#205)."""
    import ws_handler

    monkeypatch.delenv("AIM_ADMIN_DEFAULT_CMD", raising=False)
    assert ws_handler.build_admin_initial_command("opencode", home_dir=str(tmp_path), which_fn=lambda _: None) is None

    # When agy binary exists on PATH, it returns the agy launch command
    cmd = ws_handler.build_admin_initial_command("opencode", home_dir=str(tmp_path), which_fn=lambda _: "/usr/local/bin/agy")
    assert cmd == "export AIM_VESSEL_CLI=opencode && agy --log-file /dev/null"

    # Explicit AIM_ADMIN_DEFAULT_CMD overrides default
    monkeypatch.setenv("AIM_ADMIN_DEFAULT_CMD", "htop")
    assert ws_handler.build_admin_initial_command("opencode", home_dir=str(tmp_path), which_fn=lambda _: None) == "htop"


def test_resolve_workspace_id_silent_fallback_when_aim_ld_absent(monkeypatch, tmp_path, caplog):
    """Standalone clones without ../aim-ld/scripts must resolve workspace IDs without warning spam (#205)."""
    import logging
    import sys
    import ws_handler

    monkeypatch.setenv("AIM_LD_SCRIPTS", str(tmp_path / "nonexistent-aim-ld-scripts"))
    monkeypatch.delitem(sys.modules, "core", raising=False)
    monkeypatch.delitem(sys.modules, "core.identity", raising=False)

    with caplog.at_level(logging.WARNING, logger="aim-connect"):
        wid = ws_handler.resolve_workspace_id_for_email("Alice.Smith@Example.com")
    assert wid == "alice_smith_example_com"
    assert not any("operator registry resolve failed" in r.message for r in caplog.records)


def test_env_example_disables_e2ee_by_default():
    """.env.example must default ENABLE_E2EE=false so cp .env.example .env works out of the box (#206)."""
    env_example = (REPO_ROOT / ".env.example").read_text(encoding="utf-8")
    assert "ENABLE_E2EE=false" in env_example
    assert "ENABLE_E2EE=true" not in [
        line.strip() for line in env_example.splitlines() if not line.strip().startswith("#")
    ]


def test_dockerfile_and_readme_onboarding_correctness():
    """Dockerfile must install lsof/procps and use --foreground; README must point to backend/*.hash (#206)."""
    dockerfile = (REPO_ROOT / "Dockerfile").read_text(encoding="utf-8")
    assert "lsof" in dockerfile
    assert "procps" in dockerfile
    assert "--foreground" in dockerfile

    readme = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
    assert "rm backend/passphrase.hash" in readme


def test_startup_sh_bootstraps_first_run_creds_and_supports_foreground():
    """startup.sh must bootstrap missing 3FA creds in the foreground TTY and support --foreground (#206)."""
    startup_text = STARTUP_SH.read_text(encoding="utf-8")
    assert "backend/totp.secret" in startup_text
    assert "backend/password.hash" in startup_text
    assert "backend/passphrase.hash" in startup_text
    assert "--foreground" in startup_text


def test_restart_script_and_architecture_docs_use_aim_connect_workspace():
    """backend/restart_server.sh and docs/AGENT_ARCHITECTURE.md must reference aim-connect-workspace (#206)."""
    restart_sh = (REPO_ROOT / "backend" / "restart_server.sh").read_text(encoding="utf-8")
    arch_md = (REPO_ROOT / "docs" / "AGENT_ARCHITECTURE.md").read_text(encoding="utf-8")
    assert "aim-connect-backend" not in restart_sh
    assert "aim-connect-workspace" in restart_sh
    assert "aim-connect-workspace" in arch_md


def test_startup_sh_skips_optional_mcp_and_cloudflared_when_absent(tmp_path):
    """A fresh open-source clone without aim-mcp or cloudflared config still starts :8000 cleanly."""
    bin_dir, log_file = _make_mock_bin(
        tmp_path, lsof_8000="", lsof_8001="", pgrep_cf="", has_session=0
    )
    env = os.environ.copy()
    env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"
    env["AIM_MCP_DIR"] = str(tmp_path / "nonexistent-aim-mcp")
    env["CLOUDFLARED_CONFIG"] = str(tmp_path / "nonexistent-cloudflared.yml")

    res = subprocess.run(
        ["bash", str(STARTUP_SH)],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert res.returncode == 0, res.stderr
    calls = log_file.read_text().splitlines()
    send_keys_calls = [c for c in calls if "send-keys" in c]
    assert any("aim-connect-workspace:servers" in c for c in send_keys_calls)
    assert not any("aim-connect-workspace:mcp" in c for c in send_keys_calls)
    assert not any("aim-connect-workspace:cloudflared" in c for c in send_keys_calls)


def test_docker_compose_onboarding_and_auth_persistence(tmp_path):
    """docker-compose.yml must avoid bridge-NAT 403 on localhost, wire optional .env, drop dead NGROK vars, and persist auth_data (#235)."""
    import shutil

    compose_path = REPO_ROOT / "docker-compose.yml"
    compose_text = compose_path.read_text(encoding="utf-8")
    dockerfile_text = (REPO_ROOT / "Dockerfile").read_text(encoding="utf-8")

    assert not compose_text.lstrip().startswith("version:"), "Deprecated compose version key should be removed"
    assert "NGROK_AUTHTOKEN" not in compose_text, "docker-compose.yml should not hardcode unused NGROK_AUTHTOKEN"
    assert "NGROK_DOMAIN" not in compose_text, "docker-compose.yml should not hardcode unused NGROK_DOMAIN"
    assert "env_file:" in compose_text
    assert "required: false" in compose_text
    assert "${AIM_BIND_HOST:-127.0.0.1}:8000:8000" in compose_text
    assert "ALLOW_HTTP" in compose_text
    assert "aim-auth-data:/app/auth_data" in compose_text

    assert "AIM_AUTH_DIR=/app/auth_data" in dockerfile_text
    assert "auth_data" in dockerfile_text

    if shutil.which("docker"):
        # Verify `docker compose config` succeeds even in a fresh clone directory without a .env file
        isolated_dir = tmp_path / "fresh_clone"
        isolated_dir.mkdir()
        shutil.copy2(compose_path, isolated_dir / "docker-compose.yml")
        res = subprocess.run(
            ["docker", "compose", "config"],
            cwd=str(isolated_dir),
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert res.returncode == 0, f"docker compose config failed without .env: {res.stderr}"
        assert "127.0.0.1" in res.stdout
        assert "aim-auth-data" in res.stdout


def test_aim_auth_dir_persists_3fa_tokens_and_webauthn_separately_from_backend(monkeypatch, tmp_path):
    """AIM_AUTH_DIR must isolate 3FA secrets, tokens.json, users.json, and webauthn.json outside BACKEND_DIR (#235)."""
    import importlib
    import stat
    import main
    import routes_auth
    import webauthn_manager

    auth_dir = tmp_path / "persisted_auth"
    try:
        monkeypatch.setenv("AIM_AUTH_DIR", str(auth_dir))
        monkeypatch.delenv("WEBAUTHN_DB", raising=False)
        importlib.reload(main)
        importlib.reload(routes_auth)
        importlib.reload(webauthn_manager)

        assert os.path.realpath(main.AUTH_STATE_DIR) == os.path.realpath(str(auth_dir))
        assert os.path.dirname(main.SECRET_FILE) == main.AUTH_STATE_DIR
        assert os.path.dirname(main.PASSWORD_FILE) == main.AUTH_STATE_DIR
        assert os.path.dirname(main.PASSPHRASE_FILE) == main.AUTH_STATE_DIR
        assert os.path.dirname(main.USERS_FILE) == main.AUTH_STATE_DIR
        assert os.path.dirname(main.TOKEN_FILE) == main.AUTH_STATE_DIR
        assert os.path.dirname(webauthn_manager.WEBAUTHN_DB) == main.AUTH_STATE_DIR

        for fname in ("totp.secret", "password.hash", "passphrase.hash"):
            fpath = auth_dir / fname
            assert fpath.is_file(), f"Expected {fname} generated inside AIM_AUTH_DIR"
            assert stat.S_IMODE(fpath.stat().st_mode) == 0o600

        webauthn_manager.webauthn_mgr.credentials["admin"] = [{"id": "abc", "public_key": "xyz", "sign_count": 1}]
        webauthn_manager.webauthn_mgr.save_db()
        w_path = auth_dir / "webauthn.json"
        assert w_path.is_file()
        assert stat.S_IMODE(w_path.stat().st_mode) == 0o600
    finally:
        monkeypatch.delenv("AIM_AUTH_DIR", raising=False)
        importlib.reload(main)
        importlib.reload(routes_auth)
        importlib.reload(webauthn_manager)

    assert main.AUTH_STATE_DIR == main.BACKEND_DIR
    assert os.path.dirname(webauthn_manager.WEBAUTHN_DB) == main.BACKEND_DIR


def test_enforce_https_bridge_nat_vs_allow_http(monkeypatch):
    """Bridge-NAT / Tailscale HTTP IPs (172.18.0.1, 100.x) must 403 when ALLOW_HTTP=False and pass when ALLOW_HTTP=True (#235)."""
    from fastapi.testclient import TestClient
    import main

    monkeypatch.setattr(main, "ALLOW_HTTP", False)
    nat_client = TestClient(main.app, client=("172.18.0.1", 50000))
    assert nat_client.get("/api/health").status_code == 200
    blocked = nat_client.get("/api/sessions")
    assert blocked.status_code == 403
    assert "HTTPS required" in blocked.json()["detail"]

    monkeypatch.setattr(main, "ALLOW_HTTP", True)
    allowed_nat = nat_client.get("/api/sessions")
    # Passes enforce_https (401 from missing x-api-token rather than 403 HTTPS required)
    assert allowed_nat.status_code == 401

    tailscale_client = TestClient(main.app, client=("100.88.12.34", 50000))
    assert tailscale_client.get("/api/sessions").status_code == 401


def test_readme_documents_docker_persistence_and_tailscale_allow_http():
    """README.md must document Docker auth-volume persistence and ALLOW_HTTP=true for Tailscale HTTP (#235)."""
    readme = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
    assert "aim-auth-data" in readme
    assert "ALLOW_HTTP=true" in readme
    # Docker quick-start should no longer tell users to fill NGROK_AUTHTOKEN for docker compose
    docker_section = readme.split("## 🐳 Deployment (Docker)", 1)[1].split("---", 1)[0]
    assert "NGROK_AUTHTOKEN" not in docker_section
