# Store Pages

In-app store, subscription management, and gifting.

## Overview

| Screen | Route | Description |
|--------|-------|-------------|
| **StoreScreen** | `/store` | Browse cosmetic items (skins, frames, decorations) |
| **SubscriptionScreen** | `/subscription` | Subscription tiers, pricing, checkout |
| **GiftingScreen** | `/gifting` | Send store items as gifts to friends |

---

## StoreScreen.jsx

Browse and purchase cosmetic items.

### Sections

- **Featured items** — Curated selection
- **Categories** — Browse by category (skins, badge frames, decorations, chat bubbles)
- **Item detail** — Preview, price (XP or USD), purchase button
- **Inventory** — View owned items, equip/unequip
- **Wishlist** — Saved items for later
- **Purchase history** — Past purchases with refund option

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/store/items/` | List store items (searchable, filterable) |
| GET | `/api/store/items/featured/` | Featured items |
| GET | `/api/store/categories/` | List categories |
| GET | `/api/store/inventory/` | User's owned items |
| POST | `/api/store/inventory/{id}/equip/` | Equip/unequip item |
| POST | `/api/store/purchase/` | Initiate Stripe purchase |
| POST | `/api/store/purchase/confirm/` | Confirm Stripe purchase |
| POST | `/api/store/purchase/xp/` | Purchase with XP |
| GET | `/api/store/wishlist/` | List wishlist |
| POST | `/api/store/wishlist/` | Add to wishlist |
| DELETE | `/api/store/wishlist/{id}/` | Remove from wishlist |
| GET | `/api/store/inventory/history/` | Purchase history |
| POST | `/api/store/refunds/` | Request refund |

---

## SubscriptionScreen.jsx

Subscription tier comparison and checkout.

### Tiers

| Tier | Price | Key Features |
|------|-------|--------------|
| **Free** | $0 | 3 dreams, no AI |
| **Premium** | $14.99/mo | 10 dreams, full AI, priority support |
| **Pro** | $29.99/mo | Unlimited dreams, all features |

### Flow

1. Display tier comparison table
2. User selects tier → `POST /api/subscriptions/subscription/checkout/`
3. Redirect to Stripe Checkout session
4. On return, subscription activated via webhook
5. **Billing portal:** `POST /api/subscriptions/subscription/portal/` → Stripe billing management

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/plans/` | List subscription plans |
| GET | `/api/subscriptions/subscription/current/` | Current subscription |
| POST | `/api/subscriptions/subscription/checkout/` | Create Stripe checkout |
| POST | `/api/subscriptions/subscription/portal/` | Stripe billing portal |
| POST | `/api/subscriptions/subscription/cancel/` | Cancel subscription |
| POST | `/api/subscriptions/subscription/reactivate/` | Reactivate subscription |
| GET | `/api/subscriptions/invoices/` | Invoice history |

---

## GiftingScreen.jsx

Send store items as gifts to friends.

### Flow

1. Select item from inventory or store
2. Select recipient friend
3. Add optional gift message
4. `POST /api/store/gifts/send/` — Send gift
5. Recipient claims via `POST /api/store/gifts/{id}/claim/`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/store/gifts/send/` | Send gift |
| POST | `/api/store/gifts/{id}/claim/` | Claim received gift |
| GET | `/api/store/gifts/` | List sent/received gifts |
