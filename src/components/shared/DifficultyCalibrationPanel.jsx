import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Gauge, Zap, Target, Trophy, AlertTriangle,
  Check, Loader2, ChevronRight, ArrowUp, ArrowDown,
  Minus, Clock, Flame, Star,
} from "lucide-react";
import GlassModal from "./GlassModal";
import GradientButton from "./GradientButton";
import { apiGet, apiPost } from "../../services/api";
import { DREAMS } from "../../services/endpoints";

/* ===================================================================
 * DifficultyCalibrationPanel
 * Glass modal showing AI-powered difficulty assessment and calibration
 * for the user's tasks based on completion patterns.
 * =================================================================== */

var DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    color: "var(--dp-success)",
    bg: "rgba(93,229,168,0.12)",
    border: "rgba(93,229,168,0.25)",
    icon: Minus,
  },
  moderate: {
    label: "Moderate",
    color: "var(--dp-accent)",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.25)",
    icon: Target,
  },
  challenging: {
    label: "Challenging",
    color: "var(--dp-warning)",
    bg: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.25)",
    icon: Flame,
  },
  expert: {
    label: "Expert",
    color: "var(--dp-danger, #F87171)",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.25)",
    icon: Star,
  },
};

function DifficultyBadge(props) {
  var level = props.level || "moderate";
  var small = props.small;
  var cfg = DIFFICULTY_CONFIG[level] || DIFFICULTY_CONFIG.moderate;
  return (
    <span style={{
      padding: small ? "2px 7px" : "3px 10px",
      borderRadius: 6,
      fontSize: small ? 10 : 11,
      fontWeight: 700,
      textTransform: "uppercase",
      background: cfg.bg,
      color: cfg.color,
      border: "1px solid " + cfg.border,
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
    }}>
      {props.children || cfg.label}
    </span>
  );
}

function CalibrationGauge(props) {
  var score = props.score || 0;
  var pct = Math.round(score * 100);

  // Color gradient: red (0) -> yellow (0.5) -> green (1)
  var gaugeColor = score < 0.4
    ? "var(--dp-danger, #F87171)"
    : score < 0.7
      ? "var(--dp-warning)"
      : "var(--dp-success)";

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)" }}>
          Calibration Score
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: gaugeColor }}>
          {pct}%
        </span>
      </div>
      <div style={{
        width: "100%", height: 10, borderRadius: 5,
        background: "var(--dp-surface)",
        overflow: "hidden",
        border: "1px solid var(--dp-glass-border)",
      }}>
        <div style={{
          width: pct + "%",
          height: "100%",
          borderRadius: 5,
          background: gaugeColor,
          transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 4, fontSize: 9, fontWeight: 600, color: "var(--dp-text-muted)",
        textTransform: "uppercase",
      }}>
        <span>Too Hard</span>
        <span>Well Calibrated</span>
        <span>Too Easy</span>
      </div>
    </div>
  );
}

function DifficultyArrow(props) {
  var from = props.from;
  var to = props.to;
  var levels = ["easy", "moderate", "challenging", "expert"];
  var fromIdx = levels.indexOf(from);
  var toIdx = levels.indexOf(to);

  if (toIdx > fromIdx) {
    return <ArrowUp size={14} color="var(--dp-warning)" strokeWidth={2.5} />;
  } else if (toIdx < fromIdx) {
    return <ArrowDown size={14} color="var(--dp-success)" strokeWidth={2.5} />;
  }
  return <Minus size={14} color="var(--dp-text-muted)" strokeWidth={2.5} />;
}

