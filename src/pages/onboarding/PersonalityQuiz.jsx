import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { BRAND, GRADIENTS } from "../../styles/colors";
import { apiPost } from "../../services/api";
import { USERS } from "../../services/endpoints";
import { useAuth } from "../../context/AuthContext";
import GradientButton from "../../components/shared/GradientButton";
import {
  Sparkles, Trophy, Compass, Users, Brain,
  Lightbulb, Heart, Mountain, Star, Briefcase,
  Palette, Map, Target, Zap, Rocket, ChevronRight,
  ArrowRight, Check,
} from "lucide-react";

// ─── Quiz Questions ───────────────────────────────────────────────
var QUESTIONS = [
  {
    question: "When you have a new idea, you first...",
    options: [
      { text: "Think it through", icon: Brain },
      { text: "Share with friends", icon: Users },
      { text: "Start immediately", icon: Zap },
      { text: "Research everything", icon: Target },
    ],
  },
  {
    question: "Your ideal weekend looks like...",
    options: [
      { text: "Learning something new", icon: Lightbulb },
      { text: "Hanging with friends", icon: Heart },
      { text: "Achieving a goal", icon: Trophy },
      { text: "Exploring new places", icon: Compass },
    ],
  },
  {
    question: "When facing a challenge...",
    options: [
      { text: "Create an innovative solution", icon: Sparkles },
      { text: "Ask for help", icon: Users },
      { text: "Push through it", icon: Mountain },
      { text: "Analyze all options", icon: Brain },
    ],
  },
  {
    question: "You feel most fulfilled when...",
    options: [
      { text: "Inspiring others", icon: Star },
      { text: "Working together", icon: Users },
      { text: "Completing a task", icon: Check },
      { text: "Discovering something new", icon: Compass },
    ],
  },
  {
    question: "Your dream workspace is...",
    options: [
      { text: "A creative studio", icon: Palette },
      { text: "A collaborative space", icon: Users },
      { text: "A productive office", icon: Briefcase },
      { text: "Anywhere new", icon: Map },
    ],
  },
  {
    question: "You prefer goals that are...",
    options: [
      { text: "Bold and visionary", icon: Rocket },
      { text: "Shared with others", icon: Heart },
      { text: "Concrete and measurable", icon: Target },
      { text: "Flexible and evolving", icon: Compass },
    ],
  },
  {
    question: "When planning a trip...",
    options: [
      { text: "Go with the flow", icon: Sparkles },
      { text: "Plan with friends", icon: Users },
      { text: "Have a packed itinerary", icon: Target },
      { text: "Find hidden gems", icon: Map },
    ],
  },
  {
    question: "Success to you means...",
    options: [
      { text: "Making an impact", icon: Star },
      { text: "Building connections", icon: Heart },
      { text: "Reaching milestones", icon: Trophy },
      { text: "Growing as a person", icon: Compass },
    ],
  },
];

// ─── Dreamer Type Config ──────────────────────────────────────────
var TYPE_CONFIG = {
  visionary: {
    title: "The Visionary",
    description:
      "You see the big picture and inspire others with bold ideas. Your creativity and imagination drive you to dream beyond limits.",
    traits: ["Creative", "Innovative", "Inspiring", "Big-picture thinker"],
    icon: Sparkles,
    gradient: "linear-gradient(135deg, #8B5CF6, #EC4899)",
    color: "#8B5CF6",
  },
  achiever: {
    title: "The Achiever",
    description:
      "You thrive on setting goals and crushing them. Discipline and determination are your superpowers.",
    traits: ["Determined", "Disciplined", "Goal-oriented", "Productive"],
    icon: Trophy,
    gradient: "linear-gradient(135deg, #F59E0B, #EF4444)",
    color: "#F59E0B",
  },
  explorer: {
    title: "The Explorer",
    description:
      "Curiosity is your compass. You love discovering new ideas, places, and perspectives that expand your world.",
    traits: ["Curious", "Adventurous", "Open-minded", "Growth-driven"],
    icon: Compass,
    gradient: "linear-gradient(135deg, #14B8A6, #3B82F6)",
    color: "#14B8A6",
  },
  collaborator: {
    title: "The Collaborator",
    description:
      "You believe in the power of together. Building connections and lifting others up is what makes you shine.",
    traits: ["Empathetic", "Team player", "Supportive", "Communicative"],
    icon: Users,
    gradient: "linear-gradient(135deg, #EC4899, #F59E0B)",
    color: "#EC4899",
  },
  strategist: {
    title: "The Strategist",
    description:
      "You approach everything with a plan. Analytical thinking and careful preparation set you up for success.",
    traits: ["Analytical", "Methodical", "Thoughtful", "Detail-oriented"],
    icon: Brain,
    gradient: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    color: "#6366F1",
  },
};

