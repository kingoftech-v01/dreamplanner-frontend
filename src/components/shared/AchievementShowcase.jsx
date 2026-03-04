import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../services/api";
import { USERS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { BRAND, adaptColor } from "../../styles/colors";
import GlassCard from "./GlassCard";
import {
  Award, Lock, Sparkles, Cloud, Building, CheckCircle, Crown,
  Footprints, Hammer, Shield, Rocket, Flame, CalendarCheck, Zap,
  Sun, UserPlus, Users, MessageSquare, Heart, UserCheck, X, Star,
  Trophy, Target,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * AchievementShowcase — Badge grid with rarity glows, progress
 * rings, and tap-to-expand popover for the profile screen.
 * ═══════════════════════════════════════════════════════════════════ */

// ─── Lucide icon map keyed by icon name from API ────────────────
var ICON_MAP = {
  "sparkles": Sparkles,
  "cloud": Cloud,
  "building": Building,
  "check-circle": CheckCircle,
  "crown": Crown,
  "footprints": Footprints,
  "hammer": Hammer,
  "shield": Shield,
  "rocket": Rocket,
  "flame": Flame,
  "calendar-check": CalendarCheck,
  "zap": Zap,
  "sun": Sun,
  "user-plus": UserPlus,
  "users": Users,
  "message-square": MessageSquare,
  "heart": Heart,
  "user-check": UserCheck,
  "award": Award,
  "star": Star,
  "trophy": Trophy,
  "target": Target,
};

// ─── Rarity config: glow color + label ──────────────────────────
var RARITY = {
  common:    { color: "#9CA3AF", glow: "rgba(156,163,175,0.4)", label: "Common" },
  uncommon:  { color: "#10B981", glow: "rgba(16,185,129,0.45)", label: "Uncommon" },
  rare:      { color: "#3B82F6", glow: "rgba(59,130,246,0.45)", label: "Rare" },
  epic:      { color: "#8B5CF6", glow: "rgba(139,92,246,0.5)",  label: "Epic" },
  legendary: { color: "#FCD34D", glow: "rgba(252,211,77,0.55)", label: "Legendary" },
};

// ─── Category labels ────────────────────────────────────────────
var CATEGORY_LABELS = {
  dreams: "Dreams",
  tasks: "Tasks",
  streaks: "Streaks",
  social: "Social",
  profile: "Profile",
  special: "Special",
};

// ─── Mini progress ring SVG ─────────────────────────────────────
var RING_SIZE = 58;
var RING_STROKE = 2.5;
var RING_R = (RING_SIZE - RING_STROKE) / 2;
var RING_C = 2 * Math.PI * RING_R;

function ProgressRing({ progress, total, color, mounted }) {
  var pct = total > 0 ? Math.min(progress / total, 1) : 0;
  var offset = RING_C - pct * RING_C;

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      style={{
        position: "absolute",
        inset: 0,
        transform: "rotate(-90deg)",
        pointerEvents: "none",
      }}
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        fill="none"
        stroke="var(--dp-glass-border)"
        strokeWidth={RING_STROKE}
      />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        fill="none"
        stroke={color}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_C}
        strokeDashoffset={mounted ? offset : RING_C}
        style={{
          transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s",
          filter: "drop-shadow(0 0 3px " + color + "60)",
        }}
      />
    </svg>
  );
}

