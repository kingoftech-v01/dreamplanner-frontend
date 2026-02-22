import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Clock, UserX, Users, Inbox } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { MOCK_FRIEND_REQUESTS } from "../../data/mockData";

const RECEIVED_REQUESTS = [
  { id: "fr1", name: "Emma Wilson", initial: "E", level: 7, mutualFriends: 2, time: "2 hours ago" },
  { id: "fr2", name: "Noah Chen", initial: "N", level: 11, mutualFriends: 4, time: "1 day ago" },
  { id: "fr3", name: "Olivia Park", initial: "O", level: 9, mutualFriends: 1, time: "2 days ago" },
  { id: "fr4", name: "James Lee", initial: "J", level: 5, mutualFriends: 3, time: "3 days ago" },
];

const SENT_REQUESTS = [
  { id: "sr1", name: "Maya Rodriguez", initial: "M", level: 8, time: "1 day ago" },
  { id: "sr2", name: "Ethan Kim", initial: "E", level: 13, time: "3 days ago" },
  { id: "sr3", name: "Zara Ahmed", initial: "Z", level: 10, time: "5 days ago" },
];

const AVATAR_COLORS = ["#8B5CF6", "#14B8A6", "#EC4899", "#3B82F6", "#10B981", "#FCD34D", "#6366F1", "#EF4444"];

const glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

