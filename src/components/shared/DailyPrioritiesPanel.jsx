import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { apiGet } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import GlassModal from "./GlassModal";
import {
  Star, Zap, Clock, Battery, BatteryMedium, BatteryLow,
  RefreshCw, Brain, ChevronRight, Sparkles, Target,
} from "lucide-react";
import { BRAND } from "../../styles/colors";

/* ═══════════════════════════════════════════════════════════════════
 * DailyPrioritiesPanel
 *
 * GlassModal that shows AI-prioritized tasks for today:
 *  - Focus Task (golden border, star icon)
 *  - Quick Wins section
 *  - Full prioritized task list with ranks, suggested times,
 *    energy indicators (battery levels), and dream labels
 *  - Re-prioritize button to refresh the analysis
 *  - Brain animation loading state
 * ═══════════════════════════════════════════════════════════════════ */

// ── Energy indicator icon ──
function EnergyIcon(props) {
  var level = props.level || "medium";
  var size = props.size || 16;
  if (level === "high") return <Battery size={size} color={BRAND.greenSolid} strokeWidth={2} />;
  if (level === "low") return <BatteryLow size={size} color={BRAND.redSolid} strokeWidth={2} />;
  return <BatteryMedium size={size} color={BRAND.orange} strokeWidth={2} />;
}

// ── Brain loader animation ──
function BrainLoader() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 24px", gap: 20,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.10))",
        border: "1px solid rgba(139,92,246,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "dpBrainPulse 1.8s ease-in-out infinite",
      }}>
        <Brain size={32} color={BRAND.purple} strokeWidth={1.5} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)", marginBottom: 6 }}>
          Analyzing your tasks...
        </div>
        <div style={{ fontSize: 13, color: "var(--dp-text-muted)", lineHeight: 1.5 }}>
          Considering energy levels, deadlines, and task priorities
        </div>
      </div>
    </div>
  );
}

