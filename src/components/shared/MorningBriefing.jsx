import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { apiGet } from "../../services/api";
import { USERS } from "../../services/endpoints";
import GlassCard from "./GlassCard";
import {
  Sun, Moon, Sunrise, ChevronDown, ChevronUp,
  Flame, Star, Clock, CheckCircle2, Calendar,
  Target, Zap, Quote, ArrowRight, Sparkles,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * MorningBriefing — Personalized morning briefing dashboard widget.
 *
 * A collapsible card for the home screen that shows:
 *  1. Header: greeting, date, time-of-day icon
 *  2. Today's schedule: compact timeline of tasks + events
 *  3. Streak badge with fire icon
 *  4. Dream spotlight: featured dream with progress bar + next task
 *  5. Yesterday's recap: quick stats
 *  6. Motivational quote
 *  7. Collapse/expand toggle
 * ═══════════════════════════════════════════════════════════════════ */

// ── Time-of-day gradient configs ──
var TIME_THEMES = {
  morning: {
    gradient: "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(249,115,22,0.08) 40%, rgba(239,68,68,0.05) 100%)",
    border: "1px solid rgba(251,191,36,0.18)",
    accentColor: "#F59E0B",
    Icon: Sunrise,
  },
  afternoon: {
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(139,92,246,0.08) 40%, rgba(20,184,166,0.06) 100%)",
    border: "1px solid rgba(59,130,246,0.15)",
    accentColor: "#3B82F6",
    Icon: Sun,
  },
  evening: {
    gradient: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.10) 40%, rgba(30,41,59,0.08) 100%)",
    border: "1px solid rgba(99,102,241,0.18)",
    accentColor: "#818CF8",
    Icon: Moon,
  },
};

// ── Priority color mapping ──
var PRIORITY_COLORS = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

