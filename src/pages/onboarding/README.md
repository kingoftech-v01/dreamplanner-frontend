# Onboarding Page

Multi-step onboarding flow for new users after registration.

## OnboardingScreen.jsx

**Route:** `/onboarding`

### Steps

1. **Welcome** — Introduction to DreamPlanner
2. **Language** — Select preferred language (16 supported)
3. **Theme** — Choose visual theme (cosmos, default, saturn)
4. **Goals** — Set initial dream/goal preferences
5. **Subscription** — Overview of subscription tiers (optional upgrade)

### Flow

1. Shown after first login if `user.hasOnboarded === false`
2. User progresses through steps (can skip)
3. On completion: `POST /api/users/complete-onboarding/`
4. Sets `user.hasOnboarded = true` in `AuthContext`
5. Redirects to home screen

### API Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/complete-onboarding/` | Mark onboarding as completed |
