import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Bot, Sparkles, ChevronRight, SkipForward,
  Check, Zap, Target, Star, Loader2
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { apiPost } from "../../services/api";
import { DREAMS } from "../../services/endpoints";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — AI Dream Calibration Screen
// ═══════════════════════════════════════════════════════════════

const FALLBACK_QUESTIONS = [
  {
    id: 1,
    text: "What's your biggest motivation for this dream?",
    type: "choice",
    options: ["Personal growth", "Financial freedom", "Health improvement", "Creative expression"],
  },
  {
    id: 2,
    text: "How many hours per week can you dedicate?",
    type: "choice",
    options: ["1-3 hours", "4-7 hours", "8-15 hours", "16+ hours"],
  },
  {
    id: 3,
    text: "What's your biggest potential obstacle?",
    type: "text",
    placeholder: "Describe what might hold you back...",
  },
  {
    id: 4,
    text: "Have you attempted this before?",
    type: "choice",
    options: ["Never", "Once", "Multiple times", "Currently working on it"],
  },
  {
    id: 5,
    text: "Who will support you on this journey?",
    type: "choice",
    options: ["Friends", "Family", "Online community", "Going solo"],
  },
  {
    id: 6,
    text: "What would success look like in 30 days?",
    type: "text",
    placeholder: "Paint a picture of your 30-day milestone...",
  },
  {
    id: 7,
    text: "Rate your current confidence level",
    type: "choice",
    options: ["Low", "Medium", "High", "Very High"],
  },
];

const glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

