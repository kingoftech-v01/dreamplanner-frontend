import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../../services/api";
import useInfiniteList from "../../hooks/useInfiniteList";
import {
  ArrowLeft, Users, Plus, Flame, Trophy, MessageSquare,
  Search, ChevronRight, UserPlus, Check
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Circles Screen
// ═══════════════════════════════════════════════════════════════

const CATEGORY_COLORS = {
  Health: "#10B981",
  Career: "#8B5CF6",
  Growth: "#6366F1",
  Finance: "#FCD34D",
  Hobbies: "#EC4899",
};

const glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

function normalizeCircles(data) {
  var list = Array.isArray(data) ? data : (data && data.results ? data.results : []);
  return list.map(function (c) {
    return {
      id: c.id,
      name: c.name || "",
      description: c.description || "",
      category: c.category || "Growth",
      memberCount: c.memberCount != null ? c.memberCount : 0,
      posts: c.posts != null ? c.posts : 0,
      activeChallenge: c.activeChallenge || null,
      isJoined: c.isJoined != null ? c.isJoined : false,
    };
  });
}

export default function CirclesScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  const { showToast } = useToast();
  var queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("my"); // "my" | "discover"
  var [justJoinedSet, setJustJoinedSet] = useState(function () { return new Set(); });

  var myCirclesInf = useInfiniteList({ queryKey: ["circles", "my"], url: "/api/circles/?filter=my", limit: 20 });
  var discoverInf = useInfiniteList({ queryKey: ["circles", "discover"], url: "/api/circles/?filter=recommended", limit: 20 });

  var myCircles = normalizeCircles(myCirclesInf.items);
  var discoverCircles = normalizeCircles(discoverInf.items);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  var joinMut = useMutation({
    mutationFn: function (circleId) { return apiPost("/api/circles/" + circleId + "/join/"); },
    onSuccess: function (_data, circleId) {
      setJustJoinedSet(function (prev) {
        var next = new Set(prev);
        next.add(circleId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      showToast("Joined circle!", "success");
    },
    onError: function (err) { showToast(err.message || "Failed to join", "error"); },
  });

  var isLoading = (activeTab === "my" && myCirclesInf.isLoading) ||
    (activeTab === "discover" && discoverInf.isLoading);

  const tabs = [
    { key: "my", label: "My Circles" },
    { key: "discover", label: "Discover" },
  ];

  const currentList = activeTab === "my" ? myCircles : discoverCircles;

  if (myCirclesInf.isError || discoverInf.isError) {
    return (
      <PageLayout>
        <ErrorState
          message={((myCirclesInf.error && myCirclesInf.error.message) || (discoverInf.error && discoverInf.error.message)) || "Failed to load circles"}
          onRetry={function () { myCirclesInf.refetch(); discoverInf.refetch(); }}
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
          paddingBottom: 100,
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
          <Users size={20} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--dp-text)",
              letterSpacing: "-0.3px",
            }}
          >
            Circles
          </span>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            borderRadius: 14,
            background: "var(--dp-glass-bg)",
            border: "1px solid var(--dp-glass-border)",
            marginBottom: 20,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "10px 0",
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
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow:
                  activeTab === tab.key
                    ? "0 2px 8px rgba(139,92,246,0.15)"
                    : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Circle cards */}
        {isLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              opacity: mounted ? 1 : 0,
              transition: "all 0.5s ease 0.2s",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid var(--dp-glass-border)",
                borderTopColor: isLight ? "#8B5CF6" : "#C4B5FD",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ fontSize: 14, color: "var(--dp-text-tertiary)" }}>
              Loading circles...
            </p>
          </div>
        ) : currentList.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              opacity: mounted ? 1 : 0,
              transition: "all 0.5s ease 0.2s",
            }}
          >
            <Users
              size={40}
              color={isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"}
              strokeWidth={1.5}
              style={{ marginBottom: 16 }}
            />
            <p style={{ fontSize: 15, color: "var(--dp-text-tertiary)" }}>
              {activeTab === "my"
                ? "You haven't joined any circles yet"
                : "No new circles to discover"}
            </p>
          </div>
        ) : (
          currentList.map((circle, i) => {
            const categoryColor =
              CATEGORY_COLORS[circle.category] || "#C4B5FD";
            const justJoined =
              activeTab === "discover" && (circle.isJoined || justJoinedSet.has(circle.id));

            return (
              <div
                key={circle.id}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(16px)",
                  transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.15 + i * 0.07}s`,
                }}
              >
                <div
                  onClick={() => navigate(`/circle/${circle.id}`)}
                  style={{
                    ...glass,
                    padding: 18,
                    marginBottom: 12,
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--dp-surface-hover)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--dp-glass-bg)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "inset 0 1px 0 rgba(255,255,255,0.06)";
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "var(--dp-text)",
                          }}
                        >
                          {circle.name}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--dp-text-secondary)",
                          lineHeight: 1.5,
                          marginBottom: 10,
                        }}
                      >
                        {circle.description}
                      </p>
                    </div>
                    <ChevronRight
                      size={18}
                      color="var(--dp-text-muted)"
                      strokeWidth={2}
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                  </div>

                  {/* Meta row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {/* Category pill */}
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: `${categoryColor}12`,
                        border: `1px solid ${categoryColor}20`,
                        fontSize: 11,
                        fontWeight: 600,
                        color: isLight ? ({ "#FCD34D": "#B45309" }[categoryColor] || categoryColor) : categoryColor,
                      }}
                    >
                      {circle.category}
                    </span>

                    {/* Member count */}
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "var(--dp-text-tertiary)",
                      }}
                    >
                      <Users size={12} strokeWidth={2} />
                      {circle.memberCount}
                    </span>

                    {/* Post count */}
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        color: "var(--dp-text-tertiary)",
                      }}
                    >
                      <MessageSquare size={12} strokeWidth={2} />
                      {circle.posts}
                    </span>

                    {/* Active challenge */}
                    {circle.activeChallenge && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 8,
                          background: "rgba(249,115,22,0.08)",
                          border: "1px solid rgba(249,115,22,0.15)",
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#FB923C",
                        }}
                      >
                        <Flame size={11} strokeWidth={2.5} />
                        Challenge
                      </span>
                    )}

                    {/* Join button (Discover tab) */}
                    {activeTab === "discover" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          joinMut.mutate(circle.id);
                        }}
                        disabled={justJoined || joinMut.isPending}
                        style={{
                          marginLeft: "auto",
                          padding: "6px 14px",
                          borderRadius: 10,
                          border: justJoined
                            ? "1px solid rgba(16,185,129,0.2)"
                            : "none",
                          background: justJoined
                            ? "rgba(16,185,129,0.08)"
                            : "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                          color: justJoined ? "#10B981" : "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: justJoined ? "default" : "pointer",
                          fontFamily: "inherit",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          boxShadow: justJoined
                            ? "none"
                            : "0 2px 8px rgba(139,92,246,0.25)",
                          transition: "all 0.25s",
                        }}
                      >
                        {justJoined ? (
                          <>
                            <Check size={13} strokeWidth={2.5} />
                            Joined
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} strokeWidth={2} />
                            Join
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={myCirclesInf.sentinelRef} style={{height:1}} />
        <div ref={discoverInf.sentinelRef} style={{height:1}} />
        {(activeTab === "my" ? myCirclesInf.loadingMore : discoverInf.loadingMore) && <div style={{textAlign:"center",padding:16,color:isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.4)",fontSize:13}}>Loading more…</div>}

        {/* Create Circle FAB */}
        <button
          onClick={() => navigate("/circles/create")}
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            width: 56,
            height: 56,
            borderRadius: 18,
            border: "none",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow:
              "0 6px 24px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.15)",
            zIndex: 100,
            transition: "all 0.25s",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "scale(1)" : "scale(0.5)",
          }}
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>
    </PageLayout>
  );
}
