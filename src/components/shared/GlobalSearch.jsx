import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Target, MessageCircle, Users, Clock, ArrowRight } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// Searchable mock data (duplicates some data from screens but that's OK for a frontend-only app)
const SEARCH_DATA = {
  dreams: [
    { id: "1", title: "Launch my SaaS Platform", desc: "Build and deploy a production-ready SaaS", category: "career", path: "/dream/1" },
    { id: "2", title: "Learn Piano in 6 Months", desc: "Master basic piano skills and chord progressions", category: "hobbies", path: "/dream/2" },
    { id: "3", title: "Run a Half Marathon", desc: "Train for and complete a 21km race", category: "health", path: "/dream/3" },
    { id: "4", title: "Save $10K Emergency Fund", desc: "Build financial safety net", category: "finance", path: "/dream/4" },
  ],
  conversations: [
    { id: "1", title: "Launch SaaS Platform — Coaching", desc: "Great progress on the deployment pipeline!", path: "/chat/1" },
    { id: "2", title: "Piano Practice Plan", desc: "I've structured your weekly practice into 30-minute blocks", path: "/chat/2" },
    { id: "5", title: "Alex — Buddy Chat", desc: "See you at the park tomorrow morning!", path: "/buddy-chat/5" },
  ],
  users: [
    { id: "l5", title: "Alex Thompson", desc: "Running buddy • Level 8", path: "/user/l5" },
    { id: "l1", title: "Jade Rivers", desc: "Piano enthusiast • Level 12", path: "/user/l1" },
    { id: "l3", title: "Lisa Chen", desc: "Finance guru • Level 10", path: "/user/l3" },
    { id: "om1", title: "Omar Hassan", desc: "Tech entrepreneur • Level 9", path: "/user/om1" },
  ],
};

const CATEGORY_ICONS = { dreams: Target, conversations: MessageCircle, users: Users };
const CATEGORY_LABELS = { dreams: "Dreams", conversations: "Conversations", users: "People" };

export default function GlobalSearch({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      var raw = JSON.parse(localStorage.getItem("dp-recent-searches") || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.filter(function(s) { return typeof s === "string" && s.length < 200; }).slice(0, 10);
    } catch { return []; }
  });

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const results = query.trim().length < 2 ? {} : Object.fromEntries(
    Object.entries(SEARCH_DATA).map(([cat, items]) => [
      cat,
      items.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase())
      ),
    ]).filter(([_, items]) => items.length > 0)
  );

  const hasResults = Object.keys(results).length > 0;

  const handleSelect = (item) => {
    // Save to recent searches
    const updated = [item.title, ...recentSearches.filter(s => s !== item.title)].slice(0, 5);
    setRecentSearches(updated);
    var json = JSON.stringify(updated);
    if (json.length < 5000) localStorage.setItem("dp-recent-searches", json);
    onClose();
    navigate(item.path);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: isLight ? "rgba(240,236,255,0.95)" : "rgba(3,1,10,0.95)",
      backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      animation: "dpFadeScale 0.2s ease-out",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 16px 12px", maxWidth: 480, width: "100%", margin: "0 auto",
      }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          background: "var(--dp-surface)",
          border: "1px solid var(--dp-input-border)",
          borderRadius: 14, padding: "10px 14px",
        }}>
          <Search size={18} style={{ color: isLight ? "rgba(26,21,53,0.4)" : "rgba(255,255,255,0.4)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search dreams, chats, people..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 14, color: isLight ? "#1A1535" : "rgba(255,255,255,0.95)",
              fontFamily: "Inter, sans-serif",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{
              background: "none", border: "none", cursor: "pointer", padding: 2,
            }}>
              <X size={16} style={{ color: isLight ? "rgba(26,21,53,0.4)" : "rgba(255,255,255,0.4)" }} />
            </button>
          )}
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: isLight ? "rgba(26,21,53,0.6)" : "rgba(255,255,255,0.6)",
          fontSize: 14, fontWeight: 500, fontFamily: "Inter, sans-serif",
        }}>Cancel</button>
      </div>

      {/* Results */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "0 16px 16px",
        maxWidth: 480, width: "100%", margin: "0 auto",
      }}>
        {query.trim().length < 2 && recentSearches.length > 0 && (
          <div>
            <div style={{
              fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
              color: isLight ? "rgba(26,21,53,0.4)" : "rgba(255,255,255,0.3)",
              marginBottom: 8, marginTop: 8,
            }}>Recent</div>
            {recentSearches.map((s, i) => (
              <button key={i} onClick={() => setQuery(s)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 12px", background: "none", border: "none", cursor: "pointer",
                borderRadius: 10, textAlign: "left",
              }}>
                <Clock size={15} style={{ color: isLight ? "rgba(26,21,53,0.3)" : "rgba(255,255,255,0.3)" }} />
                <span style={{ fontSize: 14, color: isLight ? "rgba(26,21,53,0.7)" : "rgba(255,255,255,0.6)" }}>{s}</span>
              </button>
            ))}
          </div>
        )}

        {query.trim().length >= 2 && !hasResults && (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)" }}>
              No results for "{query}"
            </p>
          </div>
        )}

        {Object.entries(results).map(([category, items]) => {
          const CategoryIcon = CATEGORY_ICONS[category];
          return (
            <div key={category} style={{ marginTop: 16 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
              }}>
                <CategoryIcon size={14} style={{ color: "#8B5CF6" }} />
                <span style={{
                  fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                  color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)",
                }}>{CATEGORY_LABELS[category]}</span>
              </div>
              {items.map(item => (
                <button key={item.id} onClick={() => handleSelect(item)} style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "12px 14px",
                  background: isLight ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.05)"}`,
                  borderRadius: 14, cursor: "pointer", marginBottom: 8, textAlign: "left",
                  transition: "background 0.2s",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600,
                      color: isLight ? "#1A1535" : "rgba(255,255,255,0.95)",
                    }}>{item.title}</div>
                    <div style={{
                      fontSize: 12, marginTop: 2,
                      color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)",
                    }}>{item.desc}</div>
                  </div>
                  <ArrowRight size={16} style={{ color: isLight ? "rgba(26,21,53,0.3)" : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          );
        })}

        {query.trim().length < 2 && recentSearches.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)" }}>
              Search dreams, conversations, and friends
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
