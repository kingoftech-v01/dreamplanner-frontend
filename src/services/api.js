// ─── DreamPlanner API Client ────────────────────────────────────────
// Enhanced fetch wrapper with auth, CORS, case transforms, and error handling.

import { snakeToCamel, camelToSnake } from "./transforms";
import { Capacitor } from "@capacitor/core";

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

  var response = await fetch(fullUrl, {
    credentials: API_BASE ? "include" : "same-origin",
    ...options,
    method: method,
    headers: headers,
  });

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
