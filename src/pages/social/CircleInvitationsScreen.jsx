import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { CIRCLES } from "../../services/endpoints";
import { useToast } from "../../context/ToastContext";
import { clipboardWrite } from "../../services/native";
import { useTheme } from "../../context/ThemeContext";
import {
  ArrowLeft, UserPlus, Clock, Mail, Link, Copy,
  Check, Search, Send, Users, Loader
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { CONTACT_COLORS, GRADIENTS } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import Avatar from "../../components/shared/Avatar";
import GlassAppBar from "../../components/shared/GlassAppBar";
import PillTabs from "../../components/shared/PillTabs";
import GradientButton from "../../components/shared/GradientButton";
import GlassInput from "../../components/shared/GlassInput";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Circle Invitations Screen
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
    queryFn: function () { return apiGet(CIRCLES.INVITATIONS(id)); },
  });

  var invitations = ((invitationsQuery.data && invitationsQuery.data.results) || invitationsQuery.data || []).map(function (inv, i) {
    if (!inv) return null;
    var name = inv.displayName || inv.username || inv.name || inv.email || "User";
    return {
      id: inv.id || i,
      name: name,
      initial: name[0].toUpperCase(),
      color: inv.color || getAvatarColor(name),
      status: inv.status || "pending",
      time: inv.createdAt || inv.time || "",
    };
  }).filter(Boolean);

  var pendingCount = invitations.filter(function (inv) { return inv.status === "pending"; }).length;

  // ─── Invite User Mutation ────────────────────────────────────
  var inviteMutation = useMutation({
    mutationFn: function (userId) {
      return apiPost(CIRCLES.INVITE(id), { user_id: userId });
    },
    onSuccess: function () {
      showToast("Invitation sent!", "success");
      setSearchInput("");
      queryClient.invalidateQueries({ queryKey: ["circle-invitations", id] });
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to send invitation", "error");
    },
  });

  // ─── Generate Invite Link Mutation ───────────────────────────
  var linkMutation = useMutation({
    mutationFn: function () {
      return apiPost(CIRCLES.INVITE_LINK(id));
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
      showToast(err.userMessage || err.message || "Failed to generate link", "error");
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
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate("/social"); }} />}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Mail size={18} color="var(--dp-accent-text)" strokeWidth={2} />
            <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)", letterSpacing: "-0.3px" }}>
              Invitations
            </span>
          </div>
        }
      />
    }>
      <div style={{ paddingBottom: 80 }}>

        {/* Tab Bar */}
        <PillTabs
          tabs={tabs.map(function (tab) {
            return { key: tab.key, label: tab.label, icon: tab.icon, count: tab.badge > 0 ? tab.badge : undefined };
          })}
          active={activeTab}
          onChange={setActiveTab}
          style={{ marginBottom: 20 }}
        />

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
              <GlassCard padding={20} mb={16}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Search size={16} color="var(--dp-accent-text)" strokeWidth={2} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)" }}>
                    Invite by Username
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
                  Search for a user by username or ID to send them an invitation.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <GlassInput
                    value={searchInput}
                    onChange={function (e) { setSearchInput(e.target.value); }}
                    onKeyDown={function (e) { if (e.key === "Enter") handleInviteUser(); }}
                    placeholder="Username or user ID..."
                    style={{ flex: 1, borderRadius: 14 }}
                  />
                  <GradientButton
                    gradient="primaryDark"
                    onClick={handleInviteUser}
                    disabled={inviteMutation.isPending || !searchInput.trim()}
                    loading={inviteMutation.isPending}
                    icon={Send}
                    size="md"
                    style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0 }}
                  />
                </div>
              </GlassCard>
            </div>

            {/* Generate Invite Link */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s",
              }}
            >
              <GlassCard padding={20} mb={16}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Link size={16} color="var(--dp-accent-text)" strokeWidth={2} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)" }}>
                    Share Invite Link
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
                  Generate a shareable link anyone can use to join this circle.
                </div>

                {inviteLink ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{
                      flex: 1, padding: "12px 14px", borderRadius: 14,
                      background: "var(--dp-input-bg)", border: "1px solid var(--dp-input-border)",
                      color: "var(--dp-text-secondary)", fontSize: 13, fontFamily: "inherit",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {inviteLink}
                    </div>
                    <GradientButton
                      gradient={copiedLink ? "success" : "primaryDark"}
                      onClick={handleCopyLink}
                      icon={copiedLink ? Check : Copy}
                      size="md"
                      style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0 }}
                    />
                  </div>
                ) : (
                  <GradientButton
                    gradient="primaryDark"
                    onClick={function () { linkMutation.mutate(); }}
                    disabled={linkMutation.isPending}
                    loading={linkMutation.isPending}
                    icon={Link}
                    fullWidth
                  >
                    {linkMutation.isPending ? "Generating..." : "Generate Invite Link"}
                  </GradientButton>
                )}
              </GlassCard>
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
                    borderTopColor: "var(--dp-accent)",
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
                  color="var(--dp-text-muted)"
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
              if (!inv) return null;
              var statusColor = inv.status === "accepted" ? "#10B981"
                : inv.status === "declined" ? "#EF4444"
                : "var(--dp-accent-text)";
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
                  <GlassCard
                    radius={18}
                    padding={16}
                    mb={10}
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    {/* Avatar */}
                    <Avatar name={inv.name} size={42} color={inv.color} />

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
                  </GlassCard>
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
