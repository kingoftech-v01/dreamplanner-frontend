/**
 * WebRTC service for voice/video calls.
 *
 * Manages RTCPeerConnection, media streams, and WebSocket signaling.
 */

var WS_BASE = import.meta.env.VITE_WS_BASE || "";

import { getToken } from "./api";

var ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Add TURN server from env if configured (required for symmetric NAT traversal)
var TURN_URL = import.meta.env.VITE_TURN_URL;
var TURN_USER = import.meta.env.VITE_TURN_USERNAME;
var TURN_CRED = import.meta.env.VITE_TURN_CREDENTIAL;
if (TURN_URL) {
  ICE_SERVERS.push({
    urls: TURN_URL,
    username: TURN_USER || "",
    credential: TURN_CRED || "",
  });
}

/**
 * Create a WebRTC call session.
 *
 * @param {string} callId - UUID of the call
 * @param {Object} opts
 * @param {boolean} opts.video - true for video call
 * @param {function} opts.onRemoteStream - called with MediaStream
 * @param {function} opts.onConnectionStateChange - called with state string
 * @param {function} opts.onCallEnd - called when remote ends call
 * @returns {{ start, toggleMute, toggleCamera, endCall, cleanup, getLocalStream }}
 */
export function createCallSession(callId, opts) {
  var video = opts && opts.video;
  var onRemoteStream = (opts && opts.onRemoteStream) || function () {};
  var onConnectionStateChange = (opts && opts.onConnectionStateChange) || function () {};
  var onCallEnd = (opts && opts.onCallEnd) || function () {};

  var pc = null;
  var ws = null;
  var localStream = null;
  var isMuted = false;
  var isCameraOff = false;
  var closed = false;
  // Queue ICE candidates received before remoteDescription is set
  var pendingCandidates = [];
  var remoteDescSet = false;

  function getWsUrl() {
    var base = WS_BASE;
    if (!base) {
      var proto = location.protocol === "https:" ? "wss:" : "ws:";
      base = proto + "//" + location.host;
    }
    var token = getToken();
    return base + "/ws/call/" + callId + "/?token=" + token;
  }

  // ICE servers can be overridden by the signaling server on connection
  var activeIceServers = ICE_SERVERS;

  function connectWs() {
    return new Promise(function (resolve, reject) {
      ws = new WebSocket(getWsUrl());

      ws.onopen = function () {
        resolve();
      };

      ws.onmessage = function (event) {
        var data;
        try { data = JSON.parse(event.data); } catch (_) { return; }

        if (data.type === "connection" && data.iceServers) {
          // Use ICE servers from signaling server (includes TURN if configured)
          activeIceServers = data.iceServers;
        } else if (data.type === "offer") {
          handleOffer(data);
        } else if (data.type === "answer") {
          handleAnswer(data);
        } else if (data.type === "ice_candidate") {
          handleIceCandidate(data);
        } else if (data.type === "call_end") {
          onCallEnd();
        }
      };

      ws.onerror = function () {
        reject(new Error("WebSocket connection failed"));
      };

      ws.onclose = function () {
        if (!closed) {
          onCallEnd();
        }
      };
    });
  }

  function sendSignal(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function createPeerConnection() {
    pc = new RTCPeerConnection({ iceServers: activeIceServers });

    pc.onicecandidate = function (event) {
      if (event.candidate) {
        sendSignal({
          type: "ice_candidate",
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = function (event) {
      if (event.streams && event.streams[0]) {
        onRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = function () {
      onConnectionStateChange(pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // Give it a moment before reporting end
        setTimeout(function () {
          if (pc && (pc.connectionState === "failed" || pc.connectionState === "disconnected")) {
            onCallEnd();
          }
        }, 5000);
      }
    };

    // Apply bandwidth constraints for video calls
    if (video) {
      pc.addEventListener("negotiationneeded", function () {
        try {
          var senders = pc.getSenders();
          for (var i = 0; i < senders.length; i++) {
            if (senders[i].track && senders[i].track.kind === "video") {
              var params = senders[i].getParameters();
              if (!params.encodings || params.encodings.length === 0) {
                params.encodings = [{}];
              }
              params.encodings[0].maxBitrate = 500000; // 500kbps max video
              senders[i].setParameters(params).catch(function () {});
            }
          }
        } catch (_) {}
      });
    }
  }

  /** Flush queued ICE candidates after remoteDescription is set */
  function flushPendingCandidates() {
    remoteDescSet = true;
    var queue = pendingCandidates.splice(0);
    for (var i = 0; i < queue.length; i++) {
      try {
        pc.addIceCandidate(new RTCIceCandidate(queue[i]));
      } catch (e) {
        console.warn("Failed to add queued ICE candidate:", e);
      }
    }
  }

  async function handleOffer(data) {
    if (!pc) createPeerConnection();

    // Add local tracks before setting remote description
    if (localStream) {
      localStream.getTracks().forEach(function (track) {
        pc.addTrack(track, localStream);
      });
    }

    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    flushPendingCandidates();
    var answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendSignal({
      type: "answer",
      sdp: pc.localDescription.toJSON(),
    });
  }

  async function handleAnswer(data) {
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      flushPendingCandidates();
    }
  }

  async function handleIceCandidate(data) {
    if (!data.candidate) return;
    // Queue candidates if remoteDescription not yet set
    if (!remoteDescSet || !pc || !pc.remoteDescription) {
      pendingCandidates.push(data.candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
      console.warn("Failed to add ICE candidate:", e);
    }
  }

  /**
   * Start the call.
   * @param {boolean} isCaller - true if this user initiated the call
   */
  async function start(isCaller) {
    // Get local media
    var constraints = { audio: true };
    if (video) {
      constraints.video = { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } };
    }

    try {
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      console.error("Failed to get user media:", e);
      throw e;
    }

    // Connect signaling WebSocket — clean up media if this fails
    try {
      await connectWs();
    } catch (e) {
      if (localStream) {
        localStream.getTracks().forEach(function (track) {
          try { track.stop(); } catch (_) {}
        });
        localStream = null;
      }
      throw e;
    }
    // connectWs succeeded, continue
    void 0;

    // Create peer connection
    createPeerConnection();

    // Add local tracks
    localStream.getTracks().forEach(function (track) {
      pc.addTrack(track, localStream);
    });

    // If caller, create and send offer
    if (isCaller) {
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type: "offer",
        sdp: pc.localDescription.toJSON(),
      });
    }
    // If callee, wait for offer to arrive via onmessage
  }

  function toggleMute() {
    if (!localStream) return false;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(function (track) {
      track.enabled = !isMuted;
    });
    return isMuted;
  }

  function toggleCamera() {
    if (!localStream) return false;
    isCameraOff = !isCameraOff;
    localStream.getVideoTracks().forEach(function (track) {
      track.enabled = !isCameraOff;
    });
    return isCameraOff;
  }

  function endCall() {
    sendSignal({ type: "call_end" });
    cleanup();
  }

  function cleanup() {
    if (closed) return;
    closed = true;
    pendingCandidates = [];

    // Stop all local media tracks
    if (localStream) {
      localStream.getTracks().forEach(function (track) {
        try { track.stop(); } catch (_) {}
      });
      localStream = null;
    }

    // Close peer connection and stop remote tracks
    if (pc) {
      pc.getReceivers().forEach(function (receiver) {
        if (receiver.track) {
          try { receiver.track.stop(); } catch (_) {}
        }
      });
      try { pc.close(); } catch (_) {}
      pc = null;
    }

    // Close signaling WebSocket
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      try { ws.close(); } catch (_) {}
      ws = null;
    }
  }

  function getLocalStream() {
    return localStream;
  }

  return {
    start: start,
    toggleMute: toggleMute,
    toggleCamera: toggleCamera,
    endCall: endCall,
    cleanup: cleanup,
    getLocalStream: getLocalStream,
  };
}
