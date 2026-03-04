import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, Calendar, Clock, MapPin, FileText, Target, Loader } from "lucide-react";
import { apiGet } from "../../services/api";
import { CALENDAR } from "../../services/endpoints";
import { BRAND, GRADIENT_SHADOWS } from "../../styles/colors";

/* ═══════════════════════════════════════════════════════════════════
 * CalendarSearchOverlay
 * Full-screen glass overlay for searching calendar events and tasks.
 * Debounced input, grouped-by-date results, match highlighting,
 * recent searches stored in localStorage.
 * ═══════════════════════════════════════════════════════════════════ */

var STORAGE_KEY = "dp-calendar-recent-searches";
var MAX_RECENT = 5;
var DEBOUNCE_MS = 300;

var MATCH_ICONS = {
  title: Calendar,
  description: FileText,
  location: MapPin,
};

var MATCH_LABELS = {
  title: "Title",
  description: "Description",
  location: "Location",
};

function loadRecentSearches() {
  try {
    var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(function (s) { return typeof s === "string" && s.length < 200; }).slice(0, MAX_RECENT);
  } catch (e) {
    return [];
  }
}

function saveRecentSearch(term) {
  var recent = loadRecentSearches();
  var filtered = recent.filter(function (s) { return s !== term; });
  filtered.unshift(term);
  if (filtered.length > MAX_RECENT) filtered = filtered.slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) { /* quota exceeded — silently ignore */ }
  return filtered;
}

// Highlight matching text within a string by bolding it
function HighlightText(props) {
  var text = props.text || "";
  var query = props.query || "";
  if (!query || !text) return text;
  var idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  var before = text.slice(0, idx);
  var match = text.slice(idx, idx + query.length);
  var after = text.slice(idx + query.length);
  return (
    <>
      {before}
      <strong style={{ color: "var(--dp-accent)", fontWeight: 700 }}>{match}</strong>
      {after}
    </>
  );
}

// Group results by date
function groupByDate(results) {
  var groups = {};
  var order = [];
  results.forEach(function (item) {
    var dateStr = "";
    if (item.startTime || item.start_time) {
      var raw = item.startTime || item.start_time || "";
      dateStr = typeof raw === "string" ? raw.split("T")[0] : "";
    }
    if (!dateStr) dateStr = "No date";
    if (!groups[dateStr]) {
      groups[dateStr] = [];
      order.push(dateStr);
    }
    groups[dateStr].push(item);
  });
  return { groups: groups, order: order };
}

function formatGroupDate(dateStr) {
  if (!dateStr || dateStr === "No date") return "No date";
  try {
    var d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    var today = new Date();
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  } catch (e) {
    return dateStr;
  }
}

function formatTime(isoStr) {
  if (!isoStr) return "";
  try {
    var parts = isoStr.split("T");
    if (parts.length < 2) return "";
    var time = parts[1].substring(0, 5);
    var h = parseInt(time.split(":")[0], 10);
    var m = time.split(":")[1];
    if (h === 0) return "12:" + m + " AM";
    if (h < 12) return h + ":" + m + " AM";
    if (h === 12) return "12:" + m + " PM";
    return (h - 12) + ":" + m + " PM";
  } catch (e) {
    return "";
  }
}

