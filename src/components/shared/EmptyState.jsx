export default function EmptyState({ icon, title, subtitle, action, onAction }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px", textAlign: "center",
      minHeight: 240,
    }}>
      {icon && (
        <div style={{
          fontSize: 40, marginBottom: 16, lineHeight: 1,
          opacity: 0.7,
        }}>
          {icon}
        </div>
      )}

      <h3 style={{
        fontSize: 17, fontWeight: 600, color: "var(--dp-text)",
        fontFamily: "Inter, sans-serif", margin: "0 0 6px",
      }}>
        {title || "Nothing here yet"}
      </h3>

      {subtitle && (
        <p style={{
          fontSize: 13, color: "var(--dp-text-tertiary)",
          fontFamily: "Inter, sans-serif", lineHeight: 1.5,
          maxWidth: 260, margin: "0 0 20px",
        }}>
          {subtitle}
        </p>
      )}

      {action && onAction && (
        <button
          onClick={onAction}
          style={{
            height: 40, borderRadius: 12, padding: "0 20px",
            background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
            border: "none", cursor: "pointer",
            color: "#fff", fontSize: 13, fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            boxShadow: "0 4px 16px rgba(139,92,246,0.3)",
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}
