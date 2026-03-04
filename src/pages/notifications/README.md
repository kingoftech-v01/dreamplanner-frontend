# Notifications Page

Notification list with read status management and grouped views.

## NotificationsScreen.jsx

**Route:** `/notifications`

### Features

- **Notification list** — All notifications with read/unread indicators
- **Mark as read** — Tap to mark individual notification as read
- **Mark all read** — Bulk mark all notifications as read
- **Grouped view** — Group notifications by type
- **Navigation** — Tap notification to navigate to relevant screen
- **Infinite scroll** — Load more via `useInfiniteList`

### Notification Types

| Type | Navigation Target |
|------|------------------|
| `reminder` | Calendar / task detail |
| `achievement_unlock` | Achievements screen |
| `dream_completed` | Dream detail |
| `buddy_message` | Buddy chat |
| `friend_request` | Friend requests screen |
| `circle_invite` | Circle invitations |
| `dream_post_like` | Post detail |
| `dream_post_comment` | Post detail |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications/notifications/` | List notifications (paginated) |
| POST | `/api/notifications/notifications/{id}/mark_read/` | Mark as read |
| POST | `/api/notifications/notifications/mark_all_read/` | Mark all read |
| GET | `/api/notifications/notifications/unread_count/` | Unread count |
| GET | `/api/notifications/notifications/grouped/` | Grouped by type |
| POST | `/api/notifications/notifications/{id}/opened/` | Track engagement |
