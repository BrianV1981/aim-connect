export const COMPOSER_HEIGHT_STORAGE_KEY = 'aim-composer-height-px';
export const COMPOSER_MIN_HEIGHT_PX = 28;
export const COMPOSER_AUTO_MAX_HEIGHT_PX = 126;
export const COMPOSER_MAX_HEIGHT_PX = 260;

export function clampComposerHeight(
  value,
  minPx = COMPOSER_MIN_HEIGHT_PX,
  maxPx = COMPOSER_MAX_HEIGHT_PX,
) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const lo = Math.max(1, Math.round(minPx));
  const hi = Math.max(lo, Math.round(maxPx));
  return Math.min(hi, Math.max(lo, Math.round(num)));
}

export function computeResizedComposerHeight(
  startHeight,
  startClientY,
  currentClientY,
  minPx = COMPOSER_MIN_HEIGHT_PX,
  maxPx = COMPOSER_MAX_HEIGHT_PX,
) {
  const base = clampComposerHeight(startHeight, minPx, maxPx) ?? minPx;
  const sy = Number(startClientY);
  const cy = Number(currentClientY);
  if (!Number.isFinite(sy) || !Number.isFinite(cy)) return base;
  const deltaUp = sy - cy;
  return clampComposerHeight(base + deltaUp, minPx, maxPx) ?? base;
}

export function resolveComposerTextareaLayout({
  scrollHeight = 0,
  customHeight = null,
  minPx = COMPOSER_MIN_HEIGHT_PX,
  autoMaxPx = COMPOSER_AUTO_MAX_HEIGHT_PX,
  maxPx = COMPOSER_MAX_HEIGHT_PX,
} = {}) {
  const manual = clampComposerHeight(customHeight, minPx, maxPx);
  if (manual !== null) {
    return {
      heightPx: manual,
      overflowY: 'auto',
      isManual: true,
    };
  }
  const measured = Number.isFinite(Number(scrollHeight)) ? Number(scrollHeight) : minPx;
  const autoCap = Math.max(minPx, Math.round(autoMaxPx));
  const heightPx = clampComposerHeight(measured, minPx, autoCap) ?? minPx;
  return {
    heightPx,
    overflowY: measured > autoCap ? 'auto' : 'hidden',
    isManual: false,
  };
}

export function loadComposerCustomHeight(storage) {
  if (!storage || typeof storage.getItem !== 'function') return null;
  try {
    return clampComposerHeight(storage.getItem(COMPOSER_HEIGHT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveComposerCustomHeight(storage, heightPx) {
  if (!storage) return null;
  const clamped = clampComposerHeight(heightPx);
  try {
    if (clamped === null) {
      if (typeof storage.removeItem === 'function') {
        storage.removeItem(COMPOSER_HEIGHT_STORAGE_KEY);
      }
      return null;
    }
    if (typeof storage.setItem === 'function') {
      storage.setItem(COMPOSER_HEIGHT_STORAGE_KEY, String(clamped));
    }
    return clamped;
  } catch {
    return clamped;
  }
}

export const COMPOSER_ACTIONS_TWO_TIER_ENTER_PX = 62;
export const COMPOSER_ACTIONS_TWO_TIER_EXIT_PX = 52;
export const COMPOSER_ACTIONS_STACKED_ENTER_PX = 96;
export const COMPOSER_ACTIONS_STACKED_EXIT_PX = 86;

export function resolveComposerActionsLayout(heightPx, currentLayout = 'row') {
  const h = Number(heightPx);
  if (!Number.isFinite(h) || h <= 0) return 'row';

  if (
    h >= COMPOSER_ACTIONS_STACKED_ENTER_PX ||
    (currentLayout === 'stacked' && h >= COMPOSER_ACTIONS_STACKED_EXIT_PX)
  ) {
    return 'stacked';
  }

  if (
    h >= COMPOSER_ACTIONS_TWO_TIER_ENTER_PX ||
    ((currentLayout === 'two-tier' || currentLayout === 'stacked') &&
      h >= COMPOSER_ACTIONS_TWO_TIER_EXIT_PX)
  ) {
    return 'two-tier';
  }

  return 'row';
}

export function classifyComposerKeyAction(eventLike, { slashMenuOpen = false } = {}) {
  if (!eventLike || typeof eventLike !== 'object') return 'none';
  if (eventLike.isComposing || eventLike.keyCode === 229) return 'none';

  const key = eventLike.key;
  const hasShift = Boolean(eventLike.shiftKey);
  const hasMod = Boolean(eventLike.ctrlKey || eventLike.metaKey || eventLike.altKey);

  if (slashMenuOpen) {
    if (key === 'ArrowDown') return 'slash_next';
    if (key === 'ArrowUp') return 'slash_prev';
    if (key === 'Escape') return 'slash_dismiss';
    if (key === 'Tab') return 'slash_select';
    if (key === 'Enter') {
      if (hasShift) return 'newline';
      if (!hasMod) return 'slash_select';
    }
    return 'none';
  }

  if (key === 'Enter') {
    if (hasShift) return 'newline';
    if (!hasMod) return 'submit';
  }

  return 'none';
}
