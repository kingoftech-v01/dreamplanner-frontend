// ─── DreamPlanner API Client ────────────────────────────────────────
// Enhanced fetch wrapper with auth, CORS, case transforms, and error handling.

import { snakeToCamel, camelToSnake } from "./transforms";
import { Capacitor } from "@capacitor/core";
import { getUserMessage } from "../utils/errorMessages";

var API_BASE = import.meta.env.VITE_API_BASE || "";

// ─── Token helpers ──────────────────────────────────────────────────

var _tokenCache = localStorage.getItem("dp-token") || "";

/**
 * Initialize token from Capacitor Preferences (native) at startup.
 * Must be called before rendering the app.
 */
export function initToken() {
  if (!Capacitor.isNativePlatform()) {
    _tokenCache = localStorage.getItem("dp-token") || "";
    return Promise.resolve(_tokenCache);
  }
  return import("@capacitor/preferences").then(function (mod) {
    return mod.Preferences.get({ key: "dp-token" });
  }).then(function (result) {
    _tokenCache = result.value || "";
    // Keep localStorage in sync as fallback
    if (_tokenCache) localStorage.setItem("dp-token", _tokenCache);
    return _tokenCache;
  }).catch(function () {
    _tokenCache = localStorage.getItem("dp-token") || "";
    return _tokenCache;
  });
}

export function getToken() {
  return _tokenCache;
}

export function setToken(token) {
  _tokenCache = token || "";
  if (token) localStorage.setItem("dp-token", token);
  else localStorage.removeItem("dp-token");
  if (Capacitor.isNativePlatform()) {
    import("@capacitor/preferences").then(function (mod) {
      if (token) {
        mod.Preferences.set({ key: "dp-token", value: token });
      } else {
        mod.Preferences.remove({ key: "dp-token" });
      }
    }).catch(function () {});
  }
}

export function clearAuth() {
  _tokenCache = "";
  // Clear all sensitive localStorage items
  localStorage.removeItem("dp-token");
  localStorage.removeItem("dp-splash-shown");
  if (Capacitor.isNativePlatform()) {
    import("@capacitor/preferences").then(function (mod) {
      mod.Preferences.remove({ key: "dp-token" });
    }).catch(function () {});
  }
}

// ─── CSRF (for same-origin fallback) ────────────────────────────────

