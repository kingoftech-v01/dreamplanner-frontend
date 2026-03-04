import { useState, useMemo } from "react";
import { BRAND, GRADIENTS, adaptColor } from "../../styles/colors";
import GlassCard from "./GlassCard";

/* ═══════════════════════════════════════════════════════════════════
 * CalendarHeatmap — GitHub-style productivity heatmap
 *
 * Props:
 *   data       – Array of { date, score, tasks_completed, tasks_total,
 *                events_count, focus_minutes, productivity_score }
 *   startDate  – Date object (first day)
 *   endDate    – Date object (last day)
 *   onDayClick – function(dateString) called when a cell is clicked
 *   isLight    – boolean (light theme flag)
 * ═══════════════════════════════════════════════════════════════════ */

var DAY_LABELS = ["", "M", "", "W", "", "F", ""];
var CELL_SIZE = 14;
var CELL_GAP = 3;

// ── Score → color mapping ──
function scoreColor(score, isLight) {
  if (score <= 0) return "var(--dp-surface)";
  if (score <= 0.25) return isLight ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.2)";
  if (score <= 0.5) return isLight ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.4)";
  if (score <= 0.75) return isLight ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.65)";
  return isLight ? BRAND.purpleDark : BRAND.purple;
}

function scoreGlow(score) {
  if (score > 0.75) return "0 0 8px rgba(139,92,246,0.5)";
  return "none";
}

