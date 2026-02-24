import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { ArrowLeft, Search, X, UserPlus, Check, Users } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";

const AVATAR_COLORS = ["#8B5CF6", "#14B8A6", "#EC4899", "#3B82F6", "#10B981", "#FCD34D", "#6366F1", "#EF4444"];

const glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

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

  var searchQuery = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: function () { return apiGet("/api/social/users/search?q=" + encodeURIComponent(debouncedQuery)); },
    enabled: debouncedQuery.length > 0,
  });

  var recentSearchesQuery = useQuery({
    queryKey: ["recent-searches"],
    queryFn: function () { return apiGet("/api/social/recent-searches/list/"); },
  });

  var suggestionsQuery = useQuery({
    queryKey: ["follow-suggestions"],
    queryFn: function () { return apiGet("/api/social/follow-suggestions/"); },
  });

  var searchResults = ((searchQuery.data && searchQuery.data.results) || searchQuery.data || []).map(function (u) {
    return Object.assign({}, u, {
      name: u.name || u.displayName || u.username || "User",
      initial: u.initial || (u.name || u.displayName || u.username || "U")[0].toUpperCase(),
      level: u.level || 1,
      mutualFriends: u.mutualFriends || 0,
    });
  });

  var recentSearches = (recentSearchesQuery.data && (recentSearchesQuery.data.recentSearches || recentSearchesQuery.data.results)) || recentSearchesQuery.data || [];

  var SUGGESTED_PEOPLE = ((suggestionsQuery.data && suggestionsQuery.data.results) || suggestionsQuery.data || []).map(function (u) {
    return Object.assign({}, u, {
      name: u.name || u.displayName || u.username || "User",
      initial: u.initial || (u.name || u.displayName || u.username || "U")[0].toUpperCase(),
      level: u.level || 1,
      mutualFriends: u.mutualFriends || 0,
    });
  });

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
    apiPost("/api/social/friends/request/", { userId: userId }).then(function () {
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
    // Backend only supports clear-all (DELETE /api/social/recent-searches/clear/), no individual delete
  };

  const isSearching = query.length > 0;

  const renderUserCard = (user, index, delay) => {
    const isSent = sentRequests.has(user.id);
    const avatarColor = getAvatarColor(user.name);

    return (
      <div
        key={user.id}
        style={{
          ...glassStyle, borderRadius: 16,
          padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(15px)",
          transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${delay + index * 0.06}s`,
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 46, height: 46, borderRadius: 15, flexShrink: 0,
          background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 700, color: "#fff",
          fontFamily: "Inter, sans-serif",
          boxShadow: `0 4px 12px ${avatarColor}30`,
        }}>
          {user.initial}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{
              fontSize: 14, fontWeight: 600, color: "var(--dp-text)",
              fontFamily: "Inter, sans-serif",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {user.name}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#8B5CF6",
              fontFamily: "Inter, sans-serif",
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
            fontFamily: "Inter, sans-serif",
          }}>
            <Users size={11} />
            {user.mutualFriends} mutual friend{user.mutualFriends !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={() => !isSent && handleAddFriend(user.id)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "8px 14px", borderRadius: 10,
            background: isSent
              ? "rgba(20,184,166,0.15)"
              : "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.15))",
            border: isSent
              ? "1px solid rgba(20,184,166,0.3)"
              : "1px solid rgba(139,92,246,0.25)",
            color: isSent ? "#14B8A6" : (isLight ? "#6D28D9" : "#C4B5FD"),
            fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif",
            cursor: isSent ? "default" : "pointer",
            transition: "all 0.3s ease",
            flexShrink: 0,
          }}
        >
          {isSent ? (
            <>
              <Check size={13} />
              Sent
            </>
          ) : (
            <>
              <UserPlus size={13} />
              Add Friend
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <PageLayout>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        paddingTop: 16, paddingBottom: 16,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <button className="dp-ib" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
          fontFamily: "Inter, sans-serif", margin: 0,
        }}>
          Find People
        </h1>
      </div>

      {/* Search Input */}
      <div style={{
        ...glassStyle, borderRadius: 16,
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
            color: "var(--dp-text)", fontSize: 15, fontFamily: "Inter, sans-serif",
            padding: "12px 0",
          }}
        />
        {query.length > 0 && (
          <button
            onClick={() => setQuery("")}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--dp-surface-hover)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
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
            fontFamily: "Inter, sans-serif", marginBottom: 12,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            Search Results
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {searchResults.map((user, i) => renderUserCard(user, i, 0.15))}
          </div>
        </div>
      )}

      {/* Empty search state */}
      {isSearching && searchResults.length === 0 && (
        <div style={{
          textAlign: "center", padding: "50px 20px",
          opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease 0.2s",
        }}>
          <Search size={40} color={isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"} style={{ marginBottom: 14 }} />
          <div style={{
            fontSize: 15, fontWeight: 600, color: "var(--dp-text-tertiary)",
            fontFamily: "Inter, sans-serif", marginBottom: 6,
          }}>
            No results found
          </div>
          <div style={{
            fontSize: 13, color: "var(--dp-text-muted)",
            fontFamily: "Inter, sans-serif",
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
            fontFamily: "Inter, sans-serif", marginBottom: 12,
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
                  fontFamily: "Inter, sans-serif",
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
          <Search size={40} color={isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"} style={{ marginBottom: 14 }} />
          <div style={{
            fontSize: 14, color: "var(--dp-text-muted)",
            fontFamily: "Inter, sans-serif",
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
            fontFamily: "Inter, sans-serif", marginBottom: 12,
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            People You Might Know
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SUGGESTED_PEOPLE.map((user, i) => renderUserCard(user, i, 0.3))}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
