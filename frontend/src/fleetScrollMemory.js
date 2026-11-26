// #318: Persist the Fleet panel's scroll position across close/reopen.
// FleetSidebar unmounts when closed (mobile auto-closes it on session switch),
// so the list's scrollTop lives in sessionStorage (survives REFRESH APP in the same tab).

export const FLEET_SCROLL_STORAGE_KEY = 'aim-fleet-scroll-top';

export function saveFleetScrollTop(storage, scrollTop) {
  if (!storage) return;
  try {
    storage.setItem(FLEET_SCROLL_STORAGE_KEY, String(Math.max(0, Math.round(Number(scrollTop) || 0))));
  } catch {
    /* storage unavailable (private mode / quota) — scroll memory is best-effort */
  }
}

export function loadFleetScrollTop(storage) {
  if (!storage) return 0;
  try {
    const value = Number(storage.getItem(FLEET_SCROLL_STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function getFleetScrollStorage() {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}