// ── Date helpers ──
function formatDateISO(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function addDays(d, n) {
  var r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMonday(d) {
  var date = new Date(d);
  var day = date.getDay();
  var diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

var SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Tooltip Component ──
var Tooltip = function (props) {
  var info = props.info;
  var pos = props.pos;
  if (!info) return null;

  var dateObj = new Date(info.date + "T00:00:00");
  var dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  var focusLabel = info.focus_minutes >= 60
    ? Math.floor(info.focus_minutes / 60) + "h " + (info.focus_minutes % 60) + "m"
    : info.focus_minutes + "m";

  return (
    <div style={{
      position: "fixed",
      left: pos.x,
      top: pos.y - 8,
      transform: "translate(-50%, -100%)",
      background: "rgba(10,6,20,0.92)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: "1px solid rgba(139,92,246,0.25)",
      borderRadius: 12,
      padding: "10px 14px",
      zIndex: 9999,
      pointerEvents: "none",
      minWidth: 160,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{dateLabel}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>Score</span>
          <span style={{ fontWeight: 600, color: BRAND.purple }}>{Math.round(info.productivity_score * 100)}%</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>Tasks</span>
          <span style={{ fontWeight: 600, color: BRAND.green }}>{info.tasks_completed}/{info.tasks_total}</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>Focus</span>
          <span style={{ fontWeight: 600, color: BRAND.teal }}>{focusLabel}</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>Events</span>
          <span style={{ fontWeight: 600, color: BRAND.purpleLight }}>{info.events_count}</span>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──
var CalendarHeatmap = function (props) {
  var data = props.data || [];
  var startDate = props.startDate;
  var endDate = props.endDate;
  var onDayClick = props.onDayClick;
  var isLight = props.isLight || false;

  var [tooltip, setTooltip] = useState(null);
  var [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Build lookup: date string → data row
  var dataMap = useMemo(function () {
    var map = {};
    for (var i = 0; i < data.length; i++) {
      map[data[i].date] = data[i];
    }
    return map;
  }, [data]);

  // Build weeks grid: array of weeks, each week is array of 7 day slots
  var grid = useMemo(function () {
    var monday = getMonday(startDate);
    var weeks = [];
    var current = new Date(monday);

    while (current <= endDate || current.getDay() !== 1) {
      var week = [];
      for (var d = 0; d < 7; d++) {
        var dateStr = formatDateISO(current);
        var inRange = current >= startDate && current <= endDate;
        week.push({
          date: dateStr,
          inRange: inRange,
          dayOfMonth: current.getDate(),
          month: current.getMonth(),
          year: current.getFullYear(),
        });
        current = addDays(current, 1);
      }
      weeks.push(week);
      // Safety: stop if we've gone far past the end
      if (current > addDays(endDate, 7)) break;
    }
    return weeks;
  }, [startDate, endDate]);

  // Build month labels with positions
  var monthLabels = useMemo(function () {
    var labels = [];
    var lastMonth = -1;
    for (var w = 0; w < grid.length; w++) {
      // Use the first in-range day of the week to determine month
      for (var d = 0; d < 7; d++) {
        var cell = grid[w][d];
        if (cell.inRange && cell.month !== lastMonth) {
          labels.push({ label: SHORT_MONTHS[cell.month], weekIdx: w });
          lastMonth = cell.month;
          break;
        }
      }
    }
    return labels;
  }, [grid]);

  var gridWidth = grid.length * (CELL_SIZE + CELL_GAP);

  function handleMouseEnter(e, dateStr) {
    var info = dataMap[dateStr];
    if (!info) {
      info = { date: dateStr, tasks_completed: 0, tasks_total: 0, events_count: 0, focus_minutes: 0, productivity_score: 0 };
    }
    var rect = e.currentTarget.getBoundingClientRect();
    setTooltip(info);
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  function handleClick(dateStr) {
    if (onDayClick) onDayClick(dateStr);
  }

  // ── Legend items ──
  var legendScores = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <GlassCard padding={16} mb={16}>
      {/* Month labels */}
      <div style={{ display: "flex", paddingLeft: 28, marginBottom: 4, overflow: "hidden" }}>
        <div style={{ display: "flex", position: "relative", width: gridWidth }}>
          {monthLabels.map(function (ml, i) {
            return (
              <div key={i} style={{
                position: "absolute",
                left: ml.weekIdx * (CELL_SIZE + CELL_GAP),
                fontSize: 10,
                fontWeight: 600,
                color: "var(--dp-text-muted)",
                whiteSpace: "nowrap",
              }}>{ml.label}</div>
            );
          })}
        </div>
      </div>

      {/* Grid area: day labels + cells */}
      <div style={{ display: "flex", gap: 0 }}>
        {/* Day-of-week labels */}
        <div style={{ display: "flex", flexDirection: "column", gap: CELL_GAP, width: 24, flexShrink: 0, paddingTop: 0 }}>
          {DAY_LABELS.map(function (label, i) {
            return (
              <div key={i} style={{
                height: CELL_SIZE,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 4,
                fontSize: 10,
                fontWeight: 500,
                color: "var(--dp-text-muted)",
              }}>{label}</div>
            );
          })}
        </div>

        {/* Scrollable heatmap grid */}
        <div style={{
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          flex: 1,
          paddingBottom: 4,
        }}>
          <div style={{ display: "flex", gap: CELL_GAP, minWidth: gridWidth }}>
            {grid.map(function (week, wi) {
              return (
                <div key={wi} style={{ display: "flex", flexDirection: "column", gap: CELL_GAP }}>
                  {week.map(function (cell, di) {
                    if (!cell.inRange) {
                      return (
                        <div key={di} style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          borderRadius: 3,
                          background: "transparent",
                        }} />
                      );
                    }
                    var info = dataMap[cell.date];
                    var score = info ? info.productivity_score : 0;
                    var bg = scoreColor(score, isLight);
                    var glow = scoreGlow(score);

                    return (
                      <div
                        key={di}
                        role="button"
                        tabIndex={0}
                        aria-label={cell.date + " productivity score " + (score * 100).toFixed(0) + " percent"}
                        onMouseEnter={function (e) { handleMouseEnter(e, cell.date); }}
                        onMouseLeave={handleMouseLeave}
                        onClick={function () { handleClick(cell.date); }}
                        onKeyDown={function (e) { if (e.key === "Enter") handleClick(cell.date); }}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          borderRadius: 3,
                          background: bg,
                          boxShadow: glow,
                          cursor: "pointer",
                          transition: "transform 0.15s, box-shadow 0.15s",
                          border: "1px solid " + (score > 0 ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)"),
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 6,
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid var(--dp-accent-border)",
      }}>
        <span style={{ fontSize: 10, color: "var(--dp-text-muted)", marginRight: 4 }}>Less</span>
        {legendScores.map(function (s, i) {
          return (
            <div key={i} style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              borderRadius: 3,
              background: scoreColor(s, isLight),
              boxShadow: scoreGlow(s),
              border: "1px solid " + (s > 0 ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)"),
            }} />
          );
        })}
        <span style={{ fontSize: 10, color: "var(--dp-text-muted)", marginLeft: 4 }}>More</span>
      </div>

      {/* Tooltip portal */}
      <Tooltip info={tooltip} pos={tooltipPos} />
    </GlassCard>
  );
};

export default CalendarHeatmap;
