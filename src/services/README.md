# Services

Core service layer handling API communication, real-time messaging, native platform access, and push notifications.

## Overview

| Module | Purpose |
|--------|---------|
| **api.js** | JWT-based HTTP client with auto-refresh, case transforms, offline queue |
| **endpoints.js** | All API endpoint constants organized by resource |
| **transforms.js** | Deep recursive camelCase <-> snake_case converters |
| **websocket.js** | WebSocket manager with auto-reconnect + heartbeat |
| **agora.js** | Agora RTM (chat) + RTC (voice/video calls) + presence |
| **native.js** | Capacitor plugin wrappers (clipboard, haptics, camera, etc.) |
| **pushNotifications.js** | Web Push (VAPID) + native FCM orchestrator |
| **nativeNotifications.js** | Capacitor push registration, local notifications, channels |
| **taskScheduler.js** | Local task notification scheduling |

---

## api.js

JWT-based HTTP client with automatic token refresh, case transformation, CSRF, and offline mutation queue.

### Token Management

| Function | Description |
|----------|-------------|
| `initToken()` | Load access token from Capacitor Preferences (native) or legacy localStorage (web migration) |
| `getToken()` | Return current in-memory access token |
| `getAccessTokenForWS()` | Alias for `getToken()` — used by WebSocket connections |
| `setToken(access, refresh)` | Store access token in memory; persist refresh to Capacitor Preferences on native |
| `clearAuth()` | Clear memory + localStorage + Capacitor Preferences tokens |
| `refreshAccessToken()` | Silent JWT refresh via httpOnly cookie (web) or request body with stored refresh token (native) |

**Web token flow:** Access token is memory-only (never touches localStorage). Refresh token is an httpOnly cookie set by the backend. On page load, `refreshAccessToken()` uses the cookie to obtain a new access token.

**Native token flow:** Both tokens stored in `@capacitor/preferences`. Refresh uses the stored refresh token in the request body.

### HTTP Methods

| Function | Description |
|----------|-------------|
| `apiGet(url, options)` | GET request with auth header |
| `apiPost(url, body, options)` | POST with JSON body |
| `apiPut(url, body, options)` | PUT with JSON body |
| `apiPatch(url, body, options)` | PATCH with JSON body |
| `apiDelete(url, options)` | DELETE request (supports `options.body`) |
| `apiUpload(url, formData, options)` | POST with FormData (no Content-Type header — browser sets boundary) |

### Request Pipeline

1. **Case transform** — `camelToSnake()` applied to request body
2. **CSRF** — `X-CSRFToken` header auto-attached on mutating requests (read from cookie)
3. **Auth** — `Authorization: Bearer <access_token>` header
4. **Credentials** — `credentials: 'include'` for httpOnly cookie support
5. **Response transform** — `snakeToCamel()` applied to JSON response
6. **Error handling** — 401 triggers silent refresh + retry queue; field-level DRF errors extracted

### Offline Queue

| Function | Description |
|----------|-------------|
| `enqueueOfflineMutation(mutation)` | Queue a POST/PUT/PATCH/DELETE for later replay |
| `flushOfflineQueue()` | Replay all queued mutations (called on reconnect) |

- Mutations stored in `localStorage` with 24-hour TTL
- Dispatches `dp-offline-queue-change` event on queue changes
- `NetworkContext` auto-flushes on reconnect

### Error Handling

- `getUserMessage(err, fallback)` — Maps HTTP status codes to user-friendly messages
- `fieldErrors` — DRF format `{ field: ["error"] }` extracted and attached to error object
- Raw API errors never shown to users

---

## endpoints.js

All API endpoint constants organized by resource type.

### Endpoint Groups

| Group | Prefix | Key Endpoints |
|-------|--------|---------------|
| `AUTH` | `/api/auth/` | login, 2fa-challenge, register, logout, token refresh, password reset, Google/Apple OAuth |
| `USERS` | `/api/users/` | me, gamification, ai-usage, avatar, stats, achievements, 2FA, notification prefs, email change, account delete, export |
| `DREAMS` | `/api/dreams/` | CRUD, calibration, plan generation, vision board, tags, collaborators, sharing, templates, goals, tasks, obstacles, milestones |
| `CONVERSATIONS` | `/api/conversations/` | CRUD, messages, voice/image upload, pin/like/react, search, export, calls, Agora config/tokens |
| `CALENDAR` | `/api/calendar/` | events, timeblocks, view, Google Calendar sync |
| `NOTIFICATIONS` | `/api/notifications/` | list, mark read, unread count, grouped, push subscriptions, devices |
| `SUBSCRIPTIONS` | `/api/subscriptions/` | plans, current, checkout, portal, cancel, reactivate, invoices |
| `STORE` | `/api/store/` | categories, items, featured, inventory, purchase, wishlist, gifts, refunds |
| `LEAGUES` | `/api/leagues/` | leagues, leaderboards (global/league/friends/me/nearby), seasons, rewards |
| `CIRCLES` | `/api/circles/` | CRUD, join/leave, feed, posts, challenges, members, invitations, chat, calls |
| `SOCIAL` | `/api/social/` | friends, follow, block, report, search, feed, posts, events, stories |
| `BUDDIES` | `/api/buddies/` | current, chat, progress, match, pair, encourage, history |
| `SEARCH` | `/api/search/` | global search |
| `WS` | `/ws/` | ai-chat, buddy-chat, circle-chat, notifications |

