# Memory Log

Chronological record of knowledge ingestion and architectural decisions.

## [2026-07-31] ingest | JOSHUA Fleet Agent Stability & SQLite WAL Sandboxing
- Bootstrapped `memory-wiki/`.
- Created `pages/joshua_architecture.md`.
- Documented the fix for Fleet Agent 404 History Errors by updating the backend SQLite path routing.
- Documented the `--auto` flag injection to OpenCode to prevent interactive permission modals from hanging headless sandboxed sessions.
- Documented the critical `mode=ro` (Read-Only) and WAL integration for safely parsing SQLite databases across process boundaries without file locks destroying the live connection.

## [2026-08-10] ingest | Full Freeze Security Hardening Sprint (#157–#174)
- Created `pages/security_hardening.md` — comprehensive record of all 17 tickets executed.
- Created `pages/backend_architecture.md` — post-split module map, shared state, auth flow.
- Updated `index.md` — added new pages, expanded Architecture/Components/Configuration sections.
- **Key decisions recorded:**
  - Credential rotation protocol (bcrypt hashes, TOTP base32, HMAC signing secrets)
  - `require_admin` dependency applied to 14 routes for IDOR protection
  - `shell=True` eliminated; BYOK gmail inputs sanitized against .env injection
  - CORS, WebAuthn rp_id, TOKEN_TTL all made env-configurable
  - 50+ hardcoded `/home/kingb` paths → `AIM_CONNECT_ROOT`/`HOME_DIR`/`AGENT_WORKSPACES_DIR`
  - 2,517-line monolith split into 8 FastAPI modules (352-line orchestrator + 7 route/handler modules)
  - bwrap sandbox model documented in `docs/SANDBOX_MODEL.md`

## [2026-08-11] ingest | Operational & UI Bug Fixes
- Migrated incorrectly placed `_ingest/` documents into `pages/` following the correct Wiki workflow.
- Documented Vite frontend caching bug (stale asset serving on Safari/iOS) and the FastAPI `no-store` fix.
- Documented tmux ghost clients bug (orphaned `tmux attach-session` background processes on WebSocket disconnect).
- Documented `aim-dash` (dashboard.py) switching bug masking successful client swaps.
- Documented system constraints against modifying system domains/IPs directly in code, and the pkill rule for tmux.

## [2026-08-12] ingest | Migration to joshua_os and Directory Nesting Mandate
- Created `pages/joshua_os_nesting_mandate.md` to document the OS migration and the strict directory nesting rule.
- Documented the cleanup of the repository root by moving `workspace/`, `scratch/`, `archive/`, `planning-artifacts/`, and `memory-wiki/` into the `joshua_os/` directory.
- Documented the pitfall where `.aim_core/` and `venv/` are excluded by `.gitignore` and must be manually restored/rebuilt after migrating or cloning `joshua_os/`.
- Updated `index.md` to include the new J.O.S.H.U.A. OS Directory Nesting Mandate page.

## [2026-08-12] ingest | Phase 4 Security Hardening & CLI Bug Fixes
- Updated `pages/security_hardening.md` to include the completion of the Phase 4 Audit issues (#169, #170, #171, #172, #173).
- Documented GitOps workarounds for the brittle `aim promote` script which was incorrectly resolving `repo_root` inside worktrees and blindly assuming the default branch was `main` instead of `master`. Fixed the `repo_root` logic in `aim_cli.py`.
- Finalized version bump to `v1.8.0` for the system.

## [2026-08-12] ingest | Cloudflare Tunnel & JWT Masking Resolution
- Created `pages/cloudflare_tunnel_jwt_mismatch.md` to document the opaque "Connection closed by remote node" UI bug in `AgentTerminal.tsx`.
- Documented the diagnostic workflow for identifying Cloudflare 530 Argo Tunnel Errors vs HTTP 1008 JWT Invalid Signature errors.
- Documented that killing the backend tmux sessions without verifying the `cloudflared` tunnel will sever the Vercel production frontend WebSocket (`wss://api.leaddeeds.com/ws`).

## [2026-08-13] ingest | Analyst JWT signing-secret SoT (option 1)
- Updated `pages/cloudflare_tunnel_jwt_mismatch.md` after a live `/analyst` restore: HMAC was re-enabled (pass 9/10), origin was up, tokens 401'd because Vercel was minting with a ghost secret.
- **Durable rule:** aim-connect `.env` `LEADDEED_DOWNLOAD_SIGNING_SECRET` is SoT. Copy it to Vercel Production and **redeploy** `leaddeed-dashboard`. Hard-refresh `/analyst`. Bounce uvicorn only (clear 5/300 lockout). Never comment out HMAC. Never chase a third secret.
- Documented traps: `vercel env pull` writes `[SENSITIVE]` for Sensitive vars (not the real secret); `NEXT_PUBLIC_AIM_CONNECT_WS` / `NEXT_PUBLIC_API_URL` must be real URLs before a production rebuild.
- Empirical close: fleet 200 + `/ws` open + E2EE traffic on 2026-08-13 after option 1.

## [2026-08-13] ingest | Grok live egress vs History (#183)
- Created `pages/harness_live_egress.md`. History already parsed `grok_data/sessions/**/chat_history.jsonl`; live `egress_task` only watched AGY `transcript.jsonl` → UI **awaiting transmission** while History was complete.
- Grok (like AGY) emits a two-chat burst: “I’ll check…” + tools, then the real answer. Keep watching; send every visible assistant text; skip empty tool-only turns.
- Extractor: `backend/harness_transcript.py`. After a scrape fix: bounce uvicorn only; hard-refresh `/analyst`.
- Linked from `index.md`, `joshua_architecture.md` §4, `backend_architecture.md` module map.

## [2026-08-13] ingest | OpenCode live egress (#185)
- Same spinner as Grok: History reads `opencode.db` assistant `part.type=text`; live egress did not poll SQLite.
- Two-turn: tools (`step-finish`/`tool-calls`) then text + `reason=stop`. Stream every new text part after a `MAX(time_created)` cursor. WAL `mode=ro` only.
- Updated `harness_live_egress.md`.

## [2026-08-13] ingest | Sandbox SMTP inject (#186)
- Customer agents asked for SMTP because bwrap never received `LEADDEED_SMTP_*`. Host aim-connect `.env` now holds the LeadDeed mailer; all harnesses `--setenv` those keys. `/tmp/bwrap_cmd.log` is redacted. Reconnect required.
