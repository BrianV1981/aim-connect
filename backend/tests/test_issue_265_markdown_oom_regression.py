import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
PARSER_JS = WORKTREE_ROOT / "frontend" / "src" / "markdownParser.js"


def test_markdown_parser_never_infinite_loops_on_recursive_bold_italic_links_or_lists():
    """#265: Execute markdownParser.js in Node with a strict 3s timeout to prevent recursive RegExp lastIndex OOM crashes."""
    script = f"""
import {{ parseMarkdownBlocks, tokenizeInlineMarkdown, parseFileUriTarget }} from {json.dumps(PARSER_JS.as_uri())};

const sample = [
  "### Button Name & Live Update (`#263`)",
  "",
  "1. **What It's Called:** That lightning-emblem button on the left of the composer is the **Bolt Quick-Actions / Control Pad button** (`.ld-bolt-btn` in [App.jsx](file:///workspace/aim-connect/frontend/src/App.jsx#L1998-L2018)), which opens the **Bolt Quick-Actions Popover** (`.quick-actions-popover`).",
  "2. ***Nested bold italic*** with ~~strikethrough~~ and [External](https://example.com/docs?q=1) and bare https://api.leaddeeds.com/health.",
  "   - Nested sub-item with **more bold** and `inline_code()`",
  "   - Second nested sub-item",
  "",
  "| Surface | Status |",
  "| --- | --- |",
  "| **Chat View** | `200 OK` |",
  "",
  "```python",
  "def check():",
  "    return True",
  "```",
].join("\\n");

const t0 = performance.now();
const blocks = parseMarkdownBlocks(sample);
for (const b of blocks) {{
  if (b.text) tokenizeInlineMarkdown(b.text);
  if (b.lines) b.lines.forEach((l) => tokenizeInlineMarkdown(l));
  if (b.items) b.items.forEach((it) => tokenizeInlineMarkdown(it.textLines.join(" ")));
}}
const elapsedMs = performance.now() - t0;

const fileTarget = parseFileUriTarget("file:///workspace/aim-connect/frontend/src/App.jsx#L1998-L2018");
console.log(JSON.stringify({{
  blockTypes: blocks.map((b) => b.type),
  listLen: blocks.find((b) => b.type === "list")?.items?.length || 0,
  fileTarget,
  elapsedMs,
}}));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        timeout=3.0,
    )
    assert proc.returncode == 0, f"Node markdownParser failed: {proc.stderr}"
    result = json.loads(proc.stdout.strip())
    assert result["blockTypes"] == ["heading", "list", "table", "code"]
    assert result["listLen"] == 2
    assert result["fileTarget"] == {
        "path": "/workspace/aim-connect/frontend/src/App.jsx",
        "line": 1998,
        "endLine": 2018,
    }
    assert result["elapsedMs"] < 250
