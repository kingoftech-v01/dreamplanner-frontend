import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { apiPost } from "../../services/api";
import { AUTH } from "../../services/endpoints";
import { isValidEmail } from "../../utils/sanitize";
import IconButton from "../../components/shared/IconButton";
import GradientButton from "../../components/shared/GradientButton";
import GlassInput from "../../components/shared/GlassInput";
import GlassCard from "../../components/shared/GlassCard";

export default function ForgotPasswordScreen() {
  var navigate = useNavigate();
  var [mounted, setMounted] = useState(false);
  var [email, setEmail] = useState("");
  var [sent, setSent] = useState(false);
  var [serverError, setServerError] = useState("");
  var [submitting, setSubmitting] = useState(false);

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  var stagger = function (index) {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.6s cubic-bezier(0.4,0,0.2,1) " + (index * 0.08) + "s, transform 0.6s cubic-bezier(0.4,0,0.2,1) " + (index * 0.08) + "s",
    };
  };

  var handleSend = function (e) {
    e.preventDefault();
    setServerError("");
    if (!isValidEmail(email)) {
      setServerError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    apiPost(AUTH.PASSWORD_RESET, { email: email })
      .then(function () {
        setSent(true);
      })
      .catch(function (err) {
        setServerError(err.message || "Failed to send reset email. Please try again.");
      })
      .finally(function () {
        setSubmitting(false);
      });
  };

  return (
    <PageLayout showNav={false}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", padding: "40px 0",
      }}>
        {/* Back Button */}
        <div style={{
          ...stagger(0),
          alignSelf: "flex-start",
          marginBottom: 32,
        }}>
          <IconButton icon={ArrowLeft} onClick={() => navigate(-1)} />
        </div>

        {/* Icon */}
        <div style={{
          ...stagger(1),
          width: 80, height: 80, borderRadius: "50%",
          background: sent
            ? "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))"
            : "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.08))",
          border: sent
            ? "1px solid rgba(16,185,129,0.3)"
            : "1px solid rgba(139,92,246,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 24,
          boxShadow: sent
            ? "0 0 50px rgba(16,185,129,0.15)"
            : "0 0 50px rgba(139,92,246,0.15)",
          transition: "all 0.5s ease",
        }}>
          {sent
            ? <CheckCircle size={36} color="#10B981" />
            : <Lock size={32} color="#C4B5FD" />
          }
        </div>

        {/* Card */}
        <GlassCard padding="32px 24px" style={{
          ...stagger(2),
          width: "100%",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
        }}>
          {!sent ? (
            <>
              {/* Request Form */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h1 style={{
                  fontSize: 26, fontWeight: 700, color: "var(--dp-text)",
                  margin: 0, letterSpacing: "-0.5px",
                }}>
                  Reset Password
                </h1>
                <p style={{
                  fontSize: 14, color: "var(--dp-text-tertiary)",
                  marginTop: 10, lineHeight: 1.6,
                }}>
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              <form onSubmit={handleSend}>
                {serverError && (
                  <div style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 12, padding: "12px 16px", marginBottom: 16,
                    fontSize: 13, color: "var(--dp-danger)", lineHeight: 1.5,
                  }}>
                    {serverError}
                  </div>
                )}

                <div style={{ ...stagger(3), marginBottom: 24 }}>
                  <label style={{
                    fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                    display: "block", marginBottom: 8,
                  }}>
                    Email Address
                  </label>
                  <GlassInput
                    type="email"
                    icon={Mail}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div style={stagger(4)}>
                  <GradientButton
                    type="submit"
                    gradient="primary"
                    fullWidth
                    disabled={submitting}
                    loading={submitting}
                    icon={submitting ? undefined : ArrowRight}
                    style={{ height: 50 }}
                  >
                    {submitting ? "Sending..." : "Send Reset Link"}
                  </GradientButton>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div style={{ textAlign: "center" }}>
                <h1 style={{
                  fontSize: 26, fontWeight: 700, color: "var(--dp-text)",
                  margin: 0, letterSpacing: "-0.5px",
                }}>
                  Email Sent!
                </h1>
                <p style={{
                  fontSize: 14, color: "var(--dp-text-tertiary)",
                  marginTop: 12, lineHeight: 1.7,
                }}>
                  We've sent a password reset link to{" "}
                  <span style={{ color: "var(--dp-accent)", fontWeight: 500 }}>
                    {email || "your email"}
                  </span>
                  . Check your inbox and follow the instructions to reset your password.
                </p>
                <p style={{
                  fontSize: 13, color: "var(--dp-text-muted)",
                  marginTop: 8, lineHeight: 1.5,
                }}>
                  Didn't receive it? Check your spam folder or try again.
                </p>

                <GradientButton
                  gradient="primary"
                  fullWidth
                  onClick={() => navigate("/login")}
                  icon={ArrowRight}
                  style={{ height: 50, marginTop: 28 }}
                >
                  Back to Login
                </GradientButton>
              </div>
            </>
          )}
        </GlassCard>

        {/* Back to login (request state) */}
        {!sent && (
          <div style={{
            ...stagger(5),
            marginTop: 24, textAlign: "center",
          }}>
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--dp-text-tertiary)", fontSize: 14,
                padding: 0,
              }}
            >
              Remember your password?{" "}
              <span style={{ color: "var(--dp-accent)", fontWeight: 600 }}>Sign In</span>
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
