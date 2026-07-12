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

def test_secure_path():
    from main import secure_path, DEFAULT_WORKSPACE
    import pytest
    
    # Path traversal should raise ValueError
    with pytest.raises(ValueError):
        secure_path("../../../etc/passwd")
    with pytest.raises(ValueError):
        secure_path("/etc/passwd")

def test_websocket_rejects_invalid_token():
    from fastapi.websockets import WebSocketDisconnect
    import pytest
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/ws") as websocket:
            websocket.send_text('{"type": "auth", "payload": "123456"}')
            websocket.receive_text()
    assert exc.value.code == 1008

def test_token_expiry():
    from main import VALID_API_TOKENS
    import time
    
    VALID_API_TOKENS["expired_token"] = time.time() - 100
    response = client.get("/api/health", headers={"x-api-token": "expired_token"})
    # wait, health is unauthenticated. let's use /api/sessions
    response = client.get("/api/sessions", headers={"x-api-token": "expired_token"})
    assert response.status_code == 401
    assert "Token Expired" in response.json()["detail"]

