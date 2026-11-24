export function extractActiveSlashToken(composerText) {
  const raw = typeof composerText === 'string' ? composerText : '';
  if (!raw.startsWith('/')) {
    return { active: false, query: '' };
  }
  if (/\s/.test(raw)) {
    return { active: false, query: '' };
  }
  return {
    active: true,
    query: raw.slice(1).toLowerCase(),
  };
}

export function filterSlashCommands(commands = [], composerText = '', maxItems = 14) {
  const { active, query } = extractActiveSlashToken(composerText);
  if (!active || !Array.isArray(commands) || commands.length === 0) {
    return [];
  }

  const normalized = [];
  const seen = new Set();
  for (const item of commands) {
    if (!item || typeof item !== 'object') continue;
    const cmd = typeof item.cmd === 'string' ? item.cmd.trim() : '';
    if (!cmd.startsWith('/')) continue;
    const key = cmd.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      cmd,
      kind: item.kind === 'skill' ? 'skill' : 'builtin',
      description: typeof item.description === 'string' ? item.description.trim() : '',
      source: typeof item.source === 'string' ? item.source : '',
    });
  }

  if (!query) {
    return normalized.slice(0, maxItems);
  }

  const scored = [];
  for (const item of normalized) {
    const bare = item.cmd.slice(1).toLowerCase();
    const desc = item.description.toLowerCase();
    const segments = bare.split(/[-_/:]+/).filter(Boolean);

    let rank = -1;
    if (bare === query) {
      rank = 0;
    } else if (bare.startsWith(query)) {
      rank = 1;
    } else if (segments.some((seg) => seg.startsWith(query))) {
      rank = 2;
    } else if (bare.includes(query)) {
      rank = 3;
    } else if (desc.includes(query)) {
      rank = 4;
    }

    if (rank >= 0) {
      scored.push({ item, rank });
    }
  }

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.item.kind !== b.item.kind) return a.item.kind === 'builtin' ? -1 : 1;
    if (a.item.cmd.length !== b.item.cmd.length) return a.item.cmd.length - b.item.cmd.length;
    return a.item.cmd.localeCompare(b.item.cmd);
  });

  return scored.slice(0, maxItems).map((s) => s.item);
}

export function completeSlashCommand(item) {
  const cmd = typeof item === 'string' ? item.trim() : String(item?.cmd || '').trim();
  if (!cmd) return '';
  return `${cmd} `;
}

export function isSessionResetSlashCommand(text) {
  const clean = typeof text === 'string' ? text.trim().toLowerCase() : '';
  return clean === '/new' || clean === '/clear' || clean.startsWith('/new ') || clean.startsWith('/clear ');
}

export function computeTurnsSignature(turns = []) {
  if (!Array.isArray(turns) || turns.length === 0) return '0:0:0';
  const last = turns[turns.length - 1] || {};
  return `${turns.length}:${(last.user || '').length}:${(last.body || '').length}:${(last.spoken || '').length}`;
}

export function shouldShowFreshSessionReset(resetMarker, turnsData) {
  if (!resetMarker || typeof resetMarker !== 'object') return false;
  const curSource = turnsData?.source || '';
  const curSig = computeTurnsSignature(turnsData?.turns || []);
  const sameSource = !curSource || curSource === (resetMarker.prevSource || '');
  const sameSig = curSig === (resetMarker.prevSig || '0:0:0');
  return sameSource && sameSig;
}
