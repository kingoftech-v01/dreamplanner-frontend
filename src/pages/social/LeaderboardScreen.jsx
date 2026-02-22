import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Trophy, Globe, Users, Shield } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import PageLayout from "../../components/shared/PageLayout";
import { MOCK_LEADERBOARD } from "../../data/mockData";

const EXTENDED_LEADERBOARD = [
  ...MOCK_LEADERBOARD,
  { id: "l8", name: "Nina", initial: "N", xp: 1500, level: 7, rank: 8, streak: 6 },
  { id: "l9", name: "Kai", initial: "K", xp: 1350, level: 6, rank: 9, streak: 4 },
  { id: "l10", name: "Rosa", initial: "R", xp: 1200, level: 6, rank: 10, streak: 10 },
  { id: "l11", name: "Liam", initial: "L", xp: 1050, level: 5, rank: 11, streak: 3 },
  { id: "l12", name: "Priya", initial: "P", xp: 980, level: 5, rank: 12, streak: 7 },
];

const TIME_FILTERS = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "alltime", label: "All-time" },
];

const SCOPE_FILTERS = [
  { id: "global", label: "Global", icon: Globe },
  { id: "friends", label: "Friends", icon: Users },
  { id: "league", label: "League", icon: Shield },
];

const MEDAL_COLORS = {
  1: { bg: "#FCD34D", text: "#92400E", shadow: "0 4px 16px rgba(252,211,77,0.4)", border: "#F59E0B" },
  2: { bg: "#C0C0C0", text: "#374151", shadow: "0 4px 16px rgba(192,192,192,0.3)", border: "#9CA3AF" },
  3: { bg: "#CD7F32", text: "#451A03", shadow: "0 4px 16px rgba(205,127,50,0.3)", border: "#B45309" },
};

const AVATAR_COLORS = ["#8B5CF6", "#14B8A6", "#EC4899", "#3B82F6", "#10B981", "#FCD34D", "#6366F1", "#EF4444"];

const glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

