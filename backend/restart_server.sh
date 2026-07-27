#!/bin/bash

# A robust script to restart the Uvicorn server without race conditions.
# It can be run from anywhere, and it will safely stop the running server,
# wait for the port to clear, and then start it cleanly inside the tmux session.

echo "🛑 Stopping existing Uvicorn server..."

# 1. Send Ctrl+C to the tmux pane to gracefully stop uvicorn if it's running in the foreground
tmux send-keys -t aim-connect-backend C-c 2>/dev/null
sleep 1

# 2. Hard kill any lingering uvicorn processes matching our app just to be safe
pkill -f "uvicorn main:app" 2>/dev/null

# 3. Wait up to 5 seconds for port 8000 to be fully released
echo "⏳ Waiting for port 8000 to clear..."
for i in {1..50}; do
    if ! lsof -i:8000 -t >/dev/null 2>&1; then
        break
    fi
    sleep 0.1
done

# Check if it actually cleared
if lsof -i:8000 -t >/dev/null 2>&1; then
    echo "❌ Error: Port 8000 is still in use. Restart failed."
    exit 1
fi

echo "✅ Port is clear. Starting Uvicorn in the aim-connect-backend tmux session..."

# 4. Clear the tmux pane and start the server
tmux send-keys -t aim-connect-backend "clear" Enter
sleep 0.5
tmux send-keys -t aim-connect-backend "source venv/bin/activate 2>/dev/null || true" Enter
tmux send-keys -t aim-connect-backend "uvicorn main:app --host 0.0.0.0 --port 8000" Enter

echo "🚀 Server restart command sent successfully!"
