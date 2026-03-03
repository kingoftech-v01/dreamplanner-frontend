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
import BottomNav from "../../components/shared/BottomNav";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { CATEGORIES, catSolid, adaptColor, GRADIENTS } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassAppBar from "../../components/shared/GlassAppBar";
import Avatar from "../../components/shared/Avatar";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";
import GradientButton from "../../components/shared/GradientButton";
import ExpandableText from "../../components/shared/ExpandableText";

const CAT_ICONS = { career: Briefcase, hobbies: Palette, health: Heart, finance: Wallet, personal: Brain, relationships: Users };

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
    apiPost(SOCIAL.FRIENDS.REQUEST, { target_user_id: id }).then(function () {
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
      apiPost(SOCIAL.FOLLOW, { target_user_id: id }).catch(function () { setIsFollowing(false); });
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
      apiPost(SOCIAL.BLOCK, { target_user_id: id }).then(function () {
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
    apiPost(SOCIAL.REPORT, { target_user_id: id, reason: reportReason.trim(), category: "inappropriate" }).then(function () {
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
      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
        <GlassAppBar
          style={{ position: "fixed", top: 0, left: 0, right: 0 }}
          left={<IconButton icon={ArrowLeft} onClick={() => navigate(-1)} label="Back" />}
          title="Profile"
        />
        <div style={{ textAlign: "center", padding: "120px 20px 40px" }}>
          <Loader size={28} color="var(--dp-text-muted)" style={{ animation: "spin 1s linear infinite" }} />
          <div style={{ fontSize: 14, color: "var(--dp-text-muted)", marginTop: 12 }}>Loading profile...</div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
        <GlassAppBar
          style={{ position: "fixed", top: 0, left: 0, right: 0 }}
          left={<IconButton icon={ArrowLeft} onClick={() => navigate(-1)} label="Back" />}
          title="Profile"
        />
        <div style={{ textAlign: "center", padding: "120px 20px 40px" }}>
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
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      {/* ═══ FIXED APP BAR ═══ */}
      <GlassAppBar
        style={{ position: "fixed", top: 0, left: 0, right: 0 }}
        left={<IconButton icon={ArrowLeft} onClick={() => navigate(-1)} label="Back" />}
        title="Profile"
      />

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <main style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", zIndex: 10, paddingTop: 80, paddingBottom: 120 }}>
        <div style={{ width: "100%", padding: "0 16px" }}>

        {/* Avatar + Name */}
        <div style={{ textAlign: "center", marginBottom: 28, ...stagger(1) }}>
          <Avatar
            name={user.name}
            size={88}
            color="var(--dp-accent)"
            shape="circle"
            style={{ margin: "0 auto 16px", boxShadow: "0 0 30px rgba(139,92,246,0.2)" }}
          />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 4px", letterSpacing: "-0.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%", marginLeft: "auto", marginRight: "auto" }}>{user.name}</h1>
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
          <GradientButton
            gradient={(isFriend || requestSent) ? "teal" : "primary"}
            icon={isFriend ? UserCheck : requestSent ? Check : UserPlus}
            onClick={function () { if (!requestSent && !isFriend) handleSendRequest(); }}
            disabled={requestSent || isFriend}
            style={{ flex: 1, height: 46 }}
          >
            {isFriend ? "Friends" : requestSent ? "Request Sent" : "Add Friend"}
          </GradientButton>
          <button className="dp-gh" onClick={() => navigate("/buddy-chat/" + id)} style={{
            flex: 1, height: 46, borderRadius: 14, background: "var(--dp-glass-bg)",
            border: "1px solid var(--dp-input-border)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontSize: 14, fontWeight: 600, color: "var(--dp-text-primary)", transition: "all 0.2s",
            fontFamily: "inherit",
          }}>
            <MessageCircle size={18} /> Message
          </button>
        </div>

        {/* Follow + More Menu Row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, ...stagger(2) }}>
          <button onClick={handleFollow} style={{
            flex: 1, height: 40, borderRadius: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            fontSize: 13, fontWeight: 600, transition: "all 0.3s", fontFamily: "inherit",
            background: isFollowing ? "rgba(139,92,246,0.12)" : "var(--dp-glass-bg)",
            border: isFollowing ? "1px solid rgba(139,92,246,0.3)" : "1px solid var(--dp-input-border)",
            color: isFollowing ? "var(--dp-accent-text)" : "var(--dp-text-primary)",
          }}>
            {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
            {isFollowing ? "Following" : "Follow"}
          </button>
          <div style={{ position: "relative" }}>
            <button onClick={function () { setShowMenu(!showMenu); }} style={{
              width: 40, height: 40, borderRadius: 12, background: "var(--dp-glass-bg)",
              border: "1px solid var(--dp-input-border)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--dp-text-secondary)", transition: "all 0.2s", fontFamily: "inherit",
            }}>
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <>
                {/* Overlay to close menu on outside click */}
                <div onClick={function () { setShowMenu(false); }} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                <div style={{
                  position: "absolute", right: 0, top: 46, zIndex: 200, minWidth: 180,
                  background: "#1A1535", border: "1px solid rgba(139,92,246,0.2)",
                  borderRadius: 14, padding: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                }}>
                  <button className="dp-gh" onClick={handleRemoveFriend} style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10, border: "none",
                    background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    fontSize: 13, fontWeight: 500, color: "#E2E0EA", transition: "background 0.15s", fontFamily: "inherit",
                  }}>
                    <UserMinus size={16} /> Remove Friend
                  </button>
                  <button className="dp-gh" onClick={handleBlock} style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10, border: "none",
                    background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    fontSize: 13, fontWeight: 500, color: isBlocked ? "#10B981" : "#EF4444", transition: "background 0.15s", fontFamily: "inherit",
                  }}>
                    <ShieldOff size={16} /> {isBlocked ? "Unblock User" : "Block User"}
                  </button>
                  <button className="dp-gh" onClick={handleReport} style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10, border: "none",
                    background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    fontSize: 13, fontWeight: 500, color: "#F59E0B", transition: "background 0.15s", fontFamily: "inherit",
                  }}>
                    <Flag size={16} /> Report User
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Report Modal */}
        <GlassModal
          open={showReportModal}
          onClose={function () { setShowReportModal(false); setReportReason(""); }}
          variant="center"
          title="Report User"
          maxWidth={380}
        >
          <div style={{ padding: 20 }}>
            <GlassInput
              value={reportReason}
              onChange={function (e) { setReportReason(e.target.value); }}
              placeholder="Describe the issue..."
              multiline
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={function () { setShowReportModal(false); setReportReason(""); }} style={{
                flex: 1, height: 42, borderRadius: 12, background: "var(--dp-glass-bg)",
                border: "1px solid var(--dp-input-border)", cursor: "pointer",
                fontSize: 14, fontWeight: 600, color: "var(--dp-text-primary)", fontFamily: "inherit",
              }}>Cancel</button>
              <GradientButton gradient="danger" onClick={submitReport} style={{ flex: 1, height: 42 }}>
                Submit Report
              </GradientButton>
            </div>
          </div>
        </GlassModal>

        {/* Bio */}
        {user.bio && (
          <div style={{
            ...stagger(3), padding: 16, borderRadius: 16,
            background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
            marginBottom: 20,
          }}>
            <ExpandableText text={user.bio} maxLines={3} fontSize={14} color="var(--dp-text-secondary)" />
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24, ...stagger(4) }}>
          {[
            { icon: Star, label: "Level", value: user.level, color: "var(--dp-warning)" },
            { icon: Zap, label: "XP", value: user.xp.toLocaleString(), color: "var(--dp-accent-text)" },
            { icon: Flame, label: "Streak", value: `${user.streak}d`, color: "var(--dp-danger)" },
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

        {/* Public Dreams */}
        {user.dreams && user.dreams.length > 0 && (
          <div style={{ marginBottom: 24, ...stagger(5) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Target size={16} color="var(--dp-accent-text)" />
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)" }}>Dreams</span>
            </div>
            {user.dreams.map(function (dream, i) {
              var d = typeof dream === "string" ? { title: dream } : dream;
              return (
                <div key={d.id || i} onClick={function () { if (d.id) navigate("/dream/" + d.id); }} style={{
                  padding: "12px 14px", borderRadius: 14, marginBottom: 8,
                  background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
                  cursor: d.id ? "pointer" : "default", transition: "background 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Target size={14} color="var(--dp-accent)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{d.title}</span>
                    {d.category && <span style={{ fontSize: 11, color: "var(--dp-text-muted)", flexShrink: 0 }}>{d.category}</span>}
                  </div>
                  {d.progress != null && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: "var(--dp-text-tertiary)" }}>Progress</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-accent)" }}>{Math.round(d.progress)}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: "var(--dp-glass-border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: "var(--dp-accent)", width: Math.round(d.progress) + "%", transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
                const color = catSolid(cat);
                const textColor = adaptColor(color, isLight);
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
      </main>

      <BottomNav />
    </div>
  );
}
