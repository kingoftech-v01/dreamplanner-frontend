import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../../services/api";
import { CIRCLES } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import { sanitizeText } from "../../utils/sanitize";
import { BRAND, adaptColor, catSolid } from "../../styles/colors";
import { getAvatarEquipProps } from "../../utils/equippedItems";
import PageLayout from "../../components/shared/PageLayout";
import PillTabs from "../../components/shared/PillTabs";
import ErrorState from "../../components/shared/ErrorState";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassInput from "../../components/shared/GlassInput";
import GlassModal from "../../components/shared/GlassModal";
import GradientButton from "../../components/shared/GradientButton";
import Avatar from "../../components/shared/Avatar";
import ExpandableText from "../../components/shared/ExpandableText";
import CircleFeedPost from "./circles/CircleFeedPost";
import CircleInviteSheet from "./circles/CircleInviteSheet";
import {
  ArrowLeft, MessageCircle, Users, Send, Flame, Trash2,
  LogOut, Crown, Shield, Star, Target, UserPlus,
  ArrowUp, ArrowDown, UserMinus
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Circle Detail Screen (Tabbed)
// Compact hero → PillTabs (Feed | Challenges | Members)
// Chat & Invite as app bar icons
// ═══════════════════════════════════════════════════════════════

var EXTRA_CAT_COLORS = {
  fitness: "#3B82F6", education: "#6366F1", creativity: "#EC4899",
  personal_growth: "#6366F1", other: "#9CA3AF",
};

function getCatColor(key) {
  if (!key) return BRAND.purple;
  var k = key.toLowerCase().replace(/\s+/g, "_");
  return catSolid(k) || EXTRA_CAT_COLORS[k] || BRAND.purple;
}

var ROLE_META = {
  admin: { Icon: Crown, color: "#FCD34D", label: "Admin" },
  moderator: { Icon: Shield, color: "#8B5CF6", label: "Mod" },
  member: { Icon: Star, color: "var(--dp-text-muted)", label: "Member" },
};

export default function CircleDetailScreen() {
  var navigate = useNavigate();
  var { id } = useParams();
  var { user } = useAuth();
  var { showToast } = useToast();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var qc = useQueryClient();

  var [mounted, setMounted] = useState(false);
  var [activeTab, setActiveTab] = useState("feed");
  var [newPost, setNewPost] = useState("");
  var [showInvite, setShowInvite] = useState(false);
  var [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  var [editingPost, setEditingPost] = useState(null);
  var [editContent, setEditContent] = useState("");
  var [deletePostTarget, setDeletePostTarget] = useState(null);

  useEffect(function () { setTimeout(function () { setMounted(true); }, 100); }, []);

  // ── Queries ──
  var circleQuery = useQuery({
    queryKey: ["circle", id],
    queryFn: function () { return apiGet(CIRCLES.DETAIL(id)); },
    enabled: !!id,
  });
  var circle = circleQuery.data || {};
  var members = circle.members || [];
  var isMember = circle.isMember != null ? circle.isMember : members.some(function (m) { return String((m.user || m).id) === String(user?.id); });
  var myRole = (function () {
    var me = members.find(function (m) { return String((m.user || m).id) === String(user?.id); });
    return me ? me.role : null;
  })();
  var isAdmin = myRole === "admin";

  var challengesQuery = useQuery({
    queryKey: ["circle-challenges", id],
    queryFn: function () { return apiGet(CIRCLES.CHALLENGES(id)); },
    enabled: !!id && isMember,
  });
  var challenges = (challengesQuery.data && challengesQuery.data.results) || challengesQuery.data || [];
  if (!Array.isArray(challenges)) challenges = [];

  var feedInf = useInfiniteList({
    queryKey: ["circle-feed", id],
    url: CIRCLES.FEED(id),
    limit: 20,
    enabled: !!id && isMember,
  });
  var posts = feedInf.items || [];

  // ── Mutations ──
  var createPostMut = useMutation({
    mutationFn: function (content) { return apiPost(CIRCLES.POSTS(id), { content: content }); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["circle-feed", id] }); setNewPost(""); showToast("Post shared!", "success"); },
    onError: function (err) { showToast(err.message || "Failed to post", "error"); },
  });

  var reactMut = useMutation({
    mutationFn: function (data) { return apiPost(CIRCLES.POST_REACT(id, data.postId), { reaction_type: data.type || "heart" }); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["circle-feed", id] }); },
  });

  var deletePostMut = useMutation({
    mutationFn: function (postId) { return apiDelete(CIRCLES.POST_DELETE(id, postId)); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["circle-feed", id] }); showToast("Post deleted", "success"); },
    onError: function (err) { showToast(err.message || "Failed to delete", "error"); },
  });

  var editPostMut = useMutation({
    mutationFn: function (p) { return apiPut(CIRCLES.POST_EDIT(id, p.postId), { content: p.content }); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["circle-feed", id] }); setEditingPost(null); showToast("Post updated", "success"); },
    onError: function (err) { showToast(err.message || "Failed to update", "error"); },
  });

  var leaveMut = useMutation({
    mutationFn: function () { return apiPost(CIRCLES.LEAVE(id)); },
    onSuccess: function () { showToast("Left circle", "success"); navigate("/circles"); },
    onError: function (err) { showToast(err.message || "Failed to leave", "error"); },
  });

  var promoteMut = useMutation({
    mutationFn: function (memberId) { return apiPost(CIRCLES.MEMBER_PROMOTE(id, memberId)); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["circle", id] }); showToast("Member promoted", "success"); },
  });
  var demoteMut = useMutation({
    mutationFn: function (memberId) { return apiPost(CIRCLES.MEMBER_DEMOTE(id, memberId)); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["circle", id] }); showToast("Member demoted", "success"); },
  });
  var removeMut = useMutation({
    mutationFn: function (memberId) { return apiDelete(CIRCLES.MEMBER_REMOVE(id, memberId)); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["circle", id] }); showToast("Member removed", "success"); },
  });
  var challengeJoinMut = useMutation({
    mutationFn: function (challengeId) { return apiPost(CIRCLES.CHALLENGE_JOIN(challengeId)); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["circle-challenges", id] }); showToast("Joined challenge!", "success"); },
    onError: function (err) { showToast(err.message || "Failed to join", "error"); },
  });

  // ── Handlers ──
  function handlePost() {
    var text = sanitizeText(newPost, 5000);
    if (!text) return;
    createPostMut.mutate(text);
  }

  function handleSaveEdit() {
    if (!editingPost || !editContent.trim()) return;
    editPostMut.mutate({ postId: editingPost.id, content: sanitizeText(editContent, 5000) });
  }

  if (circleQuery.isError) {
    return <PageLayout><ErrorState message="Failed to load circle" onRetry={function () { circleQuery.refetch(); }} /></PageLayout>;
  }

  var catColor = getCatColor(circle.category);

  var tabList = [
    { key: "feed", label: "Feed" },
    { key: "challenges", label: "Challenges", count: challenges.length || undefined },
    { key: "members", label: "Members", count: members.length || undefined },
  ];

  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate("/circles"); }} />}
        title={<span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{circle.name || "Circle"}</span>}
        right={
          <div style={{ display: "flex", gap: 6 }}>
            {isMember && <IconButton icon={MessageCircle} onClick={function () { navigate("/circle-chat/" + id); }} label="Chat" />}
            {isMember && <IconButton icon={UserPlus} onClick={function () { setShowInvite(true); }} label="Invite" />}
          </div>
        }
      />
    }>

      <div style={{ paddingBottom: 32, opacity: mounted ? 1 : 0, transition: "opacity 0.4s ease" }}>

        {/* ═══ COMPACT HERO ═══ */}
        <GlassCard padding={16} mb={12}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16, flexShrink: 0,
              background: catColor + "15", border: "2px solid " + catColor + "30",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Users size={22} color={catColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", marginBottom: 3 }}>{circle.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: catColor + "12", color: adaptColor(catColor, isLight),
                }}>
                  {circle.category}
                </span>
                <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {isMember && !isAdmin && (
              <button onClick={function () { setShowLeaveConfirm(true); }} title="Leave circle" style={{
                padding: "6px 10px", borderRadius: 8, background: "none",
                border: "1px solid var(--dp-glass-border)", cursor: "pointer",
                color: "var(--dp-text-muted)", fontSize: 11, fontFamily: "inherit",
                display: "flex", alignItems: "center",
              }}>
                <LogOut size={13} />
              </button>
            )}
          </div>
          {circle.description && (
            <ExpandableText text={circle.description} maxLines={2} fontSize={12} color="var(--dp-text-secondary)" style={{ marginTop: 10 }} />
          )}
        </GlassCard>

        {/* ═══ TABS ═══ */}
        <PillTabs tabs={tabList} active={activeTab} onChange={setActiveTab} style={{ marginBottom: 16 }} />

        {/* ═══ FEED TAB ═══ */}
        {activeTab === "feed" && (
          <>
            {/* Post composer */}
            {isMember && (
              <GlassCard padding={14} mb={16}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <Avatar src={user?.avatar} name={user?.displayName || user?.username || "You"} size={32} />
                  <GlassInput
                    value={newPost}
                    onChange={function (e) { setNewPost(e.target.value); }}
                    placeholder="Share an update..."
                    multiline
                    style={{ flex: 1 }}
                    onKeyDown={function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
                  />
                  <button onClick={handlePost} disabled={!newPost.trim() || createPostMut.isPending} style={{
                    width: 38, height: 38, borderRadius: 12, border: "none", flexShrink: 0,
                    background: newPost.trim() ? "var(--dp-accent)" : "var(--dp-surface)",
                    color: newPost.trim() ? "#fff" : "var(--dp-text-muted)",
                    cursor: newPost.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s", fontFamily: "inherit",
                  }}>
                    <Send size={16} strokeWidth={2} />
                  </button>
                </div>
              </GlassCard>
            )}

            {feedInf.isLoading && (
              <div style={{ textAlign: "center", padding: 32, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading posts...</div>
            )}

            {!feedInf.isLoading && posts.length === 0 && isMember && (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <MessageCircle size={36} color="var(--dp-text-muted)" strokeWidth={1.2} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", marginTop: 12 }}>No posts yet</p>
                <p style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 4 }}>Be the first to share an update!</p>
              </div>
            )}

            {posts.map(function (post) {
              return (
                <CircleFeedPost
                  key={post.id}
                  post={post}
                  userId={user?.id}
                  onReact={function (postId, type) { reactMut.mutate({ postId: postId, type: type }); }}
                  onEdit={function (p) { setEditingPost(p); setEditContent(p.content || ""); }}
                  onDelete={function (p) { setDeletePostTarget(p); }}
                />
              );
            })}

            <div ref={feedInf.sentinelRef} style={{ height: 1 }} />
            {feedInf.loadingMore && <div style={{ textAlign: "center", padding: 16, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading more...</div>}
          </>
        )}

        {/* ═══ CHALLENGES TAB ═══ */}
        {activeTab === "challenges" && (
          <>
            {challengesQuery.isLoading && (
              <div style={{ textAlign: "center", padding: 32, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading challenges...</div>
            )}

            {!challengesQuery.isLoading && challenges.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <Flame size={36} color="var(--dp-text-muted)" strokeWidth={1.2} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", marginTop: 12 }}>No challenges yet</p>
                <p style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 4 }}>
                  {isAdmin ? "Create a challenge to motivate your members!" : "Check back soon for new challenges!"}
                </p>
              </div>
            )}

            {challenges.map(function (ch) {
              var hasJoined = ch.hasJoined || ch.has_joined;
              var daysLeft = "";
              if (ch.endDate || ch.end_date) {
                var diff = Math.max(0, Math.ceil((new Date(ch.endDate || ch.end_date) - Date.now()) / 86400000));
                daysLeft = diff + "d left";
              }

              return (
                <GlassCard key={ch.id} padding={16} mb={10}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Flame size={20} color="#FB923C" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ch.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: "var(--dp-text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                          <Target size={11} /> {ch.participantCount || ch.participant_count || 0}
                        </span>
                        {daysLeft && <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>{daysLeft}</span>}
                        <span style={{
                          padding: "2px 7px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                          background: ch.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.08)",
                          color: ch.status === "active" ? "#10B981" : "var(--dp-accent)",
                        }}>
                          {ch.status === "active" ? "Active" : ch.status || "Upcoming"}
                        </span>
                      </div>
                    </div>
                    {!hasJoined && (
                      <GradientButton
                        gradient="primaryDark"
                        size="sm"
                        disabled={challengeJoinMut.isPending}
                        onClick={function () { challengeJoinMut.mutate(ch.id); }}
                      >
                        Join
                      </GradientButton>
                    )}
                    {hasJoined && (
                      <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>Joined</span>
                    )}
                  </div>
                  {ch.description && (
                    <p style={{ fontSize: 12, color: "var(--dp-text-secondary)", marginTop: 8, lineHeight: 1.5 }}>{ch.description}</p>
                  )}
                </GlassCard>
              );
            })}
          </>
        )}

        {/* ═══ MEMBERS TAB ═══ */}
        {activeTab === "members" && (
          <>
            {isAdmin && (
              <div style={{ marginBottom: 16 }}>
                <GradientButton gradient="primaryDark" size="sm" icon={UserPlus} onClick={function () { setShowInvite(true); }}>
                  Invite Friends
                </GradientButton>
              </div>
            )}

            {members.map(function (m) {
              var u = m.user || m;
              var name = u.username || u.displayName || u.name || "Member";
              var role = m.role || "member";
              var meta = ROLE_META[role] || ROLE_META.member;
              var RoleIcon = meta.Icon;
              var isSelf = String(u.id) === String(user?.id);

              return (
                <GlassCard key={u.id} padding={12} mb={6}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar src={u.avatar} name={name} size={40} {...getAvatarEquipProps(u)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {name} {isSelf && <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>(you)</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <RoleIcon size={11} color={meta.color} strokeWidth={2.5} />
                        <span style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                      </div>
                    </div>
                    {isAdmin && !isSelf && (
                      <div style={{ display: "flex", gap: 4 }}>
                        {role === "member" && (
                          <button onClick={function () { promoteMut.mutate(u.id); }} title="Promote" style={{
                            width: 32, height: 32, borderRadius: 8, border: "1px solid var(--dp-glass-border)",
                            background: "var(--dp-surface)", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "var(--dp-text-secondary)",
                          }}>
                            <ArrowUp size={14} />
                          </button>
                        )}
                        {role === "moderator" && (
                          <button onClick={function () { demoteMut.mutate(u.id); }} title="Demote" style={{
                            width: 32, height: 32, borderRadius: 8, border: "1px solid var(--dp-glass-border)",
                            background: "var(--dp-surface)", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "var(--dp-text-secondary)",
                          }}>
                            <ArrowDown size={14} />
                          </button>
                        )}
                        <button onClick={function () { removeMut.mutate(u.id); }} title="Remove member" style={{
                          width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)",
                          background: "rgba(239,68,68,0.06)", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#EF4444",
                        }}>
                          <UserMinus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}

            {isMember && !isAdmin && (
              <button onClick={function () { setShowLeaveConfirm(true); }} style={{
                display: "flex", alignItems: "center", gap: 6, marginTop: 16,
                padding: "8px 0", background: "none", border: "none", cursor: "pointer",
                color: "var(--dp-text-muted)", fontSize: 12, fontFamily: "inherit",
              }}>
                <LogOut size={12} /> Leave Circle
              </button>
            )}
          </>
        )}
      </div>

      {/* ═══ MODALS ═══ */}
      <CircleInviteSheet
        open={showInvite}
        onClose={function () { setShowInvite(false); }}
        circleId={id}
        members={members}
        showToast={showToast}
      />

      {/* Leave confirmation */}
      <GlassModal open={showLeaveConfirm} onClose={function () { setShowLeaveConfirm(false); }} variant="center" maxWidth={340}>
        <div style={{ padding: 24, textAlign: "center" }}>
          <LogOut size={32} color="#EF4444" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", marginBottom: 8 }}>Leave Circle?</h3>
          <p style={{ fontSize: 13, color: "var(--dp-text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
            You will no longer see posts or chat messages from this circle.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={function () { setShowLeaveConfirm(false); }} style={{
              flex: 1, padding: 12, borderRadius: 12, border: "1px solid var(--dp-input-border)",
              background: "var(--dp-surface)", color: "var(--dp-text-secondary)",
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={function () { setShowLeaveConfirm(false); leaveMut.mutate(); }} style={{
              flex: 1, padding: 12, borderRadius: 12, border: "none",
              background: "var(--dp-danger-solid)", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Leave</button>
          </div>
        </div>
      </GlassModal>

      {/* Delete post confirmation */}
      <GlassModal open={!!deletePostTarget} onClose={function () { setDeletePostTarget(null); }} variant="center" maxWidth={340}>
        <div style={{ padding: 24, textAlign: "center" }}>
          <Trash2 size={32} color="#EF4444" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", marginBottom: 8 }}>Delete Post?</h3>
          <p style={{ fontSize: 13, color: "var(--dp-text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
            This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={function () { setDeletePostTarget(null); }} style={{
              flex: 1, padding: 12, borderRadius: 12, border: "1px solid var(--dp-input-border)",
              background: "var(--dp-surface)", color: "var(--dp-text-secondary)",
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={function () { deletePostMut.mutate(deletePostTarget.id); setDeletePostTarget(null); }} style={{
              flex: 1, padding: 12, borderRadius: 12, border: "none",
              background: "var(--dp-danger-solid)", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Delete</button>
          </div>
        </div>
      </GlassModal>

      {/* Edit post modal */}
      <GlassModal open={!!editingPost} onClose={function () { setEditingPost(null); }} variant="center" title="Edit Post" maxWidth={400}>
        <div style={{ padding: 20 }}>
          <GlassInput value={editContent} onChange={function (e) { setEditContent(e.target.value); }} multiline placeholder="Edit your post..." style={{ marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={function () { setEditingPost(null); }} style={{
              flex: 1, padding: 12, borderRadius: 12, border: "1px solid var(--dp-input-border)",
              background: "var(--dp-surface)", color: "var(--dp-text-secondary)",
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <GradientButton gradient="primaryDark" onClick={handleSaveEdit} disabled={!editContent.trim()} style={{ flex: 1 }}>Save</GradientButton>
          </div>
        </div>
      </GlassModal>
    </PageLayout>
  );
}
