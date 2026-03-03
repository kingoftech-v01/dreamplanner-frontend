import { useState, useRef, useEffect } from "react";

/**
 * ExpandableText — Truncates multi-line text with a "See more" / "See less" toggle.
 *
 * Props:
 *   text      — string to display
 *   maxLines  — number of lines before truncation (default 3)
 *   fontSize  — font size in px (default 14)
 *   color     — text color (default "var(--dp-text)")
 *   style     — extra styles on the wrapper
 */
export default function ExpandableText({ text, maxLines = 3, fontSize = 14, color = "var(--dp-text)", lineHeight = 1.6, style = {} }) {
  var [expanded, setExpanded] = useState(false);
  var [needsTruncation, setNeedsTruncation] = useState(false);
  var textRef = useRef(null);

  useEffect(function () {
    if (!textRef.current) return;
    var el = textRef.current;
    // Compare scrollHeight vs the clamped height to know if we need "See more"
    var lineHeightPx = fontSize * lineHeight;
    var maxHeight = lineHeightPx * maxLines;
    setNeedsTruncation(el.scrollHeight > maxHeight + 2);
  }, [text, maxLines, fontSize, lineHeight]);

  if (!text) return null;

  return (
    <div style={style}>
      <div
        ref={textRef}
        style={{
          fontSize: fontSize,
          lineHeight: lineHeight,
          color: color,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflow: "hidden",
          display: expanded ? "block" : "-webkit-box",
          WebkitLineClamp: expanded ? "unset" : maxLines,
          WebkitBoxOrient: "vertical",
        }}
      >
        {text}
      </div>
      {needsTruncation && (
        <button
          onClick={function (e) { e.stopPropagation(); setExpanded(!expanded); }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            marginTop: 4,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--dp-accent)",
            fontFamily: "inherit",
          }}
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
