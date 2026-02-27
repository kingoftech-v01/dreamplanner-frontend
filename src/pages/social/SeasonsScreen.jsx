import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { LEAGUES } from "../../services/endpoints";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import {
  ArrowLeft, Trophy, Star, Gift, Zap, Calendar,
  Check, Loader, Sparkles
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Seasons & Rewards Screen
// ═══════════════════════════════════════════════════════════════

var glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

var REWARD_ICONS = {
  xp: Zap,
  trophy: Trophy,
  star: Star,
  gift: Gift,
  sparkles: Sparkles,
};

var REWARD_COLORS = {
  xp: "#FCD34D",
  trophy: "#FB923C",
  star: "#8B5CF6",
  gift: "#10B981",
  sparkles: "#EC4899",
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  var d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysRemaining(endDate) {
  if (!endDate) return 0;
  var diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function SeasonsScreen() {
  var navigate = useNavigate();
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var [mounted, setMounted] = useState(false);
  var [claimedSet, setClaimedSet] = useState(function () { return new Set(); });

  useEffect(function () {
    setTimeout(function () { setMounted(true); }, 100);
  }, []);

  // ─── API Queries ──────────────────────────────────────────────
  var seasonQuery = useQuery({
    queryKey: ["current-season"],
    queryFn: function () { return apiGet(LEAGUES.SEASONS.CURRENT); },
  });

  var rewardsQuery = useQuery({
    queryKey: ["season-rewards"],
    queryFn: function () { return apiGet(LEAGUES.SEASONS.MY_REWARDS); },
  });

  var season = seasonQuery.data || {};
  var rewards = (rewardsQuery.data && rewardsQuery.data.results) || rewardsQuery.data || [];

  var seasonProgress = season.progress || 0;
  var seasonDaysLeft = daysRemaining(season.endDate || season.endsAt);
  var milestones = season.milestones || [];

  // ─── Claim Reward Mutation ───────────────────────────────────
  var claimMutation = useMutation({
    mutationFn: function (rewardId) {
      return apiPost(LEAGUES.SEASONS.CLAIM_REWARD(rewardId));
    },
    onSuccess: function (_data, rewardId) {
      setClaimedSet(function (prev) {
        var next = new Set(prev);
        next.add(rewardId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["season-rewards"] });
      showToast("Reward claimed!", "success");
    },
    onError: function (err) {
      showToast(err.message || "Failed to claim reward", "error");
    },
  });

  var loading = seasonQuery.isLoading;

  if (loading) {
    return (
      <PageLayout>
        <div style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Loader size={28} color="var(--dp-accent)" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageLayout>
    );
  }

  if (seasonQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          message={(seasonQuery.error && seasonQuery.error.message) || "Failed to load season data"}
          onRetry={function () { seasonQuery.refetch(); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100vh",
          paddingBottom: 80,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 0 16px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <button className="dp-ib" onClick={function () { navigate(-1); }}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <Trophy size={20} color={isLight ? "#B45309" : "#FCD34D"} strokeWidth={2} />
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--dp-text)",
              letterSpacing: "-0.3px",
            }}
          >
            Seasons & Rewards
          </span>
        </div>

        {/* Current Season Card */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
          }}
        >
          <div
            style={{
              ...glass,
              padding: 20,
              marginBottom: 16,
              background: isLight
                ? "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(251,191,36,0.04))"
                : "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(251,191,36,0.06))",
              border: "1px solid rgba(251,191,36,0.15)",
            }}
          >
            {/* Season header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(249,115,22,0.15))",
                  border: "1px solid rgba(251,191,36,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Sparkles size={24} color="#FBBF24" strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--dp-text)",
                    marginBottom: 4,
                  }}
                >
                  {season.name || season.title || "Current Season"}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 12,
                    color: "var(--dp-text-secondary)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={13} strokeWidth={2} />
                    {formatDate(season.startDate || season.startsAt)} - {formatDate(season.endDate || season.endsAt)}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 8,
                      background: "rgba(251,191,36,0.12)",
                      border: "1px solid rgba(251,191,36,0.2)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: isLight ? "#B45309" : "#FCD34D",
                    }}
                  >
                    {seasonDaysLeft}d left
                  </span>
                </div>
              </div>
            </div>

            {/* Season Progress Bar */}
            <div style={{ marginBottom: 6 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--dp-text-secondary)",
                  }}
                >
                  Season Progress
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isLight ? "#B45309" : "#FCD34D",
                  }}
                >
                  {seasonProgress}%
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 8,
                  borderRadius: 4,
                  background: isLight ? "rgba(0,0,0,0.06)" : "var(--dp-glass-border)",
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: mounted ? seasonProgress + "%" : "0%",
                    borderRadius: 4,
                    background: "linear-gradient(90deg, #FBBF24, #FB923C)",
                    transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    boxShadow: "0 0 8px rgba(251,191,36,0.3)",
                  }}
                />

                {/* Milestones on progress bar */}
                {milestones.map(function (ms, i) {
                  var pos = ms.percent || ms.position || 0;
                  var reached = seasonProgress >= pos;
                  return (
                    <div
                      key={ms.id || i}
                      style={{
                        position: "absolute",
                        top: -4,
                        left: pos + "%",
                        transform: "translateX(-50%)",
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          background: reached
                            ? "linear-gradient(135deg, #FBBF24, #FB923C)"
                            : (isLight ? "rgba(0,0,0,0.08)" : "var(--dp-glass-border)"),
                          border: reached
                            ? "2px solid rgba(251,191,36,0.4)"
                            : "2px solid " + (isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)"),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: reached ? "0 0 6px rgba(251,191,36,0.3)" : "none",
                        }}
                      >
                        {reached && <Check size={8} color="#fff" strokeWidth={3} />}
                      </div>
                      {ms.label && (
                        <div
                          style={{
                            position: "absolute",
                            top: 20,
                            left: "50%",
                            transform: "translateX(-50%)",
                            fontSize: 9,
                            fontWeight: 600,
                            color: reached ? (isLight ? "#B45309" : "#FCD34D") : "var(--dp-text-muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ms.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Season description */}
            {(season.description || season.subtitle) && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--dp-text-secondary)",
                  lineHeight: 1.5,
                  marginTop: milestones.length > 0 ? 28 : 12,
                }}
              >
                {season.description || season.subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Rewards Section Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
          }}
        >
          <Gift size={16} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--dp-text)",
            }}
          >
            Available Rewards
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--dp-text-muted)",
              marginLeft: "auto",
            }}
          >
            {rewards.length} reward{rewards.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Loading state for rewards */}
        {rewardsQuery.isLoading && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              opacity: mounted ? 1 : 0,
              transition: "all 0.5s ease 0.2s",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid var(--dp-glass-border)",
                borderTopColor: isLight ? "#8B5CF6" : "#C4B5FD",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ fontSize: 14, color: "var(--dp-text-tertiary)" }}>
              Loading rewards...
            </p>
          </div>
        )}

        {/* Empty state */}
        {!rewardsQuery.isLoading && rewards.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              opacity: mounted ? 1 : 0,
              transition: "all 0.5s ease 0.2s",
            }}
          >
            <Gift
              size={40}
              color={isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"}
              strokeWidth={1.5}
              style={{ marginBottom: 16 }}
            />
            <p style={{ fontSize: 15, color: "var(--dp-text-tertiary)" }}>
              No rewards available yet
            </p>
            <p style={{ fontSize: 13, color: "var(--dp-text-muted)", marginTop: 4 }}>
              Keep progressing through the season to unlock rewards!
            </p>
          </div>
        )}

        {/* Reward Cards */}
        {!rewardsQuery.isLoading && rewards.map(function (reward, i) {
          var isClaimed = !!reward.claimed || !!reward.isClaimed || claimedSet.has(reward.id);
          var rewardType = reward.type || reward.rewardType || "star";
          var RewardIcon = REWARD_ICONS[rewardType] || Gift;
          var rewardColor = REWARD_COLORS[rewardType] || "#8B5CF6";
          var xpAmount = reward.xp || reward.xpReward || 0;
          var itemReward = reward.item || reward.itemName || "";

          return (
            <div
              key={reward.id || i}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) " + (0.25 + i * 0.07) + "s",
              }}
            >
              <div
                style={{
                  ...glass,
                  padding: 18,
                  marginBottom: 12,
                  borderRadius: 18,
                  border: isClaimed
                    ? "1px solid rgba(16,185,129,0.15)"
                    : "1px solid var(--dp-input-border)",
                  background: isClaimed
                    ? (isLight ? "rgba(16,185,129,0.03)" : "rgba(16,185,129,0.04)")
                    : "var(--dp-glass-bg)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  {/* Reward Icon */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: rewardColor + "15",
                      border: "2px solid " + rewardColor + "25",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <RewardIcon
                      size={22}
                      color={isClaimed ? "#10B981" : rewardColor}
                      strokeWidth={2}
                    />
                  </div>

                  {/* Reward Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--dp-text)",
                        marginBottom: 3,
                      }}
                    >
                      {reward.title || reward.name || "Reward"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--dp-text-secondary)",
                        lineHeight: 1.4,
                        marginBottom: 6,
                      }}
                    >
                      {reward.description || ""}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {xpAmount > 0 && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            borderRadius: 8,
                            background: "rgba(251,191,36,0.1)",
                            border: "1px solid rgba(251,191,36,0.15)",
                            fontSize: 11,
                            fontWeight: 600,
                            color: isLight ? "#B45309" : "#FCD34D",
                          }}
                        >
                          <Zap size={11} strokeWidth={2.5} />
                          +{xpAmount} XP
                        </span>
                      )}
                      {itemReward && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            borderRadius: 8,
                            background: "rgba(139,92,246,0.08)",
                            border: "1px solid rgba(139,92,246,0.15)",
                            fontSize: 11,
                            fontWeight: 600,
                            color: isLight ? "#6D28D9" : "#C4B5FD",
                          }}
                        >
                          <Gift size={11} strokeWidth={2} />
                          {itemReward}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Claim Button */}
                  <button
                    onClick={function () {
                      if (!isClaimed) {
                        claimMutation.mutate(reward.id);
                      }
                    }}
                    disabled={isClaimed || claimMutation.isPending}
                    style={{
                      padding: isClaimed ? "8px 14px" : "8px 16px",
                      borderRadius: 12,
                      border: isClaimed
                        ? "1px solid rgba(16,185,129,0.2)"
                        : "none",
                      background: isClaimed
                        ? "rgba(16,185,129,0.08)"
                        : "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                      color: isClaimed ? "#10B981" : "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isClaimed ? "default" : "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      flexShrink: 0,
                      boxShadow: isClaimed
                        ? "none"
                        : "0 2px 10px rgba(139,92,246,0.3)",
                      transition: "all 0.25s",
                    }}
                  >
                    {isClaimed ? (
                      <>
                        <Check size={13} strokeWidth={2.5} />
                        Claimed
                      </>
                    ) : claimMutation.isPending ? (
                      <Loader size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      "Claim"
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </PageLayout>
  );
}
