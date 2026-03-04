import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye, EyeOff, ShoppingBag, Zap, Star, Check,
  MessageCircle, Palette, User, Award, ArrowLeftRight,
} from "lucide-react";
import GlassModal from "./GlassModal";
import GlassCard from "./GlassCard";
import GradientButton from "./GradientButton";
import Avatar from "./Avatar";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiGet } from "../../services/api";
import { STORE } from "../../services/endpoints";
import { BRAND, GRADIENTS, GRADIENT_SHADOWS, adaptColor } from "../../styles/colors";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — ItemPreview (Try-Before-Buy)
//
// A GlassModal overlay that renders a live preview of a store
// item applied to the user's profile/chat/theme. Each preview_type
// gets its own renderer. Supports "Try it" (temporary) and "Buy".
// ═══════════════════════════════════════════════════════════════

var RARITY_CONFIG = {
  common: { color: "#9CA3AF", label: "Common", glow: "none" },
  rare: { color: "#3B82F6", label: "Rare", glow: "0 0 12px rgba(59,130,246,0.5)" },
  epic: { color: "#8B5CF6", label: "Epic", glow: "0 0 14px rgba(139,92,246,0.5)" },
  legendary: { color: "#FCD34D", label: "Legendary", glow: "0 0 18px rgba(252,211,77,0.6)" },
};

// ─── Theme Preview Renderer ─────────────────────────────────
function ThemePreview({ previewData, isTrying }) {
  var accent = (previewData && previewData.accent_color) || BRAND.purple;
  var bg = (previewData && previewData.background) || "linear-gradient(135deg, #0c081a, #1a1035)";
  var cardBg = (previewData && previewData.card_bg) || "rgba(255,255,255,0.06)";
  var textColor = (previewData && previewData.text_color) || "#ffffff";

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      border: "1px solid " + accent + "30",
      boxShadow: isTrying ? "0 0 24px " + accent + "30" : "none",
      transition: "all 0.4s ease",
    }}>
      {/* Mini app header */}
      <div style={{
        background: bg,
        padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: textColor }}>DreamPlanner</span>
        <div style={{
          width: 24, height: 24, borderRadius: 8,
          background: accent, opacity: 0.8,
        }} />
      </div>
      {/* Mini cards */}
      <div style={{ background: bg, padding: "12px 12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {["My Career Dream", "Learn Guitar"].map(function (title, i) {
          return (
            <div key={i} style={{
              background: cardBg,
              backdropFilter: "blur(8px)",
              borderRadius: 12,
              padding: "10px 12px",
              border: "1px solid " + accent + "15",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: textColor, marginBottom: 4 }}>{title}</div>
              <div style={{
                height: 4, borderRadius: 2, background: accent + "25",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: (40 + i * 30) + "%",
                  borderRadius: 2,
                  background: accent,
                  transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          );
        })}
        {/* Accent button mock */}
        <div style={{
          marginTop: 4, padding: "8px 0", borderRadius: 10,
          background: accent, textAlign: "center",
          fontSize: 11, fontWeight: 600, color: "#fff",
        }}>
          + New Dream
        </div>
      </div>
    </div>
  );
}

