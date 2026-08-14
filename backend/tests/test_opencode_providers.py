"""#163 — OpenCode provider → env / --model table."""

from opencode_providers import (
    infer_opencode_provider,
    map_opencode_cli_model,
    opencode_bwrap_setenv,
    opencode_env_pairs,
    resolve_opencode_auth,
)


class TestInferProvider:
    def test_explicit_wins(self):
        assert infer_opencode_provider("gemini-3.5-flash-lite", "deepseek") == "deepseek"

    def test_deepseek_prefix(self):
        assert infer_opencode_provider("deepseek/deepseek-chat") == "deepseek"
        assert infer_opencode_provider("deepseek-reasoner") == "deepseek"

    def test_legacy_gemini_defaults_google(self):
        assert infer_opencode_provider("gemini-3.5-flash-lite") == "google"
        assert infer_opencode_provider(None) == "google"


class TestModelMap:
    def test_legacy_gemini_ids(self):
        assert (
            map_opencode_cli_model("google", "gemini-3.5-flash-lite")
            == "google/gemini-flash-lite-latest"
        )
        assert (
            map_opencode_cli_model("google", "gemini-3.5-flash")
            == "google/gemini-flash-latest"
        )
        assert map_opencode_cli_model("google", "gemini-3.1-pro") == "google/gemini-2.5-pro"

    def test_deepseek_passthrough(self):
        assert (
            map_opencode_cli_model("deepseek", "deepseek/deepseek-v4-flash")
            == "deepseek/deepseek-v4-flash"
        )
        assert (
            map_opencode_cli_model("deepseek", "deepseek-chat")
            == "deepseek/deepseek-chat"
        )


class TestEnvPairs:
    def test_google_injects_both_gemini_envs(self):
        pairs = opencode_env_pairs("google", "gk-test")
        names = [n for n, _ in pairs]
        assert names == ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]
        assert all(v == "gk-test" for _, v in pairs)

    def test_deepseek_only_deepseek_env(self):
        pairs = opencode_env_pairs("deepseek", "sk-ds")
        assert pairs == [("DEEPSEEK_API_KEY", "sk-ds")]
        flags = opencode_bwrap_setenv("deepseek", "sk-ds")
        assert "DEEPSEEK_API_KEY" in flags
        assert "GEMINI_API_KEY" not in flags
        assert "GOOGLE_GENERATIVE_AI_API_KEY" not in flags

    def test_empty_key_emits_nothing(self):
        assert opencode_env_pairs("google", "") == []
        assert opencode_bwrap_setenv("deepseek", "") == ""


class TestResolveAuth:
    def test_new_fields(self):
        r = resolve_opencode_auth(
            {
                "opencode_provider": "deepseek",
                "opencode_api_key": "sk-ds",
                "opencode_model": "deepseek/deepseek-chat",
            }
        )
        assert r.provider == "deepseek"
        assert r.api_key == "sk-ds"
        assert r.cli_model == "deepseek/deepseek-chat"
        assert r.byok_fingerprint == "deepseek:sk-ds"

    def test_legacy_gemini_fields(self):
        r = resolve_opencode_auth(
            {
                "gemini_api_key": "gk-old",
                "gemini_model": "gemini-3.5-flash-lite",
            }
        )
        assert r.provider == "google"
        assert r.api_key == "gk-old"
        assert r.cli_model == "google/gemini-flash-lite-latest"
        assert r.byok_fingerprint == "google:gk-old"

    def test_does_not_keep_inactive_key(self):
        r = resolve_opencode_auth(
            {
                "opencode_provider": "deepseek",
                "opencode_api_key": "sk-ds",
                "opencode_model": "deepseek/deepseek-reasoner",
                "gemini_api_key": "gk-should-not-win",
            }
        )
        assert r.api_key == "sk-ds"
        assert "gk-should-not-win" not in r.byok_fingerprint
