import { useState } from "react";
import { Compass, Star, Lightbulb, ChevronDown, ChevronUp, Sparkles, ArrowRight, Target, Layers } from "lucide-react";
import GlassModal from "./GlassModal";
import GlassCard from "./GlassCard";

/* ═══════════════════════════════════════════════════════════════════
 * DreamSimilarityPanel — AI-powered similar dreams & inspiration
 * ═══════════════════════════════════════════════════════════════════ */

function ScoreBar({ score, color }) {
  var pct = Math.round((score || 0) * 100);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginTop: 6,
    }}>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: "var(--dp-pill-bg)",
        overflow: "hidden",
      }}>
        <div style={{
          width: pct + "%", height: "100%", borderRadius: 3,
          background: color || "var(--dp-accent)",
          transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }} />
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, color: color || "var(--dp-accent)",
        minWidth: 32, textAlign: "right",
      }}>
        {pct}%
      </span>
    </div>
  );
}

function SimilarDreamCard({ dream, index }) {
  var [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      animation: "dpFadeScale 0.35s ease-out both",
      animationDelay: (index * 80) + "ms",
    }}>
      <GlassCard mb={10} padding="14px 16px">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.2)",
          }}>
            <Compass size={15} color="#8B5CF6" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
              lineHeight: 1.4, margin: 0, wordBreak: "break-word",
            }}>
              {dream.title}
            </p>
            <ScoreBar score={dream.similarity_score} color="#8B5CF6" />
          </div>
        </div>

        {/* Reason toggle */}
        {dream.reason && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={function (e) { e.stopPropagation(); setExpanded(!expanded); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, width: "100%",
                padding: "6px 10px", borderRadius: 8,
                border: "1px solid var(--dp-glass-border)",
                background: "var(--dp-pill-bg)",
                color: "var(--dp-accent)",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s ease",
              }}
            >
              <Sparkles size={11} strokeWidth={2.5} />
              <span style={{ flex: 1, textAlign: "left" }}>Why it is similar</span>
              {expanded
                ? <ChevronUp size={12} strokeWidth={2.5} />
                : <ChevronDown size={12} strokeWidth={2.5} />
              }
            </button>
            <div style={{
              maxHeight: expanded ? 100 : 0,
              opacity: expanded ? 1 : 0,
              overflow: "hidden",
              transition: "max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
            }}>
              <p style={{
                fontSize: 12, color: "var(--dp-text-secondary)", lineHeight: 1.5,
                margin: 0, padding: "8px 0 0",
              }}>
                {dream.reason}
              </p>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function TemplateCard({ template, index, onUseTemplate }) {
  var [expanded, setExpanded] = useState(false);

  var DIFFICULTY_COLORS = {
    beginner:     { bg: "rgba(16,185,129,0.12)", text: "#10B981" },
    intermediate: { bg: "rgba(245,158,11,0.12)", text: "#F59E0B" },
    advanced:     { bg: "rgba(239,68,68,0.12)",  text: "#EF4444" },
  };
  var diffColors = DIFFICULTY_COLORS[template.difficulty] || DIFFICULTY_COLORS.intermediate;

  return (
    <div style={{
      animation: "dpFadeScale 0.35s ease-out both",
      animationDelay: (index * 80 + 200) + "ms",
    }}>
      <GlassCard mb={10} padding="14px 16px">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(236,72,153,0.12)",
            border: "1px solid rgba(236,72,153,0.2)",
          }}>
            <Layers size={15} color="#EC4899" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <p style={{
                fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                lineHeight: 1.4, margin: 0, wordBreak: "break-word",
              }}>
                {template.title}
              </p>
              {template.difficulty && (
                <span style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "2px 8px", borderRadius: 8,
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  background: diffColors.bg,
                  color: diffColors.text,
                  letterSpacing: "0.03em",
                }}>
                  {template.difficulty}
                </span>
              )}
            </div>
            <ScoreBar score={template.relevance_score} color="#EC4899" />
          </div>
        </div>

        {/* Reason toggle */}
        {template.reason && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={function (e) { e.stopPropagation(); setExpanded(!expanded); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, width: "100%",
                padding: "6px 10px", borderRadius: 8,
                border: "1px solid var(--dp-glass-border)",
                background: "var(--dp-pill-bg)",
                color: "#EC4899",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s ease",
              }}
            >
              <Sparkles size={11} strokeWidth={2.5} />
              <span style={{ flex: 1, textAlign: "left" }}>Why it is relevant</span>
              {expanded
                ? <ChevronUp size={12} strokeWidth={2.5} />
                : <ChevronDown size={12} strokeWidth={2.5} />
              }
            </button>
            <div style={{
              maxHeight: expanded ? 100 : 0,
              opacity: expanded ? 1 : 0,
              overflow: "hidden",
              transition: "max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
            }}>
              <p style={{
                fontSize: 12, color: "var(--dp-text-secondary)", lineHeight: 1.5,
                margin: 0, padding: "8px 0 0",
              }}>
                {template.reason}
              </p>
            </div>
          </div>
        )}

        {/* Use Template button */}
        {onUseTemplate && (
          <button
            onClick={function (e) { e.stopPropagation(); onUseTemplate(template); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              width: "100%", marginTop: 12, padding: "8px 0", borderRadius: 10,
              border: "1px dashed rgba(236,72,153,0.25)",
              background: "rgba(236,72,153,0.04)",
              color: "#EC4899",
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.2s ease",
            }}
          >
            <ArrowRight size={12} strokeWidth={2.5} />
            Use Template
          </button>
        )}
      </GlassCard>
    </div>
  );
}