### Usage

```jsx
import { DREAMS, AUTH } from "../services/endpoints";
import { apiGet, apiPost } from "../services/api";

// Fetch dreams
const dreams = await apiGet(DREAMS.LIST);

// Login
const result = await apiPost(AUTH.LOGIN, { email, password });
```

---

## transforms.js

Deep recursive case converters used automatically by the API client.

| Function | Description |
|----------|-------------|
| `snakeToCamel(obj)` | Recursively convert snake_case keys to camelCase |
| `camelToSnake(obj)` | Recursively convert camelCase keys to snake_case |

- Preserves `Date`, `File`, `Blob` instances (no transformation)
- Handles nested objects and arrays
- Applied automatically by `apiGet`, `apiPost`, etc.

---

## websocket.js

WebSocket manager with auto-reconnect, heartbeat, and token auth via message body.

### createWebSocket(path, options)

| Option | Type | Description |
|--------|------|-------------|
| `token` | string | JWT access token for authentication |
| `onMessage` | function | Message handler (receives parsed JSON) |
| `onOpen` | function | Connection opened callback |
| `onClose` | function | Connection closed callback |
| `onError` | function | Error callback |

**Returns:** `{ send, close, getState }`

### Features

- **Token auth via message body** — Token sent as `{"type": "authenticate", "token": "..."}` after connection opens (not in URL query string to avoid logging/history leaks)
- **Auto-reconnect** — Exponential backoff with jitter (max 30s delay)
- **Heartbeat** — 30s ping interval, 10s pong timeout
- **App resume** — Native: auto-reconnect on `appStateChange` to foreground
- **Clean shutdown** — `close()` disables reconnect and closes socket

### Usage

```jsx
import { createWebSocket } from "../services/websocket";

const ws = createWebSocket(`/ws/notifications/`, {
  token: accessToken,
  onMessage: (data) => console.log(data),
});

// Later
ws.close();
```

---

## agora.js

Agora RTM (real-time messaging) + RTC (voice/video calls) + presence (online status).

### RTM (Real-Time Messaging)

| Function | Description |
|----------|-------------|
| `initRTM()` | Initialize Agora RTM client, login, auto-refresh token 1hr before expiry |
| `cleanupRTM()` | Logout, leave all channels, cleanup |
| `joinRTMChannel(channelName, handlers)` | Join a channel; returns messaging controls |

**Channel handlers:**

| Handler | Description |
|---------|-------------|
| `onMessage(text, memberId)` | New message received |
| `onTyping(memberId)` | Peer is typing |
| `onMarkRead(memberId)` | Peer read messages |
| `onMemberJoined(memberId)` | Peer joined channel |
| `onMemberLeft(memberId)` | Peer left channel |

**joinRTMChannel returns:**

| Method | Description |
|--------|-------------|
| `sendMessage(text)` | Send text message to channel |
| `sendTyping()` | Send typing indicator |
| `sendMarkRead()` | Send read receipt |
| `leave()` | Leave channel and cleanup |

### RTM Presence

| Function | Description |
|----------|-------------|
| `subscribePresence(peerIds)` | Subscribe to online/offline changes for peer IDs |
| `queryPresence(peerIds)` | One-time query of peer online status |
| `onPresenceChange(callback)` | Register callback `(peerId, isOnline)` — returns unsubscribe function |

### RTC (Voice/Video Calls)

| Function | Description |
|----------|-------------|
| `createAgoraCallSession(channelName, opts)` | Create call session with media tracks |

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `video` | boolean | Enable video (default: audio only) |
| `onRemoteStream(user, mediaType)` | function | Remote user published media |
| `onRemoteLeft(user)` | function | Remote user left |
| `onConnectionStateChange(state, reason)` | function | Connection state changed |

**Returns:**

| Method | Description |
|--------|-------------|
| `join(token, uid)` | Join RTC channel with backend-issued token |
| `toggleMute()` | Toggle microphone mute |
| `toggleCamera()` | Toggle camera on/off |
| `leave()` | Leave channel, close tracks |
| `getLocalTracks()` | Get local audio/video track objects |
| `setSpeaker(deviceId)` | Set audio output device |

### Connection Recovery

