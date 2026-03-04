import { useState } from "react";
import { Brain, Lightbulb, Link, AlertTriangle, RefreshCw } from "lucide-react";
import { apiGet } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import GlassModal from "./GlassModal";
import GlassCard from "./GlassCard";

var PATTERN_TYPE_COLORS = {
  theme: "#8B5CF6",
  behavior: "#EC4899",
  resource: "#14B8A6",
  timing: "#F59E0B",
};

var PATTERN_TYPE_LABELS = {
  theme: "Theme",
  behavior: "Behavior",
  resource: "Resource",
  timing: "Timing",
};

function PulseLoader() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 20px", gap: 20,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))",
        border: "1px solid rgba(139,92,246,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "dpSmartPulse 2s ease-in-out infinite",
      }}>
        <Brain size={32} color="var(--dp-accent)" strokeWidth={1.5} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 16, fontWeight: 600, color: "var(--dp-text)",
          marginBottom: 6,
        }}>Analyzing your dreams...</div>
        <div style={{
          fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5,
        }}>AI is finding patterns and connections across all your dreams</div>
      </div>
      <style>{"\n        @keyframes dpSmartPulse {\n          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(139,92,246,0.3); }\n          50% { transform: scale(1.08); opacity: 0.85; box-shadow: 0 0 30px 10px rgba(139,92,246,0.15); }\n        }\n      "}</style>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color, count }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      marginBottom: 14, paddingTop: 8,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 11,
        background: color + "15",
        border: "1px solid " + color + "25",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={18} color={color} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)" }}>{title}</div>
      </div>
      {count > 0 && (
        <span style={{
          padding: "2px 9px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: color + "15", color: color,
        }}>{count}</span>
      )}
    </div>
  );
}

