"""
Test fixtures for aim-connect backend.

Strategy: create temp credential files with KNOWN values before (re)loading
main.py so every module-level global (`totp_instance`, `admin_password_hash`,
`admin_passphrase_hash`) is initialised against our test secrets.
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


def _write_credential_files(directory: str) -> None:
    """Write password.hash, passphrase.hash, and totp.secret into *directory*."""
    pw_hash = bcrypt.hashpw(TEST_PASSWORD.encode(), bcrypt.gensalt()).decode()
    pp_hash = bcrypt.hashpw(TEST_PASSPHRASE.encode(), bcrypt.gensalt()).decode()

    with open(os.path.join(directory, "password.hash"), "w") as f:
        f.write(pw_hash)
    with open(os.path.join(directory, "passphrase.hash"), "w") as f:
        f.write(pp_hash)
    with open(os.path.join(directory, "totp.secret"), "w") as f:
        f.write(TEST_TOTP_SECRET)

    os.makedirs(os.path.join(directory, "workspace"), exist_ok=True)


# ---------------------------------------------------------------------------
# Session-scoped fixture — sets up the temp env and (re)loads main once
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def _bootstrap_app(tmp_path_factory):
    """
    Prepare a temporary working directory with known credential files,
    then (re)import ``main`` so its module-level globals use them.

    This is session-scoped so the heavy bcrypt hashing + module reload
    only happens once per test run.
    """
    tmp = tmp_path_factory.mktemp("aim")
    _write_credential_files(str(tmp))

    # Ensure backend/ is on sys.path so ``import main`` works
    backend_dir = os.path.join(os.path.dirname(__file__), "..")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    # chdir so main.py's relative file reads hit our temp files
    original_cwd = os.getcwd()
    os.chdir(str(tmp))

    # (Re)load main so the module-level init picks up our creds
    if "main" in sys.modules:
        importlib.reload(sys.modules["main"])
    else:
        import main  # noqa: F401

    yield

    os.chdir(original_cwd)


@pytest.fixture(autouse=True)
def _reset_auth_state():
    """
    Reset mutable module-level state between tests so they stay independent.
    """
    import main

    main.auth_attempts.clear()
    main._last_used_totp = None
    yield
    main.auth_attempts.clear()
    main._last_used_totp = None