// ─── Chat Bubble Preview Renderer ────────────────────────────
function ChatBubblePreview({ previewData, isTrying }) {
  var bubbleColor = (previewData && previewData.bubble_color) || BRAND.purple;
  var bubbleGradient = (previewData && previewData.bubble_gradient) || ("linear-gradient(135deg, " + bubbleColor + ", " + bubbleColor + "CC)");
  var textColor = (previewData && previewData.text_color) || "#ffffff";
  var borderRadius = (previewData && previewData.border_radius) || 18;
  var bubbleGlow = (previewData && previewData.glow) ? "0 4px 16px " + bubbleColor + "40" : "none";
  var tail = (previewData && previewData.tail_style) || "rounded";

  var messages = [
    { from: "ai", text: "How's your dream coming along?" },
    { from: "user", text: "Making great progress! Just finished milestone 3." },
    { from: "ai", text: "Amazing work! Keep it up!" },
  ];

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      background: "var(--dp-surface)",
      border: "1px solid var(--dp-glass-border)",
      padding: "16px 12px",
      display: "flex", flexDirection: "column", gap: 8,
      transition: "all 0.4s ease",
    }}>
      {messages.map(function (msg, i) {
        var isUser = msg.from === "user";
        return (
          <div key={i} style={{
            display: "flex",
            justifyContent: isUser ? "flex-end" : "flex-start",
            paddingLeft: isUser ? 32 : 0,
            paddingRight: isUser ? 0 : 32,
          }}>
            <div style={{
              padding: "10px 14px",
              borderRadius: isUser ? (tail === "sharp"
                ? borderRadius + "px " + borderRadius + "px 4px " + borderRadius + "px"
                : borderRadius) : 16,
              background: isUser && isTrying ? bubbleGradient : isUser ? GRADIENTS.primaryDark : "var(--dp-glass-bg)",
              color: isUser ? textColor : "var(--dp-text)",
              fontSize: 13, lineHeight: 1.4,
              boxShadow: isUser && isTrying ? bubbleGlow : "none",
              border: isUser ? "none" : "1px solid var(--dp-glass-border)",
              transition: "all 0.4s ease",
              maxWidth: "100%",
            }}>
              {msg.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Profile Background Preview Renderer ────────────────────
function ProfileBgPreview({ previewData, isTrying, user }) {
  var bgImage = (previewData && previewData.background_url) || "";
  var bgGradient = (previewData && previewData.background_gradient) || "linear-gradient(135deg, #1a1035, #2d1b69)";
  var overlayOpacity = (previewData && previewData.overlay_opacity != null) ? previewData.overlay_opacity : 0.3;
  var displayName = (user && user.display_name) || (user && user.email) || "Dreamer";

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      border: "1px solid var(--dp-glass-border)",
      transition: "all 0.4s ease",
    }}>
      {/* Profile header with background */}
      <div style={{
        position: "relative",
        height: 120,
        background: isTrying ? (bgImage ? "url(" + bgImage + ")" : bgGradient) : "var(--dp-surface)",
        backgroundSize: "cover", backgroundPosition: "center",
        transition: "all 0.5s ease",
      }}>
        {isTrying && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0," + overlayOpacity + ")",
          }} />
        )}
        {/* Avatar */}
        <div style={{
          position: "absolute", bottom: -24, left: "50%", transform: "translateX(-50%)",
          zIndex: 2,
        }}>
          <Avatar
            name={displayName}
            size={56}
            src={user && user.avatar_url}
            shape="circle"
            color={BRAND.purple}
          />
        </div>
      </div>
      {/* User info */}
      <div style={{
        padding: "32px 16px 16px", textAlign: "center",
        background: "var(--dp-glass-bg)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)", marginBottom: 4 }}>
          {displayName}
        </div>
        <div style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>Level 12 Dreamer</div>
      </div>
    </div>
  );
}

// ─── Avatar Frame Preview Renderer ──────────────────────────
function AvatarFramePreview({ previewData, isTrying, user }) {
  var borderColor = (previewData && previewData.border_color) || BRAND.purple;
  var borderWidth = (previewData && previewData.border_width) || 3;
  var glowColor = (previewData && previewData.glow_color) || "rgba(139,92,246,0.5)";
  var animated = (previewData && previewData.animated) || false;
  var decoration = (previewData && previewData.decoration) || null;
  var displayName = (user && user.display_name) || (user && user.email) || "Dreamer";

  var frameDef = isTrying ? {
    borderWidth: borderWidth,
    borderColor: borderColor,
    glow: true,
    glowColor: glowColor,
    animated: animated,
  } : null;

  var decoDef = isTrying && decoration ? {
    emoji: decoration.emoji || "",
    position: decoration.position || "bottom-right",
  } : null;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 16, padding: "20px 0",
    }}>
      {/* Large avatar with frame */}
      <div style={{ transition: "all 0.4s ease" }}>
        <Avatar
          name={displayName}
          size={96}
          src={user && user.avatar_url}
          shape="circle"
          color={isTrying ? borderColor : "var(--dp-accent)"}
          badgeFrame={frameDef}
          decoration={decoDef}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)", marginBottom: 2 }}>
          {displayName}
        </div>
        <div style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
          {isTrying ? "With frame applied" : "Without frame"}
        </div>
      </div>
    </div>
  );
}

