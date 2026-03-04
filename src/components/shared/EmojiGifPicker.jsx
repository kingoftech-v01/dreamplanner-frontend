import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader, Image } from "lucide-react";

/* ===================================================================
 * DreamPlanner -- EmojiGifPicker
 *
 * Tabbed bottom-sheet picker with Emoji + GIF tabs.
 * Glass morphism styling, smooth slide-up animation.
 * Emoji: categories, search, recents (localStorage).
 * GIF: Tenor API search with debounce, masonry grid, fallback.
 * =================================================================== */

var TENOR_KEY = "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ";
var TENOR_SEARCH = "https://tenor.googleapis.com/v2/search";
var TENOR_FEATURED = "https://tenor.googleapis.com/v2/featured";
var RECENT_KEY = "dp_recent_emojis";
var MAX_RECENT = 24;

// ~200 common emojis organized by category
var EMOJI_CATEGORIES = [
  {
    id: "recent", label: "Recent", icon: "\u{1F552}",
    emojis: [] // filled from localStorage
  },
  {
    id: "smileys", label: "Smileys", icon: "\u{1F600}",
    emojis: [
      "\u{1F600}","\u{1F603}","\u{1F604}","\u{1F601}","\u{1F606}","\u{1F605}","\u{1F602}","\u{1F923}","\u{1F972}",
      "\u{263A}\u{FE0F}","\u{1F60A}","\u{1F607}","\u{1F970}","\u{1F60D}","\u{1F929}","\u{1F618}","\u{1F617}","\u{1F61A}",
      "\u{1F619}","\u{1F60B}","\u{1F61C}","\u{1F61D}","\u{1F911}","\u{1F917}","\u{1F92D}","\u{1F92B}","\u{1F914}",
      "\u{1F910}","\u{1F928}","\u{1F610}","\u{1F611}","\u{1F636}","\u{1F60F}","\u{1F612}","\u{1F644}","\u{1F62C}",
      "\u{1F62E}\u{200D}\u{1F4A8}","\u{1F925}","\u{1F60C}","\u{1F614}","\u{1F62A}","\u{1F924}","\u{1F634}","\u{1F637}",
      "\u{1F912}","\u{1F915}","\u{1F922}","\u{1F92E}","\u{1F927}","\u{1F975}","\u{1F976}","\u{1F974}"
    ]
  },
  {
    id: "people", label: "People", icon: "\u{1F44B}",
    emojis: [
      "\u{1F44B}","\u{1F91A}","\u{1F590}\u{FE0F}","\u{270B}","\u{1F596}","\u{1FAF1}","\u{1FAF2}","\u{1FAF3}",
      "\u{1FAF4}","\u{1F44C}","\u{1F90C}","\u{270C}\u{FE0F}","\u{1F91E}","\u{1FAF0}","\u{1F91F}","\u{1F918}",
      "\u{1F919}","\u{1F448}","\u{1F449}","\u{1F446}","\u{1F595}","\u{1F447}","\u{261D}\u{FE0F}","\u{1FAF5}",
      "\u{1F44D}","\u{1F44E}","\u{270A}","\u{1F44A}","\u{1F91B}","\u{1F91C}","\u{1F44F}","\u{1F64C}",
      "\u{1FAF6}","\u{1F450}","\u{1F932}","\u{1F91D}","\u{1F64F}","\u{270D}\u{FE0F}","\u{1F485}","\u{1F933}",
      "\u{1F4AA}","\u{1F9BE}","\u{1F9BF}"
    ]
  },
  {
    id: "nature", label: "Nature", icon: "\u{1F33F}",
    emojis: [
      "\u{1F436}","\u{1F431}","\u{1F42D}","\u{1F439}","\u{1F430}","\u{1F98A}","\u{1F43B}","\u{1F43C}",
      "\u{1F428}","\u{1F42F}","\u{1F981}","\u{1F434}","\u{1F984}","\u{1F41D}","\u{1F98B}","\u{1F333}",
      "\u{1F332}","\u{1F334}","\u{1F335}","\u{1F33F}","\u{2618}\u{FE0F}","\u{1F340}","\u{1F341}","\u{1F342}",
      "\u{1F343}","\u{1F490}","\u{1F337}","\u{1F339}","\u{1F33B}","\u{1F33A}","\u{1F338}"
    ]
  },
  {
    id: "food", label: "Food", icon: "\u{1F354}",
    emojis: [
      "\u{1F34F}","\u{1F34E}","\u{1F350}","\u{1F34A}","\u{1F34B}","\u{1F34C}","\u{1F349}","\u{1F347}",
      "\u{1F353}","\u{1FAD0}","\u{1F348}","\u{1F352}","\u{1F351}","\u{1F96D}","\u{1F34D}","\u{1F965}",
      "\u{1F354}","\u{1F355}","\u{1F32E}","\u{1F32F}","\u{1F37F}","\u{1F366}","\u{1F370}","\u{1F382}",
      "\u{2615}","\u{1F375}","\u{1F37A}","\u{1F377}"
    ]
  },
  {
    id: "activity", label: "Activity", icon: "\u{26BD}",
    emojis: [
      "\u{26BD}","\u{1F3C0}","\u{1F3C8}","\u{26BE}","\u{1F94E}","\u{1F3BE}","\u{1F3D0}","\u{1F3C9}",
      "\u{1F94F}","\u{1F3B1}","\u{1F3D3}","\u{1F3F8}","\u{1F94D}","\u{1F3AF}","\u{26F3}","\u{1F3CB}\u{FE0F}",
      "\u{1F3C4}","\u{1F3CA}","\u{1F6B4}","\u{1F3C6}","\u{1F947}","\u{1F948}","\u{1F949}","\u{1F3C5}",
      "\u{1F396}\u{FE0F}","\u{1F3AE}","\u{1F579}\u{FE0F}","\u{1F3B2}","\u{265F}\u{FE0F}"
    ]
  },
  {
    id: "travel", label: "Travel", icon: "\u{2708}\u{FE0F}",
    emojis: [
      "\u{1F697}","\u{1F695}","\u{1F68C}","\u{1F693}","\u{1F691}","\u{1F692}","\u{2708}\u{FE0F}","\u{1F680}",
      "\u{1F6F8}","\u{1F6F6}","\u{26F5}","\u{1F3D6}\u{FE0F}","\u{1F3D4}\u{FE0F}","\u{1F30B}","\u{1F3E0}","\u{1F3E2}",
      "\u{1F3E5}","\u{1F3EB}","\u{26EA}","\u{1F54C}","\u{1F5FC}","\u{1F5FD}","\u{1F30D}","\u{1F30E}",
      "\u{1F30F}"
    ]
  },
  {
    id: "objects", label: "Objects", icon: "\u{1F4A1}",
    emojis: [
      "\u{231A}","\u{1F4F1}","\u{1F4BB}","\u{1F5A5}\u{FE0F}","\u{1F4F7}","\u{1F4F9}","\u{1F4FA}","\u{1F4FB}",
      "\u{23F0}","\u{1F4A1}","\u{1F526}","\u{1F4D6}","\u{1F4DA}","\u{1F4DD}","\u{270F}\u{FE0F}","\u{1F58A}\u{FE0F}",
      "\u{1F4E7}","\u{1F4E6}","\u{1F381}","\u{1F3B5}","\u{1F3B6}","\u{1F3A4}","\u{1F3A7}","\u{1F3B9}",
      "\u{1F3B8}","\u{1F941}","\u{1F4B0}","\u{1F48E}"
    ]
  },
  {
    id: "symbols", label: "Symbols", icon: "\u{2764}\u{FE0F}",
    emojis: [
      "\u{2764}\u{FE0F}","\u{1F9E1}","\u{1F49B}","\u{1F49A}","\u{1F499}","\u{1F49C}","\u{1F5A4}","\u{1FA76}",
      "\u{1F90D}","\u{1F49D}","\u{1F49E}","\u{1F493}","\u{1F497}","\u{1F496}","\u{1F498}","\u{1F4AF}",
      "\u{1F4A2}","\u{1F4A5}","\u{1F4AB}","\u{1F4A6}","\u{1F4A8}","\u{1F573}\u{FE0F}","\u{1F4AC}","\u{1F441}\u{FE0F}\u{200D}\u{1F5E8}\u{FE0F}",
      "\u{2705}","\u{274C}","\u{2753}","\u{2757}","\u{1F51E}","\u{267B}\u{FE0F}","\u{269C}\u{FE0F}","\u{1F534}",
      "\u{1F7E0}","\u{1F7E1}","\u{1F7E2}","\u{1F535}","\u{1F7E3}","\u{1F7E4}","\u{26AA}","\u{26AB}",
      "\u{1F51D}","\u{1F519}","\u{1F51A}","\u{2B50}","\u{1F31F}","\u{2728}"
    ]
  },
];

