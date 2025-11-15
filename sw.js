/* sw.js */
const VERSION = 'v2.0.0';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const IMG_CACHE = `img-${VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.webmanifest',
  '/img/no-image.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![STATIC_CACHE, RUNTIME_CACHE, IMG_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isApi(req) { return req.url.includes('/api/search'); }
function isImg(req) { return req.url.includes('/api/img'); }
function isSameOrigin(req) { return new URL(req.url).origin === self.origin; }

async function handleImage(req) {
  const cache = await caches.open(IMG_CACHE);
  const cached = await cache.match(req);
  const fetchAndPut = fetch(req, { mode: 'no-cors' }).then(res => {
    cache.put(req, res.clone()).catch(()=>{});
    return res;
  }).catch(() => cached);
  return cached ? cached : fetchAndPut;
}

async function handleApi(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(req);
    cache.put(req, res.clone()).catch(()=>{});
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ items: [], meta: { error: 'offline' } }), {
      headers: { 'Content-Type': 'application/json' }, status: 200
    });
  }
}

async function handleStatic(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  cache.put(req, res.clone()).catch(()=>{});
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;

  if (isApi(req)) {
    e.respondWith(handleApi(req));
    return;
  }
  if (isImg(req)) {
    e.respondWith(handleImage(req));
    return;
  }
  if (isSameOrigin(req) && req.method === 'GET') {
    e.respondWith(handleStatic(req));
  }
});
