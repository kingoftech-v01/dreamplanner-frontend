/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Custom Service Worker (imported by Workbox SW)
 *
 * Handles notification click events to bring the PWA to the
 * foreground like a phone call when a task is due.
 * ═══════════════════════════════════════════════════════════════════ */

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
        return clients.openWindow("/");
      }
    })
  );
});
