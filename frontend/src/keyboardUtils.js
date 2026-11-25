export const KB_AUTOHIDE_STORAGE_KEY = 'aim-kb-autohide';

export function loadKeyboardAutoHide(storage) {
  if (!storage || typeof storage.getItem !== 'function') return true;
  try {
    const raw = storage.getItem(KB_AUTOHIDE_STORAGE_KEY);
    if (raw === null || raw === undefined || raw === '') return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

export function saveKeyboardAutoHide(storage, enabled) {
  const val = Boolean(enabled);
  if (storage && typeof storage.setItem === 'function') {
    try {
      storage.setItem(KB_AUTOHIDE_STORAGE_KEY, JSON.stringify(val));
    } catch {}
  }
  return val;
}

export function shouldAutoHideKeyboardOnPointerDown(
  target,
  { showKeyboard = false, keyboardAutoHide = true, agentStageMode = 'chat' } = {},
) {
  if (!showKeyboard || !keyboardAutoHide) return false;
  if (!target || typeof target.closest !== 'function') return false;

  if (target.closest('[data-kb-dock="true"], .sovereign-keyboard-dock')) return false;
  if (target.closest('[data-kb-toggle="true"]')) return false;
  if (target.closest('.ld-input-box')) return false;
  if (agentStageMode === 'pty' && target.closest('.terminal-container')) return false;

  return true;
}

export function applyVirtualKeyToComposer(
  text = '',
  key = '',
  { selectionStart = null, selectionEnd = null } = {},
) {
  const value = typeof text === 'string' ? text : '';
  const start =
    typeof selectionStart === 'number' && Number.isFinite(selectionStart)
      ? Math.max(0, Math.min(value.length, selectionStart))
      : value.length;
  const end =
    typeof selectionEnd === 'number' && Number.isFinite(selectionEnd)
      ? Math.max(start, Math.min(value.length, selectionEnd))
      : start;

  if (!key) return { action: 'noop', text: value, caret: end };

  if (key === '\r' || key === '\n') {
    return { action: 'submit', text: value, caret: end };
  }

  if (key === '\x7f' || key === '\b') {
    if (start !== end) {
      const next = value.slice(0, start) + value.slice(end);
      return { action: 'edit', text: next, caret: start };
    }
    if (start === 0) return { action: 'edit', text: value, caret: 0 };
    const next = value.slice(0, start - 1) + value.slice(end);
    return { action: 'edit', text: next, caret: start - 1 };
  }

  if (key === '\x17') {
    const prefix = value.slice(0, start).replace(/\S+\s*$/, '');
    const next = prefix + value.slice(end);
    return { action: 'edit', text: next, caret: prefix.length };
  }

  if (key === '\x15') {
    const next = value.slice(end);
    return { action: 'edit', text: next, caret: 0 };
  }

  if (key === '\x1b[D') {
    return { action: 'caret', text: value, caret: Math.max(0, start - 1) };
  }

  if (key === '\x1b[C') {
    return { action: 'caret', text: value, caret: Math.min(value.length, end + 1) };
  }

  // Terminal control sequences (ESC, Ctrl+C/D/Z/L, arrows up/down, F-keys, macros with \r)
  if (key.includes('\x1b') || key.includes('\r') || key.charCodeAt(0) < 32) {
    return { action: 'passthrough_pty', text: value, caret: end };
  }

  const next = value.slice(0, start) + key + value.slice(end);
  return { action: 'edit', text: next, caret: start + key.length };
}
