import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { apiGet, apiPost } from "../../services/api";
import { LEAGUES } from "../../services/endpoints";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";
import BottomNav from "../../components/shared/BottomNav";
import Avatar from "../../components/shared/Avatar";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";
import {
  ArrowLeft, Trophy, Clock, Zap, Sparkles, ChevronRight,
  Sprout, Flame, Waves, CloudLightning, Snowflake, Flower2,
  Medal, Crown, Award, Gift, Users,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * SeasonDetail — Full detail page for a themed league season.
 *
 * Sections:
 *  1. Season header: themed banner with gradient, icon, name, dates
 *  2. Your progress: XP earned, current rank, projected rewards
 *  3. Leaderboard: Top 50 participants with rank badges
 *  4. Rewards tier list: what each rank range earns
 *  5. Join button (if not yet joined)
 * ═══════════════════════════════════════════════════════════════════ */

// ── Theme config matching SeasonBanner ──
var THEME_CONFIG = {
  growth: {
    gradient: "linear-gradient(135deg, #10B981, #34D399, #6EE7B7)",
    Icon: Sprout,
    glow: "rgba(16,185,129,0.4)",
    primary: "#10B981",
  },
  fire: {
    gradient: "linear-gradient(135deg, #EF4444, #F97316, #FBBF24)",
    Icon: Flame,
    glow: "rgba(239,68,68,0.4)",
    primary: "#EF4444",
  },
  ocean: {
    gradient: "linear-gradient(135deg, #3B82F6, #06B6D4, #22D3EE)",
    Icon: Waves,
    glow: "rgba(59,130,246,0.4)",
    primary: "#3B82F6",
  },
  cosmic: {
    gradient: "linear-gradient(135deg, #8B5CF6, #A855F7, #D946EF)",
    Icon: Sparkles,
    glow: "rgba(139,92,246,0.4)",
    primary: "#8B5CF6",
  },
  aurora: {
    gradient: "linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)",
    Icon: Zap,
    glow: "rgba(6,182,212,0.4)",
    primary: "#06B6D4",
  },
  crystal: {
    gradient: "linear-gradient(135deg, #93C5FD, #C4B5FD, #E9D5FF)",
    Icon: Snowflake,
    glow: "rgba(147,197,253,0.4)",
    primary: "#93C5FD",
  },
  storm: {
    gradient: "linear-gradient(135deg, #6366F1, #4338CA, #1E1B4B)",
    Icon: CloudLightning,
    glow: "rgba(99,102,241,0.4)",
    primary: "#6366F1",
  },
  bloom: {
    gradient: "linear-gradient(135deg, #EC4899, #F472B6, #FBCFE8)",
    Icon: Flower2,
    glow: "rgba(236,72,153,0.4)",
    primary: "#EC4899",
  },
};

var DEFAULT_THEME = THEME_CONFIG.growth;

// Rank badge color helpers
function getRankColor(rank) {
  if (rank === 1) return "#FFD700"; // gold
  if (rank === 2) return "#C0C0C0"; // silver
  if (rank === 3) return "#CD7F32"; // bronze
  return "var(--dp-text-muted)";
}

function getRankIcon(rank) {
  if (rank === 1) return Crown;
  if (rank === 2) return Medal;
  if (rank === 3) return Award;
  return null;
}

export default function SeasonDetail() {
  var { id } = useParams();
  var navigate = useNavigate();
  var { user } = useAuth();
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  var [mounted, setMounted] = useState(false);

  useEffect(function () {
    setTimeout(function () { setMounted(true); }, 100);
  }, []);

  // ── Fetch season details ──
  var seasonQuery = useQuery({
    queryKey: ["league-season", id],
    queryFn: function () { return apiGet(LEAGUES.LEAGUE_SEASONS.DETAIL(id)); },
  });

  // ── Fetch leaderboard ──
  var leaderboardQuery = useQuery({
    queryKey: ["league-season-leaderboard", id],
    queryFn: function () { return apiGet(LEAGUES.LEAGUE_SEASONS.LEADERBOARD(id)); },
    enabled: !!id,
  });

  // ── Join mutation ──
  var joinMutation = useMutation({
    mutationFn: function () { return apiPost(LEAGUES.LEAGUE_SEASONS.JOIN); },
    onSuccess: function () {
      showToast("You've joined the season!", "success");
      queryClient.invalidateQueries({ queryKey: ["league-season", id] });
      queryClient.invalidateQueries({ queryKey: ["league-season-leaderboard", id] });
      queryClient.invalidateQueries({ queryKey: ["league-season-current"] });
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Could not join season", "error");
    },
  });

  // ── Claim rewards mutation ──
  var claimMutation = useMutation({
    mutationFn: function () { return apiPost(LEAGUES.LEAGUE_SEASONS.CLAIM_REWARDS(id)); },
    onSuccess: function () {
      showToast("Rewards claimed!", "success");
      queryClient.invalidateQueries({ queryKey: ["league-season", id] });
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Could not claim rewards", "error");
    },
  });

  // ── Loading state ──
  if (seasonQuery.isLoading) {
    return (
      <div className="dp-desktop-main" style={{ position: "absolute", inset: 0 }}>
        <GlassAppBar
          left={
            <button onClick={function () { navigate(-1); }} style={{
              background: "none", border: "none", color: "var(--dp-text)",
              cursor: "pointer", display: "flex", alignItems: "center", fontFamily: "inherit",
            }}>
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
          }
          title="Season"
        />
        <div style={{ padding: "100px 16px 140px" }}>
          <SkeletonCard height={200} style={{ marginBottom: 16 }} />
          <SkeletonCard height={120} style={{ marginBottom: 16 }} />
          <SkeletonCard height={300} />
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Error state ──
  if (seasonQuery.isError || !seasonQuery.data) {
    return (
      <div className="dp-desktop-main" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ErrorState
          message={(seasonQuery.error && (seasonQuery.error.userMessage || seasonQuery.error.message)) || "Failed to load season"}
          onRetry={function () { seasonQuery.refetch(); }}
        />
        <BottomNav />
      </div>
    );
  }

  var season = seasonQuery.data;
  var theme = THEME_CONFIG[season.theme] || DEFAULT_THEME;
  var ThemeIcon = theme.Icon;
  var participation = season.userParticipation;
  var hasJoined = !!participation;
  var hasEnded = season.hasEnded;
  var daysLeft = season.daysRemaining || 0;
  var leaderboard = leaderboardQuery.data || [];

  // Countdown text
  var countdownText;
  if (hasEnded) {
    countdownText = "Season ended";
  } else if (daysLeft > 1) {
    countdownText = daysLeft + " days remaining";
  } else if (daysLeft === 1) {
    countdownText = "1 day remaining";
  } else {
    countdownText = "Ending today";
  }

  // Projected reward
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
    <div className="dp-desktop-main" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* ═══ APP BAR ═══ */}
      <GlassAppBar
        className="dp-desktop-header"
        style={{ position: "fixed", top: 0, left: 0, right: 0 }}
        left={
          <button onClick={function () { navigate(-1); }} style={{
            background: "none", border: "none", color: "var(--dp-text)",
            cursor: "pointer", display: "flex", alignItems: "center", fontFamily: "inherit",
          }}>
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        }
        title="Season Details"
      />

      {/* ═══ CONTENT ═══ */}
      <main style={{
        position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden",
        paddingTop: 80, paddingBottom: 140,
      }}>
        <div className="dp-content-area" style={{ padding: "0 16px" }}>

          {/* ═══ 1. SEASON HEADER BANNER ═══ */}
          <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "0ms" }}>
            <GlassCard padding={0} mb={20} style={{ overflow: "hidden", position: "relative" }}>
              {/* Full gradient background */}
              <div style={{
                position: "absolute", inset: 0,
                background: theme.gradient,
                opacity: 0.15,
                pointerEvents: "none",
              }} />
              {/* Glow orb */}
              <div style={{
                position: "absolute", top: -30, right: -30,
                width: 120, height: 120, borderRadius: "50%",
                background: theme.glow,
                filter: "blur(50px)",
                pointerEvents: "none",
              }} />

              <div style={{ position: "relative", padding: "24px 20px" }}>
                {/* Icon + Name + Dates */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 18,
                    background: theme.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 6px 24px " + theme.glow,
                    flexShrink: 0,
                  }}>
                    <ThemeIcon size={32} color="#fff" strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{
                      fontSize: 22, fontWeight: 800, color: "var(--dp-text)",
                      letterSpacing: "-0.5px", margin: 0, lineHeight: 1.2,
                    }}>
                      {season.name}
                    </h1>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <Clock size={14} color="var(--dp-text-muted)" strokeWidth={2} />
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: hasEnded ? "var(--dp-danger)" : daysLeft <= 7 ? "var(--dp-warning)" : "var(--dp-text-secondary)",
                      }}>
                        {countdownText}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 4 }}>
                      {season.startDate} to {season.endDate}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {season.description && (
                  <p style={{
                    fontSize: 14, color: "var(--dp-text-secondary)",
                    lineHeight: 1.6, margin: 0,
                  }}>
                    {season.description}
                  </p>
                )}

                {/* Participants count */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, marginTop: 16,
                  fontSize: 13, color: "var(--dp-text-muted)",
                }}>
                  <Users size={14} strokeWidth={2} />
                  <span>{season.participantCount || 0} participants</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* ═══ 2. YOUR PROGRESS (if joined) ═══ */}
          {hasJoined && (
            <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "100ms" }}>
              <GlassCard padding={20} mb={20}>
                <h2 style={{
                  fontSize: 17, fontWeight: 700, color: "var(--dp-text)",
                  margin: "0 0 16px 0", letterSpacing: "-0.3px",
                }}>
                  Your Progress
                </h2>

                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-around",
                }}>
                  {/* Rank */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <Trophy size={22} color={theme.primary} strokeWidth={2.5} />
                    <span style={{ fontSize: 28, fontWeight: 800, color: "var(--dp-text)", lineHeight: 1 }}>
                      #{participation.rank || "?"}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>Rank</span>
                  </div>

                  <div style={{ width: 1, height: 48, background: "var(--dp-divider)" }} />

                  {/* XP */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <Zap size={22} color={theme.primary} strokeWidth={2.5} />
                    <span style={{ fontSize: 28, fontWeight: 800, color: "var(--dp-text)", lineHeight: 1 }}>
                      {(participation.xpEarned || participation.xp_earned || 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>XP Earned</span>
                  </div>

                  <div style={{ width: 1, height: 48, background: "var(--dp-divider)" }} />

                  {/* Projected reward */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, maxWidth: 100 }}>
                    <Gift size={22} color={theme.primary} strokeWidth={2.5} />
                    <span style={{
                      fontSize: 14, fontWeight: 700, color: "var(--dp-text)",
                      textAlign: "center", lineHeight: 1.2,
                    }}>
                      {projectedReward ? projectedReward.title : "Participate"}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>Reward</span>
                  </div>
                </div>

                {/* Claim rewards button (if season ended and not yet claimed) */}
                {hasEnded && !participation.rewardsClaimed && !participation.rewards_claimed && (
                  <button
                    onClick={function () { claimMutation.mutate(); }}
                    disabled={claimMutation.isPending}
                    style={{
                      width: "100%", marginTop: 16,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "12px 20px", borderRadius: 12, border: "none",
                      background: theme.gradient,
                      color: "#fff", fontSize: 15, fontWeight: 700,
                      cursor: claimMutation.isPending ? "default" : "pointer",
                      fontFamily: "inherit",
                      boxShadow: "0 4px 16px " + theme.glow,
                      opacity: claimMutation.isPending ? 0.7 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    <Gift size={18} strokeWidth={2.5} />
                    {claimMutation.isPending ? "Claiming..." : "Claim Rewards"}
                  </button>
                )}

                {/* Already claimed */}
                {hasEnded && (participation.rewardsClaimed || participation.rewards_claimed) && (
                  <div style={{
                    marginTop: 16, padding: "10px 16px", borderRadius: 10,
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.15)",
                    textAlign: "center", fontSize: 13, fontWeight: 600,
                    color: "#10B981",
                  }}>
                    Rewards claimed
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* ═══ JOIN BUTTON (if not joined and season not ended) ═══ */}
          {!hasJoined && !hasEnded && (
            <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "100ms" }}>
              <GlassCard padding={20} mb={20} style={{ textAlign: "center" }}>
                <ThemeIcon size={40} color={theme.primary} strokeWidth={1.5} style={{ marginBottom: 12 }} />
                <h3 style={{
                  fontSize: 18, fontWeight: 700, color: "var(--dp-text)",
                  margin: "0 0 8px 0",
                }}>
                  Join this Season
                </h3>
                <p style={{
                  fontSize: 14, color: "var(--dp-text-secondary)",
                  lineHeight: 1.5, margin: "0 0 16px 0",
                }}>
                  Compete with other dreamers and earn exclusive themed rewards based on your rank.
                </p>
                <button
                  onClick={function () { joinMutation.mutate(); }}
                  disabled={joinMutation.isPending}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "12px 32px", borderRadius: 14, border: "none",
                    background: theme.gradient,
                    color: "#fff", fontSize: 15, fontWeight: 700,
                    cursor: joinMutation.isPending ? "default" : "pointer",
                    fontFamily: "inherit",
                    boxShadow: "0 4px 20px " + theme.glow,
                    opacity: joinMutation.isPending ? 0.7 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  {joinMutation.isPending ? "Joining..." : "Join Season"}
                </button>
              </GlassCard>
            </div>
          )}

          {/* ═══ 3. LEADERBOARD ═══ */}
          <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "200ms" }}>
            <GlassCard padding={20} mb={20}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 16,
              }}>
                <h2 style={{
                  fontSize: 17, fontWeight: 700, color: "var(--dp-text)",
                  margin: 0, letterSpacing: "-0.3px",
                }}>
                  Leaderboard
                </h2>
                <span style={{
                  fontSize: 12, color: "var(--dp-text-muted)",
                }}>
                  Top {leaderboard.length}
                </span>
              </div>

              {leaderboardQuery.isLoading && (
                <div style={{ textAlign: "center", padding: 20, color: "var(--dp-text-muted)", fontSize: 13 }}>
                  Loading leaderboard...
                </div>
              )}

              {!leaderboardQuery.isLoading && leaderboard.length === 0 && (
                <div style={{ textAlign: "center", padding: 24, color: "var(--dp-text-muted)", fontSize: 14 }}>
                  No participants yet. Be the first to join!
                </div>
              )}

              {leaderboard.map(function (entry, idx) {
                var rank = idx + 1;
                var rankColor = getRankColor(rank);
                var RankBadge = getRankIcon(rank);
                var isMe = entry.isCurrentUser || (user && String(entry.user) === String(user.id));

                return (
                  <div
                    key={entry.id || idx}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 12,
                      background: isMe ? (theme.primary + "10") : rank <= 3 ? "rgba(255,255,255,0.03)" : "transparent",
                      border: isMe ? ("1px solid " + theme.primary + "25") : "1px solid transparent",
                      marginBottom: 4,
                      transition: "background 0.2s",
                    }}
                  >
                    {/* Rank number or badge */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: rank <= 3 ? rankColor + "15" : "rgba(255,255,255,0.05)",
                      border: rank <= 3 ? ("1px solid " + rankColor + "25") : "1px solid var(--dp-glass-border)",
                      flexShrink: 0,
                    }}>
                      {RankBadge ? (
                        <RankBadge size={18} color={rankColor} strokeWidth={2.5} />
                      ) : (
                        <span style={{
                          fontSize: 14, fontWeight: 700,
                          color: "var(--dp-text-secondary)",
                        }}>
                          {rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar
                      name={entry.userDisplayName || entry.user_display_name || "?"}
                      src={entry.userAvatarUrl || entry.user_avatar_url}
                      size={36}
                      shape="circle"
                    />

                    {/* Name + level */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: isMe ? 700 : 600,
                        color: isMe ? theme.primary : "var(--dp-text)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {entry.userDisplayName || entry.user_display_name || "Anonymous"}
                        {isMe && " (You)"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                        Level {entry.userLevel || entry.user_level || 1}
                      </div>
                    </div>

                    {/* XP */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 700, color: "var(--dp-text)",
                      }}>
                        {(entry.xpEarned || entry.xp_earned || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>XP</div>
                    </div>
                  </div>
                );
              })}
            </GlassCard>
          </div>

          {/* ═══ 4. REWARDS TIER LIST ═══ */}
          {season.rewards && season.rewards.length > 0 && (
            <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "300ms" }}>
              <GlassCard padding={20} mb={20}>
                <h2 style={{
                  fontSize: 17, fontWeight: 700, color: "var(--dp-text)",
                  margin: "0 0 16px 0", letterSpacing: "-0.3px",
                }}>
                  Rewards Tiers
                </h2>

                {season.rewards.map(function (reward, idx) {
                  var rankMin = reward.rankMin || reward.rank_min || 0;
                  var rankMax = reward.rankMax || reward.rank_max || 0;
                  var isCurrentTier = participation && participation.rank &&
                    participation.rank >= rankMin && participation.rank <= rankMax;

                  // Determine rank label
                  var rankLabel;
                  if (rankMin === rankMax) {
                    rankLabel = "#" + rankMin;
                  } else if (rankMax >= 9999) {
                    rankLabel = "#" + rankMin + "+";
                  } else {
                    rankLabel = "#" + rankMin + " - #" + rankMax;
                  }

                  // Icon color based on tier position
                  var tierColors = ["#FFD700", "#C0C0C0", "#CD7F32", "#8B5CF6", "#3B82F6", "#10B981"];
                  var tierColor = tierColors[Math.min(idx, tierColors.length - 1)];

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 14px", borderRadius: 12,
                        background: isCurrentTier ? (theme.primary + "10") : "rgba(255,255,255,0.02)",
                        border: isCurrentTier ? ("1.5px solid " + theme.primary + "30") : "1px solid var(--dp-glass-border)",
                        marginBottom: 8,
                        transition: "all 0.2s",
                      }}
                    >
                      {/* Tier icon */}
                      <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: tierColor + "12",
                        border: "1px solid " + tierColor + "20",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Trophy size={20} color={tierColor} strokeWidth={2} />
                      </div>

                      {/* Reward info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 15, fontWeight: 700,
                          color: isCurrentTier ? theme.primary : "var(--dp-text)",
                        }}>
                          {reward.title || "Season Reward"}
                        </div>
                        <div style={{
                          fontSize: 12, color: "var(--dp-text-secondary)",
                          marginTop: 2,
                        }}>
                          {reward.description || ""}
                        </div>
                        {reward.xpBonus || reward.xp_bonus ? (
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            marginTop: 4, fontSize: 11, fontWeight: 600,
                            color: "var(--dp-accent)",
                          }}>
                            <Zap size={11} strokeWidth={2.5} />
                            +{(reward.xpBonus || reward.xp_bonus || 0).toLocaleString()} XP Bonus
                          </div>
                        ) : null}
                      </div>

                      {/* Rank range badge */}
                      <div style={{
                        padding: "5px 10px", borderRadius: 8,
                        background: tierColor + "12",
                        border: "1px solid " + tierColor + "20",
                        fontSize: 12, fontWeight: 700,
                        color: tierColor,
                        whiteSpace: "nowrap",
                      }}>
                        {rankLabel}
                      </div>

                      {/* Current tier indicator */}
                      {isCurrentTier && (
                        <div style={{
                          padding: "3px 8px", borderRadius: 6,
                          background: theme.primary + "20",
                          fontSize: 10, fontWeight: 700,
                          color: theme.primary,
                          whiteSpace: "nowrap",
                        }}>
                          YOU
                        </div>
                      )}
                    </div>
                  );
                })}
              </GlassCard>
            </div>
          )}

        </div>
      </main>

      <BottomNav />

      {/* ═══ ANIMATION STYLES ═══ */}
      <style>{"\
        .dp-a{opacity:0;transform:translateY(20px);transition:opacity 0.6s cubic-bezier(0.16,1,0.3,1),transform 0.6s cubic-bezier(0.16,1,0.3,1);}\
        .dp-a.dp-s{opacity:1;transform:translateY(0);}\
      "}</style>
    </div>
  );
}
