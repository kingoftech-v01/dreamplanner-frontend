import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../../services/api";
import { CIRCLES } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  ArrowLeft, Users, MessageSquare, Trophy, Flame,
  Heart, MessageCircle, Send, Crown, Shield, Star,
  User, ChevronRight, Target, Zap, Loader,
  MoreVertical, ArrowUp, ArrowDown, UserMinus
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import { useTheme } from "../../context/ThemeContext";
import { useT } from "../../context/I18nContext";
import { sanitizeText } from "../../utils/sanitize";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Circle Detail Screen
// ═══════════════════════════════════════════════════════════════

const CATEGORY_COLORS = {
  Health: "#10B981",
  Career: "#8B5CF6",
  Growth: "#6366F1",
  Finance: "#FCD34D",
  Hobbies: "#EC4899",
};

var MEMBER_COLORS = ["#8B5CF6","#14B8A6","#EC4899","#3B82F6","#F59E0B","#10B981","#6366F1"];

function timeAgo(dateStr, t) {
  if (!dateStr) return "";
  var s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return t("circles.justNow");
  if (s < 3600) return Math.floor(s / 60) + t("circles.minAgo");
  if (s < 86400) return Math.floor(s / 3600) + t("circles.hourAgo");
  return Math.floor(s / 86400) + t("circles.dayAgo");
}

const ROLE_CONFIG = {
  Admin: { color: "#FCD34D", icon: Crown },
  Moderator: { color: "#8B5CF6", icon: Shield },
  Member: { color: "var(--dp-text-tertiary)", icon: User },
};

const glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

