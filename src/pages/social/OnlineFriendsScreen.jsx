import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, User, Circle } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";

const ONLINE_FRIENDS = [
  { id: "l5", name: "Alex Turner", initial: "A", level: 10, status: "Working on Half Marathon training", color: "#14B8A6" },
  { id: "l1", name: "Jade Nguyen", initial: "J", level: 15, status: "Studying Japanese kanji", color: "#EC4899" },
  { id: "om1", name: "Omar Hassan", initial: "O", level: 8, status: "Recording podcast episode 3", color: "#F59E0B" },
  { id: "l3", name: "Lisa Park", initial: "L", level: 12, status: "Budgeting for the month", color: "#8B5CF6" },
  { id: "fr2", name: "Noah Kim", initial: "N", level: 6, status: "Reading 'Atomic Habits'", color: "#3B82F6" },
  { id: "ma1", name: "Maya Rodriguez", initial: "M", level: 9, status: "Sketching new designs", color: "#10B981" },
  { id: "et1", name: "Ethan Brooks", initial: "E", level: 11, status: "Meal prepping for the week", color: "#6366F1" },
  { id: "za1", name: "Zara Ahmed", initial: "Z", level: 13, status: "Reviewing investment portfolio", color: "#EF4444" },
];

const glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

export default function OnlineFriendsScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <PageLayout showNav={true}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        paddingTop: 16, paddingBottom: 16,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <button className="dp-ib" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#5DE5A8",
            boxShadow: "0 0 8px rgba(93,229,168,0.6)",
          }} />
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
            fontFamily: "Inter, sans-serif", margin: 0,
          }}>
            Online Friends
          </h1>
          <span style={{
            background: "linear-gradient(135deg, #10B981, #059669)",
            color: "#fff", fontSize: 11, fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            padding: "2px 8px", borderRadius: 10,
            minWidth: 20, textAlign: "center",
          }}>
            {ONLINE_FRIENDS.length}
          </span>
        </div>
      </div>

      {/* Friends List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ONLINE_FRIENDS.map((friend, index) => (
          <div
            key={friend.id}
            style={{
              ...glassStyle, borderRadius: 16,
              padding: "16px",
              display: "flex", alignItems: "center", gap: 14,
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(15px)",
              transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${0.1 + index * 0.05}s`,
            }}
          >
            {/* Avatar with online indicator */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16,
                background: `${friend.color}18`,
                border: `1px solid ${friend.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: friend.color,
                fontFamily: "Inter, sans-serif",
              }}>
                {friend.initial}
              </div>
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                width: 12, height: 12, borderRadius: "50%",
                background: "#5DE5A8",
                border: isLight ? "2px solid #f0ecff" : "2px solid #0c081a",
                boxShadow: "0 0 6px rgba(93,229,168,0.5)",
              }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{
                  fontSize: 15, fontWeight: 600, color: "var(--dp-text)",
                  fontFamily: "Inter, sans-serif",
                }}>
                  {friend.name}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#8B5CF6",
                  fontFamily: "Inter, sans-serif",
                  padding: "2px 6px", borderRadius: 6,
                  background: "rgba(139,92,246,0.15)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}>
                  Lv.{friend.level}
                </span>
              </div>
              <div style={{
                fontSize: 12, color: "var(--dp-text-muted)",
                fontFamily: "Inter, sans-serif",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {friend.status}
              </div>
            </div>

            {/* Message button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/buddy-chat/${friend.id}`);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 14px", borderRadius: 12,
                background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.1))",
                border: "1px solid rgba(139,92,246,0.25)",
                color: isLight ? "#7C3AED" : "#C4B5FD",
                fontSize: 12, fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                cursor: "pointer", transition: "all 0.25s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.18))";
                e.currentTarget.style.transform = "scale(1.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.1))";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <MessageCircle size={14} />
              Message
            </button>
          </div>
        ))}
      </div>

      {/* Bottom spacer */}
      <div style={{ height: 32 }} />
    </PageLayout>
  );
}
