import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Clock, Target, Edit3, Trash2, X, Check, Palette
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { SkeletonCard } from "../../components/shared/Skeleton";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../services/api";

var BLOCK_COLORS = [
  { value: "#8B5CF6", label: "Purple" },
  { value: "#3B82F6", label: "Blue" },
  { value: "#14B8A6", label: "Teal" },
  { value: "#10B981", label: "Green" },
  { value: "#FCD34D", label: "Yellow" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EC4899", label: "Pink" },
  { value: "#EF4444", label: "Red" },
];

var glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

export default function TimeBlocksScreen() {
  var navigate = useNavigate();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();

  var [mounted, setMounted] = useState(false);
  var [showModal, setShowModal] = useState(false);
  var [editingBlock, setEditingBlock] = useState(null);
  var [confirmDelete, setConfirmDelete] = useState(null);

  // Form state
  var [formTitle, setFormTitle] = useState("");
  var [formStartTime, setFormStartTime] = useState("09:00");
  var [formEndTime, setFormEndTime] = useState("10:00");
  var [formDreamId, setFormDreamId] = useState("");
  var [formColor, setFormColor] = useState("#8B5CF6");

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  // ── Time blocks query ──
  var blocksQuery = useQuery({
    queryKey: ["time-blocks"],
    queryFn: function () { return apiGet("/api/calendar/timeblocks/"); },
  });
  var timeBlocks = (blocksQuery.data && blocksQuery.data.results) || blocksQuery.data || [];

  // ── Dreams query (for association dropdown) ──
  var dreamsQuery = useQuery({
    queryKey: ["dreams-list"],
    queryFn: function () { return apiGet("/api/dreams/"); },
  });
  var dreams = (dreamsQuery.data && dreamsQuery.data.results) || dreamsQuery.data || [];

  // ── Create mutation ──
  var createMut = useMutation({
    mutationFn: function (payload) {
      return apiPost("/api/calendar/timeblocks/", payload);
    },
    onSuccess: function () {
      showToast("Time block created!", "success");
      queryClient.invalidateQueries({ queryKey: ["time-blocks"] });
      resetFormAndClose();
    },
    onError: function (err) {
      showToast(err.message || "Failed to create time block", "error");
    },
  });

  // ── Update mutation ──
  var updateMut = useMutation({
    mutationFn: function (params) {
      return apiPatch("/api/calendar/timeblocks/" + params.id + "/", params.data);
    },
    onSuccess: function () {
      showToast("Time block updated!", "success");
      queryClient.invalidateQueries({ queryKey: ["time-blocks"] });
      resetFormAndClose();
    },
    onError: function (err) {
      showToast(err.message || "Failed to update time block", "error");
    },
  });

  // ── Delete mutation ──
  var deleteMut = useMutation({
    mutationFn: function (id) {
      return apiDelete("/api/calendar/timeblocks/" + id + "/");
    },
    onSuccess: function () {
      showToast("Time block deleted", "info");
      queryClient.invalidateQueries({ queryKey: ["time-blocks"] });
      setConfirmDelete(null);
    },
    onError: function (err) {
      showToast(err.message || "Failed to delete time block", "error");
    },
  });

  var resetFormAndClose = function () {
    setFormTitle("");
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormDreamId("");
    setFormColor("#8B5CF6");
    setEditingBlock(null);
    setShowModal(false);
  };

  var openAddModal = function () {
    setEditingBlock(null);
    setFormTitle("");
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormDreamId("");
    setFormColor("#8B5CF6");
    setShowModal(true);
  };

  var openEditModal = function (block) {
    setEditingBlock(block);
    setFormTitle(block.title || block.label || "");
    setFormStartTime(block.startTime || "09:00");
    setFormEndTime(block.endTime || "10:00");
    setFormDreamId(block.dreamId || block.dream || "");
    setFormColor(block.color || "#8B5CF6");
    setShowModal(true);
  };

  var handleSubmit = function () {
    if (!formTitle.trim()) {
      showToast("Please enter a title", "error");
      return;
    }
    var payload = {
      title: formTitle.trim(),
      startTime: formStartTime,
      endTime: formEndTime,
      color: formColor,
    };
    if (formDreamId) payload.dreamId = formDreamId;

    if (editingBlock) {
      updateMut.mutate({ id: editingBlock.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  var handleDelete = function (id) {
    deleteMut.mutate(id);
  };

  // Format time for display
  function formatTimeDisplay(time) {
    if (!time) return "";
    var parts = time.split(":");
    var h = parseInt(parts[0], 10);
    var m = parts[1] || "00";
    var ampm = h >= 12 ? "PM" : "AM";
    var hour12 = h % 12 || 12;
    return hour12 + ":" + m + " " + ampm;
  }

  return (
    <PageLayout>
      <style>{"\n        @keyframes modalFadeIn {\n          from { opacity: 0; transform: scale(0.9); }\n          to { opacity: 1; transform: scale(1); }\n        }\n        @keyframes overlayFadeIn {\n          from { opacity: 0; }\n          to { opacity: 1; }\n        }\n      "}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 16, paddingBottom: 16,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="dp-ib" onClick={function () { navigate(-1); }}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
            fontFamily: "Inter, sans-serif", margin: 0,
          }}>
            Time Blocks
          </h1>
        </div>
        <button
          onClick={openAddModal}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 40, height: 40, borderRadius: 14,
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            border: "none", cursor: "pointer",
            transition: "all 0.25s ease",
          }}
        >
          <Plus size={20} color="#fff" />
        </button>
      </div>

      {/* Time Blocks List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 32 }}>
        {blocksQuery.isLoading && [1, 2, 3, 4].map(function (i) {
          return <SkeletonCard key={i} height={90} style={{ borderRadius: 16 }} />;
        })}

        {!blocksQuery.isLoading && timeBlocks.map(function (block, index) {
          var blockColor = block.color || "#8B5CF6";
          var dreamTitle = block.dreamTitle || block.dream || "";
          if (typeof dreamTitle === "object" && dreamTitle.title) dreamTitle = dreamTitle.title;

          return (
            <div
              key={block.id}
              style={{
                ...glassStyle, borderRadius: 16, padding: 0,
                overflow: "hidden",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(15px)",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transitionDelay: (0.1 + index * 0.05) + "s",
              }}
            >
              <div style={{ display: "flex" }}>
                {/* Color bar */}
                <div style={{
                  width: 5, flexShrink: 0,
                  background: "linear-gradient(180deg, " + blockColor + ", " + blockColor + "88)",
                }} />

                {/* Content */}
                <div style={{ flex: 1, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 600, color: "var(--dp-text)",
                        fontFamily: "Inter, sans-serif", marginBottom: 6,
                      }}>
                        {block.title || block.label}
                      </div>

                      {/* Time range */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
                      }}>
                        <Clock size={13} color={blockColor} />
                        <span style={{
                          fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                          fontFamily: "Inter, sans-serif",
                        }}>
                          {formatTimeDisplay(block.startTime)} - {formatTimeDisplay(block.endTime)}
                        </span>
                      </div>

                      {/* Associated dream */}
                      {dreamTitle && (
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 8px", borderRadius: 6,
                          background: blockColor + "15",
                          border: "1px solid " + blockColor + "25",
                        }}>
                          <Target size={10} color={blockColor} />
                          <span style={{
                            fontSize: 11, fontWeight: 500, color: blockColor,
                            fontFamily: "Inter, sans-serif",
                          }}>
                            {dreamTitle}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                      <button
                        onClick={function () { openEditModal(block); }}
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: "var(--dp-surface)", border: "1px solid var(--dp-input-border)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", transition: "all 0.2s ease",
                        }}
                      >
                        <Edit3 size={13} color="var(--dp-text-tertiary)" />
                      </button>
                      <button
                        onClick={function () { setConfirmDelete(block.id); }}
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", transition: "all 0.2s ease",
                        }}
                      >
                        <Trash2 size={13} color="rgba(239,68,68,0.7)" />
                      </button>
                    </div>
                  </div>

                  {/* Delete confirmation inline */}
                  {confirmDelete === block.id && (
                    <div style={{
                      marginTop: 10, padding: "10px 12px", borderRadius: 10,
                      background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 500, color: "rgba(239,68,68,0.8)",
                        fontFamily: "Inter, sans-serif",
                      }}>
                        Delete this time block?
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={function () { setConfirmDelete(null); }}
                          style={{
                            padding: "5px 10px", borderRadius: 8,
                            background: "transparent", border: "1px solid var(--dp-input-border)",
                            color: "var(--dp-text-secondary)", fontSize: 11, fontWeight: 600,
                            fontFamily: "Inter, sans-serif", cursor: "pointer",
                          }}
                        >
                          No
                        </button>
                        <button
                          onClick={function () { handleDelete(block.id); }}
                          disabled={deleteMut.isPending}
                          style={{
                            padding: "5px 10px", borderRadius: 8,
                            background: "rgba(239,68,68,0.8)", border: "none",
                            color: "#fff", fontSize: 11, fontWeight: 600,
                            fontFamily: "Inter, sans-serif", cursor: "pointer",
                          }}
                        >
                          {deleteMut.isPending ? "..." : "Yes"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {!blocksQuery.isLoading && timeBlocks.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease 0.3s",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: "var(--dp-glass-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Clock size={32} color="var(--dp-text-muted)" />
            </div>
            <div style={{
              fontSize: 16, fontWeight: 600, color: "var(--dp-text-tertiary)",
              fontFamily: "Inter, sans-serif", marginBottom: 6,
            }}>
              No time blocks yet
            </div>
            <div style={{
              fontSize: 13, color: "var(--dp-text-muted)",
              fontFamily: "Inter, sans-serif", marginBottom: 20,
            }}>
              Create time blocks to organize your day and stay on track with your dreams
            </div>
            <button
              onClick={openAddModal}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "12px 24px", borderRadius: 14,
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                border: "none",
                color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "Inter, sans-serif",
                cursor: "pointer", transition: "all 0.25s ease",
              }}
            >
              <Plus size={16} />
              Add Time Block
            </button>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div
          onClick={function () { resetFormAndClose(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, animation: "overlayFadeIn 0.25s ease",
          }}
        >
          <div
            onClick={function (e) { e.stopPropagation(); }}
            style={{
              ...glassStyle,
              background: "var(--dp-modal-bg)",
              padding: 24, width: "100%", maxWidth: 380,
              animation: "modalFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Modal header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 20,
            }}>
              <h2 style={{
                fontSize: 18, fontWeight: 700, color: "var(--dp-text)",
                fontFamily: "Inter, sans-serif", margin: 0,
              }}>
                {editingBlock ? "Edit Time Block" : "New Time Block"}
              </h2>
              <button
                onClick={function () { resetFormAndClose(); }}
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "var(--dp-surface-hover)", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} color="var(--dp-text-tertiary)" />
              </button>
            </div>

            {/* Title input */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: "block", fontSize: 12, fontWeight: 600,
                color: "var(--dp-text-secondary)", fontFamily: "Inter, sans-serif",
                marginBottom: 6,
              }}>Title</label>
              <input
                type="text"
                placeholder="e.g. Morning focus time"
                value={formTitle}
                onChange={function (e) { setFormTitle(e.target.value); }}
                autoFocus
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 12,
                  background: "var(--dp-surface)", border: "1px solid var(--dp-input-border)",
                  color: "var(--dp-text)", fontSize: 14, fontFamily: "Inter, sans-serif",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Time inputs */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: "block", fontSize: 12, fontWeight: 600,
                  color: "var(--dp-text-secondary)", fontFamily: "Inter, sans-serif",
                  marginBottom: 6,
                }}>Start Time</label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={function (e) { setFormStartTime(e.target.value); }}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 12,
                    background: "var(--dp-surface)", border: "1px solid var(--dp-input-border)",
                    color: "var(--dp-text)", fontSize: 14, fontFamily: "Inter, sans-serif",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: "block", fontSize: 12, fontWeight: 600,
                  color: "var(--dp-text-secondary)", fontFamily: "Inter, sans-serif",
                  marginBottom: 6,
                }}>End Time</label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={function (e) { setFormEndTime(e.target.value); }}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 12,
                    background: "var(--dp-surface)", border: "1px solid var(--dp-input-border)",
                    color: "var(--dp-text)", fontSize: 14, fontFamily: "Inter, sans-serif",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Dream selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: "block", fontSize: 12, fontWeight: 600,
                color: "var(--dp-text-secondary)", fontFamily: "Inter, sans-serif",
                marginBottom: 6,
              }}>Associated Dream (Optional)</label>
              <select
                value={formDreamId}
                onChange={function (e) { setFormDreamId(e.target.value); }}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 12,
                  background: "var(--dp-surface)", border: "1px solid var(--dp-input-border)",
                  color: "var(--dp-text)", fontSize: 14, fontFamily: "Inter, sans-serif",
                  outline: "none", boxSizing: "border-box",
                  appearance: "none", cursor: "pointer",
                }}
              >
                <option value="">None</option>
                {dreams.map(function (dream) {
                  return (
                    <option key={dream.id} value={dream.id}>
                      {dream.title || dream.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 600,
                color: "var(--dp-text-secondary)", fontFamily: "Inter, sans-serif",
                marginBottom: 8,
              }}>
                <Palette size={13} />
                Color
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {BLOCK_COLORS.map(function (c) {
                  var isSelected = formColor === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={function () { setFormColor(c.value); }}
                      style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: c.value, border: "none",
                        cursor: "pointer", transition: "all 0.2s ease",
                        outline: isSelected ? "2px solid " + c.value : "none",
                        outlineOffset: 2,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {isSelected && <Check size={16} color="#fff" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={createMut.isPending || updateMut.isPending}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "14px 0", width: "100%", borderRadius: 14,
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                border: "none",
                color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "Inter, sans-serif",
                cursor: "pointer", transition: "all 0.25s ease",
              }}
            >
              <Check size={18} />
              {createMut.isPending || updateMut.isPending
                ? "Saving..."
                : editingBlock ? "Update Block" : "Create Block"}
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
