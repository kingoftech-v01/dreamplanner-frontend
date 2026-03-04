import { useState, useEffect, useRef, useCallback } from "react";
import PillTabs from "./PillTabs";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Progress Analytics Charts
 *
 * Pure SVG charts for dream analytics:
 *   1. ProgressLineChart — smooth bezier line with gradient fill
 *   2. TaskDonutChart   — donut with animated segments
 *   3. WeeklyBarChart   — vertical bars per week
 *   4. TimeRangeSelector — pill tabs for 1W/1M/3M/All
 * ═══════════════════════════════════════════════════════════════════ */

var CHART_COLORS = {
  completed: "#10B981",
  in_progress: "#3B82F6",
  pending: "#6B7280",
  skipped: "#F59E0B",
};

var CHART_LABELS = {
  completed: "Completed",
  in_progress: "In Progress",
  pending: "Pending",
  skipped: "Skipped",
};

/* ── Unique ID generator for SVG gradient refs ── */
var _idCounter = 0;
function useUniqueId(prefix) {
  var ref = useRef(null);
  if (ref.current === null) {
    _idCounter += 1;
    ref.current = prefix + "-" + _idCounter;
  }
  return ref.current;
}

/* ── Cubic bezier path from points ── */
function buildSmoothPath(points) {
  if (points.length < 2) return "";
  var d = "M " + points[0].x + " " + points[0].y;
  for (var i = 1; i < points.length; i++) {
    var prev = points[i - 1];
    var curr = points[i];
    var cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    var cpy1 = prev.y;
    var cpx2 = curr.x - (curr.x - prev.x) * 0.4;
    var cpy2 = curr.y;
    d += " C " + cpx1 + " " + cpy1 + ", " + cpx2 + " " + cpy2 + ", " + curr.x + " " + curr.y;
  }
  return d;
}

/* ── Build closed area path for gradient fill ── */
function buildAreaPath(points, bottomY) {
  if (points.length < 2) return "";
  var linePath = buildSmoothPath(points);
  return linePath + " L " + points[points.length - 1].x + " " + bottomY + " L " + points[0].x + " " + bottomY + " Z";
}


/* ═══════════════════════════════════════════════════════════════════
 * 1. Progress Line Chart
 * ═══════════════════════════════════════════════════════════════════ */
