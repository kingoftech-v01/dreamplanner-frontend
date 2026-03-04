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

// Common Django/DRF error messages → friendly versions
var FRIENDLY_MESSAGES = [
  [/unable to log in with provided credentials/i, "Incorrect email or password."],
  [/no active account found/i, "No account found with this email."],
  [/password is too similar/i, "Your password is too similar to your email. Choose a more unique password."],
  [/password is too short/i, "Password must be at least 8 characters."],
  [/password is too common/i, "This password is too easy to guess. Try something more unique."],
  [/password is entirely numeric/i, "Password can't be all numbers. Add some letters or symbols."],
  [/two password fields didn.t match/i, "Passwords don't match."],
  [/already registered with this e-?mail/i, "An account with this email already exists. Try signing in."],
  [/user with this email already exists/i, "An account with this email already exists. Try signing in."],
  [/enter a valid email/i, "Please enter a valid email address."],
  [/this field (is required|may not be blank)/i, "Please fill in all required fields."],
  [/account.*locked/i, "Account temporarily locked. Please try again later."],
  [/token.*invalid|token.*expired/i, "This link has expired. Please request a new one."],
  [/not found/i, "Account not found."],
];

/**
 * Try to convert a raw error string into a user-friendly message.
 * Handles Django ErrorDetail repr strings and known message patterns.
 */
function humanize(raw) {
  if (!raw || typeof raw !== "string") return null;

  // Extract actual message from Python ErrorDetail repr:
  // "{'field': [ErrorDetail(string='message', code='...')]}"
  var detailMatch = raw.match(/ErrorDetail\(string='([^']+)'/);
  var msg = detailMatch ? detailMatch[1] : raw;

  // Match against known friendly messages
  for (var i = 0; i < FRIENDLY_MESSAGES.length; i++) {
    if (FRIENDLY_MESSAGES[i][0].test(msg)) {
      return FRIENDLY_MESSAGES[i][1];
    }
  }

  // If it still looks like raw Python/DRF output, return null to use fallback
  if (/ErrorDetail|non_field_errors|password1|password2/.test(msg)) {
    return null;
  }

  return msg;
}

/**
 * Get a user-friendly error message from an error object.
 * @param {Error} err - The error (from api.js or native Error)
 * @param {string} [fallback] - Optional custom fallback message
 * @returns {string} Safe, user-facing error message
 */
export function getUserMessage(err, fallback) {
  if (!err) return fallback || "An unexpected error occurred.";

  // Network / offline errors
  if (err.offline || (err.message && /network|fetch|failed to fetch|load failed/i.test(err.message))) {
    return STATUS_MESSAGES[0];
  }

  // Try to humanize the raw error message first
  var friendly = humanize(err.message);
  if (friendly) return friendly;

  // HTTP status-based message
  if (err.status && STATUS_MESSAGES[err.status]) {
    if (err.status === 400 && err.body) {
      // Try body.detail (clean DRF message)
      if (err.body.detail) {
        var hDetail = humanize(err.body.detail);
        if (hDetail) return hDetail;
      }
      // Try field errors
      if (err.fieldErrors) {
        var firstKey = Object.keys(err.fieldErrors)[0];
        if (firstKey) {
          var hField = humanize(err.fieldErrors[firstKey]);
          if (hField) return hField;
        }
      }
    }
    return STATUS_MESSAGES[err.status];
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
