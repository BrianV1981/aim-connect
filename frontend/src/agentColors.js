const STORAGE_KEY = 'aim-agent-colors';

// High-contrast dark-cockpit palette. Deterministic DJB2 (seed=3724, mult=33) maps
// standard A.I.M. sessions onto distinct hues without hardcoding private names.
export const AGENT_COLOR_PALETTE = [
  { hex: '#22c55e', rgb: '34, 197, 94', name: 'Green' },
  { hex: '#ef4444', rgb: '239, 68, 68', name: 'Red' },
  { hex: '#eab308', rgb: '234, 179, 8', name: 'Yellow' },
  { hex: '#14b8a6', rgb: '20, 184, 166', name: 'Teal' },
  { hex: '#a855f7', rgb: '168, 85, 247', name: 'Purple' },
  { hex: '#f97316', rgb: '249, 115, 22', name: 'Orange' },
  { hex: '#06b6d4', rgb: '6, 182, 212', name: 'Cyan' },
  { hex: '#f59e0b', rgb: '245, 158, 11', name: 'Amber' },
  { hex: '#10b981', rgb: '16, 185, 129', name: 'Emerald' },
  { hex: '#84cc16', rgb: '132, 204, 22', name: 'Lime' },
  { hex: '#3b82f6', rgb: '59, 130, 246', name: 'Blue' },
  { hex: '#ec4899', rgb: '236, 72, 153', name: 'Pink' },
];

function hexToRgbTuple(hex) {
  const clean = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '56, 189, 248';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function readCustomColorMap() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function normalizeAgentKey(rawName) {
  return String(rawName || '')
    .trim()
    .toLowerCase()
    .replace(/\/workspace\/issue-\d+.*$/, '');
}

export function getAgentColor(agentOrSessionName) {
  const key = normalizeAgentKey(agentOrSessionName);
  if (!key || key === 'operator' || key === 'you') {
    return { hex: '#38bdf8', rgb: '56, 189, 248', name: 'Sky' };
  }

  const overrides = readCustomColorMap();
  if (overrides[key] && /^#[0-9a-fA-F]{6}$/.test(overrides[key])) {
    return {
      hex: overrides[key],
      rgb: hexToRgbTuple(overrides[key]),
      name: 'Custom',
    };
  }

  let h = 3724;
  for (let i = 0; i < key.length; i++) {
    h = ((h * 33) + key.charCodeAt(i)) >>> 0;
  }
  return AGENT_COLOR_PALETTE[h % AGENT_COLOR_PALETTE.length];
}

export function matchFleetSessionName(candidate, fleet = []) {
  const raw = String(candidate || '').trim();
  if (!raw || raw === 'operator') return '';
  const lower = raw.toLowerCase();
  const names = (Array.isArray(fleet) ? fleet : [])
    .map((f) => (typeof f === 'string' ? f : f?.session_name || ''))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const exact = names.find((n) => n.toLowerCase() === lower);
  if (exact) return exact;

  const prefixed = names.find((n) => {
    const nl = n.toLowerCase();
    return lower.startsWith(`${nl}-`) || lower.startsWith(`${nl}:`) || lower.startsWith(`${nl}/`);
  });
  return prefixed || '';
}

export function resolveTabAgentInfo(tab, hudOverlay = null, fleet = []) {
  if (!tab) return null;
  const hudForTab =
    hudOverlay && (!hudOverlay.targetId || hudOverlay.targetId === tab.id) ? hudOverlay : null;

  const isOperatorTab = tab.lease === 'operator' && !hudForTab;
  const hasAgentLease = Boolean(tab.lease && tab.lease !== 'operator');
  if (!hasAgentLease && !hudForTab) return null;
  if (isOperatorTab) return null;

  const explicitSession =
    (tab.session && tab.session !== 'operator' ? tab.session : '') ||
    (hudForTab?.session && hudForTab.session !== 'operator' ? hudForTab.session : '');

  const matchedSession =
    explicitSession ||
    matchFleetSessionName(tab.actor, fleet) ||
    matchFleetSessionName(tab.lease, fleet) ||
    matchFleetSessionName(hudForTab?.actor, fleet) ||
    matchFleetSessionName(hudForTab?.lease, fleet);

  const agentKey =
    matchedSession ||
    (tab.actor && tab.actor !== 'operator' ? tab.actor : '') ||
    (tab.lease && tab.lease !== 'operator' ? tab.lease : '') ||
    hudForTab?.actor ||
    'agent';

  const color = getAgentColor(agentKey);
  const fleetEntry = Array.isArray(fleet)
    ? fleet.find((f) => f && f.session_name && f.session_name.toLowerCase() === agentKey.toLowerCase())
    : null;

  const leaseLabel = tab.lease && tab.lease !== 'operator' ? tab.lease : '';
  const sublabel =
    leaseLabel && leaseLabel.toLowerCase() !== agentKey.toLowerCase() ? leaseLabel : '';

  const recentLeaseActivity =
    Boolean(tab.updatedAt) && Date.now() - Number(tab.updatedAt) < 8000;
  const sessionBusy =
    fleetEntry?.status === 'THINKING' || fleetEntry?.status === 'WAITING';
  const isWorking = Boolean(hudForTab || recentLeaseActivity || sessionBusy);

  return {
    agentKey,
    lease: leaseLabel,
    sublabel,
    color,
    isWorking,
    hudAction: hudForTab?.action || '',
    fleetStatus: fleetEntry?.status || '',
  };
}
