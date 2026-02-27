// ─── DreamPlanner Backend URL Constants ─────────────────────────────
// Single source of truth for ALL backend API endpoints.
// Every screen imports from here — no hardcoded URLs anywhere else.

// ─── Auth ────────────────────────────────────────────────────────────
export var AUTH = {
  LOGIN:           "/api/auth/login/",
  LOGOUT:          "/api/auth/logout/",
  REGISTER:        "/api/auth/registration/",
  PASSWORD_CHANGE: "/api/auth/password/change/",
  PASSWORD_RESET:  "/api/auth/password/reset/",
  PASSWORD_RESET_CONFIRM: "/api/auth/password/reset/confirm/",
  USER:            "/api/auth/user/",
  GOOGLE:          "/api/auth/google/",
  APPLE:           "/api/auth/apple/",
  APPLE_REDIRECT:  "/api/auth/apple/redirect/",
};

// ─── Users ───────────────────────────────────────────────────────────
export var USERS = {
  ME:                     "/api/users/me/",
  UPDATE_PROFILE:         "/api/users/update_profile/",
  GAMIFICATION:           "/api/users/gamification/",
  AI_USAGE:               "/api/users/ai-usage/",
  UPLOAD_AVATAR:          "/api/users/upload_avatar/",
  STATS:                  "/api/users/stats/",
  DELETE_ACCOUNT:         "/api/users/delete-account/",
  EXPORT_DATA:            "/api/users/export-data/",
  CHANGE_EMAIL:           "/api/users/change-email/",
  DASHBOARD:              "/api/users/dashboard/",
  ACHIEVEMENTS:           "/api/users/achievements/",
  NOTIFICATION_PREFS:     "/api/users/notification-preferences/",
  COMPLETE_ONBOARDING:    "/api/users/complete-onboarding/",
  PROFILE: function (id) { return "/api/users/" + id + "/"; },
  TFA: {
    SETUP:        "/api/users/2fa/setup/",
    VERIFY:       "/api/users/2fa/verify/",
    DISABLE:      "/api/users/2fa/disable/",
    STATUS:       "/api/users/2fa/status/",
    BACKUP_CODES: "/api/users/2fa/backup-codes/",
  },
};

// ─── Dreams ──────────────────────────────────────────────────────────
export var DREAMS = {
  LIST:                   "/api/dreams/dreams/",
  DETAIL: function (id) { return "/api/dreams/dreams/" + id + "/"; },
  ANALYZE: function (id) { return "/api/dreams/dreams/" + id + "/analyze/"; },
  START_CALIBRATION: function (id) { return "/api/dreams/dreams/" + id + "/start_calibration/"; },
  ANSWER_CALIBRATION: function (id) { return "/api/dreams/dreams/" + id + "/answer_calibration/"; },
  SKIP_CALIBRATION: function (id) { return "/api/dreams/dreams/" + id + "/skip_calibration/"; },
  GENERATE_PLAN: function (id) { return "/api/dreams/dreams/" + id + "/generate_plan/"; },
  GENERATE_TWO_MIN: function (id) { return "/api/dreams/dreams/" + id + "/generate_two_minute_start/"; },
  GENERATE_VISION: function (id) { return "/api/dreams/dreams/" + id + "/generate_vision/"; },
  VISION_BOARD: function (id) { return "/api/dreams/dreams/" + id + "/vision-board/"; },
  VISION_BOARD_ADD: function (id) { return "/api/dreams/dreams/" + id + "/vision-board/add/"; },
  VISION_BOARD_DELETE: function (id, imgId) { return "/api/dreams/dreams/" + id + "/vision-board/" + imgId + "/"; },
  PROGRESS_HISTORY: function (id) { return "/api/dreams/dreams/" + id + "/progress-history/"; },
  COMPLETE: function (id) { return "/api/dreams/dreams/" + id + "/complete/"; },
  DUPLICATE: function (id) { return "/api/dreams/dreams/" + id + "/duplicate/"; },
  SHARE: function (id) { return "/api/dreams/dreams/" + id + "/share/"; },
  UNSHARE: function (id, userId) { return "/api/dreams/dreams/" + id + "/unshare/" + userId + "/"; },
  TAGS: function (id) { return "/api/dreams/dreams/" + id + "/tags/"; },
  TAG_DELETE: function (id, tagName) { return "/api/dreams/dreams/" + id + "/tags/" + tagName + "/"; },
  COLLABORATORS: function (id) { return "/api/dreams/dreams/" + id + "/collaborators/"; },
  COLLABORATORS_LIST: function (id) { return "/api/dreams/dreams/" + id + "/collaborators/list/"; },
  COLLABORATOR_DELETE: function (id, userId) { return "/api/dreams/dreams/" + id + "/collaborators/" + userId + "/"; },
  SHARED_WITH_ME:     "/api/dreams/dreams/shared-with-me/",
  ALL_TAGS:           "/api/dreams/dreams/tags/",
  EXPORT_PDF: function (id) { return "/api/dreams/dreams/" + id + "/export-pdf/"; },
  GOALS: {
    LIST:     "/api/dreams/goals/",
    DETAIL: function (id) { return "/api/dreams/goals/" + id + "/"; },
    COMPLETE: function (id) { return "/api/dreams/goals/" + id + "/complete/"; },
  },
  TASKS: {
    LIST:     "/api/dreams/tasks/",
    DETAIL: function (id) { return "/api/dreams/tasks/" + id + "/"; },
    COMPLETE: function (id) { return "/api/dreams/tasks/" + id + "/complete/"; },
    SKIP: function (id) { return "/api/dreams/tasks/" + id + "/skip/"; },
  },
  OBSTACLES: {
    LIST:     "/api/dreams/obstacles/",
    DETAIL: function (id) { return "/api/dreams/obstacles/" + id + "/"; },
    RESOLVE: function (id) { return "/api/dreams/obstacles/" + id + "/resolve/"; },
  },
  TEMPLATES: {
    LIST:     "/api/dreams/dreams/templates/",
    DETAIL: function (id) { return "/api/dreams/dreams/templates/" + id + "/"; },
    USE: function (id) { return "/api/dreams/dreams/templates/" + id + "/use/"; },
    FEATURED: "/api/dreams/dreams/templates/featured/",
  },
};

