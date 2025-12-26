/**
 * Service Worker for Push Notifications
 * Place in public/ folder
 */

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
