import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { apiGet, apiPost } from "../../services/api";
import { CONVERSATIONS } from "../../services/endpoints";
import { createAgoraCallSession } from "../../services/agora";

function formatTime(s) {
  var m = Math.floor(s / 60);
  var sec = s % 60;
  return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

export default function VoiceCallScreen() {
  var navigate = useNavigate();
  var { id: callId } = useParams();
  var [searchParams] = useSearchParams();
  var { resolved } = useTheme();
  var isLight = resolved === "light";

  var answering = searchParams.get("answering") === "true";
  var callerName = searchParams.get("callerName") || "Unknown";
  var buddyName = searchParams.get("buddyName") || callerName;
  var buddyInitial = buddyName.charAt(0).toUpperCase();
  var buddyColor = searchParams.get("color") || "#8B5CF6";

  var [callStatus, setCallStatus] = useState(answering ? "connecting" : "ringing");
  var [seconds, setSeconds] = useState(0);
  var [muted, setMuted] = useState(false);
  var [speaker, setSpeaker] = useState(false);
  var [error, setError] = useState(null);
  var timerRef = useRef(null);
  var sessionRef = useRef(null);
  var pollRef = useRef(null);

  var handleCallEnd = useCallback(function () {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    if (sessionRef.current) {
      sessionRef.current.leave();
      sessionRef.current = null;
    }
    apiPost(CONVERSATIONS.CALLS.END(callId)).catch(function () {});
    navigate(-1);
  }, [navigate, callId]);

  // Join the Agora RTC channel (called only when both sides are ready)
  var joinRTC = useCallback(function () {
    if (sessionRef.current) return; // already joined
    var session = createAgoraCallSession(callId, {
      video: false,
      onRemoteStream: function () {},
      onRemoteLeft: function () {
        handleCallEnd();
      },
      onConnectionStateChange: function (state) {
        if (state.curState === "CONNECTED") {
          setCallStatus("connected");
        }
      },
    });
    sessionRef.current = session;
    session.join().catch(function (err) {
      setError(err.message || "Could not access microphone");
    });
  }, [callId, handleCallEnd]);

  // ─── CALLER flow: listen for WS events + poll for acceptance ──
  // Rejection/missed: instant via notification WebSocket (dp-call-status event)
  useEffect(function () {
    if (answering) return;
    function handleCallStatus(e) {
      var data = e.detail || {};
      if (String(data.callId) !== String(callId)) return;
      if (data.status === "rejected" || data.status === "missed" || data.status === "cancelled") {
        if (pollRef.current) clearInterval(pollRef.current);
        setCallStatus("ended");
        setError(data.status === "rejected" ? "Call declined" : data.status === "missed" ? "No answer" : "Call ended");
        setTimeout(function () { navigate(-1); }, 1500);
      }
    }
    window.addEventListener("dp-call-status", handleCallStatus);
    return function () { window.removeEventListener("dp-call-status", handleCallStatus); };
  }, [callId, answering, navigate]);

  // Acceptance: poll (backend doesn't broadcast accepted event via WS)
  useEffect(function () {
    if (answering) return;
    function checkStatus() {
      apiGet(CONVERSATIONS.CALLS.STATUS(callId)).then(function (data) {
        var s = data.status;
        if (s === "accepted") {
          if (pollRef.current) clearInterval(pollRef.current);
          setCallStatus("connecting");
          joinRTC();
        } else if (s === "rejected" || s === "cancelled" || s === "missed" || s === "completed") {
          // Already handled by WS event above, but catch edge cases
          if (pollRef.current) clearInterval(pollRef.current);
          setCallStatus("ended");
          setError(s === "rejected" ? "Call declined" : s === "missed" ? "No answer" : "Call ended");
          setTimeout(function () { navigate(-1); }, 1500);
        }
      }).catch(function () {});
    }
    checkStatus();
    pollRef.current = setInterval(checkStatus, 2000);
    return function () { if (pollRef.current) clearInterval(pollRef.current); };
  }, [callId, answering, joinRTC, navigate]);

  // ─── CALLEE flow: accept then join RTC ────────────────────────
  useEffect(function () {
    if (!answering) return;
    // Accept the call via API, then join RTC
    apiPost(CONVERSATIONS.CALLS.ACCEPT(callId)).then(function () {
      setCallStatus("connecting");
      joinRTC();
    }).catch(function (err) {
      setError(err.message || "Failed to accept call");
    });
  }, [callId, answering, joinRTC]);

  // Timer when connected
  useEffect(function () {
    if (callStatus === "connected") {
      timerRef.current = setInterval(function () {
        setSeconds(function (s) { return s + 1; });
      }, 1000);
    }
    return function () {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Auto-timeout: cancel call after 30s of ringing
  useEffect(function () {
    if (callStatus !== "ringing") return;
    var timeout = setTimeout(function () {
      apiPost(CONVERSATIONS.CALLS.CANCEL(callId)).catch(function () {});
      setError("No answer");
      setTimeout(function () { navigate(-1); }, 1500);
    }, 30000);
    return function () { clearTimeout(timeout); };
  }, [callStatus, callId, navigate]);

  var endCall = function () {
    if (sessionRef.current) {
      sessionRef.current.leave();
    }
    apiPost(CONVERSATIONS.CALLS.END(callId)).catch(function () {});
    navigate(-1);
  };

  var cancelCall = function () {
    apiPost(CONVERSATIONS.CALLS.CANCEL(callId)).catch(function () {});
    navigate(-1);
  };

  var handleToggleMute = function () {
    if (sessionRef.current) {
      var result = sessionRef.current.toggleMute();
      setMuted(result);
    }
  };

  var actionBtn = function (Icon, active, toggle, color) {
    return (
      <button
        onClick={toggle}
        style={{
          width: 60, height: 60, borderRadius: 20,
          background: active
            ? "rgba(255,255,255,0.15)"
            : isLight ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.08)",
          border: active
            ? "1px solid rgba(255,255,255,0.25)"
            : isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <Icon size={24} color={color || (isLight ? "#1a1535" : "#fff")} />
      </button>
    );
  };

  var statusText = error ? error
    : callStatus === "ringing" ? "Calling..."
    : callStatus === "connecting" ? "Connecting..."
    : callStatus === "connected" ? "Connected"
    : callStatus === "ended" ? "Call ended"
    : "...";

  return (
    <PageLayout showNav={false}>
      <style>{"\
        @keyframes vcPulse1 { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.8); opacity: 0; } }\
        @keyframes vcPulse2 { 0% { transform: scale(1); opacity: 0.3; } 100% { transform: scale(2.2); opacity: 0; } }\
        @keyframes vcFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }\
      "}</style>

      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, sans-serif", padding: "40px 20px",
        animation: "vcFadeIn 0.4s ease-out",
      }}>
        {/* Avatar with pulse rings */}
        <div style={{ position: "relative", marginBottom: 32 }}>
          {callStatus !== "connected" && (
            <>
              <div style={{
                position: "absolute", inset: -20,
                borderRadius: "50%", border: "2px solid " + buddyColor,
                animation: "vcPulse1 1.5s ease-out infinite",
              }} />
              <div style={{
                position: "absolute", inset: -20,
                borderRadius: "50%", border: "2px solid " + buddyColor,
                animation: "vcPulse2 1.5s ease-out infinite 0.5s",
              }} />
            </>
          )}
          <div style={{
            width: 120, height: 120, borderRadius: "50%",
            background: "linear-gradient(135deg, " + buddyColor + ", " + buddyColor + "88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 44, fontWeight: 700, color: "#fff",
            border: callStatus === "connected"
              ? "3px solid " + buddyColor
              : "3px solid rgba(255,255,255,0.15)",
            boxShadow: "0 0 40px " + buddyColor + "30",
            transition: "border 0.5s",
          }}>
            {buddyInitial}
          </div>
        </div>

        {/* Name */}
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
          margin: "0 0 8px", letterSpacing: "-0.5px",
        }}>
          {buddyName}
        </h1>

        {/* Status */}
        <p style={{
          fontSize: 15, color: callStatus === "connected"
            ? (isLight ? "#059669" : "#5DE5A8")
            : error ? (isLight ? "#DC2626" : "#F69A9A")
            : "var(--dp-text-tertiary)",
          margin: "0 0 8px", fontWeight: 500,
          transition: "color 0.3s",
        }}>
          {statusText}
        </p>

        {/* Timer */}
        {callStatus === "connected" && (
          <p style={{
            fontSize: 32, fontWeight: 300, color: "var(--dp-text-secondary)",
            margin: 0, fontVariantNumeric: "tabular-nums", letterSpacing: "2px",
          }}>
            {formatTime(seconds)}
          </p>
        )}

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: 60 }} />

        {/* Action buttons */}
        <div style={{
          display: "flex", alignItems: "center", gap: 20,
          marginBottom: 40,
        }}>
          {callStatus === "connected" && actionBtn(muted ? MicOff : Mic, muted, handleToggleMute)}

          {/* End/Cancel call */}
          <button
            onClick={callStatus === "ringing" ? cancelCall : endCall}
            style={{
              width: 72, height: 72, borderRadius: 24,
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
              transition: "transform 0.15s",
            }}
            onMouseDown={function (e) { e.currentTarget.style.transform = "scale(0.92)"; }}
            onMouseUp={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
            onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <PhoneOff size={28} color="#fff" />
          </button>

          {callStatus === "connected" && actionBtn(speaker ? VolumeX : Volume2, speaker, function () { setSpeaker(!speaker); })}
        </div>
      </div>
    </PageLayout>
  );
}
