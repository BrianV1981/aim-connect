export const SCRAMBLE_CHARS = '01ABCDEF/>_#$%&*+=?AIM';
export const MATRIX_SCRAMBLE_TICK_MS = 22;
export const MATRIX_SCRAMBLE_STEP = 0.62;

export const STANDALONE_SELECTOR = 'button, a.coffee-cta-btn, a.home-gh-btn, a.subbar-util-btn';
export const EXCLUDED_CONTAINER_SELECTORS = [
  '[data-scramble-manual="1"]',
  '.fleet-session-card',
  '.spotlight-card',
  '.fleet-delete-btn',
  '.totp-keypad',
  '.sovereign-keyboard',
  '.ctrl-key-grid',
  '.composer-keybar',
  '.commander-toolbar',
  '.pop-item',
  '.cp-tab',
  '.cp-fav-bar',
  '.files-tree-panel',
  '.file-tree-row',
  '.md-file-link',
  '.shot-link-btn',
];
const SKIP_CHILD_CLASSES = ['seg-expand-badge', 'cp-dl-badge', 'fleet-header-unread-dot', 'mono-kbd'];

/**
 * Compute one Matrix Character Scramble frame for `text` with `doneChars` locked from the left.
 */
export function computeScrambleFrame(text, doneChars) {
  if (!text) return '';
  let out = '';
  for (let idx = 0; idx < text.length; idx += 1) {
    const ch = text[idx];
    if (ch === ' ' || ch === '\n' || ch === '\t' || idx < doneChars) {
      out += ch;
    } else {
      out += SCRAMBLE_CHARS[(idx * 11 + doneChars * 5) % SCRAMBLE_CHARS.length];
    }
  }
  return out;
}

/**
 * Return true if `el` is an eligible standalone interactive UI button (outside Fleet cards, pads, tabs, or file links).
 */
export function isStandaloneScrambleCandidate(el) {
  if (!el || typeof el.closest !== 'function' || el.disabled) return false;
  return !EXCLUDED_CONTAINER_SELECTORS.some((sel) => el.closest(sel));
}

export function collectScrambleEntries(buttonEl) {
  const entries = [];
  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === 3) {
      const val = node.nodeValue || '';
      if (val.trim()) entries.push({ node, original: val, lastWritten: val });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName ? node.tagName.toLowerCase() : '';
    if (tag === 'svg' || SKIP_CHILD_CLASSES.some((cls) => node.classList?.contains(cls))) {
      return;
    }
    for (let i = 0; i < node.childNodes.length; i += 1) {
      walk(node.childNodes[i]);
    }
  };
  walk(buttonEl);
  const combined = entries.map((e) => e.original).join('').trim();
  if (combined.length < 2 || combined.length > 38 || !/[A-Za-z0-9]{2}/.test(combined)) {
    return [];
  }
  return entries;
}

/**
 * Attach delegated Matrix Character Scramble hover behavior to standalone UI buttons inside `doc`.
 * Mutates Text.nodeValue in place so React VDOM reconciliation never breaks.
 */
export function attachGlobalStandaloneButtonScrambles(doc) {
  if (!doc) return () => {};
  let activeBtn = null;
  let activeEntries = [];
  let timer = null;

  const cleanupActive = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    for (let i = 0; i < activeEntries.length; i += 1) {
      const entry = activeEntries[i];
      if (entry.node.isConnected && entry.node.nodeValue === entry.lastWritten) {
        entry.node.nodeValue = entry.original;
      }
    }
    activeEntries = [];
    activeBtn = null;
  };

  const startForButton = (btn) => {
    cleanupActive();
    const entries = collectScrambleEntries(btn);
    if (!entries.length) return;
    const fullOriginal = entries.map((e) => e.original).join('');
    const totalLen = fullOriginal.length;
    activeBtn = btn;
    activeEntries = entries;

    let step = 0;
    timer = setInterval(() => {
      step += MATRIX_SCRAMBLE_STEP;
      const done = Math.floor(step);

      for (let i = 0; i < activeEntries.length; i += 1) {
        const entry = activeEntries[i];
        if (
          !entry.node.isConnected ||
          (entry.node.nodeValue !== entry.lastWritten && entry.node.nodeValue !== entry.original)
        ) {
          if (timer) clearInterval(timer);
          timer = null;
          activeEntries = [];
          activeBtn = null;
          return;
        }
      }

      if (done >= totalLen) {
        for (let i = 0; i < activeEntries.length; i += 1) {
          const entry = activeEntries[i];
          if (entry.node.isConnected) entry.node.nodeValue = entry.original;
        }
        clearInterval(timer);
        timer = null;
        return;
      }

      const frame = computeScrambleFrame(fullOriginal, done);
      let offset = 0;
      for (let i = 0; i < activeEntries.length; i += 1) {
        const entry = activeEntries[i];
        const len = entry.original.length;
        const slice = frame.slice(offset, offset + len);
        offset += len;
        entry.node.nodeValue = slice;
        entry.lastWritten = slice;
      }
    }, MATRIX_SCRAMBLE_TICK_MS);
  };

  const onMouseOver = (ev) => {
    const target = ev.target && typeof ev.target.closest === 'function' ? ev.target.closest(STANDALONE_SELECTOR) : null;
    if (!target || target === activeBtn) return;
    if (!isStandaloneScrambleCandidate(target)) {
      cleanupActive();
      return;
    }
    startForButton(target);
  };

  const onMouseOut = (ev) => {
    if (!activeBtn) return;
    const related = ev.relatedTarget;
    if (related && activeBtn.contains(related)) return;
    cleanupActive();
  };

  doc.addEventListener('mouseover', onMouseOver, true);
  doc.addEventListener('mouseout', onMouseOut, true);
  return () => {
    doc.removeEventListener('mouseover', onMouseOver, true);
    doc.removeEventListener('mouseout', onMouseOut, true);
    cleanupActive();
  };
}
