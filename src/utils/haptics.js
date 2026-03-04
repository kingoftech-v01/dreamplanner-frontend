// ─── Haptic Feedback Utilities ────────────────────────────────────
import { hapticImpact, isHapticsEnabled, playHapticPattern } from "../services/native";

export function hapticLight() {
  if (!isHapticsEnabled()) return;
  hapticImpact("Light");
}

export function hapticMedium() {
  if (!isHapticsEnabled()) return;
  hapticImpact("Medium");
}

export function hapticHeavy() {
  if (!isHapticsEnabled()) return;
  hapticImpact("Heavy");
}

// Re-export pattern player for convenience
export { playHapticPattern };
