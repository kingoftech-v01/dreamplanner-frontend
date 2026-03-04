# Utils — TODO

Feature ideas and improvements for utility functions.

---

## sanitize.js

- [ ] **URL allowlist** — Only allow specific URL domains in sanitizeUrl (prevent phishing links)
- [ ] **Markdown sanitization** — Sanitize markdown input while preserving safe formatting
- [ ] **Input length indicators** — Helper to calculate remaining characters for max-length fields
- [ ] **Phone number validation** — Validate and format phone numbers (for SMS 2FA)
- [ ] **Username validation** — Alphanumeric + underscore, 3-30 chars, not starting with number

## errorMessages.js

- [ ] **Contextual error messages** — Different messages based on which screen the error occurred on
- [ ] **Error codes** — Map backend error codes to specific user-friendly messages
- [ ] **Retry suggestions** — Include actionable retry suggestions in error messages
- [ ] **Offline-specific errors** — Better offline error messages with queue information

## logger.js

- [ ] **Remote logging** — Send critical errors to Sentry or custom endpoint
- [ ] **Log levels** — Configurable log level (verbose in dev, error-only in prod)
- [ ] **Performance logging** — Log render times and API call durations
- [ ] **User action logging** — Track user actions for debugging (breadcrumbs)

## New Utilities

- [ ] **dateUtils.js** — Date formatting, relative time ("2 hours ago"), timezone helpers
- [ ] **formatters.js** — Number formatting (1.2K, 3.5M), file size formatting, duration formatting
- [ ] **validators.js** — Comprehensive form validation library (email, URL, phone, password)
- [ ] **analytics.js** — Analytics event tracking wrapper (Mixpanel, Amplitude, or custom)
- [ ] **featureFlags.js** — Client-side feature flag system for gradual rollouts
- [ ] **a11y.js** — Accessibility helpers (focus trap, screen reader announcements, skip links)
