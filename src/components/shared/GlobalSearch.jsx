import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Target, MessageCircle, Users, Clock, ArrowRight, Loader } from "lucide-react";
import { apiGet } from "../../services/api";
import { SEARCH } from "../../services/endpoints";
import { sanitizeSearch } from "../../utils/sanitize";
import { BRAND } from "../../styles/colors";

const CATEGORY_ICONS = { dreams: Target, messages: MessageCircle, users: Users, goals: Target, tasks: Target, calendar: Clock };
const CATEGORY_LABELS = { dreams: "Dreams", messages: "Messages", users: "People", goals: "Goals", tasks: "Tasks", calendar: "Calendar" };

export default function GlobalSearch({ isOpen, onClose }) {
  const navigate = useNavigate();
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

  // ─── Debounced API search ────────────────────────────────────
  var [results, setResults] = useState({});
  var [searching, setSearching] = useState(false);
  var debounceRef = useRef(null);

  useEffect(function () {
    if (query.trim().length < 2) {
      setResults({});
      setSearching(false);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(function () {
      var q = sanitizeSearch(query.trim());
      apiGet(SEARCH.GLOBAL + "?q=" + encodeURIComponent(q) + "&type=dreams,messages,users,goals,tasks,calendar")
        .then(function (data) {
          var combined = {};
          if (data.dreams && data.dreams.length > 0) {
            combined.dreams = data.dreams.slice(0, 5).map(function (d) {
              return { id: d.id, title: d.title, desc: d.status || "", path: "/dream/" + d.id };
            });
          }
          if (data.messages && data.messages.length > 0) {
            combined.messages = data.messages.slice(0, 5).map(function (m) {
              return { id: m.id, title: m.content, desc: m.role, path: "/chat/" + m.conversation_id };
            });
          }
          if (data.users && data.users.length > 0) {
            combined.users = data.users.slice(0, 5).map(function (u) {
              return { id: u.id, title: u.display_name || "User", desc: "", path: "/user/" + u.id };
            });
          }
          if (data.goals && data.goals.length > 0) {
            combined.goals = data.goals.slice(0, 5).map(function (g) {
              return { id: g.id, title: g.title, desc: "", path: "/dream/" + g.dream_id };
            });
          }
          if (data.tasks && data.tasks.length > 0) {
            combined.tasks = data.tasks.slice(0, 5).map(function (t) {
              return { id: t.id, title: t.title, desc: "", path: "/" };
            });
          }
          if (data.calendar && data.calendar.length > 0) {
            combined.calendar = data.calendar.slice(0, 5).map(function (e) {
              return { id: e.id, title: e.title, desc: e.start_time, path: "/calendar" };
            });
          }
          setResults(combined);
          setSearching(false);
        })
        .catch(function () {
          setSearching(false);
        });
    }, 300);
    return function () { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

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
      background: "var(--dp-overlay)",
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
          <Search size={18} style={{ color: "var(--dp-text-muted)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search dreams, chats, people..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 14, color: "var(--dp-text)",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{
              background: "none", border: "none", cursor: "pointer", padding: 2,
            }}>
              <X size={16} style={{ color: "var(--dp-text-muted)" }} />
            </button>
          )}
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--dp-text-secondary)",
          fontSize: 14, fontWeight: 500,
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
              color: "var(--dp-text-muted)",
              marginBottom: 8, marginTop: 8,
            }}>Recent</div>
            {recentSearches.map((s, i) => (
              <button key={i} onClick={() => setQuery(s)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 12px", background: "none", border: "none", cursor: "pointer",
                borderRadius: 10, textAlign: "left",
              }}>
                <Clock size={15} style={{ color: "var(--dp-text-muted)" }} />
                <span style={{ fontSize: 14, color: "var(--dp-text-secondary)" }}>{s}</span>
              </button>
            ))}
          </div>
        )}

        {query.trim().length >= 2 && searching && (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <Loader size={24} style={{ color: BRAND.purple, animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {query.trim().length >= 2 && !searching && !hasResults && (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <Search size={36} style={{ color: "var(--dp-text-muted)", marginBottom: 12 }} />
            <p style={{ fontSize: 15, color: "var(--dp-text-tertiary)" }}>
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
                <CategoryIcon size={14} style={{ color: BRAND.purple }} />
                <span style={{
                  fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                  color: "var(--dp-text-tertiary)",
                }}>{CATEGORY_LABELS[category]}</span>
              </div>
              {items.map(item => (
                <button key={item.id} onClick={() => handleSelect(item)} style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "12px 14px",
                  background: "var(--dp-glass-bg)",
                  border: "1px solid var(--dp-glass-border)",
                  borderRadius: 14, cursor: "pointer", marginBottom: 8, textAlign: "left",
                  transition: "background 0.2s",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600,
                      color: "var(--dp-text)",
                    }}>{item.title}</div>
                    <div style={{
                      fontSize: 12, marginTop: 2,
                      color: "var(--dp-text-tertiary)",
                    }}>{item.desc}</div>
                  </div>
                  <ArrowRight size={16} style={{ color: "var(--dp-text-muted)", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          );
        })}

        {query.trim().length < 2 && recentSearches.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15, color: "var(--dp-text-tertiary)" }}>
              Search dreams, conversations, and friends
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
