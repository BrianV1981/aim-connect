export const DEFAULT_HUD_TTL_MS = 6000;
export const GLOBAL_HUD_KEY = '__global__';

function isFreshHudEntry(entry, nowMs = Date.now(), ttlMs = DEFAULT_HUD_TTL_MS) {
  if (!entry || typeof entry !== 'object') return false;
  if (entry.ts === undefined || entry.ts === null) return true;
  const tsNum = Number(entry.ts);
  if (!Number.isFinite(tsNum) || tsNum <= 0) return true;
  return nowMs - tsNum <= ttlMs;
}

function normalizeHudSlot(entry, fallbackTargetId = '', nowMs = Date.now()) {
  if (!entry || typeof entry !== 'object') return null;
  const { byTarget: _omit, ...rest } = entry;
  return {
    ...rest,
    targetId: String(entry.targetId || fallbackTargetId || ''),
    receivedAt: Number(entry.receivedAt || nowMs),
  };
}

/**
 * Merge an incoming HUD payload (with optional `byTarget` map from aim-browser#14 / #274)
 * into a per-target HUD dictionary without letting one subagent clobber another tab's cursor (#274).
 */
export function ingestHudPayload(
  prevByTarget = {},
  rawHud = null,
  nowMs = Date.now(),
  ttlMs = DEFAULT_HUD_TTL_MS
) {
  const next = {};
  if (prevByTarget && typeof prevByTarget === 'object') {
    for (const [key, val] of Object.entries(prevByTarget)) {
      if (isFreshHudEntry(val, nowMs, ttlMs) && nowMs - Number(val?.receivedAt || nowMs) <= ttlMs) {
        next[key] = val;
      }
    }
  }

  if (!rawHud || typeof rawHud !== 'object') {
    return next;
  }

  const upsertSlot = (slotKey, candidate) => {
    if (!slotKey || !isFreshHudEntry(candidate, nowMs, ttlMs)) return;
    const prev = next[slotKey];
    const candSeq = Number(candidate.seq);
    const prevSeq = Number(prev?.seq);
    const candTs = Number(candidate.ts);
    const prevTs = Number(prev?.ts);

    if (prev) {
      if (Number.isFinite(candSeq) && Number.isFinite(prevSeq) && candSeq < prevSeq) {
        return;
      }
      if (
        Number.isFinite(candSeq) &&
        Number.isFinite(prevSeq) &&
        candSeq === prevSeq &&
        (!Number.isFinite(candTs) || !Number.isFinite(prevTs) || candTs <= prevTs)
      ) {
        return;
      }
    }
    next[slotKey] = normalizeHudSlot(candidate, slotKey === GLOBAL_HUD_KEY ? '' : slotKey, nowMs);
  };

  if (rawHud.byTarget && typeof rawHud.byTarget === 'object') {
    for (const [tid, entry] of Object.entries(rawHud.byTarget)) {
      if (tid && entry && typeof entry === 'object') {
        upsertSlot(tid, entry);
      }
    }
  }

  if (rawHud.action || rawHud.x !== undefined || rawHud.y !== undefined) {
    const topKey = String(rawHud.targetId || '').trim() || GLOBAL_HUD_KEY;
    upsertSlot(topKey, rawHud);
  }

  return next;
}

/**
 * Prune expired HUD entries from a per-target map; returns the original object reference if nothing changed.
 */
export function pruneExpiredHudMap(prevByTarget = {}, nowMs = Date.now(), ttlMs = 4500) {
  if (!prevByTarget || typeof prevByTarget !== 'object') return {};
  let changed = false;
  const next = {};
  for (const [k, val] of Object.entries(prevByTarget)) {
    const freshByTs = isFreshHudEntry(val, nowMs, DEFAULT_HUD_TTL_MS);
    const freshByRecv = nowMs - Number(val?.receivedAt || nowMs) <= ttlMs;
    if (freshByTs && freshByRecv) {
      next[k] = val;
    } else {
      changed = true;
    }
  }
  return changed ? next : prevByTarget;
}

/**
 * Resolve the active cursor HUD overlay for a specific CDP targetId, preferring `byTarget[targetId]`
 * and falling back cleanly to top-level / global HUD events (#274).
 */
export function resolveHudForTarget(
  hudByTarget = {},
  rawHud = null,
  targetId = '',
  nowMs = Date.now(),
  ttlMs = DEFAULT_HUD_TTL_MS
) {
  const tid = String(targetId || '').trim();

  if (tid && hudByTarget && typeof hudByTarget === 'object') {
    const direct = hudByTarget[tid];
    if (isFreshHudEntry(direct, nowMs, ttlMs)) {
      return direct;
    }
  }

  if (tid && rawHud?.byTarget && typeof rawHud.byTarget === 'object') {
    const fromRawMap = rawHud.byTarget[tid];
    if (isFreshHudEntry(fromRawMap, nowMs, ttlMs)) {
      return normalizeHudSlot(fromRawMap, tid, nowMs);
    }
  }

  if (hudByTarget && typeof hudByTarget === 'object') {
    if (!tid) {
      const candidates = Object.values(hudByTarget).filter((e) => isFreshHudEntry(e, nowMs, ttlMs));
      if (candidates.length > 0) {
        candidates.sort((a, b) => Number(b.seq || b.ts || 0) - Number(a.seq || a.ts || 0));
        return candidates[0];
      }
    }
    const globalEntry = hudByTarget[GLOBAL_HUD_KEY];
    if (isFreshHudEntry(globalEntry, nowMs, ttlMs)) {
      return globalEntry;
    }
  }

  if (rawHud && typeof rawHud === 'object' && isFreshHudEntry(rawHud, nowMs, ttlMs)) {
    const rawTid = String(rawHud.targetId || '').trim();
    if (!tid || !rawTid || rawTid === tid) {
      return normalizeHudSlot(rawHud, rawTid, nowMs);
    }
  }

  return null;
}
