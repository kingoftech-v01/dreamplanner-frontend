import { useState, useEffect, useRef } from "react";
import {
  Phone, PhoneOff, Clock, Target,
  Timer, X, CalendarClock, Pause, Play, CheckCircle2,
  Sparkles, Flame, Briefcase, Palette, Heart, Wallet, Brain
} from "lucide-react";
import { useTaskCall } from "../../context/TaskCallContext";
import { hapticVibrate, hapticStop } from "../../services/native";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Task Call Overlay
 *
 * Phone-call-like UI that pops up as a centered overlay when a task
 * is due. Glass card color tints by priority level:
 *   urgent (red) · important (amber) · medium (yellow) · routine (blue)
 * Auto-closes after snooze (2.5s) or completion (3s).
 * ═══════════════════════════════════════════════════════════════════ */

// ─── PRIORITY COLOR SYSTEM ──────────────────────────────────────
var PRIORITY_COLORS = {
  urgent:    { rgb: "239,68,68",   accent: "#EF4444", light: "#FCA5A5", label: "Urgent" },
  important: { rgb: "245,158,11",  accent: "#F59E0B", light: "#FCD34D", label: "Important" },
  medium:    { rgb: "252,211,77",  accent: "#FCD34D", light: "#FDE68A", label: "Medium" },
  routine:   { rgb: "59,130,246",  accent: "#3B82F6", light: "#93C5FD", label: "Routine" },
};

function getPriorityColors(priority) {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS["medium"];
}

// ─── CATEGORY ICON MAP ──────────────────────────────────────────
var CATEGORY_ICONS = {
  career: Briefcase,
  hobbies: Palette,
  health: Heart,
  finance: Wallet,
  personal: Brain,
};

var DEFAULT_TASK = {
  id: "",
  title: "New Task",
  dream: "",
  category: "personal",
  description: "",
  priority: "medium",
};

