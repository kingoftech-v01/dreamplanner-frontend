import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../services/api";
import { USERS } from "../../services/endpoints";
import { BRAND, adaptColor } from "../../styles/colors";
import { useTheme } from "../../context/ThemeContext";
import {
  User, Camera, FileText, Cake, Globe, Sparkles, Target,
  Check, ChevronRight, PartyPopper
} from "lucide-react";

// ─── Icon + color map for each completeness key ────────────────────
var ITEM_CONFIG = {
  display_name: { icon: User,      color: BRAND.purpleLight },
  avatar:       { icon: Camera,    color: BRAND.teal },
  bio:          { icon: FileText,  color: BRAND.green },
  dob:          { icon: Cake,      color: BRAND.pink },
  timezone:     { icon: Globe,     color: BRAND.blue },
  dream:        { icon: Sparkles,  color: BRAND.yellow },
  goal:         { icon: Target,    color: BRAND.red },
};

// ─── SVG Progress Ring ─────────────────────────────────────────────
var RING_SIZE = 100;
var RING_STROKE = 6;
var RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
var RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ percentage, mounted }) {
  var offset = RING_CIRCUMFERENCE - (percentage / 100) * RING_CIRCUMFERENCE;
  var isComplete = percentage >= 100;

  return (
    <div style={{ position: "relative", width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="profileRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isComplete ? BRAND.green : BRAND.purple} />
            <stop offset="50%" stopColor={isComplete ? BRAND.teal : BRAND.purpleLight} />
            <stop offset="100%" stopColor={isComplete ? BRAND.greenSolid : BRAND.green} />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          fill="none"
          stroke="var(--dp-glass-border)"
          strokeWidth={RING_STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS}
          fill="none"
          stroke="url(#profileRingGrad)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={mounted ? offset : RING_CIRCUMFERENCE}
          style={{
            transition: "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1) 0.2s",
            filter: isComplete
              ? "drop-shadow(0 0 8px rgba(16,185,129,0.6))"
              : "drop-shadow(0 0 6px rgba(139,92,246,0.4))",
          }}
        />
      </svg>

      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {isComplete ? (
          <PartyPopper size={22} color={BRAND.green} strokeWidth={2} />
        ) : (
          <span style={{
            fontSize: 22, fontWeight: 800, color: "var(--dp-text)",
            lineHeight: 1,
          }}>{percentage}</span>
        )}
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: isComplete ? BRAND.greenSolid : "var(--dp-text-muted)",
          marginTop: 2,
        }}>{isComplete ? "Complete!" : "%"}</span>
      </div>
    </div>
  );
}

// ─── Action Chip (for missing items) ──────────────────────────────
function ActionChip({ item, isLight, onClick }) {
  var config = ITEM_CONFIG[item.key] || { icon: Target, color: BRAND.purpleLight };
  var Icon = config.icon;
  var chipColor = adaptColor(config.color, isLight);

  return (
    <button
      onClick={onClick}
      className="dp-gh"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px 6px 8px",
        borderRadius: 20,
        border: "1px solid var(--dp-glass-border)",
        background: "var(--dp-glass-bg)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        cursor: "pointer", fontFamily: "inherit",
        transition: "all 0.2s",
        fontSize: 12, fontWeight: 600,
        color: chipColor,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={13} strokeWidth={2.5} />
      {item.actionLabel}
      <ChevronRight size={11} strokeWidth={2.5} style={{ opacity: 0.5 }} />
    </button>
  );
}

// ─── Completed Dot (for filled items) ─────────────────────────────
function CompletedDot({ itemKey, isLight }) {
  var config = ITEM_CONFIG[itemKey] || { icon: Target, color: BRAND.purpleLight };
  var Icon = config.icon;
  var c = adaptColor(config.color, isLight);

  return (
    <div style={{
      width: 30, height: 30, borderRadius: 10,
      background: c + "15",
      border: "1px solid " + c + "25",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      <Icon size={14} color={c} strokeWidth={2} />
      <div style={{
        position: "absolute", bottom: -2, right: -2,
        width: 12, height: 12, borderRadius: "50%",
        background: BRAND.greenSolid,
        border: "1.5px solid var(--dp-card-solid)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Check size={7} color={BRAND.white} strokeWidth={3} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function ProfileCompleteness() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var [mounted, setMounted] = useState(false);

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 150);
    return function () { clearTimeout(timer); };
  }, []);

  var query = useQuery({
    queryKey: ["profile-completeness"],
    queryFn: function () { return apiGet(USERS.PROFILE_COMPLETENESS); },
    staleTime: 60000,
  });

  var data = query.data;

  // Don't render while loading or on error
  if (query.isLoading || query.isError || !data) return null;

  // Don't show at all if already 100% and user has seen it
  var percentage = data.percentage || 0;
  var items = data.items || [];
  var completedKeys = data.completed || [];
  var missingItems = items.filter(function (item) { return !item.filled; });
  var completedItems = items.filter(function (item) { return item.filled; });
  var isComplete = percentage >= 100;

  return (
    <div className="dp-g" style={{
      padding: 18,
      marginBottom: 10,
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
      transition: "all 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s",
    }}>
      {/* Header row: ring + info */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <ProgressRing percentage={percentage} mounted={mounted} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: "var(--dp-text)",
            margin: "0 0 4px 0",
          }}>
            {isComplete ? "Profile Complete!" : "Complete Your Profile"}
          </h3>
          <p style={{
            fontSize: 12, color: "var(--dp-text-muted)",
            margin: "0 0 10px 0", lineHeight: 1.4,
          }}>
            {isComplete
              ? "Great job! Your profile is fully set up."
              : completedKeys.length + " of " + items.length + " steps done"
            }
          </p>

          {/* Completed items as small dots */}
          {completedItems.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {completedItems.map(function (item) {
                return (
                  <CompletedDot key={item.key} itemKey={item.key} isLight={isLight} />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      {missingItems.length > 0 && (
        <div style={{
          height: 1,
          background: "var(--dp-divider)",
          margin: "14px 0",
        }} />
      )}

      {/* Action chips for missing items */}
      {missingItems.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8,
        }}>
          {missingItems.map(function (item) {
            return (
              <ActionChip
                key={item.key}
                item={item}
                isLight={isLight}
                onClick={function () { navigate(item.action); }}
              />
            );
          })}
        </div>
      )}

      {/* Celebration state gradient border */}
      {isComplete && (
        <style>{"\n          @keyframes dpCompleteBorder {\n            0%   { border-color: " + BRAND.green + "40; }\n            33%  { border-color: " + BRAND.purple + "40; }\n            66%  { border-color: " + BRAND.teal + "40; }\n            100% { border-color: " + BRAND.green + "40; }\n          }\n        "}</style>
      )}
    </div>
  );
}
