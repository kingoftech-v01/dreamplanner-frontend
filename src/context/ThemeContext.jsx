/* ═══════════════════════════════════════════════════════════════════
 * Unified ThemeProvider — Multi-theme system
 *
 * Supports "cosmos" (dark cosmic space) and "default" (Twilight
 * day/night sky). Extensible for future themes.
 *
 * Accent color system: user-selectable accent color that updates
 * CSS custom properties (--dp-accent, --dp-accent-soft, --dp-accent-glow).
 *
 * Backward-compatible: { theme, resolved, setTheme } still work.
 * ═══════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { COSMOS_TOKENS, computeTwilightTokens } from "./themeTokens";
import {
  getRealTimeSun, getGraceType,
  useTwilightClock, useCinematicSpectacle,
} from "./twilightEngine";

var ThemeContext = createContext(null);

var DEFAULT_ACCENT = "#8B5CF6";

// ─── Accent Color Presets ────────────────────────────────────────
export var ACCENT_PRESETS = [
  { name: "Purple",  color: "#8B5CF6" },
  { name: "Blue",    color: "#3B82F6" },
  { name: "Teal",    color: "#14B8A6" },
  { name: "Green",   color: "#10B981" },
  { name: "Pink",    color: "#EC4899" },
  { name: "Red",     color: "#EF4444" },
  { name: "Orange",  color: "#F59E0B" },
  { name: "Indigo",  color: "#6366F1" },
  { name: "Cyan",    color: "#06B6D4" },
  { name: "Rose",    color: "#F43F5E" },
];

// Convert hex to RGB components
function hexToRgb(hex) {
  var result = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
  if (!result) return { r: 139, g: 92, b: 246 }; // fallback to purple
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Apply accent color CSS custom properties to :root
function applyAccentCSS(hex) {
  var rgb = hexToRgb(hex);
  var root = document.documentElement;
  root.style.setProperty("--dp-accent", hex);
  root.style.setProperty("--dp-accent-soft", "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.2)");
  root.style.setProperty("--dp-accent-glow", "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.1)");
  root.style.setProperty("--dp-accent-text", hex);
  root.style.setProperty("--dp-accent-border", "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.25)");
  root.style.setProperty("--dp-pill-active", "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.18)");
  root.style.setProperty("--dp-pill-border-active", "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0.25)");
}

// Migrate old localStorage values to new format
function migrateTheme(stored) {
  if (stored === "cosmos") return "cosmos";
  if (stored === "default") return "default";
  if (stored === "saturn") return "saturn";
  if (stored === "dark") return "cosmos";
  if (stored === "light" || stored === "system") return "default";
  return "cosmos"; // fallback
}

export function ThemeProvider({ children }) {
  // ─── VISUAL THEME SELECTION ─────────────────────────────────
  var [visualTheme, setVisualThemeState] = useState(function () {
    try {
      var stored = localStorage.getItem("dp-theme");
      return migrateTheme(stored);
    } catch { return "cosmos"; }
  });

  var isTwilight = visualTheme === "default";
  var [autoEnabled, setAutoEnabled] = useState(true);

  // ─── ACCENT COLOR ─────────────────────────────────────────
  var [accentColor, setAccentColorState] = useState(function () {
    try {
      return localStorage.getItem("dp-accent-color") || DEFAULT_ACCENT;
    } catch { return DEFAULT_ACCENT; }
  });

  // Apply accent CSS on mount and when accent changes
  useEffect(function () {
    applyAccentCSS(accentColor);
    try { localStorage.setItem("dp-accent-color", accentColor); } catch {}
  }, [accentColor]);

  // Public setter — validates hex and updates state
  var setAccentColor = useCallback(function (color) {
    if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
      setAccentColorState(color);
    }
  }, []);

  // ─── TWILIGHT ENGINE ────────────────────────────────────────
  var clock = useTwilightClock(isTwilight);
  var spectacle = useCinematicSpectacle(isTwilight);

  // Grace window check on mount
  useEffect(function () {
    if (isTwilight && autoEnabled) {
      spectacle.checkGrace(clock.forceModeRef, autoEnabled, clock.setSun);
    }
  }, [isTwilight]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for real-time transitions (every 500ms)
  useEffect(function () {
    if (!isTwilight) return;
    var iv = setInterval(function () {
      spectacle.pollTransitions(
        clock.sunRef, clock.forceModeRef,
        autoEnabled, clock.setSun
      );
    }, 500);
    return function () { clearInterval(iv); };
  }, [isTwilight, autoEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── RESOLVED THEME ─────────────────────────────────────────
  var sun = isTwilight ? clock.sun : 0;
  var isDay = isTwilight ? sun > 0.5 : false;
  var resolved = isDay ? "light" : "dark";

  // Set data-theme attribute for CSS variables + sync Android status bar
  useEffect(function () {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.visualTheme = visualTheme;
    // Re-apply accent after theme switch (CSS variables may reset)
    applyAccentCSS(accentColor);
    if (Capacitor.isNativePlatform()) {
      StatusBar.setBackgroundColor({
        color: resolved === "light" ? "#f0ecff" : "#0F0A1E"
      });
      StatusBar.setStyle({
        style: resolved === "light" ? Style.Light : Style.Dark
      });
    }
  }, [resolved, visualTheme, accentColor]);

  // Persist selection
  useEffect(function () {
    try { localStorage.setItem("dp-theme", visualTheme); } catch {}
  }, [visualTheme]);

  // Persist force mode (day/night/auto)
  useEffect(function () {
    try {
      if (clock.forceMode) localStorage.setItem("dp-force-mode", clock.forceMode);
      else localStorage.removeItem("dp-force-mode");
    } catch {}
  }, [clock.forceMode]);

  // ─── TOKENS ─────────────────────────────────────────────────
  var tokens = isTwilight ? computeTwilightTokens(sun) : COSMOS_TOKENS; // saturn uses same dark tokens as cosmos

  // ─── ACTIONS ────────────────────────────────────────────────
  function setTheme(id) {
    var migrated = migrateTheme(id);
    // When switching themes, cancel any active cinematic
    if (migrated !== visualTheme) {
      spectacle.cancelCinematic();
      clock.setForceMode(null);
    }
    setVisualThemeState(migrated);
  }

  function toggleMode() {
    if (!isTwilight) return;
    spectacle.cancelCinematic();
    if (clock.forceMode === null) {
      clock.setForceMode(clock.sun > 0.5 ? "night" : "day");
    } else {
      clock.setForceMode(null);
    }
  }

  // ─── CONTEXT VALUE ──────────────────────────────────────────
  var value = {
    // Backward-compatible fields
    theme: visualTheme,
    resolved: resolved,
    setTheme: setTheme,

    // New fields
    visualTheme: visualTheme,
    isDay: isDay,
    sun: sun,
    uiOpacity: isTwilight ? spectacle.uiOpacity : 1,

    // Accent color
    accentColor: accentColor,
    setAccentColor: setAccentColor,

    // Twilight controls
    forceMode: isTwilight ? clock.forceMode : null,
    setForceMode: isTwilight ? clock.setForceMode : function () {},
    autoEnabled: autoEnabled,
    setAutoEnabled: setAutoEnabled,
    toggleMode: toggleMode,
    startCinematic: function (type) { spectacle.startCinematic(type, clock.setSun); },
    cancelCinematic: spectacle.cancelCinematic,

    // Refs for TwilightBackground 60fps rendering
    cineRef: spectacle.cineRef,
    sunRef: clock.sunRef,
    forceModeRef: clock.forceModeRef,
    autoRef: useRef(autoEnabled),

    // All theme tokens (spread)
    ...tokens,
  };

  // Keep autoRef in sync
  value.autoRef.current = autoEnabled;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  var ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
