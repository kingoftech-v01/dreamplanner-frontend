import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Eye, EyeOff, Check, Shield } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";

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

function getPasswordStrength(password) {
  if (!password) return { level: 0, label: "", color: "transparent" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;

  if (score <= 1) return { level: 1, label: "Weak", color: "#EF4444" };
  if (score <= 3) return { level: 2, label: "Medium", color: "#FCD34D" };
  return { level: 3, label: "Strong", color: "#10B981" };
}

export default function ChangePasswordScreen() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const strength = getPasswordStrength(newPassword);

  const stagger = (index) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.08}s, transform 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.08}s`,
  });

  const handleUpdate = (e) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <PageLayout showNav={false}>
      <div style={{
        display: "flex", flexDirection: "column",
        minHeight: "100vh", paddingTop: 20, paddingBottom: 40,
      }}>
        {/* Header */}
        <div style={{
          ...stagger(0),
          display: "flex", alignItems: "center", gap: 16,
          marginBottom: 32,
        }}>
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: "var(--dp-text)",
            fontFamily: "Inter, sans-serif", margin: 0, letterSpacing: "-0.5px",
          }}>
            Change Password
          </h1>
        </div>

        {/* Security Icon */}
        <div style={{
          ...stagger(1),
          display: "flex", justifyContent: "center", marginBottom: 24,
        }}>
          <div style={{
            width: 68, height: 68, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(124,58,237,0.08))",
            border: "1px solid rgba(139,92,246,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(139,92,246,0.12)",
          }}>
            <Shield size={28} color="#C4B5FD" />
          </div>
        </div>

        {/* Card */}
        <div style={{
          ...glass,
          ...stagger(2),
          padding: "28px 24px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
        }}>
          <form onSubmit={handleUpdate}>
            {/* Current Password */}
            <div style={{ ...stagger(3), marginBottom: 18 }}>
              <label style={{
                fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                fontFamily: "Inter, sans-serif", display: "block", marginBottom: 8,
              }}>
                Current Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} color="var(--dp-text-muted)" style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  pointerEvents: "none",
                }} />
                <input
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onFocus={() => setFocusedField("current")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle,
                    paddingLeft: 42,
                    paddingRight: 44,
                    ...(focusedField === "current" ? inputFocusStyle : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    display: "flex", alignItems: "center",
                  }}
                >
                  {showCurrent
                    ? <EyeOff size={18} color="var(--dp-text-tertiary)" />
                    : <Eye size={18} color="var(--dp-text-tertiary)" />
                  }
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{
              height: 1, background: "var(--dp-glass-border)",
              margin: "20px 0",
            }} />

            {/* New Password */}
            <div style={{ ...stagger(4), marginBottom: 6 }}>
              <label style={{
                fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                fontFamily: "Inter, sans-serif", display: "block", marginBottom: 8,
              }}>
                New Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} color="var(--dp-text-muted)" style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  pointerEvents: "none",
                }} />
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="Create new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={() => setFocusedField("new")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle,
                    paddingLeft: 42,
                    paddingRight: 44,
                    ...(focusedField === "new" ? inputFocusStyle : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    display: "flex", alignItems: "center",
                  }}
                >
                  {showNew
                    ? <EyeOff size={18} color="var(--dp-text-tertiary)" />
                    : <Eye size={18} color="var(--dp-text-tertiary)" />
                  }
                </button>
              </div>
            </div>

            {/* Password Strength */}
            {newPassword.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{
                  display: "flex", gap: 4, marginBottom: 6, marginTop: 8,
                }}>
                  {[1, 2, 3].map((level) => (
                    <div key={level} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: strength.level >= level
                        ? strength.color
                        : "var(--dp-input-border)",
                      transition: "background 0.3s ease",
                    }} />
                  ))}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: strength.color,
                  fontFamily: "Inter, sans-serif",
                }}>
                  {strength.label}
                </span>
              </div>
            )}

            {/* Confirm New Password */}
            <div style={{ ...stagger(5), marginBottom: 28 }}>
              <label style={{
                fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                fontFamily: "Inter, sans-serif", display: "block", marginBottom: 8,
              }}>
                Confirm New Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} color="var(--dp-text-muted)" style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  pointerEvents: "none",
                }} />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField("confirm")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle,
                    paddingLeft: 42,
                    paddingRight: 44,
                    ...(focusedField === "confirm" ? inputFocusStyle : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    display: "flex", alignItems: "center",
                  }}
                >
                  {showConfirm
                    ? <EyeOff size={18} color="var(--dp-text-tertiary)" />
                    : <Eye size={18} color="var(--dp-text-tertiary)" />
                  }
                </button>
              </div>
              {confirmPassword && newPassword && confirmPassword !== newPassword && (
                <span style={{
                  fontSize: 12, color: "#EF4444", fontFamily: "Inter, sans-serif",
                  display: "block", marginTop: 6,
                }}>
                  Passwords do not match
                </span>
              )}
              {confirmPassword && newPassword && confirmPassword === newPassword && (
                <span style={{
                  fontSize: 12, color: "#10B981", fontFamily: "Inter, sans-serif",
                  display: "flex", alignItems: "center", gap: 4, marginTop: 6,
                }}>
                  <Check size={12} /> Passwords match
                </span>
              )}
            </div>

            {/* Update Button */}
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
                Update Password
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div style={{
          ...stagger(7),
          marginTop: 20,
          padding: "16px 20px",
          borderRadius: 16,
          background: "rgba(139,92,246,0.06)",
          border: "1px solid rgba(139,92,246,0.12)",
        }}>
          <p style={{
            fontSize: 12, color: "var(--dp-text-tertiary)", fontFamily: "Inter, sans-serif",
            margin: 0, lineHeight: 1.7,
          }}>
            <strong style={{ color: "var(--dp-text-secondary)" }}>Password tips:</strong> Use at least
            8 characters with a mix of uppercase, lowercase, numbers, and special characters.
          </p>
        </div>
      </div>

      {/* Success Toast */}
      <div style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: `translateX(-50%) translateY(${showToast ? "0" : "-100px"})`,
        opacity: showToast ? 1 : 0,
        transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease",
        zIndex: 200,
        pointerEvents: showToast ? "auto" : "none",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(16,185,129,0.15)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 14,
          padding: "12px 20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <Check size={18} color="#10B981" />
          <span style={{
            fontSize: 14, fontWeight: 600, color: "#10B981",
            fontFamily: "Inter, sans-serif",
          }}>
            Password updated successfully!
          </span>
        </div>
      </div>
    </PageLayout>
  );
}
