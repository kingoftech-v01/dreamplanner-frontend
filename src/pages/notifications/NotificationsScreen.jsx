import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import PageLayout from "../../components/shared/PageLayout";
import { MOCK_NOTIFICATIONS } from "../../data/mockData";

const TYPE_COLORS = {
  dream_progress: "#8B5CF6",
  friend_request: "#14B8A6",
  achievement: "#FCD34D",
  buddy: "#10B981",
  reminder: "#3B82F6",
  social: "#EC4899",
  system: "#6366F1",
};

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "dreams", label: "Dreams", types: ["dream_progress", "reminder"] },
  { id: "social", label: "Social", types: ["friend_request", "buddy", "social"] },
  { id: "system", label: "System", types: ["system", "achievement"] },
];

const DATE_SECTIONS = [
  { label: "Today", filter: (t) => t.includes("min") || t.includes("hour") },
  { label: "Yesterday", filter: (t) => t === "1 day ago" },
  { label: "This Week", filter: (t) => t.includes("day") && t !== "1 day ago" && parseInt(t) <= 6 },
  { label: "Earlier", filter: (t) => !t.includes("min") && !t.includes("hour") && !(t.includes("day") && parseInt(t) <= 6) },
];

const glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [dismissed, setDismissed] = useState(new Set());
  const [swipeState, setSwipeState] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { localStorage.setItem("dp-unread-notifs", "0"); } catch {}
  };

  const handleDismiss = (id) => {
    setSwipeState((prev) => ({ ...prev, [id]: "dismissing" }));
    setTimeout(() => {
      setDismissed((prev) => {
        const next = new Set([...prev, id]);
        // Sync unread count to localStorage
        const remaining = notifications.filter((n) => !n.read && !next.has(n.id)).length;
        try { localStorage.setItem("dp-unread-notifs", String(remaining)); } catch {}
        return next;
      });
    }, 300);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (dismissed.has(n.id)) return false;
    if (activeFilter === "all") return true;
    const tab = FILTER_TABS.find((t) => t.id === activeFilter);
    return tab?.types?.includes(n.type);
  });

  const unreadCount = notifications.filter((n) => !n.read && !dismissed.has(n.id)).length;

  const getSections = () => {
    const sections = [];
    DATE_SECTIONS.forEach((section) => {
      const items = filteredNotifications.filter((n) => section.filter(n.time));
      if (items.length > 0) {
        sections.push({ label: section.label, items });
      }
    });
    return sections;
  };

  const sections = getSections();
  let globalIndex = 0;

  return (
    <PageLayout>
      <style>{`
        @keyframes slideDismiss {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 16, paddingBottom: 12,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
              fontFamily: "Inter, sans-serif", margin: 0,
            }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span style={{
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                color: "#fff", fontSize: 11, fontWeight: 700,
                fontFamily: "Inter, sans-serif",
                padding: "2px 8px", borderRadius: 10,
                minWidth: 20, textAlign: "center",
              }}>
                {unreadCount}
              </span>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 12px", borderRadius: 10,
            }}
          >
            <CheckCheck size={16} color={isLight ? "#6D28D9" : "#8B5CF6"} />
            <span style={{
              fontSize: 12, fontWeight: 600, color: isLight ? "#6D28D9" : "#8B5CF6",
              fontFamily: "Inter, sans-serif",
            }}>
              Mark All Read
            </span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 20,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s",
      }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            style={{
              padding: "8px 16px", borderRadius: 12, flex: 1,
              background: activeFilter === tab.id
                ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                : "var(--dp-glass-bg)",
              border: activeFilter === tab.id
                ? "1px solid rgba(139,92,246,0.3)"
                : "1px solid var(--dp-input-border)",
              color: activeFilter === tab.id ? "#fff" : "var(--dp-text-tertiary)",
              fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif",
              cursor: "pointer", transition: "all 0.25s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification Sections */}
      {sections.length > 0 ? (
        sections.map((section) => (
          <div key={section.label} style={{ marginBottom: 24 }}>
            {/* Section header */}
            <div style={{
              fontSize: 13, fontWeight: 600, color: "var(--dp-text-muted)",
              fontFamily: "Inter, sans-serif", marginBottom: 10,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              {section.label}
            </div>

            {/* Notification cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((notification) => {
                const itemIndex = globalIndex++;
                const isDismissing = swipeState[notification.id] === "dismissing";
                const typeColor = TYPE_COLORS[notification.type] || "#8B5CF6";

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleDismiss(notification.id)}
                    style={{
                      ...glassStyle,
                      borderRadius: 16,
                      padding: "14px 16px",
                      display: "flex", alignItems: "flex-start", gap: 12,
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                      background: notification.read
                        ? "var(--dp-glass-bg)"
                        : "var(--dp-glass-bg)",
                      border: notification.read
                        ? "1px solid var(--dp-glass-border)"
                        : "1px solid var(--dp-surface-hover)",
                      transition: "all 0.3s ease",
                      opacity: mounted && !isDismissing ? 1 : 0,
                      transform: isDismissing
                        ? "translateX(100%)"
                        : mounted
                        ? "translateX(0)"
                        : "translateY(15px)",
                      transitionDelay: isDismissing ? "0s" : `${0.15 + itemIndex * 0.05}s`,
                    }}
                  >
                    {/* Unread dot */}
                    {!notification.read && (
                      <div style={{
                        position: "absolute", left: 0, top: "50%",
                        transform: "translateY(-50%)",
                        width: 3, height: 24, borderRadius: "0 3px 3px 0",
                        background: "#3B82F6",
                        boxShadow: "0 0 8px rgba(59,130,246,0.5)",
                      }} />
                    )}

                    {/* Icon circle */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                      background: `${typeColor}15`,
                      border: `1px solid ${typeColor}25`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20,
                    }}>
                      {notification.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        color: notification.read ? "var(--dp-text-secondary)" : "var(--dp-text)",
                        fontFamily: "Inter, sans-serif", marginBottom: 3,
                      }}>
                        {notification.title}
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: notification.read ? "var(--dp-text-muted)" : "var(--dp-text-secondary)",
                        fontFamily: "Inter, sans-serif", lineHeight: 1.4,
                      }}>
                        {notification.message}
                      </div>
                      <div style={{
                        fontSize: 11, color: "var(--dp-text-muted)",
                        fontFamily: "Inter, sans-serif", marginTop: 6,
                      }}>
                        {notification.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        /* Empty state */
        <div style={{
          textAlign: "center", padding: "80px 20px",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.5s ease 0.3s",
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: "var(--dp-glass-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <Bell size={36} color="var(--dp-text-muted)" />
          </div>
          <div style={{
            fontSize: 18, fontWeight: 700, color: "var(--dp-text-secondary)",
            fontFamily: "Inter, sans-serif", marginBottom: 8,
          }}>
            All caught up!
          </div>
          <div style={{
            fontSize: 14, color: "var(--dp-text-muted)",
            fontFamily: "Inter, sans-serif",
          }}>
            You have no new notifications
          </div>
        </div>
      )}

      {/* Bottom spacer */}
      <div style={{ height: 32 }} />
    </PageLayout>
  );
}
