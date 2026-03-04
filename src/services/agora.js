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
var _rtmLoggedIn = false;             // true only while RTM is authenticated
var _rtmKickCount = 0;                // tracks consecutive remote kicks to prevent infinite loop
var _rtmTokenRefreshTimer = null;
var _rtmInitPromise = null;          // guards against concurrent initRTM() calls
var _rtmChannels = {};               // tracks joined channels by name

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
  // Prevent concurrent calls (React StrictMode double-mount)
  if (_rtmInitPromise) return _rtmInitPromise;

  _rtmInitPromise = (async function () {
    try {
      var appId = await getAppId();
      var tokenRes = await apiPost(CONVERSATIONS.AGORA.RTM_TOKEN);

      var client = AgoraRTM.createInstance(appId);
      _rtmUid = tokenRes.uid;

      await client.login({ uid: _rtmUid, token: tokenRes.token });

      // Only set _rtmClient AFTER login succeeds (prevents Error 102 race)
      _rtmClient = client;
      _rtmLoggedIn = true;

      // Handle connection state changes
      _rtmKickCount = 0;
      client.on("ConnectionStateChanged", function (newState, reason) {
        if (newState === "ABORTED" && reason === "REMOTE_LOGIN") {
          _rtmLoggedIn = false;
          _rtmClient = null;
          _rtmInitPromise = null;
          _rtmKickCount++;
          // Stop retrying after 2 kicks — another device/tab has priority
          if (_rtmKickCount > 2) {
            console.warn("Agora RTM: kicked by remote session repeatedly, giving up (another device is active)");
            return;
          }
          // Exponential backoff: 5s, 15s
          var delay = 5000 * Math.pow(3, _rtmKickCount - 1);
          console.warn("Agora RTM: kicked by remote session, retry in " + (delay / 1000) + "s (" + _rtmKickCount + "/2)");
          setTimeout(function () {
            initRTM().catch(function () {});
          }, delay);
        } else if (newState === "DISCONNECTED") {
          _rtmLoggedIn = false;
        } else if (newState === "CONNECTED") {
          _rtmLoggedIn = true;
          _rtmKickCount = 0; // Reset on successful stable connection
        }
      });

      // Attach presence listener if callbacks were registered before init
      if (_presenceCallbacks.length > 0) {
        _attachPresenceListener();
      }

      // Schedule token renewal 1 hour before expiry (token is 24h)
      _scheduleRTMTokenRenewal(tokenRes.expiresIn);

      return _rtmClient;
    } catch (e) {
      _rtmClient = null;
      _rtmInitPromise = null;
      throw e;
    }
  })();

  return _rtmInitPromise;
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
      console.error("RTM token renewal failed:", e.message || e.code || "unknown");
      // Retry in 5 minutes
      _scheduleRTMTokenRenewal(300);
    }
  }, renewInMs);
}

/**
 * Logout and cleanup RTM. Call on app logout.
 */
