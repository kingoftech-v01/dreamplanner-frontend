# Profile Pages

User profile management, settings, achievements, 2FA, data export, and legal documents.

## Overview

| Screen | Route | Description |
|--------|-------|-------------|
| **ProfileScreen** | `/profile` | User profile with stats, badges, subscription tier |
| **EditProfileScreen** | `/profile/edit` | Edit display name, bio, avatar |
| **SettingsScreen** | `/settings` | Notification, privacy, language, theme preferences |
| **AchievementsScreen** | `/achievements` | Achievement badges with sharing |
| **TwoFactorScreen** | `/two-factor` | 2FA setup with QR code and backup codes |
| **BlockedUsersScreen** | `/blocked-users` | Manage blocked users |
| **DataExportScreen** | `/data-export` | GDPR data export |
| **PrivacyPolicyScreen** | `/privacy` | Privacy policy document |
| **TermsOfServiceScreen** | `/terms` | Terms of service document |
| **AppVersionScreen** | `/app-version` | App version info and update check |

---

## ProfileScreen.jsx

User profile overview.

### Sections

- **Avatar** — With badge frame and decoration from equipped items
- **Stats** — XP, level, rank, streak, influence score
- **RPG attributes** — Discipline, Learning, Wellbeing, Career, Creativity
- **Subscription** — Current tier with upgrade button
- **Quick links** — Settings, achievements, 2FA, data export
- **Logout** — Logout button

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me/` | User profile |
| GET | `/api/users/gamification/` | Gamification profile (XP, level, rank) |
| GET | `/api/users/stats/` | User statistics |

---

## EditProfileScreen.jsx

Edit user profile details.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | string | Display name |
| `bio` | textarea | User biography |
| `avatar` | image | Upload avatar (camera or gallery) |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/users/me/` | Update profile fields |
| POST | `/api/users/upload_avatar/` | Upload avatar image |

---

## SettingsScreen.jsx

App settings organized by category.

### Sections

- **Notifications** — Per-type and per-channel toggles, DND hours
- **Privacy** — Profile visibility, activity visibility
- **Language** — Switch between 16 supported languages
- **Theme** — Switch visual theme (cosmos, default, saturn), force mode
- **Account** — Change email, change password, delete account

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/users/notification-preferences/` | Update notification preferences |
| POST | `/api/users/change-email/` | Request email change |
| DELETE | `/api/users/delete-account/` | GDPR account deletion |

---

## AchievementsScreen.jsx

Achievement badge gallery.

### Features

- **Unlocked achievements** — Full color with unlock date
- **Locked achievements** — Greyed out with progress indicator
- **Share** — Open `AchievementShareModal` to share via native share or clipboard
- **Categories** — Filter by achievement category

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/achievements/` | List all achievements with unlock status |

---

## TwoFactorScreen.jsx

Two-Factor Authentication setup and management.

### Flow

1. `GET /api/users/2fa/status/` — Check if 2FA is enabled
2. **Enable 2FA:**
   - `POST /api/users/2fa/setup/` — Generate TOTP secret + QR code
   - User scans QR code in authenticator app
   - `POST /api/users/2fa/verify/` — Verify first code to enable
   - Display backup codes (one-time view)
3. **Disable 2FA:**
   - `POST /api/users/2fa/disable/` — Disable with password confirmation
4. **Regenerate backup codes:**
   - `POST /api/users/2fa/backup-codes/` — Generate new codes

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/2fa/status/` | Check 2FA status |
| POST | `/api/users/2fa/setup/` | Generate TOTP secret + QR code |
| POST | `/api/users/2fa/verify/` | Verify TOTP code to enable 2FA |
| POST | `/api/users/2fa/disable/` | Disable 2FA |
| POST | `/api/users/2fa/backup-codes/` | Regenerate backup codes |

---

## DataExportScreen.jsx

GDPR data export.

### Flow

1. `GET /api/users/export-data/` — Request data export
2. Backend generates JSON/PDF asynchronously via Celery
3. Download link emailed to user when ready

---

## BlockedUsersScreen.jsx

Manage blocked users.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/social/blocked/` | List blocked users |
| DELETE | `/api/social/unblock/{id}/` | Unblock user |

---

## PrivacyPolicyScreen.jsx / TermsOfServiceScreen.jsx

Static legal documents rendered from hardcoded content.

---

## AppVersionScreen.jsx

Display current app version, build number, and check for updates.
