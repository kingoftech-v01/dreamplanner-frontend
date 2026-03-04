import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../services/api";
import { USERS } from "../../services/endpoints";
import GlassCard from "./GlassCard";
import {
  X, ChevronRight, Sparkles, Target, Timer,
  CheckCircle, MessageCircle, RefreshCw, ArrowRight,
} from "lucide-react";

/* ===================================================================
 * AccountabilityCheckin — AI-powered check-in card for the HomeScreen.
 *
 * Fetches a personalized accountability check-in from the backend,
 * displays it in a glassmorphism card with:
 *   - AI check-in message
 *   - Quick action chips
 *   - Suggested questions (open AI chat)
 *   - Dismissable (stores dismissal in local state for the day)
 *   - Visual style varies by prompt_type
 *
 * Props:
 *   showWhenInactiveToday — if true, only shows when user hasn't
 *                           been active today (controlled by parent)
 * =================================================================== */

var PROMPT_STYLES = {
  celebration: {
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(52,211,153,0.08) 50%, rgba(110,231,183,0.05) 100%)",
    accentColor: "#10B981",
    accentBg: "rgba(16,185,129,0.12)",
    accentBorder: "rgba(16,185,129,0.20)",
    chipBg: "rgba(16,185,129,0.10)",
    chipBorder: "rgba(16,185,129,0.18)",
    chipColor: "#10B981",
    emoji: "\uD83C\uDF89",
    barGradient: "linear-gradient(90deg, #10B981, #34D399, #6EE7B7)",
  },
  gentle_nudge: {
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(251,191,36,0.08) 50%, rgba(252,211,77,0.05) 100%)",
    accentColor: "#F59E0B",
    accentBg: "rgba(245,158,11,0.12)",
    accentBorder: "rgba(245,158,11,0.20)",
    chipBg: "rgba(245,158,11,0.10)",
    chipBorder: "rgba(245,158,11,0.18)",
    chipColor: "#F59E0B",
    emoji: "\uD83D\uDC4B",
    barGradient: "linear-gradient(90deg, #F59E0B, #FBBF24, #FCD34D)",
  },
  progress_check: {
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(167,139,250,0.08) 50%, rgba(59,130,246,0.05) 100%)",
    accentColor: "#8B5CF6",
    accentBg: "rgba(139,92,246,0.12)",
    accentBorder: "rgba(139,92,246,0.20)",
    chipBg: "rgba(139,92,246,0.10)",
    chipBorder: "rgba(139,92,246,0.18)",
    chipColor: "#8B5CF6",
    emoji: "\uD83D\uDCCA",
    barGradient: "linear-gradient(90deg, #8B5CF6, #A78BFA, #3B82F6)",
  },
  re_engagement: {
    gradient: "linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(244,114,182,0.08) 50%, rgba(251,146,60,0.05) 100%)",
    accentColor: "#EC4899",
    accentBg: "rgba(236,72,153,0.12)",
    accentBorder: "rgba(236,72,153,0.20)",
    chipBg: "rgba(236,72,153,0.10)",
    chipBorder: "rgba(236,72,153,0.18)",
    chipColor: "#EC4899",
    emoji: "\uD83D\uDC96",
    barGradient: "linear-gradient(90deg, #EC4899, #F472B6, #FB923C)",
  },
};

var ACTION_ICONS = {
  complete_task: CheckCircle,
  start_focus: Timer,
  update_dream: Target,
  open_chat: MessageCircle,
};

