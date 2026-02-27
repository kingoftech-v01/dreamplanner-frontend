import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../services/api";
import { SOCIAL, USERS } from "../../services/endpoints";
import {
  ArrowLeft, UserPlus, MessageCircle, Trophy, Flame, Star,
  Zap, Target, Check, Users, Heart, Briefcase, Palette,
  Brain, Wallet, TrendingUp, Loader, MoreVertical, Flag,
  ShieldOff, UserMinus, UserCheck
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";

var CATEGORIES = {
  career: { label: "Career" },
  hobbies: { label: "Hobbies" },
  health: { label: "Health" },
  finance: { label: "Finance" },
  personal: { label: "Personal" },
  relationships: { label: "Relationships" },
};

const CAT_ICONS = { career: Briefcase, hobbies: Palette, health: Heart, finance: Wallet, personal: Brain, relationships: Users };
const CAT_COLORS = { career: "#8B5CF6", hobbies: "#EC4899", health: "#10B981", finance: "#FCD34D", personal: "#6366F1", relationships: "#14B8A6" };

const LIGHT_COLOR_MAP = {
  "#C4B5FD": "#6D28D9",
  "#5DE5A8": "#059669",
  "#FCD34D": "#B45309",
  "#F69A9A": "#DC2626",
};

export default function UserProfileScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");

  var profileQuery = useQuery({
    queryKey: ["user-profile", id],
    queryFn: function () { return apiGet(USERS.PROFILE(id)); },
    enabled: !!id,
  });

  var countsQuery = useQuery({
    queryKey: ["user-counts", id],
    queryFn: function () { return apiGet(SOCIAL.COUNTS(id)); },
    enabled: !!id,
  });

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);
  useEffect(function () {
    if (profileQuery.data) {
      if (profileQuery.data.isFriend) { setIsFriend(true); setRequestSent(true); }
      if (profileQuery.data.isFollowing) setIsFollowing(true);
    }
  }, [profileQuery.data]);

  var rawUser = profileQuery.data || null;
  var counts = countsQuery.data || {};
  var user = rawUser ? Object.assign({}, rawUser, {
    name: rawUser.name || rawUser.displayName || rawUser.username || "User",
    initial: rawUser.initial || (rawUser.name || rawUser.displayName || rawUser.username || "U")[0].toUpperCase(),
    level: rawUser.level || counts.level || 1,
    xp: rawUser.xp || counts.xp || 0,
    streak: rawUser.streak || counts.streak || 0,
    bio: rawUser.bio || "",
    mutualFriends: rawUser.mutualFriends || counts.mutualFriends || 0,
    dreams: rawUser.dreams || [],
    categories: rawUser.categories || [],
    joinedDate: rawUser.joinedDate || rawUser.dateJoined || "",
  }) : null;

  var handleSendRequest = function () {
    setRequestSent(true);
    apiPost(SOCIAL.FRIENDS.REQUEST, { targetUserId: id }).then(function () {
      showToast("Friend request sent!", "success");
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    }).catch(function (err) {
      showToast(err.message || "Failed to send request", "error");
      setRequestSent(false);
    });
  };

  var handleFollow = function () {
    if (isFollowing) {
      setIsFollowing(false);
      apiDelete(SOCIAL.UNFOLLOW(id)).catch(function () { setIsFollowing(true); });
    } else {
      setIsFollowing(true);
      apiPost(SOCIAL.FOLLOW, { targetUserId: id }).catch(function () { setIsFollowing(false); });
    }
  };

  var handleBlock = function () {
    setShowMenu(false);
    if (isBlocked) {
      apiDelete(SOCIAL.UNBLOCK(id)).then(function () {
        setIsBlocked(false);
        showToast("User unblocked", "info");
      }).catch(function (err) { showToast(err.message || "Failed to unblock", "error"); });
    } else {
      apiPost(SOCIAL.BLOCK, { targetUserId: id }).then(function () {
        setIsBlocked(true);
        showToast("User blocked", "info");
      }).catch(function (err) { showToast(err.message || "Failed to block", "error"); });
    }
  };

  var handleReport = function () {
    setShowMenu(false);
    setShowReportModal(true);
  };

  var submitReport = function () {
    if (!reportReason.trim()) return;
    apiPost(SOCIAL.REPORT, { targetUserId: id, reason: reportReason.trim(), category: "inappropriate" }).then(function () {
      showToast("Report submitted", "success");
      setShowReportModal(false);
      setReportReason("");
    }).catch(function (err) { showToast(err.message || "Failed to report", "error"); });
  };

  var handleRemoveFriend = function () {
    setShowMenu(false);
    apiDelete(SOCIAL.FRIENDS.REMOVE(id)).then(function () {
      showToast("Friend removed", "info");
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    }).catch(function (err) { showToast(err.message || "Failed to remove", "error"); });
  };

  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(18px)",
    transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms`,
  });

  if (profileQuery.isLoading) {
    return (
      <PageLayout>
        <div style={{ paddingTop: 20, paddingBottom: 40, fontFamily: "'Inter', sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <button className="dp-ib" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>Profile</span>
          </div>
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Loader size={28} color="var(--dp-text-muted)" style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 14, color: "var(--dp-text-muted)", marginTop: 12 }}>Loading profile...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout>
        <div style={{ paddingTop: 20, paddingBottom: 40, fontFamily: "'Inter', sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <button className="dp-ib" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>Profile</span>
          </div>
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px",
              background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Users size={32} color="var(--dp-text-muted)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 8px" }}>User Not Found</h2>
            <p style={{ fontSize: 14, color: "var(--dp-text-muted)", margin: 0 }}>This profile doesn't exist or may have been removed.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ paddingTop: 20, paddingBottom: 40, fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, ...stagger(0) }}>
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>Profile</span>
        </div>

        {/* Avatar + Name */}
        <div style={{ textAlign: "center", marginBottom: 28, ...stagger(1) }}>
          <div style={{
            width: 88, height: 88, borderRadius: "50%", margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))",
            border: "3px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 34, fontWeight: 700, color: "#fff",
            boxShadow: "0 0 30px rgba(139,92,246,0.2)",
          }}>
            {user.initial}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 4px", letterSpacing: "-0.5px" }}>{user.name}</h1>
          <p style={{ fontSize: 13, color: "var(--dp-text-tertiary)", margin: 0 }}>Joined {user.joinedDate}</p>
          {user.mutualFriends > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 8 }}>
              <Users size={13} color="var(--dp-text-tertiary)" />
              <span style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>{user.mutualFriends} mutual friends</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12, ...stagger(2) }}>
          <button
            onClick={function () { if (!requestSent && !isFriend) handleSendRequest(); }}
            disabled={requestSent || isFriend}
            style={{
              flex: 1, height: 46, borderRadius: 14, border: "none", cursor: (requestSent || isFriend) ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: 14, fontWeight: 600, transition: "all 0.3s",
              background: (isFriend || requestSent) ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              color: (isFriend || requestSent) ? (isLight ? "#059669" : "#5DE5A8") : "#fff",
              border: (isFriend || requestSent) ? "1px solid rgba(93,229,168,0.3)" : "none",
            }}
          >
            {isFriend ? <UserCheck size={18} /> : requestSent ? <Check size={18} /> : <UserPlus size={18} />}
            {isFriend ? "Friends" : requestSent ? "Request Sent" : "Add Friend"}
          </button>
          <button onClick={() => navigate("/buddy-chat/" + id)} style={{
            flex: 1, height: 46, borderRadius: 14, background: "var(--dp-glass-bg)",
            border: "1px solid var(--dp-input-border)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontSize: 14, fontWeight: 600, color: "var(--dp-text-primary)", transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--dp-surface-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--dp-glass-bg)"}
          >
            <MessageCircle size={18} /> Message
          </button>
        </div>

        {/* Follow + More Menu Row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, ...stagger(2) }}>
          <button onClick={handleFollow} style={{
            flex: 1, height: 40, borderRadius: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            fontSize: 13, fontWeight: 600, transition: "all 0.3s",
            background: isFollowing ? "rgba(139,92,246,0.12)" : "var(--dp-glass-bg)",
            border: isFollowing ? "1px solid rgba(139,92,246,0.3)" : "1px solid var(--dp-input-border)",
            color: isFollowing ? (isLight ? "#6D28D9" : "#C4B5FD") : "var(--dp-text-primary)",
          }}>
            {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
            {isFollowing ? "Following" : "Follow"}
          </button>
          <div style={{ position: "relative" }}>
            <button onClick={function () { setShowMenu(!showMenu); }} style={{
              width: 40, height: 40, borderRadius: 12, background: "var(--dp-glass-bg)",
              border: "1px solid var(--dp-input-border)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--dp-text-secondary)", transition: "all 0.2s",
            }}>
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div style={{
                position: "absolute", right: 0, top: 46, zIndex: 50, minWidth: 180,
                background: "var(--dp-card-bg)", border: "1px solid var(--dp-glass-border)",
                borderRadius: 14, padding: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}>
                <button onClick={handleRemoveFriend} style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: "none",
                  background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  fontSize: 13, fontWeight: 500, color: "var(--dp-text-primary)", transition: "background 0.15s",
                }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = "var(--dp-surface-hover)"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; }}
                >
                  <UserMinus size={16} /> Remove Friend
                </button>
                <button onClick={handleBlock} style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: "none",
                  background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  fontSize: 13, fontWeight: 500, color: isBlocked ? "#10B981" : "#EF4444", transition: "background 0.15s",
                }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = "var(--dp-surface-hover)"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; }}
                >
                  <ShieldOff size={16} /> {isBlocked ? "Unblock User" : "Block User"}
                </button>
                <button onClick={handleReport} style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: "none",
                  background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  fontSize: 13, fontWeight: 500, color: "#F59E0B", transition: "background 0.15s",
                }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = "var(--dp-surface-hover)"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = "transparent"; }}
                >
                  <Flag size={16} /> Report User
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Report Modal */}
        {showReportModal && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }} onClick={function () { setShowReportModal(false); }}>
            <div onClick={function (e) { e.stopPropagation(); }} style={{
              width: "100%", maxWidth: 380, background: "var(--dp-card-bg)",
              border: "1px solid var(--dp-glass-border)", borderRadius: 20, padding: 24,
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 16px" }}>Report User</h3>
              <textarea
                value={reportReason}
                onChange={function (e) { setReportReason(e.target.value); }}
                placeholder="Describe the issue..."
                rows={4}
                style={{
                  width: "100%", borderRadius: 12, padding: "12px 14px", fontSize: 14,
                  background: "var(--dp-input-bg)", border: "1px solid var(--dp-input-border)",
                  color: "var(--dp-text)", resize: "none", fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={function () { setShowReportModal(false); setReportReason(""); }} style={{
                  flex: 1, height: 42, borderRadius: 12, background: "var(--dp-glass-bg)",
                  border: "1px solid var(--dp-input-border)", cursor: "pointer",
                  fontSize: 14, fontWeight: 600, color: "var(--dp-text-primary)",
                }}>Cancel</button>
                <button onClick={submitReport} style={{
                  flex: 1, height: 42, borderRadius: 12, border: "none", cursor: "pointer",
                  background: "#EF4444", fontSize: 14, fontWeight: 600, color: "#fff",
                }}>Submit Report</button>
              </div>
            </div>
          </div>
        )}

        {/* Bio */}
        {user.bio && (
          <div style={{
            ...stagger(3), padding: 16, borderRadius: 16,
            background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
            marginBottom: 20,
          }}>
            <p style={{ fontSize: 14, color: "var(--dp-text-secondary)", lineHeight: 1.6, margin: 0 }}>{user.bio}</p>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24, ...stagger(4) }}>
          {[
            { icon: Star, label: "Level", value: user.level, color: isLight ? "#B45309" : "#FCD34D" },
            { icon: Zap, label: "XP", value: user.xp.toLocaleString(), color: isLight ? "#6D28D9" : "#C4B5FD" },
            { icon: Flame, label: "Streak", value: `${user.streak}d`, color: isLight ? "#DC2626" : "#F69A9A" },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: "14px 10px", borderRadius: 16, textAlign: "center",
              background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
            }}>
              <stat.icon size={18} color={stat.color} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)" }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "var(--dp-text-tertiary)", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Dreams */}
        {user.dreams && user.dreams.length > 0 && (
          <div style={{ marginBottom: 24, ...stagger(5) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Target size={16} color={isLight ? "#6D28D9" : "#C4B5FD"} />
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)" }}>Dreams</span>
            </div>
            {user.dreams.map((dream, i) => (
              <div key={i} style={{
                padding: "12px 14px", borderRadius: 14, marginBottom: 8,
                background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <Target size={14} color="var(--dp-text-muted)" />
                <span style={{ fontSize: 13, color: "var(--dp-text-primary)" }}>{dream}</span>
              </div>
            ))}
          </div>
        )}

        {/* Interests */}
        {user.categories && user.categories.length > 0 && (
          <div style={{ ...stagger(6) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Heart size={16} color="#EC4899" />
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)" }}>Interests</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {user.categories.map((cat, i) => {
                const CatIcon = CAT_ICONS[cat] || Star;
                const color = CAT_COLORS[cat] || "#8B5CF6";
                const textColor = isLight && LIGHT_COLOR_MAP[color] ? LIGHT_COLOR_MAP[color] : color;
                const label = CATEGORIES[cat]?.label || cat;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                    borderRadius: 20, background: `${color}12`, border: `1px solid ${color}25`,
                  }}>
                    <CatIcon size={14} color={textColor} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
