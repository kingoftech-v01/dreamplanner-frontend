import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { CALENDAR } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import {
  Bell, X, Clock, ChevronDown, Calendar, Target,
  Milestone, Repeat, Users, Heart, BookOpen, Star
} from "lucide-react";
import { BRAND } from "../../styles/colors";

/* ===================================================================
 * EventAlertPopup -- In-app notification popups for upcoming events
 *
 * Polls the upcoming-alerts endpoint every 60 seconds. When events
 * are about to start, slides in notification cards from the top.
 * Supports dismiss (marks reminders sent) and snooze (5-60 min).
 * Plays a gentle chime via Web Audio API on new alerts.
 * =================================================================== */

var SNOOZE_OPTIONS = [
  { minutes: 5,  label: "5 min" },
  { minutes: 10, label: "10 min" },
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
];

var CATEGORY_ICONS = {
  meeting:   Users,
  deadline:  Target,
  milestone: Milestone,
  habit:     Repeat,
  social:    Users,
  health:    Heart,
  learning:  BookOpen,
  custom:    Star,
};

var CATEGORY_COLORS = {
  meeting:   "#3B82F6",
  deadline:  "#EF4444",
  milestone: "#F59E0B",
  habit:     "#8B5CF6",
  social:    "#EC4899",
  health:    "#10B981",
  learning:  "#06B6D4",
  custom:    "#8B5CF6",
};

function playNotificationChime() {
  try {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    var ctx = new AudioContext();

    // Create a gentle two-tone chime
    var now = ctx.currentTime;
    var notes = [523.25, 659.25]; // C5, E5

    notes.forEach(function (freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.7);
    });

    // Clean up context after playback
    setTimeout(function () {
      ctx.close();
    }, 2000);
  } catch (e) {
    // Silently ignore audio errors (user hasn't interacted yet, etc.)
  }
}

function getTimeUntilLabel(startTime) {
  var now = new Date();
  var start = new Date(startTime);
  var diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) return "starting now";

  var diffMin = Math.round(diffMs / 60000);
  if (diffMin <= 0) return "starting now";
  if (diffMin === 1) return "in 1 minute";
  if (diffMin < 60) return "in " + diffMin + " minutes";

  var diffHr = Math.floor(diffMin / 60);
  var remMin = diffMin % 60;
  if (diffHr === 1 && remMin === 0) return "in 1 hour";
  if (diffHr === 1) return "in 1 hr " + remMin + " min";
  return "in " + diffHr + " hrs " + remMin + " min";
}

