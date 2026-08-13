"""#189 — Grok auth.json ready check (disk, not 0-byte stub)."""

import os

from grok_auth import AUTH_MIN_BYTES, grok_auth_ready, grok_auth_state


def test_missing(tmp_path):
    assert grok_auth_ready(str(tmp_path)) is False
    assert grok_auth_state(str(tmp_path)) == "missing"


def test_empty_stub_is_not_ready(tmp_path):
    auth = tmp_path / "grok_data" / "auth.json"
    auth.parent.mkdir()
    auth.write_bytes(b"")
    assert grok_auth_ready(str(tmp_path)) is False
    assert grok_auth_state(str(tmp_path)) == "empty"


def test_tiny_file_not_ready(tmp_path):
    auth = tmp_path / "grok_data" / "auth.json"
    auth.parent.mkdir()
    auth.write_bytes(b"{}")
    assert grok_auth_ready(str(tmp_path)) is False
    assert grok_auth_state(str(tmp_path)) == "empty"


def test_real_token_ready(tmp_path):
    auth = tmp_path / "grok_data" / "auth.json"
    auth.parent.mkdir()
    auth.write_bytes(b"x" * (AUTH_MIN_BYTES + 1))
    assert grok_auth_ready(str(tmp_path)) is True
    assert grok_auth_state(str(tmp_path)) == "ok"
