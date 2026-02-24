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
 */
export default function useNotificationSocket(token) {
  var wsRef = useRef(null);
  var debounceRef = useRef(null);
  var queryClient = useQueryClient();

  // Stable callback that won't cause useEffect re-runs
  var qcRef = useRef(queryClient);
  qcRef.current = queryClient;

  var handleMessage = useCallback(function (data) {
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

      // Incoming call dispatch — surface calls from push notifications
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
