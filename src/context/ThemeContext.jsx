/* ═══════════════════════════════════════════════════════════════════
 * Unified ThemeProvider — Multi-theme system
 *
 * Supports "cosmos" (dark cosmic space) and "default" (Twilight
 * day/night sky). Extensible for future themes.
 *
 * Backward-compatible: { theme, resolved, setTheme } still work.
 * ═══════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { COSMOS_TOKENS, computeTwilightTokens } from "./themeTokens";
import {
  getRealTimeSun, getGraceType,
  useTwilightClock, useCinematicSpectacle,
} from "./twilightEngine";

var ThemeContext = createContext(null);

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
    if (Capacitor.isNativePlatform()) {
      StatusBar.setBackgroundColor({
        color: resolved === "light" ? "#f0ecff" : "#0F0A1E"
      });
      StatusBar.setStyle({
        style: resolved === "light" ? Style.Light : Style.Dark
      });
    }
  }, [resolved, visualTheme]);

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
