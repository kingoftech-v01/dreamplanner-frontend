import { useState, useEffect, useRef, useCallback } from "react";
import { playSound } from "../../services/sounds";
import { playHapticPattern } from "../../services/native";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — CelebrationOverlay
 *
 * Full-screen celebration overlay with CSS-only animations.
 * Supports: confetti, fireworks, stars, trophy animation types.
 * Auto-dismisses after 5s or on tap/click.
 * ═══════════════════════════════════════════════════════════════════ */

var CONFETTI_COLORS = [
  "#8B5CF6", "#EC4899", "#10B981", "#FCD34D", "#6366F1",
  "#F59E0B", "#14B8A6", "#EF4444", "#3B82F6", "#A855F7",
];

var CONFETTI_COUNT = 55;
var FIREWORK_COUNT = 36;
var STAR_COUNT = 30;

/* ── Generate confetti pieces with random properties ── */
function buildConfettiPieces() {
  var pieces = [];
  for (var i = 0; i < CONFETTI_COUNT; i++) {
    pieces.push({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      size: 5 + Math.random() * 9,
      duration: 2.2 + Math.random() * 2.3,
      rotation: Math.floor(Math.random() * 360),
      shape: Math.random() > 0.6 ? "circle" : Math.random() > 0.3 ? "rect" : "strip",
      drift: (Math.random() - 0.5) * 80,
    });
  }
  return pieces;
}

/* ── Generate firework burst particles ── */
function buildFireworkParticles() {
  var particles = [];
  for (var i = 0; i < FIREWORK_COUNT; i++) {
    var angle = (i / FIREWORK_COUNT) * 360;
    var rad = (angle * Math.PI) / 180;
    var dist = 80 + Math.random() * 100;
    particles.push({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      tx: Math.cos(rad) * dist,
      ty: Math.sin(rad) * dist,
      delay: Math.random() * 0.3,
      size: 4 + Math.random() * 5,
      duration: 0.8 + Math.random() * 0.6,
    });
  }
  return particles;
}

/* ── Generate twinkling stars ── */
function buildStarParticles() {
  var stars = [];
  for (var i = 0; i < STAR_COUNT; i++) {
    stars.push({
      id: i,
      left: 10 + Math.random() * 80,
      top: 10 + Math.random() * 80,
      size: 10 + Math.random() * 18,
      delay: Math.random() * 1.5,
      duration: 0.6 + Math.random() * 0.8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    });
  }
  return stars;
}

/* ── Render confetti animation ── */
function ConfettiAnimation() {
  var piecesRef = useRef(buildConfettiPieces());
  var pieces = piecesRef.current;

  return pieces.map(function (p) {
    var shapeStyle = {};
    if (p.shape === "circle") {
      shapeStyle.borderRadius = "50%";
      shapeStyle.width = p.size;
      shapeStyle.height = p.size;
    } else if (p.shape === "strip") {
      shapeStyle.borderRadius = 1;
      shapeStyle.width = p.size * 0.35;
      shapeStyle.height = p.size * 1.6;
    } else {
      shapeStyle.borderRadius = 2;
      shapeStyle.width = p.size;
      shapeStyle.height = p.size * 0.6;
    }

    return (
      <div key={p.id} style={Object.assign({
        position: "fixed",
        top: -20,
        left: p.left + "%",
        background: p.color,
        opacity: 0,
        zIndex: 10001,
        transform: "rotate(" + p.rotation + "deg)",
        animation: "dpCelebConfetti " + p.duration + "s " + p.delay + "s ease-in forwards",
      }, shapeStyle)} />
    );
  });
}

