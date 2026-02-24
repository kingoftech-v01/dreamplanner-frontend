import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px", textAlign: "center",
      minHeight: 280,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16,
      }}>
        <AlertTriangle size={24} color="#EF4444" />
      </div>

      <h3 style={{
        fontSize: 17, fontWeight: 600, color: "var(--dp-text)",
        fontFamily: "Inter, sans-serif", margin: "0 0 6px",
      }}>
        Something went wrong
      </h3>

      <p style={{
        fontSize: 13, color: "var(--dp-text-tertiary)",
        fontFamily: "Inter, sans-serif", lineHeight: 1.5,
        maxWidth: 260, margin: "0 0 20px",
      }}>
        {message || "An unexpected error occurred. Please try again."}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            height: 40, borderRadius: 12, padding: "0 20px",
            background: "var(--dp-surface)",
            border: "1px solid var(--dp-input-border)",
            cursor: "pointer",
            color: "var(--dp-text)", fontSize: 13, fontWeight: 500,
            fontFamily: "Inter, sans-serif",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <RefreshCw size={14} />
          Try again
        </button>
      )}
    </div>
  );
}
