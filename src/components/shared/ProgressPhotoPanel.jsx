import { useState } from "react";
import { X, Camera, Sparkles, ChevronDown, ChevronUp, TrendingUp, CheckCircle, AlertTriangle, Heart } from "lucide-react";
import GlassModal from "./GlassModal";
import GlassCard from "./GlassCard";
import GradientButton from "./GradientButton";

/* ===================================================================
 * ProgressPhotoPanel -- Full analysis view for a single progress photo
 * =================================================================== */

var STATUS_COLORS = {
  improved:        { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", text: "#10B981", icon: TrendingUp },
  maintained:      { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", text: "#F59E0B", icon: CheckCircle },
  needs_attention: { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)",  text: "#EF4444", icon: AlertTriangle },
};

function IndicatorBadge({ indicator, status }) {
  var colors = STATUS_COLORS[status] || STATUS_COLORS.maintained;
  var Icon = colors.icon;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 12px", borderRadius: 12,
      background: colors.bg,
      border: "1px solid " + colors.border,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 8, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: colors.bg,
      }}>
        <Icon size={14} color={colors.text} strokeWidth={2.5} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", lineHeight: 1.4 }}>{indicator}</div>
        <span style={{
          display: "inline-block", marginTop: 4,
          padding: "2px 8px", borderRadius: 6,
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          background: colors.bg, color: colors.text, letterSpacing: "0.03em",
        }}>
          {status.replace(/_/g, " ")}
        </span>
      </div>
    </div>
  );
}

export default function ProgressPhotoPanel({ open, onClose, photo, analyzing, onAnalyze }) {
  var [imgLoaded, setImgLoaded] = useState(false);

  if (!open || !photo) return null;

  var analysis = photo.aiAnalysisData || null;
  var hasAnalysis = !!analysis && !!analysis.analysis;
  var imageUrl = photo.image || "";

  return (
    <GlassModal open={open} onClose={onClose} variant="center" title="Progress Photo" maxWidth={420}>
      <div style={{ padding: 0 }}>
        {/* -- Image -- */}
        <div style={{
          position: "relative", width: "100%",
          maxHeight: 320, overflow: "hidden",
          background: "var(--dp-surface)",
          borderBottom: "1px solid var(--dp-header-border)",
        }}>
          <img
            src={imageUrl}
            alt={photo.caption || "Progress photo"}
            onLoad={function () { setImgLoaded(true); }}
            style={{
              width: "100%", maxHeight: 320,
              objectFit: "contain", display: "block",
              opacity: imgLoaded ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          />
          {!imgLoaded && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--dp-text-muted)", fontSize: 13,
            }}>
              Loading...
            </div>
          )}
          {/* Date badge */}
          <div style={{
            position: "absolute", bottom: 10, left: 10,
            padding: "4px 10px", borderRadius: 8,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
            fontSize: 11, fontWeight: 600, color: "#fff",
          }}>
            {photo.takenAt ? new Date(photo.takenAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""}
          </div>
        </div>

        <div style={{ padding: "16px 20px 20px" }}>
          {/* -- Caption -- */}
          {photo.caption && (
            <p style={{
              fontSize: 14, color: "var(--dp-text-secondary)", lineHeight: 1.5,
              marginBottom: 16, fontStyle: "italic",
            }}>
              "{photo.caption}"
            </p>
          )}

          {/* -- No analysis yet -- */}
          {!hasAnalysis && !analyzing && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, margin: "0 auto 12px",
                background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.08))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={22} color="var(--dp-accent)" strokeWidth={2} />
              </div>
              <p style={{ fontSize: 13, color: "var(--dp-text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                AI has not analyzed this photo yet. Tap below to get visual progress insights.
              </p>
              <GradientButton gradient="primaryDark" icon={Sparkles} onClick={function () { if (onAnalyze) onAnalyze(photo.id); }}>
                Analyze with AI
              </GradientButton>
            </div>
          )}

          {/* -- Analyzing spinner -- */}
          {analyzing && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div className="dp-spin" style={{
                width: 32, height: 32, margin: "0 auto 12px",
                border: "3px solid rgba(139,92,246,0.2)",
                borderTopColor: "#8B5CF6", borderRadius: "50%",
              }} />
              <p style={{ fontSize: 13, color: "var(--dp-text-muted)" }}>Analyzing your progress...</p>
            </div>
          )}

          {/* -- Analysis results -- */}
          {hasAnalysis && !analyzing && (
            <div>
              {/* Main analysis */}
              <div style={{
                padding: "14px 16px", borderRadius: 14, marginBottom: 14,
                background: "var(--dp-surface)",
                border: "1px solid var(--dp-glass-border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Sparkles size={14} color="var(--dp-accent)" strokeWidth={2.5} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>AI Analysis</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.6, margin: 0 }}>
                  {analysis.analysis}
                </p>
              </div>

              {/* Progress indicators */}
              {analysis.progress_indicators && analysis.progress_indicators.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <TrendingUp size={14} color="var(--dp-accent)" strokeWidth={2.5} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>Progress Indicators</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {analysis.progress_indicators.map(function (pi, i) {
                      return <IndicatorBadge key={i} indicator={pi.indicator} status={pi.status} />;
                    })}
                  </div>
                </div>
              )}

              {/* Comparison to previous */}
              {analysis.comparison_to_previous && (
                <div style={{
                  padding: "12px 16px", borderRadius: 14, marginBottom: 14,
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.15)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Camera size={13} color="var(--dp-accent)" strokeWidth={2.5} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dp-text)" }}>Compared to Previous</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--dp-text-secondary)", lineHeight: 1.5, margin: 0 }}>
                    {analysis.comparison_to_previous}
                  </p>
                </div>
              )}

              {/* Encouragement */}
              {analysis.encouragement && (
                <div style={{
                  padding: "12px 16px", borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(20,184,166,0.04))",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <Heart size={14} color="#10B981" strokeWidth={2.5} style={{ marginTop: 1, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: "#10B981", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                      {analysis.encouragement}
                    </p>
                  </div>
                </div>
              )}

              {/* Re-analyze button */}
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button onClick={function () { if (onAnalyze) onAnalyze(photo.id); }} style={{
                  padding: "8px 16px", borderRadius: 10,
                  border: "1px solid rgba(139,92,246,0.2)",
                  background: "rgba(139,92,246,0.06)",
                  color: "var(--dp-accent)", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  transition: "all 0.2s ease",
                }}>
                  <Sparkles size={13} strokeWidth={2.5} />
                  Re-analyze
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </GlassModal>
  );
}
