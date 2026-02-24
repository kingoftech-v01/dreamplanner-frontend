import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Heart, Sparkles, RefreshCw, X, Maximize2,
  Briefcase, Palette, Heart as HeartIcon, Wallet, Brain, Users, ImageOff, Loader2
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { apiGet, apiPost } from "../../services/api";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Vision Board Screen
// ═══════════════════════════════════════════════════════════════

var QUOTES = [
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "All our dreams can come true, if we have the courage to pursue them.", author: "Walt Disney" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Go confidently in the direction of your dreams.", author: "Henry David Thoreau" },
];

// ─── Category config ──────────────────────────────────────────────
var CATS = {
  career:        { Icon: Briefcase, color: "#8B5CF6", gradient: "linear-gradient(135deg, #7C3AED, #4F46E5)" },
  hobbies:       { Icon: Palette,   color: "#EC4899", gradient: "linear-gradient(135deg, #EC4899, #D946EF)" },
  health:        { Icon: HeartIcon, color: "#10B981", gradient: "linear-gradient(135deg, #10B981, #14B8A6)" },
  finance:       { Icon: Wallet,    color: "#FCD34D", gradient: "linear-gradient(135deg, #F59E0B, #EAB308)" },
  personal:      { Icon: Brain,     color: "#6366F1", gradient: "linear-gradient(135deg, #6366F1, #8B5CF6)" },
  relationships: { Icon: Users,     color: "#14B8A6", gradient: "linear-gradient(135deg, #3B82F6, #06B6D4)" },
};

var DEFAULT_CAT = { Icon: Sparkles, color: "#8B5CF6", gradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)" };

// Vary card heights for visual interest based on index
var HEIGHTS = [200, 160, 180, 220, 170, 190, 200, 160];

var glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

