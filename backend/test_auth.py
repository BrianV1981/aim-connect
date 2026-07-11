import pytest
from fastapi.testclient import TestClient
from main import app, totp_instance, admin_password_hash
import time

client = TestClient(app)

def test_auth_missing_fields():
    # Should fail if fields are missing
    response = client.post("/api/auth", json={"token": "123456"})
    assert response.status_code == 422 # Pydantic validation error

def test_auth_invalid_totp():
    # Generate valid password but invalid TOTP
    response = client.post("/api/auth", json={
        "token": "000000", # assuming this is invalid
        "password": "wrong_password"
    })
    assert response.status_code == 401
    assert "Invalid TOTP or Password" in response.json()["detail"]

def test_auth_rate_limiting():
    # Attempt 5 times rapidly
    for _ in range(5):
        res = client.post("/api/auth", json={"token": "000000", "password": "wrong"})
    
    # 6th attempt should hit rate limit (429)
    response = client.post("/api/auth", json={"token": "000000", "password": "wrong"})
    assert response.status_code == 429
    assert "Too many attempts" in response.json()["detail"]

    # Clean up rate limiter manually so it doesn't break other tests
    from main import auth_attempts
    auth_attempts.clear()
