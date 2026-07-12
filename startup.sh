#!/bin/bash

# ==========================================
# A.I.M. CONNECT - MASTER STARTUP SCRIPT
# ==========================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Kill any previously running instances
tmux kill-session -t aim-backend 2>/dev/null
tmux kill-session -t aim-ngrok 2>/dev/null
tmux kill-session -t aim-connect-workspace 2>/dev/null
pkill -f "./ngrok" 2>/dev/null

if [ -f "$DIR/.env" ]; then
    source "$DIR/.env"
fi

if [ -n "$NGROK_AUTHTOKEN" ]; then
    echo -e "\n\033[36m[1/3] Configuring Ngrok Auth from .env...\033[0m"
    "$DIR/ngrok" config add-authtoken $NGROK_AUTHTOKEN
else
    echo -e "\n\033[33m[1/3] Skipping Ngrok Auth (NGROK_AUTHTOKEN not set in .env)...\033[0m"
fi

# Create a unified session and name the first window 'servers'
tmux new-session -d -s aim-connect-workspace -n "servers"

echo -e "\033[36m[2/3] Starting FastAPI Backend (Port 8000)...\033[0m"
if [ -f "$DIR/backend/venv/bin/activate" ]; then
    tmux send-keys -t aim-connect-workspace:servers "cd \"$DIR/backend\" && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000" Enter
else
    tmux send-keys -t aim-connect-workspace:servers "cd \"$DIR/backend\" && uvicorn main:app --host 0.0.0.0 --port 8000" Enter
fi

echo -e "\033[36m[3/3] Opening Secure Ngrok Tunnel to Port 8000...\033[0m"
# Split window horizontally for ngrok
tmux split-window -h -t aim-connect-workspace:servers

if [ -n "$NGROK_DOMAIN" ]; then
    tmux send-keys -t aim-connect-workspace:servers.1 "cd \"$DIR\" && ./ngrok http --url=$NGROK_DOMAIN 8000 --log=stdout" Enter
    FINAL_URL="https://$NGROK_DOMAIN"
else
    tmux send-keys -t aim-connect-workspace:servers.1 "cd \"$DIR\" && ./ngrok http 8000 --log=stdout" Enter
    FINAL_URL="<Check ngrok dashboard or logs for your ephemeral URL>"
fi

echo -e "\n\033[92m==========================================\033[0m"
echo -e "\033[92m🚀 SYSTEM ONLINE & SECURE!\033[0m"
echo -e "Your URL: \033[93m$FINAL_URL\033[0m"
echo -e "To access, scan the backend TOTP code and punch the PIN into the web lock screen."
echo -e "\033[92m==========================================\033[0m\n"
