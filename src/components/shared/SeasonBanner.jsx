import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { LEAGUES } from "../../services/endpoints";
import GlassCard from "./GlassCard";
import { Trophy, Clock, ChevronRight, Sprout, Flame, Waves, Sparkles, Zap, Snowflake, CloudLightning, Flower2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * SeasonBanner — Themed banner for the current league season.
 *
 * Glass-morphism card showing:
 *  1. Gradient background matching season theme colors
 *  2. Season name and remaining time countdown
 *  3. Current rank and XP (if joined)
 *  4. Rewards preview (what you'll earn at current rank)
 *  5. "View Leaderboard" link
 *  6. Join button (if not yet joined)
 * ═══════════════════════════════════════════════════════════════════ */

// ── Theme config: gradient, icon, glow per theme key ──
var THEME_CONFIG = {
  growth: {
    gradient: "linear-gradient(135deg, #10B981, #34D399, #6EE7B7)",
    Icon: Sprout,
    glow: "rgba(16,185,129,0.4)",
    dotColor: "#10B981",
  },
  fire: {
    gradient: "linear-gradient(135deg, #EF4444, #F97316, #FBBF24)",
    Icon: Flame,
    glow: "rgba(239,68,68,0.4)",
    dotColor: "#EF4444",
  },
  ocean: {
    gradient: "linear-gradient(135deg, #3B82F6, #06B6D4, #22D3EE)",
    Icon: Waves,
    glow: "rgba(59,130,246,0.4)",
    dotColor: "#3B82F6",
  },
  cosmic: {
    gradient: "linear-gradient(135deg, #8B5CF6, #A855F7, #D946EF)",
    Icon: Sparkles,
    glow: "rgba(139,92,246,0.4)",
    dotColor: "#8B5CF6",
  },
  aurora: {
    gradient: "linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)",
    Icon: Zap,
    glow: "rgba(6,182,212,0.4)",
    dotColor: "#06B6D4",
  },
  crystal: {
    gradient: "linear-gradient(135deg, #93C5FD, #C4B5FD, #E9D5FF)",
    Icon: Snowflake,
    glow: "rgba(147,197,253,0.4)",
    dotColor: "#93C5FD",
  },
  storm: {
    gradient: "linear-gradient(135deg, #6366F1, #4338CA, #1E1B4B)",
    Icon: CloudLightning,
    glow: "rgba(99,102,241,0.4)",
    dotColor: "#6366F1",
  },
  bloom: {
    gradient: "linear-gradient(135deg, #EC4899, #F472B6, #FBCFE8)",
    Icon: Flower2,
    glow: "rgba(236,72,153,0.4)",
    dotColor: "#EC4899",
  },
};

var DEFAULT_THEME = THEME_CONFIG.growth;

export default function SeasonBanner() {
  var navigate = useNavigate();
  var queryClient = useQueryClient();
  var [mounted, setMounted] = useState(false);

  useEffect(function () {
    var t = setTimeout(function () { setMounted(true); }, 80);
    return function () { clearTimeout(t); };
  }, []);

  // ── Fetch current league season ──
  var seasonQuery = useQuery({
    queryKey: ["league-season-current"],
    queryFn: function () { return apiGet(LEAGUES.LEAGUE_SEASONS.CURRENT); },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // ── Join mutation ──
  var joinMutation = useMutation({
    mutationFn: function () { return apiPost(LEAGUES.LEAGUE_SEASONS.JOIN); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["league-season-current"] });
    },
  });

  var season = seasonQuery.data;

  // Don't render while loading, on error, or if no active season
  if (seasonQuery.isLoading || seasonQuery.isError || !season) return null;

  var theme = THEME_CONFIG[season.theme] || DEFAULT_THEME;
  var ThemeIcon = theme.Icon;
  var participation = season.userParticipation;
  var hasJoined = !!participation;
  var daysLeft = season.daysRemaining || 0;

  // Compute countdown text
  var countdownText;
  if (daysLeft > 1) {
    countdownText = daysLeft + " days left";
  } else if (daysLeft === 1) {
    countdownText = "1 day left";
  } else {
    countdownText = "Ending today";
  }

  // Projected reward at current rank
  var projectedReward = null;
  if (participation && participation.rank && season.rewards) {
    for (var i = 0; i < season.rewards.length; i++) {
      var r = season.rewards[i];
      if (participation.rank >= (r.rankMin || r.rank_min || 0) &&
          participation.rank <= (r.rankMax || r.rank_max || 9999)) {
        projectedReward = r;
        break;
      }
    }
  }

  return (
    <GlassCard padding={0} mb={20} style={{ overflow: "hidden", position: "relative" }}>
      {/* Theme gradient overlay */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: theme.gradient,
        opacity: 0.12,
        pointerEvents: "none",
      }} />

      {/* Glow accent */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 100, height: 100, borderRadius: "50%",
        background: theme.glow,
        filter: "blur(40px)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", padding: 20 }}>

        {/* ── Top row: icon + season name + countdown ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>

          {/* Theme icon container */}
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: theme.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px " + theme.glow,
            flexShrink: 0,
          }}>
            <ThemeIcon size={24} color="#fff" strokeWidth={2} />
          </div>

          {/* Season name + description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: "var(--dp-text)",
              letterSpacing: "-0.3px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {season.name}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginTop: 3,
            }}>
              <Clock size={12} color="var(--dp-text-muted)" strokeWidth={2.5} />
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: daysLeft <= 7 ? "var(--dp-warning)" : "var(--dp-text-secondary)",
              }}>
                {countdownText}
              </span>
            </div>
          </div>

          {/* Participant count badge */}
          <div style={{
            padding: "5px 10px", borderRadius: 20,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-text-secondary)" }}>
              {season.participantCount || 0} joined
            </span>
          </div>
        </div>

        {/* ── Rank + XP row (if joined) ── */}
        {hasJoined && (
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "12px 16px", borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: 14,
          }}>
            {/* Rank */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <Trophy size={16} color={theme.dotColor} strokeWidth={2.5} />
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--dp-text)", lineHeight: 1 }}>
                #{participation.rank || "?"}
              </span>
              <span style={{ fontSize: 10, color: "var(--dp-text-muted)" }}>Rank</span>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 36, background: "var(--dp-divider)" }} />

            {/* XP earned */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
              <Zap size={16} color={theme.dotColor} strokeWidth={2.5} />
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--dp-text)", lineHeight: 1 }}>
                {(participation.xpEarned || participation.xp_earned || 0).toLocaleString()}
              </span>
              <span style={{ fontSize: 10, color: "var(--dp-text-muted)" }}>XP Earned</span>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 36, background: "var(--dp-divider)" }} />

            {/* Projected reward */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1, minWidth: 0 }}>
              <Sparkles size={16} color={theme.dotColor} strokeWidth={2.5} />
              <span style={{
                fontSize: 12, fontWeight: 700, color: "var(--dp-text)", lineHeight: 1.2,
                textAlign: "center",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: "100%",
              }}>
                {projectedReward ? projectedReward.title : "Participate"}
              </span>
              <span style={{ fontSize: 10, color: "var(--dp-text-muted)" }}>Reward</span>
            </div>
          </div>
        )}

        {/* ── Bottom row: Join or View Leaderboard ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!hasJoined ? (
            <button
              onClick={function (e) {
                e.stopPropagation();
                joinMutation.mutate();
              }}
              disabled={joinMutation.isPending}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px 20px", borderRadius: 12, border: "none",
                background: theme.gradient,
                color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: joinMutation.isPending ? "default" : "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 16px " + theme.glow,
                opacity: joinMutation.isPending ? 0.7 : 1,
                transition: "all 0.2s",
              }}
            >
              {joinMutation.isPending ? "Joining..." : "Join Season"}
            </button>
          ) : (
            <button
              onClick={function () { navigate("/season/" + season.id); }}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px 20px", borderRadius: 12,
                border: "1px solid " + theme.dotColor + "30",
                background: theme.dotColor + "10",
                color: theme.dotColor, fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >
              <Trophy size={16} strokeWidth={2.5} />
              View Leaderboard
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
