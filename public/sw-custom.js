/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Custom Service Worker (imported by Workbox SW)
 *
 * Handles notification click events to bring the PWA to the
 * foreground like a phone call when a task is due.
 * ═══════════════════════════════════════════════════════════════════ */

/* ═══ Skip waiting — allow new SW to activate on demand ═══ */
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ═══ Push event — show system notification ═══ */
self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(
    self.registration.showNotification(data.title || "DreamPlanner", {
      body: data.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: data.tag || "dp-notification",
      data: { url: data.action_url || data.url || "/" },
      vibrate: [200, 100, 200],
      actions: data.actions || [],
    })
  );
});

/* ═══ Notification click — focus or open app ═══ */
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var action = event.action; // "accept" or "snooze" from notification buttons

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // If the app is already open, focus it and notify
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "TASK_CALL_FOCUS", action: action || "open" });
          return;
        }
      }
      // Otherwise, open the app
      if (clients.openWindow) {
        return clients.openWindow("./");
      }
    })
  );
});
