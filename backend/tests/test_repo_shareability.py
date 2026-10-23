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
    assert "HANDOFF.md" not in tracked, "HANDOFF.md must not be tracked in git"
    assert "aim" not in tracked, "aim wrapper must not be tracked in git"
    assert not any(f.startswith("docs/TICKET_") for f in tracked), "Internal TICKET docs must not be tracked"
    assert "docs/aim_connect_launch_plan.md" not in tracked


def test_gitignore_covers_local_operational_and_scratch_files():
    """git check-ignore must match local J.O.S.H.U.A. state, worktrees, and scratch artifacts (#172/#202)."""
    candidates = [
        "joshua_os/memory-wiki/index.md",
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
