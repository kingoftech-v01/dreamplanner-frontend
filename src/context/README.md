# Context Providers

Global state management via React Context. All providers are composed in `src/main.jsx`.

## Overview

| Context | Provider | Hook | Purpose |
|---------|----------|------|---------|
| **AuthContext** | `AuthProvider` | `useAuth()` | Authentication state, login/logout, user profile |
| **ThemeContext** | `ThemeProvider` | `useTheme()` | Visual theme, day/night cycle, CSS tokens |
| **I18nContext** | `I18nProvider` | `useT()` | Internationalization (16 languages) |
| **TaskCallContext** | `TaskCallProvider` | `useTaskCall()` | Task reminder overlays + native notifications |
| **ToastContext** | `ToastProvider` | `useToast()` | Toast notification stack |
| **NetworkContext** | `NetworkProvider` | `useNetwork()` | Online/offline detection + offline queue |

### Provider Tree (src/main.jsx)

```text
<HashRouter>
  <QueryClientProvider>       React Query (2min stale, 1 retry)
    <AuthProvider>            JWT auth, login/register/logout, user state
      <I18nProvider>          Locale state (16 languages), useT()
        <ThemeProvider>       Visual theme, sun position, CSS tokens
          <TaskCallProvider>  Task reminders, native notifications
            <ToastProvider>   Toast stack (max 3)
              <NetworkProvider>  Online/offline, offline queue flush
                <App />
```

---

## AuthContext.jsx

Authentication state, JWT token management, login/register/logout flows.

### State

| Property | Type | Description |
|----------|------|-------------|
| `user` | object \| null | Current user profile from `/api/users/me/` |
| `token` | string \| null | Current access token (null if not authenticated) |
| `isLoading` | boolean | True during initial session restore |
| `isAuthenticated` | boolean | True when user is logged in |

### Methods

| Method | Arguments | Returns | Description |
|--------|-----------|---------|-------------|
| `login` | `(email, password)` | `{ tfaRequired, challengeToken }` or user data | Authenticate. If 2FA enabled, returns challenge token instead of logging in. |
| `register` | `(email, password1, password2, displayName)` | user data | Register and auto-login |
| `socialLogin` | `(provider, accessToken)` | user data | Google/Apple OAuth login |
| `logout` | — | — | POST to logout, clear auth, navigate to /login |
| `refreshUser` | — | user data | Re-fetch user profile from backend |
| `updateUser` | `(partial)` | — | Optimistic local user state update |
| `hasSubscription` | `(requiredTier)` | boolean | Check if user tier >= required tier (free < premium < pro) |
| `completeOnboarding` | — | — | Mark user as onboarded |
| `changeEmail` | `(newEmail, password)` | — | Request email change (sends verification link) |
| `deleteAccount` | `(password)` | — | GDPR account deletion, clears auth, navigates to /login |

### 2FA Login Flow

1. User submits email + password → `login()` calls `POST /api/auth/login/`
2. If `data.tfaRequired` is true: returns `{ tfaRequired: true, challengeToken }` — no JWT issued
3. Frontend shows OTP input screen
4. User enters OTP → `POST /api/auth/2fa-challenge/` with `{ challengeToken, code }`
5. Backend verifies challenge token signature + OTP → issues JWT tokens
6. Frontend calls `setToken()` + `refreshUser()` to complete login

### Session Restore (on mount)

**Native:** `initToken()` → if token exists, `fetchUser()` → else `refreshAccessToken()` → `fetchUser()`

**Web:** `initToken()` (legacy migration) → `refreshAccessToken()` via httpOnly cookie → `fetchUser()`

---

## ThemeContext.jsx

Visual theme management with real-time day/night cycle (Twilight engine).

### State

| Property | Type | Description |
|----------|------|-------------|
| `visualTheme` | string | `"cosmos"`, `"default"`, `"saturn"` |
| `resolved` | string | `"dark"` or `"light"` (computed from theme + sun position) |
| `isDay` | boolean | True during daytime (6:00-18:00) |
| `sun` | number | Sun position 0-1 (0=night, 1=day) |
| `forceMode` | string \| null | `null` (auto), `"day"`, `"night"` |
| `autoEnabled` | boolean | True when using automatic day/night cycle |
| `uiOpacity` | number | 0-1, used for cinematic fade transitions |

### Theme Tokens (CSS Variables)

