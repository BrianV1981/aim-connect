export function isTextInputElement(el) {
  if (!el || typeof el !== 'object') return false;
  const tag = String(el.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const t = String(el.type || 'text').toLowerCase();
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color'].includes(t);
  }
  return Boolean(el.isContentEditable);
}

export function computeMobileViewportState({
  innerWidth = 0,
  innerHeight = 0,
  baselineHeight = 0,
  visualViewport = null,
  activeElementIsInput = false,
} = {}) {
  const w = Number.isFinite(Number(innerWidth)) ? Math.max(0, Math.round(Number(innerWidth))) : 0;
  const ih = Number.isFinite(Number(innerHeight)) ? Math.max(0, Math.round(Number(innerHeight))) : 0;
  const rawVvH = Number(visualViewport?.height);
  const vvHeight = Number.isFinite(rawVvH) && rawVvH > 0 ? Math.round(rawVvH) : ih;

  const rawTop = Number(visualViewport?.offsetTop);
  const vvTop = Number.isFinite(rawTop) && rawTop > 0 ? Math.round(rawTop) : 0;

  const rawLeft = Number(visualViewport?.offsetLeft);
  const vvLeft = Number.isFinite(rawLeft) && rawLeft > 0 ? Math.round(rawLeft) : 0;

  const isMobile = w > 0 && w <= 768;
  const baseH = Math.max(
    ih,
    Number.isFinite(Number(baselineHeight)) ? Math.round(Number(baselineHeight)) : 0,
  );
  const heightShrink = baseH > 0 && vvHeight > 0 ? baseH - vvHeight : 0;
  const keyboardOpen = Boolean(
    isMobile &&
      activeElementIsInput &&
      (heightShrink >= 100 || vvTop >= 40),
  );

  return {
    vvHeight,
    vvTop,
    vvLeft,
    vhPx: vvHeight > 0 ? vvHeight * 0.01 : 0,
    isMobile,
    keyboardOpen,
  };
}
