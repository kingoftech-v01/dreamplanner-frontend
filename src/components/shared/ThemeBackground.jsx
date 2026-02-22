import { useTheme } from "../../context/ThemeContext";
import CosmicBackground from "./CosmicBackground";
import TwilightBackground from "./TwilightBackground";
import SaturnBackground from "./SaturnBackground";

export default function ThemeBackground() {
  var { visualTheme } = useTheme();
  if (visualTheme === "default") return <TwilightBackground />;
  if (visualTheme === "saturn") return <SaturnBackground />;
  return <CosmicBackground />;
}
