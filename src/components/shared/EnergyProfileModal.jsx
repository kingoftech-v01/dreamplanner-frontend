import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "../../services/api";
import { USERS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { BRAND } from "../../styles/colors";
import GlassModal from "./GlassModal";
import GradientButton from "./GradientButton";
import { Zap, Sun, Moon, Minus, Check } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * EnergyProfileModal
 * Visual timeline (6 AM - 11 PM) for marking peak / low-energy hours.
 * 3 preset patterns + custom mode with tappable hour blocks.
 * ═══════════════════════════════════════════════════════════════════ */

var TIMELINE_START = 6;
var TIMELINE_END = 23;

var PRESETS = {
  morning_person: {
    label: "Morning Person",
    icon: Sun,
    peak_hours: [{ start: 7, end: 12 }],
    low_energy_hours: [{ start: 14, end: 16 }],
  },
  night_owl: {
    label: "Night Owl",
    icon: Moon,
    peak_hours: [{ start: 18, end: 23 }],
    low_energy_hours: [{ start: 7, end: 10 }],
  },
  steady: {
    label: "Steady",
    icon: Minus,
    peak_hours: [{ start: 9, end: 12 }, { start: 14, end: 17 }],
    low_energy_hours: [],
  },
};

function formatHourLabel(h) {
  if (h === 0) return "12a";
  if (h < 12) return h + "a";
  if (h === 12) return "12p";
  return (h - 12) + "p";
}

function hoursToSet(ranges) {
  var s = {};
  (ranges || []).forEach(function (r) {
    for (var h = r.start; h < r.end; h++) {
      s[h] = true;
    }
  });
  return s;
}

function setToRanges(hourSet) {
  var sorted = Object.keys(hourSet).map(Number).sort(function (a, b) { return a - b; });
  if (sorted.length === 0) return [];
  var ranges = [];
  var start = sorted[0];
  var prev = sorted[0];
  for (var i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push({ start: start, end: prev + 1 });
      start = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push({ start: start, end: prev + 1 });
  return ranges;
}

export default function EnergyProfileModal({ open, onClose }) {
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();

  var profileQuery = useQuery({
    queryKey: ["energy-profile"],
    queryFn: function () { return apiGet(USERS.ENERGY_PROFILE); },
    enabled: open,
    staleTime: 60000,
  });

  var [pattern, setPattern] = useState("steady");
  var [peakSet, setPeakSet] = useState({});
  var [lowSet, setLowSet] = useState({});
  var [mode, setMode] = useState("presets"); // "presets" | "custom"

  // Populate from server data
  useEffect(function () {
    if (!profileQuery.data) return;
    var ep = profileQuery.data.energy_profile || {};
    var pat = ep.energy_pattern || "steady";
    setPattern(pat);
    setPeakSet(hoursToSet(ep.peak_hours));
    setLowSet(hoursToSet(ep.low_energy_hours));
    // If the profile doesn't match any preset, switch to custom mode
    var isPreset = Object.keys(PRESETS).some(function (k) {
      var p = PRESETS[k];
      return JSON.stringify(p.peak_hours) === JSON.stringify(ep.peak_hours || []) &&
             JSON.stringify(p.low_energy_hours) === JSON.stringify(ep.low_energy_hours || []);
    });
    setMode(isPreset || !ep.peak_hours || ep.peak_hours.length === 0 ? "presets" : "custom");
  }, [profileQuery.data]);

  var saveMut = useMutation({
    mutationFn: function (body) { return apiPut(USERS.ENERGY_PROFILE, body); },
    onSuccess: function () {
      showToast("Energy profile saved", "success");
      queryClient.invalidateQueries({ queryKey: ["energy-profile"] });
      onClose();
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to save", "error");
    },
  });

  var handlePreset = function (key) {
    var p = PRESETS[key];
    setPattern(key);
    setPeakSet(hoursToSet(p.peak_hours));
    setLowSet(hoursToSet(p.low_energy_hours));
    setMode("presets");
  };

  var handleHourClick = function (h) {
    // Cycle: neutral -> peak -> low -> neutral
    var newPeak = Object.assign({}, peakSet);
    var newLow = Object.assign({}, lowSet);
    if (newPeak[h]) {
      delete newPeak[h];
      newLow[h] = true;
    } else if (newLow[h]) {
      delete newLow[h];
    } else {
      newPeak[h] = true;
    }
    setPeakSet(newPeak);
    setLowSet(newLow);
    setMode("custom");
  };

  var handleSave = function () {
    saveMut.mutate({
      peak_hours: setToRanges(peakSet),
      low_energy_hours: setToRanges(lowSet),
      energy_pattern: pattern,
    });
  };

  // ── Styles ──
  var cardBg = isLight ? "rgba(255,255,255,0.85)" : "rgba(20,15,40,0.85)";
  var textPrimary = isLight ? "#1A1535" : "#ffffff";
  var textMuted = isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.45)";
  var borderColor = isLight ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.08)";

  var hours = [];
  for (var h = TIMELINE_START; h <= TIMELINE_END; h++) hours.push(h);

  return (
    <GlassModal open={open} onClose={onClose} title="Energy Profile" maxWidth={520}>
      <div style={{ padding: "0 4px 8px" }}>
        {/* Description */}
        <p style={{ fontSize: 13, color: textMuted, marginBottom: 16, lineHeight: 1.5 }}>
          Tell us when you feel most energized. Hard tasks will be scheduled
          during your peak hours and lighter tasks during low-energy times.
        </p>

        {/* Preset buttons */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: textMuted, marginBottom: 8 }}>Presets</div>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.keys(PRESETS).map(function (key) {
              var p = PRESETS[key];
              var Icon = p.icon;
              var isActive = mode === "presets" && pattern === key;
              return (
                <button key={key} onClick={function () { handlePreset(key); }} style={{
                  flex: 1,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "12px 8px",
                  borderRadius: 12,
                  border: isActive ? "2px solid " + BRAND.purple : "1px solid " + borderColor,
                  background: isActive ? (isLight ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.15)") : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}>
                  <Icon size={20} color={isActive ? BRAND.purple : textMuted} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? BRAND.purple : textPrimary }}>{p.label}</span>
                  {isActive && <Check size={14} color={BRAND.purple} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: textMuted }}>
            {mode === "custom" ? "Custom (tap hours to cycle)" : "Timeline Preview"}
          </div>
          {mode !== "custom" && (
            <button onClick={function () { setMode("custom"); }} style={{
              fontSize: 11, fontWeight: 600, color: BRAND.purple,
              background: "transparent", border: "none", cursor: "pointer", padding: "4px 8px",
            }}>
              Customize
            </button>
          )}
        </div>

        {/* Visual timeline */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(" + hours.length + ", 1fr)",
          gap: 2,
          marginBottom: 8,
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid " + borderColor,
        }}>
          {hours.map(function (hour) {
            var isPeak = !!peakSet[hour];
            var isLow = !!lowSet[hour];
            var bg = "transparent";
            var label = "";
            if (isPeak) {
              bg = isLight ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.3)";
              label = "Peak";
            } else if (isLow) {
              bg = isLight ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.3)";
              label = "Low";
            }
            return (
              <div key={hour} onClick={mode === "custom" ? function () { handleHourClick(hour); } : undefined}
                title={formatHourLabel(hour) + (label ? " - " + label : "")}
                style={{
                  height: 40,
                  background: bg,
                  cursor: mode === "custom" ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                  borderRight: hour < TIMELINE_END ? "1px solid " + borderColor : "none",
                  position: "relative",
                }}>
                {isPeak && <Zap size={12} color={BRAND.greenSolid} strokeWidth={2.5} />}
                {isLow && <Moon size={10} color={BRAND.orange} strokeWidth={2} />}
              </div>
            );
          })}
        </div>

        {/* Hour labels */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(" + hours.length + ", 1fr)",
          gap: 2,
          marginBottom: 16,
        }}>
          {hours.map(function (hour) {
            var show = hour % 3 === 0 || hour === TIMELINE_START;
            return (
              <div key={hour} style={{
                fontSize: 9,
                color: textMuted,
                textAlign: "center",
                fontWeight: 500,
              }}>
                {show ? formatHourLabel(hour) : ""}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(34,197,94,0.35)" }} />
            <span style={{ fontSize: 11, color: textMuted }}>Peak Energy</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: "rgba(245,158,11,0.35)" }} />
            <span style={{ fontSize: 11, color: textMuted }}>Low Energy</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: "transparent", border: "1px solid " + borderColor }} />
            <span style={{ fontSize: 11, color: textMuted }}>Neutral</span>
          </div>
        </div>

        {/* Save button */}
        <GradientButton onClick={handleSave} disabled={saveMut.isPending} style={{ width: "100%" }}>
          {saveMut.isPending ? "Saving..." : "Save Energy Profile"}
        </GradientButton>
      </div>
    </GlassModal>
  );
}
