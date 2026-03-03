import React from "react";
import { BRAND, GRADIENT_SHADOWS } from "../../styles/colors";

var SIZES = { sm: 44, md: 44, lg: 48 };
var ICON_SIZES = { sm: 16, md: 20, lg: 22 };
var RADII = { sm: 12, md: 12, lg: 14 };

export default function IconButton({
  icon: Icon,
  onClick,
  size = "md",
  variant = "glass",
  badge,
  color,
  label,
  style,
  disabled,
  children,
}) {
  var s = SIZES[size] || SIZES.md;
  var iconSize = ICON_SIZES[size] || ICON_SIZES.md;
  var r = RADII[size] || RADII.md;

  var base = {
    width: s,
    height: s,
    borderRadius: r,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.2s ease",
    border: "none",
    position: "relative",
    flexShrink: 0,
    opacity: disabled ? 0.4 : 1,
    pointerEvents: disabled ? "none" : "auto",
    fontFamily: "inherit",
    padding: 0,
  };

  if (variant === "glass") {
    base.background = "var(--dp-surface)";
    base.border = "1px solid var(--dp-input-border)";
    base.color = color || "var(--dp-text-secondary)";
  } else if (variant === "ghost") {
    base.background = "transparent";
    base.border = "1px solid transparent";
    base.color = color || "var(--dp-text-secondary)";
  } else if (variant === "accent") {
    base.background = "var(--dp-accent-soft)";
    base.border = "1px solid var(--dp-accent-border)";
    base.color = color || "var(--dp-accent)";
  }

  return (
    <button
      style={{ ...base, ...style }}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
    >
      {Icon && <Icon size={iconSize} strokeWidth={2} />}
      {children}
      {badge != null && badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: "50%",
            background: BRAND.redSolid,
            color: BRAND.white,
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: GRADIENT_SHADOWS.badge,
            border: "2px solid var(--dp-body-bg)",
            padding: "0 4px",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