// Hardcoded fallback GIFs (popular reaction GIFs from tenor)
var FALLBACK_GIFS = [
  { id: "f1", url: "https://media.tenor.com/WXmhMPQBjZAAAAAC/thumbs-up.gif", preview: "https://media.tenor.com/WXmhMPQBjZAAAAAM/thumbs-up.gif" },
  { id: "f2", url: "https://media.tenor.com/9ReVnCXQKTIAAAAC/happy-minions.gif", preview: "https://media.tenor.com/9ReVnCXQKTIAAAAM/happy-minions.gif" },
  { id: "f3", url: "https://media.tenor.com/DHe1dEscSj4AAAAC/mind-blown.gif", preview: "https://media.tenor.com/DHe1dEscSj4AAAAM/mind-blown.gif" },
  { id: "f4", url: "https://media.tenor.com/bm8Q6VoMpgsAAAAC/laughing.gif", preview: "https://media.tenor.com/bm8Q6VoMpgsAAAAM/laughing.gif" },
  { id: "f5", url: "https://media.tenor.com/nBJDTSiJ0oEAAAAC/crying-sad.gif", preview: "https://media.tenor.com/nBJDTSiJ0oEAAAAM/crying-sad.gif" },
  { id: "f6", url: "https://media.tenor.com/2roU1bOJnFEAAAAC/funny-laughing.gif", preview: "https://media.tenor.com/2roU1bOJnFEAAAAM/funny-laughing.gif" },
  { id: "f7", url: "https://media.tenor.com/qJIAEfB3adcAAAAC/wow-omg.gif", preview: "https://media.tenor.com/qJIAEfB3adcAAAAM/wow-omg.gif" },
  { id: "f8", url: "https://media.tenor.com/gXLzPMbZvrUAAAAC/congrats-congratulations.gif", preview: "https://media.tenor.com/gXLzPMbZvrUAAAAM/congrats-congratulations.gif" },
  { id: "f9", url: "https://media.tenor.com/8TdK2PPjgdkAAAAC/love-heart.gif", preview: "https://media.tenor.com/8TdK2PPjgdkAAAAM/love-heart.gif" },
  { id: "f10", url: "https://media.tenor.com/fyXFKx6X8tAAAAAC/dance-dancing.gif", preview: "https://media.tenor.com/fyXFKx6X8tAAAAAM/dance-dancing.gif" },
  { id: "f11", url: "https://media.tenor.com/1jLwUAiDHHsAAAAC/high-five.gif", preview: "https://media.tenor.com/1jLwUAiDHHsAAAAM/high-five.gif" },
  { id: "f12", url: "https://media.tenor.com/RHQO6CjVcXkAAAAC/thank-you-thanks.gif", preview: "https://media.tenor.com/RHQO6CjVcXkAAAAM/thank-you-thanks.gif" },
  { id: "f13", url: "https://media.tenor.com/I7L2iFXE0usAAAAC/shocked-face.gif", preview: "https://media.tenor.com/I7L2iFXE0usAAAAM/shocked-face.gif" },
  { id: "f14", url: "https://media.tenor.com/UnFx-k_lSckAAAAC/amused-dogs.gif", preview: "https://media.tenor.com/UnFx-k_lSckAAAAM/amused-dogs.gif" },
  { id: "f15", url: "https://media.tenor.com/SZHJcGpRzPMAAAAC/slow-clap-clapping.gif", preview: "https://media.tenor.com/SZHJcGpRzPMAAAAM/slow-clap-clapping.gif" },
  { id: "f16", url: "https://media.tenor.com/lx2WSGRk8bcAAAAC/thinking-think.gif", preview: "https://media.tenor.com/lx2WSGRk8bcAAAAM/thinking-think.gif" },
  { id: "f17", url: "https://media.tenor.com/uilBSuEaXjYAAAAC/fist-bump.gif", preview: "https://media.tenor.com/uilBSuEaXjYAAAAM/fist-bump.gif" },
  { id: "f18", url: "https://media.tenor.com/7QOiXJlFHJAAAAAC/excited-yay.gif", preview: "https://media.tenor.com/7QOiXJlFHJAAAAAM/excited-yay.gif" },
  { id: "f19", url: "https://media.tenor.com/Hu3FR1F5rRMAAAAC/roll-eyes-eye-roll.gif", preview: "https://media.tenor.com/Hu3FR1F5rRMAAAAM/roll-eyes-eye-roll.gif" },
  { id: "f20", url: "https://media.tenor.com/J0rrCRfnk6YAAAAC/yes-yeah.gif", preview: "https://media.tenor.com/J0rrCRfnk6YAAAAM/yes-yeah.gif" },
];