export default function MorningBriefing() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";

  var [expanded, setExpanded] = useState(true);
  var [mounted, setMounted] = useState(false);

  useEffect(function () {
    var t = setTimeout(function () { setMounted(true); }, 60);
    return function () { clearTimeout(t); };
  }, []);

  var briefingQuery = useQuery({
    queryKey: ["morning-briefing"],
    queryFn: function () { return apiGet(USERS.MORNING_BRIEFING); },
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });

  var data = briefingQuery.data;

  // Don't render while loading or on error
  if (briefingQuery.isLoading || briefingQuery.isError || !data) return null;

  var timeOfDay = data.timeOfDay || "morning";
  var theme = TIME_THEMES[timeOfDay] || TIME_THEMES.morning;
  var TimeIcon = theme.Icon;

  // Merge tasks and events into a sorted timeline
  var timeline = [];
  var tasksList = data.tasksToday || [];
  var eventsList = data.eventsToday || [];

  for (var ti = 0; ti < tasksList.length; ti++) {
    var task = tasksList[ti];
    timeline.push({
      type: "task",
      id: task.id,
      title: task.title,
      time: task.time || "",
      subtitle: task.dreamTitle || "",
      priority: task.priority || "low",
      dreamId: task.dreamId || "",
      durationMins: task.durationMins,
    });
  }
  for (var ei = 0; ei < eventsList.length; ei++) {
    var evt = eventsList[ei];
    timeline.push({
      type: "event",
      id: evt.id,
      title: evt.title,
      time: evt.startTime || "",
      subtitle: evt.startTime + " - " + evt.endTime,
      priority: null,
    });
  }
  timeline.sort(function (a, b) {
    var ta = a.time || "99:99";
    var tb = b.time || "99:99";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });

  var streak = data.streak || {};
  var spotlight = data.dreamSpotlight;
  var motivation = data.motivation || {};
  var statsYesterday = data.statsYesterday || {};

  // ── Yesterday recap text ──
  var recapParts = [];
  if (statsYesterday.tasksCompleted > 0) {
    recapParts.push("completed " + statsYesterday.tasksCompleted + " task" + (statsYesterday.tasksCompleted !== 1 ? "s" : ""));
  }
  if (statsYesterday.focusMinutes > 0) {
    var hrs = Math.floor(statsYesterday.focusMinutes / 60);
    var mins = statsYesterday.focusMinutes % 60;
    var focusStr = hrs > 0 ? hrs + "h" + (mins > 0 ? " " + mins + "m" : "") : mins + "m";
    recapParts.push("focused for " + focusStr);
  }
  var recapText = recapParts.length > 0
    ? "You " + recapParts.join(" and ") + " yesterday!"
    : "Start fresh today!";

  return (
    <GlassCard padding={0} mb={20} style={{ overflow: "hidden", border: theme.border, position: "relative" }}>
      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: theme.gradient,
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative" }}>

        {/* ═══ HEADER — Always visible ═══ */}
        <div
          onClick={function () { setExpanded(!expanded); }}
          style={{
            padding: "20px 20px 16px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Greeting */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 6,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: theme.accentColor + "15",
                  border: "1px solid " + theme.accentColor + "20",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <TimeIcon size={18} color={theme.accentColor} strokeWidth={2} />
                </div>
                <h2 style={{
                  fontSize: 20, fontWeight: 700, color: "var(--dp-text)",
                  letterSpacing: "-0.3px", margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {data.greeting}
                </h2>
              </div>

              {/* Date */}
              <div style={{
                fontSize: 13, color: "var(--dp-text-secondary)", fontWeight: 500,
                paddingLeft: 46,
              }}>
                {data.date}
              </div>
            </div>

            {/* Collapse toggle + quick stats when collapsed */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              marginLeft: 12, flexShrink: 0,
            }}>
              {expanded
                ? <ChevronUp size={18} color="var(--dp-text-muted)" strokeWidth={2} />
                : <ChevronDown size={18} color="var(--dp-text-muted)" strokeWidth={2} />
              }
            </div>
          </div>

          {/* Summary stats row — visible when collapsed */}
          {!expanded && (
            <div style={{
              display: "flex", gap: 16, marginTop: 14, paddingLeft: 46,
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}>
              {streak.days > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Flame size={14} color="#F97316" strokeWidth={2.5} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>{streak.days}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle2 size={14} color="#10B981" strokeWidth={2.5} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>{tasksList.length} task{tasksList.length !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Calendar size={14} color="#3B82F6" strokeWidth={2.5} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>{eventsList.length} event{eventsList.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          )}
        </div>

        {/* ═══ EXPANDED CONTENT ═══ */}
        <div style={{
          maxHeight: expanded ? 1200 : 0,
          overflow: "hidden",
          transition: "max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div style={{ padding: "0 20px 20px" }}>

            {/* ── Today's Schedule ── */}
            {timeline.length > 0 && (
              <div className={mounted ? "dp-mb-fade-in" : ""} style={{
                marginBottom: 18,
                animationDelay: "100ms",
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                  marginBottom: 10,
                }}>
                  Today's Schedule
                </div>

                <div style={{
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  {timeline.slice(0, 5).map(function (item, idx) {
                    var isTask = item.type === "task";
                    var dotColor = isTask
                      ? (PRIORITY_COLORS[item.priority] || "#10B981")
                      : "#3B82F6";

                    return (
                      <div
                        key={item.type + "-" + item.id}
                        className={mounted ? "dp-mb-fade-in" : ""}
                        onClick={function (e) {
                          e.stopPropagation();
                          if (isTask && item.dreamId) navigate("/dream/" + item.dreamId);
                          else if (!isTask) navigate("/calendar");
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", borderRadius: 12,
                          background: isLight ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.04)",
                          border: "1px solid " + (isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"),
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          animationDelay: (120 + idx * 60) + "ms",
                        }}
                      >
                        {/* Time */}
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: "var(--dp-text-muted)",
                          minWidth: 42, fontVariantNumeric: "tabular-nums",
                        }}>
                          {item.time || "--:--"}
                        </span>

                        {/* Dot */}
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: dotColor,
                          boxShadow: "0 0 6px " + dotColor + "40",
                          flexShrink: 0,
                        }} />

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div style={{
                              fontSize: 11, color: "var(--dp-text-muted)", marginTop: 1,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {item.subtitle}
                            </div>
                          )}
                        </div>

                        {/* Type badge */}
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          padding: "2px 8px", borderRadius: 6,
                          background: isTask ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)",
                          color: isTask ? "#10B981" : "#3B82F6",
                          border: "1px solid " + (isTask ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)"),
                          flexShrink: 0,
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                        }}>
                          {isTask ? "Task" : "Event"}
                        </span>
                      </div>
                    );
                  })}
                  {timeline.length > 5 && (
                    <div
                      onClick={function (e) { e.stopPropagation(); navigate("/calendar"); }}
                      style={{
                        fontSize: 12, fontWeight: 600, color: "var(--dp-accent)",
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "6px 0", cursor: "pointer",
                      }}
                    >
                      <span>+{timeline.length - 5} more</span>
                      <ArrowRight size={12} strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                {timeline.length === 0 && (
                  <div style={{
                    padding: "14px 0", fontSize: 13, color: "var(--dp-text-muted)",
                    textAlign: "center", fontStyle: "italic",
                  }}>
                    Nothing scheduled today. A perfect day to dream big!
                  </div>
                )}
              </div>
            )}

            {/* ── Streak Badge ── */}
            <div className={mounted ? "dp-mb-fade-in" : ""} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 12, marginBottom: 18,
              background: isLight ? "rgba(249,115,22,0.06)" : "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.12)",
              animationDelay: "300ms",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(239,68,68,0.10))",
                border: "1px solid rgba(249,115,22,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Flame
                  size={20}
                  color={streak.days > 0 ? "#F97316" : "var(--dp-text-muted)"}
                  fill={streak.days > 0 ? "rgba(249,115,22,0.3)" : "none"}
                  strokeWidth={2}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{
                    fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px",
                    color: streak.days > 0 ? "var(--dp-text)" : "var(--dp-text-muted)",
                    lineHeight: 1,
                  }}>
                    {streak.days}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-secondary)" }}>
                    day streak
                  </span>
                </div>
                <div style={{
                  fontSize: 12, color: "var(--dp-text-muted)", marginTop: 3,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {streak.message}
                </div>
              </div>
            </div>

            {/* ── Dream Spotlight ── */}
            {spotlight && (
              <div
                className={mounted ? "dp-mb-fade-in" : ""}
                onClick={function (e) { e.stopPropagation(); navigate("/dream/" + spotlight.id); }}
                style={{
                  padding: "14px", borderRadius: 12, marginBottom: 18,
                  background: isLight ? "rgba(139,92,246,0.05)" : "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.12)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  animationDelay: "400ms",
                }}
              >
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles size={14} color="var(--dp-accent)" strokeWidth={2.5} />
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: "var(--dp-text-secondary)",
                      textTransform: "uppercase", letterSpacing: "0.5px",
                    }}>
                      Dream Spotlight
                    </span>
                  </div>
                  <ArrowRight size={14} color="var(--dp-text-muted)" strokeWidth={2} />
                </div>

                {/* Dream title */}
                <div style={{
                  fontSize: 15, fontWeight: 700, color: "var(--dp-text)",
                  marginBottom: 10,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {spotlight.title}
                </div>

                {/* Progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: "var(--dp-glass-border)", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: (spotlight.progress || 0) + "%",
                      background: spotlight.progress >= 80
                        ? "linear-gradient(90deg, #10B981, #14B8A6)"
                        : "linear-gradient(90deg, #8B5CF6, #7C3AED)",
                      transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      boxShadow: "0 0 8px rgba(139,92,246,0.3)",
                    }} />
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: spotlight.progress >= 80 ? "#10B981" : "var(--dp-accent)",
                    minWidth: 36, textAlign: "right",
                  }}>
                    {spotlight.progress}%
                  </span>
                </div>

                {/* Next task */}
                {spotlight.nextTask && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 12, color: "var(--dp-text-muted)",
                  }}>
                    <Target size={12} strokeWidth={2.5} />
                    <span>Next: {spotlight.nextTask}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Yesterday's Recap ── */}
            <div className={mounted ? "dp-mb-fade-in" : ""} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 12, marginBottom: 18,
              background: isLight ? "rgba(20,184,166,0.05)" : "rgba(20,184,166,0.06)",
              border: "1px solid rgba(20,184,166,0.10)",
              animationDelay: "500ms",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: "rgba(20,184,166,0.12)",
                border: "1px solid rgba(20,184,166,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Zap size={16} color="#14B8A6" strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: "var(--dp-text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                  marginBottom: 2,
                }}>
                  Yesterday
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 500, color: "var(--dp-text)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {recapText}
                </div>
              </div>
              {statsYesterday.xpEarned > 0 && (
                <div style={{
                  padding: "3px 8px", borderRadius: 8,
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.12)",
                  fontSize: 11, fontWeight: 700, color: "var(--dp-accent)",
                  flexShrink: 0,
                }}>
                  +{statsYesterday.xpEarned} XP
                </div>
              )}
            </div>

            {/* ── Motivational Quote ── */}
            {motivation.quote && (
              <div className={mounted ? "dp-mb-fade-in" : ""} style={{
                padding: "14px", borderRadius: 12,
                background: isLight ? "rgba(139,92,246,0.04)" : "rgba(139,92,246,0.05)",
                border: "1px solid rgba(139,92,246,0.08)",
                animationDelay: "600ms",
              }}>
                <Quote size={16} color="rgba(139,92,246,0.25)" strokeWidth={2} style={{ marginBottom: 6 }} />
                <p style={{
                  fontSize: 13, fontWeight: 500, fontStyle: "italic",
                  color: "var(--dp-text-secondary)", lineHeight: 1.6,
                  margin: "0 0 6px",
                }}>
                  {motivation.quote}
                </p>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 12, fontWeight: 600, color: "var(--dp-text-muted)",
                }}>
                  <div style={{ width: 16, height: 1, background: "var(--dp-divider)" }} />
                  {motivation.author}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ═══ KEYFRAME ANIMATIONS ═══ */}
      <style>{
        "@keyframes dpMbFadeIn {" +
          "from { opacity: 0; transform: translateY(8px); }" +
          "to { opacity: 1; transform: translateY(0); }" +
        "}" +
        ".dp-mb-fade-in {" +
          "animation: dpMbFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;" +
        "}"
      }</style>
    </GlassCard>
  );
}
