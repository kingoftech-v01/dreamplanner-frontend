import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldOff, UserX } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { apiGet, apiDelete } from "../../services/api";
import { SOCIAL } from "../../services/endpoints";

var glass = {
  background: "var(--dp-glass-bg)", backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)", border: "1px solid var(--dp-input-border)",
  borderRadius: 20, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};
var font = { fontFamily: "Inter, sans-serif" };
var skeletonAnim = "dpSkeletonPulse 1.2s ease-in-out infinite";

function SkeletonRow(props) {
  var skel = { background: "var(--dp-surface-hover)", animation: skeletonAnim };
  return (
    <div style={{
      ...glass, borderRadius: 16, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 14,
      opacity: props.mounted ? 1 : 0,
      transform: props.mounted ? "translateY(0)" : "translateY(10px)",
      transition: "all 0.5s cubic-bezier(0.4,0,0.2,1) " + (0.1 + props.i * 0.06) + "s",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 22, flexShrink: 0, ...skel }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ width: "55%", height: 14, borderRadius: 6, ...skel }} />
        <div style={{ width: "35%", height: 10, borderRadius: 5, ...skel, animationDelay: "0.15s" }} />
      </div>
    </div>
  );
}

export default function BlockedUsersScreen() {
  var navigate = useNavigate();
  var queryClient = useQueryClient();
  var [mounted, setMounted] = useState(false);
  var [confirmId, setConfirmId] = useState(null);

  useEffect(function () {
    var t = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(t); };
  }, []);

  var blockedQuery = useQuery({
    queryKey: ["blocked-users"],
    queryFn: function () { return apiGet(SOCIAL.BLOCKED); },
  });

  var users = (blockedQuery.data && blockedQuery.data.results) || [];

  var unblockMutation = useMutation({
    mutationFn: function (userId) { return apiDelete(SOCIAL.UNBLOCK(userId)); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      setConfirmId(null);
    },
  });

  var handleUnblock = function (userId) {
    if (confirmId === userId) { unblockMutation.mutate(userId); }
    else { setConfirmId(userId); }
  };

  var stagger = function (i) {
    return {
      opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
      transition: "all 0.5s cubic-bezier(0.4,0,0.2,1) " + (0.08 + i * 0.06) + "s",
    };
  };

  return (
    <PageLayout>
      <style>{"@keyframes dpSkeletonPulse{0%,100%{opacity:1}50%{opacity:.4}}"}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, paddingTop: 16, paddingBottom: 16,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <button className="dp-ib" onClick={function () { navigate(-1); }}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--dp-text)", ...font, margin: 0 }}>
          Blocked Users
        </h1>
      </div>

      {/* Loading */}
      {blockedQuery.isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map(function (i) { return <SkeletonRow key={i} i={i} mounted={mounted} />; })}
        </div>
      )}

      {/* Empty state */}
      {!blockedQuery.isLoading && users.length === 0 && (
        <div style={{
          ...glass, padding: "48px 24px", display: "flex", flexDirection: "column",
          alignItems: "center", textAlign: "center", ...stagger(1),
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, marginBottom: 16,
            background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.08))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldOff size={30} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)", ...font, marginBottom: 6 }}>
            No blocked users
          </div>
          <div style={{ fontSize: 13, color: "var(--dp-text-secondary)", ...font, lineHeight: 1.5 }}>
            Users you block will appear here. You can unblock them at any time.
          </div>
        </div>
      )}

      {/* List */}
      {!blockedQuery.isLoading && users.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {users.map(function (user, index) {
            var initial = (user.displayName || user.username || "?").charAt(0).toUpperCase();
            var confirming = confirmId === user.id;
            var busy = unblockMutation.isPending && confirming;
            return (
              <div key={user.id} style={{
                ...glass, borderRadius: 16, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14, ...stagger(index),
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                  background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 700, color: "#fff", ...font,
                }}>
                  {initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 600, color: "var(--dp-text)", ...font,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {user.displayName || user.username}
                  </div>
                  {user.username && user.displayName && (
                    <div style={{ fontSize: 12, color: "var(--dp-text-secondary)", ...font, marginTop: 2 }}>
                      @{user.username}
                    </div>
                  )}
                </div>
                <button
                  onClick={function () { handleUnblock(user.id); }}
                  disabled={busy}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 12, flexShrink: 0,
                    background: confirming ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)",
                    border: "1px solid " + (confirming ? "rgba(239,68,68,0.4)" : "rgba(239,68,68,0.2)"),
                    color: "#EF4444", fontSize: 13, fontWeight: 600, ...font,
                    cursor: busy ? "not-allowed" : "pointer",
                    opacity: busy ? 0.6 : 1, transition: "all 0.2s ease",
                  }}
                >
                  <UserX size={15} />
                  {confirming ? "Confirm" : "Unblock"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: 32 }} />
    </PageLayout>
  );
}
