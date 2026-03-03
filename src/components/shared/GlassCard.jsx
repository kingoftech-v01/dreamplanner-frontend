import React from "react";

export default function GlassCard({
  children,
  hover,
  padding,
  mb,
  radius,
  style,
  onClick,
  className = "",
}) {
  var cls = "dp-g" + (hover ? " dp-gh" : "") + (className ? " " + className : "");

  var merged = {};
  if (padding != null) merged.padding = padding;
  if (mb != null) merged.marginBottom = mb;
  if (radius != null) merged.borderRadius = radius;
  if (onClick) merged.cursor = "pointer";
  if (style) Object.assign(merged, style);

  return (
    <div className={cls} style={merged} onClick={onClick}>
      {children}
    </div>
  );
}
