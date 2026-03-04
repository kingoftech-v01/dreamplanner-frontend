// ─── DreamPlanner API Client ────────────────────────────────────────
// Enhanced fetch wrapper with JWT auth, CORS, case transforms, and error handling.
// Access token: memory-only (web) / Capacitor Preferences (native)
// Refresh token: httpOnly cookie (web) / Capacitor Preferences (native)

import { snakeToCamel, camelToSnake } from "./transforms";
import { Capacitor } from "@capacitor/core";
import { getUserMessage } from "../utils/errorMessages";

var API_BASE = import.meta.env.VITE_API_BASE || "";
var REFRESH_URL = "/api/auth/token/refresh/";
var _isNative = Capacitor.isNativePlatform();

// ─── Token helpers (JWT) ─────────────────────────────────────────

var _accessToken = "";  // Memory only on web — never persisted to localStorage

/**
 * Initialize token from Capacitor Preferences (native) at startup.
 * On web, access token lives only in memory — callers should use
 * refreshAccessToken() to obtain a new one via the httpOnly cookie.
 */
export function initToken() {
  if (!_isNative) {
    // Web: access token is memory-only. Check for legacy dp-token to migrate.
    var legacy = localStorage.getItem("dp-token");
    if (legacy) {
      _accessToken = legacy;
      localStorage.removeItem("dp-token");  // Clean up legacy storage
    }
    return Promise.resolve(_accessToken);
  }
  // Native: load from Capacitor Preferences (secure storage)
  return import("@capacitor/preferences").then(function (mod) {
    return mod.Preferences.get({ key: "dp-access-token" });
  }).then(function (result) {
    _accessToken = result.value || "";
    // Migrate legacy key if present
    if (!_accessToken) {
      return import("@capacitor/preferences").then(function (mod) {
        return mod.Preferences.get({ key: "dp-token" });
      }).then(function (legacyResult) {
        if (legacyResult.value) {
          _accessToken = legacyResult.value;
          return import("@capacitor/preferences").then(function (mod) {
            mod.Preferences.remove({ key: "dp-token" });
          });
        }
      });
    }
  }).then(function () {
    return _accessToken;
  }).catch(function () {
    _accessToken = "";
    return "";
  });
}

export function getToken() {
  return _accessToken;
}

/** Exported for WebSocket auth — returns the current in-memory access token */
export function getAccessTokenForWS() {
  return _accessToken;
}

/**
 * Store JWT tokens after login/register/refresh.
 * @param {string} access - JWT access token (stored in memory on web)
 * @param {string} [refresh] - JWT refresh token (native only — web uses httpOnly cookie)
 */
export function setToken(access, refresh) {
  _accessToken = access || "";
  if (_isNative) {
    import("@capacitor/preferences").then(function (mod) {
      if (access) mod.Preferences.set({ key: "dp-access-token", value: access });
      else mod.Preferences.remove({ key: "dp-access-token" });
      if (refresh) mod.Preferences.set({ key: "dp-refresh-token", value: refresh });
      else if (refresh === null) mod.Preferences.remove({ key: "dp-refresh-token" });
    }).catch(function () {});
  }
  // Web: refresh token is in httpOnly cookie — no JS action needed
}

export function clearAuth() {
  _accessToken = "";
  // Clean up localStorage (legacy + non-sensitive app data)
  localStorage.removeItem("dp-token");
  localStorage.removeItem("dp-splash-shown");
  localStorage.removeItem("dp-offline-queue");
  localStorage.removeItem("dp-recent-searches");
  localStorage.removeItem("dp-dream-draft");
  if (_isNative) {
    import("@capacitor/preferences").then(function (mod) {
      mod.Preferences.remove({ key: "dp-access-token" });
      mod.Preferences.remove({ key: "dp-refresh-token" });
      mod.Preferences.remove({ key: "dp-token" });  // legacy
    }).catch(function () {});
  }
}

// ─── Silent Token Refresh ────────────────────────────────────────

var _isRefreshing = false;
var _refreshQueue = [];  // Callbacks waiting for refresh to complete

/**
 * Refresh the access token using the refresh token.
 * Web: refresh cookie is sent automatically by the browser.
 * Native: refresh token is read from Capacitor Preferences and sent in body.
 */
export async function refreshAccessToken() {
  if (_isNative) {
    var mod = await import("@capacitor/preferences");
    var result = await mod.Preferences.get({ key: "dp-refresh-token" });
    var refreshToken = result.value;
    if (!refreshToken) throw new Error("No refresh token");
    var resp = await fetch(API_BASE + REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!resp.ok) throw new Error("Refresh failed");
    var data = await resp.json();
    setToken(data.access, data.refresh || refreshToken);
    return data.access;
  }
  // Web: httpOnly cookie is sent automatically with credentials: "include"
  var resp = await fetch(API_BASE + REFRESH_URL, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!resp.ok) throw new Error("Refresh failed");
  var data = await resp.json();
  _accessToken = data.access;
  return data.access;
}

/**
 * Coordinate refresh across concurrent 401 responses.
 * Only one refresh request is made at a time; others wait for the result.
 */
function silentRefresh() {
  if (_isRefreshing) {
    return new Promise(function (resolve, reject) {
      _refreshQueue.push({ resolve: resolve, reject: reject });
    });
  }
  _isRefreshing = true;
  return refreshAccessToken().then(function (newToken) {
    _isRefreshing = false;
    for (var i = 0; i < _refreshQueue.length; i++) {
      _refreshQueue[i].resolve(newToken);
    }
    _refreshQueue = [];
    return newToken;
  }).catch(function (err) {
    _isRefreshing = false;
    for (var i = 0; i < _refreshQueue.length; i++) {
      _refreshQueue[i].reject(err);
    }
    _refreshQueue = [];
    throw err;
  });
}

