#!/bin/bash

# ==========================================
# A.I.M. CONNECT - MASTER STARTUP SCRIPT
# ==========================================
# This script spins up the entire aim-connect stack:
# 1. FastAPI Backend (Port 8000)
# 2. Vite Frontend (Port 5173)
# 3. Ngrok Permanent Tunnel (pox-repulsive-veggie.ngrok-free.dev)

# Kill any previously running instances
tmux kill-session -t aim-backend 2>/dev/null
tmux kill-session -t aim-frontend 2>/dev/null
tmux kill-session -t aim-ngrok 2>/dev/null
pkill -f "./ngrok" 2>/dev/null

echo -e "\n\033[36m[1/4] Configuring Ngrok Auth...\033[0m"
./ngrok config add-authtoken 3G6lVXsU8x6aBG4jN49BgAMC0oh_4QNSHqfREPtW4PPevce1f

echo -e "\033[36m[2/4] Starting FastAPI Backend (Port 8000)...\033[0m"
cd /home/kingb/aim-connect/backend
tmux new-session -d -s aim-backend "source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000"

echo -e "\033[36m[3/4] Starting Vite Frontend (Port 5173)...\033[0m"
cd /home/kingb/aim-connect/frontend
tmux new-session -d -s aim-frontend "npm run dev -- --host"

echo -e "\033[36m[4/4] Opening Secure Ngrok Tunnel...\033[0m"
cd /home/kingb/aim-connect
tmux new-session -d -s aim-ngrok "./ngrok http --url=pox-repulsive-veggie.ngrok-free.dev 5173 --log=stdout"

echo -e "\n\033[92m==========================================\033[0m"
echo -e "\033[92m🚀 SYSTEM ONLINE & SECURE!\033[0m"
echo -e "Your permanent URL: \033[93mhttps://pox-repulsive-veggie.ngrok-free.dev\033[0m"
echo -e "To access, scan the backend TOTP code and punch the PIN into the web lock screen."
echo -e "\033[92m==========================================\033[0m\n"
