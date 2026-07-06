import pty
import os
import fcntl
import termios
import struct
import json
import asyncio
import pyotp
import qrcode
from pydantic import BaseModel
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aim-connect")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_WORKSPACE = os.environ.get("AIM_WORKSPACE", os.path.expanduser("~"))

SECRET_FILE = "totp.secret"

def get_or_create_totp():
    if os.path.exists(SECRET_FILE):
        with open(SECRET_FILE, "r") as f:
            secret = f.read().strip()
    else:
        secret = pyotp.random_base32()
        with open(SECRET_FILE, "w") as f:
            f.write(secret)
        
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

def set_pty_size(fd: int, rows: int, cols: int) -> None:
    """Resizes the underlying pseudo-terminal using an ioctl syscall."""
    winsize = struct.pack("HHHH", rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

@app.get("/api/health")
def health_check() -> dict:
    """Health check endpoint for Docker and monitoring watchdogs."""
    return {"status": "ok", "service": "aim-connect"}

@app.get("/api/sessions")
def get_sessions() -> dict:
    import subprocess
    result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
    sessions = []
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            if line and not line.startswith("aim-"):
                sessions.append(line)
    return {"sessions": sessions}

class SessionRequest(BaseModel):
    name: str

@app.post("/api/sessions")
def create_session(req: SessionRequest) -> dict:
    """Spawns a new detached tmux session and enables global mouse support."""
    import subprocess
    result = subprocess.run(["tmux", "new-session", "-d", "-s", req.name], capture_output=True, text=True)
    if result.returncode == 0:
        subprocess.run(["tmux", "set-option", "-g", "mouse", "on"])
        return {"status": "success"}
    return {"error": result.stderr}

@app.delete("/api/sessions/{name}")
def kill_session(name: str):
    import subprocess
    result = subprocess.run(["tmux", "kill-session", "-t", name], capture_output=True, text=True)
    if result.returncode == 0:
        return {"status": "success"}
    return {"error": result.stderr}

def secure_path(p: str, base_dir: str = DEFAULT_WORKSPACE) -> str:
    abs_path = os.path.abspath(p)
    if not abs_path.startswith(os.path.abspath(base_dir)):
        raise ValueError(f"Access denied: Path traversal detected outside of workspace ({base_dir}).")
    return abs_path

@app.get("/api/files")
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
        return {"path": path, "items": items}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/file")
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

@app.put("/api/file")
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

@app.post("/api/file")
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

@app.delete("/api/file")
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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    Primary WebSocket handler for streaming terminal I/O.
    Enforces a strict 10-second TOTP authentication window on connection.
    Spawns a PTY (pseudo-terminal) via os.fork() to bridge the WebSocket 
    into a native tmux session, allowing persistent background execution.
    """
    await websocket.accept()

    # Step 1: Enforce authentication
    try:
        # Wait for the first message, which must be the auth token
        auth_msg = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        auth_data = json.loads(auth_msg)
        if auth_data.get("type") != "auth" or not totp_instance.verify(auth_data.get("token")):
            await websocket.send_text(json.dumps({"type": "auth_failed"}))
            await websocket.close(code=1008, reason="Unauthorized")
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
    
    async def read_from_pty():
        while True:
            try:
                data = await loop.run_in_executor(None, os.read, fd, 1024 * 10)
                if not data:
                    break
                await websocket.send_bytes(data)
            except Exception as e:
                logger.error(f"PTY read error: {e}")
                break

    async def write_to_pty():
        try:
            while True:
                message = await websocket.receive_text()
                try:
                    data = json.loads(message)
                    if data.get("type") == "input":
                        os.write(fd, data["payload"].encode("utf-8"))
                    elif data.get("type") == "resize":
                        set_pty_size(fd, data["rows"], data["cols"])
                    elif data.get("type") == "switch_session":
                        import subprocess
                        client_tty = None
                        res = subprocess.run(["tmux", "list-clients", "-F", "#{client_pid} #{client_tty}"], capture_output=True, text=True)
                        for line in res.stdout.splitlines():
                            parts = line.split()
                            if len(parts) >= 2 and parts[0] == str(pid):
                                client_tty = parts[1]
                                break
                        
                        if client_tty:
                            subprocess.run(["tmux", "switch-client", "-c", client_tty, "-t", data["session"]])
                        else:
                            logger.warning(f"Could not find tmux client for pid {pid}")
                except json.JSONDecodeError:
                    os.write(fd, message.encode("utf-8"))
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected")
        except Exception as e:
            logger.error(f"PTY write error: {e}")

    task1 = asyncio.create_task(read_from_pty())
    task2 = asyncio.create_task(write_to_pty())
    
    done, pending = await asyncio.wait([task1, task2], return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()

frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_path):
    # Mount Vite static assets
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")
    
    # Catch-all for SPA routing
    @app.get("/{catchall:path}")
    def serve_frontend(catchall: str):
        file_path = os.path.join(frontend_path, catchall)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"status": "aim-connect backend running! (Frontend not built in ../frontend/dist)"}
