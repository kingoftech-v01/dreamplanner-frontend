import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
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

export default function VoiceCallScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { resolved } = useTheme();
  const isLight = resolved === "light";

  const buddy = BUDDY_MAP[id] || { name: "Unknown", initial: "?", color: "#8B5CF6" };

  const [status, setStatus] = useState("calling"); // calling | connected
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
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

  const actionBtn = (Icon, active, toggle, color) => (
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

  return (
    <PageLayout showNav={false}>
      <style>{`
        @keyframes vcPulse1 {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes vcPulse2 {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes vcFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, sans-serif", padding: "40px 20px",
        animation: "vcFadeIn 0.4s ease-out",
      }}>
        {/* Avatar with pulse rings */}
        <div style={{ position: "relative", marginBottom: 32 }}>
          {status === "calling" && (
            <>
              <div style={{
                position: "absolute", inset: -20,
                borderRadius: "50%", border: `2px solid ${buddy.color}`,
                animation: "vcPulse1 1.5s ease-out infinite",
              }} />
              <div style={{
                position: "absolute", inset: -20,
                borderRadius: "50%", border: `2px solid ${buddy.color}`,
                animation: "vcPulse2 1.5s ease-out infinite 0.5s",
              }} />
            </>
          )}
          <div style={{
            width: 120, height: 120, borderRadius: "50%",
            background: `linear-gradient(135deg, ${buddy.color}, ${buddy.color}88)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 44, fontWeight: 700, color: "#fff",
            border: status === "connected"
              ? `3px solid ${buddy.color}`
              : "3px solid rgba(255,255,255,0.15)",
            boxShadow: `0 0 40px ${buddy.color}30`,
            transition: "border 0.5s",
          }}>
            {buddy.initial}
          </div>
        </div>

        {/* Name */}
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
          margin: "0 0 8px", letterSpacing: "-0.5px",
        }}>
          {buddy.name}
        </h1>

        {/* Status */}
        <p style={{
          fontSize: 15, color: status === "connected"
            ? (isLight ? "#059669" : "#5DE5A8")
            : "var(--dp-text-tertiary)",
          margin: "0 0 8px", fontWeight: 500,
          transition: "color 0.3s",
        }}>
          {status === "calling" ? "Calling..." : "Connected"}
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
          {actionBtn(muted ? MicOff : Mic, muted, () => setMuted(!muted))}

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
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.92)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <PhoneOff size={28} color="#fff" />
          </button>

          {actionBtn(speaker ? VolumeX : Volume2, speaker, () => setSpeaker(!speaker))}
        </div>
      </div>
    </PageLayout>
  );
}
