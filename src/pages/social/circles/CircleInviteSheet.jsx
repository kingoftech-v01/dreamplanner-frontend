import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../services/api";
import { SOCIAL, CIRCLES } from "../../../services/endpoints";
import { clipboardWrite } from "../../../services/native";
import GlassModal from "../../../components/shared/GlassModal";
import GlassInput from "../../../components/shared/GlassInput";
import GradientButton from "../../../components/shared/GradientButton";
import Avatar from "../../../components/shared/Avatar";
import { Search, UserPlus, Link, Copy, Check } from "lucide-react";

export default function CircleInviteSheet({ open, onClose, circleId, members, showToast }) {
  var [search, setSearch] = useState("");
  var [inviteLink, setInviteLink] = useState("");
  var [copiedLink, setCopiedLink] = useState(false);
  var [invitedIds, setInvitedIds] = useState({});
  var [linkLoading, setLinkLoading] = useState(false);

  useEffect(function () {
    if (!open) { setSearch(""); setInvitedIds({}); }
  }, [open]);

  var friendsQuery = useQuery({
    queryKey: ["friends-list"],
    queryFn: function () { return apiGet(SOCIAL.FRIENDS.LIST); },
    enabled: open,
    staleTime: 30000,
  });

  var allFriends = friendsQuery.data || [];
  var memberIds = (members || []).map(function (m) { return String((m.user || m).id); });

  var filteredFriends = allFriends.filter(function (f) {
    if (memberIds.indexOf(String(f.id)) >= 0) return false;
    if (search.trim().length > 0) {
      return (f.username || "").toLowerCase().includes(search.trim().toLowerCase());
    }
    return true;
  });

  function handleInvite(friendId) {
    apiPost(CIRCLES.INVITE(circleId), { user_id: friendId }).then(function () {
      setInvitedIds(function (p) { var n = Object.assign({}, p); n[friendId] = true; return n; });
      showToast && showToast("Invitation sent!", "success");
    }).catch(function (err) {
      showToast && showToast(err.userMessage || err.message || "Failed to invite", "error");
    });
  }

  function handleGenerateLink() {
    setLinkLoading(true);
    apiPost(CIRCLES.INVITE_LINK(circleId)).then(function (data) {
      var link = data.link || data.inviteLink || data.url || data.invite_code || "";
      setInviteLink(link);
      if (link) {
        clipboardWrite(link).then(function () {
          setCopiedLink(true);
          showToast && showToast("Link copied!", "success");
          setTimeout(function () { setCopiedLink(false); }, 3000);
        }).catch(function () {});
      }
      setLinkLoading(false);
    }).catch(function (err) {
      showToast && showToast(err.userMessage || err.message || "Failed to generate link", "error");
      setLinkLoading(false);
    });
  }

  function handleCopyLink() {
    if (!inviteLink) return;
    clipboardWrite(inviteLink).then(function () {
      setCopiedLink(true);
      showToast && showToast("Link copied!", "success");
      setTimeout(function () { setCopiedLink(false); }, 3000);
    });
  }

  return (
    <GlassModal open={open} onClose={onClose} variant="bottom" title="Invite Friends" maxWidth={420}>
      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ marginBottom: 12 }}>
          <GlassInput icon={Search} value={search} onChange={function (e) { setSearch(e.target.value); }} autoFocus placeholder="Search friends..." />
        </div>

        {friendsQuery.isLoading && (
          <div style={{ textAlign: "center", padding: 16, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading friends...</div>
        )}

        {!friendsQuery.isLoading && allFriends.length === 0 && (
          <div style={{ textAlign: "center", padding: 16, color: "var(--dp-text-muted)", fontSize: 13 }}>No friends yet. Add friends first to invite them.</div>
        )}

        {filteredFriends.length > 0 && (
          <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
            {filteredFriends.map(function (f) {
              var invited = invitedIds[f.id];
              return (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12,
                  background: "var(--dp-surface)", border: "1px solid var(--dp-input-border)",
                }}>
                  <Avatar src={f.avatar} name={f.username} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.username}</div>
                  </div>
                  {invited ? (
                    <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <Check size={12} /> Invited
                    </span>
                  ) : (
                    <button onClick={function () { handleInvite(f.id); }} style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 10,
                      border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.06)",
                      cursor: "pointer", color: "var(--dp-accent)", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    }}>
                      <UserPlus size={13} /> Invite
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Generate invite link section */}
        <div style={{ borderTop: "1px solid var(--dp-divider)", paddingTop: 14, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Link size={14} color="var(--dp-accent)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>Share Invite Link</span>
          </div>
          {inviteLink ? (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                flex: 1, padding: "10px 12px", borderRadius: 12,
                background: "var(--dp-input-bg)", border: "1px solid var(--dp-input-border)",
                color: "var(--dp-text-secondary)", fontSize: 12, fontFamily: "inherit",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {inviteLink}
              </div>
              <button onClick={handleCopyLink} style={{
                width: 42, height: 42, borderRadius: 12, border: "1px solid var(--dp-input-border)",
                background: copiedLink ? "rgba(16,185,129,0.1)" : "var(--dp-surface)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: copiedLink ? "#10B981" : "var(--dp-text-secondary)", flexShrink: 0,
              }}>
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          ) : (
            <GradientButton gradient="primaryDark" onClick={handleGenerateLink} disabled={linkLoading} fullWidth icon={Link}>
              {linkLoading ? "Generating..." : "Generate Link"}
            </GradientButton>
          )}
        </div>
      </div>
    </GlassModal>
  );
}