export default function AccountabilityCheckin() {
  var navigate = useNavigate();
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [dismissed, setDismissed] = useState(false);
  var [fadeIn, setFadeIn] = useState(false);

  // Check if dismissed today
  useEffect(function () {
    var today = new Date().toISOString().slice(0, 10);
    var stored = localStorage.getItem("dp-checkin-dismissed");
    if (stored === today) {
      setDismissed(true);
      setLoading(false);
    }
  }, []);

  // Fetch check-in data
  useEffect(function () {
    if (dismissed) return;

    apiGet(USERS.CHECK_IN)
      .then(function (res) {
        setData(res);
        setLoading(false);
        setTimeout(function () { setFadeIn(true); }, 50);
      })
      .catch(function (err) {
        // 429 or other error — just hide the card silently
        setError(err);
        setLoading(false);
      });
  }, [dismissed]);

  function handleDismiss() {
    var today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("dp-checkin-dismissed", today);
    setDismissed(true);
  }

  function handleQuickAction(action) {
    var type = action.type || action.action_type;
    if (type === "complete_task" && action.target_id) {
      navigate("/dream/task/" + action.target_id);
    } else if (type === "start_focus") {
      navigate("/focus");
    } else if (type === "update_dream" && action.target_id) {
      navigate("/dream/" + action.target_id);
    } else if (type === "open_chat") {
      navigate("/chat");
    } else {
      navigate("/");
    }
  }

  function handleSuggestedQuestion(question) {
    // Navigate to AI chat with the question pre-filled via query param
    navigate("/chat?q=" + encodeURIComponent(question));
  }

  function handleRefresh() {
    setLoading(true);
    setFadeIn(false);
    setError(null);
    apiGet(USERS.CHECK_IN)
      .then(function (res) {
        setData(res);
        setLoading(false);
        setTimeout(function () { setFadeIn(true); }, 50);
      })
      .catch(function (err) {
        setError(err);
        setLoading(false);
      });
  }

  // Don't render if dismissed, errored, or still loading with no data
  if (dismissed) return null;
  if (error) return null;
  if (loading) {
    return (
      <GlassCard padding={0} mb={20} style={{ overflow: "hidden", position: "relative" }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit",
          background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.04) 100%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(139,92,246,0.10)",
              animation: "dpPulse 1.5s ease-in-out infinite",
            }} />
            <div style={{ flex: 1 }}>
              <div style={{
                height: 14, width: "60%", borderRadius: 4,
                background: "var(--dp-glass-border)",
                marginBottom: 6,
              }} />
              <div style={{
                height: 10, width: "40%", borderRadius: 4,
                background: "var(--dp-glass-border)",
              }} />
            </div>
          </div>
          <div style={{
            height: 48, borderRadius: 8,
            background: "var(--dp-glass-border)",
          }} />
        </div>
      </GlassCard>
    );
  }

  if (!data || !data.checkin) return null;

  var checkin = data.checkin;
  var context = data.context || {};
  var promptType = checkin.prompt_type || "progress_check";
  var style = PROMPT_STYLES[promptType] || PROMPT_STYLES.progress_check;
  var suggestedQuestions = checkin.suggested_questions || [];
  var quickActions = checkin.quick_actions || [];

  return (
    <GlassCard padding={0} mb={20} style={{
      overflow: "hidden",
      position: "relative",
      opacity: fadeIn ? 1 : 0,
      transform: fadeIn ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
    }}>
      {/* Gradient accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: style.barGradient,
        borderRadius: "22px 22px 0 0",
      }} />

      {/* Background gradient */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: style.gradient,
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", padding: 20 }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: style.accentBg,
              border: "1px solid " + style.accentBorder,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>
              {style.emoji}
            </div>
            <div>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: "var(--dp-text)",
                letterSpacing: "-0.2px",
              }}>
                Accountability Check-in
              </div>
              <div style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>
                {promptType === "celebration" && "Way to go!"}
                {promptType === "gentle_nudge" && "Just checking in"}
                {promptType === "progress_check" && "How are things going?"}
                {promptType === "re_engagement" && "We miss you!"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button onClick={handleRefresh} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 4, borderRadius: 8, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <RefreshCw size={14} color="var(--dp-text-muted)" strokeWidth={2} />
            </button>
            <button onClick={handleDismiss} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 4, borderRadius: 8, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <X size={16} color="var(--dp-text-muted)" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* AI Message */}
        <div style={{
          fontSize: 14, lineHeight: 1.6,
          color: "var(--dp-text)",
          marginBottom: 16,
          padding: "12px 14px",
          borderRadius: 12,
          background: "var(--dp-surface)",
          border: "1px solid var(--dp-glass-border)",
        }}>
          {checkin.message}
        </div>

        {/* Context stats row */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 16,
          flexWrap: "wrap",
        }}>
          {context.streak_days > 0 && (
            <div style={{
              padding: "4px 10px", borderRadius: 20,
              background: style.chipBg,
              border: "1px solid " + style.chipBorder,
              fontSize: 11, fontWeight: 600, color: style.chipColor,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {"\uD83D\uDD25"} {context.streak_days} day streak
            </div>
          )}
          {context.pending_tasks > 0 && (
            <div style={{
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(59,130,246,0.10)",
              border: "1px solid rgba(59,130,246,0.18)",
              fontSize: 11, fontWeight: 600, color: "#3B82F6",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {context.pending_tasks} task{context.pending_tasks !== 1 ? "s" : ""} pending
            </div>
          )}
          {context.active_dreams > 0 && (
            <div style={{
              padding: "4px 10px", borderRadius: 20,
              background: "rgba(139,92,246,0.10)",
              border: "1px solid rgba(139,92,246,0.18)",
              fontSize: 11, fontWeight: 600, color: "#8B5CF6",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {context.active_dreams} active dream{context.active_dreams !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: "var(--dp-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}>
              Quick Actions
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {quickActions.map(function (action, i) {
                var ActionIcon = ACTION_ICONS[action.type] || Sparkles;
                return (
                  <button
                    key={i}
                    onClick={function () { handleQuickAction(action); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", borderRadius: 20,
                      background: style.chipBg,
                      border: "1px solid " + style.chipBorder,
                      color: style.chipColor,
                      fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      fontFamily: "inherit",
                    }}
                  >
                    <ActionIcon size={14} strokeWidth={2} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: "var(--dp-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}>
              Ask your AI coach
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {suggestedQuestions.map(function (question, i) {
                return (
                  <button
                    key={i}
                    onClick={function () { handleSuggestedQuestion(question); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 14px", borderRadius: 12,
                      background: "var(--dp-surface)",
                      border: "1px solid var(--dp-glass-border)",
                      color: "var(--dp-text)",
                      fontSize: 13, fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      textAlign: "left",
                      fontFamily: "inherit",
                      width: "100%",
                    }}
                  >
                    <MessageCircle size={14} color={style.accentColor} strokeWidth={2} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, lineHeight: 1.4 }}>{question}</span>
                    <ArrowRight size={14} color="var(--dp-text-muted)" strokeWidth={2} style={{ flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
