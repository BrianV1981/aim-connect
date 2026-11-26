import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
PARSER_JS = WORKTREE_ROOT / "frontend" / "src" / "markdownParser.js"


def test_inline_markdown_no_redos_on_brackets_with_many_backtick_spans():
    """#309: Unclosed/non-link brackets followed by 30+ backticked code spans must tokenize in O(N) (<50ms), not O(2^N)."""
    script = f"""
import {{ parseMarkdownBlocks, tokenizeInlineMarkdown }} from {json.dumps(PARSER_JS.as_uri())};

// Construct adversarial lines matching real-world compound wiki logs:
// literal `[...]` citations followed by 40+ backticked hashes/paths/flags without a trailing `](url)`.
const codeSpans = Array.from({{ length: 45 }}, (_, i) => "`tok_" + i + "_abcdef`").join(" ");
const adversarialDoc = [
  "# Project Compound Wiki",
  "",
  "> Updated: **2026-11-25** ([Phase 0-4] " + codeSpans + " — verified clean)",
  "",
  "1. **Audit Summary (`#530`-`#532`):** Checked [`alpha` `beta` `gamma`] across " + codeSpans + " with [Cards | Table] switcher.",
  "2. **Mixed Valid Links:** Open [`markdownParser.js`](file:///workspace/app/src/markdownParser.js#L3-L10), [Fix `#309` in `FileExplorer`](https://example.com/issues/309), and [Wiki Architecture](pages/architecture/index.md).",
].join("\\n");

const t0 = performance.now();
const blocks = parseMarkdownBlocks(adversarialDoc);
let totalTokens = 0;
const collectedLinks = [];

function walk(blks) {{
  for (const b of blks) {{
    if (b.text) {{
      const t = tokenizeInlineMarkdown(b.text);
      totalTokens += t.length;
    }}
    if (b.lines) {{
      for (const ln of b.lines) {{
        const t = tokenizeInlineMarkdown(ln);
        totalTokens += t.length;
      }}
    }}
    if (b.items) {{
      for (const it of b.items) {{
        const t = tokenizeInlineMarkdown(it.textLines.join(" "));
        totalTokens += t.length;
        for (const tok of t) {{
          if (tok.type === "file_link" || tok.type === "ext_link" || tok.type === "rel_link") {{
            collectedLinks.push(tok);
          }}
        }}
        if (it.subBlocks?.length) walk(it.subBlocks);
      }}
    }}
  }}
}}

walk(blocks);
const elapsedMs = performance.now() - t0;

console.log(JSON.stringify({{
  elapsedMs,
  blockCount: blocks.length,
  totalTokens,
  collectedLinks,
}}));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        timeout=2.0,
    )
    assert proc.returncode == 0, f"Node markdownParser failed or timed out: {proc.stderr}"
    data = json.loads(proc.stdout.strip())
    assert data["elapsedMs"] < 80, f"Expected linear <80ms parse, got {data['elapsedMs']:.2f}ms"
    assert data["blockCount"] == 3
    assert data["totalTokens"] > 90

    links = data["collectedLinks"]
    assert any(
        l["type"] == "file_link"
        and l["label"] == "markdownParser.js"
        and l["path"] == "/workspace/app/src/markdownParser.js"
        and l["line"] == 3
        and l["endLine"] == 10
        for l in links
    )
    assert any(
        l["type"] == "ext_link"
        and l["href"] == "https://example.com/issues/309"
        and any(c.get("type") == "code" and c.get("value") == "#309" for c in l.get("children", []))
        for l in links
    )
    assert any(
        l["type"] == "rel_link"
        and l["label"] == "Wiki Architecture"
        and l["href"] == "pages/architecture/index.md"
        for l in links
    )
