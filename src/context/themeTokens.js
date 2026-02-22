/* ═══════════════════════════════════════════════════════════════════
 * Theme Tokens — Shared color palettes for all visual themes
 *
 * Each theme produces the same token shape so screens don't care
 * which theme is active.
 * ═══════════════════════════════════════════════════════════════════ */

// ─── COSMOS TOKENS (static dark values) ─────────────────────────
export var COSMOS_TOKENS = {
  cardBg: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.06)",
  cardShadow: "0 4px 24px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.03)",
  cardHoverBg: "rgba(255,255,255,0.07)",
  barBg: "rgba(255,255,255,0.04)",
  barBorder: "rgba(255,255,255,0.06)",
  textPrimary: "rgba(255,255,255,0.95)",
  textSecondary: "rgba(255,255,255,0.78)",
  textTertiary: "rgba(255,255,255,0.68)",
  textLabel: "rgba(255,255,255,0.65)",
  accentColor: "#C4B5FD",
  accentLight: "#C4B5FD",
  trackBg: "rgba(255,255,255,0.08)",
  dividerColor: "rgba(255,255,255,0.08)",
  badgeBg: "rgba(124,58,237,0.18)",
  badgeBorder: "rgba(124,58,237,0.3)",
  badgeText: "#C4B5FD",
  bellBg: "rgba(255,255,255,0.06)",
  bellBorder: "rgba(255,255,255,0.1)",
  bellColor: "#fff",
  bellBadgeBorder: "rgba(255,255,255,0.3)",
};

// ─── TWILIGHT PALETTES (day + night) ────────────────────────────
export var TWILIGHT_DAY = {
  cardBg: "rgba(255,255,255,0.48)",
  cardBorder: "rgba(200,200,220,0.35)",
  cardShadow: "0 4px 24px rgba(0,0,0,0.06),0 1px 3px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.45)",
  cardHoverBg: "rgba(255,255,255,0.58)",
  barBg: "rgba(255,255,255,0.50)",
  barBorder: "rgba(200,200,220,0.35)",
  textPrimary: "rgba(25,30,50,0.95)",
  textSecondary: "rgba(40,50,70,0.78)",
  textTertiary: "rgba(60,70,90,0.65)",
  textLabel: "rgba(80,90,110,0.6)",
  accentColor: "#7C3AED",
  accentLight: "#7C3AED",
  trackBg: "rgba(0,0,0,0.08)",
  dividerColor: "rgba(0,0,0,0.08)",
  badgeBg: "rgba(124,58,237,0.1)",
  badgeBorder: "rgba(124,58,237,0.2)",
  badgeText: "#6D28D9",
  bellBg: "rgba(255,255,255,0.4)",
  bellBorder: "rgba(200,200,220,0.4)",
  bellColor: "#1E293B",
  bellBadgeBorder: "#fff",
};

export var TWILIGHT_NIGHT = {
  cardBg: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.06)",
  cardShadow: "0 4px 24px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.03)",
  cardHoverBg: "rgba(255,255,255,0.07)",
  barBg: "rgba(255,255,255,0.04)",
  barBorder: "rgba(255,255,255,0.06)",
  textPrimary: "rgba(255,255,255,0.95)",
  textSecondary: "rgba(255,255,255,0.78)",
  textTertiary: "rgba(255,255,255,0.68)",
  textLabel: "rgba(255,255,255,0.65)",
  accentColor: "#7C3AED",
  accentLight: "#C4B5FD",
  trackBg: "rgba(255,255,255,0.08)",
  dividerColor: "rgba(255,255,255,0.08)",
  badgeBg: "rgba(124,58,237,0.18)",
  badgeBorder: "rgba(124,58,237,0.3)",
  badgeText: "#C4B5FD",
  bellBg: "rgba(255,255,255,0.06)",
  bellBorder: "rgba(255,255,255,0.1)",
  bellColor: "#fff",
  bellBadgeBorder: "rgba(255,255,255,0.3)",
};

