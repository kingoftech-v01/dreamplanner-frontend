import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { STORE, SOCIAL } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import PageLayout from "../../components/shared/PageLayout";
import { ArrowLeft, Gift, Send, Check, Package, Users } from "lucide-react";
import { BRAND, GRADIENTS } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GradientButton from "../../components/shared/GradientButton";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";
import PillTabs from "../../components/shared/PillTabs";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Gifting Screen
 * Send and receive gifts, two tabs (Received / Sent)
 * ═══════════════════════════════════════════════════════════════════ */

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

  // ── Gifts query (infinite scroll) ──
  var giftsInf = useInfiniteList({ queryKey: ["gifts"], url: STORE.GIFTS, limit: 20 });
  var rawGifts = giftsInf.items;

  useEffect(function () {
    if (giftsInf.error) showToast(giftsInf.error.userMessage || giftsInf.error.message || "Failed to load gifts", "error");
  }, [giftsInf.error]);

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
      showToast(err.userMessage || err.message || "Failed to send gift", "error");
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
      showToast(err.userMessage || err.message || "Failed to claim gift", "error");
    },
  });

  // ── Handlers ──
  var handleSendGift = function () {
    if (!sendItemId || !sendRecipientId) {
      showToast("Please select an item and a recipient", "error");
      return;
    }
    sendGiftMut.mutate({
      item_id: sendItemId,
      recipient_id: sendRecipientId,
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
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate("/store"); }} />}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Gift size={18} color={"var(--dp-accent)"} strokeWidth={2} />
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--dp-text)" }}>Gifts</span>
          </div>
        }
        right={
          <GradientButton gradient="primaryDark" icon={Send} size="sm" onClick={openSendModal}>
            Send Gift
          </GradientButton>
        }
      />
    }>

      {/* Tabs: Received / Sent */}
      <div className={`dp-a ${mounted ? "dp-s" : ""}`} style={{ animationDelay: "0ms", marginBottom: 16, marginTop: 8 }}>
        <PillTabs
          tabs={[
            { key: "received", label: "Received", icon: Package, count: receivedGifts.length },
            { key: "sent", label: "Sent", icon: Send, count: sentGifts.length },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Loading */}
      {giftsInf.isLoading && (
        <div className={`dp-a ${mounted ? "dp-s" : ""}`} style={{ animationDelay: "80ms" }}>
          {[0, 1, 2].map(function (i) {
            return (
              <GlassCard key={i} padding={16} mb={12} style={{
                animation: "dpPulse 1.5s ease-in-out infinite",
                animationDelay: (i * 0.15) + "s",
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: "var(--dp-glass-hover)",
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      width: "60%", height: 14, borderRadius: 7,
                      background: "var(--dp-glass-hover)",
                      marginBottom: 8,
                    }} />
                    <div style={{
                      width: "40%", height: 12, borderRadius: 6,
                      background: "var(--dp-divider)",
                    }} />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Gift Cards */}
      {!giftsInf.isLoading && displayGifts.map(function (gift, index) {
        var isClaimed = gift.claimed || gift.status === "claimed";
        var canClaim = activeTab === "received" && !isClaimed;

        return (
          <div
            key={gift.id}
            className={`dp-a ${mounted ? "dp-s" : ""}`}
            style={{ animationDelay: (80 + index * 60) + "ms" }}
          >
            <GlassCard
              hover
              mb={12}
              style={{ overflow: "hidden", cursor: "pointer" }}
              onClick={function () { setSelectedGift(selectedGift && selectedGift.id === gift.id ? null : gift); }}
            >
              <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
                {/* Gift icon / item preview */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "var(--dp-accent-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: gift.itemImage ? 28 : 0,
                }}>
                  {gift.itemImage ? gift.itemImage : (
                    <Gift size={22} color={"var(--dp-accent)"} strokeWidth={2} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: "var(--dp-text)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {gift.itemName || gift.item || "Gift"}
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--dp-text-secondary)",
                    marginTop: 2,
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
                      marginTop: 4, fontStyle: "italic",
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
                      background: BRAND.greenSolid + "1A",
                      color: "var(--dp-success)",
                      fontSize: 11, fontWeight: 600, }}>
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
                        background: GRADIENTS.primaryDark,
                        color: "#fff", fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease", fontFamily: "inherit",
                      }}
                    >
                      Claim
                    </button>
                  )}
                  {activeTab === "sent" && !isClaimed && (
                    <div style={{
                      padding: "4px 10px", borderRadius: 8,
                      background: "var(--dp-warning-soft, rgba(245,158,11,0.12))",
                      color: "var(--dp-warning)",
                      fontSize: 11, fontWeight: 600, }}>
                      Pending
                    </div>
                  )}
                  <span style={{
                    fontSize: 11, color: "var(--dp-text-secondary)",
                    }}>
                    {formatDate(gift.createdAt || gift.sentAt || gift.date)}
                  </span>
                </div>
              </div>

              {/* Expanded detail */}
              {selectedGift && selectedGift.id === gift.id && (
                <div style={{
                  padding: "0 16px 14px",
                  borderTop: "1px solid var(--dp-divider)",
                  paddingTop: 12,
                }}>
                  {gift.itemDescription && (
                    <div style={{
                      fontSize: 13, color: "var(--dp-text-secondary)",
                      lineHeight: 1.5, marginBottom: 8,
                    }}>
                      {gift.itemDescription}
                    </div>
                  )}
                  {gift.message && (
                    <GlassCard padding="10px 14px" style={{ borderRadius: 12, fontSize: 13, color: "var(--dp-text)", lineHeight: 1.5, fontStyle: "italic" }}>
                      &ldquo;{gift.message}&rdquo;
                    </GlassCard>
                  )}
                </div>
              )}
            </GlassCard>
          </div>
        );
      })}

      {/* Infinite scroll sentinel */}
      <div ref={giftsInf.sentinelRef} />
      {giftsInf.loadingMore && (
        <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, color: "var(--dp-text-secondary)" }}>Loading more...</div>
      )}

      {/* Empty state */}
      {!giftsInf.isLoading && displayGifts.length === 0 && (
        <div className={`dp-a ${mounted ? "dp-s" : ""}`} style={{ animationDelay: "160ms" }}>
          <GlassCard padding={40} style={{ textAlign: "center" }}>
            <Gift size={40} color={"var(--dp-text-muted)"} strokeWidth={1.5} style={{ margin: "0 auto 12px" }} />
            <div style={{
              fontSize: 16, fontWeight: 600, color: "var(--dp-text)",
              marginBottom: 6,
            }}>
              {activeTab === "received" ? "No gifts received" : "No gifts sent"}
            </div>
            <div style={{
              fontSize: 13, color: "var(--dp-text-secondary)",
              marginBottom: 16, lineHeight: 1.5,
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
                  background: GRADIENTS.primaryDark,
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Send size={15} strokeWidth={2} />
                Send a Gift
              </button>
            )}
          </GlassCard>
        </div>
      )}

      {/* ═══ SEND GIFT MODAL ═══ */}
      <GlassModal open={showSendModal} onClose={function () { setShowSendModal(false); }} title="Send a Gift" maxWidth={380}>
        <div style={{ padding: 24 }}>

            {/* Select Item */}
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 12, fontWeight: 600,
                color: "var(--dp-text-secondary)",
                marginBottom: 6, display: "block", }}>
                Choose an Item
              </label>
              {itemsQuery.isLoading ? (
                <div style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: "var(--dp-input-bg)",
                  border: "1px solid var(--dp-input-border)",
                  color: "var(--dp-text-secondary)", fontSize: 13,
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
                            ? "2px solid " + BRAND.purple + "80"
                            : "1px solid var(--dp-input-border)",
                          background: isSelected
                            ? BRAND.purple + "1A"
                            : "var(--dp-input-bg)",
                          cursor: "pointer", textAlign: "center",
                          transition: "all 0.15s", fontFamily: "inherit",
                        }}
                      >
                        <div style={{ fontSize: 24, marginBottom: 4 }}>
                          {item.image || (
                            <Package size={20} color="var(--dp-text-secondary)" />
                          )}
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 600, color: "var(--dp-text)",
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
                color: "var(--dp-text-secondary)",
                marginBottom: 6, display: "block", }}>
                Choose a Recipient
              </label>
              {friendsQuery.isLoading ? (
                <div style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: "var(--dp-input-bg)",
                  border: "1px solid var(--dp-input-border)",
                  color: "var(--dp-text-secondary)", fontSize: 13,
                  }}>
                  Loading friends...
                </div>
              ) : friends.length === 0 ? (
                <div style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: "var(--dp-input-bg)",
                  border: "1px solid var(--dp-input-border)",
                  color: "var(--dp-text-secondary)", fontSize: 13,
                  textAlign: "center",
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
                            ? "2px solid " + BRAND.purple + "80"
                            : "1px solid var(--dp-input-border)",
                          background: isSelected
                            ? BRAND.purple + "1A"
                            : "var(--dp-input-bg)",
                          cursor: "pointer", textAlign: "left",
                          transition: "all 0.15s", width: "100%", fontFamily: "inherit",
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: "var(--dp-accent-soft)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, overflow: "hidden",
                        }}>
                          {friend.avatar ? (
                            <img src={friend.avatar} alt="" style={{ width: 32, height: 32, objectFit: "cover" }} />
                          ) : (
                            <Users size={14} color={"var(--dp-accent)"} />
                          )}
                        </div>
                        <div style={{
                          fontSize: 13, fontWeight: 500, color: "var(--dp-text)",
                          }}>
                          {friend.displayName || friend.username || friend.name}
                        </div>
                        {isSelected && (
                          <Check size={16} color={"var(--dp-accent)"} strokeWidth={3} style={{ marginLeft: "auto" }} />
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
                color: "var(--dp-text-secondary)",
                marginBottom: 6, display: "block", }}>
                Message (optional)
              </label>
              <GlassInput
                value={sendMessage}
                onChange={function (e) { setSendMessage(e.target.value); }}
                placeholder="Add a personal message..."
                multiline
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={function () { setShowSendModal(false); }}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  border: "1px solid var(--dp-input-border)",
                  background: "var(--dp-input-bg)",
                  color: "var(--dp-text-secondary)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", }}
              >
                Cancel
              </button>
              <GradientButton
                gradient="primaryDark"
                icon={Send}
                onClick={handleSendGift}
                disabled={!sendItemId || !sendRecipientId || sendGiftMut.isPending}
                loading={sendGiftMut.isPending}
                style={{ flex: 1, padding: "12px", borderRadius: 12 }}
              >
                Send
              </GradientButton>
            </div>
        </div>
      </GlassModal>

      <style>{`
        @keyframes dpFS { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes dpPulse { 0% { opacity:0.4; } 50% { opacity:0.8; } 100% { opacity:0.4; } }
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        textarea::placeholder{color:var(--dp-text-muted);}
      `}</style>
    </PageLayout>
  );
}
