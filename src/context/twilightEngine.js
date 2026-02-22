/* ═══════════════════════════════════════════════════════════════════
 * Twilight Engine — Sun tracking + cinematic spectacle
 *
 * Internal hooks used by ThemeContext.jsx. Not part of public API.
 * ═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import { CINE_FADE_OUT, CINE_SPECTACLE, CINE_FADE_IN } from "./themeTokens";

// ─── REAL TIME SUN ──────────────────────────────────────────────
// 6h00=day(1), 18h00=night(0). Binary, no gradual.
export function getRealTimeSun() {
  var h = new Date().getHours();
  return (h >= 6 && h < 18) ? 1 : 0;
}

// Grace window: 5h55-6h05 or 17h55-18h05
export function isInGraceWindow() {
  var now = new Date();
  var h = now.getHours(), m = now.getMinutes();
  var mins = h * 60 + m;
  return (mins >= 355 && mins <= 365) || (mins >= 1075 && mins <= 1085);
}

export function getGraceType() {
  var now = new Date();
  var mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 355 && mins <= 365) return "sunrise";
  if (mins >= 1075 && mins <= 1085) return "sunset";
  return null;
}

// ─── TWILIGHT CLOCK HOOK ────────────────────────────────────────
// Returns { sun, setSun, sunRef, forceModeRef, forceMode, setForceMode }
export function useTwilightClock(enabled) {
  var [sun, setSun] = useState(function () { return enabled ? getRealTimeSun() : 0; });
  var [forceMode, setForceMode] = useState(function () {
    try { return localStorage.getItem("dp-force-mode") || null; } catch { return null; }
  });
  var sunRef = useRef(enabled ? getRealTimeSun() : 0);
  var forceModeRef = useRef(null);

  useEffect(function () { forceModeRef.current = forceMode; }, [forceMode]);

  // Update sun based on force mode
  useEffect(function () {
    if (!enabled) {
      sunRef.current = 0;
      setSun(0);
      return;
    }
    if (forceMode === "day") { sunRef.current = 1; setSun(1); }
    else if (forceMode === "night") { sunRef.current = 0; setSun(0); }
    else { var s = getRealTimeSun(); sunRef.current = s; setSun(s); }
  }, [enabled, forceMode]);

  return { sun, setSun, sunRef, forceModeRef, forceMode, setForceMode };
}

// ─── CINEMATIC SPECTACLE HOOK ───────────────────────────────────
export function useCinematicSpectacle(enabled) {
  var [uiOpacity, setUiOpacity] = useState(1);
  var transTimer = useRef(null);
  var prevSunState = useRef(getRealTimeSun() > 0.5 ? "day" : "night");
  var graceChecked = useRef(false);

  var cineRef = useRef({
    active: false,
    type: null,
    progress: 0,
    phase: "idle",
    startTime: 0,
  });

  var startCinematic = useCallback(function (type, setSun) {
    var cine = cineRef.current;
    cine.active = true;
    cine.type = type;
    cine.progress = 0;
    cine.phase = "fadeout";
    cine.startTime = 0;
    setUiOpacity(0);

    clearTimeout(transTimer.current);
    transTimer.current = setTimeout(function () {
      cine.phase = "spectacle";
      cine.startTime = 0;

      transTimer.current = setTimeout(function () {
        cine.phase = "fadein";
        var newSun = (type === "sunrise") ? 1 : 0;
        prevSunState.current = newSun > 0.5 ? "day" : "night";
        if (setSun) setSun(newSun);
        setUiOpacity(1);

        transTimer.current = setTimeout(function () {
          cine.active = false;
          cine.phase = "idle";
          cine.progress = 0;
        }, CINE_FADE_IN * 1000);
      }, CINE_SPECTACLE * 1000);
    }, CINE_FADE_OUT * 1000);
  }, []);

  var cancelCinematic = useCallback(function () {
    clearTimeout(transTimer.current);
    cineRef.current.active = false;
    cineRef.current.phase = "idle";
    cineRef.current.progress = 0;
    setUiOpacity(1);
  }, []);

  // Poll for real-time transitions
  var pollTransitions = useCallback(function (sunRef, forceModeRef, autoEnabled, setSun) {
    if (!enabled || !autoEnabled) return;

    var fm = forceModeRef.current;
    var sunV;
    if (fm === "day") sunV = 1;
    else if (fm === "night") sunV = 0;
    else sunV = getRealTimeSun();

    sunRef.current = sunV;

    if (fm === null && !cineRef.current.active) {
      var curState = sunV > 0.5 ? "day" : "night";
      var prev = prevSunState.current;
      if (curState !== prev) {
        var type = curState === "night" ? "sunset" : "sunrise";
        startCinematic(type, setSun);
      } else {
        prevSunState.current = curState;
        setSun(sunV);
      }
    } else if (!cineRef.current.active) {
      setSun(sunV);
    }
  }, [enabled, startCinematic]);

  // Grace window check on mount
  var checkGrace = useCallback(function (forceModeRef, autoEnabled, setSun) {
    if (!graceChecked.current && enabled && autoEnabled && forceModeRef.current === null) {
      graceChecked.current = true;
      var type = getGraceType();
      if (type) startCinematic(type, setSun);
    }
  }, [enabled, startCinematic]);

  return {
    uiOpacity,
    setUiOpacity,
    cineRef,
    startCinematic,
    cancelCinematic,
    pollTransitions,
    checkGrace,
    prevSunState,
  };
}
