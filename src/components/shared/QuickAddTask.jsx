import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import { useToast } from "../../context/ToastContext";
import { hapticLight } from "../../utils/haptics";
import { Plus, Send, X, Wand2 } from "lucide-react";
import NaturalTaskCreator from "./NaturalTaskCreator";

/* ═══════════════════════════════════════════════════════════════════
 * QuickAddTask — Floating inline task entry bar
 *
 * Sits above the BottomNav on the home screen. Collapsed state shows
 * a glass-morphism pill; tap to expand into an input with dream pills
 * and a send button.
 * ═══════════════════════════════════════════════════════════════════ */

var QuickAddTask = function QuickAddTask(props) {
  var dreams = props.dreams || [];
  var queryClient = useQueryClient();
  var { showToast } = useToast();

  var [expanded, setExpanded] = useState(false);
  var [title, setTitle] = useState("");
  var [selectedDreamId, setSelectedDreamId] = useState(null);
  var [naturalOpen, setNaturalOpen] = useState(false);
  var inputRef = useRef(null);
  var containerRef = useRef(null);

  // Active dreams for the dream pills
  var activeDreams = dreams.filter(function (d) {
    return d.status === "active";
  });

  // Focus input when expanded
  useEffect(function () {
    if (expanded && inputRef.current) {
      setTimeout(function () {
        inputRef.current.focus();
      }, 120);
    }
  }, [expanded]);

  // Close on outside click
  useEffect(function () {
    if (!expanded) return;
    var handler = function (e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        collapse();
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return function () {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [expanded]);

  // Close on Escape
  useEffect(function () {
    if (!expanded) return;
    var handler = function (e) {
      if (e.key === "Escape") collapse();
    };
    document.addEventListener("keydown", handler);
    return function () { document.removeEventListener("keydown", handler); };
  }, [expanded]);

  var collapse = function () {
    setExpanded(false);
    setTitle("");
    setSelectedDreamId(null);
  };

  var mutation = useMutation({
    mutationFn: function (body) {
      return apiPost(DREAMS.TASKS.QUICK_CREATE, body);
    },
    onSuccess: function () {
      hapticLight();
      showToast("Task added!", "success");
      queryClient.invalidateQueries({ queryKey: ["dreams"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      collapse();
    },
    onError: function (err) {
      var msg = (err && err.error) || (err && err.userMessage) || (err && err.message) || "Failed to add task";
      showToast(msg, "error");
    },
  });

  var handleSubmit = function () {
    var trimmed = title.trim();
    if (!trimmed) return;
    var body = { title: trimmed };
    if (selectedDreamId) body.dream_id = selectedDreamId;
    mutation.mutate(body);
  };

  var handleKeyDown = function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Styles ──
  var wrapStyle = {
    position: "fixed",
    bottom: 90,
    left: 16,
    right: 16,
    zIndex: 80,
    transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  var pillStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px",
    borderRadius: 24,
    background: "var(--dp-glass-bg, rgba(255,255,255,0.08))",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid var(--dp-glass-border, rgba(255,255,255,0.1))",
    boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(139,92,246,0.08)",
    cursor: "pointer",
    transition: "all 0.25s ease",
    userSelect: "none",
  };

  var expandedStyle = {
    borderRadius: 20,
    padding: "14px 16px 12px",
    background: "var(--dp-glass-bg, rgba(255,255,255,0.08))",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid var(--dp-glass-border, rgba(255,255,255,0.1))",
    boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(139,92,246,0.12)",
  };

  var inputStyle = {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--dp-text)",
    fontSize: 15,
    fontWeight: 500,
    fontFamily: "inherit",
    padding: 0,
    lineHeight: 1.4,
  };

  var dreamPillStyle = function (isSelected) {
    return {
      padding: "5px 12px",
      borderRadius: 14,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.2s ease",
      border: isSelected
        ? "1px solid var(--dp-accent)"
        : "1px solid var(--dp-glass-border, rgba(255,255,255,0.1))",
      background: isSelected
        ? "rgba(139,92,246,0.18)"
        : "var(--dp-surface, rgba(255,255,255,0.05))",
      color: isSelected ? "var(--dp-accent)" : "var(--dp-text-secondary)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: 120,
    };
  };

  var sendBtnStyle = {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "none",
    cursor: title.trim() ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: title.trim()
      ? "linear-gradient(135deg, #8B5CF6, #7C3AED)"
      : "var(--dp-surface, rgba(255,255,255,0.05))",
    color: title.trim() ? "#fff" : "var(--dp-text-tertiary)",
    transition: "all 0.2s ease",
    flexShrink: 0,
    fontFamily: "inherit",
    opacity: mutation.isPending ? 0.6 : 1,
    pointerEvents: mutation.isPending ? "none" : "auto",
  };

  // ── Collapsed state ──
  if (!expanded) {
    return (
      <div style={wrapStyle}>
        <div
          className="dp-gh"
          style={pillStyle}
          onClick={function () { setExpanded(true); }}
          role="button"
          aria-label="Quick add a task"
          tabIndex={0}
          onKeyDown={function (e) { if (e.key === "Enter") setExpanded(true); }}
        >
          <Plus size={18} color="var(--dp-accent)" strokeWidth={2.5} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--dp-text-secondary)" }}>
            Quick add a task...
          </span>
          <button
            className="dp-gh"
            onClick={function (e) {
              e.stopPropagation();
              hapticLight();
              setNaturalOpen(true);
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              border: "none",
              background: "rgba(139,92,246,0.12)",
              color: "var(--dp-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.2s ease",
              fontFamily: "inherit",
            }}
            aria-label="AI task creator"
          >
            <Wand2 size={16} strokeWidth={2.2} />
          </button>
        </div>
        <NaturalTaskCreator
          open={naturalOpen}
          onClose={function () { setNaturalOpen(false); }}
        />
      </div>
    );
  }

  // ── Expanded state ──
  return (
    <div style={wrapStyle} ref={containerRef}>
      <div style={expandedStyle}>
        {/* Dream pills */}
        {activeDreams.length > 0 && (
          <div style={{
            display: "flex",
            gap: 6,
            marginBottom: 10,
            overflowX: "auto",
            paddingBottom: 2,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}>
            {activeDreams.map(function (dream) {
              var isSelected = selectedDreamId === dream.id;
              return (
                <div
                  key={dream.id}
                  className="dp-gh"
                  style={dreamPillStyle(isSelected)}
                  onClick={function () {
                    setSelectedDreamId(isSelected ? null : dream.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {dream.title}
                </div>
              );
            })}
          </div>
        )}

        {/* Input row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={function (e) { setTitle(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder="What do you need to do?"
            style={inputStyle}
            maxLength={255}
            disabled={mutation.isPending}
          />
          <button
            className="dp-gh"
            onClick={function (e) {
              e.stopPropagation();
              hapticLight();
              setNaturalOpen(true);
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "none",
              background: "rgba(139,92,246,0.10)",
              color: "var(--dp-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.2s ease",
              fontFamily: "inherit",
            }}
            aria-label="AI task creator"
          >
            <Wand2 size={14} strokeWidth={2.2} />
          </button>
          <button
            className="dp-gh"
            style={sendBtnStyle}
            onClick={handleSubmit}
            disabled={!title.trim() || mutation.isPending}
            aria-label="Add task"
          >
            <Send size={16} strokeWidth={2.5} />
          </button>
          <button
            className="dp-gh"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: "var(--dp-text-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: "inherit",
            }}
            onClick={collapse}
            aria-label="Close quick add"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <NaturalTaskCreator
        open={naturalOpen}
        onClose={function () { setNaturalOpen(false); }}
      />

      {/* Hide scrollbar for dream pills */}
      <style>{`
        .qa-dream-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default QuickAddTask;
