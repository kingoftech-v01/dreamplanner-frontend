// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Task Scheduler Service
//
// Schedules local Android notifications at exact task times so the
// phone "rings" when a dream task is due, even if the app is closed.
// Uses the "task-calls" channel (importance 5, full-screen intent).
// ═══════════════════════════════════════════════════════════════

import { Capacitor } from "@capacitor/core";

var isNative = Capacitor.isNativePlatform();

/**
 * Schedule local notifications for all undone tasks with a future scheduled time.
 * Called after login, on app resume, and when calendar data changes.
 *
 * @param {Array} tasks - Array of { id, title, dream, startTime, date, done/completed, priority, category, durationMins }
 */
export function scheduleTaskNotifications(tasks) {
  if (!isNative || !tasks || tasks.length === 0) return Promise.resolve();

  return import("@capacitor/local-notifications").then(function (mod) {
    var LocalNotifications = mod.LocalNotifications;

    // Cancel existing task notifications to avoid duplicates
    return cancelScheduledTaskNotifications().then(function () {
      var notifications = [];
      var now = new Date();

      for (var i = 0; i < tasks.length; i++) {
        var task = tasks[i];
        // Skip completed tasks
        if (task.done || task.completed || task.status === "completed" || task.status === "cancelled") continue;

        var scheduledAt = parseTaskDateTime(task);
        // Skip past tasks or tasks without a valid time
        if (!scheduledAt || scheduledAt <= now) continue;

        var notifId = hashTaskId(task.id);

        notifications.push({
          id: notifId,
          title: "DreamPlanner \u2014 Task Due!",
          body: (task.title || "Task") + " \u2014 \"" + (task.dream || "Your Dream") + "\"",
          channelId: "task-calls",
          ongoing: true,
          autoCancel: false,
          sound: "ringtone",
          smallIcon: "ic_notification",
          extra: {
            taskId: String(task.id),
            type: "task-call",
            title: task.title || "Task",
            dream: task.dream || "",
            priority: task.priority || "medium",
            category: task.category || "personal",
            duration: task.durationMins ? task.durationMins + " min" : "",
          },
          actionTypeId: "TASK_CALL_ACTIONS",
          schedule: { at: scheduledAt, allowWhileIdle: true },
        });
      }

      if (notifications.length === 0) return;

      return LocalNotifications.schedule({ notifications: notifications });
    });
  }).catch(function (err) {
    console.warn("scheduleTaskNotifications failed:", err);
  });
}

/**
 * Cancel all previously scheduled task-call local notifications.
 */
export function cancelScheduledTaskNotifications() {
  if (!isNative) return Promise.resolve();

  return import("@capacitor/local-notifications").then(function (mod) {
    return mod.LocalNotifications.getPending().then(function (result) {
      var ids = [];
      var notifs = result.notifications || [];
      for (var i = 0; i < notifs.length; i++) {
        var extra = notifs[i].extra || {};
        if (extra.type === "task-call") {
          ids.push({ id: notifs[i].id });
        }
      }
      if (ids.length > 0) {
        return mod.LocalNotifications.cancel({ notifications: ids });
      }
    });
  }).catch(function () {});
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Parse task date/time fields into a Date object.
 * Handles various backend field naming conventions.
 */
function parseTaskDateTime(task) {
  // Try to get date string: "2026-02-27"
  var dateStr = task.date || task.scheduledDate || task.scheduled_date || "";
  // Try to get time string: "14:30" or "2:30 PM" or full ISO datetime
  var timeStr = task.time || task.startTime || task.start_time || task.scheduledTime || task.scheduled_time || "";

  // If startTime is a full ISO datetime, parse directly
  if (timeStr && timeStr.indexOf("T") !== -1) {
    var d = new Date(timeStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // If we have a date with embedded time (ISO format)
  if (dateStr && dateStr.indexOf("T") !== -1) {
    var d2 = new Date(dateStr);
    return isNaN(d2.getTime()) ? null : d2;
  }

  if (!dateStr || !timeStr) return null;

  // Parse "HH:MM" or "H:MM AM/PM"
  var hours = 0;
  var minutes = 0;
  var upper = timeStr.toUpperCase().trim();

  if (upper.indexOf("AM") !== -1 || upper.indexOf("PM") !== -1) {
    // 12-hour format: "2:30 PM"
    var isPM = upper.indexOf("PM") !== -1;
    var cleaned = upper.replace(/[AP]M/g, "").trim();
    var parts12 = cleaned.split(":");
    hours = parseInt(parts12[0], 10) || 0;
    minutes = parseInt(parts12[1], 10) || 0;
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
  } else {
    // 24-hour format: "14:30"
    var parts24 = timeStr.split(":");
    hours = parseInt(parts24[0], 10) || 0;
    minutes = parseInt(parts24[1], 10) || 0;
  }

  // Combine date + time
  var dateParts = dateStr.split("-");
  if (dateParts.length < 3) return null;

  var result = new Date(
    parseInt(dateParts[0], 10),
    parseInt(dateParts[1], 10) - 1,
    parseInt(dateParts[2], 10),
    hours,
    minutes,
    0,
    0
  );

  return isNaN(result.getTime()) ? null : result;
}

/**
 * Hash a task ID to a stable Int32 for Android notification ID.
 */
function hashTaskId(id) {
  var str = String(id);
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 2147483647 || 1;
}
