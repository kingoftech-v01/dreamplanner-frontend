import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, AlertTriangle, Plus, Eye, Zap } from "lucide-react";
import GlassModal from "./GlassModal";
import GlassCard from "./GlassCard";
import GradientButton from "./GradientButton";

/* ═══════════════════════════════════════════════════════════════════
 * ObstaclePredictionPanel — AI obstacle predictions with glass UI
 * ═══════════════════════════════════════════════════════════════════ */

var LIKELIHOOD_COLORS = {
  high:   { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.25)",   text: "#EF4444" },
  medium: { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.25)",  text: "#F59E0B" },
  low:    { bg: "rgba(16,185,129,0.12)",   border: "rgba(16,185,129,0.25)",  text: "#10B981" },
};

var IMPACT_COLORS = {
  high:   { bg: "rgba(239,68,68,0.10)",   text: "#EF4444" },
  medium: { bg: "rgba(245,158,11,0.10)",  text: "#F59E0B" },
  low:    { bg: "rgba(16,185,129,0.10)",   text: "#10B981" },
};

function LevelBadge({ label, level, colorMap }) {
  var colors = colorMap[level] || colorMap.medium;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 8,
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      background: colors.bg,
      color: colors.text,
      border: colors.border ? ("1px solid " + colors.border) : "none",
      letterSpacing: "0.03em",
    }}>
      {label}: {level}
    </span>
  );
}

function ExpandableSection({ title, icon, items, accentColor }) {
  var [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={function (e) { e.stopPropagation(); setExpanded(!expanded); }}
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          padding: "6px 10px", borderRadius: 8,
          border: "1px solid var(--dp-glass-border)",
          background: "var(--dp-pill-bg)",
          color: accentColor || "var(--dp-accent)",
          fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          transition: "all 0.2s ease",
        }}
      >
        {icon}
        <span style={{ flex: 1, textAlign: "left" }}>{title} ({items.length})</span>
        {expanded
          ? <ChevronUp size={12} strokeWidth={2.5} />
          : <ChevronDown size={12} strokeWidth={2.5} />
        }
      </button>
      <div style={{
        maxHeight: expanded ? (items.length * 50 + 20) : 0,
        opacity: expanded ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
      }}>
        <div style={{ padding: "8px 0 0 0" }}>
          {items.map(function (item, i) {
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "6px 0",
                borderBottom: i < items.length - 1 ? "1px solid var(--dp-header-border)" : "none",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                  background: accentColor || "var(--dp-accent)",
                }} />
                <span style={{ fontSize: 12, color: "var(--dp-text-secondary)", lineHeight: 1.5 }}>
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PredictionCard({ prediction, index, onAddAsObstacle }) {
  var likelihoodColors = LIKELIHOOD_COLORS[prediction.likelihood] || LIKELIHOOD_COLORS.medium;

  return (
    <div style={{
      animation: "dpFadeScale 0.35s ease-out both",
      animationDelay: (index * 80) + "ms",
    }}>
      <GlassCard mb={10} padding="14px 16px">
        {/* Header: obstacle description + badges */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: likelihoodColors.bg,
            border: "1px solid " + likelihoodColors.border,
          }}>
            <AlertTriangle size={15} color={likelihoodColors.text} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
              lineHeight: 1.4, margin: 0, wordBreak: "break-word",
            }}>
              {prediction.obstacle}
            </p>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <LevelBadge label="Likelihood" level={prediction.likelihood} colorMap={LIKELIHOOD_COLORS} />
              <LevelBadge label="Impact" level={prediction.impact} colorMap={IMPACT_COLORS} />
            </div>
          </div>
        </div>

        {/* Expandable sections */}
        <ExpandableSection
          title="Prevention Strategies"
          icon={<Shield size={11} strokeWidth={2.5} />}
          items={prediction.prevention_strategies}
          accentColor="#8B5CF6"
        />
        <ExpandableSection
          title="Early Warning Signs"
          icon={<Eye size={11} strokeWidth={2.5} />}
          items={prediction.early_warning_signs}
          accentColor="#F59E0B"
        />

        {/* Add as Obstacle button */}
        <button
          onClick={function (e) { e.stopPropagation(); onAddAsObstacle(prediction); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            width: "100%", marginTop: 12, padding: "8px 0", borderRadius: 10,
            border: "1px dashed rgba(139,92,246,0.25)",
            background: "rgba(139,92,246,0.04)",
            color: "var(--dp-accent)",
            fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.2s ease",
          }}
        >
          <Plus size={12} strokeWidth={2.5} />
          Add as Obstacle
        </button>
      </GlassCard>
    </div>
  );
}

export default function ObstaclePredictionPanel({ open, onClose, predictions, loading, error, onAddAsObstacle }) {
  return (
    <GlassModal
      open={open}
      onClose={onClose}
      variant="center"
      title="Obstacle Predictions"
      maxWidth={440}
    >
      <div style={{ padding: "16px 20px 24px" }}>
        {/* Loading state */}
        {loading && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "48px 16px", gap: 16,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))",
              border: "1px solid rgba(139,92,246,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "dpShieldPulse 1.5s ease-in-out infinite",
            }}>
              <Shield size={26} color="#8B5CF6" strokeWidth={2} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{
                fontSize: 14, fontWeight: 600, color: "var(--dp-text)",
                margin: "0 0 4px",
              }}>
                Analyzing potential obstacles...
              </p>
              <p style={{
                fontSize: 12, color: "var(--dp-text-muted)", margin: 0,
              }}>
                AI is reviewing your dream, goals, and patterns
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "32px 16px", gap: 12, textAlign: "center",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={22} color="#EF4444" strokeWidth={2} />
            </div>
            <p style={{ fontSize: 13, color: "var(--dp-text-secondary)", margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && predictions && predictions.length > 0 && (
          <div>
            {/* Summary header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 14, padding: "10px 14px", borderRadius: 12,
              background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))",
              border: "1px solid rgba(139,92,246,0.12)",
            }}>
              <Zap size={14} color="#8B5CF6" strokeWidth={2.5} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)" }}>
                {predictions.length} potential obstacle{predictions.length !== 1 ? "s" : ""} predicted
              </span>
            </div>

            {/* Prediction cards */}
            {predictions.map(function (prediction, i) {
              return (
                <PredictionCard
                  key={i}
                  prediction={prediction}
                  index={i}
                  onAddAsObstacle={onAddAsObstacle}
                />
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && predictions && predictions.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "32px 16px", gap: 12, textAlign: "center",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Shield size={22} color="#10B981" strokeWidth={2} />
            </div>
            <p style={{ fontSize: 13, color: "var(--dp-text-secondary)", margin: 0 }}>
              No significant obstacles predicted. Your plan looks solid!
            </p>
          </div>
        )}
      </div>

      {/* Shield pulse animation */}
      <style>{`
        @keyframes dpShieldPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        @keyframes dpFadeScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </GlassModal>
  );
}
