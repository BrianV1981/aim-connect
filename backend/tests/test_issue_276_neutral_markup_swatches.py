import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
MARKUP_UTILS_JS = FRONTEND_SRC / "shotMarkupUtils.js"


def test_neutral_white_and_black_swatches_and_adaptive_halo_in_node():
    """#276: MARKUP_COLORS includes neutral WHITE & BLACK swatches with zero semantic association and adaptive dark-ink halo."""
    script = f"""
import {{
  MARKUP_COLORS,
  isDarkInkColor,
}} from {json.dumps(MARKUP_UTILS_JS.as_uri())};

const white = MARKUP_COLORS.find((c) => c.id === 'white');
const black = MARKUP_COLORS.find((c) => c.id === 'black');

console.log(JSON.stringify({{
  ids: MARKUP_COLORS.map((c) => c.id),
  white,
  black,
  darkBlack: isDarkInkColor('#111827'),
  darkWhite: isDarkInkColor('#FFFFFF'),
  darkRed: isDarkInkColor('#FF3B5C'),
}}));
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        capture_output=True,
        text=True,
        timeout=3.0,
    )
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout.strip())
    assert out["ids"] == ["red", "emerald", "cyan", "amber", "white", "black"]
    assert out["white"]["hex"] == "#FFFFFF"
    assert out["white"]["short"] == "WHITE"
    assert out["white"]["neutral"] is True
    assert out["black"]["hex"] == "#111827"
    assert out["black"]["short"] == "BLACK"
    assert out["black"]["neutral"] is True
    assert out["darkBlack"] is True
    assert out["darkWhite"] is False
    assert out["darkRed"] is False
