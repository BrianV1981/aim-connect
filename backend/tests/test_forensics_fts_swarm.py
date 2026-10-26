import json
import os
import time
import pytest
from fastapi.testclient import TestClient

import main  # noqa: F401
import routes_forensics


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def valid_token():
    tok = "test-admin-token-212"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 3600,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_parse_scrollback_tool_blocks():
    """Verify collapsed '● Bash(...)' TUI tool lines parse into expandable tool_calls (#212)."""
    scrollback = (
        "● Bash(pytest tests/test_fleet_sidebar.py -v) (ctrl+o to expand)\n"
        "  7 passed in 0.68s\n"
        "● Read(backend/routes_sessions.py)\n"
        "  Showing lines 1-50\n"
        "> Ready\n"
    )
    turns = routes_forensics.parse_scrollback_tool_blocks(scrollback)
    assert len(turns) == 1
    tcs = turns[0]["tool_calls"]
    assert len(tcs) == 2
    assert tcs[0]["name"] == "Bash"
    assert "pytest" in tcs[0]["args"]
    assert "7 passed" in tcs[0]["output"]
    assert tcs[1]["name"] == "Read"


def test_forensics_session_and_sqlite_fts5_search(client, valid_token, tmp_path, monkeypatch):
    """GET /api/forensics/{session} and GET /api/forensics/search index and query JSONL transcripts (#212)."""
    forensics_dir = tmp_path / "forensics"
    forensics_dir.mkdir()
    db_file = tmp_path / "fts.db"
    monkeypatch.setenv("AIM_FORENSICS_DIR", str(forensics_dir))
    monkeypatch.setenv("AIM_FORENSICS_DB", str(db_file))
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))

    transcript = forensics_dir / "transcript.jsonl"
    steps = [
        {
            "step_index": 1,
            "type": "USER_INPUT",
            "created_at": "2026-10-26T10:00:00Z",
            "content": "Run the 30%-Rule context saturation verification suite for aim-connect.",
        },
        {
            "step_index": 2,
            "type": "PLANNER_RESPONSE",
            "created_at": "2026-10-26T10:00:05Z",
            "content": "Executing pytest on test_fleet_sidebar.py.",
            "thinking": "Checking context saturation tiers.",
            "tool_calls": [
                {
                    "id": "tc-1",
                    "name": "run_command",
                    "arguments": {"CommandLine": "pytest tests/test_fleet_sidebar.py"},
                    "output": "7 passed in 0.68s — quarantine_verified_token_xyz",
                    "status": "DONE",
                }
            ],
        },
    ]
    transcript.write_text("\n".join(json.dumps(s) for s in steps) + "\n", encoding="utf-8")

    # 1. Lazy-loaded on-demand session forensics
    resp = client.get("/api/forensics/aim-connect", headers={"x-api-token": valid_token})
    assert resp.status_code == 200
    data = resp.json()
    assert data["tool_call_count"] == 1
    assert len(data["turns"]) == 2
    assert data["turns"][1]["tool_calls"][0]["name"] == "run_command"

    # 2. SQLite WAL FTS5 search
    s_resp = client.get(
        "/api/forensics/search?q=quarantine_verified_token_xyz",
        headers={"x-api-token": valid_token},
    )
    assert s_resp.status_code == 200
    s_data = s_resp.json()
    assert len(s_data["results"]) >= 1
    assert "quarantine_verified_token_xyz" in s_data["results"][0]["snippet"]


def test_brain_search_two_pass_per_path_deduplication(client, valid_token, tmp_path, monkeypatch):
    """GET /api/brain/search deduplicates multiple matching chunks from the same markdown file (#212)."""
    monkeypatch.setenv("AIM_EXTRA_ALLOWED_ROOT", str(tmp_path))
    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True)
    wiki = repo / "memory-wiki" / "pages"
    wiki.mkdir(parents=True)

    # Write a file with 3 separate paragraphs containing 'lancedb'
    (wiki / "rag_architecture.md").write_text(
        "# RAG Architecture\n\n"
        "Paragraph 1 mentions lancedb hybrid search.\n\n"
        "Paragraph 2 mentions lancedb lancedb lancedb vector index.\n\n"
        "Paragraph 3 also mentions lancedb.\n",
        encoding="utf-8",
    )
    (repo / "HANDOFF.md").write_text("# Handoff\n\nRun ./aim index to update lancedb.\n", encoding="utf-8")

    resp = client.get(
        f"/api/brain/search?path={repo}&q=lancedb",
        headers={"x-api-token": valid_token},
    )
    assert resp.status_code == 200
    results = resp.json()["results"]
    paths = [r["rel_path"] for r in results]
    # Must contain each file at most once (two-pass per-path deduplication)
    assert len(paths) == len(set(paths))
    assert "memory-wiki/pages/rag_architecture.md" in paths
    assert "HANDOFF.md" in paths


def test_swarm_activity_parses_aim_communicate_headers(client, valid_token, tmp_path, monkeypatch):
    """GET /api/swarm/activity extracts sender, recipient, and REPLY_TO from chalkboard dispatches (#212)."""
    swarm_dir = tmp_path / "swarm"
    swarm_dir.mkdir()
    monkeypatch.setenv("AIM_SWARM_DIR", str(swarm_dir))

    dispatch_file = swarm_dir / "DISPATCH_TEST_212.md"
    dispatch_file.write_text(
        "To: aim-connect\n"
        "From: aim-joshua\n"
        "REPLY_TO: aim-joshua\n"
        "INSTRUCTION: Please review your aim-communicate skill.\n\n"
        "[DISPATCH from aim-joshua] Execute #209-#212 sequentially.\n",
        encoding="utf-8",
    )

    resp = client.get("/api/swarm/activity", headers={"x-api-token": valid_token})
    assert resp.status_code == 200
    dispatches = resp.json()["dispatches"]
    matched = [d for d in dispatches if d["filename"] == "DISPATCH_TEST_212.md"]
    assert len(matched) == 1
    assert matched[0]["sender"] == "aim-joshua"
    assert matched[0]["recipient"] == "aim-connect"
    assert matched[0]["reply_to"] == "aim-joshua"
