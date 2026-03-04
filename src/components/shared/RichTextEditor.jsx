import React, { useRef, useCallback, useEffect } from "react";
import { Bold, Italic, Heading, List, Quote } from "lucide-react";

/**
 * Lightweight contentEditable-based rich text editor.
 *
 * NOTE: Content is sanitized server-side via core.sanitizers.sanitize_text
 * before storage. The innerHTML assignment here restores the user's own
 * previously-sanitized content for editing purposes only.
 */

var TOOLBAR_BUTTONS = [
  { command: "bold", icon: Bold, label: "Bold" },
  { command: "italic", icon: Italic, label: "Italic" },
  { command: "formatBlock", arg: "H3", icon: Heading, label: "Heading" },
  { command: "insertUnorderedList", icon: List, label: "Bullet list" },
  { command: "formatBlock", arg: "BLOCKQUOTE", icon: Quote, label: "Quote" },
];

export default function RichTextEditor({ value, onChange, placeholder }) {
  var editorRef = useRef(null);
  var isInternalChange = useRef(false);

  // Sync external value into the editor only when it truly changes from outside
  useEffect(function () {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current) {
      // Only update DOM when the sanitized server content differs
      // from what is currently in the editor (avoids cursor jumps)
      var currentHtml = editorRef.current.innerHTML;
      var newHtml = value || "";
      if (currentHtml !== newHtml) {
        // Content is pre-sanitized by backend sanitize_text before storage
        editorRef.current.innerHTML = newHtml;
      }
    }
  }, [value]);

  var handleInput = useCallback(function () {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    var html = editorRef.current.innerHTML;
    // Treat empty editor content as empty string
    if (html === "<br>" || html === "<div><br></div>") html = "";
    if (onChange) onChange(html);
  }, [onChange]);

  var execCommand = useCallback(function (command, arg) {
    return function (e) {
      e.preventDefault();
      if (arg) {
        document.execCommand(command, false, arg);
      } else {
        document.execCommand(command, false, null);
      }
      // Refocus the editor after toolbar click
      if (editorRef.current) editorRef.current.focus();
      handleInput();
    };
  }, [handleInput]);

  var isEmpty = !value || value === "" || value === "<br>" || value === "<div><br></div>";

  return (
    <div style={{
      borderRadius: 14,
      border: "1px solid var(--dp-input-border)",
      background: "var(--dp-input-bg)",
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        gap: 2,
        padding: "6px 8px",
        borderBottom: "1px solid var(--dp-divider)",
        background: "var(--dp-surface)",
      }}>
        {TOOLBAR_BUTTONS.map(function (btn) {
          return (
            <button
              key={btn.command + (btn.arg || "")}
              onMouseDown={execCommand(btn.command, btn.arg)}
              aria-label={btn.label}
              title={btn.label}
              type="button"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                color: "var(--dp-text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
              className="dp-gh"
            >
              <btn.icon size={16} strokeWidth={2} />
            </button>
          );
        })}
      </div>

      {/* Editable area */}
      <div style={{ position: "relative" }}>
        {isEmpty && placeholder && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 12,
              left: 14,
              color: "var(--dp-text-muted)",
              fontSize: 14,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          role="textbox"
          aria-multiline="true"
          aria-label="Rich text editor"
          suppressContentEditableWarning
          style={{
            minHeight: 120,
            maxHeight: 400,
            overflowY: "auto",
            padding: "12px 14px",
            outline: "none",
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--dp-text)",
            fontFamily: "inherit",
            wordBreak: "break-word",
          }}
        />
      </div>
    </div>
  );
}
