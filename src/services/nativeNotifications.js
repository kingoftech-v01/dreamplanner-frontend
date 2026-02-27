// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Native Push Notifications (FCM / APNS)
//
// Handles Capacitor PushNotifications plugin for native platforms.
// Web push is handled separately in pushNotifications.js.
// ═══════════════════════════════════════════════════════════════

import { Capacitor } from "@capacitor/core";
import { apiPost } from "./api";

var isNative = Capacitor.isNativePlatform();

/**
 * Register for native push notifications.
 * Requests permission, registers with FCM/APNS, and sends the
 * device token to the backend.
 */
export function registerNativePush() {
  if (!isNative) return Promise.resolve(null);

  return import("@capacitor/push-notifications").then(function (mod) {
    var PushNotifications = mod.PushNotifications;

    return PushNotifications.requestPermissions().then(function (result) {
      if (result.receive !== "granted") {
        return null;
      }
      return PushNotifications.register().then(function () {
        return new Promise(function (resolve) {
          // Listen for the registration token
          PushNotifications.addListener("registration", function (token) {
            sendTokenToBackend(token.value).then(function () {
              resolve(token.value);
            }).catch(function () {
              resolve(token.value);
            });
          });

          PushNotifications.addListener("registrationError", function (err) {
            console.warn("Push registration failed:", err);
            resolve(null);
          });
        });
      });
    });
  }).catch(function (err) {
    console.warn("Native push setup failed:", err);
    return null;
  });
}

/**
 * Set up push notification listeners for foreground + tap actions.
 */
