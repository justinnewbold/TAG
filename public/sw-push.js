/**
 * Service Worker for Push Notifications and Offline Support
 * Place in public/ folder
 */

// Cache names
const CACHE_NAME = 'tag-game-v1';
const STATIC_CACHE = 'tag-static-v1';
const API_CACHE = 'tag-api-v1';

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API endpoints to cache
const CACHEABLE_API_ROUTES = [
  '/api/users/',
  '/api/social/friends',
  '/api/challenges',
  '/api/leaderboards',
  '/api/game-modes',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_RESOURCES).catch((err) => {
          console.warn('Failed to cache some static resources:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== API_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static resources
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route));

  try {
    const response = await fetch(request);

    // Cache successful responses for cacheable routes
    if (response.ok && isCacheable) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Try to serve from cache if network fails
    const cached = await caches.match(request);
    if (cached) {
      // Add header to indicate cached response
      const headers = new Headers(cached.headers);
      headers.set('X-Cached', 'true');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }

    // Return offline error response
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  // Check cache first
  const cached = await caches.match(request);
  if (cached) {
    // Update cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, response);
        });
      }
    }).catch(() => {});

    return cached;
  }

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response('Offline', { status: 503 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

// Sync offline queue
async function syncOfflineQueue() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const queueResponse = await cache.match('offline-queue');

    if (!queueResponse) return;

    const queue = await queueResponse.json();

    for (const action of queue) {
      try {
        await fetch('/api/offline/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
      } catch (error) {
        console.error('Failed to sync action:', error);
        // Re-queue failed actions
        break;
      }
    }

    // Clear the queue
    await cache.delete('offline-queue');

    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    });
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push received:', event);

  let data = {
    title: 'TAG',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    vibrate: data.urgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
    tag: data.tag || 'tag-notification',
    renotify: true,
    requireInteraction: data.urgent || false,
    data: data.data || {},
    actions: data.actions || [],
  };

  // Add default actions based on type
  if (data.type === 'GAME_INVITE') {
    options.actions = [
      { action: 'join', title: '🎮 Join Game' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  } else if (data.type === 'BEING_HUNTED') {
    options.actions = [
      { action: 'open', title: '📍 Open Map' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Handle different actions
  if (event.action === 'join' && data.gameId) {
    url = `/game/${data.gameId}/lobby`;
  } else if (event.action === 'open' && data.gameId) {
    url = `/game/${data.gameId}`;
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return client.focus();
        }
      }
      // Open new window if app is not open
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then((subscription) => {
      // Send new subscription to server
      return fetch('/api/notifications/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldSubscription: event.oldSubscription,
          newSubscription: subscription,
        }),
      });
    })
  );
});
