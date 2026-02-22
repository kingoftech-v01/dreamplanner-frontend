import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PhoneOff, Mic, MicOff, Camera, CameraOff, RefreshCw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const BUDDY_MAP = {
  alex: { name: "Alex Thompson", initial: "A", color: "#14B8A6" },
  l5:   { name: "Alex Thompson", initial: "A", color: "#14B8A6" },
  l1:   { name: "Jade Rivers",   initial: "J", color: "#EC4899" },
  om1:  { name: "Omar Hassan",   initial: "O", color: "#F59E0B" },
  l3:   { name: "Lisa Chen",     initial: "L", color: "#6366F1" },
  fr2:  { name: "Noah Williams",  initial: "N", color: "#10B981" },
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function VideoCallScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { resolved } = useTheme();
  const isLight = resolved === "light";

  const buddy = BUDDY_MAP[id] || { name: "Unknown", initial: "?", color: "#8B5CF6" };

  const [status, setStatus] = useState("connecting"); // connecting | connected
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const timerRef = useRef(null);

  // Simulate connection after 2s
  useEffect(() => {
    const t = setTimeout(() => setStatus("connected"), 2000);
    return () => clearTimeout(t);
  }, []);

  // Timer when connected
  useEffect(() => {
    if (status === "connected") {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const endCall = () => navigate(-1);

  const actionBtn = (Icon, active, toggle) => (
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

  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      fontFamily: "Inter, sans-serif",
    }}>
      <style>{`
        @keyframes vidFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes vidSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Remote video (simulated gradient) */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, ${buddy.color}40, #0a0520 40%, #1a0a30 70%, ${buddy.color}20)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "vidFadeIn 0.5s ease-out",
      }}>
        {/* Buddy large avatar placeholder */}
        <div style={{
          width: 140, height: 140, borderRadius: "50%",
          background: `linear-gradient(135deg, ${buddy.color}, ${buddy.color}66)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 56, fontWeight: 700, color: "#fff",
          opacity: status === "connecting" ? 0.5 : 0.8,
          transition: "opacity 0.5s",
          boxShadow: `0 0 60px ${buddy.color}30`,
        }}>
          {buddy.initial}
        </div>
      </div>

      {/* Top overlay — name + timer */}
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
            {buddy.name}
          </h2>
          <p style={{
            fontSize: 14, color: "rgba(255,255,255,0.7)",
            margin: 0, fontWeight: 500,
          }}>
            {status === "connecting"
              ? "Connecting..."
              : formatTime(seconds)}
          </p>
        </div>
      </div>

      {/* Self PiP view */}
      <div style={{
        position: "absolute", top: 100, right: 16, zIndex: 20,
        width: 100, height: 140, borderRadius: 16,
        background: cameraOff
          ? "rgba(30,20,50,0.9)"
          : "linear-gradient(135deg, #1a1535, #2d1b69)",
        border: "2px solid rgba(255,255,255,0.15)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        animation: "vidSlideUp 0.5s ease-out 0.3s both",
      }}>
        {cameraOff ? (
          <CameraOff size={24} color="rgba(255,255,255,0.4)" />
        ) : (
          <span style={{
            fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.8)",
          }}>
            S
          </span>
        )}
      </div>

      {/* Bottom action bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "20px 20px 40px", zIndex: 10,
        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
        display: "flex", justifyContent: "center",
        animation: "vidSlideUp 0.5s ease-out 0.2s both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {actionBtn(muted ? MicOff : Mic, muted, () => setMuted(!muted))}
          {actionBtn(cameraOff ? CameraOff : Camera, cameraOff, () => setCameraOff(!cameraOff))}
          {actionBtn(RefreshCw, false, () => {})}

          {/* End call */}
          <button
            onClick={endCall}
            style={{
              width: 60, height: 60, borderRadius: 20,
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
              border: "none", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
              transition: "transform 0.15s",
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.92)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <PhoneOff size={26} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}
