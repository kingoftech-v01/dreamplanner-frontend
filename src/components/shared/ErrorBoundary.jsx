import { Component } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "#03010a", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>
          <div style={{
            maxWidth: 360, padding: 32, borderRadius: 24, textAlign: "center",
            background: "rgba(255,255,255,0.04)", backdropFilter: "blur(40px)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 20px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={28} color="#F87171" strokeWidth={2} />
            </div>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              An unexpected error occurred. Please try reloading the app.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
              }}
            >
              <RotateCw size={16} strokeWidth={2} /> Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
