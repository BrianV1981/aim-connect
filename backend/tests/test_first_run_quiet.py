"""
#181 — first-run TOTP/password/passphrase must not hit pytest/CI stdout.

Generation may still write files. Operator TTY ./startup.sh UX is unchanged.
"""

import sys

import pytest


def _force_tty(monkeypatch):
    monkeypatch.setattr(sys.stdout, "isatty", lambda: True)


def _point_secret_files(monkeypatch, tmp_path):
    import main

    monkeypatch.setattr(main, "SECRET_FILE", str(tmp_path / "totp.secret"))
    monkeypatch.setattr(main, "PASSWORD_FILE", str(tmp_path / "password.hash"))
    monkeypatch.setattr(main, "PASSPHRASE_FILE", str(tmp_path / "passphrase.hash"))


LEAK_NEEDLES = (
    "PASSWORD SETUP",
    "PASSPHRASE SETUP",
    "manually enter this secret",
    "TOTP SETUP",
)


def _assert_quiet(capsys):
    out = capsys.readouterr().out
    for needle in LEAK_NEEDLES:
        assert needle not in out, f"credential material leaked: {needle!r}"


class TestFirstRunQuiet:
    def test_ci_true_suppresses_prints(self, monkeypatch, tmp_path, capsys):
        import main

        monkeypatch.setenv("CI", "true")
        monkeypatch.delenv("AIM_CONNECT_TEST", raising=False)
        _force_tty(monkeypatch)
        _point_secret_files(monkeypatch, tmp_path)

        main.get_or_create_totp()
        main.get_or_create_password()
        main.get_or_create_passphrase()
        _assert_quiet(capsys)

    def test_aim_connect_test_suppresses_prints(self, monkeypatch, tmp_path, capsys):
        import main

        monkeypatch.delenv("CI", raising=False)
        monkeypatch.setenv("AIM_CONNECT_TEST", "1")
        _force_tty(monkeypatch)
        _point_secret_files(monkeypatch, tmp_path)

        main.get_or_create_totp()
        main.get_or_create_password()
        main.get_or_create_passphrase()
        _assert_quiet(capsys)

    def test_non_tty_suppresses_prints(self, monkeypatch, tmp_path, capsys):
        import main

        monkeypatch.delenv("CI", raising=False)
        monkeypatch.delenv("AIM_CONNECT_TEST", raising=False)
        monkeypatch.setattr(sys.stdout, "isatty", lambda: False)
        _point_secret_files(monkeypatch, tmp_path)

        main.get_or_create_totp()
        main.get_or_create_password()
        main.get_or_create_passphrase()
        _assert_quiet(capsys)