export default function FriendRequestsScreen() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("received");
  const [receivedStates, setReceivedStates] = useState({});
  const [cancelledSent, setCancelledSent] = useState(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const getAvatarColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const handleAccept = (id) => {
    setReceivedStates((prev) => ({ ...prev, [id]: "accepted" }));
  };

  const handleDecline = (id) => {
    setReceivedStates((prev) => ({ ...prev, [id]: "declined" }));
  };

  const handleCancelSent = (id) => {
    setCancelledSent((prev) => new Set([...prev, id]));
  };

  const pendingReceivedCount = RECEIVED_REQUESTS.filter(
    (r) => !receivedStates[r.id]
  ).length;

  const activeSentRequests = SENT_REQUESTS.filter((r) => !cancelledSent.has(r.id));

  return (
    <PageLayout>
      <style>{`
        @keyframes acceptPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; max-height: 100px; }
          to { opacity: 0; max-height: 0; padding: 0; margin: 0; }
        }
      `}</style>

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
            fontFamily: "Inter, sans-serif", margin: 0,
          }}>
            Friend Requests
          </h1>
          {pendingReceivedCount > 0 && (
            <span style={{
              background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              color: "#fff", fontSize: 11, fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              padding: "2px 8px", borderRadius: 10,
              minWidth: 20, textAlign: "center",
            }}>
              {pendingReceivedCount}
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
        {[
          { id: "received", label: "Received", count: pendingReceivedCount },
          { id: "sent", label: "Sent", count: activeSentRequests.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", borderRadius: 12, border: "none",
              background: activeTab === tab.id
                ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.2))"
                : "transparent",
              color: activeTab === tab.id ? "var(--dp-text)" : "var(--dp-text-tertiary)",
              fontSize: 14, fontWeight: 600, fontFamily: "Inter, sans-serif",
              cursor: "pointer", transition: "all 0.25s ease",
            }}
          >
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
        ))}
      </div>

      {/* Received Tab */}
      {activeTab === "received" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {RECEIVED_REQUESTS.map((request, index) => {
            const state = receivedStates[request.id];
            const avatarColor = getAvatarColor(request.name);

            return (
              <div
                key={request.id}
                style={{
                  ...glassStyle, borderRadius: 16,
                  padding: state ? "12px 16px" : "16px",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(15px)",
                  transitionDelay: `${0.15 + index * 0.06}s`,
                  ...(state === "accepted" ? {
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.15)",
                  } : {}),
                  ...(state === "declined" ? {
                    background: "var(--dp-glass-bg)",
                    border: "1px solid var(--dp-glass-bg)",
                  } : {}),
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                    background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 700, color: "#fff",
                    fontFamily: "Inter, sans-serif",
                    boxShadow: `0 4px 12px ${avatarColor}30`,
                    ...(state === "declined" ? { opacity: 0.5 } : {}),
                  }}>
                    {request.initial}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 15, fontWeight: 600,
                        color: state === "declined" ? "var(--dp-text-muted)" : "var(--dp-text)",
                        fontFamily: "Inter, sans-serif",
                      }}>
                        {request.name}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: "#8B5CF6",
                        fontFamily: "Inter, sans-serif",
                        padding: "2px 6px", borderRadius: 6,
                        background: "rgba(139,92,246,0.15)",
                        border: "1px solid rgba(139,92,246,0.2)",
                      }}>
                        Lv.{request.level}
                      </span>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 12, color: "var(--dp-text-muted)",
                      fontFamily: "Inter, sans-serif",
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Users size={11} />
                        {request.mutualFriends} mutual
                      </span>
                      <span style={{ color: "var(--dp-text-muted)" }}>|</span>
                      <span>{request.time}</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons or state */}
                {!state ? (
                  <div style={{
                    display: "flex", gap: 8, marginTop: 14,
                  }}>
                    <button
                      onClick={() => handleAccept(request.id)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "10px 0", borderRadius: 12,
                        background: "linear-gradient(135deg, #10B981, #059669)",
                        border: "none",
                        color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
                        cursor: "pointer", transition: "all 0.25s ease",
                      }}
                    >
                      <Check size={16} />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(request.id)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "10px 0", borderRadius: 12,
                        background: "transparent",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "rgba(239,68,68,0.8)", fontSize: 13, fontWeight: 600,
                        fontFamily: "Inter, sans-serif",
                        cursor: "pointer", transition: "all 0.25s ease",
                      }}
                    >
                      <X size={16} />
                      Decline
                    </button>
                  </div>
                ) : (
                  <div style={{
                    marginTop: 10,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "8px 0",
                    fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
                    color: state === "accepted" ? "#10B981" : "var(--dp-text-muted)",
                    animation: "acceptPulse 0.4s ease",
                  }}>
                    {state === "accepted" ? (
                      <>
                        <Check size={14} />
                        Request Accepted
                      </>
                    ) : (
                      <>
                        <X size={14} />
                        Request Declined
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty received state */}
          {RECEIVED_REQUESTS.length === 0 && (
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
                <Inbox size={32} color="var(--dp-text-muted)" />
              </div>
              <div style={{
                fontSize: 16, fontWeight: 600, color: "var(--dp-text-tertiary)",
                fontFamily: "Inter, sans-serif", marginBottom: 6,
              }}>
                No pending requests
              </div>
              <div style={{
                fontSize: 13, color: "var(--dp-text-muted)",
                fontFamily: "Inter, sans-serif",
              }}>
                When someone sends you a friend request, it will appear here
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sent Tab */}
      {activeTab === "sent" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeSentRequests.map((request, index) => {
            const avatarColor = getAvatarColor(request.name);

            return (
              <div
                key={request.id}
                style={{
                  ...glassStyle, borderRadius: 16,
                  padding: "16px",
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(15px)",
                  transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${0.15 + index * 0.06}s`,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 48, height: 48, borderRadius: 16, flexShrink: 0,
                  background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}88)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 700, color: "#fff",
                  fontFamily: "Inter, sans-serif",
                  boxShadow: `0 4px 12px ${avatarColor}30`,
                }}>
                  {request.initial}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 15, fontWeight: 600, color: "var(--dp-text)",
                      fontFamily: "Inter, sans-serif",
                    }}>
                      {request.name}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "#8B5CF6",
                      fontFamily: "Inter, sans-serif",
                      padding: "2px 6px", borderRadius: 6,
                      background: "rgba(139,92,246,0.15)",
                      border: "1px solid rgba(139,92,246,0.2)",
                    }}>
                      Lv.{request.level}
                    </span>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 12, color: "var(--dp-text-muted)",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    <Clock size={11} />
                    Pending - sent {request.time}
                  </div>
                </div>

                {/* Cancel button */}
                <button
                  onClick={() => handleCancelSent(request.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "8px 12px", borderRadius: 10,
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "rgba(239,68,68,0.7)", fontSize: 11, fontWeight: 600,
                    fontFamily: "Inter, sans-serif",
                    cursor: "pointer", transition: "all 0.25s ease",
                    flexShrink: 0,
                  }}
                >
                  <UserX size={13} />
                  Cancel
                </button>
              </div>
            );
          })}

          {/* Empty sent state */}
          {activeSentRequests.length === 0 && (
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
                <Inbox size={32} color="var(--dp-text-muted)" />
              </div>
              <div style={{
                fontSize: 16, fontWeight: 600, color: "var(--dp-text-tertiary)",
                fontFamily: "Inter, sans-serif", marginBottom: 6,
              }}>
                No sent requests
              </div>
              <div style={{
                fontSize: 13, color: "var(--dp-text-muted)",
                fontFamily: "Inter, sans-serif",
              }}>
                Friend requests you send will appear here
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom spacer */}
      <div style={{ height: 32 }} />
    </PageLayout>
  );
}
