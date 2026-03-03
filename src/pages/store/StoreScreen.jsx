import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useInfiniteList from "../../hooks/useInfiniteList";
import { ArrowLeft, Zap, Heart, Check, X, Star, ShoppingBag, Package, RotateCcw, Clock, Gift } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import PillTabs from "../../components/shared/PillTabs";
import GradientButton from "../../components/shared/GradientButton";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { apiGet, apiPost, apiDelete } from "../../services/api";
import { STORE } from "../../services/endpoints";
import { BRAND, GRADIENTS, adaptColor } from "../../styles/colors";

var CATEGORIES = [
  { id: "all", label: "All" },
  { id: "badge_frame", label: "Badge Frames" },
  { id: "theme_skin", label: "Themes" },
  { id: "avatar_decoration", label: "Decorations" },
  { id: "chat_bubble", label: "Chat" },
  { id: "streak_shield", label: "Shields" },
  { id: "xp_booster", label: "Boosters" },
];

var RARITY_CONFIG = {
  common: { color: "#9CA3AF", label: "Common", glow: "none" },
  rare: { color: "#3B82F6", label: "Rare", glow: "0 0 12px rgba(59,130,246,0.5)" },
  epic: { color: "#8B5CF6", label: "Epic", glow: "0 0 14px rgba(139,92,246,0.5)" },
  legendary: { color: "#FCD34D", label: "Legendary", glow: "0 0 18px rgba(252,211,77,0.6)" },
};


