import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Save, Trash2, X, Briefcase, Heart, DollarSign,
  Palette, TrendingUp, Users, AlertTriangle, Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageLayout from "../../components/shared/PageLayout";
import { apiGet, apiPatch, apiDelete } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { CATEGORIES as CAT_MAP, catSolid, catColor } from "../../styles/colors";
import { sanitizeText, validateRequired } from "../../utils/sanitize";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GradientButton from "../../components/shared/GradientButton";
import GlassModal from "../../components/shared/GlassModal";
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

export default function DreamEditScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  var queryClient = useQueryClient();
  var { showToast } = useToast();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [initialized, setInitialized] = useState(false);

  var dreamQuery = useQuery({ queryKey: ["dream", id], queryFn: function () { return apiGet(DREAMS.DETAIL(id)); } });
  var dream = dreamQuery.data || {};

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(null);
  const [timeframe, setTimeframe] = useState("6m");

  useEffect(function () {
    if (dreamQuery.data && !initialized) {
      setTitle(dreamQuery.data.title || "");
      setDescription(dreamQuery.data.description || "");
      setCategory(dreamQuery.data.category || null);
      setTimeframe(dreamQuery.data.timeframe || "6m");
      setInitialized(true);
    }
  }, [dreamQuery.data, initialized]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const stagger = (index) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.08}s, transform 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.08}s`,
  });

  const handleSave = function () {
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

    apiPatch(DREAMS.DETAIL(id), {
      title: cleanTitle,
      description: cleanDescription,
      category: cleanCategory,
    }).then(function () {
      queryClient.invalidateQueries({ queryKey: ["dream", id] });
      queryClient.invalidateQueries({ queryKey: ["dreams"] });
      navigate("/dream/" + id);
    }).catch(function (err) {
      setServerError(err.userMessage || err.message || "Failed to save changes.");
    }).finally(function () {
      setSubmitting(false);
    });
  };

  const handleDelete = function () {
    setShowDeleteModal(false);
    apiDelete(DREAMS.DETAIL(id)).then(function () {
      queryClient.invalidateQueries({ queryKey: ["dreams"] });
      showToast("Dream deleted", "success");
      navigate("/");
    }).catch(function () {
      showToast("Failed to delete dream", "error");
      navigate("/");
    });
  };

  if (dreamQuery.isLoading) {
    return (
      <PageLayout>
        <div style={{ paddingTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <SkeletonCard height={48} />
          <SkeletonCard height={80} />
          <SkeletonCard height={120} />
          <SkeletonCard height={60} />
          <SkeletonCard height={60} />
          <SkeletonCard height={80} />
        </div>
      </PageLayout>
    );
  }

  if (dreamQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          message={(dreamQuery.error?.userMessage || dreamQuery.error?.message) || "Could not load dream."}
          onRetry={function () { dreamQuery.refetch(); }}
        />
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
          marginBottom: 28,
        }}>
          <IconButton icon={ArrowLeft} onClick={() => navigate("/dream/" + id)} />
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: "var(--dp-text)",
            margin: 0, letterSpacing: "-0.5px",
          }}>
            Edit Dream
          </h1>
        </div>

        {/* Form */}
        <div style={{ flex: 1 }}>
          {/* Title */}
          <div style={{ ...stagger(1), marginBottom: 20 }}>
            <GlassInput
              label="Dream Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              multiline
              inputStyle={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, minHeight: 56, resize: "none" }}
            />
          </div>

          {/* Description */}
          <div style={{ ...stagger(2), marginBottom: 24 }}>
            <GlassInput
              label="Description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              inputStyle={{ lineHeight: 1.6, minHeight: 100, resize: "none" }}
            />
          </div>

          {/* Category */}
          <div style={{ ...stagger(3), marginBottom: 24 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
              display: "block", marginBottom: 12,
            }}>
              Category
            </label>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8,
            }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                const Icon = cat.icon;
                const catTextColor = catColor(cat.id, isLight);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 16px",
                      borderRadius: 50,
                      background: isSelected
                        ? `${cat.color}20`
                        : "var(--dp-surface)",
                      border: isSelected
                        ? `1px solid ${cat.color}55`
                        : "1px solid var(--dp-input-border)",
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <Icon size={14} color={isSelected ? catTextColor : "var(--dp-text-tertiary)"} />
                    <span style={{
                      fontSize: 13, fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? catTextColor : "var(--dp-text-secondary)",
                      }}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeframe */}
          <div style={{ ...stagger(4), marginBottom: 32 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
              display: "block", marginBottom: 12,
            }}>
              Timeframe
            </label>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 10,
            }}>
              {TIMEFRAMES.map((tf) => {
                const isSelected = timeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id)}
                    style={{
                      padding: "10px 22px",
                      borderRadius: 50,
                      background: isSelected
                        ? "linear-gradient(135deg, #8B5CF6, #7C3AED)"
                        : "var(--dp-surface)",
                      border: isSelected
                        ? "1px solid rgba(139,92,246,0.5)"
                        : "1px solid var(--dp-input-border)",
                      cursor: "pointer",
                      color: isSelected ? "#fff" : "var(--dp-text-secondary)",
                      fontSize: 13, fontWeight: 600,
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
          </div>

          {/* Progress info */}
          <GlassCard padding="16px 20px" mb={32} style={stagger(5)}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 10,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                }}>
                Current Progress
              </span>
              <span style={{
                fontSize: 14, fontWeight: 700, color: "var(--dp-accent-text)",
                }}>
                {dream.progressPercentage || 0}%
              </span>
            </div>
            <div style={{
              height: 6, borderRadius: 3,
              background: "var(--dp-glass-border)",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 3,
                background: "linear-gradient(90deg, #8B5CF6, #C4B5FD)",
                width: `${dream.progressPercentage || 0}%`,
                transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginTop: 8,
            }}>
              <span style={{
                fontSize: 12, color: "var(--dp-text-muted)",
                }}>
                {dream.completedGoalCount || 0} of {dream.goalsCount || 0} goals completed
              </span>
              <span style={{
                fontSize: 12, color: "var(--dp-text-muted)",
                }}>
                {dream.daysLeft != null ? dream.daysLeft + " days left" : "No deadline"}
              </span>
            </div>
          </GlassCard>
        </div>

        {/* Save Button */}
        <div style={stagger(6)}>
          {serverError && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 12,
              fontSize: 13, color: "var(--dp-danger)", lineHeight: 1.5,
            }}>
              {serverError}
            </div>
          )}
          <GradientButton
            gradient="primaryDark"
            onClick={handleSave}
            disabled={submitting}
            loading={submitting}
            icon={!submitting ? Save : undefined}
            fullWidth
            style={{ height: 50 }}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </GradientButton>
        </div>

        {/* Delete option */}
        <div style={{
          ...stagger(7),
          textAlign: "center", marginTop: 20,
        }}>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "var(--dp-danger-solid)", fontSize: 14, fontWeight: 500,
              padding: 0,
              opacity: 0.8,
              transition: "opacity 0.25s ease",
              fontFamily: "inherit",
            }}
          >
            <Trash2 size={16} />
            Delete this dream
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <GlassModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} maxWidth={360}>
        <div style={{
          padding: "28px 24px",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
          }}>
            <AlertTriangle size={24} color="#EF4444" />
          </div>

          <h2 style={{
            fontSize: 20, fontWeight: 700, color: "var(--dp-text)",
            margin: 0,
          }}>
            Delete Dream?
          </h2>
          <p style={{
            fontSize: 14, color: "var(--dp-text-tertiary)",
            marginTop: 8, lineHeight: 1.6,
          }}>
            This will permanently delete "<strong style={{ color: "var(--dp-text-secondary)" }}>{title}</strong>" and all
            its goals, tasks, and progress. This action cannot be undone.
          </p>

          <div style={{
            display: "flex", gap: 12, width: "100%", marginTop: 24,
          }}>
            <button
              className="dp-gh"
              onClick={() => setShowDeleteModal(false)}
              style={{
                flex: 1, height: 46, borderRadius: 14,
                background: "var(--dp-glass-bg)",
                border: "1px solid var(--dp-input-border)",
                cursor: "pointer",
                color: "var(--dp-text-secondary)", fontSize: 14, fontWeight: 600,
                transition: "all 0.25s ease",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <GradientButton
              gradient="danger"
              onClick={handleDelete}
              icon={Trash2}
              style={{ flex: 1, height: 46 }}
            >
              Delete
            </GradientButton>
          </div>
        </div>
      </GlassModal>
    </PageLayout>
  );
}
