# DreamPlanner Frontend

A gamified goal-tracking PWA + native Android app where users create "dreams," break them into AI-generated goals and tasks, and track progress with XP, streaks, achievements, and social accountability.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor)
![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8)
![DOMPurify](https://img.shields.io/badge/DOMPurify-secured-10B981)

---

## Quick Start

**Prerequisites:** Node.js 18+ and npm 9+

```bash
git clone <repo-url>
cd dreamplanner-frontend
npm install
npm run dev
```

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run build:android` | Build + sync + open Android Studio |

### Environment Variables

Create `.env` or `.env.local`:

```env
VITE_API_BASE=https://your-api-domain.com
VITE_WS_BASE=wss://your-api-domain.com

# Optional: VAPID key for Web Push (not needed on native — uses FCM)
VITE_VAPID_PUBLIC_KEY=BPxr...base64...
```

---

## Architecture

### Backend Integration

The frontend connects to a Django REST Framework + Django Channels backend. All API calls go through `src/services/api.js` which handles:

- **Token auth** — `Authorization: Token <key>` header on every request
- **Case transforms** — camelCase (JS) <-> snake_case (Python) automatic conversion
- **Token persistence** — `@capacitor/preferences` on native, `localStorage` on web
- **CSRF** — auto-attached on mutating requests

### Provider Tree (src/main.jsx)

```text
<HashRouter>                  Hash-based routing for Capacitor WebView
  <QueryClientProvider>       React Query (2min stale time, 1 retry)
    <AuthProvider>            Token auth, login/register/logout, user state
      <I18nProvider>          Locale state (en/fr), provides useT()
        <ThemeProvider>       Visual theme, sun position, tokens
          <TaskCallProvider>  Task reminders, native notifications
            <ToastProvider>   Toast stack
              <NetworkProvider>  Online/offline detection
                <App />
```

### Real-Time Communication

| Channel | Technology | Purpose |
| --- | --- | --- |
| AI chat | WebSocket `ws/conversations/<id>/` | AI chat with streaming responses |
| Buddy chat | Agora RTM (SDK v1.5) | P2P messaging, typing indicators, read receipts |
| Circle chat | Agora RTM (SDK v1.5) | Group messaging in circles |
| Voice/video calls | Agora RTC (SDK v4.24) | Cloud-relayed voice & video calls |
| Notifications | WebSocket `ws/notifications/` | Real-time notification updates |

WebSocket connections use token auth via query string (`?token=...`), auto-reconnect with exponential backoff, and heartbeat pings. Agora RTM/RTC tokens are fetched from the backend and auto-renewed before expiry.

### Agora Voice/Video Calls

Implemented in `src/services/agora.js`:

1. **Initiate call** — `POST /api/conversations/calls/initiate/` (creates Call record, sends FCM to callee)
2. **RTC session** — `createAgoraCallSession()` joins an Agora RTC channel with backend-issued token
3. **Media** — Agora SDK manages local audio/video tracks (mic + camera permissions requested first)
4. **Incoming calls** — `IncomingCallOverlay.jsx` listens for `dp-incoming-call` custom events from FCM push
5. **Call end** — `session.leave()` closes RTC tracks + `POST /api/conversations/calls/<id>/end/`

### Agora RTM (Buddy & Circle Chat)

1. **Init** — `initRTM()` called once after auth; logs into RTM with backend-issued token
2. **Channel join** — `joinRTMChannel(conversationUuid)` joins the channel; guards against duplicate joins (Error 202)
3. **Messages** — JSON payloads with `content`, `ts`, `_type` (typing/mark_read) fields
4. **Cleanup** — `cleanupRTM()` on logout leaves all channels and logs out

---

## Project Structure

```text
dreamplanner-frontend/
├── android/                              # Capacitor Android project
├── index.html                            # Entry HTML, CSP headers, font loading
├── capacitor.config.ts                   # Capacitor configuration
├── vite.config.js                        # Vite + React + PWA plugin config
│
├── src/
│   ├── main.jsx                          # App bootstrap, native setup, provider tree
│   ├── App.jsx                           # Routes, overlays, notification socket
│   │
│   ├── services/                         # Core services
│   │   ├── api.js                        # HTTP client (auth, CORS, case transforms)
│   │   ├── websocket.js                  # WebSocket manager (reconnect, heartbeat)
│   │   ├── agora.js                      # Agora RTM (chat) + RTC (voice/video calls)
│   │   ├── native.js                     # Capacitor native APIs (keyboard, haptics, etc.)
│   │   ├── nativeNotifications.js        # FCM push + local notifications + channels
│   │   ├── pushNotifications.js          # Web Push (VAPID) + native FCM orchestrator
│   │   ├── endpoints.js                  # All API endpoint constants
│   │   └── transforms.js                 # camelCase <-> snake_case converters
│   │
│   ├── hooks/
│   │   └── useNotificationSocket.js      # Global notification WebSocket hook
│   │
│   ├── components/shared/                # Reusable components
│   │   ├── ErrorBoundary.jsx             # Catches render errors
│   │   ├── ProtectedRoute.jsx            # Auth guard for routes
│   │   ├── SplashScreen.jsx              # Animated splash (once per session)
│   │   ├── OfflineBanner.jsx             # Slides in when network lost
│   │   ├── Toast.jsx                     # Stacked toast notifications
│   │   ├── PageLayout.jsx                # Page wrapper with BottomNav
│   │   ├── BottomNav.jsx                 # 5-tab navigation
│   │   ├── TaskCallOverlay.jsx           # Full-screen task reminder
│   │   ├── IncomingCallOverlay.jsx       # Incoming call accept/reject
│   │   ├── ThemeBackground.jsx           # Canvas background router
│   │   ├── PageTransition.jsx            # Route transition animations
│   │   ├── GlobalSearch.jsx              # Cmd+K search overlay
│   │   └── Skeleton.jsx                  # Loading placeholders
│   │
│   ├── context/                          # React contexts
│   │   ├── AuthContext.jsx               # Auth state, login/logout/register
│   │   ├── ThemeContext.jsx              # Visual theme + twilight engine
│   │   ├── I18nContext.jsx               # Internationalization (en/fr)
│   │   ├── TaskCallContext.jsx           # Task call notifications
│   │   ├── ToastContext.jsx              # Toast notification system
│   │   └── NetworkContext.jsx            # Online/offline detection
│   │
│   ├── pages/
│   │   ├── auth/                         # Login, Register, ForgotPassword, ChangePassword
│   │   ├── onboarding/                   # OnboardingScreen
│   │   ├── home/                         # HomeScreen (dashboard)
│   │   ├── dreams/                       # DreamCreate, DreamDetail, DreamEdit, Templates,
│   │   │                                 #   Calibration, VisionBoard, MicroStart
│   │   ├── chat/                         # ConversationList, AIChat, BuddyChat, NewChat,
│   │   │                                 #   VoiceCall, VideoCall
│   │   ├── social/                       # SocialHub, FindBuddy, Leaderboard, UserSearch,
│   │   │                                 #   FriendRequests, OnlineFriends, UserProfile,
│   │   │                                 #   Circles, CircleDetail, CircleCreate,
│   │   │                                 #   CircleInvitations, Seasons, BuddyRequests
│   │   ├── calendar/                     # CalendarScreen, GoogleCalendarConnect, TimeBlocks
│   │   ├── profile/                      # Profile, Settings, EditProfile, Achievements,
│   │   │                                 #   AppVersion, TwoFactor, DataExport, Terms, Privacy
│   │   ├── store/                        # StoreScreen, SubscriptionScreen, Gifting
│   │   └── notifications/                # NotificationsScreen
│   │
│   ├── utils/
│   │   ├── sanitize.js                   # Input sanitization helpers
│   │   ├── errorMessages.js              # User-friendly error message mapping
│   │   ├── logger.js                     # Structured logging with redaction
│   │   └── exportDreamCard.js            # Canvas PNG export (roundRect polyfilled)
│   │
│   ├── styles/
│   │   └── globals.css                   # CSS variables, glass classes, animations
│   │
│   └── i18n/
│       ├── en.json                       # English translations
│       └── fr.json                       # French translations
```

---

## API Endpoints Used

### Auth
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/login/` | Email/password login, returns token |
| POST | `/api/auth/registration/` | Register new user |
| POST | `/api/auth/google/` | Google OAuth social login |
| POST | `/api/auth/apple/` | Apple OAuth social login |
| POST | `/api/auth/logout/` | Invalidate token |
| POST | `/api/auth/password/reset/` | Request password reset |
| POST | `/api/auth/password/change/` | Change password |

### Users
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/users/me/` | Current user profile |
| PATCH | `/api/users/me/` | Update profile |
| GET | `/api/users/<id>/` | View user profile |
| GET | `/api/users/search/` | Search users |

### Dreams
| Method | Endpoint | Description |
| --- | --- | --- |
| GET/POST | `/api/dreams/` | List/create dreams |
| GET/PUT/DELETE | `/api/dreams/<id>/` | Dream CRUD |
| POST | `/api/dreams/<id>/generate-goals/` | AI goal generation |
| GET | `/api/dreams/<id>/export-pdf/` | PDF export |
| GET | `/api/dreams/templates/` | Dream templates |
| GET/POST | `/api/dreams/obstacles/` | List/create obstacles |
| PUT/DELETE | `/api/dreams/obstacles/<id>/` | Obstacle CRUD |
| POST | `/api/dreams/obstacles/<id>/resolve/` | Resolve obstacle |
| POST | `/api/dreams/dreams/<id>/tags/` | Add tag to dream |
| DELETE | `/api/dreams/dreams/<id>/tags/<name>/` | Remove tag |
| POST | `/api/dreams/dreams/<id>/share/` | Share dream |
| POST | `/api/dreams/dreams/<id>/collaborators/` | Invite collaborator |
| GET | `/api/dreams/dreams/<id>/collaborators/list/` | List collaborators |
| POST | `/api/dreams/dreams/<id>/generate_vision/` | DALL-E vision generation |

### Conversations
| Method | Endpoint | Description |
| --- | --- | --- |
| GET/POST | `/api/conversations/` | List/create conversations |
| GET | `/api/conversations/<id>/messages/` | Get messages |
| POST | `/api/conversations/<id>/send_message/` | Send message |
| POST | `/api/conversations/<id>/send-voice/` | Send voice message |
| POST | `/api/conversations/<id>/pin-message/<mid>/` | Pin message |
| POST | `/api/conversations/<id>/like-message/<mid>/` | Like message |

### Calls (Agora RTC)
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/conversations/calls/initiate/` | Start a call (creates Agora channel, sends FCM) |
| POST | `/api/conversations/calls/<id>/accept/` | Accept call |
| POST | `/api/conversations/calls/<id>/reject/` | Reject call |
| POST | `/api/conversations/calls/<id>/end/` | End call |
| GET | `/api/conversations/agora/config/` | Get Agora App ID |
| POST | `/api/conversations/agora/rtm-token/` | Issue RTM token (24h, auto-renewed) |
| POST | `/api/conversations/agora/rtc-token/` | Issue RTC token for a channel |

### Social
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/buddies/` | List buddies |
| POST | `/api/buddies/request/` | Send buddy request |
| GET/POST | `/api/circles/` | Circles CRUD |
| GET | `/api/circles/<id>/` | Circle detail |
| POST | `/api/circles/<id>/members/<mid>/promote/` | Promote member |
| POST | `/api/circles/<id>/members/<mid>/demote/` | Demote member |
| POST | `/api/circles/<id>/members/<mid>/remove/` | Remove member |
| GET | `/api/social/feed/friends` | Activity feed |
| POST | `/api/social/feed/<id>/like/` | Like feed item |
| POST | `/api/social/feed/<id>/comment/` | Comment on feed item |
| GET | `/api/social/friends/` | List friends |
| POST | `/api/social/friends/request/` | Send friend request |
| POST | `/api/social/friends/accept/<id>/` | Accept friend request |
| POST | `/api/social/friends/reject/<id>/` | Reject friend request |
| DELETE | `/api/social/friends/remove/<id>/` | Remove friend |
| POST | `/api/social/follow/` | Follow a user |
| DELETE | `/api/social/unfollow/<id>/` | Unfollow a user |
| POST | `/api/social/block/` | Block a user |
| DELETE | `/api/social/unblock/<id>/` | Unblock a user |
| GET | `/api/social/blocked/` | List blocked users |
| POST | `/api/social/report/` | Report a user |
| GET | `/api/leagues/leaderboard/global/` | Global leaderboard |
| GET | `/api/leagues/leaderboard/friends/` | Friends leaderboard |
| GET | `/api/leagues/leaderboard/league/` | League leaderboard |
| GET | `/api/leagues/leaderboard/nearby/` | Nearby leaderboard |

### Notifications & Push
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/notifications/` | List notifications |
| POST | `/api/notifications/<id>/mark_read/` | Mark as read |
| POST | `/api/notifications/mark_all_read/` | Mark all read |
| GET | `/api/notifications/unread_count/` | Unread count |
| POST | `/api/notifications/devices/` | Register FCM device token (native) |
| POST | `/api/notifications/push-subscriptions/` | Register Web Push VAPID subscription |
| DELETE | `/api/notifications/push-subscriptions/` | Unregister Web Push subscription |

### Calendar
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/calendar/events/` | List events |
| GET | `/api/calendar/google/auth/` | Google OAuth URL |
| POST | `/api/calendar/google/callback/` | Exchange code for token |
| GET | `/api/calendar/google/status/` | Connection status |

### Store & Subscriptions

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/store/items/` | List store items |
| POST | `/api/store/purchase/` | Purchase item |
| GET | `/api/store/inventory/history/` | Purchase history |
| POST | `/api/store/refunds/` | Request refund |
| POST | `/api/subscriptions/subscription/checkout/` | Stripe checkout |
| GET | `/api/subscriptions/plans/` | List plans |
| POST | `/api/subscriptions/subscription/portal/` | Stripe billing portal |
| POST | `/api/subscriptions/subscription/apply-coupon/` | Apply coupon code |
| GET | `/api/subscriptions/invoices/` | Invoice history |

### Users (extended)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/users/ai-usage/` | AI credits remaining/limit |
| PUT | `/api/users/notification-preferences/` | Notification + DND settings |
| GET | `/api/users/2fa/status/` | 2FA status |
| POST | `/api/users/2fa/setup/` | Enable 2FA |
| POST | `/api/users/2fa/verify/` | Verify 2FA code |
| POST | `/api/users/2fa/disable/` | Disable 2FA |
| GET | `/api/users/2fa/backup-codes/` | Regenerate backup codes |

---

## Native (Android) Configuration

### Capacitor Plugins

The app uses these Capacitor plugins for native functionality:

- `@capacitor/app` — Deep links, back button, app lifecycle
- `@capacitor/preferences` — Secure token storage
- `@capacitor/push-notifications` — FCM push notifications
- `@capacitor/local-notifications` — Task call reminders
- `@capacitor/keyboard` — Keyboard management
- `@capacitor/haptics` — Vibration feedback
- `@capacitor/network` — Connectivity detection
- `@capacitor/camera` — Photo capture
- `@capacitor/share` — Native share sheet
- `@capacitor/clipboard` — Clipboard access

### Android Permissions

Declared in `android/app/src/main/AndroidManifest.xml`:

```
INTERNET, ACCESS_NETWORK_STATE, CAMERA, RECORD_AUDIO,
MODIFY_AUDIO_SETTINGS, VIBRATE, WAKE_LOCK, POST_NOTIFICATIONS,
READ_MEDIA_IMAGES, USE_FULL_SCREEN_INTENT, FOREGROUND_SERVICE,
SYSTEM_ALERT_WINDOW, RECEIVE_BOOT_COMPLETED, SCHEDULE_EXACT_ALARM
```

### MediaPermissionsPlugin

Custom Capacitor plugin (`MediaPermissionsPlugin.java`) that requests CAMERA + RECORD_AUDIO permissions together at app startup. Registered in `MainActivity.java` before `super.onCreate()`. Called from `main.jsx` after notification permission is granted — Android only shows one permission dialog at a time.

### Notification Channels (Android)

| Channel ID | Name | Importance | Sound |
| --- | --- | --- | --- |
| `dreamplanner_default` | DreamPlanner | 4 (High) | default |
| `task-calls` | Task Calls | 5 (Max) | ringtone |
| `buddy-calls` | Buddy Calls | 5 (Max) | ringtone |

Channels are created at startup in `main.jsx`. High-priority channels trigger full-screen intents for incoming calls and task reminders over the lock screen.

### Deep Links

Custom scheme: `com.dreamplanner.app://`

| Deep Link | Handler |
| --- | --- |
| `auth/google/callback` | Google OAuth token extraction |
| `auth/apple/callback` | Apple Sign-In id_token extraction |
| `stripe/return` | Stripe checkout completion |
| `calendar/callback` | Google Calendar OAuth code |
| `notification?route=...` | Navigate to route from notification tap |

---

## Security

### Headers & CSP (nginx internal)

All security headers are set by the Docker-internal nginx (`nginx.docker.conf`), not the external reverse proxy. This makes the frontend container "plug and play" with full security regardless of the hosting environment.

| Header | Value |
| --- | --- |
| `X-Frame-Options` | SAMEORIGIN |
| `X-Content-Type-Options` | nosniff |
| `X-XSS-Protection` | 1; mode=block |
| `Referrer-Policy` | strict-origin-when-cross-origin |
| `Permissions-Policy` | camera=(self), microphone=(self), geolocation=(), payment=() |
| `Cross-Origin-Opener-Policy` | same-origin |
| `Cross-Origin-Resource-Policy` | same-origin |
| `Strict-Transport-Security` | max-age=31536000; includeSubDomains |
| `Content-Security-Policy` | Full CSP with `upgrade-insecure-requests`, `frame-ancestors 'self'` |

**CSP notes:** `unsafe-eval` is required by Agora RTM SDK. `unsafe-inline` is required by Vite's style injection. Port wildcards (`:*`) allow Agora SDK WebSocket connections on non-standard ports.

### Rate Limiting (nginx)

| Zone | Rate | Applies to |
| --- | --- | --- |
| `static_limit` | 30 req/s | SPA routes, static assets |
| `download_limit` | 2 req/s | APK downloads |

### Application Security

- **HTML sanitization** — AI chat messages rendered via `dangerouslySetInnerHTML` are sanitized with DOMPurify
- **Input sanitization** — `src/utils/sanitize.js` provides `stripHtml`, `escapeHtml`, `sanitizeText`, `sanitizeUrl`, `sanitizeParam`, `sanitizeSearch`
- **Error handling** — `src/utils/errorMessages.js` maps HTTP status codes to user-friendly messages; raw API errors are never shown to users. All API errors include `error.userMessage` for safe UI display.
- **Structured logging** — `src/utils/logger.js` auto-redacts sensitive data (tokens, passwords, secrets) from console output
- **OAuth CSRF protection** — Google OAuth uses cryptographic `state` parameter with `sessionStorage` verification on callback. Apple Sign-In uses state param via Apple JS SDK.
- **Token storage** — `@capacitor/preferences` on native (more secure than localStorage)
- **Auth cleanup** — `clearAuth()` removes token from both localStorage and Capacitor Preferences
- **WebSocket auth** — Token passed via query string, validated by backend middleware
- **Agora auth** — RTM/RTC tokens are short-lived (24h), issued by the backend, and auto-renewed
- **CSRF header** — `X-CSRFToken` auto-attached on all mutating API requests
- **Log sanitization** — Console logs never include tokens, credentials, or full error stack traces
- **Dependency audit** — 0 known vulnerabilities (npm audit clean)

### Docker Security

- **Read-only filesystem** — Container runs with `read_only: true` (tmpfs for cache/run/tmp)
- **Port binding** — Listens on `127.0.0.1:3080` only (not exposed to internet directly)
- **Resource limits** — 128M memory, 0.5 CPU
- **Health check** — `wget --spider` on port 80
- **server_tokens off** — Nginx version hidden

---

## Theme System

### Three Visual Themes

| Theme ID | Background | Mode |
| --- | --- | --- |
| `cosmos` | Animated starfield | Dark only |
| `default` | Real-time day/night cycle | Dynamic |
| `saturn` | Sci-fi ringed planet | Dark only |

### CSS Variables

| Variable | Dark | Light |
| --- | --- | --- |
| `--dp-glass-bg` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.48)` |
| `--dp-text` | `rgba(255,255,255,0.95)` | `rgba(25,30,50,0.95)` |
| `--dp-accent` | `#C4B5FD` | `#7C3AED` |

