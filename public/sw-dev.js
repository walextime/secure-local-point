// Development Service Worker - Minimal interference
const CACHE_NAME = 'pos-pwa-dev';

// Install event - minimal caching for development
self.addEventListener('install', (event) => {
  console.log('Development Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened development cache');
        // Don't cache anything in development
        return Promise.resolve();
      })
      .catch((error) => {
        console.error('Development cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Development Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - pass through to network in development
self.addEventListener('fetch', (event) => {
  // In development, just pass through to network
  // Don't cache anything to avoid conflicts with Vite
  event.respondWith(
    fetch(event.request).catch(() => {
      // Only fallback for navigation requests
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
      return new Response('Not found', { status: 404 });
    })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Development Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 