import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useInfiniteList from "../../hooks/useInfiniteList";
import { ArrowLeft, Zap, Heart, Check, X, Star, ShoppingBag, Package, RotateCcw, Clock } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { apiGet, apiPost, apiDelete } from "../../services/api";

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

var glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
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
  var itemsUrl = "/api/store/items/" + (activeCategory !== "all" ? "?category=" + activeCategory : "");
  var itemsInf = useInfiniteList({ queryKey: ["store-items", activeCategory], url: itemsUrl, limit: 30 });
  var items = itemsInf.items;

  // ── Inventory query (infinite scroll, only when inventory tab active) ──
  var inventoryInf = useInfiniteList({ queryKey: ["store-inventory"], url: "/api/store/inventory/", limit: 30, enabled: activeTab === "inventory" });
  var inventoryItems = inventoryInf.items;

  // ── History query (infinite scroll, only when history tab active) ──
  var historyInf = useInfiniteList({ queryKey: ["store-history"], url: "/api/store/inventory/history/", limit: 30, enabled: activeTab === "history" });
  var historyItems = historyInf.items;

  // ── Wishlist query ──
  var wishlistQuery = useQuery({
    queryKey: ["store-wishlist"],
    queryFn: function () { return apiGet("/api/store/wishlist/"); },
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

  var displayItems = activeTab === "inventory" ? inventoryItems : items;
  var filteredItems = displayItems.filter(function (item) {
    var matchCategory = activeCategory === "all" || item.type === activeCategory;
    return matchCategory;
  });

  // ── Mutations ──

  var purchaseMut = useMutation({
    mutationFn: function (itemId) {
      return apiPost("/api/store/purchase/xp/", { itemId: itemId });
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      queryClient.invalidateQueries({ queryKey: ["store-inventory"] });
      refreshUser();
      showToast("Item purchased!", "success");
    },
    onError: function (err) {
      showToast(err.message || "Purchase failed", "error");
    },
  });

  var equipMut = useMutation({
    mutationFn: function (itemId) {
      return apiPost("/api/store/inventory/" + itemId + "/equip/");
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      queryClient.invalidateQueries({ queryKey: ["store-inventory"] });
      showToast("Item equipped!", "success");
    },
    onError: function (err) {
      showToast(err.message || "Equip failed", "error");
    },
  });

  var wishlistAddMut = useMutation({
    mutationFn: function (itemId) {
      return apiPost("/api/store/wishlist/", { itemId: itemId });
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["store-wishlist"] });
    },
    onError: function (err) {
      showToast(err.message || "Failed to update wishlist", "error");
    },
  });

  var wishlistRemoveMut = useMutation({
    mutationFn: function (itemId) {
      return apiDelete("/api/store/wishlist/" + itemId + "/");
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["store-wishlist"] });
    },
    onError: function (err) {
      showToast(err.message || "Failed to update wishlist", "error");
    },
  });

  var refundMut = useMutation({
    mutationFn: function (data) { return apiPost("/api/store/refunds/", data); },
    onSuccess: function () {
      showToast("Refund request submitted", "success");
      setRefundModal(null);
      setRefundReason("");
      queryClient.invalidateQueries({ queryKey: ["store-history"] });
    },
    onError: function (err) { showToast(err.message || "Refund request failed", "error"); },
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
            background: "#14B8A6", border: "none",
            color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif",
            cursor: "pointer", transition: "all 0.25s ease",
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
            background: "transparent", border: "1px solid #14B8A6",
            color: "#14B8A6", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif",
            cursor: "pointer", transition: "all 0.25s ease",
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
          background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
          border: "none",
          color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif",
          cursor: "pointer", transition: "all 0.25s ease",
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
          message={(itemsInf.error && itemsInf.error.message) || "Failed to load store items"}
          onRetry={function () { itemsInf.refetch(); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
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

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 16, paddingBottom: 12,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button className="dp-ib" onClick={function () { navigate(-1); }}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
            fontFamily: "Inter, sans-serif", margin: 0,
          }}>
            Store
          </h1>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          ...glassStyle, borderRadius: 14,
          padding: "8px 14px",
        }}>
          <Zap size={16} color={isLight ? "#B45309" : "#FCD34D"} fill={isLight ? "#B45309" : "#FCD34D"} />
          <span style={{
            fontSize: 14, fontWeight: 700, color: isLight ? "#B45309" : "#FCD34D",
            fontFamily: "Inter, sans-serif",
          }}>
            {userXp.toLocaleString()} XP
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s",
      }}>
        {CATEGORIES.map(function (cat) {
          return (
            <button
              key={cat.id}
              onClick={function () { setActiveCategory(cat.id); }}
              style={{
                padding: "8px 16px", borderRadius: 12, whiteSpace: "nowrap",
                background: activeCategory === cat.id
                  ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                  : "var(--dp-surface)",
                border: activeCategory === cat.id
                  ? "1px solid rgba(139,92,246,0.3)"
                  : "1px solid var(--dp-input-border)",
                color: activeCategory === cat.id ? "var(--dp-text)" : "var(--dp-text-secondary)",
                fontSize: 13, fontWeight: 500, fontFamily: "Inter, sans-serif",
                cursor: "pointer", transition: "all 0.25s ease", flexShrink: 0,
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Shop / Inventory Tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 16,
        ...glassStyle, borderRadius: 14, padding: 4,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s",
      }}>
        {[
          { id: "shop", label: "Shop", icon: ShoppingBag },
          { id: "inventory", label: "Inventory", icon: Package },
          { id: "history", label: "History", icon: Clock },
        ].map(function (tab) {
          var Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={function () { setActiveTab(tab.id); }}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 0", borderRadius: 12, border: "none",
                background: activeTab === tab.id
                  ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.2))"
                  : "transparent",
                color: activeTab === tab.id ? "var(--dp-text)" : "var(--dp-text-tertiary)",
                fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif",
                cursor: "pointer", transition: "all 0.25s ease",
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Item Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        paddingBottom: 32,
        position: "relative",
      }}>
        {/* Skeleton loading placeholders */}
        {(showSkeletons || (activeTab === "inventory" ? inventoryInf.isLoading : itemsInf.isLoading)) && Array.from({ length: 4 }).map(function (_, i) {
          return (
            <div
              key={"skeleton-" + i}
              style={{
                ...glassStyle,
                padding: 16,
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
            </div>
          );
        })}

        {filteredItems.map(function (item, index) {
          var rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
          var rarityTextColor = isLight
            ? (rarity.color === "#9CA3AF" ? "#4B5563" : rarity.color === "#FCD34D" ? "#B45309" : rarity.color)
            : rarity.color;
          return (
            <div
              key={item.id}
              onClick={function () { setSelectedItem(item); }}
              style={{
                ...glassStyle,
                padding: 16, cursor: "pointer",
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
                  padding: 4, transition: "all 0.25s ease",
                }}
              >
                <Heart
                  size={16}
                  color={wishlistSet.has(item.id) ? "#EC4899" : "var(--dp-text-muted)"}
                  fill={wishlistSet.has(item.id) ? "#EC4899" : "none"}
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
                fontFamily: "Inter, sans-serif", marginBottom: 6,
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
                  letterSpacing: "0.5px", fontFamily: "Inter, sans-serif",
                  padding: "3px 8px", borderRadius: 6,
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
                  <Zap size={12} color={isLight ? "#B45309" : "#FCD34D"} fill={isLight ? "#B45309" : "#FCD34D"} />
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: isLight ? "#B45309" : "#FCD34D",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    {item.price}
                  </span>
                </div>
              )}
              {item.owned && !item.equipped && (
                <div style={{
                  textAlign: "center", marginBottom: 10,
                  fontSize: 11, color: "var(--dp-text-muted)",
                  fontFamily: "Inter, sans-serif", fontWeight: 500,
                }}>
                  Owned
                </div>
              )}

              {/* Action button */}
              {renderButton(item)}
            </div>
          );
        })}
      </div>
      {/* Infinite scroll sentinel for shop/inventory grid */}
      {activeTab === "shop" && <div ref={itemsInf.sentinelRef} style={{ height: 1 }} />}
      {activeTab === "inventory" && <div ref={inventoryInf.sentinelRef} style={{ height: 1 }} />}
      {activeTab === "shop" && itemsInf.loadingMore && (
        <div style={{ textAlign: "center", padding: 16, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading more…</div>
      )}
      {activeTab === "inventory" && inventoryInf.loadingMore && (
        <div style={{ textAlign: "center", padding: 16, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading more…</div>
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
            fontFamily: "Inter, sans-serif", marginBottom: 8,
          }}>
            {activeTab === "inventory" ? "No items in inventory" : "No items found"}
          </div>
          <div style={{
            fontSize: 13, color: "var(--dp-text-muted)",
            fontFamily: "Inter, sans-serif",
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
              <div key={"hist-skel-" + i} style={{
                ...glassStyle, padding: 16,
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
              </div>
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
                fontFamily: "Inter, sans-serif", marginBottom: 8,
              }}>
                No purchase history
              </div>
              <div style={{
                fontSize: 13, color: "var(--dp-text-muted)",
                fontFamily: "Inter, sans-serif",
              }}>
                Your past purchases will appear here
              </div>
            </div>
          )}
          {historyItems.map(function (item, index) {
            return (
              <div key={item.id || index} style={{
                ...glassStyle, padding: 16,
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
                      fontFamily: "Inter, sans-serif", marginBottom: 4,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {item.name || item.itemName || "Unknown Item"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 12, color: "var(--dp-text-muted)", fontFamily: "Inter, sans-serif",
                      }}>
                        {item.purchasedAt ? new Date(item.purchasedAt).toLocaleDateString() : item.date || "—"}
                      </span>
                      <span style={{
                        display: "flex", alignItems: "center", gap: 3,
                        fontSize: 12, fontWeight: 600, color: isLight ? "#B45309" : "#FCD34D",
                        fontFamily: "Inter, sans-serif",
                      }}>
                        <Zap size={10} color={isLight ? "#B45309" : "#FCD34D"} fill={isLight ? "#B45309" : "#FCD34D"} />
                        {item.price || item.pricePaid || 0} XP
                      </span>
                    </div>
                  </div>
                  {/* Refund button */}
                  <button
                    onClick={function () { setRefundModal(item); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "8px 12px", borderRadius: 10,
                      background: "transparent", border: "1px solid var(--dp-input-border)",
                      color: "var(--dp-text-secondary)", fontSize: 12, fontWeight: 600,
                      fontFamily: "Inter, sans-serif", cursor: "pointer",
                      transition: "all 0.25s ease", flexShrink: 0,
                    }}
                  >
                    <RotateCcw size={12} />
                    Refund
                  </button>
                </div>
              </div>
            );
          })}
          <div ref={historyInf.sentinelRef} style={{ height: 1 }} />
          {historyInf.loadingMore && (
            <div style={{ textAlign: "center", padding: 16, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading more…</div>
          )}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (function () {
        var rarity = RARITY_CONFIG[selectedItem.rarity] || RARITY_CONFIG.common;
        return (
          <div
            onClick={function () { setSelectedItem(null); }}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 24, animation: "overlayFadeIn 0.25s ease",
            }}
          >
            <div
              onClick={function (e) { e.stopPropagation(); }}
              style={{
                ...glassStyle,
                background: "var(--dp-modal-bg)",
                padding: 28, width: "100%", maxWidth: 360,
                animation: "modalFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
              }}
            >
              {/* Close button */}
              <button
                onClick={function () { setSelectedItem(null); }}
                style={{
                  position: "absolute", top: 14, right: 14,
                  width: 32, height: 32, borderRadius: 10,
                  background: "var(--dp-surface-hover)", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} color="var(--dp-text-tertiary)" />
              </button>

              {/* Wishlist */}
              <button
                onClick={function () { toggleWishlist(selectedItem.id); }}
                style={{
                  position: "absolute", top: 14, left: 14,
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                }}
              >
                <Heart
                  size={20}
                  color={wishlistSet.has(selectedItem.id) ? "#EC4899" : "var(--dp-text-muted)"}
                  fill={wishlistSet.has(selectedItem.id) ? "#EC4899" : "none"}
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
                fontFamily: "Inter, sans-serif", marginBottom: 8,
              }}>
                {selectedItem.name}
              </div>

              {/* Rarity */}
              <div style={{
                display: "flex", justifyContent: "center", marginBottom: 12,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.5px", fontFamily: "Inter, sans-serif",
                  padding: "4px 12px", borderRadius: 8,
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
                fontFamily: "Inter, sans-serif", lineHeight: 1.5, marginBottom: 20,
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
                  <Zap size={18} color="#FCD34D" fill="#FCD34D" />
                  <span style={{
                    fontSize: 22, fontWeight: 800, color: "#FCD34D",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    {selectedItem.price} XP
                  </span>
                </div>
              )}

              {/* Action button */}
              <div style={{ padding: "0 8px" }}>
                {selectedItem.equipped ? (
                  <button
                    onClick={function () {
                      handleEquip(selectedItem.id);
                      setSelectedItem(Object.assign({}, selectedItem, { equipped: false }));
                    }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "14px 0", width: "100%", borderRadius: 14,
                      background: "#14B8A6", border: "none",
                      color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "Inter, sans-serif",
                      cursor: "pointer", transition: "all 0.25s ease",
                    }}
                  >
                    <Check size={18} /> Equipped
                  </button>
                ) : selectedItem.owned ? (
                  <button
                    onClick={function () {
                      handleEquip(selectedItem.id);
                      setSelectedItem(Object.assign({}, selectedItem, { equipped: true }));
                    }}
                    style={{
                      padding: "14px 0", width: "100%", borderRadius: 14,
                      background: "transparent", border: "2px solid #14B8A6",
                      color: "#14B8A6", fontSize: 15, fontWeight: 700, fontFamily: "Inter, sans-serif",
                      cursor: "pointer", transition: "all 0.25s ease",
                    }}
                  >
                    Equip Item
                  </button>
                ) : (
                  <button
                    onClick={function () {
                      handleBuy(selectedItem.id);
                      if (userXp >= selectedItem.price) {
                        setSelectedItem(Object.assign({}, selectedItem, { owned: true }));
                      }
                    }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "14px 0", width: "100%", borderRadius: 14,
                      background: userXp >= selectedItem.price
                        ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                        : "var(--dp-surface-hover)",
                      border: "none",
                      color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "Inter, sans-serif",
                      cursor: userXp >= selectedItem.price ? "pointer" : "not-allowed",
                      opacity: userXp >= selectedItem.price ? 1 : 0.5,
                      transition: "all 0.25s ease",
                    }}
                    disabled={userXp < selectedItem.price || purchaseMut.isPending}
                  >
                    <Zap size={16} fill="#FCD34D" color="#FCD34D" />
                    Buy for {selectedItem.price} XP
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {/* Refund Modal */}
      {refundModal && (
        <div onClick={function () { setRefundModal(null); setRefundReason(""); }} style={{
          position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        }}>
          <div onClick={function (e) { e.stopPropagation(); }} style={{
            ...glassStyle, background: "var(--dp-modal-bg)", padding: 24, width: "90%", maxWidth: 360,
            animation: "modalFadeIn 0.3s ease",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", fontFamily: "Inter, sans-serif", marginBottom: 12 }}>Request Refund</h3>
            <p style={{ fontSize: 13, color: "var(--dp-text-secondary)", fontFamily: "Inter, sans-serif", marginBottom: 14, lineHeight: 1.5 }}>
              Refund for: <strong>{refundModal.name || refundModal.itemName}</strong>
            </p>
            <textarea value={refundReason} onChange={function (e) { setRefundReason(e.target.value); }} placeholder="Reason for refund..." rows={3}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "var(--dp-input-bg)", border: "1px solid var(--dp-input-border)", color: "var(--dp-text)", fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none", resize: "none", marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={function () { setRefundModal(null); setRefundReason(""); }} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid var(--dp-input-border)", background: "var(--dp-glass-bg)", color: "var(--dp-text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Cancel</button>
              <button disabled={!refundReason.trim()} onClick={function () { refundMut.mutate({ purchaseId: refundModal.id, reason: refundReason.trim() }); }} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: refundReason.trim() ? "linear-gradient(135deg, #8B5CF6, #6D28D9)" : "var(--dp-surface-hover)", color: refundReason.trim() ? "#fff" : "var(--dp-text-muted)", fontSize: 14, fontWeight: 600, cursor: refundReason.trim() ? "pointer" : "not-allowed", fontFamily: "Inter, sans-serif" }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
