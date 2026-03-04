import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Zap, AlertTriangle, Check, Loader2, X } from "lucide-react";
import GlassModal from "./GlassModal";
import GradientButton from "./GradientButton";
import { apiPost, apiPatch } from "../../services/api";
import { DREAMS } from "../../services/endpoints";

/* ═══════════════════════════════════════════════════════════════════
 * DurationEstimatePanel
 * Glass modal that shows AI-estimated durations for a list of tasks.
 * ═══════════════════════════════════════════════════════════════════ */

var COMPLEXITY_COLORS = {
  simple: { bg: "rgba(93,229,168,0.12)", text: "var(--dp-success)", label: "Simple" },
  moderate: { bg: "rgba(139,92,246,0.12)", text: "var(--dp-accent)", label: "Moderate" },
  complex: { bg: "rgba(251,146,60,0.12)", text: "var(--dp-warning)", label: "Complex" },
};

function formatMinutes(mins) {
  if (!mins && mins !== 0) return "--";
  if (mins < 60) return mins + "m";
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  return m > 0 ? h + "h " + m + "m" : h + "h";
}

function RangeBar(props) {
  var optimistic = props.optimistic || 0;
  var realistic = props.realistic || 0;
  var pessimistic = props.pessimistic || 0;
  var maxVal = pessimistic || realistic || optimistic || 1;

  var optPct = Math.round((optimistic / maxVal) * 100);
  var realPct = Math.round((realistic / maxVal) * 100);

  return (
    <div style={{ width: "100%", marginTop: 6, marginBottom: 4 }}>
      <div style={{
        position: "relative", height: 8, borderRadius: 4,
        background: "rgba(251,146,60,0.18)", overflow: "hidden",
      }}>
        {/* Optimistic (green fill) */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: optPct + "%", borderRadius: 4,
          background: "rgba(93,229,168,0.5)",
          transition: "width 0.4s ease",
        }} />
        {/* Realistic (blue fill, layered on top up to realistic %) */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: realPct + "%", borderRadius: 4,
          background: "rgba(99,179,237,0.45)",
          transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, fontWeight: 600 }}>
        <span style={{ color: "var(--dp-success)" }}>{formatMinutes(optimistic)}</span>
        <span style={{ color: "var(--dp-info, #63B3ED)" }}>{formatMinutes(realistic)}</span>
        <span style={{ color: "var(--dp-warning)" }}>{formatMinutes(pessimistic)}</span>
      </div>
    </div>
  );
}

