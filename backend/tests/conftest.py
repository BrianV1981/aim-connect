"""
Test fixtures for aim-connect backend.

#169 bound totp.secret / password.hash / passphrase.hash to BACKEND_DIR
(dirname(abspath(main.py))). Tests must write known credentials to that
same directory — cwd-relative tmp files are invisible to main.py.

Existing files (if any) are snapshotted and restored after the session
so a local checkout's operator secrets are not left as test fixtures.
"""

import importlib
import os
import sys

import bcrypt
import pyotp
import pytest

# ---------------------------------------------------------------------------
# Shared test credentials (plain-text values used by test_auth / test_security)
# ---------------------------------------------------------------------------
TEST_PASSWORD = "testpass123"
TEST_PASSPHRASE = "testphrase456"
TEST_TOTP_SECRET = pyotp.random_base32()

# Files main.py reads from BACKEND_DIR. Isolate all of them so login tests
# hit the single-user path and do not persist tokens into a real store.
_MANAGED_FILES = (
    "totp.secret",
    "password.hash",
    "passphrase.hash",
    "tokens.json",
    "users.json",
)


def _backend_dir() -> str:
    """Same resolution main.py uses: dirname(abspath(__file__)) of main.py."""
    return os.path.dirname(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "main.py")))


def _snapshot_files(directory: str) -> dict:
    snap = {}
    for name in _MANAGED_FILES:
        path = os.path.join(directory, name)
        if os.path.exists(path):
            with open(path, "rb") as f:
                snap[name] = f.read()
        else:
            snap[name] = None
    return snap


def _restore_files(directory: str, snap: dict) -> None:
    for name, data in snap.items():
        path = os.path.join(directory, name)
        if data is None:
            if os.path.exists(path):
                os.remove(path)
        else:
            with open(path, "wb") as f:
                f.write(data)


def _write_credential_files(directory: str) -> None:
    """Write known test hashes/secret into BACKEND_DIR (and empty token store)."""
    pw_hash = bcrypt.hashpw(TEST_PASSWORD.encode(), bcrypt.gensalt()).decode()
    pp_hash = bcrypt.hashpw(TEST_PASSPHRASE.encode(), bcrypt.gensalt()).decode()

    with open(os.path.join(directory, "password.hash"), "w") as f:
        f.write(pw_hash)
    with open(os.path.join(directory, "passphrase.hash"), "w") as f:
        f.write(pp_hash)
    with open(os.path.join(directory, "totp.secret"), "w") as f:
        f.write(TEST_TOTP_SECRET)
    with open(os.path.join(directory, "tokens.json"), "w") as f:
        f.write("{}")
    users_path = os.path.join(directory, "users.json")
    if os.path.exists(users_path):
        os.remove(users_path)


# ---------------------------------------------------------------------------
# Session-scoped fixture — writes creds to BACKEND_DIR and (re)loads main once
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def _bootstrap_app():
    """
    Write known credential files into the same BACKEND_DIR main.py reads,
    then (re)import ``main`` so its module-level globals use them.

    Session-scoped so the heavy bcrypt hashing + module reload happens once.
    """
    backend_dir = _backend_dir()
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    snap = _snapshot_files(backend_dir)
    _write_credential_files(backend_dir)

    try:
        if "main" in sys.modules:
            importlib.reload(sys.modules["main"])
        else:
            import main  # noqa: F401

        # Reload route modules that cache credential references from main
        for mod_name in [
            "routes_auth",
            "routes_sessions",
            "routes_files",
            "routes_agents",
            "routes_fleet",
            "routes_webauthn",
        ]:
            if mod_name in sys.modules:
                importlib.reload(sys.modules[mod_name])

        yield
    finally:
        _restore_files(backend_dir, snap)


@pytest.fixture(autouse=True)
def _reset_auth_state():
    """
    Reset mutable module-level state between tests so they stay independent.
    """
    import main
    import routes_auth

    main.auth_attempts.clear()
    routes_auth._last_used_totp = None
    yield
    main.auth_attempts.clear()
    routes_auth._last_used_totp = None
