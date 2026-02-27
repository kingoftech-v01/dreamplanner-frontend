/**
 * WebSocket manager with auto-reconnect, heartbeat, and token auth.
 *
 * Scalability features:
 * - Exponential backoff with jitter (prevents thundering herd)
 * - Heartbeat with pong timeout (detects zombie connections)
 * - Proper cleanup on close
 */

import { getToken } from "./api";

var WS_BASE = import.meta.env.VITE_WS_BASE || "";

/**
 * createWebSocket(path, options)
 *  path    – e.g. "/ws/conversations/123/"
 *  options – { onMessage, onOpen, onClose, onError, token }
 *
 * Returns { send, close, getState }
 */
export function createWebSocket(path, options) {
  var opts = options || {};
  var token = opts.token || getToken() || "";
  var onMessage = opts.onMessage || function () {};
  var onOpen = opts.onOpen || function () {};
  var onClose = opts.onClose || function () {};
  var onError = opts.onError || function () {};

  var ws = null;
  var reconnectAttempts = 0;
  var maxReconnect = 10;
  var reconnectTimer = null;
  var heartbeatTimer = null;
  var pongTimer = null;
  var closed = false;

  function getUrl() {
    var base = WS_BASE;
    // In dev with Vite proxy, use relative ws:// on same host
    if (!base) {
      var proto = location.protocol === "https:" ? "wss:" : "ws:";
      base = proto + "//" + location.host;
    }
    return base + path;
  }

  function connect() {
    if (closed) return;
    try {
      ws = new WebSocket(getUrl());
    } catch (e) {
      onError(e);
      scheduleReconnect();
      return;
    }

    ws.onopen = function () {
      reconnectAttempts = 0;
      // Authenticate via first message instead of URL query param
      // (tokens in URLs leak into server logs, browser history, and proxies)
      if (token) {
        ws.send(JSON.stringify({ type: "authenticate", token: token }));
      }
      startHeartbeat();
      onOpen();
    };

    ws.onmessage = function (event) {
      var data;
      try {
        data = JSON.parse(event.data);
      } catch (_) {
        data = event.data;
      }
      // Track pong responses for heartbeat timeout
      if (data && data.type === "pong") {
        clearPongTimeout();
        return;
      }
      onMessage(data);
    };

    ws.onclose = function (event) {
      stopHeartbeat();
      onClose(event);
      // 4001 = token expired / invalid
      if (event.code === 4001) {
        // Refresh token from cache in case it was rotated
        token = getToken() || "";
      }
      if (!closed) scheduleReconnect();
    };

    ws.onerror = function (event) {
      onError(event);
    };
  }

  function scheduleReconnect() {
    if (closed || reconnectAttempts >= maxReconnect) return;
    var delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    // Add random jitter (0-3s) to prevent thundering herd on reconnect storms
    delay += Math.floor(Math.random() * 3000);
    reconnectAttempts++;
    reconnectTimer = setTimeout(connect, delay);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(function () {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
        // Start pong timeout — if no pong in 10s, connection is dead
        clearPongTimeout();
        pongTimer = setTimeout(function () {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(4000, "Pong timeout");
          }
        }, 10000);
      }
    }, 30000);
  }

  function clearPongTimeout() {
    if (pongTimer) {
      clearTimeout(pongTimer);
      pongTimer = null;
    }
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    clearPongTimeout();
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof data === "string" ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }

  function close() {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    stopHeartbeat();
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
  }

  function getState() {
    if (!ws) return WebSocket.CLOSED;
    return ws.readyState;
  }

  // Listen for app resume (native) to reconnect
  function handleAppResume() {
    if (!closed && (!ws || ws.readyState !== WebSocket.OPEN)) {
      reconnectAttempts = 0;
      connect();
    }
  }
  window.addEventListener("dp-app-resume", handleAppResume);

  var origClose = close;
  close = function () {
    window.removeEventListener("dp-app-resume", handleAppResume);
    origClose();
  };

  // Start immediately
  connect();

  return { send: send, close: close, getState: getState };
}
