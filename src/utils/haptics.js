// ─── Haptic Feedback Utilities ────────────────────────────────────
import { hapticImpact } from "../services/native";

export function hapticLight() {
  hapticImpact("Light");
}

export function hapticMedium() {
  hapticImpact("Medium");
}

export function hapticHeavy() {
  hapticImpact("Heavy");
}
