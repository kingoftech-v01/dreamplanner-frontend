import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Copy, Check, Trash2, Play, Save,
  Clock, Briefcase, User, Dumbbell, Lock, X, Sparkles
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { apiGet, apiPost, apiDelete } from "../../services/api";
import { CALENDAR } from "../../services/endpoints";
import { sanitizeText } from "../../utils/sanitize";
import IconButton from "../../components/shared/IconButton";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GradientButton from "../../components/shared/GradientButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";
import { BRAND } from "../../styles/colors";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Time Block Templates
 *
 * Save and reuse weekly time block patterns.
 * ═══════════════════════════════════════════════════════════════════ */

var DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

var BLOCK_TYPE_META = {
  work:     { label: "Work",     color: "#3B82F6", icon: Briefcase },
  personal: { label: "Personal", color: "#8B5CF6", icon: User },
  family:   { label: "Family",   color: "#EC4899", icon: User },
  exercise: { label: "Exercise", color: "#10B981", icon: Dumbbell },
  blocked:  { label: "Blocked",  color: "#6B7280", icon: Lock },
};

function formatTime12(timeStr) {
  if (!timeStr) return "";
  var parts = timeStr.split(":");
  var h = parseInt(parts[0], 10);
  var m = parts[1] || "00";
  var ampm = h >= 12 ? "PM" : "AM";
  var hour12 = h % 12 || 12;
  return hour12 + ":" + m + " " + ampm;
}

