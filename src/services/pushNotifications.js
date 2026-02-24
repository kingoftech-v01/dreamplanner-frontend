/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Push Notification Service
 *
 * Handles VAPID-based Web Push subscription management.
 * Call subscribeToPush() after login to register the browser for
 * push notifications via the backend.
 * ═══════════════════════════════════════════════════════════════════ */

import { isNative } from "./native";
import { registerNativePush, checkNativePushPermission, unregisterNativePush } from "./nativeNotifications";

var VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

/**
 * Convert a base64 VAPID key to a Uint8Array for pushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String) {
  var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  var rawData = atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request notification permission and subscribe to push notifications.
 * Sends the subscription to the backend.
 */
export function subscribeToPush() {
  // Native: use FCM/APNS via Capacitor PushNotifications
  if (isNative) {
    return registerNativePush();
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return Promise.resolve(null);
  }

  if (!VAPID_PUBLIC_KEY) {
    return Promise.resolve(null);
  }

  return Notification.requestPermission().then(function (permission) {
    if (permission !== "granted") {
      return null;
    }

    return navigator.serviceWorker.ready.then(function (registration) {
      return registration.pushManager.getSubscription().then(function (existing) {
        if (existing) {
          return existing;
        }

        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }).then(function (subscription) {
        if (!subscription) return null;

        // Send subscription to backend
        var token = null;
        try { token = localStorage.getItem("dp-auth-token"); } catch (e) {}

        return fetch(
          (import.meta.env.VITE_API_BASE || "") + "/api/notifications/push-subscriptions/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: "Token " + token } : {}),
            },
            credentials: "include",
            body: JSON.stringify({
              endpoint: subscription.endpoint,
              keys: {
                p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey("p256dh")))),
                auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey("auth")))),
              },
            }),
          }
        ).then(function () {
          return subscription;
        });
      });
    });
  }).catch(function (err) {
    console.warn("Push subscription failed:", err);
    return null;
  });
}

/**
 * Unsubscribe from push notifications and remove from backend.
 */
export function unsubscribeFromPush() {
  if (isNative) {
    return unregisterNativePush().then(function () { return true; });
  }

  if (!("serviceWorker" in navigator)) {
    return Promise.resolve(false);
  }

  return navigator.serviceWorker.ready.then(function (registration) {
    return registration.pushManager.getSubscription().then(function (subscription) {
      if (!subscription) return false;

      return subscription.unsubscribe().then(function () {
        var token = null;
        try { token = localStorage.getItem("dp-auth-token"); } catch (e) {}

        return fetch(
          (import.meta.env.VITE_API_BASE || "") + "/api/notifications/push-subscriptions/",
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: "Token " + token } : {}),
            },
            credentials: "include",
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          }
        ).then(function () {
          return true;
        });
      });
    });
  }).catch(function (err) {
    console.warn("Push unsubscribe failed:", err);
    return false;
  });
}

/**
 * Check if push notifications are currently supported and permitted.
 */
export function isPushSupported() {
  if (isNative) return true;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Get current push permission state.
 * Returns "granted", "denied", or "default".
 */
export function getPushPermission() {
  if (isNative) return checkNativePushPermission();
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}
