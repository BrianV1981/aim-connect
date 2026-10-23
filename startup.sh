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

AIM_MCP_DIR="${AIM_MCP_DIR:-$HOME/aim-mcp}"
CLOUDFLARED_BIN="${CLOUDFLARED_BIN:-$HOME/.local/bin/cloudflared}"
CLOUDFLARED_CONFIG="${CLOUDFLARED_CONFIG:-$HOME/.cloudflared/config.yml}"
AIM_PUBLIC_URL="${AIM_PUBLIC_URL:-http://localhost:8000}"
AIM_MCP_PUBLIC_URL="${AIM_MCP_PUBLIC_URL:-}"

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
if [ "${1:-}" = "--foreground" ]; then
    echo -e "\033[36m[1/1] Starting FastAPI Backend in foreground (Port 8000)...\033[0m"
    cd "$DIR/backend" || exit 1
    if [ -x "$DIR/backend/venv/bin/uvicorn" ]; then
        exec "$DIR/backend/venv/bin/python3" "$DIR/backend/venv/bin/uvicorn" main:app --host 0.0.0.0 --port 8000
    else
        exec uvicorn main:app --host 0.0.0.0 --port 8000
    fi
fi

# Pre-flight first-run 3FA bootstrap: when run interactively on a TTY, print QR code,
# password, and passphrase to the foreground terminal before launching detached uvicorn (#206).
if [ -t 1 ] && { [ ! -f "$DIR/backend/totp.secret" ] || [ ! -f "$DIR/backend/password.hash" ] || [ ! -f "$DIR/backend/passphrase.hash" ]; }; then
    if [ -x "$DIR/backend/venv/bin/python3" ]; then
        (cd "$DIR/backend" && "$DIR/backend/venv/bin/python3" -c "import main")
    elif command -v python3 >/dev/null 2>&1; then
        (cd "$DIR/backend" && python3 -c "import main")
    fi
fi

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

# [2/3] Optional MCP SSE Server (Port 8001)
PID_8001="$(lsof -ti :8001 2>/dev/null | head -n 1)"
if [ -n "$PID_8001" ]; then
    ensure_window "mcp"
    echo -e "\033[92m[2/3] MCP SSE Server already running on :8001 (PID $PID_8001)\033[0m"
elif [ -f "$AIM_MCP_DIR/start_mcp.sh" ]; then
    ensure_window "mcp"
    echo -e "\033[36m[2/3] Starting MCP SSE Server (Port 8001)...\033[0m"
    tmux send-keys -t aim-connect-workspace:mcp "cd \"$AIM_MCP_DIR\" && ./start_mcp.sh" Enter
else
    echo -e "\033[33m[2/3] Skipping MCP SSE Server ($AIM_MCP_DIR/start_mcp.sh not found)\033[0m"
fi

# [3/3] Cloudflared Tunnel
PID_CF="$(pgrep -f "cloudflared tunnel" 2>/dev/null | head -n 1)"
if [ -n "$PID_CF" ]; then
    ensure_window "cloudflared"
    echo -e "\033[92m[3/3] Cloudflared Tunnel already active (PID $PID_CF)\033[0m"
elif [ -f "$CLOUDFLARED_CONFIG" ]; then
    ensure_window "cloudflared"
    echo -e "\033[36m[3/3] Opening Secure Cloudflared Tunnel...\033[0m"
    tmux send-keys -t aim-connect-workspace:cloudflared "\"$CLOUDFLARED_BIN\" tunnel --config \"$CLOUDFLARED_CONFIG\" run" Enter
else
    echo -e "\033[33m[3/3] Skipping Cloudflared Tunnel ($CLOUDFLARED_CONFIG not found)\033[0m"
fi

echo -e "\n\033[92m==========================================\033[0m"
echo -e "\033[92m🚀 SYSTEM ONLINE & SECURE!\033[0m"
echo -e "Your URL: \033[93m$AIM_PUBLIC_URL\033[0m"
if [ -n "$AIM_MCP_PUBLIC_URL" ]; then
    echo -e "Your MCP: \033[93m$AIM_MCP_PUBLIC_URL\033[0m"
fi
echo -e "To access, scan the backend TOTP code and punch the PIN into the web lock screen."
echo -e "\033[92m==========================================\033[0m\n"
