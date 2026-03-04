import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiGet } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import { useToast } from "../../context/ToastContext";
import { hapticLight, hapticSuccess } from "../../utils/haptics";
import { BRAND, GRADIENTS, GRADIENT_SHADOWS } from "../../styles/colors";
import GlassModal from "./GlassModal";
import GradientButton from "./GradientButton";
import {
  Sparkles, Check, X, Clock, Star, ChevronDown, Loader2,
  Wand2, Plus, Trash2, GripVertical
} from "lucide-react";

/* ======================================================================
 * NaturalTaskCreator
 *
 * Glass-morphism modal that lets users type tasks in natural language,
 * sends them to the AI parse endpoint, and shows editable parsed results
 * as cards. The user can tweak titles, reassign dreams/goals, adjust
 * duration & priority, include/exclude tasks, then create them in bulk.
 * ====================================================================== */

var PLACEHOLDER_TEXT =
  "Add tasks in any format, e.g.:\n" +
  "- Call dentist tomorrow\n" +
  "- Study for 2 hours (high priority)\n" +
  "- Buy groceries and plan meals for the week";

var NaturalTaskCreator = function NaturalTaskCreator(props) {
  var open = props.open;
  var onClose = props.onClose;
  var initialText = props.initialText || "";
  var queryClient = useQueryClient();
  var { showToast } = useToast();

  var [text, setText] = useState(initialText);
  var [parsedTasks, setParsedTasks] = useState([]);
  var [dreams, setDreams] = useState([]);
  var [phase, setPhase] = useState("input"); // "input" | "review"
  var textareaRef = useRef(null);

  // Reset state when modal opens/closes
  useEffect(function () {
    if (open) {
      setText(initialText || "");
      setParsedTasks([]);
      setPhase("input");
      setTimeout(function () {
        if (textareaRef.current) textareaRef.current.focus();
      }, 150);
    }
  }, [open, initialText]);

  // ── Parse mutation ──
  var parseMutation = useMutation({
    mutationFn: function (body) {
      return apiPost(DREAMS.TASKS.PARSE_NATURAL, body);
    },
    onSuccess: function (data) {
      hapticLight();
      var tasks = (data.tasks || []).map(function (t, i) {
        return {
          _key: Date.now() + "-" + i,
          included: true,
          title: t.title || "",
          description: t.description || "",
          duration_mins: t.duration_mins || 30,
          priority: t.priority || 3,
          matched_dream_id: t.matched_dream_id || null,
          matched_goal_id: t.matched_goal_id || null,
          matched_dream_title: t.matched_dream_title || null,
          matched_goal_title: t.matched_goal_title || null,
          deadline_hint: t.deadline_hint || null,
        };
      });
      setParsedTasks(tasks);
      setDreams(data.dreams || []);
      setPhase("review");
    },
    onError: function (err) {
      var msg = (err && err.error) || (err && err.userMessage) || (err && err.message) || "Failed to parse tasks";
      showToast(msg, "error");
    },
  });

  // ── Create mutation ──
  var createMutation = useMutation({
    mutationFn: function (body) {
      return apiPost(DREAMS.TASKS.CREATE_FROM_PARSED, body);
    },
    onSuccess: function (data) {
      hapticSuccess();
      var count = Array.isArray(data) ? data.length : 1;
      showToast(count + " task" + (count > 1 ? "s" : "") + " created!", "success");
      queryClient.invalidateQueries({ queryKey: ["dreams"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
    onError: function (err) {
      var msg = (err && err.error) || (err && err.userMessage) || (err && err.message) || "Failed to create tasks";
      showToast(msg, "error");
    },
  });

  var handleParse = function () {
    var trimmed = text.trim();
    if (!trimmed) return;
    parseMutation.mutate({ text: trimmed });
  };

  var handleCreate = function () {
    var selected = parsedTasks.filter(function (t) { return t.included; });
    if (selected.length === 0) {
      showToast("Select at least one task to create.", "warning");
      return;
    }
    createMutation.mutate({
      tasks: selected.map(function (t) {
        return {
          title: t.title,
          description: t.description,
          duration_mins: t.duration_mins,
          priority: t.priority,
          matched_dream_id: t.matched_dream_id,
          matched_goal_id: t.matched_goal_id,
          deadline_hint: t.deadline_hint,
        };
      }),
    });
  };

  var updateTask = function (key, field, value) {
    setParsedTasks(function (prev) {
      return prev.map(function (t) {
        if (t._key !== key) return t;
        var updated = Object.assign({}, t);
        updated[field] = value;
        return updated;
      });
    });
  };

  var removeTask = function (key) {
    setParsedTasks(function (prev) {
      return prev.filter(function (t) { return t._key !== key; });
    });
  };

  var selectedCount = parsedTasks.filter(function (t) { return t.included; }).length;

  // ── Styles ──
  var textareaStyle = {
    width: "100%",
    minHeight: 140,
    maxHeight: 240,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid var(--dp-input-border, rgba(255,255,255,0.1))",
    background: "var(--dp-surface, rgba(255,255,255,0.05))",
    color: "var(--dp-text)",
    fontSize: 14,
    fontFamily: "inherit",
    lineHeight: 1.6,
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.2s",
  };

  var cardStyle = function (included) {
    return {
      padding: "14px 16px",
      borderRadius: 16,
      background: included
        ? "var(--dp-glass-bg, rgba(255,255,255,0.06))"
        : "var(--dp-surface, rgba(255,255,255,0.02))",
      border: included
        ? "1px solid var(--dp-glass-border, rgba(255,255,255,0.1))"
        : "1px solid var(--dp-divider, rgba(255,255,255,0.04))",
      opacity: included ? 1 : 0.5,
      transition: "all 0.25s ease",
      marginBottom: 10,
    };
  };

  var inputFieldStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--dp-input-border, rgba(255,255,255,0.08))",
    background: "transparent",
    color: "var(--dp-text)",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    outline: "none",
  };

  var smallInputStyle = {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid var(--dp-input-border, rgba(255,255,255,0.08))",
    background: "transparent",
    color: "var(--dp-text)",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    width: 70,
    textAlign: "center",
  };

  var selectStyle = {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid var(--dp-input-border, rgba(255,255,255,0.08))",
    background: "var(--dp-surface, rgba(255,255,255,0.05))",
    color: "var(--dp-text)",
    fontSize: 12,
    fontFamily: "inherit",
    outline: "none",
    cursor: "pointer",
    maxWidth: 160,
  };

  var starBtnStyle = function (filled) {
    return {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 2,
      color: filled ? BRAND.yellow || "#F59E0B" : "var(--dp-text-tertiary)",
      transition: "color 0.15s, transform 0.15s",
      display: "flex",
      alignItems: "center",
      fontFamily: "inherit",
    };
  };

  var chipStyle = function (active) {
    return {
      padding: "4px 10px",
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer",
      border: active ? "1px solid var(--dp-accent)" : "1px solid var(--dp-glass-border, rgba(255,255,255,0.08))",
      background: active ? "rgba(139,92,246,0.15)" : "transparent",
      color: active ? "var(--dp-accent)" : "var(--dp-text-secondary)",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
      fontFamily: "inherit",
    };
  };

  // ── Render ──
  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={phase === "input" ? "AI Task Creator" : "Review Parsed Tasks"}
      maxWidth={520}
    >
      <div style={{ padding: "16px 20px 20px" }}>

        {/* ── INPUT PHASE ── */}
        {phase === "input" && (
          <div>
            <p style={{
              fontSize: 13,
              color: "var(--dp-text-secondary)",
              marginBottom: 12,
              lineHeight: 1.5,
            }}>
              Describe your tasks in any format. AI will parse them into structured tasks you can review and edit.
            </p>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={function (e) { setText(e.target.value); }}
              placeholder={PLACEHOLDER_TEXT}
              style={textareaStyle}
              maxLength={5000}
              disabled={parseMutation.isPending}
              onFocus={function (e) { e.target.style.borderColor = "var(--dp-accent)"; }}
              onBlur={function (e) { e.target.style.borderColor = "var(--dp-input-border, rgba(255,255,255,0.1))"; }}
            />

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
            }}>
              <span style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>
                {text.length}/5000
              </span>
              <GradientButton
                onClick={handleParse}
                icon={parseMutation.isPending ? undefined : Wand2}
                loading={parseMutation.isPending}
                disabled={!text.trim() || parseMutation.isPending}
              >
                {parseMutation.isPending ? "Parsing..." : "Parse with AI"}
              </GradientButton>
            </div>
          </div>
        )}

        {/* ── REVIEW PHASE ── */}
        {phase === "review" && (
          <div>
            {/* Back / summary row */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}>
              <button
                onClick={function () { setPhase("input"); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--dp-accent)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "4px 0",
                }}
              >
                Edit input
              </button>
              <span style={{ fontSize: 12, color: "var(--dp-text-secondary)" }}>
                {selectedCount} of {parsedTasks.length} selected
              </span>
            </div>

            {/* Task cards */}
            {parsedTasks.length === 0 && (
              <div style={{
                textAlign: "center",
                padding: "30px 16px",
                color: "var(--dp-text-tertiary)",
                fontSize: 14,
              }}>
                No tasks found. Try rephrasing your input.
              </div>
            )}

            <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
              {parsedTasks.map(function (task) {
                return (
                  <div key={task._key} style={cardStyle(task.included)}>
                    {/* Row 1: checkbox + title + remove */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <button
                        onClick={function () { updateTask(task._key, "included", !task.included); }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 7,
                          border: task.included
                            ? "none"
                            : "2px solid var(--dp-text-tertiary)",
                          background: task.included
                            ? GRADIENTS.primary
                            : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                          transition: "all 0.2s",
                          fontFamily: "inherit",
                        }}
                        aria-label={task.included ? "Exclude task" : "Include task"}
                      >
                        {task.included && <Check size={13} color="#fff" strokeWidth={3} />}
                      </button>

                      <input
                        type="text"
                        value={task.title}
                        onChange={function (e) { updateTask(task._key, "title", e.target.value); }}
                        style={inputFieldStyle}
                        maxLength={255}
                      />

                      <button
                        onClick={function () { removeTask(task._key); }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--dp-text-tertiary)",
                          cursor: "pointer",
                          padding: 4,
                          flexShrink: 0,
                          display: "flex",
                          fontFamily: "inherit",
                        }}
                        aria-label="Remove task"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>

                    {/* Row 2: Dream/Goal assignment */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <select
                        value={task.matched_dream_id || ""}
                        onChange={function (e) {
                          var dreamId = e.target.value || null;
                          updateTask(task._key, "matched_dream_id", dreamId);
                          // Auto-select first goal
                          var dream = dreams.find(function (d) { return d.id === dreamId; });
                          var firstGoal = dream && dream.goals && dream.goals.length > 0 ? dream.goals[0].id : null;
                          updateTask(task._key, "matched_goal_id", firstGoal);
                        }}
                        style={selectStyle}
                      >
                        <option value="">No dream</option>
                        {dreams.map(function (d) {
                          return <option key={d.id} value={d.id}>{d.title}</option>;
                        })}
                      </select>

                      {task.matched_dream_id && (function () {
                        var dream = dreams.find(function (d) { return d.id === task.matched_dream_id; });
                        var goals = dream ? (dream.goals || []) : [];
                        if (goals.length === 0) return null;
                        return (
                          <select
                            value={task.matched_goal_id || ""}
                            onChange={function (e) { updateTask(task._key, "matched_goal_id", e.target.value || null); }}
                            style={selectStyle}
                          >
                            <option value="">Auto-assign goal</option>
                            {goals.map(function (g) {
                              return <option key={g.id} value={g.id}>{g.title}</option>;
                            })}
                          </select>
                        );
                      })()}
                    </div>

                    {/* Row 3: Duration + Priority + Deadline */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {/* Duration */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={13} color="var(--dp-text-tertiary)" strokeWidth={2} />
                        <input
                          type="number"
                          value={task.duration_mins || ""}
                          onChange={function (e) {
                            var val = parseInt(e.target.value, 10);
                            updateTask(task._key, "duration_mins", isNaN(val) ? null : Math.max(1, Math.min(480, val)));
                          }}
                          style={smallInputStyle}
                          min={1}
                          max={480}
                          placeholder="min"
                        />
                        <span style={{ fontSize: 11, color: "var(--dp-text-tertiary)" }}>min</span>
                      </div>

                      {/* Priority stars */}
                      <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {[1, 2, 3, 4, 5].map(function (level) {
                          var filled = level <= (task.priority || 0);
                          return (
                            <button
                              key={level}
                              onClick={function () { updateTask(task._key, "priority", level); }}
                              style={starBtnStyle(filled)}
                              aria-label={"Priority " + level}
                            >
                              <Star size={14} strokeWidth={2} fill={filled ? (BRAND.yellow || "#F59E0B") : "none"} />
                            </button>
                          );
                        })}
                      </div>

                      {/* Deadline hint */}
                      {task.deadline_hint && (
                        <span style={{
                          fontSize: 11,
                          color: "var(--dp-accent)",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 8,
                          background: "rgba(139,92,246,0.1)",
                        }}>
                          {task.deadline_hint}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create button */}
            {parsedTasks.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <GradientButton
                  onClick={handleCreate}
                  icon={createMutation.isPending ? undefined : Plus}
                  loading={createMutation.isPending}
                  disabled={selectedCount === 0 || createMutation.isPending}
                  fullWidth
                >
                  {createMutation.isPending
                    ? "Creating..."
                    : "Create " + selectedCount + " Task" + (selectedCount > 1 ? "s" : "")}
                </GradientButton>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassModal>
  );
};

export default NaturalTaskCreator;