export default function VisionBoardScreen() {
  var navigate = useNavigate();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var { showToast } = useToast();
  var { hasSubscription } = useAuth();
  var [mounted, setMounted] = useState(false);
  var [quoteIdx, setQuoteIdx] = useState(0);
  var [fullscreen, setFullscreen] = useState(null);
  var [quoteAnim, setQuoteAnim] = useState(true);
  var [showGenModal, setShowGenModal] = useState(false);
  var [generating, setGenerating] = useState(null);
  var queryClient = useQueryClient();
  var [likedIds, setLikedIds] = useState(function () {
    try {
      var saved = localStorage.getItem("dp-vision-likes");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // ── Fetch all user dreams ──
  var dreamsQuery = useQuery({
    queryKey: ["dreams"],
    queryFn: function () { return apiGet("/api/dreams/dreams/"); },
  });

  var allDreams = (dreamsQuery.data && dreamsQuery.data.results) || dreamsQuery.data || [];

  // Map dreams into vision board items
  var items = allDreams.map(function (dream, i) {
    var cat = CATS[dream.category] || DEFAULT_CAT;
    var CatIcon = cat.Icon;
    return {
      id: dream.id,
      title: dream.title,
      category: dream.category,
      gradient: cat.gradient,
      color: cat.color,
      CatIcon: CatIcon,
      visionImageUrl: dream.visionImageUrl || null,
      liked: !!likedIds[dream.id],
      height: HEIGHTS[i % HEIGHTS.length],
      progress: dream.progress || 0,
    };
  });

  useEffect(function () {
    setTimeout(function () { setMounted(true); }, 100);
  }, []);

  var toggleLike = function (id) {
    setLikedIds(function (prev) {
      var next = Object.assign({}, prev);
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      localStorage.setItem("dp-vision-likes", JSON.stringify(next));
      return next;
    });
  };

  var refreshQuote = function () {
    setQuoteAnim(false);
    setTimeout(function () {
      setQuoteIdx(function (prev) { return (prev + 1) % QUOTES.length; });
      setQuoteAnim(true);
    }, 200);
  };

  var quote = QUOTES[quoteIdx];

  var handleGenerateVision = function () {
    if (!hasSubscription("pro")) {
      showToast("Upgrade to Pro for AI-generated vision images", "info");
      return;
    }
    setShowGenModal(true);
  };

  var generateForDream = function (dreamId) {
    setGenerating(dreamId);
    apiPost("/api/dreams/dreams/" + dreamId + "/generate_vision/").then(function (data) {
      showToast("Vision image generated!", "success");
      setGenerating(null);
      setShowGenModal(false);
      queryClient.invalidateQueries({ queryKey: ["dreams"] });
    }).catch(function (err) {
      showToast(err.message || "Failed to generate vision image", "error");
      setGenerating(null);
    });
  };

  // ── Loading state ──
  if (dreamsQuery.isLoading) {
    return (
      <PageLayout>
        <div style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100vh",
          paddingBottom: 100,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "20px 0 16px",
          }}>
            <button className="dp-ib" onClick={function () { navigate(-1); }}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <Sparkles size={20} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
            <span style={{
              fontSize: 17, fontWeight: 700, color: "var(--dp-text)",
              letterSpacing: "-0.3px", flex: 1,
            }}>
              Vision Board
            </span>
          </div>
          <SkeletonCard height={90} style={{ marginBottom: 16 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[1, 2, 3, 4].map(function (i) {
              return <SkeletonCard key={i} height={180} style={{ borderRadius: 18 }} />;
            })}
          </div>
        </div>
      </PageLayout>
    );
  }

  // ── Error state ──
  if (dreamsQuery.isError) {
    return (
      <PageLayout>
        <div style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100vh",
          paddingBottom: 100,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "20px 0 16px",
          }}>
            <button className="dp-ib" onClick={function () { navigate(-1); }}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <Sparkles size={20} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
            <span style={{
              fontSize: 17, fontWeight: 700, color: "var(--dp-text)",
              letterSpacing: "-0.3px", flex: 1,
            }}>
              Vision Board
            </span>
          </div>
          <ErrorState
            message={dreamsQuery.error?.message || "Failed to load your dreams."}
            onRetry={function () { dreamsQuery.refetch(); }}
          />
        </div>
      </PageLayout>
    );
  }

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
          <button className="dp-ib" onClick={function () { navigate(-1); }}>
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
          <span style={{
            padding: "4px 10px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            background: isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.06)",
            color: isLight ? "rgba(26,21,53,0.72)" : "rgba(255,255,255,0.72)",
          }}>
            {items.length} {items.length === 1 ? "dream" : "dreams"}
          </span>
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

        {/* Empty state */}
        {items.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              textAlign: "center",
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(124,58,237,0.08))",
              border: "1px solid rgba(139,92,246,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              <ImageOff size={28} color={isLight ? "#7C3AED" : "#C4B5FD"} />
            </div>
            <h3 style={{
              fontSize: 18, fontWeight: 700, color: "var(--dp-text)",
              fontFamily: "Inter, sans-serif", margin: "0 0 8px",
            }}>
              Your vision board is empty
            </h3>
            <p style={{
              fontSize: 14, color: "var(--dp-text-tertiary)",
              fontFamily: "Inter, sans-serif", lineHeight: 1.6,
              maxWidth: 280, margin: "0 0 24px",
            }}>
              Create your first dream and it will appear here as a vision card.
            </p>
            <button
              onClick={function () { navigate("/dream/create"); }}
              style={{
                height: 44, borderRadius: 14, padding: "0 24px",
                background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                border: "none", cursor: "pointer",
                color: "#fff", fontSize: 14, fontWeight: 600,
                fontFamily: "Inter, sans-serif",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
              }}
            >
              <Sparkles size={16} />
              Create a Dream
            </button>
          </div>
        )}

        {/* Vision Grid */}
        {items.length > 0 && (
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
            {items.map(function (item, i) {
              var hasImage = !!item.visionImageUrl;
              return (
                <div
                  key={item.id}
                  onClick={function () { setFullscreen(item); }}
                  style={{
                    borderRadius: 18,
                    overflow: "hidden",
                    cursor: "pointer",
                    position: "relative",
                    height: item.height || 180,
                    background: hasImage
                      ? "var(--dp-glass-bg)"
                      : item.gradient,
                    border: "1px solid var(--dp-input-border)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  }}
                >
                  {/* Vision image or gradient with category icon */}
                  {hasImage ? (
                    <img
                      src={item.visionImageUrl}
                      alt={item.title}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <>
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

                      {/* Category icon center */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div style={{
                          width: 64,
                          height: 64,
                          borderRadius: 20,
                          background: "rgba(255,255,255,0.15)",
                          backdropFilter: "blur(8px)",
                          WebkitBackdropFilter: "blur(8px)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <item.CatIcon
                            size={32}
                            color="rgba(255,255,255,0.9)"
                            strokeWidth={1.8}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Heart icon */}
                  <button
                    onClick={function (e) {
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
                      color: likedIds[item.id] ? "#EF4444" : "rgba(255,255,255,0.7)",
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
                      fill={likedIds[item.id] ? "#EF4444" : "none"}
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
                      pointerEvents: "none",
                    }}
                  >
                    <Maximize2 size={13} color="rgba(255,255,255,0.8)" strokeWidth={2} />
                  </div>

                  {/* Progress bar */}
                  {item.progress > 0 && (
                    <div style={{
                      position: "absolute",
                      bottom: 42,
                      left: 10,
                      right: 10,
                      height: 3,
                      borderRadius: 2,
                      background: "rgba(0,0,0,0.2)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: item.progress + "%",
                        borderRadius: 2,
                        background: item.progress >= 80
                          ? "linear-gradient(90deg, #10B981, #34D399)"
                          : "rgba(255,255,255,0.7)",
                        transition: "width 1s ease",
                      }} />
                    </div>
                  )}

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
        )}

        {/* Generate New Image FAB */}
        <button
          onClick={handleGenerateVision}
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
              onClick={function () { setFullscreen(null); }}
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
                onClick={function () { setFullscreen(null); }}
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
                  background: fullscreen.visionImageUrl ? "var(--dp-glass-bg)" : fullscreen.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {fullscreen.visionImageUrl ? (
                  <img
                    src={fullscreen.visionImageUrl}
                    alt={fullscreen.title}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <>
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
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: 24,
                      background: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <fullscreen.CatIcon
                        size={44}
                        color="rgba(255,255,255,0.9)"
                        strokeWidth={1.5}
                      />
                    </div>
                  </>
                )}

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
                      margin: 0,
                    }}
                  >
                    {fullscreen.title}
                  </h3>
                  {fullscreen.progress > 0 && (
                    <div style={{
                      marginTop: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}>
                      <div style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.2)",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%",
                          width: fullscreen.progress + "%",
                          borderRadius: 2,
                          background: fullscreen.progress >= 80
                            ? "linear-gradient(90deg, #10B981, #34D399)"
                            : "rgba(255,255,255,0.8)",
                        }} />
                      </div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#fff",
                        textShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      }}>
                        {fullscreen.progress}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* View dream button */}
              <button
                onClick={function () {
                  setFullscreen(null);
                  navigate("/dream/" + fullscreen.id);
                }}
                style={{
                  width: "100%",
                  marginTop: 12,
                  height: 44,
                  borderRadius: 14,
                  border: "1px solid var(--dp-input-border)",
                  background: "var(--dp-glass-bg)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  color: "var(--dp-text)",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                View Dream Details
              </button>
            </div>
          </div>
        )}

        {/* Generate Vision Modal */}
        {showGenModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "vbFadeIn 0.25s ease-out",
            }}
          >
            <div
              onClick={function () { if (!generating) setShowGenModal(false); }}
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
                maxHeight: "70vh",
                display: "flex",
                flexDirection: "column",
                animation: "vbScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Modal header */}
              <div style={{
                ...glass,
                borderRadius: "20px 20px 0 0",
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Sparkles size={18} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
                  <span style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--dp-text)",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    Generate AI Vision
                  </span>
                </div>
                <button
                  onClick={function () { if (!generating) setShowGenModal(false); }}
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
                    cursor: generating ? "not-allowed" : "pointer",
                    opacity: generating ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>

              {/* Dream list */}
              <div style={{
                ...glass,
                borderRadius: "0 0 20px 20px",
                borderTop: "1px solid var(--dp-input-border)",
                padding: "8px 12px 12px",
                overflowY: "auto",
                flex: 1,
              }}>
                {allDreams.length === 0 && (
                  <div style={{
                    padding: "32px 16px",
                    textAlign: "center",
                  }}>
                    <p style={{
                      fontSize: 14,
                      color: "var(--dp-text-tertiary)",
                      fontFamily: "Inter, sans-serif",
                      margin: 0,
                    }}>
                      No dreams yet. Create a dream first!
                    </p>
                  </div>
                )}
                {allDreams.map(function (dream) {
                  var cat = CATS[dream.category] || DEFAULT_CAT;
                  var CatIcon = cat.Icon;
                  var isGenerating = generating === dream.id;
                  return (
                    <div
                      key={dream.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 14,
                        marginTop: 6,
                        background: isLight ? "rgba(139,92,246,0.04)" : "rgba(255,255,255,0.03)",
                        border: "1px solid var(--dp-input-border)",
                        cursor: generating ? "not-allowed" : "pointer",
                        opacity: generating && !isGenerating ? 0.5 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      {/* Category icon */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: cat.gradient,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <CatIcon size={20} color="rgba(255,255,255,0.9)" strokeWidth={1.8} />
                      </div>

                      {/* Dream info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--dp-text)",
                          fontFamily: "Inter, sans-serif",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {dream.title}
                        </div>
                        <div style={{
                          fontSize: 12,
                          color: "var(--dp-text-tertiary)",
                          fontFamily: "Inter, sans-serif",
                          marginTop: 2,
                          textTransform: "capitalize",
                        }}>
                          {dream.category || "uncategorized"}
                        </div>
                      </div>

                      {/* Generate button */}
                      <button
                        onClick={function (e) {
                          e.stopPropagation();
                          if (!generating) generateForDream(dream.id);
                        }}
                        disabled={!!generating}
                        style={{
                          height: 34,
                          borderRadius: 10,
                          padding: "0 14px",
                          border: "none",
                          background: isGenerating
                            ? "linear-gradient(135deg, #6D28D9, #5B21B6)"
                            : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "Inter, sans-serif",
                          cursor: generating ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                          opacity: generating && !isGenerating ? 0.5 : 1,
                          boxShadow: isGenerating ? "0 4px 16px rgba(139,92,246,0.3)" : "none",
                          transition: "all 0.2s",
                        }}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 size={14} strokeWidth={2} style={{ animation: "vbSpin 1s linear infinite" }} />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} strokeWidth={2} />
                            Generate
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
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
          @keyframes vbSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </PageLayout>
  );
}