function getCsrfToken() {
  var match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

// ─── Core request function ──────────────────────────────────────────

async function request(url, options) {
  if (!options) options = {};
  var method = (options.method || "GET").toUpperCase();
  var headers = Object.assign({}, options.headers || {});
  var isFormData = options.body instanceof FormData;

  // Auth header
  var token = getToken();
  if (token) {
    headers["Authorization"] = "Token " + token;
  }

  // CSRF for non-GET
  if (method !== "GET" && method !== "HEAD") {
    var csrf = getCsrfToken();
    if (csrf) headers["X-CSRFToken"] = csrf;
  }

  // JSON body — auto-serialize and convert camelCase → snake_case
  if (options.body && typeof options.body === "object" && !isFormData) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(camelToSnake(options.body));
  }

  // Build full URL
  var fullUrl = url.startsWith("http") ? url : API_BASE + url;

  var response;
  try {
    response = await fetch(fullUrl, {
      credentials: API_BASE ? "include" : "same-origin",
      ...options,
      method: method,
      headers: headers,
    });
  } catch (fetchError) {
    // AbortError — caller explicitly cancelled, don't enqueue
    if (fetchError && fetchError.name === "AbortError") {
      throw fetchError;
    }
    // Network error — enqueue mutation if it's a write operation
    // Skip enqueue if caller provided a signal (long-running requests like plan generation)
    if (method !== "GET" && method !== "HEAD") {
      if (options.signal) {
        // Caller manages this request — don't enqueue, just surface the error
        var longRunError = new Error("The server took too long to respond. Please try again.");
        longRunError.status = 0;
        longRunError.offline = true;
        throw longRunError;
      }
      enqueueOfflineMutation(url, { method: method, body: options.body ? options.body : null });
      var offlineError = new Error("You're offline. Your change has been saved and will sync when you reconnect.");
      offlineError.status = 0;
      offlineError.offline = true;
      throw offlineError;
    }
    throw fetchError;
  }

  // ─── Handle blob responses (PDF, file downloads) ────────────
  if (options.responseType === "blob" && response.ok) {
    return response.blob();
  }

  // ─── Error handling ─────────────────────────────────────────
  if (!response.ok) {
    var errorBody = null;
    try { errorBody = await response.json(); } catch (e) { /* ignore */ }

    var error = new Error(
      errorBody?.detail ||
      errorBody?.message ||
      errorBody?.non_field_errors?.[0] ||
      "Request failed: " + response.status
    );
    error.status = response.status;
    error.body = errorBody ? snakeToCamel(errorBody) : null;

    // Field-level errors (DRF format: { field: ["error"] })
    if (errorBody && typeof errorBody === "object") {
      var fieldErrors = {};
      for (var key in errorBody) {
        if (Array.isArray(errorBody[key])) {
          fieldErrors[key] = errorBody[key][0];
        }
      }
      if (Object.keys(fieldErrors).length > 0) {
        error.fieldErrors = snakeToCamel(fieldErrors);
      }
    }

    // User-friendly message (safe to display in UI)
    error.userMessage = getUserMessage(error);

    // 401 → clear auth (caller handles redirect)
    if (response.status === 401) {
      clearAuth();
    }

    throw error;
  }

  // ─── Parse response ─────────────────────────────────────────
  var contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    var data = await response.json();
    return snakeToCamel(data);
  }

  // 204 No Content
  if (response.status === 204) return null;

  return response.text();
}

// ─── Convenience methods ────────────────────────────────────────────

export function apiGet(url, options) {
  return request(url, { ...options, method: "GET" });
}

export function apiPost(url, body, options) {
  return request(url, { ...options, method: "POST", body: body });
}

export function apiPut(url, body, options) {
  return request(url, { ...options, method: "PUT", body: body });
}

export function apiPatch(url, body, options) {
  return request(url, { ...options, method: "PATCH", body: body });
}

export function apiDelete(url, options) {
  return request(url, { ...options, method: "DELETE" });
}

export function apiUpload(url, formData, options) {
  return request(url, {
    ...options,
    method: "POST",
    body: formData,
    // No Content-Type header — browser sets multipart/form-data with boundary
  });
}

// ── Offline Mutation Queue ──────────────────────────────────────
var QUEUE_KEY = "dp-offline-queue";

function getQueue() {
  try {
    var raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueueCount() {
  return getQueue().length;
}

export function enqueueOfflineMutation(url, options) {
  var queue = getQueue();
  queue.push({
    url: url,
    method: options.method || "POST",
    body: options.body || null,
    timestamp: Date.now(),
  });
  saveQueue(queue);
  window.dispatchEvent(new CustomEvent("dp-offline-queue-change", { detail: { count: queue.length } }));
}

export async function flushOfflineQueue() {
  var queue = getQueue();
  if (queue.length === 0) return 0;

  var flushed = 0;
  var failed = [];

  for (var i = 0; i < queue.length; i++) {
    var item = queue[i];
    try {
      await request(item.url, {
        method: item.method,
        body: item.body ? JSON.parse(item.body) : undefined,
      });
      flushed++;
    } catch (e) {
      if (!navigator.onLine) {
        failed.push(item);
        // Still offline, keep remaining items
        failed = failed.concat(queue.slice(i + 1));
        break;
      }
      // Online but request failed (server error), skip this item
      flushed++;
    }
  }

  saveQueue(failed);
  window.dispatchEvent(new CustomEvent("dp-offline-queue-change", { detail: { count: failed.length } }));
  return flushed;
}
