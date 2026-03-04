import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../services/api";
import { CALENDAR } from "../../services/endpoints";
import { BRAND } from "../../styles/colors";
import GlassModal from "./GlassModal";
import GlassCard from "./GlassCard";
import GlassInput from "./GlassInput";
import GradientButton from "./GradientButton";
import {
  X, Plus, Check, Flame, Star, Heart, Zap, Target,
  Dumbbell, BookOpen, Music, Coffee, Droplets, Moon, Sun,
  Brain, Smile, Pencil, TrendingUp, BarChart3, ChevronLeft,
  Repeat, Circle, CheckCircle, Trash2, Edit3,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * Habit Tracker Panel — slide-up modal for managing habits
 * ═══════════════════════════════════════════════════════════════════ */

var ICON_OPTIONS = [
  { name: "star", Icon: Star },
  { name: "heart", Icon: Heart },
  { name: "zap", Icon: Zap },
  { name: "target", Icon: Target },
  { name: "dumbbell", Icon: Dumbbell },
  { name: "book-open", Icon: BookOpen },
  { name: "music", Icon: Music },
  { name: "coffee", Icon: Coffee },
  { name: "droplets", Icon: Droplets },
  { name: "moon", Icon: Moon },
  { name: "sun", Icon: Sun },
  { name: "brain", Icon: Brain },
  { name: "smile", Icon: Smile },
  { name: "pencil", Icon: Pencil },
  { name: "repeat", Icon: Repeat },
  { name: "trending-up", Icon: TrendingUp },
];

var COLOR_OPTIONS = [
  "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B",
  "#10B981", "#14B8A6", "#3B82F6", "#6366F1",
  "#F97316", "#84CC16", "#06B6D4", "#A855F7",
];

var FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

var DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getIconComponent(iconName) {
  var found = ICON_OPTIONS.find(function (o) { return o.name === iconName; });
  return found ? found.Icon : Star;
}

function formatDateISO(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function HabitTrackerPanel({ open, onClose }) {
  var queryClient = useQueryClient();
  var [view, setView] = useState("list"); // "list" | "create" | "stats"
  var [statsHabit, setStatsHabit] = useState(null);
  var [editHabit, setEditHabit] = useState(null);

  // Create form state
  var [formName, setFormName] = useState("");
  var [formDesc, setFormDesc] = useState("");
  var [formFreq, setFormFreq] = useState("daily");
  var [formCustomDays, setFormCustomDays] = useState([]);
  var [formTarget, setFormTarget] = useState(1);
  var [formColor, setFormColor] = useState("#8B5CF6");
  var [formIcon, setFormIcon] = useState("star");

  // Streak celebration state
  var [celebration, setCelebration] = useState(null);

  var todayStr = formatDateISO(new Date());

  // ── Fetch habits ──
  var habitsQuery = useQuery({
    queryKey: ["habits"],
    queryFn: function () { return apiGet(CALENDAR.HABITS.LIST); },
    enabled: open,
    staleTime: 30 * 1000,
  });

  var habits = useMemo(function () {
    var raw = habitsQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (raw.results && Array.isArray(raw.results)) return raw.results;
    return [];
  }, [habitsQuery.data]);

  // ── Create habit mutation ──
  var createMut = useMutation({
    mutationFn: function (data) { return apiPost(CALENDAR.HABITS.LIST, data); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habit-calendar-data"] });
      resetForm();
      setView("list");
    },
  });

  // ── Update habit mutation ──
  var updateMut = useMutation({
    mutationFn: function (data) { return apiPatch(CALENDAR.HABITS.DETAIL(data.id), data); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habit-calendar-data"] });
      resetForm();
      setEditHabit(null);
      setView("list");
    },
  });

  // ── Delete habit mutation ──
  var deleteMut = useMutation({
    mutationFn: function (id) { return apiDelete(CALENDAR.HABITS.DETAIL(id)); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habit-calendar-data"] });
      setView("list");
    },
  });

  // ── Complete habit mutation ──
  var completeMut = useMutation({
    mutationFn: function (params) { return apiPost(CALENDAR.HABITS.COMPLETE(params.id), { date: params.date }); },
    onSuccess: function (data) {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habit-calendar-data"] });
      if (data.streak_continued && data.streak_current > 1) {
        setCelebration({ streak: data.streak_current });
        setTimeout(function () { setCelebration(null); }, 2200);
      }
    },
  });

  // ── Uncomplete habit mutation ──
  var uncompleteMut = useMutation({
    mutationFn: function (params) { return apiPost(CALENDAR.HABITS.UNCOMPLETE(params.id), { date: params.date }); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habit-calendar-data"] });
    },
  });

  // ── Stats query ──
  var statsQuery = useQuery({
    queryKey: ["habit-stats", statsHabit],
    queryFn: function () { return apiGet(CALENDAR.HABITS.STATS(statsHabit)); },
    enabled: !!statsHabit && view === "stats",
    staleTime: 30 * 1000,
  });

  function resetForm() {
    setFormName("");
    setFormDesc("");
    setFormFreq("daily");
    setFormCustomDays([]);
    setFormTarget(1);
    setFormColor("#8B5CF6");
    setFormIcon("star");
    setEditHabit(null);
  }

  function openCreate() {
    resetForm();
    setView("create");
  }

  function openEdit(habit) {
    setEditHabit(habit);
    setFormName(habit.name || "");
    setFormDesc(habit.description || "");
    setFormFreq(habit.frequency || "daily");
    setFormCustomDays(habit.custom_days || []);
    setFormTarget(habit.target_per_day || 1);
    setFormColor(habit.color || "#8B5CF6");
    setFormIcon(habit.icon || "star");
    setView("create");
  }

  function openStats(habit) {
    setStatsHabit(habit.id);
    setView("stats");
  }

  function handleSubmit() {
    var payload = {
      name: formName,
      description: formDesc,
      frequency: formFreq,
      custom_days: formFreq === "custom" ? formCustomDays : [],
      target_per_day: formTarget,
      color: formColor,
      icon: formIcon,
    };
    if (editHabit) {
      payload.id = editHabit.id;
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  }

  function toggleCompletion(habit) {
    var isCompleted = (habit.completions_today || 0) >= (habit.target_per_day || 1);
    if (isCompleted) {
      uncompleteMut.mutate({ id: habit.id, date: todayStr });
    } else {
      completeMut.mutate({ id: habit.id, date: todayStr });
    }
  }

  function toggleCustomDay(day) {
    setFormCustomDays(function (prev) {
      if (prev.indexOf(day) >= 0) {
        return prev.filter(function (d) { return d !== day; });
      }
      return prev.concat([day]);
    });
  }

  var statsData = statsQuery.data || null;

  // ── Render ──
  return (
    <GlassModal open={open} onClose={onClose} variant="center" maxWidth={520}>
      <div style={{ padding: 24, maxHeight: "80vh", overflowY: "auto" }}>

        {/* ── Streak Celebration Overlay ── */}
        {celebration && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{
              animation: "dpHabitCelebrate 2s ease-out forwards",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}>
              <div style={{ fontSize: 48, lineHeight: 1 }}>{"\uD83D\uDD25"}</div>
              <div style={{
                fontSize: 24, fontWeight: 800,
                background: "linear-gradient(135deg, #F59E0B, #EF4444)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{celebration.streak} day streak!</div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          {view !== "list" ? (
            <button onClick={function () { setView("list"); resetForm(); }} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              borderRadius: 10, border: "1px solid var(--dp-accent-border)",
              background: "var(--dp-glass-bg)", color: "var(--dp-text-primary)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>
              <ChevronLeft size={14} strokeWidth={2} />
              Back
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Repeat size={18} color={BRAND.purple} strokeWidth={2} />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>Habits</h2>
            </div>
          )}
          <button aria-label="Close" onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10,
            border: "1px solid var(--dp-accent-border)", background: "var(--dp-glass-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontFamily: "inherit",
          }}>
            <X size={16} color="var(--dp-text-muted)" strokeWidth={2} />
          </button>
        </div>

        {/* ════════════════════════════════════════════
         *  LIST VIEW
         * ════════════════════════════════════════════ */}
        {view === "list" && (
          <>
            {habits.length === 0 ? (
              <GlassCard padding="32px 20px" style={{ textAlign: "center" }}>
                <Repeat size={32} color="var(--dp-text-muted)" strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text-secondary)", marginBottom: 4 }}>No habits yet</div>
                <div style={{ fontSize: 13, color: "var(--dp-text-muted)", marginBottom: 16 }}>Start building positive habits to track on your calendar</div>
                <GradientButton onClick={openCreate} size="sm">
                  <Plus size={14} strokeWidth={2} />
                  <span>Add Your First Habit</span>
                </GradientButton>
              </GlassCard>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {habits.map(function (habit) {
                  var HIcon = getIconComponent(habit.icon);
                  var isCompleted = (habit.completions_today || 0) >= (habit.target_per_day || 1);
                  var isPartial = (habit.completions_today || 0) > 0 && !isCompleted;
                  return (
                    <GlassCard key={habit.id} padding="12px 14px" style={{
                      border: isCompleted ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--dp-accent-border)",
                      background: isCompleted ? "rgba(34,197,94,0.06)" : "transparent",
                      transition: "all 0.2s ease",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {/* Completion toggle */}
                        <button
                          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
                          onClick={function () { toggleCompletion(habit); }}
                          disabled={completeMut.isPending || uncompleteMut.isPending}
                          style={{
                            width: 36, height: 36, borderRadius: 12, border: "none",
                            background: isCompleted ? "rgba(34,197,94,0.15)" : isPartial ? (habit.color + "22") : "var(--dp-glass-bg)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle size={20} color={BRAND.greenSolid} strokeWidth={2.5} />
                          ) : (
                            <HIcon size={18} color={habit.color} strokeWidth={2} />
                          )}
                        </button>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={function () { openStats(habit); }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600,
                            color: isCompleted ? "var(--dp-text-muted)" : "var(--dp-text)",
                            textDecoration: isCompleted ? "line-through" : "none",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{habit.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                            <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>{habit.frequency}</span>
                            {habit.target_per_day > 1 && (
                              <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>
                                {habit.completions_today || 0}/{habit.target_per_day}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Streak */}
                        {habit.streak_current > 0 && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 3,
                            padding: "4px 8px", borderRadius: 8,
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.2)",
                          }}>
                            <Flame size={12} color="#F59E0B" strokeWidth={2.5} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B" }}>{habit.streak_current}</span>
                          </div>
                        )}

                        {/* Edit */}
                        <button
                          aria-label="Edit habit"
                          onClick={function () { openEdit(habit); }}
                          style={{
                            width: 28, height: 28, borderRadius: 8, border: "1px solid var(--dp-accent-border)",
                            background: "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          <Edit3 size={12} color="var(--dp-text-muted)" strokeWidth={2} />
                        </button>
                      </div>
                    </GlassCard>
                  );
                })}

                {/* Add button */}
                <button onClick={openCreate} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "12px", borderRadius: 12,
                  border: "1px dashed var(--dp-accent-border)",
                  background: "transparent", color: "var(--dp-accent)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}>
                  <Plus size={14} strokeWidth={2} />
                  Add Habit
                </button>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════
         *  CREATE / EDIT VIEW
         * ════════════════════════════════════════════ */}
        {view === "create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>
              {editHabit ? "Edit Habit" : "New Habit"}
            </h3>

            {/* Name */}
            <GlassInput
              label="Habit Name"
              placeholder="e.g. Meditate, Exercise, Read..."
              value={formName}
              onChange={function (e) { setFormName(e.target.value); }}
              maxLength={100}
            />

            {/* Description */}
            <GlassInput
              label="Description (optional)"
              placeholder="Why this habit matters to you"
              value={formDesc}
              onChange={function (e) { setFormDesc(e.target.value); }}
              multiline
            />

            {/* Frequency */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", marginBottom: 6 }}>Frequency</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FREQUENCY_OPTIONS.map(function (opt) {
                  var sel = formFreq === opt.value;
                  return (
                    <button key={opt.value} onClick={function () { setFormFreq(opt.value); }} style={{
                      padding: "6px 14px", borderRadius: 10,
                      border: sel ? "1px solid var(--dp-accent)" : "1px solid var(--dp-accent-border)",
                      background: sel ? "var(--dp-accent-soft)" : "transparent",
                      color: sel ? "var(--dp-accent)" : "var(--dp-text-primary)",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    }}>{opt.label}</button>
                  );
                })}
              </div>
            </div>

            {/* Custom days picker */}
            {formFreq === "custom" && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", marginBottom: 6 }}>Select Days</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {DAY_LABELS.map(function (label, i) {
                    var sel = formCustomDays.indexOf(i) >= 0;
                    return (
                      <button key={i} onClick={function () { toggleCustomDay(i); }} style={{
                        width: 36, height: 36, borderRadius: 10,
                        border: sel ? "1px solid var(--dp-accent)" : "1px solid var(--dp-accent-border)",
                        background: sel ? "var(--dp-accent-soft)" : "transparent",
                        color: sel ? "var(--dp-accent)" : "var(--dp-text-primary)",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{label}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Target per day */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", marginBottom: 6 }}>Target per day</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={function () { setFormTarget(Math.max(1, formTarget - 1)); }} style={{
                  width: 32, height: 32, borderRadius: 10,
                  border: "1px solid var(--dp-accent-border)", background: "var(--dp-glass-bg)",
                  color: "var(--dp-text-primary)", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{"\u2212"}</button>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)", minWidth: 24, textAlign: "center" }}>{formTarget}</span>
                <button onClick={function () { setFormTarget(Math.min(100, formTarget + 1)); }} style={{
                  width: 32, height: 32, borderRadius: 10,
                  border: "1px solid var(--dp-accent-border)", background: "var(--dp-glass-bg)",
                  color: "var(--dp-text-primary)", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>+</button>
                <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>time{formTarget !== 1 ? "s" : ""} / day</span>
              </div>
            </div>

            {/* Color picker */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", marginBottom: 6 }}>Color</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COLOR_OPTIONS.map(function (c) {
                  var sel = formColor === c;
                  return (
                    <button key={c} onClick={function () { setFormColor(c); }} style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: c, border: sel ? "2px solid var(--dp-text)" : "2px solid transparent",
                      cursor: "pointer", transition: "all 0.15s",
                      boxShadow: sel ? "0 0 8px " + c + "66" : "none",
                    }} />
                  );
                })}
              </div>
            </div>

            {/* Icon picker */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", marginBottom: 6 }}>Icon</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ICON_OPTIONS.map(function (opt) {
                  var sel = formIcon === opt.name;
                  return (
                    <button key={opt.name} onClick={function () { setFormIcon(opt.name); }} style={{
                      width: 36, height: 36, borderRadius: 10,
                      border: sel ? "1px solid " + formColor : "1px solid var(--dp-accent-border)",
                      background: sel ? formColor + "1A" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                      <opt.Icon size={16} color={sel ? formColor : "var(--dp-text-muted)"} strokeWidth={2} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {editHabit && (
                <button onClick={function () {
                  if (confirm("Delete this habit? This cannot be undone.")) {
                    deleteMut.mutate(editHabit.id);
                  }
                }} style={{
                  padding: "10px 16px", borderRadius: 12,
                  border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
                  color: "#EF4444", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Trash2 size={14} strokeWidth={2} />
                  Delete
                </button>
              )}
              <GradientButton
                onClick={handleSubmit}
                disabled={!formName.trim() || createMut.isPending || updateMut.isPending}
                style={{ flex: 1 }}
              >
                <Check size={14} strokeWidth={2} />
                <span>{editHabit ? "Save Changes" : "Create Habit"}</span>
              </GradientButton>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
         *  STATS VIEW
         * ════════════════════════════════════════════ */}
        {view === "stats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {statsQuery.isLoading ? (
              <GlassCard padding="32px 20px" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--dp-text-muted)" }}>Loading stats...</div>
              </GlassCard>
            ) : statsData ? (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>{statsData.name}</h3>

                {/* Key stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  <GlassCard padding="12px 8px" style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
                      <Flame size={14} color="#F59E0B" strokeWidth={2.5} />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#F59E0B" }}>{statsData.streak_current}</div>
                    <div style={{ fontSize: 10, color: "var(--dp-text-muted)", marginTop: 2 }}>Current Streak</div>
                  </GlassCard>
                  <GlassCard padding="12px 8px" style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
                      <TrendingUp size={14} color={BRAND.purple} strokeWidth={2.5} />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.purple }}>{statsData.streak_best}</div>
                    <div style={{ fontSize: 10, color: "var(--dp-text-muted)", marginTop: 2 }}>Best Streak</div>
                  </GlassCard>
                  <GlassCard padding="12px 8px" style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
                      <Target size={14} color={BRAND.greenSolid} strokeWidth={2.5} />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.greenSolid }}>{statsData.completion_rate}%</div>
                    <div style={{ fontSize: 10, color: "var(--dp-text-muted)", marginTop: 2 }}>Completion Rate</div>
                  </GlassCard>
                </div>

                {/* Summary */}
                <GlassCard padding="14px 16px">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>Total completions</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dp-text)" }}>{statsData.total_completions}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>This month</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dp-text)" }}>{statsData.month_completions}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>Days tracked</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dp-text)" }}>{statsData.days_tracked}</span>
                  </div>
                </GlassCard>

                {/* Monthly heatmap bars */}
                {statsData.monthly_stats && statsData.monthly_stats.length > 0 && (
                  <GlassCard padding="14px 16px">
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", marginBottom: 10 }}>
                      <BarChart3 size={13} color="var(--dp-text-muted)" strokeWidth={2} style={{ verticalAlign: "middle", marginRight: 4 }} />
                      Monthly Activity
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 64 }}>
                      {(function () {
                        var maxCount = Math.max.apply(null, statsData.monthly_stats.map(function (m) { return m.count; }).concat([1]));
                        return statsData.monthly_stats.map(function (m) {
                          var pct = (m.count / maxCount) * 100;
                          return (
                            <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <div style={{
                                width: "100%", borderRadius: 4,
                                height: Math.max(pct * 0.56, 4),
                                background: m.count > 0 ? "linear-gradient(180deg, " + BRAND.purple + ", " + BRAND.teal + ")" : "var(--dp-accent-border)",
                                transition: "height 0.3s ease",
                              }} />
                              <span style={{ fontSize: 9, color: "var(--dp-text-muted)" }}>{m.label}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </GlassCard>
                )}
              </>
            ) : (
              <GlassCard padding="32px 20px" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--dp-text-muted)" }}>No stats available</div>
              </GlassCard>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes dpHabitCelebrate {
          0% { opacity: 0; transform: scale(0.5) translateY(20px); }
          20% { opacity: 1; transform: scale(1.2) translateY(-10px); }
          40% { transform: scale(1) translateY(0); }
          80% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.8) translateY(-40px); }
        }
      `}</style>
    </GlassModal>
  );
}
