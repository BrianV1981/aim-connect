# True Sovereignty: The Self-Hosted Reverse Proxy Architecture

If you have a server with a **Static IP address** (e.g., a DigitalOcean VPS, an AWS EC2 instance, or a business/home network with a static IP and port-forwarding access), you do not need third-party tunneling services like Ngrok or Cloudflare. 

You can achieve **True Sovereignty** by routing your own domains directly to your hardware. This path requires a bit more initial setup, but gives you absolute control, zero monthly fees for tunnels, and infinite scalability.

---

## 1. The Power of Subdomains

When you own a domain like `tbsoftwash.com`, you have the power to create **infinite subdomains for free** through your DNS provider (e.g., Bluehost).

You can spin up as many servers as you want, and assign each one its own dedicated subdomain. For example, if you want a Hub and 3 Spoke servers:
* **The Hub:** `agent.tbsoftwash.com` (Points to Server 1's Static IP)
* **Spoke 1:** `db-server.tbsoftwash.com` (Points to Server 2's Static IP)
* **Spoke 2:** `pi-cluster.tbsoftwash.com` (Points to Server 3's Static IP)
* **Spoke 3:** `office-node.tbsoftwash.com` (Points to Server 4's Static IP)

You simply create a new **A-Record** in your DNS dashboard for each subdomain and point it to the respective static IP.

---

## 2. The Architecture: Caddy (The Magic Reverse Proxy)

When a browser connects to `agent.tbsoftwash.com`, it expects standard secure HTTPS traffic on Port 443. However, `aim-connect` runs as an unprotected FastAPI app on Port 8000. 

To bridge this gap, you need a **Reverse Proxy**. While Nginx is the industry standard, **Caddy** is heavily recommended for this architecture because it is incredibly lightweight and handles SSL completely automatically.

### How Caddy Works:
1. Caddy sits at the front door of your server listening on Port 443 (HTTPS) and Port 80 (HTTP).
2. When you start Caddy, it automatically reaches out to Let's Encrypt, proves you own the subdomain, and generates a valid SSL certificate for you silently in the background.
3. When your phone visits `agent.tbsoftwash.com`, Caddy decrypts the secure traffic and forwards it internally to `localhost:8000` where `aim-connect` is running.

---

## 3. Step-by-Step Setup Guide

### Phase 1: DNS Setup
1. Log into your domain registrar (e.g., Bluehost).
2. Go to the DNS Zone Editor.
3. Create a new **A-Record**.
4. Set the host/name to `agent` (or whatever you want).
5. Set the Value/IP to your server's Public Static IP.

### Phase 2: Server Prep
Make sure your server's firewall allows incoming web traffic. 
```bash
# Ubuntu/Debian Example
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Phase 3: Install and Configure Caddy
1. Install Caddy on your Linux server following their official instructions (`apt install caddy`).
2. Open the Caddy configuration file (usually `/etc/caddy/Caddyfile`).
3. Replace the entire contents with this exact block (replacing the domain):

```caddyfile
agent.tbsoftwash.com {
    reverse_proxy localhost:8000
}
```

4. Restart Caddy to apply the changes:
```bash
sudo systemctl restart caddy
```

### Phase 4: Start AIM-Connect
Now, instead of running an Ngrok tunnel, you just spin up your backend and frontend in the background!
```bash
tmux new-session -d -s aim_backend "cd backend && source venv/bin/activate && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
tmux new-session -d -s aim_frontend "cd frontend && npm run dev"
```

*Note: In a true proxy environment, you only need to run the `backend` since it is configured to serve the production-built React assets directly, saving you from running the Node `npm run dev` server in production!*

---

## 4. The Result

Within seconds of restarting Caddy, your server will have a beautiful, secure HTTPS connection. You can now visit `https://agent.tbsoftwash.com` on your phone.

You have eliminated the middleman. You are running 100% sovereign infrastructure using your own domain, your own IPs, and your own hardware.
