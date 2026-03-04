import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Star, Clock, Target, Sparkles, CheckCircle2, ChevronRight,
  Briefcase, Heart, DollarSign, Palette, TrendingUp, Users, BookOpen,
  Music, Camera, Brain, Rocket, Globe, Sunrise, Ear, PiggyBank, X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PageLayout from "../../components/shared/PageLayout";
import { apiGet, apiPost } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { CATEGORIES as CAT_MAP, catSolid, catColor, adaptColor } from "../../styles/colors";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GradientButton from "../../components/shared/GradientButton";
import GlassModal from "../../components/shared/GlassModal";
import PillTabs from "../../components/shared/PillTabs";

var ICON_MAP = {
  running: Heart,
  briefcase: Briefcase,
  "book-open": BookOpen,
  "piggy-bank": PiggyBank,
  "pen-tool": Palette,
  sunrise: Sunrise,
  heart: Heart,
  globe: Globe,
  brain: Brain,
  rocket: Rocket,
  music: Music,
  camera: Camera,
  ear: Ear,
  "trending-up": TrendingUp,
  sparkles: Sparkles,
};

var CATEGORY_META = {
  career:        { color: catSolid("career"),        label: CAT_MAP.career ? CAT_MAP.career.label : "Career",   icon: Briefcase },
  health:        { color: catSolid("health"),        label: CAT_MAP.health ? CAT_MAP.health.label : "Health",   icon: Heart },
  finance:       { color: catSolid("finance"),       label: CAT_MAP.finance ? CAT_MAP.finance.label : "Finance", icon: DollarSign },
  hobbies:       { color: catSolid("hobbies"),       label: CAT_MAP.hobbies ? CAT_MAP.hobbies.label : "Hobbies", icon: Palette },
  personal:      { color: catSolid("personal"),      label: CAT_MAP.personal ? CAT_MAP.personal.label : "Growth", icon: TrendingUp },
  relationships: { color: catSolid("relationships"), label: CAT_MAP.relationships ? CAT_MAP.relationships.label : "Social", icon: Users },
  social:        { color: catSolid("relationships"), label: "Social",   icon: Users },
  education:     { color: "#6366F1",                 label: "Education", icon: BookOpen },
  creative:      { color: "#EC4899",                 label: "Creative",  icon: Palette },
  travel:        { color: "#F59E0B",                 label: "Travel",    icon: Globe },
};

var FILTER_TABS = ["All", "Health", "Career", "Finance", "Personal", "Hobbies", "Relationships"];

var DIFFICULTY_CONFIG = {
  beginner:     { label: "Beginner",     color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)" },
  intermediate: { label: "Intermediate", color: "#FCD34D", bg: "rgba(252,211,77,0.12)", border: "rgba(252,211,77,0.25)" },
  advanced:     { label: "Advanced",     color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)" },
};

function getCategoryKey(filterLabel) {
  var map = {
    Health: "health",
    Career: "career",
    Finance: "finance",
    Hobbies: "hobbies",
    Personal: "personal",
    Relationships: "relationships",
    Social: "social",
    Education: "education",
    Creative: "creative",
    Travel: "travel",
  };
  return map[filterLabel] || null;
}

function formatDuration(days) {
  if (!days) return "";
  if (days <= 30) return Math.round(days / 7) + " weeks";
  if (days < 365) return Math.round(days / 30) + " months";
  return Math.round(days / 365) + " year" + (days >= 730 ? "s" : "");
}

