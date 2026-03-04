# Chat Pages

AI chat, buddy messaging, circle group chat, voice/video calls, and call history.

## Overview

| Screen | Route | Technology | Description |
|--------|-------|-----------|-------------|
| **ConversationList** | `/conversations` | REST | List of AI and buddy chat conversations |
| **AIChatScreen** | `/chat/:id` | WebSocket | GPT-4 streaming AI companion chat |
| **BuddyChatScreen** | `/buddy-chat/:pairingId` | Agora RTM | Real-time buddy messaging |
| **CircleChatScreen** | `/circle/:id/chat` | Agora RTM | Real-time circle group chat |
| **NewChatScreen** | `/chat/new` | REST | Start a new AI conversation |
| **VoiceCallScreen** | `/call/:id/voice` | Agora RTC | Voice call UI |
| **VideoCallScreen** | `/call/:id/video` | Agora RTC | Video call UI |
| **CallHistoryScreen** | `/call-history` | REST | Call log with duration and status |

---

## ConversationList.jsx

List of all conversations (AI chat + buddy chat) with pinned items.

### Features

- **Pinned conversations** — Shown at top
- **Search** — Filter conversations by title/content
- **Last message preview** — Truncated with timestamp
- **Unread indicators** — Badge with unread count
- **New chat FAB** — Floating action button to start new conversation

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations/conversations/` | List conversations |
| GET | `/api/buddies/current/` | Get current buddy pairing for buddy chat |

---

## AIChatScreen.jsx

Real-time AI chat with GPT-4 streaming responses via WebSocket.

### Communication

- **WebSocket:** `ws/ai-chat/{conversation_id}/` via `createWebSocket()`
- **Token auth:** Sent in message body after connection opens
- **Streaming:** AI responses arrive token-by-token via WebSocket frames

### Features

- **Message types:** Text, voice (with playback), image (with preview)
- **Message actions:** Pin, like, react, copy, delete
- **Voice messages:** Record and send (transcribed by Whisper on backend)
- **Image messages:** Camera/gallery upload with preview
- **Conversation templates** — Quick-start with pre-built prompts
- **Export** — Export conversation as PDF or JSON
- **Archive** — Archive/unarchive conversations

### Message Format

```json
{
  "type": "message",
  "content": "User message text",
  "message_type": "text"
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations/conversations/{id}/` | Conversation detail |
| GET | `/api/conversations/conversations/{id}/messages/` | Message history |
| POST | `/api/conversations/conversations/{id}/send_message/` | Send message (REST fallback) |
| POST | `/api/conversations/conversations/{id}/send-voice/` | Upload voice message |
| POST | `/api/conversations/conversations/{id}/pin-message/{mid}/` | Pin message |
| POST | `/api/conversations/conversations/{id}/like-message/{mid}/` | Like message |

---

## BuddyChatScreen.jsx

Real-time peer-to-peer buddy messaging via Agora RTM.

### Communication

- **Agora RTM:** `joinRTMChannel(pairingId)` for real-time messaging
- **REST fallback:** Messages also saved via `/api/buddies/{id}/chat/send/`

### Features

- **Real-time messaging** — Instant delivery via RTM
- **Typing indicators** — `sendTyping()` RTM message
- **Read receipts** — `sendMarkRead()` RTM message
- **Online status** — Via `useAgoraPresence()` hook
- **Voice/video calls** — Initiate calls from chat header
- **Encouragement** — Send encouragement to buddy
- **Progress comparison** — Side-by-side progress view

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/buddies/{id}/` | Buddy pairing detail |
| GET | `/api/buddies/{id}/chat/` | Chat message history |
| POST | `/api/buddies/{id}/chat/send/` | Send message (persisted) |
| POST | `/api/buddies/{id}/encourage/` | Send encouragement |

---

## CircleChatScreen.jsx

Real-time circle group chat via Agora RTM.

### Communication

- **Agora RTM:** `joinRTMChannel(circleId)` for group messaging
- **REST:** Messages persisted via circle chat endpoints

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/circles/{id}/chat/history/` | Chat history |
| POST | `/api/circles/{id}/chat/send/` | Send message |

---

## VoiceCallScreen.jsx

Voice call UI powered by Agora RTC.

### Features

- **Mute toggle** — `session.toggleMute()`
- **Speaker toggle** — Switch audio output
- **Call timer** — Duration display
- **End call** — Leave RTC channel + `POST /api/conversations/calls/{id}/end/`

### Flow

1. `createAgoraCallSession(channelName, { video: false })`
2. `session.join(token, uid)` with backend-issued RTC token
3. Remote audio auto-plays on subscription
4. `session.leave()` on call end

---

## VideoCallScreen.jsx

Video call UI powered by Agora RTC.

### Features

- Same as VoiceCallScreen plus:
- **Camera toggle** — `session.toggleCamera()`
- **Remote video** — Rendered in container element
- **Local video** — Small preview overlay

### Flow

1. `createAgoraCallSession(channelName, { video: true, onRemoteStream })`
2. `session.join(token, uid)`
3. Remote video played into container via `user.videoTrack.play(container)`
4. Camera toggle creates/stops local video track

---

## CallHistoryScreen.jsx

Call log showing past voice and video calls.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations/calls/history/` | List past calls |

### Display

- Call type (voice/video icon)
- Caller/callee name and avatar
- Duration
- Date/time
- Status (completed, missed, rejected)
