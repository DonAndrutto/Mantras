// Atomic, complete offline download. Updates wait until all app windows close,
// so an active recitation never mixes two releases or reloads without consent.
// Run node scripts/update-precache.mjs after editing shipped files.
// BEGIN GENERATED
const VERSION = 'dadf02df130734b7';
const PRECACHE = [
  "app.css",
  "fonts/EBGaramond-Medium-latin-ext.woff2",
  "fonts/EBGaramond-Medium-latin.woff2",
  "fonts/EBGaramond-MediumItalic-latin-ext.woff2",
  "fonts/EBGaramond-MediumItalic-latin.woff2",
  "fonts/Jomolhari-Regular.ttf",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon.svg",
  "index.html",
  "js/app.js",
  "js/backdrop.js",
  "js/camera.js",
  "js/dialogs.js",
  "js/effects/nectar.js",
  "js/effects/offerings.js",
  "js/effects/rays.js",
  "js/effects/stars.js",
  "js/glyphs.js",
  "js/help.js",
  "js/install.js",
  "js/quality.js",
  "js/seats.js",
  "js/settings.js",
  "js/shell.js",
  "js/stage.js",
  "js/tibetan.js",
  "js/ui.js",
  "js/vajra.js",
  "js/xr.js",
  "manifest.webmanifest",
  "mantras/amitabha.js",
  "mantras/chenrezig.js",
  "mantras/dzambhala.js",
  "mantras/green-tara.js",
  "mantras/index.js",
  "mantras/kurukulle.js",
  "mantras/shared.js",
  "mantras/vajra-guru.js",
  "mantras/vajrasattva.js",
  "mantras/white-tara.js",
  "vendor/three@0.184.0/build/three.core.js",
  "vendor/three@0.184.0/build/three.module.js",
  "vendor/three@0.184.0/examples/jsm/controls/OrbitControls.js"
];
// END GENERATED
// Scope-isolated: Mantras must never remove Ngondro or BardoOS caches.
const PREFIX = `mantras:${self.registration.scope}:`;
const CACHE = PREFIX + VERSION;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE.map(path => new Request(new URL(path, self.registration.scope), { cache: 'reload' })));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Only the actual app entry uses the shell; missing assets are never HTML.
    const entry = url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html';
    const hit = await cache.match(entry ? new URL('index.html', scope).href : request, { ignoreSearch: true });
    return hit || fetch(request);
  })());
});
