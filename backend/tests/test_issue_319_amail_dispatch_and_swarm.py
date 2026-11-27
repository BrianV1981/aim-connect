"""#319: Route aim-connect WS submit & /api/swarm/activity through A-Mail (amail / aim-mail)."""

from __future__ import annotations

import asyncio
import json
import os
import stat
import time
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

import main
import ws_handler

WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
DEMO_APP_JS = WORKTREE_ROOT / "docs" / "demo" / "app.js"
WS_HANDLER_PY = WORKTREE_ROOT / "backend" / "ws_handler.py"


@pytest.fixture
def admin_token():
    tok = "test-admin-token-319"
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
    tok = "test-cust-token-319"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "tenant@example.com",
        "role": "user",
        "prefix": "agent-tenant",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def _make_fake_amail(tmp_path: Path) -> tuple[Path, Path]:
    log_path = tmp_path / "amail_calls.jsonl"
    bin_path = tmp_path / "amail"
    bin_path.write_text(
        "#!/usr/bin/env python3\n"
        "import json, pathlib, sys\n"
        f"log = pathlib.Path({str(log_path)!r})\n"
        "with log.open('a', encoding='utf-8') as fh:\n"
        "    fh.write(json.dumps(sys.argv[1:]) + '\\n')\n"
        "print(json.dumps({'id': '20261127T170000000000Z_deadbeef', 'status': 'ok'}))\n"
        "sys.exit(0)\n",
        encoding="utf-8",
    )
    bin_path.chmod(stat.S_IRWXU)
    return bin_path, log_path


def test_ws_handler_never_sends_escape_before_enter():
    src = WS_HANDLER_PY.read_text(encoding="utf-8")
    assert '"Escape"' not in src and "'Escape'" not in src
    assert "execute_aim_communicate" not in src
    assert "execute_amail_submit" in src


