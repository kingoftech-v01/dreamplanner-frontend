import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { apiGet } from "../../services/api";
import { USERS } from "../../services/endpoints";
import GlassModal from "./GlassModal";
import GlassCard from "./GlassCard";
import {
  Trophy, TrendingUp, TrendingDown, Minus,
  CheckCircle2, Clock, Flame, Zap, Star,
  Target, ArrowUp, ArrowDown, Lightbulb,
  Quote, BarChart3, X,
} from "lucide-react";

/* =====================================================================
 * WeeklyReportPanel
 *
 * A GlassModal that shows a comprehensive weekly progress report with:
 *  1. Header with score circle (0-100)
 *  2. Stats row with comparison arrows
 *  3. Achievements section with trophy icons
 *  4. Trends section with directional arrows and insights
 *  5. Recommendations section with numbered action items
 *  6. Encouragement quote at the bottom
 * =================================================================== */

// ── Score circle color thresholds ──
function scoreColor(score) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#3B82F6";
  return "#EF4444";
}

function scoreLabel(score) {
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "Great";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Getting Started";
  return "Fresh Start";
}

// ── Direction arrow component ──
function DirectionArrow({ direction, size }) {
  var s = size || 14;
  if (direction === "up") return <ArrowUp size={s} color="#10B981" strokeWidth={2.5} />;
  if (direction === "down") return <ArrowDown size={s} color="#EF4444" strokeWidth={2.5} />;
  return <Minus size={s} color="var(--dp-text-muted)" strokeWidth={2.5} />;
}

// ── Trend icon ──
function TrendIcon({ direction, size }) {
  var s = size || 16;
  if (direction === "up") return <TrendingUp size={s} color="#10B981" strokeWidth={2} />;
  if (direction === "down") return <TrendingDown size={s} color="#EF4444" strokeWidth={2} />;
  return <Minus size={s} color="var(--dp-text-muted)" strokeWidth={2} />;
}

