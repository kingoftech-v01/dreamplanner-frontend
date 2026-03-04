# Auth Pages

Authentication screens: login, registration, password management, and 2FA verification.

## Overview

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| **LoginScreen** | `/login` | Guest | Email/password login, social auth, 2FA challenge |
| **RegisterScreen** | `/register` | Guest | Email/password registration |
| **ForgotPasswordScreen** | `/forgot-password` | Guest | Password reset via email |
| **ChangePasswordScreen** | `/change-password` | Protected | Change password (requires current password) |

---

## LoginScreen.jsx

Email/password login with social auth (Google, Apple) and 2FA support.

### Flow

1. User enters email + password → `POST /api/auth/login/`
2. **If 2FA not enabled:** JWT tokens returned → `setToken()` → `fetchUser()` → redirect to home
3. **If 2FA enabled:** Backend returns `{ tfaRequired: true, challengeToken: "..." }`
   - UI switches to OTP input screen
   - User enters 6-digit code → `POST /api/auth/2fa-challenge/` with `{ challengeToken, code }`
   - JWT tokens returned → `setToken()` → `refreshUser()` → redirect to home

### Social Auth

- **Google:** Redirects to Google OAuth, extracts token from callback URL
- **Apple:** Uses Apple JS SDK, extracts `id_token` from response
- Both call `socialLogin(provider, accessToken)` from `AuthContext`

### State

| State | Type | Description |
|-------|------|-------------|
| `email` | string | Email input |
| `password` | string | Password input |
| `tfaRequired` | boolean | Whether to show 2FA input |
| `tfaChallengeToken` | string | Signed challenge token from backend |
| `tfaCode` | string | User-entered OTP code |
| `loading` | boolean | Login in progress |
| `error` | string | Error message |

---

## RegisterScreen.jsx

New account registration with email, display name, and password.

### Fields

| Field | Validation |
|-------|-----------|
| `email` | Required, valid email format |
| `displayName` | Required |
| `password1` | Required, min 8 chars |
| `password2` | Required, must match password1 |

### Flow

1. Validate all fields → `register()` from `AuthContext`
2. `POST /api/auth/registration/` → auto-login with returned JWT
3. Redirect to onboarding or home

---

## ForgotPasswordScreen.jsx

Request password reset email.

### Flow

1. User enters email → `POST /api/auth/password/reset/`
2. Backend sends reset email with token link (rate limited: 5/min)
3. Shows success message with instruction to check email

---

## ChangePasswordScreen.jsx

Change password for authenticated users. Route is wrapped in `ProtectedRoute`.

### Fields

| Field | Validation |
|-------|-----------|
| `currentPassword` | Required |
| `newPassword1` | Required, min 8 chars, strength check |
| `newPassword2` | Required, must match newPassword1 |

### Flow

1. Validate fields → `POST /api/auth/password/change/`
2. Shows success toast on completion
3. Backend endpoint is rate limited

---

## API Endpoints Used

| Method | Endpoint | Screen | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login/` | LoginScreen | Email/password login |
| POST | `/api/auth/2fa-challenge/` | LoginScreen | Verify 2FA code with challenge token |
| POST | `/api/auth/registration/` | RegisterScreen | Create new account |
| POST | `/api/auth/google/` | LoginScreen | Google OAuth |
| POST | `/api/auth/apple/` | LoginScreen | Apple OAuth |
| POST | `/api/auth/password/reset/` | ForgotPasswordScreen | Request reset email |
| POST | `/api/auth/password/change/` | ChangePasswordScreen | Change password |
