import { useState } from "react";
import GlassModal from "../../../components/shared/GlassModal";
import Avatar from "../../../components/shared/Avatar";
import { Crown, Shield, Star, ArrowUp, ArrowDown, UserMinus, UserPlus } from "lucide-react";

var ROLE_META = {
  admin: { Icon: Crown, color: "#FCD34D", label: "Admin" },
  moderator: { Icon: Shield, color: "#8B5CF6", label: "Mod" },
  member: { Icon: Star, color: "var(--dp-text-muted)", label: "Member" },
};

export default function CircleMembersSheet({ open, onClose, members, userId, isAdmin, onPromote, onDemote, onRemove, onInvite }) {
  var [menuOpen, setMenuOpen] = useState(null);

  return (
    <GlassModal open={open} onClose={onClose} variant="bottom" title={"Members (" + (members || []).length + ")"} maxWidth={420}>
      <div style={{ padding: "0 20px 20px", maxHeight: "60vh", overflowY: "auto" }}>
        {(members || []).map(function (m) {
          var u = m.user || m;
          var name = u.username || u.displayName || u.name || "Member";
          var role = m.role || "member";
          var meta = ROLE_META[role] || ROLE_META.member;
          var isSelf = String(u.id) === String(userId);
          var isMenuOpen = menuOpen === u.id;

          return (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
              borderBottom: "1px solid var(--dp-divider)",
            }}>
              <Avatar src={u.avatar} name={name} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {name} {isSelf && <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>(you)</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <meta.Icon size={11} color={meta.color} strokeWidth={2.5} />
                  <span style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                </div>
              </div>

              {isAdmin && !isSelf && (
                <div style={{ position: "relative" }}>
                  <button onClick={function () { setMenuOpen(isMenuOpen ? null : u.id); }} style={{
                    padding: "6px 10px", borderRadius: 8, border: "1px solid var(--dp-input-border)",
                    background: "var(--dp-surface)", cursor: "pointer", fontSize: 11, fontWeight: 600,
                    color: "var(--dp-text-secondary)", fontFamily: "inherit",
                  }}>
                    Manage
                  </button>
                  {isMenuOpen && (
                    <>
                      <div onClick={function () { setMenuOpen(null); }} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
                      <div style={{
                        position: "absolute", top: "100%", right: 0, zIndex: 99, marginTop: 4,
                        background: "var(--dp-modal-bg)", border: "1px solid var(--dp-glass-border)",
                        borderRadius: 12, padding: 4, minWidth: 140, boxShadow: "0 8px 24px var(--dp-shadow)",
                      }}>
                        {role === "member" && (
                          <button onClick={function () { setMenuOpen(null); onPromote && onPromote(u.id); }} style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px",
                            background: "none", border: "none", borderRadius: 8, cursor: "pointer",
                            color: "var(--dp-text)", fontSize: 12, fontFamily: "inherit",
                          }}>
                            <ArrowUp size={14} /> Promote
                          </button>
                        )}
                        {role === "moderator" && (
                          <button onClick={function () { setMenuOpen(null); onDemote && onDemote(u.id); }} style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px",
                            background: "none", border: "none", borderRadius: 8, cursor: "pointer",
                            color: "var(--dp-text)", fontSize: 12, fontFamily: "inherit",
                          }}>
                            <ArrowDown size={14} /> Demote
                          </button>
                        )}
                        <button onClick={function () { setMenuOpen(null); onRemove && onRemove(u.id); }} style={{
                          display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px",
                          background: "none", border: "none", borderRadius: 8, cursor: "pointer",
                          color: "var(--dp-danger-solid)", fontSize: 12, fontFamily: "inherit",
                        }}>
                          <UserMinus size={14} /> Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isAdmin && (
          <button onClick={function () { onInvite && onInvite(); }} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "14px", marginTop: 16, borderRadius: 14,
            border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.06)",
            cursor: "pointer", color: "var(--dp-accent)", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
          }}>
            <UserPlus size={16} /> Invite Friends
          </button>
        )}
      </div>
    </GlassModal>
  );
}
