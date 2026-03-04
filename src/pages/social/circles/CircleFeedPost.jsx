import { useState } from "react";
import Avatar from "../../../components/shared/Avatar";
import { getAvatarEquipProps } from "../../../utils/equippedItems";
import GlassCard from "../../../components/shared/GlassCard";
import ExpandableText from "../../../components/shared/ExpandableText";
import PollCard from "../../../components/shared/PollCard";
import { Heart, Flame, Star, MoreVertical, Edit3, Trash2 } from "lucide-react";
import { sanitizeText } from "../../../utils/sanitize";

// All 4 reaction types supported by the backend
var REACTIONS = [
  { type: "heart", Icon: Heart, color: "#EF4444", fill: true },
  { type: "fire", Icon: Flame, color: "#FB923C", fill: false },
  { type: "clap", emoji: "\uD83D\uDC4F", color: "#FCD34D" },
  { type: "star", Icon: Star, color: "#FCD34D", fill: true },
];

function timeAgo(ds) {
  if (!ds) return "";
  var s = Math.floor((Date.now() - new Date(ds).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

export default function CircleFeedPost({ post, userId, onReact, onEdit, onDelete, onVote, votingPostId }) {
  var [showMenu, setShowMenu] = useState(false);
  var author = post.author || post.user || {};
  var authorName = author.username || author.displayName || author.name || "Member";
  var isOwn = String(author.id) === String(userId);
  var reactions = post.reactions || {};
  var myReactions = post.myReactions || post.my_reactions || [];

  return (
    <GlassCard padding={16} mb={10}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Avatar src={author.avatar} name={authorName} size={36} {...getAvatarEquipProps(author)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{authorName}</div>
          <div style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>{timeAgo(post.createdAt || post.created_at)}</div>
        </div>
        {isOwn && (
          <div style={{ position: "relative" }}>
            <button onClick={function () { setShowMenu(!showMenu); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--dp-text-muted)" }}>
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div onClick={function () { setShowMenu(false); }} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
                <div style={{
                  position: "absolute", top: "100%", right: 0, zIndex: 99,
                  background: "var(--dp-modal-bg)", border: "1px solid var(--dp-glass-border)",
                  borderRadius: 12, padding: 4, minWidth: 120, boxShadow: "0 8px 24px var(--dp-shadow)",
                }}>
                  <button onClick={function () { setShowMenu(false); onEdit && onEdit(post); }} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px",
                    background: "none", border: "none", borderRadius: 8, cursor: "pointer",
                    color: "var(--dp-text)", fontSize: 13, fontFamily: "inherit",
                  }}>
                    <Edit3 size={14} /> Edit
                  </button>
                  <button onClick={function () { setShowMenu(false); onDelete && onDelete(post); }} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px",
                    background: "none", border: "none", borderRadius: 8, cursor: "pointer",
                    color: "var(--dp-danger-solid)", fontSize: 13, fontFamily: "inherit",
                  }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {post.content && (
        <ExpandableText text={sanitizeText(post.content)} maxLines={5} style={{ fontSize: 14, lineHeight: 1.55, color: "var(--dp-text)", marginBottom: 8 }} />
      )}

      {/* Poll (if attached) */}
      {post.poll && (
        <PollCard
          poll={post.poll}
          onVote={function (optionIds) { onVote && onVote(post.id, optionIds); }}
          isSubmitting={votingPostId === post.id}
        />
      )}

      {/* Reaction buttons — all 4 types */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 8, borderTop: "1px solid var(--dp-divider)" }}>
        {REACTIONS.map(function (r) {
          var count = reactions[r.type] || 0;
          var isActive = myReactions.indexOf(r.type) >= 0;
          // Fallback: legacy liked field for heart
          if (r.type === "heart" && !isActive && (post.hasLiked || post.has_liked)) isActive = true;
          if (r.type === "heart" && count === 0) count = post.likesCount || post.likes_count || 0;

          return (
            <button key={r.type} onClick={function () { onReact && onReact(post.id, r.type); }} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 10,
              background: isActive ? r.color + "12" : "transparent",
              border: isActive ? "1px solid " + r.color + "25" : "1px solid transparent",
              cursor: "pointer", color: isActive ? r.color : "var(--dp-text-muted)",
              fontSize: 13, fontWeight: 500, fontFamily: "inherit", transition: "all 0.2s",
            }}>
              {r.emoji ? (
                <span style={{ fontSize: 14 }}>{r.emoji}</span>
              ) : (
                <r.Icon size={15} fill={isActive && r.fill ? r.color : "none"} strokeWidth={1.8} />
              )}
              {count > 0 && <span style={{ fontSize: 12 }}>{count}</span>}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