// ─── Badge item ─────────────────────────────────────────────────
function BadgeItem({ ach, mounted, index, onSelect, isLight }) {
  var rarity = RARITY[ach.rarity] || RARITY.common;
  var Icon = ICON_MAP[ach.icon] || Award;
  var isUnlocked = ach.unlocked;
  var isLegendary = ach.rarity === "legendary";
  var borderColor = isUnlocked ? rarity.color : "var(--dp-glass-border)";
  var glowShadow = isUnlocked
    ? "0 0 12px " + rarity.glow + ", 0 0 4px " + rarity.glow
    : "none";
  var iconColor = isUnlocked
    ? adaptColor(rarity.color, isLight)
    : "var(--dp-text-muted)";
  var hasProgress = !isUnlocked && ach.progress > 0 && ach.requirementValue > 1;

  return (
    <div
      onClick={function () { onSelect(ach); }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0) scale(1)" : "translateY(10px) scale(0.9)",
        transition: "all 0.5s cubic-bezier(0.16,1,0.3,1) " + (200 + index * 50) + "ms",
      }}
    >
      {/* Badge circle */}
      <div
        className={isLegendary && isUnlocked ? "dp-legendary-shimmer" : ""}
        style={{
          position: "relative",
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Progress ring (only for in-progress, locked badges) */}
        {hasProgress && (
          <ProgressRing
            progress={ach.progress}
            total={ach.requirementValue}
            color={rarity.color}
            mounted={mounted}
          />
        )}

        {/* Inner circle */}
        <div style={{
          width: RING_SIZE - 8,
          height: RING_SIZE - 8,
          borderRadius: "50%",
          background: isUnlocked
            ? rarity.color + "15"
            : "var(--dp-surface)",
          border: "2px solid " + borderColor,
          boxShadow: glowShadow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          opacity: isUnlocked ? 1 : 0.5,
          transition: "all 0.3s ease",
        }}>
          <Icon
            size={22}
            color={iconColor}
            strokeWidth={isUnlocked ? 2 : 1.5}
          />

          {/* Lock overlay for locked badges */}
          {!isUnlocked && (
            <div style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--dp-card-solid)",
              border: "1.5px solid var(--dp-glass-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Lock size={9} color="var(--dp-text-muted)" strokeWidth={2.5} />
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      <span style={{
        fontSize: 10,
        fontWeight: 500,
        textAlign: "center",
        lineHeight: 1.2,
        color: isUnlocked ? "var(--dp-text-secondary)" : "var(--dp-text-muted)",
        maxWidth: RING_SIZE + 8,
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      }}>
        {ach.name}
      </span>
    </div>
  );
}

