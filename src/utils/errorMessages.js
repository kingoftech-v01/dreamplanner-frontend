// ─── User-Friendly Error Messages ─────────────────────────────────
// Maps HTTP errors to safe, user-facing messages.
// Never expose raw API responses, stack traces, or internal details.

var STATUS_MESSAGES = {
  0: "You appear to be offline. Check your connection and try again.",
  400: "Something was wrong with your request. Please check your input.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to do that.",
  404: "The requested resource was not found.",
  405: "This action is not allowed.",
  408: "The request timed out. Please try again.",
  409: "There was a conflict with the current state. Please refresh and try again.",
  413: "The file is too large. Please use a smaller file.",
  422: "The data provided is invalid. Please check and try again.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again later.",
  502: "The service is temporarily unavailable. Please try again in a moment.",
  503: "The service is under maintenance. Please try again later.",
  504: "The server took too long to respond. Please try again.",
};

/**
 * Get a user-friendly error message from an error object.
 * @param {Error} err - The error (from api.js or native Error)
 * @param {string} [fallback] - Optional custom fallback message
 * @returns {string} Safe, user-facing error message
 */
export function getUserMessage(err, fallback) {
  if (!err) return fallback || "An unexpected error occurred.";

  // Offline errors from api.js
  if (err.offline) return err.message;

  // HTTP status-based message
  if (err.status && STATUS_MESSAGES[err.status]) {
    // For 400, prefer field-level or detail messages from backend
    if (err.status === 400 && err.body) {
      if (err.body.detail) return err.body.detail;
      if (err.body.error) return err.body.error;
      // Return first field error if available
      if (err.fieldErrors) {
        var firstKey = Object.keys(err.fieldErrors)[0];
        if (firstKey) return err.fieldErrors[firstKey];
      }
    }
    return STATUS_MESSAGES[err.status];
  }

  // Network errors
  if (err.message && /network|fetch|failed to fetch|load failed/i.test(err.message)) {
    return STATUS_MESSAGES[0];
  }

  return fallback || "An unexpected error occurred. Please try again.";
}

/**
 * Log error details safely (redacted for console).
 * @param {string} context - Where the error occurred (e.g., "login", "uploadAvatar")
 * @param {Error} err - The error object
 */
export function logError(context, err) {
  if (!err) return;
  console.error(
    "[" + context + "]",
    "status=" + (err.status || "?"),
    err.message || "unknown error"
  );
}
