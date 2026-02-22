// ─── CSRF-Ready API Layer ─────────────────────────────────────────
// Wraps fetch() with CSRF token, JSON handling, and credentials.
// Ready for backend integration.

function getCsrfToken() {
  var match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function fetchApi(url, options) {
  if (!options) options = {};
  var method = (options.method || "GET").toUpperCase();
  var headers = Object.assign({}, options.headers || {});

  if (method !== "GET" && method !== "HEAD") {
    headers["X-CSRF-Token"] = getCsrfToken();
  }

  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  var response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    method: method,
    headers: headers,
  });

  if (!response.ok) {
    var errorBody = null;
    try { errorBody = await response.json(); } catch (e) { /* ignore */ }
    var error = new Error(errorBody?.message || "Request failed: " + response.status);
    error.status = response.status;
    error.body = errorBody;
    throw error;
  }

  var contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}