export default function DreamTemplatesScreen() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var [mounted, setMounted] = useState(false);
  var [activeFilter, setActiveFilter] = useState("All");
  var [selectedTemplate, setSelectedTemplate] = useState(null);
  var [using, setUsing] = useState(false);
  var { showToast } = useToast();

  var templatesQuery = useQuery({
    queryKey: ["dream-templates"],
    queryFn: function () { return apiGet(DREAMS.TEMPLATES.LIST); },
  });
  var templates = templatesQuery.data?.results || templatesQuery.data || [];

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  var stagger = function (index) {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.6s cubic-bezier(0.4,0,0.2,1) " + (index * 0.07) + "s, transform 0.6s cubic-bezier(0.4,0,0.2,1) " + (index * 0.07) + "s",
    };
  };

  var filteredTemplates = activeFilter === "All"
    ? templates
    : templates.filter(function (t) { return t.category === getCategoryKey(activeFilter); });

  function handleUseTemplate(template) {
    if (using) return;
    setUsing(true);
    apiPost(DREAMS.TEMPLATES.USE(template.id)).then(function (data) {
      showToast("Dream created from template!", "success");
      setSelectedTemplate(null);
      navigate("/dream/" + data.id);
    }).catch(function (err) {
      showToast(err.userMessage || err.message || "Failed to use template", "error");
    }).finally(function () {
      setUsing(false);
    });
  }

  // ── Header ──
  function renderHeader() {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        marginBottom: 24,
      }}>
        <IconButton icon={ArrowLeft} onClick={function () { navigate("/"); }} />
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: "var(--dp-text)",
            margin: 0, letterSpacing: "-0.5px",
          }}>
            Dream Templates
          </h1>
          <p style={{
            fontSize: 13, color: "var(--dp-text-tertiary)",
            margin: 0, marginTop: 2,
          }}>
            Pre-built plans to jumpstart your dreams
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (templatesQuery.isLoading) {
    return (
      <PageLayout>
        <div style={{
          display: "flex", flexDirection: "column",
          minHeight: "100vh", paddingTop: 20, paddingBottom: 24,
        }}>
          {renderHeader()}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3, 4].map(function (i) {
              return <SkeletonCard key={i} height={200} />;
            })}
          </div>
        </div>
      </PageLayout>
    );
  }

  // ── Error ──
  if (templatesQuery.isError) {
    return (
      <PageLayout>
        <div style={{
          display: "flex", flexDirection: "column",
          minHeight: "100vh", paddingTop: 20, paddingBottom: 24,
        }}>
          {renderHeader()}
          <ErrorState
            message={(templatesQuery.error?.userMessage || templatesQuery.error?.message) || "Failed to load templates"}
            onRetry={function () { templatesQuery.refetch(); }}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{
        display: "flex", flexDirection: "column",
        minHeight: "100vh", paddingTop: 20, paddingBottom: 24,
      }}>
        {/* Header */}
        <div style={stagger(0)}>
          {renderHeader()}
        </div>

        {/* Filter Tabs */}
        <div style={{ ...stagger(1), marginBottom: 20 }}>
          <PillTabs
            tabs={FILTER_TABS.map(function (tab) { return { key: tab, label: tab }; })}
            active={activeFilter}
            onChange={setActiveFilter}
            scrollable
          />
        </div>

        {/* Template Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredTemplates.map(function (template, idx) {
            var catMeta = CATEGORY_META[template.category] || {
              color: "#8B5CF6", label: template.category_display || template.category, icon: BookOpen,
            };
            var diffConfig = DIFFICULTY_CONFIG[template.difficulty] || DIFFICULTY_CONFIG.intermediate;
            var CatIcon = catMeta.icon;
            var TemplateIcon = ICON_MAP[template.icon] || Sparkles;
            var catTextColor = catColor(template.category, isLight);
            var diffTextColor = adaptColor(diffConfig.color, isLight);
            var goalsCount = template.goals_count || (template.template_goals ? template.template_goals.length : 0);
            var duration = template.suggested_timeline || formatDuration(template.estimated_duration_days);

            return (
              <GlassCard
                key={template.id}
                padding={20}
                hover
                onClick={function () { setSelectedTemplate(template); }}
                style={{
                  ...stagger(2 + idx),
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {/* Featured star */}
                {template.is_featured && (
                  <div style={{
                    position: "absolute", top: 14, right: 14,
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 10px",
                    borderRadius: 50,
                    background: "rgba(252,211,77,0.1)",
                    border: "1px solid rgba(252,211,77,0.2)",
                  }}>
                    <Star size={12} color={"var(--dp-warning)"} fill={"var(--dp-warning)"} />
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: "var(--dp-warning)",
                    }}>
                      Popular
                    </span>
                  </div>
                )}

                {/* Icon + Title row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: (template.color || catMeta.color) + "18",
                    border: "1px solid " + (template.color || catMeta.color) + "30",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <TemplateIcon size={18} color={template.color || catMeta.color} />
                  </div>
                  <h3 style={{
                    fontSize: 17, fontWeight: 700, color: "var(--dp-text)",
                    margin: 0,
                    paddingRight: template.is_featured ? 90 : 0,
                  }}>
                    {template.title}
                  </h3>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: 13, color: "var(--dp-text-tertiary)",
                  margin: "0 0 14px",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {template.description}
                </p>

                {/* Meta row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  flexWrap: "wrap",
                }}>
                  {/* Category pill */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 12px",
                    borderRadius: 50,
                    background: catMeta.color + "15",
                    border: "1px solid " + catMeta.color + "30",
                  }}>
                    <CatIcon size={12} color={catTextColor} />
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: catTextColor,
                    }}>
                      {catMeta.label}
                    </span>
                  </div>

                  {/* Goal count */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Target size={12} color="var(--dp-text-muted)" />
                    <span style={{
                      fontSize: 12, color: "var(--dp-text-tertiary)",
                    }}>
                      {goalsCount} goal{goalsCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Duration */}
                  {duration && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <Clock size={12} color="var(--dp-text-muted)" />
                      <span style={{
                        fontSize: 12, color: "var(--dp-text-tertiary)",
                      }}>
                        {duration}
                      </span>
                    </div>
                  )}

                  {/* Difficulty badge */}
                  <div style={{
                    padding: "3px 10px",
                    borderRadius: 50,
                    background: diffConfig.bg,
                    border: "1px solid " + diffConfig.border,
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: diffTextColor,
                    }}>
                      {diffConfig.label}
                    </span>
                  </div>

                  {/* Usage count */}
                  {template.usage_count > 0 && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <Users size={12} color="var(--dp-text-muted)" />
                      <span style={{
                        fontSize: 12, color: "var(--dp-text-tertiary)",
                      }}>
                        {template.usage_count} used
                      </span>
                    </div>
                  )}
                </div>

                {/* Tap indicator */}
                <div style={{
                  position: "absolute", right: 16, bottom: 20,
                }}>
                  <ChevronRight size={16} color="var(--dp-text-muted)" />
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredTemplates.length === 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "60px 20px",
            textAlign: "center",
          }}>
            <BookOpen size={40} color="var(--dp-text-muted)" style={{ marginBottom: 16 }} />
            <p style={{
              fontSize: 15, fontWeight: 600, color: "var(--dp-text-tertiary)",
              margin: 0,
            }}>
              No templates found
            </p>
            <p style={{
              fontSize: 13, color: "var(--dp-text-muted)",
              marginTop: 6,
            }}>
              Try a different category filter
            </p>
          </div>
        )}

        {/* ── Template Detail Modal ── */}
        <GlassModal
          open={!!selectedTemplate}
          onClose={function () { setSelectedTemplate(null); }}
          title={selectedTemplate ? selectedTemplate.title : ""}
          maxWidth={480}
        >
          {selectedTemplate && (function () {
            var t = selectedTemplate;
            var catMeta = CATEGORY_META[t.category] || {
              color: "#8B5CF6", label: t.category_display || t.category, icon: BookOpen,
            };
            var diffConfig = DIFFICULTY_CONFIG[t.difficulty] || DIFFICULTY_CONFIG.intermediate;
            var CatIcon = catMeta.icon;
            var TemplateIcon = ICON_MAP[t.icon] || Sparkles;
            var catTextColor = catColor(t.category, isLight);
            var diffTextColor = adaptColor(diffConfig.color, isLight);
            var goalsCount = t.goals_count || (t.template_goals ? t.template_goals.length : 0);
            var duration = t.suggested_timeline || formatDuration(t.estimated_duration_days);
            var goals = t.template_goals || [];

            return (
              <div style={{ padding: "0 20px 20px" }}>
                {/* Icon + Description */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 14,
                  marginTop: 16, marginBottom: 16,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: (t.color || catMeta.color) + "18",
                    border: "1px solid " + (t.color || catMeta.color) + "30",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <TemplateIcon size={24} color={t.color || catMeta.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: 14, color: "var(--dp-text-secondary)",
                      margin: 0, lineHeight: 1.5,
                    }}>
                      {t.description}
                    </p>
                  </div>
                </div>

                {/* Meta pills */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  flexWrap: "wrap", marginBottom: 20,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 50,
                    background: catMeta.color + "15",
                    border: "1px solid " + catMeta.color + "30",
                  }}>
                    <CatIcon size={12} color={catTextColor} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: catTextColor }}>
                      {catMeta.label}
                    </span>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "5px 12px", borderRadius: 50,
                    background: "var(--dp-surface)",
                    border: "1px solid var(--dp-glass-border)",
                  }}>
                    <Target size={12} color="var(--dp-text-muted)" />
                    <span style={{ fontSize: 12, color: "var(--dp-text-secondary)" }}>
                      {goalsCount} goal{goalsCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {duration && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 12px", borderRadius: 50,
                      background: "var(--dp-surface)",
                      border: "1px solid var(--dp-glass-border)",
                    }}>
                      <Clock size={12} color="var(--dp-text-muted)" />
                      <span style={{ fontSize: 12, color: "var(--dp-text-secondary)" }}>
                        {duration}
                      </span>
                    </div>
                  )}
                  <div style={{
                    padding: "4px 12px", borderRadius: 50,
                    background: diffConfig.bg,
                    border: "1px solid " + diffConfig.border,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: diffTextColor }}>
                      {diffConfig.label}
                    </span>
                  </div>
                </div>

                {/* Goals Preview */}
                {goals.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{
                      fontSize: 13, fontWeight: 700, color: "var(--dp-text-tertiary)",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      margin: "0 0 12px",
                    }}>
                      Included Goals
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {goals.map(function (goal, gi) {
                        var taskCount = goal.tasks ? goal.tasks.length : 0;
                        return (
                          <div key={gi} style={{
                            padding: "12px 14px",
                            borderRadius: 12,
                            background: "var(--dp-surface)",
                            border: "1px solid var(--dp-glass-border)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <CheckCircle2 size={14} color={t.color || catMeta.color} />
                              <span style={{
                                fontSize: 14, fontWeight: 600, color: "var(--dp-text)",
                                flex: 1,
                              }}>
                                {goal.title}
                              </span>
                              {taskCount > 0 && (
                                <span style={{
                                  fontSize: 11, color: "var(--dp-text-muted)",
                                  background: "var(--dp-glass-bg)",
                                  padding: "2px 8px", borderRadius: 50,
                                }}>
                                  {taskCount} task{taskCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {goal.description && (
                              <p style={{
                                fontSize: 12, color: "var(--dp-text-tertiary)",
                                margin: "6px 0 0 22px", lineHeight: 1.4,
                              }}>
                                {goal.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Use Template Button */}
                <GradientButton
                  gradient="primaryDark"
                  icon={Sparkles}
                  fullWidth
                  size="lg"
                  loading={using}
                  disabled={using}
                  onClick={function () { handleUseTemplate(t); }}
                >
                  Use This Template
                </GradientButton>
              </div>
            );
          })()}
        </GlassModal>
      </div>
    </PageLayout>
  );
}
