import BottomNav from "./BottomNav";
import { useTheme } from "../../context/ThemeContext";

export default function PageLayout({ children, header, showNav = true }) {
  var { uiOpacity } = useTheme();
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      {/* Fixed header — stays on top, content scrolls behind with glassmorphism */}
      {header && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100 }}>
          {header}
        </div>
      )}
      <div className={showNav ? "dp-desktop-main" : undefined} style={{
        position: "absolute", inset: 0, zIndex: 1,
        overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        opacity: uiOpacity,
        transition: "opacity 0.3s ease",
      }}>
        <div className="dp-content-area" style={{
          padding: header ? "80px 16px 32px" : "0 16px 32px",
          minHeight: "100%",
        }}>
          {children}
        </div>
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