// ─── Conversations ───────────────────────────────────────────────────
export var CONVERSATIONS = {
  LIST:                     "/api/conversations/",
  DETAIL: function (id) { return "/api/conversations/" + id + "/"; },
  SEND_MESSAGE: function (id) { return "/api/conversations/" + id + "/send_message/"; },
  SEND_VOICE: function (id) { return "/api/conversations/" + id + "/send-voice/"; },
  SEND_IMAGE: function (id) { return "/api/conversations/" + id + "/send-image/"; },
  MESSAGES: function (id) { return "/api/conversations/" + id + "/messages/"; },
  PIN: function (id) { return "/api/conversations/" + id + "/pin/"; },
  PIN_MESSAGE: function (id, msgId) { return "/api/conversations/" + id + "/pin-message/" + msgId + "/"; },
  LIKE_MESSAGE: function (id, msgId) { return "/api/conversations/" + id + "/like-message/" + msgId + "/"; },
  REACT_MESSAGE: function (id, msgId) { return "/api/conversations/" + id + "/react-message/" + msgId + "/"; },
  SEARCH: function (id) { return "/api/conversations/" + id + "/search/"; },
  EXPORT: function (id) { return "/api/conversations/" + id + "/export/"; },
  ARCHIVE: function (id) { return "/api/conversations/" + id + "/archive/"; },
  MARK_READ: function (id) { return "/api/conversations/" + id + "/mark-read/"; },
  TEMPLATES:                "/api/conversations/conversation-templates/",
  CALLS: {
    LIST:      "/api/conversations/calls/",
    INITIATE:  "/api/conversations/calls/initiate/",
    ACCEPT: function (id) { return "/api/conversations/calls/" + id + "/accept/"; },
    REJECT: function (id) { return "/api/conversations/calls/" + id + "/reject/"; },
    END: function (id) { return "/api/conversations/calls/" + id + "/end/"; },
    CANCEL: function (id) { return "/api/conversations/calls/" + id + "/cancel/"; },
    INCOMING:  "/api/conversations/calls/incoming/",
    HISTORY:   "/api/conversations/calls/history/",
    STATUS: function (id) { return "/api/conversations/calls/" + id + "/status/"; },
  },
  MESSAGES_VIEWSET:         "/api/conversations/messages/",
  AGORA: {
    CONFIG:    "/api/conversations/agora/config/",
    RTM_TOKEN: "/api/conversations/agora/rtm-token/",
    RTC_TOKEN: "/api/conversations/agora/rtc-token/",
  },
};

