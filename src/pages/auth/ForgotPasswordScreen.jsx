import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { apiPost } from "../../services/api";
import { AUTH } from "../../services/endpoints";
import { isValidEmail } from "../../utils/sanitize";

const glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
};

const inputStyle = {
  width: "100%",
  background: "var(--dp-input-bg)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 14,
  padding: "14px 16px",
  color: "var(--dp-text)",
  fontSize: 15,
  fontFamily: "Inter, sans-serif",
  outline: "none",
  transition: "border-color 0.25s ease, box-shadow 0.25s ease",
  boxSizing: "border-box",
};

const inputFocusStyle = {
  borderColor: "rgba(139,92,246,0.5)",
  boxShadow: "0 0 0 3px rgba(139,92,246,0.15)",
};

export default function ForgotPasswordScreen() {
  var navigate = useNavigate();
  var [mounted, setMounted] = useState(false);
  var [email, setEmail] = useState("");
  var [focused, setFocused] = useState(false);
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
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
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
        <div style={{
          ...glass,
          ...stagger(2),
          width: "100%",
          padding: "32px 24px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
        }}>
          {!sent ? (
            <>
              {/* Request Form */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h1 style={{
                  fontSize: 26, fontWeight: 700, color: "var(--dp-text)",
                  fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: "-0.5px",
                }}>
                  Reset Password
                </h1>
                <p style={{
                  fontSize: 14, color: "var(--dp-text-tertiary)",
                  fontFamily: "Inter, sans-serif", marginTop: 10, lineHeight: 1.6,
                }}>
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              <form onSubmit={handleSend}>
                {serverError && (
                  <div style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 12, padding: "12px 16px", marginBottom: 16,
                    fontSize: 13, color: "#FCA5A5", fontFamily: "Inter, sans-serif", lineHeight: 1.5,
                  }}>
                    {serverError}
                  </div>
                )}

                <div style={{ ...stagger(3), marginBottom: 24 }}>
                  <label style={{
                    fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                    fontFamily: "Inter, sans-serif", display: "block", marginBottom: 8,
                  }}>
                    Email Address
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={18} color="var(--dp-text-muted)" style={{
                      position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }} />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      style={{
                        ...inputStyle,
                        paddingLeft: 42,
                        ...(focused ? inputFocusStyle : {}),
                      }}
                    />
                  </div>
                </div>

                <div style={stagger(4)}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: "100%", height: 50, borderRadius: 14,
                      background: submitting
                        ? "linear-gradient(135deg, rgba(139,92,246,0.5), rgba(124,58,237,0.5))"
                        : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                      border: "none", cursor: submitting ? "not-allowed" : "pointer",
                      color: "#fff", fontSize: 15, fontWeight: 700,
                      fontFamily: "Inter, sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.25s ease",
                    }}
                    onMouseEnter={function (e) {
                      if (!submitting) {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.5)";
                      }
                    }}
                    onMouseLeave={function (e) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.4)";
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="dp-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div style={{ textAlign: "center" }}>
                <h1 style={{
                  fontSize: 26, fontWeight: 700, color: "var(--dp-text)",
                  fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: "-0.5px",
                }}>
                  Email Sent!
                </h1>
                <p style={{
                  fontSize: 14, color: "var(--dp-text-tertiary)",
                  fontFamily: "Inter, sans-serif", marginTop: 12, lineHeight: 1.7,
                }}>
                  We've sent a password reset link to{" "}
                  <span style={{ color: "#C4B5FD", fontWeight: 500 }}>
                    {email || "your email"}
                  </span>
                  . Check your inbox and follow the instructions to reset your password.
                </p>
                <p style={{
                  fontSize: 13, color: "var(--dp-text-muted)",
                  fontFamily: "Inter, sans-serif", marginTop: 8, lineHeight: 1.5,
                }}>
                  Didn't receive it? Check your spam folder or try again.
                </p>

                <button
                  onClick={() => navigate("/login")}
                  style={{
                    width: "100%", height: 50, borderRadius: 14,
                    background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                    border: "none", cursor: "pointer",
                    color: "#fff", fontSize: 15, fontWeight: 700,
                    fontFamily: "Inter, sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
                    marginTop: 28,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.4)";
                  }}
                >
                  Back to Login
                  <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}
        </div>

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
                fontFamily: "Inter, sans-serif", padding: 0,
              }}
            >
              Remember your password?{" "}
              <span style={{ color: "#C4B5FD", fontWeight: 600 }}>Sign In</span>
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
