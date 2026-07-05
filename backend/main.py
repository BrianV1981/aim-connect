import pty
import os
import fcntl
import termios
import struct
import json
import asyncio
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

def set_pty_size(fd, rows, cols):
    winsize = struct.pack("HHHH", rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # For the bridge, we'll spawn a bash shell by default.
    # The user can run `tmux attach -t aim` from the UI to hook into the agent.
    pid, fd = pty.fork()
    if pid == 0:
        # Child process
        os.execvp("bash", ["bash"])
    
    # Parent process
    loop = asyncio.get_event_loop()
    
    async def read_from_pty():
        while True:
            try:
                # Read raw output from the pseudo-terminal
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
                except json.JSONDecodeError:
                    # Fallback to raw string if not JSON
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
