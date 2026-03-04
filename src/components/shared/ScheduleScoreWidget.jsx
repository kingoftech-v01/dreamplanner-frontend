import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../services/api";
import { CALENDAR } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Flame, Lightbulb, CheckCircle, Zap, Clock } from "lucide-react";
import { BRAND } from "../../styles/colors";
import GlassCard from "./GlassCard";

/* ═══════════════════════════════════════════════════════════════════
 * ScheduleScoreWidget — Weekly adherence score with animated SVG ring
 *
 * Compact view: circular progress ring + letter grade badge
 * Expanded view: breakdown bars, streak, week comparison, tips
 * ═══════════════════════════════════════════════════════════════════ */

var GRADE_COLORS = {
  "A+": "#10B981",
  "A":  "#10B981",
  "B+": "#22C55E",
  "B":  "#3B82F6",
  "C+": "#F59E0B",
  "C":  "#F59E0B",
  "D":  "#EF4444",
  "F":  "#DC2626",
};

var RING_SIZE = 68;
var RING_STROKE = 5;
var RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
var RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ScoreRing(props) {
  var score = props.score || 0;
  var grade = props.grade || "F";
  var animated = props.animated;
  var gradeColor = GRADE_COLORS[grade] || BRAND.purple;

  var displayRef = useRef(null);
  var animFrameRef = useRef(null);
  var prevScoreRef = useRef(0);

  // Animated score number
  useEffect(function () {
    if (!animated) {
      prevScoreRef.current = score;
      return;
    }
    var startVal = prevScoreRef.current;
    var endVal = score;
    var startTime = performance.now();
    var duration = 900;

    function tick(now) {
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(startVal + (endVal - startVal) * eased);
      if (displayRef.current) {
        displayRef.current.textContent = current;
      }
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        prevScoreRef.current = endVal;
      }
    }
    animFrameRef.current = requestAnimationFrame(tick);
    return function () {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [score, animated]);

  var offset = RING_CIRCUMFERENCE - (score / 100) * RING_CIRCUMFERENCE;

  return (
    <div style={{ position: "relative", width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={"0 0 " + RING_SIZE + " " + RING_SIZE}
        style={{ transform: "rotate(-90deg)" }}
      >
        <defs>
          <linearGradient id="scoreRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradeColor} />
            <stop offset="100%" stopColor={BRAND.purple} />
          </linearGradient>
          <filter id="scoreGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background ring */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="var(--dp-accent-border)"
          strokeWidth={RING_STROKE}
          opacity={0.3}
        />
        {/* Progress ring */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="url(#scoreRingGrad)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          filter="url(#scoreGlow)"
          style={{
            transition: animated ? "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)" : "none",
          }}
        />
      </svg>
      {/* Score number in center */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span
          ref={displayRef}
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "var(--dp-text-primary)",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >{score}</span>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          color: "var(--dp-text-muted)",
          marginTop: 1,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}>score</span>
      </div>
    </div>
  );
}

function AdherenceBar(props) {
  var label = props.label;
  var value = props.value || 0;
  var icon = props.icon;
  var color = props.color || BRAND.purple;
  var detail = props.detail || "";

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {icon}
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)" }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: color, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(value)}%
          {detail ? <span style={{ fontWeight: 500, color: "var(--dp-text-muted)", marginLeft: 4, fontSize: 11 }}>{detail}</span> : null}
        </span>
      </div>
      <div style={{
        height: 6,
        borderRadius: 3,
        background: "var(--dp-accent-border)",
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{
          height: "100%",
          borderRadius: 3,
          background: "linear-gradient(90deg, " + color + ", " + BRAND.purple + ")",
          width: Math.min(value, 100) + "%",
          transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "0 0 8px " + color + "40",
        }} />
      </div>
    </div>
  );
}

export default function ScheduleScoreWidget(props) {
  var weekStartStr = props.weekStart || "";
  var { resolved } = useTheme();
  var isLight = resolved === "light";

  var [expanded, setExpanded] = useState(false);
  var [animated, setAnimated] = useState(false);

  var scoreQuery = useQuery({
    queryKey: ["schedule-score", weekStartStr],
    queryFn: function () {
      var url = CALENDAR.SCHEDULE_SCORE;
      if (weekStartStr) url += "?week=" + weekStartStr;
      return apiGet(url);
    },
    staleTime: 2 * 60 * 1000,
  });

  var data = scoreQuery.data || {};
  var overallScore = data.overallScore || 0;
  var grade = data.grade || "F";
  var streakDays = data.streakDays || 0;
  var weekComparison = data.weekComparison || 0;
  var taskCompletionRate = data.taskCompletionRate || 0;
  var tasksScheduled = data.tasksScheduled || 0;
  var tasksCompleted = data.tasksCompleted || 0;
  var focusMinutesPlanned = data.focusMinutesPlanned || 0;
  var focusMinutesActual = data.focusMinutesActual || 0;
  var timeBlockAdherence = data.timeBlockAdherence || 0;
  var eventsAttended = data.eventsAttended || 0;
  var eventsTotal = data.eventsTotal || 0;
  var tips = data.tips || [];
  var gradeColor = GRADE_COLORS[grade] || BRAND.purple;

  var focusAdherence = focusMinutesPlanned > 0
    ? Math.min(Math.round((focusMinutesActual / focusMinutesPlanned) * 100), 100)
    : (focusMinutesActual > 0 ? 100 : 0);

  // Trigger animation after mount
  useEffect(function () {
    if (scoreQuery.data) {
      var t = setTimeout(function () { setAnimated(true); }, 150);
      return function () { clearTimeout(t); };
    }
  }, [scoreQuery.data]);

  // Loading skeleton
  if (scoreQuery.isLoading) {
    return (
      <GlassCard padding="14px 16px" style={{
        marginBottom: 14,
        background: "var(--dp-glass-bg)",
        border: "1px solid var(--dp-accent-border)",
        borderRadius: 16,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: "50%",
            background: "var(--dp-accent-border)",
            animation: "dpPulse 1.5s ease-in-out infinite",
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: 120, height: 14, borderRadius: 7, background: "var(--dp-accent-border)", marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width: 80, height: 10, borderRadius: 5, background: "var(--dp-accent-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      </GlassCard>
    );
  }

  if (scoreQuery.isError) return null;

  var comparisonUp = weekComparison >= 0;
  var comparisonAbs = Math.abs(weekComparison);

  return (
    <GlassCard padding={0} style={{
      marginBottom: 14,
      background: "var(--dp-glass-bg)",
      border: "1px solid var(--dp-accent-border)",
      borderRadius: 16,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      overflow: "hidden",
      transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
    }}>
      {/* ── Compact view: ring + grade + toggle ── */}
      <button
        aria-label={expanded ? "Collapse schedule score" : "Expand schedule score"}
        onClick={function () { setExpanded(!expanded); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          width: "100%",
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <ScoreRing score={overallScore} grade={grade} animated={animated} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--dp-text-primary)",
            }}>Weekly Score</span>
            {/* Grade badge */}
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2px 8px",
              borderRadius: 8,
              background: gradeColor + "20",
              color: gradeColor,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.5,
              border: "1px solid " + gradeColor + "30",
            }}>{grade}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Week comparison */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {comparisonUp
                ? <TrendingUp size={13} color={BRAND.greenSolid} strokeWidth={2.5} />
                : <TrendingDown size={13} color={BRAND.redSolid} strokeWidth={2.5} />
              }
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: comparisonUp ? BRAND.greenSolid : BRAND.redSolid,
                fontVariantNumeric: "tabular-nums",
              }}>
                {comparisonUp ? "+" : "-"}{comparisonAbs.toFixed(1)}%
              </span>
            </div>
            {/* Streak */}
            {streakDays > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Flame size={13} color={BRAND.orange} strokeWidth={2.5} />
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: BRAND.orange,
                  fontVariantNumeric: "tabular-nums",
                }}>{streakDays}d</span>
              </div>
            )}
          </div>
        </div>

        {expanded
          ? <ChevronUp size={16} color="var(--dp-text-muted)" strokeWidth={2} />
          : <ChevronDown size={16} color="var(--dp-text-muted)" strokeWidth={2} />
        }
      </button>

      {/* ── Expanded detail view ── */}
      {expanded && (
        <div style={{
          padding: "0 16px 16px",
          borderTop: "1px solid var(--dp-accent-border)",
          animation: "dpFadeScale 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <div style={{ paddingTop: 14 }}>
            {/* Task completion bar */}
            <AdherenceBar
              label="Tasks"
              value={taskCompletionRate}
              color={BRAND.greenSolid}
              icon={<CheckCircle size={13} color={BRAND.greenSolid} strokeWidth={2.5} />}
              detail={tasksCompleted + "/" + tasksScheduled}
            />

            {/* Focus adherence bar */}
            <AdherenceBar
              label="Focus"
              value={focusAdherence}
              color={BRAND.purple}
              icon={<Zap size={13} color={BRAND.purple} strokeWidth={2.5} />}
              detail={focusMinutesActual + "/" + focusMinutesPlanned + "m"}
            />

            {/* Time block usage bar */}
            <AdherenceBar
              label="Time Blocks"
              value={timeBlockAdherence}
              color={BRAND.teal}
              icon={<Clock size={13} color={BRAND.teal} strokeWidth={2.5} />}
              detail={eventsAttended + "/" + eventsTotal + " events"}
            />
          </div>

          {/* Week comparison + streak row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 0",
            borderTop: "1px solid var(--dp-accent-border)",
            marginTop: 4,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 10,
              background: (comparisonUp ? BRAND.greenSolid : BRAND.redSolid) + "12",
              border: "1px solid " + (comparisonUp ? BRAND.greenSolid : BRAND.redSolid) + "20",
            }}>
              {comparisonUp
                ? <TrendingUp size={14} color={BRAND.greenSolid} strokeWidth={2.5} />
                : <TrendingDown size={14} color={BRAND.redSolid} strokeWidth={2.5} />
              }
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: comparisonUp ? BRAND.greenSolid : BRAND.redSolid,
              }}>
                {comparisonUp ? "+" : ""}{weekComparison.toFixed(1)}% vs last week
              </span>
            </div>

            {streakDays > 0 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 10,
                background: BRAND.orange + "12",
                border: "1px solid " + BRAND.orange + "20",
              }}>
                <Flame size={14} color={BRAND.orange} strokeWidth={2.5} />
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: BRAND.orange,
                }}>{streakDays} day streak</span>
              </div>
            )}
          </div>

          {/* Tips */}
          {tips.length > 0 && (
            <div style={{
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              background: BRAND.purple + "0a",
              border: "1px solid " + BRAND.purple + "15",
            }}>
              {tips.slice(0, 2).map(function (tip, idx) {
                return (
                  <div key={idx} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    marginBottom: idx < tips.length - 1 && idx < 1 ? 6 : 0,
                  }}>
                    <Lightbulb size={13} color={BRAND.yellow} strokeWidth={2.5} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--dp-text-secondary)",
                      lineHeight: 1.4,
                    }}>{tip}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