export async function cleanupRTM() {
  _rtmInitPromise = null;
  if (_rtmTokenRefreshTimer) {
    clearTimeout(_rtmTokenRefreshTimer);
    _rtmTokenRefreshTimer = null;
  }
  // Leave all joined channels first
  for (var name in _rtmChannels) {
    try { _rtmChannels[name].leave(); } catch (_) {}
  }
  _rtmChannels = {};
  _presenceCallbacks = [];
  if (_rtmClient) {
    try { await _rtmClient.logout(); } catch (_) {}
    _rtmClient = null;
  }
  _rtmLoggedIn = false;
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
  var onMarkRead = h.onMarkRead || function () {};
  var onMemberJoined = h.onMemberJoined || function () {};
  var onMemberLeft = h.onMemberLeft || function () {};

  // Always await initRTM to ensure login is complete (prevents Error 102)
  if (_rtmInitPromise) {
    await _rtmInitPromise;
  }
  if (!_rtmClient) {
    await initRTM();
  }

  // If already joined this channel, leave it first to avoid Error 202
  if (_rtmChannels[channelName]) {
    try { await _rtmChannels[channelName].leave(); } catch (_) {}
    delete _rtmChannels[channelName];
  }

  var channel = _rtmClient.createChannel(channelName);

  channel.on("ChannelMessage", function (message, memberId) {
    try {
      var parsed = JSON.parse(message.text);
      if (parsed._type === "typing") {
        onTyping(memberId, parsed.isTyping);
      } else if (parsed._type === "mark_read") {
        onMarkRead(memberId, parsed.ts);
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
  _rtmChannels[channelName] = channel;

  function sendMessage(text, extra) {
    var data = { content: text, ts: Date.now() };
    if (extra) { for (var k in extra) { data[k] = extra[k]; } }
    var payload = JSON.stringify(data);
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

  function sendMarkRead() {
    var payload = JSON.stringify({ _type: "mark_read", ts: Date.now() });
    channel.sendMessage({ text: payload }).catch(function () {});
  }

  function leave() {
    if (_typingTimer) clearTimeout(_typingTimer);
    delete _rtmChannels[channelName];
    return channel.leave().catch(function () {});
  }

  return {
    sendMessage: sendMessage,
    sendTyping: sendTyping,
    sendMarkRead: sendMarkRead,
    leave: leave,
  };
}

// ═════════════════════════════════════════════════════════════════
//  RTM Presence — real-time online/offline status via Agora
// ═════════════════════════════════════════════════════════════════

var _presenceCallbacks = [];

/**
 * Subscribe to online status changes for a list of peer UIDs (user IDs as strings).
 * Must be called after initRTM().
 * @param {string[]} peerIds - array of user ID strings
 */
export async function subscribePresence(peerIds) {
  if (!_rtmClient || !_rtmLoggedIn || !peerIds || peerIds.length === 0) return;
  try {
    await _rtmClient.subscribePeersOnlineStatus(peerIds);
  } catch (_) {
    // Silently ignore — RTM may have been disconnected
  }
}

/**
 * Unsubscribe from presence updates.
 * @param {string[]} peerIds
 */
export async function unsubscribePresence(peerIds) {
  if (!_rtmClient || !_rtmLoggedIn || !peerIds || peerIds.length === 0) return;
  try {
    await _rtmClient.unsubscribePeersOnlineStatus(peerIds);
  } catch (_) {
    // Ignore — user might already be unsubscribed or RTM disconnected
  }
}

/**
 * One-time query: which of these peers are online right now?
 * @param {string[]} peerIds
 * @returns {Object} map of peerId -> boolean
 */
export async function queryPresence(peerIds) {
  if (!_rtmClient || !_rtmLoggedIn || !peerIds || peerIds.length === 0) return {};
  try {
    var result = await _rtmClient.queryPeersOnlineStatus(peerIds);
    // result is { "userId1": true, "userId2": false, ... }
    return result;
  } catch (_) {
    // Silently ignore — RTM may have been disconnected
    return {};
  }
}

/**
 * Register a callback for presence changes. Returns an unsubscribe function.
 * @param {function} callback - called with (peerIdMap: { peerId: boolean })
 * @returns {function} unsubscribe
 */
export function onPresenceChange(callback) {
  _presenceCallbacks.push(callback);
  // Lazily attach the RTM event listener (only once)
  if (_rtmClient && _presenceCallbacks.length === 1) {
    _attachPresenceListener();
  }
  return function () {
    _presenceCallbacks = _presenceCallbacks.filter(function (cb) { return cb !== callback; });
  };
}

function _attachPresenceListener() {
  if (!_rtmClient) return;
  _rtmClient.on("PeersOnlineStatusChanged", function (statusMap) {
    // statusMap: { "userId": "online"|"offline" }
    var boolMap = {};
    for (var uid in statusMap) {
      boolMap[uid] = statusMap[uid] === "online";
    }
    for (var i = 0; i < _presenceCallbacks.length; i++) {
      try { _presenceCallbacks[i](boolMap); } catch (_) {}
    }
  });
}

/**
 * Get the current RTM UID (user ID string).
 */
export function getRTMUid() {
  return _rtmUid;
}

// ═════════════════════════════════════════════════════════════════
//  RTC — Real-Time Communication (voice/video calls)
// ═════════════════════════════════════════════════════════════════

/**
 * Resolve video encoder config from a quality key.
 * @param {string} quality - "auto" | "hd" | "sd"
 * @returns {Object} encoder config for AgoraRTC.createCameraVideoTrack
 */
function _resolveVideoEncoder(quality) {
  if (quality === "hd") return { width: 1280, height: 720, frameRate: 30, bitrateMax: 1130 };
  if (quality === "sd") return { width: 640, height: 480, frameRate: 24, bitrateMax: 500 };
  // "auto" — sensible default
  return { width: 640, height: 480, frameRate: 24, bitrateMax: 500 };
}

/**
 * Create an Agora RTC call session.
 *
 * @param {string} channelName - call UUID used as channel name
 * @param {Object} opts
 * @param {boolean} opts.video - true for video call
 * @param {function} opts.onRemoteStream({uid, videoTrack, audioTrack})
 * @param {function} opts.onRemoteLeft(uid)
 * @param {function} opts.onConnectionStateChange({curState, prevState})
 * @param {Object}  opts.preCallSettings - settings from PreCallScreen
 * @param {boolean} opts.preCallSettings.muted - start muted
 * @param {boolean} opts.preCallSettings.cameraOff - start with camera off
 * @param {Object}  opts.preCallSettings.settings - CallSettings state
 * @returns {{ join, toggleMute, toggleCamera, leave, getLocalTracks, setSpeaker, applySettings, getSettings }}
 */
export function createAgoraCallSession(channelName, opts) {
  var video = opts && opts.video;
  var onRemoteStream = (opts && opts.onRemoteStream) || function () {};
  var onRemoteLeft = (opts && opts.onRemoteLeft) || function () {};
  var onConnectionStateChange = (opts && opts.onConnectionStateChange) || function () {};
  var preCallSettings = (opts && opts.preCallSettings) || {};

  var client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  var localAudioTrack = null;
  var localVideoTrack = null;
  var joined = false;
  var remoteAudioTracks = [];
  var _noiseSuppressionEnabled = false;
  var _currentSettings = (preCallSettings && preCallSettings.settings) || {};

  client.on("user-published", async function (remoteUser, mediaType) {
    await client.subscribe(remoteUser, mediaType);
    onRemoteStream({
      uid: remoteUser.uid,
      videoTrack: remoteUser.videoTrack || null,
      audioTrack: remoteUser.audioTrack || null,
    });
    // Auto-play remote audio and track for speaker toggle
    if (mediaType === "audio" && remoteUser.audioTrack) {
      remoteUser.audioTrack.play();
      remoteAudioTracks.push(remoteUser.audioTrack);
    }
  });

  client.on("user-unpublished", function (remoteUser, mediaType) {
    if (mediaType === "audio" && remoteUser.audioTrack) {
      remoteAudioTracks = remoteAudioTracks.filter(function (t) {
        return t !== remoteUser.audioTrack;
      });
    }
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
    if (remoteUser.audioTrack) {
      remoteAudioTracks = remoteAudioTracks.filter(function (t) {
        return t !== remoteUser.audioTrack;
      });
    }
    onRemoteLeft(remoteUser.uid);
  });

  client.on("connection-state-change", function (curState, prevState) {
    onConnectionStateChange({ curState: curState, prevState: prevState });
  });

  /**
   * Enable or disable AI noise suppression on the local audio track.
   * Uses Agora's built-in AINoiseSuppression if available on the client.
   */
  async function _applyNoiseSuppression(enabled) {
    if (!localAudioTrack) return;
    _noiseSuppressionEnabled = enabled;
    try {
      // Agora Web SDK NG: client.enableAINoiseSuppression (available in 4.x+)
      if (client && typeof client.enableAINoiseSuppression === "function") {
        await client.enableAINoiseSuppression(enabled);
      }
    } catch (e) {
      console.warn("Noise suppression toggle failed:", e.message || e);
    }
  }

  /**
   * Apply virtual background settings to the local video track.
   * Uses Agora's Virtual Background extension if available.
   */
  async function _applyVirtualBackground(settings) {
    if (!localVideoTrack || !video) return;
    try {
      // Agora's Virtual Background extension (agora-extension-virtual-background)
      // Check if the extension processor API is available on the track
      if (typeof localVideoTrack.pipe === "function" || typeof localVideoTrack.processorDestination !== "undefined") {
        // Extension-based virtual background is available
        var blurLevel = settings.blurLevel || "off";
        var bgPreset = settings.bgPreset || "none";

        if (blurLevel !== "off" && bgPreset === "none") {
          // Apply blur — Agora extension uses blur type with strength 1-3
          var blurStrength = blurLevel === "heavy" ? 3 : 1;
          if (client && typeof client.setVirtualBackground === "function") {
            await client.setVirtualBackground({
              type: "blur",
              blurDegree: blurStrength,
            });
          }
        } else if (bgPreset !== "none") {
          // Apply color/gradient background
          var PRESETS = {
            purple: "#6D28D9", teal: "#0D9488", midnight: "#1E1B4B",
            sunset: "#F59E0B", ocean: "#3B82F6", aurora: "#8B5CF6",
          };
          var bgColor = PRESETS[bgPreset] || "#6D28D9";
          if (client && typeof client.setVirtualBackground === "function") {
            await client.setVirtualBackground({
              type: "color",
              color: bgColor,
            });
          }
        } else {
          // Disable virtual background
          if (client && typeof client.disableVirtualBackground === "function") {
            await client.disableVirtualBackground();
          }
        }
      }
    } catch (e) {
      console.warn("Virtual background failed:", e.message || e);
    }
  }

  async function join() {
    var initialSettings = (preCallSettings && preCallSettings.settings) || {};

    // Request media permissions FIRST so the browser shows the prompt
    var constraints = video
      ? { audio: true, video: { width: 640, height: 480 } }
      : { audio: true };
    // Apply selected mic/camera device from settings
    if (initialSettings.micDevice) {
      constraints.audio = { deviceId: { exact: initialSettings.micDevice } };
    }
    if (video && initialSettings.cameraDevice) {
      constraints.video = {
        width: 640, height: 480,
        deviceId: { exact: initialSettings.cameraDevice },
      };
    }
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

    // Resolve encoder config based on quality setting
    var encoderConfig = _resolveVideoEncoder(initialSettings.videoQuality || "auto");

    // Build microphone track config
    var micConfig = {};
    if (initialSettings.micDevice) {
      micConfig.microphoneId = initialSettings.micDevice;
    }

    // Create local tracks (permissions already granted)
    if (video) {
      var cameraConfig = { encoderConfig: encoderConfig };
      if (initialSettings.cameraDevice) {
        cameraConfig.cameraId = initialSettings.cameraDevice;
      }
      var tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
        micConfig,
        cameraConfig
      );
      localAudioTrack = tracks[0];
      localVideoTrack = tracks[1];
      await client.publish([localAudioTrack, localVideoTrack]);
    } else {
      localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(micConfig);
      await client.publish([localAudioTrack]);
    }

    // Apply pre-call muted/camera-off state
    if (preCallSettings.muted && localAudioTrack) {
      localAudioTrack.setMuted(true);
    }
    if (preCallSettings.cameraOff && localVideoTrack) {
      localVideoTrack.setMuted(true);
    }

    // Apply noise suppression if enabled in settings
    if (initialSettings.noiseSuppression) {
      await _applyNoiseSuppression(true);
    }

    // Apply virtual background if set
    if (video && (initialSettings.blurLevel !== "off" || initialSettings.bgPreset !== "none")) {
      await _applyVirtualBackground(initialSettings);
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

  async function setSpeaker(enabled) {
    try {
      var devices = await AgoraRTC.getPlaybackDevices();
      if (!devices || devices.length === 0) return;
      var targetDevice = null;
      if (enabled) {
        targetDevice = devices.find(function (d) {
          return /speaker/i.test(d.label);
        }) || devices[0];
      } else {
        targetDevice = devices.find(function (d) {
          return /earpiece/i.test(d.label);
        }) || devices[0];
      }
      if (!targetDevice) return;
      for (var i = 0; i < remoteAudioTracks.length; i++) {
        if (remoteAudioTracks[i].setPlaybackDevice) {
          await remoteAudioTracks[i].setPlaybackDevice(targetDevice.deviceId);
        }
      }
    } catch (e) {
      console.warn("setSpeaker failed:", e.message || e);
    }
  }

  /**
   * Apply settings changes during a live call (from CallSettings panel).
   * @param {Object} newSettings - the updated settings object
   */
  async function applySettings(newSettings) {
    if (!newSettings) return;
    var prev = _currentSettings;
    _currentSettings = newSettings;

    // Noise suppression changed
    if (newSettings.noiseSuppression !== prev.noiseSuppression) {
      await _applyNoiseSuppression(!!newSettings.noiseSuppression);
    }

    // Virtual background changed (video only)
    if (video && (newSettings.blurLevel !== prev.blurLevel || newSettings.bgPreset !== prev.bgPreset)) {
      await _applyVirtualBackground(newSettings);
    }

    // Microphone device changed
    if (newSettings.micDevice && newSettings.micDevice !== prev.micDevice && localAudioTrack) {
      try {
        if (typeof localAudioTrack.setDevice === "function") {
          await localAudioTrack.setDevice(newSettings.micDevice);
        }
      } catch (e) {
        console.warn("Mic device switch failed:", e.message || e);
      }
    }

    // Camera device changed
    if (video && newSettings.cameraDevice && newSettings.cameraDevice !== prev.cameraDevice && localVideoTrack) {
      try {
        if (typeof localVideoTrack.setDevice === "function") {
          await localVideoTrack.setDevice(newSettings.cameraDevice);
        }
      } catch (e) {
        console.warn("Camera device switch failed:", e.message || e);
      }
    }

    // Speaker device changed
    if (newSettings.speakerDevice && newSettings.speakerDevice !== prev.speakerDevice) {
      try {
        for (var i = 0; i < remoteAudioTracks.length; i++) {
          if (remoteAudioTracks[i].setPlaybackDevice) {
            await remoteAudioTracks[i].setPlaybackDevice(newSettings.speakerDevice);
          }
        }
      } catch (e) {
        console.warn("Speaker device switch failed:", e.message || e);
      }
    }

    // Video quality changed
    if (video && newSettings.videoQuality !== prev.videoQuality && localVideoTrack) {
      try {
        var enc = _resolveVideoEncoder(newSettings.videoQuality || "auto");
        if (typeof localVideoTrack.setEncoderConfiguration === "function") {
          await localVideoTrack.setEncoderConfiguration(enc);
        }
      } catch (e) {
        console.warn("Video quality change failed:", e.message || e);
      }
    }
  }

  function getSettings() {
    return _currentSettings;
  }

  return {
    join: join,
    toggleMute: toggleMute,
    toggleCamera: toggleCamera,
    leave: leave,
    getLocalTracks: getLocalTracks,
    setSpeaker: setSpeaker,
    applySettings: applySettings,
    getSettings: getSettings,
  };
}
