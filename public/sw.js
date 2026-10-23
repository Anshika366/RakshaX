// RakshaX Emergency Service Worker — Offline Map Tile Cacher & Last Known Location Safeguard
const CACHE_NAME_TILES = 'rakshax-map-tiles-v1';
const CACHE_NAME_SHELL = 'rakshax-app-shell-v1';

// Key Map Tile URL domains to intercept & cache
const MAP_TILE_DOMAINS = [
  'tile.openstreetmap.org',
  'basemaps.cartocdn.com',
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org',
  'stamen-tiles.a.ssl.fastly.net',
  'tile.thunderforest.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME_SHELL).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      ]).catch((err) => {
        console.warn('[SW] App Shell precache partial warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME_TILES && cache !== CACHE_NAME_SHELL) {
            console.log('[SW] Deleting legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Check if request is a map tile URL
function isMapTileRequest(url) {
  const urlObj = new URL(url);
  return MAP_TILE_DOMAINS.some(domain => urlObj.hostname.includes(domain)) ||
         (url.includes('/tile/') || url.match(/\/\d+\/\d+\/\d+\.(png|jpg|jpeg|webp)/i));
}

// Helper: Generate fallback SVG tile when offline and tile not pre-cached
function createOfflineTileResponse() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
    <path d="0 0 L256 256 M256 0 L0 256" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4"/>
    <circle cx="128" cy="128" r="40" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.5"/>
    <text x="128" y="122" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b" text-anchor="middle">OFFLINE MAP TILE</text>
    <text x="128" y="138" font-family="sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">Emergency Mode Active</text>
  </svg>`;
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' }
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // 1. Map Tiles Caching Strategy (Cache First with Network Fallback & Cache Update)
  if (isMapTileRequest(url)) {
    event.respondWith(
      caches.open(CACHE_NAME_TILES).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Revalidate in background if online
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
          }).catch(() => {/* Offline revalidation silent handle */});
          return cachedResponse;
        }

        // If not in cache, try fetching from network
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Return offline placeholder map tile
          return createOfflineTileResponse();
        }
      })
    );
    return;
  }

  // 2. Nominatim OpenStreetMap Geocoding API caching
  if (url.includes('nominatim.openstreetmap.org')) {
    event.respondWith(
      caches.open(CACHE_NAME_SHELL).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
          return cachedResponse || networkResponse;
        } catch (error) {
          if (cachedResponse) return cachedResponse;
          // Fallback mock json response if geocoding while offline
          return new Response(JSON.stringify({
            display_name: "Last Known Emergency Coordinates (Offline Satellite Cache)",
            address: { suburb: "Monitored Zone", city: "Offline Emergency Cache" }
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      })
    );
    return;
  }

  // 3. Leaflet CSS/JS assets caching
  if (url.includes('unpkg.com/leaflet')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME_SHELL).then(c => c.put(request, res.clone()));
          }
          return res;
        });
      })
    );
    return;
  }

  // Standard fetch pass-through for API calls
  if (url.includes('/api/')) {
    return;
  }
});

// Communication with frontend for pre-caching tiles
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRECACHE_TILE') {
    const tileUrl = event.data.url;
    caches.open(CACHE_NAME_TILES).then((cache) => {
      cache.match(tileUrl).then((matched) => {
        if (!matched) {
          fetch(tileUrl).then((res) => {
            if (res.ok) cache.put(tileUrl, res);
          }).catch(() => {});
        }
      });
    });
  }
});