- RTM: Exponential backoff on remote kicks (max 2 retries)
- Token auto-refresh 1 hour before expiry
- Connection state monitoring with reconnect on network recovery

---

## native.js

Capacitor plugin wrappers for native platform functionality. All functions are safe to call on web (no-op or fallback).

| Function | Description |
|----------|-------------|
| `clipboardWrite(text)` | Copy text to clipboard |
| `hapticImpact(style)` | Trigger haptic feedback (Light/Medium/Heavy) |
| `hapticVibrate(pattern)` | Custom vibration pattern |
| `hapticStop()` | Stop ongoing vibration |
| `nativeShare(options)` | Native share sheet (fallback: Notification API on web) |
| `openBrowser(url)` | Open URL in in-app browser (HTTPS enforced) |
| `closeBrowser()` | Close in-app browser |
| `addBrowserListener(event, handler)` | Listen for browser events |
| `saveBlobFile(blob, fileName)` | Save file to Documents folder (native only) |
| `takePicture(options)` | Camera capture — returns DataUrl or null |
| `pickPhoto(options)` | Photo picker — returns DataUrl or null |
| `acquireWakeLock()` | Keep screen on (returns lock reference) |
| `releaseWakeLock(lockRef)` | Release screen wake lock |
| `getNetworkStatus()` | Returns `{ connected, connectionType }` |
| `addNetworkListener(handler)` | Listen for network changes |
| `setupKeyboard()` | Configure keyboard accessory bar |
| `isNative` | Boolean — true if running in Capacitor native shell |

---

## pushNotifications.js

Orchestrator for Web Push (VAPID) and native FCM/APNS push notifications.

| Function | Description |
|----------|-------------|
| `subscribeToPush()` | Register for push — FCM on native, VAPID Web Push on web |
| `unsubscribeFromPush()` | Unregister and notify backend |
| `isPushSupported()` | Check browser capability for Web Push |
| `getPushPermission()` | Returns `"granted"`, `"denied"`, or `"default"` |

**Web Push flow:**
1. Register Service Worker
2. Request notification permission
3. Subscribe with VAPID public key
4. POST subscription to backend (`NOTIFICATIONS.PUSH_SUBSCRIPTIONS`)

**Native flow:**
1. Request notification permission
2. FCM registration (handled by `nativeNotifications.js`)
3. POST device token to backend (`NOTIFICATIONS.DEVICES`)

---

## nativeNotifications.js

Capacitor push notification registration, local notifications, and notification channels (Android).

### Push Registration

| Function | Description |
|----------|-------------|
| `registerNativePush()` | Register for FCM/APNS, request permission, send token to backend |
| `setupPushListeners(handlers)` | Register onNotification + onAction handlers |
| `checkNativePushPermission()` | Returns `"granted"`, `"denied"`, `"prompt"` |
| `unregisterNativePush()` | Unregister and clear delivered notifications |

### Notification Channels (Android)

| Channel ID | Name | Importance | Sound | Full-Screen |
|------------|------|------------|-------|-------------|
| `dreamplanner_default` | DreamPlanner | High (4) | default | No |
| `buddy-calls` | Buddy Calls | Max (5) | ringtone | Yes |
| `task-calls` | Task Calls | Max (5) | ringtone | Yes |

| Function | Description |
|----------|-------------|
| `createDefaultNotificationChannel()` | Create general notification channel |
| `createBuddyCallChannel()` | Create buddy calls channel (full-screen intent) |
| `createTaskCallChannel()` | Create task calls channel (full-screen intent) |

### Local Notifications

| Function | Description |
|----------|-------------|
| `showForegroundNotification(notification)` | Display notification while app is in foreground |
| `scheduleIncomingCallNotification(callData)` | Full-screen incoming buddy call notification |
| `scheduleTaskCallNotification(task)` | Full-screen task reminder notification |
| `registerBuddyCallActions()` | Register Accept/Decline action buttons |
| `registerTaskCallActions()` | Register Start Now/Later action buttons |
| `addLocalNotificationActionListener(taskCb, callCb)` | Listen for action button taps |
| `requestLocalNotificationPermission()` | Request permission (Android 13+) |

---

## taskScheduler.js

Schedule local notifications for upcoming tasks.

| Function | Description |
|----------|-------------|
| `scheduleTaskNotifications(tasks)` | Schedule local notifications for undone future tasks |
| `cancelScheduledTaskNotifications()` | Cancel all pending task notifications |

**Task format:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Task ID (hashed to Int32 for Android notification ID) |
| `title` | string | Task title |
| `dream` | string | Parent dream name |
| `startTime` / `date` | string | ISO date/time for scheduling |
| `done` / `completed` | boolean | Skip if already done |
| `priority` | string | Task priority level |
| `category` | string | Task category |
| `durationMins` | number | Task duration in minutes |
