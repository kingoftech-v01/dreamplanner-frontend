import GradientButton from "./GradientButton";

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
        margin: "0 0 6px",
      }}>
        {title || "Nothing here yet"}
      </h3>

      {subtitle && (
        <p style={{
          fontSize: 13, color: "var(--dp-text-tertiary)",
          lineHeight: 1.5,
          maxWidth: 260, margin: "0 0 20px",
        }}>
          {subtitle}
        </p>
      )}

      {action && onAction && (
        <GradientButton onClick={onAction} size="sm" gradient="primary">
          {action}
        </GradientButton>
      )}
    </div>
  );
}
