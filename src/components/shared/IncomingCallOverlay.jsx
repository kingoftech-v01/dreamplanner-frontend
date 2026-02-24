import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { apiPost } from "../../services/api";

/**
 * Full-screen overlay for incoming calls.
 * Listens for the custom event "dp-incoming-call" dispatched
 * when an FCM notification with type=incoming_call arrives.
 */
export default function IncomingCallOverlay() {
  var navigate = useNavigate();
  var [call, setCall] = useState(null);

  useEffect(function () {
    function handleIncomingCall(e) {
      var data = e.detail || {};
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

  if (!call) return null;

  var accept = function () {
    var callId = call.callId;
    var callType = call.callType;
    var callerName = call.callerName;
    setCall(null);

    // Accept on backend
    apiPost("/api/conversations/calls/" + callId + "/accept/").catch(function () {});

    // Navigate to call screen
    var route = callType === "video"
      ? "/video-call/" + callId + "?answering=true&buddyName=" + encodeURIComponent(callerName)
      : "/voice-call/" + callId + "?answering=true&buddyName=" + encodeURIComponent(callerName);
    navigate(route);
  };

  var reject = function () {
    var callId = call.callId;
    setCall(null);
    apiPost("/api/conversations/calls/" + callId + "/reject/").catch(function () {});
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
