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
