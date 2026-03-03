import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { SOCIAL } from "../../services/endpoints";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import { sanitizeText } from "../../utils/sanitize";
import PageLayout from "../../components/shared/PageLayout";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassInput from "../../components/shared/GlassInput";
import Avatar from "../../components/shared/Avatar";
import ExpandableText from "../../components/shared/ExpandableText";
import BottomNav from "../../components/shared/BottomNav";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark,
  Sparkles, Send, Flame, Star, ThumbsUp, ArrowRight,
} from "lucide-react";

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

var ENCOURAGE_TYPES = [
  { type: "you_got_this", icon: ThumbsUp, color: "#3B82F6" },
  { type: "keep_going", icon: ArrowRight, color: "#10B981" },
  { type: "inspired", icon: Sparkles, color: "#A855F7" },
  { type: "proud", icon: Star, color: "#FCD34D" },
  { type: "fire", icon: Flame, color: "#EF4444" },
];

export default function PostDetailScreen() {
  var { id } = useParams();
  var navigate = useNavigate();
  var qc = useQueryClient();
  var { user } = useAuth();
  var { showToast } = useToast();
  var { t } = useT();
  var [commentText, setCommentText] = useState("");
  var [showEncourage, setShowEncourage] = useState(false);

  var postQuery = useQuery({
    queryKey: ["post-detail", id],
    queryFn: function () { return apiGet(SOCIAL.POSTS.DETAIL(id)); },
    enabled: !!id,
  });

  var commentsQuery = useQuery({
    queryKey: ["post-comments", id],
    queryFn: function () { return apiGet(SOCIAL.POSTS.COMMENTS(id)); },
    enabled: !!id,
  });
  var comments = (commentsQuery.data && commentsQuery.data.results) || commentsQuery.data || [];
  if (!Array.isArray(comments)) comments = [];

  var likeMut = useMutation({
    mutationFn: function () { return apiPost(SOCIAL.POSTS.LIKE(id)); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["post-detail", id] }); },
  });
  var saveMut = useMutation({
    mutationFn: function () { return apiPost(SOCIAL.POSTS.SAVE(id)); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["post-detail", id] }); },
  });
  var commentMut = useMutation({
    mutationFn: function (content) { return apiPost(SOCIAL.POSTS.COMMENT(id), { content: content }); },
    onSuccess: function () {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["post-comments", id] });
      qc.invalidateQueries({ queryKey: ["post-detail", id] });
    },
    onError: function (e) { showToast(e.message || "Failed", "error"); },
  });
  var encourageMut = useMutation({
    mutationFn: function (type) { return apiPost(SOCIAL.POSTS.ENCOURAGE(id), { encouragement_type: type, message: "" }); },
    onSuccess: function () {
      showToast(t("feed.encouragementSent") || "Sent!", "success");
      setShowEncourage(false);
      qc.invalidateQueries({ queryKey: ["post-detail", id] });
    },
    onError: function (e) { showToast(e.message || "Failed", "error"); },
  });

  function handleShare() {
    var url = window.location.origin + "/post/" + id;
    if (navigator.share) {
      navigator.share({ title: "Dream Post", url: url }).catch(function () {});
    } else {
      navigator.clipboard.writeText(url).then(function () { showToast(t("feed.copiedClipboard") || "Link copied!", "success"); });
    }
  }

  function handleAddComment() {
    var c = sanitizeText(commentText, 1000);
    if (!c) return;
    commentMut.mutate(c);
  }

  var post = postQuery.data;
  if (postQuery.isLoading) return (
    <PageLayout header={<GlassAppBar left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} />} title="Post" />}>
      <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--dp-text-muted)", fontSize: 14 }}>Loading...</div>
      <BottomNav />
    </PageLayout>
  );
  if (postQuery.isError || !post) return (
    <PageLayout>
      <GlassAppBar left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} />} title="Post" />
      <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--dp-text-muted)", fontSize: 14 }}>Post not found</div>
      <BottomNav />
    </PageLayout>
  );

  var a = post.author || post.user || {};
  var aName = a.username || a.displayName || "User";
  var liked = post.hasLiked || post.isLiked || false;
  var saved = post.hasSaved || post.isSaved || false;
  var lc = post.likesCount != null ? post.likesCount : 0;
  var cc = post.commentsCount != null ? post.commentsCount : 0;
  var dTitle = (post.dream && (post.dream.title || post.dream.name)) || post.dreamTitle || "";

  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} />}
        title="Post"
      />
    }>

      <div style={{ padding: "0 16px", paddingTop: 70, paddingBottom: 100 }}>
        <GlassCard padding={16} mb={16}>
          {/* Author */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Avatar
              name={aName} size={46} color={avatarColor(aName)}
              src={a.avatar || a.avatarUrl}
              style={{ cursor: a.id ? "pointer" : "default" }}
              onClick={function () { if (a.id) navigate("/user/" + a.id); }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--dp-text)" }}>{aName}</div>
              <div style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                {timeAgo(post.createdAt || post.created_at)}
                {post.visibility && post.visibility !== "public" ? " \u00B7 " + post.visibility : ""}
              </div>
            </div>
          </div>

          {/* Content */}
          {post.content && (
            <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--dp-text)", marginBottom: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {post.content}
            </div>
          )}

          {/* Dream badge */}
          {dTitle && (
            <div onClick={function () { var did = (post.dream && post.dream.id) || post.dreamId; if (did) navigate("/dream/" + did); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 12, marginBottom: 14, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", cursor: "pointer" }}>
              <Sparkles size={13} color="#C4B5FD" strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-accent)" }}>{dTitle}</span>
            </div>
          )}

          {/* Image */}
          {(post.imageUrl || post.image_url) && (
            <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
              <img src={post.imageUrl || post.image_url} alt="" style={{ width: "100%", display: "block" }} />
            </div>
          )}

          {/* Encouragement summary */}
          {post.encouragementSummary && Object.keys(post.encouragementSummary).length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {ENCOURAGE_TYPES.filter(function (et) { return post.encouragementSummary[et.type] > 0; }).map(function (et) {
                var EI = et.icon;
                return (
                  <span key={et.type} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 10, background: et.color + "15", fontSize: 11, fontWeight: 600, color: et.color }}>
                    <EI size={12} />{post.encouragementSummary[et.type]}
                  </span>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid var(--dp-divider)", paddingTop: 12 }}>
            <button onClick={function () { likeMut.mutate(); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 12, border: liked ? "1px solid rgba(239,68,68,0.2)" : "1px solid transparent", background: liked ? "rgba(239,68,68,0.1)" : "transparent", color: liked ? "#EF4444" : "var(--dp-text-tertiary)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              <Heart size={18} fill={liked ? "#EF4444" : "none"} />{lc > 0 ? lc : ""}
            </button>
            <button onClick={function () { setShowEncourage(!showEncourage); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 12, border: "1px solid transparent", background: "transparent", color: "var(--dp-text-tertiary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              <Sparkles size={18} />
            </button>
            <button onClick={handleShare} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 12, border: "1px solid transparent", background: "transparent", color: "var(--dp-text-tertiary)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              <Share2 size={18} />
            </button>
            <button onClick={function () { saveMut.mutate(); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 12, border: saved ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent", background: saved ? "rgba(139,92,246,0.1)" : "transparent", color: saved ? "#8B5CF6" : "var(--dp-text-tertiary)", fontSize: 13, cursor: "pointer", marginLeft: "auto", fontFamily: "inherit" }}>
              <Bookmark size={18} fill={saved ? "#8B5CF6" : "none"} />
            </button>
          </div>

          {/* Encourage picker */}
          {showEncourage && (
            <div style={{ display: "flex", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--dp-divider)", flexWrap: "wrap" }}>
              {ENCOURAGE_TYPES.map(function (et) {
                var EI = et.icon;
                return (
                  <button key={et.type} onClick={function () { encourageMut.mutate(et.type); }} disabled={encourageMut.isPending}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 12, border: "1px solid " + et.color + "30", background: et.color + "10", color: et.color, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    <EI size={14} />
                  </button>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Comments */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)", marginBottom: 12 }}>
            {t("feed.comments") || "Comments"} {cc > 0 ? "(" + cc + ")" : ""}
          </div>

          {/* Comment input */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <GlassInput
              value={commentText}
              onChange={function (e) { setCommentText(e.target.value); }}
              onKeyDown={function (e) { if (e.key === "Enter") { e.preventDefault(); handleAddComment(); } }}
              placeholder={t("feed.writeComment") || "Write a comment..."}
              style={{ flex: 1, borderRadius: 14 }}
              inputStyle={{ fontSize: 13 }}
            />
            <button onClick={handleAddComment} disabled={!commentText.trim() || commentMut.isPending}
              style={{ width: 38, height: 38, borderRadius: 12, border: "none", background: commentText.trim() ? "linear-gradient(135deg,#8B5CF6,#6D28D9)" : "var(--dp-glass-bg)", color: commentText.trim() ? "#fff" : "var(--dp-text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: commentText.trim() ? "pointer" : "default", flexShrink: 0, fontFamily: "inherit" }}>
              <Send size={16} />
            </button>
          </div>

          {commentsQuery.isLoading && (
            <div style={{ textAlign: "center", padding: 16, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading comments...</div>
          )}

          {comments.map(function (c) {
            var ca = c.author || c.user || {};
            var cn = ca.username || ca.displayName || "User";
            return (
              <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <Avatar name={cn} size={32} color={avatarColor(cn)} src={ca.avatar || ca.avatarUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>{cn}</span>
                    <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>{timeAgo(c.createdAt || c.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--dp-text-secondary)", lineHeight: 1.5, wordBreak: "break-word" }}>{c.content || c.text}</div>
                </div>
              </div>
            );
          })}

          {!commentsQuery.isLoading && comments.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--dp-text-muted)", fontSize: 13 }}>No comments yet</div>
          )}
        </div>
      </div>

      <BottomNav />
    </PageLayout>
  );
}
