import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import EmailVerificationGate from "./EmailVerificationGate";

export default function ProtectedRoute({ children }) {
  var { isAuthenticated, isLoading, user } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Gate: email must be verified to use the platform
  if (user && user.emailVerified === false) {
    return <EmailVerificationGate email={user.email} />;
  }

  return children;
}
