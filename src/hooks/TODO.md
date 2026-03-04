# Hooks — TODO

Feature ideas and improvements for custom React hooks.

---

## useNotificationSocket

- [ ] **Reconnection indicator** — Show UI indicator when WebSocket is reconnecting
- [ ] **Notification sound** — Play sound on new notification (configurable per type)
- [ ] **Focus-based behavior** — Batch notifications when tab is unfocused, show on focus
- [ ] **Priority filtering** — High-priority notifications bypass debounce

## useInfiniteList

- [ ] **Cursor-based pagination** — Support cursor pagination alongside offset pagination
- [ ] **Optimistic updates** — Optimistic add/remove/update items in the list
- [ ] **Pull-to-refresh** — Built-in pull-to-refresh support
- [ ] **Empty/error states** — Built-in empty and error state rendering
- [ ] **Item virtualization** — Integrate virtual scrolling for large lists

## useAgoraPresence

- [ ] **Last seen timestamp** — Show "last seen X minutes ago" for offline users
- [ ] **Activity status** — Beyond online/offline: "busy", "in a call", "do not disturb"
- [ ] **Typing indicators** — Show typing status in user list (not just in chat)

## New Hooks

- [ ] **useDebounce** — Generic debounce hook for search inputs and API calls
- [ ] **useMediaQuery** — Responsive breakpoint detection hook
- [ ] **useLocalStorage** — Type-safe localStorage hook with serialization
- [ ] **useGeolocation** — Location access for location-based features
- [ ] **usePrevious** — Track previous value of a state/prop for comparison
- [ ] **useIntersectionObserver** — Generic intersection observer hook (reusable beyond infinite lists)
- [ ] **useClipboard** — Copy-to-clipboard with success feedback
- [ ] **useFormValidation** — Reusable form validation hook with field-level errors
