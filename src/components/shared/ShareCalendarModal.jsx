import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../services/api";
import { CALENDAR, BUDDIES } from "../../services/endpoints";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import GlassModal from "./GlassModal";
import GradientButton from "./GradientButton";
import { BRAND } from "../../styles/colors";
import {
  Share2, Link2, Copy, Check, Trash2, Eye, MessageSquare, Users, Loader2
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * ShareCalendarModal
 * Modal for sharing calendar with buddies and generating share links.
 * ═══════════════════════════════════════════════════════════════════ */

export default function ShareCalendarModal({ open, onClose }) {
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();

  var [tab, setTab] = useState("buddies"); // "buddies" | "link" | "shared"
  var [selectedPermission, setSelectedPermission] = useState("view");
  var [copiedToken, setCopiedToken] = useState(null);
  var [generatingLink, setGeneratingLink] = useState(false);

  // Fetch current buddy pairing
  var buddyQuery = useQuery({
    queryKey: ["buddy-current"],
    queryFn: function () { return apiGet(BUDDIES.CURRENT); },
    enabled: open,
    staleTime: 60000,
  });

  // Fetch my shares
  var mySharesQuery = useQuery({
    queryKey: ["calendar-my-shares"],
    queryFn: function () { return apiGet(CALENDAR.SHARING.MY_SHARES); },
    enabled: open,
    staleTime: 30000,
  });

  // Fetch shared with me
  var sharedWithMeQuery = useQuery({
    queryKey: ["calendar-shared-with-me"],
    queryFn: function () { return apiGet(CALENDAR.SHARING.SHARED_WITH_ME); },
    enabled: open && tab === "shared",
    staleTime: 30000,
  });

  // Share with buddy mutation
  var shareMut = useMutation({
    mutationFn: function (data) { return apiPost(CALENDAR.SHARING.SHARE, data); },
    onSuccess: function () {
      showToast("Calendar shared successfully!", "success");
      queryClient.invalidateQueries({ queryKey: ["calendar-my-shares"] });
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to share calendar", "error");
    },
  });

  // Generate link mutation
  var linkMut = useMutation({
    mutationFn: function (data) { return apiPost(CALENDAR.SHARING.SHARE_LINK, data); },
    onSuccess: function (data) {
      setGeneratingLink(false);
      queryClient.invalidateQueries({ queryKey: ["calendar-my-shares"] });
      if (data && data.shareToken) {
        var url = window.location.origin + "/calendar/shared/" + data.shareToken;
        navigator.clipboard.writeText(url).then(function () {
          setCopiedToken(data.shareToken);
          showToast("Share link copied to clipboard!", "success");
          setTimeout(function () { setCopiedToken(null); }, 3000);
        }).catch(function () {
          showToast("Link generated! Token: " + data.shareToken, "info");
        });
      }
    },
    onError: function (err) {
      setGeneratingLink(false);
      showToast(err.userMessage || err.message || "Failed to generate link", "error");
    },
  });

  // Revoke mutation
  var revokeMut = useMutation({
    mutationFn: function (id) { return apiDelete(CALENDAR.SHARING.REVOKE(id)); },
    onSuccess: function () {
      showToast("Share revoked", "success");
      queryClient.invalidateQueries({ queryKey: ["calendar-my-shares"] });
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to revoke share", "error");
    },
  });

  // Reset state when modal closes
  useEffect(function () {
    if (!open) {
      setTab("buddies");
      setSelectedPermission("view");
      setCopiedToken(null);
    }
  }, [open]);

  var buddy = buddyQuery.data;
  var buddyPartner = buddy && buddy.partner ? buddy.partner : null;
  var myShares = Array.isArray(mySharesQuery.data) ? mySharesQuery.data : [];
  var sharedWithMe = Array.isArray(sharedWithMeQuery.data) ? sharedWithMeQuery.data : [];

  // Check if already shared with buddy
  var isSharedWithBuddy = buddyPartner && myShares.some(function (s) {
    return s.sharedWith === buddyPartner.id && s.isActive;
  });

  function handleShareWithBuddy() {
    if (!buddyPartner) return;
    shareMut.mutate({
      userId: buddyPartner.id,
      permission: selectedPermission,
    });
  }

  function handleGenerateLink() {
    setGeneratingLink(true);
    linkMut.mutate({ permission: selectedPermission });
  }

  function handleCopyLink(token) {
    var url = window.location.origin + "/calendar/shared/" + token;
    navigator.clipboard.writeText(url).then(function () {
      setCopiedToken(token);
      showToast("Link copied!", "success");
      setTimeout(function () { setCopiedToken(null); }, 3000);
    }).catch(function () {
      showToast("Failed to copy", "error");
    });
  }

  function handleRevoke(id) {
    revokeMut.mutate(id);
  }

  // Tab style
  function tabStyle(key) {
    var active = tab === key;
    return {
      flex: 1,
      padding: "8px 0",
      fontSize: 13,
      fontWeight: 600,
      textAlign: "center",
      cursor: "pointer",
      border: "none",
      borderRadius: 10,
      background: active ? "var(--dp-accent-bg)" : "transparent",
      color: active ? BRAND.purple : "var(--dp-text-secondary)",
      transition: "all 0.2s",
    };
  }

  var permOptions = [
    { value: "view", label: "View only", icon: Eye, desc: "Can see your schedule" },
    { value: "suggest", label: "Can suggest times", icon: MessageSquare, desc: "Can suggest event times" },
  ];

  return (
    <GlassModal open={open} onClose={onClose} title="Share Calendar" maxWidth={460}>
      <div style={{ padding: "0 20px 20px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--dp-surface)", borderRadius: 12, padding: 4 }}>
          <button style={tabStyle("buddies")} onClick={function () { setTab("buddies"); }}>
            <Users size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Buddies
          </button>
          <button style={tabStyle("link")} onClick={function () { setTab("link"); }}>
            <Link2 size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Share Link
          </button>
          <button style={tabStyle("shared")} onClick={function () { setTab("shared"); }}>
            <Share2 size={14} style={{ marginRight: 4, verticalAlign: "middle" }} /> Shared
          </button>
        </div>

        {/* Permission selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Permission Level
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {permOptions.map(function (opt) {
              var PermIcon = opt.icon;
              var active = selectedPermission === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={function () { setSelectedPermission(opt.value); }}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: active ? "1.5px solid " + BRAND.purple : "1px solid var(--dp-glass-border)",
                    background: active ? "rgba(139,92,246,0.08)" : "var(--dp-surface)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <PermIcon size={14} color={active ? BRAND.purple : "var(--dp-text-muted)"} strokeWidth={2} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? BRAND.purple : "var(--dp-text-primary)" }}>{opt.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buddies Tab */}
        {tab === "buddies" && (
          <div>
            {buddyQuery.isLoading && (
              <div style={{ textAlign: "center", padding: 20, color: "var(--dp-text-muted)" }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            )}
            {!buddyQuery.isLoading && !buddyPartner && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--dp-text-muted)", fontSize: 13 }}>
                No active buddy found. Pair with a buddy first to share your calendar.
              </div>
            )}
            {buddyPartner && (
              <div style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid var(--dp-glass-border)",
                background: "var(--dp-surface)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "linear-gradient(135deg, " + BRAND.purple + ", " + BRAND.teal + ")",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 16,
                  flexShrink: 0,
                }}>
                  {(buddyPartner.username || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {buddyPartner.username || "Buddy"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                    {isSharedWithBuddy ? "Calendar shared" : "Dream Buddy"}
                  </div>
                </div>
                {isSharedWithBuddy ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={16} color={BRAND.greenAction} strokeWidth={2.5} />
                    <span style={{ fontSize: 12, color: BRAND.greenAction, fontWeight: 600 }}>Shared</span>
                  </div>
                ) : (
                  <GradientButton
                    size="sm"
                    onClick={handleShareWithBuddy}
                    loading={shareMut.isPending}
                    icon={Share2}
                  >
                    Share
                  </GradientButton>
                )}
              </div>
            )}

            {/* Active shares list */}
            {myShares.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Active Shares
                </div>
                {myShares.map(function (share) {
                  var isLink = !share.sharedWith;
                  return (
                    <div key={share.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      borderRadius: 10, border: "1px solid var(--dp-glass-border)",
                      background: "var(--dp-surface)", marginBottom: 6,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: isLink ? "rgba(20,184,166,0.12)" : "rgba(139,92,246,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {isLink
                          ? <Link2 size={14} color={BRAND.teal} strokeWidth={2} />
                          : <Users size={14} color={BRAND.purple} strokeWidth={2} />
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {isLink ? "Share Link" : (share.sharedWithName || "User")}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>
                          {share.permission === "suggest" ? "Can suggest times" : "View only"}
                        </div>
                      </div>
                      {isLink && (
                        <button
                          onClick={function () { handleCopyLink(share.shareToken); }}
                          style={{
                            width: 32, height: 32, borderRadius: 8,
                            border: "1px solid var(--dp-glass-border)",
                            background: "transparent", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                          aria-label="Copy share link"
                        >
                          {copiedToken === share.shareToken
                            ? <Check size={14} color={BRAND.greenAction} strokeWidth={2} />
                            : <Copy size={14} color="var(--dp-text-muted)" strokeWidth={2} />
                          }
                        </button>
                      )}
                      <button
                        onClick={function () { handleRevoke(share.id); }}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: "1px solid rgba(239,68,68,0.2)",
                          background: "transparent", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        aria-label="Revoke share"
                      >
                        <Trash2 size={14} color={BRAND.redSolid} strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Link Tab */}
        {tab === "link" && (
          <div>
            <div style={{
              padding: 16, borderRadius: 14,
              border: "1px solid var(--dp-glass-border)",
              background: "var(--dp-surface)",
              textAlign: "center",
            }}>
              <Link2 size={28} color={BRAND.teal} strokeWidth={1.5} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text-primary)", marginBottom: 4 }}>
                Generate Shareable Link
              </div>
              <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginBottom: 16 }}>
                Anyone with this link can view your calendar schedule.
                The link can be revoked at any time.
              </div>
              <GradientButton
                onClick={handleGenerateLink}
                loading={generatingLink}
                icon={Link2}
                fullWidth
              >
                Generate & Copy Link
              </GradientButton>
            </div>
          </div>
        )}

        {/* Shared With Me Tab */}
        {tab === "shared" && (
          <div>
            {sharedWithMeQuery.isLoading && (
              <div style={{ textAlign: "center", padding: 20, color: "var(--dp-text-muted)" }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            )}
            {!sharedWithMeQuery.isLoading && sharedWithMe.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--dp-text-muted)", fontSize: 13 }}>
                No calendars have been shared with you yet.
              </div>
            )}
            {sharedWithMe.map(function (share) {
              return (
                <div key={share.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, border: "1px solid var(--dp-glass-border)",
                  background: "var(--dp-surface)", marginBottom: 6,
                  cursor: "pointer",
                }} onClick={function () {
                  window.location.href = "/calendar/shared/" + share.shareToken;
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg, " + BRAND.purple + ", " + BRAND.teal + ")",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 700, fontSize: 14,
                    flexShrink: 0,
                  }}>
                    {(share.ownerName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-primary)" }}>
                      {share.ownerName || "User"}'s Calendar
                    </div>
                    <div style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>
                      {share.permission === "suggest" ? "Can suggest times" : "View only"}
                    </div>
                  </div>
                  <Eye size={16} color="var(--dp-text-muted)" strokeWidth={2} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassModal>
  );
}
