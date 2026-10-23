#!/bin/bash

# Safely recycle the :8000 Uvicorn server by PID without killing sibling windows or tunnels,
# then relaunch via the idempotent root startup.sh script (#201/#206).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🛑 Stopping existing Uvicorn server on :8000..."

PID_8000="$(lsof -ti :8000 2>/dev/null | head -n 1)"
if [ -n "$PID_8000" ]; then
    kill "$PID_8000" 2>/dev/null
fi

echo "⏳ Waiting for port 8000 to clear..."
for i in {1..50}; do
    if ! lsof -ti :8000 >/dev/null 2>&1; then
        break
    fi
    sleep 0.1
done

if lsof -ti :8000 >/dev/null 2>&1; then
    echo "❌ Error: Port 8000 is still in use. Restart failed."
    exit 1
fi

echo "✅ Port 8000 is clear. Relaunching in aim-connect-workspace:servers via startup.sh..."
"$REPO_ROOT/startup.sh"
echo "🚀 Server restart command sent successfully!"
