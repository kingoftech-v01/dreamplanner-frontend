import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { hapticVibrate, hapticStop, acquireWakeLock as nativeAcquireWakeLock, releaseWakeLock as nativeReleaseWakeLock, isNative } from "../services/native";
import { checkNativePushPermission, scheduleTaskCallNotification, addLocalNotificationActionListener } from "../services/nativeNotifications";

var TaskCallContext = createContext(null);

export function TaskCallProvider({ children }) {
  var [isOpen, setIsOpen] = useState(false);
  var [taskData, setTaskData] = useState(null);
  var [notifPermission, setNotifPermission] = useState("default");
  var autoCloseRef = useRef(null);
  var pendingTaskRef = useRef(null);
  var wakeLockRef = useRef(null);

  // ─── Track notification permission state ──────────────────────
  useEffect(function () {
    if (isNative) {
      checkNativePushPermission().then(function (perm) {
        setNotifPermission(perm === "granted" ? "granted" : perm);
      });
    } else if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // ─── Request notification permission ──────────────────────────
  var requestNotificationPermission = useCallback(function () {
    if (!("Notification" in window)) return Promise.resolve("denied");
    if (Notification.permission === "granted") {
      setNotifPermission("granted");
      return Promise.resolve("granted");
    }
    if (Notification.permission === "denied") {
      setNotifPermission("denied");
      return Promise.resolve("denied");
    }
    return Notification.requestPermission().then(function (perm) {
      setNotifPermission(perm);
      return perm;
    });
  }, []);

  // ─── Show system notification (when app is hidden) ────────────
  var showSystemNotification = useCallback(function (task) {
    // On native platforms, use high-priority local notification (full-screen intent)
    if (isNative) {
      scheduleTaskCallNotification(task);
      return;
    }

    // Web fallback: Service Worker notification or basic Notification API
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(function (registration) {
        registration.showNotification("DreamPlanner — Task Due!", {
          body: task.title + " — from \"" + task.dream + "\"",
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          tag: "task-call-" + task.id,
          renotify: true,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          actions: [
            { action: "accept", title: "Start Now" },
            { action: "snooze", title: "Later" },
          ],
          data: { taskId: task.id },
        });
      });
    } else if ("Notification" in window && Notification.permission === "granted") {
      var notif = new Notification("DreamPlanner — Task Due!", {
        body: task.title + " — from \"" + task.dream + "\"",
        icon: "/favicon.svg",
        tag: "task-call-" + task.id,
        requireInteraction: true,
      });
      notif.onclick = function () {
        window.focus();
        notif.close();
      };
    }
  }, []);

  // ─── Listen for SW message (notification click brings app forward) ──
  useEffect(function () {
    if (!("serviceWorker" in navigator)) return;
    function handleSWMessage(event) {
      if (event.data && event.data.type === "TASK_CALL_FOCUS") {
        // User tapped the notification — show pending task immediately
        if (pendingTaskRef.current) {
          var task = pendingTaskRef.current;
          pendingTaskRef.current = null;
          setTaskData(task);
          setIsOpen(true);
        }
      }
    }
    navigator.serviceWorker.addEventListener("message", handleSWMessage);
    return function () {
      navigator.serviceWorker.removeEventListener("message", handleSWMessage);
    };
  }, []);

  // ─── Native local notification action listener ──────────────
  useEffect(function () {
    if (!isNative) return;

    var listenerPromise = addLocalNotificationActionListener(function (action) {
      if (action.actionId === "accept") {
        // User tapped "Start Now" — show the task call overlay
        var taskInfo = { id: action.taskId, title: action.title, dream: action.dream };
        pendingTaskRef.current = null;
        setTaskData(taskInfo);
        setIsOpen(true);
        hapticVibrate([200, 100, 200, 100, 200]);
      }
      // "snooze" = dismiss, task will be rescheduled by backend
    });

    return function () {
      listenerPromise.then(function (listener) {
        if (listener && listener.remove) listener.remove();
      });
    };
  }, []);

  // ─── Visibility change: show pending task when user returns ───
  useEffect(function () {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && pendingTaskRef.current) {
        var task = pendingTaskRef.current;
        pendingTaskRef.current = null;
        setTaskData(task);
        setIsOpen(true);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return function () {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ─── Wake Lock: keep screen on during active task ─────────────
  var acquireWakeLock = useCallback(function () {
    nativeAcquireWakeLock().then(function (lock) {
      wakeLockRef.current = lock;
    }).catch(function () {});
  }, []);

  var releaseWakeLock = useCallback(function () {
    nativeReleaseWakeLock(wakeLockRef.current).catch(function () {});
    wakeLockRef.current = null;
  }, []);

  // ─── Core trigger function ────────────────────────────────────
  var triggerTaskCall = useCallback(function (data) {
    if (document.visibilityState === "hidden") {
      pendingTaskRef.current = data;
      if (notifPermission === "granted") {
        showSystemNotification(data);
      }
    } else {
      pendingTaskRef.current = null;
      setTaskData(data);
      setIsOpen(true);
      // Vibrate device for call-like feel
      hapticVibrate([200, 100, 200, 100, 200]);
    }
  }, [notifPermission, showSystemNotification]);

  var dismissTaskCall = useCallback(function () {
    if (autoCloseRef.current) { clearTimeout(autoCloseRef.current); autoCloseRef.current = null; }
    // Stop vibration
    hapticStop();
    // Release wake lock
    releaseWakeLock();
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }
    setIsOpen(false);
    setTimeout(function () { setTaskData(null); }, 400);
  }, [releaseWakeLock]);

  var scheduleAutoClose = useCallback(function (delayMs) {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    autoCloseRef.current = setTimeout(dismissTaskCall, delayMs || 2500);
  }, [dismissTaskCall]);

  return (
    <TaskCallContext.Provider value={{
      isOpen, taskData, triggerTaskCall, dismissTaskCall, scheduleAutoClose,
      notifPermission, requestNotificationPermission,
      acquireWakeLock, releaseWakeLock,
    }}>
      {children}
    </TaskCallContext.Provider>
  );
}

export function useTaskCall() {
  var ctx = useContext(TaskCallContext);
  if (!ctx) throw new Error("useTaskCall must be used within TaskCallProvider");
  return ctx;
}
