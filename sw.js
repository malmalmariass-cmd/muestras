/* Cher Services — service worker: keeps the app on the tablet so it opens and works without internet.
   - The app files (pages, scripts, PDF engine, icons) are saved on the device when it is installed / first opened.
   - Pages: the newest version from the server when there is signal, the saved copy when there is not.
   - Scripts and images: the saved copy at once, refreshed in the background.
   - The API (api/…) is never saved here: reports wait in the app's own storage and are sent when the signal returns. */
const VERSION = 'cher-v15';
const CORE = ['./', 'index.html', 'admin.html', 'pdf.js', 'pdf-codes.js', 'combo.js', 'ui-help.js', 'vendor/jspdf.umd.min.js',
  'vendor/xlsx.full.min.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))   // a missing icon never stops the install
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;   // API, uploads and other sites: straight to the network
  if (req.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.endsWith('/')) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