function ProgressLineChart({ data, milestones }) {
  var [mounted, setMounted] = useState(false);
  var [tooltip, setTooltip] = useState(null);
  var gradId = useUniqueId("lineGrad");
  var fillGradId = useUniqueId("lineFill");
  var svgRef = useRef(null);

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0", color: "var(--dp-text-muted)", fontSize: 13 }}>
        No progress data yet
      </div>
    );
  }

  var W = 340, H = 160, padL = 36, padR = 16, padT = 16, padB = 30;
  var chartW = W - padL - padR;
  var chartH = H - padT - padB;

  var points = data.map(function (d, i) {
    var x = padL + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2);
    var y = padT + chartH - (d.progress / 100) * chartH;
    return { x: x, y: y, progress: d.progress, date: d.date };
  });

  var linePath = buildSmoothPath(points);
  var areaPath = buildAreaPath(points, padT + chartH);
  var totalLen = points.length * 80;

  var gridLines = [0, 25, 50, 75, 100];

  // Format date for axis labels
  var formatAxisDate = function (dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Compute tick positions for x-axis (max 5 ticks)
  var xTicks = [];
  var tickCount = Math.min(5, data.length);
  for (var ti = 0; ti < tickCount; ti++) {
    var idx = Math.round((ti / (tickCount - 1)) * (data.length - 1));
    if (data.length === 1) idx = 0;
    xTicks.push({ x: points[idx].x, label: formatAxisDate(data[idx].date) });
  }

  var handleMouseMove = useCallback(function (e) {
    if (!svgRef.current) return;
    var rect = svgRef.current.getBoundingClientRect();
    var mouseX = ((e.clientX - rect.left) / rect.width) * W;
    // Find closest point
    var closest = null;
    var closestDist = Infinity;
    for (var i = 0; i < points.length; i++) {
      var dist = Math.abs(points[i].x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = points[i];
      }
    }
    if (closest && closestDist < chartW / (data.length || 1)) {
      setTooltip(closest);
    } else {
      setTooltip(null);
    }
  }, [data.length]);

  var handleMouseLeave = useCallback(function () {
    setTooltip(null);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={"0 0 " + W + " " + H}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
        onMouseMove={handleMouseMove}
        onTouchMove={function (e) {
          var touch = e.touches[0];
          if (touch) handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleMouseLeave}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
          <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map(function (v) {
          var y = padT + chartH - (v / 100) * chartH;
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--dp-divider)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--dp-text-muted)" fontFamily="inherit">{v}%</text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {xTicks.map(function (tick, i) {
          return (
            <text key={i} x={tick.x} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--dp-text-muted)" fontFamily="inherit">
              {tick.label}
            </text>
          );
        })}

        {/* Area fill */}
        <path
          d={areaPath}
          fill={"url(#" + fillGradId + ")"}
          opacity={mounted ? 1 : 0}
          style={{ transition: "opacity 0.8s ease" }}
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={"url(#" + gradId + ")"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={totalLen}
          strokeDashoffset={mounted ? 0 : totalLen}
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />

        {/* Data points */}
        {points.map(function (p, i) {
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={tooltip && tooltip.x === p.x ? 5 : 3}
              fill={"url(#" + gradId + ")"}
              stroke="var(--dp-card-bg)"
              strokeWidth="2"
              style={{ transition: "r 0.15s ease" }}
            />
          );
        })}

        {/* Milestone markers */}
        {(milestones || []).map(function (ms, i) {
          // Find the data point closest to this milestone date
          var matchPt = null;
          for (var j = 0; j < data.length; j++) {
            if (data[j].date === ms.date) {
              matchPt = points[j];
              break;
            }
          }
          if (!matchPt) return null;
          return (
            <g key={i}>
              <line x1={matchPt.x} y1={padT} x2={matchPt.x} y2={padT + chartH} stroke="#FCD34D" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
              <text x={matchPt.x} y={padT - 4} textAnchor="middle" fontSize="8" fill="#FCD34D" fontWeight="600" fontFamily="inherit">{ms.label}</text>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <line x1={tooltip.x} y1={padT} x2={tooltip.x} y2={padT + chartH} stroke="var(--dp-accent)" strokeWidth="1" strokeDasharray="3,2" opacity="0.4" />
            <rect
              x={tooltip.x - 36}
              y={tooltip.y - 30}
              width={72}
              height={22}
              rx={6}
              fill="var(--dp-surface)"
              stroke="var(--dp-glass-border)"
              strokeWidth="0.5"
            />
            <text x={tooltip.x} y={tooltip.y - 16} textAnchor="middle" fontSize="10" fill="var(--dp-text)" fontWeight="600" fontFamily="inherit">
              {tooltip.progress}% - {formatAxisDate(tooltip.date)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
 * 2. Task Status Donut Chart
 * ═══════════════════════════════════════════════════════════════════ */
function TaskDonutChart({ stats }) {
  var [mounted, setMounted] = useState(false);

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 100);
    return function () { clearTimeout(timer); };
  }, []);

  if (!stats) return null;

  var total = stats.completed + stats.in_progress + stats.pending + stats.skipped;
  if (total === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0", color: "var(--dp-text-muted)", fontSize: 13 }}>
        No tasks yet
      </div>
    );
  }

  var size = 160;
  var cx = size / 2;
  var cy = size / 2;
  var outerR = 60;
  var innerR = 42;
  var segments = [
    { key: "completed", value: stats.completed },
    { key: "in_progress", value: stats.in_progress },
    { key: "pending", value: stats.pending },
    { key: "skipped", value: stats.skipped },
  ].filter(function (s) { return s.value > 0; });

  // Build arc segments
  var startAngle = -90; // Start from top
  var arcs = [];
  segments.forEach(function (seg) {
    var angle = (seg.value / total) * 360;
    arcs.push({
      key: seg.key,
      value: seg.value,
      startAngle: startAngle,
      endAngle: startAngle + angle,
      color: CHART_COLORS[seg.key],
      label: CHART_LABELS[seg.key],
    });
    startAngle += angle;
  });

  function arcPath(startDeg, endDeg, outerRadius, innerRadius) {
    var startRad = (startDeg * Math.PI) / 180;
    var endRad = (endDeg * Math.PI) / 180;
    var largeArc = endDeg - startDeg > 180 ? 1 : 0;

    var x1 = cx + outerRadius * Math.cos(startRad);
    var y1 = cy + outerRadius * Math.sin(startRad);
    var x2 = cx + outerRadius * Math.cos(endRad);
    var y2 = cy + outerRadius * Math.sin(endRad);
    var x3 = cx + innerRadius * Math.cos(endRad);
    var y3 = cy + innerRadius * Math.sin(endRad);
    var x4 = cx + innerRadius * Math.cos(startRad);
    var y4 = cy + innerRadius * Math.sin(startRad);

    return [
      "M", x1, y1,
      "A", outerRadius, outerRadius, 0, largeArc, 1, x2, y2,
      "L", x3, y3,
      "A", innerRadius, innerRadius, 0, largeArc, 0, x4, y4,
      "Z",
    ].join(" ");
  }

  // Label positions (midpoint of each arc)
  function labelPos(startDeg, endDeg) {
    var midRad = (((startDeg + endDeg) / 2) * Math.PI) / 180;
    var labelR = outerR + 16;
    return {
      x: cx + labelR * Math.cos(midRad),
      y: cy + labelR * Math.sin(midRad),
    };
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
      <svg viewBox={"0 0 " + size + " " + size} width={size} height={size} style={{ display: "block", overflow: "visible" }}>
        {arcs.map(function (arc, i) {
          // For single-segment (100%), draw a full circle
          if (segments.length === 1) {
            return (
              <g key={arc.key}>
                <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={arc.color} strokeWidth={outerR - innerR}
                  strokeDasharray={2 * Math.PI * outerR}
                  strokeDashoffset={mounted ? 0 : 2 * Math.PI * outerR}
                  style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)", transformOrigin: "center" }}
                  transform={"rotate(-90 " + cx + " " + cy + ")"}
                />
                <circle cx={cx} cy={cy} r={innerR} fill="var(--dp-card-bg)" />
              </g>
            );
          }
          return (
            <path
              key={arc.key}
              d={arcPath(arc.startAngle, arc.endAngle, outerR, innerR)}
              fill={arc.color}
              opacity={mounted ? 1 : 0}
              style={{
                transition: "opacity 0.6s ease " + (i * 0.15) + "s",
                transformOrigin: cx + "px " + cy + "px",
              }}
            />
          );
        })}

        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--dp-text)" fontFamily="inherit">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="var(--dp-text-muted)" fontFamily="inherit">
          total
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {arcs.map(function (arc) {
          return (
            <div key={arc.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: arc.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--dp-text-secondary)", minWidth: 72 }}>{arc.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dp-text)" }}>{arc.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
 * 3. Weekly Activity Bar Chart
 * ═══════════════════════════════════════════════════════════════════ */
function WeeklyBarChart({ data }) {
  var [mounted, setMounted] = useState(false);
  var barGradId = useUniqueId("barGrad");

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 150);
    return function () { clearTimeout(timer); };
  }, []);

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0", color: "var(--dp-text-muted)", fontSize: 13 }}>
        No weekly activity yet
      </div>
    );
  }

  var W = 340, H = 140, padL = 30, padR = 10, padT = 10, padB = 30;
  var chartW = W - padL - padR;
  var chartH = H - padT - padB;
  var maxVal = Math.max.apply(null, data.map(function (d) { return d.tasks_completed; }));
  if (maxVal === 0) maxVal = 1;

  var barWidth = Math.min(28, (chartW / data.length) * 0.65);
  var gap = (chartW - barWidth * data.length) / (data.length + 1);

  var bars = data.map(function (d, i) {
    var x = padL + gap + i * (barWidth + gap);
    var barH = (d.tasks_completed / maxVal) * chartH;
    var y = padT + chartH - barH;
    return { x: x, y: y, w: barWidth, h: barH, value: d.tasks_completed, week: d.week };
  });

  // Format week label (e.g., "W01" from "2024-W01")
  var formatWeek = function (weekStr) {
    if (!weekStr) return "";
    var parts = weekStr.split("-");
    return parts.length > 1 ? parts[1] : weekStr;
  };

  // Y-axis grid
  var yTicks = [];
  var tickStep = Math.max(1, Math.ceil(maxVal / 4));
  for (var v = 0; v <= maxVal; v += tickStep) {
    yTicks.push(v);
  }
  if (yTicks[yTicks.length - 1] < maxVal) yTicks.push(maxVal);

  return (
    <svg viewBox={"0 0 " + W + " " + H} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Y-axis grid */}
      {yTicks.map(function (v) {
        var y = padT + chartH - (v / maxVal) * chartH;
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--dp-divider)" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="9" fill="var(--dp-text-muted)" fontFamily="inherit">{v}</text>
          </g>
        );
      })}

      {/* Bars */}
      {bars.map(function (bar, i) {
        return (
          <g key={i}>
            <rect
              x={bar.x}
              y={mounted ? bar.y : padT + chartH}
              width={bar.w}
              height={mounted ? bar.h : 0}
              rx={4}
              fill={"url(#" + barGradId + ")"}
              style={{ transition: "y 0.8s cubic-bezier(0.16, 1, 0.3, 1) " + (i * 0.05) + "s, height 0.8s cubic-bezier(0.16, 1, 0.3, 1) " + (i * 0.05) + "s" }}
            />
            {/* Value label on top */}
            {bar.value > 0 && (
              <text
                x={bar.x + bar.w / 2}
                y={bar.y - 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="var(--dp-accent)"
                fontFamily="inherit"
                opacity={mounted ? 1 : 0}
                style={{ transition: "opacity 0.5s ease " + (0.3 + i * 0.05) + "s" }}
              >
                {bar.value}
              </text>
            )}
            {/* X-axis label */}
            <text x={bar.x + bar.w / 2} y={H - 6} textAnchor="middle" fontSize="8" fill="var(--dp-text-muted)" fontFamily="inherit">
              {formatWeek(bar.week)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}


/* ═══════════════════════════════════════════════════════════════════
 * 4. Time Range Selector
 * ═══════════════════════════════════════════════════════════════════ */
var TIME_RANGES = [
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "all", label: "All" },
];


/* ═══════════════════════════════════════════════════════════════════
 * Main ProgressCharts Component
 * ═══════════════════════════════════════════════════════════════════ */
export default function ProgressCharts({ analytics, isLoading, onRangeChange, activeRange }) {
  var range = activeRange || "all";

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[1, 2, 3].map(function (i) {
          return (
            <div key={i} style={{
              height: 120, borderRadius: 16,
              background: "var(--dp-surface)",
              animation: "dpPulse 1.5s ease-in-out infinite",
            }} />
          );
        })}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "var(--dp-text-muted)", fontSize: 13 }}>
        Analytics data unavailable
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Time Range Selector */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <PillTabs
          tabs={TIME_RANGES}
          active={range}
          onChange={function (key) { if (onRangeChange) onRangeChange(key); }}
          size="sm"
        />
      </div>

      {/* Progress Line Chart */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>Progress Over Time</span>
          {analytics.progress_history && analytics.progress_history.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
              {analytics.progress_history.length} data points
            </span>
          )}
        </div>
        <div style={{
          background: "var(--dp-surface)",
          borderRadius: 16,
          padding: "16px 12px 10px",
          border: "1px solid var(--dp-glass-border)",
        }}>
          <ProgressLineChart data={analytics.progress_history} milestones={analytics.milestones} />
        </div>
      </div>

      {/* Task Status Donut */}
      <div>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>Task Breakdown</span>
        </div>
        <div style={{
          background: "var(--dp-surface)",
          borderRadius: 16,
          padding: 20,
          border: "1px solid var(--dp-glass-border)",
        }}>
          <TaskDonutChart stats={analytics.task_stats} />
        </div>
      </div>

      {/* Weekly Activity */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>Weekly Activity</span>
          {analytics.weekly_activity && analytics.weekly_activity.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
              {analytics.weekly_activity.reduce(function (s, w) { return s + w.tasks_completed; }, 0)} tasks total
            </span>
          )}
        </div>
        <div style={{
          background: "var(--dp-surface)",
          borderRadius: 16,
          padding: "16px 12px 10px",
          border: "1px solid var(--dp-glass-border)",
        }}>
          <WeeklyBarChart data={analytics.weekly_activity} />
        </div>
      </div>

      {/* Category Breakdown (simple horizontal bars) */}
      {analytics.category_breakdown && Object.keys(analytics.category_breakdown).length > 0 && (
        <div>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>Category Breakdown</span>
          </div>
          <div style={{
            background: "var(--dp-surface)",
            borderRadius: 16,
            padding: 16,
            border: "1px solid var(--dp-glass-border)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}>
            {Object.entries(analytics.category_breakdown).map(function (entry) {
              var cat = entry[0];
              var pct = entry[1];
              var catColors = {
                career: "#8B5CF6",
                health: "#10B981",
                personal: "#6366F1",
                finance: "#FCD34D",
                hobbies: "#EC4899",
                relationships: "#14B8A6",
                education: "#3B82F6",
                creative: "#F59E0B",
                social: "#14B8A6",
                travel: "#F97316",
                uncategorized: "#6B7280",
              };
              var color = catColors[cat] || "#8B5CF6";
              return (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--dp-text-secondary)", textTransform: "capitalize" }}>{cat}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text)" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--dp-divider)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      borderRadius: 3,
                      background: color,
                      width: pct + "%",
                      transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Milestones Timeline */}
      {analytics.milestones && analytics.milestones.length > 0 && (
        <div>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>Progress Milestones</span>
          </div>
          <div style={{
            background: "var(--dp-surface)",
            borderRadius: 16,
            padding: 16,
            border: "1px solid var(--dp-glass-border)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            {analytics.milestones.map(function (ms, i) {
              var formatDate = function (d) {
                if (!d) return "";
                return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
              };
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "rgba(252, 211, 77, 0.12)",
                    border: "1px solid rgba(252, 211, 77, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#FCD34D" }}>{ms.label}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)" }}>
                      Reached on {formatDate(ms.date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
