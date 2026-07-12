import pty
import os
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
from fastapi.responses import FileResponse
import logging
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aim-connect")

app = FastAPI()

ALLOWED_IPS = os.environ.get("ALLOWED_IPS", "")
auth_attempts = {}
MAX_AUTH_ATTEMPTS = 5
LOCKOUT_TIME = 300 # 5 minutes

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "").split(",") if os.environ.get("CORS_ORIGINS") else ["http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        uri = pyotp.totp.TOTP(secret).provisioning_uri(name="aim-agy", issuer_name="aim-connect")
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

def set_pty_size(fd: int, rows: int, cols: int) -> None:
    """Resizes the underlying pseudo-terminal using an ioctl syscall."""
    winsize = struct.pack("HHHH", rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

VALID_API_TOKENS = set()

def verify_token(x_api_token: str = Header(None)):
    if not x_api_token or x_api_token not in VALID_API_TOKENS:
        raise HTTPException(status_code=401, detail="Unauthorized API Access")

class AuthRequest(BaseModel):
    token: str
    password: str

@app.post("/api/auth")
def auth_api(req: AuthRequest, request: Request) -> dict:
    client_ip = request.client.host
    if ALLOWED_IPS:
        allowed = [ip.strip() for ip in ALLOWED_IPS.split(",")]
        if client_ip not in allowed:
            raise HTTPException(status_code=403, detail="IP not allowed")
            
    now = time.time()
    if client_ip in auth_attempts:
        attempts, lock_time = auth_attempts[client_ip]
        if lock_time and now < lock_time:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
        elif lock_time and now >= lock_time:
            auth_attempts[client_ip] = (0, None)

    # Step 1: Verify TOTP first
    if not totp_instance.verify(req.token):
        attempts, _ = auth_attempts.get(client_ip, (0, None))
        attempts += 1
        lock = now + LOCKOUT_TIME if attempts >= MAX_AUTH_ATTEMPTS else None
        auth_attempts[client_ip] = (attempts, lock)
        raise HTTPException(status_code=401, detail="Invalid TOTP or Password")

    # Step 2: Verify Password
    if not bcrypt.checkpw(req.password.encode('utf-8'), admin_password_hash.encode('utf-8')):
        attempts, _ = auth_attempts.get(client_ip, (0, None))
        attempts += 1
        lock = now + LOCKOUT_TIME if attempts >= MAX_AUTH_ATTEMPTS else None
        auth_attempts[client_ip] = (attempts, lock)
        raise HTTPException(status_code=401, detail="Invalid TOTP or Password")
        
    api_token = secrets.token_hex(32)
    VALID_API_TOKENS.add(api_token)
    auth_attempts[client_ip] = (0, None)
    return {"api_token": api_token}

@app.get("/api/health")
def health_check() -> dict:
    """Health check endpoint for Docker and monitoring watchdogs."""
    return {"status": "ok", "service": "aim-connect"}

@app.get("/api/sessions", dependencies=[Depends(verify_token)])
def get_sessions() -> dict:
    import subprocess
    result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
    sessions = []
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            if line and not line.startswith("aim-client-"):
                sessions.append(line)
    return {"sessions": sessions}

class SessionRequest(BaseModel):
    name: str

@app.post("/api/sessions", dependencies=[Depends(verify_token)])
def create_session(req: SessionRequest) -> dict:
    """Spawns a new detached tmux session and enables global mouse support."""
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
    Enforces a strict 10-second TOTP authentication window on connection.
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
    try:
        auth_message = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        data = json.loads(auth_message)
        if data.get("type") == "auth":
            token = data.get("token", "")
            if token in VALID_API_TOKENS:
                authenticated = True
                auth_attempts[client_ip] = (0, None)
            else:
                attempts, _ = auth_attempts.get(client_ip, (0, None))
                attempts += 1
                lock = now + LOCKOUT_TIME if attempts >= MAX_AUTH_ATTEMPTS else None
                auth_attempts[client_ip] = (attempts, lock)
                
        if not authenticated:
            await websocket.close(code=1008, reason="Invalid TOTP")
            return
        
        await websocket.send_text(json.dumps({"type": "auth_success"}))
    except Exception as e:
        logger.error(f"Auth failed: {e}")
        await websocket.close(code=1008, reason="Auth Timeout or Error")
        return

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
            
        # Find a tmux session that isn't one of our internal aim-* services
        result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
        target_session = None
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                if line and not line.startswith("aim-"):
                    target_session = line
                    break
                    
        if target_session:
            os.execvp("tmux", ["tmux", "attach", "-t", target_session])
        else:
            os.execvp("bash", ["bash"])
    
    # Parent process
    loop = asyncio.get_event_loop()
    
    last_activity = time.time()
    INACTIVITY_TIMEOUT = 900 # 15 minutes

    async def read_from_pty():
        nonlocal last_activity
        loop = asyncio.get_running_loop()
        while True:
            try:
                data = await loop.run_in_executor(None, os.read, fd, 1024)
                if not data:
                    break
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
            return FileResponse(os.path.join(frontend_path, "index.html"))
            
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"status": "aim-connect backend running! (Frontend not built in ../frontend/dist)"}
