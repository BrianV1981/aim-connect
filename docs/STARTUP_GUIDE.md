# AIM-Connect: Manual Startup Guide

If `aim-connect` shuts down or you accidentally kill the background processes, you can manually spin the environment back up using detached `tmux` sessions. This ensures the servers run persistently in the background even if you close your main terminal or SSH connection.

## 1. Start the Backend API
Run this command from the root of the `aim-connect` project to start the Python FastAPI backend in a background session named `aim_backend`:
```bash
tmux new-session -d -s aim_backend "cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
```

## 2. Start the Frontend Vite Server
Run this command to start the React frontend in a background session named `aim_frontend`:
```bash
tmux new-session -d -s aim_frontend "cd frontend && npm run dev -- --host"
```

## 3. Start the Cloudflare Tunnel (Optional)
If you need to access the app remotely over the internet, start the Cloudflare tunnel in a session named `aim_tunnel`:
```bash
tmux new-session -d -s aim_tunnel "npx -y cloudflared tunnel --url http://localhost:5173"
```

---

### Useful Tmux Commands

* **View running background servers:**
  ```bash
  tmux ls
  ```
* **Watch a server live (Attach):**
  ```bash
  tmux attach -t aim_backend
  ```
  *(To leave the server running and detach your view, press `Ctrl+B`, then press `D`)*

* **Kill a specific server:**
  ```bash
  tmux kill-session -t aim_frontend
  ```

* **Kill EVERYTHING:**
  ```bash
  tmux kill-server
  ```
