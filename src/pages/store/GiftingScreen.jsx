import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { STORE, SOCIAL } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import PageLayout from "../../components/shared/PageLayout";
import { ArrowLeft, Gift, Send, Check, Package, Users } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Gifting Screen
 * Send and receive gifts, two tabs (Received / Sent)
 * ═══════════════════════════════════════════════════════════════════ */

var glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-glass-border)",
  borderRadius: 20,
};

export default function GiftingScreen() {
  var navigate = useNavigate();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var { user } = useAuth();
  var { showToast } = useToast();
  var queryClient = useQueryClient();

  var [mounted, setMounted] = useState(false);
  var [activeTab, setActiveTab] = useState("received");
  var [showSendModal, setShowSendModal] = useState(false);
  var [sendItemId, setSendItemId] = useState("");
  var [sendRecipientId, setSendRecipientId] = useState("");
  var [sendMessage, setSendMessage] = useState("");
  var [selectedGift, setSelectedGift] = useState(null);

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  // ── Gifts query ──
  var giftsQuery = useQuery({
    queryKey: ["gifts"],
    queryFn: function () { return apiGet(STORE.GIFTS); },
  });

  var rawGifts = (giftsQuery.data && giftsQuery.data.results) || giftsQuery.data || [];

  useEffect(function () {
    if (giftsQuery.error) showToast(giftsQuery.error.message || "Failed to load gifts", "error");
  }, [giftsQuery.error]);

  // ── Store items query (for send gift modal) ──
  var itemsQuery = useQuery({
    queryKey: ["store-items-for-gifts"],
    queryFn: function () { return apiGet(STORE.ITEMS); },
    enabled: showSendModal,
  });
  var storeItems = (itemsQuery.data && itemsQuery.data.results) || itemsQuery.data || [];

  // ── Friends query (for send gift modal) ──
  var friendsQuery = useQuery({
    queryKey: ["friends-for-gifts"],
    queryFn: function () { return apiGet(SOCIAL.FRIENDS.LIST); },
    enabled: showSendModal,
  });
  var friends = (friendsQuery.data && friendsQuery.data.results) || friendsQuery.data || [];

  // Split gifts into received/sent
  var currentUserId = (user && user.id) || null;
  var receivedGifts = rawGifts.filter(function (g) {
    return g.recipientId === currentUserId || g.recipient === currentUserId || g.direction === "received";
  });
  var sentGifts = rawGifts.filter(function (g) {
    return g.senderId === currentUserId || g.sender === currentUserId || g.direction === "sent";
  });

  var displayGifts = activeTab === "received" ? receivedGifts : sentGifts;

  // ── Mutations ──
  var sendGiftMut = useMutation({
    mutationFn: function (body) {
      return apiPost(STORE.GIFT_SEND, body);
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
      queryClient.invalidateQueries({ queryKey: ["store-items-for-gifts"] });
      showToast("Gift sent!", "success");
    },
    onError: function (err) {
      showToast(err.message || "Failed to send gift", "error");
    },
  });

  var claimGiftMut = useMutation({
    mutationFn: function (giftId) {
      return apiPost(STORE.GIFT_CLAIM(giftId));
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
      showToast("Gift claimed!", "success");
    },
    onError: function (err) {
      showToast(err.message || "Failed to claim gift", "error");
    },
  });

  // ── Handlers ──
  var handleSendGift = function () {
    if (!sendItemId || !sendRecipientId) {
      showToast("Please select an item and a recipient", "error");
      return;
    }
    sendGiftMut.mutate({
      itemId: sendItemId,
      recipientId: sendRecipientId,
      message: sendMessage.trim(),
    });
    setShowSendModal(false);
    setSendItemId("");
    setSendRecipientId("");
    setSendMessage("");
  };

  var handleClaimGift = function (giftId) {
    claimGiftMut.mutate(giftId);
  };

  var openSendModal = function () {
    setSendItemId("");
    setSendRecipientId("");
    setSendMessage("");
    setShowSendModal(true);
  };

  var formatDate = function (dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <PageLayout>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 16, paddingBottom: 12,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="dp-ib" onClick={function () { navigate(-1); }} aria-label="Go back">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Gift size={18} color={isLight ? "#7C3AED" : "#C4B5FD"} strokeWidth={2} />
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
              fontFamily: "'Inter', sans-serif", margin: 0,
            }}>
              Gifts
            </h1>
          </div>
        </div>
        <button
          onClick={openSendModal}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            color: "#fff", fontSize: 13, fontWeight: 600,
            fontFamily: "'Inter', sans-serif", cursor: "pointer",
            transition: "all 0.25s ease",
          }}
        >
          <Send size={14} strokeWidth={2} />
          Send Gift
        </button>
      </div>

      {/* Tabs: Received / Sent */}
      <div className={`dp-a ${mounted ? "dp-s" : ""}`} style={{ animationDelay: "0ms" }}>
        <div style={{
          display: "flex", gap: 4, marginBottom: 16,
          ...glassStyle, borderRadius: 14, padding: 4,
        }}>
          {[
            { id: "received", label: "Received", icon: Package, count: receivedGifts.length },
            { id: "sent", label: "Sent", icon: Send, count: sentGifts.length },
          ].map(function (tab) {
            var Icon = tab.icon;
            var isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={function () { setActiveTab(tab.id); }}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "10px 0", borderRadius: 12, border: "none",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.2))"
                    : "transparent",
                  color: isActive ? "var(--dp-text)" : "var(--dp-text-secondary)",
                  fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                  cursor: "pointer", transition: "all 0.25s ease",
                }}
              >
                <Icon size={16} />
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: isActive ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.06)",
                    padding: "2px 6px", borderRadius: 6,
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {giftsQuery.isLoading && (
        <div className={`dp-a ${mounted ? "dp-s" : ""}`} style={{ animationDelay: "80ms" }}>
          {[0, 1, 2].map(function (i) {
            return (
              <div key={i} style={{
                ...glassStyle, padding: 16, marginBottom: 12,
                animation: "dpPulse 1.5s ease-in-out infinite",
                animationDelay: (i * 0.15) + "s",
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: isLight ? "rgba(26,21,53,0.06)" : "rgba(255,255,255,0.06)",
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      width: "60%", height: 14, borderRadius: 7,
                      background: isLight ? "rgba(26,21,53,0.06)" : "rgba(255,255,255,0.06)",
                      marginBottom: 8,
                    }} />
                    <div style={{
                      width: "40%", height: 12, borderRadius: 6,
                      background: isLight ? "rgba(26,21,53,0.04)" : "rgba(255,255,255,0.04)",
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gift Cards */}
      {!giftsQuery.isLoading && displayGifts.map(function (gift, index) {
        var isClaimed = gift.claimed || gift.status === "claimed";
        var canClaim = activeTab === "received" && !isClaimed;

        return (
          <div
            key={gift.id}
            className={`dp-a ${mounted ? "dp-s" : ""}`}
            style={{ animationDelay: (80 + index * 60) + "ms" }}
          >
            <div
              style={{
                ...glassStyle, marginBottom: 12, overflow: "hidden",
                cursor: "pointer", transition: "all 0.2s ease",
              }}
              onClick={function () { setSelectedGift(selectedGift && selectedGift.id === gift.id ? null : gift); }}
            >
              <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
                {/* Gift icon / item preview */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: isLight ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: gift.itemImage ? 28 : 0,
                }}>
                  {gift.itemImage ? gift.itemImage : (
                    <Gift size={22} color={isLight ? "#7C3AED" : "#C4B5FD"} strokeWidth={2} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: "var(--dp-text)",
                    fontFamily: "'Inter', sans-serif",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {gift.itemName || gift.item || "Gift"}
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--dp-text-secondary)",
                    fontFamily: "'Inter', sans-serif", marginTop: 2,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Users size={11} strokeWidth={2} />
                    {activeTab === "received"
                      ? "From " + (gift.senderName || gift.senderUsername || "Someone")
                      : "To " + (gift.recipientName || gift.recipientUsername || "Someone")
                    }
                  </div>
                  {gift.message && (
                    <div style={{
                      fontSize: 12, color: "var(--dp-text-secondary)",
                      fontFamily: "'Inter', sans-serif", marginTop: 4, fontStyle: "italic",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      &ldquo;{gift.message}&rdquo;
                    </div>
                  )}
                </div>

                {/* Status / Action */}
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {isClaimed && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 8,
                      background: "rgba(16,185,129,0.1)",
                      color: isLight ? "#059669" : "#10B981",
                      fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                    }}>
                      <Check size={12} strokeWidth={3} />
                      Claimed
                    </div>
                  )}
                  {canClaim && (
                    <button
                      onClick={function (e) {
                        e.stopPropagation();
                        handleClaimGift(gift.id);
                      }}
                      disabled={claimGiftMut.isPending}
                      style={{
                        padding: "6px 14px", borderRadius: 10, border: "none",
                        background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                        color: "#fff", fontSize: 12, fontWeight: 600,
                        fontFamily: "'Inter', sans-serif", cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Claim
                    </button>
                  )}
                  {activeTab === "sent" && !isClaimed && (
                    <div style={{
                      padding: "4px 10px", borderRadius: 8,
                      background: isLight ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.15)",
                      color: isLight ? "#B45309" : "#F59E0B",
                      fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                    }}>
                      Pending
                    </div>
                  )}
                  <span style={{
                    fontSize: 11, color: "var(--dp-text-secondary)",
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {formatDate(gift.createdAt || gift.sentAt || gift.date)}
                  </span>
                </div>
              </div>

              {/* Expanded detail */}
              {selectedGift && selectedGift.id === gift.id && (
                <div style={{
                  padding: "0 16px 14px",
                  borderTop: "1px solid " + (isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.04)"),
                  paddingTop: 12,
                }}>
                  {gift.itemDescription && (
                    <div style={{
                      fontSize: 13, color: "var(--dp-text-secondary)",
                      fontFamily: "'Inter', sans-serif", lineHeight: 1.5, marginBottom: 8,
                    }}>
                      {gift.itemDescription}
                    </div>
                  )}
                  {gift.message && (
                    <div style={{
                      ...glassStyle, borderRadius: 12, padding: "10px 14px",
                      fontSize: 13, color: "var(--dp-text)",
                      fontFamily: "'Inter', sans-serif", lineHeight: 1.5,
                      fontStyle: "italic",
                    }}>
                      &ldquo;{gift.message}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {!giftsQuery.isLoading && displayGifts.length === 0 && (
        <div className={`dp-a ${mounted ? "dp-s" : ""}`} style={{ animationDelay: "160ms" }}>
          <div style={{
            ...glassStyle, padding: 40, textAlign: "center",
          }}>
            <Gift size={40} color={isLight ? "rgba(26,21,53,0.15)" : "rgba(255,255,255,0.15)"} strokeWidth={1.5} style={{ margin: "0 auto 12px" }} />
            <div style={{
              fontSize: 16, fontWeight: 600, color: "var(--dp-text)",
              fontFamily: "'Inter', sans-serif", marginBottom: 6,
            }}>
              {activeTab === "received" ? "No gifts received" : "No gifts sent"}
            </div>
            <div style={{
              fontSize: 13, color: "var(--dp-text-secondary)",
              fontFamily: "'Inter', sans-serif", marginBottom: 16, lineHeight: 1.5,
            }}>
              {activeTab === "received"
                ? "Gifts from friends will appear here"
                : "Send a gift to brighten someone's day"
              }
            </div>
            {activeTab === "sent" && (
              <button
                onClick={openSendModal}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  fontFamily: "'Inter', sans-serif", cursor: "pointer",
                }}
              >
                <Send size={15} strokeWidth={2} />
                Send a Gift
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ SEND GIFT MODAL ═══ */}
      {showSendModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={function () { setShowSendModal(false); }} style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          }} />
          <div style={{
            position: "relative", width: "90%", maxWidth: 380,
            background: isLight ? "rgba(255,255,255,0.97)" : "rgba(12,8,26,0.97)",
            backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
            borderRadius: 22, border: "1px solid var(--dp-input-border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)", padding: 24,
            animation: "dpFS 0.25s ease-out",
            maxHeight: "80vh", overflowY: "auto",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 18,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: isLight ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Gift size={18} color={isLight ? "#7C3AED" : "#C4B5FD"} strokeWidth={2} />
              </div>
              <span style={{
                fontSize: 16, fontWeight: 600, color: isLight ? "#1a1535" : "#fff",
                fontFamily: "'Inter', sans-serif",
              }}>
                Send a Gift
              </span>
            </div>

            {/* Select Item */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 12, fontWeight: 600,
                color: isLight ? "rgba(26,21,53,0.6)" : "rgba(255,255,255,0.85)",
                marginBottom: 6, display: "block", fontFamily: "'Inter', sans-serif",
              }}>
                Choose an Item
              </label>
              {itemsQuery.isLoading ? (
                <div style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
                  border: "1px solid var(--dp-input-border)",
                  color: "var(--dp-text-secondary)", fontSize: 13,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Loading items...
                </div>
              ) : (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
                }}>
                  {storeItems.slice(0, 9).map(function (item) {
                    var isSelected = sendItemId === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={function () { setSendItemId(item.id); }}
                        style={{
                          padding: 10, borderRadius: 14,
                          border: isSelected
                            ? "2px solid rgba(139,92,246,0.5)"
                            : "1px solid var(--dp-input-border)",
                          background: isSelected
                            ? "rgba(139,92,246,0.1)"
                            : (isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)"),
                          cursor: "pointer", textAlign: "center",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 4 }}>
                          {item.image || (
                            <Package size={20} color="var(--dp-text-secondary)" />
                          )}
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 600, color: "var(--dp-text)",
                          fontFamily: "'Inter', sans-serif",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {item.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Select Recipient */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 12, fontWeight: 600,
                color: isLight ? "rgba(26,21,53,0.6)" : "rgba(255,255,255,0.85)",
                marginBottom: 6, display: "block", fontFamily: "'Inter', sans-serif",
              }}>
                Choose a Recipient
              </label>
              {friendsQuery.isLoading ? (
                <div style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
                  border: "1px solid var(--dp-input-border)",
                  color: "var(--dp-text-secondary)", fontSize: 13,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Loading friends...
                </div>
              ) : friends.length === 0 ? (
                <div style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
                  border: "1px solid var(--dp-input-border)",
                  color: "var(--dp-text-secondary)", fontSize: 13,
                  fontFamily: "'Inter', sans-serif", textAlign: "center",
                }}>
                  No friends found. Add friends to send gifts!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {friends.map(function (friend) {
                    var friendId = friend.id || friend.userId;
                    var isSelected = sendRecipientId === friendId;
                    return (
                      <button
                        key={friendId}
                        onClick={function () { setSendRecipientId(friendId); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px", borderRadius: 12,
                          border: isSelected
                            ? "2px solid rgba(139,92,246,0.5)"
                            : "1px solid var(--dp-input-border)",
                          background: isSelected
                            ? "rgba(139,92,246,0.1)"
                            : (isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)"),
                          cursor: "pointer", textAlign: "left",
                          transition: "all 0.15s", width: "100%",
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: isLight ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, overflow: "hidden",
                        }}>
                          {friend.avatar ? (
                            <img src={friend.avatar} alt="" style={{ width: 32, height: 32, objectFit: "cover" }} />
                          ) : (
                            <Users size={14} color={isLight ? "#7C3AED" : "#C4B5FD"} />
                          )}
                        </div>
                        <div style={{
                          fontSize: 13, fontWeight: 500, color: "var(--dp-text)",
                          fontFamily: "'Inter', sans-serif",
                        }}>
                          {friend.displayName || friend.username || friend.name}
                        </div>
                        {isSelected && (
                          <Check size={16} color={isLight ? "#7C3AED" : "#C4B5FD"} strokeWidth={3} style={{ marginLeft: "auto" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Message */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                fontSize: 12, fontWeight: 600,
                color: isLight ? "rgba(26,21,53,0.6)" : "rgba(255,255,255,0.85)",
                marginBottom: 6, display: "block", fontFamily: "'Inter', sans-serif",
              }}>
                Message (optional)
              </label>
              <textarea
                value={sendMessage}
                onChange={function (e) { setSendMessage(e.target.value); }}
                placeholder="Add a personal message..."
                rows={3}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 12,
                  background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
                  border: "1px solid var(--dp-input-border)",
                  color: isLight ? "#1a1535" : "#fff", fontSize: 14,
                  fontFamily: "'Inter', sans-serif", outline: "none",
                  resize: "none", lineHeight: 1.5,
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={function () { setShowSendModal(false); }}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  border: "1px solid var(--dp-input-border)",
                  background: isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
                  color: isLight ? "rgba(26,21,53,0.6)" : "rgba(255,255,255,0.85)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendGift}
                disabled={!sendItemId || !sendRecipientId || sendGiftMut.isPending}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, border: "none",
                  background: (sendItemId && sendRecipientId)
                    ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                    : (isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)"),
                  color: (sendItemId && sendRecipientId)
                    ? "#fff"
                    : (isLight ? "rgba(26,21,53,0.3)" : "rgba(255,255,255,0.25)"),
                  fontSize: 14, fontWeight: 600,
                  cursor: (sendItemId && sendRecipientId) ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <Send size={14} strokeWidth={2} />
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dpFS { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes dpPulse { 0% { opacity:0.4; } 50% { opacity:0.8; } 100% { opacity:0.4; } }
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        textarea::placeholder{color:${isLight ? "rgba(26,21,53,0.4)" : "rgba(255,255,255,0.3)"};}
      `}</style>
    </PageLayout>
  );
}
