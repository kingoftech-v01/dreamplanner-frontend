import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { apiGet } from "../../services/api";
import { USERS } from "../../services/endpoints";
import GlassModal from "./GlassModal";
import GlassCard from "./GlassCard";
import {
  TrendingUp, TrendingDown, Minus, X,
  Zap, Flame, Clock, CheckCircle2,
  ArrowUp, ArrowDown, Lightbulb,
  BarChart3, Calendar, Star, Sun,
  Activity, Target, Award,
} from "lucide-react";

/* =====================================================================
 * ProductivityInsightsPanel
 *
 * A GlassModal with comprehensive productivity data visualization:
 *  1. Overall score circle (0-100)
 *  2. 30-day activity chart (SVG bar chart)
 *  3. Day-of-week pattern chart (Mon-Sun average bars)
 *  4. Trends section with arrows and percentage changes
 *  5. Peak Days with highlighted best days
 *  6. Productivity Patterns with AI recommendations
 *  7. Monthly Comparison (improved vs declined vs stable)
 * =================================================================== */

// ── Score circle color thresholds ──
function scoreColor(score) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#3B82F6";
  return "#EF4444";
}

function scoreLabel(score) {
  if (score >= 90) return "Exceptional";
  if (score >= 80) return "Great";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Getting Started";
  return "Fresh Start";
}

