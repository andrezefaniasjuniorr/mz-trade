const CACHE_NAME = 'taprise-v4-no-fouc';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { 
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))).then(() => self.clients.claim())); 
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // NUNCA intercepta nada no Google Studio, _next, api, css, js
  if (url.hostname.includes('aistudio') || url.hostname.includes('google') || url.hostname.includes('run.app') || url.pathname.startsWith('/_next') || url.pathname.includes('api') || e.request.method !== 'GET') {
    return;
  }
  e.respondWith(
    fetch(e.request).then(res => {
      if(res.ok){ const clone=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(e.request, clone)); }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
