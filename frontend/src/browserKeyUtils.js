export const MODIFIER_ONLY_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'AltGraph',
  'Meta',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'Dead',
  'Process',
]);

export const VK_BY_KEY = {
  Backspace: 8,
  Tab: 9,
  Clear: 12,
  Enter: 13,
  Pause: 19,
  Escape: 27,
  ' ': 32,
  PageUp: 33,
  PageDown: 34,
  End: 35,
  Home: 36,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Insert: 45,
  Delete: 46,
  ContextMenu: 93,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
};

export const VK_BY_CODE = {
  Space: 32,
  Digit0: 48,
  Digit1: 49,
  Digit2: 50,
  Digit3: 51,
  Digit4: 52,
  Digit5: 53,
  Digit6: 54,
  Digit7: 55,
  Digit8: 56,
  Digit9: 57,
  KeyA: 65,
  KeyB: 66,
  KeyC: 67,
  KeyD: 68,
  KeyE: 69,
  KeyF: 70,
  KeyG: 71,
  KeyH: 72,
  KeyI: 73,
  KeyJ: 74,
  KeyK: 75,
  KeyL: 76,
  KeyM: 77,
  KeyN: 78,
  KeyO: 79,
  KeyP: 80,
  KeyQ: 81,
  KeyR: 82,
  KeyS: 83,
  KeyT: 84,
  KeyU: 85,
  KeyV: 86,
  KeyW: 87,
  KeyX: 88,
  KeyY: 89,
  KeyZ: 90,
  Numpad0: 96,
  Numpad1: 97,
  Numpad2: 98,
  Numpad3: 99,
  Numpad4: 100,
  Numpad5: 101,
  Numpad6: 102,
  Numpad7: 103,
  Numpad8: 104,
  Numpad9: 105,
  NumpadMultiply: 106,
  NumpadAdd: 107,
  NumpadSubtract: 109,
  NumpadDecimal: 110,
  NumpadDivide: 111,
  NumpadEnter: 13,
  NumpadEqual: 187,
  Semicolon: 186,
  Equal: 187,
  Comma: 188,
  Minus: 189,
  Period: 190,
  Slash: 191,
  Backquote: 192,
  BracketLeft: 219,
  Backslash: 220,
  BracketRight: 221,
  Quote: 222,
  IntlBackslash: 226,
};

export const VK_BY_CHAR_FALLBACK = {
  '!': 49,
  '@': 50,
  '#': 51,
  $: 52,
  '%': 53,
  '^': 54,
  '&': 55,
  '*': 56,
  '(': 57,
  ')': 48,
  ';': 186,
  ':': 186,
  '=': 187,
  '+': 187,
  ',': 188,
  '<': 188,
  '-': 189,
  _: 189,
  '.': 190,
  '>': 190,
  '/': 191,
  '?': 191,
  '`': 192,
  '~': 192,
  '[': 219,
  '{': 219,
  '\\': 220,
  '|': 220,
  ']': 221,
  '}': 221,
  "'": 222,
  '"': 222,
};

/**
 * Resolve true Windows Virtual Key Code for Chromium CDP Input.dispatchKeyEvent (#278).
 * Never maps punctuation ASCII codes (33-47) onto navigation/editing VKs like VK_DELETE (46).
 */
export function resolveWindowsVirtualKeyCode(event = {}) {
  const key = String(event.key ?? '');
  const code = String(event.code ?? '');

  if (Object.prototype.hasOwnProperty.call(VK_BY_KEY, key)) {
    return VK_BY_KEY[key];
  }
  if (code && Object.prototype.hasOwnProperty.call(VK_BY_CODE, code)) {
    return VK_BY_CODE[code];
  }
  if (key.length === 1) {
    const upper = key.toUpperCase();
    const ascii = upper.charCodeAt(0);
    if ((ascii >= 48 && ascii <= 57) || (ascii >= 65 && ascii <= 90)) {
      return ascii;
    }
    if (Object.prototype.hasOwnProperty.call(VK_BY_CHAR_FALLBACK, key)) {
      return VK_BY_CHAR_FALLBACK[key];
    }
  }
  return 0;
}

/**
 * Translate a DOM KeyboardEvent on the Co-Pilot Browser <canvas> into a deterministic WS action (#278).
 */
export function resolveBrowserKeyAction(event = {}) {
  if (!event || event.isComposing) {
    return { action: 'ignore' };
  }
  const key = String(event.key ?? '');
  const code = String(event.code ?? '');
  if (!key || key === 'Unidentified' || MODIFIER_ONLY_KEYS.has(key)) {
    return { action: 'ignore' };
  }

  const altKey = Boolean(event.altKey);
  const ctrlKey = Boolean(event.ctrlKey);
  const metaKey = Boolean(event.metaKey);
  const shiftKey = Boolean(event.shiftKey);

  // Let browser fire native `paste` on Ctrl+V / Cmd+V so client clipboard text forwards via insert_text
  if ((ctrlKey || metaKey) && !altKey && !shiftKey && key.toLowerCase() === 'v') {
    return { action: 'allow_paste' };
  }

  const modifiers = (altKey ? 1 : 0) | (ctrlKey ? 2 : 0) | (metaKey ? 4 : 0) | (shiftKey ? 8 : 0);
  const vk = resolveWindowsVirtualKeyCode({ key, code });
  const isSingleCodePoint = Array.from(key).length === 1;

  // Non-ASCII printable characters (e.g. accented letters, symbols without US OEM VK) insert cleanly
  if (vk === 0 && isSingleCodePoint && !ctrlKey && !metaKey && !altKey) {
    return { action: 'insert_text', text: key };
  }

  const text =
    key === 'Enter'
      ? '\r'
      : isSingleCodePoint && !ctrlKey && !metaKey
        ? key
        : '';

  return {
    action: 'key',
    key,
    code,
    text,
    unmodifiedText: text,
    windowsVirtualKeyCode: vk,
    modifiers,
  };
}
