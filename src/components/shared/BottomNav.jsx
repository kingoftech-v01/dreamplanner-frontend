import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, CalendarDays, MessageCircle, Users, User } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { hapticLight } from "../../utils/haptics";

const NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar" },
  { icon: MessageCircle, label: "Messages", path: "/conversations" },
  { icon: Users, label: "Social", path: "/social" },
  { icon: User, label: "Profile", path: "/profile" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [pressed, setPressed] = useState(-1);

  const getActiveIndex = () => {
    const path = location.pathname;
    if (path === "/") return 0;
    if (path.startsWith("/calendar")) return 1;
    if (path.startsWith("/conversations") || path.startsWith("/buddy-chat")) return 2;
    if (path.startsWith("/social") || path.startsWith("/find-buddy") || path.startsWith("/leaderboard") || path.startsWith("/friend-requests") || path.startsWith("/search")) return 3;
    if (path.startsWith("/profile") || path.startsWith("/settings") || path.startsWith("/edit-profile")) return 4;
    return -1;
  };

  const activeIndex = getActiveIndex();

  return (
    <>
      <div style={{
        position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)",
        zIndex: 100,
        display: "flex", justifyContent: "center",
        width: "auto",
        maxWidth: 400,
        borderRadius: 28,
        padding: "0",
        background: isLight
          ? "rgba(255,255,255,0.35)"
          : "rgba(15,10,30,0.35)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(139,92,246,0.15)",
        boxShadow: isLight
          ? "0 8px 32px rgba(0,0,0,0.12)"
          : "0 8px 32px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}>
        {/* Top accent gradient line */}
        <div style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)",
        }} />

        <div style={{
          display: "flex", justifyContent: "space-around", alignItems: "center",
          width: "100%", padding: "12px 8px",
        }}>
          {NAV_ITEMS.map((item, i) => {
            const isActive = i === activeIndex;
            const isPressed = i === pressed;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => { hapticLight(); navigate(item.path); }}
                onPointerDown={() => setPressed(i)}
                onPointerUp={() => setPressed(-1)}
                onPointerLeave={() => setPressed(-1)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 6,
                  background: "none", border: "none", cursor: "pointer",
                  padding: "8px 18px",
                  borderRadius: 16,
                  transition: "transform 0.15s ease",
                  transform: isPressed ? "scale(0.85)" : "scale(1)",
                  position: "relative",
                }}
              >
                <Icon
                  size={26}
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{
                    color: isActive ? "#8B5CF6" : (isLight ? "rgba(26,21,53,0.35)" : "rgba(255,255,255,0.35)"),
                    filter: isActive ? "drop-shadow(0 0 8px rgba(139,92,246,0.6))" : "none",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
                {/* Active dot indicator */}
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: isActive ? "#8B5CF6" : "transparent",
                  boxShadow: isActive ? "0 0 8px rgba(139,92,246,0.6)" : "none",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }} />
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ height: 80 }} />
    </>
  );
}
