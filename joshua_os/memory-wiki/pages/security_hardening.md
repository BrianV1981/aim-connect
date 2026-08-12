# Security Hardening — Full Freeze Sprint

> **Epic:** #157 | **Date:** 2026-08-10 | **Tickets:** #158–#174

## Overview

A comprehensive security audit and hardening sprint covering credential rotation, IDOR protection, input sanitization, path portability, and architectural refactoring of the backend monolith. Sprint was executed in phases and finalized in v1.8.0.

## Credential Management (#158)

### Architecture
- All secrets live under `backend/` only: `totp.secret`, `password.hash`, `passphrase.hash`, `tokens.json`, `webauthn.json`
- Root-level duplicates were stale leftovers from early development — deleted
- `.env` holds runtime secrets: `NGROK_AUTHTOKEN`, `E2EE_SECRET`, `LEADDEED_DOWNLOAD_SIGNING_SECRET`
- `.gitignore` expanded to cover `agent_workspaces/`, `*.bak*`, debug scripts, and all secret files

### Rotation Protocol
1. Generate new password, passphrase, TOTP secret, E2EE secret, and signing secret
2. Write bcrypt hashes to `backend/*.hash` files (600 perms)
3. Write raw TOTP to `backend/totp.secret` (600 perms)
4. Update `.env` with new secrets
5. Purge `tokens.json` → `{}` (all old tokens used old signing secret)
6. NGROK_AUTHTOKEN must be rotated manually from dashboard.ngrok.com

### Git History
Secrets were committed in early history (commits `c83a064`, `e7302c3`). Currently untracked. Full scrub via `bfg` or `git filter-branch` is a future task.

## Token System (#160, #161)

- Tokens are opaque `secrets.token_hex(32)` strings stored in `backend/tokens.json`
- Format: `{token_hash: {"expires": float, "user": str, "role": str, "prefix": str}}`
- `TOKEN_TTL` = 14400s (4 hours), configurable via env
- **Startup prune**: On boot, expired tokens are filtered out and the file is re-saved
- **MAX_TOKENS** = 100; oldest evicted on overflow at login time
- Logout deletes the single token from the dict

## IDOR / Access Control (#162)

### `require_admin` Dependency
A FastAPI dependency that extracts role from the token and raises 403 if not admin. Applied to 14 routes:

| Category | Routes Protected |
|----------|-----------------|
| Settings | `POST /api/settings/e2ee` |
| Sessions | `POST /api/sessions`, `DELETE /api/sessions/{name}`, `GET /api/scrollback/{session_name}` |
| Files | `GET /api/files`, `GET/PUT/POST/DELETE /api/file` |
| Macros | `GET/POST /api/macros` |
| Agents | `POST /api/sync_csv/{agent_id}`, `GET/POST /api/integrations/{agent_id}` |

### Routes with JWT-based ownership checks (unchanged)
- `GET /download/{agent_id}` — validates email from HMAC-signed JWT matches agent_id
- `GET/DELETE /api/fleet/sessions/{agent_id}` — same JWT check
- `GET /history/{agent_id}` — same JWT check

## Input Sanitization (#165)

### shell=True Eliminated
`subprocess.Popen(daemon_cmd, shell=True)` replaced with list-form `subprocess.Popen([binary, arg1, arg2], cwd=workspace_dir)`.

### BYOK Injection Fixed
Gmail address and app password inputs are sanitized before writing to agent `.env` files:
```python
sanitized = value.replace('"', '').replace("'", '').replace('\n', '').replace('\r', '').replace('\\', '')
```
Prevents injection of `password"\nMALICIOUS=evil` into `.env` format.

## CORS Configuration (#164)

```python
_cors_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
allow_credentials = (_cors_origins != ["*"])
```
- Default: `*` (open, acceptable behind ngrok tunnel)
- Production: Set `CORS_ORIGINS=https://domain.com` for lock-down

## WebAuthn (#166)

`rp_id` extracted to `WEBAUTHN_RP_ID` env var (default: `leaddeeds.com`). All 4 call sites in the WebAuthn routes now use the variable. Allows deployment under different domains without code changes.

## Path Portability (#167)

Three constants defined at module top:
```python
AIM_CONNECT_ROOT = os.environ.get("AIM_CONNECT_ROOT", os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
HOME_DIR = os.path.expanduser("~")
AGENT_WORKSPACES_DIR = os.path.join(AIM_CONNECT_ROOT, "agent_workspaces")
```
50+ hardcoded `/home/kingb/aim-connect/` and `/home/kingb/` paths replaced. Zero hardcoded paths remaining.

## Path Integrity & Repository Hygiene (#169, #172)

- Bound all secrets (`totp.secret`, `password.hash`, etc.) strictly to `os.path.dirname(os.path.abspath(__file__))` in `backend/main.py` instead of the process `cwd`.
- Added `docs/credentials.md` to `.gitignore` to prevent secret dumps.

## File API 4xx Mapping (#170)

- Generic 200 JSON exception responses in `routes_files.py` were mapped to native FastAPI `JSONResponse` objects with appropriate HTTP status codes (404 for FileNotFoundError, 403 for Path Traversal / PermissionError).
- Maintained the exact `{"error": str(e)}` payload structure to ensure zero frontend breakages.

## CSP & SPA Risk Documentation (#173)

- Stripped `'unsafe-eval'` from the `Content-Security-Policy` header in `backend/main.py` to harden against XSS.
- Created `SECURITY.md` in the root repository to formally document the residual XSS risks of storing the `API Token` and `E2EE Secret` in a Single Page Application's `localStorage`.

## Docs Truth Pass & v1.8.0 (#171)

- Bumped `frontend/package.json` and `VERSION` to `v1.8.0`.
- Clarified `README.md` to explicitly describe how to achieve Multi-User functionality using `users.json` (3FA) vs. the Sovereign Agent Gateway (magic-link JWTs).
- Updated `.env.example` to point `AIM_WORKSPACE` to `workspace/` by default.

## Module Split (#174)

The 2,517-line `main.py` monolith was split into 8 modules using FastAPI `APIRouter`:

| Module | Lines | Responsibility |
|--------|-------|----------------|
| `main.py` | 352 | Orchestrator, config, middleware, token mgmt, static serving |
| `routes_auth.py` | 141 | Login, logout, health check |
| `routes_sessions.py` | 178 | Tmux sessions, e2ee settings, scrollback |
| `routes_files.py` | 114 | File CRUD, macros |
| `routes_agents.py` | 519 | Agent data sync, integrations, grok OAuth, history, download |
| `routes_fleet.py` | 112 | Fleet dashboard session management |
| `routes_webauthn.py` | 74 | WebAuthn register/authenticate |
| `ws_handler.py` | 1148 | WebSocket PTY bridge, agent session spawning |

### Import Pattern
Each route module imports shared state from `main`:
```python
from main import app, VALID_API_TOKENS, verify_token, require_admin, ...
router = APIRouter()
```
`main.py` includes all routers before mounting the static frontend catch-all.

## Related Pages
- [J.O.S.H.U.A. Architecture](joshua_architecture.md) — Agent sandboxing model
- [Sandbox Model](../../docs/SANDBOX_MODEL.md) — bwrap documentation (#168)
