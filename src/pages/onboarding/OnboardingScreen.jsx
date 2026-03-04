import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { BRAND, GRADIENTS } from "../../styles/colors";
import { useT } from "../../context/I18nContext";
import { apiPost } from "../../services/api";
import { USERS } from "../../services/endpoints";
import { useAuth } from "../../context/AuthContext";
import GradientButton from "../../components/shared/GradientButton";
import { Sparkles, Target, Users, Rocket, ChevronRight, ChevronLeft } from "lucide-react";

var SLIDE_DATA = [
  {
    icon: Sparkles,
    gradient: "linear-gradient(135deg, #8B5CF6, #EC4899)",
    titleKey: "onboarding.welcome.title",
    subtitleKey: "onboarding.welcome.subtitle",
    features: ["onboarding.welcome.f1", "onboarding.welcome.f2", "onboarding.welcome.f3"],
  },
  {
    icon: Target,
    gradient: "linear-gradient(135deg, #14B8A6, #10B981)",
    titleKey: "onboarding.track.title",
    subtitleKey: "onboarding.track.subtitle",
    features: ["onboarding.track.f1", "onboarding.track.f2", "onboarding.track.f3"],
  },
  {
    icon: Users,
    gradient: "linear-gradient(135deg, #F59E0B, #EF4444)",
    titleKey: "onboarding.connect.title",
    subtitleKey: "onboarding.connect.subtitle",
    features: ["onboarding.connect.f1", "onboarding.connect.f2", "onboarding.connect.f3"],
  },
  {
    icon: Rocket,
    gradient: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
    titleKey: "onboarding.start.title",
    subtitleKey: "onboarding.start.subtitle",
    features: [],
  },
];

