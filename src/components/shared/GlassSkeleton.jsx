/**
 * GlassSkeleton — shimmer loading placeholders with glass morphism.
 * Variants: text, circle, card, rect, list, profile
 */

var VARIANTS = {
  text: function (props) {
    var w = props.width || "100%";
    var h = props.height || 14;
    var lines = props.lines || 1;
    var gap = props.gap || 10;
    return Array.from({ length: lines }, function (_, i) {
      return (
        <div key={i} className="dp-shimmer" style={{
          width: i === lines - 1 && lines > 1 ? "60%" : w,
          height: h, borderRadius: 6,
          background: "var(--dp-surface)",
          marginBottom: i < lines - 1 ? gap : 0,
        }} />
      );
    });
  },

  circle: function (props) {
    var size = props.size || 48;
    return (
      <div className="dp-shimmer" style={{
        width: size, height: size, borderRadius: "50%",
        background: "var(--dp-surface)", flexShrink: 0,
      }} />
    );
  },

  rect: function (props) {
    return (
      <div className="dp-shimmer" style={{
        width: props.width || "100%",
        height: props.height || 120,
        borderRadius: props.radius || 12,
        background: "var(--dp-surface)",
      }} />
    );
  },

  card: function () {
    return (
      <div style={{
        background: "var(--dp-glass-bg)",
        border: "1px solid var(--dp-glass-border)",
        borderRadius: 16, padding: 16,
      }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div className="dp-shimmer" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--dp-surface)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="dp-shimmer" style={{ width: "50%", height: 14, borderRadius: 6, background: "var(--dp-surface)", marginBottom: 8 }} />
            <div className="dp-shimmer" style={{ width: "30%", height: 11, borderRadius: 6, background: "var(--dp-surface)" }} />
          </div>
        </div>
        <div className="dp-shimmer" style={{ width: "100%", height: 12, borderRadius: 6, background: "var(--dp-surface)", marginBottom: 8 }} />
        <div className="dp-shimmer" style={{ width: "80%", height: 12, borderRadius: 6, background: "var(--dp-surface)", marginBottom: 8 }} />
        <div className="dp-shimmer" style={{ width: "40%", height: 12, borderRadius: 6, background: "var(--dp-surface)" }} />
      </div>
    );
  },

  list: function (props) {
    var count = props.count || 4;
    return Array.from({ length: count }, function (_, i) {
      return (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 0",
          borderBottom: i < count - 1 ? "1px solid var(--dp-divider)" : "none",
        }}>
          <div className="dp-shimmer" style={{ width: 44, height: 44, borderRadius: 12, background: "var(--dp-surface)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="dp-shimmer" style={{ width: "60%", height: 14, borderRadius: 6, background: "var(--dp-surface)", marginBottom: 8 }} />
            <div className="dp-shimmer" style={{ width: "40%", height: 11, borderRadius: 6, background: "var(--dp-surface)" }} />
          </div>
          <div className="dp-shimmer" style={{ width: 48, height: 11, borderRadius: 6, background: "var(--dp-surface)" }} />
        </div>
      );
    });
  },

  profile: function () {
    return (
      <div style={{ textAlign: "center" }}>
        <div className="dp-shimmer" style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--dp-surface)", margin: "0 auto 16px" }} />
        <div className="dp-shimmer" style={{ width: 140, height: 18, borderRadius: 6, background: "var(--dp-surface)", margin: "0 auto 10px" }} />
        <div className="dp-shimmer" style={{ width: 100, height: 13, borderRadius: 6, background: "var(--dp-surface)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
          {[1, 2, 3].map(function (k) {
            return (
              <div key={k} style={{ textAlign: "center" }}>
                <div className="dp-shimmer" style={{ width: 36, height: 18, borderRadius: 6, background: "var(--dp-surface)", margin: "0 auto 6px" }} />
                <div className="dp-shimmer" style={{ width: 48, height: 11, borderRadius: 6, background: "var(--dp-surface)", margin: "0 auto" }} />
              </div>
            );
          })}
        </div>
      </div>
    );
  },

  dream: function () {
    return (
      <div style={{
        background: "var(--dp-glass-bg)",
        border: "1px solid var(--dp-glass-border)",
        borderRadius: 20, padding: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="dp-shimmer" style={{ width: "55%", height: 18, borderRadius: 8, background: "var(--dp-surface)" }} />
          <div className="dp-shimmer" style={{ width: 60, height: 24, borderRadius: 12, background: "var(--dp-surface)" }} />
        </div>
        <div className="dp-shimmer" style={{ width: "100%", height: 8, borderRadius: 4, background: "var(--dp-surface)", marginBottom: 14 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3].map(function (k) {
            return <div key={k} className="dp-shimmer" style={{ width: 64, height: 26, borderRadius: 8, background: "var(--dp-surface)" }} />;
          })}
        </div>
      </div>
    );
  },
};

export default function GlassSkeleton({ variant = "text", style, className = "", ...props }) {
  var render = VARIANTS[variant] || VARIANTS.text;
  return (
    <div style={{ ...style }} className={className} aria-hidden="true" role="presentation">
      {render(props)}
    </div>
  );
}
