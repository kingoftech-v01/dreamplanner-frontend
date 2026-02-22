import BottomNav from "./BottomNav";
import { useTheme } from "../../context/ThemeContext";

export default function PageLayout({ children, showNav = true }) {
  var { uiOpacity } = useTheme();
  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", overflow: "hidden" }}>
      <div style={{
        position: "relative", zIndex: 1, width: "100%", height: "100%",
        overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        opacity: uiOpacity,
        transition: "opacity 0.3s ease",
      }}>
        <div style={{ width: "100%", padding: "0 16px 32px", minHeight: "100%" }}>
          {children}
        </div>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
