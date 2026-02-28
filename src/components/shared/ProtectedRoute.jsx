import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  var { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", color: "rgba(255,255,255,0.5)",
        fontFamily: "Inter, sans-serif", fontSize: 14,
      }}>
        <div className="dp-spin" style={{
          width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)",
          borderTopColor: "#8B5CF6", borderRadius: "50%",
        }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
