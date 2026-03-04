import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { CALENDAR, DREAMS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { Shield, X, Play, Clock } from "lucide-react";
import { BRAND } from "../../styles/colors";
import GlassModal from "./GlassModal";
import GradientButton from "./GradientButton";

/* ═══════════════════════════════════════════════════════════════════
 * FocusModeWidget — Floating focus indicator + Quick Focus launcher
 *
 * Shows a glassmorphic pill when user is in a focus block.
 * Also provides Quick Focus modal for starting immediate sessions.
 * ═══════════════════════════════════════════════════════════════════ */

var DURATION_OPTIONS = [
  { label: "25 min", value: 25 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
];

export default function FocusModeWidget(props) {
  var quickFocusOpen = props.quickFocusOpen || false;
  var onCloseQuickFocus = props.onCloseQuickFocus || function () {};
  var onFocusStarted = props.onFocusStarted || function () {};

  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();

  var [selectedDuration, setSelectedDuration] = useState(25);
  var [customDuration, setCustomDuration] = useState("");
  var [useCustom, setUseCustom] = useState(false);
  var [countdown, setCountdown] = useState(null);
  var [sessionId, setSessionId] = useState(null);
  var timerRef = useRef(null);

  // ── Poll focus mode status ──
  var focusQuery = useQuery({
    queryKey: ["focus-mode-active"],
    queryFn: function () { return apiGet(CALENDAR.FOCUS_MODE_ACTIVE); },
    refetchInterval: 30000, // Poll every 30s
    staleTime: 15000,
  });

  var focusData = focusQuery.data || {};
  var isFocusActive = focusData.focus_active || false;
  var remainingMinutes = focusData.remaining_minutes || 0;
  var focusSource = focusData.source || null;
  var activeSessionId = focusData.session_id || sessionId;

  // ── Countdown timer ──
  useEffect(function () {
    if (isFocusActive && remainingMinutes > 0) {
      setCountdown(remainingMinutes * 60);
    } else if (!isFocusActive && !sessionId) {
      setCountdown(null);
    }
  }, [isFocusActive, remainingMinutes]);

  useEffect(function () {
    if (countdown === null || countdown <= 0) return;
    timerRef.current = setInterval(function () {
      setCountdown(function (prev) {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Session ended naturally
          queryClient.invalidateQueries({ queryKey: ["focus-mode-active"] });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return function () { clearInterval(timerRef.current); };
  }, [countdown !== null]);

  // ── Format countdown ──
  function formatTime(totalSeconds) {
    if (!totalSeconds || totalSeconds <= 0) return "0:00";
    var mins = Math.floor(totalSeconds / 60);
    var secs = totalSeconds % 60;
    return mins + ":" + String(secs).padStart(2, "0");
  }

  // ── Start focus session mutation ──
  var startFocusMut = useMutation({
    mutationFn: function (params) {
      return apiPost(DREAMS.FOCUS.START, {
        duration_minutes: params.duration,
        session_type: "work",
      });
    },
    onSuccess: function (data) {
      setSessionId(data.id);
      setCountdown(data.duration_minutes * 60);
      queryClient.invalidateQueries({ queryKey: ["focus-mode-active"] });
      onFocusStarted(data);
      showToast("Focus session started", "success");
      onCloseQuickFocus();
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to start focus session", "error");
    },
  });

  // ── End focus session mutation ──
  var endFocusMut = useMutation({
    mutationFn: function (params) {
      return apiPost(DREAMS.FOCUS.COMPLETE, {
        session_id: params.sessionId,
        actual_minutes: params.actualMinutes,
      });
    },
    onSuccess: function () {
      setSessionId(null);
      setCountdown(null);
      clearInterval(timerRef.current);
      queryClient.invalidateQueries({ queryKey: ["focus-mode-active"] });
      showToast("Focus session ended", "info");
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to end session", "error");
    },
  });

  var handleStartFocus = function () {
    var dur = useCustom ? parseInt(customDuration, 10) : selectedDuration;
    if (!dur || dur < 1 || dur > 120) {
      showToast("Duration must be 1-120 minutes", "error");
      return;
    }
    startFocusMut.mutate({ duration: dur });
  };

  var handleEndFocus = function () {
    var sid = activeSessionId;
    if (!sid) {
      // Just clear local state if it was a time-block-based focus
      setCountdown(null);
      setSessionId(null);
      queryClient.invalidateQueries({ queryKey: ["focus-mode-active"] });
      return;
    }
    var totalSecs = countdown || 0;
    var totalDuration = focusData.remaining_minutes ? (focusData.remaining_minutes * 60) : 0;
    var actualMins = Math.max(1, Math.floor((totalDuration - totalSecs) / 60));
    endFocusMut.mutate({ sessionId: sid, actualMinutes: actualMins });
  };

  // ── Animated border pulse via keyframes ──
  var pulseKeyframes = "@keyframes dpFocusPulse{0%{box-shadow:0 0 0 0 rgba(139,92,246,0.4)}70%{box-shadow:0 0 0 8px rgba(139,92,246,0)}100%{box-shadow:0 0 0 0 rgba(139,92,246,0)}}";

  // ── Floating indicator (only when focus is active) ──
  var renderFloatingIndicator = function () {
    if (!isFocusActive && !sessionId) return null;

    return (
      <div style={{
        position: "fixed",
        top: 58,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px 8px 12px",
        borderRadius: 24,
        background: isLight
          ? "rgba(255,255,255,0.85)"
          : "rgba(15,10,30,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(139,92,246,0.3)",
        boxShadow: "0 4px 20px rgba(139,92,246,0.15)",
        animation: "dpFocusPulse 2s infinite",
        transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          background: "rgba(139,92,246,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Shield size={14} color={BRAND.purple} strokeWidth={2.5} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--dp-accent)",
            letterSpacing: "0.3px",
          }}>Focus Mode</span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dp-text-secondary)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {countdown !== null ? formatTime(countdown) + " left" : remainingMinutes + " min left"}
          </span>
        </div>
        <button
          aria-label="End focus session"
          onClick={handleEndFocus}
          style={{
            marginLeft: 4,
            width: 26,
            height: 26,
            borderRadius: 13,
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s",
            fontFamily: "inherit",
          }}
          className="dp-gh"
        >
          <X size={12} color="rgba(239,68,68,0.8)" strokeWidth={2.5} />
        </button>
      </div>
    );
  };

  // ── Quick Focus Modal ──
  var renderQuickFocusModal = function () {
    return (
      <GlassModal open={quickFocusOpen} onClose={onCloseQuickFocus} variant="center" maxWidth={380} title="Quick Focus">
        <div style={{ padding: 24 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "rgba(139,92,246,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Shield size={22} color={BRAND.purple} strokeWidth={2} />
            </div>
            <div>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--dp-text)",
              }}>Start Focus Session</div>
              <div style={{
                fontSize: 12,
                color: "var(--dp-text-secondary)",
                marginTop: 2,
              }}>Block notifications and stay focused</div>
            </div>
          </div>

          {/* Duration picker */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--dp-text-primary)",
              marginBottom: 8,
              display: "block",
            }}>Duration</label>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
            }}>
              {DURATION_OPTIONS.map(function (opt) {
                var isActive = !useCustom && selectedDuration === opt.value;
                return (
                  <button
                    key={opt.value}
                    aria-label={"Set duration to " + opt.label}
                    onClick={function () {
                      setSelectedDuration(opt.value);
                      setUseCustom(false);
                    }}
                    style={{
                      padding: "12px 8px",
                      borderRadius: 12,
                      border: isActive
                        ? "2px solid rgba(139,92,246,0.5)"
                        : "1px solid var(--dp-accent-border)",
                      background: isActive
                        ? "rgba(139,92,246,0.12)"
                        : "var(--dp-glass-bg)",
                      color: isActive
                        ? "var(--dp-accent)"
                        : "var(--dp-text-primary)",
                      fontSize: 14,
                      fontWeight: isActive ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                    className="dp-gh"
                  >
                    <Clock size={14} strokeWidth={2} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom duration */}
          <div style={{ marginBottom: 20 }}>
            <button
              aria-label="Toggle custom duration"
              onClick={function () { setUseCustom(!useCustom); }}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: useCustom ? "var(--dp-accent)" : "var(--dp-text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: useCustom ? 8 : 0,
              }}
            >
              {useCustom ? "- Hide custom" : "+ Custom duration"}
            </button>
            {useCustom && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customDuration}
                  onChange={function (e) { setCustomDuration(e.target.value); }}
                  placeholder="Minutes"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--dp-input-border)",
                    background: "var(--dp-glass-bg)",
                    color: "var(--dp-text)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                <span style={{
                  fontSize: 13,
                  color: "var(--dp-text-muted)",
                  fontWeight: 500,
                }}>min</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onCloseQuickFocus}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 12,
                border: "1px solid var(--dp-input-border)",
                background: "var(--dp-glass-bg)",
                color: "var(--dp-text-primary)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >Cancel</button>
            <GradientButton
              gradient="primaryDark"
              onClick={handleStartFocus}
              disabled={startFocusMut.isPending}
              fullWidth
              style={{ flex: 1, borderRadius: 12, padding: "12px 0", fontSize: 14 }}
            >
              <Play size={14} strokeWidth={2.5} style={{ marginRight: 6 }} />
              Start Focus
            </GradientButton>
          </div>
        </div>
      </GlassModal>
    );
  };

  return (
    <>
      <style>{pulseKeyframes}</style>
      {renderFloatingIndicator()}
      {renderQuickFocusModal()}
    </>
  );
}
