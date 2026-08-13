# Cloudflare Tunnel Crash & JWT Signature Mismatch

## Context
The Next.js Vercel frontend (`leaddeed-dashboard`, `leaddeeds.com/analyst`) talks to the FastAPI backend over `wss://api.leaddeeds.com/ws`. The UI reports:

`Connection closed by remote node. Connecting to secure node...`

That banner is **not a diagnosis**. It is the same string for several different failures.

## Durable rule (option 1 — do this for every future user)

**Source of truth:** `aim-connect/.env` → `LEADDEED_DOWNLOAD_SIGNING_SECRET` (the verifier).

`leaddeed-dashboard` **mints** analyst / fleet magic-link JWTs with `signDownloadToken()` (`LEADDEED_DOWNLOAD_SIGNING_SECRET`). aim-connect **verifies** them in `_verify_dashboard_jwt` and the `/ws` HMAC path.

For `/analyst` to stay connected:

1. Put the **same** backend secret on **Vercel Production** (`LEADDEED_DOWNLOAD_SIGNING_SECRET`).
2. **Redeploy** `leaddeed-dashboard`. An env change without a rebuild leaves the old secret in the live functions (the “ghost secret”).
3. Hard-refresh `/analyst`. An already-open tab keeps a 4-hour JWT signed with the old secret and will keep 401’ing.
4. Bounce **uvicorn only** (`aim-connect-workspace:servers.0`) to clear in-memory `auth_attempts`. Do **not** kill `aim-connect-workspace:cloudflared`.

**Forbidden:**

- Commenting out HMAC (`if True`, “temporary bypass”). Audit #180 exists so that cannot merge again.
- Copying a third secret out of an old Vercel deploy (“chase the ghost”).
- Treating `vercel env pull` output as the real value. Sensitive vars are written as the literal 11-character string `[SENSITIVE]`. That is redaction, not the secret.
- Redeploying while `NEXT_PUBLIC_AIM_CONNECT_WS` / `NEXT_PUBLIC_API_URL` are placeholders. Set them to `wss://api.leaddeeds.com/ws` and `https://api.leaddeeds.com` **before** the production build, or the next deploy points the browser at junk.

Proven working 2026-08-13 after option 1 + redeploy + hard refresh: fleet `GET` **200**, `/ws` accepted and stayed open, E2EE PTY traffic flowing. HMAC compare live.

## 1. The JWT Signature Mismatch
When Vercel and aim-connect secrets diverge, `_verify_dashboard_jwt` / `/ws` reject the token (HTTP **401** / WS close **1008** `Invalid API Token`).
- Payload can be fine (`p=ai-analyst`, `e` present, `exp` valid) while HMAC still fails.
- Five failed `/ws` auths lock the client IP for `LOCKOUT_TIME` (300s) → subsequent `/ws` **403**. Same UI banner.
- The SPA interprets the clean close as `Connection closed by remote node.`

## 2. The Cloudflared Argo Tunnel Crash (Masking)
`wss://api.leaddeeds.com/ws` is an Argo Tunnel to local uvicorn `:8000`.
- If `cloudflared` is killed or origin is down, Cloudflare returns **530** (or the tunnel times out dialing `127.0.0.1:8000`).
- The UI shows the **same** `Connection closed by remote node.` string as a 1008 JWT reject.

## Resolution Workflow
Always prove the **network** layer before the **auth** layer:

1. **Tunnel / origin**
   - `curl -sS https://api.leaddeeds.com/api/health` → `{"status":"ok",...}` means origin + tunnel are up.
   - `curl -sI https://api.leaddeeds.com` → **405** = tunnel hitting FastAPI (HEAD not allowed). **530** / timeout = tunnel or origin down. Relaunch `cloudflared` or uvicorn as appropriate. Never restart `startup.sh` without confirming the `cloudflared` window is still alive.

2. **JWT HMAC (hash only — never print the secret)**
   - Take a live fleet token from uvicorn (redact it in chat). HMAC the payload-b64 with the backend secret. `hmac_match False` + valid `e`/`exp` = Vercel is minting with a different secret.
   - Fix with **option 1** above. Do not bypass compare.

3. **After a reconnect storm**
   - If logs show `Rate limited IP` / `/ws` 403, wait 300s or restart uvicorn. Then hard-refresh the browser.