export function setupPushListeners(handlers) {
  if (!isNative) return Promise.resolve({ remove: function () {} });

  var onNotification = (handlers && handlers.onNotification) || function () {};
  var onAction = (handlers && handlers.onAction) || function () {};

  return import("@capacitor/push-notifications").then(function (mod) {
    var PushNotifications = mod.PushNotifications;
    var listeners = [];

    // Notification received while app is in foreground
    listeners.push(
      PushNotifications.addListener("pushNotificationReceived", function (notification) {
        onNotification({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
      })
    );

    // User tapped on a notification
    listeners.push(
      PushNotifications.addListener("pushNotificationActionPerformed", function (action) {
        var notification = action.notification;
        onAction({
          actionId: action.actionId,
          id: notification.id,
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
      })
    );

    return Promise.all(listeners).then(function (resolvedListeners) {
      return {
        remove: function () {
          resolvedListeners.forEach(function (l) {
            if (l && l.remove) l.remove();
          });
        },
      };
    });
  });
}

/**
 * Check current native push permission status.
 * Returns "granted", "denied", or "prompt".
 */
export function checkNativePushPermission() {
  if (!isNative) return Promise.resolve("denied");

  return import("@capacitor/push-notifications").then(function (mod) {
    return mod.PushNotifications.checkPermissions().then(function (status) {
      return status.receive; // "granted" | "denied" | "prompt"
    });
  });
}

/**
 * Remove all push notification listeners and clear delivered notifications.
 */
export function unregisterNativePush() {
  if (!isNative) return Promise.resolve();

  return import("@capacitor/push-notifications").then(function (mod) {
    var PushNotifications = mod.PushNotifications;
    return PushNotifications.removeAllListeners().then(function () {
      return PushNotifications.removeAllDeliveredNotifications();
    });
  });
}

// ── Default Notification Channel ─────────────────────────────

/**
 * Create the default notification channel for general push notifications.
 * Matches the backend FCM channel_id 'dreamplanner_default'.
 */
export function createDefaultNotificationChannel() {
  if (!isNative) return Promise.resolve();

  return import("@capacitor/local-notifications").then(function (mod) {
    return mod.LocalNotifications.createChannel({
      id: "dreamplanner_default",
      name: "DreamPlanner",
      description: "General notifications from DreamPlanner",
      importance: 4,
      visibility: 1,
      vibration: true,
      sound: "default",
    });
  }).catch(function (err) {
    console.warn("Failed to create default channel:", err);
  });
}

// ── Buddy Call Channel (incoming voice/video calls) ─────────

/**
 * Create a high-priority notification channel for incoming buddy calls.
 * Similar to task-calls but for real voice/video calls.
 */
export function createBuddyCallChannel() {
  if (!isNative) return Promise.resolve();

  return import("@capacitor/local-notifications").then(function (mod) {
    return mod.LocalNotifications.createChannel({
      id: "buddy-calls",
      name: "Buddy Calls",
      description: "Incoming voice and video calls from your buddies",
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: "ringtone",
      lights: true,
      lightColor: "#8B5CF6",
    });
  }).catch(function (err) {
    console.warn("Failed to create buddy-call channel:", err);
  });
}

/**
 * Show a local notification with sound/vibration when a push arrives
 * while the app is in the foreground (Capacitor suppresses push UI).
 */
export function showForegroundNotification(notification) {
  if (!isNative) return Promise.resolve();

  var data = notification.data || {};
  var isCall = data.type === "incoming_call";
  var channelId = isCall ? "buddy-calls" : "dreamplanner_default";

  return import("@capacitor/local-notifications").then(function (mod) {
    var id = Date.now() % 2147483647; // Int32 range for Android
    return mod.LocalNotifications.schedule({
      notifications: [{
        id: id,
        title: notification.title || "DreamPlanner",
        body: notification.body || "",
        channelId: channelId,
        sound: isCall ? "ringtone" : "default",
        extra: data,
        smallIcon: "ic_notification",
        schedule: { at: new Date(Date.now() + 100) },
      }],
    });
  }).catch(function (err) {
    console.warn("Failed to show foreground notification:", err);
  });
}

// ── Local Notifications — Task Call Full-Screen Intent ───────

/**
 * Create a high-priority notification channel for task calls.
 * Must be called once at app startup on Android.
 */
export function createTaskCallChannel() {
  if (!isNative) return Promise.resolve();

  return import("@capacitor/local-notifications").then(function (mod) {
    return mod.LocalNotifications.createChannel({
      id: "task-calls",
      name: "Task Calls",
      description: "Incoming task reminders that appear like phone calls",
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: "ringtone",
      lights: true,
      lightColor: "#8B5CF6",
    });
  }).catch(function (err) {
    console.warn("Failed to create task-call channel:", err);
  });
}

/**
 * Register action types for task call notifications (accept / snooze).
 */
export function registerTaskCallActions() {
  if (!isNative) return Promise.resolve();

  return import("@capacitor/local-notifications").then(function (mod) {
    return mod.LocalNotifications.registerActionTypes({
      types: [{
        id: "TASK_CALL_ACTIONS",
        actions: [
          { id: "accept", title: "Start Now" },
          { id: "snooze", title: "Later" },
        ],
      }],
    });
  }).catch(function (err) {
    console.warn("Failed to register task-call actions:", err);
  });
}

/**
 * Schedule a high-priority local notification that acts like a phone call.
 * Appears over lock screen and other apps on Android.
 */
export function scheduleTaskCallNotification(task) {
  if (!isNative) return Promise.resolve();

  return import("@capacitor/local-notifications").then(function (mod) {
    return mod.LocalNotifications.schedule({
      notifications: [{
        id: task.id ? (typeof task.id === "number" ? task.id : Math.abs(hashCode(String(task.id)))) : Date.now(),
        title: "DreamPlanner — Task Due!",
        body: task.title + ' — "' + (task.dream || "Your Dream") + '"',
        channelId: "task-calls",
        ongoing: true,
        autoCancel: false,
        sound: "ringtone",
        extra: { taskId: task.id, type: "task-call", title: task.title, dream: task.dream },
        actionTypeId: "TASK_CALL_ACTIONS",
        schedule: { at: new Date(Date.now() + 500) },
      }],
    });
  }).catch(function (err) {
    console.warn("Failed to schedule task-call notification:", err);
  });
}

/**
 * Listen for local notification action (accept/snooze).
 * Returns a cleanup function.
 */
export function addLocalNotificationActionListener(callback) {
  if (!isNative) return Promise.resolve({ remove: function () {} });

  return import("@capacitor/local-notifications").then(function (mod) {
    return mod.LocalNotifications.addListener("localNotificationActionPerformed", function (action) {
      if (action.notification.extra && action.notification.extra.type === "task-call") {
        callback({
          actionId: action.actionId,
          taskId: action.notification.extra.taskId,
          title: action.notification.extra.title,
          dream: action.notification.extra.dream,
        });
      }
    });
  });
}

/**
 * Request local notification permissions (needed on Android 13+).
 */
export function requestLocalNotificationPermission() {
  if (!isNative) return Promise.resolve("denied");

  return import("@capacitor/local-notifications").then(function (mod) {
    return mod.LocalNotifications.requestPermissions().then(function (result) {
      return result.display; // "granted" | "denied"
    });
  });
}

function hashCode(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// ── Internal ─────────────────────────────────────────────────

function sendTokenToBackend(fcmToken) {
  return apiPost("/api/notifications/devices/", {
    fcmToken: fcmToken,
    platform: Capacitor.getPlatform(), // "android" or "ios"
  });
}
