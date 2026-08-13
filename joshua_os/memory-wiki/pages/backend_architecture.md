# Backend Module Architecture

> **Last updated:** 2026-08-10 (post-#174 split)

## Overview

The backend is a FastAPI application serving both the REST API and a WebSocket-based terminal bridge. Prior to #174, this was a single 2,517-line `main.py`. It is now split into 8 modules.

## Module Map

```
backend/
├── main.py               Orchestrator: app creation, middleware, config, token mgmt
├── routes_auth.py         POST /api/auth, POST /api/logout, GET /api/health
├── routes_sessions.py     Tmux session CRUD, E2EE settings, scrollback capture
├── routes_files.py        File explorer CRUD, macros
├── routes_agents.py       Agent data ingestion, integrations, Grok OAuth, history, download
├── routes_fleet.py        Fleet dashboard session list/kill (JWT-authenticated)
├── routes_webauthn.py     WebAuthn passkey register/authenticate
├── ws_handler.py          WebSocket /ws endpoint, PTY bridge, bwrap sandbox spawning
├── harness_transcript.py  Live egress extractors (AGY PLANNER_RESPONSE + Grok assistant)
├── webauthn_manager.py    WebAuthn credential storage and verification logic
└── e2ee.py                End-to-end encryption helpers (encrypt_bytes, decrypt_message)
```

## Shared State (lives in main.py)

| Symbol | Type | Purpose |
|--------|------|---------|
| `app` | FastAPI | The application instance |
| `VALID_API_TOKENS` | dict | In-memory token store, persisted to `tokens.json` |
| `save_tokens()` | function | Writes token dict to disk |
| `verify_token` | Depends | Header-based token validation |
| `require_admin` | Depends | Rejects non-admin users (403) |
| `_get_user_from_token` | function | Extracts (role, prefix) from token |
| `AIM_CONNECT_ROOT` | str | Project root (env-configurable) |
| `HOME_DIR` | str | `~` expanded |
| `AGENT_WORKSPACES_DIR` | str | `{root}/agent_workspaces` |
| `DEFAULT_WORKSPACE` | str | Workspace path for file explorer |
| `TOKEN_TTL` | int | Token lifetime in seconds (default 14400) |

## Auth Flow

1. **Login**: Client POSTs passphrase + password + TOTP to `/api/auth`
2. **Token issued**: `secrets.token_hex(32)` with 4h expiry, stored in `VALID_API_TOKENS`
3. **API calls**: Client sends token via `X-API-Token` header
4. **WebSocket**: Client sends `{type: "auth", token: "..."}` as first message within 10s
5. **Dashboard JWT**: LeadDeed dashboard uses HMAC-signed JWTs for fleet/download/history routes. Signing-secret SoT and Vercel sync: [cloudflare_tunnel_jwt_mismatch.md](cloudflare_tunnel_jwt_mismatch.md).

## Key Design Decisions

- **No JWT library**: Tokens are opaque random hex strings. The "JWT" for dashboard routes is a custom HMAC-SHA256 signed payload, not a standard JWT.
- **File-based persistence**: `tokens.json`, `webauthn.json`, `password.hash`, etc. No database dependency for auth state.
- **PTY bridge**: WebSocket handler uses `os.fork()` + `os.openpty()` to create a real pseudo-terminal, then `os.execvp("tmux", ...)` in the child process.

## Related Pages
- [Security Hardening](security_hardening.md) — Full freeze sprint details
- [J.O.S.H.U.A. Architecture](joshua_architecture.md) — Agent sandboxing model
