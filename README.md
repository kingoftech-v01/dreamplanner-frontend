# DreamPlanner

A gamified goal-tracking PWA where users create "dreams," break them into AI-generated goals and tasks, and track progress with XP, streaks, achievements, and social accountability.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)
![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8)
![DOMPurify](https://img.shields.io/badge/DOMPurify-secured-10B981)
![Status](https://img.shields.io/badge/status-frontend_prototype-orange)

---

## Quick Start

**Prerequisites:** Node.js 18+ and npm 9+

```bash
git clone <repo-url>
cd dreamplanner-frontend
npm install
npm run dev
```

The app opens automatically at `http://localhost:3000`. No backend or API keys required — all data is mocked.

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000, auto-opens browser |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |

---

## Project Overview

DreamPlanner helps users define big-picture goals ("dreams"), which are automatically broken into milestones, goals, and tasks. Users earn XP for completing tasks, maintain daily streaks, unlock achievements, and compete on leaderboards. Social features include accountability buddies, circles, an activity feed, and AI coaching conversations.

**Current status:** Frontend prototype. All data comes from `src/data/mockData.js`. There is no backend, no real authentication, no AI integration, and no payment processing. The PWA infrastructure (offline caching, push notifications, service worker) is fully functional.

---

## Tech Stack

| Dependency | Version | Purpose |
| --- | --- | --- |
| React | 18.3 | UI framework |
| React Router | 6.28 | Client-side routing (38 routes) |
| Vite | 6.0.3 | Build tool + dev server |
| vite-plugin-pwa | 1.2 | PWA manifest + Workbox service worker |
| Lucide React | 0.468 | Icon library |
| DOMPurify | 3.3.1 | HTML sanitization for AI chat messages |

---

## Project Structure

```text
dreamplanner-frontend/
├── index.html                          # Entry HTML, CSP headers, font loading
├── vite.config.js                      # Vite + React + PWA plugin config
├── package.json                        # Dependencies and scripts
│
├── public/
│   ├── favicon.svg                     # App icon (purple gradient)
│   └── sw-custom.js                    # Custom service worker (notification clicks)
│
└── src/
    ├── main.jsx                        # React root, provider tree (5 providers)
    ├── App.jsx                         # 38 routes, lazy loading, ErrorBoundary, SplashScreen
    │
    ├── components/shared/              # 14 reusable components
    │   ├── ErrorBoundary.jsx           # Catches render errors, shows reload button
    │   ├── SplashScreen.jsx            # Animated splash (1.6s, once per session)
    │   ├── OfflineBanner.jsx           # Slides down when network is lost
    │   ├── Toast.jsx                   # Stacked toasts (success/error/warning/info)
    │   ├── PageLayout.jsx              # Standard page wrapper with BottomNav
    │   ├── BottomNav.jsx               # 5-tab fixed bottom navigation
    │   ├── ThemeBackground.jsx         # Routes to the correct canvas background
    │   ├── CosmicBackground.jsx        # Canvas: animated starfield (cosmos theme)
    │   ├── TwilightBackground.jsx      # Canvas: dynamic sky with day/night cycle
    │   ├── SaturnBackground.jsx        # Canvas: sci-fi ringed planet
    │   ├── PageTransition.jsx          # Fade + slide route transitions (150ms)
    │   ├── GlobalSearch.jsx            # Cmd+K style search overlay
    │   ├── TaskCallOverlay.jsx         # Phone-call-like task reminder overlay
    │   └── Skeleton.jsx                # Shimmer loading placeholders
    │
    ├── context/                        # 5 context providers + theme utilities
    │   ├── ThemeContext.jsx             # Visual theme state + twilight engine
    │   ├── I18nContext.jsx              # Internationalization (en/fr)
    │   ├── TaskCallContext.jsx          # Task reminders, notifications, wake lock
    │   ├── ToastContext.jsx             # Toast notification system
    │   ├── NetworkContext.jsx           # Online/offline detection
    │   ├── themeTokens.js              # Color palettes + dynamic token computation
    │   └── twilightEngine.js           # Real-time sun tracking + cinematic spectacle
    │
    ├── pages/                          # ~41 screen components
    │   ├── auth/                       # Login, Register, ForgotPassword, ChangePassword
    │   ├── onboarding/                 # OnboardingScreen (swipeable intro)
    │   ├── home/                       # HomeScreen (dashboard)
    │   ├── dreams/                     # DreamCreate, DreamDetail, DreamEdit, Templates,
    │   │                               #   Calibration, VisionBoard, MicroStart
    │   ├── chat/                       # ConversationList, AIChat, BuddyChat, NewChat,
    │   │                               #   VoiceCall, VideoCall
    │   ├── social/                     # SocialHub, FindBuddy, Leaderboard, UserSearch,
    │   │                               #   FriendRequests, OnlineFriends, UserProfile,
    │   │                               #   Circles, CircleDetail
    │   ├── calendar/                   # CalendarScreen, GoogleCalendarConnect
    │   ├── profile/                    # Profile, Settings, EditProfile, Achievements,
    │   │                               #   AppVersion, TermsOfService, PrivacyPolicy
    │   ├── store/                      # StoreScreen, SubscriptionScreen
    │   └── notifications/              # NotificationsScreen
    │
    ├── utils/
    │   ├── sanitize.js                 # Input sanitization (stripHtml, escapeHtml, etc.)
    │   ├── api.js                      # CSRF-ready fetch wrapper
    │   ├── haptics.js                  # Vibration feedback (light/medium/heavy)
    │   └── exportDreamCard.js          # Canvas-based 1080x1080 PNG export
    │
    ├── data/
    │   └── mockData.js                 # All mock data (user, dreams, conversations, etc.)
    │
    ├── styles/
    │   ├── globals.css                 # CSS variables, glass classes, animation keyframes
    │   └── theme.js                    # Design tokens (colors, spacing, timing, categories)
    │
    └── i18n/
        ├── en.json                     # English translations
        └── fr.json                     # French translations
```

---

## Architecture

### Provider Tree

Defined in `src/main.jsx`. Each provider wraps the next, making its context available to all descendants:

```text
<BrowserRouter>              React Router v6 (v7 compat flags enabled)
  <I18nProvider>              Locale state (en/fr), provides useT()
    <ThemeProvider>            Visual theme, sun position, tokens, provides useTheme()
      <TaskCallProvider>      Task reminders, notifications, provides useTaskCall()
        <ToastProvider>       Toast stack, provides useToast()
          <NetworkProvider>   Online/offline state, provides useNetwork()
            <App />
```

### App Shell

Defined in `src/App.jsx`. The rendering order matters:

```text
<SplashScreen />            Once per session (sessionStorage: dp-splash-shown)
<ThemeBackground />         Fixed full-screen canvas (behind everything)
<OfflineBanner />           Slides in from top when offline
<ErrorBoundary>             Catches render errors across all routes
  <Suspense>                Shows spinner while lazy chunks load
    <PageTransition>        Animates route changes (fade + slide)
      <Routes>              38 route definitions
    </PageTransition>
  </Suspense>
</ErrorBoundary>
<TaskCallOverlay />         Global task reminder (above everything)
```

### Context Hooks

| Context | Hook | Key Values |
| --- | --- | --- |
| `ThemeContext` | `useTheme()` | `visualTheme`, `resolved` ("light"/"dark"), `sun` (0-1), `isDay`, `setTheme()`, `toggleMode()`, `startCinematic()`, `uiOpacity`, all token values (cardBg, textPrimary, accentColor, etc.) |
| `I18nContext` | `useT()` | `t(key)` translation function, `locale`, `setLocale()` |
| `TaskCallContext` | `useTaskCall()` | `triggerTaskCall(data)`, `dismissTaskCall()`, `isOpen`, `taskData`, `requestNotificationPermission()` |
| `ToastContext` | `useToast()` | `showToast(message, type?, duration?)` — types: "success", "error", "warning", "info" |
| `NetworkContext` | `useNetwork()` | `isOnline` (boolean) |

---

## Theme System

### Three Visual Themes

| Theme ID | Name | Background Component | Mode | Description |
| --- | --- | --- | --- | --- |
| `cosmos` | Cosmos | `CosmicBackground.jsx` | Dark only | Animated starfield with nebulae, shooting stars, parallax |
| `default` | Twilight | `TwilightBackground.jsx` | Dynamic | Day/night cycle based on real time (6 AM = day, 6 PM = night) |
| `saturn` | Saturn | `SaturnBackground.jsx` | Dark only | Sci-fi scene with ringed planet, aurora, volumetric clouds |

### How It Works

1. **Selection**: Stored in `localStorage` key `dp-theme`. `ThemeBackground.jsx` renders the matching canvas.
2. **CSS variables**: `ThemeContext` sets `data-theme="light"` or `data-theme="dark"` on `<html>`, which activates the corresponding CSS variable set in `globals.css`.
3. **Tokens**: Components access computed color tokens via `useTheme()` (e.g., `cardBg`, `textPrimary`, `accentColor`).

### Twilight Engine

The twilight theme has the most complex logic, spread across three files:

- **`twilightEngine.js`** — `useTwilightClock()` polls every 500ms and computes a `sun` value (0 = night, 1 = day) based on the current hour. `useCinematicSpectacle()` triggers animated transitions at sunrise/sunset.
- **`themeTokens.js`** — `computeTwilightTokens(sun)` interpolates between `TWILIGHT_DAY` and `TWILIGHT_NIGHT` palettes using step functions at specific sun thresholds.
- **`ThemeContext.jsx`** — Orchestrates the engine, manages force mode (manual day/night override via `dp-force-mode` in localStorage), and exposes everything through `useTheme()`.

**Cinematic spectacle**: At real sunrise (5:55-6:05) and sunset (17:55-18:05), a 3-phase animation plays: UI fades out (2.5s) → sky spectacle runs (6s) → UI fades in (2.5s).

### CSS Variables

Two sets are defined in `globals.css`:

| Variable | Dark | Light |
| --- | --- | --- |
| `--dp-glass-bg` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.48)` |
| `--dp-glass-border` | `rgba(255,255,255,0.06)` | `rgba(180,170,210,0.25)` |
| `--dp-text` | `rgba(255,255,255,0.95)` | `rgba(25,30,50,0.95)` |
| `--dp-accent` | `#C4B5FD` | `#7C3AED` |
| `--dp-input-bg` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.55)` |
| `--dp-surface` | `rgba(255,255,255,0.03)` | `rgba(255,255,255,0.35)` |

### Consuming Themes

Two approaches are used in the codebase:

**CSS classes** (preferred for glass cards):

```jsx
<div className="dp-g">Glass card</div>       // Base glass card
<div className="dp-g dp-gh">Hoverable</div>  // Glass card with hover lift
<button className="dp-ib">...</button>        // 40x40 icon button
```

**Inline styles** (for dynamic values):

```jsx
const { cardBg, textPrimary, resolved } = useTheme();
const isLight = resolved === "light";

