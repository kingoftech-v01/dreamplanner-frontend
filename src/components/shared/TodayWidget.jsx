import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { apiGet, apiPost } from "../../services/api";
import { CALENDAR, DREAMS } from "../../services/endpoints";
import GlassCard from "./GlassCard";
import DailyPrioritiesPanel from "./DailyPrioritiesPanel";
import {
  Clock, CheckCircle, ChevronRight,
  Calendar, Zap, Brain,
} from "lucide-react";
import { BRAND } from "../../styles/colors";

/* ═══════════════════════════════════════════════════════════════════
 * TodayWidget — Compact card showing today's schedule summary
 * with quick task-completion checkboxes and a progress ring.
 *
 * Features:
 *  1. Current time indicator with "Now" label
 *  2. Next upcoming event highlighted
 *  3. Quick checkbox toggles for task completion
 *  4. Progress ring showing % of today's tasks done
 *  5. Past events dimmed, current highlighted, future normal
 *  6. Compact: fits in ~120px height (collapsed)
 *  7. Animated task completion (checkbox -> checkmark with scale)
 * ═══════════════════════════════════════════════════════════════════ */

// ── Parse "HH:MM" or "HH:MM:SS" to minutes since midnight ──
var parseToMinutes = function (timeStr) {
  if (!timeStr) return -1;
  var cleaned = timeStr.replace(/\s*(AM|PM)\s*/i, function (_, p) { return p; });
  var parts = cleaned.split(":");
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) || 0;
  // Handle 12h format
  if (/PM/i.test(timeStr) && h < 12) h += 12;
  if (/AM/i.test(timeStr) && h === 12) h = 0;
  return h * 60 + m;
};

// ── Format minutes since midnight to "h:mm AM/PM" ──
var formatTime = function (mins) {
  if (mins < 0) return "";
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  var ampm = h >= 12 ? "PM" : "AM";
  var h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return h12 + ":" + String(m).padStart(2, "0") + " " + ampm;
};

// ── SVG progress ring component ──
function ProgressRing(props) {
  var size = props.size || 44;
  var strokeWidth = props.strokeWidth || 3.5;
  var percent = props.percent || 0;
  var radius = (size - strokeWidth) / 2;
  var circumference = 2 * Math.PI * radius;
  var offset = circumference - (percent / 100) * circumference;
  var color = percent >= 100 ? BRAND.greenSolid : percent >= 50 ? BRAND.purple : BRAND.blue;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      {/* Background track */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="var(--dp-glass-border)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1), stroke 0.4s ease",
          filter: "drop-shadow(0 0 4px " + color + "40)",
        }}
      />
      {/* Center text — rendered un-rotated */}
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{
          fontSize: 11, fontWeight: 700,
          fill: "var(--dp-text)",
          transform: "rotate(90deg)",
          transformOrigin: "center",
        }}
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

