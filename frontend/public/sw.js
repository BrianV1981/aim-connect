// Network-only pass-through Service Worker (enables Desktop/Android PWA Standalone Window
// without ever caching API routes, WebSockets, or no-store HTML).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // Intentionally pass straight through to network
});
