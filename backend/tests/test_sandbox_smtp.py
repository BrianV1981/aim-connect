"""#186 — SMTP injection flags for customer bwrap sandboxes."""

from sandbox_smtp import (
    bwrap_smtp_setenv,
    redact_bwrap_cmd,
    smtp_configured,
    smtp_values,
)


class TestSmtpFlags:
    def test_missing_is_empty(self):
        env = {"FOO": "bar"}
        assert smtp_values(env) == {}
        assert bwrap_smtp_setenv(env) == ""
        assert smtp_configured(env) is False

    def test_quotes_and_spaces(self):
        env = {
            "LEADDEED_SMTP_HOST": "50.87.170.84",
            "LEADDEED_SMTP_PORT": "587",
            "LEADDEED_SMTP_USER": "noreply@leaddeeds.com",
            "LEADDEED_SMTP_PASS": "p@ss word",
            "LEADDEED_SMTP_SECURE": "false",
            "LEADDEED_MAIL_FROM": "LeadDeeds <noreply@leaddeeds.com>",
        }
        flags = bwrap_smtp_setenv(env)
        assert "--setenv LEADDEED_SMTP_HOST 50.87.170.84" in flags
        assert "--setenv LEADDEED_SMTP_PORT 587" in flags
        assert "p@ss word" in flags or "'p@ss word'" in flags
        assert smtp_configured(env) is True

    def test_partial_host_only_still_emits_but_not_configured(self):
        env = {"LEADDEED_SMTP_HOST": "50.87.170.84"}
        assert "LEADDEED_SMTP_HOST" in bwrap_smtp_setenv(env)
        assert smtp_configured(env) is False

    def test_redact_strips_password(self):
        env = {"LEADDEED_SMTP_PASS": "super-secret-pass"}
        cmd = "bwrap --setenv LEADDEED_SMTP_PASS super-secret-pass --setenv AIM_VESSEL_CLI grok"
        out = redact_bwrap_cmd(cmd, secrets=env.values())
        assert "super-secret-pass" not in out
        assert "***" in out
        assert "grok" in out
