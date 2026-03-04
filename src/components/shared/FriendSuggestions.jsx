import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { SOCIAL } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { adaptColor, BRAND, GRADIENTS } from "../../styles/colors";
import Avatar from "./Avatar";
import GlassCard from "./GlassCard";
import {
  UserPlus, X, Users, Sparkles, Check,
} from "lucide-react";

/* ===================================================================
 * DreamPlanner -- Friend Suggestions
 *
 * Horizontal scrollable card row showing smart friend suggestions.
 * Features:
 * - Avatar, name, level, mutual friend count, shared interests
 * - "Add Friend" button with optimistic UI
 * - "Dismiss" (X) button with slide-out animation
 * - Fetches from /api/social/friend-suggestions/
 * =================================================================== */

var CARD_COLORS = [
  "#8B5CF6", "#EC4899", "#3B82F6", "#F59E0B", "#14B8A6",
  "#10B981", "#6366F1", "#EF4444", "#06B6D4", "#D946EF",
];

var CAT_LABELS = {
  health: "Health", career: "Career", relationships: "Relationships",
  personal: "Personal Growth", finance: "Finance", hobbies: "Hobbies",
  education: "Education", creative: "Creative", social: "Social",
  travel: "Travel",
};


export default function FriendSuggestions() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { showToast } = useToast();
  var qc = useQueryClient();
  var scrollRef = useRef(null);

  var [dismissed, setDismissed] = useState({});
  var [dismissing, setDismissing] = useState({});
  var [sent, setSent] = useState({});

  // ── Fetch suggestions ───────────────────────────────────────
  var suggestionsQ = useQuery({
    queryKey: ["friend-suggestions"],
    queryFn: function () { return apiGet(SOCIAL.FRIEND_SUGGESTIONS); },
    staleTime: 1000 * 60 * 30, // 30 min client-side stale time
  });

  var suggestions = suggestionsQ.data || [];
  if (!Array.isArray(suggestions)) suggestions = [];

  // Filter out dismissed suggestions
  var visible = suggestions.filter(function (s) {
    return !dismissed[s.user.id];
  });

  // ── Send friend request (optimistic) ────────────────────────
  function handleAddFriend(userId) {
    // Optimistic update
    setSent(function (p) { return Object.assign({}, p, { [userId]: true }); });

    apiPost(SOCIAL.FRIENDS.REQUEST, { target_user_id: userId }).then(function () {
      showToast("Friend request sent!", "success");
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    }).catch(function (err) {
      showToast(err.userMessage || err.message || "Failed to send request", "error");
      setSent(function (p) {
        var n = Object.assign({}, p);
        delete n[userId];
        return n;
      });
    });
  }

  // ── Dismiss (slide out) ────────────────────────────────────
  function handleDismiss(userId) {
    setDismissing(function (p) { return Object.assign({}, p, { [userId]: true }); });
    // After animation completes, remove from visible
    setTimeout(function () {
      setDismissed(function (p) { return Object.assign({}, p, { [userId]: true }); });
      setDismissing(function (p) {
        var n = Object.assign({}, p);
        delete n[userId];
        return n;
      });
    }, 300);
  }

  // Don't render if no suggestions
  if (suggestionsQ.isLoading || visible.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={15} color="var(--dp-accent)" strokeWidth={2.5} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}>
            People You May Know
          </span>
        </div>
        <span style={{
          fontSize: 12, color: "var(--dp-text-tertiary)",
        }}>
          {visible.length} suggestion{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        style={{
          display: "flex", gap: 10, overflowX: "auto",
          padding: "0 16px 4px", scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {visible.map(function (suggestion, idx) {
          var u = suggestion.user;
          var isSent = sent[u.id];
          var isDismissing = dismissing[u.id];
          var cardColor = CARD_COLORS[idx % CARD_COLORS.length];
          var adaptedColor = adaptColor(cardColor, isLight);

          return (
            <div
              key={u.id}
              style={{
                minWidth: 200, maxWidth: 220, flexShrink: 0,
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                opacity: isDismissing ? 0 : 1,
                transform: isDismissing ? "translateY(20px) scale(0.9)" : "translateY(0) scale(1)",
              }}
            >
              <GlassCard padding={0} style={{
                overflow: "hidden", position: "relative",
                border: "1px solid " + cardColor + "18",
              }}>
                {/* Dismiss button */}
                <button
                  onClick={function (e) { e.stopPropagation(); handleDismiss(u.id); }}
                  aria-label="Dismiss suggestion"
                  style={{
                    position: "absolute", top: 8, right: 8, zIndex: 2,
                    width: 24, height: 24, borderRadius: "50%",
                    background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)",
                    WebkitBackdropFilter: "blur(4px)",
                    border: "none", display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: "pointer", padding: 0,
                  }}
                >
                  <X size={13} color="#fff" strokeWidth={2.5} />
                </button>

                {/* Gradient accent header */}
                <div style={{
                  height: 48,
                  background: "linear-gradient(135deg, " + cardColor + "20, " + cardColor + "08)",
                }} />

                {/* Card body */}
                <div style={{ padding: "0 14px 14px", marginTop: -26 }}>
                  {/* Avatar */}
                  <div
                    onClick={function () { navigate("/user/" + u.id); }}
                    style={{ cursor: "pointer", marginBottom: 8 }}
                  >
                    <Avatar
                      name={u.displayName}
                      size={52}
                      color={cardColor}
                      src={u.avatar}
                    />
                  </div>

                  {/* Name + Level */}
                  <div
                    onClick={function () { navigate("/user/" + u.id); }}
                    style={{ cursor: "pointer", marginBottom: 6 }}
                  >
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: "var(--dp-text)",
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", maxWidth: "100%",
                    }}>
                      {u.displayName}
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6, marginTop: 2,
                    }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: adaptedColor,
                        padding: "1px 6px", borderRadius: 6,
                        background: cardColor + "12",
                      }}>
                        Lv.{u.level}
                      </span>
                      <span style={{
                        fontSize: 11, color: "var(--dp-text-tertiary)",
                      }}>
                        {u.title}
                      </span>
                    </div>
                  </div>

                  {/* Mutual friends */}
                  {suggestion.mutualFriendCount > 0 && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      marginBottom: 6, fontSize: 11, color: "var(--dp-text-secondary)",
                    }}>
                      <Users size={12} color="var(--dp-text-tertiary)" strokeWidth={2} />
                      <span>
                        {suggestion.mutualFriendCount} mutual friend{suggestion.mutualFriendCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Shared categories */}
                  {suggestion.sharedCategories && suggestion.sharedCategories.length > 0 && (
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8,
                    }}>
                      {suggestion.sharedCategories.slice(0, 2).map(function (cat) {
                        return (
                          <span key={cat} style={{
                            padding: "2px 7px", borderRadius: 6,
                            background: cardColor + "0A",
                            border: "1px solid " + cardColor + "15",
                            fontSize: 10, fontWeight: 500,
                            color: adaptedColor,
                          }}>
                            {CAT_LABELS[cat] || cat}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Reason tag (first reason) */}
                  {suggestion.reasons && suggestion.reasons.length > 0 && (
                    <div style={{
                      fontSize: 10, color: "var(--dp-text-muted)",
                      marginBottom: 10, lineHeight: 1.3,
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {suggestion.reasons[0]}
                    </div>
                  )}

                  {/* Add Friend / Sent button */}
                  {isSent ? (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 5, padding: "8px 0", borderRadius: 10,
                      background: "rgba(93,229,168,0.08)",
                      border: "1px solid rgba(93,229,168,0.15)",
                    }}>
                      <Check size={14} color="var(--dp-success)" strokeWidth={2.5} />
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: "var(--dp-success)",
                      }}>
                        Sent
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={function (e) { e.stopPropagation(); handleAddFriend(u.id); }}
                      style={{
                        width: "100%", padding: "8px 0", borderRadius: 10,
                        border: "none", cursor: "pointer",
                        background: GRADIENTS.primary,
                        color: BRAND.white,
                        fontSize: 12, fontWeight: 600,
                        display: "flex", alignItems: "center",
                        justifyContent: "center", gap: 5,
                        fontFamily: "inherit",
                        boxShadow: "0 4px 12px rgba(139,92,246,0.25)",
                        transition: "all 0.2s",
                      }}
                    >
                      <UserPlus size={14} strokeWidth={2} />
                      Add Friend
                    </button>
                  )}
                </div>
              </GlassCard>
            </div>
          );
        })}
      </div>

      <style>{`
        [data-friend-scroll]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
