# A.I.M. Connect — Agent Architecture & Handoff Guide

> **MANDATE:** If you are a new AI agent assigned to this repository, read this document carefully before making any code changes. This project relies on a deeply integrated, stateful architecture bridging a Python FastAPI backend, a React/Vite frontend, and raw system `tmux` and `pty` processes.

> **Last Updated:** 2026-08-10 (post-security-hardening sprint #157–#174)

---

## 1. Core Architecture

AIM-Connect is a **Sovereign Web Terminal + Multi-Tenant AI Agent Platform**. It uses WebSockets to pipe raw byte streams from system pseudo-terminals (PTYs) directly into an `xterm.js` canvas in a React web app. Each customer (operator) gets their own sandboxed AI agent workspace running inside `bwrap` (Bubblewrap) filesystem isolation.

*   **Backend (`/backend`):** A Python FastAPI server split across 8 modules, running via `uvicorn`. Handles multi-factor authentication, WebSocket binary streams, PTY bridging, tmux session management, and bwrap sandboxing.
*   **Frontend (`/frontend`):** A React app built with Vite. Uses `xterm.js` with custom DOM manipulation (Visual Viewport listeners) for mobile keyboard compatibility.

---

## 2. Backend Module Structure

The backend was split from a monolithic `main.py` into logical modules using FastAPI `APIRouter`:

```
backend/
├── main.py               Orchestrator: app setup, middleware, config, token management
├── routes_auth.py         POST /api/auth, POST /api/logout, GET /api/health
├── routes_sessions.py     Tmux session CRUD, E2EE settings, scrollback capture
├── routes_files.py        File explorer CRUD, macros
├── routes_agents.py       Agent data ingestion, integrations, Grok OAuth, history, download
├── routes_fleet.py        Fleet dashboard session list/kill (JWT-authenticated)
├── routes_webauthn.py     WebAuthn passkey register/authenticate
├── ws_handler.py          WebSocket /ws endpoint, PTY bridge, bwrap sandbox spawning
├── webauthn_manager.py    WebAuthn credential storage and verification logic
└── e2ee.py                End-to-end encryption helpers
```

### Shared State (lives in `main.py`, imported by modules)

| Symbol | Purpose |
|--------|---------|
| `app` | The FastAPI application instance |
| `VALID_API_TOKENS` | In-memory token dict, persisted to `tokens.json` |
| `verify_token` | FastAPI `Depends()` — validates `X-API-Token` header |
| `require_admin` | FastAPI `Depends()` — rejects non-admin users (403) |
| `AIM_CONNECT_ROOT` | Project root, configurable via env var |
| `HOME_DIR` | `os.path.expanduser("~")` |
| `AGENT_WORKSPACES_DIR` | `{AIM_CONNECT_ROOT}/agent_workspaces` |

### Path Portability

All paths are built from three constants. **There are zero hardcoded `/home/<user>` paths in the codebase.** Override via environment:

```bash
export AIM_CONNECT_ROOT="/opt/aim-connect"  # defaults to parent of backend/
```

---

## 3. Authentication Model (4-Layer)

A.I.M. Connect implements up to 4 authentication factors, layered for defense-in-depth:

### Layer 1: Passphrase (the "Name" field)
The login screen's "Name" field is actually a **stealth passphrase**. It's bcrypt-hashed and stored in `backend/passphrase.hash`. This deters casual probing — most attackers won't even know it's a security field.

### Layer 2: Password
A standard password, bcrypt-hashed and stored in `backend/password.hash`.

### Layer 3: TOTP (Time-Based One-Time Password)
A 6-digit Google Authenticator / Authy code. The TOTP secret is in `backend/totp.secret`. A QR code is printed to the server console on first run for enrollment. Replay protection prevents reuse of the same code within its time window.

### Layer 4: WebAuthn / Biometric (Optional)
**FaceID, TouchID, Windows Hello, or hardware security keys** via the WebAuthn / FIDO2 standard. Once registered, operators can authenticate with a single biometric scan instead of entering TOTP codes. Credentials are stored in `backend/webauthn.json`.

Configuration:
```bash
WEBAUTHN_RP_ID="leaddeeds.com"  # Must match your domain
```

### Token Lifecycle
1. Client POSTs all auth factors to `POST /api/auth`
2. Server issues an opaque `secrets.token_hex(32)` token with a 4-hour TTL
3. Client sends the token via `X-API-Token` header on all API calls
4. WebSocket auth: client sends `{"type": "auth", "token": "..."}` within 10 seconds
5. `POST /api/logout` deletes the token
6. Expired tokens are pruned on server startup

### Route Protection
- **All admin routes** (files, sessions, macros, scrollback, agent settings, integrations) require `verify_token` + `require_admin`
- **Fleet/dashboard routes** (history, download, fleet sessions) use HMAC-signed JWTs from the LeadDeed dashboard
- **WebAuthn register** requires `verify_token`; WebAuthn authenticate is open (it IS the auth)

---

## 4. Infrastructure & Process Management

This application runs persistently using `tmux` sessions. **Do not use standard backgrounding (`&`) to run core services.**

### Primary Sessions

1.  **`aim-backend`:** Runs the Python FastAPI server.
    *   *Command:* `cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000`
2.  **`aim-frontend`:** Runs the Vite dev server.
    *   *Command:* `cd frontend && npm run dev -- --host`
3.  **`aim-ngrok` / `cloudflared`:** Secure tunnel to the internet.

### How to Restart

```bash
tmux kill-session -t aim-backend
tmux new-session -d -s aim-backend \
  "cd $AIM_CONNECT_ROOT/backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000"
```

---

## 5. Agent Sandboxing (bwrap)

Each customer's AI agent session runs inside a **Bubblewrap (`bwrap`)** sandbox with filesystem isolation:

- **Root FS**: Read-only bind of host `/`
- **Home dir**: Masked with tmpfs (agent cannot see host home files)
- **CLI tools**: Read-only mounts of `.local/bin`, `.gemini/`, `.grok/bin`, `.opencode/`
- **Workspace**: Read-write bind of the agent's specific workspace directory
- **Shared DB**: Read-write bind to `shared_database/` for SQLite access

See [SANDBOX_MODEL.md](./SANDBOX_MODEL.md) for the full technical spec with example `bwrap` commands.

---

## 6. High-Risk Components & Nuances

### The WebSocket PTY Bridge (`ws_handler.py`)
*   Lives in `ws_handler.py` (~1,148 lines) — the largest module.
*   Transports **raw array buffers**. Do not stringify the terminal data stream or you will corrupt ANSI escape codes.
*   Uses `os.fork()` + `os.openpty()` to create real pseudo-terminals, then `os.execvp("tmux", ...)` in the child process.
*   If the user deletes a session from the UI, the PTY process will crash the WebSocket. **The frontend handles this** by sending a `switch_session` command *before* the `DELETE` API call. Do not alter this execution order.

### The Mobile Keyboard (`Keyboard.jsx`)
*   Native mobile OS keyboards use predictive text buffers that ghost characters in `xterm.js`.
*   **The Fix:** A Sovereign HTML Keyboard that injects bytes directly into the WebSocket, bypassing native DOM inputs.
*   **Do not remove the `disableStdin` dynamic toggle** in `App.jsx` — it prevents the native keyboard from appearing while the custom keyboard is open.

### End-to-End Encryption (`e2ee.py`)
*   Optional AES encryption for WebSocket traffic, controlled by `ENABLE_E2EE=true` in `.env`.
*   Uses `E2EE_SECRET` from `.env` for key derivation.

---

## 7. Secret Files & Security

All secret files live under `backend/` with `600` permissions and are `.gitignore`d:

| File | Content | Rotation |
|------|---------|----------|
| `totp.secret` | TOTP base32 secret | Delete file → regenerated on next boot |
| `password.hash` | bcrypt password hash | `add_user.py` or manual bcrypt |
| `passphrase.hash` | bcrypt passphrase hash | Same |
| `tokens.json` | Active session tokens | Auto-pruned on boot; purge = write `{}` |
| `webauthn.json` | WebAuthn credential store | Delete to reset passkey registrations |
| `.env` (root) | NGROK, E2EE, signing secrets | Manual edit |

**CI Guard:** `.github/workflows/secret-guard.yml` fails the build if any secret file appears in the git tree.

---

## 8. Environment Variables

All configurable via `.env` (see `.env.example` for full list):

| Variable | Default | Purpose |
|----------|---------|---------|
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `TOKEN_TTL` | `14400` (4h) | Token lifetime in seconds |
| `WEBAUTHN_RP_ID` | `leaddeeds.com` | WebAuthn relying party domain |
| `AIM_CONNECT_ROOT` | Auto-detected | Project root directory |
| `ENABLE_E2EE` | `false` | Enable WebSocket encryption |
| `E2EE_SECRET` | — | AES key derivation secret |
| `NGROK_AUTHTOKEN` | — | Ngrok tunnel auth |
| `LEADDEED_DOWNLOAD_SIGNING_SECRET` | — | HMAC signing for dashboard JWTs |

---

## 9. Related Documentation

- [Sandbox Model](./SANDBOX_MODEL.md) — bwrap isolation details
- [Multi-Server Architecture](./MULTI_SERVER_ARCHITECTURE.md) — Hub & Spoke design
- [Startup Guide (Ngrok)](./STARTUP_GUIDE_NGROK.md) — Manual server startup
- [Startup Guide (Cloudflare)](./STARTUP_GUIDE_CLOUDFLARE.md) — Alternative tunnel
- [Wiring New Clients](./WIRING_NEW_CLIENTS_SOP.md) — Operator onboarding SOP
