# Multi-Server "Hub & Spoke" Architecture Options

The `aim-connect` UI is designed to be a centralized mobile dashboard capable of managing a fleet of remote Linux machines, VPS instances, or Raspberry Pis across multiple physical locations—all from a single secure mobile bookmark.

This document outlines the architectural patterns for connecting multiple "Spoke" servers to a single master "Hub" frontend.

---

## 1. Authentication Strategy: Shared Secrets vs. Independent Keys

To prevent users from having to type a new 6-digit Google Authenticator PIN every time they switch servers in the UI, we recommend the **Shared Secret** approach.

### The "Shared Secret" Method (Recommended for UX)
1. Generate the TOTP secret on your primary Hub server (the initial setup).
2. Copy the `backend/totp.secret` file from the Hub and securely paste it into the `backend/` folder of all your remote Spoke servers.
3. **The Result:** Because all servers share the identical cryptographic secret, they all validate against the exact same 6-digit PIN. When you log into the Hub UI on your phone, the React frontend securely holds your validated token in memory. When you hot-swap your connection to Server B, the UI silently passes that same token along. You get instant, zero-friction teleportation between servers while maintaining cryptographic zero-trust security.

---

## 2. Networking Strategy: Overcoming Dynamic APIs and NAT

The Spoke servers only run the headless Python FastAPI backend (Port 8000). They do not need to host the React frontend. Because the React UI (running in your mobile browser) must connect its WebSocket directly to the Spoke, the Spoke must be reachable over the internet.

If your remote servers are behind strict firewalls, NAT, or dynamic residential IPs, you cannot rely on port forwarding. Instead, use one of the following outbound networking strategies:

### Option A: Cloudflare Authenticated Tunnels (Best for Public Domains)
If you own a domain (e.g., `tbsoftwash.com`), you can bind permanent Cloudflare tunnels to your remote servers for free.
* **How it works:** You run the `cloudflared` daemon on the Spoke server. It establishes an outbound connection to Cloudflare's edge and permanently binds the Spoke's Port 8000 to a subdomain (e.g., `spoke1.tbsoftwash.com`).
* **The Setup:** In your Hub's UI, you simply add `wss://spoke1.tbsoftwash.com/ws` to your Server Selector list. 
* **Pros:** Completely bypasses firewalls. Never changes on reboot. Uses standard web ports.
* **Cons:** Requires a free Cloudflare account and DNS setup.

### Option B: Tailscale Mesh VPN (Best for Private, Hidden Networks)
Tailscale is a free, zero-config Mesh VPN built on WireGuard. It creates a magical, flat, encrypted network over the public internet.
* **How it works:** You install the Tailscale daemon on your phone, your Hub, and all your Spoke servers. Tailscale assigns every device a permanent, static internal IP address (e.g., `100.x.x.x`) regardless of where they are physically located in the world.
* **The Setup:** In your Hub's UI, you add `ws://100.x.x.x:8000/ws` to your Server Selector list.
* **Pros:** Absolute maximum security. The Spoke servers are completely invisible to the public internet. Bypasses all firewalls and NAT instantly without any DNS configuration.
* **Cons:** Requires the Tailscale app to be running on your mobile device to access the private IPs.

### Option C: Cloudflare "Quick" Tunnels (Best for Rapid Prototyping)
* **How it works:** You run `npx cloudflared tunnel --url http://localhost:8000` on the Spoke server. Cloudflare assigns a random URL (e.g., `https://random-words.trycloudflare.com`).
* **The Setup:** You paste that URL into the Hub's UI.
* **Pros:** Zero account required. Instant HTTPS access through firewalls.
* **Cons:** The URL is randomized. If the Spoke server restarts or loses power, you will get a brand new URL and will have to manually update your Hub's UI settings. **Not recommended for permanent infrastructure.**

---

## Summary Recommendation
For the absolute most secure and resilient setup for a single administrator:
**Deploy Tailscale.** It makes all your servers act as if they are sitting on a secure ethernet switch under your desk, granting permanent static IPs that are completely invisible to the public internet, requiring zero domain configuration.
