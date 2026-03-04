import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../services/api";
import { USERS } from "../../services/endpoints";
import { clipboardWrite } from "../../services/native";
import { useToast } from "../../context/ToastContext";
import GlassCard from "./GlassCard";
import { Quote, Share2, Sparkles } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DailyQuote — Motivational quote widget for the home dashboard.
 *
 * Fetches the daily quote from the backend (rotates by day-of-year).
 * Glass-morphism card with subtle gradient, italic quote text,
 * author attribution, and a share-to-clipboard button.
 * ═══════════════════════════════════════════════════════════════════ */

export default function DailyQuote() {
  var { showToast } = useToast();

  var quoteQuery = useQuery({
    queryKey: ["daily-quote"],
    queryFn: function () { return apiGet(USERS.DAILY_QUOTE); },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
  });

  var data = quoteQuery.data;

  var handleShare = function (e) {
    e.stopPropagation();
    if (!data) return;
    var text = '"' + data.quote + '" — ' + data.author;
    clipboardWrite(text).then(function () {
      showToast("Quote copied!", "success");
    });
  };

  // Don't render anything while loading or on error
  if (quoteQuery.isLoading || quoteQuery.isError || !data) return null;

  return (
    <GlassCard padding={0} mb={20} style={{ overflow: "hidden" }}>
      {/* Gradient background layer */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(236,72,153,0.06) 50%, rgba(20,184,166,0.05) 100%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", padding: 20 }}>
        {/* Header row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 14,
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
              Daily Inspiration
            </span>
          </div>

          <button
            onClick={handleShare}
            aria-label="Share quote"
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
            <Share2 size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Quote icon */}
        <div style={{ marginBottom: 8 }}>
          <Quote size={20} color="rgba(139,92,246,0.25)" strokeWidth={2} />
        </div>

        {/* Quote text */}
        <p style={{
          fontSize: 15, fontWeight: 500,
          fontStyle: "italic",
          color: "var(--dp-text)",
          lineHeight: 1.65,
          margin: "0 0 12px",
        }}>
          {data.quote}
        </p>

        {/* Author */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 20, height: 1,
            background: "var(--dp-divider)",
          }} />
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: "var(--dp-text-secondary)",
          }}>
            {data.author}
          </span>
          {data.category && (
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: "var(--dp-text-muted)",
              padding: "2px 8px",
              borderRadius: 6,
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.1)",
              textTransform: "capitalize",
            }}>
              {data.category}
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