// ─── Badge Preview Renderer ─────────────────────────────────
function BadgePreview({ previewData, isTrying }) {
  var badgeColor = (previewData && previewData.badge_color) || BRAND.purple;
  var badgeIcon = (previewData && previewData.badge_icon) || "star";
  var badgeLabel = (previewData && previewData.badge_label) || "Achiever";
  var badgeGlow = (previewData && previewData.glow) ? "0 0 16px " + badgeColor + "50" : "none";

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 16, padding: "20px 0",
    }}>
      {/* Badge display */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: isTrying ? ("linear-gradient(135deg, " + badgeColor + ", " + badgeColor + "AA)") : "var(--dp-surface)",
        border: "3px solid " + (isTrying ? badgeColor : "var(--dp-glass-border)"),
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: isTrying ? badgeGlow : "none",
        transition: "all 0.4s ease",
      }}>
        <Award
          size={36}
          color={isTrying ? "#ffffff" : "var(--dp-text-muted)"}
          style={{ transition: "all 0.4s ease" }}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: isTrying ? badgeColor : "var(--dp-text)",
          transition: "color 0.4s ease",
        }}>
          {badgeLabel}
        </div>
        <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 2 }}>
          {isTrying ? "Badge preview" : "Default style"}
        </div>
      </div>
    </div>
  );
}

// ─── Preview Type Icon Map ──────────────────────────────────
var TYPE_ICONS = {
  theme: Palette,
  chat_bubble: MessageCircle,
  profile_bg: User,
  avatar_frame: User,
  badge: Award,
};

// ═══════════════════════════════════════════════════════════════
// Main ItemPreview Component
// ═══════════════════════════════════════════════════════════════

