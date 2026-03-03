import React, { useRef, useEffect } from "react";

var SIZES = {
  sm: { padding: "4px 10px", fontSize: 12 },
  md: { padding: "8px 16px", fontSize: 13 },
};

export default function PillTabs({ tabs, active, onChange, size = "md", style, scrollable }) {
  var scrollRef = useRef(null);
  var s = SIZES[size] || SIZES.md;

  useEffect(() => {
    if (scrollable && scrollRef.current) {
      var el = scrollRef.current.querySelector("[data-active]");
      if (el) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [active, scrollable]);

  var container = {
    display: "flex",
    gap: 8,
    alignItems: "center",
    ...(scrollable
      ? { overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }
      : { flexWrap: "wrap" }),
    ...style,
  };

  return (
    <div ref={scrollRef} style={container}>
      {tabs.map(function (tab) {
        var isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            data-active={isActive || undefined}
            onClick={function () { onChange(tab.key); }}
            style={{
              padding: s.padding,
              borderRadius: 12,
              border: "none",
              fontSize: s.fontSize,
              fontWeight: isActive ? 600 : 500,
              background: isActive ? "var(--dp-pill-active)" : "transparent",
              color: isActive ? "var(--dp-pill-text-active)" : "var(--dp-text-tertiary)",
              outline: isActive ? "1px solid var(--dp-pill-border-active)" : "1px solid transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tab.icon && <tab.icon size={s.fontSize} />}
            {tab.label}
            {tab.count != null && (
              <span
                style={{
                  fontSize: s.fontSize - 2,
                  opacity: 0.7,
                  marginLeft: 2,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
