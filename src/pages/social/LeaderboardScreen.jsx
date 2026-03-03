import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../services/api";
import { LEAGUES } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import { ArrowLeft, Flame, Trophy, Globe, Users, Shield, MapPin } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { CONTACT_COLORS, GRADIENTS } from "../../styles/colors";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";
import PillTabs from "../../components/shared/PillTabs";
import Avatar from "../../components/shared/Avatar";

const TIME_FILTERS = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "alltime", label: "All-time" },
];

const SCOPE_FILTERS = [
  { id: "global", label: "Global", icon: Globe },
  { id: "friends", label: "Friends", icon: Users },
  { id: "league", label: "League", icon: Shield },
  { id: "nearby", label: "Nearby", icon: MapPin },
];

const MEDAL_COLORS = {
  1: { bg: "#FCD34D", text: "#92400E", shadow: "0 4px 16px rgba(252,211,77,0.4)", border: "#F59E0B" },
  2: { bg: "#C0C0C0", text: "#374151", shadow: "0 4px 16px rgba(192,192,192,0.3)", border: "#9CA3AF" },
  3: { bg: "#CD7F32", text: "#451A03", shadow: "0 4px 16px rgba(205,127,50,0.3)", border: "#B45309" },
};

const AVATAR_COLORS = CONTACT_COLORS;

const MEDAL_DARK_TEXT = {
  1: "#B8860B",  // Gold — dark goldenrod
  2: "#6B7280",  // Silver — gray
  3: "#92400E",  // Bronze — dark amber
};

