"""#163 — OpenCode provider → env / --model table."""

from opencode_providers import (
    infer_opencode_provider,
    map_opencode_cli_model,
    normalize_opencode_variant,
    opencode_auth_json,
    opencode_bwrap_setenv,
    opencode_env_pairs,
    opencode_user_config,
    resolve_opencode_auth,
    write_opencode_auth_json,
    write_opencode_user_config,
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
        assert r.variant is None
        assert r.byok_fingerprint == "deepseek:sk-ds:default"

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
        assert r.byok_fingerprint == "google:gk-old:default"

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


class TestVariants:
    def test_v4_flash_accepts_high(self):
        assert normalize_opencode_variant("deepseek/deepseek-v4-flash", "high") == "high"
        assert normalize_opencode_variant("deepseek/deepseek-v4-pro", "max") == "max"

    def test_default_and_empty_are_omitted(self):
        assert normalize_opencode_variant("deepseek/deepseek-v4-flash", "default") is None
        assert normalize_opencode_variant("deepseek/deepseek-v4-flash", "") is None

    def test_chat_has_no_variants(self):
        assert normalize_opencode_variant("deepseek/deepseek-chat", "high") is None

    def test_config_sets_agent_build_variant(self):
        cfg = opencode_user_config("deepseek/deepseek-v4-flash", "medium")
        assert cfg["model"] == "deepseek/deepseek-v4-flash"
        assert cfg["agent"]["build"]["variant"] == "medium"

    def test_config_default_has_no_agent_variant(self):
        cfg = opencode_user_config("deepseek/deepseek-v4-flash", "default")
        assert "agent" not in cfg
        assert cfg["snapshot"] is False

    def test_auth_json_matches_host_login_shape(self):
        body = opencode_auth_json("deepseek", "sk-test")
        assert body == {"deepseek": {"type": "api", "key": "sk-test"}}
        assert opencode_auth_json("deepseek", "") == {}

    def test_write_auth_json_file(self, tmp_path):
        path = write_opencode_auth_json(str(tmp_path), "deepseek", "sk-test")
        assert path.endswith("auth.json")
        raw = (tmp_path / "auth.json").read_text()
        assert '"type": "api"' in raw
        assert "sk-test" in raw

    def test_resolve_reads_opencode_variant(self):
        r = resolve_opencode_auth(
            {
                "opencode_provider": "deepseek",
                "opencode_api_key": "sk-ds",
                "opencode_model": "deepseek/deepseek-v4-flash",
                "opencode_variant": "high",
            }
        )
        assert r.variant == "high"
        assert r.byok_fingerprint == "deepseek:sk-ds:high"

    def test_write_config_file(self, tmp_path):
        path = write_opencode_user_config(
            str(tmp_path / "joshua_config"),
            "deepseek/deepseek-v4-pro",
            "low",
        )
        body = (tmp_path / "joshua_config" / "opencode.json").read_text()
        assert path.endswith("opencode.json")
        assert '"variant": "low"' in body