// ─── CSRF (for same-origin fallback) ────────────────────────────

function getCsrfToken() {
  var match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

// ─── Core request function ──────────────────────────────────────

async function request(url, options) {
  if (!options) options = {};
  var method = (options.method || "GET").toUpperCase();
  var headers = Object.assign({}, options.headers || {});
  var isFormData = options.body instanceof FormData;
  var _skipRefresh = options._skipRefresh || false;

  // Auth header
  var token = getToken();
  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  // Native platform header — tells backend to return refresh token in body
  if (_isNative) {
    headers["X-Client-Platform"] = "native";
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
      // Web: "include" sends httpOnly refresh cookie cross-origin.
      // Native: "omit" — tokens are stored in Capacitor Preferences, not cookies.
      credentials: _isNative ? "omit" : (API_BASE ? "include" : "same-origin"),
      ...options,
      method: method,
      headers: headers,
    });
  } catch (fetchError) {
    // AbortError — caller explicitly cancelled, don't enqueue
    if (fetchError && fetchError.name === "AbortError") {
      throw fetchError;
    }
    // Network error — surface the actual error so users can report it
    var networkMsg = "Network error: " + (fetchError && fetchError.message ? fetchError.message : String(fetchError));
    if (method !== "GET" && method !== "HEAD") {
      if (options.signal) {
        var longRunError = new Error(networkMsg);
        longRunError.status = 0;
        longRunError.offline = true;
        throw longRunError;
      }
      // Don't enqueue sensitive endpoints
      enqueueOfflineMutation(url, { method: method, body: options.body ? options.body : null });
      var offlineError = new Error(networkMsg);
      offlineError.status = 0;
      offlineError.offline = true;
      throw offlineError;
    }
    var getError = new Error(networkMsg);
    getError.status = 0;
    getError.offline = true;
    throw getError;
  }

  // ─── Handle blob responses (PDF, file downloads) ────────────
  if (options.responseType === "blob" && response.ok) {
    return response.blob();
  }

  // ─── Error handling ─────────────────────────────────────────
  if (!response.ok) {
    // 401 — try silent refresh before giving up (unless already retrying)
    if (response.status === 401 && !_skipRefresh && !url.includes(REFRESH_URL)) {
      try {
        var newToken = await silentRefresh();
        // Retry the original request with fresh access token
        var retryHeaders = Object.assign({}, options.headers || {});
        retryHeaders["Authorization"] = "Bearer " + newToken;
        // Re-serialize body if it was an object (it's already stringified)
        return request(url, {
          ...options,
          headers: retryHeaders,
          _skipRefresh: true,
        });
      } catch (refreshErr) {
        // Refresh failed — clear auth and redirect
        clearAuth();
        if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
          window.location.replace("/login");
        }
        var authError = new Error("Session expired. Please log in again.");
        authError.status = 401;
        throw authError;
      }
    }

    var errorBody = null;
    try { errorBody = await response.json(); } catch (e) { /* ignore */ }

    // Extract the most useful error message from the response body.
    // DRF returns field-level errors as { field: ["msg"] } and some views
    // use { error: "msg" } or { detail: "msg" }.
    var _firstFieldMsg = null;
    var fieldErrors = {};
    if (errorBody && typeof errorBody === "object") {
      for (var _fk in errorBody) {
        if (Array.isArray(errorBody[_fk]) && errorBody[_fk].length > 0) {
          if (!_firstFieldMsg) _firstFieldMsg = errorBody[_fk][0];
          fieldErrors[_fk] = errorBody[_fk][0];
        }
      }
    }
    // Pick the cleanest error message available.
    // Skip errorBody.error if it contains Python repr (ErrorDetail, non_field_errors).
    var _cleanError = errorBody?.error;
    if (_cleanError && /ErrorDetail|non_field_errors|password1|password2/.test(_cleanError)) {
      _cleanError = null;
    }
    var error = new Error(
      errorBody?.detail ||
      errorBody?.non_field_errors?.[0] ||
      _cleanError ||
      errorBody?.message ||
      _firstFieldMsg ||
      "Request failed: " + response.status
    );
    error.status = response.status;
    error.body = errorBody ? snakeToCamel(errorBody) : null;

    // Field-level errors (DRF format: { field: ["error"] })
    if (Object.keys(fieldErrors).length > 0) {
      error.fieldErrors = snakeToCamel(fieldErrors);
    }

    // User-friendly message (safe to display in UI)
    error.userMessage = getUserMessage(error);

    throw error;
  }

  // ─── Parse response ─────────────────────────────────────────
  // 204 No Content
  if (response.status === 204) return null;

  var contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    var data = await response.json();
    return snakeToCamel(data);
  }

  // Fallback: CapacitorHttp may not forward Content-Type header correctly.
  // Try JSON parse on the raw text before returning a plain string.
  var text = await response.text();
  if (text && (text.charAt(0) === "{" || text.charAt(0) === "[")) {
    try { return snakeToCamel(JSON.parse(text)); } catch (_e) { /* not JSON */ }
  }
  return text;
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
  // Never queue sensitive authentication/account endpoints
  var sensitivePatterns = ["/auth/", "/2fa/", "/password/", "/delete-account", "/conversations/", "/users/", "/social/report", "/export", "/checkout", "/subscription/"];
  for (var i = 0; i < sensitivePatterns.length; i++) {
    if (url.indexOf(sensitivePatterns[i]) !== -1) return;
  }
  // Expire stale entries older than 24 hours
  var queue = getQueue().filter(function (item) {
    return Date.now() - item.timestamp < 86400000;
  });
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
