import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Play, Pause, Check, Zap, Sparkles, Bot,
  Timer, RotateCcw, Loader
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — 2-Minute Micro Start Screen
// ═══════════════════════════════════════════════════════════════

const TOTAL_SECONDS = 120; // 2 minutes

const glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

export default function MicroStartScreen() {
  const navigate = useNavigate();
  const { dreamId } = useParams();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | running | paused | completed
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [xpCount, setXpCount] = useState(0);
  const [showParticles, setShowParticles] = useState(false);
  const intervalRef = useRef(null);

  var queryClient = useQueryClient();
  var { showToast } = useToast();

  // ── Fetch dream details ────────────────────────────────────────────
  var dreamQuery = useQuery({
    queryKey: ["dream", dreamId],
    queryFn: function () {
      return apiGet("/api/dreams/dreams/" + dreamId + "/");
    },
  });
  var dream = dreamQuery.data || {};

  // ── Generate micro action via AI ───────────────────────────────────
  var [microTask, setMicroTask] = useState(null);

  var microActionMutation = useMutation({
    mutationFn: function () {
      return apiPost("/api/dreams/dreams/" + dreamId + "/generate_two_minute_start/");
    },
    onSuccess: function (data) {
      setMicroTask(data);
    },
    onError: function () {
      // Fall back to a generic task with no ID
      setMicroTask({ title: "Take a small step toward your dream" });
    },
  });

  // ── Complete task mutation ─────────────────────────────────────────
  var completeTaskMutation = useMutation({
    mutationFn: function () {
      if (microTask && microTask.id) {
        return apiPost("/api/dreams/tasks/" + microTask.id + "/complete/");
      }
      return Promise.resolve();
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["dream", dreamId] });
    },
    onError: function (err) {
      showToast(err.message || "Failed to save completion", "error");
    },
  });

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    microActionMutation.mutate();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startTimer = useCallback(() => {
    setStatus("running");
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setStatus("completed");
          setShowParticles(true);
          completeTaskMutation.mutate();
          // Animate XP counter
          let count = 0;
          const xpInterval = setInterval(() => {
            count += 1;
            setXpCount(count);
            if (count >= 25) clearInterval(xpInterval);
          }, 40);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [completeTaskMutation]);

  const pauseTimer = () => {
    setStatus("paused");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resumeTimer = () => {
    startTimer();
  };

  const completeEarly = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus("completed");
    setShowParticles(true);
    setSeconds(0);
    completeTaskMutation.mutate();
    let count = 0;
    const xpInterval = setInterval(() => {
      count += 1;
      setXpCount(count);
      if (count >= 25) clearInterval(xpInterval);
    }, 40);
  };

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${minutes}:${secs.toString().padStart(2, "0")}`;
  const progress = 1 - seconds / TOTAL_SECONDS;

  // SVG circle dimensions
  const size = 220;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  // ── Loading & error states ──────────────────────────────────────────
  if (dreamQuery.isLoading) {
    return (
      <PageLayout showNav={false}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "80vh",
        }}>
          <Loader
            size={28}
            color={isLight ? "#6D28D9" : "#C4B5FD"}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageLayout>
    );
  }

  if (dreamQuery.isError) {
    return (
      <PageLayout showNav={false}>
        <ErrorState
          message={dreamQuery.error?.message || "Failed to load dream"}
          onRetry={function () { dreamQuery.refetch(); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout showNav={false}>
      <div
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100vh",
          paddingBottom: 40,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 0 16px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--dp-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 2,
              }}
            >
              2-Minute Start
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--dp-text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 280,
              }}
            >
              {dream.title}
            </div>
          </div>
          <Timer size={18} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
        </div>

        {/* Completed state */}
        {status === "completed" ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              opacity: mounted ? 1 : 0,
              transition: "all 0.5s ease",
              position: "relative",
            }}
          >
            {/* Particle effects */}
            {showParticles && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  overflow: "hidden",
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "30%",
                      width: 8 + Math.random() * 8,
                      height: 8 + Math.random() * 8,
                      borderRadius: "50%",
                      background: [
                        "#8B5CF6",
                        "#C4B5FD",
                        "#10B981",
                        "#FCD34D",
                        "#EC4899",
                        "#14B8A6",
                      ][i % 6],
                      animation: `microParticle${i % 4} ${0.8 + Math.random() * 0.8}s ease-out forwards`,
                      animationDelay: `${i * 0.05}s`,
                      opacity: 0,
                    }}
                  />
                ))}
                {/* Expanding circles */}
                {[0, 1, 2].map((i) => (
                  <div
                    key={`ring-${i}`}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "30%",
                      transform: "translate(-50%, -50%)",
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      border: "2px solid rgba(139,92,246,0.3)",
                      animation: `microRing 1.5s ease-out forwards`,
                      animationDelay: `${i * 0.3}s`,
                      opacity: 0,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Success icon */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 26,
                background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(20,184,166,0.15))",
                border: "1px solid rgba(16,185,129,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 0 40px rgba(16,185,129,0.2)",
                animation: "microPulse 2s ease-in-out infinite",
              }}
            >
              <Sparkles size={36} color="#10B981" strokeWidth={1.5} />
            </div>

            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--dp-text)",
                marginBottom: 6,
              }}
            >
              Great Job!
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--dp-text-secondary)",
                marginBottom: 24,
              }}
            >
              You've taken the first step today
            </p>

            {/* XP Earned */}
            <div
              style={{
                ...glass,
                padding: "18px 32px",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 24,
                border: "1px solid rgba(252,211,77,0.15)",
              }}
            >
              <Zap size={22} color={isLight ? "#B45309" : "#FCD34D"} strokeWidth={2} />
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: isLight ? "#B45309" : "#FCD34D",
                }}
              >
                +{xpCount}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--dp-text-secondary)",
                }}
              >
                XP
              </span>
            </div>

            {/* AI motivational message */}
            <div
              style={{
                ...glass,
                padding: 20,
                borderRadius: 18,
                width: "100%",
                maxWidth: 360,
                marginBottom: 28,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))",
                    border: "1px solid rgba(139,92,246,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={18} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={1.5} />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isLight ? "#6D28D9" : "#C4B5FD",
                  }}
                >
                  AI Coach
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--dp-text-primary)",
                  lineHeight: 1.6,
                }}
              >
                Amazing momentum! You just proved to yourself that starting is the
                hardest part. Small consistent actions like this compound into
                extraordinary results. Keep this energy going tomorrow!
              </p>
            </div>

            {/* Back to Dream button */}
            <button
              onClick={() => navigate(dreamId ? `/dream/${dreamId}` : "/")}
              style={{
                width: "100%",
                maxWidth: 360,
                padding: "15px 0",
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
              }}
            >
              <ArrowLeft size={18} strokeWidth={2} />
              Back to Dream
            </button>
          </div>
        ) : (
          /* Timer state */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Countdown timer circle */}
            <div
              style={{
                position: "relative",
                width: size,
                height: size,
                marginBottom: 32,
                opacity: mounted ? 1 : 0,
                transform: mounted ? "scale(1)" : "scale(0.8)",
                transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
              }}
            >
              {/* Outer glow */}
              <div
                style={{
                  position: "absolute",
                  inset: -20,
                  borderRadius: "50%",
                  background:
                    status === "running"
                      ? "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)"
                      : "radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)",
                  transition: "background 0.5s",
                  animation: status === "running" ? "microGlow 2s ease-in-out infinite" : "none",
                }}
              />

              <svg
                width={size}
                height={size}
                style={{ transform: "rotate(-90deg)" }}
              >
                {/* Background circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="var(--dp-glass-border)"
                  strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="url(#timerGradient)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{
                    transition:
                      status === "running"
                        ? "stroke-dashoffset 1s linear"
                        : "stroke-dashoffset 0.5s ease",
                    filter: "drop-shadow(0 0 8px rgba(139,92,246,0.4))",
                  }}
                />
                <defs>
                  <linearGradient
                    id="timerGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#C4B5FD" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Timer text */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 700,
                    color: "var(--dp-text)",
                    letterSpacing: "2px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {timeStr}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--dp-text-tertiary)",
                    fontWeight: 500,
                    marginTop: 4,
                  }}
                >
                  {status === "idle"
                    ? "Ready to start"
                    : status === "paused"
                    ? "Paused"
                    : "Focus time"}
                </span>
              </div>
            </div>

            {/* Action card */}
            <div
              style={{
                width: "100%",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
              }}
            >
              <div
                style={{
                  ...glass,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <Sparkles size={15} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isLight ? "#6D28D9" : "#C4B5FD",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Your Micro Action
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--dp-text)",
                    lineHeight: 1.5,
                    marginBottom: 12,
                  }}
                >
                  {microTask?.title || "Take a small step toward your dream"}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--dp-text-tertiary)",
                    }}
                  >
                    {dream.title}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 10px",
                      borderRadius: 8,
                      background: "rgba(252,211,77,0.08)",
                      border: "1px solid rgba(252,211,77,0.12)",
                    }}
                  >
                    <Zap size={13} color={isLight ? "#B45309" : "#FCD34D"} strokeWidth={2.5} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isLight ? "#B45309" : "#FCD34D",
                      }}
                    >
                      +25 XP
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Control buttons */}
            <div
              style={{
                display: "flex",
                gap: 12,
                width: "100%",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.45s",
              }}
            >
              {status === "idle" && (
                <button
                  onClick={startTimer}
                  style={{
                    flex: 1,
                    padding: "16px 0",
                    borderRadius: 16,
                    border: "none",
                    background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
                    transition: "all 0.2s",
                  }}
                >
                  <Play size={20} strokeWidth={2} fill="#fff" />
                  Start
                </button>
              )}

              {status === "running" && (
                <>
                  <button
                    onClick={pauseTimer}
                    style={{
                      flex: 1,
                      padding: "16px 0",
                      borderRadius: 16,
                      border: "1px solid rgba(249,115,22,0.3)",
                      background: "rgba(249,115,22,0.08)",
                      color: "#FB923C",
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      transition: "all 0.2s",
                    }}
                  >
                    <Pause size={20} strokeWidth={2} />
                    Pause
                  </button>
                  <button
                    onClick={completeEarly}
                    style={{
                      flex: 1,
                      padding: "16px 0",
                      borderRadius: 16,
                      border: "none",
                      background: "linear-gradient(135deg, #10B981, #059669)",
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
                      transition: "all 0.2s",
                    }}
                  >
                    <Check size={20} strokeWidth={2.5} />
                    Done!
                  </button>
                </>
              )}

              {status === "paused" && (
                <>
                  <button
                    onClick={resumeTimer}
                    style={{
                      flex: 1,
                      padding: "16px 0",
                      borderRadius: 16,
                      border: "none",
                      background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
                      transition: "all 0.2s",
                    }}
                  >
                    <Play size={20} strokeWidth={2} fill="#fff" />
                    Resume
                  </button>
                  <button
                    onClick={completeEarly}
                    style={{
                      flex: 1,
                      padding: "16px 0",
                      borderRadius: 16,
                      border: "none",
                      background: "linear-gradient(135deg, #10B981, #059669)",
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
                      transition: "all 0.2s",
                    }}
                  >
                    <Check size={20} strokeWidth={2.5} />
                    Done!
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <style>{`
          @keyframes microGlow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          @keyframes microPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(16,185,129,0.2); }
            50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(16,185,129,0.35); }
          }
          @keyframes microParticle0 {
            0% { opacity: 1; transform: translate(-50%, -50%) translate(0, 0) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) translate(-60px, -80px) scale(0); }
          }
          @keyframes microParticle1 {
            0% { opacity: 1; transform: translate(-50%, -50%) translate(0, 0) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) translate(70px, -60px) scale(0); }
          }
          @keyframes microParticle2 {
            0% { opacity: 1; transform: translate(-50%, -50%) translate(0, 0) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) translate(-40px, 70px) scale(0); }
          }
          @keyframes microParticle3 {
            0% { opacity: 1; transform: translate(-50%, -50%) translate(0, 0) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) translate(50px, 50px) scale(0); }
          }
          @keyframes microRing {
            0% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(4); }
          }
        `}</style>
      </div>
    </PageLayout>
  );
}
