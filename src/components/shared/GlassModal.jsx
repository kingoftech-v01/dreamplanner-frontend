import React, { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { GRADIENT_SHADOWS } from "../../styles/colors";

var FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function GlassModal({
  open,
  onClose,
  variant = "center",
  title,
  children,
  maxWidth = 420,
  style,
}) {
  var modalRef = useRef(null);
  var previousFocusRef = useRef(null);

  // Save focus on open, restore on close
  useEffect(function () {
    if (open) {
      previousFocusRef.current = document.activeElement;
      // Focus first focusable element after render
      setTimeout(function () {
        if (modalRef.current) {
          var first = modalRef.current.querySelector(FOCUSABLE);
          if (first) first.focus();
        }
      }, 50);
    }
    return function () {
      if (!open && previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  // Escape key handler
  useEffect(function () {
    if (!open) return;
    var handler = function (e) {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return function () { window.removeEventListener("keydown", handler); };
  }, [open, onClose]);

  // Focus trap
  var handleKeyDown = useCallback(function (e) {
    if (e.key !== "Tab" || !modalRef.current) return;
    var focusable = modalRef.current.querySelectorAll(FOCUSABLE);
    if (focusable.length === 0) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  if (!open) return null;

  var isBottom = variant === "bottom";
  var titleId = title ? "dp-modal-title-" + (title.replace ? title.replace(/\s+/g, "-").toLowerCase() : "modal") : undefined;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: isBottom ? "flex-end" : "center",
        justifyContent: "center",
        background: "var(--dp-overlay)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={function (e) {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        style={{
          position: "relative",
          width: isBottom ? "100%" : "90%",
          maxWidth: maxWidth,
          maxHeight: isBottom ? "70vh" : "80vh",
          background: "var(--dp-modal-bg)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRadius: isBottom ? "22px 22px 0 0" : 22,
          border: "1px solid var(--dp-glass-border)",
          borderBottom: isBottom ? "none" : undefined,
          boxShadow: GRADIENT_SHADOWS.modal,
          animation: isBottom ? "dpSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)" : "dpFadeScale 0.25s ease-out",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          ...style,
        }}
      >
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid var(--dp-divider)",
              flexShrink: 0,
            }}
          >
            <h2 id={titleId} style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--dp-surface)",
                border: "1px solid var(--dp-input-border)",
                color: "var(--dp-text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
