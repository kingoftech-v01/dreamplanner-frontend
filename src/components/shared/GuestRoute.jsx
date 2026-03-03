import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Reverse of ProtectedRoute — redirects authenticated users to home.
 * Used on /login, /register, /forgot-password so logged-in users
 * don't see auth screens.
 */
export default function GuestRoute({ children }) {
  var { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", color: "rgba(255,255,255,0.5)",
        fontSize: 14,
      }}>
        <div className="dp-spin" style={{
          width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)",
          borderTopColor: "#8B5CF6", borderRadius: "50%",
        }} />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