export default function CalendarSearchOverlay(props) {
  var open = props.open;
  var onClose = props.onClose;
  var onNavigateToDate = props.onNavigateToDate;

  var inputRef = useRef(null);
  var debounceRef = useRef(null);
  var [query, setQuery] = useState("");
  var [results, setResults] = useState([]);
  var [searching, setSearching] = useState(false);
  var [searched, setSearched] = useState(false);
  var [recentSearches, setRecentSearches] = useState(loadRecentSearches);

  // Auto-focus input on open
  useEffect(function () {
    if (open) {
      setQuery("");
      setResults([]);
      setSearched(false);
      setSearching(false);
      setRecentSearches(loadRecentSearches());
      setTimeout(function () {
        if (inputRef.current) inputRef.current.focus();
      }, 120);
    }
  }, [open]);

  // Escape to close
  useEffect(function () {
    if (!open) return;
    var handler = function (e) {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return function () { document.removeEventListener("keydown", handler); };
  }, [open, onClose]);

  // Debounced search
  useEffect(function () {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setSearched(false);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(function () {
      var q = query.trim();
      apiGet(CALENDAR.SEARCH + "?q=" + encodeURIComponent(q))
        .then(function (data) {
          var arr = Array.isArray(data) ? data : (data.results || []);
          setResults(arr);
          setSearched(true);
          setSearching(false);
        })
        .catch(function () {
          setResults([]);
          setSearched(true);
          setSearching(false);
        });
    }, DEBOUNCE_MS);
    return function () {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  var grouped = useMemo(function () {
    return groupByDate(results);
  }, [results]);

  var handleResultClick = useCallback(function (item) {
    // Save to recent searches
    if (query.trim().length >= 2) {
      setRecentSearches(saveRecentSearch(query.trim()));
    }
    // Navigate to the date in the calendar
    var dateStr = "";
    if (item.startTime || item.start_time) {
      var raw = item.startTime || item.start_time || "";
      dateStr = typeof raw === "string" ? raw.split("T")[0] : "";
    }
    if (dateStr && onNavigateToDate) {
      onNavigateToDate(dateStr);
    }
    onClose();
  }, [query, onClose, onNavigateToDate]);

  var handleRecentClick = useCallback(function (term) {
    setQuery(term);
  }, []);

  var handleClearRecent = useCallback(function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    setRecentSearches([]);
  }, []);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        background: "var(--dp-overlay)",
        backdropFilter: "blur(24px) saturate(1.6)",
        WebkitBackdropFilter: "blur(24px) saturate(1.6)",
        animation: "dpFadeIn 0.2s ease-out",
      }}
      onClick={function (e) {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ── Top Bar ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 16px 12px",
        flexShrink: 0,
      }}>
        {/* Search Input */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          height: 52,
          borderRadius: 16,
          background: "var(--dp-modal-bg)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid var(--dp-glass-border)",
          boxShadow: GRADIENT_SHADOWS.card,
        }}>
          <Search size={20} style={{ color: "var(--dp-accent)", flexShrink: 0 }} strokeWidth={2} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={function (e) { setQuery(e.target.value); }}
            placeholder="Search events, tasks, locations..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--dp-text)",
              fontSize: 16,
              fontFamily: "inherit",
              fontWeight: 500,
            }}
          />
          {query && (
            <button
              onClick={function () { setQuery(""); setResults([]); setSearched(false); inputRef.current && inputRef.current.focus(); }}
              aria-label="Clear search"
              style={{
                background: "var(--dp-surface)",
                border: "1px solid var(--dp-input-border)",
                borderRadius: 8,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--dp-text-secondary)",
                flexShrink: 0,
              }}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close search"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "var(--dp-surface)",
            border: "1px solid var(--dp-input-border)",
            color: "var(--dp-text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "0 16px 32px",
      }}>

        {/* Loading state */}
        {searching && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "40px 0",
          }}>
            <Loader size={20} style={{ color: "var(--dp-accent)", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 14, color: "var(--dp-text-secondary)", fontWeight: 500 }}>Searching...</span>
          </div>
        )}

        {/* No results */}
        {!searching && searched && results.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "48px 20px",
          }}>
            <Search size={40} style={{ color: "var(--dp-text-muted)", marginBottom: 12 }} strokeWidth={1.5} />
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--dp-text-secondary)", marginBottom: 4 }}>
              No results found
            </div>
            <div style={{ fontSize: 13, color: "var(--dp-text-muted)" }}>
              Try a different search term
            </div>
          </div>
        )}

        {/* Recent searches (shown when no query) */}
        {!searching && !searched && query.trim().length < 2 && recentSearches.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Recent Searches
              </span>
              <button
                onClick={handleClearRecent}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--dp-accent)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                Clear
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {recentSearches.map(function (term, i) {
                return (
                  <button
                    key={term + "-" + i}
                    onClick={function () { handleRecentClick(term); }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      background: "var(--dp-modal-bg)",
                      border: "1px solid var(--dp-glass-border)",
                      color: "var(--dp-text)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                      animation: "dpFadeIn 0.3s ease-out " + (i * 50) + "ms both",
                    }}
                  >
                    <Clock size={12} style={{ marginRight: 6, verticalAlign: -1, color: "var(--dp-text-muted)" }} strokeWidth={2} />
                    {term}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results grouped by date */}
        {!searching && results.length > 0 && grouped.order.map(function (dateKey, gi) {
          var items = grouped.groups[dateKey];
          return (
            <div
              key={dateKey}
              style={{
                marginTop: gi === 0 ? 4 : 20,
                animation: "dpFadeIn 0.35s ease-out " + (gi * 60) + "ms both",
              }}
            >
              {/* Date header */}
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--dp-accent)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 8,
                padding: "0 4px",
              }}>
                {formatGroupDate(dateKey)}
              </div>

              {/* Result cards */}
              {items.map(function (item, ii) {
                var isTask = item.resultType === "task" || item.result_type === "task";
                var matchCtx = item.matchContext || item.match_context || "title";
                var MatchIcon = MATCH_ICONS[matchCtx] || Calendar;
                var matchLabel = MATCH_LABELS[matchCtx] || "Title";
                var timeStr = formatTime(item.startTime || item.start_time);
                var title = item.title || "";
                var description = item.description || "";
                var location = item.location || "";
                var dreamTitle = item.dreamTitle || item.dream_title || "";
                var goalTitle = item.goalTitle || item.goal_title || "";

                return (
                  <button
                    key={item.id + "-" + ii}
                    onClick={function () { handleResultClick(item); }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      marginBottom: 6,
                      borderRadius: 14,
                      background: "var(--dp-modal-bg)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      border: "1px solid var(--dp-glass-border)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s",
                      animation: "dpFadeIn 0.3s ease-out " + ((gi * 60) + (ii * 40) + 80) + "ms both",
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isTask ? "rgba(93,229,168,0.12)" : "rgba(139,92,246,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      {isTask
                        ? <Target size={16} style={{ color: BRAND.greenSolid }} strokeWidth={2} />
                        : <Calendar size={16} style={{ color: BRAND.purple }} strokeWidth={2} />
                      }
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--dp-text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {matchCtx === "title"
                          ? <HighlightText text={title} query={query} />
                          : title
                        }
                      </div>
                      {/* Matched field context (if not title) */}
                      {matchCtx !== "title" && (
                        <div style={{
                          fontSize: 12,
                          color: "var(--dp-text-secondary)",
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          <MatchIcon size={11} strokeWidth={2} style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, color: "var(--dp-text-muted)" }}>{matchLabel}:</span>
                          <span>
                            {matchCtx === "description"
                              ? <HighlightText text={description.substring(0, 80)} query={query} />
                              : <HighlightText text={location} query={query} />
                            }
                          </span>
                        </div>
                      )}
                      {/* Meta row */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 4,
                        flexWrap: "wrap",
                      }}>
                        {timeStr && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: "var(--dp-text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}>
                            <Clock size={10} strokeWidth={2} />
                            {timeStr}
                          </span>
                        )}
                        {dreamTitle && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: BRAND.purple,
                            background: "rgba(139,92,246,0.1)",
                            padding: "1px 6px",
                            borderRadius: 4,
                          }}>
                            {dreamTitle}
                          </span>
                        )}
                        {goalTitle && !dreamTitle && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: "var(--dp-text-muted)",
                          }}>
                            {goalTitle}
                          </span>
                        )}
                        {isTask && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: BRAND.greenSolid,
                            background: "rgba(93,229,168,0.1)",
                            padding: "1px 6px",
                            borderRadius: 4,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}>
                            Task
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes dpFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