// ── Score circle SVG ──
function ScoreCircle({ score, size }) {
  var s = size || 100;
  var strokeW = 6;
  var radius = (s - strokeW) / 2;
  var circumference = 2 * Math.PI * radius;
  var offset = circumference - (score / 100) * circumference;
  var color = scoreColor(score);

  return (
    <div style={{ position: "relative", width: s, height: s }}>
      <svg width={s} height={s} style={{ transform: "rotate(-90deg)" }}>
        {/* Background circle */}
        <circle
          cx={s / 2} cy={s / 2} r={radius}
          fill="none"
          stroke="var(--dp-glass-border)"
          strokeWidth={strokeW}
        />
        {/* Progress arc */}
        <circle
          cx={s / 2} cy={s / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
            filter: "drop-shadow(0 0 8px " + color + "40)",
          }}
        />
      </svg>
      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: s * 0.28, fontWeight: 800, color: color,
          lineHeight: 1, letterSpacing: "-1px",
        }}>
          {score}
        </span>
        <span style={{
          fontSize: s * 0.1, fontWeight: 600,
          color: "var(--dp-text-muted)", marginTop: 2,
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ── Loading state with animated progress bar ──
function LoadingState() {
  return (
    <div style={{
      padding: "40px 20px", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 20,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(139,92,246,0.08)",
        border: "1px solid rgba(139,92,246,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <BarChart3 size={32} color="var(--dp-accent)" strokeWidth={1.5} style={{
          animation: "dpWrPulse 2s ease-in-out infinite",
        }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 16, fontWeight: 700, color: "var(--dp-text)",
          marginBottom: 6,
        }}>
          Analyzing Your Week...
        </div>
        <div style={{
          fontSize: 13, color: "var(--dp-text-muted)",
        }}>
          AI is reviewing your activity and generating insights
        </div>
      </div>
      {/* Animated progress bar */}
      <div style={{
        width: "80%", height: 4, borderRadius: 2,
        background: "var(--dp-glass-border)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: "linear-gradient(90deg, #8B5CF6, #EC4899, #8B5CF6)",
          backgroundSize: "200% 100%",
          animation: "dpWrSlide 1.5s ease-in-out infinite",
        }} />
      </div>
    </div>
  );
}

export default function WeeklyReportPanel({ open, onClose }) {
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var [mounted, setMounted] = useState(false);

  useEffect(function () {
    if (open) {
      setMounted(false);
      var t = setTimeout(function () { setMounted(true); }, 100);
      return function () { clearTimeout(t); };
    }
  }, [open]);

  var reportQuery = useQuery({
    queryKey: ["weekly-report"],
    queryFn: function () { return apiGet(USERS.WEEKLY_REPORT); },
    enabled: open,
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });

  var data = reportQuery.data;
  var stats = (data && data.stats) || {};
  var comparisons = (data && data.comparisons) || {};
  var ai = (data && data.aiReport) || {};
  var score = ai.score || 0;

  // Format focus time
  var focusHrs = Math.floor((stats.focusMinutes || 0) / 60);
  var focusMins = (stats.focusMinutes || 0) % 60;
  var focusStr = focusHrs > 0
    ? focusHrs + "h" + (focusMins > 0 ? " " + focusMins + "m" : "")
    : (focusMins || 0) + "m";

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      maxWidth={480}
    >
      {/* Custom header (no title prop — we build our own) */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid var(--dp-divider)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BarChart3 size={18} color="var(--dp-accent)" strokeWidth={2} />
          </div>
          <h2 style={{
            fontSize: 16, fontWeight: 700, color: "var(--dp-text)", margin: 0,
          }}>
            Your Week in Review
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--dp-surface)",
            border: "1px solid var(--dp-input-border)",
            color: "var(--dp-text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.2s",
          }}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {reportQuery.isLoading && <LoadingState />}

        {reportQuery.isError && (
          <div style={{
            padding: "40px 20px", textAlign: "center",
          }}>
            <div style={{
              fontSize: 15, fontWeight: 600, color: "var(--dp-danger)",
              marginBottom: 8,
            }}>
              Unable to load report
            </div>
            <div style={{
              fontSize: 13, color: "var(--dp-text-muted)", marginBottom: 16,
            }}>
              {(reportQuery.error && (reportQuery.error.userMessage || reportQuery.error.message)) || "Something went wrong"}
            </div>
            <button
              onClick={function () { reportQuery.refetch(); }}
              style={{
                padding: "8px 20px", borderRadius: 10,
                background: "var(--dp-accent-soft)",
                border: "1px solid var(--dp-accent-border)",
                color: "var(--dp-accent)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {data && !reportQuery.isLoading && (
          <div style={{ padding: "20px" }}>

            {/* ══ SCORE CIRCLE ══ */}
            <div
              className={mounted ? "dp-wr-fade-in" : ""}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                marginBottom: 24, animationDelay: "0ms",
              }}
            >
              <ScoreCircle score={score} size={120} />
              {data.weekStart && data.weekEnd && (
                <div style={{
                  fontSize: 12, color: "var(--dp-text-muted)", marginTop: 10,
                  fontWeight: 500,
                }}>
                  {data.weekStart} to {data.weekEnd}
                </div>
              )}
            </div>

            {/* ══ AI SUMMARY ══ */}
            {ai.summary && (
              <div
                className={mounted ? "dp-wr-fade-in" : ""}
                style={{
                  fontSize: 14, color: "var(--dp-text-secondary)",
                  lineHeight: 1.6, textAlign: "center",
                  marginBottom: 24, padding: "0 8px",
                  animationDelay: "80ms",
                }}
              >
                {ai.summary}
              </div>
            )}

            {/* ══ STATS ROW ══ */}
            <div
              className={mounted ? "dp-wr-fade-in" : ""}
              style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 10, marginBottom: 24,
                animationDelay: "160ms",
              }}
            >
              {/* Tasks */}
              <div style={{
                padding: "14px 12px", borderRadius: 14,
                background: isLight ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.12)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(16,185,129,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <CheckCircle2 size={16} color="#10B981" strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                      fontSize: 18, fontWeight: 800, color: "var(--dp-text)",
                      lineHeight: 1,
                    }}>
                      {stats.tasksCompleted || 0}
                    </span>
                    {comparisons.tasksCompleted && (
                      <DirectionArrow direction={comparisons.tasksCompleted.direction} size={12} />
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--dp-text-muted)", fontWeight: 500 }}>
                    Tasks Done
                  </span>
                </div>
              </div>

              {/* Focus Hours */}
              <div style={{
                padding: "14px 12px", borderRadius: 14,
                background: isLight ? "rgba(59,130,246,0.05)" : "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.12)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(59,130,246,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Clock size={16} color="#3B82F6" strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                      fontSize: 18, fontWeight: 800, color: "var(--dp-text)",
                      lineHeight: 1,
                    }}>
                      {focusStr}
                    </span>
                    {comparisons.focusMinutes && (
                      <DirectionArrow direction={comparisons.focusMinutes.direction} size={12} />
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--dp-text-muted)", fontWeight: 500 }}>
                    Focus Time
                  </span>
                </div>
              </div>

              {/* Streak */}
              <div style={{
                padding: "14px 12px", borderRadius: 14,
                background: isLight ? "rgba(249,115,22,0.05)" : "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.12)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(249,115,22,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Flame size={16} color="#F97316" strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                      fontSize: 18, fontWeight: 800, color: "var(--dp-text)",
                      lineHeight: 1,
                    }}>
                      {stats.streakDays || 0}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--dp-text-muted)", fontWeight: 500 }}>
                    Day Streak
                  </span>
                </div>
              </div>

              {/* Dreams Progressed */}
              <div style={{
                padding: "14px 12px", borderRadius: 14,
                background: isLight ? "rgba(139,92,246,0.05)" : "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.12)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(139,92,246,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Target size={16} color="#8B5CF6" strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                      fontSize: 18, fontWeight: 800, color: "var(--dp-text)",
                      lineHeight: 1,
                    }}>
                      {stats.dreamsProgressed || 0}
                    </span>
                    {comparisons.dreamsProgressed && (
                      <DirectionArrow direction={comparisons.dreamsProgressed.direction} size={12} />
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--dp-text-muted)", fontWeight: 500 }}>
                    Dreams Active
                  </span>
                </div>
              </div>
            </div>

            {/* ══ ACHIEVEMENTS ══ */}
            {ai.achievements && ai.achievements.length > 0 && (
              <div
                className={mounted ? "dp-wr-fade-in" : ""}
                style={{ marginBottom: 24, animationDelay: "240ms" }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                  marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Trophy size={14} color="#F59E0B" strokeWidth={2.5} />
                  Achievements
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ai.achievements.map(function (achievement, idx) {
                    return (
                      <div key={idx} style={{
                        padding: "10px 14px", borderRadius: 12,
                        background: isLight ? "rgba(245,158,11,0.05)" : "rgba(245,158,11,0.06)",
                        border: "1px solid rgba(245,158,11,0.10)",
                        display: "flex", alignItems: "flex-start", gap: 10,
                      }}>
                        <Trophy
                          size={14}
                          color="#F59E0B"
                          strokeWidth={2}
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        <span style={{
                          fontSize: 13, fontWeight: 500, color: "var(--dp-text)",
                          lineHeight: 1.5,
                        }}>
                          {achievement}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ TRENDS ══ */}
            {ai.trends && ai.trends.length > 0 && (
              <div
                className={mounted ? "dp-wr-fade-in" : ""}
                style={{ marginBottom: 24, animationDelay: "320ms" }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                  marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <TrendingUp size={14} color="#3B82F6" strokeWidth={2.5} />
                  Trends
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ai.trends.map(function (trend, idx) {
                    return (
                      <div key={idx} style={{
                        padding: "10px 14px", borderRadius: 12,
                        background: isLight ? "rgba(59,130,246,0.04)" : "rgba(59,130,246,0.06)",
                        border: "1px solid rgba(59,130,246,0.08)",
                        display: "flex", alignItems: "flex-start", gap: 10,
                      }}>
                        <TrendIcon
                          direction={trend.direction}
                          size={16}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                            marginBottom: 2,
                          }}>
                            {trend.metric}
                          </div>
                          <div style={{
                            fontSize: 12, color: "var(--dp-text-muted)", lineHeight: 1.5,
                          }}>
                            {trend.insight}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ RECOMMENDATIONS ══ */}
            {ai.recommendations && ai.recommendations.length > 0 && (
              <div
                className={mounted ? "dp-wr-fade-in" : ""}
                style={{ marginBottom: 24, animationDelay: "400ms" }}
              >
                <div style={{
                  fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                  marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Lightbulb size={14} color="#14B8A6" strokeWidth={2.5} />
                  Recommendations for Next Week
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ai.recommendations.map(function (rec, idx) {
                    return (
                      <div key={idx} style={{
                        padding: "10px 14px", borderRadius: 12,
                        background: isLight ? "rgba(20,184,166,0.04)" : "rgba(20,184,166,0.06)",
                        border: "1px solid rgba(20,184,166,0.08)",
                        display: "flex", alignItems: "flex-start", gap: 10,
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 7,
                          background: "rgba(20,184,166,0.12)",
                          border: "1px solid rgba(20,184,166,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 1,
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: "#14B8A6",
                          }}>
                            {idx + 1}
                          </span>
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 500, color: "var(--dp-text)",
                          lineHeight: 1.5,
                        }}>
                          {rec}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ ENCOURAGEMENT ══ */}
            {ai.encouragement && (
              <div
                className={mounted ? "dp-wr-fade-in" : ""}
                style={{
                  padding: "16px", borderRadius: 14,
                  background: isLight ? "rgba(139,92,246,0.04)" : "rgba(139,92,246,0.06)",
                  border: "1px solid rgba(139,92,246,0.10)",
                  animationDelay: "480ms",
                }}
              >
                <Quote
                  size={16}
                  color="rgba(139,92,246,0.3)"
                  strokeWidth={2}
                  style={{ marginBottom: 8 }}
                />
                <p style={{
                  fontSize: 14, fontWeight: 500, fontStyle: "italic",
                  color: "var(--dp-text-secondary)", lineHeight: 1.7,
                  margin: 0,
                }}>
                  {ai.encouragement}
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ══ KEYFRAME ANIMATIONS ══ */}
      <style>{
        "@keyframes dpWrFadeIn {" +
          "from { opacity: 0; transform: translateY(10px); }" +
          "to { opacity: 1; transform: translateY(0); }" +
        "}" +
        ".dp-wr-fade-in {" +
          "animation: dpWrFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;" +
        "}" +
        "@keyframes dpWrPulse {" +
          "0%, 100% { opacity: 1; transform: scale(1); }" +
          "50% { opacity: 0.5; transform: scale(0.95); }" +
        "}" +
        "@keyframes dpWrSlide {" +
          "0% { background-position: 200% 0; }" +
          "100% { background-position: -200% 0; }" +
        "}"
      }</style>
    </GlassModal>
  );
}
