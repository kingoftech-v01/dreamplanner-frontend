import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BRAND, adaptColor } from "../../styles/colors";
import GlassCard from "./GlassCard";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — MiniCalendar
 * Compact date-picker widget with event dots, glass morphism styling.
 * Reusable — pass selectedDate, onDateSelect, and events map.
 * ═══════════════════════════════════════════════════════════════════ */

var DAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];
var MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

var CELL = 32;
var GAP = 2;
var WIDTH = 240;

var NOW = new Date();
var TODAY_Y = NOW.getFullYear();
var TODAY_M = NOW.getMonth();
var TODAY_D = NOW.getDate();

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDow(y, m) { var d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function getKey(y, m, d) { return y + "-" + m + "-" + d; }

/* Dot colors for mini indicators — cycle through brand palette */
var DOT_PALETTE = [BRAND.green, BRAND.purpleLight, BRAND.yellow];

export default function MiniCalendar({
  selectedDate,
  onDateSelect,
  events,
  style,
}) {
  /* ── Displayed month (navigable independently) ── */
  var initY = selectedDate ? selectedDate.getFullYear() : TODAY_Y;
  var initM = selectedDate ? selectedDate.getMonth() : TODAY_M;

  var [dispYear, setDispYear] = useState(initY);
  var [dispMonth, setDispMonth] = useState(initM);
  var [fade, setFade] = useState(false);
  var fadeTimer = useRef(null);

  /* Sync displayed month when selectedDate changes externally */
  useEffect(function () {
    if (selectedDate) {
      setDispYear(selectedDate.getFullYear());
      setDispMonth(selectedDate.getMonth());
    }
  }, [selectedDate ? selectedDate.getTime() : null]);

  /* ── Month navigation with fade animation ── */
  var animateNav = function (cb) {
    setFade(true);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(function () {
      cb();
      setFade(false);
    }, 120);
  };

  var prevMonth = function () {
    animateNav(function () {
      if (dispMonth === 0) { setDispMonth(11); setDispYear(dispYear - 1); }
      else setDispMonth(dispMonth - 1);
    });
  };

  var nextMonth = function () {
    animateNav(function () {
      if (dispMonth === 11) { setDispMonth(0); setDispYear(dispYear + 1); }
      else setDispMonth(dispMonth + 1);
    });
  };

  /* ── Build grid cells ── */
  var daysInMonth = getDaysInMonth(dispYear, dispMonth);
  var firstDow = getFirstDow(dispYear, dispMonth);
  var cells = [];
  for (var i = 0; i < firstDow; i++) cells.push(null);
  for (var d = 1; d <= daysInMonth; d++) cells.push(d);

  /* ── Helpers ── */
  var evMap = events || {};

  var isToday = function (day) {
    return day === TODAY_D && dispMonth === TODAY_M && dispYear === TODAY_Y;
  };

  var isSelected = function (day) {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      dispMonth === selectedDate.getMonth() &&
      dispYear === selectedDate.getFullYear()
    );
  };

  var getDotsForDay = function (day) {
    var k = getKey(dispYear, dispMonth, day);
    var entry = evMap[k];
    if (!entry) return [];
    /* Support both array (items) and number (count) */
    if (Array.isArray(entry)) {
      return entry.slice(0, 3).map(function (e, idx) {
        return e.color || DOT_PALETTE[idx % DOT_PALETTE.length];
      });
    }
    if (typeof entry === "number" && entry > 0) {
      var count = Math.min(entry, 3);
      var dots = [];
      for (var j = 0; j < count; j++) dots.push(DOT_PALETTE[j % DOT_PALETTE.length]);
      return dots;
    }
    return [];
  };

  /* ── Styles ── */
  var headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  };

  var navBtnStyle = {
    width: 26,
    height: 26,
    borderRadius: 8,
    border: "1px solid var(--dp-accent-border)",
    background: "var(--dp-surface)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    flexShrink: 0,
    fontFamily: "inherit",
    padding: 0,
    color: "var(--dp-text-secondary)",
  };

  var dayHeaderStyle = {
    textAlign: "center",
    fontSize: 10,
    fontWeight: 600,
    color: "var(--dp-text-muted)",
    lineHeight: CELL + "px",
    userSelect: "none",
  };

  var gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: GAP,
    opacity: fade ? 0 : 1,
    transform: fade ? "scale(0.97)" : "scale(1)",
    transition: "opacity 0.12s ease, transform 0.12s ease",
  };

  var cellBaseStyle = {
    width: CELL,
    height: CELL,
    borderRadius: "50%",
    border: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
    padding: 0,
    position: "relative",
    margin: "0 auto",
  };

  return (
    <GlassCard
      padding={12}
      radius={16}
      style={{
        width: WIDTH,
        maxWidth: "100%",
        border: "1px solid var(--dp-accent-border)",
        ...style,
      }}
    >
      {/* ── Month / Year header ── */}
      <div style={headerStyle}>
        <button
          aria-label="Previous month"
          onClick={prevMonth}
          style={navBtnStyle}
          className="dp-gh"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>

        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--dp-text)",
            userSelect: "none",
          }}
        >
          {MONTH_NAMES[dispMonth]} {dispYear}
        </span>

        <button
          aria-label="Next month"
          onClick={nextMonth}
          style={navBtnStyle}
          className="dp-gh"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Day-of-week headers ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: GAP, marginBottom: 2 }}>
        {DAYS_SHORT.map(function (label, idx) {
          return (
            <div key={idx} style={dayHeaderStyle}>
              {label}
            </div>
          );
        })}
      </div>

      {/* ── Date cells grid ── */}
      <div style={gridStyle}>
        {cells.map(function (day, idx) {
          if (day === null) return <div key={"e" + idx} />;

          var today = isToday(day);
          var sel = isSelected(day);
          var dots = getDotsForDay(day);

          var bg = sel
            ? BRAND.purple
            : today
              ? "transparent"
              : "transparent";

          var outline = today && !sel
            ? "2px solid " + BRAND.greenSolid
            : "none";

          var textColor = sel
            ? BRAND.white
            : today
              ? BRAND.greenSolid
              : "var(--dp-text-primary)";

          var fontWeight = sel || today ? 700 : 400;

          var cellStyle = {
            ...cellBaseStyle,
            background: bg,
            outline: outline,
            outlineOffset: sel ? 0 : -2,
            boxShadow: sel
              ? "0 2px 10px rgba(139, 92, 246, 0.35)"
              : "none",
          };

          return (
            <button
              key={day}
              aria-label={new Date(dispYear, dispMonth, day).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
              onClick={function () {
                if (onDateSelect) {
                  onDateSelect(new Date(dispYear, dispMonth, day));
                }
              }}
              style={cellStyle}
              className="dp-gh"
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: fontWeight,
                  color: textColor,
                  lineHeight: 1,
                }}
              >
                {day}
              </span>

              {/* Event dots */}
              {dots.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 2,
                    position: "absolute",
                    bottom: 2,
                  }}
                >
                  {dots.map(function (color, di) {
                    return (
                      <div
                        key={di}
                        style={{
                          width: 3,
                          height: 3,
                          borderRadius: "50%",
                          background: sel ? "rgba(255,255,255,0.7)" : color,
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
