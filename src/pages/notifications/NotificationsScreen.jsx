import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../../services/api";
import { NOTIFICATIONS } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import { ArrowLeft, Bell, CheckCheck, Star, Users, Target, Clock, Zap, MessageCircle, Shield } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
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
  { id: "all", labelKey: "notifications.all", types: undefined },
  { id: "dreams", labelKey: "notifications.dreams", types: ["dream_progress", "reminder"] },
  { id: "social", labelKey: "notifications.social", types: ["friend_request", "buddy", "social"] },
  { id: "system", labelKey: "notifications.system", types: ["system", "achievement"] },
];

function relativeTime(dateStr, t) {
  if (!dateStr) return "";
  var now = Date.now();
  var then = new Date(dateStr).getTime();
  var diffMs = now - then;
  if (diffMs < 0) return t("notifications.justNow");
  var mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("notifications.justNow");
  if (mins < 60) return mins + " " + t("notifications.minAgo");
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + " " + t("notifications.hourAgo");
  var days = Math.floor(hours / 24);
  if (days < 30) return days + " " + t("notifications.daysAgo");
  var months = Math.floor(days / 30);
  return months + " " + t("notifications.monthsAgo");
}

function timeCategory(dateStr) {
  if (!dateStr) return "earlier";
  var now = Date.now();
  var then = new Date(dateStr).getTime();
  var diffMs = now - then;
  if (diffMs < 0) return "today";
  var mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "today";
  if (mins < 60) return "today";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return "today";
  var days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days <= 6) return "thisWeek";
  return "earlier";
}

const DATE_SECTIONS = [
  { labelKey: "notifications.today", category: "today" },
  { labelKey: "notifications.yesterday", category: "yesterday" },
  { labelKey: "notifications.thisWeek", category: "thisWeek" },
  { labelKey: "notifications.earlier", category: "earlier" },
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
  var { t } = useT();
  var queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [dismissed, setDismissed] = useState(new Set());
  const [swipeState, setSwipeState] = useState({});

  var notifsInf = useInfiniteList({ queryKey: ["notifications"], url: NOTIFICATIONS.LIST, limit: 30 });
  var notifications = (notifsInf.items || []).map(function (n) {
    var dateField = n.createdAt || n.created_at;
    return {
      id: n.id,
      type: n.notificationType || n.type || "system",
      title: n.title || "",
      message: n.body || n.message || "",
      read: n.isRead != null ? n.isRead : (n.read != null ? n.read : (n.readAt != null)),
      time: relativeTime(dateField, t),
      category: timeCategory(dateField),
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
        (notifsInf.error && notifsInf.error.message) || t("notifications.failedLoad"),
        "error"
      );
    }
  }, [notifsInf.isError]);

  var markAllReadMutation = useMutation({
    mutationFn: function () { return apiPost(NOTIFICATIONS.MARK_ALL_READ); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
    },
    onError: function (err) { showToast(err.message || t("notifications.failedMarkAll"), "error"); },
  });

  var handleMarkAllRead = function () {
    markAllReadMutation.mutate();
  };

  var markReadMutation = useMutation({
    mutationFn: function (id) { return apiPost(NOTIFICATIONS.MARK_READ(id)); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
    },
    onError: function (err) { showToast(err.message || t("notifications.failedMarkRead"), "error"); },
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
        return n.category === section.category;
      });
      if (items.length > 0) {
        sections.push({ label: t(section.labelKey), items: items });
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
          message={(notifsInf.error && notifsInf.error.message) || t("notifications.failedLoad")}
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
              {t("notifications.title")}
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
              {t("notifications.markAllRead")}
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
              {t(tab.labelKey)}
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
                        background: notification.read ? "transparent" : "var(--dp-glass-bg)",
                        border: notification.read
                          ? "1px solid transparent"
                          : "1px solid var(--dp-surface-hover)",
                        transition: "all 0.3s ease",
                        opacity: isDismissing ? 0 : !mounted ? 0 : notification.read ? 0.45 : 1,
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
                          wordBreak: "break-word",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
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
      {notifsInf.loadingMore && <div style={{textAlign:"center",padding:16,color:isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.4)",fontSize:13}}>{t("notifications.loadingMore")}</div>}

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
            {t("notifications.allCaughtUp")}
          </div>
          <div style={{
            fontSize: 14, color: "var(--dp-text-muted)",
            fontFamily: "Inter, sans-serif",
          }}>
            {t("notifications.noNew")}
          </div>
        </div>
      )}

      {/* Bottom spacer */}
      <div style={{ height: 32 }} />
    </PageLayout>
  );
}