export default function LeaderboardScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  var { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [timeFilter, setTimeFilter] = useState("weekly");
  const [scopeFilter, setScopeFilter] = useState("global");

  var SCOPE_URLS = { global: LEAGUES.LEADERBOARD.GLOBAL, friends: LEAGUES.LEADERBOARD.FRIENDS, league: LEAGUES.LEADERBOARD.LEAGUE, nearby: LEAGUES.LEADERBOARD.NEARBY };
  var lbInf = useInfiniteList({ queryKey: ["leaderboard", scopeFilter, timeFilter], url: (SCOPE_URLS[scopeFilter] || LEAGUES.LEADERBOARD.GLOBAL) + "?period=" + timeFilter, limit: 50 });

  var myRankQuery = useQuery({
    queryKey: ["leaderboard-me", timeFilter],
    queryFn: function () { return apiGet(LEAGUES.LEADERBOARD.ME + "?period=" + timeFilter); },
  });

  var rawData = lbInf.items;
  var EXTENDED_LEADERBOARD = rawData.map(function (entry, i) {
    if (!entry) return null;
    var entryName = entry.userDisplayName || entry.name || entry.displayName || "User";
    return Object.assign({}, entry, {
      initial: entry.initial || entryName[0].toUpperCase(),
      name: entryName,
      rank: entry.rank || i + 1,
      xp: entry.xp || 0,
      level: entry.userLevel || entry.level || 1,
      streak: entry.streak || 0,
      isUser: entry.isCurrentUser || String(entry.userId || entry.id) === String(user?.id),
    });
  }).filter(Boolean);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const getAvatarColor = (name) => {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const top3 = EXTENDED_LEADERBOARD.slice(0, 3);
  const rest = EXTENDED_LEADERBOARD.slice(3);
  const userEntry = EXTENDED_LEADERBOARD.find((e) => e.isUser);

  // Podium order: #2 left, #1 center, #3 right
  const podiumOrder = [top3[1], top3[0], top3[2]];

  if (lbInf.isError) {
    return (
      <PageLayout>
        <ErrorState
          message={(lbInf.error && lbInf.error.message) || "Failed to load leaderboard"}
          onRetry={function () { lbInf.refetch(); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={() => navigate(-1)} label="Back" />}
        title={<h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Leaderboard</h1>}
      />
    }>
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

      {/* Time Filter Tabs */}
      <PillTabs
        tabs={TIME_FILTERS.map((f) => ({ key: f.id, label: f.label }))}
        active={timeFilter}
        onChange={setTimeFilter}
        style={{ marginBottom: 12 }}
      />

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
                color: scopeFilter === filter.id ? "var(--dp-accent-text)" : "var(--dp-text-muted)",
                fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.25s ease",
                fontFamily: "inherit",
              }}
            >
              <Icon size={14} />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Empty state when no users */}
      {!lbInf.isLoading && EXTENDED_LEADERBOARD.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease 0.3s",
        }}>
          <Trophy size={48} color="var(--dp-text-muted)" style={{ marginBottom: 16 }} />
          <div style={{
            fontSize: 16, fontWeight: 600, color: "var(--dp-text-tertiary)",
            marginBottom: 8,
          }}>
            No users on the leaderboard yet
          </div>
          <div style={{
            fontSize: 13, color: "var(--dp-text-muted)",
            }}>
            Complete tasks and earn XP to climb the ranks
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {EXTENDED_LEADERBOARD.length > 0 && <div style={{
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
              <Avatar
                name={entry.name}
                size={avatarSize}
                color={avatarColor}
                style={{
                  border: `3px solid ${medal.bg}`,
                  boxShadow: medal.shadow,
                  marginBottom: 8,
                  ...(isFirst ? { animation: "goldGlow 3s ease-in-out infinite" } : {}),
                }}
              />

              {/* Name */}
              <div style={{
                fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                marginBottom: 2,
                textAlign: "center",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: "100%",
              }}>
                {entry.name}
              </div>

              {/* XP */}
              <div style={{
                fontSize: 12, fontWeight: 700, color: isLight ? MEDAL_DARK_TEXT[rank] : medal.bg,
                marginBottom: 8,
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
                  boxShadow: `0 2px 8px ${medal.bg}40`,
                }}>
                  {rank}
                </div>
              </div>
            </div>
          );
        })}
      </div>}

      {/* Full Ranked List */}
      {EXTENDED_LEADERBOARD.length > 0 && <GlassCard mb={100} radius={18} style={{ overflow: "hidden" }}>
        {rest.map((entry, index) => {
          if (!entry) return null;
          const avatarColor = getAvatarColor(entry.name);
          const isUser = entry.isUser;

          return (
            <div
              key={entry.id}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: isUser ? "14px 16px" : "12px 16px",
                background: isUser
                  ? "var(--dp-accent-soft)"
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
                color: isUser ? "var(--dp-accent-text)" : "var(--dp-text-muted)",
                }}>
                {entry.rank}
              </div>

              {/* Avatar */}
              <Avatar
                name={entry.name}
                size={38}
                color={avatarColor}
                style={isUser ? { border: "2px solid rgba(139,92,246,0.4)", boxShadow: "0 0 12px rgba(139,92,246,0.3)" } : {}}
              />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 14, fontWeight: isUser ? 700 : 500,
                    color: isUser ? "var(--dp-text)" : "var(--dp-text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {entry.name}
                    {isUser && (
                      <span style={{
                        color: "#fff", fontSize: 10, fontWeight: 700, marginLeft: 8,
                        background: GRADIENTS.primaryDark,
                        padding: "2px 8px", borderRadius: 6,
                        letterSpacing: "0.3px",
                      }}>
                        YOU
                      </span>
                    )}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "#8B5CF6",
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
                }}>
                <Flame size={12} color="var(--dp-danger)" />
                {entry.streak}
              </div>

              {/* XP */}
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: isUser ? "var(--dp-accent-text)" : "var(--dp-text-secondary)",
                minWidth: 52, textAlign: "right",
              }}>
                {entry.xp.toLocaleString()}
              </div>
            </div>
          );
        })}
      </GlassCard>}
      <div ref={lbInf.sentinelRef} style={{height:1}} />
      {lbInf.loadingMore && <div style={{textAlign:"center",padding:16,color:"var(--dp-text-tertiary)",fontSize:13}}>Loading more…</div>}

    </PageLayout>
  );
}
