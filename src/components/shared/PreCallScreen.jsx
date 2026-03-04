import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, Camera, CameraOff, Settings,
  Phone, X, Loader, Sparkles
} from "lucide-react";
import CallSettings from "./CallSettings";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Pre-Call Screen (Lobby)
 *
 * Shown before joining a call. Provides:
 * - Self video preview (video calls) or avatar (audio calls)
 * - Mic mute/unmute toggle
 * - Camera on/off toggle (video calls)
 * - Gear icon to open CallSettings panel
 * - "Join Call" and "Cancel" buttons
 *
 * Glass morphism styling consistent with the rest of the app.
 * ═══════════════════════════════════════════════════════════════════ */

var DEFAULT_SETTINGS = {
  blurLevel: "off",
  bgPreset: "none",
  noiseSuppression: false,
  micDevice: "",
  speakerDevice: "",
  cameraDevice: "",
  mirrorMode: true,
  videoQuality: "auto",
};

export default function PreCallScreen({
  isVideo,
  buddyName,
  buddyColor,
  onJoin,
  onCancel,
  isGroup,
}) {
  var [muted, setMuted] = useState(false);
  var [cameraOff, setCameraOff] = useState(false);
  var [settingsOpen, setSettingsOpen] = useState(false);
  var [settings, setSettings] = useState(DEFAULT_SETTINGS);
  var [previewStream, setPreviewStream] = useState(null);
  var [permissionError, setPermissionError] = useState(null);
  var [joining, setJoining] = useState(false);
  var previewRef = useRef(null);

  var color = buddyColor || "#8B5CF6";
  var name = buddyName || "Call";
  var initial = name.charAt(0).toUpperCase();

  // Start camera preview for video calls
  useEffect(function () {
    if (!isVideo || cameraOff) {
      if (previewStream) {
        previewStream.getTracks().forEach(function (t) { t.stop(); });
        setPreviewStream(null);
      }
      return;
    }

    var cancelled = false;
    var stream = null;
    var constraints = { video: { width: 640, height: 480 } };
    if (settings.cameraDevice) {
      constraints.video.deviceId = { exact: settings.cameraDevice };
    }

    navigator.mediaDevices.getUserMedia(constraints).then(function (s) {
      if (cancelled) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      setPreviewStream(s);
      setPermissionError(null);
    }).catch(function (err) {
      if (!cancelled) {
        setPermissionError("Camera access required. Please check browser permissions.");
      }
    });

    return function () {
      cancelled = true;
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    };
  }, [isVideo, cameraOff, settings.cameraDevice]);

  // Play preview in video element
  useEffect(function () {
    if (previewRef.current && previewStream) {
      previewRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Cleanup preview on unmount
  useEffect(function () {
    return function () {
      if (previewStream) {
        previewStream.getTracks().forEach(function (t) { t.stop(); });
      }
    };
  }, []);

  var handleJoin = function () {
    setJoining(true);
    // Stop preview stream before joining (Agora creates its own)
    if (previewStream) {
      previewStream.getTracks().forEach(function (t) { t.stop(); });
      setPreviewStream(null);
    }
    if (onJoin) onJoin({ muted: muted, cameraOff: cameraOff, settings: settings });
  };

  var handleCancel = function () {
    if (previewStream) {
      previewStream.getTracks().forEach(function (t) { t.stop(); });
      setPreviewStream(null);
    }
    if (onCancel) onCancel();
  };

  var actionBtn = function (Icon, active, toggle, label) {
    return (
      <button
        onClick={toggle}
        aria-label={label}
        style={{
          width: 52, height: 52, borderRadius: 16,
          background: active
            ? "rgba(239,68,68,0.15)"
            : "var(--dp-surface)",
          border: active
            ? "1px solid rgba(239,68,68,0.25)"
            : "1px solid var(--dp-glass-border)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all 0.2s",
          fontFamily: "inherit",
          padding: 0,
        }}
      >
        <Icon
          size={22}
          strokeWidth={2}
          color={active ? "#EF4444" : "var(--dp-text-secondary)"}
        />
      </button>
    );
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9990,
      background: "rgba(3,1,10,0.97)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      animation: "pcFadeIn 0.3s ease-out",
    }}>
      <style>{"\
        @keyframes pcFadeIn { from { opacity: 0; } to { opacity: 1; } }\
        @keyframes pcSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }\
      "}</style>

      {/* Top section — call info */}
      <div style={{
        textAlign: "center", marginBottom: 32,
        animation: "pcSlideUp 0.4s ease-out 0.1s both",
      }}>
        <h2 style={{
          fontSize: 20, fontWeight: 700, color: "#fff",
          margin: "0 0 4px", letterSpacing: "-0.3px",
        }}>
          {isGroup ? "Join group call" : "Call " + name}
        </h2>
        <p style={{
          fontSize: 14, color: "rgba(255,255,255,0.5)",
          margin: 0, fontWeight: 500,
        }}>
          {isVideo ? "Video call" : "Voice call"} — adjust your settings
        </p>
      </div>

      {/* Preview area */}
      <div style={{
        width: 280, height: isVideo ? 200 : 160,
        borderRadius: 20,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 32,
        position: "relative",
        animation: "pcSlideUp 0.4s ease-out 0.2s both",
      }}>
        {isVideo && !cameraOff && previewStream ? (
          <video
            ref={previewRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%", height: "100%",
              objectFit: "cover",
              transform: settings.mirrorMode !== false ? "scaleX(-1)" : "none",
            }}
          />
        ) : (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg, " + color + ", " + color + "66)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, fontWeight: 700, color: "#fff",
              boxShadow: "0 0 40px " + color + "30",
            }}>
              {initial}
            </div>
            {isVideo && cameraOff && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                Camera off
              </span>
            )}
          </div>
        )}

        {permissionError && (
          <div style={{
            position: "absolute", bottom: 8, left: 8, right: 8,
            padding: "6px 10px", borderRadius: 8,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.2)",
            fontSize: 11, color: "#F69A9A", textAlign: "center",
          }}>
            {permissionError}
          </div>
        )}

        {/* Noise suppression badge */}
        {settings.noiseSuppression && (
          <div style={{
            position: "absolute", top: 10, left: 10,
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 8,
            background: "rgba(139,92,246,0.2)",
            border: "1px solid rgba(139,92,246,0.25)",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          }}>
            <Sparkles size={10} color="#C4B5FD" />
            <span style={{ fontSize: 10, fontWeight: 600, color: "#C4B5FD" }}>
              Noise suppression
            </span>
          </div>
        )}

        {/* Muted indicator */}
        {muted && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 8,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.2)",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          }}>
            <MicOff size={10} color="#F69A9A" />
            <span style={{ fontSize: 10, fontWeight: 600, color: "#F69A9A" }}>Muted</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        marginBottom: 40,
        animation: "pcSlideUp 0.4s ease-out 0.3s both",
      }}>
        {actionBtn(muted ? MicOff : Mic, muted, function () { setMuted(!muted); }, "Toggle microphone")}
        {isVideo && actionBtn(cameraOff ? CameraOff : Camera, cameraOff, function () { setCameraOff(!cameraOff); }, "Toggle camera")}
        <button
          onClick={function () { setSettingsOpen(true); }}
          aria-label="Call settings"
          style={{
            width: 52, height: 52, borderRadius: 16,
            background: "var(--dp-surface)",
            border: "1px solid var(--dp-glass-border)",
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.2s",
            fontFamily: "inherit",
            padding: 0,
          }}
        >
          <Settings size={22} strokeWidth={2} color="var(--dp-text-secondary)" />
        </button>
      </div>

      {/* Join / Cancel buttons */}
      <div style={{
        display: "flex", gap: 12,
        animation: "pcSlideUp 0.4s ease-out 0.4s both",
      }}>
        <button
          onClick={handleCancel}
          style={{
            padding: "14px 32px", borderRadius: 16,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 15, fontWeight: 600,
            cursor: "pointer", transition: "all 0.2s",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleJoin}
          disabled={joining}
          style={{
            padding: "14px 40px", borderRadius: 16,
            background: "linear-gradient(135deg, #10B981, #059669)",
            border: "none",
            color: "#fff",
            fontSize: 15, fontWeight: 600,
            cursor: joining ? "default" : "pointer",
            transition: "all 0.2s",
            boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
            display: "flex", alignItems: "center", gap: 8,
            opacity: joining ? 0.7 : 1,
            fontFamily: "inherit",
          }}
        >
          {joining ? (
            <>
              <Loader size={16} style={{ animation: "pcSpin 1s linear infinite" }} />
              Joining...
            </>
          ) : (
            <>
              <Phone size={16} />
              Join Call
            </>
          )}
        </button>
      </div>

      <style>{"\
        @keyframes pcSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\
      "}</style>

      {/* Settings panel */}
      <CallSettings
        open={settingsOpen}
        onClose={function () { setSettingsOpen(false); }}
        isVideo={isVideo}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}
