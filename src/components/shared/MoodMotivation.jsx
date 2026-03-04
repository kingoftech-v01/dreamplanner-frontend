import { useState } from "react";
import { apiPost } from "../../services/api";
import { USERS } from "../../services/endpoints";
import GlassCard from "./GlassCard";
import { Sparkles, X, ChevronRight, RefreshCw } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * MoodMotivation — Mood-based AI motivational message generator.
 *
 * Shows a mood selector (7 mood emoji buttons), calls the backend
 * for a personalised motivational message, and displays it in a
 * beautiful glassmorphism card with fade-in animation.
 *
 * Props:
 *   visible   — boolean controlling whether the panel is shown
 *   onClose   — callback to hide the panel
 * ═══════════════════════════════════════════════════════════════════ */

var MOODS = [
  { key: "excited",     emoji: "\uD83E\uDD29", label: "Excited" },
  { key: "motivated",   emoji: "\uD83D\uDCAA", label: "Motivated" },
  { key: "neutral",     emoji: "\uD83D\uDE10", label: "Neutral" },
  { key: "tired",       emoji: "\uD83D\uDE34", label: "Tired" },
  { key: "frustrated",  emoji: "\uD83D\uDE24", label: "Frustrated" },
  { key: "anxious",     emoji: "\uD83D\uDE30", label: "Anxious" },
  { key: "sad",         emoji: "\uD83D\uDE22", label: "Sad" },
];

export default function MoodMotivation({ visible, onClose }) {
  var [selectedMood, setSelectedMood] = useState(null);
  var [loading, setLoading] = useState(false);
  var [result, setResult] = useState(null);
  var [error, setError] = useState(null);
  var [fadeIn, setFadeIn] = useState(false);

  function handleMoodSelect(mood) {
    setSelectedMood(mood.key);
    setResult(null);
    setError(null);
    setLoading(true);
    setFadeIn(false);

    apiPost(USERS.MOTIVATION, { mood: mood.key })
      .then(function (data) {
        setResult(data);
        setLoading(false);
        // Trigger fade-in after a micro-delay so the DOM renders first
        setTimeout(function () { setFadeIn(true); }, 30);
      })
      .catch(function (err) {
        setError(err.userMessage || err.message || "Could not generate motivation. Please try again.");
        setLoading(false);
      });
  }

  function handleReset() {
    setSelectedMood(null);
    setResult(null);
    setError(null);
    setFadeIn(false);
  }

  if (!visible) return null;

  return (
    <GlassCard padding={0} mb={20} style={{ overflow: "hidden", position: "relative" }}>
      {/* Gradient background */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(236,72,153,0.07) 50%, rgba(59,130,246,0.05) 100%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", padding: 20 }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={14} color="var(--dp-accent)" strokeWidth={2.5} />
            </div>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: "var(--dp-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Mood Check-in
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close mood check-in"
            className="dp-gh"
            style={{
              width: 32, height: 32, borderRadius: 10,
              border: "1px solid var(--dp-glass-border)",
              background: "var(--dp-glass-hover)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s",
              color: "var(--dp-text-tertiary)",
              fontFamily: "inherit",
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Mood question */}
        <p style={{
          fontSize: 16, fontWeight: 600,
          color: "var(--dp-text)",
          margin: "0 0 16px",
        }}>
          How are you feeling right now?
        </p>

        {/* Mood picker grid */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          marginBottom: result || loading || error ? 20 : 0,
        }}>
          {MOODS.map(function (mood) {
            var isSelected = selectedMood === mood.key;
            return (
              <button
                key={mood.key}
                onClick={function () { handleMoodSelect(mood); }}
                disabled={loading}
                aria-label={mood.label}
                className="dp-gh"
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: isSelected
                    ? "2px solid var(--dp-accent)"
                    : "1px solid var(--dp-glass-border)",
                  background: isSelected
                    ? "rgba(139,92,246,0.12)"
                    : "var(--dp-glass-hover)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  cursor: loading ? "wait" : "pointer",
                  transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
                  transform: isSelected ? "scale(1.08)" : "scale(1)",
                  opacity: loading && !isSelected ? 0.5 : 1,
                  fontFamily: "inherit",
                  minWidth: 56,
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>{mood.emoji}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: isSelected ? "var(--dp-accent)" : "var(--dp-text-tertiary)",
                }}>{mood.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px 0",
            gap: 10,
          }}>
            <div className="dp-spin" style={{
              width: 20, height: 20,
              border: "2px solid rgba(139,92,246,0.15)",
              borderTopColor: "var(--dp-accent)",
              borderRadius: "50%",
            }} />
            <span style={{
              fontSize: 13, color: "var(--dp-text-secondary)", fontWeight: 500,
            }}>
              Crafting your message...
            </span>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div style={{
            padding: "14px 16px", borderRadius: 12,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.15)",
          }}>
            <p style={{
              fontSize: 13, color: "var(--dp-danger)", margin: 0, lineHeight: 1.5,
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Result card */}
        {result && !loading && (
          <div style={{
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
          }}>
            {/* Large mood emoji */}
            <div style={{
              textAlign: "center",
              fontSize: 48, lineHeight: 1,
              marginBottom: 16,
              filter: "drop-shadow(0 4px 12px rgba(139,92,246,0.2))",
            }}>
              {result.moodEmoji || result.mood_emoji || selectedMood}
            </div>

            {/* Motivational message — quote block */}
            <div style={{
              padding: "16px 18px",
              borderRadius: 14,
              background: "rgba(139,92,246,0.06)",
              borderLeft: "3px solid var(--dp-accent)",
              marginBottom: 14,
            }}>
              <p style={{
                fontSize: 15, fontWeight: 500,
                fontStyle: "italic",
                color: "var(--dp-text)",
                lineHeight: 1.65,
                margin: 0,
              }}>
                {result.message}
              </p>
            </div>

            {/* Affirmation in accent color */}
            <p style={{
              fontSize: 14, fontWeight: 600,
              color: "var(--dp-accent)",
              textAlign: "center",
              margin: "0 0 14px",
              lineHeight: 1.5,
            }}>
              {result.affirmation}
            </p>

            {/* Suggested action chip */}
            {(result.suggestedAction || result.suggested_action) && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(20,184,166,0.08)",
                border: "1px solid rgba(20,184,166,0.15)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}>
                <ChevronRight size={16} color="#14B8A6" strokeWidth={2.5} />
                <span style={{
                  fontSize: 13, fontWeight: 500,
                  color: "var(--dp-text)",
                  flex: 1,
                  lineHeight: 1.4,
                }}>
                  {result.suggestedAction || result.suggested_action}
                </span>
              </div>
            )}

            {/* Try again button */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button
                onClick={handleReset}
                className="dp-gh"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px",
                  borderRadius: 20,
                  border: "1px solid var(--dp-glass-border)",
                  background: "var(--dp-glass-hover)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: 12, fontWeight: 600,
                  color: "var(--dp-text-secondary)",
                  fontFamily: "inherit",
                }}
              >
                <RefreshCw size={12} strokeWidth={2.5} />
                Try a different mood
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS animation for the spinner */}
      <style>{"\n        @keyframes dpSpin { to { transform: rotate(360deg); } }\n        .dp-spin { animation: dpSpin 0.8s linear infinite; }\n      "}</style>
    </GlassCard>
  );
}
