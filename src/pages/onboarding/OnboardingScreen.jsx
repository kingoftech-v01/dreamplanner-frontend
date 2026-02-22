import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useT } from "../../context/I18nContext";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Onboarding Walkthrough
 *
 * A beautiful 4-slide onboarding flow with glassmorphic design,
 * smooth transitions, swipe support, and keyboard navigation.
 * ═══════════════════════════════════════════════════════════════════ */

const SLIDE_DATA = [
  { emojis: ["✨", "🌙", "💜"], titleKey: "onboarding.welcome.title", subtitleKey: "onboarding.welcome.subtitle" },
  { emojis: ["🎯", "📈", "🏆"], titleKey: "onboarding.track.title", subtitleKey: "onboarding.track.subtitle" },
  { emojis: ["👥", "💬", "🤝"], titleKey: "onboarding.connect.title", subtitleKey: "onboarding.connect.subtitle" },
  { emojis: ["🚀", "⭐", "🌟"], titleKey: "onboarding.start.title", subtitleKey: "onboarding.start.subtitle" },
];

export default function OnboardingScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const { t } = useT();

  const SLIDES = useMemo(() => SLIDE_DATA.map(s => ({
    emojis: s.emojis,
    title: t(s.titleKey),
    subtitle: t(s.subtitleKey),
  })), [t]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0); // -1 = left, 0 = none, 1 = right
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const touchStartRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // ─── COMPLETE ONBOARDING ──────────────────────────────────────
  const completeOnboarding = useCallback(() => {
    localStorage.setItem("dp-onboarded", "true");
    navigate("/");
  }, [navigate]);

  // ─── SLIDE NAVIGATION ────────────────────────────────────────
  const goToSlide = useCallback((newSlide, dir) => {
    if (animating) return;
    if (newSlide < 0 || newSlide >= SLIDES.length) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrentSlide(newSlide);
      setDirection(0);
      setAnimating(false);
    }, 300);
  }, [animating]);

  const goNext = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      goToSlide(currentSlide + 1, 1);
    }
  }, [currentSlide, goToSlide]);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1, -1);
    }
  }, [currentSlide, goToSlide]);

  // ─── KEYBOARD NAVIGATION ─────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Enter" && currentSlide === SLIDES.length - 1) {
        completeOnboarding();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, currentSlide, completeOnboarding]);

  // ─── SWIPE SUPPORT ───────────────────────────────────────────
  function handlePointerDown(e) {
    touchStartRef.current = e.clientX;
  }

  function handlePointerUp(e) {
    if (touchStartRef.current === null) return;
    var diff = e.clientX - touchStartRef.current;
    touchStartRef.current = null;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goNext();  // swipe left = next
      else goPrev();           // swipe right = prev
    }
  }

  // ─── DERIVED STATE ───────────────────────────────────────────
  const isLastSlide = currentSlide === SLIDES.length - 1;
  const slide = SLIDES[currentSlide];
  const primaryColor = isLight ? "#1A1535" : "rgba(255,255,255,0.95)";
  const subtitleColor = isLight ? "rgba(26,21,53,0.6)" : "rgba(255,255,255,0.6)";

  // ─── ANIMATION STYLES ────────────────────────────────────────
  const slideTransform = direction === 0
    ? "translateX(0)"
    : direction === 1
      ? "translateX(-40px)"
      : "translateX(40px)";
  const slideOpacity = direction === 0 ? 1 : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >

      {/* ═══ SKIP BUTTON ═══ */}
      {!isLastSlide && (
        <button
          onClick={completeOnboarding}
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 100,
            background: "transparent",
            border: "none",
            color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.5)",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            padding: "8px 12px",
            borderRadius: 12,
            transition: "all 0.2s",
            opacity: mounted ? 1 : 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = isLight ? "#7C3AED" : "rgba(255,255,255,0.8)";
            e.currentTarget.style.background = isLight ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.5)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          {t("onboarding.skip")}
        </button>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
        }}
      >
        {/* ── Slide Content ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 400,
            width: "100%",
            opacity: slideOpacity,
            transform: slideTransform,
            transition: direction !== 0
              ? "opacity 0.3s ease, transform 0.3s ease"
              : "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          {/* ── Emoji Composition ── */}
          <div
            style={{
              position: "relative",
              width: 160,
              height: 120,
              marginBottom: 48,
              opacity: mounted ? 1 : 0,
              transform: mounted ? "scale(1)" : "scale(0.8)",
              transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s",
            }}
          >
            {/* Left emoji */}
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 20,
                fontSize: 44,
                transform: "rotate(-12deg)",
                filter: "drop-shadow(0 4px 12px rgba(139,92,246,0.2))",
              }}
            >
              {slide.emojis[0]}
            </span>
            {/* Center emoji (top) */}
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                transform: "translateX(-50%)",
                fontSize: 52,
                filter: "drop-shadow(0 4px 16px rgba(139,92,246,0.25))",
              }}
            >
              {slide.emojis[1]}
            </span>
            {/* Right emoji */}
            <span
              style={{
                position: "absolute",
                right: 0,
                top: 20,
                fontSize: 44,
                transform: "rotate(12deg)",
                filter: "drop-shadow(0 4px 12px rgba(139,92,246,0.2))",
              }}
            >
              {slide.emojis[2]}
            </span>
          </div>

          {/* ── Title ── */}
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: primaryColor,
              marginBottom: 14,
              letterSpacing: "-0.5px",
              lineHeight: 1.2,
            }}
          >
            {slide.title}
          </h1>

          {/* ── Subtitle ── */}
          <p
            style={{
              fontSize: 16,
              color: subtitleColor,
              lineHeight: 1.6,
              maxWidth: 320,
              margin: "0 auto",
            }}
          >
            {slide.subtitle}
          </p>
        </div>

        {/* ── Spacer ── */}
        <div style={{ height: 64 }} />

        {/* ── Dot Pagination ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 40,
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.6s ease 0.3s",
          }}
        >
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => {
                if (i !== currentSlide) {
                  goToSlide(i, i > currentSlide ? 1 : -1);
                }
              }}
              style={{
                width: i === currentSlide ? 28 : 8,
                height: 8,
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                padding: 0,
                background:
                  i === currentSlide
                    ? "#8B5CF6"
                    : isLight
                      ? "rgba(139,92,246,0.18)"
                      : "rgba(255,255,255,0.18)",
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                boxShadow:
                  i === currentSlide
                    ? "0 0 12px rgba(139,92,246,0.4)"
                    : "none",
              }}
            />
          ))}
        </div>

        {/* ── Action Button ── */}
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "0 8px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.4s",
          }}
        >
          {isLastSlide ? (
            /* ── Get Started (full-width glow button) ── */
            <button
              onClick={completeOnboarding}
              style={{
                width: "100%",
                height: 56,
                borderRadius: 28,
                border: "none",
                background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                color: "#fff",
                fontSize: 17,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                letterSpacing: "-0.2px",
                boxShadow: "0 4px 24px rgba(139,92,246,0.45), 0 0 48px rgba(139,92,246,0.15)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 6px 32px rgba(139,92,246,0.55), 0 0 64px rgba(139,92,246,0.25)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(139,92,246,0.45), 0 0 48px rgba(139,92,246,0.15)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {t("onboarding.getStarted")}
            </button>
          ) : (
            /* ── Next (glass pill button) ── */
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={goNext}
                style={{
                  height: 50,
                  paddingLeft: 36,
                  paddingRight: 36,
                  borderRadius: 25,
                  border: "none",
                  background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  letterSpacing: "-0.2px",
                  boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
                  transition: "all 0.3s ease",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(139,92,246,0.5)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,92,246,0.4)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {t("onboarding.next")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ STYLES ═══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