export default function EventAlertPopup() {
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var queryClient = useQueryClient();

  var [dismissedIds, setDismissedIds] = useState({});
  var [snoozeOpenId, setSnoozeOpenId] = useState(null);
  var [animatingIn, setAnimatingIn] = useState({});
  var prevAlertIdsRef = useRef([]);

  // Poll upcoming-alerts every 60 seconds
  var alertsQuery = useQuery({
    queryKey: ["upcoming-alerts"],
    queryFn: function () { return apiGet(CALENDAR.UPCOMING_ALERTS); },
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 1,
  });

  var alerts = (alertsQuery.data || []).filter(function (evt) {
    return !dismissedIds[evt.id];
  });

  // Play chime when new alerts appear
  useEffect(function () {
    if (!alerts || alerts.length === 0) return;

    var currentIds = alerts.map(function (a) { return a.id; });
    var prevIds = prevAlertIdsRef.current;
    var newIds = currentIds.filter(function (id) {
      return prevIds.indexOf(id) === -1;
    });

    if (newIds.length > 0) {
      playNotificationChime();
      // Trigger slide-in animation for new alerts
      var newAnim = {};
      newIds.forEach(function (id) { newAnim[id] = true; });
      setAnimatingIn(function (prev) {
        var merged = {};
        Object.keys(prev).forEach(function (k) { merged[k] = prev[k]; });
        Object.keys(newAnim).forEach(function (k) { merged[k] = newAnim[k]; });
        return merged;
      });
      // Remove animation flag after transition completes
      setTimeout(function () {
        setAnimatingIn(function (prev) {
          var next = {};
          Object.keys(prev).forEach(function (k) {
            if (newIds.indexOf(k) === -1) next[k] = prev[k];
          });
          return next;
        });
      }, 500);
    }

    prevAlertIdsRef.current = currentIds;
  }, [alerts]);

  // Auto-dismiss events that have already started
  useEffect(function () {
    if (!alerts || alerts.length === 0) return;
    var now = new Date();
    alerts.forEach(function (evt) {
      var startTime = new Date(evt.start_time);
      if (startTime <= now) {
        setDismissedIds(function (prev) {
          var next = {};
          Object.keys(prev).forEach(function (k) { next[k] = prev[k]; });
          next[evt.id] = true;
          return next;
        });
      }
    });
  }, [alerts]);

  var snoozeMut = useMutation({
    mutationFn: function (params) {
      return apiPost(CALENDAR.SNOOZE(params.eventId), { minutes: params.minutes });
    },
    onSuccess: function (data, params) {
      setDismissedIds(function (prev) {
        var next = {};
        Object.keys(prev).forEach(function (k) { next[k] = prev[k]; });
        next[params.eventId] = true;
        return next;
      });
      setSnoozeOpenId(null);
      queryClient.invalidateQueries({ queryKey: ["upcoming-alerts"] });
    },
  });

  var dismissMut = useMutation({
    mutationFn: function (eventId) {
      return apiPost(CALENDAR.DISMISS(eventId));
    },
    onSuccess: function (data, eventId) {
      setDismissedIds(function (prev) {
        var next = {};
        Object.keys(prev).forEach(function (k) { next[k] = prev[k]; });
        next[eventId] = true;
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["upcoming-alerts"] });
    },
  });

  var handleDismiss = useCallback(function (eventId) {
    dismissMut.mutate(eventId);
  }, [dismissMut]);

  var handleSnooze = useCallback(function (eventId, minutes) {
    snoozeMut.mutate({ eventId: eventId, minutes: minutes });
  }, [snoozeMut]);

  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: 60,
      right: 16,
      zIndex: 9998,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      maxWidth: 380,
      width: "calc(100vw - 32px)",
      pointerEvents: "none",
    }}>
      {alerts.map(function (evt) {
        var category = evt.category || "custom";
        var CategoryIcon = CATEGORY_ICONS[category] || Star;
        var categoryColor = CATEGORY_COLORS[category] || "#8B5CF6";
        var timeLabel = getTimeUntilLabel(evt.start_time);
        var isNew = !!animatingIn[evt.id];

        return (
          <div
            key={evt.id}
            style={{
              pointerEvents: "auto",
              background: isLight
                ? "rgba(255, 255, 255, 0.92)"
                : "rgba(20, 16, 40, 0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: 16,
              border: "1px solid " + (isLight
                ? "rgba(139, 92, 246, 0.15)"
                : "rgba(139, 92, 246, 0.25)"),
              boxShadow: isLight
                ? "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(139, 92, 246, 0.08)"
                : "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(139, 92, 246, 0.15)",
              padding: 16,
              animation: isNew ? "dpAlertSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards" : "none",
              transform: isNew ? "translateY(-20px)" : "translateY(0)",
              opacity: isNew ? 0 : 1,
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          >
            {/* Header row: icon + title + time + close */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 10,
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                flexShrink: 0,
                background: categoryColor + "18",
                border: "1px solid " + categoryColor + "30",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <CategoryIcon size={18} color={categoryColor} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--dp-text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.3,
                }}>
                  {evt.title}
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 2,
                }}>
                  <Clock size={12} color={categoryColor} strokeWidth={2} />
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: categoryColor,
                  }}>
                    {timeLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={function () { handleDismiss(evt.id); }}
                aria-label="Dismiss notification"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid var(--dp-accent-border)",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                <X size={14} color="var(--dp-text-muted)" strokeWidth={2} />
              </button>
            </div>

            {/* Action row: Dismiss + Snooze */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <button
                onClick={function () { handleDismiss(evt.id); }}
                disabled={dismissMut.isPending}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--dp-accent-border)",
                  background: "transparent",
                  color: "var(--dp-text-secondary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                Dismiss
              </button>
              <div style={{ position: "relative", flex: 1 }}>
                <button
                  onClick={function () {
                    setSnoozeOpenId(snoozeOpenId === evt.id ? null : evt.id);
                  }}
                  disabled={snoozeMut.isPending}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg, " + categoryColor + "20, " + categoryColor + "10)",
                    color: categoryColor,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    transition: "all 0.15s",
                  }}
                >
                  <Bell size={12} strokeWidth={2.5} />
                  Snooze
                  <ChevronDown size={12} strokeWidth={2.5} />
                </button>

                {/* Snooze dropdown */}
                {snoozeOpenId === evt.id && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: isLight
                      ? "rgba(255, 255, 255, 0.96)"
                      : "rgba(30, 24, 56, 0.96)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    borderRadius: 12,
                    border: "1px solid " + (isLight
                      ? "rgba(139, 92, 246, 0.12)"
                      : "rgba(139, 92, 246, 0.2)"),
                    boxShadow: isLight
                      ? "0 8px 24px rgba(0, 0, 0, 0.12)"
                      : "0 8px 24px rgba(0, 0, 0, 0.35)",
                    padding: 4,
                    zIndex: 10,
                    animation: "dpAlertSlideIn 0.2s ease forwards",
                  }}>
                    {SNOOZE_OPTIONS.map(function (opt) {
                      return (
                        <button
                          key={opt.minutes}
                          onClick={function () { handleSnooze(evt.id, opt.minutes); }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "none",
                            background: "transparent",
                            color: "var(--dp-text-primary)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            textAlign: "left",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={function (e) {
                            e.currentTarget.style.background = isLight
                              ? "rgba(139, 92, 246, 0.06)"
                              : "rgba(139, 92, 246, 0.12)";
                          }}
                          onMouseLeave={function (e) {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <style>{"\
        @keyframes dpAlertSlideIn {\
          from { opacity: 0; transform: translateY(-20px); }\
          to { opacity: 1; transform: translateY(0); }\
        }\
      "}</style>
    </div>
  );
}
