#!/bin/bash

# ==========================================
# A.I.M. CONNECT - MASTER STARTUP SCRIPT
# ==========================================
# This script spins up the entire aim-connect stack:
# 1. FastAPI Backend (Port 8000)
# 2. Vite Frontend (Port 5173)
# 3. Ngrok Permanent Tunnel (pox-repulsive-veggie.ngrok-free.dev)

# Kill any previously running instances
pkill -f "uvicorn main:app"
pkill -f "vite --host"
pkill -f "./ngrok" 2>/dev/null

echo -e "\n\033[36m[1/4] Configuring Ngrok Auth...\033[0m"
./ngrok config add-authtoken 3G6lVXsU8x6aBG4jN49BgAMC0oh_4QNSHqfREPtW4PPevce1f

echo -e "\033[36m[2/4] Starting FastAPI Backend (Port 8000)...\033[0m"
cd /home/kingb/aim-connect/backend
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &

echo -e "\033[36m[3/4] Starting Vite Frontend (Port 5173)...\033[0m"
cd /home/kingb/aim-connect/frontend
nohup npm run dev -- --host > frontend.log 2>&1 &

echo -e "\033[36m[4/4] Opening Secure Ngrok Tunnel...\033[0m"
cd /home/kingb/aim-connect
nohup ./ngrok http --url=pox-repulsive-veggie.ngrok-free.dev 5173 > ngrok.log 2>&1 &

echo -e "\n\033[92m==========================================\033[0m"
echo -e "\033[92m🚀 SYSTEM ONLINE & SECURE!\033[0m"
echo -e "Your permanent URL: \033[93mhttps://pox-repulsive-veggie.ngrok-free.dev\033[0m"
echo -e "To access, scan the backend TOTP code and punch the PIN into the web lock screen."
echo -e "\033[92m==========================================\033[0m\n"
