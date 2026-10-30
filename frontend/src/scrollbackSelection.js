// Helpers for isolated, right-click-safe terminal & file text selection (#227).

const ESC = String.fromCharCode(0x1b);
const BEL = String.fromCharCode(0x07);
const CSI_ESCAPE_RE = new RegExp(`${ESC}\\[[0-9;?]*[a-zA-Z]`, 'g');
const OSC_ESCAPE_RE = new RegExp(`${ESC}\\][^${BEL}${ESC}]*(?:${BEL}|${ESC}\\\\)`, 'g');
const TRAILING_SPACES_BEFORE_RESET_RE = new RegExp(
  `[ \\t]+((?:${ESC}\\[(?:0|39|22|23|24|27|28|29)?m)*)$`
);

/**
 * Normalize line endings and strip trailing tmux horizontal space padding per line
 * while preserving leading indentation and inline ANSI color escapes.
 */
export function sanitizeAnsiScrollback(rawText) {
  if (!rawText) return '';
  return String(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(TRAILING_SPACES_BEFORE_RESET_RE, '$1'))
    .join('\n');
}

/**
 * Strip ANSI escape sequences and trailing per-line spaces for clean plain-text copy.
 */
export function stripAnsiAndTrimLines(rawText) {
  if (!rawText) return '';
  return String(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(OSC_ESCAPE_RE, '')
    .replace(CSI_ESCAPE_RE, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n');
}

/**
 * Return true when a mousedown event is a context-menu click (right-click or Ctrl+Left-Click)
 * while a non-empty DOM text selection already exists. Calling preventDefault() on mousedown
 * prevents the browser from moving the caret and collapsing the highlight before the native
 * right-click Copy menu opens.
 */
export function shouldPreserveSelectionOnMouseDown(event, selection) {
  const isContextClick =
    event?.button === 2 || (event?.button === 0 && Boolean(event?.ctrlKey));
  if (!isContextClick || !selection || selection.isCollapsed) {
    return false;
  }
  const text = typeof selection.toString === 'function' ? selection.toString() : '';
  return text.length > 0;
}

export function preserveSelectionOnRightClick(event) {
  const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
  if (shouldPreserveSelectionOnMouseDown(event, sel)) {
    event.preventDefault();
  }
}

/**
 * Read active selection text only if its anchor or focus resides inside containerNode.
 */
export function getSelectionWithinNode(containerNode) {
  if (!containerNode || typeof window === 'undefined' || !window.getSelection) {
    return '';
  }
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return '';
  const anchorIn = sel.anchorNode ? containerNode.contains(sel.anchorNode) : false;
  const focusIn = sel.focusNode ? containerNode.contains(sel.focusNode) : false;
  if (!anchorIn && !focusIn) return '';
  return sel.toString();
}

/**
 * Copy text to clipboard while preserving any active DOM selection range if the
 * legacy execCommand('copy') fallback is needed.
 */
export async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback
  }

  if (typeof document === 'undefined') return false;
  const sel = typeof window !== 'undefined' ? window.getSelection?.() : null;
  const savedRange =
    sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.style.left = '-9999px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);

  let copied = false;
  try {
    ta.focus({ preventScroll: true });
    ta.select();
    copied = Boolean(document.execCommand('copy'));
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(ta);
    if (sel && savedRange) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      } catch {
        // Ignore range restoration errors if DOM mutated
      }
    }
  }
  return copied;
}
