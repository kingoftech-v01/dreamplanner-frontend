import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function SubscriptionGate({ required, feature, children }) {
  var { hasSubscription } = useAuth();
  var navigate = useNavigate();

  if (hasSubscription(required)) {
    return children;
  }

  var tierLabel = required === "pro" ? "Pro" : "Premium";

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "48px 24px", textAlign: "center",
      minHeight: 320,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.1))",
        border: "1px solid rgba(139,92,246,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
      }}>
        <Lock size={28} color="#C4B5FD" />
      </div>

      <h3 style={{
        fontSize: 20, fontWeight: 700, color: "var(--dp-text)",
        fontFamily: "Inter, sans-serif", margin: "0 0 8px",
      }}>
        {tierLabel} Feature
      </h3>

      <p style={{
        fontSize: 14, color: "var(--dp-text-tertiary)",
        fontFamily: "Inter, sans-serif", lineHeight: 1.6,
        maxWidth: 280, margin: "0 0 24px",
      }}>
        {feature || "This feature"} requires a {tierLabel} subscription to access.
      </p>

      <button
        onClick={function () { navigate("/subscription"); }}
        style={{
          height: 44, borderRadius: 14, padding: "0 24px",
          background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
          border: "none", cursor: "pointer",
          color: "#fff", fontSize: 14, fontWeight: 600,
          fontFamily: "Inter, sans-serif",
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
        }}
      >
        Upgrade to {tierLabel}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
