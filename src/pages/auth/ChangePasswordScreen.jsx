import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Check, Shield } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { apiPost } from "../../services/api";
import { AUTH } from "../../services/endpoints";
import IconButton from "../../components/shared/IconButton";
import GradientButton from "../../components/shared/GradientButton";
import GlassInput from "../../components/shared/GlassInput";
import GlassCard from "../../components/shared/GlassCard";

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
  var navigate = useNavigate();
  var [mounted, setMounted] = useState(false);
  var [currentPassword, setCurrentPassword] = useState("");
  var [newPassword, setNewPassword] = useState("");
  var [confirmPassword, setConfirmPassword] = useState("");
  var [showCurrent, setShowCurrent] = useState(false);
  var [showNew, setShowNew] = useState(false);
  var [showConfirm, setShowConfirm] = useState(false);
  var [showToast, setShowToast] = useState(false);
  var [serverError, setServerError] = useState("");
  var [submitting, setSubmitting] = useState(false);

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  var strength = getPasswordStrength(newPassword);

  var stagger = function (index) {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.6s cubic-bezier(0.4,0,0.2,1) " + (index * 0.08) + "s, transform 0.6s cubic-bezier(0.4,0,0.2,1) " + (index * 0.08) + "s",
    };
  };

  var handleUpdate = function (e) {
    e.preventDefault();
    setServerError("");

    if (!currentPassword) {
      setServerError("Current password is required.");
      return;
    }
    if (strength.level < 2) {
      setServerError("New password is too weak.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setServerError("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    apiPost(AUTH.PASSWORD_CHANGE, {
      old_password: currentPassword,
      new_password1: newPassword,
      new_password2: confirmPassword,
    })
      .then(function () {
        setShowToast(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(function () { setShowToast(false); }, 3000);
      })
      .catch(function (err) {
        if (err.fieldErrors) {
          var msg = err.fieldErrors.oldPassword || err.fieldErrors.newPassword1 || err.fieldErrors.newPassword2 || "";
          setServerError(msg || err.message || "Failed to update password.");
        } else {
          setServerError(err.message || "Failed to update password.");
        }
      })
      .finally(function () {
        setSubmitting(false);
      });
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
          <IconButton icon={ArrowLeft} onClick={() => navigate(-1)} />
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: "var(--dp-text)",
            margin: 0, letterSpacing: "-0.5px",
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
        <GlassCard padding="28px 24px" style={{
          ...stagger(2),
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
        }}>
          <form onSubmit={handleUpdate}>
            {/* Server error */}
            {serverError && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 16,
                fontSize: 13, color: "var(--dp-danger)", lineHeight: 1.5,
              }}>
                {serverError}
              </div>
            )}

            {/* Current Password */}
            <div style={{ ...stagger(3), marginBottom: 18 }}>
              <label style={{
                fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                display: "block", marginBottom: 8,
              }}>
                Current Password
              </label>
              <GlassInput
                type={showCurrent ? "text" : "password"}
                icon={Lock}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
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
                display: "block", marginBottom: 8,
              }}>
                New Password
              </label>
              <GlassInput
                type={showNew ? "text" : "password"}
                icon={Lock}
                placeholder="Create new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
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
                  }}>
                  {strength.label}
                </span>
              </div>
            )}

            {/* Confirm New Password */}
            <div style={{ ...stagger(5), marginBottom: 28 }}>
              <label style={{
                fontSize: 13, fontWeight: 500, color: "var(--dp-text-secondary)",
                display: "block", marginBottom: 8,
              }}>
                Confirm New Password
              </label>
              <GlassInput
                type={showConfirm ? "text" : "password"}
                icon={Lock}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && newPassword && confirmPassword !== newPassword && (
                <span style={{
                  fontSize: 12, color: "var(--dp-danger-solid)", display: "block", marginTop: 6,
                }}>
                  Passwords do not match
                </span>
              )}
              {confirmPassword && newPassword && confirmPassword === newPassword && (
                <span style={{
                  fontSize: 12, color: "#10B981", display: "flex", alignItems: "center", gap: 4, marginTop: 6,
                }}>
                  <Check size={12} /> Passwords match
                </span>
              )}
            </div>

            {/* Update Button */}
            <div style={stagger(6)}>
              <GradientButton
                type="submit"
                gradient="primary"
                fullWidth
                disabled={submitting}
                loading={submitting}
                style={{ height: 50 }}
              >
                {submitting ? "Updating..." : "Update Password"}
              </GradientButton>
            </div>
          </form>
        </GlassCard>

        {/* Tips */}
        <GlassCard padding="16px 20px" style={{
          ...stagger(7),
          marginTop: 20,
        }}>
          <p style={{
            fontSize: 12, color: "var(--dp-text-tertiary)", margin: 0, lineHeight: 1.7,
          }}>
            <strong style={{ color: "var(--dp-text-secondary)" }}>Password tips:</strong> Use at least
            8 characters with a mix of uppercase, lowercase, numbers, and special characters.
          </p>
        </GlassCard>
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
            }}>
            Password updated successfully!
          </span>
        </div>
      </div>
    </PageLayout>
  );
}
