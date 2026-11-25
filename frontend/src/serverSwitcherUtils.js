export const LOCAL_SERVERS_STORAGE_KEY = 'aim-saved-servers-v1';

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function normalizeNodeColor(raw, fallback = '#00FFA3') {
  const val = typeof raw === 'string' ? raw.trim() : '';
  return HEX_COLOR_RE.test(val) ? val.toUpperCase() : fallback;
}

export function sanitizeClientServerUrl(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return '';
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) < 32) return '';
  }

  let candidate = text;
  if (!candidate.includes('://')) {
    const lower = candidate.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('file:') ||
      lower.startsWith('blob:')
    ) {
      return '';
    }
    const isLocal =
      lower.startsWith('localhost') ||
      lower.startsWith('127.0.0.1') ||
      lower.startsWith('[::1]');
    candidate = `${isLocal ? 'http' : 'https'}://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return '';
    }
    if (parsed.username || parsed.password || !parsed.hostname) {
      return '';
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host}${cleanPath}`;
  } catch {
    return '';
  }
}

export function extractHostLabel(urlStr) {
  try {
    const parsed = new URL(sanitizeClientServerUrl(urlStr));
    return parsed.host;
  } catch {
    return '';
  }
}

export function isSameServerOrigin(urlA, urlB) {
  const cleanA = sanitizeClientServerUrl(urlA);
  const cleanB = sanitizeClientServerUrl(urlB);
  if (!cleanA || !cleanB) return false;
  try {
    const a = new URL(cleanA);
    const b = new URL(cleanB);
    return `${a.protocol}//${a.host}`.toLowerCase() === `${b.protocol}//${b.host}`.toLowerCase();
  } catch {
    return false;
  }
}

export function loadLocalServers(storage) {
  if (!storage || typeof storage.getItem !== 'function') return [];
  try {
    const raw = storage.getItem(LOCAL_SERVERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out = [];
    const seen = new Set();
    for (const item of parsed) {
      const cleanUrl = sanitizeClientServerUrl(item?.url || '');
      if (!cleanUrl) continue;
      const key = cleanUrl.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const host = extractHostLabel(cleanUrl);
      const fallback = (host.split('.')[0] || host || 'NODE').toUpperCase();
      out.push({
        id: `local-${key}`,
        label: String(item?.label || fallback).trim().slice(0, 40) || fallback,
        url: cleanUrl,
        color: normalizeNodeColor(item?.color, '#38BDF8'),
        source: 'local',
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function saveLocalServers(storage, list) {
  if (!storage || typeof storage.setItem !== 'function') return;
  try {
    storage.setItem(LOCAL_SERVERS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function upsertLocalServer(storage, { label = '', url = '', color = '#38BDF8' } = {}) {
  const cleanUrl = sanitizeClientServerUrl(url);
  if (!cleanUrl) {
    return { ok: false, error: 'Enter a valid server URL (e.g. https://vps.yourdomain.com)', servers: loadLocalServers(storage) };
  }
  const host = extractHostLabel(cleanUrl);
  const fallback = (host.split('.')[0] || host || 'SERVER').toUpperCase();
  const cleanLabel = String(label || '').trim().slice(0, 40) || fallback;
  const cleanColor = normalizeNodeColor(color, '#38BDF8');

  const existing = loadLocalServers(storage);
  const key = cleanUrl.toLowerCase();
  const filtered = existing.filter((s) => s.url.toLowerCase() !== key);
  const updated = [
    ...filtered,
    {
      id: `local-${key}`,
      label: cleanLabel,
      url: cleanUrl,
      color: cleanColor,
      source: 'local',
    },
  ].slice(-20);
  saveLocalServers(storage, updated);
  return { ok: true, entry: updated[updated.length - 1], servers: updated };
}

export function removeLocalServer(storage, targetUrl) {
  const cleanUrl = sanitizeClientServerUrl(targetUrl);
  const existing = loadLocalServers(storage);
  const next = existing.filter((s) => s.url.toLowerCase() !== cleanUrl.toLowerCase());
  saveLocalServers(storage, next);
  return next;
}

export function mergeServerDirectory({
  currentOrigin = '',
  nodeInfo = null,
  localServers = [],
} = {}) {
  const cleanOrigin = sanitizeClientServerUrl(currentOrigin);
  const seen = new Set();
  const merged = [];

  if (cleanOrigin) {
    const host = extractHostLabel(cleanOrigin);
    const activeLabel =
      String(nodeInfo?.node_label || '').trim() ||
      (nodeInfo?.app_name && nodeInfo.app_name !== 'A.I.M. Connect' ? nodeInfo.app_name : '') ||
      (host.split('.')[0] || host || 'THIS NODE').toUpperCase();
    seen.add(cleanOrigin.toLowerCase());
    merged.push({
      id: 'current-node',
      label: activeLabel,
      url: cleanOrigin,
      host,
      color: normalizeNodeColor(nodeInfo?.app_color, '#00FFA3'),
      isCurrent: true,
      source: 'current',
    });
  }

  const peerList = Array.isArray(nodeInfo?.peer_servers) ? nodeInfo.peer_servers : [];
  for (const peer of peerList) {
    const cleanUrl = sanitizeClientServerUrl(peer?.url || '');
    if (!cleanUrl) continue;
    const isCurr = cleanOrigin ? isSameServerOrigin(cleanUrl, cleanOrigin) : false;
    const key = cleanUrl.toLowerCase();
    if (isCurr || seen.has(key)) continue;
    seen.add(key);
    const host = extractHostLabel(cleanUrl);
    merged.push({
      id: peer?.id || `peer-${key}`,
      label: String(peer?.label || host).trim().slice(0, 40) || host,
      url: cleanUrl,
      host,
      color: normalizeNodeColor(peer?.color, '#38BDF8'),
      isCurrent: false,
      source: 'server',
    });
  }

  const locals = Array.isArray(localServers) ? localServers : [];
  for (const item of locals) {
    const cleanUrl = sanitizeClientServerUrl(item?.url || '');
    if (!cleanUrl) continue;
    const isCurr = cleanOrigin ? isSameServerOrigin(cleanUrl, cleanOrigin) : false;
    const key = cleanUrl.toLowerCase();
    if (isCurr || seen.has(key)) continue;
    seen.add(key);
    const host = extractHostLabel(cleanUrl);
    merged.push({
      id: item?.id || `local-${key}`,
      label: String(item?.label || host).trim().slice(0, 40) || host,
      url: cleanUrl,
      host,
      color: normalizeNodeColor(item?.color, '#38BDF8'),
      isCurrent: false,
      source: 'local',
    });
  }

  return merged;
}