// ─── Calendar ────────────────────────────────────────────────────────
export var CALENDAR = {
  EVENTS:                   "/api/calendar/events/",
  EVENT_DETAIL: function (id) { return "/api/calendar/events/" + id + "/"; },
  TIMEBLOCKS:               "/api/calendar/timeblocks/",
  TIMEBLOCK_DETAIL: function (id) { return "/api/calendar/timeblocks/" + id + "/"; },
  VIEW:                     "/api/calendar/view/",
  TODAY:                    "/api/calendar/today/",
  SUGGEST_TIME_SLOTS:       "/api/calendar/suggest-time-slots/",
  RESCHEDULE:               "/api/calendar/reschedule/",
  GOOGLE: {
    STATUS:     "/api/calendar/google/status/",
    AUTH:       "/api/calendar/google/auth/",
    CALLBACK:   "/api/calendar/google/callback/",
    NATIVE_CALLBACK: "/api/calendar/google/native-callback/",
    SYNC:       "/api/calendar/google/sync/",
    DISCONNECT: "/api/calendar/google/disconnect/",
  },
};

// ─── Notifications ───────────────────────────────────────────────────
export var NOTIFICATIONS = {
  LIST:                     "/api/notifications/",
  DETAIL: function (id) { return "/api/notifications/" + id + "/"; },
  MARK_READ: function (id) { return "/api/notifications/" + id + "/mark_read/"; },
  MARK_ALL_READ:            "/api/notifications/mark_all_read/",
  UNREAD_COUNT:             "/api/notifications/unread_count/",
  OPENED: function (id) { return "/api/notifications/" + id + "/opened/"; },
  GROUPED:                  "/api/notifications/grouped/",
  TEMPLATES:                "/api/notifications/templates/",
  PUSH_SUBSCRIPTIONS:       "/api/notifications/push-subscriptions/",
  DEVICES:                  "/api/notifications/devices/",
};

// ─── Subscriptions ───────────────────────────────────────────────────
export var SUBSCRIPTIONS = {
  PLANS:                    "/api/subscriptions/plans/",
  PLAN_DETAIL: function (slug) { return "/api/subscriptions/plans/" + slug + "/"; },
  CURRENT:                  "/api/subscriptions/subscription/current/",
  CHECKOUT:                 "/api/subscriptions/subscription/checkout/",
  PORTAL:                   "/api/subscriptions/subscription/portal/",
  CANCEL:                   "/api/subscriptions/subscription/cancel/",
  REACTIVATE:               "/api/subscriptions/subscription/reactivate/",
  SYNC:                     "/api/subscriptions/subscription/sync/",
  INVOICES:                 "/api/subscriptions/subscription/invoices/",
};

// ─── Store ───────────────────────────────────────────────────────────
export var STORE = {
  CATEGORIES:               "/api/store/categories/",
  CATEGORY_DETAIL: function (slug) { return "/api/store/categories/" + slug + "/"; },
  ITEMS:                    "/api/store/items/",
  ITEM_DETAIL: function (slug) { return "/api/store/items/" + slug + "/"; },
  ITEMS_FEATURED:           "/api/store/items/featured/",
  INVENTORY:                "/api/store/inventory/",
  EQUIP: function (id) { return "/api/store/inventory/" + id + "/equip/"; },
  UNEQUIP: function (id) { return "/api/store/inventory/" + id + "/unequip/"; },
  INVENTORY_HISTORY:        "/api/store/inventory/history/",
  WISHLIST:                 "/api/store/wishlist/",
  PURCHASE:                 "/api/store/purchase/",
  PURCHASE_CONFIRM:         "/api/store/purchase/confirm/",
  PURCHASE_XP:              "/api/store/purchase/xp/",
  GIFTS:                    "/api/store/gifts/",
  GIFT_SEND:                "/api/store/gifts/send/",
  GIFT_CLAIM: function (id) { return "/api/store/gifts/" + id + "/claim/"; },
  REFUNDS:                  "/api/store/refunds/",
};

