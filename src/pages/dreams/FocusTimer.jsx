import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import BottomNav from "../../components/shared/BottomNav";
import { BRAND, GRADIENTS } from "../../styles/colors";
import {
  Play, Pause, Square, SkipForward, Timer, ChevronLeft,
  ChevronDown, Check, Coffee, Zap, Target, X
} from "lucide-react";

/* =================================================================
 * DreamPlanner -- Pomodoro Focus Timer
 *
 * Full-screen focus timer with:
 * - SVG circular progress ring
 * - Play/Pause, Stop, Skip controls
 * - 25min work / 5min break cycle (15min long break after 4 work)
 * - Optional task association
 * - Ambient mode with breathing animation
 * - WakeLock API support
 * - Stats footer with today's totals
 * ================================================================= */

var WORK_DURATION = 25;
var SHORT_BREAK = 5;
var LONG_BREAK = 15;
var SESSIONS_BEFORE_LONG_BREAK = 4;

var RING_RADIUS = 120;
var RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function FocusTimer() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { user } = useAuth();
  var { showToast } = useToast();

  // ── Timer state ──
  var [phase, setPhase] = useState("idle"); // idle | work | break
  var [running, setRunning] = useState(false);
  var [totalSeconds, setTotalSeconds] = useState(WORK_DURATION * 60);
  var [remaining, setRemaining] = useState(WORK_DURATION * 60);
  var [workCount, setWorkCount] = useState(0);
  var [sessionId, setSessionId] = useState(null);

  // ── Task selector ──
  var [selectedTask, setSelectedTask] = useState(null);
  var [taskPickerOpen, setTaskPickerOpen] = useState(false);

  // ── Ambient mode ──
  var [ambient, setAmbient] = useState(false);

  // ── WakeLock ──
  var wakeLockRef = useRef(null);

  // ── Fetch tasks for picker ──
  var tasksQuery = useQuery({
    queryKey: ["focus-tasks"],
    queryFn: function () { return apiGet(DREAMS.TASKS.LIST + "?status=pending&limit=50"); },
  });

  // ── Fetch today's focus stats ──
  var statsQuery = useQuery({
    queryKey: ["focus-stats"],
    queryFn: function () { return apiGet(DREAMS.FOCUS.STATS); },
    refetchInterval: 60000,
  });

  var todayStats = (statsQuery.data && statsQuery.data.today) || {};

  // ── Available tasks from API ──
  var tasks = useMemo(function () {
    var data = tasksQuery.data;
    if (!data) return [];
    return (data.results || data || []);
  }, [tasksQuery.data]);

  // ── Timer countdown ──
  useEffect(function () {
    if (!running || remaining <= 0) return;
    var interval = setInterval(function () {
      setRemaining(function (prev) {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return function () { clearInterval(interval); };
  }, [running]);

  // ── WakeLock management ──
  useEffect(function () {
    if (running && "wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then(function (lock) {
        wakeLockRef.current = lock;
      }).catch(function () {});
    }
    return function () {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(function () {});
        wakeLockRef.current = null;
      }
    };
  }, [running]);

  // ── Auto ambient when running ──
  useEffect(function () {
    if (running && phase !== "idle") {
      var t = setTimeout(function () { setAmbient(true); }, 5000);
      return function () { clearTimeout(t); };
    } else {
      setAmbient(false);
    }
  }, [running, phase]);

  // ── Timer end handler ──
  var handleTimerEnd = useCallback(function () {
    setRunning(false);

    if (phase === "work") {
      // Complete the session on the backend
      if (sessionId) {
        apiPost(DREAMS.FOCUS.COMPLETE, {
          session_id: sessionId,
          actual_minutes: WORK_DURATION,
        }).then(function () {
          statsQuery.refetch();
        }).catch(function () {});
      }

      var newWorkCount = workCount + 1;
      setWorkCount(newWorkCount);
      showToast("Focus session complete! Time for a break.", "success");

      // Start break
      var isLongBreak = newWorkCount % SESSIONS_BEFORE_LONG_BREAK === 0;
      var breakDuration = isLongBreak ? LONG_BREAK : SHORT_BREAK;
      setPhase("break");
      setTotalSeconds(breakDuration * 60);
      setRemaining(breakDuration * 60);
      setSessionId(null);

      // Auto-start break after short delay
      setTimeout(function () { startBreakSession(breakDuration); }, 500);
    } else if (phase === "break") {
      showToast("Break over! Ready for another focus session?", "info");
      setPhase("idle");
      setTotalSeconds(WORK_DURATION * 60);
      setRemaining(WORK_DURATION * 60);
      setSessionId(null);
    }
  }, [phase, workCount, sessionId]);

  // ── Start work session ──
  var startWork = useCallback(function () {
    setPhase("work");
    setTotalSeconds(WORK_DURATION * 60);
    setRemaining(WORK_DURATION * 60);
    setRunning(true);
    setAmbient(false);

    apiPost(DREAMS.FOCUS.START, {
      task_id: selectedTask ? selectedTask.id : null,
      duration_minutes: WORK_DURATION,
      session_type: "work",
    }).then(function (data) {
      setSessionId(data.id);
    }).catch(function () {});
  }, [selectedTask]);

  // ── Start break session (backend tracking) ──
  var startBreakSession = useCallback(function (duration) {
    setRunning(true);
    apiPost(DREAMS.FOCUS.START, {
      duration_minutes: duration,
      session_type: "break",
    }).then(function (data) {
      setSessionId(data.id);
    }).catch(function () {});
  }, []);

  // ── Toggle play/pause ──
  var toggleRunning = useCallback(function () {
    if (phase === "idle") {
      startWork();
    } else {
      setRunning(function (r) { return !r; });
      if (ambient) setAmbient(false);
    }
  }, [phase, startWork, ambient]);

  // ── Stop session early ──
  var stopSession = useCallback(function () {
    var elapsed = totalSeconds - remaining;
    var elapsedMinutes = Math.floor(elapsed / 60);
    setRunning(false);

    if (sessionId) {
      apiPost(DREAMS.FOCUS.COMPLETE, {
        session_id: sessionId,
        actual_minutes: elapsedMinutes,
      }).then(function () {
        statsQuery.refetch();
      }).catch(function () {});
    }

    setPhase("idle");
    setTotalSeconds(WORK_DURATION * 60);
    setRemaining(WORK_DURATION * 60);
    setSessionId(null);
    setAmbient(false);
    showToast("Session stopped.", "info");
  }, [totalSeconds, remaining, sessionId]);

  // ── Skip to break ──
  var skipToBreak = useCallback(function () {
    if (phase !== "work") return;
    var elapsed = totalSeconds - remaining;
    var elapsedMinutes = Math.floor(elapsed / 60);

    if (sessionId) {
      apiPost(DREAMS.FOCUS.COMPLETE, {
        session_id: sessionId,
        actual_minutes: elapsedMinutes,
      }).then(function () {
        statsQuery.refetch();
      }).catch(function () {});
    }

    setRunning(false);
    var newWorkCount = workCount + 1;
    setWorkCount(newWorkCount);
    var isLongBreak = newWorkCount % SESSIONS_BEFORE_LONG_BREAK === 0;
    var breakDuration = isLongBreak ? LONG_BREAK : SHORT_BREAK;
    setPhase("break");
    setTotalSeconds(breakDuration * 60);
    setRemaining(breakDuration * 60);
    setSessionId(null);
    setTimeout(function () { startBreakSession(breakDuration); }, 500);
  }, [phase, totalSeconds, remaining, workCount, sessionId]);

  // ── Computed values ──
  var minutes = Math.floor(remaining / 60);
  var seconds = remaining % 60;
  var timeStr = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  var progress = totalSeconds > 0 ? (totalSeconds - remaining) / totalSeconds : 0;
  var strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  // ── Ring color based on phase ──
  var ringColor = phase === "break" ? BRAND.teal : BRAND.purple;
  var ringGlow = phase === "break" ? "rgba(20,184,166,0.4)" : "rgba(139,92,246,0.4)";

  // ── Cycle indicators ──
  var cycleIndicators = [];
  for (var ci = 0; ci < SESSIONS_BEFORE_LONG_BREAK; ci++) {
    cycleIndicators.push(ci < (workCount % SESSIONS_BEFORE_LONG_BREAK) ? "completed" : ci === (workCount % SESSIONS_BEFORE_LONG_BREAK) && phase === "work" ? "active" : "pending");
  }

  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── App Bar (hidden in ambient mode) ── */}
      <div style={{
        transition: "opacity 0.6s ease, transform 0.6s ease",
        opacity: ambient ? 0 : 1,
        transform: ambient ? "translateY(-20px)" : "translateY(0)",
        pointerEvents: ambient ? "none" : "auto",
        zIndex: 100,
      }}>
        <GlassAppBar
          className="dp-desktop-header"
          style={{ position: "fixed", top: 0, left: 0, right: 0 }}
          left={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconButton icon={ChevronLeft} label="Back" onClick={function () { navigate(-1); }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Timer size={18} color="var(--dp-accent)" strokeWidth={2.5} />
                <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)", letterSpacing: "-0.3px" }}>Focus Timer</span>
              </div>
            </div>
          }
        />
      </div>

      {/* ── Main Content ── */}
      <main
        onClick={function () { if (ambient) setAmbient(false); }}
        className="dp-desktop-main"
        style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "80px 16px 140px",
          overflowY: "auto",
          gap: 24,
        }}
      >
        {/* ── Task Selector (hidden in ambient) ── */}
        <div style={{
          transition: "opacity 0.6s ease",
          opacity: ambient ? 0 : 1,
          pointerEvents: ambient ? "none" : "auto",
          width: "100%", maxWidth: 400, textAlign: "center",
        }}>
          {selectedTask ? (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 20,
              background: "var(--dp-glass-bg)",
              border: "1px solid var(--dp-glass-border)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              cursor: "pointer", maxWidth: "100%",
            }} onClick={function () { setTaskPickerOpen(true); }}>
              <Target size={14} color="var(--dp-accent)" strokeWidth={2} />
              <span style={{
                fontSize: 13, fontWeight: 600, color: "var(--dp-text)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{selectedTask.title}</span>
              <X size={14} color="var(--dp-text-tertiary)" strokeWidth={2}
                onClick={function (e) { e.stopPropagation(); setSelectedTask(null); }}
                style={{ cursor: "pointer", flexShrink: 0 }}
              />
            </div>
          ) : (
            <button onClick={function () { setTaskPickerOpen(true); }} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 20,
              background: "var(--dp-glass-bg)",
              border: "1px solid var(--dp-glass-border)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              color: "var(--dp-text-secondary)", fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <Target size={14} strokeWidth={2} />
              Link a task (optional)
              <ChevronDown size={14} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* ── Timer Ring ── */}
        <div style={{ position: "relative", width: 280, height: 280 }}>
          {/* Breathing background glow */}
          {running && (
            <div className="dp-focus-breathe" style={{
              position: "absolute", inset: -40,
              borderRadius: "50%",
              background: "radial-gradient(circle, " + ringColor + "10 0%, transparent 70%)",
            }} />
          )}

          <svg width="280" height="280" viewBox="0 0 280 280" style={{ transform: "rotate(-90deg)" }}>
            {/* Background track */}
            <circle
              cx="140" cy="140" r={RING_RADIUS}
              fill="none"
              stroke={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}
              strokeWidth="8"
            />
            {/* Progress ring */}
            <circle
              cx="140" cy="140" r={RING_RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: "stroke-dashoffset 1s linear",
                filter: "drop-shadow(0 0 8px " + ringGlow + ")",
              }}
            />
          </svg>

          {/* Center content */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            {/* Phase label */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
            }}>
              {phase === "break" ? (
                <Coffee size={16} color={BRAND.teal} strokeWidth={2} />
              ) : (
                <Zap size={16} color={BRAND.purple} strokeWidth={2} />
              )}
              <span style={{
                fontSize: 13, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "1px",
                color: phase === "break" ? BRAND.teal : "var(--dp-text-secondary)",
              }}>
                {phase === "idle" ? "Ready" : phase === "work" ? "Focus" : "Break"}
              </span>
            </div>

            {/* Time display */}
            <div style={{
              fontSize: 56, fontWeight: 700, color: "var(--dp-text)",
              letterSpacing: "-2px", lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}>
              {timeStr}
            </div>

            {/* Session count */}
            <div style={{
              marginTop: 10, fontSize: 12, color: "var(--dp-text-tertiary)",
            }}>
              Session {(workCount % SESSIONS_BEFORE_LONG_BREAK) + (phase === "work" ? 1 : 0)} of {SESSIONS_BEFORE_LONG_BREAK}
            </div>
          </div>
        </div>

        {/* ── Cycle Indicators ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          transition: "opacity 0.6s ease",
          opacity: ambient ? 0 : 1,
        }}>
          {cycleIndicators.map(function (st, idx) {
            return (
              <div key={idx} style={{
                width: st === "active" ? 24 : 10,
                height: 10,
                borderRadius: 5,
                background: st === "completed"
                  ? BRAND.purple
                  : st === "active"
                    ? "linear-gradient(90deg, " + BRAND.purple + ", " + BRAND.pink + ")"
                    : (isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"),
                transition: "all 0.3s ease",
                boxShadow: st === "active" ? "0 0 8px rgba(139,92,246,0.4)" : "none",
              }} />
            );
          })}
        </div>

        {/* ── Controls ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 16,
          transition: "opacity 0.6s ease",
          opacity: ambient ? 0.3 : 1,
        }}>
          {/* Stop button */}
          {phase !== "idle" && (
            <button onClick={stopSession} className="dp-gh" style={{
              width: 52, height: 52, borderRadius: 16,
              background: "var(--dp-glass-bg)",
              border: "1px solid var(--dp-glass-border)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s",
              color: BRAND.redSolid, fontFamily: "inherit",
            }}>
              <Square size={22} strokeWidth={2.5} />
            </button>
          )}

          {/* Play/Pause main button */}
          <button onClick={toggleRunning} className="dp-gh" style={{
            width: 72, height: 72, borderRadius: 22,
            background: phase === "break"
              ? "linear-gradient(135deg, " + BRAND.teal + ", " + BRAND.tealDark + ")"
              : "linear-gradient(135deg, " + BRAND.purple + ", " + BRAND.purpleDark + ")",
            border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.2s",
            boxShadow: "0 4px 24px " + ringGlow,
            fontFamily: "inherit",
          }}>
            {running ? (
              <Pause size={30} color="#fff" strokeWidth={2.5} />
            ) : (
              <Play size={30} color="#fff" strokeWidth={2.5} style={{ marginLeft: 3 }} />
            )}
          </button>

          {/* Skip to break */}
          {phase === "work" && (
            <button onClick={skipToBreak} className="dp-gh" style={{
              width: 52, height: 52, borderRadius: 16,
              background: "var(--dp-glass-bg)",
              border: "1px solid var(--dp-glass-border)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s",
              color: BRAND.teal, fontFamily: "inherit",
            }}>
              <SkipForward size={22} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* ── Stats Footer ── */}
        <div style={{
          transition: "opacity 0.6s ease",
          opacity: ambient ? 0 : 1,
          pointerEvents: ambient ? "none" : "auto",
          width: "100%", maxWidth: 400,
        }}>
          <GlassCard padding={16} style={{ textAlign: "center" }}>
            <div style={{
              display: "flex", justifyContent: "center", alignItems: "center", gap: 20,
            }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--dp-text)" }}>
                  {todayStats.sessions_completed || 0}
                </div>
                <div style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>sessions</div>
              </div>
              <div style={{ width: 1, height: 32, background: "var(--dp-divider)" }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--dp-text)" }}>
                  {todayStats.total_minutes || 0}
                </div>
                <div style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>min focused</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--dp-text-muted)", marginTop: 8 }}>
              Today's focus
            </div>
          </GlassCard>
        </div>
      </main>

      {/* ── Task Picker Bottom Sheet ── */}
      {taskPickerOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
        }}>
          {/* Overlay */}
          <div
            onClick={function () { setTaskPickerOpen(false); }}
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            }}
          />
          {/* Sheet */}
          <div style={{
            position: "relative", zIndex: 1,
            background: "var(--dp-glass-bg)",
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--dp-glass-border)",
            borderRadius: "20px 20px 0 0",
            padding: "16px 16px 32px",
            maxHeight: "60vh", overflowY: "auto",
          }}>
            {/* Handle */}
            <div style={{
              width: 36, height: 4, borderRadius: 2, margin: "0 auto 16px",
              background: "var(--dp-text-muted)",
              opacity: 0.3,
            }} />

            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 16,
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>
                Select a Task
              </h3>
              <button onClick={function () { setTaskPickerOpen(false); }} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--dp-text-tertiary)", padding: 4, fontFamily: "inherit",
              }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* No task option */}
            <button onClick={function () { setSelectedTask(null); setTaskPickerOpen(false); }} className="dp-gh" style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              background: !selectedTask ? "var(--dp-accent-soft)" : "transparent",
              border: !selectedTask ? "1px solid var(--dp-accent-border)" : "1px solid var(--dp-glass-border)",
              display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", marginBottom: 8, textAlign: "left",
              fontFamily: "inherit",
            }}>
              <Timer size={16} color="var(--dp-text-secondary)" strokeWidth={2} />
              <span style={{ fontSize: 14, color: "var(--dp-text-secondary)", fontWeight: 500 }}>
                No task -- free focus
              </span>
            </button>

            {/* Task list */}
            {tasks.map(function (t) {
              var isSelected = selectedTask && selectedTask.id === t.id;
              return (
                <button key={t.id} onClick={function () { setSelectedTask(t); setTaskPickerOpen(false); }} className="dp-gh" style={{
                  width: "100%", padding: "14px 16px", borderRadius: 12,
                  background: isSelected ? "var(--dp-accent-soft)" : "transparent",
                  border: isSelected ? "1px solid var(--dp-accent-border)" : "1px solid var(--dp-glass-border)",
                  display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer", marginBottom: 8, textAlign: "left",
                  fontFamily: "inherit",
                }}>
                  {isSelected ? (
                    <Check size={16} color="var(--dp-accent)" strokeWidth={2.5} />
                  ) : (
                    <Target size={16} color="var(--dp-text-tertiary)" strokeWidth={2} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? "var(--dp-accent)" : "var(--dp-text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{t.title}</div>
                    {t.duration_mins && (
                      <div style={{ fontSize: 12, color: "var(--dp-text-tertiary)", marginTop: 2 }}>
                        {t.duration_mins} min estimated
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {tasks.length === 0 && !tasksQuery.isLoading && (
              <div style={{
                textAlign: "center", padding: "24px 0",
                color: "var(--dp-text-muted)", fontSize: 13,
              }}>
                No pending tasks found. Create tasks in your dreams first.
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />

      {/* ── Styles ── */}
      <style>{"\
        @keyframes dpFocusBreathe {\
          0%, 100% { transform: scale(1); opacity: 0.4; }\
          50% { transform: scale(1.15); opacity: 0.7; }\
        }\
        .dp-focus-breathe {\
          animation: dpFocusBreathe 4s ease-in-out infinite;\
        }\
      "}</style>
    </div>
  );
}
