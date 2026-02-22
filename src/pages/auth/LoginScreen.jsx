import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
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

export default function LoginScreen() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const stagger = (index) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.08}s, transform 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.08}s`,
  });

  const handleSignIn = (e) => {
    e.preventDefault();
    var errs = {};
    if (!isValidEmail(email)) errs.email = "Please enter a valid email";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    navigate("/");
  };

  return (
    <PageLayout showNav={false}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", padding: "40px 0",
      }}>
        {/* Logo */}
        <div style={{
          ...stagger(0),
          display: "flex", flexDirection: "column", alignItems: "center",
          marginBottom: 32,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(124,58,237,0.15))",
            border: "1px solid rgba(139,92,246,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16,
            boxShadow: "0 0 40px rgba(139,92,246,0.2)",
          }}>
            <Sparkles size={28} color="#C4B5FD" />
          </div>
          <span style={{
            fontSize: 22, fontWeight: 700, color: "var(--dp-text)",
            fontFamily: "Inter, sans-serif", letterSpacing: "-0.5px",
          }}>
            DreamPlanner
          </span>
        </div>

        {/* Card */}
        <div style={{
          ...glass,
          ...stagger(1),
          width: "100%",
          padding: "32px 24px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
        }}>
          {/* Heading */}
          <div style={{ ...stagger(2), textAlign: "center", marginBottom: 28 }}>
            <h1 style={{
              fontSize: 26, fontWeight: 700, color: "var(--dp-text)",
              fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: "-0.5px",
            }}>
              Welcome Back
            </h1>
            <p style={{
              fontSize: 14, color: "var(--dp-text-tertiary)",
              fontFamily: "Inter, sans-serif", marginTop: 8, lineHeight: 1.5,
            }}>
              Sign in to continue your journey
            </p>
          </div>

          <form onSubmit={handleSignIn}>
            {/* Email */}
            <div style={{ ...stagger(3), marginBottom: 16 }}>
              <label style={{
                fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                fontFamily: "Inter, sans-serif", display: "block", marginBottom: 8,
              }}>
                Email
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
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle,
                    paddingLeft: 42,
                    ...(focusedField === "email" ? inputFocusStyle : {}),
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ ...stagger(4), marginBottom: 12 }}>
              <label style={{
                fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                fontFamily: "Inter, sans-serif", display: "block", marginBottom: 8,
              }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} color="var(--dp-text-muted)" style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  pointerEvents: "none",
                }} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle,
                    paddingLeft: 42,
                    paddingRight: 44,
                    ...(focusedField === "password" ? inputFocusStyle : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    display: "flex", alignItems: "center",
                  }}
                >
                  {showPassword
                    ? <EyeOff size={18} color="var(--dp-text-tertiary)" />
                    : <Eye size={18} color="var(--dp-text-tertiary)" />
                  }
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ ...stagger(5), textAlign: "right", marginBottom: 24 }}>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#C4B5FD", fontSize: 13, fontFamily: "Inter, sans-serif",
                  fontWeight: 500, padding: 0,
                }}
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In Button */}
            <div style={stagger(6)}>
              <button
                type="submit"
                style={{
                  width: "100%", height: 50, borderRadius: 14,
                  background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                  border: "none", cursor: "pointer",
                  color: "#fff", fontSize: 15, fontWeight: 700,
                  fontFamily: "Inter, sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
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
                Sign In
                <ArrowRight size={18} />
              </button>
            </div>
          </form>

          {/* Divider */}
          <div style={{
            ...stagger(7),
            display: "flex", alignItems: "center", gap: 16,
            margin: "24px 0",
          }}>
            <div style={{ flex: 1, height: 1, background: "var(--dp-input-border)" }} />
            <span style={{
              fontSize: 12, color: "var(--dp-text-muted)",
              fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
            }}>
              or continue with
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--dp-input-border)" }} />
          </div>

          {/* Social Buttons */}
          <div style={{
            ...stagger(8),
            display: "flex", gap: 12,
          }}>
            <button
              type="button"
              style={{
                flex: 1, height: 48, borderRadius: 14,
                background: "var(--dp-glass-bg)",
                border: "1px solid var(--dp-input-border)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                color: "var(--dp-text)", fontSize: 14, fontWeight: 500,
                fontFamily: "Inter, sans-serif",
                transition: "background 0.25s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--dp-surface-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--dp-glass-bg)"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              style={{
                flex: 1, height: 48, borderRadius: 14,
                background: "var(--dp-glass-bg)",
                border: "1px solid var(--dp-input-border)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                color: "var(--dp-text)", fontSize: 14, fontWeight: 500,
                fontFamily: "Inter, sans-serif",
                transition: "background 0.25s ease",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--dp-surface-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--dp-glass-bg)"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </button>
          </div>
        </div>

        {/* Sign up link */}
        <div style={{
          ...stagger(9),
          marginTop: 24, textAlign: "center",
        }}>
          <span style={{
            fontSize: 14, color: "var(--dp-text-tertiary)",
            fontFamily: "Inter, sans-serif",
          }}>
            Don't have an account?{" "}
          </span>
          <button
            type="button"
            onClick={() => navigate("/register")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#C4B5FD", fontSize: 14, fontWeight: 600,
              fontFamily: "Inter, sans-serif", padding: 0,
            }}
          >
            Sign Up
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
