import React from "react";
import { BRAND, GRADIENTS, GRADIENT_SHADOWS } from "../../styles/colors";

var SIZE_MAP = {
  sm: { padding: "8px 16px", fontSize: 13, iconSize: 15 },
  md: { padding: "12px 24px", fontSize: 14, iconSize: 18 },
  lg: { padding: "14px 28px", fontSize: 15, iconSize: 20 },
};

export default function GradientButton({
  children,
  gradient = "primary",
  onClick,
  icon: Icon,
  size = "md",
  fullWidth,
  disabled,
  loading,
  style,
  type,
}) {
  var s = SIZE_MAP[size] || SIZE_MAP.md;
  var bg = GRADIENTS[gradient] || gradient;
  var shadow = GRADIENT_SHADOWS[gradient] || GRADIENT_SHADOWS.fallback;
  var isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: s.padding,
        borderRadius: 14,
        border: "none",
        background: isDisabled ? "var(--dp-surface)" : bg,
        color: BRAND.white,
        fontSize: s.fontSize,
        fontWeight: 600,
        cursor: isDisabled ? "default" : "pointer",
        fontFamily: "inherit",
        boxShadow: isDisabled ? "none" : shadow,
        transition: "all 0.2s",
        opacity: isDisabled ? 0.5 : 1,
        width: fullWidth ? "100%" : undefined,
        ...style,
      }}
    >
      {loading ? (
        <span
          className="dp-spin"
          style={{
            width: s.iconSize,
            height: s.iconSize,
            border: "2px solid var(--dp-text-muted)",
            borderTopColor: BRAND.white,
            borderRadius: "50%",
          }}
        />
      ) : (
        Icon && <Icon size={s.iconSize} strokeWidth={2} />
      )}
      {children}
    </button>
  );
}