export default function OnboardingScreen() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { t } = useT();
  var { updateUser } = useAuth();

  var SLIDES = useMemo(function () {
    return SLIDE_DATA.map(function (s) {
      return {
        icon: s.icon,
        gradient: s.gradient,
        title: t(s.titleKey),
        subtitle: t(s.subtitleKey),
        features: s.features.map(function (f) { return t(f); }),
      };
    });
  }, [t]);

  var [currentSlide, setCurrentSlide] = useState(0);
  var [direction, setDirection] = useState(0);
  var [animating, setAnimating] = useState(false);
  var [mounted, setMounted] = useState(false);
  var touchStartRef = useRef(null);

  useEffect(function () {
    setTimeout(function () { setMounted(true); }, 50);
  }, []);

  var completeOnboarding = useCallback(function () {
    localStorage.setItem("dp-onboarded", "true");
    apiPost(USERS.COMPLETE_ONBOARDING, { hasOnboarded: true })
      .then(function () { updateUser({ hasOnboarded: true }); })
      .catch(function () {});
    navigate("/");
  }, [navigate, updateUser]);

  var goToSlide = useCallback(function (newSlide, dir) {
    if (animating) return;
    if (newSlide < 0 || newSlide >= SLIDES.length) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(function () {
      setCurrentSlide(newSlide);
      setDirection(0);
      setAnimating(false);
    }, 300);
  }, [animating, SLIDES.length]);

  var goNext = useCallback(function () {
    if (currentSlide < SLIDES.length - 1) goToSlide(currentSlide + 1, 1);
  }, [currentSlide, goToSlide, SLIDES.length]);

  var goPrev = useCallback(function () {
    if (currentSlide > 0) goToSlide(currentSlide - 1, -1);
  }, [currentSlide, goToSlide]);

  useEffect(function () {
    function handleKeyDown(e) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Enter" && currentSlide === SLIDES.length - 1) completeOnboarding();
    }
    window.addEventListener("keydown", handleKeyDown);
    return function () { window.removeEventListener("keydown", handleKeyDown); };
  }, [goNext, goPrev, currentSlide, completeOnboarding, SLIDES.length]);

  function handlePointerDown(e) { touchStartRef.current = e.clientX; }
  function handlePointerUp(e) {
    if (touchStartRef.current === null) return;
    var diff = e.clientX - touchStartRef.current;
    touchStartRef.current = null;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goNext();
      else goPrev();
    }
  }

  var isLastSlide = currentSlide === SLIDES.length - 1;
  var slide = SLIDES[currentSlide];
  var SlideIcon = SLIDE_DATA[currentSlide].icon;

  var slideTransform = direction === 0 ? "translateX(0)" : direction === 1 ? "translateX(-40px)" : "translateX(40px)";
  var slideOpacity = direction === 0 ? 1 : 0;

  return (
    <div
      style={{ position: "fixed", inset: 0, overflow: "hidden" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      role="region"
      aria-label="Onboarding"
      aria-roledescription="carousel"
    >
      {/* Skip */}
      {!isLastSlide && (
        <button
          onClick={completeOnboarding}
          aria-label="Skip onboarding"
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 100,
            background: "transparent", border: "none", color: "var(--dp-text-muted)",
            fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
            padding: "12px 16px", borderRadius: 12, transition: "all 0.2s",
            opacity: mounted ? 1 : 0, minHeight: 44,
          }}
        >
          {t("onboarding.skip")}
        </button>
      )}

      {/* Progress bar at top */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", gap: 4, padding: "12px 20px",
        opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.2s",
      }}>
        {SLIDES.map(function (_, i) {
          return (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2, overflow: "hidden",
              background: "var(--dp-glass-border)",
            }}>
              <div style={{
                height: "100%", borderRadius: 2,
                width: i < currentSlide ? "100%" : i === currentSlide ? "50%" : "0%",
                background: BRAND.purple,
                transition: "width 0.5s cubic-bezier(0.16,1,0.3,1)",
              }} />
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "0 24px",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", maxWidth: 400, width: "100%",
          opacity: slideOpacity, transform: slideTransform,
          transition: direction !== 0 ? "opacity 0.3s ease, transform 0.3s ease" : "opacity 0.4s ease, transform 0.4s ease",
        }}
          role="tabpanel"
          aria-label={"Slide " + (currentSlide + 1) + " of " + SLIDES.length}
        >
          {/* Icon circle */}
          <div style={{
            width: 120, height: 120, borderRadius: "50%",
            background: SLIDE_DATA[currentSlide].gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 40, boxShadow: "0 8px 32px rgba(139,92,246,0.3)",
            opacity: mounted ? 1 : 0, transform: mounted ? "scale(1)" : "scale(0.8)",
            transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s",
          }}>
            <SlideIcon size={48} color="#fff" strokeWidth={1.5} />
          </div>

          <h1 style={{
            fontSize: 28, fontWeight: 700, color: "var(--dp-text)",
            marginBottom: 12, letterSpacing: "-0.5px", lineHeight: 1.2,
          }}>
            {slide.title}
          </h1>

          <p style={{
            fontSize: 16, color: "var(--dp-text-secondary)",
            lineHeight: 1.6, maxWidth: 320, margin: "0 auto",
          }}>
            {slide.subtitle}
          </p>

          {/* Feature bullets */}
          {slide.features.length > 0 && (
            <div style={{
              marginTop: 32, display: "flex", flexDirection: "column", gap: 12,
              textAlign: "left", width: "100%", maxWidth: 300,
            }}>
              {slide.features.map(function (f, i) {
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 16px", borderRadius: 12,
                    background: "var(--dp-glass-bg)",
                    border: "1px solid var(--dp-glass-border)",
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: BRAND.purple, flexShrink: 0,
                      boxShadow: "0 0 8px rgba(139,92,246,0.4)",
                    }} />
                    <span style={{ fontSize: 14, color: "var(--dp-text-primary)", fontWeight: 500 }}>{f}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ height: 48 }} />

        {/* Dot pagination */}
        <div role="tablist" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, marginBottom: 32,
          opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.3s",
        }}>
          {SLIDES.map(function (_, i) {
            return (
              <button
                key={i}
                role="tab"
                aria-selected={i === currentSlide}
                aria-label={"Go to slide " + (i + 1)}
                onClick={function () {
                  if (i !== currentSlide) goToSlide(i, i > currentSlide ? 1 : -1);
                }}
                style={{
                  width: i === currentSlide ? 28 : 8, height: 8, borderRadius: 4,
                  border: "none", cursor: "pointer", padding: 0,
                  background: i === currentSlide ? BRAND.purple : "var(--dp-accent-soft)",
                  transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                  boxShadow: i === currentSlide ? "0 0 12px rgba(139,92,246,0.4)" : "none",
                  minHeight: 44, minWidth: 44,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <div style={{
                  width: i === currentSlide ? 28 : 8, height: 8, borderRadius: 4,
                  background: i === currentSlide ? BRAND.purple : "var(--dp-accent-soft)",
                  transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                }} />
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{
          width: "100%", maxWidth: 400, padding: "0 8px",
          display: "flex", gap: 12, alignItems: "center",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.4s",
        }}>
          {currentSlide > 0 && (
            <button
              onClick={goPrev}
              aria-label="Previous slide"
              style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: "var(--dp-surface)", border: "1px solid var(--dp-input-border)",
                color: "var(--dp-text-secondary)", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          )}
          <div style={{ flex: 1 }}>
            {isLastSlide ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <GradientButton
                  gradient="primary"
                  onClick={function () { navigate("/onboarding/quiz"); }}
                  fullWidth
                  size="lg"
                  icon={Sparkles}
                  style={{ height: 56, borderRadius: 28, fontSize: 17, letterSpacing: "-0.2px" }}
                >
                  {t("onboarding.discoverType") || "Discover Your Dreamer Type"}
                </GradientButton>
                <button
                  onClick={completeOnboarding}
                  style={{
                    background: "transparent", border: "none",
                    color: "var(--dp-text-muted)", fontSize: 14, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", padding: "10px 0",
                    textAlign: "center", minHeight: 44,
                  }}
                >
                  {t("onboarding.skipQuiz") || "Skip for now"}
                </button>
              </div>
            ) : (
              <GradientButton
                gradient="primary"
                onClick={goNext}
                fullWidth
                size="lg"
                style={{ height: 56, borderRadius: 28, letterSpacing: "-0.2px" }}
              >
                {t("onboarding.next")}
                <ChevronRight size={18} strokeWidth={2} style={{ marginLeft: 4 }} />
              </GradientButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