// ─── SUNSET/SUNRISE COLOR PALETTES ──────────────────────────────
// 5 keyframes each: [R,G,B] for top, mid, bottom of sky gradient
export var SUNSET_TOP = [[70,140,210],[120,90,60],[180,80,100],[80,40,120],[3,13,31]];
export var SUNSET_MID = [[120,185,240],[220,150,80],[240,120,140],[100,50,150],[14,45,104]];
export var SUNSET_BOT = [[190,225,250],[255,180,100],[255,150,130],[140,80,170],[80,144,197]];
export var SUNRISE_TOP = [[3,13,31],[60,30,100],[160,70,90],[130,100,60],[70,140,210]];
export var SUNRISE_MID = [[14,45,104],[80,40,130],[230,110,130],[230,160,80],[120,185,240]];
export var SUNRISE_BOT = [[80,144,197],[120,60,150],[250,140,120],[255,190,110],[190,225,250]];

// ─── CINEMATIC TIMING ───────────────────────────────────────────
export var CINE_FADE_OUT = 2.5;
export var CINE_SPECTACLE = 6;
export var CINE_FADE_IN = 2.5;

// ─── UTILITIES ──────────────────────────────────────────────────
export function mix(a, b, t) { return a + (b - a) * t; }
export function lerpC(c1, c2, t) { return [mix(c1[0],c2[0],t), mix(c1[1],c2[1],t), mix(c1[2],c2[2],t)]; }

export function samplePalette(pal, t) {
  var n = pal.length - 1;
  var i = Math.min(Math.floor(t * n), n - 1);
  var f = (t * n) - i;
  return lerpC(pal[i], pal[Math.min(i + 1, n)], f);
}

// Compute Twilight tokens based on sun position (0-1)
export function computeTwilightTokens(sun) {
  function step(lo, hi) { if (sun <= lo) return 0; if (sun >= hi) return 1; return (sun - lo) / (hi - lo); }
  var cardT = step(0.37, 0.40);
  var textT = step(0.49, 0.51);

  return {
    cardBg: cardT > 0.5 ? TWILIGHT_DAY.cardBg : TWILIGHT_NIGHT.cardBg,
    cardBorder: cardT > 0.5 ? TWILIGHT_DAY.cardBorder : TWILIGHT_NIGHT.cardBorder,
    cardShadow: cardT > 0.5 ? TWILIGHT_DAY.cardShadow : TWILIGHT_NIGHT.cardShadow,
    cardHoverBg: cardT > 0.5 ? TWILIGHT_DAY.cardHoverBg : TWILIGHT_NIGHT.cardHoverBg,
    barBg: cardT > 0.5 ? TWILIGHT_DAY.barBg : TWILIGHT_NIGHT.barBg,
    barBorder: cardT > 0.5 ? TWILIGHT_DAY.barBorder : TWILIGHT_NIGHT.barBorder,
    textPrimary: textT > 0.5 ? TWILIGHT_DAY.textPrimary : TWILIGHT_NIGHT.textPrimary,
    textSecondary: textT > 0.5 ? TWILIGHT_DAY.textSecondary : TWILIGHT_NIGHT.textSecondary,
    textTertiary: textT > 0.5 ? TWILIGHT_DAY.textTertiary : TWILIGHT_NIGHT.textTertiary,
    textLabel: textT > 0.5 ? TWILIGHT_DAY.textLabel : TWILIGHT_NIGHT.textLabel,
    accentColor: "#7C3AED",
    accentLight: textT > 0.5 ? "#7C3AED" : "#C4B5FD",
    trackBg: cardT > 0.5 ? TWILIGHT_DAY.trackBg : TWILIGHT_NIGHT.trackBg,
    dividerColor: cardT > 0.5 ? TWILIGHT_DAY.dividerColor : TWILIGHT_NIGHT.dividerColor,
    badgeBg: textT > 0.5 ? TWILIGHT_DAY.badgeBg : TWILIGHT_NIGHT.badgeBg,
    badgeBorder: textT > 0.5 ? TWILIGHT_DAY.badgeBorder : TWILIGHT_NIGHT.badgeBorder,
    badgeText: textT > 0.5 ? TWILIGHT_DAY.badgeText : TWILIGHT_NIGHT.badgeText,
    bellBg: cardT > 0.5 ? TWILIGHT_DAY.bellBg : TWILIGHT_NIGHT.bellBg,
    bellBorder: cardT > 0.5 ? TWILIGHT_DAY.bellBorder : TWILIGHT_NIGHT.bellBorder,
    bellColor: textT > 0.5 ? TWILIGHT_DAY.bellColor : TWILIGHT_NIGHT.bellColor,
    bellBadgeBorder: cardT > 0.5 ? TWILIGHT_DAY.bellBadgeBorder : TWILIGHT_NIGHT.bellBadgeBorder,
  };
}
