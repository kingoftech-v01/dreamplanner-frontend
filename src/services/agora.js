/**
 * Agora.io service — RTM (messaging) + RTC (voice/video).
 *
 * RTM handles real-time buddy chat messages & typing indicators.
 * RTC handles voice/video call streams via Agora Cloud.
 */

import AgoraRTM from "agora-rtm-sdk";
import AgoraRTC from "agora-rtc-sdk-ng";
import { apiGet, apiPost } from "./api";
import { CONVERSATIONS } from "./endpoints";

// ─── Shared state ────────────────────────────────────────────────
var _appId = null;
var _rtmClient = null;
var _rtmUid = null;
var _rtmTokenRefreshTimer = null;

/**
 * Fetch Agora App ID from backend (cached).
 */
async function getAppId() {
  if (_appId) return _appId;
  var res = await apiGet(CONVERSATIONS.AGORA.CONFIG);
  _appId = res.appId;
  return _appId;
}

// ═════════════════════════════════════════════════════════════════
//  RTM — Real-Time Messaging (buddy chat)
// ═════════════════════════════════════════════════════════════════

/**
 * Initialize RTM client and login. Call once at app startup (after auth).
 * Auto-renews token before expiry.
 */
export async function initRTM() {
  if (_rtmClient) return _rtmClient;

  var appId = await getAppId();
  var tokenRes = await apiPost(CONVERSATIONS.AGORA.RTM_TOKEN);

  _rtmClient = AgoraRTM.createInstance(appId);
  _rtmUid = tokenRes.uid;

  await _rtmClient.login({ uid: _rtmUid, token: tokenRes.token });

  // Schedule token renewal 1 hour before expiry (token is 24h)
  _scheduleRTMTokenRenewal(tokenRes.expiresIn);

  return _rtmClient;
}

function _scheduleRTMTokenRenewal(expiresInSec) {
  if (_rtmTokenRefreshTimer) clearTimeout(_rtmTokenRefreshTimer);
  // Renew 1 hour before expiry, minimum 60s
  var renewInMs = Math.max((expiresInSec - 3600) * 1000, 60000);
  _rtmTokenRefreshTimer = setTimeout(async function () {
    try {
      var tokenRes = await apiPost(CONVERSATIONS.AGORA.RTM_TOKEN);
      if (_rtmClient) {
        await _rtmClient.renewToken(tokenRes.token);
        _scheduleRTMTokenRenewal(tokenRes.expiresIn);
      }
    } catch (e) {
      console.error("RTM token renewal failed:", e);
      // Retry in 5 minutes
      _scheduleRTMTokenRenewal(300);
    }
  }, renewInMs);
}

/**
 * Logout and cleanup RTM. Call on app logout.
 */
export async function cleanupRTM() {
  if (_rtmTokenRefreshTimer) {
    clearTimeout(_rtmTokenRefreshTimer);
    _rtmTokenRefreshTimer = null;
  }
  if (_rtmClient) {
    try { await _rtmClient.logout(); } catch (_) {}
    _rtmClient = null;
  }
  _rtmUid = null;
}

/**
 * Join an RTM channel for buddy chat.
 *
 * @param {string} channelName - conversation UUID
 * @param {Object} handlers
 * @param {function} handlers.onMessage(parsed, memberId) - message received
 * @param {function} handlers.onTyping(memberId, isTyping) - typing indicator
 * @param {function} handlers.onMemberJoined(memberId)
 * @param {function} handlers.onMemberLeft(memberId)
 * @returns {{ sendMessage, sendTyping, leave }}
 */
export async function joinRTMChannel(channelName, handlers) {
  var h = handlers || {};
  var onMessage = h.onMessage || function () {};
  var onTyping = h.onTyping || function () {};
  var onMemberJoined = h.onMemberJoined || function () {};
  var onMemberLeft = h.onMemberLeft || function () {};

  if (!_rtmClient) {
    await initRTM();
  }

  var channel = _rtmClient.createChannel(channelName);

  channel.on("ChannelMessage", function (message, memberId) {
    try {
      var parsed = JSON.parse(message.text);
      if (parsed._type === "typing") {
        onTyping(memberId, parsed.isTyping);
      } else {
        onMessage(parsed, memberId);
      }
    } catch (_) {
      // Plain text fallback
      onMessage({ content: message.text }, memberId);
    }
  });

  channel.on("MemberJoined", function (memberId) {
    onMemberJoined(memberId);
  });

  channel.on("MemberLeft", function (memberId) {
    onMemberLeft(memberId);
  });

  await channel.join();

  function sendMessage(text) {
    var payload = JSON.stringify({ content: text, ts: Date.now() });
    return channel.sendMessage({ text: payload });
  }

  var _typingTimer = null;
  function sendTyping(isTyping) {
    var payload = JSON.stringify({ _type: "typing", isTyping: isTyping });
    channel.sendMessage({ text: payload }).catch(function () {});
    // Auto-clear typing after 3s
    if (_typingTimer) clearTimeout(_typingTimer);
    if (isTyping) {
      _typingTimer = setTimeout(function () {
        sendTyping(false);
      }, 3000);
    }
  }

  function leave() {
    if (_typingTimer) clearTimeout(_typingTimer);
    return channel.leave().catch(function () {});
  }

  return {
    sendMessage: sendMessage,
    sendTyping: sendTyping,
    leave: leave,
  };
}

