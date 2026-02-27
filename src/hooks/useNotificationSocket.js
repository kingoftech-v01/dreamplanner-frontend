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

  var handleMessage = useCallback(function (data) {
    // ── Notification events → invalidate queries + show toast ──
    if (
      data.type === "notification" ||
      data.type === "new_notification" ||
      data.type === "unread_count"
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
    }

    // ── notification_message events (call rejected, etc.) ──
    if (data.type === "notification_message" && data.data) {
      var d = data.data;
      if (d.type === "call_rejected" && onToastRef.current) {
        onToastRef.current(
          (d.callee_name || d.calleeName || "Your buddy") + " declined your call",
          "",
          d
        );
      }
      if (d.type === "missed_call" && onToastRef.current) {
        onToastRef.current("Missed call", d.caller_name || d.callerName || "", d);
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