<div style={{ background: cardBg, color: textPrimary }}>
  <span style={{ color: isLight ? "#6D28D9" : "#C4B5FD" }}>Accent</span>
</div>
```

---

## Security

### Content Security Policy

`index.html` includes a CSP meta tag restricting resource origins:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob:;
connect-src 'self';
```

### HTML Sanitization

AI chat messages are rendered as HTML (for markdown formatting) using `dangerouslySetInnerHTML`. DOMPurify sanitizes the content before rendering in `src/pages/chat/AIChatScreen.jsx`.

### Input Sanitization

`src/utils/sanitize.js` provides reusable functions:

| Function | Purpose |
| --- | --- |
| `stripHtml(str)` | Remove all HTML tags |
| `escapeHtml(str)` | Escape `<`, `>`, `&`, `"`, `'` |
| `isValidEmail(email)` | Email format validation |
| `getPasswordStrength(pw)` | Returns `{ score: 0-4, label, errors[] }` |
| `sanitizeParam(param)` | Alphanumeric + dash + underscore only (URL params) |
| `sanitizeSearch(query)` | Strip dangerous chars, limit 200 chars |
| `sanitizeText(str, maxLen?)` | Strip HTML + trim + optional length limit |

### CSRF Protection

`src/utils/api.js` exports `fetchApi()`, a fetch wrapper that:

