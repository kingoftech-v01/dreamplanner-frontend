// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Native Push Notifications (FCM / APNS)
//
// Handles Capacitor PushNotifications plugin for native platforms.
// Web push is handled separately in pushNotifications.js.
// ═══════════════════════════════════════════════════════════════

import { Capacitor } from "@capacitor/core";
import { apiPost } from "./api";
import { NOTIFICATIONS } from "./endpoints";

var isNative = Capacitor.isNativePlatform();

/**
 * Register for native push notifications.
 * Requests permission, registers with FCM/APNS, and sends the
 * device token to the backend.
 *
 * On native (Android/iOS): uses Capacitor PushNotifications plugin.
 * On web: returns null (web push is handled by pushNotifications.js via VAPID).
 */
export function registerNativePush() {
  if (isNative) {
    return capacitorPushRegister();
  }

  // Web push is handled separately by pushNotifications.js
  return Promise.resolve(null);
}

function capacitorPushRegister() {
  return import("@capacitor/push-notifications").then(function (mod) {
    var PushNotifications = mod.PushNotifications;
    PushNotifications.removeAllListeners();

    return new Promise(function (resolve) {
      var resolved = false;

      PushNotifications.addListener("registration", function (token) {
        console.log("[Push] Capacitor token received");
        if (resolved) return;
        resolved = true;
        sendTokenToBackend(token.value).then(function () {
          resolve(token.value);
        }).catch(function () {
          resolve(token.value);
        });
      });

      PushNotifications.addListener("registrationError", function (err) {
        console.warn("[Push] Capacitor registrationError:", JSON.stringify(err));
        if (!resolved) { resolved = true; resolve(null); }
      });

      // Short timeout — fallback to Firebase JS SDK
      setTimeout(function () {
        if (!resolved) { resolved = true; resolve(null); }
      }, 8000);

      PushNotifications.requestPermissions().then(function (result) {
        console.log("[Push] Capacitor permission:", result.receive);
        if (result.receive !== "granted") {
          if (!resolved) { resolved = true; resolve(null); }
          return;
        }
        return PushNotifications.register();
      }).catch(function (err) {
        console.warn("[Push] Capacitor error:", err);
        if (!resolved) { resolved = true; resolve(null); }
      });
    });
  }).catch(function (err) {
    console.warn("[Push] Capacitor import failed:", err);
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

// ── Local Notifications — Incoming Call Full-Screen Intent ────

/**
 * Schedule a high-priority local notification for an incoming buddy call.
 * Uses the buddy-calls channel (importance 5, ringtone) so Android shows
 * it as a full-screen intent over other apps and the lock screen.
 */
export function scheduleIncomingCallNotification(callData) {
  if (!isNative) return Promise.resolve();

  return import("@capacitor/local-notifications").then(function (mod) {
    var id = callData.callId
      ? Math.abs(hashCode(String(callData.callId)))
      : Date.now() % 2147483647;

    return mod.LocalNotifications.schedule({
      notifications: [{
        id: id,
        title: "Incoming " + (callData.callType === "video" ? "Video" : "Voice") + " Call",
        body: (callData.callerName || "Someone") + " is calling you",
        channelId: "buddy-calls",
        ongoing: true,
        autoCancel: false,
        sound: "ringtone",
        smallIcon: "ic_notification",
        extra: {
          type: "incoming-call",
          callId: callData.callId,
          callerId: callData.callerId,
          callerName: callData.callerName,
          callType: callData.callType,
        },
        actionTypeId: "BUDDY_CALL_ACTIONS",
        schedule: { at: new Date(Date.now() + 500) },
      }],
    });
  }).catch(function (err) {
    console.warn("Failed to schedule incoming call notification:", err);
  });
}

/**
 * Register action types for incoming call notifications (accept / decline).
 */
export function registerBuddyCallActions() {
  if (!isNative) return Promise.resolve();

  return import("@capacitor/local-notifications").then(function (mod) {
    return mod.LocalNotifications.registerActionTypes({
      types: [{
        id: "BUDDY_CALL_ACTIONS",
        actions: [
          { id: "accept-call", title: "Accept" },
          { id: "reject-call", title: "Decline" },
        ],
      }],
    });
  }).catch(function (err) {
    console.warn("Failed to register buddy-call actions:", err);
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
 * Listen for local notification actions (task-call accept/snooze, incoming-call accept/decline).
 * @param {function} taskCallback - Called for task-call actions
 * @param {function} callCallback - Called for incoming-call actions
 * Returns a cleanup function.
 */
export function addLocalNotificationActionListener(taskCallback, callCallback) {
  if (!isNative) return Promise.resolve({ remove: function () {} });

  return import("@capacitor/local-notifications").then(function (mod) {
    return mod.LocalNotifications.addListener("localNotificationActionPerformed", function (action) {
      var extra = (action.notification && action.notification.extra) || {};

      if (extra.type === "task-call" && taskCallback) {
        taskCallback({
          actionId: action.actionId,
          taskId: extra.taskId,
          title: extra.title,
          dream: extra.dream,
        });
      }

      if (extra.type === "incoming-call" && callCallback) {
        callCallback({
          actionId: action.actionId,
          callId: extra.callId,
          callerId: extra.callerId,
          callerName: extra.callerName,
          callType: extra.callType,
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
  return apiPost(NOTIFICATIONS.DEVICES, {
    fcm_token: fcmToken,
    platform: Capacitor.getPlatform(), // "android" or "ios"
  });
}
