const CACHE_NAME = 'gnoke-market-v1';
const ASSETS = [
  './',
  './index.html',
  './main/index.html',
  './settings.html', 
  './about.html',
  './style.css', 
  './global.png', 
  './manifest.json',
  './js/state.js', 
  './js/theme.js', 
  './js/ui.js',
  './js/db-core.js',
  './js/app.js',
  './menu.js',
];

self.addEventListener('install',  e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