// ─── Helpers ──────────────────────────────────────────────────────
function getRecentEmojis() {
  try {
    var stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) { return []; }
}

function saveRecentEmoji(emoji) {
  try {
    var recent = getRecentEmojis();
    recent = [emoji].concat(recent.filter(function (e) { return e !== emoji; }));
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    return recent;
  } catch (e) { return []; }
}

// ─── GIF URL detector (for rendering) ────────────────────────────
var GIF_URL_REGEX = /^https?:\/\/.*\.(gif|gifv)(\?.*)?$/i;
var TENOR_GIPHY_REGEX = /^https?:\/\/(media\.tenor\.com|media[0-9]*\.giphy\.com)\//i;

export function isGifUrl(text) {
  if (!text || typeof text !== "string") return false;
  var trimmed = text.trim();
  return GIF_URL_REGEX.test(trimmed) || TENOR_GIPHY_REGEX.test(trimmed);
}

// ─── GIF message renderer ────────────────────────────────────────
export function GifMessage({ url, style }) {
  var [loaded, setLoaded] = useState(false);
  var [error, setError] = useState(false);

  if (error) {
    return (
      <div style={Object.assign({
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 16px", gap: 6,
        color: "var(--dp-text-tertiary)", fontSize: 12,
      }, style)}>
        <Image size={14} strokeWidth={2} />
        <span>GIF failed to load</span>
      </div>
    );
  }

  return (
    <div style={Object.assign({ position: "relative", maxWidth: 240, minHeight: loaded ? undefined : 120 }, style)}>
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--dp-surface)", borderRadius: 12,
        }}>
          <Loader size={18} className="dp-spin" style={{ color: "var(--dp-text-tertiary)" }} />
        </div>
      )}
      <img
        src={url.trim()}
        alt="GIF"
        onLoad={function () { setLoaded(true); }}
        onError={function () { setError(true); }}
        style={{
          width: "100%", maxWidth: 240, borderRadius: 12,
          display: loaded ? "block" : "block",
          opacity: loaded ? 1 : 0, transition: "opacity 0.2s ease",
        }}
      />
    </div>
  );
}

