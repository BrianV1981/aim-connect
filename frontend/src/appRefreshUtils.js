export const AUTO_RELOAD_BUILD_STORAGE_KEY = 'aim-last-auto-reload-build';

const INDEX_SCRIPT_BUILD_RE = /\/assets\/(index-[A-Za-z0-9_-]+\.js)(?:[?#]|$)/;

export function normalizeBuildId(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'dev') return '';
  return trimmed;
}

export function extractDomBuildId(doc) {
  if (!doc || typeof doc.querySelectorAll !== 'function') return '';
  const scripts = doc.querySelectorAll('script[src]');
  for (const scriptEl of scripts) {
    const src =
      (typeof scriptEl.getAttribute === 'function' && scriptEl.getAttribute('src')) ||
      scriptEl.src ||
      '';
    const match = INDEX_SCRIPT_BUILD_RE.exec(String(src));
    if (match && match[1]) {
      return match[1];
    }
  }
  return '';
}

export function evaluateBuildFreshness({
  bootBuildId = '',
  serverBuildId = '',
  context = 'poll',
  lastAutoReloadBuildId = '',
} = {}) {
  const normalizedBoot = normalizeBuildId(bootBuildId);
  const normalizedServer = normalizeBuildId(serverBuildId);
  if (!normalizedBoot || !normalizedServer || normalizedBoot === normalizedServer) {
    return {
      normalizedBoot,
      normalizedServer,
      updateAvailable: false,
      shouldAutoReload: false,
    };
  }
  const alreadyReloadedForBuild =
    normalizeBuildId(lastAutoReloadBuildId) === normalizedServer;
  const shouldAutoReload = context === 'auth' && !alreadyReloadedForBuild;
  return {
    normalizedBoot,
    normalizedServer,
    updateAvailable: true,
    shouldAutoReload,
  };
}

export async function performHardAppRefresh(env = {}) {
  const win = typeof window !== 'undefined' ? window : null;
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const serviceWorker =
    env.serviceWorker !== undefined ? env.serviceWorker : nav?.serviceWorker;
  const cachesApi =
    env.cachesApi !== undefined ? env.cachesApi : win?.caches;
  const fetchFn =
    env.fetchFn !== undefined ? env.fetchFn : win?.fetch?.bind(win);
  const locationObj =
    env.locationObj !== undefined ? env.locationObj : win?.location;
  const sessionStorageObj =
    env.sessionStorageObj !== undefined ? env.sessionStorageObj : win?.sessionStorage;
  const targetBuildId = normalizeBuildId(env.targetBuildId || '');

  if (targetBuildId && sessionStorageObj && typeof sessionStorageObj.setItem === 'function') {
    try {
      sessionStorageObj.setItem(AUTO_RELOAD_BUILD_STORAGE_KEY, targetBuildId);
    } catch {}
  }

  if (serviceWorker && typeof serviceWorker.getRegistrations === 'function') {
    try {
      const regs = await serviceWorker.getRegistrations();
      if (Array.isArray(regs) && regs.length > 0) {
        await Promise.allSettled(
          regs.map((reg) =>
            typeof reg?.unregister === 'function'
              ? reg.unregister()
              : reg?.update?.()
          )
        );
      }
    } catch {}
  }

  if (cachesApi && typeof cachesApi.keys === 'function') {
    try {
      const keys = await cachesApi.keys();
      if (Array.isArray(keys) && keys.length > 0) {
        await Promise.allSettled(keys.map((key) => cachesApi.delete(key)));
      }
    } catch {}
  }

  const pathname = env.pathname || locationObj?.pathname || '/';
  if (typeof fetchFn === 'function') {
    try {
      await fetchFn(pathname, { cache: 'reload', credentials: 'same-origin' });
    } catch {}
  }

  if (locationObj && typeof locationObj.reload === 'function') {
    locationObj.reload();
  }
}
