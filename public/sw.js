/* eslint-disable no-restricted-globals */
// Service worker แบบง่าย ๆ เพื่อให้เปิดแอปแบบออฟไลน์ได้หลังโหลดครั้งแรก
// เก็บเฉพาะทรัพยากรจาก origin เดียวกันเท่านั้น (ไม่แคชรูปจากเว็บอื่น)
const CACHE = 'bot-cards-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './favicon.svg']))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ไม่แคสรรพย์ origin อื่น (เช่น URL รูปภายนอก)

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
