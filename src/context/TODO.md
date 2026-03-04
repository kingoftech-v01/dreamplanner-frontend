# Context Providers — TODO

Feature ideas and improvements for global state management.

---

## AuthContext

- [ ] **Biometric re-auth** — Require Face ID/fingerprint for sensitive actions (delete account, change email)
- [ ] **Session timeout** — Auto-logout after configurable inactivity period with warning
- [ ] **Multi-account support** — Switch between multiple DreamPlanner accounts without re-login
- [ ] **Auth state persistence** — Faster cold start by caching user profile in localStorage
- [ ] **Impersonation mode** — Admin-only feature to impersonate users for debugging

## ThemeContext

- [ ] **Custom themes** — Let users create and save custom color themes
- [ ] **Theme scheduling** — Schedule theme changes (e.g., dark mode after 8 PM automatically)
- [ ] **Accessibility themes** — High-contrast and reduced-motion theme variants
- [ ] **Theme marketplace** — Community-shared themes via store
- [ ] **Dynamic accent color** — Let users pick custom accent color independent of theme
- [ ] **Theme preview** — Live preview when hovering over theme options

## I18nContext

- [ ] **Auto-translation** — AI-powered auto-translation for user-generated content
- [ ] **Pluralization** — Proper plural form handling for all languages
- [ ] **Date/number formatting** — Locale-aware date and number formatting (Intl API)
- [ ] **Translation quality** — Community-contributed translation improvements
- [ ] **Missing translation detection** — Dev mode warning for untranslated keys

## NetworkContext

- [ ] **Connection quality** — Detect slow connections (not just offline) and adapt UI
- [ ] **Offline mode** — Full offline mode with queued actions and local data
- [ ] **Sync indicator** — Show sync status icon (synced, syncing, pending)
- [ ] **Conflict resolution** — Handle conflicts when offline edits clash with server state

## ToastContext

- [ ] **Toast actions** — Toasts with action buttons (e.g., "Undo" on task completion)
- [ ] **Persistent toasts** — Toasts that don't auto-dismiss (for errors requiring action)
- [ ] **Toast position** — Configurable toast position (top, bottom, center)
- [ ] **Toast animations** — Smooth slide-in/slide-out animations per position
