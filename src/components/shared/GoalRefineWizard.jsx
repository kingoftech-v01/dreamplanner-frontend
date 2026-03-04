import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import GlassModal from "./GlassModal";
import GradientButton from "./GradientButton";
import GlassInput from "./GlassInput";
import { apiPost, apiPatch } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import {
  Sparkles, Send, Check, Target, BarChart2,
  Award, Clock, ArrowRight, Loader, X, Wand2,
  CheckCircle
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * GoalRefineWizard — Conversational SMART Goal Refinement
 *
 * Props:
 *   open        - boolean to show/hide the modal
 *   onClose     - callback to close the modal
 *   goal        - { id, title, description } — the goal to refine
 *   dreamId     - UUID of the parent dream
 *   onApplied   - callback after refinement is applied (for cache invalidation)
 * ═══════════════════════════════════════════════════════════════════ */

var SMART_CRITERIA = [
  { key: "specific", label: "Specific", icon: Target, color: "#8B5CF6" },
  { key: "measurable", label: "Measurable", icon: BarChart2, color: "#3B82F6" },
  { key: "achievable", label: "Achievable", icon: Award, color: "#10B981" },
  { key: "relevant", label: "Relevant", icon: Sparkles, color: "#F59E0B" },
  { key: "timeBound", label: "Time-bound", icon: Clock, color: "#EF4444" },
];

var STEPS = ["Understanding", "Clarifying", "Refining", "SMART Goal Ready"];

export default function GoalRefineWizard({ open, onClose, goal, dreamId, onApplied }) {
  var [messages, setMessages] = useState([]);
  var [history, setHistory] = useState([]);
  var [input, setInput] = useState("");
  var [isLoading, setIsLoading] = useState(false);
  var [refinedGoal, setRefinedGoal] = useState(null);
  var [milestones, setMilestones] = useState(null);
  var [isComplete, setIsComplete] = useState(false);
  var [step, setStep] = useState(0);
  var [isApplying, setIsApplying] = useState(false);
  var [applied, setApplied] = useState(false);
  var chatEndRef = useRef(null);
  var inputRef = useRef(null);
  var queryClient = useQueryClient();

  /* ── Auto-start the conversation when modal opens ── */
  useEffect(function () {
    if (open && goal && messages.length === 0) {
      sendMessage("Help me refine this goal into a SMART goal.", true);
    }
  }, [open, goal]);

  /* ── Reset state on close ── */
  useEffect(function () {
    if (!open) {
      setMessages([]);
      setHistory([]);
      setInput("");
      setIsLoading(false);
      setRefinedGoal(null);
      setMilestones(null);
      setIsComplete(false);
      setStep(0);
      setIsApplying(false);
      setApplied(false);
    }
  }, [open]);

  /* ── Auto-scroll to bottom ── */
  useEffect(function () {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  /* ── Send message to the AI ── */
  var sendMessage = function (text, isInitial) {
    if (!text.trim() || isLoading) return;

    var userMsg = { role: "user", content: text, id: Date.now() };
    if (!isInitial) {
      setMessages(function (prev) { return prev.concat([userMsg]); });
    }
    setInput("");
    setIsLoading(true);

    var currentHistory = isInitial ? [] : history;

    apiPost(DREAMS.GOALS.REFINE, {
      goal_id: goal.id,
      message: text,
      history: currentHistory,
    }).then(function (res) {
      var aiMsg = {
        role: "assistant",
        content: res.message,
        id: Date.now() + 1,
        refinedGoal: res.refinedGoal || null,
        milestones: res.milestones || null,
      };

      setMessages(function (prev) {
        var base = isInitial ? [] : prev;
        return base.concat([aiMsg]);
      });

      /* Update history for the next turn */
      var newHistory = currentHistory.concat([
        { role: "user", content: text },
        { role: "assistant", content: res.message },
      ]);
      setHistory(newHistory);

      /* Progress tracking */
      var turnCount = Math.floor(newHistory.length / 2);
      if (res.isComplete) {
        setStep(3);
      } else if (turnCount >= 3) {
        setStep(2);
      } else if (turnCount >= 1) {
        setStep(1);
      }

      if (res.refinedGoal) {
        setRefinedGoal(res.refinedGoal);
      }
      if (res.milestones) {
        setMilestones(res.milestones);
      }
      if (res.isComplete) {
        setIsComplete(true);
      }

      setIsLoading(false);

      /* Focus input for next message */
      setTimeout(function () {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }).catch(function (err) {
      var errMsg = {
        role: "assistant",
        content: err.userMessage || err.message || "Something went wrong. Please try again.",
        id: Date.now() + 1,
        isError: true,
      };
      setMessages(function (prev) { return prev.concat([errMsg]); });
      setIsLoading(false);
    });
  };

  var handleKeyDown = function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /* ── Apply refined goal ── */
  var handleApply = function () {
    if (!refinedGoal || isApplying) return;
    setIsApplying(true);

    apiPatch(DREAMS.GOALS.DETAIL(goal.id), {
      title: refinedGoal.title,
      description: refinedGoal.description,
    }).then(function () {
      setApplied(true);
      setIsApplying(false);
      if (onApplied) onApplied();
      queryClient.invalidateQueries({ queryKey: ["dream", dreamId] });
      queryClient.invalidateQueries({ queryKey: ["dreams"] });
    }).catch(function (err) {
      setIsApplying(false);
    });
  };

  /* ── Progress bar ── */
  var progressBar = (
    <div style={{
      display: "flex", alignItems: "center", gap: 4, padding: "12px 20px",
      borderBottom: "1px solid var(--dp-divider)", flexShrink: 0,
    }}>
      {STEPS.map(function (label, i) {
        var isActive = i <= step;
        var isCurrent = i === step;
        return (
          <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              height: 4, width: "100%", borderRadius: 2,
              background: isActive ? "var(--dp-accent)" : "var(--dp-divider)",
              transition: "background 0.4s ease",
              boxShadow: isActive ? "0 0 8px rgba(139,92,246,0.3)" : "none",
            }} />
            <span style={{
              fontSize: 9, fontWeight: isCurrent ? 700 : 500,
              color: isActive ? "var(--dp-accent)" : "var(--dp-text-muted)",
              transition: "all 0.3s", textAlign: "center", lineHeight: 1.2,
            }}>{label}</span>
          </div>
        );
      })}
    </div>
  );

  /* ── Chat messages ── */
  var chatArea = (
    <div style={{
      flex: 1, overflowY: "auto", padding: "16px 16px 8px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {messages.map(function (msg) {
        var isUser = msg.role === "user";
        return (
          <div key={msg.id} style={{
            display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
            animation: "dpFadeScale 0.25s ease-out",
          }}>
            <div style={{
              maxWidth: "85%", padding: "10px 14px", borderRadius: 16,
              borderBottomRightRadius: isUser ? 4 : 16,
              borderBottomLeftRadius: isUser ? 16 : 4,
              background: isUser
                ? "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.1))"
                : msg.isError
                  ? "rgba(239,68,68,0.08)"
                  : "var(--dp-surface)",
              border: isUser
                ? "1px solid rgba(139,92,246,0.2)"
                : msg.isError
                  ? "1px solid rgba(239,68,68,0.15)"
                  : "1px solid var(--dp-glass-border)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}>
              {!isUser && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
                }}>
                  <Wand2 size={12} strokeWidth={2.5} color={"var(--dp-accent)"} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--dp-accent)" }}>AI Coach</span>
                </div>
              )}
              <div style={{
                fontSize: 13, lineHeight: 1.6,
                color: msg.isError ? "var(--dp-danger)" : "var(--dp-text-primary)",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {msg.content}
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          display: "flex", justifyContent: "flex-start",
          animation: "dpFadeScale 0.25s ease-out",
        }}>
          <div style={{
            padding: "10px 14px", borderRadius: 16, borderBottomLeftRadius: 4,
            background: "var(--dp-surface)",
            border: "1px solid var(--dp-glass-border)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Wand2 size={12} strokeWidth={2.5} color={"var(--dp-accent)"} />
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--dp-accent)", animation: "dpPulse 1.2s ease-in-out infinite", animationDelay: "0ms" }} />
              <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--dp-accent)", animation: "dpPulse 1.2s ease-in-out infinite", animationDelay: "200ms" }} />
              <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--dp-accent)", animation: "dpPulse 1.2s ease-in-out infinite", animationDelay: "400ms" }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Refined Goal Summary Card ── */}
      {refinedGoal && isComplete && (
        <div style={{
          animation: "dpFadeScale 0.35s ease-out",
          background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.06))",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: 18, padding: 20, marginTop: 4,
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, #8B5CF6, #6366F1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
            }}>
              <Target size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}>Refined SMART Goal</div>
              <div style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>Ready to apply</div>
            </div>
          </div>

          {/* Title + Description */}
          <div style={{
            padding: "12px 14px", borderRadius: 12,
            background: "var(--dp-surface)", border: "1px solid var(--dp-glass-border)",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)", marginBottom: 6 }}>
              {refinedGoal.title}
            </div>
            <div style={{ fontSize: 12, color: "var(--dp-text-secondary)", lineHeight: 1.5 }}>
              {refinedGoal.description}
            </div>
            {refinedGoal.measurableTarget && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginTop: 8,
                padding: "6px 10px", borderRadius: 8,
                background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)",
              }}>
                <BarChart2 size={12} color="#3B82F6" strokeWidth={2.5} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#3B82F6" }}>
                  {refinedGoal.measurableTarget}
                </span>
              </div>
            )}
            {refinedGoal.timeline && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginTop: 6,
                padding: "6px 10px", borderRadius: 8,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)",
              }}>
                <Clock size={12} color="#EF4444" strokeWidth={2.5} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#EF4444" }}>
                  {refinedGoal.timeline}
                </span>
              </div>
            )}
          </div>

          {/* SMART Criteria Checkmarks */}
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14,
          }}>
            {SMART_CRITERIA.map(function (c) {
              var Icon = c.icon;
              return (
                <div key={c.key} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 20,
                  background: c.color + "12",
                  border: "1px solid " + c.color + "25",
                }}>
                  <CheckCircle size={11} color={c.color} strokeWidth={2.5} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: c.color }}>{c.label}</span>
                </div>
              );
            })}
          </div>

          {/* Milestones */}
          {milestones && milestones.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: "var(--dp-text-secondary)",
                marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
              }}>
                <Award size={13} color={"var(--dp-accent)"} strokeWidth={2.5} />
                Suggested Milestones
              </div>
              {milestones.map(function (ms, i) {
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0",
                    borderBottom: i < milestones.length - 1 ? "1px solid var(--dp-divider)" : "none",
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 7,
                      background: "rgba(139,92,246,0.1)",
                      border: "1px solid rgba(139,92,246,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--dp-accent)" }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text)" }}>{ms.title}</div>
                      {ms.targetDate && (
                        <div style={{ fontSize: 11, color: "var(--dp-text-muted)", marginTop: 2 }}>
                          {ms.targetDate}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Apply / Applied */}
          {!applied ? (
            <GradientButton
              gradient="primaryDark"
              onClick={handleApply}
              disabled={isApplying}
              style={{ width: "100%" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {isApplying ? (
                  <Loader size={14} strokeWidth={2.5} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Sparkles size={14} strokeWidth={2.5} />
                )}
                {isApplying ? "Applying..." : "Apply Refinement"}
              </div>
            </GradientButton>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px", borderRadius: 12,
              background: "rgba(93,229,168,0.1)", border: "1px solid rgba(93,229,168,0.25)",
            }}>
              <CheckCircle size={16} color="var(--dp-success)" strokeWidth={2.5} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-success)" }}>
                Goal Updated Successfully!
              </span>
            </div>
          )}
        </div>
      )}

      <div ref={chatEndRef} />
    </div>
  );

  /* ── Input area ── */
  var inputArea = (
    <div style={{
      padding: "12px 16px", borderTop: "1px solid var(--dp-divider)", flexShrink: 0,
      background: "var(--dp-modal-bg)",
    }}>
      {applied ? (
        <GradientButton gradient="primaryDark" onClick={onClose} style={{ width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Check size={14} strokeWidth={2.5} />
            Done
          </div>
        </GradientButton>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <GlassInput
              ref={inputRef}
              value={input}
              onChange={function (e) { setInput(e.target.value); }}
              onKeyDown={handleKeyDown}
              placeholder={isComplete ? "Continue the conversation or apply above..." : "Type your response..."}
              disabled={isLoading}
              multiline
              style={{ minHeight: 40, maxHeight: 100 }}
            />
          </div>
          <button
            onClick={function () { sendMessage(input); }}
            disabled={!input.trim() || isLoading}
            style={{
              width: 40, height: 40, borderRadius: 12, border: "none",
              background: input.trim() && !isLoading
                ? "linear-gradient(135deg, #8B5CF6, #6366F1)"
                : "var(--dp-surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !isLoading ? "pointer" : "default",
              transition: "all 0.2s", flexShrink: 0,
              boxShadow: input.trim() && !isLoading ? "0 4px 12px rgba(139,92,246,0.3)" : "none",
            }}
          >
            <Send
              size={16}
              strokeWidth={2.5}
              color={input.trim() && !isLoading ? "#fff" : "var(--dp-text-muted)"}
            />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      variant="center"
      title={null}
      maxWidth={480}
      style={{ height: "min(85vh, 640px)", display: "flex", flexDirection: "column" }}
    >
      {/* Custom header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", borderBottom: "1px solid var(--dp-divider)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.15))",
            border: "1px solid rgba(139,92,246,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Wand2 size={16} strokeWidth={2.5} color={"var(--dp-accent)"} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)" }}>Refine with AI</div>
            <div style={{
              fontSize: 11, color: "var(--dp-text-muted)",
              maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {goal ? goal.title : ""}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            width: 32, height: 32, borderRadius: 10, border: "none",
            background: "var(--dp-surface)", display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <X size={16} strokeWidth={2.5} color={"var(--dp-text-muted)"} />
        </button>
      </div>

      {progressBar}
      {chatArea}
      {inputArea}

      {/* Inline keyframe for the loading dots */}
      <style>{"\n@keyframes dpPulse {\n  0%, 100% { opacity: 0.3; transform: scale(0.8); }\n  50% { opacity: 1; transform: scale(1.1); }\n}\n@keyframes spin {\n  from { transform: rotate(0deg); }\n  to { transform: rotate(360deg); }\n}\n"}</style>
    </GlassModal>
  );
}