export default function TodayWidget(props) {
  var variant = props.variant || "full"; // "full" (HomeScreen) | "mini" (CalendarScreen floating)
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var queryClient = useQueryClient();

  var [mounted, setMounted] = useState(false);
  var [nowMinutes, setNowMinutes] = useState(function () {
    var n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  var [completedAnimating, setCompletedAnimating] = useState({});
  var [prioritiesOpen, setPrioritiesOpen] = useState(false);

  useEffect(function () {
    var t = setTimeout(function () { setMounted(true); }, 80);
    return function () { clearTimeout(t); };
  }, []);

  // Update current time every 60s
  useEffect(function () {
    var iv = setInterval(function () {
      var n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return function () { clearInterval(iv); };
  }, []);

  // ── Fetch today's items ──
  var todayQuery = useQuery({
    queryKey: ["today-widget"],
    queryFn: function () { return apiGet(CALENDAR.TODAY); },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  // ── Toggle task completion ──
  var toggleMut = useMutation({
    mutationFn: function (params) {
      return apiPost(DREAMS.TASKS.COMPLETE(params.id));
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["today-widget"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-today"] });
      queryClient.invalidateQueries({ queryKey: ["morning-briefing"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  var handleToggle = function (taskId) {
    // Trigger scale animation
    var next = {};
    for (var k in completedAnimating) next[k] = completedAnimating[k];
    next[taskId] = true;
    setCompletedAnimating(next);
    setTimeout(function () {
      var after = {};
      for (var k2 in completedAnimating) after[k2] = completedAnimating[k2];
      delete after[taskId];
      setCompletedAnimating(after);
    }, 600);
    toggleMut.mutate({ id: taskId });
  };

  // ── Parse and sort items ──
  var rawItems = (todayQuery.data && todayQuery.data.results) || todayQuery.data || [];
  if (!Array.isArray(rawItems)) rawItems = [];

  var items = [];
  for (var i = 0; i < rawItems.length; i++) {
    var raw = rawItems[i];
    var timeStr = raw.scheduledTime || raw.time || raw.startTime || raw.start_time || "";
    var mins = parseToMinutes(timeStr);
    var done = raw.status === "completed" || raw.done || raw.completed || raw.isCompleted || raw.is_completed || false;
    items.push({
      id: raw.taskId || raw.id,
      title: raw.taskTitle || raw.title || "",
      time: timeStr,
      minutes: mins,
      done: done,
      type: raw.type || "task",
      isTask: raw.type !== "event",
      dream: raw.dreamTitle || raw.dream || "",
      dreamId: raw.dreamId || "",
    });
  }
  items.sort(function (a, b) {
    var ma = a.minutes >= 0 ? a.minutes : 9999;
    var mb = b.minutes >= 0 ? b.minutes : 9999;
    return ma - mb;
  });

  // ── Compute stats ──
  var totalTasks = 0;
  var completedTasks = 0;
  var nextUpIdx = -1;
  for (var j = 0; j < items.length; j++) {
    if (items[j].isTask) {
      totalTasks++;
      if (items[j].done) completedTasks++;
    }
    // Find the next upcoming item (not done, time >= now)
    if (nextUpIdx === -1 && !items[j].done && items[j].minutes >= nowMinutes) {
      nextUpIdx = j;
    }
  }
  // If no future item found, pick first incomplete
  if (nextUpIdx === -1) {
    for (var j2 = 0; j2 < items.length; j2++) {
      if (!items[j2].done) { nextUpIdx = j2; break; }
    }
  }

  var progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Don't render if loading/error and empty
  if (todayQuery.isLoading) return null;
  if (!items.length) return null;

  // ── For mini variant, show max 3 items ──
  var displayItems = variant === "mini" ? items.slice(0, 3) : items.slice(0, 6);
  var moreCount = items.length - displayItems.length;

  // ── Time classification for each item ──
  var classifyTime = function (item, idx) {
    if (item.done) return "done";
    if (idx === nextUpIdx) return "next";
    if (item.minutes >= 0 && item.minutes < nowMinutes) return "past";
    return "future";
  };

  // ── Mini variant (floating on CalendarScreen) ──
  if (variant === "mini") {
    return (
      <div
        onClick={function () { navigate("/calendar"); }}
        style={{
          position: "fixed",
          bottom: 90,
          left: 16,
          right: 76,
          zIndex: 80,
          maxWidth: 320,
          cursor: "pointer",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{
          background: isLight
            ? "rgba(255,255,255,0.82)"
            : "rgba(12,8,26,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: 16,
          border: "1px solid " + (isLight ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.15)"),
          boxShadow: isLight
            ? "0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(139,92,246,0.06)"
            : "0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(139,92,246,0.08)",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <ProgressRing size={38} strokeWidth={3} percent={progressPct} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: "var(--dp-text)",
              marginBottom: 2,
            }}>
              Today: {completedTasks}/{totalTasks} tasks
            </div>
            {nextUpIdx >= 0 && (
              <div style={{
                fontSize: 11, color: "var(--dp-text-secondary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                Next: {items[nextUpIdx].title}
              </div>
            )}
          </div>
          <ChevronRight size={16} color="var(--dp-text-muted)" strokeWidth={2} />
        </div>
      </div>
    );
  }

  // ── Full variant (HomeScreen) ──
  return (
    <GlassCard padding={0} mb={20} style={{
      overflow: "hidden",
      border: "1px solid " + (isLight ? "rgba(139,92,246,0.10)" : "rgba(139,92,246,0.12)"),
      position: "relative",
    }}>
      {/* Subtle gradient overlay */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: isLight
          ? "linear-gradient(135deg, rgba(139,92,246,0.04) 0%, rgba(59,130,246,0.03) 50%, rgba(20,184,166,0.02) 100%)"
          : "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(59,130,246,0.04) 50%, rgba(20,184,166,0.03) 100%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", padding: "16px 16px 14px" }}>

        {/* ── Header row ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "rgba(139,92,246,0.10)",
              border: "1px solid rgba(139,92,246,0.14)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Calendar size={16} color="var(--dp-accent)" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: "var(--dp-text)",
                letterSpacing: "-0.2px",
              }}>
                Today's Tasks
              </div>
              <div style={{
                fontSize: 11, color: "var(--dp-text-muted)",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Clock size={10} strokeWidth={2.5} />
                <span>{formatTime(nowMinutes)}</span>
                <span style={{
                  marginLeft: 4,
                  padding: "1px 6px", borderRadius: 6,
                  background: "rgba(16,185,129,0.10)",
                  color: BRAND.greenSolid,
                  fontSize: 10, fontWeight: 600,
                }}>
                  Now
                </span>
              </div>
            </div>
          </div>

          {/* Progress ring */}
          <ProgressRing size={44} strokeWidth={3.5} percent={progressPct} />
        </div>

        {/* ── Task list ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {displayItems.map(function (item, idx) {
            var cls = classifyTime(item, items.indexOf(item));
            var isPast = cls === "past" || cls === "done";
            var isNext = cls === "next";
            var isDone = item.done;
            var isAnimating = !!completedAnimating[item.id];

            return (
              <div
                key={item.type + "-" + item.id}
                className={mounted ? "dp-tw-fade-in" : ""}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 10,
                  background: isNext
                    ? (isLight ? "rgba(139,92,246,0.07)" : "rgba(139,92,246,0.10)")
                    : "transparent",
                  border: isNext
                    ? "1px solid rgba(139,92,246,0.14)"
                    : "1px solid transparent",
                  opacity: isPast && !isNext ? 0.5 : 1,
                  transition: "all 0.3s ease",
                  animationDelay: (60 + idx * 50) + "ms",
                }}
              >
                {/* Checkbox / completion toggle */}
                {item.isTask ? (
                  <button
                    aria-label={isDone ? "Mark task incomplete" : "Mark task complete"}
                    onClick={function (e) {
                      e.stopPropagation();
                      if (!isDone) handleToggle(item.id);
                    }}
                    style={{
                      width: 22, height: 22, borderRadius: 7,
                      border: isDone ? "none" : "2px solid " + (isNext ? "rgba(139,92,246,0.4)" : "var(--dp-accent-border)"),
                      background: isDone ? "rgba(16,185,129,0.15)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: isDone ? "default" : "pointer",
                      flexShrink: 0,
                      transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                      transform: isAnimating ? "scale(1.3)" : "scale(1)",
                      fontFamily: "inherit",
                      padding: 0,
                    }}
                  >
                    {isDone && (
                      <CheckCircle
                        size={16}
                        color={BRAND.greenSolid}
                        strokeWidth={2.5}
                        style={{
                          transform: isAnimating ? "scale(1.2)" : "scale(1)",
                          transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                        }}
                      />
                    )}
                  </button>
                ) : (
                  <div style={{
                    width: 22, height: 22, borderRadius: 7,
                    background: "rgba(59,130,246,0.10)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Clock size={11} color="#3B82F6" strokeWidth={2.5} />
                  </div>
                )}

                {/* Time label */}
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: isNext ? "var(--dp-accent)" : "var(--dp-text-muted)",
                  minWidth: 50, fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}>
                  {item.minutes >= 0 ? formatTime(item.minutes) : "--:--"}
                </span>

                {/* Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: isNext ? 600 : 500,
                    color: isDone ? "var(--dp-text-muted)" : "var(--dp-text)",
                    textDecoration: isDone ? "line-through" : "none",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    transition: "all 0.3s ease",
                  }}>
                    {item.title}
                  </div>
                  {item.dream && (
                    <div style={{
                      fontSize: 10, color: "var(--dp-text-muted)", marginTop: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.dream}
                    </div>
                  )}
                </div>

                {/* "Next up" indicator */}
                {isNext && (
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    padding: "2px 6px", borderRadius: 5,
                    background: "rgba(139,92,246,0.12)",
                    color: "var(--dp-accent)",
                    textTransform: "uppercase",
                    letterSpacing: "0.3px",
                    flexShrink: 0,
                  }}>
                    Next
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer: more items + view all ── */}
        {(moreCount > 0 || items.length > 0) && (
          <div style={{
            marginTop: 10, paddingTop: 10,
            borderTop: "1px solid var(--dp-divider)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <div style={{
                fontSize: 12, color: "var(--dp-text-secondary)",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Zap size={12} color="var(--dp-accent)" strokeWidth={2.5} />
                <span style={{ fontWeight: 600 }}>
                  {completedTasks}/{totalTasks} done
                </span>
                {moreCount > 0 && (
                  <span style={{ color: "var(--dp-text-muted)" }}>
                    (+{moreCount} more)
                  </span>
                )}
              </div>
              {/* AI Prioritize button */}
              <button
                onClick={function (e) { e.stopPropagation(); setPrioritiesOpen(true); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: 8,
                  border: "1px solid rgba(245,158,11,0.20)",
                  background: "rgba(245,158,11,0.08)",
                  color: BRAND.orange,
                  fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >
                <Brain size={11} strokeWidth={2.5} />
                Prioritize
              </button>
            </div>
            <div
              onClick={function () { navigate("/calendar"); }}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 12, fontWeight: 600, color: "var(--dp-accent)",
                cursor: "pointer",
              }}
            >
              <span>View all</span>
              <ChevronRight size={14} strokeWidth={2.5} />
            </div>
          </div>
        )}
      </div>

      {/* ═══ KEYFRAME ANIMATIONS ═══ */}
      <style>{
        "@keyframes dpTwFadeIn {" +
          "from { opacity: 0; transform: translateX(-8px); }" +
          "to { opacity: 1; transform: translateX(0); }" +
        "}" +
        ".dp-tw-fade-in {" +
          "animation: dpTwFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;" +
        "}"
      }</style>

      {/* ── Daily Priorities Panel ── */}
      <DailyPrioritiesPanel open={prioritiesOpen} onClose={function () { setPrioritiesOpen(false); }} />
    </GlassCard>
  );
}
