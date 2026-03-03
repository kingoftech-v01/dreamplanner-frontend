import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Star, Clock, Target, Sparkles,
  Briefcase, Heart, DollarSign, Palette, TrendingUp, Users, BookOpen,
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
import PillTabs from "../../components/shared/PillTabs";

const CATEGORY_META = {
  career: { color: catSolid("career"), label: CAT_MAP.career.label, icon: Briefcase },
  health: { color: catSolid("health"), label: CAT_MAP.health.label, icon: Heart },
  finance: { color: catSolid("finance"), label: CAT_MAP.finance.label, icon: DollarSign },
  hobbies: { color: catSolid("hobbies"), label: CAT_MAP.hobbies.label, icon: Palette },
  personal: { color: catSolid("personal"), label: CAT_MAP.personal.label, icon: TrendingUp },
  relationships: { color: catSolid("relationships"), label: CAT_MAP.relationships.label, icon: Users },
};

const FILTER_TABS = ["All", "Health", "Career", "Finance", "Hobbies", "Growth"];

const DIFFICULTY_CONFIG = {
  Easy: { color: "#10B981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)" },
  Medium: { color: "#FCD34D", bg: "rgba(252,211,77,0.12)", border: "rgba(252,211,77,0.25)" },
  Hard: { color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)" },
};

function getCategoryKey(filterLabel) {
  const map = {
    Health: "health",
    Career: "career",
    Finance: "finance",
    Hobbies: "hobbies",
    Growth: "personal",
    Social: "relationships",
  };
  return map[filterLabel] || null;
}

export default function DreamTemplatesScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  var { showToast } = useToast();

  var templatesQuery = useQuery({
    queryKey: ["dream-templates"],
    queryFn: function () { return apiGet(DREAMS.TEMPLATES.LIST); },
  });
  var templates = templatesQuery.data?.results || templatesQuery.data || [];

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const stagger = (index) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.07}s, transform 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.07}s`,
  });

  const filteredTemplates = activeFilter === "All"
    ? templates
    : templates.filter((t) => t.category === getCategoryKey(activeFilter));

  if (templatesQuery.isLoading) {
    return (
      <PageLayout>
        <div style={{
          display: "flex", flexDirection: "column",
          minHeight: "100vh", paddingTop: 20, paddingBottom: 24,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            marginBottom: 24,
          }}>
            <IconButton icon={ArrowLeft} onClick={() => navigate("/")} />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3, 4].map(function (i) {
              return <SkeletonCard key={i} height={200} />;
            })}
          </div>
        </div>
      </PageLayout>
    );
  }

  if (templatesQuery.isError) {
    return (
      <PageLayout>
        <div style={{
          display: "flex", flexDirection: "column",
          minHeight: "100vh", paddingTop: 20, paddingBottom: 24,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            marginBottom: 24,
          }}>
            <IconButton icon={ArrowLeft} onClick={() => navigate("/")} />
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
        <div style={{
          ...stagger(0),
          display: "flex", alignItems: "center", gap: 16,
          marginBottom: 24,
        }}>
          <IconButton icon={ArrowLeft} onClick={() => navigate("/")} />
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

        {/* Filter Tabs */}
        <div style={{ ...stagger(1), marginBottom: 20 }}>
          <PillTabs
            tabs={FILTER_TABS.map((tab) => ({ key: tab, label: tab }))}
            active={activeFilter}
            onChange={setActiveFilter}
            scrollable
          />
        </div>

        {/* Template Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredTemplates.map((template, idx) => {
            const catMeta = CATEGORY_META[template.category] || {
              color: "#8B5CF6", label: template.category, icon: BookOpen,
            };
            const diffConfig = DIFFICULTY_CONFIG[template.difficulty] || DIFFICULTY_CONFIG.Medium;
            const CatIcon = catMeta.icon;
            const catTextColor = catColor(template.category, isLight);
            const diffTextColor = adaptColor(diffConfig.color, isLight);

            return (
              <GlassCard
                key={template.id}
                padding={20}
                style={{
                  ...stagger(2 + idx),
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Popular star */}
                {template.popular && (
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

                {/* Title */}
                <h3 style={{
                  fontSize: 17, fontWeight: 700, color: "var(--dp-text)",
                  margin: 0,
                  paddingRight: template.popular ? 90 : 0,
                }}>
                  {template.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: 13, color: "var(--dp-text-tertiary)",
                  margin: "8px 0 14px",
                  lineHeight: 1.5,
                }}>
                  {template.description}
                </p>

                {/* Meta row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  flexWrap: "wrap", marginBottom: 16,
                }}>
                  {/* Category pill */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 12px",
                    borderRadius: 50,
                    background: `${catMeta.color}15`,
                    border: `1px solid ${catMeta.color}30`,
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
                      {template.goalCount} goals
                    </span>
                  </div>

                  {/* Duration */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Clock size={12} color="var(--dp-text-muted)" />
                    <span style={{
                      fontSize: 12, color: "var(--dp-text-tertiary)",
                      }}>
                      {template.duration}
                    </span>
                  </div>

                  {/* Difficulty badge */}
                  <div style={{
                    padding: "3px 10px",
                    borderRadius: 50,
                    background: diffConfig.bg,
                    border: `1px solid ${diffConfig.border}`,
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: diffTextColor,
                      }}>
                      {template.difficulty}
                    </span>
                  </div>
                </div>

                {/* Use Template Button */}
                <GradientButton
                  gradient="primaryDark"
                  icon={Sparkles}
                  fullWidth
                  size="sm"
                  onClick={() => {
                    apiPost(DREAMS.TEMPLATES.USE(template.id)).then(function (data) {
                      showToast("Dream created from template!", "success");
                      navigate("/dream/" + data.id);
                    }).catch(function (err) {
                      showToast(err.userMessage || err.message || "Failed to use template", "error");
                    });
                  }}
                >
                  Use Template
                </GradientButton>
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
      </div>
    </PageLayout>
  );
}