- Automatically reads `csrftoken` from cookies
- Attaches `X-CSRF-Token` header on mutating requests (POST, PUT, DELETE, etc.)
- Sets `credentials: "same-origin"`
- Parses JSON responses and throws structured errors

---

## Code Splitting

All screens except `HomeScreen` are lazy-loaded using `React.lazy()`:

```jsx
// Eagerly loaded (critical path)
import HomeScreen from "./pages/home/HomeScreen";

// Lazy loaded
var LoginScreen = lazy(function () { return import("./pages/auth/LoginScreen"); });
```

- `<Suspense>` wraps all routes with a purple spinner fallback
- `<ErrorBoundary>` wraps `<Suspense>` to catch chunk load failures and show a reload button

---

## Routes

All routes are defined in `src/App.jsx`. Every route is wrapped in `<PageTransition>`.

### Onboarding & Auth

| Path | Component | Description |
| --- | --- | --- |
| `/onboarding` | `OnboardingScreen` | First-run swipeable intro (4 slides) |
| `/login` | `LoginScreen` | Email/password + OAuth buttons (mock) |
| `/register` | `RegisterScreen` | Account creation form (mock) |
| `/forgot-password` | `ForgotPasswordScreen` | Password reset flow (mock) |
| `/change-password` | `ChangePasswordScreen` | Change existing password (mock) |

