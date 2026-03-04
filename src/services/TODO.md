# Services — TODO

Feature ideas and improvements for the core service layer.

---

## API Client (api.js)

- [ ] **Request deduplication** — Deduplicate identical concurrent GET requests
- [ ] **Request cancellation** — Cancel in-flight requests on component unmount (AbortController)
- [ ] **Retry with backoff** — Automatic retry for 5xx errors with exponential backoff
- [ ] **Request interceptors** — Pluggable request/response interceptor system
- [ ] **API response caching** — ETag/If-None-Match support for conditional requests
- [ ] **Bandwidth detection** — Reduce payload size on slow connections (request fewer fields)
- [ ] **Request batching** — Batch multiple API calls into a single request (reduce round trips)

## WebSocket (websocket.js)

- [ ] **Connection health indicator** — Visual indicator showing WebSocket connection status
- [ ] **Message queue persistence** — Persist unsent messages across page reloads
- [ ] **Binary protocol** — Switch to binary (MessagePack/Protobuf) for smaller payloads
- [ ] **Connection sharing** — Share single WebSocket across browser tabs (SharedWorker)
- [ ] **Bandwidth-adaptive** — Reduce message frequency on slow connections

## Agora (agora.js)

- [ ] **RTM v2 migration** — Upgrade to Agora RTM v2 for better performance
- [ ] **Network quality indicator** — Show connection quality during calls (signal bars)
- [ ] **Echo cancellation tuning** — Fine-tune audio processing for better call quality
- [ ] **Virtual backgrounds** — Add virtual background support for video calls
- [ ] **Noise suppression** — Enable AI noise suppression for calls in noisy environments
- [ ] **Call statistics** — Display real-time call stats (bitrate, latency, packet loss)

## Native (native.js)

- [ ] **Biometric auth** — Face ID / fingerprint authentication for app unlock
- [ ] **Background sync** — Sync data in background when app is not active
- [ ] **Deep link handling v2** — Support universal links (HTTPS) alongside custom scheme
- [ ] **Local storage encryption** — Encrypt sensitive data stored in Capacitor Preferences
- [ ] **App shortcuts** — Quick actions from home screen long-press (new dream, open chat)

## Push Notifications (pushNotifications.js)

- [ ] **Rich notifications** — Notifications with images, action buttons, and expandable content
- [ ] **Notification grouping** — Group notifications by type on the device level
- [ ] **Silent push** — Background data sync triggered by silent push notifications
- [ ] **Notification sounds** — Custom notification sounds per type (message, reminder, achievement)
