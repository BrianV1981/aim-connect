# AIM-Connect: Manual Startup Guide (Cloudflare)

This guide walks you through manually starting the `aim-connect` servers in the background using **Cloudflare Quick Tunnels**. Cloudflare is great for rapid testing because it requires no account or authentication, though it will assign you a random URL every time it restarts.

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

## 3. Start the Cloudflare Tunnel
To expose your frontend over HTTPS quickly without an account, run:
```bash
tmux new-session -d -s aim_tunnel "npx -y cloudflared tunnel --url http://localhost:5173"
```
*(You will need to check the terminal output of `tmux attach -t aim_tunnel` to find your random `trycloudflare.com` URL)*

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
