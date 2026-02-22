// ─── Haptic Feedback Utilities ────────────────────────────────────

export function hapticLight() {
  if (navigator.vibrate) navigator.vibrate(10);
}

export function hapticMedium() {
  if (navigator.vibrate) navigator.vibrate(25);
}

export function hapticHeavy() {
  if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
}
