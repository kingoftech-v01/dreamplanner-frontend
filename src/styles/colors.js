/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Centralized Color Definitions
 *
 * Single source of truth for all JS-side colors.
 * Theme-dependent colors that can be CSS variables live in globals.css.
 * This file is for: brand palette, category maps, gradients, helpers.
 * ═══════════════════════════════════════════════════════════════════ */

// ─── Brand Palette (static, theme-independent) ──────────────────
export var BRAND = {
  purple: "#8B5CF6",
  purpleLight: "#C4B5FD",
  purpleDark: "#7C3AED",
  purpleDeep: "#6D28D9",
  teal: "#14B8A6",
  tealLight: "#5EEAD4",
  tealDark: "#0D9488",
  green: "#5DE5A8",
  greenSolid: "#10B981",
  greenDark: "#059669",
  greenAction: "#22C55E",
  greenActionDark: "#16A34A",
  red: "#F69A9A",
  redSolid: "#EF4444",
  redDark: "#DC2626",
  yellow: "#FCD34D",
  yellowDark: "#B45309",
  pink: "#EC4899",
  pinkDark: "#BE185D",
  indigo: "#6366F1",
  indigoDark: "#4338CA",
  blue: "#3B82F6",
  blueDark: "#2563EB",
  blueLight: "#93C5FD",
  orange: "#F59E0B",
  white: "#ffffff",
  black: "#000000",
  bgDeep: "#03010a",
  bgDark: "#070412",
  bgMid: "#0c081a",
};

// ─── Category Colors (per-theme light/dark variants) ────────────
export var CATEGORIES = {
  career:        { dark: "#C4B5FD", light: "#6D28D9", solid: "#8B5CF6", label: "Career" },
  hobbies:       { dark: "#EC4899", light: "#BE185D", solid: "#EC4899", label: "Hobbies" },
  health:        { dark: "#5DE5A8", light: "#059669", solid: "#10B981", label: "Health" },
  finance:       { dark: "#FCD34D", light: "#B45309", solid: "#FCD34D", label: "Finance" },
  personal:      { dark: "#6366F1", light: "#4338CA", solid: "#6366F1", label: "Growth" },
  relationships: { dark: "#5EEAD4", light: "#0D9488", solid: "#14B8A6", label: "Social" },
};

// Get the right category color for current theme
export function catColor(key, isLight) {
  var cat = CATEGORIES[key];
  if (!cat) return isLight ? "#6D28D9" : "#C4B5FD";
  return isLight ? cat.light : cat.dark;
}

// Get category solid color (theme-independent)
export function catSolid(key) {
  var cat = CATEGORIES[key];
  return cat ? cat.solid : "#8B5CF6";
}

// ─── Dark → Light color conversion map ──────────────────────────
export var LIGHT_MAP = {
  "#C4B5FD": "#6D28D9",
  "#5DE5A8": "#059669",
  "#FCD34D": "#B45309",
  "#F69A9A": "#DC2626",
  "#5EEAD4": "#0D9488",
  "#EC4899": "#BE185D",
  "#93C5FD": "#2563EB",
  "#6366F1": "#4338CA",
  "#8B5CF6": "#7C3AED",
  "#9CA3AF": "#4B5563",
};

// Adapt a dark-mode color for light mode visibility
export function adaptColor(color, isLight) {
  if (!isLight) return color;
  return LIGHT_MAP[color] || color;
}

// ─── Conversation Type Config ───────────────────────────────────
export var CONV_TYPES = {
  general:        { color: "#C4B5FD", bg: "#8B5CF6", label: "AI Coach" },
  dream_creation: { color: "#FCD34D", bg: "#F59E0B", label: "Creation" },
  planning:       { color: "#5DE5A8", bg: "#10B981", label: "Planning" },
  motivation:     { color: "#F69A9A", bg: "#EF4444", label: "Motivation" },
  check_in:       { color: "#93C5FD", bg: "#3B82F6", label: "Check-in" },
  buddy_chat:     { color: "#5EEAD4", bg: "#14B8A6", label: "Buddy" },
};

// ─── Dream Status Colors ────────────────────────────────────────
export var STATUS = {
  active:    "#5DE5A8",
  paused:    "#FCD34D",
  completed: "#C4B5FD",
  archived:  "rgba(255,255,255,0.4)",
};

// ─── Gradients ──────────────────────────────────────────────────
export var GRADIENTS = {
  primary:      "linear-gradient(135deg,#8B5CF6,#7C3AED)",
  primaryDark:  "linear-gradient(135deg,#8B5CF6,#6D28D9)",
  teal:         "linear-gradient(135deg,#14B8A6,#0D9488)",
  danger:       "linear-gradient(135deg,#EF4444,#DC2626)",
  success:      "linear-gradient(135deg,#22C55E,#16A34A)",
  pink:         "linear-gradient(135deg,#F69A9A,#EC4899)",
  xp:           "linear-gradient(90deg,#8B5CF6,#C4B5FD)",
  highProgress: "linear-gradient(90deg,#10B981,#34D399)",
};

// ─── Gradient Shadows (glow matching gradient color) ─────────────
export var GRADIENT_SHADOWS = {
  primary:     "0 4px 16px rgba(139,92,246,0.3)",
  primaryDark: "0 4px 16px rgba(139,92,246,0.3)",
  teal:        "0 4px 16px rgba(20,184,166,0.3)",
  danger:      "0 4px 16px rgba(239,68,68,0.3)",
  success:     "0 4px 16px rgba(34,197,94,0.3)",
  pink:        "0 4px 16px rgba(236,72,153,0.3)",
  fallback:    "0 4px 16px rgba(0,0,0,0.2)",
  badge:       "0 2px 8px rgba(239,68,68,0.5)",
  modal:       "0 20px 60px rgba(0,0,0,0.5)",
};

// ─── Dream Calendar Palette (12 vibrant, distinct colors) ────────
// Used for auto-assigning dream colors on the calendar.
// Each entry: { dark, light } for theme adaptation.
export var DREAM_PALETTE = [
  { dark: "#8B5CF6", light: "#7C3AED" },   // Purple
  { dark: "#14B8A6", light: "#0D9488" },   // Teal
  { dark: "#F59E0B", light: "#D97706" },   // Amber
  { dark: "#EC4899", light: "#BE185D" },   // Pink
  { dark: "#3B82F6", light: "#2563EB" },   // Blue
  { dark: "#10B981", light: "#059669" },   // Emerald
  { dark: "#EF4444", light: "#DC2626" },   // Red
  { dark: "#6366F1", light: "#4338CA" },   // Indigo
  { dark: "#F97316", light: "#EA580C" },   // Orange
  { dark: "#06B6D4", light: "#0891B2" },   // Cyan
  { dark: "#A855F7", light: "#9333EA" },   // Violet
  { dark: "#84CC16", light: "#65A30D" },   // Lime
  { dark: "#E879F9", light: "#C026D3" },   // Fuchsia
  { dark: "#FB923C", light: "#C2410C" },   // Tangerine
];

// ─── Contact / Avatar color cycle ───────────────────────────────
export var CONTACT_COLORS = ["#14B8A6", "#EC4899", "#F59E0B", "#6366F1", "#10B981", "#8B5CF6", "#EF4444"];
