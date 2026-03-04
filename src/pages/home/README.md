# Home Page

Dashboard screen showing an overview of user activity, progress, and quick actions.

## HomeScreen.jsx

**Route:** `/` (root)

### Sections

- **Greeting** — Personalized welcome with time-of-day greeting and user name
- **Quick actions** — New dream, calendar, messages, social shortcuts
- **Active dreams** — Dream cards with progress rings and completion percentage
- **Today's tasks** — Upcoming/overdue tasks with complete/skip actions
- **Recent activity** — Activity feed items (achievements, milestones, social)
- **Streaks** — Current streak count with milestone markers
- **Motivational content** — AI-generated motivational quotes or tips

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me/` | User profile (name, subscription, streak) |
| GET | `/api/users/gamification/` | XP, level, rank |
| GET | `/api/dreams/dreams/` | Active dreams with progress |
| GET | `/api/calendar/today/` | Today's scheduled tasks |
| GET | `/api/notifications/notifications/unread_count/` | Unread notification count |

### Features

- **Pull to refresh** — Refetch all dashboard data
- **Lazy loading** — Dreams and tasks loaded separately
- **React Query** — Cached with 2-minute stale time
- **Responsive** — Cards reflow for desktop layout
