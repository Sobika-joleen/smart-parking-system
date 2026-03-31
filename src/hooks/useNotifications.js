// ── useNotifications Hook ─────────────────────────────────────────────
// React hook wrapping notificationService for easy use in components

import { useState, useEffect, useCallback } from 'react';
import {
  setupPushNotifications,
  notifyParkingDetected,
  notifyReminder,
  notifyBookingCancelled,
  notifyTimeWarning,
  notifyAutoConfirmed,
  scheduleReminder,
  onNotificationAction,
} from '../services/notificationService';

export const useNotifications = (session) => {
  const [permissionStatus, setPermissionStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // ── Auto-setup on mount if permission already granted ─────────────
  useEffect(() => {
    if (
      session?.user?.id &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      setupPushNotifications(session.user.id).then(({ success }) => {
        setPushEnabled(success);
      });
    }
  }, [session?.user?.id]);

  // ── Request permission + setup ────────────────────────────────────
  const requestAndSetup = useCallback(async () => {
    if (!session?.user?.id) return false;
    setIsSettingUp(true);
    try {
      const { success, permission } = await setupPushNotifications(session.user.id);
      setPermissionStatus(permission);
      setPushEnabled(success);
      return success;
    } finally {
      setIsSettingUp(false);
    }
  }, [session?.user?.id]);

  // ── Listen for SW action clicks (confirm / wrong_slot) ────────────
  // Returns unsubscribe fn — caller manages this via its own effect
  const listenForActions = useCallback((callback) => {
    return onNotificationAction(callback);
  }, []);

  // Notification fire helpers (wrapped for convenience)
  const fireParking  = useCallback(notifyParkingDetected, []);
  const fireReminder = useCallback(notifyReminder,        []);
  const fireCancelled= useCallback(notifyBookingCancelled,[]);
  const fireWarning  = useCallback(notifyTimeWarning,     []);
  const fireAutoConf = useCallback(notifyAutoConfirmed,   []);

  // ── Schedule reminder with auto-cancel tracking ───────────────────
  const scheduleReminderOnce = useCallback(
    (bookingId, slotId, delayMs, minutesLeft) =>
      scheduleReminder(bookingId, slotId, delayMs, null, minutesLeft),
    []
  );

  return {
    permissionStatus,
    pushEnabled,
    isSettingUp,
    requestAndSetup,
    listenForActions,
    fireParking,
    fireReminder,
    fireCancelled,
    fireWarning,
    fireAutoConf,
    scheduleReminderOnce,
  };
};