/* ── Render fireworks animation ── */
function FireworksAnimation() {
  var particlesRef = useRef(buildFireworkParticles());
  var particles = particlesRef.current;

  return (
    <div style={{
      position: "fixed", top: "40%", left: "50%",
      transform: "translate(-50%, -50%)", zIndex: 10001,
    }}>
      {particles.map(function (p) {
        return (
          <div key={p.id} style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            boxShadow: "0 0 6px " + p.color,
            opacity: 0,
            animation: "dpCelebFirework " + p.duration + "s " + p.delay + "s ease-out forwards",
            "--fw-tx": p.tx + "px",
            "--fw-ty": p.ty + "px",
          }} />
        );
      })}
    </div>
  );
}

/* ── Render twinkling stars animation ── */
function StarsAnimation() {
  var starsRef = useRef(buildStarParticles());
  var stars = starsRef.current;

  return stars.map(function (s) {
    return (
      <div key={s.id} style={{
        position: "fixed",
        left: s.left + "%",
        top: s.top + "%",
        fontSize: s.size,
        opacity: 0,
        zIndex: 10001,
        animation: "dpCelebStar " + s.duration + "s " + s.delay + "s ease-in-out forwards",
        color: s.color,
        textShadow: "0 0 8px " + s.color,
        pointerEvents: "none",
      }}>
        &#9733;
      </div>
    );
  });
}

/* ── Render trophy bounce animation ── */
function TrophyAnimation() {
  return (
    <div style={{
      position: "fixed",
      top: "30%", left: "50%",
      transform: "translate(-50%, -50%)",
      fontSize: 80,
      zIndex: 10001,
      animation: "dpCelebTrophy 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      opacity: 0,
      filter: "drop-shadow(0 0 20px rgba(252, 211, 77, 0.6))",
      pointerEvents: "none",
    }}>
      &#127942;
    </div>
  );
}

/* ── Animation selector ── */
function AnimationLayer({ animationType }) {
  if (animationType === "fireworks") return <FireworksAnimation />;
  if (animationType === "stars") return <StarsAnimation />;
  if (animationType === "trophy") return <><TrophyAnimation /><ConfettiAnimation /></>;
  return <ConfettiAnimation />;
}

