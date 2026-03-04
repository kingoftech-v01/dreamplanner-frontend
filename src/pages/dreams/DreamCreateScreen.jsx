import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, ArrowLeft, ArrowRight, Sparkles, Briefcase, Heart, DollarSign,
  Palette, TrendingUp, Users, Calendar, Clock, Check, ChevronLeft, ChevronRight,
  Wand2, Loader2, Tag,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { CATEGORIES as CAT_MAP, catSolid } from "../../styles/colors";
import { apiPost } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import { useToast } from "../../context/ToastContext";
import { sanitizeText, validateRequired } from "../../utils/sanitize";
import IconButton from "../../components/shared/IconButton";
import GradientButton from "../../components/shared/GradientButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassInput from "../../components/shared/GlassInput";

const CATEGORIES = [
  { id: "career", label: CAT_MAP.career.label, icon: Briefcase, color: catSolid("career") },
  { id: "health", label: CAT_MAP.health.label, icon: Heart, color: catSolid("health") },
  { id: "finance", label: CAT_MAP.finance.label, icon: DollarSign, color: catSolid("finance") },
  { id: "hobbies", label: CAT_MAP.hobbies.label, icon: Palette, color: catSolid("hobbies") },
  { id: "personal", label: CAT_MAP.personal.label, icon: TrendingUp, color: catSolid("personal") },
  { id: "relationships", label: CAT_MAP.relationships.label, icon: Users, color: catSolid("relationships") },
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
  const [touched, setTouched] = useState({ 0: false, 1: false, 2: false, 3: false });

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // ─── AUTO-CATEGORIZE AI ────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); // { category, confidence, tags: [{name, relevance}], reasoning }
  const [selectedTags, setSelectedTags] = useState({}); // { tagName: true/false }
  const [aiError, setAiError] = useState("");

  // ─── DRAFT AUTO-SAVE ─────────────────────────────────────────
  // Load draft from localStorage on mount
  useEffect(function () {
    try {
      var draft = localStorage.getItem("dp-dream-draft");
      if (draft) {
        var parsed = JSON.parse(draft);
        if (parsed.title && !title) setTitle(parsed.title);
        if (parsed.description && !description) setDescription(parsed.description);
        if (parsed.category) setCategory(parsed.category);
      }
    } catch (e) {}
  }, []);

  // Save draft to localStorage on changes (debounced)
  useEffect(function () {
    if (!title && !description) return;
    var timer = setTimeout(function () {
      try {
        localStorage.setItem("dp-dream-draft", JSON.stringify({ title: title, description: description, category: category }));
      } catch (e) {}
    }, 1000);
    return function () { clearTimeout(timer); };
  }, [title, description, category]);

  // Clear draft on successful submission
  function clearDraft() {
    try { localStorage.removeItem("dp-dream-draft"); } catch (e) {}
  }

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-categorize with AI
  function handleAutoCategorize() {
    if (aiLoading) return;
    if (!title.trim() || description.trim().length < 10) {
      showToast("Enter a title and description (10+ chars) first", "error");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiSuggestion(null);

    apiPost(DREAMS.AUTO_CATEGORIZE, {
      title: title.trim(),
      description: description.trim(),
    }).then(function (result) {
      setAiLoading(false);
      setAiSuggestion(result);
      // Pre-select all suggested tags
      var tagMap = {};
      (result.tags || []).forEach(function (t) { tagMap[t.name] = true; });
      setSelectedTags(tagMap);
    }).catch(function (err) {
      setAiLoading(false);
      var msg = err.userMessage || err.message || "AI categorization failed";
      setAiError(msg);
      showToast(msg, "error");
    });
  }

  // Apply AI suggestion (category)
  function handleApplyAiCategory() {
    if (!aiSuggestion) return;
    setCategory(aiSuggestion.category);
    showToast("Category applied: " + (CATEGORIES.find(function (c) { return c.id === aiSuggestion.category; }) || {}).label, "success");
  }

  // Toggle a suggested tag
  function handleToggleTag(tagName) {
    setSelectedTags(function (prev) {
      var next = Object.assign({}, prev);
      next[tagName] = !next[tagName];
      return next;
    });
  }

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

    // Collect selected AI tags
    var tagsToAdd = [];
    if (aiSuggestion && aiSuggestion.tags) {
      aiSuggestion.tags.forEach(function (t) {
        if (selectedTags[t.name]) tagsToAdd.push(t.name);
      });
    }

    apiPost(DREAMS.LIST, {
      title: cleanTitle,
      description: cleanDescription,
      category: cleanCategory,
      target_date: targetDate,
    }).then(function (dream) {
      clearDraft();

      // Add AI-suggested tags if any were selected
      if (tagsToAdd.length > 0) {
        var tagPromises = tagsToAdd.map(function (tagName) {
          return apiPost(DREAMS.TAGS(dream.id), { tag_name: tagName }).catch(function () {});
        });
        return Promise.all(tagPromises).then(function () { return dream; });
      }
      return dream;
    }).then(function (dream) {
      setSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ["dreams"] });
      navigate("/dream/" + dream.id + "/calibration");
    }).catch(function (err) {
      setSubmitting(false);
      var msg = err.userMessage || err.message || "Failed to create dream. Please try again.";
      setServerError(msg);
      showToast(msg, "error");
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
          <IconButton icon={ArrowLeft} onClick={() => step > 0 ? setStep(step - 1) : navigate("/")} />

          <span style={{
            fontSize: 13, color: "var(--dp-text-tertiary)",
            fontWeight: 500,
          }}>
            Step {step + 1} of {STEPS.length}
          </span>

          <IconButton icon={X} onClick={() => navigate("/")} />
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
            margin: 0, letterSpacing: "-0.5px",
          }}>
            {step === 0 && "What's your dream?"}
            {step === 1 && "Choose a category"}
            {step === 2 && "Set a timeframe"}
          </h1>
          <p style={{
            fontSize: 14, color: "var(--dp-text-tertiary)",
            marginTop: 6,
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
              <GlassInput
                label="Dream Title"
                placeholder="e.g., Launch my own business, Run a marathon..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                multiline
                inputStyle={{ fontSize: 18, fontWeight: 600, lineHeight: 1.4, minHeight: 56, resize: "none" }}
                style={{ marginBottom: 18 }}
              />
              <GlassInput
                label="Description"
                required
                placeholder="Add more details about what you want to achieve..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                inputStyle={{ lineHeight: 1.6, minHeight: 100, resize: "none" }}
              />

              {/* Auto-categorize button */}
              <button
                onClick={handleAutoCategorize}
                disabled={aiLoading || !title.trim() || description.trim().length < 10}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", marginTop: 16, padding: "12px 20px",
                  borderRadius: 14,
                  background: "var(--dp-glass-bg)",
                  backdropFilter: "blur(40px)",
                  WebkitBackdropFilter: "blur(40px)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  cursor: aiLoading || !title.trim() || description.trim().length < 10 ? "not-allowed" : "pointer",
                  color: "var(--dp-accent-text)",
                  fontSize: 14, fontWeight: 600,
                  transition: "all 0.3s ease",
                  opacity: aiLoading || !title.trim() || description.trim().length < 10 ? 0.5 : 1,
                  boxShadow: "0 0 20px rgba(139,92,246,0.08)",
                  fontFamily: "inherit",
                }}
              >
                {aiLoading ? (
                  <Loader2 size={16} style={{ animation: "dpSpinAnim 1s linear infinite" }} />
                ) : (
                  <Wand2 size={16} />
                )}
                {aiLoading ? "Analyzing..." : "Auto-categorize with AI"}
              </button>

              {/* AI Error */}
              {aiError && (
                <div style={{
                  marginTop: 10, padding: "10px 14px", borderRadius: 12,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
                  fontSize: 13, color: "#F87171",
                }}>
                  {aiError}
                </div>
              )}

              {/* AI Suggestion Preview */}
              {aiSuggestion && !aiLoading && (
                <div style={{
                  marginTop: 14, padding: 16, borderRadius: 16,
                  background: "var(--dp-glass-bg)",
                  backdropFilter: "blur(40px)",
                  WebkitBackdropFilter: "blur(40px)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.2)",
                }}>
                  {/* Header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Sparkles size={14} color="var(--dp-accent-text)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>
                        AI Suggestion
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      padding: "3px 10px", borderRadius: 20,
                      background: aiSuggestion.confidence >= 0.8
                        ? "rgba(16,185,129,0.15)"
                        : aiSuggestion.confidence >= 0.5
                          ? "rgba(252,211,77,0.15)"
                          : "rgba(239,68,68,0.15)",
                      color: aiSuggestion.confidence >= 0.8
                        ? "#10B981"
                        : aiSuggestion.confidence >= 0.5
                          ? "#FCD34D"
                          : "#F87171",
                      border: "1px solid " + (aiSuggestion.confidence >= 0.8
                        ? "rgba(16,185,129,0.25)"
                        : aiSuggestion.confidence >= 0.5
                          ? "rgba(252,211,77,0.25)"
                          : "rgba(239,68,68,0.25)"),
                    }}>
                      {Math.round(aiSuggestion.confidence * 100)}% confident
                    </span>
                  </div>

                  {/* Suggested Category */}
                  {(function () {
                    var sugCat = CATEGORIES.find(function (c) { return c.id === aiSuggestion.category; });
                    if (!sugCat) return null;
                    var SugIcon = sugCat.icon;
                    return (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        marginBottom: 12, padding: "10px 14px", borderRadius: 12,
                        background: sugCat.color + "12",
                        border: "1px solid " + sugCat.color + "25",
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: sugCat.color + "18",
                          border: "1px solid " + sugCat.color + "30",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <SugIcon size={16} color={sugCat.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>
                            {sugCat.label}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--dp-text-tertiary)" }}>
                            Suggested category
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Suggested Tags */}
                  {aiSuggestion.tags && aiSuggestion.tags.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginBottom: 8,
                      }}>
                        <Tag size={12} color="var(--dp-text-tertiary)" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)" }}>
                          Suggested Tags
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {aiSuggestion.tags.map(function (tag) {
                          var isOn = selectedTags[tag.name];
                          return (
                            <button
                              key={tag.name}
                              onClick={function () { handleToggleTag(tag.name); }}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "5px 12px", borderRadius: 20,
                                fontSize: 12, fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                fontFamily: "inherit",
                                background: isOn
                                  ? "rgba(139,92,246,0.15)"
                                  : "var(--dp-surface)",
                                border: isOn
                                  ? "1px solid rgba(139,92,246,0.35)"
                                  : "1px solid var(--dp-input-border)",
                                color: isOn
                                  ? "var(--dp-accent-text)"
                                  : "var(--dp-text-secondary)",
                              }}
                            >
                              {isOn && <Check size={10} strokeWidth={3} />}
                              {tag.name}
                              <span style={{
                                fontSize: 10, opacity: 0.6,
                                marginLeft: 2,
                              }}>
                                {Math.round(tag.relevance * 100)}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reasoning */}
                  {aiSuggestion.reasoning && (
                    <p style={{
                      fontSize: 12, color: "var(--dp-text-tertiary)",
                      lineHeight: 1.5, margin: 0, marginBottom: 12,
                      fontStyle: "italic",
                    }}>
                      {aiSuggestion.reasoning}
                    </p>
                  )}

                  {/* Apply Button */}
                  <button
                    onClick={handleApplyAiCategory}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      width: "100%", padding: "10px 16px",
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                      border: "none",
                      cursor: "pointer",
                      color: "#fff",
                      fontSize: 13, fontWeight: 700,
                      transition: "all 0.25s ease",
                      boxShadow: "0 4px 16px rgba(139,92,246,0.3)",
                      fontFamily: "inherit",
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                    Apply Category
                  </button>
                </div>
              )}
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
                var isAiRecommended = aiSuggestion && aiSuggestion.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      ...stagger(3 + idx),
                      background: "var(--dp-glass-bg)",
                      backdropFilter: "blur(40px)",
                      WebkitBackdropFilter: "blur(40px)",
                      border: isSelected ? `1px solid ${cat.color}55` : isAiRecommended ? `1px solid rgba(139,92,246,0.3)` : "1px solid var(--dp-input-border)",
                      borderRadius: 20,
                      padding: "20px 16px",
                      cursor: "pointer",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 12,
                      boxShadow: isSelected
                        ? `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 20px ${cat.color}20, 0 0 0 1px ${cat.color}33`
                        : isAiRecommended
                          ? "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 16px rgba(139,92,246,0.12)"
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
                    {isAiRecommended && !isSelected && (
                      <div style={{
                        position: "absolute", top: 6, right: 6,
                        display: "flex", alignItems: "center", gap: 3,
                        padding: "2px 7px", borderRadius: 8,
                        background: "rgba(139,92,246,0.15)",
                        border: "1px solid rgba(139,92,246,0.25)",
                      }}>
                        <Sparkles size={9} color="var(--dp-accent-text)" />
                        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--dp-accent-text)" }}>AI</span>
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
                <Calendar size={16} color={"var(--dp-accent-text)"} />
                <span style={{
                  fontSize: 14, color: "var(--dp-accent-text)", fontWeight: 500,
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
                <GlassCard padding={20} style={{
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
                }}>
                  {/* Month/Year header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 18,
                  }}>
                    <button className="dp-gh" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
                      style={{ width: 34, height: 34, borderRadius: 10, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dp-text-secondary)", transition: "all 0.2s", fontFamily: "inherit" }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)" }}>
                      {MONTHS[calMonth]} {calYear}
                    </span>
                    <button className="dp-gh" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
                      style={{ width: 34, height: 34, borderRadius: 10, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dp-text-secondary)", transition: "all 0.2s", fontFamily: "inherit" }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
                    {DAYS.map(d => (
                      <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)", padding: "6px 0" }}>
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
                            fontSize: 13, fontWeight: sel ? 700 : 500,
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
                                    ? "var(--dp-accent-text)"
                                    : "var(--dp-text-primary)",
                            boxShadow: sel ? "0 2px 12px rgba(139,92,246,0.4)" : "none",
                            border: td && !sel ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                          }}
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
                      <Calendar size={14} color={"var(--dp-accent-text)"} />
                      <span style={{ fontSize: 13, color: "var(--dp-accent-text)", fontWeight: 600 }}>
                        {MONTHS[customDate.month]} {customDate.day}, {customDate.year}
                      </span>
                    </div>
                  )}
                </GlassCard>
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
                  <Clock size={16} color={"var(--dp-accent-text)"} />
                  <span style={{
                    fontSize: 13, color: "var(--dp-text-secondary)",
                    }}>
                    Estimated{" "}
                    <strong style={{ color: "var(--dp-accent-text)" }}>
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
              fontSize: 13, color: "var(--dp-danger)", lineHeight: 1.5,
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
          @keyframes dpSpinAnim {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>

        {/* Navigation Buttons */}
        <div style={{
          ...stagger(8),
          display: "flex", gap: 12, marginTop: 24,
        }}>
          {step > 0 && (
            <button
              className="dp-gh"
              onClick={() => setStep(step - 1)}
              disabled={submitting}
              style={{
                flex: 1, height: 50, borderRadius: 14,
                background: "var(--dp-glass-bg)",
                border: "1px solid var(--dp-input-border)",
                cursor: submitting ? "not-allowed" : "pointer",
                color: "var(--dp-text-secondary)", fontSize: 15, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.25s ease",
                opacity: submitting ? 0.5 : 1,
                fontFamily: "inherit",
              }}
            >
              <ArrowLeft size={18} />
              Back
            </button>
          )}
          <GradientButton
            gradient="primaryDark"
            onClick={handleNext}
            disabled={!canNext() || submitting}
            loading={submitting}
            icon={!submitting && step < 2 ? ArrowRight : !submitting && step === 2 ? Sparkles : undefined}
            style={{
              flex: step === 0 ? "unset" : 1,
              width: step === 0 ? "100%" : "auto",
              height: 50,
            }}
          >
            {submitting ? "Creating..." : step === 2 ? "Create Dream" : "Next"}
          </GradientButton>
        </div>
      </div>
    </PageLayout>
  );
}