export default function ItemPreview({
  open,
  onClose,
  item,
  onBuy,
  buyLoading,
  userXp,
}) {
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { user } = useAuth();

  var [isTrying, setIsTrying] = useState(false);
  var [showComparison, setShowComparison] = useState(false);

  // Fetch full preview data from the backend
  var previewQuery = useQuery({
    queryKey: ["item-preview", item && item.slug],
    queryFn: function () { return apiGet(STORE.ITEM_PREVIEW(item.slug)); },
    enabled: open && !!item && !!item.slug,
    staleTime: 5 * 60 * 1000,
  });

  var previewData = (previewQuery.data && previewQuery.data.preview_data) || (item && item.preview_data) || {};
  var previewType = (previewQuery.data && previewQuery.data.preview_type) || (item && item.preview_type) || "";
  var isOwned = (previewQuery.data && previewQuery.data.is_owned) || (item && item.owned) || false;

  // Reset try state when modal closes
  useEffect(function () {
    if (!open) {
      setIsTrying(false);
      setShowComparison(false);
    }
  }, [open]);

  // Auto-enable try mode on open for better UX
  var handleTryToggle = useCallback(function () {
    setIsTrying(function (prev) { return !prev; });
  }, []);

  var handleComparisonToggle = useCallback(function () {
    setShowComparison(function (prev) { return !prev; });
  }, []);

  if (!item) return null;

  var rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
  var rarityColor = adaptColor(rarity.color, isLight);
  var TypeIcon = TYPE_ICONS[previewType] || Eye;
  var canAfford = userXp >= (item.price || 0);

  // ─── Render the appropriate preview based on type ─────────
  var renderPreview = function () {
    if (previewQuery.isLoading) {
      return (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "40px 0", color: "var(--dp-text-muted)", fontSize: 13,
        }}>
          <span className="dp-spin" style={{
            width: 20, height: 20,
            border: "2px solid var(--dp-text-muted)",
            borderTopColor: BRAND.purple,
            borderRadius: "50%", marginRight: 10,
          }} />
          Loading preview...
        </div>
      );
    }

    if (showComparison) {
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.5px", color: "var(--dp-text-muted)",
              textAlign: "center", marginBottom: 6,
            }}>
              Before
            </div>
            {renderPreviewByType(false)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.5px", color: rarityColor,
              textAlign: "center", marginBottom: 6,
            }}>
              After
            </div>
            {renderPreviewByType(true)}
          </div>
        </div>
      );
    }

    return renderPreviewByType(isTrying);
  };

  var renderPreviewByType = function (trying) {
    switch (previewType) {
      case "theme":
        return <ThemePreview previewData={previewData} isTrying={trying} />;
      case "chat_bubble":
        return <ChatBubblePreview previewData={previewData} isTrying={trying} />;
      case "profile_bg":
        return <ProfileBgPreview previewData={previewData} isTrying={trying} user={user} />;
      case "avatar_frame":
        return <AvatarFramePreview previewData={previewData} isTrying={trying} user={user} />;
      case "badge":
        return <BadgePreview previewData={previewData} isTrying={trying} />;
      default:
        // Fallback: show item image/description
        return (
          <div style={{
            textAlign: "center", padding: "32px 0",
            color: "var(--dp-text-muted)", fontSize: 13,
          }}>
            <Eye size={32} style={{ marginBottom: 8 }} />
            <div>Preview not available for this item type</div>
          </div>
        );
    }
  };

  return (
    <GlassModal
      open={open}
      onClose={function () {
        setIsTrying(false);
        onClose();
      }}
      variant="center"
      maxWidth={400}
    >
      <div style={{ padding: "20px 20px 24px" }}>
        {/* Header with item info */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 16,
        }}>
          {/* Item emoji/image */}
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "var(--dp-surface)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, flexShrink: 0,
            border: "1px solid " + rarity.color + "30",
            boxShadow: rarity.glow,
          }}>
            {item.image || <TypeIcon size={24} color={rarityColor} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: "var(--dp-text)",
              marginBottom: 3,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {item.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.3px", padding: "2px 8px", borderRadius: 6,
                color: rarityColor,
                background: rarity.color + "15",
                border: "1px solid " + rarity.color + "25",
              }}>
                {rarity.label}
              </span>
              {!isOwned && (
                <span style={{
                  display: "flex", alignItems: "center", gap: 3,
                  fontSize: 12, fontWeight: 700,
                  color: adaptColor(BRAND.yellow, isLight),
                }}>
                  <Zap size={11} color={adaptColor(BRAND.yellow, isLight)} fill={adaptColor(BRAND.yellow, isLight)} />
                  {item.price} XP
                </span>
              )}
              {isOwned && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: BRAND.teal,
                  display: "flex", alignItems: "center", gap: 3,
                }}>
                  <Check size={11} /> Owned
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <div style={{
            fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5,
            marginBottom: 16, padding: "0 2px",
          }}>
            {item.description}
          </div>
        )}

        {/* Preview area */}
        <div style={{
          marginBottom: 16,
          position: "relative",
        }}>
          {renderPreview()}
        </div>

        {/* Control buttons row */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 16,
        }}>
          {/* Try it toggle */}
          <button
            onClick={handleTryToggle}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", borderRadius: 12,
              background: isTrying ? (rarity.color + "20") : "var(--dp-surface)",
              border: "1px solid " + (isTrying ? rarity.color + "50" : "var(--dp-input-border)"),
              color: isTrying ? rarityColor : "var(--dp-text-secondary)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 0.3s ease", fontFamily: "inherit",
            }}
          >
            {isTrying ? <EyeOff size={15} /> : <Eye size={15} />}
            {isTrying ? "Reset" : "Try it"}
          </button>
          {/* Compare toggle */}
          <button
            onClick={handleComparisonToggle}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", borderRadius: 12,
              background: showComparison ? (BRAND.teal + "20") : "var(--dp-surface)",
              border: "1px solid " + (showComparison ? BRAND.teal + "50" : "var(--dp-input-border)"),
              color: showComparison ? BRAND.teal : "var(--dp-text-secondary)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 0.3s ease", fontFamily: "inherit",
            }}
          >
            <ArrowLeftRight size={15} />
            Compare
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {isOwned ? (
            <GradientButton
              gradient="teal"
              fullWidth
              size="lg"
              icon={Check}
              onClick={onClose}
            >
              Already Owned
            </GradientButton>
          ) : (
            <>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 14,
                  background: "var(--dp-surface)",
                  border: "1px solid var(--dp-input-border)",
                  color: "var(--dp-text-secondary)", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.25s ease",
                }}
              >
                Close
              </button>
              <div style={{ flex: 1 }}>
                <GradientButton
                  gradient="primaryDark"
                  fullWidth
                  size="lg"
                  icon={ShoppingBag}
                  onClick={function () { onBuy && onBuy(item.id); }}
                  disabled={!canAfford || buyLoading}
                  loading={buyLoading}
                >
                  Buy {item.price} XP
                </GradientButton>
              </div>
            </>
          )}
        </div>
      </div>
    </GlassModal>
  );
}