def test_ws_submit_routes_through_amail_with_from_reply_to(tmp_path, monkeypatch):
    mb_dir = tmp_path / "mailbox"
    mb_dir.mkdir()
    # Pre-register aim-auditor so we verify existing registrations are preserved untouched
    (mb_dir / "agents.json").write_text(
        json.dumps({"aim-auditor": {"agent_id": "aim-auditor", "driver": "tmux", "tmux_session": "aim-auditor"}}),
        encoding="utf-8",
    )
    bin_path, log_path = _make_fake_amail(tmp_path)
    monkeypatch.setenv("AIM_MAIL_BIN", str(bin_path))
    monkeypatch.setenv("AIM_MAILBOX_DIR", str(mb_dir))

    # 1. Unregistered tmux session -> auto-registers with --driver tmux, then sends with FROM/REPLY_TO + --operator-approved
    ok1 = asyncio.run(
        ws_handler.execute_amail_submit(
            "aim-worker",
            "Run delta verification",
            sender="aim-joshua",
            reply_to="aim-joshua",
            subject="Delta check",
        )
    )
    assert ok1 is True

    # 2. Already-registered session -> skips register, sends directly
    ok2 = asyncio.run(
        ws_handler.execute_amail_submit(
            "aim-auditor",
            "Closeout ready",
        )
    )
    assert ok2 is True

    calls = [json.loads(ln) for ln in log_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    assert len(calls) == 3

    reg_call, send_call_1, send_call_2 = calls
    assert reg_call[:4] == ["--mailbox-dir", str(mb_dir), "register", "aim-worker"]
    assert "--driver" in reg_call and reg_call[reg_call.index("--driver") + 1] == "tmux"
    assert "--tmux-session" in reg_call and reg_call[reg_call.index("--tmux-session") + 1] == "aim-worker"

    assert send_call_1[:3] == ["--mailbox-dir", str(mb_dir), "send"]
    assert send_call_1[send_call_1.index("--from") + 1] == "aim-joshua"
    assert send_call_1[send_call_1.index("--to") + 1] == "aim-worker"
    assert send_call_1[send_call_1.index("--reply-to") + 1] == "aim-joshua"
    assert send_call_1[send_call_1.index("--subject") + 1] == "Delta check"
    assert send_call_1[send_call_1.index("--body") + 1] == "Run delta verification"
    assert "--operator-approved" in send_call_1
    assert "--wake" in send_call_1
    assert "--allow-deferred" in send_call_1

    assert send_call_2[:3] == ["--mailbox-dir", str(mb_dir), "send"]
    assert send_call_2[send_call_2.index("--from") + 1] == "aim-connect"
    assert send_call_2[send_call_2.index("--to") + 1] == "aim-auditor"
    assert send_call_2[send_call_2.index("--reply-to") + 1] == "aim-connect"
    assert "--operator-approved" in send_call_2


def test_ws_submit_fallback_without_amail_uses_exact_session_and_enter_only(tmp_path, monkeypatch):
    monkeypatch.setenv("AIM_MAIL_BIN", str(tmp_path / "missing-amail"))
    monkeypatch.setenv("PATH", str(tmp_path))
    with patch.object(ws_handler, "execute_bracketed_paste", new=AsyncMock(return_value=True)) as mock_paste, patch.object(
        ws_handler, "HOME_DIR", str(tmp_path)
    ):
        ok = asyncio.run(ws_handler.execute_amail_submit("aim-worker", "status check"))
    assert ok is True
    mock_paste.assert_awaited_once_with("=aim-worker:", "status check", submit_enter=True)


def test_swarm_activity_reads_amail_maildir_with_stable_schema(tmp_path, monkeypatch, admin_token):
    mb_dir = tmp_path / "mailbox"
    c_dir = mb_dir / "boxes" / "aim-connect" / "claimed"
    d_dir = mb_dir / "boxes" / "aim-auditor" / "done"
    c_dir.mkdir(parents=True)
    d_dir.mkdir(parents=True)

    env_older = {
        "id": "20261126T042437008684Z_75e0ec76",
        "thread_id": "thr_older",
        "from": "aim-mailbox",
        "to": "aim-auditor",
        "reply_to": "aim-mailbox",
        "subject": "Fleet Ping",
        "body": "Reply with a 2-sentence summary.",
        "priority": "normal",
        "hop_count": 0,
        "max_hops": 1,
        "created_at": "2026-11-26T04:24:37.008684Z",
    }
    env_newer = {
        "id": "20261127T164146532026Z_74fc045b",
        "thread_id": "thr_newer",
        "from": "aim-auditor",
        "to": "aim-connect",
        "reply_to": "aim-auditor",
        "subject": "Epic #181 / Issue #319",
        "body": "[DISPATCH] Route WS submit & /api/swarm/activity through A-Mail.",
        "priority": "urgent",
        "hop_count": 0,
        "max_hops": 1,
        "created_at": "2026-11-27T16:41:46.532026Z",
    }
    (d_dir / f"{env_older['id']}.json").write_text(json.dumps(env_older), encoding="utf-8")
    (c_dir / f"{env_newer['id']}.json").write_text(json.dumps(env_newer), encoding="utf-8")

    monkeypatch.setenv("AIM_MAILBOX_DIR", str(mb_dir))
    monkeypatch.delenv("AIM_SWARM_DIR", raising=False)

    client = TestClient(main.app)
    resp = client.get("/api/swarm/activity", headers={"x-api-token": admin_token})
    assert resp.status_code == 200
    dispatches = resp.json()["dispatches"]
    assert [d["id"] for d in dispatches] == [env_newer["id"], env_older["id"]]

    top = dispatches[0]
    assert top["filename"] == f"{env_newer['id']}.json"
    assert top["sender"] == "aim-auditor"
    assert top["recipient"] == "aim-connect"
    assert top["reply_to"] == "aim-auditor"
    assert isinstance(top["mtime"], (int, float)) and top["mtime"] > dispatches[1]["mtime"]
    assert "Epic #181 / Issue #319" in top["preview"]
    assert "[DISPATCH]" in top["preview"]
    assert "[DISPATCH] Route WS submit" in top["content"]
    assert top["thread_id"] == "thr_newer"
    assert top["state"] == "claimed"
    assert top["priority"] == "urgent"
    # Never leak raw host tmp_path directory in API path field
    assert str(tmp_path) not in top["path"]


def test_swarm_dispatch_endpoint_auth_validation_and_amail_execution(tmp_path, monkeypatch, admin_token, customer_token):
    bin_path, log_path = _make_fake_amail(tmp_path)
    mb_dir = tmp_path / "mailbox"
    mb_dir.mkdir()
    monkeypatch.setenv("AIM_MAIL_BIN", str(bin_path))
    monkeypatch.setenv("AIM_MAILBOX_DIR", str(mb_dir))

    client = TestClient(main.app)
    assert client.post("/api/swarm/dispatch", json={"to": "aim-auditor", "body": "hi"}).status_code == 401
    assert (
        client.post(
            "/api/swarm/dispatch",
            headers={"x-api-token": customer_token},
            json={"to": "aim-auditor", "body": "hi"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/swarm/dispatch",
            headers={"x-api-token": admin_token},
            json={"to": "bad;rm -rf", "body": "hi"},
        ).status_code
        == 400
    )

    ok_resp = client.post(
        "/api/swarm/dispatch",
        headers={"x-api-token": admin_token},
        json={
            "from_agent": "aim-connect",
            "to": "aim-auditor",
            "reply_to": "aim-connect",
            "subject": "Closeout",
            "body": "Merged and green.",
        },
    )
    assert ok_resp.status_code == 200
    assert ok_resp.json()["status"] == "dispatched"
    calls = [json.loads(ln) for ln in log_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    assert any("send" in c and "aim-auditor" in c for c in calls)


def test_frontend_and_demo_keywords_and_labels_migrated_to_amail():
    palette = (FRONTEND_SRC / "components" / "CommandPalette.jsx").read_text(encoding="utf-8")
    forensics = (FRONTEND_SRC / "components" / "ForensicsModal.jsx").read_text(encoding="utf-8")
    demo = DEMO_APP_JS.read_text(encoding="utf-8")

    for kw in ("a-mail", "amail", "aim-mail"):
        assert kw in palette.lower()
    assert "aim-communicate" not in palette.lower()
    assert "aim-communicate" not in forensics.lower()
    assert "chalkboard" not in forensics.lower()
    assert "/api/swarm/dispatch" in forensics
    assert "aim-communicate" not in demo.lower()