export default function StoreScreen() {
  var navigate = useNavigate();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var { user, refreshUser } = useAuth();
  var { showToast } = useToast();
  var queryClient = useQueryClient();

  var [mounted, setMounted] = useState(false);
  var [activeCategory, setActiveCategory] = useState("all");
  var [activeTab, setActiveTab] = useState("shop");
  var [selectedItem, setSelectedItem] = useState(null);
  var [showSkeletons, setShowSkeletons] = useState(true);
  var [refundModal, setRefundModal] = useState(null);
  var [refundReason, setRefundReason] = useState("");

  var userXp = (user && user.xp) || 0;

  // ── Store items query (infinite scroll) ──
  var itemsUrl = STORE.ITEMS + (activeCategory !== "all" ? "?category=" + activeCategory : "");
  var itemsInf = useInfiniteList({ queryKey: ["store-items", activeCategory], url: itemsUrl, limit: 30 });
  var items = itemsInf.items;

  // ── Inventory query (infinite scroll, only when inventory tab active) ──
  var inventoryInf = useInfiniteList({ queryKey: ["store-inventory"], url: STORE.INVENTORY, limit: 30, enabled: activeTab === "inventory" });
  var inventoryItems = inventoryInf.items;

  // ── History query (infinite scroll, only when history tab active) ──
  var historyInf = useInfiniteList({ queryKey: ["store-history"], url: STORE.INVENTORY_HISTORY, limit: 30, enabled: activeTab === "history" });
  var historyItems = historyInf.items;

  // ── Wishlist query ──
  var wishlistQuery = useQuery({
    queryKey: ["store-wishlist"],
    queryFn: function () { return apiGet(STORE.WISHLIST); },
  });
  var wishlistData = (wishlistQuery.data && wishlistQuery.data.results) || wishlistQuery.data || [];
  var wishlistSet = new Set(wishlistData.map(function (w) { return w.itemId || w.id; }));

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 30);
    return function () { clearTimeout(timer); };
  }, []);

  // Hide skeletons once items have had time to fade in
  useEffect(function () {
    if (mounted) {
      var timer = setTimeout(function () { setShowSkeletons(false); }, 400);
      return function () { clearTimeout(timer); };
    }
  }, [mounted]);

  var displayItems = activeTab === "inventory" ? inventoryItems : activeTab === "history" ? [] : items;
  var filteredItems = displayItems.filter(function (item) {
    var matchCategory = activeCategory === "all" || item.type === activeCategory;
    return matchCategory;
  });

  // ── Mutations ──

  var purchaseMut = useMutation({
    mutationFn: function (itemId) {
      return apiPost(STORE.PURCHASE_XP, { item_id: itemId });
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      queryClient.invalidateQueries({ queryKey: ["store-inventory"] });
      refreshUser();
      showToast("Item purchased!", "success");
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Purchase failed", "error");
    },
  });

  var equipMut = useMutation({
    mutationFn: function (itemId) {
      return apiPost(STORE.EQUIP(itemId), { equip: true });
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      queryClient.invalidateQueries({ queryKey: ["store-inventory"] });
      refreshUser();
      showToast("Item equipped!", "success");
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Equip failed", "error");
    },
  });

  var wishlistAddMut = useMutation({
    mutationFn: function (itemId) {
      return apiPost(STORE.WISHLIST, { item_id: itemId });
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["store-wishlist"] });
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to update wishlist", "error");
    },
  });

  var wishlistRemoveMut = useMutation({
    mutationFn: function (itemId) {
      return apiDelete(STORE.WISHLIST + itemId + "/");
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["store-wishlist"] });
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to update wishlist", "error");
    },
  });

  var refundMut = useMutation({
    mutationFn: function (data) { return apiPost(STORE.REFUNDS, data); },
    onSuccess: function () {
      showToast("Refund request submitted", "success");
      setRefundModal(null);
      setRefundReason("");
      queryClient.invalidateQueries({ queryKey: ["store-history"] });
    },
    onError: function (err) { showToast(err.userMessage || err.message || "Refund request failed", "error"); },
  });

  var handleBuy = function (itemId) {
    purchaseMut.mutate(itemId);
  };

  var handleEquip = function (itemId) {
    equipMut.mutate(itemId);
  };

  var toggleWishlist = function (itemId) {
    if (wishlistSet.has(itemId)) {
      wishlistRemoveMut.mutate(itemId);
    } else {
      wishlistAddMut.mutate(itemId);
    }
  };

  var renderButton = function (item) {
    if (item.equipped) {
      return (
        <button
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            padding: "8px 0", width: "100%", borderRadius: 12,
            background: BRAND.teal, border: "none",
            color: BRAND.white, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.25s ease",
            fontFamily: "inherit",
          }}
          onClick={function (e) { e.stopPropagation(); handleEquip(item.id); }}
        >
          <Check size={14} /> Equipped
        </button>
      );
    }
    if (item.owned) {
      return (
        <button
          style={{
            padding: "8px 0", width: "100%", borderRadius: 12,
            background: "transparent", border: "1px solid " + BRAND.teal,
            color: BRAND.teal, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.25s ease",
            fontFamily: "inherit",
          }}
          onClick={function (e) { e.stopPropagation(); handleEquip(item.id); }}
        >
          Equip
        </button>
      );
    }
    return (
      <button
        style={{
          padding: "8px 0", width: "100%", borderRadius: 12,
          background: GRADIENTS.primaryDark,
          border: "none",
          color: BRAND.white, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.25s ease",
          fontFamily: "inherit",
          opacity: userXp < item.price ? 0.5 : 1,
        }}
        onClick={function (e) { e.stopPropagation(); handleBuy(item.id); }}
        disabled={userXp < item.price || purchaseMut.isPending}
      >
        Buy
      </button>
    );
  };

  if (itemsInf.isError) {
    return (
      <PageLayout>
        <ErrorState
          message={(itemsInf.error && (itemsInf.error.userMessage || itemsInf.error.message)) || "Failed to load store items"}
          onRetry={function () { itemsInf.refetch(); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate("/"); }} label="Go back" />}
        title={<h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Store</h1>}
        right={<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <IconButton icon={Gift} onClick={function () { navigate("/store/gifts"); }} label="Send Gift" />

          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", borderRadius: 14, padding: "8px 14px" }}>
            <Zap size={16} color={adaptColor(BRAND.yellow, isLight)} fill={adaptColor(BRAND.yellow, isLight)} />
            <span style={{ fontSize: 14, fontWeight: 700, color: adaptColor(BRAND.yellow, isLight) }}>
              {userXp.toLocaleString()} XP
            </span>
          </div>
        </div>}
      />
    }>
      {/* Shimmer animation for legendary items */}
      <style>{`
        @keyframes legendaryShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes floatItem {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes skeletonPulse {
          0% { opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
        @keyframes skeletonShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Category Tabs */}
      <PillTabs
        tabs={CATEGORIES.map(function (cat) { return { key: cat.id, label: cat.label }; })}
        active={activeCategory}
        onChange={setActiveCategory}
        scrollable
        style={{ paddingBottom: 12 }}
      />

      {/* Shop / Inventory Tabs */}
      <GlassCard padding={4} mb={16} style={{ borderRadius: 14 }}>
        <PillTabs
          tabs={[
            { key: "shop", label: "Shop", icon: ShoppingBag },
            { key: "inventory", label: "Inventory", icon: Package },
            { key: "history", label: "History", icon: Clock },
          ]}
          active={activeTab}
          onChange={setActiveTab}
          style={{ gap: 4 }}
        />
      </GlassCard>

      {/* Item Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        paddingBottom: 32,
        position: "relative",
      }}>
        {/* Skeleton loading placeholders */}
        {(showSkeletons || (activeTab === "inventory" ? inventoryInf.isLoading : itemsInf.isLoading)) && Array.from({ length: 4 }).map(function (_, i) {
          return (
            <GlassCard
              key={"skeleton-" + i}
              padding={16}
              style={{
                animation: "skeletonPulse 1.5s ease-in-out infinite",
                animationDelay: i * 0.15 + "s",
              }}
            >
              {/* Skeleton emoji area */}
              <div style={{
                width: 48, height: 48, borderRadius: 12, margin: "8px auto 12px",
                background: "linear-gradient(90deg, var(--dp-surface) 25%, rgba(139,92,246,0.08) 50%, var(--dp-surface) 75%)",
                backgroundSize: "200% 100%",
                animation: "skeletonShimmer 1.8s ease-in-out infinite",
              }} />
              {/* Skeleton name */}
              <div style={{
                width: "70%", height: 14, borderRadius: 7, margin: "0 auto 8px",
                background: "linear-gradient(90deg, var(--dp-surface) 25%, rgba(139,92,246,0.08) 50%, var(--dp-surface) 75%)",
                backgroundSize: "200% 100%",
                animation: "skeletonShimmer 1.8s ease-in-out infinite",
                animationDelay: "0.1s",
              }} />
              {/* Skeleton rarity badge */}
              <div style={{
                width: "40%", height: 10, borderRadius: 5, margin: "0 auto 10px",
                background: "linear-gradient(90deg, var(--dp-surface) 25%, rgba(139,92,246,0.08) 50%, var(--dp-surface) 75%)",
                backgroundSize: "200% 100%",
                animation: "skeletonShimmer 1.8s ease-in-out infinite",
                animationDelay: "0.2s",
              }} />
              {/* Skeleton price */}
              <div style={{
                width: "30%", height: 12, borderRadius: 6, margin: "0 auto 12px",
                background: "linear-gradient(90deg, var(--dp-surface) 25%, rgba(139,92,246,0.08) 50%, var(--dp-surface) 75%)",
                backgroundSize: "200% 100%",
                animation: "skeletonShimmer 1.8s ease-in-out infinite",
                animationDelay: "0.3s",
              }} />
              {/* Skeleton button */}
              <div style={{
                width: "100%", height: 34, borderRadius: 12,
                background: "linear-gradient(90deg, var(--dp-surface) 25%, rgba(139,92,246,0.08) 50%, var(--dp-surface) 75%)",
                backgroundSize: "200% 100%",
                animation: "skeletonShimmer 1.8s ease-in-out infinite",
                animationDelay: "0.4s",
              }} />
            </GlassCard>
          );
        })}

        {filteredItems.map(function (item, index) {
          var rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
          var rarityTextColor = adaptColor(rarity.color, isLight);
          return (
            <GlassCard
              hover
              key={item.id}
              onClick={function () { setSelectedItem(item); }}
              padding={16}
              style={{
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
                transitionDelay: (0.1 + index * 0.03) + "s",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Wishlist heart */}
              <button
                onClick={function (e) { e.stopPropagation(); toggleWishlist(item.id); }}
                style={{
                  position: "absolute", top: 10, right: 10, zIndex: 2,
                  background: "none", border: "none", cursor: "pointer",
                  padding: 4, transition: "all 0.25s ease", fontFamily: "inherit",
                }}
              >
                <Heart
                  size={16}
                  color={wishlistSet.has(item.id) ? BRAND.pink : "var(--dp-text-muted)"}
                  fill={wishlistSet.has(item.id) ? BRAND.pink : "none"}
                  style={{ transition: "all 0.25s ease" }}
                />
              </button>

              {/* Item emoji */}
              <div style={{
                fontSize: 48, textAlign: "center", margin: "8px 0 12px",
                animation: "floatItem 3s ease-in-out infinite",
                animationDelay: (index * 0.2) + "s",
                filter: item.rarity === "legendary"
                  ? "drop-shadow(0 0 12px rgba(252,211,77,0.4))"
                  : item.rarity === "epic"
                  ? "drop-shadow(0 0 8px rgba(139,92,246,0.3))"
                  : "none",
              }}>
                {item.image}
              </div>

              {/* Item name */}
              <div style={{
                fontSize: 13, fontWeight: 600, color: "var(--dp-text)", textAlign: "center",
                marginBottom: 6,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {item.name}
              </div>

              {/* Rarity badge */}
              <div style={{
                display: "flex", justifyContent: "center", marginBottom: 8,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.5px", padding: "3px 8px", borderRadius: 6,
                  color: rarityTextColor,
                  background: item.rarity === "legendary"
                    ? "linear-gradient(90deg, transparent, rgba(252,211,77,0.15), transparent)"
                    : rarity.color + "15",
                  border: "1px solid " + rarity.color + "30",
                  boxShadow: rarity.glow,
                  ...(item.rarity === "legendary" ? {
                    backgroundSize: "200% 100%",
                    animation: "legendaryShimmer 2s linear infinite",
                  } : {}),
                }}>
                  {rarity.label}
                </span>
              </div>

              {/* Price */}
              {!item.owned && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 4, marginBottom: 10,
                }}>
                  <Zap size={12} color={adaptColor(BRAND.yellow, isLight)} fill={adaptColor(BRAND.yellow, isLight)} />
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: adaptColor(BRAND.yellow, isLight),
                    }}>
                    {item.price}
                  </span>
                </div>
              )}
              {item.owned && !item.equipped && (
                <div style={{
                  textAlign: "center", marginBottom: 10,
                  fontSize: 11, color: "var(--dp-text-muted)",
                  fontWeight: 500,
                }}>
                  Owned
                </div>
              )}

              {/* Action button */}
              {renderButton(item)}
            </GlassCard>
          );
        })}
      </div>
      {/* Infinite scroll sentinel for shop/inventory grid */}
      {activeTab === "shop" && <div ref={itemsInf.sentinelRef} style={{ height: 1 }} />}
      {activeTab === "inventory" && <div ref={inventoryInf.sentinelRef} style={{ height: 1 }} />}
      {activeTab === "shop" && itemsInf.loadingMore && (
        <div style={{ textAlign: "center", padding: 16, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading more…</div>
      )}
      {activeTab === "inventory" && inventoryInf.loadingMore && (
        <div style={{ textAlign: "center", padding: 16, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading more…</div>
      )}

      {/* Empty state */}
      {filteredItems.length === 0 && !(activeTab === "inventory" ? inventoryInf.isLoading : itemsInf.isLoading) && !showSkeletons && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease 0.3s",
        }}>
          <Package size={48} color="var(--dp-text-muted)" style={{ marginBottom: 16 }} />
          <div style={{
            fontSize: 16, fontWeight: 600, color: "var(--dp-text-tertiary)",
            marginBottom: 8,
          }}>
            {activeTab === "inventory" ? "No items in inventory" : "No items found"}
          </div>
          <div style={{
            fontSize: 13, color: "var(--dp-text-muted)",
            }}>
            {activeTab === "inventory"
              ? "Purchase items from the shop to see them here"
              : "Try a different category"}
          </div>
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 32 }}>
          {historyInf.isLoading && Array.from({ length: 3 }).map(function (_, i) {
            return (
              <GlassCard key={"hist-skel-" + i} padding={16} style={{
                animation: "skeletonPulse 1.5s ease-in-out infinite",
                animationDelay: i * 0.15 + "s",
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "linear-gradient(90deg, var(--dp-surface) 25%, rgba(139,92,246,0.08) 50%, var(--dp-surface) 75%)",
                    backgroundSize: "200% 100%", animation: "skeletonShimmer 1.8s ease-in-out infinite", flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: "60%", height: 14, borderRadius: 7, marginBottom: 8,
                      background: "linear-gradient(90deg, var(--dp-surface) 25%, rgba(139,92,246,0.08) 50%, var(--dp-surface) 75%)",
                      backgroundSize: "200% 100%", animation: "skeletonShimmer 1.8s ease-in-out infinite",
                    }} />
                    <div style={{ width: "40%", height: 10, borderRadius: 5,
                      background: "linear-gradient(90deg, var(--dp-surface) 25%, rgba(139,92,246,0.08) 50%, var(--dp-surface) 75%)",
                      backgroundSize: "200% 100%", animation: "skeletonShimmer 1.8s ease-in-out infinite",
                    }} />
                  </div>
                </div>
              </GlassCard>
            );
          })}
          {!historyInf.isLoading && historyItems.length === 0 && (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease 0.3s",
            }}>
              <Clock size={48} color="var(--dp-text-muted)" style={{ marginBottom: 16 }} />
              <div style={{
                fontSize: 16, fontWeight: 600, color: "var(--dp-text-tertiary)",
                marginBottom: 8,
              }}>
                No purchase history
              </div>
              <div style={{
                fontSize: 13, color: "var(--dp-text-muted)",
                }}>
                Your past purchases will appear here
              </div>
            </div>
          )}
          {historyItems.map(function (item, index) {
            return (
              <GlassCard key={item.id || index} padding={16} style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transitionDelay: (0.05 + index * 0.03) + "s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Item image/emoji */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "var(--dp-surface)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0,
                  }}>
                    {item.image || item.itemImage || "🛍️"}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: "var(--dp-text)",
                      marginBottom: 4,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {item.name || item.itemName || "Unknown Item"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 12, color: "var(--dp-text-muted)", }}>
                        {item.purchasedAt ? new Date(item.purchasedAt).toLocaleDateString() : item.date || "—"}
                      </span>
                      <span style={{
                        display: "flex", alignItems: "center", gap: 3,
                        fontSize: 12, fontWeight: 600, color: adaptColor(BRAND.yellow, isLight),
                        }}>
                        <Zap size={10} color={adaptColor(BRAND.yellow, isLight)} fill={adaptColor(BRAND.yellow, isLight)} />
                        {item.price || item.pricePaid || 0} XP
                      </span>
                    </div>
                  </div>
                  {/* Refund button */}
                  <button
                    className="dp-gh"
                    onClick={function () { setRefundModal(item); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "8px 12px", borderRadius: 10,
                      background: "transparent", border: "1px solid var(--dp-input-border)",
                      color: "var(--dp-text-secondary)", fontSize: 12, fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.25s ease", flexShrink: 0, fontFamily: "inherit",
                    }}
                  >
                    <RotateCcw size={12} />
                    Refund
                  </button>
                </div>
              </GlassCard>
            );
          })}
          <div ref={historyInf.sentinelRef} style={{ height: 1 }} />
          {historyInf.loadingMore && (
            <div style={{ textAlign: "center", padding: 16, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading more…</div>
          )}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (function () {
        var rarity = RARITY_CONFIG[selectedItem.rarity] || RARITY_CONFIG.common;
        return (
          <GlassModal
            open={!!selectedItem}
            onClose={function () { setSelectedItem(null); }}
            variant="center"
            maxWidth={360}
          >
            <div style={{ padding: 28, position: "relative" }}>
              {/* Wishlist */}
              <button
                onClick={function () { toggleWishlist(selectedItem.id); }}
                style={{
                  position: "absolute", top: 14, left: 14,
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  fontFamily: "inherit",
                }}
              >
                <Heart
                  size={20}
                  color={wishlistSet.has(selectedItem.id) ? BRAND.pink : "var(--dp-text-muted)"}
                  fill={wishlistSet.has(selectedItem.id) ? BRAND.pink : "none"}
                />
              </button>

              {/* Large emoji */}
              <div style={{
                fontSize: 80, textAlign: "center", margin: "16px 0 20px",
                filter: selectedItem.rarity === "legendary"
                  ? "drop-shadow(0 0 20px rgba(252,211,77,0.5))"
                  : selectedItem.rarity === "epic"
                  ? "drop-shadow(0 0 14px rgba(139,92,246,0.4))"
                  : "none",
              }}>
                {selectedItem.image}
              </div>

              {/* Name */}
              <div style={{
                fontSize: 20, fontWeight: 700, color: "var(--dp-text)", textAlign: "center",
                marginBottom: 8,
              }}>
                {selectedItem.name}
              </div>

              {/* Rarity */}
              <div style={{
                display: "flex", justifyContent: "center", marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.5px", padding: "4px 12px", borderRadius: 8,
                  color: rarity.color,
                  background: rarity.color + "15",
                  border: "1px solid " + rarity.color + "30",
                  boxShadow: rarity.glow,
                }}>
                  <Star size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  {rarity.label}
                </span>
              </div>

              {/* Description */}
              <div style={{
                fontSize: 14, color: "var(--dp-text-secondary)", textAlign: "center",
                lineHeight: 1.5, marginBottom: 20,
                padding: "0 8px",
              }}>
                {selectedItem.description}
              </div>

              {/* Price */}
              {!selectedItem.owned && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, marginBottom: 20,
                }}>
                  <Zap size={18} color={BRAND.yellow} fill={BRAND.yellow} />
                  <span style={{
                    fontSize: 22, fontWeight: 800, color: BRAND.yellow,
                    }}>
                    {selectedItem.price} XP
                  </span>
                </div>
              )}

              {/* Action button */}
              <div style={{ padding: "0 8px" }}>
                {selectedItem.equipped ? (
                  <GradientButton
                    gradient="teal"
                    onClick={function () {
                      handleEquip(selectedItem.id);
                      setSelectedItem(Object.assign({}, selectedItem, { equipped: false }));
                    }}
                    icon={Check}
                    fullWidth
                    size="lg"
                  >
                    Equipped
                  </GradientButton>
                ) : selectedItem.owned ? (
                  <button
                    onClick={function () {
                      handleEquip(selectedItem.id);
                      setSelectedItem(Object.assign({}, selectedItem, { equipped: true }));
                    }}
                    style={{
                      padding: "14px 0", width: "100%", borderRadius: 14,
                      background: "transparent", border: "2px solid " + BRAND.teal,
                      color: BRAND.teal, fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.25s ease",
                      fontFamily: "inherit",
                    }}
                  >
                    Equip Item
                  </button>
                ) : (
                  <GradientButton
                    gradient="primaryDark"
                    onClick={function () {
                      handleBuy(selectedItem.id);
                      if (userXp >= selectedItem.price) {
                        setSelectedItem(Object.assign({}, selectedItem, { owned: true }));
                      }
                    }}
                    icon={Zap}
                    fullWidth
                    size="lg"
                    disabled={userXp < selectedItem.price || purchaseMut.isPending}
                  >
                    Buy for {selectedItem.price} XP
                  </GradientButton>
                )}
              </div>
            </div>
          </GlassModal>
        );
      })()}
      {/* Refund Modal */}
      <GlassModal
        open={!!refundModal}
        onClose={function () { setRefundModal(null); setRefundReason(""); }}
        variant="center"
        title="Request Refund"
        maxWidth={360}
      >
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 13, color: "var(--dp-text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
            Refund for: <strong>{refundModal && (refundModal.name || refundModal.itemName)}</strong>
          </p>
          <GlassInput
            value={refundReason}
            onChange={function (e) { setRefundReason(e.target.value); }}
            placeholder="Reason for refund..."
            multiline
            style={{ marginBottom: 14 }}
            inputStyle={{ minHeight: 72 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={function () { setRefundModal(null); setRefundReason(""); }} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid var(--dp-input-border)", background: "var(--dp-glass-bg)", color: "var(--dp-text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <GradientButton
              gradient="primaryDark"
              onClick={function () { refundMut.mutate({ purchaseId: refundModal && refundModal.id, reason: refundReason.trim() }); }}
              disabled={!refundReason.trim()}
              style={{ flex: 1 }}
            >
              Submit
            </GradientButton>
          </div>
        </div>
      </GlassModal>
    </PageLayout>
  );
}