export default function TimeBlockTemplates() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();

  var [mounted, setMounted] = useState(false);
  var [showSaveModal, setShowSaveModal] = useState(false);
  var [showApplyConfirm, setShowApplyConfirm] = useState(null);
  var [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  var [saveName, setSaveName] = useState("");
  var [saveDescription, setSaveDescription] = useState("");

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  // ── Templates query ──
  var templatesQuery = useQuery({
    queryKey: ["timeblock-templates"],
    queryFn: function () { return apiGet(CALENDAR.TEMPLATES); },
  });
  var allTemplates = (templatesQuery.data && templatesQuery.data.results) || templatesQuery.data || [];

  // Split into presets and user templates
  var presets = [];
  var userTemplates = [];
  for (var i = 0; i < allTemplates.length; i++) {
    if (allTemplates[i].is_preset) {
      presets.push(allTemplates[i]);
    } else {
      userTemplates.push(allTemplates[i]);
    }
  }

  // ── Apply mutation ──
  var applyMut = useMutation({
    mutationFn: function (templateId) {
      return apiPost(CALENDAR.TEMPLATE_APPLY(templateId));
    },
    onSuccess: function (data) {
      showToast(data.detail || "Template applied!", "success");
      queryClient.invalidateQueries({ queryKey: ["time-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["timeblock-templates"] });
      setShowApplyConfirm(null);
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to apply template", "error");
      setShowApplyConfirm(null);
    },
  });

  // ── Save current mutation ──
  var saveMut = useMutation({
    mutationFn: function (payload) {
      return apiPost(CALENDAR.TEMPLATE_SAVE_CURRENT, payload);
    },
    onSuccess: function () {
      showToast("Template saved!", "success");
      queryClient.invalidateQueries({ queryKey: ["timeblock-templates"] });
      closeSaveModal();
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to save template", "error");
    },
  });

  // ── Delete mutation ──
  var deleteMut = useMutation({
    mutationFn: function (id) {
      return apiDelete(CALENDAR.TEMPLATE_DETAIL(id));
    },
    onSuccess: function () {
      showToast("Template deleted", "info");
      queryClient.invalidateQueries({ queryKey: ["timeblock-templates"] });
      setShowDeleteConfirm(null);
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to delete template", "error");
      setShowDeleteConfirm(null);
    },
  });

  var closeSaveModal = function () {
    setShowSaveModal(false);
    setSaveName("");
    setSaveDescription("");
  };

  var handleSave = function () {
    var cleanName = sanitizeText(saveName, 100);
    if (!cleanName) {
      showToast("Please enter a name for the template", "error");
      return;
    }
    saveMut.mutate({
      name: cleanName,
      description: sanitizeText(saveDescription, 500) || "",
    });
  };

  // ── Block summary renderer ──
  function renderBlockSummary(blocks) {
    if (!blocks || !blocks.length) return null;

    // Group by day
    var byDay = {};
    for (var b = 0; b < blocks.length; b++) {
      var dow = blocks[b].day_of_week;
      if (!byDay[dow]) byDay[dow] = [];
      byDay[dow].push(blocks[b]);
    }

    // Count by type
    var typeCounts = {};
    for (var t = 0; t < blocks.length; t++) {
      var bt = blocks[t].block_type;
      typeCounts[bt] = (typeCounts[bt] || 0) + 1;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {/* Type badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {Object.keys(typeCounts).map(function (type) {
            var meta = BLOCK_TYPE_META[type] || BLOCK_TYPE_META.blocked;
            var Icon = meta.icon;
            return (
              <span key={type} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 6,
                background: meta.color + "15",
                border: "1px solid " + meta.color + "25",
                fontSize: 11, fontWeight: 600, color: meta.color,
              }}>
                <Icon size={10} />
                {meta.label} x{typeCounts[type]}
              </span>
            );
          })}
        </div>

        {/* Day indicators */}
        <div style={{ display: "flex", gap: 4 }}>
          {DAY_NAMES.map(function (name, idx) {
            var hasBlocks = !!byDay[idx];
            return (
              <div key={idx} style={{
                width: 28, height: 28, borderRadius: 7,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: hasBlocks ? BRAND.purple + "20" : "var(--dp-surface)",
                border: "1px solid " + (hasBlocks ? BRAND.purple + "40" : "var(--dp-input-border)"),
                fontSize: 10, fontWeight: 600,
                color: hasBlocks ? BRAND.purple : "var(--dp-text-muted)",
                transition: "all 0.2s ease",
              }}>
                {name.charAt(0)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Template Card ──
  function TemplateCard(props) {
    var template = props.template;
    var index = props.index;
    var isPreset = template.is_preset;
    var blockCount = template.block_count || (template.blocks ? template.blocks.length : 0);

    return (
      <GlassCard
        style={{
          borderRadius: 16, padding: 0, overflow: "hidden",
          boxShadow: isPreset
            ? "inset 0 1px 0 rgba(139,92,246,0.1), 0 0 0 1px rgba(139,92,246,0.08)"
            : "inset 0 1px 0 rgba(255,255,255,0.06)",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(15px)",
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          transitionDelay: (0.1 + index * 0.05) + "s",
        }}
      >
        <div style={{ padding: 16 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {isPreset && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    padding: "2px 7px", borderRadius: 6,
                    background: "linear-gradient(135deg, " + BRAND.purple + "20, " + BRAND.teal + "20)",
                    border: "1px solid " + BRAND.purple + "30",
                    fontSize: 10, fontWeight: 700, color: BRAND.purple,
                    letterSpacing: "0.03em",
                  }}>
                    <Sparkles size={9} />
                    PRESET
                  </span>
                )}
                <span style={{
                  fontSize: 15, fontWeight: 600, color: "var(--dp-text)",
                }}>
                  {template.name}
                </span>
              </div>
              {template.description && (
                <div style={{
                  fontSize: 12, color: "var(--dp-text-secondary)",
                  lineHeight: 1.4, marginBottom: 2,
                }}>
                  {template.description}
                </div>
              )}
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginTop: 4,
              }}>
                <Clock size={12} color="var(--dp-text-muted)" />
                <span style={{
                  fontSize: 12, fontWeight: 500, color: "var(--dp-text-muted)",
                }}>
                  {blockCount} block{blockCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
              <button
                aria-label="Apply template"
                className="dp-gh"
                onClick={function () { setShowApplyConfirm(template); }}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: BRAND.purple + "12",
                  border: "1px solid " + BRAND.purple + "25",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.2s ease", fontFamily: "inherit",
                }}
              >
                <Play size={14} color={BRAND.purple} />
              </button>
              {!isPreset && (
                <button
                  aria-label="Delete template"
                  className="dp-gh"
                  onClick={function () { setShowDeleteConfirm(template); }}
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.2s ease", fontFamily: "inherit",
                  }}
                >
                  <Trash2 size={13} color="rgba(239,68,68,0.7)" />
                </button>
              )}
            </div>
          </div>

          {/* Block summary */}
          {renderBlockSummary(template.blocks)}
        </div>
      </GlassCard>
    );
  }

  // ── Error state ──
  if (templatesQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          message={(templatesQuery.error && (templatesQuery.error.userMessage || templatesQuery.error.message)) || "Failed to load templates"}
          onRetry={function () { templatesQuery.refetch(); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate("/calendar"); }} />}
        title="Time Block Templates"
        right={
          <GradientButton
            gradient="primary"
            onClick={function () { setShowSaveModal(true); }}
            icon={Save}
            size="sm"
            style={{ borderRadius: 14 }}
          />
        }
      />
    }>
      <style>{"\n        @keyframes templateFadeIn {\n          from { opacity: 0; transform: translateY(12px); }\n          to { opacity: 1; transform: translateY(0); }\n        }\n        @keyframes shimmer {\n          0% { background-position: -200% 0; }\n          100% { background-position: 200% 0; }\n        }\n      "}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 32 }}>

        {/* Loading state */}
        {templatesQuery.isLoading && [1, 2, 3].map(function (i) {
          return <SkeletonCard key={i} height={120} style={{ borderRadius: 16 }} />;
        })}

        {/* ── Presets Section ── */}
        {!templatesQuery.isLoading && presets.length > 0 && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 2, marginTop: 4,
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.05s",
            }}>
              <Sparkles size={14} color={BRAND.purple} />
              <span style={{
                fontSize: 13, fontWeight: 700, color: "var(--dp-text-secondary)",
                letterSpacing: "0.03em", textTransform: "uppercase",
              }}>
                Preset Templates
              </span>
            </div>
            {presets.map(function (template, idx) {
              return <TemplateCard key={template.id} template={template} index={idx} />;
            })}
          </>
        )}

        {/* ── User Templates Section ── */}
        {!templatesQuery.isLoading && (
          <>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 2, marginTop: presets.length > 0 ? 12 : 4,
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.4s ease 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Copy size={14} color="var(--dp-accent)" />
                <span style={{
                  fontSize: 13, fontWeight: 700, color: "var(--dp-text-secondary)",
                  letterSpacing: "0.03em", textTransform: "uppercase",
                }}>
                  My Templates
                </span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 500, color: "var(--dp-text-muted)",
              }}>
                {userTemplates.length} saved
              </span>
            </div>

            {userTemplates.length > 0 ? (
              userTemplates.map(function (template, idx) {
                return (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    index={presets.length + idx}
                  />
                );
              })
            ) : (
              <div style={{
                textAlign: "center", padding: "40px 20px",
                opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease 0.3s",
              }}>
                <GlassCard padding={0} style={{
                  width: 64, height: 64, borderRadius: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px",
                }}>
                  <Copy size={28} color="var(--dp-text-muted)" />
                </GlassCard>
                <div style={{
                  fontSize: 15, fontWeight: 600, color: "var(--dp-text-tertiary)",
                  marginBottom: 6,
                }}>
                  No saved templates yet
                </div>
                <div style={{
                  fontSize: 12, color: "var(--dp-text-muted)",
                  marginBottom: 18, lineHeight: 1.5,
                }}>
                  Save your current time blocks as a template to quickly reapply them later
                </div>
                <GradientButton
                  gradient="primary"
                  onClick={function () { setShowSaveModal(true); }}
                  icon={Save}
                >
                  Save Current Schedule
                </GradientButton>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Apply Confirmation Modal ── */}
      <GlassModal
        open={!!showApplyConfirm}
        onClose={function () { setShowApplyConfirm(null); }}
        variant="center"
        maxWidth={360}
        title="Apply Template"
      >
        <div style={{ padding: 24 }}>
          <div style={{
            fontSize: 14, color: "var(--dp-text-secondary)",
            lineHeight: 1.5, marginBottom: 8,
          }}>
            Are you sure you want to apply{" "}
            <strong style={{ color: "var(--dp-text)" }}>
              {showApplyConfirm ? showApplyConfirm.name : ""}
            </strong>?
          </div>
          <div style={{
            padding: "10px 12px", borderRadius: 10,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            fontSize: 12, color: "rgba(245,158,11,0.9)",
            lineHeight: 1.5, marginBottom: 20,
          }}>
            This will replace all your current time blocks with the template pattern.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={function () { setShowApplyConfirm(null); }}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 12,
                background: "transparent", border: "1px solid var(--dp-input-border)",
                color: "var(--dp-text-secondary)", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease",
              }}
            >
              Cancel
            </button>
            <GradientButton
              gradient="primary"
              onClick={function () {
                if (showApplyConfirm) applyMut.mutate(showApplyConfirm.id);
              }}
              disabled={applyMut.isPending}
              loading={applyMut.isPending}
              icon={Check}
              fullWidth
              size="lg"
              style={{ flex: 1 }}
            >
              {applyMut.isPending ? "Applying..." : "Apply"}
            </GradientButton>
          </div>
        </div>
      </GlassModal>

      {/* ── Delete Confirmation Modal ── */}
      <GlassModal
        open={!!showDeleteConfirm}
        onClose={function () { setShowDeleteConfirm(null); }}
        variant="center"
        maxWidth={340}
        title="Delete Template"
      >
        <div style={{ padding: 24 }}>
          <div style={{
            fontSize: 14, color: "var(--dp-text-secondary)",
            lineHeight: 1.5, marginBottom: 20,
          }}>
            Delete{" "}
            <strong style={{ color: "var(--dp-text)" }}>
              {showDeleteConfirm ? showDeleteConfirm.name : ""}
            </strong>? This cannot be undone.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={function () { setShowDeleteConfirm(null); }}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 12,
                background: "transparent", border: "1px solid var(--dp-input-border)",
                color: "var(--dp-text-secondary)", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease",
              }}
            >
              Cancel
            </button>
            <button
              onClick={function () {
                if (showDeleteConfirm) deleteMut.mutate(showDeleteConfirm.id);
              }}
              disabled={deleteMut.isPending}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 12,
                background: "rgba(239,68,68,0.85)", border: "none",
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease",
              }}
            >
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </GlassModal>

      {/* ── Save Current Modal ── */}
      <GlassModal
        open={showSaveModal}
        onClose={closeSaveModal}
        variant="center"
        maxWidth={380}
        title="Save Current Schedule"
      >
        <div style={{ padding: 24 }}>
          <div style={{
            fontSize: 13, color: "var(--dp-text-secondary)",
            lineHeight: 1.5, marginBottom: 16,
          }}>
            Save your current active time blocks as a reusable template.
          </div>

          {/* Name input */}
          <div style={{ marginBottom: 14 }}>
            <label style={{
              display: "block", fontSize: 12, fontWeight: 600,
              color: "var(--dp-text-secondary)", marginBottom: 6,
            }}>Template Name</label>
            <GlassInput
              type="text"
              placeholder="e.g. My Work Week"
              value={saveName}
              onChange={function (e) { setSaveName(e.target.value); }}
              autoFocus
            />
          </div>

          {/* Description input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block", fontSize: 12, fontWeight: 600,
              color: "var(--dp-text-secondary)", marginBottom: 6,
            }}>Description (optional)</label>
            <GlassInput
              type="text"
              placeholder="Brief description of this schedule pattern"
              value={saveDescription}
              onChange={function (e) { setSaveDescription(e.target.value); }}
            />
          </div>

          {/* Save button */}
          <GradientButton
            gradient="primary"
            onClick={handleSave}
            disabled={saveMut.isPending}
            loading={saveMut.isPending}
            icon={Save}
            fullWidth
            size="lg"
          >
            {saveMut.isPending ? "Saving..." : "Save Template"}
          </GradientButton>
        </div>
      </GlassModal>
    </PageLayout>
  );
}