// ─── Leagues ─────────────────────────────────────────────────────────
export var LEAGUES = {
  LIST:                     "/api/leagues/leagues/",
  DETAIL: function (id) { return "/api/leagues/leagues/" + id + "/"; },
  LEADERBOARD: {
    GLOBAL:  "/api/leagues/leaderboard/global/",
    LEAGUE:  "/api/leagues/leaderboard/league/",
    FRIENDS: "/api/leagues/leaderboard/friends/",
    ME:      "/api/leagues/leaderboard/me/",
    NEARBY:  "/api/leagues/leaderboard/nearby/",
  },
  SEASONS: {
    LIST:         "/api/leagues/seasons/",
    DETAIL: function (id) { return "/api/leagues/seasons/" + id + "/"; },
    CURRENT:      "/api/leagues/seasons/current/",
    PAST:         "/api/leagues/seasons/past/",
    MY_REWARDS:   "/api/leagues/seasons/my-rewards/",
    CLAIM_REWARD: function (id) { return "/api/leagues/seasons/" + id + "/claim-reward/"; },
  },
};

// ─── Circles ─────────────────────────────────────────────────────────
export var CIRCLES = {
  LIST:                     "/api/circles/circles/",
  DETAIL: function (id) { return "/api/circles/circles/" + id + "/"; },
  JOIN: function (id) { return "/api/circles/circles/" + id + "/join/"; },
  LEAVE: function (id) { return "/api/circles/circles/" + id + "/leave/"; },
  FEED: function (id) { return "/api/circles/circles/" + id + "/feed/"; },
  POSTS: function (id) { return "/api/circles/circles/" + id + "/posts/"; },
  POST_EDIT: function (id, postId) { return "/api/circles/circles/" + id + "/posts/" + postId + "/edit/"; },
  POST_DELETE: function (id, postId) { return "/api/circles/circles/" + id + "/posts/" + postId + "/delete/"; },
  POST_REACT: function (id, postId) { return "/api/circles/circles/" + id + "/posts/" + postId + "/react/"; },
  POST_UNREACT: function (id, postId) { return "/api/circles/circles/" + id + "/posts/" + postId + "/unreact/"; },
  CHALLENGES: function (id) { return "/api/circles/circles/" + id + "/challenges/"; },
  CHALLENGE_PROGRESS: function (id, chId) { return "/api/circles/circles/" + id + "/challenges/" + chId + "/progress/"; },
  CHALLENGE_LEADERBOARD: function (id, chId) { return "/api/circles/circles/" + id + "/challenges/" + chId + "/leaderboard/"; },
  CHALLENGE_JOIN: function (chId) { return "/api/circles/circles/challenges/" + chId + "/join/"; },
  MEMBER_PROMOTE: function (id, memberId) { return "/api/circles/circles/" + id + "/members/" + memberId + "/promote/"; },
  MEMBER_DEMOTE: function (id, memberId) { return "/api/circles/circles/" + id + "/members/" + memberId + "/demote/"; },
  MEMBER_REMOVE: function (id, memberId) { return "/api/circles/circles/" + id + "/members/" + memberId + "/remove/"; },
  INVITE: function (id) { return "/api/circles/circles/" + id + "/invite/"; },
  INVITE_LINK: function (id) { return "/api/circles/circles/" + id + "/invite-link/"; },
  INVITATIONS: function (id) { return "/api/circles/circles/" + id + "/invitations/"; },
  JOIN_BY_CODE: function (code) { return "/api/circles/circles/join/" + code + "/"; },
  MY_INVITATIONS:           "/api/circles/circles/my-invitations/",
  CHAT: function (id) { return "/api/circles/circles/" + id + "/chat/"; },
  CHAT_SEND: function (id) { return "/api/circles/circles/" + id + "/chat/send/"; },
  CALL: {
    START: function (id) { return "/api/circles/circles/" + id + "/call/start/"; },
    JOIN: function (id) { return "/api/circles/circles/" + id + "/call/join/"; },
    LEAVE: function (id) { return "/api/circles/circles/" + id + "/call/leave/"; },
    END: function (id) { return "/api/circles/circles/" + id + "/call/end/"; },
    ACTIVE: function (id) { return "/api/circles/circles/" + id + "/call/active/"; },
  },
};

