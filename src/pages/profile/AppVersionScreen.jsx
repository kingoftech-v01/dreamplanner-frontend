import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, FileText, Shield, CheckCircle,
  ChevronRight, Heart,
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";

export default function AppVersionScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [upToDate, setUpToDate] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 60}ms`,
  });

  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    setTimeout(() => { setCheckingUpdate(false); setUpToDate(true); }, 1500);
  };

  return (
    <PageLayout showNav={false}>
      <div style={{ paddingTop: 20, paddingBottom: 40, fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, ...stagger(0) }}>
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>About</span>
        </div>

        {/* App Icon & Name */}
        <div style={{ textAlign: "center", marginBottom: 32, ...stagger(1) }}>
          <div style={{
            width: 88, height: 88, borderRadius: 24, margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(196,181,253,0.15))",
            border: "2px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center",
            justifyContent: "center", boxShadow: "0 0 50px rgba(139,92,246,0.2)",
          }}>
            <Sparkles size={36} color={isLight ? "#6D28D9" : "#C4B5FD"} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            DreamPlanner
          </h1>
          <p style={{ fontSize: 14, color: "var(--dp-text-tertiary)", margin: "0 0 2px" }}>Version 1.0.0</p>
          <p style={{ fontSize: 12, color: "var(--dp-text-muted)", margin: 0 }}>Build 2026.02.1</p>
        </div>

        {/* Check for Updates */}
        <div style={{ marginBottom: 24, ...stagger(2) }}>
          <button onClick={handleCheckUpdate} disabled={checkingUpdate} style={{
            width: "100%", padding: "14px 16px", borderRadius: 16,
            background: upToDate ? "rgba(93,229,168,0.08)" : "rgba(139,92,246,0.1)",
            border: upToDate ? "1px solid rgba(93,229,168,0.2)" : "1px solid rgba(139,92,246,0.2)",
            cursor: checkingUpdate ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontFamily: "inherit", fontSize: 14, fontWeight: 600,
            color: upToDate ? (isLight ? "#059669" : "#5DE5A8") : (isLight ? "#6D28D9" : "#C4B5FD"),
            transition: "all 0.3s",
          }}>
            {checkingUpdate ? (
              <>
                <div style={{
                  width: 16, height: 16, border: "2px solid rgba(196,181,253,0.2)",
                  borderTopColor: "#C4B5FD", borderRadius: "50%",
                  animation: "dpSpin 0.8s linear infinite",
                }} />
                Checking for updates...
              </>
            ) : upToDate ? (
              <>
                <CheckCircle size={16} />
                You're up to date!
              </>
            ) : (
              "Check for Updates"
            )}
          </button>
        </div>

        {/* Info Cards */}
        <div style={{ marginBottom: 24, ...stagger(3) }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Information
          </div>
          {[
            { label: "Platform", value: "Web (React)" },
            { label: "Environment", value: "Production" },
            { label: "API Version", value: "v2.1" },
            { label: "Last Sync", value: "Just now" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderRadius: 14, marginBottom: 4,
              background: "var(--dp-glass-bg)",
              border: "1px solid var(--dp-glass-border)",
            }}>
              <span style={{ fontSize: 13, color: "var(--dp-text-secondary)" }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dp-text-primary)" }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Links */}
        <div style={{ marginBottom: 24, ...stagger(4) }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Legal
          </div>
          {[
            { icon: FileText, label: "Terms of Service", route: "/terms" },
            { icon: Shield, label: "Privacy Policy", route: "/privacy" },
          ].map(({ icon: I, label, route }, i) => (
            <div key={i} onClick={() => navigate(route)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 14, marginBottom: 4,
              background: "var(--dp-glass-bg)",
              border: "1px solid var(--dp-glass-border)",
              cursor: "pointer", transition: "background 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--dp-surface-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--dp-glass-bg)"}
            >
              <I size={16} color="var(--dp-text-tertiary)" />
              <span style={{ flex: 1, fontSize: 13, color: "var(--dp-text-primary)", fontWeight: 500 }}>{label}</span>
              <ChevronRight size={16} color="var(--dp-text-muted)" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 32, ...stagger(5) }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>Made with</span>
            <Heart size={12} color={isLight ? "#DC2626" : "#F69A9A"} fill={isLight ? "#DC2626" : "#F69A9A"} />
            <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>for dreamers</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--dp-text-muted)", margin: 0 }}>
            &copy; 2026 DreamPlanner. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes dpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </PageLayout>
  );
}
