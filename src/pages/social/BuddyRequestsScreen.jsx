import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../../services/api";
import { BUDDIES } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import { ArrowLeft, UserPlus, Check, X, Users, Clock } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Buddy Requests Screen
// ═══════════════════════════════════════════════════════════════

var AVATAR_COLORS = ["#8B5CF6", "#14B8A6", "#EC4899", "#3B82F6", "#10B981", "#FCD34D", "#6366F1", "#EF4444"];

var glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  var hash = 0;
  for (var i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  var s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export default function BuddyRequestsScreen() {
  var navigate = useNavigate();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  var [mounted, setMounted] = useState(false);
  var [activeTab, setActiveTab] = useState("pending");
  var [actionStates, setActionStates] = useState({});

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  // ─── API Query (infinite scroll) ──────────────────────────────

  var historyInf = useInfiniteList({ queryKey: ["buddy-history"], url: BUDDIES.HISTORY, limit: 20 });

  var ALL_REQUESTS = historyInf.items.map(function (req) {
    if (!req) return null;
    var name = req.name || req.displayName || req.username || req.buddyName || "User";
    return Object.assign({}, req, {
      name: name,
      initial: name[0].toUpperCase(),
      status: req.status || "pending",
      level: req.level || 1,
      matchScore: req.matchScore || req.compatibility || req.compatibilityScore || null,
      time: req.createdAt || req.time || "",
    });
  }).filter(Boolean);

  var pendingRequests = ALL_REQUESTS.filter(function (r) {
    if (actionStates[r.id]) return false;
    return r.status === "pending";
  });
  var acceptedRequests = ALL_REQUESTS.filter(function (r) {
    return r.status === "accepted" || actionStates[r.id] === "accepted";
  });
  var rejectedRequests = ALL_REQUESTS.filter(function (r) {
    return r.status === "rejected" || actionStates[r.id] === "rejected";
  });

  // ─── Accept Mutation ──────────────────────────────────────────

  var acceptMutation = useMutation({
    mutationFn: function (buddyId) {
      return apiPost(BUDDIES.ACCEPT(buddyId));
    },
    onSuccess: function () {
      showToast("Buddy request accepted!", "success");
      queryClient.invalidateQueries({ queryKey: ["buddy-history"] });
    },
    onError: function (err, buddyId) {
      showToast(err.message || "Failed to accept request", "error");
      setActionStates(function (prev) { var n = Object.assign({}, prev); delete n[buddyId]; return n; });
    },
  });

  // ─── Reject Mutation ──────────────────────────────────────────

  var rejectMutation = useMutation({
    mutationFn: function (buddyId) {
      return apiPost(BUDDIES.REJECT(buddyId));
    },
    onSuccess: function () {
      showToast("Buddy request declined", "info");
      queryClient.invalidateQueries({ queryKey: ["buddy-history"] });
    },
    onError: function (err, buddyId) {
      showToast(err.message || "Failed to decline request", "error");
      setActionStates(function (prev) { var n = Object.assign({}, prev); delete n[buddyId]; return n; });
    },
  });

  // ─── Handlers ─────────────────────────────────────────────────

  var handleAccept = function (id) {
    setActionStates(function (prev) { return Object.assign({}, prev, { [id]: "accepted" }); });
    acceptMutation.mutate(id);
  };

  var handleReject = function (id) {
    setActionStates(function (prev) { return Object.assign({}, prev, { [id]: "rejected" }); });
    rejectMutation.mutate(id);
  };

  // Compatibility score color
  function getCompatColor(score) {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#FCD34D";
    if (score >= 40) return "#F59E0B";
    return "#EF4444";
  }

  var TAB_DATA = [
    { id: "pending", label: "Pending", icon: UserPlus, count: pendingRequests.length },
    { id: "accepted", label: "Accepted", icon: Users, count: acceptedRequests.length },
    { id: "rejected", label: "Declined", icon: Clock, count: rejectedRequests.length },
  ];

  var currentList = activeTab === "pending" ? pendingRequests
    : activeTab === "accepted" ? acceptedRequests
    : rejectedRequests;

  return (
    <PageLayout>
      <style>{`
        @keyframes acceptPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        paddingTop: 16, paddingBottom: 16,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <button className="dp-ib" onClick={function () { navigate(-1); }}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
            fontFamily: "Inter, sans-serif", margin: 0,
          }}>
            Buddy Requests
          </h1>
          {pendingRequests.length > 0 && (
            <span style={{
              background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              color: "#fff", fontSize: 11, fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              padding: "2px 8px", borderRadius: 10,
              minWidth: 20, textAlign: "center",
            }}>
              {pendingRequests.length}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20,
        ...glassStyle, borderRadius: 14, padding: 4,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s",
      }}>
        {TAB_DATA.map(function (tab) {
          var Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={function () { setActiveTab(tab.id); }}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 0", borderRadius: 12, border: "none",
                background: activeTab === tab.id
                  ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.2))"
                  : "transparent",
                color: activeTab === tab.id ? "var(--dp-text)" : "var(--dp-text-tertiary)",
                fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
                cursor: "pointer", transition: "all 0.25s ease",
              }}
            >
              <Icon size={15} />
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: "1px 6px", borderRadius: 6,
                  background: activeTab === tab.id
                    ? "rgba(255,255,255,0.15)"
                    : "var(--dp-surface-hover)",
                  color: activeTab === tab.id ? "var(--dp-text)" : "var(--dp-text-muted)",
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Request List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 32 }}>
        {historyInf.isLoading && [1, 2, 3].map(function (i) {
          return (
            <div key={i} style={{
              ...glassStyle, borderRadius: 16, padding: 16, height: 100,
              opacity: 0.5,
            }} />
          );
        })}

        {!historyInf.isLoading && currentList.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease 0.3s",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: "var(--dp-glass-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              {activeTab === "pending" ? (
                <UserPlus size={32} color="var(--dp-text-muted)" />
              ) : activeTab === "accepted" ? (
                <Users size={32} color="var(--dp-text-muted)" />
              ) : (
                <Clock size={32} color="var(--dp-text-muted)" />
              )}
            </div>
            <div style={{
              fontSize: 16, fontWeight: 600, color: "var(--dp-text-tertiary)",
              fontFamily: "Inter, sans-serif", marginBottom: 6,
            }}>
              {activeTab === "pending" ? "No pending requests"
                : activeTab === "accepted" ? "No accepted buddies yet"
                : "No declined requests"}
            </div>
            <div style={{
              fontSize: 13, color: "var(--dp-text-muted)",
              fontFamily: "Inter, sans-serif",
            }}>
              {activeTab === "pending"
                ? "Buddy requests will appear here when someone wants to pair up with you"
                : activeTab === "accepted"
                ? "Accepted buddy partnerships will appear here"
                : "Past declined requests will appear here"}
            </div>
          </div>
        )}

        {!historyInf.isLoading && currentList.map(function (request, index) {
          if (!request) return null;
          var avatarColor = getAvatarColor(request.name);
          var isAccepted = request.status === "accepted" || actionStates[request.id] === "accepted";
          var compatColor = request.matchScore ? getCompatColor(request.matchScore) : null;

          return (
            <div
              key={request.id || index}
              style={{
                ...glassStyle, borderRadius: 16, padding: 16,
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(15px)",
                transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                transitionDelay: (0.15 + index * 0.06) + "s",
                ...(isAccepted ? {
                  background: "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.12)",
                } : {}),
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Avatar */}
                <div style={{
                  width: 50, height: 50, borderRadius: 16, flexShrink: 0,
                  background: "linear-gradient(135deg, " + avatarColor + ", " + avatarColor + "88)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 19, fontWeight: 700, color: "#fff",
                  fontFamily: "Inter, sans-serif",
                  boxShadow: "0 4px 12px " + avatarColor + "30",
                }}>
                  {request.initial}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 15, fontWeight: 600, color: "var(--dp-text)",
                      fontFamily: "Inter, sans-serif",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {request.name}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "#8B5CF6",
                      fontFamily: "Inter, sans-serif",
                      padding: "2px 6px", borderRadius: 6,
                      background: "rgba(139,92,246,0.15)",
                    }}>
                      Lv.{request.level}
                    </span>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    {request.matchScore && (
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: compatColor,
                        fontFamily: "Inter, sans-serif",
                      }}>
                        {request.matchScore}% match
                      </span>
                    )}
                    <span style={{
                      fontSize: 11, color: "var(--dp-text-tertiary)",
                      fontFamily: "Inter, sans-serif",
                    }}>
                      {timeAgo(request.time)}
                    </span>
                  </div>
                </div>

                {/* Actions for pending */}
                {activeTab === "pending" && !actionStates[request.id] && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={function () { handleAccept(request.id); }}
                      disabled={acceptMutation.isPending}
                      style={{
                        width: 38, height: 38, borderRadius: 12, border: "none",
                        background: "linear-gradient(135deg, #10B981, #059669)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.25s ease",
                      }}
                    >
                      <Check size={18} color="#fff" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={function () { handleReject(request.id); }}
                      disabled={rejectMutation.isPending}
                      style={{
                        width: 38, height: 38, borderRadius: 12, border: "none",
                        background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.25s ease",
                      }}
                    >
                      <X size={18} color="var(--dp-text-secondary)" strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                {/* Status badge for non-pending tabs */}
                {activeTab !== "pending" && (
                  <div style={{
                    padding: "4px 10px", borderRadius: 8,
                    background: isAccepted ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)",
                    color: isAccepted ? "#10B981" : "#EF4444",
                    fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif",
                  }}>
                    {isAccepted ? "Accepted" : "Declined"}
                  </div>
                )}

                {/* Optimistic status after action on pending tab */}
                {activeTab === "pending" && actionStates[request.id] && (
                  <div style={{
                    padding: "4px 10px", borderRadius: 8,
                    background: actionStates[request.id] === "accepted"
                      ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)",
                    color: actionStates[request.id] === "accepted" ? "#10B981" : "#EF4444",
                    fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif",
                    animation: "acceptPulse 0.5s ease",
                  }}>
                    {actionStates[request.id] === "accepted" ? "Accepted" : "Declined"}
                  </div>
                )}
              </div>

              {/* Compatibility bar for pending items with match score */}
              {request.matchScore && activeTab === "pending" && !actionStates[request.id] && (
                <div style={{
                  marginTop: 12, height: 4, borderRadius: 2,
                  background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    width: request.matchScore + "%",
                    background: "linear-gradient(90deg, " + compatColor + ", " + compatColor + "88)",
                    transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                  }} />
                </div>
              )}
            </div>
          );
        })}

        {/* Infinite scroll sentinel */}
        <div ref={historyInf.sentinelRef} />
        {historyInf.loadingMore && (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, color: "var(--dp-text-muted)", fontFamily: "Inter, sans-serif" }}>Loading more...</div>
        )}
      </div>
    </PageLayout>
  );
}
