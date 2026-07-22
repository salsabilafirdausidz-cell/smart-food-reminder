// Smart Food Reminder — Service Worker
const CACHE_NAME = 'sfr-v5'; // bump versi ini setiap kali deploy perubahan penting
const ASSETS = [
  './manifest.json',
  './icons/logo.svg',
  './icons/icon-72.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
];

// Install: pre-cache aset statis (bukan index.html — itu selalu diambil fresh)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: hapus semua cache versi lama & langsung ambil alih tab yang terbuka
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch:
// - HTML (navigasi ke halaman) → NETWORK-FIRST. Selalu coba ambil versi
//   terbaru dari server dulu; cache cuma jadi cadangan kalau offline.
//   Ini yang mencegah user "kejebak" versi lama setelah kita update kode.
// - Aset statis (icon dll) → cache-first, karena jarang berubah & biar cepat.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isNavigation = event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {});
    })
  );
});

// ─── PUSH NOTIFICATIONS ────────────────────────────────
// Menerima push message asli dari server (dikirim oleh /api/cron/check-expiry
// lewat Web Push Protocol) dan menampilkannya sebagai notifikasi sistem,
// bahkan saat aplikasi sedang tertutup.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Smart Food Reminder', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Smart Food Reminder';
  const options = {
    body: data.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './' },
    requireInteraction: false,
  };

  // Update angka badge di ikon Home Screen, dikirim server bareng notifikasi.
  // Ini yang membuat badge tetap akurat walau aplikasi sedang tertutup total.
  const badgeTask = ('setAppBadge' in self.navigator)
    ? (data.badgeCount > 0
        ? self.navigator.setAppBadge(data.badgeCount).catch(() => {})
        : self.navigator.clearAppBadge().catch(() => {}))
    : Promise.resolve();

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    badgeTask,
  ]));
});

// Saat notifikasi di-tap: buka/fokus ke aplikasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
