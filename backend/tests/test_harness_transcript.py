"""#183 — Grok live scrape must see chat_history assistant turns like AGY PLANNER_RESPONSE."""

from harness_transcript import (
    extract_agy_planner_text,
    extract_grok_assistant_text,
    extract_live_agent_text,
)


class TestGrokAssistantExtract:
    def test_string_content(self):
        rec = {"type": "assistant", "content": "Hello Brian"}
        assert extract_grok_assistant_text(rec) == "Hello Brian"

    def test_list_text_blocks(self):
        rec = {"type": "assistant", "content": [{"type": "text", "text": "Ranked leads"}]}
        assert extract_grok_assistant_text(rec) == "Ranked leads"

    def test_preview_with_tool_calls_still_visible(self):
        rec = {
            "type": "assistant",
            "content": "I'll check today's daily spreadsheets and brief for the freshest leads.",
            "tool_calls": [{"name": "list_dir"}],
        }
        text = extract_grok_assistant_text(rec)
        assert text is not None
        assert "I'll check" in text

    def test_tool_only_empty_content_skipped(self):
        rec = {"type": "assistant", "content": "", "tool_calls": [{"name": "run_terminal_command"}]}
        assert extract_grok_assistant_text(rec) is None

    def test_skips_user_system_reasoning(self):
        assert extract_grok_assistant_text({"type": "user", "content": "hi"}) is None
        assert extract_grok_assistant_text({"type": "system", "content": "sys"}) is None
        assert extract_grok_assistant_text({"type": "reasoning", "content": "think"}) is None

    def test_two_turn_burst_both_visible(self):
        preview = {
            "type": "assistant",
            "content": "I'll check on that.",
            "tool_calls": [{"name": "list_dir"}],
        }
        final = {
            "type": "assistant",
            "content": "Here are the freshest Target + Added commercial leads.",
        }
        assert extract_grok_assistant_text(preview) == "I'll check on that."
        assert "freshest" in extract_grok_assistant_text(final)


class TestAgyPlannerExtract:
    def test_planner_done(self):
        rec = {
            "source": "MODEL",
            "type": "PLANNER_RESPONSE",
            "status": "DONE",
            "content": "I'll look that up.",
        }
        assert extract_agy_planner_text(rec) == "I'll look that up."

    def test_non_planner_ignored(self):
        assert extract_agy_planner_text({"source": "USER", "type": "INPUT", "content": "x"}) is None


class TestUnified:
    def test_dispatches_both_shapes(self):
        agy = {"source": "MODEL", "type": "PLANNER_RESPONSE", "content": "agy text"}
        grok = {"type": "assistant", "content": "grok text"}
        assert extract_live_agent_text(agy) == "agy text"
        assert extract_live_agent_text(grok) == "grok text"
