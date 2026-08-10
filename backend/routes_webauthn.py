import time
import secrets
from pydantic import BaseModel
from fastapi import APIRouter, Request, HTTPException, Header, Depends
from main import (
    verify_token, _get_user_from_token, WEBAUTHN_RP_ID, users_db,
    VALID_API_TOKENS, TOKEN_TTL, save_tokens
)
from webauthn_manager import webauthn_mgr


router = APIRouter()

class WebAuthnVerifyReq(BaseModel):
    response: dict

class WebAuthnAuthReq(BaseModel):
    username: str = "admin"

class WebAuthnAuthVerifyReq(BaseModel):
    username: str = "admin"
    response: dict

@router.get("/api/webauthn/register/options", dependencies=[Depends(verify_token)])
def webauthn_register_options(request: Request, x_api_token: str = Header(None)):
    role, username = _get_user_from_token(x_api_token)
    user_key = username or "admin"
    options = webauthn_mgr.generate_registration(user_key, rp_id=WEBAUTHN_RP_ID)
    return {"options": options}

@router.post("/api/webauthn/register/verify", dependencies=[Depends(verify_token)])
def webauthn_register_verify(req: WebAuthnVerifyReq, request: Request, x_api_token: str = Header(None)):
    role, username = _get_user_from_token(x_api_token)
    user_key = username or "admin"
    origin = request.headers.get("origin") or f"{request.url.scheme}://{request.headers.get('host', request.url.netloc)}"
    success = webauthn_mgr.verify_registration(user_key, req.response, rp_id=WEBAUTHN_RP_ID, origin=origin)
    if not success:
        raise HTTPException(status_code=400, detail="Registration failed")
    return {"status": "success"}

@router.post("/api/webauthn/authenticate/options")
def webauthn_auth_options(req: WebAuthnAuthReq, request: Request):
    user_name = req.username
    if not users_db:
        user_name = "admin"
        
    options = webauthn_mgr.generate_authentication(user_name, rp_id=WEBAUTHN_RP_ID)
    if not options:
        raise HTTPException(status_code=404, detail="No credentials found")
    return {"options": options}

@router.post("/api/webauthn/authenticate/verify")
def webauthn_auth_verify(req: WebAuthnAuthVerifyReq, request: Request):
    user_name = req.username
    if not users_db:
        user_name = "admin"
        
    origin = request.headers.get("origin") or f"{request.url.scheme}://{request.headers.get('host', request.url.netloc)}"
    if request.headers.get('x-forwarded-proto') == 'https' and not request.headers.get("origin"):
        origin = f"https://{request.headers.get('host', request.url.netloc)}"
    success = webauthn_mgr.verify_authentication(user_name, req.response, rp_id=WEBAUTHN_RP_ID, origin=origin)
    if not success:
        raise HTTPException(status_code=401, detail="Authentication failed")
        
    # Generate token since WebAuthn succeeded
    new_token = secrets.token_hex(32)
    role = "admin" if not users_db else users_db.get(user_name, {}).get("role", "user")
    VALID_API_TOKENS[new_token] = {
        "expires": time.time() + TOKEN_TTL,
        "user": user_name,
        "role": role
    }
    save_tokens()
    return {"token": new_token, "role": role}
