// ── Smart Parking Service Worker ─────────────────────────────────────
// Handles background push notifications & action button clicks
// Placed in /public/sw.js so it's registered at root scope

self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim());
});

// ── Push event: show notification ─────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Smart Parking', body: event.data ? event.data.text() : '' };
  }

  const { title = 'Smart Parking', body = '', tag = 'default', type = 'info', bookingId, slotId } = data;

  const options = {
    body,
    tag,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    requireInteraction: type === 'parking_detected' || type === 'reminder',
    data: { bookingId, slotId, type, url: self.location.origin },
    actions: type === 'parking_detected' || type === 'reminder'
      ? [
          { action: 'confirm', title: '✅ Yes, Confirm' },
          { action: 'wrong_slot', title: '❌ Wrong Slot' },
        ]
      : type === 'time_warning'
      ? [{ action: 'open', title: '⏱ View Booking' }]
      : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click handler ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { action } = event;
  const { bookingId, slotId, type, url } = event.notification.data || {};

  const targetUrl = url || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Post message to existing open tab
      const existingClient = clientList.find((c) => c.url.startsWith(targetUrl));

      const message = {
        type: 'NOTIFICATION_ACTION',
        action: action || 'open',
        bookingId,
        slotId,
        notificationType: type,
      };

      if (existingClient) {
        existingClient.postMessage(message);
        return existingClient.focus();
      }

      // Open fresh tab if none exists
      return clients.openWindow(targetUrl).then((newClient) => {
        if (newClient) newClient.postMessage(message);
      });
    })
  );
});

// ── Background sync (fallback) ────────────────────────────────────────
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});
