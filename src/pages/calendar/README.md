# Calendar Pages

Calendar views, time block scheduling, and Google Calendar integration.

## Overview

| Screen | Route | Description |
|--------|-------|-------------|
| **CalendarScreen** | `/calendar` | Monthly calendar with events, tasks, and day detail |
| **TimeBlocksScreen** | `/calendar/timeblocks` | Weekly time block scheduling |
| **GoogleCalendarConnect** | `/calendar/google` | Google Calendar OAuth connection and sync |

---

## CalendarScreen.jsx

Monthly calendar with event and task overview.

### Features

- **Month view** — Calendar grid with dots indicating events/tasks
- **Day detail** — Tap a day to see scheduled items
- **Task actions** — Complete or skip tasks from calendar view
- **Event actions** — View, edit, reschedule events
- **Quick add** — Create event or task from selected date
- **Overdue indicators** — Highlight overdue tasks

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar/view/?start=...&end=...` | Calendar events for date range |
| GET | `/api/calendar/today/` | Today's scheduled tasks |
| GET | `/api/calendar/events/` | List all events |
| POST | `/api/calendar/events/` | Create event |
| PUT | `/api/calendar/events/{id}/` | Update event |
| DELETE | `/api/calendar/events/{id}/` | Delete event |
| PATCH | `/api/calendar/events/{id}/reschedule/` | Reschedule event |
| GET | `/api/calendar/suggest-time-slots/?date=...&duration_mins=...` | AI time slot suggestions |

---

## TimeBlocksScreen.jsx

Weekly time block scheduling for task organization.

### Features

- **Week view** — 7-day grid with hourly time slots
- **Time blocks** — Drag to create, tap to edit/delete
- **Task assignment** — Assign tasks to time blocks
- **Work hours** — Highlighted based on user preferences

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar/timeblocks/` | List time blocks |
| POST | `/api/calendar/timeblocks/` | Create time block |
| PUT | `/api/calendar/timeblocks/{id}/` | Update time block |
| DELETE | `/api/calendar/timeblocks/{id}/` | Delete time block |

---

## GoogleCalendarConnect.jsx

Google Calendar OAuth connection and bidirectional sync.

### Flow

1. `GET /api/calendar/google/status/` — Check if connected
2. `GET /api/calendar/google/auth/` — Get Google OAuth URL
3. User authorizes in browser → redirected with auth code
4. `POST /api/calendar/google/callback/` — Exchange code for tokens
5. `POST /api/calendar/google/sync/` — Trigger bidirectional sync
6. `POST /api/calendar/google/disconnect/` — Disconnect integration

### States

- **Not connected** — Show "Connect Google Calendar" button
- **Connected** — Show sync button, last sync time, disconnect option
- **Syncing** — Loading indicator during sync
