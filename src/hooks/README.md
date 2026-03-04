# Hooks

Custom React hooks for cross-cutting concerns.

## Overview

| Hook | Purpose |
|------|---------|
| **useNotificationSocket** | Global notification WebSocket (real-time alerts, incoming calls, task reminders) |
| **useInfiniteList** | Infinite scroll with React Query + IntersectionObserver |
| **useAgoraPresence** | Real-time online/offline status for a list of user IDs |
| **useKeyboardShortcuts** | Global keyboard shortcuts (desktop) |

---

## useNotificationSocket(token, opts)

Global WebSocket connection for real-time notifications, incoming calls, and task reminders.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | JWT access token for WebSocket auth |
| `opts.onToast` | function | `(message, type)` — called to show toast notifications |
| `opts.onTaskReminder` | function | `(taskData)` — called on task reminder events |

### Returns

`wsRef` — React ref containing the WebSocket instance (for cleanup).

### Handled Message Types

| Type | Action |
|------|--------|
| `notification` / `new_notification` | Invalidate React Query notification cache + show toast |
| `unread_count` | Update unread notification count |
| `reminder` / `overdue_tasks` / `task_due` | Dispatch `dp-task-reminder` custom event |
| `notification_message` (call_rejected / missed_call) | Show toast + dispatch `dp-call-status` event |
| `incoming_call` | Dispatch `dp-incoming-call` event (handled by `IncomingCallOverlay`) |

### Features

- Connects to `/ws/notifications/` via `createWebSocket()`
- Debounces query invalidation (300ms) to prevent storms from rapid notifications
- Auto-reconnect handled by underlying WebSocket manager

---

## useInfiniteList(opts)

Infinite scroll with React Query for the first page and IntersectionObserver for subsequent pages.

### Parameters

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `queryKey` | array | required | React Query cache key |
| `url` | string | required | API endpoint URL |
| `limit` | number | 20 | Items per page |
| `enabled` | boolean | true | Enable/disable the query |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `items` | array | All loaded items |
| `isLoading` | boolean | First page loading |
| `isError` | boolean | Query error state |
| `error` | Error | Query error object |
| `hasMore` | boolean | More pages available |
| `loadingMore` | boolean | Next page loading |
| `sentinelRef` | React ref | Attach to a sentinel element at the bottom of the list |
| `refetch()` | function | Reset and reload from page 1 |

### Features

- **LimitOffsetPagination** — `?limit=N&offset=M` parameters
- **IntersectionObserver** — Auto-loads next page when sentinel is 300px from viewport
- **Response formats** — Handles `{ results }`, `{ activities }`, and plain arrays
- **React Query integration** — First page cached with 2-minute stale time

### Usage

```jsx
const { items, isLoading, sentinelRef, hasMore } = useInfiniteList({
  queryKey: ["dreams"],
  url: DREAMS.LIST,
});

return (
  <div>
    {items.map(dream => <DreamCard key={dream.id} dream={dream} />)}
    {hasMore && <div ref={sentinelRef} />}
  </div>
);
```

---

## useAgoraPresence(userIds)

Real-time online/offline presence tracking via Agora RTM.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `userIds` | string[] | Array of user ID strings to track |

### Returns

`{ [userId]: boolean }` — Map of user IDs to online status.

### Features

- Initial one-time query via `queryPresence()`
- Real-time subscription via `subscribePresence()`
- Unsubscribes on cleanup or when user IDs change
- Avoids re-subscription if same IDs provided

---

## useKeyboardShortcuts()

Global keyboard shortcuts for desktop navigation.

### Shortcuts

| Key | Action | Target |
|-----|--------|--------|
| `/` | Open global search | Dispatches `dp-open-search` event |
| `n` | New dream | Navigate to `/dream/create` |
| `h` | Home | Navigate to `/` |
| `c` | Calendar | Navigate to `/calendar` |
| `m` | Messages | Navigate to `/conversations` |
| `s` | Social | Navigate to `/social` |
| `p` | Profile | Navigate to `/profile` |
| `?` | Show shortcuts help | Dispatches `dp-show-shortcuts` event |

### Guards

- Skips if focus is inside `<input>`, `<textarea>`, or `contenteditable`
- Skips if any modifier key is held (Ctrl/Cmd/Alt)
