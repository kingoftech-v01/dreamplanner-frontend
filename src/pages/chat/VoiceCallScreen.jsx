import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { apiPost } from "../../services/api";
import { createCallSession } from "../../services/webrtc";

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

  var [status, setStatus] = useState(answering ? "connecting" : "calling");
  var [seconds, setSeconds] = useState(0);
  var [muted, setMuted] = useState(false);
  var [speaker, setSpeaker] = useState(false);
  var [error, setError] = useState(null);
  var timerRef = useRef(null);
  var sessionRef = useRef(null);

  var handleCallEnd = useCallback(function () {
    if (timerRef.current) clearInterval(timerRef.current);
    navigate(-1);
  }, [navigate]);

  // Initialize WebRTC session
  useEffect(function () {
    var session = createCallSession(callId, {
      video: false,
      onRemoteStream: function () {},
      onConnectionStateChange: function (state) {
        if (state === "connected") {
          setStatus("connected");
        }
      },
      onCallEnd: handleCallEnd,
    });
    sessionRef.current = session;

    var isCaller = !answering;
    session.start(isCaller).catch(function (err) {
      setError("Could not access microphone");
      console.error("WebRTC start failed:", err);
    });

    return function () {
      session.cleanup();
    };
  }, [callId, answering, handleCallEnd]);

  // Timer when connected
  useEffect(function () {
    if (status === "connected") {
      timerRef.current = setInterval(function () {
        setSeconds(function (s) { return s + 1; });
      }, 1000);
    }
    return function () {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  var endCall = function () {
    if (sessionRef.current) {
      sessionRef.current.endCall();
    }
    apiPost("/api/conversations/calls/" + callId + "/end/").catch(function () {});
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
          {status !== "connected" && (
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
            border: status === "connected"
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
          fontSize: 15, color: status === "connected"
            ? (isLight ? "#059669" : "#5DE5A8")
            : "var(--dp-text-tertiary)",
          margin: "0 0 8px", fontWeight: 500,
          transition: "color 0.3s",
        }}>
          {error ? error : status === "calling" ? "Calling..." : status === "connecting" ? "Connecting..." : "Connected"}
        </p>

        {/* Timer */}
        {status === "connected" && (
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
          {actionBtn(muted ? MicOff : Mic, muted, handleToggleMute)}

          {/* End call */}
          <button
            onClick={endCall}
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

          {actionBtn(speaker ? VolumeX : Volume2, speaker, function () { setSpeaker(!speaker); })}
        </div>
      </div>
    </PageLayout>
  );
}
