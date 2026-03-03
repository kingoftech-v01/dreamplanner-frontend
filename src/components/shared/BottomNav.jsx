import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, CalendarDays, MessageCircle, Users, User } from "lucide-react";
import { hapticLight } from "../../utils/haptics";
import { BRAND } from "../../styles/colors";

var NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
  { icon: MessageCircle, label: "Messages", path: "/conversations" },
  { icon: Users, label: "Social", path: "/social" },
  { icon: User, label: "Profile", path: "/profile" },
];

export default function BottomNav() {
  var navigate = useNavigate();
  var location = useLocation();
  var [pressed, setPressed] = useState(-1);

  var getActiveIndex = function () {
    var path = location.pathname;
    if (path === "/") return 0;
    if (path.startsWith("/calendar")) return 1;
    if (path.startsWith("/conversations") || path.startsWith("/buddy-chat") || path.startsWith("/calls")) return 2;
    if (path.startsWith("/social") || path.startsWith("/find-buddy") || path.startsWith("/leaderboard") || path.startsWith("/friend-requests") || path.startsWith("/search")) return 3;
    if (path.startsWith("/profile") || path.startsWith("/settings") || path.startsWith("/edit-profile")) return 4;
    return -1;
  };

  var activeIndex = getActiveIndex();

  return (
    <>
      {/* ═══ Desktop Sidebar Navigation ═══ */}
      <nav className="dp-hide-mobile dp-desktop-sidebar" aria-label="Main navigation">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 24px", marginBottom: 8, borderBottom: "1px solid var(--dp-divider)" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Home size={18} color="#fff" strokeWidth={2} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", letterSpacing: "-0.3px" }}>DreamPlanner</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map(function (item, i) {
            var isActive = i === activeIndex;
            var Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={function () { hapticLight(); navigate(item.path); }}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: isActive ? "var(--dp-accent-soft)" : "transparent",
                  border: isActive ? "1px solid var(--dp-accent-border)" : "1px solid transparent",
                  borderRadius: 12, padding: "12px 16px",
                  cursor: "pointer", transition: "all 0.2s",
                  color: isActive ? "var(--dp-accent)" : "var(--dp-text-secondary)",
                  fontFamily: "inherit", width: "100%", textAlign: "left",
                  minHeight: 44,
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ═══ Mobile Bottom Navigation ═══ */}
      <nav className="dp-hide-desktop" aria-label="Main navigation" style={{
        position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)",
        zIndex: 100, display: "flex", justifyContent: "center",
        width: "auto", maxWidth: 400, borderRadius: 28, padding: "0",
        background: "var(--dp-glass-bg)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid var(--dp-glass-border)",
        boxShadow: "0 8px 32px var(--dp-shadow)", overflow: "hidden",
      }}>
        {/* Top accent gradient line */}
        <div aria-hidden="true" style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)",
        }} />

        <div style={{
          display: "flex", justifyContent: "space-around", alignItems: "center",
          width: "100%", padding: "8px 4px",
        }}>
          {NAV_ITEMS.map(function (item, i) {
            var isActive = i === activeIndex;
            var isPressed = i === pressed;
            var Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={function () { hapticLight(); navigate(item.path); }}
                onPointerDown={function () { setPressed(i); }}
                onPointerUp={function () { setPressed(-1); }}
                onPointerLeave={function () { setPressed(-1); }}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 4, background: "none", border: "none", cursor: "pointer",
                  padding: "8px 14px", borderRadius: 16,
                  transition: "transform 0.15s ease",
                  transform: isPressed ? "scale(0.85)" : "scale(1)",
                  position: "relative", minWidth: 44, minHeight: 44,
                }}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                  style={{
                    color: isActive ? BRAND.purple : "var(--dp-nav-inactive)",
                    filter: isActive ? "drop-shadow(0 0 8px rgba(139,92,246,0.6))" : "none",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
                <span style={{
                  fontSize: 10, fontWeight: isActive ? 600 : 500,
                  color: isActive ? BRAND.purple : "var(--dp-nav-label)",
                  transition: "all 0.3s",
                }}>{item.label}</span>
                {/* Active dot */}
                {isActive && (
                  <div aria-hidden="true" style={{
                    position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: "50%",
                    background: BRAND.purple, boxShadow: "0 0 8px rgba(139,92,246,0.6)",
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="dp-hide-desktop" style={{ height: 80 }} />
    </>
  );
}
