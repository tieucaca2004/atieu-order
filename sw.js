// Service Worker - A. Tiểu PWA
const VERSION = 'atieu-v2';
const CACHE_NAME = VERSION;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

const STATIC_ASSETS = ['/', '/index.html'];

// ── INSTALL ──
self.addEventListener('install', event => {
  console.log('[SW] Installing:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE: xóa cache cũ ──
self.addEventListener('activate', event => {
  console.log('[SW] Activating:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: Network First + xóa cache cũ hơn 7 ngày ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  // Bỏ qua API calls
  if (
    url.includes('api.telegram.org') ||
    url.includes('script.google.com') ||
    url.includes('vietqr.io') ||
    url.includes('firebasedatabase.app')
  ) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            // Lưu kèm timestamp
            const headers = new Headers(clone.headers);
            headers.append('sw-cached-at', Date.now().toString());
            clone.blob().then(body => {
              const timestampedResponse = new Response(body, {
                status: clone.status,
                statusText: clone.statusText,
                headers
              });
              cache.put(event.request, timestampedResponse);
            });
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) {
            // Kiểm tra tuổi cache
            const cachedAt = cached.headers.get('sw-cached-at');
            if (cachedAt && Date.now() - parseInt(cachedAt) > MAX_AGE_MS) {
              // Cache quá 7 ngày → xóa và trả lỗi
              caches.open(CACHE_NAME).then(c => c.delete(event.request));
              return new Response(
                '<h2 style="font-family:sans-serif;text-align:center;padding:40px;color:#C8391A">📵 Cache đã hết hạn<br><small>Vui lòng kết nối mạng để tải lại</small></h2>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            }
            return cached;
          }
          return new Response(
            '<h2 style="font-family:sans-serif;text-align:center;padding:40px;color:#C8391A">📵 Không có mạng<br><small>Vui lòng kiểm tra kết nối</small></h2>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
      )
  );
});

// ── PERIODIC CLEANUP: xóa cache cũ hơn 7 ngày khi app mở ──
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'cleanOldCache') {
    cleanOldCache();
  }
});

async function cleanOldCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let deleted = 0;
  for (const request of keys) {
    const response = await cache.match(request);
    if (!response) continue;
    const cachedAt = response.headers.get('sw-cached-at');
    if (cachedAt && Date.now() - parseInt(cachedAt) > MAX_AGE_MS) {
      await cache.delete(request);
      deleted++;
    }
  }
  console.log(`[SW] Cleaned ${deleted} old cache entries`);
}

// Tự dọn cache khi activate
self.addEventListener('activate', event => {
  event.waitUntil(cleanOldCache());
});