### Main

| Path | Component | Description |
| --- | --- | --- |
| `/` | `HomeScreen` | Dashboard: dream cards, XP, streaks, activity heatmap |

### Chat

| Path | Component | Description |
| --- | --- | --- |
| `/conversations` | `ConversationList` | Chat hub with search, filters, pinned conversations |
| `/chat` | `NewChatScreen` | Start a new conversation |
| `/chat/:id` | `AIChatScreen` | AI coaching conversation |
| `/buddy-chat/:id` | `BuddyChatScreen` | Peer-to-peer messaging |
| `/voice-call/:id` | `VoiceCallScreen` | Voice call UI (mock) |
| `/video-call/:id` | `VideoCallScreen` | Video call UI (mock) |

### Dreams

| Path | Component | Description |
| --- | --- | --- |
| `/dream/create` | `DreamCreateScreen` | 4-step wizard with AI goal generation |
| `/dream/templates` | `DreamTemplatesScreen` | Pre-made dream templates |
| `/dream/:id` | `DreamDetail` | Progress, milestones, goals, tasks, celebrations |
| `/dream/:id/edit` | `DreamEditScreen` | Edit dream details |
| `/dream/:id/calibration` | `CalibrationScreen` | AI-assisted goal refinement |
| `/vision-board` | `VisionBoardScreen` | Visual mood board |
| `/micro-start/:dreamId` | `MicroStartScreen` | Quick task entry |

### Social

| Path | Component | Description |
| --- | --- | --- |
| `/social` | `SocialHub` | Feed, leaderboard, online friends, friend requests |
| `/find-buddy` | `FindBuddy` | Buddy matching interface |
| `/leaderboard` | `LeaderboardScreen` | XP rankings (weekly/monthly/all-time) |
| `/search` | `UserSearchScreen` | Find users |
| `/friend-requests` | `FriendRequestsScreen` | Pending requests |
| `/online-friends` | `OnlineFriendsScreen` | Currently online contacts |
| `/user/:id` | `UserProfileScreen` | View another user's profile |
| `/circles` | `CirclesScreen` | Interest/goal circles |
| `/circle/:id` | `CircleDetailScreen` | Circle details and members |