// ─── Glass style helper ───────────────────────────────────────────
function glass(extra) {
  return Object.assign(
    {
      background: "var(--dp-glass-bg)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid var(--dp-glass-border)",
    },
    extra || {}
  );
}

export default function PersonalityQuiz() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { updateUser } = useAuth();

  var [currentQ, setCurrentQ] = useState(0);
  var [answers, setAnswers] = useState([]);
  var [direction, setDirection] = useState(0); // -1 left, 0 none, 1 right
  var [animating, setAnimating] = useState(false);
  var [result, setResult] = useState(null);
  var [loading, setLoading] = useState(false);
  var [mounted, setMounted] = useState(false);
  var [showResult, setShowResult] = useState(false);
  var [resultMounted, setResultMounted] = useState(false);

  useEffect(function () {
    setTimeout(function () {
      setMounted(true);
    }, 50);
  }, []);

  // Animate question transitions
  var animateTransition = useCallback(
    function (nextQ, dir) {
      if (animating) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(function () {
        setCurrentQ(nextQ);
        setDirection(0);
        setAnimating(false);
      }, 300);
    },
    [animating]
  );

  // Handle answer selection
  var handleAnswer = useCallback(
    function (optionIndex) {
      if (animating || loading) return;

      var newAnswers = answers.slice();
      newAnswers[currentQ] = optionIndex;
      setAnswers(newAnswers);

      // Auto-advance after brief delay
      setTimeout(function () {
        if (currentQ < QUESTIONS.length - 1) {
          animateTransition(currentQ + 1, 1);
        } else {
          // Last question answered - submit
          setLoading(true);
          apiPost(USERS.PERSONALITY_QUIZ, { answers: newAnswers })
            .then(function (data) {
              setResult(data);
              setShowResult(true);
              setTimeout(function () {
                setResultMounted(true);
              }, 50);
              if (data.dreamerType) {
                updateUser({ dreamerType: data.dreamerType });
              }
            })
            .catch(function (err) {
              console.error("Quiz submission failed:", err);
              setLoading(false);
            });
        }
      }, 400);
    },
    [answers, currentQ, animating, loading, animateTransition, updateUser]
  );

  // Go back to previous question
  var goBack = useCallback(
    function () {
      if (currentQ > 0 && !animating && !loading) {
        animateTransition(currentQ - 1, -1);
      }
    },
    [currentQ, animating, loading, animateTransition]
  );

  // Continue from result screen — complete onboarding and go home
  var handleContinue = useCallback(
    function () {
      localStorage.setItem("dp-onboarded", "true");
      apiPost(USERS.COMPLETE_ONBOARDING, { hasOnboarded: true })
        .then(function () { updateUser({ hasOnboarded: true }); })
        .catch(function () {});
      navigate("/");
    },
    [navigate, updateUser]
  );

  // Keyboard navigation
  useEffect(
    function () {
      function handleKey(e) {
        if (showResult) {
          if (e.key === "Enter") handleContinue();
          return;
        }
        if (e.key === "ArrowLeft") goBack();
        if (e.key >= "1" && e.key <= "4") {
          handleAnswer(parseInt(e.key, 10) - 1);
        }
      }
      window.addEventListener("keydown", handleKey);
      return function () {
        window.removeEventListener("keydown", handleKey);
      };
    },
    [showResult, goBack, handleAnswer, handleContinue]
  );

  var question = QUESTIONS[currentQ];
  var progress = ((currentQ + (answers[currentQ] !== undefined ? 1 : 0)) / QUESTIONS.length) * 100;

  var slideTransform =
    direction === 0
      ? "translateX(0)"
      : direction === 1
        ? "translateX(-60px)"
        : "translateX(60px)";
  var slideOpacity = direction === 0 ? 1 : 0;

  // ─── Result Screen ────────────────────────────────────────────
  if (showResult && result) {
    var typeKey = result.dreamerType || result.dreamer_type;
    var cfg = TYPE_CONFIG[typeKey] || TYPE_CONFIG.visionary;
    var TypeIcon = cfg.icon;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "40px 24px",
            maxWidth: 420,
            width: "100%",
            opacity: resultMounted ? 1 : 0,
            transform: resultMounted ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
            transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* XP badge */}
          {result.xpAwarded > 0 || result.xp_awarded > 0 ? (
            <div
              style={glass({
                borderRadius: 20,
                padding: "6px 16px",
                marginBottom: 24,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: BRAND.purple,
              })}
            >
              <Zap size={14} />+{result.xpAwarded || result.xp_awarded} XP
            </div>
          ) : null}

          {/* Type icon */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: cfg.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 32,
              boxShadow: "0 12px 40px " + cfg.color + "40",
              opacity: resultMounted ? 1 : 0,
              transform: resultMounted ? "scale(1)" : "scale(0.5)",
              transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s",
            }}
          >
            <TypeIcon size={56} color="#fff" strokeWidth={1.5} />
          </div>

          {/* Label */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: cfg.color,
              marginBottom: 8,
            }}
          >
            Your dreamer type
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "var(--dp-text)",
              marginBottom: 12,
              letterSpacing: "-1px",
              lineHeight: 1.1,
            }}
          >
            {result.title || cfg.title}
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: 16,
              color: "var(--dp-text-secondary)",
              lineHeight: 1.7,
              maxWidth: 340,
              margin: "0 auto 28px",
            }}
          >
            {result.description || cfg.description}
          </p>

          {/* Traits */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              marginBottom: 40,
            }}
          >
            {(result.traits || cfg.traits).map(function (trait, i) {
              return (
                <div
                  key={i}
                  style={glass({
                    borderRadius: 20,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: cfg.color,
                    opacity: resultMounted ? 1 : 0,
                    transform: resultMounted ? "translateY(0)" : "translateY(12px)",
                    transition:
                      "all 0.5s cubic-bezier(0.16,1,0.3,1) " + (0.4 + i * 0.1) + "s",
                  })}
                >
                  {trait}
                </div>
              );
            })}
          </div>

          {/* Scores preview */}
          {result.scores && (
            <div
              style={glass({
                borderRadius: 16,
                padding: "16px 20px",
                width: "100%",
                maxWidth: 340,
                marginBottom: 32,
              })}
            >
              {Object.entries(result.scores).map(function (entry) {
                var dim = entry[0];
                var score = entry[1];
                var maxPossible = 24;
                var pct = Math.round((score / maxPossible) * 100);
                var dimCfg = TYPE_CONFIG[dim];
                return (
                  <div key={dim} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--dp-text-secondary)",
                        marginBottom: 4,
                      }}
                    >
                      <span>{dimCfg ? dimCfg.title : dim}</span>
                      <span>{pct}%</span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: "var(--dp-glass-border)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 3,
                          width: resultMounted ? pct + "%" : "0%",
                          background: dimCfg ? dimCfg.gradient : BRAND.purple,
                          transition: "width 1s cubic-bezier(0.16,1,0.3,1) 0.6s",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Continue button */}
          <GradientButton
            gradient="primary"
            onClick={handleContinue}
            fullWidth
            size="lg"
            icon={ArrowRight}
            style={{
              height: 56,
              borderRadius: 28,
              fontSize: 17,
              letterSpacing: "-0.2px",
              maxWidth: 340,
            }}
          >
            Continue
          </GradientButton>
        </div>
      </div>
    );
  }

  // ─── Quiz Screen ──────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          position: "relative",
          zIndex: 50,
          padding: "16px 20px 0",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.6s ease 0.2s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          {/* Back button */}
          <button
            onClick={goBack}
            disabled={currentQ === 0}
            style={{
              background: "transparent",
              border: "none",
              color:
                currentQ > 0 ? "var(--dp-text-secondary)" : "transparent",
              fontSize: 14,
              fontWeight: 600,
              cursor: currentQ > 0 ? "pointer" : "default",
              padding: "8px 0",
              fontFamily: "inherit",
              minHeight: 44,
            }}
          >
            Back
          </button>
          {/* Counter */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--dp-text-muted)",
            }}
          >
            {currentQ + 1} / {QUESTIONS.length}
          </span>
          {/* Skip */}
          <button
            onClick={function () {
              navigate("/onboarding");
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--dp-text-muted)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              padding: "8px 0",
              fontFamily: "inherit",
              minHeight: 44,
            }}
          >
            Skip
          </button>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 4 }}>
          {QUESTIONS.map(function (_, i) {
            var filled = i < currentQ || (i === currentQ && answers[i] !== undefined);
            var active = i === currentQ;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  overflow: "hidden",
                  background: "var(--dp-glass-border)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    width: filled
                      ? "100%"
                      : active
                        ? "50%"
                        : "0%",
                    background: BRAND.purple,
                    transition: "width 0.5s cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Question content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px 40px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            opacity: slideOpacity,
            transform: slideTransform,
            transition:
              direction !== 0
                ? "opacity 0.3s ease, transform 0.3s ease"
                : "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          {/* Question text */}
          <h2
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "var(--dp-text)",
              textAlign: "center",
              lineHeight: 1.3,
              letterSpacing: "-0.5px",
              marginBottom: 40,
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s",
            }}
          >
            {question.question}
          </h2>

          {/* 2x2 grid of answer cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {question.options.map(function (opt, i) {
              var OptionIcon = opt.icon;
              var isSelected = answers[currentQ] === i;
              var delayMs = 0.15 + i * 0.08;

              return (
                <button
                  key={i}
                  onClick={function () {
                    handleAnswer(i);
                  }}
                  disabled={loading}
                  style={glass({
                    borderRadius: 20,
                    padding: "24px 16px",
                    cursor: loading ? "default" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "center",
                    fontFamily: "inherit",
                    transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                    borderColor: isSelected
                      ? BRAND.purple
                      : "var(--dp-glass-border)",
                    boxShadow: isSelected
                      ? "0 0 20px rgba(139,92,246,0.3), inset 0 0 20px rgba(139,92,246,0.05)"
                      : "none",
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(16px)",
                    minHeight: 44,
                  })}
                  onMouseEnter={function (e) {
                    if (!loading) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = isSelected
                        ? "0 0 24px rgba(139,92,246,0.4), inset 0 0 20px rgba(139,92,246,0.05)"
                        : "0 8px 24px rgba(0,0,0,0.15)";
                    }
                  }}
                  onMouseLeave={function (e) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = isSelected
                      ? "0 0 20px rgba(139,92,246,0.3), inset 0 0 20px rgba(139,92,246,0.05)"
                      : "none";
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: isSelected
                        ? "linear-gradient(135deg, " + BRAND.purple + ", " + BRAND.pink + ")"
                        : "var(--dp-accent-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <OptionIcon
                      size={22}
                      strokeWidth={2}
                      color={isSelected ? "#fff" : "var(--dp-text-secondary)"}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: isSelected
                        ? BRAND.purple
                        : "var(--dp-text-primary)",
                      lineHeight: 1.3,
                    }}
                  >
                    {opt.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div
            style={{
              marginTop: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              className="dp-spin"
              style={{
                width: 32,
                height: 32,
                border: "3px solid var(--dp-glass-border)",
                borderTopColor: BRAND.purple,
                borderRadius: "50%",
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--dp-text-muted)",
              }}
            >
              Discovering your dreamer type...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