function InspirationTip({ tip, index }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
      borderBottom: "1px solid var(--dp-header-border)",
      animation: "dpFadeScale 0.35s ease-out both",
      animationDelay: (index * 60 + 400) + "ms",
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(252,211,77,0.12)",
        border: "1px solid rgba(252,211,77,0.2)",
      }}>
        <Lightbulb size={13} color="#FCD34D" strokeWidth={2} />
      </div>
      <p style={{
        fontSize: 12, color: "var(--dp-text-secondary)", lineHeight: 1.55,
        margin: 0, flex: 1,
      }}>
        {tip}
      </p>
    </div>
  );
}

function SectionHeader({ icon, title, count, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 20,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: (color || "var(--dp-accent)") + "1a",
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: 14, fontWeight: 700, color: "var(--dp-text)", margin: 0, flex: 1,
      }}>
        {title}
      </h3>
      {count != null && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: "var(--dp-text-muted)",
          background: "var(--dp-pill-bg)", padding: "2px 8px", borderRadius: 8,
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

export default function DreamSimilarityPanel({ open, onClose, data, loading, error, onUseTemplate }) {
  var similarDreams = (data && data.similar_dreams) || [];
  var relatedTemplates = (data && data.related_templates) || [];
  var inspirationTips = (data && data.inspiration_tips) || [];

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      variant="center"
      title="Dream Inspiration"
      maxWidth={460}
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
              background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))",
              border: "1px solid rgba(139,92,246,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "dpSimilarPulse 1.5s ease-in-out infinite",
            }}>
              <Compass size={26} color="#8B5CF6" strokeWidth={2} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{
                fontSize: 14, fontWeight: 600, color: "var(--dp-text)",
                margin: "0 0 4px",
              }}>
                Finding similar dreams...
              </p>
              <p style={{
                fontSize: 12, color: "var(--dp-text-muted)", margin: 0,
              }}>
                Searching public dreams and templates for inspiration
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "40px 16px", gap: 12,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Target size={22} color="#EF4444" strokeWidth={2} />
            </div>
            <p style={{
              fontSize: 13, color: "var(--dp-text-secondary)", textAlign: "center",
              lineHeight: 1.5, margin: 0,
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && data && (
          <div>
            {/* Similar Dreams */}
            {similarDreams.length > 0 && (
              <div>
                <SectionHeader
                  icon={<Compass size={14} color="#8B5CF6" strokeWidth={2.5} />}
                  title="Similar Dreams"
                  count={similarDreams.length}
                  color="#8B5CF6"
                />
                {similarDreams.map(function (dream, i) {
                  return <SimilarDreamCard key={dream.dream_id || i} dream={dream} index={i} />;
                })}
              </div>
            )}

            {/* Related Templates */}
            {relatedTemplates.length > 0 && (
              <div>
                <SectionHeader
                  icon={<Layers size={14} color="#EC4899" strokeWidth={2.5} />}
                  title="Related Templates"
                  count={relatedTemplates.length}
                  color="#EC4899"
                />
                {relatedTemplates.map(function (template, i) {
                  return (
                    <TemplateCard
                      key={template.template_id || i}
                      template={template}
                      index={i}
                      onUseTemplate={onUseTemplate}
                    />
                  );
                })}
              </div>
            )}

            {/* Inspiration Tips */}
            {inspirationTips.length > 0 && (
              <div>
                <SectionHeader
                  icon={<Lightbulb size={14} color="#FCD34D" strokeWidth={2.5} />}
                  title="Inspiration Tips"
                  count={inspirationTips.length}
                  color="#FCD34D"
                />
                <div style={{ padding: "0 2px" }}>
                  {inspirationTips.map(function (tip, i) {
                    return <InspirationTip key={i} tip={tip} index={i} />;
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {similarDreams.length === 0 && relatedTemplates.length === 0 && inspirationTips.length === 0 && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "40px 16px", gap: 12,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Compass size={22} color="#8B5CF6" strokeWidth={2} />
                </div>
                <p style={{
                  fontSize: 13, color: "var(--dp-text-secondary)", textAlign: "center",
                  lineHeight: 1.5, margin: 0,
                }}>
                  No similar dreams or templates found yet. As more users share their dreams publicly, you will see more inspiration here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes dpSimilarPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.8; }
        }
      `}</style>
    </GlassModal>
  );
}