### Calendar

| Path | Component | Description |
| --- | --- | --- |
| `/calendar` | `CalendarScreen` | Monthly view, events, task scheduling |
| `/calendar-connect` | `GoogleCalendarConnect` | Google Calendar sync UI (mock) |

### Profile

| Path | Component | Description |
| --- | --- | --- |
| `/profile` | `ProfileScreen` | Bento-grid profile: avatar, XP, skills, achievements |
| `/settings` | `SettingsScreen` | App preferences (theme, language, notifications) |
| `/edit-profile` | `EditProfileScreen` | Edit name, bio, avatar |
| `/achievements` | `AchievementsScreen` | Full achievement list |
| `/app-version` | `AppVersionScreen` | App info and version |
| `/terms` | `TermsOfServiceScreen` | Terms of service |
| `/privacy` | `PrivacyPolicyScreen` | Privacy policy |

### Store & Notifications

| Path | Component | Description |
| --- | --- | --- |
| `/store` | `StoreScreen` | XP-based cosmetics shop with rarity system |
| `/subscription` | `SubscriptionScreen` | Premium plan options |
| `/notifications` | `NotificationsScreen` | Notification center with filters |

---

## Patterns & Conventions

### Component Structure

- Each page is a single `.jsx` file in `src/pages/<section>/`
- Pages use `<PageLayout>` for consistent scrollable layout + bottom navigation
- Sub-components (cards, modals, stat blocks) are defined inside the screen file

### Styling

- **Primary approach**: Inline `style={}` objects using `useTheme()` tokens
- **Glass cards**: `className="dp-g"` for automatic glassmorphism (`blur(40px)`, border, shadow, `borderRadius: 20px`)
- **Glass hover**: `className="dp-g dp-gh"` adds hover lift effect
- **Icon buttons**: `className="dp-ib"` for 40x40 rounded buttons
- **Icons**: All from `lucide-react`, imported individually

### Animations

- **Entry**: Elements start with `className="dp-a"`, then add `"dp-s"` when mounted (opacity 0 → 1, translateY 18px → 0)
- **Staggered**: Apply `animationDelay: "${index * 60}ms"` for cascading entrances
- **Keyframes**: `dpPulse` (glow), `dpShimmer` (skeleton loading), `dpSpin` (spinner)
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` used throughout for elastic feel
- **Page transitions**: Automatic via `<PageTransition>` (150ms fade + translateY)

### Toasts

```jsx
import { useToast } from "../context/ToastContext";

const { showToast } = useToast();
showToast("Dream created!", "success");          // Green
showToast("Something went wrong", "error");      // Red
showToast("Check your connection", "warning");   // Amber
showToast("New feature available", "info");       // Purple
```

### Network Status

```jsx
import { useNetwork } from "../context/NetworkContext";

const { isOnline } = useNetwork();
if (!isOnline) { /* show offline state */ }
```

### API Calls

```jsx
import { fetchApi } from "../utils/api";

// GET (no CSRF token needed)
const dreams = await fetchApi("/api/dreams");

// POST (CSRF token auto-attached)
await fetchApi("/api/dreams", { method: "POST", body: { title: "Learn Piano" } });
```

### Haptic Feedback

```jsx
import { hapticLight, hapticMedium, hapticHeavy } from "../utils/haptics";

hapticLight();   // 10ms vibration (button taps)
hapticMedium();  // 25ms vibration (confirmations)
hapticHeavy();   // Pattern vibration (errors, alerts)
```

### Skeleton Loading

```jsx
import { DreamCardSkeleton, ConversationSkeleton, StatsSkeleton } from "../components/shared/Skeleton";

