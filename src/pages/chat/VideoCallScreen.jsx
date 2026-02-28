import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PhoneOff, Mic, MicOff, Camera, CameraOff } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { apiGet, apiPost } from "../../services/api";
import { CONVERSATIONS } from "../../services/endpoints";
import { createAgoraCallSession } from "../../services/agora";

function formatTime(s) {
  var m = Math.floor(s / 60);
  var sec = s % 60;
  return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

export default function VideoCallScreen() {
  var navigate = useNavigate();
  var { id: callId } = useParams();
  var [searchParams] = useSearchParams();
  var { resolved } = useTheme();

  var answering = searchParams.get("answering") === "true";
  var callerName = searchParams.get("callerName") || "Unknown";
  var buddyName = searchParams.get("buddyName") || callerName;
  var buddyInitial = buddyName.charAt(0).toUpperCase();
  var buddyColor = searchParams.get("color") || "#8B5CF6";

  var [callStatus, setCallStatus] = useState(answering ? "connecting" : "ringing");
  var [seconds, setSeconds] = useState(0);
  var [muted, setMuted] = useState(false);
  var [cameraOff, setCameraOff] = useState(false);
  var [error, setError] = useState(null);
  var [hasRemoteStream, setHasRemoteStream] = useState(false);
  var timerRef = useRef(null);
  var sessionRef = useRef(null);
  var pollRef = useRef(null);
  var remoteVideoRef = useRef(null);
  var localVideoRef = useRef(null);

  var handleCallEnd = useCallback(function () {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    navigate(-1);
  }, [navigate]);

  // Join the Agora RTC channel (called only when both sides are ready)
  var joinRTC = useCallback(function () {
    if (sessionRef.current) return; // already joined
    var session = createAgoraCallSession(callId, {
      video: true,
      onRemoteStream: function (remote) {
        setHasRemoteStream(true);
        if (remote.videoTrack && remoteVideoRef.current) {
          remote.videoTrack.play(remoteVideoRef.current);
        }
      },
      onRemoteLeft: function () {
        setHasRemoteStream(false);
        handleCallEnd();
      },
      onConnectionStateChange: function (state) {
        if (state.curState === "CONNECTED") {
          setCallStatus("connected");
        }
      },
    });
    sessionRef.current = session;
    session.join().then(function () {
      var tracks = session.getLocalTracks();
      if (tracks.videoTrack && localVideoRef.current) {
        tracks.videoTrack.play(localVideoRef.current);
      }
    }).catch(function (err) {
      setError(err.message || "Could not access camera and microphone");
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

  var handleToggleCamera = function () {
    if (sessionRef.current) {
      var result = sessionRef.current.toggleCamera();
      setCameraOff(result);
    }
  };

  var actionBtn = function (Icon, active, toggle) {
    return (
      <button
        onClick={toggle}
        style={{
          width: 50, height: 50, borderRadius: 16,
          background: active
            ? "rgba(255,255,255,0.25)"
            : "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <Icon size={22} color="#fff" />
      </button>
    );
  };

  var statusText = error ? error
    : callStatus === "ringing" ? "Calling..."
    : callStatus === "connecting" ? "Connecting..."
    : callStatus === "connected" ? formatTime(seconds)
    : callStatus === "ended" ? "Call ended"
    : "...";

  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      fontFamily: "Inter, sans-serif",
    }}>
      <style>{"\
        @keyframes vidFadeIn { from { opacity: 0; } to { opacity: 1; } }\
        @keyframes vidSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }\
      "}</style>

      {/* Remote video */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, " + buddyColor + "40, #0a0520 40%, #1a0a30 70%, " + buddyColor + "20)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "vidFadeIn 0.5s ease-out",
      }}>
        {hasRemoteStream ? (
          <div
            ref={remoteVideoRef}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
            }}
          />
        ) : (
          <div style={{
            width: 140, height: 140, borderRadius: "50%",
            background: "linear-gradient(135deg, " + buddyColor + ", " + buddyColor + "66)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 56, fontWeight: 700, color: "#fff",
            opacity: callStatus === "connecting" || callStatus === "ringing" ? 0.5 : 0.8,
            transition: "opacity 0.5s",
            boxShadow: "0 0 60px " + buddyColor + "30",
          }}>
            {buddyInitial}
          </div>
        )}
      </div>

      {/* Top overlay — name + status */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "50px 20px 20px", zIndex: 10,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
        animation: "vidFadeIn 0.5s ease-out",
      }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{
            fontSize: 20, fontWeight: 700, color: "#fff",
            margin: "0 0 4px", letterSpacing: "-0.3px",
          }}>
            {buddyName}
          </h2>
          <p style={{
            fontSize: 14, color: error ? "#F69A9A" : "rgba(255,255,255,0.7)",
            margin: 0, fontWeight: 500,
          }}>
            {statusText}
          </p>
        </div>
      </div>

      {/* Self PiP view */}
      {callStatus === "connected" && (
        <div style={{
          position: "absolute", top: 100, right: 16, zIndex: 20,
          width: 100, height: 140, borderRadius: 16,
          background: cameraOff
            ? "rgba(30,20,50,0.9)"
            : "linear-gradient(135deg, #1a1535, #2d1b69)",
          border: "2px solid rgba(255,255,255,0.15)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          overflow: "hidden",
          animation: "vidSlideUp 0.5s ease-out 0.3s both",
        }}>
          {cameraOff ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
              <CameraOff size={24} color="rgba(255,255,255,0.4)" />
            </div>
          ) : (
            <div
              ref={localVideoRef}
              style={{
                width: "100%", height: "100%",
              }}
            />
          )}
        </div>
      )}

      {/* Bottom action bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "20px 20px 40px", zIndex: 10,
        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
        display: "flex", justifyContent: "center",
        animation: "vidSlideUp 0.5s ease-out 0.2s both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {callStatus === "connected" && actionBtn(muted ? MicOff : Mic, muted, handleToggleMute)}
          {callStatus === "connected" && actionBtn(cameraOff ? CameraOff : Camera, cameraOff, handleToggleCamera)}

          {/* End/Cancel call */}
          <button
            onClick={callStatus === "ringing" ? cancelCall : endCall}
            style={{
              width: 60, height: 60, borderRadius: 20,
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
              transition: "transform 0.15s",
            }}
            onMouseDown={function (e) { e.currentTarget.style.transform = "scale(0.92)"; }}
            onMouseUp={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
            onMouseLeave={function (e) { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <PhoneOff size={26} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}
