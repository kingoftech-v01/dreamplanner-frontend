import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Sparkles, RefreshCw, X, Maximize2
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Vision Board Screen
// ═══════════════════════════════════════════════════════════════

const VISION_ITEMS = [
  {
    id: "v1",
    title: "Launch my SaaS Platform",
    emoji: "🚀",
    category: "career",
    gradient: "linear-gradient(135deg, #7C3AED, #4F46E5)",
    liked: true,
    height: 200,
  },
  {
    id: "v2",
    title: "Learn Piano",
    emoji: "🎹",
    category: "hobbies",
    gradient: "linear-gradient(135deg, #EC4899, #D946EF)",
    liked: false,
    height: 160,
  },
  {
    id: "v3",
    title: "Run a Half Marathon",
    emoji: "🏃",
    category: "health",
    gradient: "linear-gradient(135deg, #10B981, #14B8A6)",
    liked: true,
    height: 180,
  },
  {
    id: "v4",
    title: "Financial Freedom",
    emoji: "💰",
    category: "finance",
    gradient: "linear-gradient(135deg, #F59E0B, #EAB308)",
    liked: false,
    height: 220,
  },
  {
    id: "v5",
    title: "Mindful Living",
    emoji: "🧘",
    category: "personal",
    gradient: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    liked: true,
    height: 170,
  },
  {
    id: "v6",
    title: "Travel the World",
    emoji: "✈️",
    category: "personal",
    gradient: "linear-gradient(135deg, #3B82F6, #06B6D4)",
    liked: false,
    height: 190,
  },
];

const QUOTES = [
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "All our dreams can come true, if we have the courage to pursue them.", author: "Walt Disney" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Go confidently in the direction of your dreams.", author: "Henry David Thoreau" },
];

const glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