export default function CircleDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  var { t } = useT();
  var { user } = useAuth();
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [composerText, setComposerText] = useState("");
  const [challengeJoined, setChallengeJoined] = useState(false);
  var [memberMenu, setMemberMenu] = useState(null);
  var [postMenu, setPostMenu] = useState(null);
  var [editingPost, setEditingPost] = useState(null);
  var [editText, setEditText] = useState("");

  // ─── API Queries ──────────────────────────────────────────────
  var circleQuery = useQuery({
    queryKey: ["circle", id],
    queryFn: function () { return apiGet(CIRCLES.DETAIL(id)); },
  });
  var circle = circleQuery.data || {};
  const categoryColor = CATEGORY_COLORS[circle.category] || "#C4B5FD";

  var feedInf = useInfiniteList({ queryKey: ["circle-feed", id], url: CIRCLES.FEED(id), limit: 20 });

  var challengesQuery = useQuery({
    queryKey: ["circle-challenges", id],
    queryFn: function () { return apiGet(CIRCLES.CHALLENGES(id)); },
  });

  // Normalize feed data into posts
  var feedData = feedInf.items.map(function (item, i) {
    if (!item) return null;
    var authorName = (item.user && (item.user.displayName || item.user.username || item.user.name)) || "User";
    return {
      id: item.id,
      userId: item.user && item.user.id,
      user: {
        name: authorName,
        initial: authorName[0].toUpperCase(),
        color: (item.user && item.user.color) || MEMBER_COLORS[i % MEMBER_COLORS.length],
      },
      content: item.content || item.text || "",
      timeAgo: timeAgo(item.createdAt || item.created, t),
      likes: item.reactionsCount || item.likesCount || item.likes || 0,
      comments: item.commentsCount || item.comments || 0,
      liked: !!item.liked || !!item.hasReacted,
    };
  });

  feedData = feedData.filter(Boolean);
  useEffect(function () { if (feedData.length > 0) setPosts(feedData); }, [feedInf.items]); // eslint-disable-line react-hooks/exhaustive-deps

  // Members from circle detail response
  var members = (circle.members || []).map(function (m, i) {
    if (!m) return null;
    var name = m.displayName || m.username || m.name || "Member";
    return {
      id: m.id,
      name: name,
      initial: name[0].toUpperCase(),
      color: m.color || MEMBER_COLORS[i % MEMBER_COLORS.length],
      role: m.role || "Member",
      level: m.level || 1,
    };
  }).filter(Boolean);

  var isAdmin = members.some(function (m) { return m.id === (user && user.id) && m.role === "Admin"; });

  // Challenge: use first from API results
  var challengesList = (challengesQuery.data && challengesQuery.data.results) || challengesQuery.data || [];
  var activeChallenge = challengesList[0] || null;

  var loading = circleQuery.isLoading;

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  // ─── Toggle Like (optimistic + API) ──────────────────────────
  const toggleLike = function (postId) {
    setPosts(function (prev) {
      return prev.map(function (p) {
        return p.id === postId
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? p.likes - 1 : p.likes + 1,
            }
          : p;
      });
    });
    apiPost(CIRCLES.POST_REACT(id, postId), { emoji: "heart" }).catch(function () {});
  };

  // ─── Create Post (optimistic + API) ──────────────────────────
  const handlePost = function () {
    if (!composerText.trim()) return;
    var cleanContent = sanitizeText(composerText, 2000);
    if (!cleanContent) return;
    var displayName = (user && (user.displayName || user.username)) || t("circles.you");
    var newPost = {
      id: "p" + Date.now(),
      user: { name: displayName, initial: displayName[0].toUpperCase(), color: "#8B5CF6" },
      content: cleanContent,
      timeAgo: t("circles.justNow"),
      likes: 0,
      comments: 0,
      liked: false,
    };
    setPosts(function (prev) { return [newPost].concat(prev); });
    setComposerText("");
    apiPost(CIRCLES.POSTS(id), { content: cleanContent })
      .then(function () {
        queryClient.invalidateQueries({ queryKey: ["circle-feed", id] });
      })
      .catch(function (err) {
        showToast(err.message || t("circles.failedToPost"), "error");
      });
  };

  // ─── Delete Post ────────────────────────────────────────────
  var handleDeletePost = function (postId) {
    setPostMenu(null);
    if (!confirm(t("circles.deletePostConfirm"))) return;
    setPosts(function (prev) { return prev.filter(function (p) { return p.id !== postId; }); });
    apiDelete(CIRCLES.POST_DELETE(id, postId))
      .then(function () {
        showToast(t("circles.postDeleted"), "success");
        queryClient.invalidateQueries({ queryKey: ["circle-feed", id] });
      })
      .catch(function (err) {
        showToast(err.message || t("circles.failedToDeletePost"), "error");
        queryClient.invalidateQueries({ queryKey: ["circle-feed", id] });
      });
  };

  // ─── Edit Post ─────────────────────────────────────────────
  var handleEditPost = function (postId) {
    var cleanContent = sanitizeText(editText, 2000);
    if (!cleanContent) return;
    setEditingPost(null);
    setPosts(function (prev) {
      return prev.map(function (p) {
        return p.id === postId ? Object.assign({}, p, { content: cleanContent }) : p;
      });
    });
    apiPut(CIRCLES.POST_EDIT(id, postId), { content: cleanContent })
      .then(function () {
        showToast(t("circles.postUpdated"), "success");
        queryClient.invalidateQueries({ queryKey: ["circle-feed", id] });
      })
      .catch(function (err) {
        showToast(err.message || t("circles.failedToUpdatePost"), "error");
        queryClient.invalidateQueries({ queryKey: ["circle-feed", id] });
      });
  };

  var handlePromote = function (memberId) {
    setMemberMenu(null);
    apiPost(CIRCLES.MEMBER_PROMOTE(id, memberId))
      .then(function () {
        showToast(t("circles.memberPromoted"), "success");
        queryClient.invalidateQueries({ queryKey: ["circle", id] });
      })
      .catch(function (err) { showToast(err.message || t("circles.failedToPromote"), "error"); });
  };

  var handleDemote = function (memberId) {
    setMemberMenu(null);
    apiPost(CIRCLES.MEMBER_DEMOTE(id, memberId))
      .then(function () {
        showToast(t("circles.memberDemoted"), "success");
        queryClient.invalidateQueries({ queryKey: ["circle", id] });
      })
      .catch(function (err) { showToast(err.message || t("circles.failedToDemote"), "error"); });
  };

  var handleRemoveMember = function (memberId) {
    setMemberMenu(null);
    apiPost(CIRCLES.MEMBER_REMOVE(id, memberId))
      .then(function () {
        showToast(t("circles.memberRemoved"), "success");
        queryClient.invalidateQueries({ queryKey: ["circle", id] });
      })
      .catch(function (err) { showToast(err.message || t("circles.failedToRemove"), "error"); });
  };

  const tabs = [
    { key: "posts", label: t("circles.posts"), icon: MessageSquare },
    { key: "members", label: t("circles.members"), icon: Users },
    { key: "challenges", label: t("circles.challenges"), icon: Trophy },
  ];

  if (loading) {
    return (
      <PageLayout>
        <div style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Loader size={28} color="var(--dp-accent)" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageLayout>
    );
  }

  if (circleQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          message={(circleQuery.error && circleQuery.error.message) || t("circles.failedToLoad")}
          onRetry={function () { circleQuery.refetch(); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100vh",
          paddingBottom: 80,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 0 16px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--dp-text)",
              letterSpacing: "-0.3px",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {circle.name}
          </span>
        </div>

        {/* Circle header card */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
          }}
        >
          <div
            style={{
              ...glass,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--dp-text)",
                    marginBottom: 6,
                  }}
                >
                  {circle.name}
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--dp-text-secondary)",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {circle.description}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "var(--dp-text-secondary)",
                }}
              >
                <Users size={14} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
                {circle.memberCount || circle.membersCount || 0} {t("circles.membersCount")}
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "var(--dp-text-secondary)",
                }}
              >
                <MessageSquare size={14} color="#14B8A6" strokeWidth={2} />
                {circle.postsCount || circle.posts || 0} {t("circles.postsCount")}
              </span>
            </div>

            {/* Category badge + Group Chat button */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  padding: "5px 12px",
                  borderRadius: 10,
                  background: `${categoryColor}12`,
                  border: `1px solid ${categoryColor}20`,
                  fontSize: 12,
                  fontWeight: 600,
                  color: isLight ? ({ "#FCD34D": "#B45309", "#C4B5FD": "#6D28D9" }[categoryColor] || categoryColor) : categoryColor,
                }}
              >
                {t("circles." + (circle.category || "").toLowerCase()) || circle.category}
              </span>
              <button
                onClick={() => navigate("/circle-chat/" + id)}
                style={{
                  marginLeft: "auto",
                  padding: "7px 14px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(139,92,246,0.3)",
                  transition: "transform 0.15s",
                }}
                onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <MessageCircle size={14} strokeWidth={2} />
                {t("circles.groupChat")}
              </button>
            </div>

            {/* Active challenge banner */}
            {(circle.activeChallenge || (activeChallenge && activeChallenge.title)) && (
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(249,115,22,0.06)",
                  border: "1px solid rgba(249,115,22,0.12)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Flame size={18} color="#FB923C" strokeWidth={2} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#FB923C",
                    }}
                  >
                    {t("circles.activeChallenge")}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--dp-text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    {circle.activeChallenge || (activeChallenge && activeChallenge.title)}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  color="var(--dp-text-muted)"
                  strokeWidth={2}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            borderRadius: 14,
            background: "var(--dp-glass-bg)",
            border: "1px solid var(--dp-glass-border)",
            marginBottom: 18,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 11,
                  border: "none",
                  background:
                    activeTab === tab.key
                      ? "rgba(139,92,246,0.15)"
                      : "transparent",
                  color:
                    activeTab === tab.key
                      ? "var(--dp-text)"
                      : "var(--dp-text-tertiary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <Icon size={14} strokeWidth={2} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══ POSTS TAB ═══ */}
        {activeTab === "posts" && (
          <div>
            {posts.map((post, i) => {
              if (!post) return null;
              return (
              <div
                key={post.id}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(16px)",
                  transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.25 + i * 0.08}s`,
                }}
              >
                <div
                  style={{
                    ...glass,
                    padding: 18,
                    marginBottom: 12,
                    borderRadius: 18,
                  }}
                >
                  {/* User header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: `${post.user.color}18`,
                        border: `2px solid ${post.user.color}25`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 700,
                        color: post.user.color,
                        flexShrink: 0,
                      }}
                    >
                      {post.user.initial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--dp-text)",
                        }}
                      >
                        {post.user.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--dp-text-muted)",
                        }}
                      >
                        {post.timeAgo}
                      </div>
                    </div>
                    {/* Owner menu */}
                    {user && post.userId && String(post.userId) === String(user.id) && (
                      <div style={{ position: "relative" }}>
                        <button onClick={function () { setPostMenu(postMenu === post.id ? null : post.id); }}
                          style={{ background: "transparent", border: "none", color: "var(--dp-text-tertiary)", cursor: "pointer", padding: 4 }}>
                          <MoreVertical size={16} strokeWidth={2} />
                        </button>
                        {postMenu === post.id && (
                          <div style={{ position: "absolute", right: 0, top: 28, zIndex: 20, background: "var(--dp-body-bg)", border: "1px solid var(--dp-input-border)", borderRadius: 12, padding: 4, minWidth: 120, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                            <button onClick={function () { setEditingPost(post.id); setEditText(post.content); setPostMenu(null); }}
                              style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", background: "transparent", color: "var(--dp-text)", fontSize: 13, fontWeight: 500, textAlign: "left", cursor: "pointer", borderRadius: 8 }}>{t("common.edit")}</button>
                            <button onClick={function () { handleDeletePost(post.id); }}
                              style={{ display: "block", width: "100%", padding: "8px 12px", border: "none", background: "transparent", color: "#EF4444", fontSize: 13, fontWeight: 500, textAlign: "left", cursor: "pointer", borderRadius: 8 }}>{t("common.delete")}</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Post content */}
                  {editingPost === post.id ? (
                    <div style={{ marginBottom: 14 }}>
                      <textarea value={editText} onChange={function (e) { setEditText(e.target.value); }} rows={3}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 12, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", color: "var(--dp-text)", fontSize: 13, lineHeight: 1.6, fontFamily: "inherit", outline: "none", resize: "vertical" }} />
                      <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                        <button onClick={function () { setEditingPost(null); }}
                          style={{ padding: "6px 14px", borderRadius: 10, border: "1px solid var(--dp-input-border)", background: "transparent", color: "var(--dp-text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t("common.cancel")}</button>
                        <button onClick={function () { handleEditPost(post.id); }}
                          style={{ padding: "6px 14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#8B5CF6,#6D28D9)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t("common.save")}</button>
                      </div>
                    </div>
                  ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--dp-text-primary)",
                      lineHeight: 1.6,
                      marginBottom: 14,
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {post.content}
                  </p>
                  )}

                  {/* Action buttons */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      paddingTop: 10,
                      borderTop: "1px solid var(--dp-surface)",
                    }}
                  >
                    <button
                      onClick={() => toggleLike(post.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 0",
                        border: "none",
                        background: "transparent",
                        color: post.liked
                          ? "#EF4444"
                          : "var(--dp-text-tertiary)",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "color 0.2s",
                      }}
                    >
                      <Heart
                        size={15}
                        strokeWidth={2}
                        fill={post.liked ? "#EF4444" : "none"}
                      />
                      {post.likes}
                    </button>
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 0",
                        border: "none",
                        background: "transparent",
                        color: "var(--dp-text-tertiary)",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <MessageCircle size={15} strokeWidth={2} />
                      {post.comments}
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
            <div ref={feedInf.sentinelRef} style={{height:1}} />
            {feedInf.loadingMore && <div style={{textAlign:"center",padding:16,color:isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.4)",fontSize:13}}>{t("circles.loadingMore")}</div>}
          </div>
        )}

        {/* ═══ MEMBERS TAB ═══ */}
        {activeTab === "members" && (
          <div>
            {members.map((member, i) => {
              if (!member) return null;
              const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.Member;
              const RoleIcon = roleConfig.icon;
              return (
                <div
                  key={member.id}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(16px)",
                    transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.25 + i * 0.06}s`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderRadius: 16,
                      background:
                        member.role === "Admin"
                          ? "rgba(252,211,77,0.04)"
                          : "var(--dp-glass-bg)",
                      border:
                        member.role === "Admin"
                          ? "1px solid rgba(252,211,77,0.08)"
                          : "1px solid var(--dp-surface)",
                      marginBottom: 8,
                      transition: "all 0.2s",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        background: `${member.color}15`,
                        border: `2px solid ${member.color}25`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 17,
                        fontWeight: 700,
                        color: member.color,
                        flexShrink: 0,
                      }}
                    >
                      {member.initial}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--dp-text)",
                          }}
                        >
                          {member.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--dp-text-muted)",
                          }}
                        >
                          Lv.{member.level}
                        </span>
                      </div>
                    </div>

                    {/* Role badge */}
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: `${roleConfig.color}10`,
                        border: `1px solid ${roleConfig.color}20`,
                        fontSize: 11,
                        fontWeight: 600,
                        color: isLight ? ({ "#FCD34D": "#B45309" }[roleConfig.color] || roleConfig.color) : roleConfig.color,
                      }}
                    >
                      <RoleIcon size={12} strokeWidth={2.5} />
                      {t("circles.role" + member.role)}
                    </span>
                    {isAdmin && member.role !== "Admin" && (
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={function (e) { e.stopPropagation(); setMemberMenu(memberMenu === member.id ? null : member.id); }}
                          style={{
                            width: 32, height: 32, borderRadius: 10,
                            border: "1px solid var(--dp-input-border)",
                            background: "var(--dp-glass-bg)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "var(--dp-text-tertiary)",
                          }}
                        >
                          <MoreVertical size={14} strokeWidth={2} />
                        </button>
                        {memberMenu === member.id && (
                          <div style={{
                            position: "absolute", top: 38, right: 0, width: 160, zIndex: 200,
                            background: isLight ? "rgba(255,255,255,0.97)" : "rgba(12,8,26,0.97)",
                            backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
                            borderRadius: 14, border: "1px solid var(--dp-input-border)",
                            boxShadow: "0 12px 40px rgba(0,0,0,0.4)", padding: 6,
                            animation: "dpMemberMenu 0.15s ease-out",
                          }}>
                            {member.role === "Member" && (
                              <button onClick={function () { handlePromote(member.id); }} style={{
                                width: "100%", padding: "9px 12px", borderRadius: 10, border: "none",
                                background: "transparent", display: "flex", alignItems: "center", gap: 8,
                                cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                color: isLight ? "rgba(26,21,53,0.85)" : "rgba(255,255,255,0.85)",
                              }}>
                                <ArrowUp size={14} strokeWidth={2} /> {t("circles.promote")}
                              </button>
                            )}
                            {member.role === "Moderator" && (
                              <button onClick={function () { handleDemote(member.id); }} style={{
                                width: "100%", padding: "9px 12px", borderRadius: 10, border: "none",
                                background: "transparent", display: "flex", alignItems: "center", gap: 8,
                                cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                color: isLight ? "rgba(26,21,53,0.85)" : "rgba(255,255,255,0.85)",
                              }}>
                                <ArrowDown size={14} strokeWidth={2} /> {t("circles.demote")}
                              </button>
                            )}
                            <button onClick={function () { handleRemoveMember(member.id); }} style={{
                              width: "100%", padding: "9px 12px", borderRadius: 10, border: "none",
                              background: "transparent", display: "flex", alignItems: "center", gap: 8,
                              cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                              color: "rgba(239,68,68,0.8)",
                            }}>
                              <UserMinus size={14} strokeWidth={2} /> {t("circles.remove")}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ CHALLENGES TAB ═══ */}
        {activeTab === "challenges" && (
          <div>
            {!activeChallenge && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <Trophy size={40} color="var(--dp-text-muted)" strokeWidth={1.5} style={{ marginBottom: 16 }} />
                <p style={{ fontSize: 15, color: "var(--dp-text-tertiary)" }}>{t("circles.noChallenges")}</p>
              </div>
            )}
            {activeChallenge && (<>
            {/* Active challenge card */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s",
              }}
            >
              <div
                style={{
                  ...glass,
                  padding: 20,
                  marginBottom: 16,
                  border: "1px solid rgba(249,115,22,0.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: "rgba(249,115,22,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Flame size={20} color="#FB923C" strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--dp-text)",
                      }}
                    >
                      {activeChallenge.title || activeChallenge.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--dp-text-tertiary)",
                        marginTop: 2,
                      }}
                    >
                      {activeChallenge.daysLeft || activeChallenge.daysRemaining || 0} {t("circles.daysLeft")}
                      &middot; {activeChallenge.participantsCount || activeChallenge.participants || 0} {t("circles.participants")}
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: "var(--dp-text-secondary)",
                    lineHeight: 1.5,
                    marginBottom: 16,
                    wordBreak: "break-word",
                  }}
                >
                  {activeChallenge.description}
                </p>

                {/* Progress bar */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--dp-text-secondary)",
                      }}
                    >
                      {t("circles.progress")}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#FB923C",
                      }}
                    >
                      {activeChallenge.progress || 0}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "var(--dp-glass-border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: mounted
                          ? `${activeChallenge.progress || 0}%`
                          : "0%",
                        borderRadius: 3,
                        background:
                          "linear-gradient(90deg, #FB923C, #F59E0B)",
                        transition:
                          "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                        boxShadow: "0 0 8px rgba(249,115,22,0.3)",
                      }}
                    />
                  </div>
                </div>

                {/* Join button */}
                <button
                  onClick={function () {
                    setChallengeJoined(true);
                    apiPost(CIRCLES.CHALLENGE_JOIN(activeChallenge.id))
                      .then(function () {
                        showToast(t("circles.challengeJoined"), "success");
                        queryClient.invalidateQueries({ queryKey: ["circle-challenges", id] });
                      })
                      .catch(function (err) {
                        setChallengeJoined(false);
                        showToast(err.message || t("circles.failedToJoin"), "error");
                      });
                  }}
                  disabled={challengeJoined || !!activeChallenge.hasJoined}
                  style={{
                    width: "100%",
                    padding: "13px 0",
                    borderRadius: 14,
                    border: (challengeJoined || activeChallenge.hasJoined)
                      ? "1px solid rgba(16,185,129,0.2)"
                      : "none",
                    background: (challengeJoined || activeChallenge.hasJoined)
                      ? "rgba(16,185,129,0.08)"
                      : "linear-gradient(135deg, #FB923C, #F59E0B)",
                    color: (challengeJoined || activeChallenge.hasJoined) ? "#10B981" : "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: (challengeJoined || activeChallenge.hasJoined) ? "default" : "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: (challengeJoined || activeChallenge.hasJoined)
                      ? "none"
                      : "0 4px 16px rgba(249,115,22,0.3)",
                    transition: "all 0.25s",
                  }}
                >
                  {(challengeJoined || activeChallenge.hasJoined) ? (
                    <>
                      <Target size={16} strokeWidth={2.5} />
                      {t("circles.joined")}
                    </>
                  ) : (
                    <>
                      <Flame size={16} strokeWidth={2} />
                      {t("circles.joinChallenge")}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Leaderboard */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.35s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                <Trophy size={15} color={isLight ? "#B45309" : "#FCD34D"} strokeWidth={2.5} />
                <span
                  style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}
                >
                  {t("circles.leaderboard")}
                </span>
              </div>

              {(activeChallenge.leaderboard || []).map(function (entry, i) {
                if (!entry) return null;
                const medals = ["#FCD34D", "#C0C0C0", "#CD7F32"];
                const medalColor = medals[i] || "rgba(255,255,255,0.3)";
                var entryName = entry.displayName || entry.username || entry.name || "User";
                var entryColor = entry.color || MEMBER_COLORS[i % MEMBER_COLORS.length];
                return (
                  <div
                    key={entry.id || i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderRadius: 16,
                      background:
                        i === 0
                          ? "rgba(252,211,77,0.04)"
                          : "var(--dp-glass-bg)",
                      border:
                        i === 0
                          ? "1px solid rgba(252,211,77,0.1)"
                          : "1px solid var(--dp-surface)",
                      marginBottom: 8,
                      opacity: mounted ? 1 : 0,
                      transform: mounted
                        ? "translateY(0)"
                        : "translateY(10px)",
                      transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + i * 0.08}s`,
                    }}
                  >
                    {/* Rank */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        background: `${medalColor}15`,
                        border: `1px solid ${medalColor}25`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: isLight ? ({ "#FCD34D": "#B45309", "#C0C0C0": "#6B7280" }[medalColor] || medalColor) : medalColor,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>

                    {/* Avatar */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: `${entryColor}15`,
                        border: `2px solid ${entryColor}25`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 700,
                        color: entryColor,
                        flexShrink: 0,
                      }}
                    >
                      {entryName[0].toUpperCase()}
                    </div>

                    {/* Name */}
                    <span
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--dp-text)",
                      }}
                    >
                      {entryName}
                    </span>

                    {/* Points */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Zap size={13} color={isLight ? "#B45309" : "#FCD34D"} strokeWidth={2.5} />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: isLight ? "#B45309" : "#FCD34D",
                        }}
                      >
                        {entry.points || entry.score || 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            </>)}
          </div>
        )}

        {/* Post composer (always visible at bottom for posts tab) */}
        {activeTab === "posts" && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px 16px",
              background: "var(--dp-modal-bg)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              borderTop: "1px solid var(--dp-glass-border)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.5s ease 0.4s",
            }}
          >
            <div
              style={{
                flex: 1,

                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <input
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePost()}
                placeholder={t("circles.sharePlaceholder")}
                style={{
                  flex: 1,
                  padding: "11px 16px",
                  borderRadius: 14,
                  border: "1px solid var(--dp-input-border)",
                  background: "var(--dp-glass-bg)",
                  color: "var(--dp-text)",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <button
                onClick={handlePost}
                disabled={!composerText.trim()}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: "none",
                  background: composerText.trim()
                    ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                    : "var(--dp-glass-bg)",
                  color: composerText.trim()
                    ? "#fff"
                    : "var(--dp-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: composerText.trim() ? "pointer" : "not-allowed",
                  flexShrink: 0,
                  transition: "all 0.2s",
                  boxShadow: composerText.trim()
                    ? "0 2px 10px rgba(139,92,246,0.3)"
                    : "none",
                }}
              >
                <Send size={17} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        <style>{`
          input::placeholder { color: var(--dp-text-muted); }
          @keyframes dpMemberMenu { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    </PageLayout>
  );
}
