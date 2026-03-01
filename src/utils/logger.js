// ─── Structured Logger with Sensitive Data Redaction ──────────────
// Use instead of raw console.log/error for consistent, safe logging.

var SENSITIVE_PATTERNS = /token|password|secret|key|authorization|cookie|credential/i;

function redactValue(key, value) {
  if (typeof key === "string" && SENSITIVE_PATTERNS.test(key)) {
    return "[REDACTED]";
  }
  if (typeof value === "string" && value.length > 100) {
    return value.substring(0, 20) + "...[truncated]";
  }
  return value;
}

function redactObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  var result = {};
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = redactValue(key, obj[key]);
    }
  }
  return result;
}

function formatMessage(level, context, message, data) {
  var prefix = "[" + level.toUpperCase() + "] [" + context + "]";
  if (data) {
    return [prefix, message, redactObject(data)];
  }
  return [prefix, message];
}

var logger = {
  info: function (context, message, data) {
    console.log.apply(console, formatMessage("info", context, message, data));
  },
  warn: function (context, message, data) {
    console.warn.apply(console, formatMessage("warn", context, message, data));
  },
  error: function (context, message, data) {
    console.error.apply(console, formatMessage("error", context, message, data));
  },
  debug: function (context, message, data) {
    if (import.meta.env.DEV) {
      console.debug.apply(console, formatMessage("debug", context, message, data));
    }
  },
};

export default logger;
