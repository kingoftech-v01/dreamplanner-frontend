// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Equipped Items Utility
// Extracts equipped items from user data and maps to visual props
// for the Avatar component (badge frames, decorations, etc.)
// ═══════════════════════════════════════════════════════════════

// Default frame styles by rarity
var FRAME_STYLES = {
  common: { borderColor: "#9CA3AF", borderWidth: 2, glow: false },
  rare: { borderColor: "#3B82F6", borderWidth: 2, glow: true, glowColor: "rgba(59,130,246,0.4)" },
  epic: { borderColor: "#8B5CF6", borderWidth: 3, glow: true, glowColor: "rgba(139,92,246,0.5)" },
  legendary: { borderColor: "#FCD34D", borderWidth: 3, glow: true, glowColor: "rgba(252,211,77,0.5)", animated: true },
};

/**
 * Parse equipped items from user data.
 * Handles various backend response formats.
 *
 * @param {Object} user - User object from API
 * @returns {Object} { badgeFrame, decoration, chatBubble } or empty values
 */
export function getEquippedItems(user) {
  if (!user) return {};

  var equipped = user.equippedItems || user.equipped_items || [];
  if (!Array.isArray(equipped)) equipped = [];

  var result = {};

  for (var i = 0; i < equipped.length; i++) {
    var entry = equipped[i];
    var item = entry.item || entry;
    var type = item.type || item.item_type || entry.type || "";
    var rarity = item.rarity || "common";
    var image = item.image || item.emoji || "";
    var meta = item.metadata || entry.metadata || {};

    if (type === "badge_frame") {
      var frameStyle = FRAME_STYLES[rarity] || FRAME_STYLES.common;
      result.badgeFrame = {
        borderColor: meta.border_color || meta.borderColor || frameStyle.borderColor,
        borderWidth: meta.border_width || meta.borderWidth || frameStyle.borderWidth,
        glow: meta.glow != null ? meta.glow : frameStyle.glow,
        glowColor: meta.glow_color || meta.glowColor || frameStyle.glowColor,
        animated: meta.animated != null ? meta.animated : frameStyle.animated,
        image: image,
      };
    }

    if (type === "avatar_decoration") {
      result.decoration = {
        emoji: meta.emoji || image || "",
        position: meta.position || "bottom-right",
      };
    }

    if (type === "chat_bubble") {
      result.chatBubble = {
        color: meta.color || meta.bubble_color || null,
        gradient: meta.gradient || null,
      };
    }
  }

  return result;
}

/**
 * Convert equipped items to Avatar component props.
 *
 * @param {Object} user - User object
 * @returns {Object} Props to spread onto Avatar: { badgeFrame, decoration }
 */
export function getAvatarEquipProps(user) {
  var items = getEquippedItems(user);
  var props = {};
  if (items.badgeFrame) props.badgeFrame = items.badgeFrame;
  if (items.decoration) props.decoration = items.decoration;
  return props;
}
