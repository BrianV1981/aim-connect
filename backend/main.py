import glob
import subprocess
import sys

import pty
import os
from dotenv import load_dotenv

# Force load .env from the parent directory so we don't rely on tmux inheritance
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))


# --- Portable path constants (#167) ---
AIM_CONNECT_ROOT = os.environ.get(
    "AIM_CONNECT_ROOT",
    os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)
HOME_DIR = os.path.expanduser("~")
AGENT_WORKSPACES_DIR = os.path.join(AIM_CONNECT_ROOT, "agent_workspaces")
import fcntl
import termios
import struct
import json
import asyncio
import pyotp
import qrcode
import secrets
import shutil
import bcrypt
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Header, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import sqlite3
import csv
from io import StringIO
import logging
import time
import re
import hmac
from e2ee import encrypt_bytes, decrypt_message

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aim-connect")



app = FastAPI()

ALLOWED_IPS = os.environ.get("ALLOWED_IPS", "")
ALLOW_HTTP = os.getenv("ALLOW_HTTP", "false").lower() == "true"
ENABLE_E2EE = os.getenv("ENABLE_E2EE", "false").lower() == "true"
E2EE_SECRET = os.getenv("E2EE_SECRET", "")
WEBAUTHN_RP_ID = os.environ.get("WEBAUTHN_RP_ID", "").strip()
auth_attempts = {}
MAX_AUTH_ATTEMPTS = 5
LOCKOUT_TIME = 300 # 5 minutes
SESSION_NAME_RE = re.compile(r'^[a-zA-Z0-9_-]{1,64}$')
_last_used_totp = None  # TOTP replay protection

_cors_origins_raw = os.environ.get("CORS_ORIGINS", "*").strip()
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=(_cors_origins != ["*"]),
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HTTPS Enforcement Middleware ---
@app.middleware("http")
async def enforce_https(request: Request, call_next):
    """Reject plaintext HTTP unless running on localhost or ALLOW_HTTP is set."""
    if ALLOW_HTTP:
        return await call_next(request)

    # Always allow localhost and test clients (dev mode)
    client_host = request.client.host if request.client else ""
    if client_host in ("127.0.0.1", "::1", "localhost", "testclient"):
        return await call_next(request)

    # Always allow /api/health (Docker HEALTHCHECK runs over HTTP internally)
    if request.url.path == "/api/health":
        return await call_next(request)

    # Check X-Forwarded-Proto header (set by ngrok, cloudflare, nginx)
    proto = request.headers.get("x-forwarded-proto", "http")
    if proto != "https":
        logger.warning("HTTPS enforcement: rejected %s request from %s to %s", proto, client_host, request.url.path)
        return JSONResponse(
            status_code=403,
            content={"detail": "HTTPS required. Do not expose this service over plain HTTP."}
        )

    return await call_next(request)

