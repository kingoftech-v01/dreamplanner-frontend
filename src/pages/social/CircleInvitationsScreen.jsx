import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { clipboardWrite } from "../../services/native";
import { useTheme } from "../../context/ThemeContext";
import {
  ArrowLeft, UserPlus, Clock, Mail, Link, Copy,
  Check, Search, Send, Users, Loader
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Circle Invitations Screen
// ═══════════════════════════════════════════════════════════════

var AVATAR_COLORS = ["#8B5CF6", "#14B8A6", "#EC4899", "#3B82F6", "#F59E0B", "#10B981", "#6366F1"];

var glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

function getAvatarColor(name) {
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

export default function CircleInvitationsScreen() {
  var navigate = useNavigate();
  var { id } = useParams();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  var [mounted, setMounted] = useState(false);
  var [activeTab, setActiveTab] = useState("invite"); // "invite" | "pending"
  var [searchInput, setSearchInput] = useState("");
  var [copiedLink, setCopiedLink] = useState(false);
  var [inviteLink, setInviteLink] = useState("");

  useEffect(function () {
    setTimeout(function () { setMounted(true); }, 100);
  }, []);

  // ─── API Queries ──────────────────────────────────────────────
  var invitationsQuery = useQuery({
    queryKey: ["circle-invitations", id],
    queryFn: function () { return apiGet("/api/circles/" + id + "/invitations/"); },
  });

  var invitations = ((invitationsQuery.data && invitationsQuery.data.results) || invitationsQuery.data || []).map(function (inv, i) {
    var name = inv.displayName || inv.username || inv.name || inv.email || "User";
    return {
      id: inv.id || i,
      name: name,
      initial: name[0].toUpperCase(),
      color: inv.color || getAvatarColor(name),
      status: inv.status || "pending",
      time: inv.createdAt || inv.time || "",
    };
  });

  var pendingCount = invitations.filter(function (inv) { return inv.status === "pending"; }).length;

  // ─── Invite User Mutation ────────────────────────────────────
  var inviteMutation = useMutation({
    mutationFn: function (userId) {
      return apiPost("/api/circles/" + id + "/invite/", { userId: userId });
    },
    onSuccess: function () {
      showToast("Invitation sent!", "success");
      setSearchInput("");
      queryClient.invalidateQueries({ queryKey: ["circle-invitations", id] });
    },
    onError: function (err) {
      showToast(err.message || "Failed to send invitation", "error");
    },
  });

  // ─── Generate Invite Link Mutation ───────────────────────────
  var linkMutation = useMutation({
    mutationFn: function () {
      return apiPost("/api/circles/" + id + "/invite-link/");
    },
    onSuccess: function (data) {
      var link = (data && data.link) || (data && data.inviteLink) || (data && data.url) || "";
      setInviteLink(link);
      if (link) {
        clipboardWrite(link).then(function () {
          setCopiedLink(true);
          showToast("Invite link copied!", "success");
          setTimeout(function () { setCopiedLink(false); }, 3000);
        }).catch(function () {
          showToast("Link generated. Copy it manually.", "info");
        });
      }
    },
    onError: function (err) {
      showToast(err.message || "Failed to generate link", "error");
    },
  });

  // ─── Handlers ────────────────────────────────────────────────
  var handleInviteUser = function () {
    var trimmed = searchInput.trim();
    if (!trimmed) return;
    inviteMutation.mutate(trimmed);
  };

  var handleCopyLink = function () {
    if (!inviteLink) return;
    clipboardWrite(inviteLink).then(function () {
      setCopiedLink(true);
      showToast("Link copied!", "success");
      setTimeout(function () { setCopiedLink(false); }, 3000);
    });
  };

  var tabs = [
    { key: "invite", label: "Invite Members", icon: UserPlus },
    { key: "pending", label: "Pending", icon: Clock, badge: pendingCount },
  ];

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
          <button className="dp-ib" onClick={function () { navigate(-1); }}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <Mail size={20} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--dp-text)",
              letterSpacing: "-0.3px",
            }}
          >
            Invitations
          </span>
        </div>

        {/* Tab Bar */}
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
          {tabs.map(function (tab) {
            var Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={function () { setActiveTab(tab.key); }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 11,
                  border: "none",
                  background: activeTab === tab.key
                    ? "rgba(139,92,246,0.15)"
                    : "transparent",
                  color: activeTab === tab.key
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
                {tab.badge > 0 && (
                  <span
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 8,
                      minWidth: 16,
                      textAlign: "center",
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══ INVITE MEMBERS TAB ═══ */}
        {activeTab === "invite" && (
          <div>
            {/* Search & Invite by User */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
              }}
            >
              <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Search size={16} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--dp-text)",
                    }}
                  >
                    Invite by Username
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--dp-text-secondary)",
                    lineHeight: 1.5,
                    marginBottom: 14,
                  }}
                >
                  Search for a user by username or ID to send them an invitation.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={searchInput}
                    onChange={function (e) { setSearchInput(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter") handleInviteUser(); }}
                    placeholder="Username or user ID..."
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 14,
                      border: "1px solid var(--dp-input-border)",
                      background: "var(--dp-input-bg)",
                      color: "var(--dp-text)",
                      fontSize: 14,
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleInviteUser}
                    disabled={inviteMutation.isPending || !searchInput.trim()}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      border: "none",
                      background: searchInput.trim()
                        ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                        : "var(--dp-glass-bg)",
                      color: searchInput.trim() ? "#fff" : "var(--dp-text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: searchInput.trim() && !inviteMutation.isPending ? "pointer" : "not-allowed",
                      flexShrink: 0,
                      transition: "all 0.2s",
                      boxShadow: searchInput.trim() ? "0 2px 10px rgba(139,92,246,0.3)" : "none",
                      opacity: inviteMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {inviteMutation.isPending
                      ? <Loader size={17} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                      : <Send size={17} strokeWidth={2} />
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Generate Invite Link */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s",
              }}
            >
              <div style={{ ...glass, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Link size={16} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--dp-text)",
                    }}
                  >
                    Share Invite Link
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--dp-text-secondary)",
                    lineHeight: 1.5,
                    marginBottom: 14,
                  }}
                >
                  Generate a shareable link anyone can use to join this circle.
                </div>

                {inviteLink ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div
                      style={{
                        flex: 1,
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "var(--dp-input-bg)",
                        border: "1px solid var(--dp-input-border)",
                        color: "var(--dp-text-secondary)",
                        fontSize: 13,
                        fontFamily: "inherit",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {inviteLink}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        border: "none",
                        background: copiedLink
                          ? "rgba(16,185,129,0.15)"
                          : "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                        color: copiedLink ? "#10B981" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.25s",
                      }}
                    >
                      {copiedLink ? <Check size={18} strokeWidth={2} /> : <Copy size={18} strokeWidth={2} />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={function () { linkMutation.mutate(); }}
                    disabled={linkMutation.isPending}
                    style={{
                      width: "100%",
                      padding: "13px 0",
                      borderRadius: 14,
                      border: "none",
                      background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: linkMutation.isPending ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 16px rgba(139,92,246,0.3)",
                      transition: "all 0.25s",
                      opacity: linkMutation.isPending ? 0.7 : 1,
                    }}
                  >
                    {linkMutation.isPending
                      ? <Loader size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                      : <Link size={16} strokeWidth={2} />
                    }
                    {linkMutation.isPending ? "Generating..." : "Generate Invite Link"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PENDING TAB ═══ */}
        {activeTab === "pending" && (
          <div>
            {invitationsQuery.isLoading && (
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
                  Loading invitations...
                </p>
              </div>
            )}

            {!invitationsQuery.isLoading && invitations.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  opacity: mounted ? 1 : 0,
                  transition: "all 0.5s ease 0.2s",
                }}
              >
                <Mail
                  size={40}
                  color={isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"}
                  strokeWidth={1.5}
                  style={{ marginBottom: 16 }}
                />
                <p style={{ fontSize: 15, color: "var(--dp-text-tertiary)" }}>
                  No pending invitations
                </p>
                <p style={{ fontSize: 13, color: "var(--dp-text-muted)", marginTop: 4 }}>
                  Invite members using the Invite tab to get started.
                </p>
              </div>
            )}

            {!invitationsQuery.isLoading && invitations.map(function (inv, i) {
              var statusColor = inv.status === "accepted" ? "#10B981"
                : inv.status === "declined" ? "#EF4444"
                : isLight ? "#6D28D9" : "#C4B5FD";
              var statusBg = inv.status === "accepted" ? "rgba(16,185,129,0.1)"
                : inv.status === "declined" ? "rgba(239,68,68,0.1)"
                : "rgba(139,92,246,0.08)";
              var statusLabel = inv.status === "accepted" ? "Accepted"
                : inv.status === "declined" ? "Declined"
                : "Pending";

              return (
                <div
                  key={inv.id}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(16px)",
                    transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) " + (0.15 + i * 0.06) + "s",
                  }}
                >
                  <div
                    style={{
                      ...glass,
                      borderRadius: 18,
                      padding: 16,
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        background: inv.color + "18",
                        border: "2px solid " + inv.color + "25",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 17,
                        fontWeight: 700,
                        color: inv.color,
                        flexShrink: 0,
                      }}
                    >
                      {inv.initial}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--dp-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inv.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--dp-text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {timeAgo(inv.time)}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      style={{
                        padding: "5px 12px",
                        borderRadius: 10,
                        background: statusBg,
                        border: "1px solid " + statusColor + "20",
                        fontSize: 12,
                        fontWeight: 600,
                        color: statusColor,
                        flexShrink: 0,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          input::placeholder { color: var(--dp-text-muted); }
        `}</style>
      </div>
    </PageLayout>
  );
}
