// 헬스앱 Service Worker - 오프라인 캐싱
const CACHE_VERSION = 'health-app-v6';
const CACHE_NAME = `health-app-${CACHE_VERSION}`;

// 캐싱할 핵심 자원
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 설치 - 핵심 자원 미리 캐싱
self.addEventListener('install', function(event) {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CORE_ASSETS).catch(function(err) {
        console.warn('[SW] Pre-cache 일부 실패 (무시):', err);
      });
    })
  );
  self.skipWaiting();
});

// 활성화 - 이전 버전 캐시 삭제
self.addEventListener('activate', function(event) {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name.startsWith('health-app-') && name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] 이전 캐시 삭제:', name);
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// 요청 가로채기 - Network First (네트워크 우선, 실패 시 캐시)
self.addEventListener('fetch', function(event) {
  // POST 등 캐싱 안 하는 메소드는 패스
  if (event.request.method !== 'GET') return;
  
  // Anthropic API 등 외부 요청은 캐싱 X
  var url = new URL(event.request.url);
  if (url.hostname === 'api.anthropic.com' || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('vercel.app') && url.pathname.startsWith('/api')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request).then(function(response) {
      // 성공한 응답은 캐시에 저장 (HTML/JSON/이미지)
      if (response && response.status === 200 && response.type === 'basic') {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      // 네트워크 실패 시 캐시에서 반환
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        // index.html 폴백 (SPA 라우팅)
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('오프라인', { status: 503 });
      });
    })
  );
});