# --- Security Headers Middleware ---
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add Content-Security-Policy and other security headers to all responses."""
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.jsdelivr.net blob:; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "connect-src 'self' wss: ws:; "
        "img-src 'self' data: blob:; "
        "media-src 'self' blob: data:; "
        "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com data:; "
        "worker-src 'self' blob:; "
        "object-src 'none'; "
        "base-uri 'self'"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


DEFAULT_WORKSPACE = os.environ.get("AIM_WORKSPACE", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "workspace")))
os.makedirs(DEFAULT_WORKSPACE, exist_ok=True)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
AUTH_STATE_DIR = os.path.abspath(os.environ.get("AIM_AUTH_DIR", "").strip() or BACKEND_DIR)
if AUTH_STATE_DIR != BACKEND_DIR:
    os.makedirs(AUTH_STATE_DIR, mode=0o700, exist_ok=True)

SECRET_FILE = os.path.join(AUTH_STATE_DIR, "totp.secret")

def _should_print_first_run_creds() -> bool:
    """Print generated secrets only on an Operator TTY (./startup.sh first launch).

    CI, pytest, and non-TTY pipes must stay quiet (#181). File generation is unchanged.
    """
    ci = os.environ.get("CI", "").strip().lower()
    if ci in ("1", "true", "yes"):
        return False
    if os.environ.get("AIM_CONNECT_TEST", "").strip():
        return False
    try:
        return bool(sys.stdout.isatty())
    except Exception:
        return False

def get_or_create_totp():
    if os.path.exists(SECRET_FILE):
        with open(SECRET_FILE, "r") as f:
            secret = f.read().strip()
    else:
        secret = pyotp.random_base32()
        with open(SECRET_FILE, "w") as f:
            f.write(secret)
        os.chmod(SECRET_FILE, 0o600)
        
        # Print QR Code to console for setup (Operator TTY only)
        if _should_print_first_run_creds():
            print("\n\033[92m=== aim-connect TOTP SETUP ===\033[0m")
            print("Scan this QR code with Google Authenticator or Authy:\n")
            uri = pyotp.totp.TOTP(secret).provisioning_uri(name="aim-connect", issuer_name="aim-connect")
            qr = qrcode.QRCode(version=1, box_size=2, border=1)
            qr.add_data(uri)
            qr.make(fit=True)
            # Use invert=True for dark terminals
            qr.print_ascii(invert=True)
            print("\nIf you can't scan the QR code, manually enter this secret: \033[93m" + secret + "\033[0m\n")
    
    return pyotp.TOTP(secret)

# Initialize TOTP on startup
totp_instance = get_or_create_totp()

PASSWORD_FILE = os.path.join(AUTH_STATE_DIR, "password.hash")

def get_or_create_password():
    if os.path.exists(PASSWORD_FILE):
        with open(PASSWORD_FILE, "r") as f:
            return f.read().strip()
    else:
        # Generate a secure random password (approx 12 chars)
        raw_password = secrets.token_urlsafe(9)
        hashed_password = bcrypt.hashpw(raw_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        with open(PASSWORD_FILE, "w") as f:
            f.write(hashed_password)
        os.chmod(PASSWORD_FILE, 0o600)
        
        if _should_print_first_run_creds():
            print("\n\033[91m=== aim-connect PASSWORD SETUP ===\033[0m")
            print("A new secure admin password has been generated for you.")
            print(f"Password: \033[93m{raw_password}\033[0m")
            print("Please save this password in your password manager immediately.\n")
        return hashed_password

# Initialize Password hash on startup
admin_password_hash = get_or_create_password()

# --- Passphrase (Stealth "Name" field — third auth factor) ---
PASSPHRASE_FILE = os.path.join(AUTH_STATE_DIR, "passphrase.hash")

def get_or_create_passphrase():
    if os.path.exists(PASSPHRASE_FILE):
        with open(PASSPHRASE_FILE, "r") as f:
            return f.read().strip()
    else:
        raw_passphrase = secrets.token_urlsafe(16)
        hashed_passphrase = bcrypt.hashpw(raw_passphrase.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        with open(PASSPHRASE_FILE, "w") as f:
            f.write(hashed_passphrase)
        os.chmod(PASSPHRASE_FILE, 0o600)
        
        if _should_print_first_run_creds():
            print("\n\033[95m=== aim-connect PASSPHRASE SETUP ===\033[0m")
            print("A stealth passphrase has been generated (the 'Name' field on login).")
            print(f"Passphrase: \033[93m{raw_passphrase}\033[0m")
            print("This is your third auth factor. Save it in your password manager.\n")
        return hashed_passphrase

# Initialize Passphrase hash on startup
admin_passphrase_hash = get_or_create_passphrase()

# --- Host-Only Loopback Telemetry Token (#236) ---
LOOPBACK_TOKEN_FILE = os.path.join(AUTH_STATE_DIR, "loopback.token")

def get_or_create_loopback_token() -> str:
    """Return host-only loopback token (masked from bwrap sandboxes via --tmpfs HOME_DIR)."""
    env_tok = os.environ.get("AIM_LOOPBACK_TOKEN", "").strip()
    if env_tok:
        return env_tok
    if os.path.exists(LOOPBACK_TOKEN_FILE):
        with open(LOOPBACK_TOKEN_FILE, "r", encoding="utf-8") as f:
            tok = f.read().strip()
        if tok:
            return tok
    tok = secrets.token_hex(32)
    with open(LOOPBACK_TOKEN_FILE, "w", encoding="utf-8") as f:
        f.write(tok)
    os.chmod(LOOPBACK_TOKEN_FILE, 0o600)
    return tok

loopback_token = get_or_create_loopback_token()

# --- Multi-User Support (optional users.json) ---
USERS_FILE = os.path.join(AUTH_STATE_DIR, "users.json")

def load_users():
    """Load multi-user config. Returns dict of users or None for single-user mode."""
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                users = json.load(f)
            logger.info("Multi-user mode: loaded %d users from %s", len(users), USERS_FILE)
            return users
        except Exception as e:
            logger.error("Failed to load %s: %s — falling back to single-user", USERS_FILE, e)
    return None

users_db = load_users()

TOKEN_FILE = os.path.join(AUTH_STATE_DIR, "tokens.json")
VALID_API_TOKENS = {}  # token -> {"expires": float, "user": str, "role": str, "prefix": str}
if os.path.exists(TOKEN_FILE):
    try:
        with open(TOKEN_FILE, 'r') as f:
            raw_tokens = json.load(f)
        # Prune expired tokens on startup
        now = time.time()
        for k, v in raw_tokens.items():
            exp = v if isinstance(v, (int, float)) else v.get("expires", 0)
            if exp > now:
                VALID_API_TOKENS[k] = v
        if len(VALID_API_TOKENS) < len(raw_tokens):
            logger.info("Pruned %d expired tokens on startup", len(raw_tokens) - len(VALID_API_TOKENS))
            with open(TOKEN_FILE, 'w') as f:
                json.dump(VALID_API_TOKENS, f)
    except Exception:
        pass

TOKEN_TTL = int(os.environ.get('TOKEN_TTL', 14400))  # 4 hours sliding active-user timeout (#247)
TOKEN_SAVE_INTERVAL_S = 60.0
_LAST_TOKEN_DISK_SYNC: dict[str, float] = {}

# Background polling and teardown routes validate tokens without sliding expiry (#247, #260)
PASSIVE_TOKEN_ENDPOINTS = frozenset({
    ("GET", "/api/sessions"),
    ("GET", "/api/fleet/panes"),
    ("GET", "/api/swarm/activity"),
    ("GET", "/api/browser/status"),
    ("POST", "/api/tts"),
    ("POST", "/api/logout"),
})


def _is_passive_token_request(method: str, path: str) -> bool:
    m = (method or "").upper()
    p = path or ""
    if (m, p) in PASSIVE_TOKEN_ENDPOINTS:
        return True
    if m == "GET" and p.startswith("/api/sessions/") and p.endswith("/live-turns"):
        return True
    if m == "GET" and p.startswith("/api/tmux/") and p.endswith("/windows"):
        return True
    return False

def save_tokens():
    with open(TOKEN_FILE, 'w') as f:
        json.dump(VALID_API_TOKENS, f)
    try:
        os.chmod(TOKEN_FILE, 0o600)
    except OSError:
        pass
MAX_TOKENS = 100


def _resolve_token_dict(token: str, tokens_store: dict | None = None) -> dict | None:
    if tokens_store is not None and token in tokens_store:
        return tokens_store
    if token in VALID_API_TOKENS:
        return VALID_API_TOKENS
    return None


def is_token_valid(token: str, tokens_store: dict | None = None) -> bool:
    """Return True if token exists and has not expired; prune & persist if expired (#247)."""
    if not token:
        return False
    store = _resolve_token_dict(token, tokens_store)
    if store is None:
        return False
    token_data = store[token]
    expires = token_data if isinstance(token_data, (int, float)) else token_data.get("expires", 0)
    if time.time() > expires:
        del store[token]
        _LAST_TOKEN_DISK_SYNC.pop(token, None)
        if store is VALID_API_TOKENS:
            save_tokens()
        return False
    return True


def touch_api_token(token: str, force_save: bool = False, tokens_store: dict | None = None) -> bool:
    """Slide an active API token's expiry forward by TOKEN_TTL, throttling disk syncs (#247)."""
    if not is_token_valid(token, tokens_store=tokens_store):
        return False
    store = _resolve_token_dict(token, tokens_store)
    if store is None:
        return False
    now = time.time()
    new_expires = now + TOKEN_TTL
    token_data = store[token]
    if isinstance(token_data, dict):
        token_data["expires"] = new_expires
    else:
        store[token] = {
            "expires": new_expires,
            "user": "admin",
            "role": "admin",
            "prefix": "",
        }
    last_saved = _LAST_TOKEN_DISK_SYNC.get(token, 0.0)
    if force_save or (now - last_saved >= TOKEN_SAVE_INTERVAL_S):
        _LAST_TOKEN_DISK_SYNC[token] = now
        if store is VALID_API_TOKENS:
            save_tokens()
    return True


def verify_token(request: Request, x_api_token: str = Header(None)):
    if not x_api_token or x_api_token not in VALID_API_TOKENS:
        raise HTTPException(status_code=401, detail="Unauthorized API Access")
    token_data = VALID_API_TOKENS[x_api_token]
    # Support both old format (float) and new format (dict)
    expires = token_data if isinstance(token_data, (int, float)) else token_data.get("expires", 0)
    if time.time() > expires:
        del VALID_API_TOKENS[x_api_token]
        _LAST_TOKEN_DISK_SYNC.pop(x_api_token, None)
        save_tokens()
        raise HTTPException(status_code=401, detail="Token Expired")
    if not _is_passive_token_request(request.method, request.url.path):
        touch_api_token(x_api_token)

def _get_user_from_token(x_api_token: str = Header(None)):
    """Extract user info from token. Returns (role, prefix) tuple."""
    if not x_api_token or x_api_token not in VALID_API_TOKENS:
        return ("anonymous", "")
    token_data = VALID_API_TOKENS[x_api_token]
    if isinstance(token_data, (int, float)):
        return ("admin", "")  # Legacy token format
    return (token_data.get("role", "user"), token_data.get("prefix", ""))

def require_admin(x_api_token: str = Header(None)):
    """Dependency that rejects non-admin users with 403."""
    role, _ = _get_user_from_token(x_api_token)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def is_direct_local_loopback(request: Request) -> bool:
    """Return True only for direct unproxied loopback requests from local sister services (#221)."""
    if not request or not request.client:
        return False
    if request.client.host not in ("127.0.0.1", "::1"):
        return False
    # Reject any request forwarded through Cloudflare or a reverse proxy
    if (
        request.headers.get("cf-connecting-ip")
        or request.headers.get("cf-ray")
        or request.headers.get("x-forwarded-for")
    ):
        return False
    host_hdr = (request.headers.get("host") or "").split(":")[0].strip().lower()
    return host_hdr in ("127.0.0.1", "localhost")


def is_authorized_local_loopback(request: Request) -> bool:
    """Require both unproxied loopback transport AND matching host-only X-AIM-Loopback-Token (#236)."""
    if not is_direct_local_loopback(request):
        return False
    supplied = (request.headers.get("x-aim-loopback-token") or "").strip()
    if not supplied or not loopback_token:
        return False
    return hmac.compare_digest(supplied.encode("utf-8"), loopback_token.encode("utf-8"))


def verify_token_or_loopback(request: Request, x_api_token: str = Header(None)):
    """Allow valid x-api-token OR authenticated direct local loopback read access (#221, #236)."""
    if is_authorized_local_loopback(request):
        return
    verify_token(request, x_api_token)


def require_admin_or_loopback(request: Request, x_api_token: str = Header(None)):
    """Allow admin x-api-token OR authenticated direct local loopback read access (#221, #236)."""
    if is_authorized_local_loopback(request):
        return
    require_admin(x_api_token)


from routes_auth import router as auth_router
from routes_sessions import router as sessions_router
from routes_files import router as files_router
from routes_agents import router as agents_router
from routes_fleet import router as fleet_router
from routes_webauthn import router as webauthn_router
from ws_handler import router as ws_router
from routes_api import router as api_router
from routes_forensics import router as forensics_router
from routes_browser import router as browser_router
from routes_joshua_analyst import router as joshua_analyst_router

app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(files_router)
app.include_router(agents_router)
app.include_router(fleet_router)
app.include_router(webauthn_router)
app.include_router(ws_router)
app.include_router(api_router)
app.include_router(forensics_router)
app.include_router(browser_router)
app.include_router(joshua_analyst_router)

frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")

_NO_STORE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}


def _render_frontend_file(dist_dir: str, catchall: str):
    """Resolve and render a SPA static asset, manifest.json, or dynamic-titled index.html (#237)."""
    import html as _html
    import urllib.parse
    from fastapi.responses import HTMLResponse

    base = os.path.realpath(dist_dir)
    file_path = os.path.realpath(os.path.join(base, catchall))
    if file_path != base and not file_path.startswith(base + os.sep):
        file_path = os.path.join(base, "index.html")
    elif not os.path.exists(file_path) or not os.path.isfile(file_path):
        file_path = os.path.join(base, "index.html")

    if file_path.endswith("manifest.json"):
        with open(file_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        app_name = os.environ.get("AIM_APP_NAME")
        if app_name:
            manifest["name"] = app_name
            manifest["short_name"] = app_name
            safe_id = urllib.parse.quote(app_name.lower().replace(" ", "-"))
            manifest["id"] = f"/?id={safe_id}"
            manifest["start_url"] = f"/?id={safe_id}"
        app_color = os.environ.get("AIM_APP_COLOR")
        if app_color:
            manifest["background_color"] = app_color
            manifest["theme_color"] = app_color
        return JSONResponse(manifest)

    if file_path.endswith("sw.js"):
        return FileResponse(
            file_path,
            media_type="application/javascript",
            headers={**_NO_STORE_HEADERS, "Service-Worker-Allowed": "/"},
        )

    if file_path.endswith("index.html"):
        app_name = os.environ.get("AIM_APP_NAME")
        if app_name:
            with open(file_path, "r", encoding="utf-8") as f:
                raw_html = f.read()
            escaped_name = _html.escape(app_name)
            rendered = raw_html.replace("<title>A.I.M. Connect</title>", f"<title>{escaped_name}</title>")
            return HTMLResponse(content=rendered, headers=_NO_STORE_HEADERS)
        return FileResponse(file_path, headers=_NO_STORE_HEADERS)

    return FileResponse(file_path)


if os.path.exists(frontend_path):
    # Mount Vite static assets
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    # Catch-all for SPA routing (never mask unmatched /api/* routes with 200 index.html)
    @app.get("/{catchall:path}")
    def serve_frontend(catchall: str):
        if catchall == "api" or catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        return _render_frontend_file(frontend_path, catchall)
else:
    @app.get("/")
    def read_root():
        return {"status": "aim-connect backend running! (Frontend not built in ../frontend/dist)"}

import os
import re
import json
import base64
import hmac
import hashlib
from fastapi.responses import HTMLResponse, FileResponse
from fastapi import Query