// ═════════════════════════════════════════════════════════════════
//  RTC — Real-Time Communication (voice/video calls)
// ═════════════════════════════════════════════════════════════════

/**
 * Create an Agora RTC call session.
 *
 * @param {string} channelName - call UUID used as channel name
 * @param {Object} opts
 * @param {boolean} opts.video - true for video call
 * @param {function} opts.onRemoteStream({uid, videoTrack, audioTrack})
 * @param {function} opts.onRemoteLeft(uid)
 * @param {function} opts.onConnectionStateChange({curState, prevState})
 * @returns {{ join, toggleMute, toggleCamera, leave, getLocalTracks }}
 */
export function createAgoraCallSession(channelName, opts) {
  var video = opts && opts.video;
  var onRemoteStream = (opts && opts.onRemoteStream) || function () {};
  var onRemoteLeft = (opts && opts.onRemoteLeft) || function () {};
  var onConnectionStateChange = (opts && opts.onConnectionStateChange) || function () {};

  var client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  var localAudioTrack = null;
  var localVideoTrack = null;
  var joined = false;

  client.on("user-published", async function (remoteUser, mediaType) {
    await client.subscribe(remoteUser, mediaType);
    onRemoteStream({
      uid: remoteUser.uid,
      videoTrack: remoteUser.videoTrack || null,
      audioTrack: remoteUser.audioTrack || null,
    });
    // Auto-play remote audio
    if (mediaType === "audio" && remoteUser.audioTrack) {
      remoteUser.audioTrack.play();
    }
  });

  client.on("user-unpublished", function (remoteUser, mediaType) {
    // When remote unpublishes video, notify with null track
    if (mediaType === "video") {
      onRemoteStream({
        uid: remoteUser.uid,
        videoTrack: null,
        audioTrack: remoteUser.audioTrack || null,
      });
    }
  });

  client.on("user-left", function (remoteUser) {
    onRemoteLeft(remoteUser.uid);
  });

  client.on("connection-state-change", function (curState, prevState) {
    onConnectionStateChange({ curState: curState, prevState: prevState });
  });

  async function join() {
    // Request media permissions FIRST so the browser shows the prompt
    var constraints = video
      ? { audio: true, video: { width: 640, height: 480 } }
      : { audio: true };
    var permissionStream;
    try {
      permissionStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (permErr) {
      throw new Error(
        video
          ? "Camera and microphone access is required. Please allow access in your browser settings and try again."
          : "Microphone access is required. Please allow access in your browser settings and try again."
      );
    }
    // Stop the permission-check stream; Agora will create its own tracks
    permissionStream.getTracks().forEach(function (t) { t.stop(); });

    var appId = await getAppId();
    var tokenRes = await apiPost(CONVERSATIONS.AGORA.RTC_TOKEN, {
      channelName: channelName,
    });

    await client.join(appId, channelName, tokenRes.token, tokenRes.uid);
    joined = true;

    // Create local tracks (permissions already granted)
    if (video) {
      var tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
        {},
        { encoderConfig: { width: 640, height: 480, frameRate: 24, bitrateMax: 500 } }
      );
      localAudioTrack = tracks[0];
      localVideoTrack = tracks[1];
      await client.publish([localAudioTrack, localVideoTrack]);
    } else {
      localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await client.publish([localAudioTrack]);
    }
  }

  function toggleMute() {
    if (!localAudioTrack) return false;
    var newMuted = !localAudioTrack.muted;
    localAudioTrack.setMuted(newMuted);
    return newMuted;
  }

  function toggleCamera() {
    if (!localVideoTrack) return false;
    var newMuted = !localVideoTrack.muted;
    localVideoTrack.setMuted(newMuted);
    return newMuted;
  }

  async function leave() {
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack.close();
      localAudioTrack = null;
    }
    if (localVideoTrack) {
      localVideoTrack.stop();
      localVideoTrack.close();
      localVideoTrack = null;
    }
    if (joined) {
      await client.leave().catch(function () {});
      joined = false;
    }
  }

  function getLocalTracks() {
    return {
      audioTrack: localAudioTrack,
      videoTrack: localVideoTrack,
    };
  }

  return {
    join: join,
    toggleMute: toggleMute,
    toggleCamera: toggleCamera,
    leave: leave,
    getLocalTracks: getLocalTracks,
  };
}
