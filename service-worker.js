/* Prompt HQ 1.1 service worker.
   Caches ONLY the static application files listed below, so the app opens offline.
   It never caches, reads, or sends user content: prompts, profiles, drafts, presets, and settings
   live in the page's localStorage, which this worker cannot access and never touches.
   Updates replace this app-file cache only; localStorage is left alone. */
const VERSION = '1.1.0';
const CACHE = 'prompt-hq-shell-' + VERSION;
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  // cache: 'reload' bypasses the HTTP cache so a new version gets fresh files.
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_FILES.map(u => new Request(u, { cache: 'reload' })))));
  // No automatic skipWaiting: the page shows "Prompt HQ update available" and the user chooses when.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Remove only older Prompt HQ app-file caches. Nothing else is deleted.
    await Promise.all(keys.filter(k => k.startsWith('prompt-hq-shell-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  // Only same-origin GET requests for the app itself. Everything else is left untouched.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then(r => r || fetch(req)));
    return;
  }
  // Cache-first for listed app files. Anything not precached goes to the network and is NOT stored.
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});