/* ── Main CelebrationOverlay component ── */
export default function CelebrationOverlay({ celebration, onDismiss }) {
  var [visible, setVisible] = useState(false);
  var [exiting, setExiting] = useState(false);
  var timerRef = useRef(null);

  var handleDismiss = useCallback(function () {
    if (exiting) return;
    setExiting(true);
    clearTimeout(timerRef.current);
    setTimeout(function () {
      setVisible(false);
      setExiting(false);
      if (onDismiss) onDismiss();
    }, 400);
  }, [exiting, onDismiss]);

  useEffect(function () {
    if (!celebration) {
      setVisible(false);
      return;
    }
    setVisible(true);
    setExiting(false);

    // Play celebration sound + haptic
    playSound("achievement");
    playHapticPattern("achievement");

    // Auto-dismiss after 5 seconds
    timerRef.current = setTimeout(function () {
      handleDismiss();
    }, 5000);

    return function () { clearTimeout(timerRef.current); };
  }, [celebration]);

  if (!visible || !celebration) return null;

  var animationType = celebration.animation_type || celebration.animationType || "confetti";
  var emoji = celebration.emoji || "\u{1F389}";
  var message = celebration.message || "Amazing work!";
  var shareText = celebration.share_text || celebration.shareText || "";

  var handleShare = function (e) {
    e.stopPropagation();
    if (navigator.share && shareText) {
      navigator.share({ text: shareText }).catch(function () {});
    } else if (shareText) {
      navigator.clipboard.writeText(shareText).catch(function () {});
    }
  };

  return (
    <>
      <div
        onClick={handleDismiss}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          opacity: exiting ? 0 : 1,
          transition: "opacity 0.4s ease",
          cursor: "pointer",
        }}
      >
        {/* Animation layer */}
        <AnimationLayer animationType={animationType} />

        {/* Card */}
        <div
          onClick={function (e) { e.stopPropagation(); }}
          style={{
            background: "var(--dp-modal-bg, rgba(30,20,60,0.92))",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            borderRadius: 24,
            padding: "40px 32px 32px",
            textAlign: "center",
            maxWidth: 340,
            width: "90%",
            border: "1px solid var(--dp-glass-border, rgba(255,255,255,0.08))",
            boxShadow: "0 20px 60px rgba(139,92,246,0.3), 0 0 100px rgba(139,92,246,0.1)",
            animation: exiting
              ? "dpCelebCardOut 0.4s ease forwards"
              : "dpCelebCardIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            zIndex: 10002,
            position: "relative",
          }}
        >
          {/* Emoji */}
          <div style={{
            fontSize: 56,
            marginBottom: 16,
            animation: "dpCelebEmojiBounce 0.6s 0.3s ease-out both",
            lineHeight: 1,
          }}>
            {emoji}
          </div>

          {/* Message */}
          <p style={{
            fontSize: 16,
            lineHeight: 1.6,
            margin: "0 0 20px",
            color: "var(--dp-text-secondary, rgba(255,255,255,0.8))",
            fontWeight: 500,
          }}>
            {message}
          </p>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {shareText && (
              <button
                onClick={handleShare}
                style={{
                  padding: "10px 24px",
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  boxShadow: "0 4px 16px rgba(139,92,246,0.3)",
                }}
              >
                Share
              </button>
            )}
            <button
              onClick={handleDismiss}
              style={{
                padding: "10px 24px",
                borderRadius: 14,
                border: "1px solid var(--dp-glass-border, rgba(255,255,255,0.12))",
                cursor: "pointer",
                background: "var(--dp-pill-bg, rgba(255,255,255,0.06))",
                color: "var(--dp-text-primary, rgba(255,255,255,0.9))",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* CSS Keyframes — injected once */}
      <style>{"\
        @keyframes dpCelebConfetti {\
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }\
          25% { opacity: 1; }\
          100% { transform: translateY(100vh) translateX(var(--drift, 40px)) rotate(720deg); opacity: 0; }\
        }\
        @keyframes dpCelebFirework {\
          0% { transform: translate(0, 0) scale(1); opacity: 1; }\
          70% { opacity: 1; }\
          100% { transform: translate(var(--fw-tx), var(--fw-ty)) scale(0.3); opacity: 0; }\
        }\
        @keyframes dpCelebStar {\
          0% { transform: scale(0) rotate(0deg); opacity: 0; }\
          30% { transform: scale(1.3) rotate(72deg); opacity: 1; }\
          60% { transform: scale(0.9) rotate(144deg); opacity: 0.8; }\
          80% { transform: scale(1.1) rotate(216deg); opacity: 0.6; }\
          100% { transform: scale(0) rotate(360deg); opacity: 0; }\
        }\
        @keyframes dpCelebTrophy {\
          0% { transform: translate(-50%, -50%) scale(0) rotate(-20deg); opacity: 0; }\
          50% { transform: translate(-50%, -50%) scale(1.3) rotate(5deg); opacity: 1; }\
          70% { transform: translate(-50%, -50%) scale(0.9) rotate(-3deg); opacity: 1; }\
          100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }\
        }\
        @keyframes dpCelebCardIn {\
          0% { transform: scale(0.5); opacity: 0; }\
          50% { transform: scale(1.08); }\
          100% { transform: scale(1); opacity: 1; }\
        }\
        @keyframes dpCelebCardOut {\
          0% { transform: scale(1); opacity: 1; }\
          100% { transform: scale(0.85); opacity: 0; }\
        }\
        @keyframes dpCelebEmojiBounce {\
          0% { transform: scale(0) translateY(20px); opacity: 0; }\
          50% { transform: scale(1.4) translateY(-10px); opacity: 1; }\
          75% { transform: scale(0.9) translateY(3px); }\
          100% { transform: scale(1) translateY(0); opacity: 1; }\
        }\
      "}</style>
    </>
  );
}
