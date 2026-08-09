import glob
import subprocess
import sys

import pty
import os
from dotenv import load_dotenv

# Force load .env from the parent directory so we don't rely on tmux inheritance
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

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
from e2ee import encrypt_bytes, decrypt_message

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aim-connect")


def resolve_workspace_id_for_email(email: str) -> str:
    """Map login email → agent_workspaces/agent-{id}/ (#184).

    Prefer LeadDeed operators registry (opaque op_* ids). Fallback: sanitize email
    for seats not yet migrated. Magic-link entitlement remains email-only on the
    dashboard; this only picks the filesystem workspace.
    """
    try:
        aim_ld_scripts = "/home/kingb/aim-ld/scripts"
        if aim_ld_scripts not in sys.path:
            sys.path.insert(0, aim_ld_scripts)
        from core.identity import resolve_workspace_id_for_email as _resolve

        return _resolve(email)
    except Exception as e:
        logger.warning(f"operator registry resolve failed for {email!r}: {e}; using sanitize fallback")
        return re.sub(r"[^a-zA-Z0-9]", "_", (email or "").strip().lower())


def legacy_sanitize_email(email: str) -> str:
    """Pre-#184 path form used by the dashboard for agent IDs (email slug)."""
    return re.sub(r"[^a-zA-Z0-9]", "_", (email or "").strip().lower())


async def ws_send_app_text(websocket: WebSocket, text: str) -> bool:
    """Send application text (optionally E2EE). Returns False if the socket is dead."""
    try:
        if ENABLE_E2EE and E2EE_SECRET:
            await websocket.send_bytes(encrypt_bytes(text.encode("utf-8"), E2EE_SECRET))
        else:
            await websocket.send_text(text)
        return True
    except Exception as e:
        logger.warning(f"ws_send_app_text failed: {e}")
        return False


async def ws_drain_client_or_sleep(websocket: WebSocket, timeout: float = 2.0):
    """Await inbound client frame up to timeout so pings are drained during long waits.

    Returns:
      None — timeout or drained ping/noise
      dict — parsed JSON message (caller may ignore mid-wait submits)
    Raises WebSocketDisconnect if the client closed.
    """
    try:
        message = await asyncio.wait_for(websocket.receive_text(), timeout=timeout)
    except asyncio.TimeoutError:
        return None
    try:
        if ENABLE_E2EE and E2EE_SECRET and not str(message).strip().startswith("{"):
            message = decrypt_message(message, E2EE_SECRET)
        data = json.loads(message)
        if isinstance(data, dict) and data.get("type") == "ping":
            return None
        return data if isinstance(data, dict) else None
    except WebSocketDisconnect:
        raise
    except Exception:
        return None


app = FastAPI()

ALLOWED_IPS = os.environ.get("ALLOWED_IPS", "")
ALLOW_HTTP = os.getenv("ALLOW_HTTP", "false").lower() == "true"
ENABLE_E2EE = os.getenv("ENABLE_E2EE", "false").lower() == "true"
E2EE_SECRET = os.getenv("E2EE_SECRET", "")
auth_attempts = {}
MAX_AUTH_ATTEMPTS = 5
LOCKOUT_TIME = 300 # 5 minutes
SESSION_NAME_RE = re.compile(r'^[a-zA-Z0-9_-]{1,64}$')
_last_used_totp = None  # TOTP replay protection

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
        "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net blob:; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "connect-src 'self' wss: ws:; "
        "img-src 'self' data:; "
        "font-src 'self' https://cdn.jsdelivr.net data:; "
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

SECRET_FILE = "totp.secret"

def get_or_create_totp():
    if os.path.exists(SECRET_FILE):
        with open(SECRET_FILE, "r") as f:
            secret = f.read().strip()
    else:
        secret = pyotp.random_base32()
        with open(SECRET_FILE, "w") as f:
            f.write(secret)
        os.chmod(SECRET_FILE, 0o600)
        
        # Print QR Code to console for setup
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

PASSWORD_FILE = "password.hash"

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
        
        print("\n\033[91m=== aim-connect PASSWORD SETUP ===\033[0m")
        print("A new secure admin password has been generated for you.")
        print(f"Password: \033[93m{raw_password}\033[0m")
        print("Please save this password in your password manager immediately.\n")
        return hashed_password

# Initialize Password hash on startup
admin_password_hash = get_or_create_password()

# --- Passphrase (Stealth "Name" field — third auth factor) ---
PASSPHRASE_FILE = "passphrase.hash"

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
        
        print("\n\033[95m=== aim-connect PASSPHRASE SETUP ===\033[0m")
        print("A stealth passphrase has been generated (the 'Name' field on login).")
        print(f"Passphrase: \033[93m{raw_passphrase}\033[0m")
        print("This is your third auth factor. Save it in your password manager.\n")
        return hashed_passphrase

# Initialize Passphrase hash on startup
admin_passphrase_hash = get_or_create_passphrase()

# --- Multi-User Support (optional users.json) ---
USERS_FILE = "users.json"

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

