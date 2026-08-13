# Harness Live Egress vs History

> **Last updated:** 2026-08-13 (#183)

`/analyst` has **two** readers of harness output. They are not the same code path.

| Path | Module | What it reads | Symptom if wrong |
|------|--------|---------------|------------------|
| **History** | `routes_agents.py` `/history/...` | Grok: newest `grok_data/sessions/**/chat_history.jsonl`. AGY: `brain/**/transcript.jsonl`. OpenCode: `opencode.db?mode=ro` | Empty or stale History page |
| **Live UI** | `ws_handler.egress_task` + `watchfiles.awatch` | Must watch the **same files** and push E2EE bytes as new lines land | Spinner **awaiting transmission** while History already has the answer |

#183: Grok History worked; live UI hung. `egress_task` only watched AGY `transcript.jsonl` for `source=MODEL` + `type=PLANNER_RESPONSE`. Grok never writes that file.

## Per-harness live files

| Harness | Watch root | File | Visible line |
|---------|------------|------|--------------|
| **AGY / admin-cli** | `brain/` | `*/.system_generated/logs/transcript.jsonl` | `PLANNER_RESPONSE` with text |
| **Grok** | `grok_data/sessions/` | `*/*/chat_history.jsonl` | `type=assistant` (or `role=model`) with non-empty text |
| **OpenCode** | (history uses SQLite WAL `mode=ro`; live still via AGY-style or PTY depending on spawn) | `opencode.db` | see [joshua_architecture.md](joshua_architecture.md) §3 |

Extractor: `backend/harness_transcript.py` (`extract_live_agent_text`). Skip system / user / reasoning / empty / tool-only assistant rows. Keep `user_query` / `system-reminder` tags out of the payload.

## Two-chat burst (AGY and Grok)

Both CLIs often emit **two assistant turns with no user in between**:

1. Short preview: “I’ll check on that…” (often + `tool_calls`)
2. Pause / more tools (empty content — **do not** send)
3. Real answer (no tools)

**Rule:** keep watching. Deliver **every** visible assistant text, the way AGY already streams each `PLANNER_RESPONSE`. Do not treat the first `type=assistant` as “done.”

Empirical 2026-08-13 (`agent-brianv1981_gmail_com-grok` `chat_history.jsonl`): preview + tools → empty + tools → full reply. History had all three; live egress saw none until #183.

## After a code fix

Restart **uvicorn only** (`aim-connect-workspace:servers.0`). Leave `cloudflared` and the harness tmux session up. Hard-refresh `/analyst` so a new `egress_task` attaches to the watch roots.

See also: [joshua_architecture.md](joshua_architecture.md) · [backend_architecture.md](backend_architecture.md) · [cloudflare_tunnel_jwt_mismatch.md](cloudflare_tunnel_jwt_mismatch.md)
