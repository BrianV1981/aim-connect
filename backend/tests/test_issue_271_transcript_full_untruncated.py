import json
import time

import pytest
from fastapi.testclient import TestClient

import main
import routes_forensics


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def admin_token():
    tok = "test-admin-token-271"
    main.VALID_API_TOKENS[tok] = {
        "expires": time.time() + 1800,
        "user": "admin",
        "role": "admin",
        "prefix": "",
    }
    yield tok
    main.VALID_API_TOKENS.pop(tok, None)


def test_parse_jsonl_transcript_hydrates_truncated_content_from_transcript_full(tmp_path):
    """#271: When transcript.jsonl sets truncated_fields=['content'], hydrate full >4k body + 🔊 from transcript_full.jsonl."""
    logs_dir = tmp_path / "brain" / "cid-271" / ".system_generated" / "logs"
    logs_dir.mkdir(parents=True)
    compact_path = logs_dir / "transcript.jsonl"
    full_path = logs_dir / "transcript_full.jsonl"

    long_paragraph = (
        "Architectural walkthrough paragraph with detailed Sovereign Project Webpage notes. " * 75
    )  # ~6,225 chars (> 4,000)
    spoken_line = "🔊 Walking through our live repository scan, here is the complete untruncated spoken summary at the end."
    full_assistant_content = f"{long_paragraph}\n\n{spoken_line}"
    assert len(full_assistant_content) > 5500

    # Simulate AGY's compact transcript.jsonl mid-content truncation + truncated_fields marker
    compact_snip = full_assistant_content[:1800] + "\n...[truncated]...\n" + full_assistant_content[-1200:]

    user_step = {
        "step_index": 0,
        "type": "USER_INPUT",
        "created_at": "2026-11-22T22:10:00Z",
        "content": "<USER_REQUEST>\nLets start discussing 262.\n</USER_REQUEST>",
    }
    compact_model_step = {
        "step_index": 1,
        "type": "PLANNER_RESPONSE",
        "created_at": "2026-11-22T22:10:15Z",
        "content": compact_snip,
        "thinking": "short thought",
        "truncated_fields": ["content", "thinking"],
    }
    full_model_step = {
        "step_index": 1,
        "type": "PLANNER_RESPONSE",
        "created_at": "2026-11-22T22:10:15Z",
        "content": full_assistant_content,
        "thinking": "complete untruncated reasoning chain",
    }

    compact_path.write_text(
        json.dumps(user_step) + "\n" + json.dumps(compact_model_step) + "\n",
        encoding="utf-8",
    )
    full_path.write_text(
        json.dumps(user_step) + "\n" + json.dumps(full_model_step) + "\n",
        encoding="utf-8",
    )

    turns = routes_forensics.parse_jsonl_transcript(str(compact_path), max_turns=20)
    assert len(turns) == 2
    assistant_turn = turns[1]
    assert assistant_turn["role"] == "assistant"
    assert len(assistant_turn["content"]) == len(full_assistant_content)
    assert "...[truncated]..." not in assistant_turn["content"]
    assert assistant_turn["content"].endswith(spoken_line)


def test_live_turns_and_history_turns_preserve_long_replies_and_spoken_summary(
    client, admin_token, tmp_path, monkeypatch
):
    """#271: GET /api/sessions/{name}/live-turns & /api/sessions/history/{id}/turns do not chop >4k replies mid-word."""
    logs_dir = tmp_path / "brain" / "cid-live-271" / ".system_generated" / "logs"
    logs_dir.mkdir(parents=True)
    compact_path = logs_dir / "transcript.jsonl"
    full_path = logs_dir / "transcript_full.jsonl"

    body_text = ("1. Detailed architectural point explaining why Files already has the Brain links. " * 65).strip()
    spoken_text = "Complete spoken summary preserved after five thousand characters without mid-word cutoff."
    full_reply = f"{body_text}\n\n🔊 {spoken_text}"
    assert len(full_reply) > 5200

    steps_compact = [
        {
            "step_index": 0,
            "type": "USER_INPUT",
            "created_at": "2026-11-22T22:20:00Z",
            "content": "<USER_REQUEST>Explain #262 options</USER_REQUEST>",
        },
        {
            "step_index": 1,
            "type": "PLANNER_RESPONSE",
            "created_at": "2026-11-22T22:20:10Z",
            "content": full_reply[:3900],
            "truncated_fields": ["content"],
        },
    ]
    steps_full = [
        steps_compact[0],
        {
            "step_index": 1,
            "type": "PLANNER_RESPONSE",
            "created_at": "2026-11-22T22:20:10Z",
            "content": full_reply,
        },
    ]
    compact_path.write_text("\n".join(json.dumps(s) for s in steps_compact) + "\n", encoding="utf-8")
    full_path.write_text("\n".join(json.dumps(s) for s in steps_full) + "\n", encoding="utf-8")

    fake_records = [
        {
            "id": "rec-271",
            "session": "aim-connect",
            "vessel": "AGY",
            "log_path": str(compact_path),
            "mtime": time.time(),
            "title": "Issue 271 Test",
            "summary": "Test",
        }
    ]
    monkeypatch.setattr(routes_forensics, "_collect_project_history_records", lambda: fake_records)

    live_resp = client.get(
        "/api/sessions/aim-connect/live-turns?limit=10",
        headers={"x-api-token": admin_token},
    )
    assert live_resp.status_code == 200
    live_turns = live_resp.json()["turns"]
    assert len(live_turns) == 1
    assert live_turns[0]["body"] == body_text
    assert live_turns[0]["spoken"] == spoken_text

    hist_resp = client.get(
        "/api/sessions/history/rec-271/turns",
        headers={"x-api-token": admin_token},
    )
    assert hist_resp.status_code == 200
    hist_turns = hist_resp.json()["turns"]
    assert len(hist_turns) == 1
    assert hist_turns[0]["agent"] == full_reply