// ── Score circle SVG ──
function ScoreCircle({ score, size }) {
  var s = size || 120;
  var strokeW = 7;
  var radius = (s - strokeW) / 2;
  var circumference = 2 * Math.PI * radius;
  var offset = circumference - (score / 100) * circumference;
  var color = scoreColor(score);

  return (
    <div style={{ position: "relative", width: s, height: s }}>
      <svg width={s} height={s} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={s / 2} cy={s / 2} r={radius}
          fill="none"
          stroke="var(--dp-glass-border)"
          strokeWidth={strokeW}
        />
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
          fontSize: s * 0.09, fontWeight: 600,
          color: "var(--dp-text-muted)", marginTop: 2,
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ── Direction arrow ──
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

// ── 30-day SVG bar chart ──
function ActivityBarChart({ dailyActivity, mounted }) {
  if (!dailyActivity || dailyActivity.length === 0) return null;

  var chartW = 400;
  var chartH = 100;
  var barGap = 2;
  var barW = Math.max(2, (chartW - barGap * dailyActivity.length) / dailyActivity.length);
  var maxTasks = Math.max.apply(null, dailyActivity.map(function (d) { return d.tasks_completed || 0; }));
  if (maxTasks === 0) maxTasks = 1;

  return (
    <div style={{ width: "100%", overflowX: "auto", overflowY: "hidden" }}>
      <svg
        viewBox={"0 0 " + chartW + " " + (chartH + 20)}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="piBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {dailyActivity.map(function (d, i) {
          var val = d.tasks_completed || 0;
          var h = (val / maxTasks) * chartH;
          var x = i * (barW + barGap);
          var y = chartH - h;

          return (
            <g key={i}>
              <rect
                x={x} y={mounted ? y : chartH}
                width={barW} height={mounted ? h : 0}
                rx={Math.min(barW / 2, 3)}
                fill="url(#piBarGrad)"
                opacity={val > 0 ? 0.85 : 0.15}
                style={{
                  transition: "y 0.8s cubic-bezier(0.16,1,0.3,1) " + (i * 15) + "ms, height 0.8s cubic-bezier(0.16,1,0.3,1) " + (i * 15) + "ms",
                }}
              />
              {/* Show date label every 5 days */}
              {i % 5 === 0 && (
                <text
                  x={x + barW / 2}
                  y={chartH + 14}
                  textAnchor="middle"
                  fill="var(--dp-text-muted)"
                  fontSize="8"
                  fontFamily="inherit"
                >
                  {d.date ? d.date.slice(5) : ""}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Day-of-week average bar chart ──
function DayOfWeekChart({ dayStats, mounted }) {
  if (!dayStats || dayStats.length === 0) return null;

  var dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var sorted = dayOrder.map(function (name) {
    var found = dayStats.find(function (d) { return d.day === name; });
    return found || { day: name, avg_tasks: 0, avg_minutes: 0 };
  });

  var maxAvg = Math.max.apply(null, sorted.map(function (d) { return d.avg_tasks || 0; }));
  if (maxAvg === 0) maxAvg = 1;
  var barW = 36;
  var chartH = 70;

  return (
    <div style={{
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      gap: 4, width: "100%", height: chartH + 24,
    }}>
      {sorted.map(function (d, i) {
        var h = Math.max(4, (d.avg_tasks / maxAvg) * chartH);
        var isTopDay = d.avg_tasks === maxAvg && maxAvg > 0;
        return (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            flex: 1,
          }}>
            <div style={{
              width: "100%", maxWidth: barW,
              height: mounted ? h : 4,
              borderRadius: "4px 4px 2px 2px",
              background: isTopDay
                ? "linear-gradient(180deg, #10B981, #059669)"
                : "linear-gradient(180deg, #8B5CF680, #6D28D940)",
              transition: "height 0.8s cubic-bezier(0.16,1,0.3,1) " + (i * 60) + "ms",
              boxShadow: isTopDay ? "0 0 10px rgba(16,185,129,0.3)" : "none",
            }} />
            <span style={{
              fontSize: 10, fontWeight: isTopDay ? 700 : 500,
              color: isTopDay ? "#10B981" : "var(--dp-text-muted)",
              marginTop: 6,
            }}>
              {d.day.slice(0, 3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Loading state ──
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
        <Activity size={32} color="var(--dp-accent)" strokeWidth={1.5} style={{
          animation: "dpPiPulse 2s ease-in-out infinite",
        }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 16, fontWeight: 700, color: "var(--dp-text)",
          marginBottom: 6,
        }}>
          Analyzing Your Productivity...
        </div>
        <div style={{
          fontSize: 13, color: "var(--dp-text-muted)",
        }}>
          AI is reviewing 30 days of activity data
        </div>
      </div>
      <div style={{
        width: "80%", height: 4, borderRadius: 2,
        background: "var(--dp-glass-border)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: "linear-gradient(90deg, #8B5CF6, #10B981, #8B5CF6)",
          backgroundSize: "200% 100%",
          animation: "dpPiSlide 1.5s ease-in-out infinite",
        }} />
      </div>
    </div>
  );
}

export default function ProductivityInsightsPanel({ open, onClose }) {
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

  var insightsQuery = useQuery({
    queryKey: ["productivity-insights"],
    queryFn: function () { return apiGet(USERS.PRODUCTIVITY_INSIGHTS); },
    enabled: open,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  var data = insightsQuery.data;
  var ai = (data && data.ai_insights) || {};
  var score = ai.overall_score || 0;
  var dailyActivity = (data && data.daily_activity) || [];
  var dayOfWeekStats = (data && data.day_of_week_stats) || [];
  var totals = (data && data.totals) || {};
  var period = (data && data.period) || {};
  var trends = ai.trends || [];
  var peakDays = ai.peak_days || [];
  var patterns = ai.productivity_patterns || [];
  var comparison = ai.monthly_comparison || {};

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      maxWidth={500}
    >
      {/* Custom header */}
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
            <Activity size={18} color="var(--dp-accent)" strokeWidth={2} />
          </div>
          <h2 style={{
            fontSize: 16, fontWeight: 700, color: "var(--dp-text)", margin: 0,
          }}>
            Productivity Insights
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
        {insightsQuery.isLoading && <LoadingState />}

        {insightsQuery.isError && (
          <div style={{
            padding: "40px 20px", textAlign: "center",
          }}>
            <div style={{
              fontSize: 15, fontWeight: 600, color: "var(--dp-danger)",
              marginBottom: 8,
            }}>
              Unable to load insights
            </div>
            <div style={{
              fontSize: 13, color: "var(--dp-text-muted)", marginBottom: 16,
            }}>
              {(insightsQuery.error && (insightsQuery.error.userMessage || insightsQuery.error.message)) || "Something went wrong"}
            </div>
            <button
              onClick={function () { insightsQuery.refetch(); }}
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

        {data && !insightsQuery.isLoading && (
          <div style={{ padding: "20px" }}>

            {/* ══ SCORE CIRCLE ══ */}
            <div
              className={mounted ? "dp-pi-fade-in" : ""}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                marginBottom: 20, animationDelay: "0ms",
              }}
            >
              <ScoreCircle score={score} size={120} />
              {ai.summary && (
                <div style={{
                  fontSize: 13, color: "var(--dp-text-secondary)",
                  lineHeight: 1.6, textAlign: "center",
                  marginTop: 12, padding: "0 8px", maxWidth: 380,
                }}>
                  {ai.summary}
                </div>
              )}
              {period.start && period.end && (
                <div style={{
                  fontSize: 11, color: "var(--dp-text-muted)", marginTop: 8,
                  fontWeight: 500,
                }}>
                  {period.start} to {period.end}
                </div>
              )}
            </div>

            {/* ══ TOTALS STATS ROW ══ */}
            <div
              className={mounted ? "dp-pi-fade-in" : ""}
              style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8, marginBottom: 20, animationDelay: "80ms",
              }}
            >
              {[
                { icon: CheckCircle2, label: "Tasks Done", value: totals.tasks_completed || 0, color: "#10B981" },
                { icon: Clock, label: "Focus Time", value: (function () { var m = totals.minutes_active || 0; var h = Math.floor(m / 60); return h > 0 ? h + "h " + (m % 60) + "m" : m + "m"; })(), color: "#8B5CF6" },
                { icon: Zap, label: "XP Earned", value: totals.xp_earned || 0, color: "#F59E0B" },
              ].map(function (stat, i) {
                return (
                  <GlassCard key={i} padding="12px 8px" style={{ textAlign: "center" }}>
                    <stat.icon size={18} color={stat.color} strokeWidth={2} style={{ marginBottom: 6 }} />
                    <div style={{
                      fontSize: 18, fontWeight: 800, color: "var(--dp-text)",
                      lineHeight: 1.2,
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 500, color: "var(--dp-text-muted)",
                      marginTop: 2,
                    }}>
                      {stat.label}
                    </div>
                  </GlassCard>
                );
              })}
            </div>

            {/* ══ 30-DAY ACTIVITY CHART ══ */}
            {dailyActivity.length > 0 && (
              <div
                className={mounted ? "dp-pi-fade-in" : ""}
                style={{ marginBottom: 20, animationDelay: "160ms" }}
              >
                <GlassCard padding="16px">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <BarChart3 size={15} color="#8B5CF6" strokeWidth={2} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>
                      30-Day Activity
                    </span>
                    <span style={{
                      fontSize: 11, color: "var(--dp-text-muted)", marginLeft: "auto",
                    }}>
                      Avg {totals.avg_tasks_per_day || 0} tasks/day
                    </span>
                  </div>
                  <ActivityBarChart dailyActivity={dailyActivity} mounted={mounted} />
                </GlassCard>
              </div>
            )}

            {/* ══ DAY-OF-WEEK PATTERN ══ */}
            {dayOfWeekStats.length > 0 && (
              <div
                className={mounted ? "dp-pi-fade-in" : ""}
                style={{ marginBottom: 20, animationDelay: "240ms" }}
              >
                <GlassCard padding="16px">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Calendar size={15} color="#14B8A6" strokeWidth={2} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>
                      Weekly Pattern
                    </span>
                  </div>
                  <DayOfWeekChart dayStats={dayOfWeekStats} mounted={mounted} />
                </GlassCard>
              </div>
            )}

            {/* ══ TRENDS ══ */}
            {trends.length > 0 && (
              <div
                className={mounted ? "dp-pi-fade-in" : ""}
                style={{ marginBottom: 20, animationDelay: "320ms" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <TrendingUp size={15} color="#8B5CF6" strokeWidth={2} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>
                    Trends
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {trends.map(function (trend, i) {
                    var dirColor = trend.direction === "up" ? "#10B981"
                      : trend.direction === "down" ? "#EF4444" : "var(--dp-text-muted)";
                    var bgColor = trend.direction === "up" ? "rgba(16,185,129,0.08)"
                      : trend.direction === "down" ? "rgba(239,68,68,0.08)" : "var(--dp-surface)";
                    return (
                      <GlassCard key={i} padding="12px 14px">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <TrendIcon direction={trend.direction} size={18} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>
                                {trend.metric}
                              </span>
                              <span style={{
                                fontSize: 11, fontWeight: 700, color: dirColor,
                                padding: "1px 6px", borderRadius: 6,
                                background: bgColor,
                              }}>
                                {trend.direction === "up" ? "+" : trend.direction === "down" ? "" : ""}{trend.change_pct}%
                              </span>
                            </div>
                            {trend.insight && (
                              <div style={{
                                fontSize: 12, color: "var(--dp-text-muted)",
                                marginTop: 3, lineHeight: 1.4,
                              }}>
                                {trend.insight}
                              </div>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ PEAK DAYS ══ */}
            {peakDays.length > 0 && (
              <div
                className={mounted ? "dp-pi-fade-in" : ""}
                style={{ marginBottom: 20, animationDelay: "400ms" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Star size={15} color="#F59E0B" strokeWidth={2} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>
                    Peak Performance Days
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {peakDays.map(function (peak, i) {
                    return (
                      <GlassCard key={i} padding="10px 14px" style={{
                        flex: "1 1 auto", minWidth: 140,
                        border: "1px solid rgba(245,158,11,0.2)",
                        background: "rgba(245,158,11,0.04)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <Sun size={14} color="#F59E0B" strokeWidth={2} />
                          <span style={{
                            fontSize: 13, fontWeight: 700, color: "#F59E0B",
                          }}>
                            {peak.day_of_week}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 12, color: "var(--dp-text-secondary)",
                          lineHeight: 1.4,
                        }}>
                          {peak.reason}
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ PRODUCTIVITY PATTERNS ══ */}
            {patterns.length > 0 && (
              <div
                className={mounted ? "dp-pi-fade-in" : ""}
                style={{ marginBottom: 20, animationDelay: "480ms" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Lightbulb size={15} color="#EC4899" strokeWidth={2} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>
                    AI-Identified Patterns
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {patterns.map(function (pat, i) {
                    return (
                      <GlassCard key={i} padding="14px">
                        <div style={{
                          fontSize: 13, fontWeight: 700, color: "var(--dp-text)",
                          marginBottom: 6,
                        }}>
                          {pat.pattern}
                        </div>
                        <div style={{
                          fontSize: 12, color: "var(--dp-text-secondary)",
                          lineHeight: 1.5, marginBottom: 10,
                        }}>
                          {pat.description}
                        </div>
                        <div style={{
                          padding: "8px 12px", borderRadius: 10,
                          background: "rgba(139,92,246,0.06)",
                          border: "1px solid rgba(139,92,246,0.12)",
                          display: "flex", alignItems: "flex-start", gap: 8,
                        }}>
                          <Target size={14} color="#8B5CF6" strokeWidth={2} style={{ marginTop: 1, flexShrink: 0 }} />
                          <div style={{
                            fontSize: 12, color: "var(--dp-accent)",
                            lineHeight: 1.5, fontWeight: 500,
                          }}>
                            {pat.recommendation}
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ MONTHLY COMPARISON ══ */}
            {(comparison.improved && comparison.improved.length > 0) ||
             (comparison.declined && comparison.declined.length > 0) ||
             (comparison.stable && comparison.stable.length > 0) ? (
              <div
                className={mounted ? "dp-pi-fade-in" : ""}
                style={{ marginBottom: 10, animationDelay: "560ms" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Award size={15} color="#6366F1" strokeWidth={2} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>
                    Monthly Comparison
                  </span>
                </div>
                <GlassCard padding="14px">
                  {/* Improved */}
                  {comparison.improved && comparison.improved.length > 0 && (
                    <div style={{ marginBottom: comparison.declined && comparison.declined.length > 0 ? 12 : 0 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginBottom: 6,
                      }}>
                        <ArrowUp size={13} color="#10B981" strokeWidth={2.5} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>
                          Improved
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 20 }}>
                        {comparison.improved.map(function (item, i) {
                          return (
                            <span key={i} style={{
                              padding: "3px 10px", borderRadius: 8,
                              background: "rgba(16,185,129,0.08)",
                              border: "1px solid rgba(16,185,129,0.15)",
                              fontSize: 12, fontWeight: 500, color: "#10B981",
                            }}>
                              {item}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Declined */}
                  {comparison.declined && comparison.declined.length > 0 && (
                    <div style={{ marginBottom: comparison.stable && comparison.stable.length > 0 ? 12 : 0 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginBottom: 6,
                      }}>
                        <ArrowDown size={13} color="#EF4444" strokeWidth={2.5} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}>
                          Needs Attention
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 20 }}>
                        {comparison.declined.map(function (item, i) {
                          return (
                            <span key={i} style={{
                              padding: "3px 10px", borderRadius: 8,
                              background: "rgba(239,68,68,0.08)",
                              border: "1px solid rgba(239,68,68,0.15)",
                              fontSize: 12, fontWeight: 500, color: "#EF4444",
                            }}>
                              {item}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stable */}
                  {comparison.stable && comparison.stable.length > 0 && (
                    <div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginBottom: 6,
                      }}>
                        <Minus size={13} color="var(--dp-text-muted)" strokeWidth={2.5} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-muted)" }}>
                          Stable
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 20 }}>
                        {comparison.stable.map(function (item, i) {
                          return (
                            <span key={i} style={{
                              padding: "3px 10px", borderRadius: 8,
                              background: "var(--dp-surface)",
                              border: "1px solid var(--dp-glass-border)",
                              fontSize: 12, fontWeight: 500, color: "var(--dp-text-muted)",
                            }}>
                              {item}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </GlassCard>
              </div>
            ) : null}

          </div>
        )}
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes dpPiPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes dpPiSlide {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .dp-pi-fade-in {
          animation: dpPiFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes dpPiFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </GlassModal>
  );
}
