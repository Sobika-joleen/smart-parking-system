// ── Smart Parking — Notification Service ─────────────────────────────
// Handles browser Web Push (VAPID) + local notifications
// No Firebase required — uses native browser Push API

import { supabase } from '../supabaseClient';

// ── VAPID Public Key ───────────────────────────────────────────────────
// Generate your own at: https://web-push-codelab.glitch.me/
// Or run: npx web-push generate-vapid-keys
// Replace this with your actual public key after generating
const VAPID_PUBLIC_KEY =
  process.env.REACT_APP_VAPID_PUBLIC_KEY ||
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZkORX2F-x2iblxhd5wunkTjFNA';

// ── Convert VAPID key to Uint8Array ──────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// ── Register Service Worker ───────────────────────────────────────────
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('[Notifications] Service worker registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[Notifications] SW registration failed:', err);
    return null;
  }
}

// ── Request notification permission ──────────────────────────────────
export async function requestPermission() {
  if (!('Notification' in window)) {
    console.warn('[Notifications] Not supported in this browser');
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  const permission = await Notification.requestPermission();
  return permission;
}

// ── Get or create push subscription ──────────────────────────────────
export async function getPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    return sub;
  } catch (err) {
    console.error('[Notifications] Push subscription failed:', err);
    return null;
  }
}

// ── Save push subscription to Supabase profiles ───────────────────────
export async function saveTokenToSupabase(userId, subscription) {
  if (!userId || !subscription) return;
  const subJson = JSON.stringify(subscription);
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        notification_token: subJson,
        notification_endpoint: subscription.endpoint,
      })
      .eq('id', userId);
    if (error) console.error('[Notifications] Save token error:', error);
    else console.log('[Notifications] Push token saved to Supabase');
  } catch (err) {
    console.error('[Notifications] Save token exception:', err);
  }
}

// ── Full setup: permission + subscribe + save ─────────────────────────
export async function setupPushNotifications(userId) {
  const permission = await requestPermission();
  if (permission !== 'granted') return { success: false, permission };
  await registerServiceWorker();
  const subscription = await getPushSubscription();
  if (subscription) await saveTokenToSupabase(userId, subscription);
  return { success: !!subscription, permission, subscription };
}

// ── Send local (in-browser) notification ─────────────────────────────
// Works when tab is open or in background (via SW)
export function sendLocalNotification(title, body, options = {}) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Use service worker notification for action support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        requireInteraction: options.requireInteraction ?? false,
        tag: options.tag || 'smart-parking',
        data: options.data || {},
        actions: options.actions || [],
      });
    });
  } else {
    // Fallback to basic Notification
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

// ── Notification-type helpers ─────────────────────────────────────────

export function notifyParkingDetected({ slotId, bookingId, vehicleNumber }) {
  sendLocalNotification(
    '🚗 Vehicle Detected!',
    `Is your vehicle (${vehicleNumber}) parked in Slot ${slotId}? Please confirm.`,
    {
      requireInteraction: true,
      tag: `parking-detect-${bookingId}`,
      data: { bookingId, slotId, type: 'parking_detected' },
      actions: [
        { action: 'confirm', title: '✅ Yes, Confirm' },
        { action: 'wrong_slot', title: '❌ Wrong Slot' },
      ],
    }
  );
}

export function notifyReminder({ slotId, bookingId, minutesLeft }) {
  sendLocalNotification(
    '⏰ Reminder: Confirm Your Parking',
    `You have ${minutesLeft} min to confirm Slot ${slotId}. Auto-confirming soon.`,
    {
      requireInteraction: true,
      tag: `reminder-${bookingId}`,
      data: { bookingId, slotId, type: 'reminder' },
      actions: [
        { action: 'confirm', title: '✅ Confirm Now' },
        { action: 'wrong_slot', title: '❌ Wrong Slot' },
      ],
    }
  );
}

export function notifyBookingCancelled({ slotId, bookingId }) {
  sendLocalNotification(
    '❌ Booking Cancelled',
    `Your reservation for Slot ${slotId} has been cancelled. Any wallet payment will be refunded.`,
    {
      tag: `cancelled-${bookingId}`,
      data: { bookingId, slotId, type: 'cancelled' },
    }
  );
}

export function notifyTimeWarning({ slotId, bookingId, minutesLeft }) {
  sendLocalNotification(
    '⏱️ Parking Expiring Soon',
    `Slot ${slotId} expires in ${minutesLeft} min. Please exit or you will incur overtime charges.`,
    {
      tag: `time-warning-${bookingId}`,
      data: { bookingId, slotId, type: 'time_warning' },
      actions: [{ action: 'open', title: '⏱ View Booking' }],
    }
  );
}

export function notifyAutoConfirmed({ slotId, bookingId }) {
  sendLocalNotification(
    '✅ Parking Auto-Confirmed',
    `Slot ${slotId} was auto-confirmed after no response. Your session is now active.`,
    {
      tag: `auto-confirm-${bookingId}`,
      data: { bookingId, slotId, type: 'auto_confirmed' },
    }
  );
}

// ── Scheduled reminder (setTimeout-based) ───────────────────────────
// Returns a cancel function
export function scheduleReminder(bookingId, slotId, delayMs, message, minutesLeft = 1) {
  const timer = setTimeout(() => {
    notifyReminder({ slotId, bookingId, minutesLeft });
  }, delayMs);
  return () => clearTimeout(timer); // call to cancel
}

// ── Listen for SW notification action clicks ─────────────────────────
// Returns unsubscribe function
export function onNotificationAction(callback) {
  if (!('serviceWorker' in navigator)) return () => {};
  const handler = (event) => {
    if (event.data?.type === 'NOTIFICATION_ACTION') {
      callback(event.data);
    }
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