export default function TaskCallOverlay() {
  var { isOpen, taskData, dismissTaskCall, scheduleAutoClose, acquireWakeLock } = useTaskCall();
  var [phase, setPhase] = useState("ringing");
  var [slideIn, setSlideIn] = useState(false);
  var [elapsed, setElapsed] = useState(0);
  var [timerRunning, setTimerRunning] = useState(false);
  var [snoozeReason, setSnoozeReason] = useState("");
  var [selectedSnooze, setSelectedSnooze] = useState(null);
  var [showSnoozePanel, setShowSnoozePanel] = useState(false);
  var timerRef = useRef(null);

  // Reset all state when overlay opens
  useEffect(function () {
    if (isOpen) {
      setPhase("ringing");
      setSlideIn(false);
      setElapsed(0);
      setTimerRunning(false);
      setSnoozeReason("");
      setSelectedSnooze(null);
      setShowSnoozePanel(false);
      setTimeout(function () { setSlideIn(true); }, 50);
      // Request fullscreen for immersive call experience
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
      // Vibrate for call-like feel
      hapticVibrate([200, 100, 200, 100, 200]);
    }
  }, [isOpen, taskData]);

  // Timer
  useEffect(function () {
    if (timerRunning) {
      timerRef.current = setInterval(function () { setElapsed(function (e) { return e + 1; }); }, 1000);
    }
    return function () { clearInterval(timerRef.current); };
  }, [timerRunning]);

  function formatTime(s) {
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return h + ":" + (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
    return (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function acceptCall() {
    hapticStop(); // Stop ringing vibration
    setPhase("accepted");
    setTimerRunning(true);
    acquireWakeLock(); // Keep screen on while working
  }
  function declineCall() {
    hapticStop();
    setShowSnoozePanel(true);
  }
  function confirmSnooze() {
    setPhase("snoozed");
    setTimerRunning(false);
    scheduleAutoClose(2500);
  }
  function completeTask() {
    setTimerRunning(false);
    setPhase("done");
    scheduleAutoClose(3000);
  }

  if (!isOpen) return null;

  var task = taskData || DEFAULT_TASK;
  var pc = getPriorityColors(task.priority);
  var TaskIcon = CATEGORY_ICONS[task.category] || Briefcase;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 600, overflow: "hidden",
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      animation: "tcOverlayIn 0.3s ease-out",
    }}>

      {/* Card container — centered */}
      <div style={{
        width: "100%", maxWidth: 420, padding: "0 20px",
        transform: slideIn ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
        opacity: slideIn ? 1 : 0,
        transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease-out",
      }}>

        {/* ═══ RINGING STATE ═══ */}
        {phase === "ringing" && !showSnoozePanel && (
          <div style={{ textAlign: "center" }}>
            <div style={{ background: "rgba(" + pc.rgb + ",0.04)", backdropFilter: "blur(40px) saturate(1.3)", WebkitBackdropFilter: "blur(40px) saturate(1.3)", borderRadius: 28, border: "1px solid rgba(" + pc.rgb + ",0.10)", padding: "28px 24px 24px", boxShadow: "0 8px 40px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(255,255,255,0.02)", position: "relative", overflow: "hidden" }}>
              {/* Glass refraction highlight */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: "linear-gradient(180deg, rgba(" + pc.rgb + ",0.06) 0%, transparent 100%)", borderRadius: "28px 28px 0 0", pointerEvents: "none" }} />

              {/* Pulse rings + icon */}
              <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 18px" }}>
                <div className="tc-ring-1" style={{ position: "absolute", inset: -12, borderRadius: "50%", border: "2px solid rgba(" + pc.rgb + ",0.25)" }} />
                <div className="tc-ring-2" style={{ position: "absolute", inset: -26, borderRadius: "50%", border: "1.5px solid rgba(" + pc.rgb + ",0.12)" }} />
                <div className="tc-ring-3" style={{ position: "absolute", inset: -40, borderRadius: "50%", border: "1px solid rgba(" + pc.rgb + ",0.06)" }} />
                <div style={{ width: 88, height: 88, borderRadius: 24, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(" + pc.rgb + ",0.15), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
                  <TaskIcon size={34} color={pc.light} strokeWidth={1.5} />
                </div>
              </div>

              {/* Label */}
              <div className="tc-blink" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 10, background: "rgba(" + pc.rgb + ",0.10)", border: "1px solid rgba(" + pc.rgb + ",0.18)", marginBottom: 12 }}>
                <Phone size={12} color={pc.accent} strokeWidth={2.5} />
                <span style={{ fontSize: 11, fontWeight: 600, color: pc.light, letterSpacing: "0.5px", textTransform: "uppercase" }}>Incoming Task</span>
              </div>

              {/* Title */}
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.3, textShadow: "0 1px 8px rgba(0,0,0,0.3)" }}>{task.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 14 }}>from "<span style={{ color: pc.light }}>{task.dream}</span>"</div>

              {/* Meta chips */}
              <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
                {[
                  task.scheduledTime ? { icon: Clock, label: task.scheduledTime, color: "#F59E0B" } : null,
                  task.duration ? { icon: Timer, label: task.duration, color: "#22C55E" } : null,
                  task.streak ? { icon: Flame, label: task.streak + "d streak", color: "#EF4444" } : null,
                  task.progress != null ? { icon: Target, label: task.progress + "%", color: pc.accent } : null,
                ].filter(Boolean).map(function (chip, i) {
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                      <chip.icon size={12} color={chip.color} strokeWidth={2.5} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: chip.color }}>{chip.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Glass divider */}
              <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)", marginBottom: 20 }} />

              {/* Accept / Decline */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {/* Decline */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <button onClick={declineCall} className="tc-btn-hover" style={{ width: 62, height: 62, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#EF4444,#DC2626)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 20px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.15)", transition: "all 0.2s" }}>
                    <PhoneOff size={24} strokeWidth={2} />
                  </button>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Later</span>
                </div>

                {/* Slide indicator (decorative) */}
                <div style={{ width: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: "100%", height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
                    <div className="tc-slide-dot" style={{ position: "absolute", top: -3, width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.5)", boxShadow: "0 0 8px rgba(255,255,255,0.3)" }} />
                  </div>
                </div>

                {/* Accept */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <button onClick={acceptCall} className="tc-accept-btn" style={{ width: 62, height: 62, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#22C55E,#16A34A)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 20px rgba(34,197,94,0.3), inset 0 1px 0 rgba(255,255,255,0.15)", transition: "all 0.2s" }}>
                    <Phone size={24} strokeWidth={2} />
                  </button>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>Accept</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SNOOZE PANEL ═══ */}
        {showSnoozePanel && phase === "ringing" && (
          <div style={{ animation: "tcUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(40px) saturate(1.3)", WebkitBackdropFilter: "blur(40px) saturate(1.3)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)", borderRadius: "24px 24px 0 0", pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarClock size={18} color="#F59E0B" strokeWidth={2} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Remind Me Later</span>
                </div>
                <button onClick={function () { setShowSnoozePanel(false); }} style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}><X size={14} strokeWidth={2} /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                {[{ label: "15 min", value: 15 }, { label: "30 min", value: 30 }, { label: "1 hour", value: 60 }, { label: "Tomorrow", value: 1440 }].map(function (opt) {
                  var sel = selectedSnooze === opt.value;
                  return <button key={opt.value} onClick={function () { setSelectedSnooze(opt.value); }} style={{ padding: "14px 0", borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", border: sel ? "1px solid rgba(245,158,11,0.25)" : "1px solid rgba(255,255,255,0.06)", background: sel ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)", color: sel ? "#F59E0B" : "rgba(255,255,255,0.65)", boxShadow: sel ? "inset 0 1px 0 rgba(245,158,11,0.1)" : "inset 0 1px 0 rgba(255,255,255,0.03)" }}>{opt.label}</button>;
                })}
              </div>
              <input value={snoozeReason} onChange={function (e) { setSnoozeReason(e.target.value); }} placeholder="Reason (optional)..." style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", marginBottom: 16, boxSizing: "border-box", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }} />
              <button onClick={confirmSnooze} disabled={!selectedSnooze} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: selectedSnooze ? "linear-gradient(135deg,#F59E0B,#D97706)" : "rgba(255,255,255,0.04)", color: selectedSnooze ? "#fff" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 600, cursor: selectedSnooze ? "pointer" : "not-allowed", fontFamily: "inherit", boxShadow: selectedSnooze ? "0 4px 16px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.15)" : "none", transition: "all 0.2s" }}>
                {selectedSnooze ? "Snooze for " + (selectedSnooze === 1440 ? "Tomorrow" : selectedSnooze < 60 ? selectedSnooze + " min" : (selectedSnooze / 60) + " hour") : "Select a time"}
              </button>
            </div>
          </div>
        )}

        {/* ═══ ACCEPTED (Timer + Details) ═══ */}
        {phase === "accepted" && (
          <div style={{ animation: "tcUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(40px) saturate(1.3)", WebkitBackdropFilter: "blur(40px) saturate(1.3)", borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 70, background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)", pointerEvents: "none" }} />
              {/* Timer */}
              <div style={{ padding: "24px 24px 20px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Time Elapsed</div>
                <div style={{ fontSize: 48, fontWeight: 200, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: "2px", textShadow: "0 0 20px rgba(255,255,255,0.1)" }}>{formatTime(elapsed)}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 14 }}>
                  <button onClick={function () { setTimerRunning(!timerRunning); }} style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                    {timerRunning ? <Pause size={18} strokeWidth={2} /> : <Play size={18} strokeWidth={2} />}
                  </button>
                  <button onClick={completeTask} style={{ height: 44, padding: "0 20px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#22C55E,#16A34A)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
                    <CheckCircle2 size={16} strokeWidth={2} />Complete
                  </button>
                </div>
              </div>
              {/* Details */}
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 6, textShadow: "0 1px 6px rgba(0,0,0,0.2)" }}>{task.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginBottom: 16 }}>{task.description}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {[task.goalIndex ? { l: "Goal", v: task.goalIndex, c: "#A78BFA" } : null, task.progress != null ? { l: "Progress", v: task.progress + "%", c: "#22C55E" } : null, task.streak ? { l: "Streak", v: task.streak + "d", c: "#F59E0B" } : null, { l: "Priority", v: pc.label, c: pc.accent }].filter(Boolean).map(function (m, i) {
                    return <div key={i} style={{ padding: "5px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 5, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}><span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{m.l}</span><span style={{ fontSize: 11, fontWeight: 600, color: m.c }}>{m.v}</span></div>;
                  })}
                </div>
                {task.progress != null && <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, width: (task.progress || 0) + "%", background: "linear-gradient(90deg," + pc.accent + "," + pc.light + ")", boxShadow: "0 0 10px rgba(" + pc.rgb + ",0.3)" }} />
                </div>}
              </div>
            </div>
          </div>
        )}

        {/* ═══ SNOOZED ═══ */}
        {phase === "snoozed" && (
          <div style={{ textAlign: "center", animation: "tcUp 0.3s ease-out" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(40px) saturate(1.3)", WebkitBackdropFilter: "blur(40px) saturate(1.3)", borderRadius: 24, border: "1px solid rgba(245,158,11,0.12)", padding: "32px 24px", boxShadow: "0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: "linear-gradient(180deg, rgba(245,158,11,0.03) 0%, transparent 100%)", borderRadius: "24px 24px 0 0", pointerEvents: "none" }} />
              <div style={{ width: 56, height: 56, borderRadius: 18, margin: "0 auto 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}><CalendarClock size={28} color="#F59E0B" strokeWidth={2} /></div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Snoozed</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>We'll remind you {selectedSnooze === 1440 ? "tomorrow" : "in " + (selectedSnooze < 60 ? selectedSnooze + " minutes" : (selectedSnooze / 60) + " hour")}</div>
              {snoozeReason && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8, fontStyle: "italic" }}>"{snoozeReason}"</div>}
            </div>
          </div>
        )}

        {/* ═══ DONE ═══ */}
        {phase === "done" && (
          <div style={{ textAlign: "center", animation: "tcUp 0.3s ease-out", position: "relative" }}>
            {/* Confetti burst */}
            <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", width: 200, height: 200, pointerEvents: "none", overflow: "visible" }}>
              {Array.from({ length: 35 }, function (_, i) {
                var colors = ["#8B5CF6", "#EC4899", "#10B981", "#FCD34D", "#14B8A6", "#EF4444", "#3B82F6"];
                var angle = (i / 35) * 360;
                var dist = 60 + Math.random() * 80;
                var x = Math.cos(angle * Math.PI / 180) * dist;
                var y = Math.sin(angle * Math.PI / 180) * dist - 40;
                var size = 4 + Math.random() * 5;
                var delay = Math.random() * 0.3;
                return (
                  <div key={i} style={{
                    position: "absolute", left: "50%", top: "50%", width: size, height: size,
                    borderRadius: Math.random() > 0.5 ? "50%" : "1px",
                    background: colors[i % colors.length],
                    animation: "tcConfetti 1.8s cubic-bezier(0.25,0.46,0.45,0.94) " + delay + "s forwards",
                    opacity: 0,
                    "--tx": x + "px", "--ty": y + "px",
                  }} />
                );
              })}
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(40px) saturate(1.3)", WebkitBackdropFilter: "blur(40px) saturate(1.3)", borderRadius: 24, border: "1px solid rgba(34,197,94,0.12)", padding: "32px 24px", boxShadow: "0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: "linear-gradient(180deg, rgba(34,197,94,0.03) 0%, transparent 100%)", borderRadius: "24px 24px 0 0", pointerEvents: "none" }} />
              <div className="tc-done-pop" style={{ width: 56, height: 56, borderRadius: 18, margin: "0 auto 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}><CheckCircle2 size={28} color="#22C55E" strokeWidth={2} /></div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Task Complete!</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>You worked for {formatTime(elapsed)}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 10 }}>
                <Sparkles size={14} color="#F59E0B" strokeWidth={2} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#F59E0B" }}>Task completed!</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{"\
        @keyframes tcOverlayIn{from{opacity:0;}to{opacity:1;}}\
        input::placeholder{color:rgba(255,255,255,0.25);}\
        .tc-ring-1{animation:tcRing 2.2s ease-out infinite;}\
        .tc-ring-2{animation:tcRing 2.2s ease-out infinite 0.35s;}\
        .tc-ring-3{animation:tcRing 2.2s ease-out infinite 0.7s;}\
        @keyframes tcRing{0%{transform:scale(1);opacity:0.7;}100%{transform:scale(1.35);opacity:0;}}\
        .tc-blink{animation:tcBlink 1.8s ease-in-out infinite;}\
        @keyframes tcBlink{0%,100%{opacity:1;}50%{opacity:0.5;}}\
        .tc-accept-btn{animation:tcGlow 2s ease-in-out infinite;}\
        @keyframes tcGlow{0%,100%{box-shadow:0 4px 24px rgba(34,197,94,0.3);}50%{box-shadow:0 4px 36px rgba(34,197,94,0.5),0 0 60px rgba(34,197,94,0.12);}}\
        .tc-btn-hover:hover{transform:scale(1.06);}\
        .tc-slide-dot{animation:tcSlide 2.5s ease-in-out infinite;}\
        @keyframes tcSlide{0%,100%{left:0;}50%{left:calc(100% - 12px);}}\
        @keyframes tcUp{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}\
        .tc-done-pop{animation:tcPop 0.4s cubic-bezier(0.16,1,0.3,1);}\
        @keyframes tcPop{from{transform:scale(0.6);opacity:0;}to{transform:scale(1);opacity:1;}}\
        @keyframes tcConfetti{0%{opacity:1;transform:translate(0,0) rotate(0deg);}100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotate(720deg);}}\
      "}</style>
    </div>
  );
}
