import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bot, Sparkles, Target, Flame, TrendingUp,
  Brain, MessageCircle, Send, Zap, Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { CONVERSATIONS } from "../../services/endpoints";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { adaptColor } from "../../styles/colors";
import { useToast } from "../../context/ToastContext";
import IconButton from "../../components/shared/IconButton";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GlassInput from "../../components/shared/GlassInput";

const SUGGESTIONS = [
  { icon: Target, text: "Help me plan my goals for this week", color: "#8B5CF6" },
  { icon: Flame, text: "What should I focus on today?", color: "#F69A9A" },
  { icon: TrendingUp, text: "Review my progress and give feedback", color: "#5DE5A8" },
  { icon: Brain, text: "I need motivation to keep going", color: "#FCD34D" },
  { icon: Sparkles, text: "Suggest a new dream I could pursue", color: "#C4B5FD" },
  { icon: Zap, text: "Give me a quick 2-minute challenge", color: "#14B8A6" },
];

export default function NewChatScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  var { showToast } = useToast();
  var [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");

  var templatesQuery = useQuery({
    queryKey: ["conversation-templates"],
    queryFn: function () { return apiGet(CONVERSATIONS.TEMPLATES); },
  });
  var templates = templatesQuery.data?.results || templatesQuery.data || [];

  var displaySuggestions = templates.length > 0
    ? templates.map(function (t) {
        return { icon: Target, text: t.title || t.name, color: "#8B5CF6" };
      })
    : SUGGESTIONS;

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 70}ms`,
  });

  var handleSend = async function (text) {
    var msg = (text || message).trim();
    if (!msg || creating) return;
    setCreating(true);
    try {
      var conv = await apiPost(CONVERSATIONS.LIST, { conversation_type: "general", title: msg.slice(0, 60) });
      navigate("/chat/" + conv.id, { state: { initialMessage: msg } });
    } catch (err) {
      showToast(err.message || "Failed to start conversation", "error");
      setCreating(false);
    }
  };

  return (
    <PageLayout showNav={false} header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={() => navigate("/")} />}
        title="New Chat"
      />
    }>
      <div style={{ paddingBottom: 40, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* AI Avatar + Welcome */}
        <div style={{ textAlign: "center", marginBottom: 36, ...stagger(1) }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(196,181,253,0.15))",
            border: "2px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center",
            justifyContent: "center", boxShadow: "0 0 40px rgba(139,92,246,0.2)",
          }}>
            <Bot size={32} color="var(--dp-accent)" />
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
            <MessageCircle size={15} color="var(--dp-accent)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-secondary)" }}>Suggestions</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {displaySuggestions.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => handleSend(s.text)}
                  className="dp-gh"
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
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${s.color}15`, border: `1px solid ${s.color}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={16} color={adaptColor(s.color, isLight)} />
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
        <div style={{ ...stagger(9) }}>
          <GlassInput
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && message.trim() && !creating) handleSend(); }}
            placeholder={creating ? "Starting conversation..." : "Type a message..."}
            disabled={creating}
            style={{ borderRadius: 18, padding: "10px 14px" }}
          />
        </div>
      </div>
    </PageLayout>
  );
}
