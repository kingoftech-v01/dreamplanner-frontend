/* ═══════════════════════════════════════════════════════════════════
 * useDreamColorMap — maps each dream to a unique calendar color
 *
 * Takes the user's dreams list and returns a memoized map of
 * dreamId -> { dark, light } color pair. Uses the dream's stored
 * color if set, otherwise auto-assigns from DREAM_PALETTE by index.
 * ═══════════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import { DREAM_PALETTE } from "../styles/colors";

/**
 * Build a color map from a dreams array.
 * @param {Array} dreams — array of dream objects (must have .id, optionally .color)
 * @returns {Object} map of dreamId -> { dark: string, light: string }
 */
export function buildDreamColorMap(dreams) {
  var map = {};
  if (!Array.isArray(dreams)) return map;

  for (var i = 0; i < dreams.length; i++) {
    var dream = dreams[i];
    var id = dream.id;
    if (!id) continue;

    if (dream.color && dream.color.length >= 4) {
      // Dream has a stored color — use it for both themes
      // (the backend stores a single hex, use it as "dark" and darken slightly for light)
      map[id] = { dark: dream.color, light: dream.color };
    } else {
      // Auto-assign from palette by index (cycle if more dreams than colors)
      var paletteEntry = DREAM_PALETTE[i % DREAM_PALETTE.length];
      map[id] = { dark: paletteEntry.dark, light: paletteEntry.light };
    }
  }

  return map;
}

/**
 * React hook — memoized dream color map.
 * @param {Array} dreams — array of dream objects
 * @returns {Object} dreamId -> { dark, light }
 */
export default function useDreamColorMap(dreams) {
  return useMemo(function () {
    return buildDreamColorMap(dreams);
  }, [dreams]);
}
