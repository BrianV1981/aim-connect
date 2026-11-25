"""TDD tests for subscriber-isolated JOSHUA Analyst ticket tools (#501 / #558 Phase 4)."""
from __future__ import annotations

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import main
import routes_joshua_analyst as rja


def test_joshua_ticket_tools_isolate_seat_and_scrub_internal_fields(tmp_path):
    ws = tmp_path / "agent-op_alice"
    (ws / "shared_database").mkdir(parents=True, exist_ok=True)

    rate_resp = MagicMock()
    rate_resp.json.return_value = []
    rate_resp.raise_for_status = MagicMock()

    post_resp = MagicMock()
    post_resp.json.return_value = [
        {
            "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "ticket_number": 7,
            "submitter_email": "alice@example.com",
            "operator_id": "op_alice",
            "category": "question",
            "module_context": "general",
            "source": "joshua_analyst",
            "title": "Check territory ZIPs",
            "description": "See https://github.com/private/repo/issues/1",
            "status": "OPEN",
            "email_subscribed": False,
            "github_issue_number": 555,
            "sync_status": "PENDING_CREATE",
        }
    ]
    post_resp.raise_for_status = MagicMock()

    async def _run():
        with patch("tickets_bridge._rest_request", new_callable=AsyncMock) as m_rest:
            m_rest.side_effect = [rate_resp, post_resp]
            raw_out, meta = await rja.dispatch_joshua_tool(
                "create_ticket",
                {
                    "category": "question",
                    "title": "Check territory ZIPs",
                    "description": "See https://github.com/private/repo/issues/1",
                },
                ws_dir=ws,
                operator_id="op_alice",
                seat_email="alice@example.com",
                raw_token="tok",
            )
            data = json.loads(raw_out)
            assert data["ok"] is True
            assert data["ticket"]["ticket_number"] == 7
            assert "github_issue_number" not in data["ticket"]
            assert "sync_status" not in data["ticket"]
            assert "github.com" not in data["ticket"]["description"]
            assert "ticket #7" in meta["summary"].lower()

            list_resp = MagicMock()
            list_resp.json.return_value = []
            list_resp.raise_for_status = MagicMock()
            m_rest.side_effect = [list_resp]
            await rja.dispatch_joshua_tool(
                "list_tickets",
                {"status": "OPEN"},
                ws_dir=ws,
                operator_id="op_alice",
                seat_email="alice@example.com",
                raw_token="tok",
            )
            assert m_rest.call_args.kwargs["params"]["submitter_email"] == "ilike.alice@example.com"

    asyncio.run(_run())