export default function DurationEstimatePanel(props) {
  var open = props.open;
  var onClose = props.onClose;
  var taskIds = props.taskIds || [];
  var dreamId = props.dreamId;
  var tasks = props.tasks || [];

  var queryClient = useQueryClient();
  var [estimates, setEstimates] = useState(null);
  var [totals, setTotals] = useState(null);
  var [applying, setApplying] = useState({});
  var [applyingAll, setApplyingAll] = useState(false);
  var [allApplied, setAllApplied] = useState(false);

  var estimateMut = useMutation({
    mutationFn: function (data) {
      return apiPost(DREAMS.TASKS.ESTIMATE_DURATIONS, data);
    },
    onSuccess: function (data) {
      setEstimates(data.estimates || []);
      setTotals({
        optimistic: data.total_optimistic_minutes,
        realistic: data.total_realistic_minutes,
        pessimistic: data.total_pessimistic_minutes,
        count: data.tasks_count,
      });
    },
  });

  // Fetch estimates when opened and not already loaded
  var prevOpenRef = useState(false);
  if (open && !prevOpenRef[0] && taskIds.length > 0) {
    prevOpenRef[1](true);
    estimateMut.mutate({ task_ids: taskIds });
  }
  if (!open && prevOpenRef[0]) {
    prevOpenRef[1](false);
    // Reset state when modal closes
    if (estimates) {
      setEstimates(null);
      setTotals(null);
      setApplying({});
      setApplyingAll(false);
      setAllApplied(false);
    }
  }

  var handleApplySingle = function (est) {
    var taskId = est.task_id;
    setApplying(function (prev) { var n = {}; n[taskId] = true; return Object.assign({}, prev, n); });
    apiPatch(DREAMS.TASKS.DETAIL(taskId), { duration_mins: est.realistic_minutes })
      .then(function () {
        setApplying(function (prev) { var n = {}; n[taskId] = "done"; return Object.assign({}, prev, n); });
        queryClient.invalidateQueries({ queryKey: ["dream", dreamId] });
      })
      .catch(function () {
        setApplying(function (prev) { var n = {}; n[taskId] = false; return Object.assign({}, prev, n); });
      });
  };

  var handleApplyAll = function () {
    setApplyingAll(true);
    apiPost(DREAMS.TASKS.ESTIMATE_DURATIONS, { task_ids: taskIds, apply: true })
      .then(function () {
        setApplyingAll(false);
        setAllApplied(true);
        queryClient.invalidateQueries({ queryKey: ["dream", dreamId] });
      })
      .catch(function () {
        setApplyingAll(false);
      });
  };

  // Build a task title lookup
  var taskTitleMap = {};
  tasks.forEach(function (t) { taskTitleMap[t.id] = t.title; });

  return (
    <GlassModal open={open} onClose={onClose} variant="center" title="Duration Estimates" maxWidth={480}>
      <div style={{ padding: 20, maxHeight: "70vh", overflowY: "auto" }}>

        {/* Loading state */}
        {estimateMut.isPending && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "40px 0", gap: 12,
          }}>
            <Loader2 size={28} strokeWidth={2} color="var(--dp-accent)" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, color: "var(--dp-text-secondary)", fontWeight: 500 }}>
              Analyzing tasks and estimating durations...
            </span>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error state */}
        {estimateMut.isError && (
          <div style={{
            padding: 20, textAlign: "center", color: "var(--dp-danger)",
            fontSize: 13, fontWeight: 500,
          }}>
            <AlertTriangle size={24} style={{ marginBottom: 8, opacity: 0.7 }} />
            <div>Failed to estimate durations. Please try again.</div>
            <button onClick={function () { estimateMut.mutate({ task_ids: taskIds }); }} style={{
              marginTop: 12, padding: "8px 20px", borderRadius: 10,
              border: "1px solid var(--dp-accent-border, rgba(139,92,246,0.3))",
              background: "rgba(139,92,246,0.08)", color: "var(--dp-accent)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              Retry
            </button>
          </div>
        )}

        {/* Estimates list */}
        {estimates && estimates.length > 0 && (
          <div>
            {/* Legend */}
            <div style={{
              display: "flex", gap: 14, marginBottom: 14, fontSize: 10,
              fontWeight: 600, color: "var(--dp-text-muted)",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(93,229,168,0.6)" }} />
                Optimistic
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(99,179,237,0.6)" }} />
                Realistic
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(251,146,60,0.5)" }} />
                Pessimistic
              </span>
            </div>

            {estimates.map(function (est, idx) {
              var complexity = COMPLEXITY_COLORS[est.complexity] || COMPLEXITY_COLORS.moderate;
              var taskTitle = taskTitleMap[est.task_id] || "Task " + (idx + 1);
              var applyState = applying[est.task_id];

              return (
                <div key={est.task_id || idx} style={{
                  padding: "12px 14px", marginBottom: 8, borderRadius: 14,
                  border: "1px solid var(--dp-glass-border)",
                  background: "var(--dp-pill-bg)",
                  transition: "all 0.2s ease",
                }}>
                  {/* Task header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {taskTitle}
                      </div>
                    </div>
                    {/* Complexity badge */}
                    <span style={{
                      padding: "2px 8px", borderRadius: 6, fontSize: 10,
                      fontWeight: 700, textTransform: "uppercase", flexShrink: 0,
                      background: complexity.bg, color: complexity.text,
                    }}>
                      {complexity.label}
                    </span>
                  </div>

                  {/* Range bar */}
                  <RangeBar
                    optimistic={est.optimistic_minutes}
                    realistic={est.realistic_minutes}
                    pessimistic={est.pessimistic_minutes}
                  />

                  {/* Reasoning */}
                  {est.reasoning && (
                    <div style={{
                      fontSize: 11, color: "var(--dp-text-tertiary)", lineHeight: 1.4,
                      marginTop: 4, marginBottom: 6,
                    }}>
                      {est.reasoning}
                    </div>
                  )}

                  {/* Apply button */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button
                      onClick={function () { handleApplySingle(est); }}
                      disabled={applyState === true || applyState === "done" || allApplied}
                      style={{
                        padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                        border: "1px solid rgba(139,92,246,0.2)",
                        background: applyState === "done" || allApplied ? "rgba(93,229,168,0.12)" : "rgba(139,92,246,0.08)",
                        color: applyState === "done" || allApplied ? "var(--dp-success)" : "var(--dp-accent)",
                        cursor: applyState === true || applyState === "done" || allApplied ? "default" : "pointer",
                        fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
                        transition: "all 0.2s ease", opacity: applyState === true ? 0.6 : 1,
                      }}
                    >
                      {applyState === "done" || allApplied ? (
                        <><Check size={11} strokeWidth={2.5} />Applied</>
                      ) : applyState === true ? (
                        <><Loader2 size={11} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />Applying...</>
                      ) : (
                        <><Clock size={11} strokeWidth={2} />Apply {formatMinutes(est.realistic_minutes)}</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Summary & Apply All */}
            <div style={{
              marginTop: 12, padding: "14px 16px", borderRadius: 14,
              background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(93,229,168,0.06))",
              border: "1px solid var(--dp-glass-border)",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 10,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>
                  Total Estimated Time
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: "var(--dp-text-muted)",
                }}>
                  {totals ? totals.count : 0} tasks
                </span>
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--dp-success)", marginBottom: 2, textTransform: "uppercase" }}>Optimistic</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-success)" }}>
                    {totals ? formatMinutes(totals.optimistic) : "--"}
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--dp-info, #63B3ED)", marginBottom: 2, textTransform: "uppercase" }}>Realistic</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-info, #63B3ED)" }}>
                    {totals ? formatMinutes(totals.realistic) : "--"}
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--dp-warning)", marginBottom: 2, textTransform: "uppercase" }}>Pessimistic</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-warning)" }}>
                    {totals ? formatMinutes(totals.pessimistic) : "--"}
                  </div>
                </div>
              </div>

              <GradientButton
                gradient="primaryDark"
                onClick={handleApplyAll}
                disabled={applyingAll || allApplied}
                style={{ width: "100%" }}
              >
                {allApplied ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Check size={14} strokeWidth={2.5} />All Estimates Applied
                  </span>
                ) : applyingAll ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />Applying All...
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Zap size={14} strokeWidth={2} />Apply All Estimates
                  </span>
                )}
              </GradientButton>
            </div>
          </div>
        )}

        {/* Empty state (loaded but no estimates) */}
        {estimates && estimates.length === 0 && (
          <div style={{
            padding: 30, textAlign: "center", color: "var(--dp-text-muted)",
            fontSize: 13, fontWeight: 500,
          }}>
            No estimates returned. Try again with different tasks.
          </div>
        )}
      </div>
    </GlassModal>
  );
}
