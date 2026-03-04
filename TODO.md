# DreamPlanner Frontend — TODO

Feature ideas and improvements for the frontend application.

---

## High Priority

- [ ] **Add test suite** — Set up Vitest + React Testing Library for unit/integration tests
- [ ] **Add ESLint + Prettier** — Configure linting and formatting for code consistency
- [ ] **Migrate Google OAuth to PKCE** — Replace implicit flow with Authorization Code + PKCE
- [ ] **Desktop layout polish** — Improve responsive layout for desktop viewports (>1024px)
- [ ] **Accessibility audit** — WCAG 2.1 AA compliance (focus management, screen reader support, keyboard navigation)
- [ ] **Remove CSP unsafe-eval** — Blocked by Agora SDK; migrate to RTM v2 when CSP-compliant build available

## Performance

- [ ] **Route-based code splitting** — Lazy-load all page components (currently only some are lazy)
- [ ] **Image optimization** — WebP/AVIF format support with lazy loading for avatars and vision boards
- [ ] **Virtual scrolling** — Use react-window or react-virtuoso for long lists (notifications, feed, conversations)
- [ ] **Service Worker caching** — Cache API responses for offline-first experience
- [ ] **Bundle analysis** — Set up webpack-bundle-analyzer or vite-plugin-visualizer to identify large dependencies
- [ ] **Prefetching** — Prefetch likely next routes on hover (e.g., dream detail from dream list)

## UX Improvements

- [ ] **Skeleton screens** — Add skeleton loading for all screens (currently only some have it)
- [ ] **Pull-to-refresh** — Native-feeling pull-to-refresh on all list screens
- [ ] **Swipe gestures** — Swipe-to-delete, swipe-to-complete on tasks and notifications
- [ ] **Haptic feedback everywhere** — Add haptic feedback on all interactive elements (not just some)
- [ ] **Transition animations** — Smooth page transitions with shared element animations
- [ ] **Error recovery** — Better error states with retry buttons and helpful messages on all screens
- [ ] **Empty states** — Custom illustrated empty states for every list screen

## iOS Support

- [ ] **iOS native build** — Add Capacitor iOS platform support
- [ ] **Apple Pay** — In-app purchases via Apple Pay for subscriptions
- [ ] **iOS-specific UI** — Adapt UI for iOS conventions (navigation patterns, safe areas)
- [ ] **App Store submission** — Prepare for App Store review (privacy labels, screenshots, metadata)

## Developer Experience

- [ ] **Storybook** — Component library documentation with Storybook
- [ ] **TypeScript migration** — Gradual migration from JSX to TSX for type safety
- [ ] **E2E tests** — Cypress or Playwright end-to-end test suite
- [ ] **CI/CD pipeline** — Automated build, test, and deploy on PR merge
- [ ] **Error boundary improvements** — Per-route error boundaries with better recovery options
