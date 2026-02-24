import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Save, Trash2, X, Briefcase, Heart, DollarSign,
  Palette, TrendingUp, Users, AlertTriangle, Globe, Lock, Loader2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageLayout from "../../components/shared/PageLayout";
import { apiGet, apiPatch, apiDelete } from "../../services/api";
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

export default function DreamEditScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  var queryClient = useQueryClient();
  var { showToast } = useToast();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [initialized, setInitialized] = useState(false);

  var dreamQuery = useQuery({ queryKey: ["dream", id], queryFn: function () { return apiGet("/api/dreams/dreams/" + id + "/"); } });
  var dream = dreamQuery.data || {};

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(null);
  const [timeframe, setTimeframe] = useState("6m");
  const [visibility, setVisibility] = useState("private");

  useEffect(function () {
    if (dreamQuery.data && !initialized) {
      setTitle(dreamQuery.data.title || "");
      setDescription(dreamQuery.data.description || "");
      setCategory(dreamQuery.data.category || null);
      setTimeframe(dreamQuery.data.timeframe || "6m");
      setVisibility(dreamQuery.data.isPublic ? "public" : "private");
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
    setSubmitting(true);
    setServerError("");
    apiPatch("/api/dreams/dreams/" + id + "/", {
      title: title.trim(),
      description: description.trim(),
      category: category,
      timeframe: timeframe,
      isPublic: visibility === "public",
    }).then(function () {
      queryClient.invalidateQueries({ queryKey: ["dream", id] });
      queryClient.invalidateQueries({ queryKey: ["dreams"] });
      navigate(-1);
    }).catch(function (err) {
      setServerError(err.message || "Failed to save changes.");
    }).finally(function () {
      setSubmitting(false);
    });
  };

  const handleDelete = function () {
    setShowDeleteModal(false);
    apiDelete("/api/dreams/dreams/" + id + "/").then(function () {
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
          message={dreamQuery.error?.message || "Could not load dream."}
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
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: "var(--dp-text)",
            fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: "-0.5px",
          }}>
            Edit Dream
          </h1>
        </div>

        {/* Form */}
        <div style={{ flex: 1 }}>
          {/* Title */}
          <div style={{ ...stagger(1), marginBottom: 20 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
              fontFamily: "Inter, sans-serif", display: "block", marginBottom: 8,
            }}>
              Dream Title
            </label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setFocusedField("title")}
              onBlur={() => setFocusedField(null)}
              rows={2}
              style={{
                ...inputStyle,
                fontSize: 17,
                fontWeight: 600,
                lineHeight: 1.4,
                ...(focusedField === "title" ? inputFocusStyle : {}),
              }}
            />
          </div>

          {/* Description */}
          <div style={{ ...stagger(2), marginBottom: 24 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
              fontFamily: "Inter, sans-serif", display: "block", marginBottom: 8,
            }}>
              Description
            </label>
            <textarea
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

          {/* Category */}
          <div style={{ ...stagger(3), marginBottom: 24 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
              fontFamily: "Inter, sans-serif", display: "block", marginBottom: 12,
            }}>
              Category
            </label>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8,
            }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                const Icon = cat.icon;
                const catTextColor = isLight && cat.color === "#FCD34D" ? "#B45309" : cat.color;
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
                      fontFamily: "Inter, sans-serif",
                    }}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visibility */}
          <div style={{ ...stagger(4), marginBottom: 24 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
              fontFamily: "Inter, sans-serif", display: "block", marginBottom: 12,
            }}>
              Dream Visibility
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { id: "private", label: "Private", Icon: Lock },
                { id: "public", label: "Public", Icon: Globe },
              ].map(({ id: vid, label, Icon }) => {
                const sel = visibility === vid;
                const isPublicOption = vid === "public";
                return (
                  <button
                    key={vid}
                    onClick={() => setVisibility(vid)}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "12px 0", borderRadius: 14, cursor: "pointer",
                      fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
                      background: sel
                        ? (isPublicOption ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.1)")
                        : "var(--dp-surface)",
                      border: sel
                        ? (isPublicOption ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(139,92,246,0.3)")
                        : "1px solid var(--dp-input-border)",
                      color: sel
                        ? (isPublicOption ? (isLight ? "#059669" : "#5DE5A8") : (isLight ? "#6D28D9" : "#C4B5FD"))
                        : "var(--dp-text-tertiary)",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                );
              })}
            </div>
            <p style={{
              fontSize: 12, color: "var(--dp-text-muted)",
              fontFamily: "Inter, sans-serif", marginTop: 8, lineHeight: 1.5,
            }}>
              {visibility === "public"
                ? "Public dreams appear on your profile and social feed"
                : "Only you can see this dream"}
            </p>
          </div>

          {/* Timeframe */}
          <div style={{ ...stagger(5), marginBottom: 32 }}>
            <label style={{
              fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
              fontFamily: "Inter, sans-serif", display: "block", marginBottom: 12,
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
          </div>

          {/* Progress info */}
          <div style={{
            ...stagger(6),
            ...glass,
            padding: "16px 20px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
            marginBottom: 32,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 10,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                fontFamily: "Inter, sans-serif",
              }}>
                Current Progress
              </span>
              <span style={{
                fontSize: 14, fontWeight: 700, color: isLight ? "#6D28D9" : "#C4B5FD",
                fontFamily: "Inter, sans-serif",
              }}>
                {dream.progress}%
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
                width: `${dream.progress}%`,
                transition: "width 0.5s ease",
              }} />
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginTop: 8,
            }}>
              <span style={{
                fontSize: 12, color: "var(--dp-text-muted)",
                fontFamily: "Inter, sans-serif",
              }}>
                {dream.completedGoalCount} of {dream.goalCount} goals completed
              </span>
              <span style={{
                fontSize: 12, color: "var(--dp-text-muted)",
                fontFamily: "Inter, sans-serif",
              }}>
                {dream.daysLeft} days left
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={stagger(7)}>
          {serverError && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 12,
              fontSize: 13, color: "#FCA5A5", fontFamily: "Inter, sans-serif", lineHeight: 1.5,
            }}>
              {serverError}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={submitting}
            style={{
              width: "100%", height: 50, borderRadius: 14,
              background: submitting
                ? "linear-gradient(135deg, rgba(139,92,246,0.5), rgba(124,58,237,0.5))"
                : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              border: "none", cursor: submitting ? "not-allowed" : "pointer",
              color: "#fff", fontSize: 15, fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.4)";
            }}
          >
            {submitting ? <Loader2 size={18} className="dp-spin" /> : <Save size={18} />}
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Delete option */}
        <div style={{
          ...stagger(8),
          textAlign: "center", marginTop: 20,
        }}>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "#EF4444", fontSize: 14, fontWeight: 500,
              fontFamily: "Inter, sans-serif", padding: 0,
              opacity: 0.8,
              transition: "opacity 0.25s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.8"}
          >
            <Trash2 size={16} />
            Delete this dream
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setShowDeleteModal(false)}
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Modal */}
          <div style={{
            position: "relative", zIndex: 1,
            width: "100%", maxWidth: 360,
            background: "var(--dp-modal-bg)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            border: "1px solid var(--dp-surface-hover)",
            borderRadius: 24,
            padding: "28px 24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            {/* Close */}
            <button
              onClick={() => setShowDeleteModal(false)}
              style={{
                position: "absolute", top: 14, right: 14,
                width: 32, height: 32, borderRadius: 10,
                background: "var(--dp-glass-bg)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={16} color="var(--dp-text-tertiary)" />
            </button>

            <div style={{
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
                fontFamily: "Inter, sans-serif", margin: 0,
              }}>
                Delete Dream?
              </h2>
              <p style={{
                fontSize: 14, color: "var(--dp-text-tertiary)",
                fontFamily: "Inter, sans-serif", marginTop: 8, lineHeight: 1.6,
              }}>
                This will permanently delete "<strong style={{ color: "var(--dp-text-secondary)" }}>{title}</strong>" and all
                its goals, tasks, and progress. This action cannot be undone.
              </p>

              <div style={{
                display: "flex", gap: 12, width: "100%", marginTop: 24,
              }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    flex: 1, height: 46, borderRadius: 14,
                    background: "var(--dp-glass-bg)",
                    border: "1px solid var(--dp-input-border)",
                    cursor: "pointer",
                    color: "var(--dp-text-secondary)", fontSize: 14, fontWeight: 600,
                    fontFamily: "Inter, sans-serif",
                    transition: "background 0.25s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--dp-surface-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "var(--dp-glass-bg)"}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    flex: 1, height: 46, borderRadius: 14,
                    background: "linear-gradient(135deg, #EF4444, #DC2626)",
                    border: "none", cursor: "pointer",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    fontFamily: "Inter, sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
                    transition: "transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
