from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel
from typing import Dict, Any
from webauthn_manager import webauthn_mgr

# In a real app we'd pass the auth function, but for now we'll rely on the main.py verify_token
# or we just build it into main.py directly.
