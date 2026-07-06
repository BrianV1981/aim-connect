import pty
import os
import fcntl
import termios
import struct
import json
import asyncio
import pyotp
import qrcode
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def set_pty_size(fd, rows, cols):
    winsize = struct.pack("HHHH", rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

@app.get("/api/sessions")
def get_sessions():
    import subprocess
    result = subprocess.run(["tmux", "ls", "-F", "#{session_name}"], capture_output=True, text=True)
    sessions = []
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            if line and not line.startswith("aim-"):
                sessions.append(line)
    return {"sessions": sessions}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
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
        print(f"Auth failed: {e}")
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
                print(f"PTY read error: {e}")
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
                            print(f"Could not find tmux client for pid {pid}")
                except json.JSONDecodeError:
                    os.write(fd, message.encode("utf-8"))
        except WebSocketDisconnect:
            print("WebSocket disconnected")
        except Exception as e:
            print(f"PTY write error: {e}")

    task1 = asyncio.create_task(read_from_pty())
    task2 = asyncio.create_task(write_to_pty())
    
    done, pending = await asyncio.wait([task1, task2], return_when=asyncio.FIRST_COMPLETED)
    for task in pending:
        task.cancel()

@app.get("/")
def read_root():
    return {"status": "aim-connect backend running!"}