function PatternCard({ pattern }) {
  var color = PATTERN_TYPE_COLORS[pattern.type] || "#8B5CF6";
  var label = PATTERN_TYPE_LABELS[pattern.type] || "Pattern";

  return (
    <GlassCard padding={14} mb={10}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{
          padding: "2px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
          background: color + "18", color: color, letterSpacing: "0.3px",
        }}>{label}</span>
      </div>
      <div style={{
        fontSize: 14, color: "var(--dp-text)", lineHeight: 1.55, marginBottom: 10,
      }}>{pattern.description}</div>
      {pattern.dreamsInvolved && pattern.dreamsInvolved.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {pattern.dreamsInvolved.map(function (dream, i) {
            return (
              <span key={i} style={{
                padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                background: "var(--dp-surface)", color: "var(--dp-text-secondary)",
                border: "1px solid var(--dp-glass-border)",
              }}>{dream}</span>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

function InsightCard({ item }) {
  return (
    <GlassCard padding={14} mb={10}>
      <div style={{
        fontSize: 14, color: "var(--dp-text)", lineHeight: 1.55, marginBottom: 10,
      }}>{item.insight}</div>
      <div style={{
        padding: "10px 12px", borderRadius: 10,
        background: "rgba(139,92,246,0.06)",
        border: "1px solid rgba(139,92,246,0.12)",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: "var(--dp-accent)",
          marginBottom: 4, letterSpacing: "0.3px", textTransform: "uppercase",
        }}>Actionable Tip</div>
        <div style={{
          fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5,
        }}>{item.actionableTip}</div>
      </div>
    </GlassCard>
  );
}

function SynergyCard({ synergy }) {
  return (
    <GlassCard padding={14} mb={10}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
        flexWrap: "wrap",
      }}>
        <span style={{
          padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: "rgba(20,184,166,0.1)", color: "#14B8A6",
          border: "1px solid rgba(20,184,166,0.2)",
        }}>{synergy.dream1}</span>
        <Link size={14} color="var(--dp-text-tertiary)" strokeWidth={2} />
        <span style={{
          padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: "rgba(20,184,166,0.1)", color: "#14B8A6",
          border: "1px solid rgba(20,184,166,0.2)",
        }}>{synergy.dream2}</span>
      </div>
      <div style={{
        fontSize: 14, color: "var(--dp-text)", lineHeight: 1.55, marginBottom: 8,
      }}>{synergy.connection}</div>
      <div style={{
        fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5,
        fontStyle: "italic",
      }}>{synergy.suggestion}</div>
    </GlassCard>
  );
}

function RiskCard({ risk }) {
  return (
    <GlassCard padding={14} mb={10}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
      }}>
        <span style={{
          padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: "rgba(239,68,68,0.1)", color: "#EF4444",
          border: "1px solid rgba(239,68,68,0.15)",
        }}>{risk.dream}</span>
      </div>
      <div style={{
        fontSize: 14, color: "var(--dp-text)", lineHeight: 1.55, marginBottom: 10,
      }}>{risk.risk}</div>
      <div style={{
        padding: "10px 12px", borderRadius: 10,
        background: "rgba(16,185,129,0.06)",
        border: "1px solid rgba(16,185,129,0.12)",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: "#10B981",
          marginBottom: 4, letterSpacing: "0.3px", textTransform: "uppercase",
        }}>Mitigation</div>
        <div style={{
          fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5,
        }}>{risk.mitigation}</div>
      </div>
    </GlassCard>
  );
}

export default function SmartAnalysisPanel({ open, onClose }) {
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState(null);
  var [data, setData] = useState(null);

  function fetchAnalysis() {
    setLoading(true);
    setError(null);
    setData(null);
    apiGet(DREAMS.SMART_ANALYSIS).then(function (result) {
      setData(result);
      setLoading(false);
    }).catch(function (err) {
      setError(err.userMessage || err.message || "Failed to run smart analysis");
      setLoading(false);
    });
  }

  // Trigger fetch when panel opens (only if no data yet)
  if (open && !data && !loading && !error) {
    fetchAnalysis();
  }

  function handleClose() {
    onClose();
    // Reset state so next open triggers a fresh fetch
    setTimeout(function () {
      setData(null);
      setError(null);
      setLoading(false);
    }, 300);
  }

  var hasPatterns = data && data.patterns && data.patterns.length > 0;
  var hasInsights = data && data.insights && data.insights.length > 0;
  var hasSynergies = data && data.synergies && data.synergies.length > 0;
  var hasRisks = data && data.riskAreas && data.riskAreas.length > 0;

  return (
    <GlassModal
      open={open}
      onClose={handleClose}
      title="Smart Analysis"
      maxWidth={520}
      style={{ maxHeight: "85vh" }}
    >
      <div style={{ padding: "16px 20px 24px" }}>
        {/* Loading state */}
        {loading && <PulseLoader />}

        {/* Error state */}
        {error && !loading && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "40px 20px", gap: 16, textAlign: "center",
          }}>
            <AlertTriangle size={40} color="var(--dp-danger)" strokeWidth={1.5} />
            <div style={{
              fontSize: 14, color: "var(--dp-text-secondary)", lineHeight: 1.5,
              maxWidth: 300,
            }}>{error}</div>
            <button onClick={fetchAnalysis} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12,
              background: "var(--dp-accent-soft)", border: "1px solid var(--dp-accent-border)",
              color: "var(--dp-accent)", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <RefreshCw size={16} strokeWidth={2} /> Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div>
            {/* Patterns */}
            {hasPatterns && (
              <div style={{ marginBottom: 20 }}>
                <SectionHeader
                  icon={Brain}
                  title="Patterns Found"
                  color="#8B5CF6"
                  count={data.patterns.length}
                />
                {data.patterns.map(function (pattern, i) {
                  return <PatternCard key={i} pattern={pattern} />;
                })}
              </div>
            )}

            {/* Insights */}
            {hasInsights && (
              <div style={{ marginBottom: 20 }}>
                <SectionHeader
                  icon={Lightbulb}
                  title="Key Insights"
                  color="#F59E0B"
                  count={data.insights.length}
                />
                {data.insights.map(function (item, i) {
                  return <InsightCard key={i} item={item} />;
                })}
              </div>
            )}

            {/* Synergies */}
            {hasSynergies && (
              <div style={{ marginBottom: 20 }}>
                <SectionHeader
                  icon={Link}
                  title="Dream Synergies"
                  color="#14B8A6"
                  count={data.synergies.length}
                />
                {data.synergies.map(function (synergy, i) {
                  return <SynergyCard key={i} synergy={synergy} />;
                })}
              </div>
            )}

            {/* Risk Areas */}
            {hasRisks && (
              <div style={{ marginBottom: 8 }}>
                <SectionHeader
                  icon={AlertTriangle}
                  title="Risk Areas"
                  color="#EF4444"
                  count={data.riskAreas.length}
                />
                {data.riskAreas.map(function (risk, i) {
                  return <RiskCard key={i} risk={risk} />;
                })}
              </div>
            )}

            {/* No results at all */}
            {!hasPatterns && !hasInsights && !hasSynergies && !hasRisks && (
              <div style={{
                textAlign: "center", padding: "40px 20px",
                color: "var(--dp-text-secondary)", fontSize: 14,
              }}>
                No patterns found. Add more dreams with goals and tasks for richer analysis.
              </div>
            )}

            {/* Refresh button at bottom */}
            <div style={{ textAlign: "center", paddingTop: 8 }}>
              <button onClick={fetchAnalysis} className="dp-gh" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 12,
                background: "var(--dp-surface)", border: "1px solid var(--dp-glass-border)",
                color: "var(--dp-text-secondary)", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
              }}>
                <RefreshCw size={14} strokeWidth={2} /> Re-analyze
              </button>
            </div>
          </div>
        )}
      </div>
    </GlassModal>
  );
}