// =================================================================
// MAIN COMPONENT
// =================================================================
export default function EmojiGifPicker({ open, onClose, onEmojiSelect, onGifSelect }) {
  var [activeTab, setActiveTab] = useState("emoji"); // "emoji" | "gif"
  var [activeCategory, setActiveCategory] = useState("smileys");
  var [emojiSearch, setEmojiSearch] = useState("");
  var [gifSearch, setGifSearch] = useState("");
  var [gifs, setGifs] = useState([]);
  var [gifLoading, setGifLoading] = useState(false);
  var [gifError, setGifError] = useState(false);
  var [recentEmojis, setRecentEmojis] = useState(getRecentEmojis);
  var backdropRef = useRef(null);
  var sheetRef = useRef(null);
  var debounceRef = useRef(null);
  var categoryScrollRef = useRef(null);

  // ─── Load trending GIFs on GIF tab open ────────────────────────
  useEffect(function () {
    if (!open || activeTab !== "gif") return;
    if (gifSearch) return; // user is searching, don't fetch trending
    setGifLoading(true);
    setGifError(false);
    fetch(TENOR_FEATURED + "?key=" + TENOR_KEY + "&limit=20&media_filter=gif")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.results) {
          setGifs(data.results.map(function (r) {
            var gif = r.media_formats && r.media_formats.gif;
            var tinyGif = r.media_formats && r.media_formats.tinygif;
            return {
              id: r.id,
              url: gif ? gif.url : "",
              preview: tinyGif ? tinyGif.url : (gif ? gif.url : ""),
            };
          }));
        } else {
          setGifs(FALLBACK_GIFS);
        }
        setGifLoading(false);
      })
      .catch(function () {
        setGifs(FALLBACK_GIFS);
        setGifLoading(false);
        setGifError(true);
      });
  }, [open, activeTab]);

  // ─── GIF search with debounce ──────────────────────────────────
  useEffect(function () {
    if (!open || activeTab !== "gif") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!gifSearch.trim()) {
      // Reset to trending on clear -- re-trigger the featured fetch
      setGifs([]);
      setGifLoading(true);
      fetch(TENOR_FEATURED + "?key=" + TENOR_KEY + "&limit=20&media_filter=gif")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.results) {
            setGifs(data.results.map(function (r) {
              var gif = r.media_formats && r.media_formats.gif;
              var tinyGif = r.media_formats && r.media_formats.tinygif;
              return { id: r.id, url: gif ? gif.url : "", preview: tinyGif ? tinyGif.url : (gif ? gif.url : "") };
            }));
          } else { setGifs(FALLBACK_GIFS); }
          setGifLoading(false);
        })
        .catch(function () { setGifs(FALLBACK_GIFS); setGifLoading(false); });
      return;
    }
    debounceRef.current = setTimeout(function () {
      setGifLoading(true);
      setGifError(false);
      fetch(TENOR_SEARCH + "?q=" + encodeURIComponent(gifSearch.trim()) + "&key=" + TENOR_KEY + "&limit=20&media_filter=gif")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.results) {
            setGifs(data.results.map(function (r) {
              var gif = r.media_formats && r.media_formats.gif;
              var tinyGif = r.media_formats && r.media_formats.tinygif;
              return {
                id: r.id,
                url: gif ? gif.url : "",
                preview: tinyGif ? tinyGif.url : (gif ? gif.url : ""),
              };
            }));
          } else {
            setGifs(FALLBACK_GIFS);
          }
          setGifLoading(false);
        })
        .catch(function () {
          setGifs(FALLBACK_GIFS);
          setGifLoading(false);
          setGifError(true);
        });
    }, 500);

    return function () {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [gifSearch, open, activeTab]);

  // ─── Handle emoji select ───────────────────────────────────────
  var handleEmojiClick = useCallback(function (emoji) {
    var updated = saveRecentEmoji(emoji);
    setRecentEmojis(updated);
    if (onEmojiSelect) onEmojiSelect(emoji);
  }, [onEmojiSelect]);

  // ─── Handle GIF select ─────────────────────────────────────────
  var handleGifClick = useCallback(function (gif) {
    if (onGifSelect) onGifSelect(gif.url);
    if (onClose) onClose();
  }, [onGifSelect, onClose]);

  // ─── Backdrop click ────────────────────────────────────────────
  var handleBackdropClick = function (e) {
    if (e.target === backdropRef.current) {
      if (onClose) onClose();
    }
  };

  // ─── Filter emojis for search ──────────────────────────────────
  var filteredEmojis = [];
  if (emojiSearch.trim()) {
    // Search across all categories
    EMOJI_CATEGORIES.forEach(function (cat) {
      if (cat.id === "recent") return;
      cat.emojis.forEach(function (e) {
        if (filteredEmojis.indexOf(e) === -1) filteredEmojis.push(e);
      });
    });
    // Can't search by name with Unicode chars directly, just show all when searching
    // This is a simple approach -- show all emojis when search is active
  } else if (activeCategory === "recent") {
    filteredEmojis = recentEmojis;
  } else {
    var activeCat = EMOJI_CATEGORIES.find(function (c) { return c.id === activeCategory; });
    filteredEmojis = activeCat ? activeCat.emojis : [];
  }

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.25)",
        animation: "dpEgpFadeIn 0.2s ease-out",
      }}
    >
      <div
        ref={sheetRef}
        onClick={function (e) { e.stopPropagation(); }}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          maxHeight: "min(300px, 50vh)",
          background: "var(--dp-modal-bg)",
          backdropFilter: "blur(40px) saturate(1.4)",
          WebkitBackdropFilter: "blur(40px) saturate(1.4)",
          borderRadius: "20px 20px 0 0",
          border: "1px solid var(--dp-glass-border)",
          borderBottom: "none",
          boxShadow: "0 -8px 40px var(--dp-shadow)",
          display: "flex", flexDirection: "column",
          animation: "dpEgpSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
          overflow: "hidden",
        }}
      >
        {/* ─── Handle bar ─── */}
        <div style={{
          display: "flex", justifyContent: "center", padding: "8px 0 4px",
          cursor: "grab", flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "var(--dp-text-muted)", opacity: 0.4,
          }} />
        </div>

        {/* ─── Tabs ─── */}
        <div style={{
          display: "flex", gap: 0, padding: "0 16px 8px",
          borderBottom: "1px solid var(--dp-glass-border)", flexShrink: 0,
        }}>
          {[
            { id: "emoji", label: "Emoji" },
            { id: "gif", label: "GIF" },
          ].map(function (tab) {
            var isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={function () { setActiveTab(tab.id); }}
                style={{
                  flex: 1, padding: "8px 0", border: "none",
                  background: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                  color: isActive ? "var(--dp-accent)" : "var(--dp-text-tertiary)",
                  borderBottom: isActive ? "2px solid var(--dp-accent)" : "2px solid transparent",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── EMOJI TAB ─── */}
        {activeTab === "emoji" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            {/* Search */}
            <div style={{ padding: "8px 12px 4px", flexShrink: 0 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 10,
                background: "var(--dp-surface)", border: "1px solid var(--dp-glass-border)",
              }}>
                <Search size={14} color="var(--dp-text-tertiary)" strokeWidth={2} />
                <input
                  value={emojiSearch}
                  onChange={function (e) { setEmojiSearch(e.target.value); }}
                  placeholder="Search emojis..."
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    color: "var(--dp-text)", fontSize: 13, fontFamily: "inherit",
                  }}
                />
                {emojiSearch && (
                  <button
                    onClick={function () { setEmojiSearch(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                  >
                    <X size={14} color="var(--dp-text-tertiary)" strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Category pills */}
            {!emojiSearch && (
              <div
                ref={categoryScrollRef}
                style={{
                  display: "flex", gap: 4, padding: "4px 12px 6px",
                  overflowX: "auto", flexShrink: 0,
                  scrollbarWidth: "none", msOverflowStyle: "none",
                }}
              >
                {EMOJI_CATEGORIES.map(function (cat) {
                  if (cat.id === "recent" && recentEmojis.length === 0) return null;
                  var isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={function () { setActiveCategory(cat.id); }}
                      style={{
                        padding: "4px 10px", borderRadius: 12, border: "none",
                        background: isActive ? "var(--dp-accent-soft)" : "transparent",
                        color: isActive ? "var(--dp-accent)" : "var(--dp-text-tertiary)",
                        fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                        cursor: "pointer", whiteSpace: "nowrap",
                        transition: "all 0.15s ease", flexShrink: 0,
                      }}
                    >
                      <span style={{ marginRight: 4 }}>{cat.icon}</span>
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Emoji grid */}
            <div style={{
              flex: 1, overflowY: "auto", overflowX: "hidden",
              padding: "4px 8px 8px",
              display: "grid", gridTemplateColumns: "repeat(8, 1fr)",
              gap: 2, alignContent: "start",
              scrollbarWidth: "none", msOverflowStyle: "none",
            }}>
              {filteredEmojis.length === 0 && activeCategory === "recent" && (
                <div style={{
                  gridColumn: "1 / -1", textAlign: "center",
                  padding: "20px 0", color: "var(--dp-text-tertiary)", fontSize: 13,
                }}>
                  No recent emojis yet
                </div>
              )}
              {filteredEmojis.map(function (emoji, i) {
                return (
                  <button
                    key={emoji + i}
                    onClick={function () { handleEmojiClick(emoji); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 22, padding: 5, borderRadius: 8,
                      transition: "all 0.15s ease",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onMouseEnter={function (e) {
                      e.currentTarget.style.background = "var(--dp-glass-hover)";
                      e.currentTarget.style.transform = "scale(1.2)";
                    }}
                    onMouseLeave={function (e) {
                      e.currentTarget.style.background = "none";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── GIF TAB ─── */}
        {activeTab === "gif" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            {/* Search */}
            <div style={{ padding: "8px 12px 4px", flexShrink: 0 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 10,
                background: "var(--dp-surface)", border: "1px solid var(--dp-glass-border)",
              }}>
                <Search size={14} color="var(--dp-text-tertiary)" strokeWidth={2} />
                <input
                  value={gifSearch}
                  onChange={function (e) { setGifSearch(e.target.value); }}
                  placeholder="Search GIFs..."
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    color: "var(--dp-text)", fontSize: 13, fontFamily: "inherit",
                  }}
                />
                {gifSearch && (
                  <button
                    onClick={function () { setGifSearch(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                  >
                    <X size={14} color="var(--dp-text-tertiary)" strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Powered by Tenor */}
            <div style={{ padding: "2px 12px 4px", fontSize: 10, color: "var(--dp-text-muted)", flexShrink: 0 }}>
              Powered by Tenor
            </div>

            {/* GIF grid (masonry 2-column) */}
            <div style={{
              flex: 1, overflowY: "auto", overflowX: "hidden",
              padding: "0 8px 8px",
              scrollbarWidth: "none", msOverflowStyle: "none",
            }}>
              {gifLoading ? (
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
                }}>
                  {[1, 2, 3, 4, 5, 6].map(function (n) {
                    return (
                      <div
                        key={n}
                        style={{
                          height: 80 + (n % 3) * 20,
                          borderRadius: 10,
                          background: "var(--dp-surface)",
                          animation: "dpEgpPulse 1.5s ease-in-out infinite",
                          animationDelay: (n * 0.1) + "s",
                        }}
                      />
                    );
                  })}
                </div>
              ) : gifs.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "30px 0",
                  color: "var(--dp-text-tertiary)", fontSize: 13,
                }}>
                  {gifSearch ? "No GIFs found" : "Search for GIFs"}
                </div>
              ) : (
                <div style={{
                  display: "flex", gap: 6,
                }}>
                  {/* Column 1 */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    {gifs.filter(function (_, i) { return i % 2 === 0; }).map(function (gif) {
                      return (
                        <GifGridItem
                          key={gif.id}
                          gif={gif}
                          onClick={function () { handleGifClick(gif); }}
                        />
                      );
                    })}
                  </div>
                  {/* Column 2 */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    {gifs.filter(function (_, i) { return i % 2 === 1; }).map(function (gif) {
                      return (
                        <GifGridItem
                          key={gif.id}
                          gif={gif}
                          onClick={function () { handleGifClick(gif); }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{"\
        @keyframes dpEgpSlideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}\
        @keyframes dpEgpFadeIn{from{opacity:0;}to{opacity:1;}}\
        @keyframes dpEgpPulse{0%,100%{opacity:0.4;}50%{opacity:0.7;}}\
        .dp-spin{animation:dpSpin 1s linear infinite;}\
        @keyframes dpSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}\
      "}</style>
    </div>
  );
}

// ─── GIF Grid Item ────────────────────────────────────────────────
function GifGridItem({ gif, onClick }) {
  var [loaded, setLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      style={{
        display: "block", width: "100%", padding: 0, border: "none",
        background: "none", cursor: "pointer", borderRadius: 10,
        overflow: "hidden", position: "relative",
        minHeight: loaded ? undefined : 80,
      }}
      onMouseEnter={function (e) {
        e.currentTarget.style.transform = "scale(0.97)";
        e.currentTarget.style.opacity = "0.85";
      }}
      onMouseLeave={function (e) {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.opacity = "1";
      }}
    >
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0,
          background: "var(--dp-surface)", borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Loader size={14} className="dp-spin" style={{ color: "var(--dp-text-muted)" }} />
        </div>
      )}
      <img
        src={gif.preview || gif.url}
        alt="GIF"
        loading="lazy"
        onLoad={function () { setLoaded(true); }}
        style={{
          width: "100%", display: "block", borderRadius: 10,
          opacity: loaded ? 1 : 0, transition: "opacity 0.2s ease",
        }}
      />
    </button>
  );
}
