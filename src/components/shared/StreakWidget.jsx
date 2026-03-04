import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../services/api";
import { USERS } from "../../services/endpoints";
import GlassCard from "./GlassCard";
import { Flame, Shield, TrendingUp } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * StreakWidget — Animated streak counter for the home dashboard.
 *
 * Glass-morphism card showing:
 *  1. Animated flame icon (CSS flicker, scales with streak length)
 *  2. Current streak count + "day streak" label
 *  3. Mini 14-day heatmap as colored dots
 *  4. Longest streak stat
 *  5. Streak freeze indicator
 * ═══════════════════════════════════════════════════════════════════ */

// ── Flame scale factor — grows with streak length ──
var getFlameScale = function (streak) {
  if (streak >= 100) return 1.5;
  if (streak >= 50) return 1.35;
  if (streak >= 30) return 1.25;
  if (streak >= 14) return 1.15;
  if (streak >= 7) return 1.08;
  return 1;
};

// ── Gradient border intensity — hotter with longer streaks ──
var getBorderGlow = function (streak) {
  var alpha = Math.min(0.6, 0.1 + streak * 0.012);
  return "1px solid rgba(249,115,22," + alpha + ")";
};

// ── Card background gradient — intensifies with streak ──
var getCardGradient = function (streak) {
  var base = Math.min(0.12, 0.03 + streak * 0.003);
  return (
    "linear-gradient(135deg, rgba(249,115,22," + base + ") 0%, rgba(239,68,68," + (base * 0.8) + ") 40%, rgba(139,92,246," + (base * 0.5) + ") 100%)"
  );
};

