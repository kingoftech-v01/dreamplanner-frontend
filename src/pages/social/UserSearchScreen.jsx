import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../services/api";
import { SOCIAL } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import { ArrowLeft, Search, X, UserPlus, Check, Users } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { sanitizeSearch } from "../../utils/sanitize";
import { CONTACT_COLORS } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";
import Avatar from "../../components/shared/Avatar";

const AVATAR_COLORS = CONTACT_COLORS;

export default function UserSearchScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sentRequests, setSentRequests] = useState(new Set());

  // Debounce search query
  useEffect(function () {
    var timer = setTimeout(function () { setDebouncedQuery(query); }, 350);
    return function () { clearTimeout(timer); };
  }, [query]);

  var sanitizedQ = sanitizeSearch(debouncedQuery);
  var searchInf = useInfiniteList({
    queryKey: ["user-search", debouncedQuery],
    url: SOCIAL.USER_SEARCH + "?q=" + encodeURIComponent(sanitizedQ),
    limit: 20,
    enabled: debouncedQuery.length > 0,
  });

  var recentSearchesQuery = useQuery({
    queryKey: ["recent-searches"],
    queryFn: function () { return apiGet(SOCIAL.RECENT_SEARCHES.LIST); },
  });

  var suggestionsInf = useInfiniteList({
    queryKey: ["follow-suggestions"],
    url: SOCIAL.FOLLOW_SUGGESTIONS,
    limit: 20,
  });

  var normalizeUser = function (u) {
    return Object.assign({}, u, {
      name: u.name || u.displayName || u.username || "User",
      initial: u.initial || (u.name || u.displayName || u.username || "U")[0].toUpperCase(),
      level: u.currentLevel || u.level || 1,
      mutualFriends: u.mutualFriends || 0,
      isFriend: u.isFriend || false,
      isPendingRequest: u.isPendingRequest || false,
    });
  };

  var searchResults = searchInf.items.map(normalizeUser);

  var recentSearches = (recentSearchesQuery.data && (recentSearchesQuery.data.recentSearches || recentSearchesQuery.data.results)) || recentSearchesQuery.data || [];

  var SUGGESTED_PEOPLE = suggestionsInf.items.map(normalizeUser);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const getAvatarColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  var handleAddFriend = function (userId) {
    setSentRequests(function (prev) { return new Set([...prev, userId]); });
    apiPost(SOCIAL.FRIENDS.REQUEST, { target_user_id: userId }).then(function () {
      showToast("Friend request sent!", "success");
    }).catch(function (err) {
      showToast(err.message || "Failed to send request", "error");
      setSentRequests(function (prev) { var n = new Set(prev); n.delete(userId); return n; });
    });
  };

  var removeRecentSearch = function (id) {
    queryClient.setQueryData(["recent-searches"], function (old) {
      if (!old) return old;
      var list = old.results || old;
      var filtered = (Array.isArray(list) ? list : []).filter(function (s) { return s.id !== id; });
      return old.results ? Object.assign({}, old, { results: filtered }) : filtered;
    });
    apiDelete(SOCIAL.RECENT_SEARCHES.REMOVE(id)).catch(function () {
      queryClient.invalidateQueries({ queryKey: ["recent-searches"] });
    });
  };

  const isSearching = query.length > 0;

  const renderUserCard = (user, index, delay) => {
    const isSent = sentRequests.has(user.id) || user.isPendingRequest;
    const isFriend = user.isFriend;
    const avatarColor = getAvatarColor(user.name);

    return (
      <GlassCard
        key={user.id}
        padding="14px 16px"
        radius={16}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(15px)",
          transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${delay + index * 0.06}s`,
        }}
      >
        {/* Avatar */}
        <Avatar name={user.name} size={46} color={avatarColor} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{
              fontSize: 14, fontWeight: 600, color: "var(--dp-text)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {user.name}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#8B5CF6",
              padding: "2px 6px", borderRadius: 6,
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.2)",
              flexShrink: 0,
            }}>
              Lv.{user.level}
            </span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 12, color: "var(--dp-text-muted)",
            }}>
            <Users size={11} />
            {user.mutualFriends} mutual friend{user.mutualFriends !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={() => !isSent && !isFriend && handleAddFriend(user.id)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "8px 14px", borderRadius: 10,
            background: isFriend
              ? "rgba(20,184,166,0.15)"
              : isSent
              ? "rgba(20,184,166,0.15)"
              : "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.15))",
            border: isFriend
              ? "1px solid rgba(20,184,166,0.3)"
              : isSent
              ? "1px solid rgba(20,184,166,0.3)"
              : "1px solid rgba(139,92,246,0.25)",
            color: isFriend ? "#14B8A6" : isSent ? "#14B8A6" : "var(--dp-accent-text)",
            fontSize: 12, fontWeight: 600, cursor: (isSent || isFriend) ? "default" : "pointer",
            transition: "all 0.3s ease",
            flexShrink: 0, fontFamily: "inherit",
          }}
        >
          {isFriend ? (
            <>
              <Check size={13} />
              Friends
            </>
          ) : isSent ? (
            <>
              <Check size={13} />
              Pending
            </>
          ) : (
            <>
              <UserPlus size={13} />
              Add Friend
            </>
          )}
        </button>
      </GlassCard>
    );
  };

  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={() => navigate(-1)} label="Back" />}
        title="Find People"
      />
    }>

      {/* Search Input */}
      <div style={{
        background: "var(--dp-glass-bg)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "4px 16px",
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 24,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s",
        border: query.length > 0
          ? "1px solid rgba(139,92,246,0.25)"
          : "1px solid var(--dp-input-border)",
      }}>
        <Search size={18} color="var(--dp-text-muted)" />
        <input
          type="text"
          placeholder="Search for friends by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: "var(--dp-text)", fontSize: 15, padding: "12px 0",
            fontFamily: "inherit",
          }}
        />
        {query.length > 0 && (
          <button
            onClick={() => setQuery("")}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--dp-surface-hover)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <X size={14} color="var(--dp-text-tertiary)" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {isSearching && searchResults.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: "var(--dp-text-muted)",
            marginBottom: 12,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            Search Results
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {searchResults.map((user, i) => renderUserCard(user, i, 0.15))}
          </div>
          <div ref={searchInf.sentinelRef} />
          {searchInf.loadingMore && (
            <div style={{ textAlign: "center", padding: "12px 0", fontSize: 13, color: "var(--dp-text-muted)" }}>Loading more...</div>
          )}
        </div>
      )}

      {/* Empty search state */}
      {isSearching && searchResults.length === 0 && (
        <div style={{
          textAlign: "center", padding: "50px 20px",
          opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease 0.2s",
        }}>
          <Search size={40} color="var(--dp-text-muted)" style={{ marginBottom: 14 }} />
          <div style={{
            fontSize: 15, fontWeight: 600, color: "var(--dp-text-tertiary)",
            marginBottom: 6,
          }}>
            No results found
          </div>
          <div style={{
            fontSize: 13, color: "var(--dp-text-muted)",
            }}>
            Try a different name or spelling
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {!isSearching && recentSearches.length > 0 && (
        <div style={{
          marginBottom: 28,
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s",
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: "var(--dp-text-muted)",
            marginBottom: 12,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            Recent Searches
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {recentSearches.map((search) => (
              <div
                key={search.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 12,
                  background: "var(--dp-glass-bg)",
                  border: "1px solid var(--dp-input-border)",
                  cursor: "pointer",
                }}
                onClick={function () { setQuery(search.name || search.query || ""); }}
              >
                <span style={{
                  fontSize: 13, color: "var(--dp-text-secondary)",
                  }}>
                  {search.name || search.query || "Search"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeRecentSearch(search.id); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 0, display: "flex", alignItems: "center",
                  }}
                >
                  <X size={12} color="var(--dp-text-muted)" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no search */}
      {!isSearching && (!recentSearches || recentSearches.length === 0) && (
        <div style={{
          textAlign: "center", padding: "40px 20px", marginBottom: 28,
          opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease 0.2s",
        }}>
          <Search size={40} color="var(--dp-text-muted)" style={{ marginBottom: 14 }} />
          <div style={{
            fontSize: 14, color: "var(--dp-text-muted)",
            }}>
            Search for friends by name
          </div>
        </div>
      )}

      {/* Suggested People */}
      {!isSearching && (
        <div style={{
          marginBottom: 40,
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.25s",
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: "var(--dp-text-muted)",
            marginBottom: 12,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            People You Might Know
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SUGGESTED_PEOPLE.map((user, i) => renderUserCard(user, i, 0.3))}
          </div>
          <div ref={suggestionsInf.sentinelRef} />
          {suggestionsInf.loadingMore && (
            <div style={{ textAlign: "center", padding: "12px 0", fontSize: 13, color: "var(--dp-text-muted)" }}>Loading more...</div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
