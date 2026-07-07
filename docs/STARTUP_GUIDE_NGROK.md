# AIM-Connect: Manual Startup Guide (Ngrok)

This guide walks you through manually starting the `aim-connect` servers in the background using **Ngrok** as the primary tunnel. Ngrok is recommended because it provides a permanent, static URL.

If the servers shut down, you can spin them back up persistently using detached `tmux` sessions:

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

## 3. Start the Ngrok Tunnel
To expose your frontend over HTTPS using your static Ngrok domain, run:
```bash
tmux new-session -d -s aim_tunnel "ngrok http --url=your-static-domain.ngrok-free.dev 5173"
```
*(Make sure you have authenticated the ngrok CLI with your authtoken first!)*

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
