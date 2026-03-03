import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../services/api";
import { SOCIAL } from "../../services/endpoints";
import useAgoraPresence from "../../hooks/useAgoraPresence";
import { ArrowLeft, MessageCircle } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { adaptColor } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import Avatar from "../../components/shared/Avatar";
import GlassAppBar from "../../components/shared/GlassAppBar";

var FRIEND_COLORS = ["#14B8A6","#EC4899","#F59E0B","#8B5CF6","#3B82F6","#10B981","#6366F1","#EF4444"];

export default function OnlineFriendsScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);

  // Fetch all friends
  var friendsQuery = useQuery({
    queryKey: ["friends-list"],
    queryFn: function () { return apiGet(SOCIAL.FRIENDS.LIST); },
  });
  var allFriends = (friendsQuery.data && friendsQuery.data.results) || friendsQuery.data || [];
  if (!Array.isArray(allFriends)) allFriends = [];

  // Get friend IDs for Agora presence tracking
  var friendIds = useMemo(function () {
    return allFriends.map(function (f) { return String(f.id); });
  }, [allFriends.length]);

  // Real-time presence from Agora RTM
  var presenceMap = useAgoraPresence(friendIds);

  // Build full friend list with online status
  var friendsWithStatus = allFriends.map(function (f, i) {
    if (!f) return null;
    var isOnline = !!presenceMap[String(f.id)];
    return {
      id: f.id,
      name: f.displayName || f.username || "Friend",
      avatar: f.avatar || f.avatarUrl || null,
      initial: (f.displayName || f.username || "F")[0].toUpperCase(),
      level: f.level || 1,
      status: f.status || f.currentActivity || "",
      color: f.color || FRIEND_COLORS[i % 8],
      isOnline: isOnline,
    };
  }).filter(Boolean);

  // Split into online (top) and offline (bottom)
  var onlineFriends = friendsWithStatus.filter(function (f) { return f.isOnline; });
  var offlineFriends = friendsWithStatus.filter(function (f) { return !f.isOnline; });
  var onlineCount = onlineFriends.length;

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  return (
    <PageLayout showNav={true} header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} />}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)" }}>
              Friends
            </span>
            {onlineCount > 0 && (
              <span style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.25)",
                color: "#22C55E", fontSize: 11, fontWeight: 700,
                padding: "2px 8px", borderRadius: 10,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#22C55E",
                  boxShadow: "0 0 6px rgba(34,197,94,0.5)",
                }} />
                {onlineCount} online
              </span>
            )}
          </div>
        }
      />
    }>

      {/* Loading State */}
      {friendsQuery.isLoading && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: "48px 0",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "3px solid rgba(139,92,246,0.15)",
            borderTopColor: "#8B5CF6",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!friendsQuery.isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

          {/* ── Online Friends Section ── */}
          {onlineFriends.length > 0 && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "4px 4px 10px",
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#22C55E",
                  boxShadow: "0 0 6px rgba(34,197,94,0.5)",
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  Online ({onlineCount})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {onlineFriends.map(function (friend, index) {
                  return (
                    <FriendCard
                      key={friend.id}
                      friend={friend}
                      index={index}
                      mounted={mounted}
                      isLight={isLight}
                      navigate={navigate}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* ── Offline Friends Section ── */}
          {offlineFriends.length > 0 && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: onlineFriends.length > 0 ? "20px 4px 10px" : "4px 4px 10px",
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "var(--dp-text-muted)",
                  opacity: 0.5,
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 600, color: "var(--dp-text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  Offline ({offlineFriends.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {offlineFriends.map(function (friend, index) {
                  return (
                    <FriendCard
                      key={friend.id}
                      friend={friend}
                      index={index + onlineCount}
                      mounted={mounted}
                      isLight={isLight}
                      navigate={navigate}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {!friendsQuery.isLoading && friendsWithStatus.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--dp-text-muted)", fontSize: 14 }}>
          No friends yet. Add friends from the Social hub!
        </div>
      )}

      {/* Bottom spacer */}
      <div style={{ height: 32 }} />
    </PageLayout>
  );
}

function FriendCard({ friend, index, mounted, isLight, navigate }) {
  return (
    <GlassCard
      padding={16}
      style={{
        borderRadius: 16,
        display: "flex", alignItems: "center", gap: 14,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(15px)",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1) " + (0.05 + index * 0.03) + "s",
      }}
    >
      {/* Avatar with online indicator */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar name={friend.name} src={friend.avatar} size={48} color={friend.color} />
        {friend.isOnline && (
          <div style={{
            position: "absolute", bottom: 1, right: 1,
            width: 12, height: 12, borderRadius: "50%",
            background: "#22C55E", border: "2px solid var(--dp-bg)",
            boxShadow: "0 0 6px rgba(34,197,94,0.4)",
          }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{
            fontSize: 15, fontWeight: 600, color: "var(--dp-text)",
            }}>
            {friend.name}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: "#8B5CF6",
            padding: "2px 6px", borderRadius: 6,
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.2)",
          }}>
            Lv.{friend.level}
          </span>
        </div>
        <div style={{
          fontSize: 12,
          color: friend.isOnline ? "var(--dp-text-secondary)" : "var(--dp-text-muted)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {friend.isOnline ? (friend.status || "Online") : "Offline"}
        </div>
      </div>

      {/* Message button */}
      <button
        className="dp-gh"
        onClick={function (e) {
          e.stopPropagation();
          navigate("/buddy-chat/" + friend.id);
        }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "9px 14px", borderRadius: 12,
          background: friend.isOnline
            ? "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.1))"
            : "rgba(255,255,255,0.04)",
          border: friend.isOnline
            ? "1px solid rgba(139,92,246,0.25)"
            : "1px solid rgba(255,255,255,0.08)",
          color: friend.isOnline ? "var(--dp-accent)" : "var(--dp-text-muted)",
          fontSize: 12, fontWeight: 600,
          cursor: "pointer", transition: "all 0.25s ease",
          flexShrink: 0, fontFamily: "inherit",
        }}
      >
        <MessageCircle size={14} />
        Message
      </button>
    </GlassCard>
  );
}
