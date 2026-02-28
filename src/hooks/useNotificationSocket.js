import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createWebSocket } from "../services/websocket";

/**
 * Connects to the backend notification WebSocket (ws/notifications/).
 * Automatically invalidates notification queries when new notifications arrive.
 * Uses createWebSocket for auto-reconnect, heartbeat, and token auth.
 *
 * Scalability: debounces query invalidation to prevent storms when
 * multiple notifications arrive in quick succession.
 *
 * @param {string} token - Auth token
 * @param {Object} [opts] - Options
 * @param {Function} [opts.onToast] - Called with (title, body, data) for toast display
 */
export default function useNotificationSocket(token, opts) {
  var wsRef = useRef(null);
  var debounceRef = useRef(null);
  var queryClient = useQueryClient();

  // Stable refs that won't cause useEffect re-runs
  var qcRef = useRef(queryClient);
  qcRef.current = queryClient;
  var onToastRef = useRef((opts && opts.onToast) || null);
  onToastRef.current = (opts && opts.onToast) || null;
  var onTaskReminderRef = useRef((opts && opts.onTaskReminder) || null);
  onTaskReminderRef.current = (opts && opts.onTaskReminder) || null;

  var handleMessage = useCallback(function (data) {
    // ── Notification events → invalidate queries + show toast ──
    if (
      data.type === "notification" ||
      data.type === "new_notification" ||
      data.type === "unread_count" ||
      data.type === "unread_count_update"
    ) {
      // Debounce invalidation — batch rapid notifications into one refetch
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(function () {
        qcRef.current.invalidateQueries({ queryKey: ["notifications"] });
        qcRef.current.invalidateQueries({ queryKey: ["unread"] });
        // Also refresh conversation list so new messages show immediately
        qcRef.current.invalidateQueries({ queryKey: ["conversations"] });
        debounceRef.current = null;
      }, 300);

      // Show toast for new notification
      if (data.type === "notification" && data.notification && onToastRef.current) {
        var n = data.notification;
        onToastRef.current(n.title || "New notification", n.body || n.message || "", n.data || {});
      }

      // Detect task reminder / overdue / task_due notifications → trigger task call
      if (data.type === "notification" && data.notification && onTaskReminderRef.current) {
        var nr = data.notification;
        var nrType = nr.notificationType || nr.notification_type || nr.type || "";
        var nrData = nr.data || {};
        if (nrType === "reminder" || nrType === "overdue_tasks" || nrType === "task_due" || nrType === "task_reminder") {
          onTaskReminderRef.current({
            id: nrData.taskId || nrData.task_id || nrData.goalId || nrData.goal_id || nr.id || "",
            title: nr.title || nrData.title || "Task Due",
            dream: nrData.dreamTitle || nrData.dream_title || nrData.dream || "",
            priority: nrData.priority || "medium",
            category: nrData.category || "personal",
            duration: nrData.duration || "",
          });
        }
      }
    }

    // ── notification_message events (call rejected, etc.) ──
    if (data.type === "notification_message" && data.data) {
      var d = data.data;
      if (d.type === "call_rejected") {
        if (onToastRef.current) {
          onToastRef.current(
            (d.callee_name || d.calleeName || "Your buddy") + " declined your call",
            "",
            d
          );
        }
        // Dispatch instant call status event for VoiceCallScreen/VideoCallScreen
        window.dispatchEvent(new CustomEvent("dp-call-status", {
          detail: { callId: d.call_id || d.callId, status: "rejected" },
        }));
      }
      if (d.type === "missed_call") {
        if (onToastRef.current) {
          onToastRef.current("Missed call", d.caller_name || d.callerName || "", d);
        }
        window.dispatchEvent(new CustomEvent("dp-call-status", {
          detail: { callId: d.call_id || d.callId, status: "missed" },
        }));
      }
      // Refresh notifications + conversations
      qcRef.current.invalidateQueries({ queryKey: ["notifications"] });
      qcRef.current.invalidateQueries({ queryKey: ["conversations"] });
      qcRef.current.invalidateQueries({ queryKey: ["call-history"] });
    }

    // ── Incoming call dispatch ──
    if (data.type === "incoming_call" || (data.data && data.data.type === "incoming_call")) {
      var callData = data.data || data;
      window.dispatchEvent(new CustomEvent("dp-incoming-call", {
        detail: {
          callId: callData.callId || callData.call_id,
          callerName: callData.callerName || callData.caller_name || "Unknown",
          callType: callData.callType || callData.call_type || "voice",
          callerId: callData.callerId || callData.caller_id,
        },
      }));
    }
  }, []);

  useEffect(function () {
    if (!token) return;

    var ws = createWebSocket("/ws/notifications/", {
      token: token,
      onMessage: handleMessage,
    });
    wsRef.current = ws;

    return function () {
      ws.close();
      wsRef.current = null;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [token, handleMessage]);

  return wsRef;
}
