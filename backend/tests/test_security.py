"""
Security-focused tests: token authentication, expiry, and path-traversal
prevention via ``secure_path()``.
"""

import secrets
import time

import pytest
from fastapi.testclient import TestClient


def _get_client():
    from main import app
    return TestClient(app)


# ---------------------------------------------------------------------------
# Unauthenticated access
# ---------------------------------------------------------------------------
class TestUnauthenticatedAccess:
    def test_unauthenticated_sessions_endpoint(self):
        """GET /api/sessions without x-api-token header → 401."""
        client = _get_client()
        resp = client.get("/api/sessions")
        assert resp.status_code == 401
        assert "Unauthorized" in resp.json()["detail"]

    def test_unauthenticated_with_garbage_token(self):
        """A random token that was never issued must be rejected."""
        client = _get_client()
        resp = client.get(
            "/api/sessions",
            headers={"x-api-token": "not-a-real-token"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Token expiry
# ---------------------------------------------------------------------------
class TestTokenExpiry:
    def test_expired_token_rejected(self):
        """Manually insert an expired token → request returns 401."""
        from main import VALID_API_TOKENS

        expired_token = secrets.token_hex(32)
        VALID_API_TOKENS[expired_token] = time.time() - 100  # already expired

        client = _get_client()
        resp = client.get(
            "/api/sessions",
            headers={"x-api-token": expired_token},
        )
        assert resp.status_code == 401
        assert "Token Expired" in resp.json()["detail"]

        # Token should have been evicted from the store
        assert expired_token not in VALID_API_TOKENS


# ---------------------------------------------------------------------------
# Path traversal prevention (secure_path)
# ---------------------------------------------------------------------------
class TestSecurePath:
    def test_secure_path_blocks_traversal(self):
        """``secure_path('../etc/passwd')`` must raise ValueError."""
        from main import secure_path

        with pytest.raises(ValueError, match="Path traversal"):
            secure_path("../etc/passwd")

    def test_secure_path_blocks_absolute_escape(self):
        """An absolute path outside the workspace must be rejected."""
        from main import secure_path

        with pytest.raises(ValueError, match="Path traversal"):
            secure_path("/etc/passwd")

    def test_secure_path_allows_valid(self):
        """A valid subpath should be returned without error."""
        import os
        from main import secure_path, DEFAULT_WORKSPACE

        result = secure_path("subdir/file.txt")
        assert result.startswith(os.path.realpath(DEFAULT_WORKSPACE))
        assert result.endswith("subdir/file.txt")

    def test_secure_path_allows_workspace_root(self):
        """Passing '.' should resolve to the workspace root itself."""
        import os
        from main import secure_path, DEFAULT_WORKSPACE

        result = secure_path(".")
        assert result == os.path.realpath(DEFAULT_WORKSPACE)


# ---------------------------------------------------------------------------
# HTTPS enforcement middleware
# ---------------------------------------------------------------------------
class TestHTTPSEnforcement:
    """Tests for the HTTPS enforcement middleware.

    NOTE: FastAPI TestClient connects from 127.0.0.1 by default, which is
    always allowed (localhost exemption). We can verify the exemptions work
    but cannot easily simulate a non-localhost IP without deeper mocking.
    """

    def test_localhost_allowed_without_https(self):
        """Localhost connections should always be allowed (dev mode)."""
        client = _get_client()
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_endpoint_returns_ok(self):
        """Health endpoint should return status ok."""
        client = _get_client()
        response = client.get("/api/health")
        data = response.json()
        assert data["status"] == "ok"