// ─── Detail Popover ─────────────────────────────────────────────
function BadgePopover({ ach, onClose, isLight }) {
  var popRef = useRef(null);
  var rarity = RARITY[ach.rarity] || RARITY.common;
  var Icon = ICON_MAP[ach.icon] || Award;
  var isUnlocked = ach.unlocked;
  var iconColor = isUnlocked
    ? adaptColor(rarity.color, isLight)
    : "var(--dp-text-muted)";
  var pct = ach.requirementValue > 0
    ? Math.round((ach.progress / ach.requirementValue) * 100)
    : 0;

  // Close on click outside
  useEffect(function () {
    function handler(e) {
      if (popRef.current && !popRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return function () {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);

  var unlockedDate = "";
  if (ach.unlockedAt) {
    try {
      var d = new Date(ach.unlockedAt);
      unlockedDate = d.toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch (_) {
      unlockedDate = "";
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.45)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      animation: "dpPopFadeIn 0.2s ease",
    }}>
      <div
        ref={popRef}
        style={{
          width: 280,
          padding: 24,
          borderRadius: 20,
          background: "var(--dp-card-solid)",
          border: "1px solid " + rarity.color + "40",
          boxShadow: "0 0 30px " + rarity.glow + ", 0 20px 50px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          animation: "dpPopScaleIn 0.25s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "1px solid var(--dp-glass-border)",
            background: "var(--dp-glass-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--dp-text-muted)",
            fontFamily: "inherit",
          }}
        >
          <X size={14} strokeWidth={2.5} />
        </button>

        {/* Badge icon large */}
        <div
          className={ach.rarity === "legendary" && isUnlocked ? "dp-legendary-shimmer" : ""}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: isUnlocked ? rarity.color + "18" : "var(--dp-surface)",
            border: "2.5px solid " + (isUnlocked ? rarity.color : "var(--dp-glass-border)"),
            boxShadow: isUnlocked
              ? "0 0 20px " + rarity.glow
              : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isUnlocked ? 1 : 0.55,
          }}
        >
          <Icon size={32} color={iconColor} strokeWidth={isUnlocked ? 2 : 1.5} />
        </div>

        {/* Name */}
        <h3 style={{
          fontSize: 16,
          fontWeight: 700,
          color: "var(--dp-text)",
          margin: 0,
          textAlign: "center",
        }}>
          {ach.name}
        </h3>

        {/* Rarity badge */}
        <span style={{
          padding: "3px 10px",
          borderRadius: 8,
          background: rarity.color + "18",
          border: "1px solid " + rarity.color + "30",
          fontSize: 11,
          fontWeight: 600,
          color: adaptColor(rarity.color, isLight),
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>
          {rarity.label}
        </span>

        {/* Description */}
        <p style={{
          fontSize: 13,
          color: "var(--dp-text-secondary)",
          textAlign: "center",
          lineHeight: 1.5,
          margin: 0,
        }}>
          {ach.description}
        </p>

        {/* Progress bar */}
        <div style={{ width: "100%", marginTop: 4 }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 5,
          }}>
            <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>
              Progress
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: isUnlocked ? adaptColor(BRAND.greenSolid, isLight) : "var(--dp-text-secondary)",
            }}>
              {ach.progress} / {ach.requirementValue}
            </span>
          </div>
          <div style={{
            height: 6,
            borderRadius: 3,
            background: "var(--dp-surface)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              borderRadius: 3,
              width: Math.min(pct, 100) + "%",
              background: isUnlocked
                ? "linear-gradient(90deg, " + BRAND.greenSolid + ", " + BRAND.green + ")"
                : "linear-gradient(90deg, " + rarity.color + "90, " + rarity.color + ")",
              boxShadow: "0 0 6px " + rarity.glow,
              transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
        </div>

        {/* XP reward and unlock date */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          marginTop: 2,
        }}>
          <span style={{
            fontSize: 11,
            color: "var(--dp-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <Zap size={11} strokeWidth={2.5} />
            +{ach.xpReward} XP
          </span>
          {isUnlocked && unlockedDate && (
            <span style={{
              fontSize: 11,
              color: adaptColor(BRAND.greenSolid, isLight),
              fontWeight: 500,
            }}>
              Unlocked {unlockedDate}
            </span>
          )}
          {!isUnlocked && (
            <span style={{
              fontSize: 11,
              color: "var(--dp-text-muted)",
            }}>
              {CATEGORY_LABELS[ach.category] || ach.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function AchievementShowcase() {
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var [mounted, setMounted] = useState(false);
  var [selected, setSelected] = useState(null);

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 150);
    return function () { clearTimeout(timer); };
  }, []);

  var query = useQuery({
    queryKey: ["achievements-showcase"],
    queryFn: function () { return apiGet(USERS.ACHIEVEMENTS); },
    staleTime: 60000,
  });

  var data = query.data;

  // Don't render while loading or on error
  if (query.isLoading || query.isError || !data) return null;

  var achievements = data.achievements || [];
  var unlockedCount = data.unlocked_count || 0;
  var totalCount = data.total_count || 0;
  var progressPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (achievements.length === 0) return null;

  return (
    <GlassCard padding={18} mb={10} style={{
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
      transition: "all 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s",
    }}>
      {/* ── Summary Header ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Trophy
              size={15}
              color={adaptColor(BRAND.yellow, isLight)}
              strokeWidth={2.5}
            />
            <h2 style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--dp-text)",
              margin: 0,
            }}>
              Achievements
            </h2>
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--dp-text-secondary)",
          }}>
            {unlockedCount} of {totalCount}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 5,
          borderRadius: 3,
          background: "var(--dp-glass-border)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            borderRadius: 3,
            background: "linear-gradient(90deg, " + BRAND.purple + ", " + BRAND.green + ")",
            width: mounted ? progressPct + "%" : "0%",
            transition: "width 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s",
            boxShadow: "0 0 8px rgba(139,92,246,0.4)",
          }} />
        </div>
      </div>

      {/* ── Badge Grid (3-4 columns) ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        justifyItems: "center",
      }}>
        {achievements.map(function (ach, i) {
          return (
            <BadgeItem
              key={ach.id}
              ach={ach}
              mounted={mounted}
              index={i}
              isLight={isLight}
              onSelect={setSelected}
            />
          );
        })}
      </div>

      {/* ── Detail Popover ── */}
      {selected && (
        <BadgePopover
          ach={selected}
          isLight={isLight}
          onClose={function () { setSelected(null); }}
        />
      )}

      {/* ── CSS animations ── */}
      <style>{"\
        @keyframes dpPopFadeIn {\
          from { opacity: 0; }\
          to { opacity: 1; }\
        }\
        @keyframes dpPopScaleIn {\
          from { opacity: 0; transform: scale(0.85) translateY(10px); }\
          to { opacity: 1; transform: scale(1) translateY(0); }\
        }\
        @keyframes dpLegendaryShimmer {\
          0% { box-shadow: 0 0 8px rgba(252,211,77,0.3), 0 0 16px rgba(252,211,77,0.15); }\
          50% { box-shadow: 0 0 16px rgba(252,211,77,0.55), 0 0 32px rgba(252,211,77,0.25); }\
          100% { box-shadow: 0 0 8px rgba(252,211,77,0.3), 0 0 16px rgba(252,211,77,0.15); }\
        }\
        .dp-legendary-shimmer {\
          animation: dpLegendaryShimmer 2.5s ease-in-out infinite;\
        }\
      "}</style>
    </GlassCard>
  );
}
