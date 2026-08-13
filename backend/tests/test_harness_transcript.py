"""#183 — Grok live scrape must see chat_history assistant turns like AGY PLANNER_RESPONSE."""

import json
import sqlite3

from harness_transcript import (
    extract_agy_planner_text,
    extract_grok_assistant_text,
    extract_live_agent_text,
    extract_opencode_assistant_text,
    iter_new_opencode_assistant_texts,
    opencode_max_part_ts,
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


class TestOpencodeAssistantExtract:
    def test_text_part_on_assistant(self):
        msg = {"role": "assistant"}
        part = {"type": "text", "text": "Hello Brian! I am J.O.S.H.U.A."}
        assert "J.O.S.H.U.A." in extract_opencode_assistant_text(msg, part)

    def test_skips_user_and_non_text_parts(self):
        assert extract_opencode_assistant_text({"role": "user"}, {"type": "text", "text": "hi"}) is None
        assert extract_opencode_assistant_text({"role": "assistant"}, {"type": "step-start"}) is None
        assert extract_opencode_assistant_text(
            {"role": "assistant"}, {"type": "step-finish", "reason": "stop"}
        ) is None
        assert extract_opencode_assistant_text({"role": "assistant"}, {"type": "tool"}) is None

    def test_empty_text_skipped(self):
        assert extract_opencode_assistant_text({"role": "assistant"}, {"type": "text", "text": "  "}) is None

    def test_two_turn_burst_both_text_parts(self):
        preview = extract_opencode_assistant_text(
            {"role": "assistant"}, {"type": "text", "text": "I'll check on that."}
        )
        final = extract_opencode_assistant_text(
            {"role": "assistant"}, {"type": "text", "text": "Here is what AGENTS.md says."}
        )
        assert preview == "I'll check on that."
        assert "AGENTS.md" in final


class TestOpencodeDbCursor:
    def _seed(self, path):
        conn = sqlite3.connect(path)
        conn.executescript(
            """
            CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, time_updated INTEGER, data TEXT);
            CREATE TABLE part (id TEXT PRIMARY KEY, message_id TEXT, session_id TEXT, time_created INTEGER, time_updated INTEGER, data TEXT);
            """
        )
        conn.execute(
            "INSERT INTO message VALUES (?,?,?,?,?)",
            ("m_user", "s", 1, 1, json.dumps({"role": "user"})),
        )
        conn.execute(
            "INSERT INTO part VALUES (?,?,?,?,?,?)",
            ("p_user", "m_user", "s", 1, 1, json.dumps({"type": "text", "text": "Testing"})),
        )
        conn.execute(
            "INSERT INTO message VALUES (?,?,?,?,?)",
            ("m_tool", "s", 2, 2, json.dumps({"role": "assistant"})),
        )
        conn.execute(
            "INSERT INTO part VALUES (?,?,?,?,?,?)",
            ("p_tool", "m_tool", "s", 2, 2, json.dumps({"type": "tool", "tool": "read"})),
        )
        conn.execute(
            "INSERT INTO message VALUES (?,?,?,?,?)",
            ("m_ans", "s", 3, 3, json.dumps({"role": "assistant"})),
        )
        conn.execute(
            "INSERT INTO part VALUES (?,?,?,?,?,?)",
            ("p_ans", "m_ans", "s", 3, 3, json.dumps({"type": "text", "text": "Here is the answer."})),
        )
        conn.commit()
        conn.close()

    def test_seed_cursor_skips_history_then_emits_new(self, tmp_path):
        db = str(tmp_path / "opencode.db")
        self._seed(db)
        cursor = opencode_max_part_ts(db)
        assert cursor == 3
        assert iter_new_opencode_assistant_texts(db, cursor) == []

        conn = sqlite3.connect(db)
        conn.execute(
            "INSERT INTO message VALUES (?,?,?,?,?)",
            ("m2", "s", 4, 4, json.dumps({"role": "assistant"})),
        )
        conn.execute(
            "INSERT INTO part VALUES (?,?,?,?,?,?)",
            ("p2", "m2", "s", 4, 4, json.dumps({"type": "text", "text": "Second burst."})),
        )
        conn.commit()
        conn.close()

        got = iter_new_opencode_assistant_texts(db, cursor)
        assert got == [(4, "Second burst.")]
        assert iter_new_opencode_assistant_texts(db, 0)[-1][1] == "Second burst."
