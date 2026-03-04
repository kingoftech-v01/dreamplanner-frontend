import { useState } from "react";
import { Mail, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiPost } from "../../services/api";

export default function EmailVerificationGate({ email }) {
  var { logout, refreshUser } = useAuth();
  var [resending, setResending] = useState(false);
  var [resent, setResent] = useState(false);
  var [checking, setChecking] = useState(false);

  var handleResend = function () {
    setResending(true);
    apiPost("/api/auth/resend-verification/")
      .then(function () { setResent(true); })
      .catch(function () { setResent(true); }) // Show success even on error to avoid leaking info
      .finally(function () { setResending(false); });
  };

  var handleCheck = function () {
    setChecking(true);
    refreshUser().finally(function () {
      setChecking(false);
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <div style={{
        maxWidth: 420, width: "100%", textAlign: "center",
        background: "rgba(255,255,255,0.05)",
        borderRadius: 20, padding: "48px 28px",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, margin: "0 auto 28px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.1))",
          border: "1px solid rgba(139,92,246,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Mail size={32} color="#C4B5FD" />
        </div>

        <h2 style={{
          fontSize: 22, fontWeight: 700, color: "#fff",
          margin: "0 0 12px", letterSpacing: "-0.3px",
        }}>
          Verify Your Email
        </h2>

        <p style={{
          fontSize: 14, color: "rgba(255,255,255,0.6)",
          lineHeight: 1.6, margin: "0 0 8px",
        }}>
          We sent a verification link to
        </p>
        <p style={{
          fontSize: 15, fontWeight: 600, color: "#C4B5FD",
          margin: "0 0 24px", wordBreak: "break-all",
        }}>
          {email}
        </p>
        <p style={{
          fontSize: 13, color: "rgba(255,255,255,0.4)",
          lineHeight: 1.6, margin: "0 0 32px",
        }}>
          Click the link in the email to verify your account. Check your spam folder if you don't see it.
        </p>

        {/* Check verification button */}
        <button
          onClick={handleCheck}
          disabled={checking}
          style={{
            width: "100%", height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            color: "#fff", border: "none",
            fontSize: 15, fontWeight: 600,
            cursor: checking ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: checking ? 0.7 : 1,
            transition: "opacity 0.2s",
            marginBottom: 12,
          }}
        >
          {checking ? (
            <div className="dp-spin" style={{
              width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff", borderRadius: "50%",
            }} />
          ) : (
            <RefreshCw size={16} />
          )}
          {checking ? "Checking..." : "I've Verified My Email"}
        </button>

        {/* Resend email */}
        <button
          onClick={handleResend}
          disabled={resending || resent}
          style={{
            width: "100%", height: 44, borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            color: resent ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 14, fontWeight: 500,
            cursor: resending || resent ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            marginBottom: 12,
            transition: "all 0.2s",
          }}
        >
          {resent ? "Email sent!" : resending ? "Sending..." : "Resend Verification Email"}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            background: "none", border: "none",
            color: "rgba(255,255,255,0.35)",
            fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            margin: "8px auto 0",
            padding: "8px 16px",
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
}
