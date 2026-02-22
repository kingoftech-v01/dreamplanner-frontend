// ─── Input Sanitization Utilities ────────────────────────────────

/** Strip all HTML tags from a string */
export function stripHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "");
}

/** Escape HTML entities for safe text display */
export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Validate email format */
export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Check password strength — returns { score: 0-4, label, errors[] } */
export function getPasswordStrength(pw) {
  if (typeof pw !== "string") return { score: 0, label: "Too short", errors: ["Password is required"] };
  var errors = [];
  if (pw.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(pw)) errors.push("At least one uppercase letter");
  if (!/[a-z]/.test(pw)) errors.push("At least one lowercase letter");
  if (!/[0-9]/.test(pw)) errors.push("At least one number");
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push("At least one special character");
  var score = 5 - errors.length;
  var labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Very strong"];
  return { score: score, label: labels[score], errors: errors };
}

/** Sanitize URL params — alphanumeric, dash, underscore only */
export function sanitizeParam(param) {
  if (typeof param !== "string") return "";
  return param.replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 200);
}

/** Sanitize search input — strip dangerous chars, limit length */
export function sanitizeSearch(query) {
  if (typeof query !== "string") return "";
  return query.replace(/[<>"'`;\\]/g, "").trim().slice(0, 200);
}

/** Sanitize display text — strip HTML tags and limit length */
export function sanitizeText(str, maxLength) {
  if (typeof str !== "string") return "";
  var clean = stripHtml(str).trim();
  if (maxLength) return clean.slice(0, maxLength);
  return clean;
}
