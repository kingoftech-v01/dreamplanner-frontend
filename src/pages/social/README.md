# Social Pages

Social features: feed, friends, buddies, circles, leaderboards, user profiles, posts, and search.

## Overview

| Screen | Route | Description |
|--------|-------|-------------|
| **SocialHub** | `/social` | Social feed with friends' posts and explore tab |
| **UserProfileScreen** | `/user/:id` | View another user's profile |
| **UserSearchScreen** | `/search/users` | Search and add friends |
| **FindBuddy** | `/find-buddy` | Browse buddy compatibility matches |
| **BuddyRequestsScreen** | `/buddy-requests` | Incoming buddy pairing requests |
| **FriendRequestsScreen** | `/friend-requests` | Friend connection requests |
| **OnlineFriendsScreen** | `/online-friends` | Real-time online friend list |
| **CirclesScreen** | `/circles` | List of joined circles |
| **CircleCreateScreen** | `/circles/create` | Create new circle |
| **CircleDetailScreen** | `/circle/:id` | Circle info, members, feed, challenges |
| **CircleInvitationsScreen** | `/circle-invitations` | Pending circle invitations |
| **LeaderboardScreen** | `/leaderboard` | Global, league, and friend leaderboards |
| **PostDetailScreen** | `/post/:id` | Single post with threaded comments |
| **SavedPostsScreen** | `/saved-posts` | Bookmarked posts |

---

## SocialHub.jsx

Main social feed with tabs for different content views.

### Tabs

- **Feed** — Posts from followed users and friends
- **Explore** — Public posts and trending content
- **Events** — Social events (if available)

### Features

- **Post creation** — Create dream posts with text, images, visibility controls
- **Like, comment, encourage** — Interactions on posts
- **Share/repost** — Share posts to own feed
- **Infinite scroll** — via `useInfiniteList` hook

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/social/posts/feed/` | Social feed |
| POST | `/api/social/posts/` | Create dream post |
| POST | `/api/social/posts/{id}/like/` | Toggle like |
| POST | `/api/social/posts/{id}/comment/` | Add comment |
| POST | `/api/social/posts/{id}/encourage/` | Send encouragement |
| POST | `/api/social/posts/{id}/share/` | Share/repost |

---

## UserProfileScreen.jsx

View another user's profile with social actions.

### Sections

- **Profile header** — Avatar, display name, bio, stats
- **Social counts** — Followers, following, friends
- **Action buttons** — Follow/unfollow, friend request, message, block/report
- **Dream posts** — User's public posts
- **Achievements** — Public achievement badges

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/{id}/` | User profile |
| GET | `/api/social/counts/{id}/` | Follower/following/friend counts |
| GET | `/api/social/posts/user/{id}/` | User's posts |
| POST | `/api/social/follow/` | Follow user |
| DELETE | `/api/social/unfollow/{id}/` | Unfollow user |
| POST | `/api/social/friends/request/` | Send friend request |
| POST | `/api/social/block/` | Block user |
| POST | `/api/social/report/` | Report user |

---

## UserSearchScreen.jsx

Search users by name or email.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/social/users/search?q=...` | Search users |
| GET | `/api/social/follow-suggestions/` | Follow suggestions |

---

## FindBuddy.jsx

Browse AI-powered buddy compatibility matches.

### Flow

1. `POST /api/buddies/find-match/` — Get compatible buddy suggestions
2. View match profiles with compatibility score
3. `POST /api/buddies/pair/` — Send buddy request

---

## BuddyRequestsScreen.jsx

Incoming buddy pairing requests with accept/reject actions.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/buddies/requests/` | List pending requests |
| POST | `/api/buddies/{id}/accept/` | Accept pairing |
| POST | `/api/buddies/{id}/reject/` | Reject pairing |

---

## FriendRequestsScreen.jsx

Friend connection requests (received and sent).

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/social/friends/requests/pending/` | Received requests |
| GET | `/api/social/friends/requests/sent/` | Sent requests |
| POST | `/api/social/friends/accept/{id}/` | Accept request |
| POST | `/api/social/friends/reject/{id}/` | Reject request |

---

## OnlineFriendsScreen.jsx

Real-time online status of friends via Agora RTM presence.

### Features

- Uses `useAgoraPresence()` hook with friend user IDs
- Green indicator for online friends
- Tap to open profile or start chat

---

## CirclesScreen.jsx

List of circles with filter tabs.

### Tabs

- **My Circles** — Circles the user belongs to
- **Public** — Discoverable public circles
- **Recommended** — AI-suggested circles

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/circles/?filter=my` | User's circles |
| GET | `/api/circles/?filter=public` | Public circles |
| GET | `/api/circles/?filter=recommended` | Recommended circles |

---

## CircleDetailScreen.jsx

Circle information, members, feed, and challenges.

### Sections

- **Header** — Circle name, description, avatar, member count
- **Feed** — Circle posts with reactions
- **Members** — Member list with roles (owner/moderator/member)
- **Challenges** — Active circle challenges with progress
- **Chat** — Link to circle chat
- **Call** — Start/join voice or video call

### Sub-Components (circles/ subfolder)

| Component | Purpose |
|-----------|---------|
| **CircleFeedPost** | Post card for circle feed with reactions |
| **CircleInviteSheet** | Bottom sheet modal to invite members |
| **CircleMembersSheet** | Bottom sheet with member list + role management |
| **CircleChallengeSheet** | Challenge detail with progress and leaderboard |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/circles/{id}/` | Circle detail |
| GET | `/api/circles/{id}/feed/` | Circle post feed |
| POST | `/api/circles/{id}/posts/` | Create post |
| POST | `/api/circles/{id}/posts/{pid}/react/` | React to post |
| GET | `/api/circles/{id}/challenges/` | List challenges |
| POST | `/api/circles/{id}/call/start/` | Start voice/video call |
| POST | `/api/circles/{id}/call/join/` | Join active call |
| POST | `/api/circles/{id}/members/{mid}/promote/` | Promote to moderator |
| POST | `/api/circles/{id}/members/{mid}/demote/` | Demote from moderator |
| POST | `/api/circles/{id}/members/{mid}/remove/` | Remove member |

---

## CircleCreateScreen.jsx

Create a new circle with name, description, and privacy settings.

### Fields

| Field | Type | Validation |
|-------|------|-----------|
| `name` | string | Required |
| `description` | textarea | Optional |
| `isPublic` | boolean | Public or private circle |
| `avatar` | image | Optional circle avatar |

---

## LeaderboardScreen.jsx

Multi-tab leaderboard views.

### Tabs

- **Global** — Top 100 users by influence score
- **League** — Current league tier leaderboard
- **Friends** — Friends leaderboard
- **Nearby** — Users ranked near current user

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leagues/leaderboard/global/` | Global top 100 |
| GET | `/api/leagues/leaderboard/league/` | League leaderboard |
| GET | `/api/leagues/leaderboard/friends/` | Friends leaderboard |
| GET | `/api/leagues/leaderboard/nearby/` | Nearby ranked users |
| GET | `/api/leagues/leaderboard/me/` | Current user standing |

---

## PostDetailScreen.jsx

Single post view with threaded comments.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/social/posts/{id}/` | Post detail |
| GET | `/api/social/posts/{id}/comments/` | Threaded comments |
| POST | `/api/social/posts/{id}/comment/` | Add comment |
| POST | `/api/social/posts/{id}/like/` | Toggle like |

---

## SavedPostsScreen.jsx

Bookmarked/saved posts.

### API Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/social/posts/saved/` | Saved posts |
