import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiGet, apiPost } from "../../services/api";
import { CONVERSATIONS } from "../../services/endpoints";
import { isNative } from "../../services/native";
import { scheduleIncomingCallNotification } from "../../services/nativeNotifications";

/**
 * Full-screen overlay for incoming calls.
 *
 * Detection mechanisms (both active simultaneously):
 * 1. Custom event "dp-incoming-call" — dispatched by NativePushBridge when FCM push arrives
 * 2. Polling GET /api/conversations/calls/incoming/ every 3 seconds — fallback when FCM is unavailable
 */
export default function IncomingCallOverlay() {
  var navigate = useNavigate();
  var location = useLocation();
  var { isAuthenticated } = useAuth();
  var [call, setCall] = useState(null);
  var seenCallIds = useRef({});

  // ─── FCM push listener (original mechanism) ───────────────
  useEffect(function () {
    function handleIncomingCall(e) {
      var data = e.detail || {};
      if (!data.callId) return;
      // Don't show if already on a call screen
      if (window.location.hash.indexOf("/voice-call/") !== -1 ||
          window.location.hash.indexOf("/video-call/") !== -1) return;
      seenCallIds.current[data.callId] = true;
      // On native: schedule full-screen intent notification (appears over other apps + lock screen)
      if (isNative) {
        scheduleIncomingCallNotification(data);
      }
      setCall({
        callId: data.callId,
        callerName: data.callerName || "Unknown",
        callType: data.callType || "voice",
        callerId: data.callerId,
      });
    }

    window.addEventListener("dp-incoming-call", handleIncomingCall);
    return function () {
      window.removeEventListener("dp-incoming-call", handleIncomingCall);
    };
  }, []);

  // ─── Poll for incoming calls every 3s (fallback when FCM is slow) ───
  useEffect(function () {
    if (!isAuthenticated) return;

    function poll() {
      var hash = window.location.hash || "";
      if (hash.indexOf("/voice-call/") !== -1 || hash.indexOf("/video-call/") !== -1) return;

      apiGet(CONVERSATIONS.CALLS.INCOMING).then(function (data) {
        var list = data || [];
        if (list.length === 0) return;
        var incoming = null;
        for (var i = 0; i < list.length; i++) {
          if (!seenCallIds.current[list[i].callId]) {
            incoming = list[i];
            break;
          }
        }
        if (!incoming) return;
        seenCallIds.current[incoming.callId] = true;
        setCall({
          callId: incoming.callId,
          callerName: incoming.callerName || "Unknown",
          callType: incoming.callType || "voice",
          callerId: incoming.callerId,
        });
      }).catch(function () {});
    }

    poll(); // immediate first check
    var interval = setInterval(poll, 3000);
    return function () { clearInterval(interval); };
  }, [isAuthenticated]);

  // Clear stale seen IDs periodically (avoid memory leak)
  useEffect(function () {
    var cleanup = setInterval(function () {
      seenCallIds.current = {};
    }, 120000); // every 2 minutes
    return function () { clearInterval(cleanup); };
  }, []);

  if (!call) return null;

  var accept = function () {
    var callId = call.callId;
    var callType = call.callType;
    var callerName = call.callerName;
    setCall(null);

    // Navigate to call screen — VoiceCallScreen/VideoCallScreen handles the accept API call
    var route = callType === "video"
      ? "/video-call/" + callId + "?answering=true&buddyName=" + encodeURIComponent(callerName)
      : "/voice-call/" + callId + "?answering=true&buddyName=" + encodeURIComponent(callerName);
    navigate(route);
  };

  var reject = function () {
    var callId = call.callId;
    setCall(null);
    apiPost(CONVERSATIONS.CALLS.REJECT(callId)).catch(function () {});
  };

  var initial = call.callerName.charAt(0).toUpperCase();
  var isVideo = call.callType === "video";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99998,
      background: "rgba(10, 5, 25, 0.95)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, sans-serif",
      animation: "icoFadeIn 0.3s ease-out",
    }}>
      <style>{"\
        @keyframes icoFadeIn { from { opacity: 0; } to { opacity: 1; } }\
        @keyframes icoPulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.3); opacity: 0; } }\
        @keyframes icoRing { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(15deg); } 75% { transform: rotate(-15deg); } }\
      "}</style>

      {/* Avatar */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <div style={{
          position: "absolute", inset: -16,
          borderRadius: "50%", border: "2px solid #8B5CF6",
          animation: "icoPulse 2s ease-in-out infinite",
        }} />
        <div style={{
          width: 100, height: 100, borderRadius: "50%",
          background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40, fontWeight: 700, color: "#fff",
          boxShadow: "0 0 40px rgba(139,92,246,0.3)",
        }}>
          {initial}
        </div>
      </div>

      {/* Caller name */}
      <h2 style={{
        fontSize: 22, fontWeight: 700, color: "#fff",
        margin: "0 0 8px",
      }}>
        {call.callerName}
      </h2>

      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.6)",
        margin: "0 0 60px", fontWeight: 500,
      }}>
        Incoming {isVideo ? "video" : "voice"} call...
      </p>

      {/* Accept / Reject buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        {/* Reject */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <button
            onClick={reject}
            style={{
              width: 64, height: 64, borderRadius: 22,
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
            }}
          >
            <PhoneOff size={28} color="#fff" />
          </button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
            Decline
          </span>
        </div>

        {/* Accept */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <button
            onClick={accept}
            style={{
              width: 64, height: 64, borderRadius: 22,
              background: "linear-gradient(135deg, #10B981, #059669)",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
              animation: "icoRing 1s ease-in-out infinite",
            }}
          >
            {isVideo ? <Video size={28} color="#fff" /> : <Phone size={28} color="#fff" />}
          </button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
            Accept
          </span>
        </div>
      </div>
    </div>
  );
}
