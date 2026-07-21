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
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Header, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import logging
import time
import re
from e2ee import encrypt_bytes, decrypt_message

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aim-connect")

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
    allow_origins=os.environ.get("CORS_ORIGINS", "").split(",") if os.environ.get("CORS_ORIGINS") else ["http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
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
    import subprocess
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

@app.post("/api/sessions", dependencies=[Depends(verify_token)])
def create_session(req: SessionRequest) -> dict:
    """Spawns a new detached tmux session and enables global mouse support."""
    if not SESSION_NAME_RE.match(req.name):
        raise HTTPException(status_code=400, detail="Invalid session name. Use only letters, numbers, hyphens, underscores (max 64 chars).")
    import subprocess
    result = subprocess.run(["tmux", "new-session", "-d", "-s", req.name], capture_output=True, text=True)
    if result.returncode == 0:
        subprocess.run(["tmux", "set-option", "-g", "mouse", "on"])
        return {"status": "success"}
    return {"error": result.stderr}

@app.delete("/api/sessions/{name}", dependencies=[Depends(verify_token)])
def kill_session(name: str):
    import subprocess
    result = subprocess.run(["tmux", "kill-session", "-t", name], capture_output=True, text=True)
    if result.returncode == 0:
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
            items.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
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
    import subprocess
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
    try:
        auth_message = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        data = json.loads(auth_message)
        if data.get("type") == "auth":
            token = data.get("token", "")
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
                                    sanitized_email = re.sub(r'[^a-zA-Z0-9]', '_', email)
                                    target_session_override = f"agent-{sanitized_email}"
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
        
        
        workspace_dir = f"/home/kingb/aim-connect/agent_workspaces/{target_session_override}"
        os.makedirs(workspace_dir, exist_ok=True)
        
        with open(os.path.join(workspace_dir, "AGENTS.md"), "w") as f:
            f.write("# Genesis AI Persona\\n\\nYou are Genesis AI, a sovereign intelligence node.\\n\\n## Rules:\\n1. Always respond in sleek Markdown.\\n2. You are sandboxed. Do not attempt to read or write files outside of your workspace.\\n3. Act as a high-tier conversational AI.\\n")
        
        while True:
            try:
                message = await websocket.receive_text()
                if ENABLE_E2EE and E2EE_SECRET:
                    message = decrypt_message(message, E2EE_SECRET)
                data = json.loads(message)
                
                if data.get("type") == "input":
                    prompt = data["payload"].strip()
                    if not prompt:
                        continue
                        
                    # Bubblewrap Sandbox: Read-only root filesystem, but read-write persistent workspace folder
                    bwrap_cmd = f"bwrap --ro-bind / / --dev /dev --proc /proc --bind /tmp /tmp --bind {workspace_dir} {workspace_dir} --chdir {workspace_dir} /home/kingb/.local/bin/agy -c -p {shlex.quote(prompt)}"
                    
                    proc = await asyncio.create_subprocess_shell(
                        bwrap_cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    stdout, stderr = await proc.communicate()
                    clean_output = stdout.decode()
                    
                    # If agy threw an error in stderr (e.g. timeout), append it to help debugging
                    if proc.returncode != 0 and not clean_output:
                        clean_output = f"**Agent Error:**\\n```\\n{stderr.decode()}\\n```"
                    
                    if ENABLE_E2EE and E2EE_SECRET:
                        encrypted = encrypt_bytes(clean_output.encode(), E2EE_SECRET)
                        await websocket.send_bytes(encrypted)
                    else:
                        await websocket.send_text(clean_output)
                        
            except Exception as e:
                logger.error(f"Chat API loop error: {e}")
                break
        return

    # =====================================================================
    # ADMIN CONNECTIONS (RAW PTY & TMUX MODE)
    # =====================================================================
    # For the bridge, we'll try to hook into the user's tmux session
    pid, fd = pty.fork()
    if pid == 0:
        import subprocess
        
        # Ensure a valid terminal type for tmux
        os.environ["TERM"] = "xterm-256color"
        
        # Unset TMUX to avoid nesting errors
        if "TMUX" in os.environ:
            del os.environ["TMUX"]
            
        # Ensure mouse support is enabled globally for mobile scroll sync
        subprocess.run(["tmux", "set-option", "-g", "mouse", "on"])
            
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
                
        result = subprocess.run(["tmux", "new-session", "-d", "-s", target_session], capture_output=True)
        if result.returncode == 0:
            subprocess.run(["tmux", "send-keys", "-t", target_session, "agy", "Enter"])
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
                    if ENABLE_E2EE and E2EE_SECRET:
                        message = decrypt_message(message, E2EE_SECRET)
                    data = json.loads(message)
                    if data.get("type") == "input":
                        os.write(fd, data["payload"].encode("utf-8"))
                    elif data.get("type") == "resize":
                        set_pty_size(fd, data["rows"], data["cols"])
                    elif data.get("type") == "switch_session":
                        # We must find the client tty attached to this specific pid
                        import subprocess
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
    options = webauthn_mgr.generate_registration(user_key, rp_id=request.url.hostname)
    return {"options": options}

@app.post("/api/webauthn/register/verify", dependencies=[Depends(verify_token)])
def webauthn_register_verify(req: WebAuthnVerifyReq, request: Request, x_api_token: str = Header(None)):
    role, username = _get_user_from_token(x_api_token)
    user_key = username or "admin"
    origin = f"{request.url.scheme}://{request.headers.get('host', request.url.netloc)}"
    success = webauthn_mgr.verify_registration(user_key, req.response, rp_id=request.url.hostname, origin=origin)
    if not success:
        raise HTTPException(status_code=400, detail="Registration failed")
    return {"status": "success"}

@app.post("/api/webauthn/authenticate/options")
def webauthn_auth_options(req: WebAuthnAuthReq, request: Request):
    user_name = req.username
    if not users_db:
        user_name = "admin"
        
    options = webauthn_mgr.generate_authentication(user_name, rp_id=request.url.hostname)
    if not options:
        raise HTTPException(status_code=404, detail="No credentials found")
    return {"options": options}

@app.post("/api/webauthn/authenticate/verify")
def webauthn_auth_verify(req: WebAuthnAuthVerifyReq, request: Request):
    user_name = req.username
    if not users_db:
        user_name = "admin"
        
    origin = f"{request.url.scheme}://{request.headers.get('host', request.url.netloc)}"
    # ngrok usually terminates HTTPS but forwards as HTTP. If headers indicate https, force it.
    if request.headers.get('x-forwarded-proto') == 'https':
        origin = f"https://{request.headers.get('host', request.url.netloc)}"

    success = webauthn_mgr.verify_authentication(user_name, req.response, rp_id=request.url.hostname, origin=origin)
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

