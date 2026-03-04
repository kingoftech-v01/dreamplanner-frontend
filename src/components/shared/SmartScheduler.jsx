import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { CALENDAR, DREAMS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { BRAND, GRADIENTS, GRADIENT_SHADOWS, adaptColor } from "../../styles/colors";
import GlassModal from "./GlassModal";
import GlassCard from "./GlassCard";
import GradientButton from "./GradientButton";
import {
  Sparkles, Clock, Calendar, Check, CheckCircle,
  AlertCircle, ChevronRight, Target, X, Zap,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * SmartScheduler — AI-powered task scheduling modal
 *
 * 1. Shows unscheduled tasks as a selectable list
 * 2. "Smart Schedule" triggers AI scheduling
 * 3. Shows suggested schedule as timeline cards
 * 4. Each suggestion: task name, time, reason, confidence bar
 * 5. User can accept/modify each suggestion
 * 6. "Accept All" creates calendar events
 * 7. Animated loading with sparkle indicator
 * ═══════════════════════════════════════════════════════════════════ */

// ── Phase enum ──
var PHASE = { SELECT: "select", LOADING: "loading", RESULTS: "results" };

export default function SmartScheduler({ open, onClose }) {
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();

  var [phase, setPhase] = useState(PHASE.SELECT);
  var [selected, setSelected] = useState({});
  var [suggestions, setSuggestions] = useState([]);
  var [accepted, setAccepted] = useState({});
  var [loadingDots, setLoadingDots] = useState(0);

  // Reset state when modal opens
  useEffect(function () {
    if (open) {
      setPhase(PHASE.SELECT);
      setSelected({});
      setSuggestions([]);
      setAccepted({});
    }
  }, [open]);

  // Loading animation
  useEffect(function () {
    if (phase !== PHASE.LOADING) return;
    var interval = setInterval(function () {
      setLoadingDots(function (d) { return (d + 1) % 4; });
    }, 400);
    return function () { clearInterval(interval); };
  }, [phase]);

  // ── Fetch unscheduled tasks ──
  var tasksQuery = useQuery({
    queryKey: ["unscheduled-tasks-for-scheduler"],
    queryFn: function () { return apiGet(DREAMS.TASKS.LIST + "?status=pending"); },
    enabled: open,
  });

  var rawTasks = (tasksQuery.data && tasksQuery.data.results) || tasksQuery.data || [];
  var unscheduledTasks = Array.isArray(rawTasks)
    ? rawTasks.filter(function (t) { return !t.scheduledDate && !t.scheduledTime; })
    : [];

  // ── Smart schedule mutation ──
  var scheduleMut = useMutation({
    mutationFn: function (taskIds) {
      return apiPost(CALENDAR.SMART_SCHEDULE, { task_ids: taskIds });
    },
    onSuccess: function (data) {
      var results = (data && data.suggestions) || [];
      setSuggestions(results);
      // Auto-accept all by default
      var acc = {};
      results.forEach(function (s) {
        if (s.suggestedDate && s.suggestedTime) {
          acc[s.taskId] = true;
        }
      });
      setAccepted(acc);
      setPhase(PHASE.RESULTS);
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Smart scheduling failed", "error");
      setPhase(PHASE.SELECT);
    },
  });

  // ── Accept schedule mutation ──
  var acceptMut = useMutation({
    mutationFn: function (items) {
      return apiPost(CALENDAR.ACCEPT_SCHEDULE, { suggestions: items });
    },
    onSuccess: function (data) {
      var count = (data && data.count) || 0;
      showToast(count + " task" + (count !== 1 ? "s" : "") + " scheduled", "success");
      queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-today"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-week-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-week-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-agenda-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-agenda-events"] });
      queryClient.invalidateQueries({ queryKey: ["unscheduled-tasks-for-scheduler"] });
      onClose();
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to create schedule", "error");
    },
  });

  // ── Handlers ──
  function toggleSelect(id) {
    setSelected(function (prev) {
      var next = Object.assign({}, prev);
      if (next[id]) { delete next[id]; } else { next[id] = true; }
      return next;
    });
  }

  function selectAll() {
    var all = {};
    unscheduledTasks.forEach(function (t) { all[t.id] = true; });
    setSelected(all);
  }

  function deselectAll() { setSelected({}); }

  function handleSmartSchedule() {
    var ids = Object.keys(selected);
    if (ids.length === 0) {
      showToast("Select at least one task", "info");
      return;
    }
    setPhase(PHASE.LOADING);
    scheduleMut.mutate(ids);
  }

  function toggleAccept(taskId) {
    setAccepted(function (prev) {
      var next = Object.assign({}, prev);
      if (next[taskId]) { delete next[taskId]; } else { next[taskId] = true; }
      return next;
    });
  }

  function handleAcceptAll() {
    var items = suggestions
      .filter(function (s) { return accepted[s.taskId] && s.suggestedDate && s.suggestedTime; })
      .map(function (s) {
        return {
          task_id: s.taskId,
          suggested_date: s.suggestedDate,
          suggested_time: s.suggestedTime,
        };
      });
    if (items.length === 0) {
      showToast("No suggestions accepted", "info");
      return;
    }
    acceptMut.mutate(items);
  }

  var selectedCount = Object.keys(selected).length;
  var acceptedCount = Object.keys(accepted).length;

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      variant="bottom"
      maxWidth={480}
      title={
        phase === PHASE.SELECT
          ? "Smart Schedule"
          : phase === PHASE.LOADING
            ? "AI Scheduling..."
            : "Schedule Suggestions"
      }
    >
      <div style={{ padding: "0 20px 24px" }}>

        {/* ═══════════════════════════════════════════════════════════
         *  PHASE 1: TASK SELECTION
         * ═══════════════════════════════════════════════════════════ */}
        {phase === PHASE.SELECT && (
          <>
            {/* Header description */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 0 16px",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(93,229,168,0.15))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={16} color={BRAND.purple} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.4 }}>
                Select tasks to schedule. AI will find the best times based on your habits and calendar.
              </span>
            </div>

            {/* Select all / deselect */}
            {unscheduledTasks.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                  {selectedCount} of {unscheduledTasks.length} selected
                </span>
                <button
                  onClick={selectedCount === unscheduledTasks.length ? deselectAll : selectAll}
                  style={{
                    padding: "4px 10px", borderRadius: 8,
                    border: "1px solid var(--dp-accent-border)",
                    background: "var(--dp-accent-soft)",
                    color: "var(--dp-accent)", fontSize: 11, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {selectedCount === unscheduledTasks.length ? "Deselect All" : "Select All"}
                </button>
              </div>
            )}

            {/* Task list */}
            <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 16 }}>
              {tasksQuery.isLoading ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <span className="dp-spin" style={{
                    display: "inline-block", width: 20, height: 20,
                    border: "2px solid var(--dp-text-muted)",
                    borderTopColor: BRAND.purple, borderRadius: "50%",
                  }} />
                  <div style={{ fontSize: 13, color: "var(--dp-text-muted)", marginTop: 8 }}>Loading tasks...</div>
                </div>
              ) : unscheduledTasks.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center" }}>
                  <CheckCircle size={32} color="var(--dp-text-muted)" strokeWidth={1.5} style={{ margin: "0 auto 10px", display: "block" }} />
                  <div style={{ fontSize: 14, color: "var(--dp-text-secondary)" }}>All tasks are scheduled!</div>
                  <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 4 }}>Create new tasks from your dreams first.</div>
                </div>
              ) : (
                unscheduledTasks.map(function (task) {
                  var isSelected = !!selected[task.id];
                  return (
                    <button
                      key={task.id}
                      onClick={function () { toggleSelect(task.id); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", marginBottom: 6,
                        borderRadius: 14,
                        border: isSelected
                          ? "1.5px solid rgba(139,92,246,0.4)"
                          : "1px solid var(--dp-glass-border)",
                        background: isSelected
                          ? "rgba(139,92,246,0.08)"
                          : "var(--dp-glass-bg)",
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.2s",
                        fontFamily: "inherit",
                      }}
                      className="dp-gh"
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                        border: isSelected ? "none" : "2px solid var(--dp-accent-border)",
                        background: isSelected ? GRADIENTS.primary : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s",
                        boxShadow: isSelected ? "0 2px 8px rgba(139,92,246,0.3)" : "none",
                      }}>
                        {isSelected && <Check size={13} color={BRAND.white} strokeWidth={3} />}
                      </div>
                      {/* Task info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 500,
                          color: "var(--dp-text)", whiteSpace: "nowrap",
                          overflow: "hidden", textOverflow: "ellipsis",
                        }}>{task.title}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          {task.durationMins && (
                            <span style={{ fontSize: 11, color: "var(--dp-text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                              <Clock size={10} strokeWidth={2} /> {task.durationMins}m
                            </span>
                          )}
                          {task.goalTitle && (
                            <span style={{ fontSize: 11, color: adaptColor(BRAND.purpleLight, isLight), fontWeight: 500 }}>
                              {task.goalTitle}
                            </span>
                          )}
                          {task.deadlineDate && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                              padding: "1px 5px", borderRadius: 5,
                              background: "rgba(239,68,68,0.1)", color: "var(--dp-danger)",
                            }}>
                              Due {task.deadlineDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={14} color="var(--dp-text-muted)" strokeWidth={2} />
                    </button>
                  );
                })
              )}
            </div>

            {/* Action button */}
            {unscheduledTasks.length > 0 && (
              <GradientButton
                gradient="primaryDark"
                onClick={handleSmartSchedule}
                disabled={selectedCount === 0}
                icon={Sparkles}
                fullWidth
                style={{ borderRadius: 14, padding: "14px 0", fontSize: 15 }}
              >
                Smart Schedule {selectedCount > 0 ? "(" + selectedCount + ")" : ""}
              </GradientButton>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
         *  PHASE 2: LOADING
         * ═══════════════════════════════════════════════════════════ */}
        {phase === PHASE.LOADING && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            {/* Sparkle animation */}
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: "0 auto 20px",
              background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(93,229,168,0.12))",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "dpSmartPulse 2s ease-in-out infinite",
            }}>
              <Sparkles
                size={28}
                color={BRAND.purple}
                strokeWidth={2}
                style={{ animation: "dpSmartSpin 3s linear infinite" }}
              />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6 }}>
              Analyzing your schedule{".".repeat(loadingDots)}
            </div>
            <div style={{ fontSize: 13, color: "var(--dp-text-muted)", lineHeight: 1.5 }}>
              Checking calendar, priorities, and your productivity patterns
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
         *  PHASE 3: RESULTS
         * ═══════════════════════════════════════════════════════════ */}
        {phase === PHASE.RESULTS && (
          <>
            {/* Summary */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 0 14px",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "rgba(93,229,168,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Zap size={14} color={BRAND.green} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 13, color: "var(--dp-text-secondary)" }}>
                {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} found.
                Toggle to accept or reject each one.
              </span>
            </div>

            {/* Suggestion cards */}
            <div style={{ maxHeight: 360, overflowY: "auto", marginBottom: 16 }}>
              {suggestions.map(function (s, idx) {
                var isAccepted = !!accepted[s.taskId];
                var hasSlot = s.suggestedDate && s.suggestedTime;
                var confidence = s.confidence || 0;

                // Format date nicely
                var dateLabel = "";
                if (s.suggestedDate) {
                  var parts = s.suggestedDate.split("-");
                  var dateObj = new Date(
                    parseInt(parts[0], 10),
                    parseInt(parts[1], 10) - 1,
                    parseInt(parts[2], 10)
                  );
                  var today = new Date();
                  var tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  if (dateObj.toDateString() === today.toDateString()) {
                    dateLabel = "Today";
                  } else if (dateObj.toDateString() === tomorrow.toDateString()) {
                    dateLabel = "Tomorrow";
                  } else {
                    dateLabel = dateObj.toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    });
                  }
                }

                // Format time
                var timeLabel = "";
                if (s.suggestedTime) {
                  var tp = s.suggestedTime.split(":");
                  var h = parseInt(tp[0], 10);
                  var m = tp[1];
                  if (h === 0) { timeLabel = "12:" + m + " AM"; }
                  else if (h < 12) { timeLabel = h + ":" + m + " AM"; }
                  else if (h === 12) { timeLabel = "12:" + m + " PM"; }
                  else { timeLabel = (h - 12) + ":" + m + " PM"; }
                }

                // Confidence color
                var confColor = confidence >= 0.7
                  ? BRAND.green
                  : confidence >= 0.4
                    ? BRAND.yellow
                    : BRAND.red;

                return (
                  <div
                    key={s.taskId}
                    style={{
                      marginBottom: 8,
                      borderRadius: 16,
                      border: isAccepted
                        ? "1.5px solid rgba(93,229,168,0.3)"
                        : "1px solid var(--dp-glass-border)",
                      background: isAccepted
                        ? "rgba(93,229,168,0.04)"
                        : "var(--dp-glass-bg)",
                      overflow: "hidden",
                      transition: "all 0.25s",
                      animation: "dpFadeIn 0.3s ease-out",
                      animationDelay: (idx * 60) + "ms",
                      animationFillMode: "both",
                    }}
                  >
                    <div style={{ padding: "14px 16px" }}>
                      {/* Top row: task name + accept toggle */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                        <button
                          onClick={function () { if (hasSlot) toggleAccept(s.taskId); }}
                          disabled={!hasSlot}
                          style={{
                            width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                            marginTop: 1,
                            border: isAccepted ? "none" : "2px solid var(--dp-accent-border)",
                            background: isAccepted
                              ? GRADIENTS.success
                              : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: hasSlot ? "pointer" : "default",
                            transition: "all 0.2s",
                            boxShadow: isAccepted ? GRADIENT_SHADOWS.success : "none",
                            opacity: hasSlot ? 1 : 0.4,
                            fontFamily: "inherit",
                          }}
                        >
                          {isAccepted && <Check size={14} color={BRAND.white} strokeWidth={3} />}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600,
                            color: "var(--dp-text)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>{s.taskTitle}</div>
                          {s.durationMins && (
                            <span style={{ fontSize: 11, color: "var(--dp-text-muted)", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                              <Clock size={10} strokeWidth={2} /> {s.durationMins} min
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Suggested time */}
                      {hasSlot ? (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 12px", borderRadius: 10,
                          background: "var(--dp-surface)",
                          marginBottom: 10,
                        }}>
                          <Calendar size={14} color={adaptColor(BRAND.purpleLight, isLight)} strokeWidth={2} />
                          <span style={{
                            fontSize: 13, fontWeight: 600,
                            color: adaptColor(BRAND.purpleLight, isLight),
                          }}>
                            {dateLabel}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--dp-text-secondary)" }}>at</span>
                          <span style={{
                            fontSize: 13, fontWeight: 600,
                            color: "var(--dp-text)",
                          }}>
                            {timeLabel}
                          </span>
                        </div>
                      ) : (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 12px", borderRadius: 10,
                          background: "rgba(239,68,68,0.06)",
                          marginBottom: 10,
                        }}>
                          <AlertCircle size={14} color="var(--dp-danger)" strokeWidth={2} />
                          <span style={{ fontSize: 12, color: "var(--dp-danger)" }}>
                            No available slot found
                          </span>
                        </div>
                      )}

                      {/* Reason */}
                      {s.reason && (
                        <div style={{
                          fontSize: 12, color: "var(--dp-text-muted)",
                          lineHeight: 1.4, marginBottom: 8,
                          paddingLeft: 2,
                        }}>
                          {s.reason}
                        </div>
                      )}

                      {/* Confidence bar */}
                      {hasSlot && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "var(--dp-text-muted)", flexShrink: 0 }}>
                            Confidence
                          </span>
                          <div style={{
                            flex: 1, height: 4, borderRadius: 2,
                            background: "var(--dp-surface)",
                            overflow: "hidden",
                          }}>
                            <div style={{
                              height: "100%", borderRadius: 2,
                              width: Math.round(confidence * 100) + "%",
                              background: confColor,
                              boxShadow: "0 0 6px " + confColor + "40",
                              transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                            }} />
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: adaptColor(confColor, isLight),
                            flexShrink: 0, minWidth: 30, textAlign: "right",
                          }}>
                            {Math.round(confidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={function () { setPhase(PHASE.SELECT); }}
                style={{
                  flex: 1, padding: "13px", borderRadius: 14,
                  border: "1px solid var(--dp-input-border)",
                  background: "var(--dp-glass-bg)",
                  color: "var(--dp-text-primary)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Back
              </button>
              <GradientButton
                gradient="success"
                onClick={handleAcceptAll}
                disabled={acceptedCount === 0 || acceptMut.isPending}
                loading={acceptMut.isPending}
                icon={CheckCircle}
                fullWidth
                style={{ flex: 2, borderRadius: 14, padding: "13px 0", fontSize: 14 }}
              >
                Accept {acceptedCount > 0 ? "(" + acceptedCount + ")" : ""}
              </GradientButton>
            </div>
          </>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes dpSmartPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes dpSmartSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dpFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </GlassModal>
  );
}