def set_pty_size(fd: int, rows: int, cols: int) -> None:
    """Resizes the underlying pseudo-terminal using an ioctl syscall."""
    winsize = struct.pack("HHHH", rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

TOKEN_FILE = "tokens.json"
VALID_API_TOKENS = {}  # token -> {"expires": float, "user": str, "role": str, "prefix": str}
if os.path.exists(TOKEN_FILE):
    try:
        with open(TOKEN_FILE, 'r') as f:
            VALID_API_TOKENS = json.load(f)
    except Exception:
        pass

TOKEN_TTL = int(os.environ.get('TOKEN_TTL', 14400))  # 4 hours by default

def save_tokens():
    with open(TOKEN_FILE, 'w') as f:
        json.dump(VALID_API_TOKENS, f)
    try:
        os.chmod(TOKEN_FILE, 0o600)
    except OSError:
        pass
MAX_TOKENS = 100

def verify_token(x_api_token: str = Header(None)):
    if not x_api_token or x_api_token not in VALID_API_TOKENS:
        raise HTTPException(status_code=401, detail="Unauthorized API Access")
    token_data = VALID_API_TOKENS[x_api_token]
    # Support both old format (float) and new format (dict)
    expires = token_data if isinstance(token_data, (int, float)) else token_data.get("expires", 0)
    if time.time() > expires:
        del VALID_API_TOKENS[x_api_token]
        raise HTTPException(status_code=401, detail="Token Expired")

class AuthRequest(BaseModel):
    token: str
    password: str
    passphrase: str = ""

@app.post("/api/auth")
def auth_api(req: AuthRequest, request: Request) -> dict:
    global _last_used_totp
    client_ip = request.client.host
    if ALLOWED_IPS:
        allowed = [ip.strip() for ip in ALLOWED_IPS.split(",")]
        if client_ip not in allowed:
            raise HTTPException(status_code=403, detail="IP not allowed")

    now = time.time()

    # Evict stale auth_attempts entries (older than lockout window)
    stale_ips = [ip for ip, (_, lock) in auth_attempts.items()
                 if lock and now >= lock + LOCKOUT_TIME]
    for ip in stale_ips:
        del auth_attempts[ip]

    if client_ip in auth_attempts:
        attempts, lock_time = auth_attempts[client_ip]
        if lock_time and now < lock_time:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
        elif lock_time and now >= lock_time:
            auth_attempts[client_ip] = (0, None)

    def _fail_auth(client_ip, now):
        attempts, _ = auth_attempts.get(client_ip, (0, None))
        attempts += 1
        lock = now + LOCKOUT_TIME if attempts >= MAX_AUTH_ATTEMPTS else None
        auth_attempts[client_ip] = (attempts, lock)
        logger.warning("Auth failed for IP %s (attempt %d)", client_ip, attempts)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # --- Multi-user auth path ---
    if users_db:
        matched_user = None
        matched_username = None
        for username, user_data in users_db.items():
            try:
                passphrase_ok = bcrypt.checkpw(req.passphrase.encode('utf-8'), user_data["passphrase_hash"].encode('utf-8'))
                password_ok = bcrypt.checkpw(req.password.encode('utf-8'), user_data["password_hash"].encode('utf-8'))
                user_totp = pyotp.TOTP(user_data["totp_secret"])
                totp_ok = user_totp.verify(req.token, valid_window=1)
                if passphrase_ok and password_ok and totp_ok:
                    matched_user = user_data
                    matched_username = username
                    break
            except Exception:
                continue
        
        if not matched_user:
            _fail_auth(client_ip, now)
        
        # TOTP replay protection
        if _last_used_totp == req.token:
            _fail_auth(client_ip, now)
        _last_used_totp = req.token
        
        api_token = secrets.token_hex(32)
        if len(VALID_API_TOKENS) >= MAX_TOKENS:
            oldest_token = min(VALID_API_TOKENS.keys(), key=lambda k: (
                VALID_API_TOKENS[k] if isinstance(VALID_API_TOKENS[k], (int, float))
                else VALID_API_TOKENS[k].get("expires", 0)
            ))
            del VALID_API_TOKENS[oldest_token]
        VALID_API_TOKENS[api_token] = {
            "expires": time.time() + TOKEN_TTL,
            "user": matched_username,
            "role": matched_user.get("role", "user"),
            "prefix": matched_user.get("sessions_prefix", "")
        }
        save_tokens()
        auth_attempts[client_ip] = (0, None)
        return {"api_token": api_token, "user": matched_username, "role": matched_user.get("role", "user")}

    # --- Single-user auth path (legacy) ---
    # Step 1: Verify Passphrase (stealth "Name" field)
    if not req.passphrase or not bcrypt.checkpw(req.passphrase.encode('utf-8'), admin_passphrase_hash.encode('utf-8')):
        _fail_auth(client_ip, now)

    # Step 2: Verify TOTP
    if not totp_instance.verify(req.token, valid_window=1):
        _fail_auth(client_ip, now)

    # Step 2b: TOTP replay protection
    if _last_used_totp == req.token:
        _fail_auth(client_ip, now)
    _last_used_totp = req.token

    # Step 3: Verify Password
    if not bcrypt.checkpw(req.password.encode('utf-8'), admin_password_hash.encode('utf-8')):
        _fail_auth(client_ip, now)

    api_token = secrets.token_hex(32)
    if len(VALID_API_TOKENS) >= MAX_TOKENS:
        oldest_token = min(VALID_API_TOKENS.keys(), key=lambda k: (
            VALID_API_TOKENS[k] if isinstance(VALID_API_TOKENS[k], (int, float))
            else VALID_API_TOKENS[k].get("expires", 0)
        ))
        del VALID_API_TOKENS[oldest_token]
    VALID_API_TOKENS[api_token] = {
        "expires": time.time() + TOKEN_TTL,
        "user": "admin",
        "role": "admin",
        "prefix": ""
    }
    save_tokens()
    auth_attempts[client_ip] = (0, None)
    return {"api_token": api_token}

@app.post("/api/logout", dependencies=[Depends(verify_token)])
def logout(x_api_token: str = Header(None)):
    if x_api_token in VALID_API_TOKENS:
        del VALID_API_TOKENS[x_api_token]
    return {"message": "Logged out"}

@app.get("/api/health")
def health_check() -> dict:
    """Health check endpoint for Docker and monitoring watchdogs."""
    return {"status": "ok", "service": "aim-connect"}

def _get_user_from_token(x_api_token: str = Header(None)):
    """Extract user info from token. Returns (role, prefix) tuple."""
    if not x_api_token or x_api_token not in VALID_API_TOKENS:
        return ("admin", "")
    token_data = VALID_API_TOKENS[x_api_token]
    if isinstance(token_data, (int, float)):
        return ("admin", "")  # Legacy token format
    return (token_data.get("role", "user"), token_data.get("prefix", ""))

@app.get("/api/sessions", dependencies=[Depends(verify_token)])
def get_sessions(x_api_token: str = Header(None)) -> dict:

    result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
    sessions = []
    role, prefix = _get_user_from_token(x_api_token)
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            if line and not line.startswith("aim-client-"):
                # Non-admin users only see sessions with their prefix (or all if no prefix)
                if role == "admin" or not prefix or line.startswith(prefix):
                    sessions.append(line)
    return {"sessions": sessions}

class SessionRequest(BaseModel):
    name: str

class E2EESettingsRequest(BaseModel):
    secret: str

@app.post("/api/settings/e2ee", dependencies=[Depends(verify_token)])
def update_e2ee_settings(req: E2EESettingsRequest):
    """Updates the backend E2EE_SECRET dynamically and writes it to .env"""
    global ENABLE_E2EE, E2EE_SECRET
    
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
    new_lines = []
    found_enable = False
    found_secret = False
    
    for line in lines:
        if line.startswith("ENABLE_E2EE="):
            new_lines.append("ENABLE_E2EE=true\n" if req.secret else "ENABLE_E2EE=false\n")
            found_enable = True
        elif line.startswith("E2EE_SECRET="):
            new_lines.append(f'E2EE_SECRET="{req.secret}"\n')
            found_secret = True
        else:
            new_lines.append(line)
            
    if not found_enable:
        new_lines.append("ENABLE_E2EE=true\n" if req.secret else "ENABLE_E2EE=false\n")
    if not found_secret:
        new_lines.append(f'E2EE_SECRET="{req.secret}"\n')
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
        
    ENABLE_E2EE = bool(req.secret)
    E2EE_SECRET = req.secret
    return {"status": "success", "message": "E2EE settings updated on backend."}

@app.post("/api/sync_csv/{agent_id}", dependencies=[Depends(verify_token)])
async def sync_csv(agent_id: str, file: UploadFile = File(...)):
    """
    Multi-Tenant Database Ingestion:
    Receives a CSV/Data file and drops it into the agent's insulated _ingest folder,
    then triggers the Subconscious Daemon to vectorize and chunk the data into the Engram DB.
    """
    base_agent_name = agent_id.replace('@', '_').replace('.', '_')
    workspace_dir = f"/home/kingb/aim-connect/agent_workspaces/agent-{base_agent_name}"
    
    if not os.path.exists(workspace_dir):
        raise HTTPException(status_code=404, detail=f"Sovereign workspace for {agent_id} not found.")
        
    ingest_dir = os.path.join(workspace_dir, "brain", "memory-wiki", "_ingest")
    os.makedirs(ingest_dir, exist_ok=True)
    
    # Save the raw file to the _ingest folder
    safe_filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', file.filename)
    file_path = os.path.join(ingest_dir, safe_filename)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    # Trigger the Subconscious Daemon to process the new data
    daemon_cmd = f"cd {workspace_dir} && /home/kingb/.local/bin/agy wiki process"
    
    try:
        # Run in background so we don't block the API response
        subprocess.Popen(daemon_cmd, shell=True, executable="/bin/bash")
    except Exception as e:
        logger.error(f"Failed to trigger Subconscious Daemon for {agent_id}: {e}")
        
    return {
        "status": "success",
        "message": f"Successfully dropped {safe_filename} into {agent_id}'s _ingest folder. The Subconscious Daemon is now vectorizing it into the Engram DB.",
        "file": file_path
    }
class IntegrationRequest(BaseModel):
    gmail_address: str
    gmail_app_password: str

@app.get("/api/integrations/{agent_id}", dependencies=[Depends(verify_token)])
def get_integrations(agent_id: str):
    base_agent_name = agent_id.replace('@', '_').replace('.', '_')
    if not base_agent_name.startswith("agent-"):
        base_agent_name = "agent-" + base_agent_name
    env_path = f"/home/kingb/aim-connect/agent_workspaces/{base_agent_name}/.env"
    
    data = {"gmail_address": "", "has_password": False}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("GMAIL_ADDRESS="):
                    data["gmail_address"] = line.split("=", 1)[1].strip().strip('"\'')
                elif line.startswith("GMAIL_APP_PASSWORD="):
                    val = line.split("=", 1)[1].strip().strip('"\'')
                    if val:
                        data["has_password"] = True
    return data

@app.post("/api/integrations/{agent_id}", dependencies=[Depends(verify_token)])
def save_integrations(agent_id: str, req: IntegrationRequest):
    base_agent_name = agent_id.replace('@', '_').replace('.', '_')
    if not base_agent_name.startswith("agent-"):
        base_agent_name = "agent-" + base_agent_name
    workspace_dir = f"/home/kingb/aim-connect/agent_workspaces/{base_agent_name}"
    
    if not os.path.exists(workspace_dir):
        raise HTTPException(status_code=404, detail="Agent workspace not found")
        
    env_path = os.path.join(workspace_dir, ".env")
    
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
    new_lines = []
    found_email = False
    found_pass = False
    
    for line in lines:
        if line.startswith("GMAIL_ADDRESS="):
            new_lines.append(f'GMAIL_ADDRESS="{req.gmail_address}"\n')
            found_email = True
        elif line.startswith("GMAIL_APP_PASSWORD="):
            if req.gmail_app_password: # Only update if provided
                new_lines.append(f'GMAIL_APP_PASSWORD="{req.gmail_app_password}"\n')
            else:
                new_lines.append(line)
            found_pass = True
        else:
            new_lines.append(line)
            
    if not found_email:
        new_lines.append(f'GMAIL_ADDRESS="{req.gmail_address}"\n')
    if not found_pass and req.gmail_app_password:
        new_lines.append(f'GMAIL_APP_PASSWORD="{req.gmail_app_password}"\n')
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
        
    return {"status": "success"}


grok_oauth_processes = {}


async def kill_all_user_sessions(sanitized_email: str, exclude_session: str = ""):
    """Kill ALL tmux sessions for this email to enforce 1-email-1-session.
    
    This is the server-side safety net that guarantees no ghost sessions
    persist across harness switches, browser crashes, or failed frontend
    DELETE calls. Called before spawning a new session.
    
    Args:
        sanitized_email: The user's email sanitized for tmux naming
        exclude_session: Optional session name to keep alive (for reconnects)
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "tmux", "list-sessions", "-F", "#{session_name}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        if proc.returncode != 0:
            return  # No tmux server or no sessions — nothing to kill
        
        prefix = f"agent-{sanitized_email}"
        for session_name in stdout.decode().strip().split('\n'):
            session_name = session_name.strip()
            if not session_name:
                continue
            # Match sessions that are exactly the prefix or start with prefix-
            if session_name == prefix or session_name.startswith(f"{prefix}-"):
                if exclude_session and session_name == exclude_session:
                    continue
                logger.info(f"[HARNESS SWITCH] Killing orphan session: {session_name}")
                await asyncio.create_subprocess_exec(
                    "tmux", "kill-session", "-t", session_name
                )
    except Exception as e:
        logger.warning(f"[HARNESS SWITCH] Error during session cleanup for {sanitized_email}: {e}")


def _verify_dashboard_jwt(token: str):
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        import base64, hmac, hashlib
        parts = token.split(".")
        if len(parts) != 2:
            raise HTTPException(status_code=401, detail="Invalid Token Format")
        payload_b64, signature_b64 = parts
        secret = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "")
        if not secret:
            raise HTTPException(status_code=500, detail="Missing Secret")
        expected_mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_mac).decode().rstrip("=")
        if signature_b64.rstrip("=") != expected_b64:
            raise HTTPException(status_code=401, detail="Unauthorized")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token Verification Failed")

@app.post("/api/grok/oauth/init")
async def init_grok_oauth(agent_id: str, token: str = ""):
    _verify_dashboard_jwt(token)
    
    parts = agent_id.split('-')
    if len(parts) >= 3 and parts[0] == 'agent':
        base_agent_name = f"agent-{parts[1]}"
        # Unified workspace: workspace_dir IS the user root (no harness- subdirs)
        workspace_dir = f"/home/kingb/aim-connect/agent_workspaces/{base_agent_name}"
    else:
        base_agent_name = agent_id.replace('@', '_').replace('.', '_')
        if not base_agent_name.startswith("agent-"):
            base_agent_name = "agent-" + base_agent_name
        workspace_dir = f"/home/kingb/aim-connect/agent_workspaces/{base_agent_name}"

    os.makedirs(os.path.join(workspace_dir, "grok_data"), exist_ok=True)
    auth_file = os.path.join(workspace_dir, "grok_data", "auth.json")
    if os.path.exists(auth_file):
        try:
            os.remove(auth_file)
        except Exception:
            pass
    
    bwrap_cmd = (
        f"script -e -q -c 'bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
        f"--tmpfs /home/kingb "
        f"--ro-bind /home/kingb/.local /home/kingb/.local "
        f"--bind {workspace_dir}/grok_data /home/kingb/.grok "
        f"--ro-bind /home/kingb/.grok/bin /home/kingb/.grok/bin "
        f"--ro-bind /home/kingb/.grok/downloads /home/kingb/.grok/downloads "
        f"--bind {workspace_dir} {workspace_dir} "
        f"--chdir {workspace_dir} /home/kingb/.grok/bin/grok login --device-auth' /dev/null"
    )

    try:
        proc = await asyncio.create_subprocess_shell(
            bwrap_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
    except Exception as e:
        logger.error(f"Failed to spawn grok login: {e}")
        return {"error": str(e)}
        
    grok_oauth_processes[agent_id] = {"process": proc, "status": "pending"}
    
    url = None
    code = None
    captured_output = []
    
    start_time = time.time()
    while time.time() - start_time < 15.0:
        try:
            line_bytes = await asyncio.wait_for(proc.stdout.readline(), timeout=1.0)
            if not line_bytes:
                break
            line = line_bytes.decode('utf-8', errors='ignore').strip()
            if line:
                captured_output.append(line)
            
            if "https://" in line:
                url_match = re.search(r'(https://[^\s]+)', line)
                if url_match:
                    url = url_match.group(1)
            
            code_match = re.search(r'\b([A-Z0-9]{4}-[A-Z0-9]{4})\b', line)
            if code_match:
                code = code_match.group(1)
                
            if url and code:
                break
        except asyncio.TimeoutError:
            continue

    async def wait_for_auth():
        auth_file = os.path.join(workspace_dir, "grok_data", "auth.json")
        start_wait = time.time()
        success = False
        while time.time() - start_wait < 300: # Wait up to 5 minutes
            if os.path.exists(auth_file) and os.path.getsize(auth_file) > 100:
                success = True
                break
            try:
                await asyncio.wait_for(proc.wait(), timeout=2.0)
                if proc.returncode == 0:
                    success = True
                break
            except asyncio.TimeoutError:
                pass

        if success:
            grok_oauth_processes[agent_id]["status"] = "success"
        else:
            grok_oauth_processes[agent_id]["status"] = "failed"
            
        try:
            proc.terminate()
        except:
            pass
            
    asyncio.create_task(wait_for_auth())
    
    if url and code:
        return {"url": url, "code": code}
    else:
        return {"error": "Failed to parse device code from Grok CLI.", "output": "\n".join(captured_output)}

@app.get("/api/grok/oauth/status")
async def get_grok_oauth_status(agent_id: str, token: str = ""):
    _verify_dashboard_jwt(token)
    if agent_id not in grok_oauth_processes:
        return {"status": "not_found"}
    return {"status": grok_oauth_processes[agent_id]["status"]}

@app.post("/api/sessions", dependencies=[Depends(verify_token)])
def create_session(req: SessionRequest) -> dict:
    """Spawns a new detached tmux session and enables global mouse support."""
    if not SESSION_NAME_RE.match(req.name):
        raise HTTPException(status_code=400, detail="Invalid session name. Use only letters, numbers, hyphens, underscores (max 64 chars).")

    result = subprocess.run(["tmux", "new-session", "-d", "-s", req.name], capture_output=True, text=True)
    if result.returncode == 0:
        subprocess.run(["tmux", "set-option", "-g", "mouse", "on"])
        return {"status": "success"}
    return {"error": result.stderr}

@app.delete("/api/sessions/{name}", dependencies=[Depends(verify_token)])
def kill_session(name: str, delete_workspace: bool = False):

    import shutil
    import re
    result = subprocess.run(["tmux", "kill-session", "-t", name], capture_output=True, text=True)
    
    if delete_workspace:
        # Obliterate the workspace directory for the agent/subagent
        # Unified model: primary sessions use user_root_dir, fleet sub-agents use fleet_sessions/
        workspace_dir = None
        parts = name.split('-')
        if name.startswith('agent-') and len(parts) >= 2:
            base_agent = f"agent-{parts[1]}"
            user_root_dir = f"/home/kingb/aim-connect/agent_workspaces/{base_agent}"
            if len(parts) > 3:
                # Fleet sub-agent: only delete its conversation isolation dir
                sub_id = '-'.join(parts[2:])
                workspace_dir = f"{user_root_dir}/fleet_sessions/{sub_id}"
            else:
                # Primary session — delete the entire user workspace
                workspace_dir = user_root_dir
        else:
            # Fallback for generic non-agent workspaces
            workspace_dir = f"/home/kingb/aim-connect/workspace/{name}"
            
        if workspace_dir and os.path.exists(workspace_dir):
            try:
                shutil.rmtree(workspace_dir)
                logger.info(f"Obliterated workspace directory: {workspace_dir}")
            except Exception as e:
                logger.error(f"Failed to delete workspace directory {workspace_dir}: {e}")
                return {"status": "success", "warning": f"Session killed, but failed to delete workspace: {e}"}

    if result.returncode == 0 or "can't find session" in result.stderr:
        return {"status": "success"}
    return {"error": result.stderr}

def secure_path(p: str, base_dir: str = DEFAULT_WORKSPACE) -> str:
    base = os.path.realpath(base_dir)
    abs_path = os.path.realpath(os.path.join(base, p) if not os.path.isabs(p) else p)
    if abs_path != base and not abs_path.startswith(base + os.sep):
        raise ValueError(f"Access denied: Path traversal detected outside of workspace ({base_dir}).")
    return abs_path

@app.get("/api/files", dependencies=[Depends(verify_token)])
def list_files(path: str = DEFAULT_WORKSPACE) -> dict:
    try:
        safe_path = secure_path(path)
        items = []
        for entry in os.scandir(safe_path):
            try:
                is_dir = entry.is_dir(follow_symlinks=False)
            except OSError:
                is_dir = False
            items.append({
                "name": entry.name,
                "is_dir": is_dir,
                "path": entry.path
            })
        # Sort directories first, then files
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return {"path": safe_path, "items": items}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/file", dependencies=[Depends(verify_token)])
def read_file(path: str):
    try:
        safe_path = secure_path(path)
        with open(safe_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        return {"error": str(e)}

class FileSaveRequest(BaseModel):
    path: str
    content: str

@app.put("/api/file", dependencies=[Depends(verify_token)])
def save_file(req: FileSaveRequest):
    try:
        safe_path = secure_path(req.path)
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(req.content)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

class FileCreateRequest(BaseModel):
    path: str
    is_dir: bool

@app.post("/api/file", dependencies=[Depends(verify_token)])
def create_file_or_dir(req: FileCreateRequest):
    try:
        safe_path = secure_path(req.path)
        if req.is_dir:
            os.makedirs(safe_path, exist_ok=True)
        else:
            with open(safe_path, "w", encoding="utf-8") as f:
                pass
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/scrollback/{session_name}", dependencies=[Depends(verify_token)])
def get_scrollback(session_name: str):

    try:
        # Capture pane with ANSI colors (-e) and max 1000 lines of history (-S -1000)
        # to prevent mobile DOM lockups from massive buffers
        result = subprocess.run(
            ["tmux", "capture-pane", "-t", session_name, "-S", "-1000", "-e", "-p"],
            capture_output=True,
            text=True,
            check=True
        )
        return {"scrollback": result.stdout}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/file", dependencies=[Depends(verify_token)])
def delete_file(path: str):
    import shutil
    try:
        safe_path = secure_path(path)
        if os.path.isdir(safe_path):
            shutil.rmtree(safe_path)
        else:
            os.remove(safe_path)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

MACROS_FILE = "macros.json"

@app.get("/api/macros", dependencies=[Depends(verify_token)])
def get_macros():
    try:
        if os.path.exists(MACROS_FILE):
            with open(MACROS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return []
    except Exception as e:
        return {"error": str(e)}

class MacroSaveRequest(BaseModel):
    macros: list

@app.post("/api/macros", dependencies=[Depends(verify_token)])
def save_macros(req: MacroSaveRequest):
    try:
        with open(MACROS_FILE, "w", encoding="utf-8") as f:
            json.dump(req.macros, f)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

from fastapi.responses import HTMLResponse
import glob
import os

from fastapi import Query

@app.get("/history/{agent_id}")
async def get_history(agent_id: str, token: str = Query(None), limit: int = Query(3, description="Number of reincarnations to show")):
    if not token:
        return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>401 UNAUTHORIZED: Access Denied.</h1>", status_code=401)
        
    try:
        import base64
        import hmac
        import hashlib
        import re
        import json
        
        parts = token.split(".")
        if len(parts) != 2:
            return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>401 UNAUTHORIZED: Invalid Token Format.</h1>", status_code=401)
            
        payload_b64, signature_b64 = parts
        secret = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "")
        if not secret:
            return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>500 INTERNAL ERROR: Missing Secret.</h1>", status_code=500)
            
        def pad_b64(data):
            return data + "=" * (-len(data) % 4)
            
        expected_mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_mac).decode().rstrip("=")
        
        if signature_b64.rstrip("=") != expected_b64:
            return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>401 UNAUTHORIZED: Invalid Signature.</h1>", status_code=401)
            
        payload = json.loads(base64.urlsafe_b64decode(pad_b64(payload_b64)).decode())
        email = payload.get("e")
        if not email:
            return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>401 UNAUTHORIZED: Missing Email.</h1>", status_code=401)

        # #184: filesystem seat id is op_* (registry). Dashboard still builds
        # agent-{sanitized_email}-* for history/fleet. Accept either form for auth,
        # but always open the registry-resolved workspace on disk.
        workspace_id = resolve_workspace_id_for_email(email)
        legacy_id = legacy_sanitize_email(email)
        expected_bases = [f"agent-{workspace_id}", f"agent-{legacy_id}"]
        # de-dupe if registry falls back to sanitize
        expected_bases = list(dict.fromkeys(expected_bases))

        if not any(agent_id == b or agent_id.startswith(b + "-") for b in expected_bases):
            return HTMLResponse("<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>403 FORBIDDEN: Agent ID Mismatch.</h1>", status_code=403)

        workspace_dir = f"/home/kingb/aim-connect/agent_workspaces/agent-{workspace_id}"
        agent_brain_dir = os.path.join(workspace_dir, "brain")

        # Harness / fleet suffix after whichever base matched (email slug or op_*)
        sub_id = None
        for base in expected_bases:
            if agent_id == base:
                sub_id = None
                break
            if agent_id.startswith(base + "-"):
                sub_id = agent_id[len(base) + 1 :] or None
                break
            
    except Exception as e:
        return HTMLResponse(f"<h1 style='color:red; font-family:monospace; text-align:center; padding: 50px;'>401 UNAUTHORIZED: Token Parsing Failed.</h1>", status_code=401)

    html = f"<html><head><title>A.I.M. History: {agent_id}</title><style>body{{font-family: 'Courier New', Courier, monospace; background: #080c0a; color: #e0f2e9; padding: 2rem; max-width: 900px; margin: 0 auto; line-height: 1.6;}} h2{{color: #00ff88; text-transform: uppercase; border-bottom: 1px solid #00ff88; padding-bottom: 10px; letter-spacing: 2px; text-shadow: 0 0 5px rgba(0,255,136,0.5);}} .user{{background: #111a15; padding: 1.5rem; border-radius: 4px; margin-bottom: 1rem; border-left: 3px solid #0088ff; color: #a0c4ff;}} .agent{{background: #0d1410; padding: 1.5rem; border-radius: 4px; margin-bottom: 2rem; border-left: 3px solid #00ff88; white-space: pre-wrap; box-shadow: -2px 0 10px rgba(0, 255, 136, 0.1);}} strong{{color: #fff; text-transform: uppercase; letter-spacing: 1px;}} .meta{{font-size: 0.8rem; color: #00ff88; margin-bottom: 15px; opacity: 0.7;}} .boundary{{text-align: center; color: #00ff88; padding: 15px 0; border-top: 1px dashed #00FFA3; border-bottom: 1px dashed #00FFA3; margin: 40px 0; letter-spacing: 3px; font-size: 0.9rem; opacity: 0.6;}}</style></head><body><h2>A.I.M. Sovereign Data Core</h2><div class='meta'>TARGET IDENTIFIER: {agent_id}<br/>WORKSPACE: agent-{workspace_id}<br/>ACCESS LEVEL: ADMINISTRATOR</div>"
    
    opencode_db_path = None
    grok_chat_path = None

    # Normalize harness: primary sessions use "opencode" | "grok" | "admin-cli"
    harness_key = (sub_id or "opencode").split("-")[0] if sub_id else "opencode"
    if harness_key in ("opencode", "chat") or (sub_id and sub_id.startswith("opencode")):
        harness_key = "opencode"
    elif harness_key == "grok" or (sub_id and sub_id.startswith("grok")):
        harness_key = "grok"
    elif harness_key in ("admin-cli", "agy") or (sub_id and ("admin-cli" in sub_id or sub_id.startswith("chat"))):
        harness_key = "admin-cli"

    if harness_key == "grok":
        # Unified workspace: grok_data is at workspace root level
        grok_sessions = glob.glob(os.path.join(workspace_dir, "grok_data", "sessions", "*", "*", "chat_history.jsonl"))
        if grok_sessions:
            grok_chat_path = max(grok_sessions, key=os.path.getmtime)
    elif harness_key == "opencode":
        # Unified workspace: opencode_data is at workspace root level
        opencode_db_path_candidate = os.path.join(workspace_dir, "opencode_data", "opencode.db")
        if os.path.exists(opencode_db_path_candidate):
            opencode_db_path = opencode_db_path_candidate

    import html as escape_html
    if grok_chat_path:
        with open(grok_chat_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip(): continue
                try:
                    data = json.loads(line)
                    
                    if data.get("synthetic_reason") == "system_reminder" or data.get("type") == "system":
                        continue
                        
                    role = data.get("type", data.get("role"))
                    content_blocks = data.get("content", [])
                    if not content_blocks: continue
                    text = ""
                    if isinstance(content_blocks, str):
                        text = content_blocks + "\n"
                    elif isinstance(content_blocks, list):
                        for b in content_blocks:
                            if isinstance(b, dict) and b.get("type") == "text":
                                text += b.get("text", "") + "\n"
                    
                    import re
                    text = re.sub(r'</?user_query>', '', text)
                    text = re.sub(r'<system-reminder>.*?</system-reminder>', '', text, flags=re.DOTALL)
                    
                    if not text.strip(): continue
                    safe_content = escape_html.escape(text.strip())
                    
                    if role == "user":
                        html += f"<div class='user'><strong>[OPERATOR INPUT]</strong><br/><br/>{safe_content}</div>"
                    elif role in ["assistant", "model"]:
                        html += f"<div class='agent'><strong>[A.I.M. SYSTEM RESPONSE]</strong><br/><br/>{safe_content}</div>"
                except Exception:
                    pass
    elif opencode_db_path:
        import sqlite3
        conn = sqlite3.connect(f"file:{opencode_db_path}?mode=ro", uri=True)
        cursor = conn.cursor()
        query = """
        SELECT m.data, p.data, m.time_created
        FROM message m
        JOIN part p ON m.id = p.message_id
        ORDER BY m.time_created ASC, p.time_created ASC
        """
        rows = cursor.execute(query).fetchall()
        for msg_data, part_data, time_created in rows:
            try:
                m_json = json.loads(msg_data)
                p_json = json.loads(part_data)
                
                if p_json.get("type") == "text" and "text" in p_json:
                    role = m_json.get("role")
                    content = p_json.get("text")
                    safe_content = escape_html.escape(content)
                    
                    if role == "user":
                        html += f"<div class='user'><strong>[OPERATOR INPUT]</strong><br/><br/>{safe_content}</div>"
                    elif role == "assistant":
                        html += f"<div class='agent'><strong>[A.I.M. SYSTEM RESPONSE]</strong><br/><br/>{safe_content}</div>"
            except Exception:
                pass
        conn.close()
    else:
        if not os.path.exists(agent_brain_dir):
            return HTMLResponse(f"<html><head><title>A.I.M. History: {agent_id}</title><style>body{{font-family: 'Courier New', Courier, monospace; background: #080c0a; color: #e0f2e9; padding: 2rem; max-width: 900px; margin: 0 auto; line-height: 1.6;}}</style></head><body><h2>A.I.M. Sovereign Data Core</h2><h1 style='color:#00ff88; text-align:center; padding: 50px; font-weight: normal; font-size: 1.2rem; border: 1px dashed #00ff88; border-radius: 4px; background: rgba(0,255,136,0.05);'>NO DATA CORE ESTABLISHED YET.</h1></body></html>", status_code=404)
            
        log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
        if not log_files:
            return HTMLResponse("<h1>Agent brain is empty.</h1>", status_code=404)
            
        # Sort by modification time of the actual transcript files descending (newest first)
        log_files.sort(key=os.path.getmtime, reverse=True)
        
        # Take the top N (limit) and reverse it back to chronological (oldest to newest)
        target_files = log_files[:limit]
        target_files.reverse()
            
        for i, log_file in enumerate(target_files):
            import datetime
            mtime = os.path.getmtime(log_file)
            dt_str = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
            
            if i > 0:
                html += f"<div class='boundary'>--- SYSTEM REBOOT: CONTEXT DROPPED ---<br/>REINCARNATION INITIATED: {dt_str}</div>"
            else:
                html += f"<div style='text-align: center; color: #00ff88; padding: 10px 0; margin-bottom: 30px; letter-spacing: 3px; font-size: 0.9rem; opacity: 0.5;'>--- BEGIN SESSION ARCHIVE: {dt_str} ---</div>"
                
            with open(log_file, "r") as f:
                for line in f:
                    try:
                        entry = json.loads(line)
                        if entry.get("type") == "USER_INPUT":
                            content = entry.get("content", "")
                            html += f"<div class='user'><strong>[OPERATOR INPUT]</strong><br/><br/>{content}</div>"
                        elif entry.get("source") == "MODEL" and entry.get("type") == "PLANNER_RESPONSE":
                            content = entry.get("content")
                            tool_calls = entry.get("tool_calls")
                            if content and not tool_calls:
                                html += f"<div class='agent'><strong>[A.I.M. SYSTEM RESPONSE]</strong><br/><br/>{content}</div>"
                    except Exception:
                        pass
                
    html += "<script>window.scrollTo(0, document.body.scrollHeight);</script></body></html>"
    return HTMLResponse(html)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    Primary WebSocket handler for streaming terminal I/O.
    Enforces a strict 10-second API Token authentication window on connection.
    If the client does not send a valid token within 10s, the socket is dropped.
    Spawns a PTY (pseudo-terminal) via os.fork() to bridge the WebSocket 
    into a native tmux session, allowing persistent background execution.
    """
    client_ip = websocket.client.host
    if ALLOWED_IPS:
        allowed = [ip.strip() for ip in ALLOWED_IPS.split(",")]
        if client_ip not in allowed:
            logger.warning(f"Rejected connection from unauthorized IP: {client_ip}")
            await websocket.close(code=1008, reason="IP not allowed")
            return

    # Rate limiting check
    now = time.time()
    if client_ip in auth_attempts:
        attempts, lock_time = auth_attempts[client_ip]
        if lock_time and now < lock_time:
            logger.warning(f"Rate limited IP: {client_ip}")
            await websocket.close(code=1008, reason="Too many attempts. Try again later.")
            return
        elif lock_time and now >= lock_time:
            auth_attempts[client_ip] = (0, None)

    await websocket.accept()

    # Step 1: Enforce authentication
    authenticated = False
    target_session_override = None
    client_gemini_api_key = None
    client_gemini_model = None
    client_grok_thinking = None
    client_harness = "opencode"
    try:
        auth_message = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        data = json.loads(auth_message)
        if data.get("type") == "auth":
            token = data.get("token", "")
            sub_session_id = data.get("sub_session_id")
            client_gemini_api_key = data.get("gemini_api_key")
            client_gemini_model = data.get("gemini_model")
            client_grok_thinking = data.get("grok_thinking")
            client_harness = data.get("harness", "opencode")
            
            if token in VALID_API_TOKENS:
                token_data = VALID_API_TOKENS[token]
                expires = token_data if isinstance(token_data, (int, float)) else token_data.get("expires", 0)
                if time.time() > expires:
                    del VALID_API_TOKENS[token]
                else:
                    authenticated = True
                    auth_attempts[client_ip] = (0, None)
            elif "." in token:
                import base64
                import hmac
                import hashlib
                import re
                parts = token.split(".")
                if len(parts) == 2:
                    payload_b64, signature_b64 = parts
                    print(f"DEBUG TOKEN INCOMING: {token}")
                    secret = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "")
                    if secret:
                        def pad_b64(data):
                            return data + "=" * (-len(data) % 4)
                        try:
                            expected_mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
                            expected_b64 = base64.urlsafe_b64encode(expected_mac).decode().rstrip("=")
                            if signature_b64.rstrip("=") == expected_b64:
                                payload = json.loads(base64.urlsafe_b64decode(pad_b64(payload_b64)).decode())
                                email = payload.get("e")
                                if email:
                                    authenticated = True
                                    auth_attempts[client_ip] = (0, None)
                                    sanitized_email = resolve_workspace_id_for_email(email)
                                    if sub_session_id and re.match(r'^[a-zA-Z0-9_-]+$', sub_session_id):
                                        target_session_override = f"agent-{sanitized_email}-{sub_session_id}"
                                    else:
                                        target_session_override = f"agent-{sanitized_email}-{client_harness}"
                        except Exception as e:
                            logger.error(f"Failed to parse LeadDeed token: {e}")
            
            if not authenticated:
                attempts, _ = auth_attempts.get(client_ip, (0, None))
                attempts += 1
                lock = now + LOCKOUT_TIME if attempts >= MAX_AUTH_ATTEMPTS else None
                auth_attempts[client_ip] = (attempts, lock)
                
        if not authenticated:
            await websocket.close(code=1008, reason="Invalid API Token")
            return
        
        await websocket.send_text(json.dumps({"type": "auth_success"}))
    except Exception as e:
        logger.error(f"Auth failed: {e}")
        await websocket.close(code=1008, reason="Auth Timeout or Error")
        return

    is_admin_connection = token in VALID_API_TOKENS

    if target_session_override and target_session_override.startswith("agent-"):
        # =====================================================================
        # PUBLIC AGENT CONNECTIONS (HEADLESS CHAT API MODE)
        # =====================================================================
        import tempfile
        import shlex
        
        parts = target_session_override.split('-')
        base_agent_name = parts[1] # The sanitized email part
        
        remainder = "-".join(parts[2:]) if len(parts) > 2 else "opencode"
        current_harness = "opencode"
        is_sub_session = False
        sub_id = ""
        
        if remainder in ["opencode", "chat", "google-ai", "google-news", "google-web", "admin-cli"]:
            current_harness = remainder
        else:
            for h in ["opencode", "chat", "google-ai", "google-news", "google-web", "admin-cli"]:
                if remainder.startswith(h + "-"):
                    current_harness = h
                    is_sub_session = True
                    sub_id = remainder[len(h)+1:]
                    break
            if not is_sub_session:
                current_harness = remainder
        
        user_root_dir = f"/home/kingb/aim-connect/agent_workspaces/agent-{base_agent_name}"
        shared_data_dir = os.path.join(user_root_dir, "shared_database")
        os.makedirs(shared_data_dir, exist_ok=True)
        
        if is_sub_session:
            # ── UNIFIED FLEET MODEL ──────────────────────────────────────
            # Fleet sub-agents SHARE the primary workspace. They get their
            # own conversation isolation under fleet_sessions/ but access
            # the same shared_database/, AGENTS.md, memory-wiki, etc.
            workspace_dir = user_root_dir  # Same workspace as primary
            fleet_session_dir = os.path.join(user_root_dir, "fleet_sessions", f"{current_harness}-{sub_id}")
            os.makedirs(fleet_session_dir, exist_ok=True)
            
            # Fleet sub-agents use the primary workspace's brain and conversations
            agent_brain_dir = os.path.join(user_root_dir, "brain")
            agent_conv_dir = os.path.join(user_root_dir, "conversations")
        else:
            # ── UNIFIED WORKSPACE (1-per-customer) ───────────────────────
            # No more harness-{harness} subdirs. workspace_dir IS user_root_dir.
            workspace_dir = user_root_dir
            # The workspace must be pre-built by scaffold_customer_workspace.py
            if not os.path.exists(user_root_dir):
                logger.error(f"User root {user_root_dir} does not exist. Rejecting connection.")
                await websocket.send_text("**System Error:** Your Sovereign Workspace has not been provisioned by the Administrator.")
                await websocket.close()
                return
            
            agent_brain_dir = os.path.join(workspace_dir, "brain")
            agent_conv_dir = os.path.join(workspace_dir, "conversations")

        os.makedirs(agent_brain_dir, exist_ok=True)
        os.makedirs(agent_conv_dir, exist_ok=True)
        os.makedirs(os.path.join(workspace_dir, "opencode_data"), exist_ok=True)
        grok_data_dir = os.path.join(workspace_dir, "grok_data")
        os.makedirs(grok_data_dir, exist_ok=True)
        os.makedirs(os.path.join(grok_data_dir, "bin"), exist_ok=True)
        os.makedirs(os.path.join(grok_data_dir, "downloads"), exist_ok=True)
        if not os.path.exists(os.path.join(grok_data_dir, "config.toml")):
            open(os.path.join(grok_data_dir, "config.toml"), 'a').close()
        if not os.path.exists(os.path.join(grok_data_dir, "auth.json")):
            open(os.path.join(grok_data_dir, "auth.json"), 'a').close()
        os.makedirs(os.path.join(agent_brain_dir, ".system_generated", "logs"), exist_ok=True)
        os.makedirs(os.path.join(agent_brain_dir, ".system_generated", "crashes"), exist_ok=True)
        os.makedirs(os.path.join(agent_brain_dir, ".system_generated", "implicit"), exist_ok=True)
        open(os.path.join(agent_brain_dir, "summary_store.db"), "a").close()
        # CRITICAL SECURITY FIX: Never copy the master OAuth token!
        # Write a dummy valid JSON payload to bypass the agy interactive login prompt when using BYOK API keys
        if client_harness != "admin-cli":
            with open(os.path.join(agent_brain_dir, "antigravity-oauth-token"), "w") as f:
                f.write('{"access_token": "ya29.dummy", "token_type": "Bearer", "refresh_token": "1//dummy", "expiry": "2099-01-01T00:00:00Z"}')
        
        # ── HARNESS SWITCH SAFETY NET ──────────────────────────────────
        # Enforce 1-email-1-session: kill ALL existing sessions for this
        # email before checking/spawning. This prevents ghost sessions
        # from harness switches, browser crashes, or failed DELETE calls.
        # The new session (target_session_override) will be created fresh.
        await kill_all_user_sessions(base_agent_name, exclude_session=target_session_override)
        # ──────────────────────────────────────────────────────────────────

        proc = await asyncio.create_subprocess_exec(
            "tmux", "has-session", "-t", target_session_override,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await proc.wait()
        
        needs_reboot = False
        if proc.returncode == 0 and client_gemini_api_key:
            env_proc = await asyncio.create_subprocess_exec(
                "tmux", "show-environment", "-t", target_session_override, "BYOK_API_KEY",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await env_proc.communicate()
            existing_key = stdout.decode().strip()
            if existing_key != f"BYOK_API_KEY={client_gemini_api_key}":
                logger.info(f"API key changed for {target_session_override}. Killing old session.")
                await asyncio.create_subprocess_exec("tmux", "kill-session", "-t", target_session_override)
                needs_reboot = True
                
        if proc.returncode != 0 or needs_reboot:
            logger.info(f"Starting TMUX session for {target_session_override}...")
            
            # Completely decoupled execution pipelines for each harness
            if client_harness == "opencode":
                cli_args = "/home/kingb/.opencode/bin/opencode --auto"
                if client_gemini_model:
                    model_mapping = {
                        "gemini-3.5-flash-lite": "gemini-flash-lite-latest",
                        "gemini-3.5-flash": "gemini-flash-latest",
                        "gemini-3.1-pro": "gemini-2.5-pro",
                        "opencode": "gemini-flash-lite-latest",
                        "admin-cli": "gemini-flash-lite-latest",
                        "grok": "gemini-flash-lite-latest"
                    }
                    mapped_model = model_mapping.get(client_gemini_model, "gemini-flash-lite-latest")
                    if "/" not in mapped_model:
                        cli_args += f" --model google/{mapped_model}"
                    else:
                        cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI 'opencode' "
                if client_gemini_api_key:
                    env_injections += f"--setenv GEMINI_API_KEY '{client_gemini_api_key}' --setenv GOOGLE_GENERATIVE_AI_API_KEY '{client_gemini_api_key}' "
                
                oauth_binds = (
                    f"--bind {agent_brain_dir}/antigravity-oauth-token /home/kingb/.gemini/antigravity-cli/antigravity-oauth-token "
                    f"--bind {agent_brain_dir}/antigravity-oauth-token /home/kingb/.opencode/opencode-oauth-token "
                )
                
                bwrap_cmd = (
                    f"bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
                    f"--tmpfs /home/kingb "
                    f"{env_injections}"
                    f"--ro-bind /home/kingb/.local /home/kingb/.local "
                    f"--ro-bind /home/kingb/.gemini /home/kingb/.gemini "
                    f"--ro-bind /home/kingb/.opencode /home/kingb/.opencode "
                    f"--bind {workspace_dir}/opencode_data /home/kingb/.local/share/opencode "
                    f"--bind /home/kingb/.gemini/antigravity-cli/bin /home/kingb/.gemini/antigravity-cli/bin "
                    f"--bind {workspace_dir} {workspace_dir} "
                    f"--bind {shared_data_dir} {workspace_dir}/shared_database "
                    f"--bind {agent_brain_dir} /home/kingb/.gemini/antigravity-cli/brain "
                    f"--bind {agent_conv_dir} /home/kingb/.gemini/antigravity-cli/conversations "
                    f"--bind /home/kingb/.gemini/trustedFolders.json /home/kingb/.gemini/trustedFolders.json "
                    f"--bind {agent_brain_dir}/.system_generated/logs /home/kingb/.gemini/antigravity-cli/log "
                    f"--bind {agent_brain_dir}/.system_generated/crashes /home/kingb/.gemini/antigravity-cli/crashes "
                    f"--bind {agent_brain_dir}/.system_generated/implicit /home/kingb/.gemini/antigravity-cli/implicit "
                    f"--bind {agent_brain_dir}/summary_store.db /home/kingb/.gemini/antigravity-cli/summary_store.db "
                    f"{oauth_binds}"
                    f"--chdir {workspace_dir} {cli_args}"
                )

            elif client_harness == "grok":
                cli_args = "/home/kingb/.grok/bin/grok --always-approve --disallowed-tools ask_question"
                if client_gemini_model:
                    model_mapping = {
                        "grok-4.5": "grok-4.5",
                        "grok-4.3": "grok-4.3",
                        "grok-beta": "grok-beta"
                    }
                    mapped_model = model_mapping.get(client_gemini_model, "grok-4.5")
                    cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI 'grok' "
                if client_gemini_api_key:
                    env_injections += f"--setenv XAI_API_KEY '{client_gemini_api_key}' "
                if client_grok_thinking:
                    cli_args += f" --reasoning-effort {client_grok_thinking}"
                
                bwrap_cmd = (
                    f"bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
                    f"--tmpfs /home/kingb "
                    f"{env_injections}"
                    f"--ro-bind /home/kingb/.local /home/kingb/.local "
                    f"--bind {workspace_dir}/grok_data /home/kingb/.grok "
                    f"--ro-bind /home/kingb/.grok/bin /home/kingb/.grok/bin "
                    f"--ro-bind /home/kingb/.grok/downloads /home/kingb/.grok/downloads "
                    f"--bind {workspace_dir} {workspace_dir} "
                    f"--bind {shared_data_dir} {workspace_dir}/shared_database "
                    f"--chdir {workspace_dir} {cli_args}"
                )

            elif client_harness == "admin-cli":
                cli_args = "/home/kingb/.local/bin/agy --dangerously-skip-permissions --log-file /dev/null"
                if client_gemini_model:
                    model_mapping = {
                        "gemini-3.5-flash-lite": "gemini-flash-lite-latest",
                        "gemini-3.5-flash": "gemini-flash-latest",
                        "gemini-3.1-pro": "gemini-2.5-pro",
                        "opencode": "gemini-flash-lite-latest",
                        "admin-cli": "gemini-flash-lite-latest",
                        "grok": "gemini-flash-lite-latest"
                    }
                    mapped_model = model_mapping.get(client_gemini_model, "gemini-flash-lite-latest")
                    cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI 'admin-cli' "
                if client_gemini_api_key:
                    env_injections += f"--setenv GEMINI_API_KEY '{client_gemini_api_key}' --setenv GOOGLE_GENERATIVE_AI_API_KEY '{client_gemini_api_key}' "
                
                bwrap_cmd = (
                    f"bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
                    f"--tmpfs /home/kingb "
                    f"{env_injections}"
                    f"--ro-bind /home/kingb/.local /home/kingb/.local "
                    f"--ro-bind /home/kingb/.gemini /home/kingb/.gemini "
                    f"--bind /home/kingb/.gemini/antigravity-cli/bin /home/kingb/.gemini/antigravity-cli/bin "
                    f"--bind {workspace_dir} {workspace_dir} "
                    f"--bind {shared_data_dir} {workspace_dir}/shared_database "
                    f"--bind {agent_brain_dir} /home/kingb/.gemini/antigravity-cli/brain "
                    f"--bind {agent_conv_dir} /home/kingb/.gemini/antigravity-cli/conversations "
                    f"--bind /home/kingb/.gemini/trustedFolders.json /home/kingb/.gemini/trustedFolders.json "
                    f"--bind {agent_brain_dir}/.system_generated/logs /home/kingb/.gemini/antigravity-cli/log "
                    f"--bind {agent_brain_dir}/.system_generated/crashes /home/kingb/.gemini/antigravity-cli/crashes "
                    f"--bind {agent_brain_dir}/.system_generated/implicit /home/kingb/.gemini/antigravity-cli/implicit "
                    f"--bind {agent_brain_dir}/summary_store.db /home/kingb/.gemini/antigravity-cli/summary_store.db "
                    f"--chdir {workspace_dir} {cli_args}"
                )
                
            else:
                # Default AGY Harness
                cli_args = "/home/kingb/.local/bin/agy --log-file /dev/null"
                if client_gemini_model:
                    model_mapping = {
                        "gemini-3.5-flash-lite": "gemini-flash-lite-latest",
                        "gemini-3.5-flash": "gemini-flash-latest",
                        "gemini-3.1-pro": "gemini-2.5-pro",
                        "opencode": "gemini-flash-lite-latest",
                        "admin-cli": "gemini-flash-lite-latest",
                        "grok": "gemini-flash-lite-latest"
                    }
                    mapped_model = model_mapping.get(client_gemini_model, "gemini-flash-lite-latest")
                    cli_args += f" --model {mapped_model}"
                
                env_injections = f"--setenv AIM_VESSEL_CLI '{client_harness}' "
                if client_gemini_api_key:
                    env_injections += f"--setenv GEMINI_API_KEY '{client_gemini_api_key}' "
                
                oauth_binds = (
                    f"--bind {agent_brain_dir}/antigravity-oauth-token /home/kingb/.gemini/antigravity-cli/antigravity-oauth-token "
                )
                
                bwrap_cmd = (
                    f"bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp "
                    f"--tmpfs /home/kingb "
                    f"{env_injections}"
                    f"--ro-bind /home/kingb/.local /home/kingb/.local "
                    f"--ro-bind /home/kingb/.gemini /home/kingb/.gemini "
                    f"--bind /home/kingb/.gemini/antigravity-cli/bin /home/kingb/.gemini/antigravity-cli/bin "
                    f"--bind {workspace_dir} {workspace_dir} "
                    f"--bind {shared_data_dir} {workspace_dir}/shared_database "
                    f"--bind {agent_brain_dir} /home/kingb/.gemini/antigravity-cli/brain "
                    f"--bind {agent_conv_dir} /home/kingb/.gemini/antigravity-cli/conversations "
                    f"--bind /home/kingb/.gemini/trustedFolders.json /home/kingb/.gemini/trustedFolders.json "
                    f"--bind {agent_brain_dir}/.system_generated/logs /home/kingb/.gemini/antigravity-cli/log "
                    f"--bind {agent_brain_dir}/.system_generated/crashes /home/kingb/.gemini/antigravity-cli/crashes "
                    f"--bind {agent_brain_dir}/.system_generated/implicit /home/kingb/.gemini/antigravity-cli/implicit "
                    f"--bind {agent_brain_dir}/summary_store.db /home/kingb/.gemini/antigravity-cli/summary_store.db "
                    f"{oauth_binds}"
                    f"--chdir {workspace_dir} {cli_args}"
                )
            with open("/tmp/bwrap_cmd.log", "w") as f: f.write(bwrap_cmd)

            start_proc = await asyncio.create_subprocess_exec(
                "tmux", "new-session", "-d", "-s", target_session_override, bwrap_cmd,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await start_proc.communicate()
            if start_proc.returncode != 0:
                logger.error(f"Failed to create TMUX session. stdout: {stdout.decode()} stderr: {stderr.decode()}")
            else:
                logger.info(f"TMUX session {target_session_override} created successfully.")
                if client_gemini_api_key:
                    subprocess.run(["tmux", "set-environment", "-t", target_session_override, "BYOK_API_KEY", client_gemini_api_key])

            # Give the CLI a moment to initialize the UI and block on the Trust prompt
            await asyncio.sleep(5)

            # Send Enter to auto-accept "Do you trust this folder?"
            subprocess.run(["tmux", "send-keys", "-t", target_session_override, "Enter"])
            await asyncio.sleep(2)


        if client_harness in ("opencode", "grok"):
            while True:
                try:
                    message = await websocket.receive_text()
                    if ENABLE_E2EE and E2EE_SECRET and not message.strip().startswith("{"):
                        message = decrypt_message(message, E2EE_SECRET)
                    print(f"DEBUG INCOMING WEBSOCKET MSG: {message}")
                    data = json.loads(message)
                    
                    if data.get("type") in ("input", "submit"):
                        prompt = data["payload"].strip()
                        if not prompt:
                            continue
                            
                        try:
                            max_time_db = 0
                            grok_file_state = (None, 0)
                            
                            try:
                                opencode_db_path = None
                                if client_harness == "grok":
                                    g_files = glob.glob(os.path.join(workspace_dir, "grok_data", "sessions", "*", "*", "chat_history.jsonl"))
                                    if g_files:
                                        g_latest = max(g_files, key=os.path.getmtime)
                                        with open(g_latest, 'r', encoding='utf-8') as f:
                                            grok_file_state = (g_latest, sum(1 for _ in f))
                                else:
                                    db_path_base = os.path.join(workspace_dir, "opencode_data", "opencode.db")
                                    if os.path.exists(db_path_base):
                                        opencode_db_path = db_path_base
                                        
                                    if opencode_db_path:
                                        import sqlite3
                                        conn = sqlite3.connect(f"file:{opencode_db_path}?mode=ro", uri=True)
                                        res = conn.execute("SELECT MAX(time_created) FROM message").fetchone()
                                        if res and res[0]:
                                            max_time_db = res[0]
                                        conn.close()
                            except Exception as e:
                                logger.error(f"Failed to get max time from db: {e}")
                                
                            subprocess.run(["tmux", "set-buffer", prompt])
                            subprocess.run(["tmux", "paste-buffer", "-p", "-t", target_session_override])
                            await asyncio.sleep(0.5)
                            subprocess.run(["tmux", "send-keys", "-t", target_session_override, "Enter"])
                            
                            clean_output = ""
                            timeout = False
                            ws_lost = False
                            start_time = time.time()
                            last_data_activity = time.time()
                            error_checked = False
                            last_status_sent = 0.0
                            last_keepalive = 0.0
                            
                            # ── EVENT-DRIVEN RESPONSE DETECTION ─────────────────────
                            # Poll data files for deterministic "done" signals:
                            #   OpenCode: step-finish part with reason=stop in SQLite
                            #   Grok: type=assistant line in chat_history.jsonl
                            # Drain client pings each cycle (prevents half-open sockets)
                            # and send reliable 15s keepalives (Cloudflare/tunnel idle).
                            while True:
                                try:
                                    await ws_drain_client_or_sleep(websocket, timeout=2.0)
                                except WebSocketDisconnect:
                                    logger.warning(
                                        f"WebSocket disconnected during {client_harness} wait "
                                        f"for {target_session_override} (agent may still be running)"
                                    )
                                    ws_lost = True
                                    break

                                now = time.time()
                                elapsed = now - start_time

                                # Keepalive every 15s wall-clock (not fragile modulo)
                                if now - last_keepalive >= 15.0:
                                    last_keepalive = now
                                    if not await ws_send_app_text(websocket, "keepalive_ping"):
                                        logger.warning(
                                            f"Keepalive send failed for {target_session_override}; "
                                            "treating socket as dead"
                                        )
                                        ws_lost = True
                                        break

                                # ── DATA SOURCE: GROK (chat_history.jsonl) ────────
                                if client_harness == "grok":
                                    g_files = glob.glob(os.path.join(workspace_dir, "grok_data", "sessions", "*", "*", "chat_history.jsonl"))
                                    if g_files:
                                        g_latest = max(g_files, key=os.path.getmtime)
                                        # Track file activity for error detection
                                        try:
                                            fmtime = os.path.getmtime(g_latest)
                                            if fmtime > last_data_activity:
                                                last_data_activity = time.time()
                                        except Exception:
                                            pass
                                        lines_to_skip = grok_file_state[1] if g_latest == grok_file_state[0] else 0
                                        texts = []
                                        try:
                                            with open(g_latest, 'r', encoding='utf-8') as f:
                                                for i, line in enumerate(f):
                                                    if i < lines_to_skip: continue
                                                    if not line.strip(): continue
                                                    try:
                                                        data = json.loads(line)
                                                        role = data.get("type", data.get("role"))
                                                        content_blocks = data.get("content", [])
                                                        if role in ["assistant", "model"] and content_blocks:
                                                            if isinstance(content_blocks, str):
                                                                texts.append(content_blocks)
                                                            elif isinstance(content_blocks, list):
                                                                for b in content_blocks:
                                                                    if isinstance(b, dict) and b.get("type") == "text":
                                                                        texts.append(b.get("text", ""))
                                                    except Exception:
                                                        pass
                                            # DONE SIGNAL: assistant line exists in JSONL
                                            if texts:
                                                clean_output = "\n\n".join(texts).strip()
                                                break
                                        except Exception as e:
                                            logger.error(f"Failed to read grok chat history: {e}")
                                
                                # ── DATA SOURCE: OPENCODE (SQLite DB) ─────────────
                                elif opencode_db_path and os.path.exists(opencode_db_path):
                                    # Track file activity for error detection
                                    try:
                                        fmtime = os.path.getmtime(opencode_db_path)
                                        if fmtime > last_data_activity:
                                            last_data_activity = time.time()
                                    except Exception:
                                        pass
                                    try:
                                        def _poll_opencode(db_path, min_time):
                                            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
                                            try:
                                                query = '''
                                                SELECT m.data, p.data
                                                FROM message m
                                                JOIN part p ON m.id = p.message_id
                                                WHERE m.time_created > ?
                                                ORDER BY m.time_created ASC, p.time_created ASC
                                                '''
                                                return conn.execute(query, (min_time,)).fetchall()
                                            finally:
                                                conn.close()

                                        rows = await asyncio.to_thread(
                                            _poll_opencode, opencode_db_path, max_time_db
                                        )
                                        texts = []
                                        has_step_finish = False
                                        for r in rows:
                                            m_data = json.loads(r[0])
                                            p_data = json.loads(r[1])
                                            if m_data.get("role") == "assistant":
                                                if p_data.get("type") == "text" and p_data.get("text"):
                                                    texts.append(p_data.get("text"))
                                                elif p_data.get("type") == "step-finish" and p_data.get("reason") == "stop":
                                                    has_step_finish = True
                                        
                                        # DONE SIGNAL: text parts exist AND step-finish confirms completion
                                        if texts and has_step_finish:
                                            clean_output = "\n\n".join(texts).strip()
                                            break
                                    except Exception as e:
                                        logger.error(f"Failed to extract text from opencode db: {e} PATH WAS: {opencode_db_path}")
                                
                                # ── ERROR DETECTION FALLBACK ──────────────────────
                                # If data file hasn't been touched in 10s, something
                                # is likely wrong. Check the tmux pane ONCE for error
                                # messages (bad API key, auth failure, etc).
                                if time.time() - last_data_activity > 10 and not error_checked:
                                    error_checked = True
                                    try:
                                        p_err = await asyncio.create_subprocess_exec(
                                            "tmux", "capture-pane", "-p", "-S", "-200", "-t", target_session_override,
                                            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
                                        )
                                        err_stdout, _ = await p_err.communicate()
                                        pane_out = err_stdout.decode().strip()
                                        error_patterns = [
                                            "invalid api key", "api key not valid", "permission_denied",
                                            "quota exceeded", "resource_exhausted", "could not authenticate",
                                            "authentication failed", "unauthorized", "rate limit",
                                            "could not connect", "login required", "unauthenticated",
                                            "error:", "fatal:", "connection refused", "network error",
                                            "exceeded your current quota", "billing",
                                        ]
                                        pane_lower = pane_out.lower()
                                        for pattern in error_patterns:
                                            if pattern in pane_lower:
                                                # Extract lines near the error, not the bottom of the TUI
                                                all_lines = [l for l in pane_out.split('\n') if l.strip()]
                                                error_context = []
                                                for idx, line in enumerate(all_lines):
                                                    if pattern in line.lower():
                                                        # Grab 2 lines before and 4 lines after the match
                                                        start = max(0, idx - 2)
                                                        end = min(len(all_lines), idx + 5)
                                                        error_context = all_lines[start:end]
                                                        break
                                                if not error_context:
                                                    error_context = all_lines[-8:]
                                                clean_output = (
                                                    f"**\u26a0\ufe0f {client_harness.upper()} Error Detected:**\n\n"
                                                    f"```\n" + "\n".join(error_context) + f"\n```\n\n"
                                                    f"**Tip:** Check your API key in the BYOK Panel and ensure it is valid."
                                                )
                                                break
                                    except Exception as e:
                                        logger.warning(f"Error detection pane capture failed: {e}")
                                    if clean_output:
                                        break
                                
                                # ── "STILL WORKING" FEEDBACK (structured status) ──
                                if elapsed > 30 and elapsed - last_status_sent > 45:
                                    last_status_sent = elapsed
                                    status_payload = json.dumps({
                                        "type": "status",
                                        "message": f"⏳ Agent is still working... ({int(elapsed)}s elapsed)",
                                    })
                                    if not await ws_send_app_text(websocket, status_payload):
                                        ws_lost = True
                                        break
                                
                                # ── HARD TIMEOUT: 600s (10 minutes) ──────────────
                                if elapsed > 600:
                                    timeout = True
                                    break

                            if ws_lost:
                                # Agent keeps running in tmux; do not pretend a response arrived
                                continue
                                        
                            if timeout or not clean_output:
                                clean_output = f"**System:** Sent to {client_harness.capitalize()} terminal, but timed out waiting for stable output.\n\n⚠️ **If this is your first request or you recently changed models, please check your BYOK Panel and ensure your API Key is valid and saved.**"
                                
                            try:
                                if ENABLE_E2EE and E2EE_SECRET:
                                    encrypted = encrypt_bytes(clean_output.encode(), E2EE_SECRET)
                                    logger.info(f"Sending E2EE bytes back to frontend: {clean_output[:100]}...")
                                    await websocket.send_bytes(encrypted)
                                else:
                                    logger.info(f"Sending response back to frontend: {clean_output}")
                                    await websocket.send_text(clean_output)
                            except RuntimeError:
                                logger.warning("WebSocket already closed, could not deliver response.")
                                
                        except Exception as e:
                            error_msg = f"**Tmux Bridge Error:** {str(e)}"
                            logger.error(error_msg)
                            try:
                                if ENABLE_E2EE and E2EE_SECRET:
                                    await websocket.send_bytes(encrypt_bytes(error_msg.encode(), E2EE_SECRET))
                                else:
                                    await websocket.send_text(error_msg)
                            except RuntimeError:
                                logger.warning("WebSocket already closed, could not deliver error message.")
                            
                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected (opencode/grok chat loop)")
                    break
                except Exception as e:
                    logger.error(f"Chat API loop error: {e}", exc_info=True)
                    break
        elif client_harness == "admin-cli":
            while True:
                try:
                    message = await websocket.receive_text()
                    if ENABLE_E2EE and E2EE_SECRET and not message.strip().startswith("{"):
                        message = decrypt_message(message, E2EE_SECRET)
                    print(f"DEBUG INCOMING WEBSOCKET MSG: {message}")
                    data = json.loads(message)
                    
                    if data.get("type") in ("input", "submit"):
                        prompt = data["payload"].strip()
                        if not prompt:
                            continue
                            
                        try:
                            log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
                            log_file = None
                            last_pos = 0
                            if log_files:
                                log_file = max(log_files, key=os.path.getmtime)
                                if os.path.exists(log_file):
                                    with open(log_file, "r") as f:
                                        f.seek(0, 2)
                                        last_pos = f.tell()
                            
                            subprocess.run(["tmux", "set-buffer", prompt])
                            subprocess.run(["tmux", "paste-buffer", "-p", "-t", target_session_override])
                            sleep_time = max(0.5, len(prompt) / 20000.0)
                            await asyncio.sleep(sleep_time)
                            subprocess.run(["tmux", "send-keys", "-t", target_session_override, "Enter"])
                            
                            clean_output = "**Error:** Agent timed out or failed to write transcript."
                            start_time = time.time()
                            last_status_sent = 0.0
                            last_keepalive = 0.0
                            ws_lost = False
                            found_response = False
                            while time.time() - start_time < 600:
                                try:
                                    await ws_drain_client_or_sleep(websocket, timeout=2.0)
                                except WebSocketDisconnect:
                                    ws_lost = True
                                    break

                                now = time.time()
                                elapsed = now - start_time

                                if now - last_keepalive >= 15.0:
                                    last_keepalive = now
                                    if not await ws_send_app_text(websocket, "keepalive_ping"):
                                        ws_lost = True
                                        break

                                if elapsed > 30 and elapsed - last_status_sent > 45:
                                    last_status_sent = elapsed
                                    status_payload = json.dumps({
                                        "type": "status",
                                        "message": f"⏳ Agent is still working... ({int(elapsed)}s elapsed)",
                                    })
                                    if not await ws_send_app_text(websocket, status_payload):
                                        ws_lost = True
                                        break
                                
                                current_log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
                                if current_log_files:
                                    current_newest = max(current_log_files, key=os.path.getmtime)
                                    if current_newest != log_file:
                                        log_file = current_newest
                                        last_pos = 0
                                        
                                if log_file and os.path.exists(log_file):
                                    with open(log_file, "r") as f:
                                        f.seek(last_pos)
                                        lines = f.readlines()
                                        
                                        for line in lines:
                                            if not line.endswith("\n"):
                                                break
                                            last_pos += len(line)
                                            try:
                                                log_data = json.loads(line)
                                                if log_data.get("source") == "MODEL" and log_data.get("type") == "PLANNER_RESPONSE":
                                                    content = log_data.get("content")
                                                    tool_calls = log_data.get("tool_calls")
                                                    if content and not tool_calls:
                                                        clean_output = content
                                                        found_response = True
                                            except Exception:
                                                pass
                                                
                                        if found_response:
                                            break
                                if found_response:
                                    break

                            if ws_lost:
                                continue
                                
                            if ENABLE_E2EE and E2EE_SECRET:
                                encrypted = encrypt_bytes(clean_output.encode(), E2EE_SECRET)
                                logger.info(f"Sending E2EE bytes back to frontend: {clean_output[:100]}...")
                                await websocket.send_bytes(encrypted)
                            else:
                                logger.info(f"Sending response back to frontend: {clean_output}")
                                await websocket.send_text(clean_output)
                        except Exception as e:
                            error_msg = f"**Tmux Bridge Error:** {str(e)}"
                            logger.error(error_msg)
                            if ENABLE_E2EE and E2EE_SECRET:
                                await websocket.send_bytes(encrypt_bytes(error_msg.encode(), E2EE_SECRET))
                            else:
                                await websocket.send_text(error_msg)
                            
                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected (admin-cli chat loop)")
                    break
                except Exception as e:
                    logger.error(f"Chat API loop error: {e}")
                    break
        else:  # agy
            while True:
                try:
                    message = await websocket.receive_text()
                    if ENABLE_E2EE and E2EE_SECRET and not message.strip().startswith("{"):
                        message = decrypt_message(message, E2EE_SECRET)
                    print(f"DEBUG INCOMING WEBSOCKET MSG: {message}")
                    data = json.loads(message)
                    
                    if data.get("type") in ("input", "submit"):
                        prompt = data["payload"].strip()
                        if not prompt:
                            continue
                            
                        try:
                            log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
                            log_file = None
                            last_pos = 0
                            if log_files:
                                log_file = max(log_files, key=os.path.getmtime)
                                if os.path.exists(log_file):
                                    with open(log_file, "r") as f:
                                        f.seek(0, 2)
                                        last_pos = f.tell()
                            
                            subprocess.run(["tmux", "set-buffer", prompt])
                            subprocess.run(["tmux", "paste-buffer", "-p", "-t", target_session_override])
                            sleep_time = max(0.5, len(prompt) / 20000.0)
                            await asyncio.sleep(sleep_time)
                            subprocess.run(["tmux", "send-keys", "-t", target_session_override, "Enter"])
                            
                            clean_output = "**Error:** Agent timed out or failed to write transcript."
                            start_time = time.time()
                            last_status_sent = 0.0
                            last_keepalive = 0.0
                            ws_lost = False
                            found_response = False
                            while time.time() - start_time < 600:
                                try:
                                    await ws_drain_client_or_sleep(websocket, timeout=2.0)
                                except WebSocketDisconnect:
                                    ws_lost = True
                                    break

                                now = time.time()
                                elapsed = now - start_time

                                if now - last_keepalive >= 15.0:
                                    last_keepalive = now
                                    if not await ws_send_app_text(websocket, "keepalive_ping"):
                                        ws_lost = True
                                        break

                                if elapsed > 30 and elapsed - last_status_sent > 45:
                                    last_status_sent = elapsed
                                    status_payload = json.dumps({
                                        "type": "status",
                                        "message": f"⏳ Agent is still working... ({int(elapsed)}s elapsed)",
                                    })
                                    if not await ws_send_app_text(websocket, status_payload):
                                        ws_lost = True
                                        break
                                
                                current_log_files = glob.glob(os.path.join(agent_brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))
                                if current_log_files:
                                    current_newest = max(current_log_files, key=os.path.getmtime)
                                    if current_newest != log_file:
                                        log_file = current_newest
                                        last_pos = 0
                                        
                                if log_file and os.path.exists(log_file):
                                    with open(log_file, "r") as f:
                                        f.seek(last_pos)
                                        lines = f.readlines()
                                        
                                        for line in lines:
                                            if not line.endswith("\n"):
                                                break
                                            last_pos += len(line)
                                            try:
                                                log_data = json.loads(line)
                                                if log_data.get("source") == "MODEL" and log_data.get("type") == "PLANNER_RESPONSE":
                                                    content = log_data.get("content")
                                                    tool_calls = log_data.get("tool_calls")
                                                    if content and not tool_calls:
                                                        clean_output = content
                                                        found_response = True
                                            except Exception:
                                                pass
                                                
                                        if found_response:
                                            break
                                if found_response:
                                    break

                            if ws_lost:
                                continue
                                
                            if ENABLE_E2EE and E2EE_SECRET:
                                encrypted = encrypt_bytes(clean_output.encode(), E2EE_SECRET)
                                logger.info(f"Sending E2EE bytes back to frontend: {clean_output[:100]}...")
                                await websocket.send_bytes(encrypted)
                            else:
                                logger.info(f"Sending response back to frontend: {clean_output}")
                                await websocket.send_text(clean_output)
                                
                        except Exception as e:
                            error_msg = f"**Tmux Bridge Error:** {str(e)}"
                            logger.error(error_msg)
                            if ENABLE_E2EE and E2EE_SECRET:
                                await websocket.send_bytes(encrypt_bytes(error_msg.encode(), E2EE_SECRET))
                            else:
                                await websocket.send_text(error_msg)
                            
                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected (agy chat loop)")
                    break
                except Exception as e:
                    logger.error(f"Chat API loop error: {e}")
                    break
        return

    # ADMIN CONNECTIONS (RAW PTY & TMUX MODE)
    # =====================================================================
    # Resolve target_session BEFORE forking so both parent and child processes know the session name
    target_session = target_session_override
    if not target_session:
        # Find a tmux session that isn't one of our internal aim-* services
        result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                if line and not line.startswith("aim-"):
                    target_session = line
                    break
        if not target_session:
            target_session = "aim-connect-main"

    is_new_session = False
    result = subprocess.run(["tmux", "has-session", "-t", target_session], capture_output=True)
    if result.returncode != 0:
        is_new_session = True
        
    pid, fd = pty.fork()
    if pid == 0:
        
        # Ensure a valid terminal type for tmux
        os.environ["TERM"] = "xterm-256color"
        
        # Unset TMUX to avoid nesting errors
        if "TMUX" in os.environ:
            del os.environ["TMUX"]
        
        # Set standard terminal size
        def set_winsize(fd, row, col):
            winsize = struct.pack("HHHH", row, col, 0, 0)
            fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
        
        set_winsize(sys.stdout.fileno(), 24, 80)
            
        # Ensure mouse support is enabled globally for mobile scroll sync
        subprocess.run(["tmux", "set-option", "-g", "mouse", "on"])
            
        result = subprocess.run(["tmux", "new-session", "-d", "-s", target_session], capture_output=True)
        if result.returncode == 0:
            admin_cli = f"export AIM_VESSEL_CLI={client_harness} && agy --log-file /dev/null"
            subprocess.run(["tmux", "send-keys", "-t", target_session, admin_cli, "Enter"])
        os.execvp("tmux", ["tmux", "attach", "-t", target_session])
    
    # Parent process
    loop = asyncio.get_event_loop()
    
    last_activity = time.time()
    INACTIVITY_TIMEOUT = 86400 # 24 hours

    async def read_from_pty():
        nonlocal last_activity
        loop = asyncio.get_running_loop()
        while True:
            try:
                data = await loop.run_in_executor(None, os.read, fd, 1024)
                if not data:
                    break
                if ENABLE_E2EE and E2EE_SECRET:
                    data = encrypt_bytes(data, E2EE_SECRET)
                await websocket.send_bytes(data)
                last_activity = time.time()
            except Exception as e:
                logger.error(f"PTY read error: {e}")
                break

    async def write_to_pty():
        nonlocal last_activity
        while True:
            try:
                message = await websocket.receive_text()
                last_activity = time.time()
                try:
                    if ENABLE_E2EE and E2EE_SECRET and not message.strip().startswith("{"):
                        message = decrypt_message(message, E2EE_SECRET)
                    data = json.loads(message)
                    if data.get("type") == "input":
                        os.write(fd, data["payload"].encode("utf-8"))
                    elif data.get("type") == "submit":
                        import asyncio
                        text = data.get("payload", "")
                        logger.info(f"Executing aim-communicate for {target_session} with {text}")
                        async def execute_aim_communicate(session_name, msg_text):
                            nonlocal is_new_session
                            if is_new_session:
                                # Wait 4 seconds for agy to finish booting
                                await asyncio.sleep(4)
                                is_new_session = False
                                
                            # 1. Load into buffer
                            proc1 = await asyncio.create_subprocess_exec("tmux", "set-buffer", msg_text)
                            await proc1.wait()
                            # 2. Paste buffer with bracketed paste (-p)
                            proc2 = await asyncio.create_subprocess_exec("tmux", "paste-buffer", "-p", "-t", session_name)
                            await proc2.wait()
                            # 3. Sleep 1 second
                            await asyncio.sleep(1)
                            # 4. Send Escape then Enter to submit multi-line blocks in Textual
                            proc3 = await asyncio.create_subprocess_exec("tmux", "send-keys", "-t", session_name, "Escape")
                            await proc3.wait()
                            proc4 = await asyncio.create_subprocess_exec("tmux", "send-keys", "-t", session_name, "Enter")
                            await proc4.wait()
                        
                        # Run it in the background so it doesn't block other messages
                        asyncio.create_task(execute_aim_communicate(target_session, text))
                    elif data.get("type") == "resize":
                        set_pty_size(fd, data["rows"], data["cols"])
                    elif data.get("type") == "switch_session":
                        # We must find the client tty attached to this specific pid

                        result = subprocess.run(["tmux", "list-clients", "-F", "#{client_tty} #{client_pid}"], capture_output=True, text=True)
                        client_tty = None
                        for line in result.stdout.strip().split('\n'):
                            if line:
                                parts = line.split()
                                if len(parts) >= 2 and parts[1] == str(pid):
                                    client_tty = parts[0]
                                    break
                        
                        if client_tty:
                            subprocess.run(["tmux", "switch-client", "-c", client_tty, "-t", data["session"]])
                        else:
                            logger.warning(f"Could not find tmux client for pid {pid}")
                except json.JSONDecodeError:
                    os.write(fd, message.encode("utf-8"))
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected")
                break
            except Exception as e:
                logger.error(f"PTY write error: {e}")
                break

    async def inactivity_monitor():
        while True:
            await asyncio.sleep(10)
            if time.time() - last_activity > INACTIVITY_TIMEOUT:
                logger.warning(f"Closing websocket due to inactivity timeout ({INACTIVITY_TIMEOUT}s)")
                await websocket.close(code=1008, reason="Inactivity timeout")
                break

    task1 = asyncio.create_task(read_from_pty())
    task2 = asyncio.create_task(write_to_pty())
    task3 = asyncio.create_task(inactivity_monitor())

    done, pending = await asyncio.wait(
        [task1, task2, task3],
        return_when=asyncio.FIRST_COMPLETED
    )
    
    for task in pending:
        task.cancel()

# --- WebAuthn Endpoints ---
from webauthn_manager import webauthn_mgr
from pydantic import BaseModel

class WebAuthnVerifyReq(BaseModel):
    response: dict

class WebAuthnAuthReq(BaseModel):
    username: str = "admin"

class WebAuthnAuthVerifyReq(BaseModel):
    username: str = "admin"
    response: dict

@app.get("/api/webauthn/register/options", dependencies=[Depends(verify_token)])
def webauthn_register_options(request: Request, x_api_token: str = Header(None)):
    role, username = _get_user_from_token(x_api_token)
    user_key = username or "admin"
    options = webauthn_mgr.generate_registration(user_key, rp_id="leaddeeds.com")
    return {"options": options}

@app.post("/api/webauthn/register/verify", dependencies=[Depends(verify_token)])
def webauthn_register_verify(req: WebAuthnVerifyReq, request: Request, x_api_token: str = Header(None)):
    role, username = _get_user_from_token(x_api_token)
    user_key = username or "admin"
    origin = request.headers.get("origin") or f"{request.url.scheme}://{request.headers.get('host', request.url.netloc)}"
    success = webauthn_mgr.verify_registration(user_key, req.response, rp_id="leaddeeds.com", origin=origin)
    if not success:
        raise HTTPException(status_code=400, detail="Registration failed")
    return {"status": "success"}

@app.post("/api/webauthn/authenticate/options")
def webauthn_auth_options(req: WebAuthnAuthReq, request: Request):
    user_name = req.username
    if not users_db:
        user_name = "admin"
        
    options = webauthn_mgr.generate_authentication(user_name, rp_id="leaddeeds.com")
    if not options:
        raise HTTPException(status_code=404, detail="No credentials found")
    return {"options": options}

@app.post("/api/webauthn/authenticate/verify")
def webauthn_auth_verify(req: WebAuthnAuthVerifyReq, request: Request):
    user_name = req.username
    if not users_db:
        user_name = "admin"
        
    origin = request.headers.get("origin") or f"{request.url.scheme}://{request.headers.get('host', request.url.netloc)}"
    if request.headers.get('x-forwarded-proto') == 'https' and not request.headers.get("origin"):
        origin = f"https://{request.headers.get('host', request.url.netloc)}"
    success = webauthn_mgr.verify_authentication(user_name, req.response, rp_id="leaddeeds.com", origin=origin)
    if not success:
        raise HTTPException(status_code=401, detail="Authentication failed")
        
    # Generate token since WebAuthn succeeded
    new_token = secrets.token_hex(32)
    role = "admin" if not users_db else users_db.get(user_name, {}).get("role", "user")
    VALID_API_TOKENS[new_token] = {
        "expires": time.time() + TOKEN_TTL,
        "user": user_name,
        "role": role
    }
    save_tokens()
    return {"token": new_token, "role": role}


frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")

@app.delete("/api/fleet/sessions/{agent_id}")
async def delete_fleet_session(agent_id: str, token: str = Query(None)):
    if not token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    try:
        _verify_dashboard_jwt(token)
        
        parts = token.split(".")
        import base64
        def pad_b64(data): return data + "=" * (-len(data) % 4)
        payload = json.loads(base64.urlsafe_b64decode(pad_b64(parts[0])).decode())
        
        email = payload.get("e")
        if not email:
            return JSONResponse({"error": "Invalid payload"}, status_code=401)

        workspace_id = resolve_workspace_id_for_email(email)
        legacy_id = legacy_sanitize_email(email)
        allowed = list(dict.fromkeys([f"agent-{workspace_id}", f"agent-{legacy_id}"]))
        if not any(agent_id == b or agent_id.startswith(b + "-") for b in allowed):
            return JSONResponse({"error": "Unauthorized access to this agent"}, status_code=403)

        # Map frontend legacy agent_id → live tmux session prefix (op_*)
        kill_target = agent_id
        for leg, real in ((f"agent-{legacy_id}", f"agent-{workspace_id}"),):
            if leg != real and (agent_id == leg or agent_id.startswith(leg + "-")):
                kill_target = real + agent_id[len(leg):]
                break

        proc = await asyncio.create_subprocess_exec("tmux", "kill-session", "-t", kill_target)
        await proc.wait()
        # Also try the raw id if different (belt and suspenders)
        if kill_target != agent_id:
            await asyncio.create_subprocess_exec("tmux", "kill-session", "-t", agent_id)
        return {"status": "killed", "agent_id": kill_target}
        
    except Exception as e:
        logger.error(f"Fleet delete error: {e}")
        return JSONResponse({"error": "Token parsing failed"}, status_code=401)

@app.get("/api/fleet/sessions/{agent_id}")
async def get_fleet_sessions(agent_id: str, token: str = Query(None)):
    if not token:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return JSONResponse({"error": "Invalid Token Format"}, status_code=401)
            
        payload_b64, signature_b64 = parts
        secret = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "")
        if not secret:
            return JSONResponse({"error": "Missing Secret"}, status_code=500)
            
        def pad_b64(data):
            return data + "=" * (-len(data) % 4)
            
        expected_mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_mac).decode().rstrip("=")
        
        if signature_b64.rstrip("=") != expected_b64:
            return JSONResponse({"error": "Invalid Signature"}, status_code=401)
            
        payload = json.loads(base64.urlsafe_b64decode(pad_b64(payload_b64)).decode())
        email = payload.get("e")
        if not email:
            return JSONResponse({"error": "Missing Email"}, status_code=401)

        workspace_id = resolve_workspace_id_for_email(email)
        legacy_id = legacy_sanitize_email(email)
        allowed = list(dict.fromkeys([f"agent-{workspace_id}", f"agent-{legacy_id}"]))
        if agent_id not in allowed:
            return JSONResponse({"error": "Agent ID Mismatch"}, status_code=403)

        # Prefer registry workspace for live tmux naming
        session_prefix = f"agent-{workspace_id}"
            
    except Exception as e:
        return JSONResponse({"error": "Token Parsing Failed"}, status_code=401)


    result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
    sessions = []
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            # Match only sub-sessions like agent-{id}-chat-123, exclude primary harness session
            if line and line.startswith(f"{session_prefix}-"):
                sub_id_part = line[len(f"{session_prefix}-"):]
                # A regular session is just 'harness' (no hyphens). A sub-session is 'harness-subid' (has hyphen).
                if "-" in sub_id_part and sub_id_part not in ["admin-cli", "google-ai", "google-news", "google-web"]:
                    sessions.append({"id": sub_id_part, "full_name": line})
                
    return {"sessions": sessions}

@app.get("/download/{agent_id}")
async def download_file(agent_id: str, filepath: str = Query(...), token: str = Query(None)):
    if not token:
        return HTMLResponse("<h1>401 UNAUTHORIZED: Access Denied.</h1>", status_code=401)
        
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return HTMLResponse("<h1>401 UNAUTHORIZED: Invalid Token Format.</h1>", status_code=401)
            
        payload_b64, signature_b64 = parts
        secret = os.environ.get("LEADDEED_DOWNLOAD_SIGNING_SECRET", "")
        if not secret:
            return HTMLResponse("<h1>500 INTERNAL ERROR: Missing Secret.</h1>", status_code=500)
            
        def pad_b64(data):
            return data + "=" * (-len(data) % 4)
            
        expected_mac = hmac.new(secret.encode(), payload_b64.encode(), hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_mac).decode().rstrip("=")
        
        if signature_b64.rstrip("=") != expected_b64:
            return HTMLResponse("<h1>401 UNAUTHORIZED: Invalid Signature.</h1>", status_code=401)
            
        payload = json.loads(base64.urlsafe_b64decode(pad_b64(payload_b64)).decode())
        email = payload.get("e")
        if not email:
            return HTMLResponse("<h1>401 UNAUTHORIZED: Missing Email.</h1>", status_code=401)
            
        workspace_id = resolve_workspace_id_for_email(email)
        legacy_id = legacy_sanitize_email(email)
        allowed = list(dict.fromkeys([f"agent-{workspace_id}", f"agent-{legacy_id}"]))
        if not any(agent_id == b or agent_id.startswith(b + "-") for b in allowed):
            return HTMLResponse("<h1>403 FORBIDDEN: Agent ID Mismatch.</h1>", status_code=403)

        # Always open registry-resolved workspace on disk
        workspace_dir = f"/home/kingb/aim-connect/agent_workspaces/agent-{workspace_id}"
            
    except Exception as e:
        return HTMLResponse("<h1>401 UNAUTHORIZED: Token Parsing Failed.</h1>", status_code=401)
    
    # Security: Ensure the requested filepath is an absolute path within the workspace
    if not filepath.startswith("/"):
        # If relative, assume it's relative to workspace
        target_path = os.path.abspath(os.path.join(workspace_dir, filepath))
    else:
        target_path = os.path.abspath(filepath)
        
    if not target_path.startswith(os.path.abspath(workspace_dir)):
        return HTMLResponse("<h1>403 FORBIDDEN: Path Traversal Detected.</h1>", status_code=403)
        
    if not os.path.isfile(target_path):
        return HTMLResponse("<h1>404 NOT FOUND: File does not exist.</h1>", status_code=404)
        
    filename = os.path.basename(target_path)
    return FileResponse(target_path, filename=filename)


if os.path.exists(frontend_path):
    # Mount Vite static assets
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")
    
    # Catch-all for SPA routing
    @app.get("/{catchall:path}")
    def serve_frontend(catchall: str):
        base = os.path.realpath(frontend_path)
        file_path = os.path.realpath(os.path.join(base, catchall))
        if file_path != base and not file_path.startswith(base + os.sep):
            return FileResponse(os.path.join(frontend_path, "index.html"), headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache", "Expires": "0"})
            
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            file_path = os.path.join(frontend_path, "index.html")
            
        if file_path.endswith("manifest.json"):
            import json
            from fastapi.responses import JSONResponse
            with open(file_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            app_name = os.environ.get("AIM_APP_NAME")
            if app_name:
                manifest["name"] = app_name
                manifest["short_name"] = app_name
                import urllib.parse
                safe_id = urllib.parse.quote(app_name.lower().replace(' ', '-'))
                manifest["id"] = f"/?id={safe_id}"
                manifest["start_url"] = f"/?id={safe_id}"
            app_color = os.environ.get("AIM_APP_COLOR")
            if app_color:
                manifest["background_color"] = app_color
                manifest["theme_color"] = app_color
            return JSONResponse(manifest)

        if file_path.endswith("index.html"):
            headers = {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
            app_name = os.environ.get("AIM_APP_NAME")
            if app_name:
                from fastapi.responses import HTMLResponse
                with open(file_path, "r", encoding="utf-8") as f:
                    html = f.read()
                html = html.replace("<title>A.I.M. Connect</title>", f"<title>{app_name}</title>")
                return HTMLResponse(content=html, headers=headers)
            
            return FileResponse(file_path, headers=headers)

        return FileResponse(file_path)
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