### Glass Classes

```jsx
<div className="dp-g">Glass card</div>
<div className="dp-g dp-gh">Hoverable glass</div>
<button className="dp-ib">Icon button</button>
```

---

## Scalability Notes

- **WebSocket connections** — Redis channel layer with connection pooling (capacity: 1500, expiry: 60s, group_expiry: 1h)
- **Rate limiting** — Per-connection sliding window (30 messages / 60 seconds) on all WebSocket consumers
- **Message size** — 8KB frame limit prevents memory abuse
- **Moderation caching** — OpenAI Moderation API results cached for 5 minutes (SHA-256 keyed)
- **Query optimization** — `select_related()` on conversation/dream access checks to avoid N+1
- **Code splitting** — All screens except HomeScreen are lazy-loaded
- **React Query** — 2-minute stale time, single retry, no refetch on window focus

---

## Known Limitations

- **No test suite** — no Jest, Vitest, or Cypress
- **No linting** — no ESLint or Prettier config
- **Mobile-first** — UI optimized for ~480px; desktop layout needs work
- **OAuth implicit flow** — Google login uses `response_type=token` (consider migrating to Authorization Code + PKCE). State parameter CSRF protection is in place.
- **Voice messages** — Backend supports Whisper transcription but frontend recording UI not yet implemented
- **Agora RTM v1.x** — Using legacy RTM SDK; consider migrating to RTM v2 when stable
- **CSP unsafe-eval** — Required by Agora RTM SDK; cannot be removed until Agora releases a CSP-compliant build
