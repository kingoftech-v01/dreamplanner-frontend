# Utilities

Shared utility functions for sanitization, error handling, logging, haptics, and exports.

## Overview

| Module | Purpose |
|--------|---------|
| **sanitize.js** | Input sanitization, validation, password strength |
| **errorMessages.js** | HTTP error → user-friendly message mapping |
| **logger.js** | Structured logging with sensitive data redaction |
| **haptics.js** | Convenience wrappers for haptic feedback |
| **equippedItems.js** | Extract equipped cosmetic items from user data |
| **exportDreamCard.js** | Canvas-based dream progress card export (1080x1080 PNG) |

---

## sanitize.js

Input sanitization and validation functions.

| Function | Description |
|----------|-------------|
| `stripHtml(str)` | Remove all HTML tags from string |
| `escapeHtml(str)` | Convert `<>&"'` to HTML entities |
| `isValidEmail(email)` | Basic email format validation |
| `getPasswordStrength(pw)` | Returns `{ score: 0-5, label, errors[] }` |
| `sanitizeParam(param)` | Alphanumeric + dash/underscore only, 200 char limit |
| `sanitizeSearch(query)` | Strip dangerous chars, 200 char limit |
| `sanitizeText(str, maxLength)` | Strip HTML, optional length truncation |
| `sanitizeUrl(url)` | Block `javascript:`, `data:`, `vbscript:`, protocol-relative URLs |
| `sanitizeNumber(val, min, max)` | Clamp numeric value within bounds |
| `validateRequired(fields)` | Batch check for missing required fields — returns first missing field name or null |

### Password Strength Scoring

| Score | Label | Criteria |
|-------|-------|----------|
| 0 | — | Less than 8 characters |
| 1 | Weak | 8+ chars |
| 2 | Fair | + has number |
| 3 | Good | + has uppercase |
| 4 | Strong | + has lowercase |
| 5 | Very Strong | + has special character |

---

## errorMessages.js

Map HTTP errors to user-friendly messages.

| Function | Description |
|----------|-------------|
| `getUserMessage(err, fallback)` | Map HTTP status to safe user message |
| `logError(context, err)` | Log error details with redaction |

### Status Code Mapping

| Status | Message |
|--------|---------|
| 0 | "You appear to be offline" |
| 400 | "Something was wrong with your request" (or first field error) |
| 401 | "Your session has expired. Please log in again" |
| 403 | "You don't have permission to do that" |
| 404 | "The requested resource was not found" |
| 408 | "The request timed out" |
| 409 | "There was a conflict with your request" |
| 413 | "The file you're trying to upload is too large" |
| 422 | "The data provided could not be processed" |
| 429 | "Too many requests. Please wait a moment" |
| 500 | "Something went wrong on our end" |
| 502/503 | "Our servers are temporarily unavailable" |
| 504 | "The server took too long to respond" |

---

## logger.js

Structured logging with automatic sensitive data redaction.

| Method | Description |
|--------|-------------|
| `logger.info(context, message, data)` | Info-level log |
| `logger.warn(context, message, data)` | Warning-level log |
| `logger.error(context, message, data)` | Error-level log |
| `logger.debug(context, message, data)` | Debug-level log (DEV only) |

### Redacted Fields

Any key matching these patterns is replaced with `"[REDACTED]"`:

`token`, `password`, `secret`, `key`, `authorization`, `cookie`, `credential`

Strings longer than 100 characters are truncated with `"..."`.

---

## haptics.js

Convenience wrappers for native haptic feedback.

| Function | Description |
|----------|-------------|
| `hapticLight()` | Light impact feedback |
| `hapticMedium()` | Medium impact feedback |
| `hapticHeavy()` | Heavy impact feedback |

All functions are no-ops on web (only trigger on native via Capacitor Haptics plugin).

---

## equippedItems.js

Extract equipped cosmetic items from user profile data.

| Function | Returns | Description |
|----------|---------|-------------|
| `getEquippedItems(user)` | `{ badgeFrame, decoration, chatBubble }` | Extract equipped items from user data |
| `getAvatarEquipProps(user)` | `{ badgeFrame, decoration }` | Convert to Avatar component props |

### Supported Item Types

| Type | Properties |
|------|------------|
| `badge_frame` | `borderColor`, `borderWidth`, `glow`, `glowColor`, `animated`, `image` |
| `avatar_decoration` | `emoji`, `position` (top-right, top-left, bottom-left, bottom-right) |
| `chat_bubble` | `color`, `gradient` |

---

## exportDreamCard.js

Generate a shareable dream progress card as a 1080x1080 PNG.

| Function | Returns | Description |
|----------|---------|-------------|
| `exportDreamCard(dreamData)` | `Promise<Blob>` | Render dream card to canvas and export as PNG blob |

### Input

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Dream title |
| `category` | string | Dream category |
| `progress` | number | 0-100 completion percentage |
| `goalCount` | number | Total goals |
| `completedGoals` | number | Completed goals |
| `daysLeft` | number | Days remaining |
| `status` | string | Dream status |

### Category Colors

| Category | Color |
|----------|-------|
| career | `#8B5CF6` |
| health | `#10B981` |
| finance | `#F59E0B` |
| hobbies | `#EC4899` |
| growth | `#6366F1` |
| social | `#14B8A6` |

Renders: title, circular progress ring, category badge, stats row, status badge, DreamPlanner watermark.
