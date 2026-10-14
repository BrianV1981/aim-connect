#!/bin/bash

# ==========================================
# A.I.M. CONNECT - MASTER STARTUP SCRIPT
# ==========================================
# Default mode: Idempotent health-check (only starts stopped services).
# Pass --restart to tear down and recreate all services.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "--restart" ]; then
    echo -e "\033[33m[--restart] Stopping existing aim-connect-workspace session and tunnels...\033[0m"
    tmux kill-session -t aim-backend 2>/dev/null
    tmux kill-session -t aim-ngrok 2>/dev/null
    tmux kill-session -t aim-connect-workspace 2>/dev/null
    pkill -f "cloudflared tunnel" 2>/dev/null
    pkill -f "./ngrok" 2>/dev/null
fi

if [ -f "$DIR/.env" ]; then
    set -a
    source "$DIR/.env"
    set +a
fi

ensure_window() {
    local win="$1"
    if ! tmux list-windows -t aim-connect-workspace -F "#{window_name}" 2>/dev/null | grep -qx "$win"; then
        tmux new-window -t aim-connect-workspace -n "$win"
    fi
}

# Ensure unified session exists with 'servers' window
if ! tmux has-session -t aim-connect-workspace 2>/dev/null; then
    tmux new-session -d -s aim-connect-workspace -n "servers"
else
    ensure_window "servers"
fi

# [1/3] FastAPI Backend (Port 8000)
PID_8000="$(lsof -ti :8000 2>/dev/null | head -n 1)"
if [ -n "$PID_8000" ]; then
    echo -e "\033[92m[1/3] FastAPI Backend already running on :8000 (PID $PID_8000)\033[0m"
else
    echo -e "\033[36m[1/3] Starting FastAPI Backend (Port 8000)...\033[0m"
    if [ -x "$DIR/backend/venv/bin/uvicorn" ]; then
        tmux send-keys -t aim-connect-workspace:servers "cd \"$DIR/backend\" && \"$DIR/backend/venv/bin/python3\" \"$DIR/backend/venv/bin/uvicorn\" main:app --host 0.0.0.0 --port 8000" Enter
    else
        tmux send-keys -t aim-connect-workspace:servers "cd \"$DIR/backend\" && uvicorn main:app --host 0.0.0.0 --port 8000" Enter
    fi
fi

# [2/3] MCP SSE Server (Port 8001)
ensure_window "mcp"
PID_8001="$(lsof -ti :8001 2>/dev/null | head -n 1)"
if [ -n "$PID_8001" ]; then
    echo -e "\033[92m[2/3] MCP SSE Server already running on :8001 (PID $PID_8001)\033[0m"
else
    echo -e "\033[36m[2/3] Starting MCP SSE Server (Port 8001)...\033[0m"
    tmux send-keys -t aim-connect-workspace:mcp "cd /home/kingb/aim-mcp && ./start_mcp.sh" Enter
fi

# [3/3] Cloudflared Tunnel
ensure_window "cloudflared"
PID_CF="$(pgrep -f "cloudflared tunnel" 2>/dev/null | head -n 1)"
if [ -n "$PID_CF" ]; then
    echo -e "\033[92m[3/3] Cloudflared Tunnel already active (PID $PID_CF)\033[0m"
else
    echo -e "\033[36m[3/3] Opening Secure Cloudflared Tunnel...\033[0m"
    tmux send-keys -t aim-connect-workspace:cloudflared "/home/kingb/.local/bin/cloudflared tunnel --config /home/kingb/.cloudflared/config.yml run" Enter
fi

echo -e "\n\033[92m==========================================\033[0m"
echo -e "\033[92m🚀 SYSTEM ONLINE & SECURE!\033[0m"
echo -e "Your URL: \033[93mhttps://api.leaddeeds.com\033[0m"
echo -e "Your MCP: \033[93mhttps://mcp.leaddeeds.com/sse\033[0m"
echo -e "To access, scan the backend TOTP code and punch the PIN into the web lock screen."
echo -e "\033[92m==========================================\033[0m\n"
