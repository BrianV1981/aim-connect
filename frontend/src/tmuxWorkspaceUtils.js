// Pure utilities for Git Repo Launcher, Fast Resume, Session Spawn payloads (#300),
// and workspace SAVE/RESTORE result messaging + tmux-resurrect gating (#313)

export const AGENT_LAUNCH_OPTIONS = [
  { id: 'agy', label: 'AGY (RESUME)', binary: 'agy', supportsResume: true },
  { id: 'grok', label: 'GROK (RESUME)', binary: 'grok', supportsResume: true },
  { id: 'opencode', label: 'OPENCODE (RESUME)', binary: 'opencode', supportsResume: true },
  { id: 'codex', label: 'CODEX (RESUME)', binary: 'codex', supportsResume: true },
  { id: 'claude', label: 'CLAUDE (RESUME)', binary: 'claude', supportsResume: true },
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

export function describeResurrectSaveResult(data) {
  const d = data && typeof data === 'object' ? data : {};
  if (d.status !== 'saved') {
    return {
      ok: false,
      message: 'tmux-resurrect ran but the snapshot could not be verified — check tmux-resurrect and try again',
    };
  }
  const sessions = Number(d.active_session_count) || 0;
  const agents = Number(d.agent_pane_count) || 0;
  const exact = Number(d.exact_pane_count) || 0;
  const agentPart = agents > 0 ? ` · ${exact}/${agents} agent pane(s) pinned to exact conversations` : '';
  return { ok: true, message: `Saved ${sessions} tmux session(s)${agentPart}` };
}

export function describeResurrectRestoreResult(data) {
  const d = data && typeof data === 'object' ? data : {};
  const agents = Number(d.agent_pane_count) || 0;
  const exact = Number(d.exact_pane_count) || 0;
  const prefix = d.bootstrapped_daemon ? 'Cold-boot tmux daemon started — restoring workspace' : 'Restoring workspace';
  if (agents > 0) {
    return `${prefix} · ${exact}/${agents} agent pane(s) resuming their exact conversations...`;
  }
  return `${prefix}...`;
}

export function resurrectGate(status) {
  if (status && status.installed === false) {
    return { disabled: true, title: status.install_hint || 'tmux-resurrect is not installed' };
  }
  return { disabled: false, title: '' };
}
