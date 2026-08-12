# Tmux Ghost Clients and Dashboard Switching Issues

## 1. Dashboard (aim-dash) Switching Bug
**Issue**: When using `aim-dash` (dashboard.py) outside of a popup (e.g. inside a new tmux window), selecting a session to attach to would appear to "do nothing" and require the user to hit `q` to quit before seeing they had switched.
**Root Cause**: The script called `subprocess.run(["tmux", "switch-client", ...])` but failed to call `self.exit()` afterwards when `TMUX` was in `os.environ`. This left the dashboard UI open in the background window, masking the fact that the backend client switch was actually successful.
**Resolution**: Updated `dashboard.py` in `aim-tmux-dashboard` to invoke `self.exit()` immediately after executing `tmux switch-client`, cleanly closing the dashboard window.

## 2. Ghost `tmux attach-session` Clients
**Issue**: Tmux was showing multiple "Attached" clients for sessions, even when the user had closed all UI windows (browser tabs).
**Root Cause**: `aim-connect` spawns a background `tmux attach-session` child process (using `pty.fork()`) when a user connects. When the websocket connection closed, the Python handler in `backend/ws_handler.py` cleaned up the asyncio tasks but failed to kill the child PID, leaving the process permanently orphaned and "attached" to the tmux session.
**Resolution**: Updated `backend/ws_handler.py` to add a cleanup block containing `os.kill(pid, signal.SIGKILL)` and `os.waitpid(pid, 0)` upon `WebSocketDisconnect` or handler termination, ensuring the child process exits correctly.
