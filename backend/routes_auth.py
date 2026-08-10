import time
import secrets
import bcrypt
import pyotp
import logging
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, Header, Depends
from main import (
    ALLOWED_IPS, auth_attempts, MAX_AUTH_ATTEMPTS, LOCKOUT_TIME, 
    users_db, VALID_API_TOKENS, MAX_TOKENS, TOKEN_TTL, save_tokens,
    totp_instance, admin_password_hash, admin_passphrase_hash, verify_token
)

router = APIRouter()
logger = logging.getLogger("aim-connect")
_last_used_totp = None

class AuthRequest(BaseModel):
    token: str
    password: str
    passphrase: str = ""

@router.post("/api/auth")
def auth_api(req: AuthRequest, request: Request) -> dict:
    global _last_used_totp
    client_ip = request.client.host
    if ALLOWED_IPS:
        allowed = [ip.strip() for ip in ALLOWED_IPS.split(",")]
        if client_ip not in allowed:
            raise HTTPException(status_code=403, detail="IP not allowed")

    now = time.time()

    # Evict stale auth_attempts entries (older than lockout window)
    stale_ips = [ip for ip, (_, lock) in auth_attempts.items()
                 if lock and now >= lock + LOCKOUT_TIME]
    for ip in stale_ips:
        del auth_attempts[ip]

    if client_ip in auth_attempts:
        attempts, lock_time = auth_attempts[client_ip]
        if lock_time and now < lock_time:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
        elif lock_time and now >= lock_time:
            auth_attempts[client_ip] = (0, None)

    def _fail_auth(client_ip, now):
        attempts, _ = auth_attempts.get(client_ip, (0, None))
        attempts += 1
        lock = now + LOCKOUT_TIME if attempts >= MAX_AUTH_ATTEMPTS else None
        auth_attempts[client_ip] = (attempts, lock)
        logger.warning("Auth failed for IP %s (attempt %d)", client_ip, attempts)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # --- Multi-user auth path ---
    if users_db:
        matched_user = None
        matched_username = None
        for username, user_data in users_db.items():
            try:
                passphrase_ok = bcrypt.checkpw(req.passphrase.encode('utf-8'), user_data["passphrase_hash"].encode('utf-8'))
                password_ok = bcrypt.checkpw(req.password.encode('utf-8'), user_data["password_hash"].encode('utf-8'))
                user_totp = pyotp.TOTP(user_data["totp_secret"])
                totp_ok = user_totp.verify(req.token, valid_window=1)
                if passphrase_ok and password_ok and totp_ok:
                    matched_user = user_data
                    matched_username = username
                    break
            except Exception:
                continue
        
        if not matched_user:
            _fail_auth(client_ip, now)
        
        # TOTP replay protection
        if _last_used_totp == req.token:
            _fail_auth(client_ip, now)
        _last_used_totp = req.token
        
        api_token = secrets.token_hex(32)
        if len(VALID_API_TOKENS) >= MAX_TOKENS:
            oldest_token = min(VALID_API_TOKENS.keys(), key=lambda k: (
                VALID_API_TOKENS[k] if isinstance(VALID_API_TOKENS[k], (int, float))
                else VALID_API_TOKENS[k].get("expires", 0)
            ))
            del VALID_API_TOKENS[oldest_token]
        VALID_API_TOKENS[api_token] = {
            "expires": time.time() + TOKEN_TTL,
            "user": matched_username,
            "role": matched_user.get("role", "user"),
            "prefix": matched_user.get("sessions_prefix", "")
        }
        save_tokens()
        auth_attempts[client_ip] = (0, None)
        return {"api_token": api_token, "user": matched_username, "role": matched_user.get("role", "user")}

    # --- Single-user auth path (legacy) ---
    # Step 1: Verify Passphrase (stealth "Name" field)
    if not req.passphrase or not bcrypt.checkpw(req.passphrase.encode('utf-8'), admin_passphrase_hash.encode('utf-8')):
        _fail_auth(client_ip, now)

    # Step 2: Verify TOTP
    if not totp_instance.verify(req.token, valid_window=1):
        _fail_auth(client_ip, now)

    # Step 2b: TOTP replay protection
    if _last_used_totp == req.token:
        _fail_auth(client_ip, now)
    _last_used_totp = req.token

    # Step 3: Verify Password
    if not bcrypt.checkpw(req.password.encode('utf-8'), admin_password_hash.encode('utf-8')):
        _fail_auth(client_ip, now)

    api_token = secrets.token_hex(32)
    if len(VALID_API_TOKENS) >= MAX_TOKENS:
        oldest_token = min(VALID_API_TOKENS.keys(), key=lambda k: (
            VALID_API_TOKENS[k] if isinstance(VALID_API_TOKENS[k], (int, float))
            else VALID_API_TOKENS[k].get("expires", 0)
        ))
        del VALID_API_TOKENS[oldest_token]
    VALID_API_TOKENS[api_token] = {
        "expires": time.time() + TOKEN_TTL,
        "user": "admin",
        "role": "admin",
        "prefix": ""
    }
    save_tokens()
    auth_attempts[client_ip] = (0, None)
    return {"api_token": api_token}

@router.post("/api/logout", dependencies=[Depends(verify_token)])
def logout(x_api_token: str = Header(None)):
    if x_api_token in VALID_API_TOKENS:
        del VALID_API_TOKENS[x_api_token]
        save_tokens()
    return {"message": "Logged out"}

@router.get("/api/health")
def health_check() -> dict:
    """Health check endpoint for Docker and monitoring watchdogs."""
    return {"status": "ok", "service": "aim-connect"}
