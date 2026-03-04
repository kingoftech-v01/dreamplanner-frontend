# Shared Components

Reusable UI components used across all screens. Built with glassmorphism design, theme-aware CSS variables, and responsive layout.

## Overview

### Layout

| Component | Props | Purpose |
|-----------|-------|---------|
| **PageLayout** | `children`, `header`, `showNav=true` | Main app layout: fixed header, scrollable content, bottom nav. Desktop: sidebar nav with offset. |
| **GlassAppBar** | `left`, `title`, `right`, `subtitle`, `style`, `className` | Fixed header bar with left/right slots |
| **BottomNav** | — | Mobile: 5-tab bottom navigation. Desktop: sidebar with labels. Active tab highlighted. |
| **PageTransition** | `children` | Animated route transitions (CSS-based) |

### Cards & Containers

| Component | Props | Purpose |
|-----------|-------|---------|
| **GlassCard** | `children`, `hover`, `padding`, `mb`, `radius`, `onClick`, `className` | Glassmorphism card (`dp-g` class, `dp-gh` for hover effect) |
| **GlassModal** | `isOpen`, `title`, `children`, `onClose`, `actions`, `size` | Modal dialog with glass styling and backdrop |

### Inputs & Buttons

| Component | Props | Purpose |
|-----------|-------|---------|
| **GlassInput** | `label`, `placeholder`, `value`, `onChange`, `type`, `error`, `size`, `icon`, `onIcon` | Glass-styled input field with optional icon button |
| **GradientButton** | `children`, `onClick`, `variant`, `size`, `disabled`, `loading`, `icon` | Primary action button with gradient background |
| **IconButton** | `icon`, `onClick`, `size`, `tooltip`, `ariaLabel` | Circular icon-only button |
| **PillTabs** | `tabs`, `active`, `onChange` | Horizontal pill-shaped tab navigation |

### Auth & Navigation Guards

| Component | Props | Purpose |
|-----------|-------|---------|
| **ProtectedRoute** | `children` | Redirects unauthenticated users to `/login`. Shows loading during session restore. |
| **GuestRoute** | `children` | Redirects authenticated users away from auth pages (login, register) |
| **SubscriptionGate** | `requiredTier`, `children`, `fallback` | Show content only if user has required subscription tier |

### User & Identity

| Component | Props | Purpose |
|-----------|-------|---------|
| **Avatar** | `name`, `size`, `color`, `src`, `shape`, `online`, `badgeFrame`, `decoration` | User avatar with initials fallback, online indicator, badge frame glow, emoji decoration |
| **AchievementShareModal** | `achievement`, `isOpen`, `onClose` | Modal to share achievement card via native share or clipboard |

### Content Display

| Component | Props | Purpose |
|-----------|-------|---------|
| **ExpandableText** | `text`, `maxLines=3`, `fontSize`, `color`, `lineHeight`, `style` | Truncated text with "read more" / "show less" toggle |
| **Skeleton** | `width`, `height`, `circle` | Loading placeholder (animated shimmer) |
| **EmptyState** | `icon`, `title`, `subtitle`, `action`, `onAction` | Empty list state with icon and call-to-action button |
| **ErrorState** | `message` | Error display with alert icon |

### Notifications & Feedback

| Component | Props | Purpose |
|-----------|-------|---------|
| **Toast** | `toasts`, `onDismiss` | Toast notification stack renderer (max 3 visible) |
| **OfflineBanner** | — | Slides in when network is lost (reads from `NetworkContext`) |

### Overlays

| Component | Props | Purpose |
|-----------|-------|---------|
| **IncomingCallOverlay** | — | Incoming buddy call notification with accept/reject buttons. Listens for `dp-incoming-call` event. |
| **TaskCallOverlay** | — | Full-screen task reminder with start/snooze buttons. Reads from `TaskCallContext`. |
| **GlobalSearch** | `isOpen`, `onClose` | Cmd+K search overlay with recent searches and results |

### Backgrounds

| Component | Props | Purpose |
|-----------|-------|---------|
| **ThemeBackground** | `children` | Routes to correct background based on current visual theme |
| **CosmicBackground** | `children` | Animated canvas starfield (cosmos theme) |
| **TwilightBackground** | `children` | Dynamic day/night sky with sun interpolation (default theme) |
| **SaturnBackground** | `children` | Sci-fi ringed planet canvas (saturn theme) |

### Other

| Component | Props | Purpose |
|-----------|-------|---------|
| **SplashScreen** | — | Animated splash screen shown once per session on app load |
| **ErrorBoundary** | `children` | Class component that catches render errors and shows fallback UI |

---

## Glass Design System

All components use CSS variables from `ThemeContext` for consistent theming.

### CSS Classes

| Class | Purpose |
|-------|---------|
| `dp-g` | Glass card effect: backdrop blur + semi-transparent background |
| `dp-gh` | Glass card with hover effect (slight brightness increase) |
| `dp-ib` | Icon button: circular with glass background |

### CSS Variables

| Variable | Dark Value | Light Value |
|----------|-----------|-------------|
| `--dp-glass-bg` | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.48)` |
| `--dp-text` | `rgba(255,255,255,0.95)` | `rgba(25,30,50,0.95)` |
| `--dp-text-secondary` | `rgba(255,255,255,0.6)` | `rgba(25,30,50,0.6)` |
| `--dp-accent` | `#C4B5FD` | `#7C3AED` |
| `--dp-badge-bg` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` |

### Responsive Layout

- **Mobile** (< 768px): Bottom navigation, full-width content
- **Desktop** (>= 768px): Sidebar navigation (left), content offset with `dp-desktop-main` class
- `PageLayout` handles the responsive switch via the `showNav` prop
