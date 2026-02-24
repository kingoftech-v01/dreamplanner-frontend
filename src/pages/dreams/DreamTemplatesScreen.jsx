import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Star, Clock, Target, Sparkles,
  Briefcase, Heart, DollarSign, Palette, TrendingUp, Users, BookOpen,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PageLayout from "../../components/shared/PageLayout";
import { apiGet, apiPost } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";

const glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
};

const CATEGORY_META = {
  career: { color: "#8B5CF6", label: "Career", icon: Briefcase },
  health: { color: "#10B981", label: "Health", icon: Heart },
  finance: { color: "#FCD34D", label: "Finance", icon: DollarSign },
  hobbies: { color: "#EC4899", label: "Hobbies", icon: Palette },
  personal: { color: "#6366F1", label: "Growth", icon: TrendingUp },
  relationships: { color: "#14B8A6", label: "Social", icon: Users },
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
    queryFn: function () { return apiGet("/api/dreams/dreams/templates/"); },
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
            <button className="dp-ib" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <div>
              <h1 style={{
                fontSize: 22, fontWeight: 700, color: "var(--dp-text)",
                fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: "-0.5px",
              }}>
                Dream Templates
              </h1>
              <p style={{
                fontSize: 13, color: "var(--dp-text-tertiary)",
                fontFamily: "Inter, sans-serif", margin: 0, marginTop: 2,
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
            <button className="dp-ib" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <div>
              <h1 style={{
                fontSize: 22, fontWeight: 700, color: "var(--dp-text)",
                fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: "-0.5px",
              }}>
                Dream Templates
              </h1>
              <p style={{
                fontSize: 13, color: "var(--dp-text-tertiary)",
                fontFamily: "Inter, sans-serif", margin: 0, marginTop: 2,
              }}>
                Pre-built plans to jumpstart your dreams
              </p>
            </div>
          </div>
          <ErrorState
            message={templatesQuery.error?.message || "Failed to load templates"}
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
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: "var(--dp-text)",
              fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: "-0.5px",
            }}>
              Dream Templates
            </h1>
            <p style={{
              fontSize: 13, color: "var(--dp-text-tertiary)",
              fontFamily: "Inter, sans-serif", margin: 0, marginTop: 2,
            }}>
              Pre-built plans to jumpstart your dreams
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{
          ...stagger(1),
          display: "flex", gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
          marginBottom: 20,
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 50,
                  background: isActive
                    ? "linear-gradient(135deg, #8B5CF6, #7C3AED)"
                    : "var(--dp-surface)",
                  border: isActive
                    ? "1px solid rgba(139,92,246,0.5)"
                    : "1px solid var(--dp-input-border)",
                  cursor: "pointer",
                  color: isActive ? "#fff" : "var(--dp-text-tertiary)",
                  fontSize: 13, fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  whiteSpace: "nowrap",
                  transition: "all 0.25s ease",
                  boxShadow: isActive ? "0 4px 14px rgba(139,92,246,0.3)" : "none",
                  flexShrink: 0,
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Template Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredTemplates.map((template, idx) => {
            const catMeta = CATEGORY_META[template.category] || {
              color: "#8B5CF6", label: template.category, icon: BookOpen,
            };
            const diffConfig = DIFFICULTY_CONFIG[template.difficulty] || DIFFICULTY_CONFIG.Medium;
            const CatIcon = catMeta.icon;
            const catTextColor = isLight && catMeta.color === "#FCD34D" ? "#B45309" : catMeta.color;
            const diffTextColor = isLight && diffConfig.color === "#FCD34D" ? "#B45309" : diffConfig.color;

            return (
              <div
                key={template.id}
                style={{
                  ...stagger(2 + idx),
                  ...glass,
                  padding: "20px",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  cursor: "default",
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
                    <Star size={12} color={isLight ? "#B45309" : "#FCD34D"} fill={isLight ? "#B45309" : "#FCD34D"} />
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: isLight ? "#B45309" : "#FCD34D",
                      fontFamily: "Inter, sans-serif",
                    }}>
                      Popular
                    </span>
                  </div>
                )}

                {/* Title */}
                <h3 style={{
                  fontSize: 17, fontWeight: 700, color: "var(--dp-text)",
                  fontFamily: "Inter, sans-serif", margin: 0,
                  paddingRight: template.popular ? 90 : 0,
                }}>
                  {template.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: 13, color: "var(--dp-text-tertiary)",
                  fontFamily: "Inter, sans-serif", margin: "8px 0 14px",
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
                      fontFamily: "Inter, sans-serif",
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
                      fontFamily: "Inter, sans-serif",
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
                      fontFamily: "Inter, sans-serif",
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
                      fontFamily: "Inter, sans-serif",
                    }}>
                      {template.difficulty}
                    </span>
                  </div>
                </div>

                {/* Use Template Button */}
                <button
                  onClick={() => {
                    apiPost("/api/dreams/dreams/templates/" + template.id + "/use/").then(function (data) {
                      showToast("Dream created from template!", "success");
                      navigate("/dream/" + data.id);
                    }).catch(function (err) {
                      showToast(err.message || "Failed to use template", "error");
                    });
                  }}
                  style={{
                    width: "100%", height: 42, borderRadius: 12,
                    background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.1))",
                    border: "1px solid rgba(139,92,246,0.25)",
                    cursor: "pointer",
                    color: isLight ? "#6D28D9" : "#C4B5FD", fontSize: 13, fontWeight: 600,
                    fontFamily: "Inter, sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(124,58,237,0.15))";
                    e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.1))";
                    e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)";
                  }}
                >
                  <Sparkles size={14} />
                  Use Template
                </button>
              </div>
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
              fontFamily: "Inter, sans-serif", margin: 0,
            }}>
              No templates found
            </p>
            <p style={{
              fontSize: 13, color: "var(--dp-text-muted)",
              fontFamily: "Inter, sans-serif", marginTop: 6,
            }}>
              Try a different category filter
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
