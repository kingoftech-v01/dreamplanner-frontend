import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../../services/api";
import useInfiniteList from "../../hooks/useInfiniteList";
import { ArrowLeft, Bell, CheckCheck, Star, Users, Target, Clock, Zap, MessageCircle, Shield } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";

const TYPE_COLORS = {
  dream_progress: "#8B5CF6",
  friend_request: "#14B8A6",
  achievement: "#FCD34D",
  buddy: "#10B981",
  reminder: "#3B82F6",
  social: "#EC4899",
  system: "#6366F1",
};

var TYPE_ICONS = {
  dream_progress: Target,
  friend_request: Users,
  achievement: Star,
  buddy: MessageCircle,
  reminder: Clock,
  social: Users,
  system: Zap,
};

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "dreams", label: "Dreams", types: ["dream_progress", "reminder"] },
  { id: "social", label: "Social", types: ["friend_request", "buddy", "social"] },
  { id: "system", label: "System", types: ["system", "achievement"] },
];

function relativeTime(dateStr) {
  if (!dateStr) return "";
  var now = Date.now();
  var then = new Date(dateStr).getTime();
  var diffMs = now - then;
  if (diffMs < 0) return "just now";
  var mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " min ago";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + " hour" + (hours > 1 ? "s" : "") + " ago";
  var days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return days + " days ago";
  var months = Math.floor(days / 30);
  return months + " month" + (months > 1 ? "s" : "") + " ago";
}

const DATE_SECTIONS = [
  { label: "Today", filter: function (t) { return t.includes("min") || t.includes("hour") || t === "just now"; } },
  { label: "Yesterday", filter: function (t) { return t === "1 day ago"; } },
  { label: "This Week", filter: function (t) { return t.includes("day") && t !== "1 day ago" && parseInt(t) <= 6; } },
  { label: "Earlier", filter: function (t) { return !t.includes("min") && !t.includes("hour") && t !== "just now" && !(t.includes("day") && parseInt(t) <= 6); } },
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
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [dismissed, setDismissed] = useState(new Set());
  const [swipeState, setSwipeState] = useState({});

  var notifsInf = useInfiniteList({ queryKey: ["notifications"], url: "/api/notifications/", limit: 30 });
  var notifications = (notifsInf.items || []).map(function (n) {
    return {
      id: n.id,
      type: n.notificationType || n.type || "system",
      title: n.title || "",
      message: n.body || n.message || "",
      read: n.isRead != null ? n.isRead : (n.read != null ? n.read : (n.readAt != null)),
      time: relativeTime(n.createdAt || n.created_at),
      data: n.data,
    };
  });

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  useEffect(function () {
    if (notifsInf.isError) {
      showToast(
        (notifsInf.error && notifsInf.error.message) || "Failed to load notifications",
        "error"
      );
    }
  }, [notifsInf.isError]);

  var markAllReadMutation = useMutation({
    mutationFn: function () { return apiPost("/api/notifications/mark_all_read/"); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
    },
    onError: function (err) { showToast(err.message || "Failed to mark all read", "error"); },
  });

  var handleMarkAllRead = function () {
    markAllReadMutation.mutate();
  };

  var markReadMutation = useMutation({
    mutationFn: function (id) { return apiPost("/api/notifications/" + id + "/mark_read/"); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
    },
    onError: function (err) { showToast(err.message || "Failed to mark as read", "error"); },
  });

  var handleDismiss = function (id) {
    setSwipeState(function (prev) { return Object.assign({}, prev, { [id]: "dismissing" }); });
    markReadMutation.mutate(id);
    setTimeout(function () {
      setDismissed(function (prev) {
        var next = new Set([].concat(Array.from(prev), [id]));
        return next;
      });
    }, 300);
  };

  var filteredNotifications = notifications.filter(function (n) {
    if (dismissed.has(n.id)) return false;
    if (activeFilter === "all") return true;
    var tab = FILTER_TABS.find(function (t) { return t.id === activeFilter; });
    return tab && tab.types && tab.types.includes(n.type);
  });

  var unreadCount = notifications.filter(function (n) { return !n.read && !dismissed.has(n.id); }).length;

  var getSections = function () {
    var sections = [];
    DATE_SECTIONS.forEach(function (section) {
      var items = filteredNotifications.filter(function (n) {
        return n.time && section.filter(n.time);
      });
      if (items.length > 0) {
        sections.push({ label: section.label, items: items });
      }
    });
    return sections;
  };

  var sections = getSections();
  var globalIndex = 0;

  if (notifsInf.isError) {
    return (
      <PageLayout>
        <ErrorState
          message={(notifsInf.error && notifsInf.error.message) || "Failed to load notifications"}
          onRetry={function () { notifsInf.refetch(); }}
        />
      </PageLayout>
    );
  }

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
          <button className="dp-ib" onClick={function () { navigate(-1); }}>
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
        {FILTER_TABS.map(function (tab) {
          return (
            <button
              key={tab.id}
              onClick={function () { setActiveFilter(tab.id); }}
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
          );
        })}
      </div>

      {/* Loading Skeletons */}
      {notifsInf.isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4, 5].map(function (i) {
            return <SkeletonCard key={i} height={80} style={{ borderRadius: 16 }} />;
          })}
        </div>
      )}

      {/* Notification Sections */}
      {!notifsInf.isLoading && sections.length > 0 && (
        sections.map(function (section) {
          return (
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
                {section.items.map(function (notification) {
                  var itemIndex = globalIndex++;
                  var isDismissing = swipeState[notification.id] === "dismissing";
                  var typeColor = TYPE_COLORS[notification.type] || "#8B5CF6";
                  var IconComponent = TYPE_ICONS[notification.type] || Bell;

                  return (
                    <div
                      key={notification.id}
                      onClick={function () { handleDismiss(notification.id); }}
                      style={{
                        ...glassStyle,
                        borderRadius: 16,
                        padding: "14px 16px",
                        display: "flex", alignItems: "flex-start", gap: 12,
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                        background: "var(--dp-glass-bg)",
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
                        transitionDelay: isDismissing ? "0s" : (0.15 + itemIndex * 0.05) + "s",
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
                        background: typeColor + "15",
                        border: "1px solid " + typeColor + "25",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <IconComponent size={20} color={typeColor} strokeWidth={2} />
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
          );
        })
      )}
      <div ref={notifsInf.sentinelRef} style={{height:1}} />
      {notifsInf.loadingMore && <div style={{textAlign:"center",padding:16,color:isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.4)",fontSize:13}}>Loading more…</div>}

      {/* Empty state */}
      {!notifsInf.isLoading && sections.length === 0 && (
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
