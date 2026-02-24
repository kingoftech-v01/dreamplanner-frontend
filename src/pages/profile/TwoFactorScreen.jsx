import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { clipboardWrite } from "../../services/native";
import PageLayout from "../../components/shared/PageLayout";
import {
  ArrowLeft, Shield, Key, Copy, Check, AlertTriangle, Loader,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Two-Factor Authentication Screen
 *
 * Flow:
 *   1. Load 2FA status (enabled / backupCodesRemaining)
 *   2. If disabled → Enable flow: setup → QR/secret → verify TOTP → backup codes
 *   3. If enabled  → Status card, regenerate backup codes, disable (password)
 * ═══════════════════════════════════════════════════════════════════ */

export default function TwoFactorScreen() {
  var navigate = useNavigate();
  var queryClient = useQueryClient();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { showToast } = useToast();

  // ─── Mount animation ──────────────────────────────────────────
  var [mounted, setMounted] = useState(false);
  useEffect(function () {
    var id = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(id); };
  }, []);

  // ─── Local UI state ───────────────────────────────────────────
  var [step, setStep] = useState("idle");          // idle | setup | verify | backupCodes
  var [secret, setSecret] = useState("");
  var [qrUri, setQrUri] = useState("");
  var [totpCode, setTotpCode] = useState("");
  var [backupCodes, setBackupCodes] = useState([]);
  var [copiedSecret, setCopiedSecret] = useState(false);
  var [copiedCodes, setCopiedCodes] = useState(false);
  var [disableCode, setDisableCode] = useState("");
  var [showDisable, setShowDisable] = useState(false);

  // ─── 2FA status query ─────────────────────────────────────────
  var statusQuery = useQuery({
    queryKey: ["2fa-status"],
    queryFn: function () { return apiGet("/api/users/2fa/status/"); },
  });

  var statusData = statusQuery.data;
  var isEnabled = statusData && statusData.enabled;

  // ─── Setup mutation ───────────────────────────────────────────
  var setupMutation = useMutation({
    mutationFn: function () { return apiPost("/api/users/2fa/setup/"); },
    onSuccess: function (data) {
      setSecret(data.secret || data.secretKey || "");
      setQrUri(data.qrCodeUrl || data.qrUri || data.qrCode || data.qr || "");
      setStep("setup");
    },
    onError: function (err) {
      showToast(err.message || "Failed to start 2FA setup", "error");
    },
  });

  // ─── Verify mutation ──────────────────────────────────────────
  var verifyMutation = useMutation({
    mutationFn: function () { return apiPost("/api/users/2fa/verify/", { code: totpCode }); },
    onSuccess: function (data) {
      if (data.success) {
        setBackupCodes(data.backupCodes || []);
        setStep("backupCodes");
        queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
        showToast("Two-factor authentication enabled", "success");
      } else {
        showToast("Invalid code. Please try again.", "error");
      }
    },
    onError: function (err) {
      showToast(err.message || "Verification failed", "error");
    },
  });

  // ─── Disable mutation ─────────────────────────────────────────
  var disableMutation = useMutation({
    mutationFn: function () { return apiPost("/api/users/2fa/disable/", { code: disableCode }); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      setShowDisable(false);
      setDisableCode("");
      setStep("idle");
      showToast("Two-factor authentication disabled", "success");
    },
    onError: function (err) {
      showToast(err.message || "Failed to disable 2FA", "error");
    },
  });

  // ─── Regenerate backup codes mutation ─────────────────────────
  var regenMutation = useMutation({
    mutationFn: function () { return apiGet("/api/users/2fa/backup-codes/"); },
    onSuccess: function (data) {
      setBackupCodes(data.backupCodes || data.codes || []);
      setStep("backupCodes");
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      showToast("New backup codes generated", "success");
    },
    onError: function (err) {
      showToast(err.message || "Failed to regenerate backup codes", "error");
    },
  });

  // ─── Clipboard helpers ────────────────────────────────────────
  function handleCopySecret() {
    if (!secret) return;
    clipboardWrite(secret).then(function () {
      setCopiedSecret(true);
      setTimeout(function () { setCopiedSecret(false); }, 2000);
    });
  }

  function handleCopyCodes() {
    if (!backupCodes.length) return;
    clipboardWrite(backupCodes.join("\n")).then(function () {
      setCopiedCodes(true);
      setTimeout(function () { setCopiedCodes(false); }, 2000);
    });
  }

  // ─── Style tokens ─────────────────────────────────────────────
  var textColor = isLight ? "#1a1535" : "#fff";
  var textSecondary = isLight ? "rgba(26,21,53,0.55)" : "rgba(255,255,255,0.5)";
  var accentColor = isLight ? "#7C3AED" : "#C4B5FD";
  var dangerColor = isLight ? "#DC2626" : "#F69A9A";

  var glassCard = {
    background: "var(--dp-glass-bg)",
    border: "1px solid var(--dp-glass-border)",
    borderRadius: 20,
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    padding: 20,
    marginBottom: 16,
  };

  var inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 14,
    background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
    border: "1px solid var(--dp-input-border)",
    color: "var(--dp-text)",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
  };

  var primaryBtn = {
    width: "100%",
    padding: "14px 0",
    borderRadius: 16,
    border: "none",
    background: "rgba(139,92,246,0.2)",
    color: accentColor,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "all 0.2s",
  };

  var secondaryBtn = {
    width: "100%",
    padding: "14px 0",
    borderRadius: 16,
    border: isLight ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(255,255,255,0.08)",
    background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
    color: isLight ? "rgba(26,21,53,0.9)" : "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "all 0.2s",
  };

  var dangerBtn = {
    width: "100%",
    padding: "14px 0",
    borderRadius: 16,
    border: "1px solid rgba(246,154,154,0.15)",
    background: "rgba(246,154,154,0.06)",
    color: dangerColor,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "all 0.2s",
  };

  // ─── Loading state ────────────────────────────────────────────
  if (statusQuery.isLoading) {
    return (
      <PageLayout showNav={false}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <Loader size={28} color={accentColor} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
        </div>
        <style>{"@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}"}</style>
      </PageLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <PageLayout showNav={false}>
      {/* ─── Header ────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        paddingTop: "env(safe-area-inset-top, 12px)",
        paddingBottom: 16,
        marginBottom: 4,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <button
          className="dp-ib"
          aria-label="Go back"
          onClick={function () { navigate(-1); }}
          style={{ flexShrink: 0 }}
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <span style={{
          fontSize: 18,
          fontWeight: 700,
          color: textColor,
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "-0.3px",
        }}>
          Two-Factor Authentication
        </span>
      </div>

      {/* ─── Error state ───────────────────────────────────────── */}
      {statusQuery.isError && (
        <div style={{
          ...glassCard,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s",
        }}>
          <AlertTriangle size={20} color={dangerColor} strokeWidth={2} />
          <span style={{ fontSize: 14, color: dangerColor, fontFamily: "'Inter', sans-serif" }}>
            Failed to load 2FA status. Please try again.
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
       *  STATUS CARD (always visible when data loaded)
       * ═══════════════════════════════════════════════════════════ */}
      {statusData && step === "idle" && (
        <div style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s",
        }}>
          <div style={glassCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: isEnabled ? "rgba(93,229,168,0.1)" : "rgba(139,92,246,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <Shield
                  size={22}
                  color={isEnabled ? (isLight ? "#059669" : "#5DE5A8") : accentColor}
                  strokeWidth={2}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: textColor, fontFamily: "'Inter', sans-serif" }}>
                  {isEnabled ? "2FA is Enabled" : "2FA is Disabled"}
                </div>
                <div style={{ fontSize: 13, color: textSecondary, marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                  {isEnabled
                    ? statusData.backupCodesRemaining + " backup code" + (statusData.backupCodesRemaining !== 1 ? "s" : "") + " remaining"
                    : "Add an extra layer of security to your account"
                  }
                </div>
              </div>
            </div>

            {/* Status indicator bar */}
            <div style={{
              height: 4,
              borderRadius: 2,
              background: isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.06)",
              marginBottom: 20,
              overflow: "hidden",
            }}>
              <div style={{
                width: isEnabled ? "100%" : "0%",
                height: "100%",
                borderRadius: 2,
                background: isEnabled ? (isLight ? "#059669" : "#5DE5A8") : accentColor,
                transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
              }} />
            </div>

            {!isEnabled && (
              <button
                style={primaryBtn}
                disabled={setupMutation.isPending}
                onClick={function () { setupMutation.mutate(); }}
                onMouseEnter={function (e) { e.currentTarget.style.background = "rgba(139,92,246,0.3)"; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = "rgba(139,92,246,0.2)"; }}
              >
                {setupMutation.isPending
                  ? <Loader size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                  : <Shield size={16} strokeWidth={2} />
                }
                {setupMutation.isPending ? "Setting up..." : "Enable Two-Factor Authentication"}
              </button>
            )}

            {isEnabled && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  style={secondaryBtn}
                  disabled={regenMutation.isPending}
                  onClick={function () { regenMutation.mutate(); }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = isLight ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)"; }}
                >
                  {regenMutation.isPending
                    ? <Loader size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                    : <Key size={16} strokeWidth={2} />
                  }
                  {regenMutation.isPending ? "Generating..." : "Regenerate Backup Codes"}
                </button>
                <button
                  style={dangerBtn}
                  onClick={function () { setShowDisable(true); setDisableCode(""); }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = "rgba(246,154,154,0.12)"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = "rgba(246,154,154,0.06)"; }}
                >
                  <AlertTriangle size={16} strokeWidth={2} />
                  Disable Two-Factor Authentication
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
       *  SETUP STEP — Show secret + QR URI
       * ═══════════════════════════════════════════════════════════ */}
      {step === "setup" && (
        <div style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s",
        }}>
          <div style={glassCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(139,92,246,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Key size={20} color={accentColor} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: textColor, fontFamily: "'Inter', sans-serif" }}>
                  Setup Authenticator
                </div>
                <div style={{ fontSize: 12, color: textSecondary, fontFamily: "'Inter', sans-serif" }}>
                  Scan the QR code or enter the key manually
                </div>
              </div>
            </div>

            {/* QR Code image */}
            {qrUri && (
              <div style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 16,
              }}>
                <div style={{
                  padding: 12,
                  borderRadius: 16,
                  background: "#fff",
                }}>
                  <img
                    src={qrUri}
                    alt="2FA QR Code"
                    style={{
                      width: 200,
                      height: 200,
                      display: "block",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Secret key */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: textSecondary, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
                Secret Key
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: isLight ? "rgba(139,92,246,0.04)" : "rgba(255,255,255,0.03)",
                border: isLight ? "1px solid rgba(139,92,246,0.1)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: "12px 16px",
              }}>
                <span style={{
                  flex: 1,
                  fontSize: 14,
                  fontFamily: "monospace",
                  fontWeight: 600,
                  color: accentColor,
                  letterSpacing: "0.1em",
                  wordBreak: "break-all",
                }}>
                  {secret}
                </span>
                <button
                  className="dp-ib"
                  aria-label="Copy secret"
                  onClick={handleCopySecret}
                  style={{ flexShrink: 0, width: 36, height: 36 }}
                >
                  {copiedSecret
                    ? <Check size={16} color={isLight ? "#059669" : "#5DE5A8"} strokeWidth={2} />
                    : <Copy size={16} strokeWidth={2} />
                  }
                </button>
              </div>
            </div>

            {/* TOTP code input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: textSecondary, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>
                Enter the 6-digit code from your authenticator app
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={function (e) {
                  var val = e.target.value.replace(/[^0-9]/g, "");
                  if (val.length <= 6) setTotpCode(val);
                }}
                style={{
                  ...inputStyle,
                  letterSpacing: "0.3em",
                  textAlign: "center",
                  fontSize: 20,
                  fontWeight: 600,
                }}
                autoFocus
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={secondaryBtn}
                onClick={function () {
                  setStep("idle");
                  setSecret("");
                  setQrUri("");
                  setTotpCode("");
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  ...primaryBtn,
                  opacity: totpCode.length === 6 ? 1 : 0.4,
                  cursor: totpCode.length === 6 ? "pointer" : "not-allowed",
                }}
                disabled={totpCode.length !== 6 || verifyMutation.isPending}
                onClick={function () { verifyMutation.mutate(); }}
              >
                {verifyMutation.isPending
                  ? <Loader size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                  : <Check size={16} strokeWidth={2} />
                }
                {verifyMutation.isPending ? "Verifying..." : "Verify & Enable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
       *  BACKUP CODES
       * ═══════════════════════════════════════════════════════════ */}
      {step === "backupCodes" && backupCodes.length > 0 && (
        <div style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s",
        }}>
          <div style={glassCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(252,211,77,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <AlertTriangle size={20} color={isLight ? "#B45309" : "#FCD34D"} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: textColor, fontFamily: "'Inter', sans-serif" }}>
                  Save Your Backup Codes
                </div>
                <div style={{ fontSize: 12, color: textSecondary, fontFamily: "'Inter', sans-serif" }}>
                  Store these in a safe place. Each code can only be used once.
                </div>
              </div>
            </div>

            {/* Codes block */}
            <div style={{
              background: isLight ? "rgba(26,21,53,0.03)" : "rgba(255,255,255,0.03)",
              border: isLight ? "1px solid rgba(139,92,246,0.1)" : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
              fontFamily: "monospace",
              fontSize: 14,
              lineHeight: 2,
              color: textColor,
              textAlign: "center",
              letterSpacing: "0.05em",
            }}>
              {backupCodes.map(function (code, i) {
                return <div key={i}>{code}</div>;
              })}
            </div>

            {/* Copy button */}
            <button
              style={{ ...secondaryBtn, marginBottom: 12 }}
              onClick={handleCopyCodes}
            >
              {copiedCodes
                ? <Check size={16} color={isLight ? "#059669" : "#5DE5A8"} strokeWidth={2} />
                : <Copy size={16} strokeWidth={2} />
              }
              {copiedCodes ? "Copied!" : "Copy All Codes"}
            </button>

            {/* Done */}
            <button
              style={primaryBtn}
              onClick={function () {
                setStep("idle");
                setBackupCodes([]);
                setSecret("");
                setQrUri("");
                setTotpCode("");
              }}
              onMouseEnter={function (e) { e.currentTarget.style.background = "rgba(139,92,246,0.3)"; }}
              onMouseLeave={function (e) { e.currentTarget.style.background = "rgba(139,92,246,0.2)"; }}
            >
              <Check size={16} strokeWidth={2} />
              Done
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
       *  DISABLE 2FA DIALOG (modal overlay)
       * ═══════════════════════════════════════════════════════════ */}
      {showDisable && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div
            onClick={function () { setShowDisable(false); setDisableCode(""); }}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />
          <div style={{
            position: "relative",
            width: "90%",
            maxWidth: 380,
            background: isLight ? "rgba(255,255,255,0.97)" : "rgba(12,8,26,0.97)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            borderRadius: 22,
            border: "1px solid rgba(246,154,154,0.15)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            padding: 24,
            animation: "dpFS 0.25s ease-out",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(239,68,68,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <AlertTriangle size={20} color="rgba(239,68,68,0.8)" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: textColor, fontFamily: "'Inter', sans-serif" }}>
                  Disable 2FA
                </div>
                <div style={{ fontSize: 12, color: textSecondary, fontFamily: "'Inter', sans-serif" }}>
                  This will remove the extra security layer
                </div>
              </div>
            </div>

            <div style={{
              fontSize: 13,
              color: isLight ? "rgba(26,21,53,0.6)" : "rgba(255,255,255,0.85)",
              lineHeight: 1.5,
              marginBottom: 16,
              fontFamily: "'Inter', sans-serif",
            }}>
              Enter your current authenticator code to confirm disabling two-factor authentication.
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={function (e) {
                var val = e.target.value.replace(/[^0-9]/g, "");
                if (val.length <= 6) setDisableCode(val);
              }}
              autoFocus
              style={{
                ...inputStyle,
                letterSpacing: "0.3em",
                textAlign: "center",
                fontSize: 20,
                fontWeight: 600,
                marginBottom: 14,
              }}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={function () { setShowDisable(false); setDisableCode(""); }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 12,
                  border: isLight ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(255,255,255,0.08)",
                  background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
                  color: isLight ? "rgba(26,21,53,0.9)" : "rgba(255,255,255,0.85)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                disabled={!disableCode || disableMutation.isPending}
                onClick={function () { disableMutation.mutate(); }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: disableCode ? "rgba(239,68,68,0.2)" : (isLight ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.03)"),
                  color: disableCode ? "rgba(239,68,68,0.9)" : (isLight ? "rgba(26,21,53,0.3)" : "rgba(255,255,255,0.2)"),
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: disableCode ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Inline keyframes ──────────────────────────────────── */}
      <style>{"\
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}\
        @keyframes dpFS{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}\
        [data-theme=\"light\"] input::placeholder,\
        [data-theme=\"light\"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}\
      "}</style>
    </PageLayout>
  );
}
