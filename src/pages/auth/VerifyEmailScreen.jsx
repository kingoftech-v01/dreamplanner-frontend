import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiPost } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function VerifyEmailScreen() {
  var [searchParams] = useSearchParams();
  var navigate = useNavigate();
  var { refreshUser, isAuthenticated } = useAuth();
  var key = searchParams.get("key") || "";
  var [status, setStatus] = useState("verifying"); // verifying | success | error
  var [message, setMessage] = useState("");

  useEffect(function () {
    if (!key) {
      setStatus("error");
      setMessage("No confirmation key found. Please check your email link.");
      return;
    }

    apiPost("/api/auth/verify-email/", { key: key })
      .then(function (data) {
        setStatus("success");
        setMessage(data.detail || "Email verified!");
        // Refresh user data so emailVerified updates
        if (isAuthenticated) {
          refreshUser().then(function () {
            // Auto-redirect to home after a short delay
            setTimeout(function () { navigate("/", { replace: true }); }, 1500);
          });
        }
      })
      .catch(function (err) {
        setStatus("error");
        setMessage(
          (err && err.message) ||
          "Verification failed. The link may have expired."
        );
      });
  }, [key]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <div style={{
        maxWidth: 420, width: "100%", textAlign: "center",
        background: "rgba(255,255,255,0.05)",
        borderRadius: 16, padding: "48px 32px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {status === "verifying" && (
          <>
            <div className="dp-spin" style={{
              width: 40, height: 40, margin: "0 auto 24px",
              border: "3px solid rgba(255,255,255,0.1)",
              borderTopColor: "#8B5CF6", borderRadius: "50%",
            }} />
            <h2 style={{ color: "#fff", fontSize: 20, margin: 0 }}>
              Verifying your email...
            </h2>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{
              width: 56, height: 56, margin: "0 auto 24px",
              borderRadius: "50%", background: "rgba(34,197,94,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, color: "#22C55E",
            }}>
              &#10003;
            </div>
            <h2 style={{ color: "#fff", fontSize: 20, margin: "0 0 12px" }}>
              Email Verified!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: "0 0 32px" }}>
              {isAuthenticated ? "Redirecting you to the app..." : message}
            </p>
            {!isAuthenticated && (
              <button
                onClick={function () { navigate("/login"); }}
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                  color: "#fff", border: "none", borderRadius: 12,
                  padding: "14px 32px", fontSize: 16, fontWeight: 600,
                  cursor: "pointer", width: "100%",
                }}
              >
                Go to Login
              </button>
            )}
          </>
        )}

        {status === "error" && (
          <>
            <div style={{
              width: 56, height: 56, margin: "0 auto 24px",
              borderRadius: "50%", background: "rgba(239,68,68,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, color: "#EF4444",
            }}>
              !
            </div>
            <h2 style={{ color: "#fff", fontSize: 20, margin: "0 0 12px" }}>
              Verification Failed
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: "0 0 32px" }}>
              {message}
            </p>
            <button
              onClick={function () { navigate("/login"); }}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12, padding: "14px 32px", fontSize: 16,
                fontWeight: 600, cursor: "pointer", width: "100%",
              }}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
