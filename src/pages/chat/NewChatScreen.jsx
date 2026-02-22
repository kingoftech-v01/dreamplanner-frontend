import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bot, Sparkles, Target, Flame, TrendingUp,
  Brain, MessageCircle, Send, Zap,
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";

const SUGGESTIONS = [
  { icon: Target, text: "Help me plan my goals for this week", color: "#8B5CF6" },
  { icon: Flame, text: "What should I focus on today?", color: "#F69A9A" },
  { icon: TrendingUp, text: "Review my progress and give feedback", color: "#5DE5A8" },
  { icon: Brain, text: "I need motivation to keep going", color: "#FCD34D" },
  { icon: Sparkles, text: "Suggest a new dream I could pursue", color: "#C4B5FD" },
  { icon: Zap, text: "Give me a quick 2-minute challenge", color: "#14B8A6" },
];

const LIGHT_COLOR_MAP = {
  "#C4B5FD": "#6D28D9",
  "#5DE5A8": "#059669",
  "#FCD34D": "#B45309",
  "#F69A9A": "#DC2626",
};

export default function NewChatScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 70}ms`,
  });

  const handleSend = (text) => {
    // Navigate to a new chat with the suggestion as context
    navigate("/chat/new", { state: { initialMessage: text || message } });
  };

  return (
    <PageLayout showNav={false}>
      <div style={{ paddingTop: 20, paddingBottom: 40, fontFamily: "'Inter', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, ...stagger(0) }}>
          <button className="dp-ib" onClick={() => navigate("/")}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>New Chat</span>
        </div>

        {/* AI Avatar + Welcome */}
        <div style={{ textAlign: "center", marginBottom: 36, ...stagger(1) }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(196,181,253,0.15))",
            border: "2px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center",
            justifyContent: "center", boxShadow: "0 0 40px rgba(139,92,246,0.2)",
          }}>
            <Bot size={32} color={isLight ? "#6D28D9" : "#C4B5FD"} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
            DreamPlanner AI Coach
          </h1>
          <p style={{ fontSize: 14, color: "var(--dp-text-tertiary)", margin: 0, lineHeight: 1.5, maxWidth: 300, marginLeft: "auto", marginRight: "auto" }}>
            Your personal AI coach to help you achieve your dreams. Ask me anything!
          </p>
        </div>

        {/* Suggestion Cards */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, ...stagger(2) }}>
            <MessageCircle size={15} color={isLight ? "#6D28D9" : "#C4B5FD"} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-secondary)" }}>Suggestions</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SUGGESTIONS.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleSend(s.text)}
                  style={{
                    ...stagger(3 + i),
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px", borderRadius: 16,
                    background: "var(--dp-glass-bg)",
                    border: "1px solid var(--dp-glass-border)",
                    cursor: "pointer", textAlign: "left",
                    transition: "all 0.2s ease",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "var(--dp-surface-hover)";
                    e.currentTarget.style.borderColor = `${s.color}30`;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "var(--dp-glass-bg)";
                    e.currentTarget.style.borderColor = "var(--dp-glass-border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${s.color}15`, border: `1px solid ${s.color}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={16} color={isLight && LIGHT_COLOR_MAP[s.color] ? LIGHT_COLOR_MAP[s.color] : s.color} />
                  </div>
                  <span style={{ fontSize: 14, color: "var(--dp-text-primary)", fontWeight: 500 }}>
                    {s.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Input Bar */}
        <div style={{
          ...stagger(9),
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 18,
          background: "var(--dp-glass-bg)",
          border: "1px solid var(--dp-input-border)",
        }}>
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && message.trim()) handleSend(); }}
            placeholder="Type a message..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--dp-text)", fontSize: 15, fontFamily: "Inter, sans-serif",
            }}
          />
          <button
            onClick={() => message.trim() && handleSend()}
            disabled={!message.trim()}
            style={{
              width: 38, height: 38, borderRadius: 12, border: "none",
              background: message.trim() ? "linear-gradient(135deg, #8B5CF6, #7C3AED)" : "var(--dp-glass-bg)",
              cursor: message.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: message.trim() ? "0 2px 12px rgba(139,92,246,0.3)" : "none",
            }}
          >
            <Send size={16} color={message.trim() ? "#fff" : "var(--dp-text-muted)"} />
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
