# Project Wiki Index

This wiki serves as the persistent, compounding knowledge base for the A.I.M. architecture and its surrounding ecosystem.

## Core Concepts
- [J.O.S.H.U.A. Architecture](pages/joshua_architecture.md) - Sovereign Orchestration, Fleet Agent Sandboxing, and SQLite WAL management.
- [J.O.S.H.U.A. OS Directory Nesting Mandate](pages/joshua_os_nesting_mandate.md) - Clean repository pattern, directory nesting requirements, and .aim_core recovery.
- [Security Hardening](pages/security_hardening.md) - Full Freeze Sprint (#157–#174): credential rotation, IDOR guards, input sanitization, path portability, module split.

## Architecture
- [Backend Module Architecture](pages/backend_architecture.md) - Post-#174 module map, shared state, auth flow, and design decisions.
- **Sandbox Model**: bwrap documentation lives in `docs/SANDBOX_MODEL.md` (created in #168).

## Components
- **Backend**: FastAPI orchestrator split across 8 modules (`main.py` + 7 route/handler modules).
- **Frontend**: Vite SPA served from `frontend/dist/`.
- **OpenCode / Grok / Antigravity**: Headless CLI LLM interfaces running inside `bwrap` sandboxes.
- **WebAuthn**: Passkey authentication via `webauthn_manager.py`.
- **E2EE**: Optional end-to-end encryption for WebSocket traffic via `e2ee.py`.

## Configuration
- **Environment Variables**: Documented in `.env.example` — covers CORS, E2EE, JWT TTL, WebAuthn RP ID, theming.
- **Path Constants**: `AIM_CONNECT_ROOT`, `HOME_DIR`, `AGENT_WORKSPACES_DIR` — all configurable via env vars (#167).
- **Secret Files**: `backend/totp.secret`, `backend/password.hash`, `backend/passphrase.hash`, `backend/tokens.json`, `backend/webauthn.json` — all 600-permed, gitignored.

## Operations & Debugging
- [Vite Cache Issue](pages/frontend_vite_cache_issue.md) - Fix for stale assets serving on Safari/iOS.
- [Tmux Ghost Clients & Dashboard Bug](pages/tmux_ghost_clients_and_dash_switching.md) - Resolutions for orphaned background clients and dashboard window persistence.
- [Anti-Pattern Domain Hacks](pages/anti-pattern-domain-hacks.md) - System constraints against hardcoding domains/IPs.
- [Tmux Pkill Mandate](pages/tmux_pkill_mandate.md) - Specific rules for safely interacting with tmux via `pkill`.
- [Cloudflare Tunnel & JWT UI Masking](pages/cloudflare_tunnel_jwt_mismatch.md) - 530 vs 1008 vs lockout-403; option-1 signing-secret SoT (aim-connect `.env` → Vercel Production + redeploy). Never HMAC-bypass.