export default function StreakWidget() {
  var [mounted, setMounted] = useState(false);

  useEffect(function () {
    var t = setTimeout(function () { setMounted(true); }, 80);
    return function () { clearTimeout(t); };
  }, []);

  var streakQuery = useQuery({
    queryKey: ["streak-details"],
    queryFn: function () { return apiGet(USERS.STREAK_DETAILS); },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  var data = streakQuery.data;

  // Don't render while loading or on error
  if (streakQuery.isLoading || streakQuery.isError || !data) return null;

  var currentStreak = data.current_streak || 0;
  var longestStreak = data.longest_streak || 0;
  var history = data.streak_history || [];
  var streakFrozen = data.streak_frozen || false;
  var freezeCount = data.freeze_count || 0;
  var freezeAvailable = data.freeze_available || false;

  var flameScale = getFlameScale(currentStreak);
  var borderStyle = getBorderGlow(currentStreak);
  var bgGradient = getCardGradient(currentStreak);

  // ── Day labels for the 14-day heatmap ──
  var dayLabels = [];
  var now = new Date();
  for (var di = 13; di >= 0; di--) {
    var d = new Date(now);
    d.setDate(d.getDate() - di);
    dayLabels.push(["S","M","T","W","T","F","S"][d.getDay()]);
  }

  return (
    <GlassCard padding={0} mb={20} style={{ overflow: "hidden", border: borderStyle, position: "relative" }}>
      {/* Warm gradient overlay */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: bgGradient,
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", padding: 20 }}>

        {/* ── Top row: flame + streak number ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>

          {/* Animated flame container */}
          <div className="dp-streak-flame-wrap" style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(239,68,68,0.10))",
            border: "1px solid rgba(249,115,22,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", overflow: "visible",
          }}>
            {/* Outer glow ring */}
            <div className="dp-streak-glow" style={{
              position: "absolute", inset: -4, borderRadius: 20,
              background: "transparent",
              boxShadow: currentStreak > 0
                ? "0 0 " + (12 + currentStreak * 0.5) + "px rgba(249,115,22," + Math.min(0.4, 0.08 + currentStreak * 0.008) + ")"
                : "none",
              pointerEvents: "none",
            }} />
            <div className="dp-streak-flame-icon" style={{
              transform: "scale(" + flameScale + ")",
              transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              filter: currentStreak > 0 ? "drop-shadow(0 2px 8px rgba(249,115,22,0.5))" : "none",
            }}>
              <Flame
                size={28}
                color={currentStreak > 0 ? "#F97316" : "var(--dp-text-muted)"}
                fill={currentStreak > 0 ? "rgba(249,115,22,0.3)" : "none"}
                strokeWidth={2}
              />
            </div>
          </div>

          {/* Streak number + label */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{
                fontSize: 36, fontWeight: 800, letterSpacing: "-1px",
                color: currentStreak > 0 ? "var(--dp-text)" : "var(--dp-text-muted)",
                lineHeight: 1,
              }}>
                {currentStreak}
              </span>
              <span style={{
                fontSize: 15, fontWeight: 600,
                color: "var(--dp-text-secondary)",
              }}>
                day streak
              </span>
            </div>
            {/* Freeze indicator */}
            {streakFrozen && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 6, padding: "3px 10px", borderRadius: 8,
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.18)",
              }}>
                <Shield size={12} color="#3B82F6" strokeWidth={2.5} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6" }}>Freeze active</span>
              </div>
            )}
          </div>

          {/* Longest streak badge */}
          {longestStreak > 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "6px 12px", borderRadius: 12,
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.12)",
            }}>
              <TrendingUp size={14} color="var(--dp-accent)" strokeWidth={2.5} />
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", marginTop: 2 }}>
                {longestStreak}
              </span>
              <span style={{ fontSize: 10, color: "var(--dp-text-muted)", whiteSpace: "nowrap" }}>best</span>
            </div>
          )}
        </div>

        {/* ── 14-day heatmap dots ── */}
        <div style={{
          paddingTop: 14,
          borderTop: "1px solid var(--dp-divider)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)" }}>
              Last 14 days
            </span>
            {freezeAvailable && (
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, color: "var(--dp-text-muted)",
              }}>
                <Shield size={11} color="var(--dp-text-muted)" strokeWidth={2} />
                <span>{freezeCount} freeze{freezeCount !== 1 ? "s" : ""} left</span>
              </div>
            )}
          </div>

          {/* Day labels */}
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {dayLabels.map(function (label, i) {
              return (
                <div key={i} style={{
                  flex: 1, textAlign: "center",
                  fontSize: 9, fontWeight: 500,
                  color: "var(--dp-text-muted)",
                }}>
                  {label}
                </div>
              );
            })}
          </div>

          {/* Dots row */}
          <div style={{ display: "flex", gap: 4 }}>
            {history.map(function (active, i) {
              var isToday = i === history.length - 1;
              var dotSize = 100 / 14;

              // Color logic
              var dotBg;
              if (active === 1) {
                dotBg = "linear-gradient(135deg, #F97316, #EF4444)";
              } else {
                dotBg = "rgba(139,92,246,0.08)";
              }

              var dotStyle = {
                flex: 1,
                aspectRatio: "1",
                borderRadius: "50%",
                background: dotBg,
                border: isToday ? "2px solid rgba(249,115,22,0.6)" : active === 1 ? "1px solid rgba(249,115,22,0.2)" : "1px solid var(--dp-glass-border)",
                boxShadow: active === 1 ? "0 0 6px rgba(249,115,22,0.25)" : "none",
                transition: "all 0.3s ease",
                maxWidth: 24,
              };

              if (isToday) {
                dotStyle.animation = "dpStreakPulse 2s ease-in-out infinite";
              }

              return <div key={i} style={dotStyle} />;
            })}
          </div>
        </div>
      </div>

      {/* ═══ CSS KEYFRAMES ═══ */}
      <style>{
        "@keyframes dpFlameFlicker {" +
          "0%, 100% { transform: scale(" + flameScale + ") rotate(0deg); opacity: 1; }" +
          "15% { transform: scale(" + (flameScale * 1.06) + ") rotate(-1.5deg); opacity: 0.92; }" +
          "30% { transform: scale(" + (flameScale * 0.97) + ") rotate(1deg); opacity: 1; }" +
          "50% { transform: scale(" + (flameScale * 1.08) + ") rotate(-0.5deg); opacity: 0.88; }" +
          "70% { transform: scale(" + (flameScale * 0.99) + ") rotate(1.5deg); opacity: 0.95; }" +
          "85% { transform: scale(" + (flameScale * 1.04) + ") rotate(-1deg); opacity: 1; }" +
        "}" +
        "@keyframes dpStreakPulse {" +
          "0%, 100% { box-shadow: 0 0 4px rgba(249,115,22,0.3); transform: scale(1); }" +
          "50% { box-shadow: 0 0 12px rgba(249,115,22,0.5); transform: scale(1.12); }" +
        "}" +
        "@keyframes dpStreakGlow {" +
          "0%, 100% { opacity: 0.6; }" +
          "50% { opacity: 1; }" +
        "}" +
        ".dp-streak-flame-icon {" +
          "animation: dpFlameFlicker 1.8s ease-in-out infinite;" +
        "}" +
        ".dp-streak-glow {" +
          "animation: dpStreakGlow 3s ease-in-out infinite;" +
        "}"
      }</style>
    </GlassCard>
  );
}
