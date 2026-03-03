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
import { CONTACT_COLORS, GRADIENTS } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import Avatar from "../../components/shared/Avatar";
import GlassAppBar from "../../components/shared/GlassAppBar";
import PillTabs from "../../components/shared/PillTabs";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Buddy Requests Screen
// ═══════════════════════════════════════════════════════════════

var AVATAR_COLORS = CONTACT_COLORS;

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
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} />}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)" }}>
              Buddy Requests
            </span>
            {pendingRequests.length > 0 && (
              <span style={{
                background: GRADIENTS.primaryDark,
                color: "#fff", fontSize: 11, fontWeight: 700,
                padding: "2px 8px", borderRadius: 10,
                minWidth: 20, textAlign: "center",
              }}>
                {pendingRequests.length}
              </span>
            )}
          </div>
        }
      />
    }>
      <style>{`
        @keyframes acceptPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Tabs */}
      <PillTabs
        tabs={TAB_DATA.map(function (tab) {
          return { key: tab.id, label: tab.label, icon: tab.icon, count: tab.count > 0 ? tab.count : undefined };
        })}
        active={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 20 }}
      />

      {/* Request List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 32 }}>
        {historyInf.isLoading && [1, 2, 3].map(function (i) {
          return (
            <GlassCard key={i} padding={16} style={{ borderRadius: 16, height: 100, opacity: 0.5 }} />
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
              marginBottom: 6,
            }}>
              {activeTab === "pending" ? "No pending requests"
                : activeTab === "accepted" ? "No accepted buddies yet"
                : "No declined requests"}
            </div>
            <div style={{
              fontSize: 13, color: "var(--dp-text-muted)",
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
            <GlassCard
              key={request.id || index}
              padding={16}
              style={{
                borderRadius: 16,
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
                <Avatar name={request.name} size={50} color={avatarColor} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 15, fontWeight: 600, color: "var(--dp-text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {request.name}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "#8B5CF6",
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
                        }}>
                        {request.matchScore}% match
                      </span>
                    )}
                    <span style={{
                      fontSize: 11, color: "var(--dp-text-tertiary)",
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
                        background: GRADIENTS.success,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.25s ease", fontFamily: "inherit",
                      }}
                    >
                      <Check size={18} color="#fff" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={function () { handleReject(request.id); }}
                      disabled={rejectMutation.isPending}
                      style={{
                        width: 38, height: 38, borderRadius: 12, border: "none",
                        background: "var(--dp-surface)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.25s ease", fontFamily: "inherit",
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
                    fontSize: 12, fontWeight: 600, }}>
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
                    fontSize: 12, fontWeight: 600, animation: "acceptPulse 0.5s ease",
                  }}>
                    {actionStates[request.id] === "accepted" ? "Accepted" : "Declined"}
                  </div>
                )}
              </div>

              {/* Compatibility bar for pending items with match score */}
              {request.matchScore && activeTab === "pending" && !actionStates[request.id] && (
                <div style={{
                  marginTop: 12, height: 4, borderRadius: 2,
                  background: "var(--dp-surface)",
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
            </GlassCard>
          );
        })}

        {/* Infinite scroll sentinel */}
        <div ref={historyInf.sentinelRef} />
        {historyInf.loadingMore && (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, color: "var(--dp-text-muted)" }}>Loading more...</div>
        )}
      </div>
    </PageLayout>
  );
}