// ─── Social ──────────────────────────────────────────────────────────
export var SOCIAL = {
  FRIENDS: {
    LIST:     "/api/social/friends/",
    REQUEST:  "/api/social/friends/request/",
    PENDING:  "/api/social/friends/requests/pending/",
    SENT:     "/api/social/friends/requests/sent/",
    ACCEPT: function (id) { return "/api/social/friends/accept/" + id + "/"; },
    REJECT: function (id) { return "/api/social/friends/reject/" + id + "/"; },
    CANCEL: function (id) { return "/api/social/friends/cancel/" + id + "/"; },
    REMOVE: function (userId) { return "/api/social/friends/remove/" + userId + "/"; },
    MUTUAL: function (userId) { return "/api/social/friends/mutual/" + userId + "/"; },
    ONLINE:   "/api/social/friends/online/",
  },
  FOLLOW:                   "/api/social/follow/",
  UNFOLLOW: function (userId) { return "/api/social/unfollow/" + userId + "/"; },
  BLOCK:                    "/api/social/block/",
  UNBLOCK: function (userId) { return "/api/social/unblock/" + userId + "/"; },
  BLOCKED:                  "/api/social/blocked/",
  REPORT:                   "/api/social/report/",
  COUNTS: function (userId) { return "/api/social/counts/" + userId + "/"; },
  USER_SEARCH:              "/api/social/users/search",
  FOLLOW_SUGGESTIONS:       "/api/social/follow-suggestions/",
  FEED: {
    FRIENDS: "/api/social/feed/friends",
    LIKE: function (id) { return "/api/social/feed/" + id + "/like/"; },
    COMMENT: function (id) { return "/api/social/feed/" + id + "/comment/"; },
  },
  RECENT_SEARCHES: {
    LIST:   "/api/social/recent-searches/list/",
    ADD:    "/api/social/recent-searches/add/",
    CLEAR:  "/api/social/recent-searches/clear/",
    REMOVE: function (id) { return "/api/social/recent-searches/" + id + "/remove/"; },
  },
  POSTS: {
    LIST:     "/api/social/posts/",
    DETAIL: function (id) { return "/api/social/posts/" + id + "/"; },
    FEED:     "/api/social/posts/feed/",
    LIKE: function (id) { return "/api/social/posts/" + id + "/like/"; },
    COMMENT: function (id) { return "/api/social/posts/" + id + "/comment/"; },
    COMMENTS: function (id) { return "/api/social/posts/" + id + "/comments/"; },
    ENCOURAGE: function (id) { return "/api/social/posts/" + id + "/encourage/"; },
    SHARE: function (id) { return "/api/social/posts/" + id + "/share/"; },
    USER: function (userId) { return "/api/social/posts/user/" + userId + "/"; },
  },
};

// ─── Buddies ─────────────────────────────────────────────────────────
export var BUDDIES = {
  CURRENT:                  "/api/buddies/current/",
  CHAT:                     "/api/buddies/chat/",
  SEND_MESSAGE:             "/api/buddies/send-message/",
  PROGRESS: function (id) { return "/api/buddies/" + id + "/progress/"; },
  FIND_MATCH:               "/api/buddies/find-match/",
  PAIR:                     "/api/buddies/pair/",
  ACCEPT: function (id) { return "/api/buddies/" + id + "/accept/"; },
  REJECT: function (id) { return "/api/buddies/" + id + "/reject/"; },
  ENCOURAGE: function (id) { return "/api/buddies/" + id + "/encourage/"; },
  DELETE: function (id) { return "/api/buddies/" + id + "/"; },
  HISTORY:                  "/api/buddies/history/",
};

// ─── Search ──────────────────────────────────────────────────────────
export var SEARCH = {
  GLOBAL: "/api/search/",
};

// ─── WebSocket paths ─────────────────────────────────────────────────
export var WS = {
  AI_CHAT: function (conversationId) { return "/ws/ai-chat/" + conversationId + "/"; },
  BUDDY_CHAT: function (pairingId) { return "/ws/buddy-chat/" + pairingId + "/"; },
  CIRCLE_CHAT: function (circleId) { return "/ws/circle-chat/" + circleId + "/"; },
  NOTIFICATIONS: "/ws/notifications/",
};
