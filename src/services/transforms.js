// ─── Deep snake_case ↔ camelCase transformers ──────────────────────
// Used automatically by the API client so screens never deal with case.

function toCamel(str) {
  return str.replace(/_([a-z0-9])/g, function (_, c) { return c.toUpperCase(); });
}

function toSnake(str) {
  return str.replace(/[A-Z]/g, function (c) { return "_" + c.toLowerCase(); });
}

export function snakeToCamel(obj) {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj instanceof Date || obj instanceof File || obj instanceof Blob) return obj;
  var out = {};
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      out[toCamel(key)] = snakeToCamel(obj[key]);
    }
  }
  return out;
}

export function camelToSnake(obj) {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (obj instanceof Date || obj instanceof File || obj instanceof Blob) return obj;
  var out = {};
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      out[toSnake(key)] = camelToSnake(obj[key]);
    }
  }
  return out;
}