const MEDAL_DARK_TEXT = {
  1: "#B8860B",  // Gold — dark goldenrod
  2: "#6B7280",  // Silver — gray
  3: "#92400E",  // Bronze — dark amber
};

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [timeFilter, setTimeFilter] = useState("weekly");
  const [scopeFilter, setScopeFilter] = useState("global");

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const getAvatarColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const top3 = EXTENDED_LEADERBOARD.slice(0, 3);
  const rest = EXTENDED_LEADERBOARD.slice(3);
  const userEntry = EXTENDED_LEADERBOARD.find((e) => e.isUser);

  // Podium order: #2 left, #1 center, #3 right
  const podiumOrder = [top3[1], top3[0], top3[2]];

  return (
    <PageLayout>
      <style>{`
        @keyframes crownFloat {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-4px) rotate(3deg); }
        }
        @keyframes goldGlow {
          0%, 100% { box-shadow: 0 4px 16px rgba(252,211,77,0.3); }
          50% { box-shadow: 0 4px 24px rgba(252,211,77,0.5); }
        }
        @keyframes podiumRise {
          from { transform: translateY(30px) scaleY(0.7); opacity: 0; }
          to { transform: translateY(0) scaleY(1); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        paddingTop: 16, paddingBottom: 12,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <button className="dp-ib" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
          fontFamily: "Inter, sans-serif", margin: 0,
        }}>
          Leaderboard
        </h1>
      </div>

      {/* Time Filter Tabs */}
      <div style={{
        display: "flex", gap: 4,
        ...glassStyle, borderRadius: 14, padding: 4,
        marginBottom: 12,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s",
      }}>
        {TIME_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setTimeFilter(filter.id)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 11, border: "none",
              background: timeFilter === filter.id
                ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.2))"
                : "transparent",
              color: timeFilter === filter.id ? "var(--dp-text)" : "var(--dp-text-tertiary)",
              fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
              cursor: "pointer", transition: "all 0.25s ease",
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Scope Filter */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 24,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s",
      }}>
        {SCOPE_FILTERS.map((filter) => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.id}
              onClick={() => setScopeFilter(filter.id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "8px 0", borderRadius: 12,
                background: scopeFilter === filter.id
                  ? "rgba(139,92,246,0.15)"
                  : "var(--dp-glass-bg)",
                border: scopeFilter === filter.id
                  ? "1px solid rgba(139,92,246,0.25)"
                  : "1px solid var(--dp-glass-border)",
                color: scopeFilter === filter.id ? (isLight ? "#6D28D9" : "#C4B5FD") : "var(--dp-text-muted)",
                fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif",
                cursor: "pointer", transition: "all 0.25s ease",
              }}
            >
              <Icon size={14} />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Top 3 Podium */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        gap: 10, marginBottom: 28, padding: "0 8px",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s",
      }}>
        {podiumOrder.map((entry, i) => {
          if (!entry) return null;
          const rank = entry.rank;
          const medal = MEDAL_COLORS[rank];
          const isFirst = rank === 1;
          const avatarSize = isFirst ? 64 : 52;
          const podiumHeight = isFirst ? 80 : rank === 2 ? 60 : 48;
          const avatarColor = getAvatarColor(entry.name);

          return (
            <div
              key={entry.id}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                flex: 1, maxWidth: 130,
                animation: mounted ? `podiumRise 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${0.25 + i * 0.12}s both` : "none",
              }}
            >
              {/* Crown for #1 */}
              {isFirst && (
                <div style={{
                  fontSize: 28, marginBottom: -4,
                  animation: "crownFloat 2.5s ease-in-out infinite",
                }}>
                  👑
                </div>
              )}

              {/* Avatar */}
              <div style={{
                width: avatarSize, height: avatarSize,
                borderRadius: avatarSize * 0.35,
                background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isFirst ? 24 : 20, fontWeight: 700, color: "#fff",
                fontFamily: "Inter, sans-serif",
                border: `3px solid ${medal.bg}`,
                boxShadow: medal.shadow,
                marginBottom: 8,
                ...(isFirst ? { animation: "goldGlow 3s ease-in-out infinite" } : {}),
              }}>
                {entry.initial}
              </div>

              {/* Name */}
              <div style={{
                fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                fontFamily: "Inter, sans-serif", marginBottom: 2,
                textAlign: "center",
              }}>
                {entry.name}
              </div>

              {/* XP */}
              <div style={{
                fontSize: 12, fontWeight: 700, color: isLight ? MEDAL_DARK_TEXT[rank] : medal.bg,
                fontFamily: "Inter, sans-serif", marginBottom: 8,
              }}>
                {entry.xp.toLocaleString()} XP
              </div>

              {/* Podium block */}
              <div style={{
                width: "100%", height: podiumHeight,
                borderRadius: "14px 14px 0 0",
                background: `linear-gradient(180deg, ${medal.bg}25, ${medal.bg}10)`,
                border: `1px solid ${medal.bg}30`,
                borderBottom: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                {/* Rank medal */}
                <div style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: medal.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: medal.text,
                  fontFamily: "Inter, sans-serif",
                  boxShadow: `0 2px 8px ${medal.bg}40`,
                }}>
                  {rank}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Ranked List */}
      <div style={{
        ...glassStyle, borderRadius: 18,
        overflow: "hidden", marginBottom: 100,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.4s",
      }}>
        {rest.map((entry, index) => {
          const avatarColor = getAvatarColor(entry.name);
          const isUser = entry.isUser;

          return (
            <div
              key={entry.id}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: isUser ? "14px 16px" : "12px 16px",
                background: isUser
                  ? (isLight
                    ? "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(109,40,217,0.08))"
                    : "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(109,40,217,0.12))")
                  : index % 2 === 0
                  ? "transparent"
                  : "rgba(255,255,255,0.015)",
                borderBottom: index < rest.length - 1 && !isUser ? "1px solid var(--dp-glass-bg)" : "none",
                position: "relative",
                ...(isUser ? {
                  border: "1px solid rgba(139,92,246,0.35)",
                  borderTopWidth: 3,
                  borderTopColor: "#8B5CF6",
                  borderBottomWidth: 3,
                  borderBottomColor: "#8B5CF6",
                  boxShadow: "0 0 24px rgba(139,92,246,0.2), inset 0 0 20px rgba(139,92,246,0.05)",
                  borderRadius: 14,
                  margin: "6px 4px",
                } : {}),
              }}
            >
              {/* Rank number */}
              <div style={{
                width: 28, textAlign: "center",
                fontSize: 14, fontWeight: 700,
                color: isUser ? (isLight ? "#6D28D9" : "#C4B5FD") : "var(--dp-text-muted)",
                fontFamily: "Inter, sans-serif",
              }}>
                {entry.rank}
              </div>

              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 700, color: "#fff",
                fontFamily: "Inter, sans-serif",
                ...(isUser ? {
                  border: "2px solid rgba(139,92,246,0.4)",
                  boxShadow: "0 0 12px rgba(139,92,246,0.3)",
                } : {}),
              }}>
                {entry.initial}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 14, fontWeight: isUser ? 700 : 500,
                    color: isUser ? "var(--dp-text)" : "var(--dp-text-primary)",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    {entry.name}
                    {isUser && (
                      <span style={{
                        color: "#fff", fontSize: 10, fontWeight: 700, marginLeft: 8,
                        background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                        padding: "2px 8px", borderRadius: 6,
                        letterSpacing: "0.3px",
                      }}>
                        YOU
                      </span>
                    )}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "#8B5CF6",
                    fontFamily: "Inter, sans-serif",
                    padding: "2px 6px", borderRadius: 5,
                    background: "rgba(139,92,246,0.15)",
                  }}>
                    Lv.{entry.level}
                  </span>
                </div>
              </div>

              {/* Streak */}
              <div style={{
                display: "flex", alignItems: "center", gap: 3,
                fontSize: 11, color: "var(--dp-text-muted)",
                fontFamily: "Inter, sans-serif",
              }}>
                <Flame size={12} color={isLight ? "#DC2626" : "#F69A9A"} />
                {entry.streak}
              </div>

              {/* XP */}
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: isUser ? (isLight ? "#6D28D9" : "#C4B5FD") : "var(--dp-text-secondary)",
                fontFamily: "Inter, sans-serif",
                minWidth: 52, textAlign: "right",
              }}>
                {entry.xp.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

    </PageLayout>
  );
}
