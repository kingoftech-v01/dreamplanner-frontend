import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, ArrowLeft, ArrowRight, Sparkles, Briefcase, Heart, DollarSign,
  Palette, TrendingUp, Users, Calendar, Clock, Check, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { apiPost } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import { useToast } from "../../context/ToastContext";
import { sanitizeText, validateRequired } from "../../utils/sanitize";

const glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
};

const inputStyle = {
  width: "100%",
  background: "var(--dp-input-bg)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 14,
  padding: "14px 16px",
  color: "var(--dp-text)",
  fontSize: 15,
  fontFamily: "Inter, sans-serif",
  outline: "none",
  resize: "none",
  transition: "border-color 0.25s ease, box-shadow 0.25s ease",
  boxSizing: "border-box",
};

const inputFocusStyle = {
  borderColor: "rgba(139,92,246,0.5)",
  boxShadow: "0 0 0 3px rgba(139,92,246,0.15)",
};

const CATEGORIES = [
  { id: "career", label: "Career", icon: Briefcase, color: "#8B5CF6" },
  { id: "health", label: "Health", icon: Heart, color: "#10B981" },
  { id: "finance", label: "Finance", icon: DollarSign, color: "#FCD34D" },
  { id: "hobbies", label: "Hobbies", icon: Palette, color: "#EC4899" },
  { id: "personal", label: "Growth", icon: TrendingUp, color: "#6366F1" },
  { id: "relationships", label: "Social", icon: Users, color: "#14B8A6" },
];

const TIMEFRAMES = [
  { id: "1m", label: "1 month" },
  { id: "3m", label: "3 months" },
  { id: "6m", label: "6 months" },
  { id: "1y", label: "1 year" },
];

const STEPS = ["Details", "Category", "Timeframe"];

