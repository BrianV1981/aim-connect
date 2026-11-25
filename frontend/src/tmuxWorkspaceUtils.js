// Pure utilities for Git Repo Launcher, Fast Resume (-c), and Session Spawn payloads (#300)

export const AGENT_LAUNCH_OPTIONS = [
  { id: 'agy', label: 'AGY (-c)', binary: 'agy', supportsResume: true },
  { id: 'grok', label: 'GROK (-c)', binary: 'grok', supportsResume: true },
  { id: 'opencode', label: 'OPENCODE (-c)', binary: 'opencode', supportsResume: true },
  { id: 'codex', label: 'CODEX (-c)', binary: 'codex', supportsResume: true },
  { id: 'shell', label: 'SHELL ONLY', binary: '', supportsResume: false },
];

export function sanitizeRepoSessionName(rawName) {
  const cleaned = String(rawName || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 64) || 'project';
}

export function filterProjectRepos(repos, query) {
  const list = Array.isArray(repos) ? repos : [];
  const q = String(query || '').trim().toLowerCase();
  if (!q) return list;

  return list.filter((repo) => {
    const hay = `${repo?.active ? 'active' : 'offline'} ${repo?.name || ''} ${repo?.session_name || ''} ${repo?.short_path || ''} ${repo?.path || ''}`.toLowerCase();
    if (hay.includes(q)) return true;
    let qi = 0;
    for (let i = 0; i < hay.length && qi < q.length; i += 1) {
      if (hay[i] === q[qi]) qi += 1;
    }
    return qi === q.length;
  });
}

export function buildSpawnSessionPayload(input) {
  if (typeof input === 'string') {
    return { name: input.trim() };
  }
  const obj = input && typeof input === 'object' ? input : {};
  const payload = {
    name: String(obj.name || '').trim(),
  };
  const cwd = String(obj.cwd || '').trim();
  if (cwd) {
    payload.cwd = cwd;
  }
  const agent = String(obj.agent || '').trim().toLowerCase();
  if (agent && agent !== 'shell' && agent !== 'none') {
    payload.agent = agent;
    payload.resume = Boolean(obj.resume);
    if (typeof obj.skip_permissions === 'boolean') {
      payload.skip_permissions = obj.skip_permissions;
    }
  }
  return payload;
}
