import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { SOCIAL } from "../../services/endpoints";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import PageLayout from "../../components/shared/PageLayout";
import { SkeletonCard } from "../../components/shared/Skeleton";
import GlassCard from "../../components/shared/GlassCard";
import Avatar from "../../components/shared/Avatar";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import ExpandableText from "../../components/shared/ExpandableText";

import { ArrowLeft, Bookmark, Heart, MessageCircle, Trash2 } from "lucide-react";
import { sanitizeText } from "../../utils/sanitize";

var AVATAR_COLORS = ["#8B5CF6","#14B8A6","#EC4899","#3B82F6","#10B981","#FCD34D","#6366F1","#EF4444"];

function avatarColor(name) {
  var h = 0;
  for (var i = 0; i < (name||"").length; i++) h = (name.charCodeAt(i) + ((h << 5) - h)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function timeAgo(ds) {
  if (!ds) return "";
  var s = Math.floor((Date.now() - new Date(ds).getTime()) / 1000);
  if (s < 60) return "now"; if (s < 3600) return Math.floor(s/60)+"m";
  if (s < 86400) return Math.floor(s/3600)+"h"; return Math.floor(s/86400)+"d";
}

export default function SavedPostsScreen() {
  var navigate = useNavigate();
  var qc = useQueryClient();
  var { user } = useAuth();
  var { showToast } = useToast();
  var { t } = useT();

  var savedQuery = useQuery({
    queryKey: ["saved-posts"],
    queryFn: function () { return apiGet(SOCIAL.POSTS.SAVED); },
  });

  var posts = savedQuery.data?.results || savedQuery.data || [];

  function handleUnsave(postId) {
    apiPost(SOCIAL.POSTS.SAVE(postId)).then(function () {
      qc.invalidateQueries({ queryKey: ["saved-posts"] });
      showToast("Post removed from saved", "success");
    }).catch(function () {
      showToast("Failed to unsave post", "error");
    });
  }

  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate("/social"); }} />}
        title={<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bookmark size={18} color="var(--dp-accent)" />
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>{t("profile.savedPosts") || "Saved Posts"}</span>
        </div>}
      />
    }>

      <div style={{ paddingBottom: 100 }}>
        {savedQuery.isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        )}

        {!savedQuery.isLoading && posts.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <Bookmark size={48} color="var(--dp-text-muted)" strokeWidth={1.2} />
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--dp-text)", marginTop: 16 }}>No saved posts yet</p>
            <p style={{ fontSize: 13, color: "var(--dp-text-muted)", marginTop: 4 }}>Posts you save will appear here</p>
          </div>
        )}

        {posts.map(function (item) {
          var a = item.author || item.user || {};
          var aName = a.username || a.displayName || a.display_name || "User";
          var aAvatar = a.avatar || a.avatar_url || "";

          return (
            <GlassCard key={item.id} padding={16} mb={12}>
              {/* Author header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div onClick={function () { if (a.id) navigate("/user/" + a.id); }} style={{ cursor: "pointer" }}>
                  <Avatar src={aAvatar} name={aName} size={38} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aName}</div>
                  <div style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>{timeAgo(item.createdAt || item.created_at)}</div>
                </div>
                <button onClick={function () { handleUnsave(item.id); }} title="Remove from saved" style={{
                  padding: 8, borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", color: "var(--dp-text-tertiary)", fontFamily: "inherit",
                }}>
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Dream title badge */}
              {(item.dreamTitle || item.dream_title) && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: 8,
                  background: "var(--dp-accent-10)", fontSize: 11, fontWeight: 600,
                  color: "var(--dp-accent)", marginBottom: 8,
                }}>
                  {item.dreamTitle || item.dream_title}
                </div>
              )}

              {/* Content */}
              {item.content && (
                <ExpandableText text={sanitizeText(item.content)} maxLines={4} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--dp-text)" }} />
              )}

              {/* Image */}
              {(item.imageUrl || item.image_url) && (
                <div style={{ marginTop: 10, borderRadius: 12, overflow: "hidden" }}>
                  <img src={item.imageUrl || item.image_url} alt="" style={{ width: "100%", display: "block", borderRadius: 12 }} />
                </div>
              )}

              {/* Stats bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--dp-divider)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--dp-text-muted)" }}>
                  <Heart size={14} /> {item.likesCount || item.likes_count || 0}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--dp-text-muted)" }}>
                  <MessageCircle size={14} /> {item.commentsCount || item.comments_count || 0}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--dp-accent)" }}>
                  <Bookmark size={14} fill="var(--dp-accent)" /> Saved
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

    </PageLayout>
  );
}
