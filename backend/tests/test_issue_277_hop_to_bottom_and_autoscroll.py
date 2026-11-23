import json
import subprocess
from pathlib import Path


WORKTREE_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = WORKTREE_ROOT / "frontend" / "src"
SCROLL_UTILS_JS = FRONTEND_SRC / "sessionScrollUtils.js"


def test_session_scroll_decision_logic_in_node():
    """#277: Verify OFF-by-default parked reading behavior, ON auto-scroll with upward scroll-lock, and Hop-to-Bottom threshold."""
    assert SCROLL_UTILS_JS.is_file(), "Missing frontend/src/sessionScrollUtils.js"

    script = f"""
import {{
  isViewportScrolledUp,
  decideTurnScrollAction,
}} from {json.dumps(SCROLL_UTILS_JS.as_uri())};

// 1. Default Auto-Scroll OFF: tall 650px reply stays parked and lights up unseen badge
const offTallReply = decideTurnScrollAction({{
  autoScroll: false,
  wasPinnedBeforeUpdate: true,
  postRenderDistancePx: 650,
  optimisticAdded: false,
}});

// 2. Auto-Scroll ON while pinned at bottom: follows tall 650px reply all the way down
const onPinnedTallReply = decideTurnScrollAction({{
  autoScroll: true,
  wasPinnedBeforeUpdate: true,
  postRenderDistancePx: 650,
  optimisticAdded: false,
}});

// 3. Auto-Scroll ON while user manually scrolled up: respects scroll-lock and shows ↓ NEW
const onScrolledUp = decideTurnScrollAction({{
  autoScroll: true,
  wasPinnedBeforeUpdate: false,
  postRenderDistancePx: 900,
  optimisticAdded: false,
}});

// 4. Auto-Scroll ON when Operator submits a new prompt: snaps to bottom
const onOptimisticSend = decideTurnScrollAction({{
  autoScroll: true,
  wasPinnedBeforeUpdate: false,
  postRenderDistancePx: 500,
  optimisticAdded: true,
}});

console.log(JSON.stringify({{
  atBottom: isViewportScrolledUp(1000, 380, 600),
  scrolledUp: isViewportScrolledUp(1400, 300, 600),
  offTallReply,
  onPinnedTallReply,
  onScrolledUp,
  onOptimisticSend,
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
    assert out["atBottom"] is False
    assert out["scrolledUp"] is True
    assert out["offTallReply"] == {"shouldScrollToBottom": False, "markUnseenBelow": True}
    assert out["onPinnedTallReply"] == {"shouldScrollToBottom": True, "markUnseenBelow": False}
    assert out["onScrolledUp"] == {"shouldScrollToBottom": False, "markUnseenBelow": True}
    assert out["onOptimisticSend"] == {"shouldScrollToBottom": True, "markUnseenBelow": False}


def test_issue_277_hop_to_bottom_and_autoscroll_ui_contracts():
    """#277: Floating Discord hop-bottom-fab + OFF-by-default sessionAutoScroll wired in App, LiveTranscriptStage, and SettingsModal."""
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")
    chat_jsx = (FRONTEND_SRC / "components" / "LiveTranscriptStage.jsx").read_text(encoding="utf-8")
    settings_jsx = (FRONTEND_SRC / "components" / "SettingsModal.jsx").read_text(encoding="utf-8")
    icons_jsx = (FRONTEND_SRC / "components" / "Icons.jsx").read_text(encoding="utf-8")
    css = (FRONTEND_SRC / "App.css").read_text(encoding="utf-8")

    assert "sessionAutoScroll" in app_jsx
    assert "aim-session-autoscroll" in app_jsx
    assert "sessionAutoScroll" in settings_jsx
    assert "autoScroll" in chat_jsx
    assert "hop-bottom-fab" in chat_jsx
    assert "hop-bottom-fab" in app_jsx
    assert ".hop-bottom-fab" in css
    assert "case 'arrowDown':" in icons_jsx
    assert "case 'arrowDownToLine':" in icons_jsx