// Show while loading, then replace with real content
{loading ? <DreamCardSkeleton /> : <DreamCard data={dream} />}
```

### Internationalization

```jsx
import { useT } from "../context/I18nContext";

const { t, locale, setLocale } = useT();
<h1>{t("home.welcome")}</h1>
<button onClick={() => setLocale("fr")}>Francais</button>
```

Translation keys are in `src/i18n/en.json` and `src/i18n/fr.json` using flat dot notation (e.g., `"nav.home"`, `"settings.language"`).

### Persisted State

| Key | Storage | Type | Purpose |
| --- | --- | --- | --- |
| `dp-theme` | localStorage | `"cosmos"` / `"default"` / `"saturn"` | Selected visual theme |
| `dp-force-mode` | localStorage | `"day"` / `"night"` / null | Twilight manual override |
| `dp-language` | localStorage | `"en"` / `"fr"` | Selected locale |
| `dp-onboarded` | localStorage | `"true"` | Skip onboarding on repeat visits |
| `dp-streak` | localStorage | JSON | Cached streak data |
| `dp-notif-asked` | localStorage | `"true"` | Notification permission already requested |
| `dp-unread-notifs` | localStorage | number string | Unread notification count |
| `dp-recent-searches` | localStorage | JSON array | GlobalSearch history |
| `dp-vision-order` | localStorage | JSON array | Vision board card ordering |
| `dp-timezone` | localStorage | string | User's timezone setting |
| `dp-splash-shown` | sessionStorage | `"1"` | Splash screen shown this session |

---

## Mock Data & Backend Integration

### What Is Mocked

Everything in `src/data/mockData.js`:

| Feature | Status | Integration Point |
| --- | --- | --- |
| Authentication | Mock — login/register are UI only | Replace with real auth (JWT/session) |
| AI Chat | Static messages, no LLM | Connect to AI API, render with DOMPurify |
| Dream CRUD | Local mock data | REST API via `fetchApi()` |
| Social features | Hardcoded users, feed, leaderboard | REST API endpoints |
| Store / Payments | Display only, no transactions | Payment provider SDK |
| Calendar sync | Google Calendar connect is UI only | Google Calendar API |
| Voice / Video calls | UI screens only, no WebRTC | WebRTC or call SDK |
| Notifications | Triggered locally, not from server | Push notification server |

### What Is Real

- PWA install + offline caching (Workbox service worker)
- Theme persistence and dynamic switching
- Locale switching (en/fr) with localStorage persistence
- System notifications + vibration for task reminders (requires permission)
- Wake lock API (keeps screen on during task calls)
- Canvas-based dream card PNG export (`exportDreamCard.js`)
- Network status detection (online/offline banner)
- Error boundary with reload

---

## PWA Configuration

Defined in `vite.config.js` using `vite-plugin-pwa`:

- **Manifest**: App name "DreamPlanner", standalone display, portrait orientation, theme color `#1A1535`
- **Service worker**: `autoUpdate` registration (updates in background, no prompt)
- **Custom SW**: `public/sw-custom.js` handles notification click events to bring the app to the foreground
- **Precaching**: All static assets (`**/*.{js,css,html,ico,png,svg,woff2}`)
- **Runtime caching**: Google Fonts cached with `CacheFirst` strategy (365-day expiration, max 10 entries)
- **Font loading**: Inter (300-800 weights) with `preconnect` optimization

---

## Known Limitations

- **No test suite** — no Jest, Vitest, or Cypress
- **No linting/formatting** — no ESLint or Prettier config
- **No CI/CD pipeline**
- **No TypeScript** — `@types/react` is in devDependencies but all files are `.jsx`
- **`var` usage** — some context files use `var` instead of `const`/`let`
- **Mobile-first only** — UI is optimized for ~480px width; desktop layout needs work
- **No error tracking** — no Sentry or similar integration
