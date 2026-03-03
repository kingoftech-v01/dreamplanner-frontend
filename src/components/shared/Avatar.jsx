import React, { useState } from "react";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Avatar Component
// Supports badge frames (glowing borders) and decorations (emoji overlays)
// from equipped store items.
// ═══════════════════════════════════════════════════════════════

export default function Avatar({
  name = "?",
  size = 40,
  color = "var(--dp-accent)",
  src,
  shape = "rounded",
  online,
  badgeFrame,
  decoration,
  style,
}) {
  var [imgErr, setImgErr] = useState(false);
  var initial = (name || "?").charAt(0).toUpperCase();
  var r = shape === "circle" ? "50%" : Math.round(size * 0.3);

  // Base container styles
  var container = {
    width: size,
    height: size,
    borderRadius: r,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
    background: (typeof color === "string" && color.startsWith("var(")) ? "var(--dp-accent-soft)" : (color || "") + "15",
    fontSize: Math.round(size * 0.38),
    fontWeight: 700,
    color: color,
    overflow: "visible",
  };

  // Badge frame: styled border + glow
  // Guard against non-string color
  var safeColor = (typeof color === "string" && color) ? color : "var(--dp-accent)";

  if (badgeFrame) {
    container.border = (badgeFrame.borderWidth || 2) + "px solid " + (badgeFrame.borderColor || safeColor);
    if (badgeFrame.glow) {
      container.boxShadow = "0 0 " + Math.round(size * 0.3) + "px " + (badgeFrame.glowColor || "rgba(139,92,246,0.4)");
    }
    if (badgeFrame.animated) {
      container.animation = "dpAvatarGlow" + size + " 2s ease-in-out infinite";
    }
  } else {
    container.border = safeColor.startsWith("var(") ? "1px solid var(--dp-accent-border)" : "1px solid " + safeColor + "20";
  }

  // Merge custom styles last
  Object.assign(container, style);

  var showImg = src && !imgErr;

  // Decoration position mapping
  var decoStyle = null;
  if (decoration && decoration.emoji) {
    var decoSize = Math.max(14, Math.round(size * 0.35));
    var pos = decoration.position || "bottom-right";
    decoStyle = {
      position: "absolute",
      width: decoSize,
      height: decoSize,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.round(decoSize * 0.7),
      lineHeight: 1,
      zIndex: 2,
      pointerEvents: "none",
    };
    if (pos === "top-right" || pos === "tr") {
      decoStyle.top = -Math.round(decoSize * 0.25);
      decoStyle.right = -Math.round(decoSize * 0.25);
    } else if (pos === "top-left" || pos === "tl") {
      decoStyle.top = -Math.round(decoSize * 0.25);
      decoStyle.left = -Math.round(decoSize * 0.25);
    } else if (pos === "bottom-left" || pos === "bl") {
      decoStyle.bottom = -Math.round(decoSize * 0.25);
      decoStyle.left = -Math.round(decoSize * 0.25);
    } else {
      // bottom-right (default)
      decoStyle.bottom = -Math.round(decoSize * 0.25);
      decoStyle.right = -Math.round(decoSize * 0.25);
    }
  }

  return (
    <div style={container}>
      {/* Inner clipping container for image */}
      <div style={{
        width: "100%", height: "100%", borderRadius: r,
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {showImg ? (
          <img
            src={src}
            alt={name}
            onError={function () { setImgErr(true); }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          initial
        )}
      </div>
      {/* Online indicator */}
      {online && (
        <span
          style={{
            position: "absolute",
            bottom: -1,
            right: -1,
            width: Math.max(8, Math.round(size * 0.22)),
            height: Math.max(8, Math.round(size * 0.22)),
            borderRadius: "50%",
            background: "var(--dp-online)",
            border: "2px solid var(--dp-card-solid)",
            zIndex: 3,
          }}
        />
      )}
      {/* Decoration overlay */}
      {decoStyle && (
        <span style={decoStyle}>{decoration.emoji}</span>
      )}
      {/* Animated glow keyframes (injected once) */}
      {badgeFrame && badgeFrame.animated && (
        <style>{"\
          @keyframes dpAvatarGlow" + size + " {\
            0%, 100% { box-shadow: 0 0 " + Math.round(size * 0.3) + "px " + (badgeFrame.glowColor || "rgba(252,211,77,0.4)") + "; }\
            50% { box-shadow: 0 0 " + Math.round(size * 0.5) + "px " + (badgeFrame.glowColor || "rgba(252,211,77,0.6)") + "; }\
          }\
        "}</style>
      )}
    </div>
  );
}
