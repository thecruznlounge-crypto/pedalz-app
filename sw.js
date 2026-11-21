/* Pedalz service worker — full offline app shell, libraries, and cached map tiles.
   Bump VERSION on every release so installed apps update. */
const VERSION = 'pedalz-v1.3.0';
const SHELL = `${VERSION}-shell`;
const TILES = 'pedalz-tiles';   // constant names: survive version bumps (saved offline areas are kept)
const LIBS  = 'pedalz-libs';
const MAX_TILES = 1500;
const SHELL_FILES = ['./', 'index.html', 'config.js', 'manifest.json', 'privacy.html',
  'assets/pedalz-logo.svg', 'assets/pedalz-icon-192.png', 'assets/pedalz-icon-512.png', 'assets/apple-touch-icon.png'];
const LIB_URLS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'
];
const LIB_HOSTS = ['unpkg.com', 'cdn.jsdelivr.net'];
const TILE_RE = /\/\d{1,2}\/\d+\/\d+(@2x)?\.(png|jpe?g|webp)(\?|$)/i;   // any z/x/y raster tile URL
const M = { ignoreVary: true };

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(SHELL_FILES);
    // pre-cache the CDN libraries now so the app also starts offline right after the first visit
    const libs = await caches.open(LIBS);
    await Promise.all(LIB_URLS.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && libs.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL, TILES, LIBS]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // live API traffic is never cached
  if (url.hostname.endsWith('supabase.co') || url.hostname.includes('routing.openstreetmap.de')) return;

  // map tiles: cache-first, then network (stored for next time)
  if (TILE_RE.test(url.pathname + url.search) || url.hostname === 'server.arcgisonline.com') {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(req.url, M);
      if (hit) return hit;
      try {
        let res;
        try { res = await fetch(new Request(req.url, { mode: 'cors' })); } catch { res = await fetch(req); }   // prefer CORS (small quota cost)
        if (res && (res.ok || res.type === 'opaque')) { c.put(req.url, res.clone()); trim(c, MAX_TILES); }
        return res;
      } catch { return new Response('', { status: 504 }); }
    }));
    return;
  }
  // CDN libraries: cache-first (pre-cached at install), refresh in background
  if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(LIBS).then(async c => {
      const hit = await c.match(req.url, M);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req.url, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // page navigations: network-first, offline falls back to the cached shell
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(SHELL).then(c => c.put('index.html', copy)); return res; })
      .catch(() => caches.match('index.html', M).then(r => r || caches.match('./', M))));
    return;
  }
  // same-origin assets: cache-first, refresh in background
  e.respondWith(caches.open(SHELL).then(async c => {
    const hit = await c.match(req, M);
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
