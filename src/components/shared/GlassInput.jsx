import React, { useState } from "react";

export default function GlassInput({
  value,
  onChange,
  placeholder,
  icon: Icon,
  type = "text",
  multiline,
  style,
  inputStyle,
  autoFocus,
  maxLength,
  onKeyDown,
  disabled,
  error,
  required,
  label,
  showCount,
  id,
}) {
  var [focused, setFocused] = useState(false);
  var hasError = !!error;
  var inputId = id || (label ? "dp-input-" + label.replace(/\s+/g, "-").toLowerCase() : undefined);

  var container = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    ...style,
  };

  var inputWrapper = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: Icon ? "0 12px" : 0,
    borderRadius: 12,
    background: "var(--dp-input-bg)",
    border: hasError
      ? "1px solid var(--dp-danger-solid)"
      : focused
        ? "1px solid var(--dp-accent)"
        : "1px solid var(--dp-input-border)",
    transition: "all 0.2s",
    boxShadow: focused && !hasError
      ? "0 0 0 3px var(--dp-accent-soft)"
      : hasError
        ? "0 0 0 3px var(--dp-danger-soft)"
        : "none",
  };

  var input = {
    flex: 1,
    width: "100%",
    boxSizing: "border-box",
    padding: Icon ? "12px 0" : "12px",
    background: "none",
    border: "none",
    outline: "none",
    color: "var(--dp-text)",
    fontSize: 14,
    fontFamily: "inherit",
    resize: multiline ? "vertical" : undefined,
    minHeight: multiline ? 80 : undefined,
    ...inputStyle,
  };

  var handleChange = function (e) {
    if (onChange) onChange(e);
  };

  var Tag = multiline ? "textarea" : "input";

  return (
    <div style={container}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--dp-text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {label}
          {required && <span style={{ color: "var(--dp-danger-solid)", fontSize: 14 }} aria-hidden="true">*</span>}
        </label>
      )}
      <div style={inputWrapper}>
        {Icon && <Icon size={18} style={{ color: hasError ? "var(--dp-danger-solid)" : "var(--dp-text-tertiary)", flexShrink: 0 }} aria-hidden="true" />}
        <Tag
          id={inputId}
          type={multiline ? undefined : type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onKeyDown={onKeyDown}
          disabled={disabled}
          onFocus={function () { setFocused(true); }}
          onBlur={function () { setFocused(false); }}
          style={input}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={hasError && inputId ? inputId + "-error" : undefined}
          aria-required={required ? "true" : undefined}
        />
      </div>
      {(hasError || (showCount && maxLength)) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 18 }}>
          {hasError ? (
            <span
              id={inputId ? inputId + "-error" : undefined}
              role="alert"
              style={{ fontSize: 12, color: "var(--dp-danger-solid)", fontWeight: 500 }}
            >
              {error}
            </span>
          ) : <span />}
          {showCount && maxLength && (
            <span style={{
              fontSize: 11,
              color: (value || "").length >= maxLength ? "var(--dp-danger-solid)" : "var(--dp-text-muted)",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}>
              {(value || "").length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
