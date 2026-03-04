import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../../services/api";
import { NOTIFICATIONS } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { ArrowLeft, Bell, CheckCheck, Star, Users, Target, Clock, Zap, MessageCircle, Shield, BarChart2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { BRAND } from "../../styles/colors";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";
import IconButton from "../../components/shared/IconButton";
import GlassAppBar from "../../components/shared/GlassAppBar";
import PillTabs from "../../components/shared/PillTabs";

const TYPE_COLORS = {
  dream_progress: "#8B5CF6",
  friend_request: "#14B8A6",
  achievement: "#FCD34D",
  buddy: "#10B981",
  reminder: "#3B82F6",
  social: "#EC4899",
  system: "#6366F1",
  weekly_report: "#A855F7",
};

var TYPE_ICONS = {
  dream_progress: Target,
  friend_request: Users,
  achievement: Star,
  buddy: MessageCircle,
  reminder: Clock,
  social: Users,
  system: Zap,
  weekly_report: BarChart2,
};

const FILTER_TABS = [
  { id: "all", labelKey: "notifications.all", types: undefined },
  { id: "dreams", labelKey: "notifications.dreams", types: ["dream_progress", "reminder"] },
  { id: "social", labelKey: "notifications.social", types: ["friend_request", "buddy", "social"] },
  { id: "system", labelKey: "notifications.system", types: ["system", "achievement", "weekly_report"] },
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

var EMPTY_STATES = {
  all: {
    icon: Bell,
    titleKey: "notifications.allCaughtUp",
    messageKey: "notifications.noNew",
    color: "#8B5CF6",
  },
  dreams: {
    icon: Target,
    titleKey: "notifications.emptyDreamsTitle",
    messageKey: "notifications.emptyDreamsMessage",
    color: "#8B5CF6",
    fallbackTitle: "No dream updates",
    fallbackMessage: "When your dreams have progress or reminders, they'll appear here.",
  },
  social: {
    icon: Users,
    titleKey: "notifications.emptySocialTitle",
    messageKey: "notifications.emptySocialMessage",
    color: "#14B8A6",
    fallbackTitle: "No social activity",
    fallbackMessage: "Friend requests, buddy updates, and social notifications will show here.",
  },
  system: {
    icon: Zap,
    titleKey: "notifications.emptySystemTitle",
    messageKey: "notifications.emptySystemMessage",
    color: "#6366F1",
    fallbackTitle: "No system notifications",
    fallbackMessage: "Achievements and system updates will appear here.",
  },
};

export default function NotificationsScreen() {
  const navigate = useNavigate();
  useTheme();
  var { showToast } = useToast();
  var { t } = useT();
  var queryClient = useQueryClient();
  var scrollRef = useRef(null);
  var ptr = usePullToRefresh({
    onRefresh: function() { return Promise.all([notifsInf.refetch()]); },
    scrollRef: scrollRef,
  });

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
        (notifsInf.error && (notifsInf.error.userMessage || notifsInf.error.message)) || t("notifications.failedLoad"),
        "error"
      );
    }
  }, [notifsInf.isError]);

  var markAllReadMutation = useMutation({
    mutationFn: function () { return apiPost(NOTIFICATIONS.MARK_ALL_READ); },
    onSuccess: function () {
      // Server deletes all notifications — clear local cache
      queryClient.setQueryData(["notifications"], { pages: [], pageParams: [] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
      showToast(t("notifications.allCleared") || "All notifications cleared", "success");
    },
    onError: function (err) { showToast(err.userMessage || err.message || t("notifications.failedMarkAll"), "error"); },
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
    onError: function (err) { showToast(err.userMessage || err.message || t("notifications.failedMarkRead"), "error"); },
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

  var tabCounts = {};
  FILTER_TABS.forEach(function (tab) {
    tabCounts[tab.id] = notifications.filter(function (n) {
      if (dismissed.has(n.id)) return false;
      if (n.read) return false;
      if (tab.id === "all") return true;
      return tab.types && tab.types.includes(n.type);
    }).length;
  });

  if (notifsInf.isError) {
    return (
      <PageLayout>
        <ErrorState
          message={(notifsInf.error && (notifsInf.error.userMessage || notifsInf.error.message)) || t("notifications.failedLoad")}
          onRetry={function () { notifsInf.refetch(); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout contentRef={scrollRef} contentProps={{...ptr.handlers, style: ptr.style}} header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate("/"); }} />}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
              }}>
              {t("notifications.title")}
            </span>
            {unreadCount > 0 && (
              <span style={{
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                color: "#fff", fontSize: 11, fontWeight: 700,
                padding: "2px 8px", borderRadius: 10,
                minWidth: 20, textAlign: "center",
              }}>
                {unreadCount}
              </span>
            )}
          </div>
        }
        right={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllRead}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 12px", borderRadius: 10, fontFamily: "inherit",
              }}
            >
              <CheckCheck size={16} color={BRAND.purple} />
              <span style={{
                fontSize: 12, fontWeight: 600, color: BRAND.purple,
                }}>
                {t("notifications.markAllRead")}
              </span>
            </button>
          ) : null
        }
      />
    }>
      {ptr.indicator}
      <style>{`
        @keyframes slideDismiss {
          0% { transform: translateX(0) scale(1); opacity: 1; max-height: 120px; margin-bottom: 8px; }
          50% { transform: translateX(60%) scale(0.95); opacity: 0.3; max-height: 120px; margin-bottom: 8px; }
          100% { transform: translateX(100%) scale(0.9); opacity: 0; max-height: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseUnread {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0); }
        }
      `}</style>

      {/* Filter Tabs */}
      <div style={{
        marginBottom: 20,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s",
      }}>
        <PillTabs
          tabs={FILTER_TABS.map(function (tab) {
            var c = tabCounts[tab.id] || 0;
            return { key: tab.id, label: t(tab.labelKey), count: c > 0 ? c : undefined };
          })}
          active={activeFilter}
          onChange={setActiveFilter}
        />
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
                display: "flex", alignItems: "center", gap: 12,
                marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: "var(--dp-text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.8px",
                  whiteSpace: "nowrap",
                }}>
                  {section.label}
                </span>
                <div style={{
                  flex: 1, height: 1,
                  background: "linear-gradient(90deg, var(--dp-border, rgba(255,255,255,0.08)), transparent)",
                }} />
                <span style={{
                  fontSize: 11, fontWeight: 500, color: "var(--dp-text-muted)",
                  opacity: 0.6,
                }}>
                  {section.items.length}
                </span>
              </div>

              {/* Notification cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {section.items.map(function (notification) {
                  var itemIndex = globalIndex++;
                  var isDismissing = swipeState[notification.id] === "dismissing";
                  var typeColor = TYPE_COLORS[notification.type] || "#8B5CF6";
                  var IconComponent = TYPE_ICONS[notification.type] || Bell;
                  var isUnread = !notification.read;

                  return (
                    <div
                      key={notification.id}
                      onClick={function () { handleDismiss(notification.id); }}
                      style={{
                        backdropFilter: "blur(40px)",
                        WebkitBackdropFilter: "blur(40px)",
                        boxShadow: isUnread
                          ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 12px rgba(0,0,0,0.12)"
                          : "inset 0 1px 0 rgba(255,255,255,0.04)",
                        borderRadius: 16,
                        padding: "14px 16px",
                        display: "flex", alignItems: "flex-start", gap: 12,
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                        background: isUnread
                          ? "var(--dp-glass-bg, rgba(255,255,255,0.06))"
                          : "var(--dp-surface-dim, rgba(255,255,255,0.02))",
                        border: isUnread
                          ? "1px solid " + typeColor + "30"
                          : "1px solid var(--dp-border, rgba(255,255,255,0.04))",
                        transition: isDismissing
                          ? "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.25s ease 0.2s, margin-bottom 0.25s ease 0.2s, padding 0.25s ease 0.2s"
                          : "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        opacity: isDismissing ? 0 : !mounted ? 0 : notification.read ? 0.55 : 1,
                        transform: isDismissing
                          ? "translateX(80%) scale(0.92)"
                          : mounted
                          ? "translateX(0) scale(1)"
                          : "translateY(15px) scale(0.97)",
                        maxHeight: isDismissing ? 0 : 200,
                        marginBottom: isDismissing ? 0 : undefined,
                        transitionDelay: isDismissing ? "0s" : (0.15 + itemIndex * 0.05) + "s",
                      }}
                    >
                      {/* Unread accent bar */}
                      {isUnread && (
                        <div style={{
                          position: "absolute", left: 0, top: 0,
                          bottom: 0, width: 3,
                          borderRadius: "0 3px 3px 0",
                          background: "linear-gradient(180deg, " + typeColor + ", " + typeColor + "80)",
                          boxShadow: "0 0 10px " + typeColor + "40",
                        }} />
                      )}

                      {/* Icon circle */}
                      <div style={{
                        width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                        background: isUnread
                          ? typeColor + "20"
                          : typeColor + "10",
                        border: "1px solid " + typeColor + (isUnread ? "35" : "18"),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.3s ease",
                      }}>
                        <IconComponent
                          size={20}
                          color={typeColor}
                          strokeWidth={isUnread ? 2.2 : 1.8}
                        />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: isUnread ? 650 : 500,
                          color: isUnread ? "var(--dp-text)" : "var(--dp-text-secondary)",
                          marginBottom: 3,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {notification.title}
                        </div>
                        <div style={{
                          fontSize: 13,
                          color: isUnread ? "var(--dp-text-secondary)" : "var(--dp-text-muted)",
                          lineHeight: 1.4,
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
                          marginTop: 6,
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <span>{notification.time}</span>
                          {isUnread && (
                            <span style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: typeColor,
                              boxShadow: "0 0 6px " + typeColor + "60",
                              display: "inline-block", flexShrink: 0,
                            }} />
                          )}
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
      {notifsInf.loadingMore && <div style={{textAlign:"center",padding:16,color:"var(--dp-text-muted)",fontSize:13}}>{t("notifications.loadingMore")}</div>}

      {/* Empty state — contextual per active tab */}
      {!notifsInf.isLoading && sections.length === 0 && (function () {
        var emptyConfig = EMPTY_STATES[activeFilter] || EMPTY_STATES.all;
        var EmptyIcon = emptyConfig.icon;
        var emptyColor = emptyConfig.color;
        var emptyTitle = t(emptyConfig.titleKey) || emptyConfig.fallbackTitle || t("notifications.allCaughtUp");
        var emptyMessage = t(emptyConfig.messageKey) || emptyConfig.fallbackMessage || t("notifications.noNew");

        return (
          <div style={{
            textAlign: "center", padding: "60px 24px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s",
          }}>
            <div style={{
              width: 88, height: 88, borderRadius: 26,
              background: emptyColor + "12",
              border: "1px solid " + emptyColor + "20",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <EmptyIcon size={38} color={emptyColor} strokeWidth={1.5} />
            </div>
            <div style={{
              fontSize: 18, fontWeight: 700, color: "var(--dp-text-secondary)",
              marginBottom: 8, lineHeight: 1.3,
            }}>
              {emptyTitle}
            </div>
            <div style={{
              fontSize: 14, color: "var(--dp-text-muted)",
              lineHeight: 1.5, maxWidth: 280, margin: "0 auto",
            }}>
              {emptyMessage}
            </div>
          </div>
        );
      })()}

      {/* Bottom spacer */}
      <div style={{ height: 32 }} />
    </PageLayout>
  );
}
