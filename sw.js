// Her yeni güncellemede sadece bu sürüm numarasını artırın (Örn: v2 -> v3 -> v4)
const CACHE_NAME = 'stok-temel-v3';

const TEMEL_DOSYALAR = [
    './',
    './index.html',
    './manifest.json'
];

// Kurulum: Beklemeden anında yeni sürümü devreye al
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(TEMEL_DOSYALAR);
        })
    );
});

// Aktivasyon: Eski sürüm önbelleklerini otomatik temizle ve tüm sekmeleri devral
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// İstek Yönetimi: Önce İnternet (Network-First), internet yoksa Önbellek
self.addEventListener('fetch', event => {
    // Sadece GET isteklerini ve kendi sunucumuzdaki dosyaları yönet (Supabase API'ye dokunma)
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request, { cache: 'no-store' })
            .then(networkResponse => {
                // İnternetten güncel dosya geldiyse önbelleği de tazele
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // İnternet kesikse önbellekteki son kopyayı aç
                return caches.match(event.request);
            })
    );
});