export default function CalibrationScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  var { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [textValue, setTextValue] = useState("");
  const [completed, setCompleted] = useState(false);
  const [cardAnim, setCardAnim] = useState(true);
  var [questions, setQuestions] = useState([]);
  var [loadingQuestions, setLoadingQuestions] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planResult, setPlanResult] = useState(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  // Fetch calibration questions from API on mount
  useEffect(() => {
    var cancelled = false;
    async function fetchQuestions() {
      try {
        var data = await apiPost(DREAMS.START_CALIBRATION(id));
        if (!cancelled && data && Array.isArray(data.questions) && data.questions.length > 0) {
          // Map backend questions to expected format
          var mapped = data.questions.map(function (q, i) {
            return {
              id: q.id || i + 1,
              text: q.question || q.text || "Question " + (i + 1),
              type: "text",
              placeholder: "Type your answer...",
              category: q.category || "",
            };
          });
          setQuestions(mapped);
        } else if (!cancelled) {
          setQuestions(FALLBACK_QUESTIONS);
        }
      } catch (err) {
        if (!cancelled) {
          // If calibration already completed or other error, use fallbacks
          var msg = (err && err.message) || "";
          if (msg.toLowerCase().includes("already completed")) {
            // Calibration done — go straight to plan generation
            handleCalibrationComplete();
            return;
          }
          showToast("Could not load calibration questions. Using defaults.", "error");
          setQuestions(FALLBACK_QUESTIONS);
        }
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    }
    fetchQuestions();
    return () => { cancelled = true; };
  }, [id]);

  const question = questions[currentQ];
  const progress = questions.length > 0
    ? ((currentQ + (completed ? 1 : 0)) / questions.length) * 100
    : 0;
  const selectedOption = answers[question?.id];

  const handleSelect = (option) => {
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
  };

  const handleNext = () => {
    var answer;
    if (question.type === "text" && textValue.trim()) {
      answer = textValue.trim();
      setAnswers((prev) => ({ ...prev, [question.id]: answer }));
      setTextValue("");
    } else {
      answer = selectedOption;
    }

    // Submit this answer to the backend — may return more questions
    if (answer) {
      apiPost(DREAMS.ANSWER_CALIBRATION(id), {
        question: question.text,
        answer: answer,
        questionNumber: currentQ + 1,
      }).then(function (res) {
        // If backend returns additional questions, append them
        if (res && Array.isArray(res.questions) && res.questions.length > 0) {
          var newQs = res.questions.map(function (q, i) {
            return {
              id: q.id || "extra-" + Date.now() + "-" + i,
              text: q.question || q.text || "Follow-up question",
              type: "text",
              placeholder: "Type your answer...",
              category: q.category || "",
            };
          });
          setQuestions(function (prev) { return prev.concat(newQs); });
        }
      }).catch(function () {
        // Silently ignore — answers are also stored locally
      });
    }

    if (currentQ < questions.length - 1) {
      setCardAnim(false);
      setTimeout(() => {
        setCurrentQ((prev) => prev + 1);
        setCardAnim(true);
      }, 200);
    } else {
      handleCalibrationComplete();
    }
  };

  const handleSkip = () => {
    if (currentQ < questions.length - 1) {
      setCardAnim(false);
      setTimeout(() => {
        setCurrentQ((prev) => prev + 1);
        setCardAnim(true);
      }, 200);
    } else {
      // Skipping from the last question — skip all remaining
      apiPost(DREAMS.SKIP_CALIBRATION(id)).catch(() => {});
      handleCalibrationComplete();
    }
  };

  const handleCalibrationComplete = async () => {
    setCompleted(true);
    setGeneratingPlan(true);
    try {
      var result = await apiPost(DREAMS.GENERATE_PLAN(id));
      setPlanResult(result);
      showToast("Your personalized plan is ready!", "success");
    } catch (err) {
      showToast("Plan generation failed. You can retry from the dream page.", "error");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const canProceed =
    question?.type === "choice"
      ? !!selectedOption
      : question?.type === "text"
      ? textValue.trim().length > 0
      : false;

  return (
    <PageLayout showNav={false}>
      <div
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100vh",
          paddingBottom: 32,
        }}
      >
        {/* Progress bar at very top */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "var(--dp-glass-border)",
            zIndex: 200,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #8B5CF6, #C4B5FD)",
              borderRadius: "0 2px 2px 0",
              transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: "0 0 12px rgba(139,92,246,0.4)",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 0 16px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="dp-ib" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--dp-text)",
                letterSpacing: "-0.3px",
              }}
            >
              Dream Calibration
            </span>
          </div>
          {!completed && !loadingQuestions && questions.length > 0 && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isLight ? "#6D28D9" : "#C4B5FD",
                padding: "4px 12px",
                borderRadius: 10,
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.15)",
              }}
            >
              {currentQ + 1} of {questions.length}
            </span>
          )}
        </div>

        {/* Loading questions state */}
        {loadingQuestions ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.5s",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(196,181,253,0.1))",
                border: "1px solid rgba(139,92,246,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 0 30px rgba(139,92,246,0.15)",
              }}
            >
              <Loader2
                size={28}
                color={isLight ? "#6D28D9" : "#C4B5FD"}
                strokeWidth={2}
                style={{ animation: "spin 1s linear infinite" }}
              />
            </div>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--dp-text-secondary)",
              }}
            >
              Preparing your calibration...
            </p>
          </div>
        ) : completed ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "70vh",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Sparkles icon with glow */}
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: 28,
                background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(196,181,253,0.1))",
                border: "1px solid rgba(139,92,246,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                boxShadow: "0 0 40px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
                animation: "calibPulse 2s ease-in-out infinite",
              }}
            >
              <Sparkles size={40} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={1.5} />
            </div>

            <h2
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "var(--dp-text)",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              {generatingPlan ? "Generating Your Plan..." : "Calibration Complete!"}
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--dp-text-secondary)",
                textAlign: "center",
                lineHeight: 1.6,
                maxWidth: 300,
                marginBottom: 32,
              }}
            >
              {generatingPlan
                ? "Your AI coach is analyzing your answers and building a personalized action plan. This may take a moment."
                : "Your AI coach has analyzed your answers and built a personalized action plan tailored to your goals, schedule, and confidence level."}
            </p>

            {/* Summary stats */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 32,
                width: "100%",
                maxWidth: 360,
              }}
            >
              {[
                { icon: Target, label: "Goals", value: planResult && planResult.goals ? String(planResult.goals.length) : "--", color: "#8B5CF6" },
                { icon: Zap, label: "Tasks", value: planResult && planResult.goals ? String(planResult.goals.reduce(function (s, g) { return s + (g.tasks ? g.tasks.length : 0); }, 0)) : "--", color: isLight ? "#B45309" : "#FCD34D" },
                { icon: Star, label: "Questions", value: String(Object.keys(answers).length) + "/" + String(questions.length), color: "#10B981" },
              ].map(({ icon: Icon, label, value, color }, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    ...glass,
                    padding: "14px 8px",
                    textAlign: "center",
                    borderRadius: 16,
                  }}
                >
                  <Icon
                    size={18}
                    color={color}
                    strokeWidth={2}
                    style={{ marginBottom: 6 }}
                  />
                  <div
                    style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)" }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--dp-text-tertiary)",
                      marginTop: 2,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* View Your Plan button */}
            <button
              onClick={() => navigate(id ? `/dream/${id}` : "/")}
              disabled={generatingPlan}
              style={{
                width: "100%",
                maxWidth: 360,
                padding: "16px 0",
                borderRadius: 16,
                border: "none",
                background: generatingPlan
                  ? "var(--dp-glass-bg)"
                  : "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                color: generatingPlan ? "var(--dp-text-muted)" : "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: generatingPlan ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: generatingPlan ? "none" : "0 4px 20px rgba(139,92,246,0.35)",
                transition: "all 0.2s",
              }}
            >
              {generatingPlan ? (
                <>
                  <Loader2 size={18} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles size={18} strokeWidth={2} />
                  View Your Plan
                </>
              )}
            </button>
          </div>
        ) : (
          /* Question card */
          <div
            style={{
              marginTop: 24,
              opacity: cardAnim && mounted ? 1 : 0,
              transform:
                cardAnim && mounted ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              style={{
                ...glass,
                padding: 28,
                borderRadius: 24,
              }}
            >
              {/* AI Avatar */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background:
                    "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.15))",
                  border: "1px solid rgba(139,92,246,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  boxShadow: "0 0 24px rgba(139,92,246,0.15)",
                }}
              >
                <Bot size={28} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={1.5} />
              </div>

              {/* Question text */}
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--dp-text)",
                  lineHeight: 1.4,
                  marginBottom: 24,
                }}
              >
                {question.text}
              </h3>

              {/* Answer options */}
              {question.type === "choice" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {question.options.map((option, i) => {
                    const isSelected = selectedOption === option;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelect(option)}
                        style={{
                          width: "100%",
                          padding: "14px 18px",
                          borderRadius: 14,
                          border: isSelected
                            ? "1px solid rgba(139,92,246,0.4)"
                            : "1px solid var(--dp-input-border)",
                          background: isSelected
                            ? "rgba(139,92,246,0.15)"
                            : "var(--dp-glass-bg)",
                          color: isSelected ? "var(--dp-text)" : "var(--dp-text-primary)",
                          fontSize: 14,
                          fontWeight: isSelected ? 600 : 500,
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                          boxShadow: isSelected
                            ? "0 0 20px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)"
                            : "none",
                          transform: isSelected ? "scale(1.02)" : "scale(1)",
                        }}
                      >
                        <span>{option}</span>
                        {isSelected && (
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 7,
                              background: "rgba(139,92,246,0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Check size={13} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder={question.placeholder}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    borderRadius: 14,
                    border: "1px solid var(--dp-input-border)",
                    background: "var(--dp-glass-bg)",
                    color: "var(--dp-text)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    resize: "none",
                    lineHeight: 1.6,
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(139,92,246,0.3)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "var(--dp-input-border)")
                  }
                />
              )}
            </div>

            {/* Step dots indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 20,
                marginBottom: 20,
              }}
            >
              {questions.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentQ ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background:
                      i < currentQ
                        ? "#8B5CF6"
                        : i === currentQ
                        ? "linear-gradient(90deg, #8B5CF6, #C4B5FD)"
                        : "var(--dp-surface-hover)",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <button
                onClick={handleSkip}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "transparent",
                  color: "var(--dp-text-tertiary)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "color 0.2s",
                }}
              >
                <SkipForward size={15} strokeWidth={2} />
                Skip
              </button>

              <button
                onClick={handleNext}
                disabled={!canProceed}
                style={{
                  padding: "12px 28px",
                  borderRadius: 14,
                  border: "none",
                  background: canProceed
                    ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                    : "var(--dp-glass-bg)",
                  color: canProceed ? "#fff" : "var(--dp-text-muted)",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: canProceed ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: canProceed
                    ? "0 4px 16px rgba(139,92,246,0.3)"
                    : "none",
                  transition: "all 0.25s",
                }}
              >
                {currentQ === questions.length - 1 ? "Complete" : "Next"}
                <ChevronRight size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        <style>{`
          [data-theme="light"] input::placeholder, [data-theme="light"] textarea::placeholder { color: rgba(26,21,53,0.55) !important; }
          @keyframes calibPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1); }
            50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </PageLayout>
  );
}
