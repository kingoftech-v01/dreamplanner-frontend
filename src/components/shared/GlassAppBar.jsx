import React from "react";

export default function GlassAppBar({ left, title, right, subtitle, style, className }) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        zIndex: 100,
        height: 64,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 10,
        background: "var(--dp-header-bg)",
        backdropFilter: "blur(40px) saturate(1.4)",
        WebkitBackdropFilter: "blur(40px) saturate(1.4)",
        borderBottom: "1px solid var(--dp-header-border)",
        ...style,
      }}
    >
      {left && <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>{left}</div>}
      {title ? (
        <div style={{ flex: 1, minWidth: 0 }}>
          {typeof title === "string" ? (
            <>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--dp-text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: 12, color: "var(--dp-text-tertiary)", marginTop: 1 }}>
                  {subtitle}
                </div>
              )}
            </>
          ) : (
            title
          )}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}
      {right && <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>{right}</div>}
    </div>
  );
}