All tokens are computed from the current theme and sun position:

| Token | Dark Example | Light Example |
|-------|-------------|---------------|
| `cardBg` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.48)` |
| `textPrimary` | `rgba(255,255,255,0.95)` | `rgba(25,30,50,0.95)` |
| `textSecondary` | `rgba(255,255,255,0.6)` | `rgba(25,30,50,0.6)` |
| `accentColor` | `#C4B5FD` | `#7C3AED` |
| `badgeBg` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` |

### Methods

| Method | Description |
|--------|-------------|
| `setTheme(id)` | Switch visual theme (`"cosmos"`, `"default"`, `"saturn"`) |
| `setForceMode(mode)` | Force day/night mode (null = auto) |
| `toggleMode()` | Cycle: auto → day → night → auto |
| `startCinematic(type)` | Start sunrise/sunset spectacle animation |
| `cancelCinematic()` | Stop active cinematic |

### Visual Themes

| Theme | Background | Mode | Description |
|-------|-----------|------|-------------|
| `cosmos` | Animated starfield | Dark only | Canvas-rendered stars |
| `default` | Real-time day/night sky | Dynamic | Twilight engine with sun position |
| `saturn` | Sci-fi ringed planet | Dark only | Canvas-rendered planet |

### Supporting Modules

- **themeTokens.js** — Color palettes (cosmos, twilight day/night, sunset/sunrise keyframes), `computeTwilightTokens(sun)` interpolation
- **twilightEngine.js** — `getRealTimeSun()`, grace window detection, `useTwilightClock()` hook, `useCinematicSpectacle()` hook

---

## I18nContext.jsx

Internationalization with 16 language packs.

### State

| Property | Type | Description |
|----------|------|-------------|
| `locale` | string | Current language code (e.g. `"en"`, `"fr"`) |
| `isRTL` | boolean | True for Arabic, Hebrew, Farsi, Urdu |

### Methods

| Method | Description |
|--------|-------------|
| `t(key)` | Translate key — dot-notation supported, falls back to English |
| `setLocale(lang)` | Switch language, persists to localStorage |

### Supported Languages

`en`, `fr`, `es`, `de`, `pt`, `it`, `nl`, `ru`, `ja`, `ko`, `zh`, `ar`, `hi`, `tr`, `pl`, `ht`

### Features

- Auto-detect device language on first native launch
- Sets `document.lang` and `document.dir` attributes for RTL
- Translation files in `src/i18n/*.json`

---

## ToastContext.jsx

Toast notification stack.

### Methods

| Method | Arguments | Description |
|--------|-----------|-------------|
| `showToast` | `(message, type='info', duration=3000)` | Add toast to stack |

**Types:** `"info"`, `"success"`, `"error"`, `"warning"`

Max 3 toasts visible at once. Auto-dismissed after `duration` ms.

---

## NetworkContext.jsx

Online/offline detection with offline mutation queue integration.

### State

| Property | Type | Description |
|----------|------|-------------|
| `isOnline` | boolean | Current network connectivity status |
| `queueCount` | number | Number of queued offline mutations |

### Features

- Listens for network status changes (web `navigator.onLine` + Capacitor Network plugin)
- Auto-flushes offline queue on reconnect via `flushOfflineQueue()`
- Listens for `dp-offline-queue-change` events to update `queueCount`
- `OfflineBanner` component reads from this context

---

## TaskCallContext.jsx

Task reminder overlay system with native notification support.

### State

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | boolean | Whether task call overlay is visible |
| `taskData` | object \| null | Current task reminder data |
| `notifPermission` | string | Browser notification permission status |

### Methods

| Method | Description |
|--------|-------------|
| `triggerTaskCall(data)` | Show task reminder (overlay if visible, notification if hidden) |
| `dismissTaskCall()` | Close overlay, stop vibration, release wake lock |
| `scheduleAutoClose(delayMs)` | Auto-close after delay |
| `requestNotificationPermission()` | Request browser notification permission |
| `acquireWakeLock()` | Keep screen on during task |
| `releaseWakeLock()` | Release screen wake lock |

### Features

- App visibility detection (overlay vs notification based on foreground state)
- Native local notification action listeners (accept/snooze for tasks, accept/reject for calls)
- Vibration feedback + haptics
- Listens for `dp-task-reminder` custom events dispatched by notification WebSocket