export default function DifficultyCalibrationPanel(props) {
  var open = props.open;
  var onClose = props.onClose;

  var queryClient = useQueryClient();
  var [data, setData] = useState(null);
  var [applying, setApplying] = useState({});
  var [applyingAll, setApplyingAll] = useState(false);
  var [allApplied, setAllApplied] = useState(false);
  var [challengeAccepted, setChallengeAccepted] = useState(false);

  var calibrateMut = useMutation({
    mutationFn: function () {
      return apiGet(DREAMS.TASKS.CALIBRATE_DIFFICULTY);
    },
    onSuccess: function (res) {
      setData(res);
    },
  });

  // Trigger fetch when opened
  var prevOpenRef = useState(false);
  if (open && !prevOpenRef[0]) {
    prevOpenRef[1](true);
    calibrateMut.mutate();
  }
  if (!open && prevOpenRef[0]) {
    prevOpenRef[1](false);
    // Reset
    if (data) {
      setData(null);
      setApplying({});
      setApplyingAll(false);
      setAllApplied(false);
      setChallengeAccepted(false);
    }
  }

  var handleApplySingle = function (suggestion) {
    var taskId = suggestion.taskId;
    setApplying(function (prev) { var n = {}; n[taskId] = true; return Object.assign({}, prev, n); });
    apiPost(DREAMS.TASKS.APPLY_CALIBRATION, {
      suggestions: [{ taskId: suggestion.taskId, modifiedTask: suggestion.modifiedTask }],
    })
      .then(function () {
        setApplying(function (prev) { var n = {}; n[taskId] = "done"; return Object.assign({}, prev, n); });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dreams"] });
      })
      .catch(function () {
        setApplying(function (prev) { var n = {}; n[taskId] = false; return Object.assign({}, prev, n); });
      });
  };

  var handleApplyAll = function () {
    if (!data || !data.suggestions) return;
    setApplyingAll(true);
    apiPost(DREAMS.TASKS.APPLY_CALIBRATION, {
      suggestions: data.suggestions.map(function (s) {
        return { taskId: s.taskId, modifiedTask: s.modifiedTask };
      }),
    })
      .then(function () {
        setApplyingAll(false);
        setAllApplied(true);
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dreams"] });
      })
      .catch(function () {
        setApplyingAll(false);
      });
  };

  var handleAcceptChallenge = function () {
    setChallengeAccepted(true);
  };

  return (
    <GlassModal open={open} onClose={onClose} variant="center" title="Difficulty Calibration" maxWidth={500}>
      <div style={{ padding: 20, maxHeight: "72vh", overflowY: "auto" }}>

        {/* Loading state */}
        {calibrateMut.isPending && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "48px 0", gap: 14,
          }}>
            <Loader2 size={30} strokeWidth={2} color="var(--dp-accent)" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, color: "var(--dp-text-secondary)", fontWeight: 500, textAlign: "center" }}>
              Analyzing your task patterns and calibrating difficulty...
            </span>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error state */}
        {calibrateMut.isError && (
          <div style={{
            padding: 24, textAlign: "center", color: "var(--dp-danger, #F87171)",
            fontSize: 13, fontWeight: 500,
          }}>
            <AlertTriangle size={24} style={{ marginBottom: 8, opacity: 0.7 }} />
            <div>Failed to calibrate difficulty. Please try again.</div>
            <button onClick={function () { calibrateMut.mutate(); }} style={{
              marginTop: 14, padding: "8px 20px", borderRadius: 10,
              border: "1px solid var(--dp-accent-border, rgba(139,92,246,0.3))",
              background: "rgba(139,92,246,0.08)", color: "var(--dp-accent)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              Retry
            </button>
          </div>
        )}

        {/* Results */}
        {data && (
          <div>
            {/* ── Difficulty Level Badge ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, marginBottom: 18, padding: "14px 16px", borderRadius: 14,
              background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(236,72,153,0.04))",
              border: "1px solid var(--dp-glass-border)",
            }}>
              <Gauge size={22} color="var(--dp-accent)" strokeWidth={2} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                  Your Current Level
                </div>
                <DifficultyBadge level={data.difficultyLevel}>
                  {(DIFFICULTY_CONFIG[data.difficultyLevel] || DIFFICULTY_CONFIG.moderate).label}
                </DifficultyBadge>
              </div>
            </div>

            {/* ── Calibration Score Gauge ── */}
            <CalibrationGauge score={data.calibrationScore} />

            {/* ── Analysis ── */}
            {data.analysis && (
              <div style={{
                padding: "12px 14px", borderRadius: 12, marginBottom: 16,
                background: "var(--dp-pill-bg)",
                border: "1px solid var(--dp-glass-border)",
                fontSize: 12, lineHeight: 1.5, color: "var(--dp-text-secondary)",
                fontWeight: 500,
              }}>
                {data.analysis}
              </div>
            )}

            {/* ── Task Adjustments ── */}
            {data.suggestions && data.suggestions.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                }}>
                  <Target size={15} color="var(--dp-accent)" strokeWidth={2.5} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>
                    Task Adjustments
                  </h3>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "var(--dp-text-muted)",
                    padding: "1px 6px", borderRadius: 4, background: "var(--dp-surface)",
                  }}>
                    {data.suggestions.length}
                  </span>
                </div>

                {data.suggestions.map(function (s, idx) {
                  var fromCfg = DIFFICULTY_CONFIG[s.currentDifficulty] || DIFFICULTY_CONFIG.moderate;
                  var toCfg = DIFFICULTY_CONFIG[s.suggestedDifficulty] || DIFFICULTY_CONFIG.moderate;
                  var applyState = applying[s.taskId];

                  return (
                    <div key={s.taskId || idx} style={{
                      padding: "12px 14px", marginBottom: 8, borderRadius: 14,
                      border: "1px solid var(--dp-glass-border)",
                      background: "var(--dp-pill-bg)",
                      transition: "all 0.2s ease",
                    }}>
                      {/* Task title */}
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                        marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {s.taskTitle || s.modifiedTask.title || "Task"}
                      </div>

                      {/* Dream label */}
                      {s.dreamTitle && (
                        <div style={{ fontSize: 10, color: "var(--dp-text-muted)", marginBottom: 6 }}>
                          {s.dreamTitle}
                        </div>
                      )}

                      {/* Difficulty change indicator */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <DifficultyBadge level={s.currentDifficulty} small />
                        <DifficultyArrow from={s.currentDifficulty} to={s.suggestedDifficulty} />
                        <DifficultyBadge level={s.suggestedDifficulty} small />
                        {s.modifiedTask && s.modifiedTask.durationMins && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, color: "var(--dp-text-muted)",
                            display: "flex", alignItems: "center", gap: 3, marginLeft: "auto",
                          }}>
                            <Clock size={10} strokeWidth={2.5} />
                            {s.modifiedTask.durationMins}m
                          </span>
                        )}
                      </div>

                      {/* Reason */}
                      {s.reason && (
                        <div style={{
                          fontSize: 11, color: "var(--dp-text-tertiary)", lineHeight: 1.4,
                          marginBottom: 6,
                        }}>
                          {s.reason}
                        </div>
                      )}

                      {/* Proposed change preview */}
                      {s.modifiedTask && s.modifiedTask.title && (
                        <div style={{
                          padding: "8px 10px", borderRadius: 8, marginBottom: 6,
                          background: "rgba(139,92,246,0.04)",
                          border: "1px solid rgba(139,92,246,0.1)",
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-accent)", marginBottom: 2 }}>
                            Proposed: {s.modifiedTask.title}
                          </div>
                          {s.modifiedTask.description && (
                            <div style={{ fontSize: 10, color: "var(--dp-text-tertiary)", lineHeight: 1.3 }}>
                              {s.modifiedTask.description.length > 120
                                ? s.modifiedTask.description.substring(0, 120) + "..."
                                : s.modifiedTask.description}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Apply button */}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={function () { handleApplySingle(s); }}
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
                            <><Zap size={11} strokeWidth={2} />Apply</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Daily Target Recommendation ── */}
            {data.dailyTarget && (
              <div style={{
                padding: "14px 16px", borderRadius: 14, marginBottom: 16,
                background: "linear-gradient(135deg, rgba(93,229,168,0.06), rgba(99,179,237,0.06))",
                border: "1px solid rgba(93,229,168,0.15)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                }}>
                  <Target size={15} color="var(--dp-success)" strokeWidth={2.5} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>
                    Recommended Daily Target
                  </h3>
                </div>
                <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  <div style={{
                    flex: 1, padding: "10px 12px", borderRadius: 10, textAlign: "center",
                    background: "rgba(93,229,168,0.08)", border: "1px solid rgba(93,229,168,0.15)",
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--dp-success)" }}>
                      {data.dailyTarget.tasks || 5}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--dp-text-muted)", textTransform: "uppercase" }}>
                      Tasks/day
                    </div>
                  </div>
                  <div style={{
                    flex: 1, padding: "10px 12px", borderRadius: 10, textAlign: "center",
                    background: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.15)",
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--dp-info, #63B3ED)" }}>
                      {data.dailyTarget.focusMinutes || 60}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--dp-text-muted)", textTransform: "uppercase" }}>
                      Focus mins
                    </div>
                  </div>
                </div>
                {data.dailyTarget.reason && (
                  <div style={{ fontSize: 11, color: "var(--dp-text-tertiary)", lineHeight: 1.4 }}>
                    {data.dailyTarget.reason}
                  </div>
                )}
              </div>
            )}

            {/* ── AI Challenge Card ── */}
            {data.challenge && (
              <div style={{
                padding: "14px 16px", borderRadius: 14, marginBottom: 16,
                background: "linear-gradient(135deg, rgba(251,146,60,0.06), rgba(236,72,153,0.06))",
                border: "1px solid rgba(251,146,60,0.15)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                }}>
                  <Trophy size={15} color="var(--dp-warning)" strokeWidth={2.5} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>
                    AI Challenge
                  </h3>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: "var(--dp-text)", marginBottom: 4,
                }}>
                  {data.challenge.title}
                </div>
                <div style={{
                  fontSize: 12, color: "var(--dp-text-secondary)", lineHeight: 1.5, marginBottom: 10,
                }}>
                  {data.challenge.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: "rgba(251,146,60,0.12)", color: "var(--dp-warning)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Zap size={12} strokeWidth={2.5} />
                    +{data.challenge.rewardXp || 50} XP
                  </span>
                  <span style={{
                    padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: "rgba(139,92,246,0.08)", color: "var(--dp-accent)",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Clock size={12} strokeWidth={2.5} />
                    {data.challenge.deadlineDays || 7} days
                  </span>
                </div>
                <button
                  onClick={handleAcceptChallenge}
                  disabled={challengeAccepted}
                  style={{
                    width: "100%", padding: "10px 16px", borderRadius: 10,
                    border: challengeAccepted ? "1px solid rgba(93,229,168,0.3)" : "1px solid rgba(251,146,60,0.3)",
                    background: challengeAccepted
                      ? "rgba(93,229,168,0.1)"
                      : "linear-gradient(135deg, rgba(251,146,60,0.12), rgba(236,72,153,0.08))",
                    color: challengeAccepted ? "var(--dp-success)" : "var(--dp-warning)",
                    fontSize: 13, fontWeight: 700, cursor: challengeAccepted ? "default" : "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 6, transition: "all 0.2s ease",
                  }}
                >
                  {challengeAccepted ? (
                    <><Check size={15} strokeWidth={2.5} />Challenge Accepted!</>
                  ) : (
                    <><Trophy size={15} strokeWidth={2.5} />Accept Challenge</>
                  )}
                </button>
              </div>
            )}

            {/* ── Apply All Adjustments Button ── */}
            {data.suggestions && data.suggestions.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <GradientButton
                  gradient="primaryDark"
                  onClick={handleApplyAll}
                  disabled={applyingAll || allApplied}
                  style={{ width: "100%" }}
                >
                  {allApplied ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Check size={14} strokeWidth={2.5} />All Adjustments Applied
                    </span>
                  ) : applyingAll ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />Applying All...
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Zap size={14} strokeWidth={2} />Apply All Adjustments
                    </span>
                  )}
                </GradientButton>
              </div>
            )}

            {/* Empty suggestions state */}
            {data.suggestions && data.suggestions.length === 0 && (
              <div style={{
                padding: 20, textAlign: "center", color: "var(--dp-text-muted)",
                fontSize: 12, fontWeight: 500, marginBottom: 8,
              }}>
                Your tasks are well-calibrated! No adjustments needed right now.
              </div>
            )}
          </div>
        )}
      </div>
    </GlassModal>
  );
}