export default function VisionBoardScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("dp-vision-order");
    if (saved) {
      try {
        const order = JSON.parse(saved);
        return order.map(id => VISION_ITEMS.find(v => v.id === id)).filter(Boolean);
      } catch { /* fall through */ }
    }
    return [...VISION_ITEMS];
  });
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(null);
  const [quoteAnim, setQuoteAnim] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  const toggleLike = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, liked: !item.liked } : item
      )
    );
  };

  const refreshQuote = () => {
    setQuoteAnim(false);
    setTimeout(() => {
      setQuoteIdx((prev) => (prev + 1) % QUOTES.length);
      setQuoteAnim(true);
    }, 200);
  };

  const quote = QUOTES[quoteIdx];

  // Drag-and-drop handlers
  const handleDragStart = (idx) => {
    if (!editMode) return;
    setDragIdx(idx);
  };

  const handleDragOver = (idx) => {
    if (dragIdx === null || dragIdx === idx) return;
    setOverIdx(idx);
  };

  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
    setItems(prev => {
      const next = [...prev];
      const [dragged] = next.splice(dragIdx, 1);
      next.splice(idx, 0, dragged);
      localStorage.setItem("dp-vision-order", JSON.stringify(next.map(v => v.id)));
      return next;
    });
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <PageLayout>
      <div
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100vh",
          paddingBottom: 100,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 0 16px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <Sparkles size={20} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--dp-text)",
              letterSpacing: "-0.3px",
              flex: 1,
            }}
          >
            Vision Board
          </span>
          <button
            onClick={() => setEditMode(!editMode)}
            style={{
              background: editMode ? "linear-gradient(135deg, #8B5CF6, #7C3AED)" : (isLight ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.06)"),
              border: `1px solid ${editMode ? "transparent" : (isLight ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.06)")}`,
              borderRadius: 12,
              padding: "6px 14px",
              cursor: "pointer",
              color: editMode ? "#fff" : (isLight ? "#1A1535" : "rgba(255,255,255,0.9)"),
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {editMode ? "Done" : "Edit"}
          </button>
        </div>

        {/* Motivational Quote Banner */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
          }}
        >
          <div
            style={{
              ...glass,
              padding: "18px 20px",
              marginBottom: 20,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative glow */}
            <div
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 100,
                height: 100,
                background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                opacity: quoteAnim ? 1 : 0,
                transform: quoteAnim ? "translateY(0)" : "translateY(8px)",
                transition: "all 0.3s ease",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--dp-text-primary)",
                  lineHeight: 1.6,
                  fontStyle: "italic",
                  marginBottom: 8,
                }}
              >
                "{quote.text}"
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isLight ? "#6D28D9" : "#C4B5FD",
                  }}
                >
                  -- {quote.author}
                </span>
                <button
                  onClick={refreshQuote}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "1px solid var(--dp-input-border)",
                    background: "var(--dp-glass-bg)",
                    color: "var(--dp-text-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <RefreshCw size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vision Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
          }}
        >
          {items.map((item, i) => {
            const isDragging = dragIdx === i;
            const isOver = overIdx === i;
            return (
              <div
                key={item.id}
                draggable={editMode}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; handleDragStart(i); }}
                onDragOver={(e) => { e.preventDefault(); handleDragOver(i); }}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                onClick={() => !editMode && setFullscreen(item)}
                style={{
                  borderRadius: 18,
                  overflow: "hidden",
                  cursor: editMode ? "grab" : "pointer",
                  position: "relative",
                  height: item.height || 180,
                  background: item.gradient,
                  border: isOver ? "2px dashed #8B5CF6" : "1px solid var(--dp-input-border)",
                  transition: "transform 0.2s, opacity 0.2s, box-shadow 0.2s",
                  transform: isDragging ? "scale(1.05)" : isOver ? "scale(0.95)" : "scale(1)",
                  opacity: isDragging ? 0.7 : 1,
                  boxShadow: isDragging
                    ? "0 12px 40px rgba(139,92,246,0.4)"
                    : "0 4px 16px rgba(0,0,0,0.15)",
                }}
              >
                {/* Edit mode drag handle */}
                {editMode && (
                  <div style={{
                    position: "absolute",
                    top: 8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: 3,
                    zIndex: 5,
                  }}>
                    {[0,1,2].map(d => (
                      <div key={d} style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.6)",
                      }} />
                    ))}
                  </div>
                )}

                {/* Soft glow */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 60%)",
                    pointerEvents: "none",
                  }}
                />

                {/* Emoji center */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 48,
                      filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))",
                    }}
                  >
                    {item.emoji}
                  </span>
                </div>

                {/* Heart icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(item.id);
                  }}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    border: "none",
                    background: "rgba(0,0,0,0.3)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    color: item.liked ? "#EF4444" : "rgba(255,255,255,0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <Heart
                    size={15}
                    strokeWidth={2}
                    fill={item.liked ? "#EF4444" : "none"}
                  />
                </button>

                {/* Expand icon */}
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.3)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: editMode ? 0 : 1,
                    transition: "opacity 0.2s",
                    pointerEvents: "none",
                  }}
                >
                  <Maximize2 size={13} color="rgba(255,255,255,0.8)" strokeWidth={2} />
                </div>

                {/* Title overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "32px 14px 12px",
                    background:
                      "linear-gradient(transparent, rgba(0,0,0,0.5))",
                  }}
                >
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.25)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      display: "inline-block",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#fff",
                        textShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      }}
                    >
                      {item.title}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Generate New Image FAB */}
        <button
          onClick={() => showToast("Generate New Image — coming soon!", "info")}
          style={{
            position: "fixed",
            bottom: 100,
            right: 28,
            width: 56,
            height: 56,
            borderRadius: 18,
            border: "none",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 6px 24px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.15)",
            zIndex: 100,
            transition: "all 0.25s",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "scale(1)" : "scale(0.5)",
          }}
        >
          <Sparkles size={24} strokeWidth={2} />
        </button>

        {/* Full-Screen Modal */}
        {fullscreen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "vbFadeIn 0.25s ease-out",
            }}
          >
            <div
              onClick={() => setFullscreen(null)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            />
            <div
              style={{
                position: "relative",
                width: "90%",
                maxWidth: 400,
                animation: "vbScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setFullscreen(null)}
                style={{
                  position: "absolute",
                  top: -16,
                  right: -8,
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: "1px solid var(--dp-surface-hover)",
                  background: "var(--dp-modal-bg)",
                  color: "var(--dp-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10,
                }}
              >
                <X size={16} strokeWidth={2} />
              </button>

              {/* Large image area */}
              <div
                style={{
                  width: "100%",
                  height: 360,
                  borderRadius: 24,
                  background: fullscreen.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {/* Soft glow effect */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12) 0%, transparent 60%)",
                    pointerEvents: "none",
                  }}
                />
                <span style={{ fontSize: 80, filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.3))" }}>
                  {fullscreen.emoji}
                </span>

                {/* Title overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "40px 20px 20px",
                    background:
                      "linear-gradient(transparent, rgba(0,0,0,0.6))",
                  }}
                >
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                      textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    }}
                  >
                    {fullscreen.title}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes vbFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes vbScaleIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    </PageLayout>
  );
}