export default function DreamCreateScreen() {
  const navigate = useNavigate();
  var queryClient = useQueryClient();
  var { showToast } = useToast();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(null);
  const [timeframe, setTimeframe] = useState(null);
  const [customDate, setCustomDate] = useState(null); // { year, month, day }
  const [showCustom, setShowCustom] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [focusedField, setFocusedField] = useState(null);
  const [touched, setTouched] = useState({ 0: false, 1: false, 2: false, 3: false });

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Create dream and navigate to calibration
  function handleCreateDream() {
    if (submitting) return;

    var missing = validateRequired({ title: title, description: description });
    if (missing.length > 0) {
      showToast("Title and description are required", "error");
      return;
    }

    var cleanDescription = sanitizeText(description, 2000);
    if (cleanDescription.length < 10) {
      showToast("Description must be at least 10 characters", "error");
      return;
    }

    setSubmitting(true);
    setServerError("");

    var cleanTitle = sanitizeText(title, 200);
    var cleanCategory = category ? sanitizeText(category, 100) : category;

    var targetDate = null;
    if (customDate) {
      targetDate = customDate.year + "-" + String(customDate.month + 1).padStart(2, "0") + "-" + String(customDate.day).padStart(2, "0");
    } else if (timeframe) {
      var now = new Date();
      var months = timeframe === "1m" ? 1 : timeframe === "3m" ? 3 : timeframe === "6m" ? 6 : 12;
      now.setMonth(now.getMonth() + months);
      targetDate = now.toISOString().split("T")[0];
    }

    apiPost(DREAMS.LIST, {
      title: cleanTitle,
      description: cleanDescription,
      category: cleanCategory,
      targetDate: targetDate,
    }).then(function (dream) {
      setSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ["dreams"] });
      navigate("/dream/" + dream.id + "/calibration");
    }).catch(function (err) {
      setSubmitting(false);
      setServerError(err.message || "Failed to create dream. Please try again.");
      showToast(err.message || "Failed to create dream", "error");
    });
  }

  const stagger = (index) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.08}s, transform 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.08}s`,
  });

  const progressPercent = ((step + 1) / STEPS.length) * 100;

  const canNext = () => {
    if (step === 0) return title.trim().length > 0 && description.trim().length >= 10;
    if (step === 1) return category !== null;
    if (step === 2) return timeframe !== null || customDate !== null;
    return true;
  };

  const getValidationMessage = (s) => {
    if (s === 0 && title.trim().length === 0) return "Please enter a dream title";
    if (s === 0 && title.trim().length > 0 && description.trim().length < 10) return "Description must be at least 10 characters";
    if (s === 1 && category === null) return "Please select a category";
    if (s === 2 && timeframe === null && customDate === null) return "Please set a target date";
    return null;
  };

  const handleNext = () => {
    if (!canNext()) {
      setTouched((prev) => ({ ...prev, [step]: true }));
      return;
    }
    setTouched((prev) => ({ ...prev, [step]: false }));
    if (step === 2) {
      // Last step — create dream and go to calibration
      handleCreateDream();
    } else {
      setStep(step + 1);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.id === category);

  return (
    <PageLayout showNav={false}>
      <div style={{
        display: "flex", flexDirection: "column",
        minHeight: "100vh", paddingTop: 20, paddingBottom: 24,
      }}>
        {/* Top Bar */}
        <div style={{
          ...stagger(0),
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 8,
        }}>
          <button className="dp-ib" onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>

          <span style={{
            fontSize: 13, color: "var(--dp-text-tertiary)",
            fontFamily: "Inter, sans-serif", fontWeight: 500,
          }}>
            Step {step + 1} of {STEPS.length}
          </span>

          <button
            onClick={() => navigate(-1)}
            style={{
              width: 42, height: 42, borderRadius: 14,
              background: "var(--dp-glass-bg)",
              border: "1px solid var(--dp-input-border)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.25s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--dp-surface-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--dp-glass-bg)"}
          >
            <X size={20} color="var(--dp-text-secondary)" />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{
          ...stagger(1),
          height: 4, borderRadius: 2,
          background: "var(--dp-glass-border)",
          marginBottom: 28,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg, #8B5CF6, #C4B5FD)",
            width: `${Math.min(progressPercent, 100)}%`,
            transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: "0 0 12px rgba(139,92,246,0.4)",
          }} />
        </div>

        {/* Step Title */}
        <div style={{
          ...stagger(2),
          marginBottom: 24,
        }}>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
            fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: "-0.5px",
          }}>
            {step === 0 && "What's your dream?"}
            {step === 1 && "Choose a category"}
            {step === 2 && "Set a timeframe"}
          </h1>
          <p style={{
            fontSize: 14, color: "var(--dp-text-tertiary)",
            fontFamily: "Inter, sans-serif", marginTop: 6,
          }}>
            {step === 0 && "Describe the dream you want to achieve"}
            {step === 1 && "Pick the category that best fits your dream"}
            {step === 2 && "How long do you want to work on this?"}
          </p>
        </div>

        {/* Content area - flex grow to push buttons down */}
        <div style={{ flex: 1 }}>
          {/* STEP 0: Details */}
          {step === 0 && (
            <div style={stagger(3)}>
              <div style={{ marginBottom: 18 }}>
                <label style={{
                  fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                  fontFamily: "Inter, sans-serif", display: "block", marginBottom: 8,
                }}>
                  Dream Title
                </label>
                <textarea
                  placeholder="e.g., Launch my own business, Run a marathon..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={() => setFocusedField("title")}
                  onBlur={() => setFocusedField(null)}
                  rows={2}
                  style={{
                    ...inputStyle,
                    fontSize: 18,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    ...(focusedField === "title" ? inputFocusStyle : {}),
                  }}
                />
              </div>
              <div>
                <label style={{
                  fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                  fontFamily: "Inter, sans-serif", display: "block", marginBottom: 8,
                }}>
                  Description *
                </label>
                <textarea
                  placeholder="Add more details about what you want to achieve..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onFocus={() => setFocusedField("desc")}
                  onBlur={() => setFocusedField(null)}
                  rows={4}
                  style={{
                    ...inputStyle,
                    lineHeight: 1.6,
                    ...(focusedField === "desc" ? inputFocusStyle : {}),
                  }}
                />
              </div>

            </div>
          )}

          {/* STEP 1: Categories */}
          {step === 1 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}>
              {CATEGORIES.map((cat, idx) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      ...stagger(3 + idx),
                      ...glass,
                      padding: "20px 16px",
                      cursor: "pointer",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 12,
                      borderColor: isSelected ? `${cat.color}55` : "var(--dp-input-border)",
                      boxShadow: isSelected
                        ? `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 20px ${cat.color}20, 0 0 0 1px ${cat.color}33`
                        : "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: "absolute", top: 8, right: 8,
                        width: 22, height: 22, borderRadius: "50%",
                        background: cat.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Check size={12} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: `${cat.color}18`,
                      border: `1px solid ${cat.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={22} color={cat.color} />
                    </div>
                    <span style={{
                      fontSize: 14, fontWeight: 600, color: "var(--dp-text)",
                      fontFamily: "Inter, sans-serif",
                    }}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: Timeframe */}
          {step === 2 && (
            <div style={stagger(3)}>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 10,
                marginBottom: 20,
              }}>
                {TIMEFRAMES.map((tf, idx) => {
                  const isSelected = timeframe === tf.id && !showCustom;
                  return (
                    <button
                      key={tf.id}
                      onClick={() => {
                        setTimeframe(tf.id);
                        setShowCustom(false);
                      }}
                      style={{
                        ...stagger(3 + idx),
                        padding: "12px 24px",
                        borderRadius: 50,
                        background: isSelected
                          ? "linear-gradient(135deg, #8B5CF6, #7C3AED)"
                          : "var(--dp-surface)",
                        border: isSelected
                          ? "1px solid rgba(139,92,246,0.5)"
                          : "1px solid var(--dp-input-border)",
                        cursor: "pointer",
                        color: isSelected ? "#fff" : "var(--dp-text-secondary)",
                        fontSize: 14, fontWeight: 600,
                        fontFamily: "Inter, sans-serif",
                        transition: "all 0.25s ease",
                        boxShadow: isSelected
                          ? "0 4px 16px rgba(139,92,246,0.3)"
                          : "none",
                      }}
                    >
                      {tf.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom date toggle */}
              <button
                onClick={() => {
                  setShowCustom(!showCustom);
                  if (!showCustom) setTimeframe(null);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, marginBottom: showCustom ? 14 : 0,
                }}
              >
                <Calendar size={16} color={isLight ? "#6D28D9" : "#C4B5FD"} />
                <span style={{
                  fontSize: 14, color: isLight ? "#6D28D9" : "#C4B5FD", fontWeight: 500,
                  fontFamily: "Inter, sans-serif",
                }}>
                  {showCustom ? "Hide custom date" : "Set a custom date"}
                </span>
              </button>

              {showCustom && (() => {
                const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
                const today = new Date();
                const todayY = today.getFullYear(), todayM = today.getMonth(), todayD = today.getDate();
                const firstDay = new Date(calYear, calMonth, 1).getDay();
                const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                const prevMonthDays = new Date(calYear, calMonth, 0).getDate();
                const cells = [];
                for (let i = 0; i < firstDay; i++) cells.push({ day: prevMonthDays - firstDay + 1 + i, outside: true });
                for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, outside: false });
                const remaining = 7 - (cells.length % 7); if (remaining < 7) for (let i = 1; i <= remaining; i++) cells.push({ day: i, outside: true });

                const isSelected = (d) => customDate && customDate.year === calYear && customDate.month === calMonth && customDate.day === d;
                const isToday = (d) => calYear === todayY && calMonth === todayM && d === todayD;
                const isPast = (d) => new Date(calYear, calMonth, d) < new Date(todayY, todayM, todayD);

                return (
                <div style={{
                  ...glass,
                  padding: 20,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
                }}>
                  {/* Month/Year header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 18,
                  }}>
                    <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
                      style={{ width: 34, height: 34, borderRadius: 10, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dp-text-secondary)", transition: "background 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--dp-surface-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--dp-glass-bg)"}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)", fontFamily: "Inter, sans-serif" }}>
                      {MONTHS[calMonth]} {calYear}
                    </span>
                    <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
                      style={{ width: 34, height: 34, borderRadius: 10, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dp-text-secondary)", transition: "background 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--dp-surface-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--dp-glass-bg)"}>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
                    {DAYS.map(d => (
                      <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)", fontFamily: "Inter, sans-serif", padding: "6px 0" }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                    {cells.map((cell, i) => {
                      const sel = !cell.outside && isSelected(cell.day);
                      const td = !cell.outside && isToday(cell.day);
                      const past = !cell.outside && isPast(cell.day);
                      return (
                        <button
                          key={i}
                          disabled={cell.outside || past}
                          onClick={() => {
                            if (!cell.outside && !past) {
                              setCustomDate({ year: calYear, month: calMonth, day: cell.day });
                              setTimeframe("custom");
                            }
                          }}
                          style={{
                            aspectRatio: "1", borderRadius: 10, border: "none",
                            cursor: cell.outside || past ? "default" : "pointer",
                            fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: sel ? 700 : 500,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s ease",
                            background: sel
                              ? "linear-gradient(135deg, #8B5CF6, #7C3AED)"
                              : td
                                ? "rgba(139,92,246,0.15)"
                                : "transparent",
                            color: cell.outside
                              ? "var(--dp-text-muted)"
                              : past
                                ? "var(--dp-text-muted)"
                                : sel
                                  ? "#fff"
                                  : td
                                    ? (isLight ? "#6D28D9" : "#C4B5FD")
                                    : "var(--dp-text-primary)",
                            boxShadow: sel ? "0 2px 12px rgba(139,92,246,0.4)" : "none",
                            border: td && !sel ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                          }}
                          onMouseEnter={e => { if (!cell.outside && !past && !sel) e.currentTarget.style.background = "var(--dp-surface-hover)"; }}
                          onMouseLeave={e => { if (!cell.outside && !past && !sel) e.currentTarget.style.background = td ? "rgba(139,92,246,0.15)" : "transparent"; }}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected date display */}
                  {customDate && (
                    <div style={{
                      marginTop: 14, padding: "10px 14px", borderRadius: 12,
                      background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <Calendar size={14} color={isLight ? "#6D28D9" : "#C4B5FD"} />
                      <span style={{ fontSize: 13, color: isLight ? "#6D28D9" : "#C4B5FD", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>
                        {MONTHS[customDate.month]} {customDate.day}, {customDate.year}
                      </span>
                    </div>
                  )}
                </div>
                );
              })()}

              {/* Time estimate */}
              {(timeframe || customDate) && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  marginTop: 24, padding: "14px 18px",
                  borderRadius: 14,
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.15)",
                }}>
                  <Clock size={16} color={isLight ? "#6D28D9" : "#C4B5FD"} />
                  <span style={{
                    fontSize: 13, color: "var(--dp-text-secondary)",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    Estimated{" "}
                    <strong style={{ color: isLight ? "#6D28D9" : "#C4B5FD" }}>
                      {timeframe === "1m" ? "4 weeks" : timeframe === "3m" ? "12 weeks" : timeframe === "6m" ? "26 weeks" : timeframe === "1y" ? "52 weeks" : "custom period"}
                    </strong>{" "}
                    to achieve your dream
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Server error on step 2 (dream creation failed) */}
          {serverError && step === 2 && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 12, padding: "12px 16px", marginTop: 16,
              fontSize: 13, color: "#FCA5A5", fontFamily: "Inter, sans-serif", lineHeight: 1.5,
            }}>
              {serverError}
            </div>
          )}
        </div>

        {/* Validation Error Message */}
        {touched[step] && getValidationMessage(step) && (
          <div style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.18)",
            display: "flex", alignItems: "center", gap: 8,
            animation: "dpValidationFadeIn 0.3s ease-out",
          }}>
            <span style={{
              fontSize: 13, color: "#F87171", fontWeight: 500,
              fontFamily: "Inter, sans-serif",
            }}>
              {getValidationMessage(step)}
            </span>
          </div>
        )}

        <style>{`
          @keyframes dpValidationFadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Navigation Buttons */}
        <div style={{
          ...stagger(8),
          display: "flex", gap: 12, marginTop: 24,
        }}>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              disabled={submitting}
              style={{
                flex: 1, height: 50, borderRadius: 14,
                background: "var(--dp-glass-bg)",
                border: "1px solid var(--dp-input-border)",
                cursor: submitting ? "not-allowed" : "pointer",
                color: "var(--dp-text-secondary)", fontSize: 15, fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.25s ease",
                opacity: submitting ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = "var(--dp-surface-hover)"; }}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--dp-glass-bg)"}
            >
              <ArrowLeft size={18} />
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={submitting}
            style={{
              flex: step === 0 ? "unset" : 1,
              width: step === 0 ? "100%" : "auto",
              height: 50, borderRadius: 14,
              background: canNext()
                ? "linear-gradient(135deg, #8B5CF6, #7C3AED)"
                : "rgba(139,92,246,0.45)",
              border: "none", cursor: (canNext() && !submitting) ? "pointer" : "not-allowed",
              color: "#fff", fontSize: 15, fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: canNext() ? "0 4px 20px rgba(139,92,246,0.4)" : "none",
              opacity: (canNext() && !submitting) ? 1 : 0.6,
              transition: "all 0.25s ease",
            }}
          >
            {submitting ? "Creating..." : step === 2 ? "Create Dream" : "Next"}
            {!submitting && step < 2 && <ArrowRight size={18} />}
            {!submitting && step === 2 && <Sparkles size={18} />}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