export default function DailyPrioritiesPanel(props) {
  var open = props.open;
  var onClose = props.onClose;
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var queryClient = useQueryClient();
  var [mounted, setMounted] = useState(false);

  useEffect(function () {
    if (open) {
      var t = setTimeout(function () { setMounted(true); }, 80);
      return function () { clearTimeout(t); };
    } else {
      setMounted(false);
    }
  }, [open]);

  var prioritiesQuery = useQuery({
    queryKey: ["daily-priorities"],
    queryFn: function () { return apiGet(DREAMS.TASKS.DAILY_PRIORITIES); },
    enabled: open,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  var handleReprioritize = function () {
    queryClient.invalidateQueries({ queryKey: ["daily-priorities"] });
    prioritiesQuery.refetch();
  };

  var data = prioritiesQuery.data || {};
  var prioritizedTasks = data.prioritizedTasks || data.prioritized_tasks || [];
  var focusTask = data.focusTask || data.focus_task || null;
  var quickWins = data.quickWins || data.quick_wins || [];
  var noTasks = !prioritiesQuery.isLoading && prioritizedTasks.length === 0;

  return (
    <GlassModal open={open} onClose={onClose} title="Today's Priorities" maxWidth={480}>
      <div style={{ padding: "0 20px 20px" }}>

        {/* ── Loading state ── */}
        {prioritiesQuery.isLoading && <BrainLoader />}

        {/* ── Error state ── */}
        {prioritiesQuery.isError && (
          <div style={{
            padding: "40px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 14, color: "var(--dp-danger)", marginBottom: 12 }}>
              {(prioritiesQuery.error && (prioritiesQuery.error.userMessage || prioritiesQuery.error.message)) || "Could not generate priorities."}
            </div>
            <button onClick={handleReprioritize} style={{
              padding: "8px 20px", borderRadius: 12, border: "1px solid var(--dp-accent-border)",
              background: "var(--dp-accent-soft)", color: "var(--dp-accent)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <RefreshCw size={14} strokeWidth={2.5} /> Try Again
            </button>
          </div>
        )}

        {/* ── No tasks ── */}
        {noTasks && !prioritiesQuery.isError && (
          <div style={{
            padding: "48px 20px", textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
              background: "rgba(139,92,246,0.10)",
              border: "1px solid rgba(139,92,246,0.14)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={24} color="var(--dp-accent)" strokeWidth={2} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6 }}>
              No tasks for today
            </div>
            <div style={{ fontSize: 13, color: "var(--dp-text-muted)", lineHeight: 1.5 }}>
              Add tasks to your dreams and they will appear here for AI prioritization.
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {!prioritiesQuery.isLoading && !prioritiesQuery.isError && prioritizedTasks.length > 0 && (
          <div>
            {/* ══ Focus Task ══ */}
            {focusTask && (focusTask.taskTitle || focusTask.task_title) && (
              <div className={mounted ? "dp-dp-fadein" : ""} style={{
                animationDelay: "0ms",
                marginBottom: 20, marginTop: 8,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: BRAND.orange,
                  textTransform: "uppercase", letterSpacing: "0.5px",
                  marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Star size={14} strokeWidth={2.5} fill={BRAND.orange} color={BRAND.orange} />
                  Focus Task
                </div>
                <div style={{
                  padding: "16px 18px",
                  borderRadius: 16,
                  background: isLight
                    ? "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(251,191,36,0.04) 100%)"
                    : "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(251,191,36,0.06) 100%)",
                  border: "1.5px solid " + (isLight ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.30)"),
                  boxShadow: "0 2px 16px rgba(245,158,11,0.10)",
                }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: "var(--dp-text)",
                    marginBottom: 6, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <Target size={16} color={BRAND.orange} strokeWidth={2.5} />
                    {focusTask.taskTitle || focusTask.task_title}
                  </div>
                  {focusTask.dreamTitle && (
                    <div style={{
                      fontSize: 11, color: "var(--dp-text-muted)", marginBottom: 8,
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: focusTask.dreamColor || focusTask.dream_color || BRAND.purple,
                        display: "inline-block", flexShrink: 0,
                      }} />
                      {focusTask.dreamTitle || focusTask.dream_title}
                    </div>
                  )}
                  <div style={{
                    fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5,
                  }}>
                    {focusTask.reason}
                  </div>
                  {(focusTask.durationMins || focusTask.duration_mins) && (
                    <div style={{
                      fontSize: 11, color: "var(--dp-text-muted)", marginTop: 8,
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <Clock size={11} strokeWidth={2.5} />
                      {focusTask.durationMins || focusTask.duration_mins} min
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ Quick Wins ══ */}
            {quickWins.length > 0 && (
              <div className={mounted ? "dp-dp-fadein" : ""} style={{
                animationDelay: "80ms", marginBottom: 20,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: BRAND.greenSolid,
                  textTransform: "uppercase", letterSpacing: "0.5px",
                  marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Zap size={14} strokeWidth={2.5} fill={BRAND.greenSolid} color={BRAND.greenSolid} />
                  Quick Wins
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {quickWins.map(function (qw, idx) {
                    return (
                      <div key={qw.taskId || qw.task_id || idx} style={{
                        padding: "10px 14px", borderRadius: 12,
                        background: isLight
                          ? "rgba(16,185,129,0.06)"
                          : "rgba(16,185,129,0.08)",
                        border: "1px solid " + (isLight ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.15)"),
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        <Zap size={14} color={BRAND.greenSolid} strokeWidth={2} style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {qw.taskTitle || qw.task_title}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--dp-text-muted)", marginTop: 2 }}>
                            {qw.reason}
                          </div>
                        </div>
                        {(qw.durationMins || qw.duration_mins) && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, color: BRAND.greenSolid,
                            padding: "2px 7px", borderRadius: 8,
                            background: "rgba(16,185,129,0.12)",
                            flexShrink: 0,
                          }}>
                            {qw.durationMins || qw.duration_mins}m
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ Full Prioritized List ══ */}
            <div className={mounted ? "dp-dp-fadein" : ""} style={{
              animationDelay: "160ms",
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: "var(--dp-text-secondary)",
                textTransform: "uppercase", letterSpacing: "0.5px",
                marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
              }}>
                <Sparkles size={14} strokeWidth={2.5} color="var(--dp-accent)" />
                Optimal Order
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {prioritizedTasks.map(function (pt, idx) {
                  var rank = pt.rank || (idx + 1);
                  var energyMatch = pt.energyMatch || pt.energy_match || "medium";

                  return (
                    <div key={pt.taskId || pt.task_id || idx} className={mounted ? "dp-dp-fadein" : ""} style={{
                      animationDelay: (200 + idx * 60) + "ms",
                      padding: "12px 14px", borderRadius: 12,
                      background: isLight
                        ? "rgba(139,92,246,0.04)"
                        : "rgba(139,92,246,0.06)",
                      border: "1px solid " + (isLight ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.10)"),
                      display: "flex", alignItems: "flex-start", gap: 12,
                      transition: "all 0.2s ease",
                    }}>
                      {/* Rank number */}
                      <div style={{
                        width: 28, height: 28, borderRadius: 9,
                        background: rank === 1
                          ? "linear-gradient(135deg, rgba(245,158,11,0.20), rgba(251,191,36,0.12))"
                          : rank <= 3
                          ? "rgba(139,92,246,0.12)"
                          : "var(--dp-surface)",
                        border: rank === 1
                          ? "1px solid rgba(245,158,11,0.30)"
                          : "1px solid var(--dp-glass-border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                        color: rank === 1 ? BRAND.orange : "var(--dp-text-secondary)",
                      }}>
                        {rank}
                      </div>

                      {/* Task info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          marginBottom: 4,
                        }}>
                          {pt.taskTitle || pt.task_title}
                        </div>

                        {/* Dream label */}
                        {(pt.dreamTitle || pt.dream_title) && (
                          <div style={{
                            fontSize: 11, color: "var(--dp-text-muted)",
                            display: "flex", alignItems: "center", gap: 4, marginBottom: 4,
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: pt.dreamColor || pt.dream_color || BRAND.purple,
                              display: "inline-block", flexShrink: 0,
                            }} />
                            {pt.dreamTitle || pt.dream_title}
                          </div>
                        )}

                        {/* Reason */}
                        <div style={{
                          fontSize: 11, color: "var(--dp-text-tertiary)", lineHeight: 1.4,
                        }}>
                          {pt.reason}
                        </div>
                      </div>

                      {/* Right side: time + energy */}
                      <div style={{
                        display: "flex", flexDirection: "column", alignItems: "flex-end",
                        gap: 4, flexShrink: 0,
                      }}>
                        {(pt.suggestedTime || pt.suggested_time) && (
                          <div style={{
                            fontSize: 11, fontWeight: 600, color: "var(--dp-accent)",
                            display: "flex", alignItems: "center", gap: 3,
                          }}>
                            <Clock size={10} strokeWidth={2.5} />
                            {pt.suggestedTime || pt.suggested_time}
                          </div>
                        )}
                        <EnergyIcon level={energyMatch} size={16} />
                        {(pt.durationMins || pt.duration_mins) && (
                          <span style={{
                            fontSize: 10, color: "var(--dp-text-muted)",
                          }}>
                            {pt.durationMins || pt.duration_mins}m
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ══ Re-prioritize Button ══ */}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
              <button
                onClick={handleReprioritize}
                disabled={prioritiesQuery.isFetching}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 22px", borderRadius: 14,
                  border: "1px solid var(--dp-accent-border)",
                  background: "var(--dp-accent-soft)",
                  color: "var(--dp-accent)",
                  fontSize: 13, fontWeight: 600,
                  cursor: prioritiesQuery.isFetching ? "wait" : "pointer",
                  transition: "all 0.25s",
                  fontFamily: "inherit",
                  opacity: prioritiesQuery.isFetching ? 0.6 : 1,
                }}
              >
                <RefreshCw
                  size={14} strokeWidth={2.5}
                  style={{
                    animation: prioritiesQuery.isFetching ? "dpSpin 1s linear infinite" : "none",
                  }}
                />
                {prioritiesQuery.isFetching ? "Analyzing..." : "Re-prioritize"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ KEYFRAME ANIMATIONS ═══ */}
      <style>{
        "@keyframes dpBrainPulse {" +
          "0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139,92,246,0.2); }" +
          "50% { transform: scale(1.06); box-shadow: 0 0 24px 4px rgba(139,92,246,0.15); }" +
        "}" +
        "@keyframes dpSpin {" +
          "from { transform: rotate(0deg); }" +
          "to { transform: rotate(360deg); }" +
        "}" +
        "@keyframes dpDpFadeIn {" +
          "from { opacity: 0; transform: translateY(10px); }" +
          "to { opacity: 1; transform: translateY(0); }" +
        "}" +
        ".dp-dp-fadein {" +
          "animation: dpDpFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;" +
        "}"
      }</style>
    </GlassModal>
  );
}
