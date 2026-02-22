import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";

// ═══ DARK THEME CONFIG ═══
const DARK_STAR_LAYERS = [
  { count: 300, sizeRange: [0.3, 1.0], opacity: 0.35, parallax: 0.008 },
  { count: 200, sizeRange: [0.8, 1.8], opacity: 0.55, parallax: 0.02 },
  { count: 100, sizeRange: [1.2, 2.8], opacity: 0.85, parallax: 0.045 },
];
const DARK_STAR_COLORS = [
  [230, 225, 255], [200, 210, 255], [255, 220, 200],
  [180, 200, 255], [255, 200, 220], [220, 240, 255], [255, 240, 230],
];
const DARK_SMOKE_CYCLE = [
  [255, 120, 160], [255, 80, 180], [220, 60, 220], [180, 70, 255],
  [130, 80, 255], [80, 100, 255], [60, 140, 255], [80, 180, 240],
  [100, 200, 220], [160, 120, 255], [220, 100, 200], [255, 120, 160],
];
const DARK_NEBULAE = [
  { x: "8%", y: "15%", color1: "rgba(80,120,255,0.06)", color2: "rgba(60,80,200,0.015)", size: 500, blur: 90, speed: 35 },
  { x: "88%", y: "20%", color1: "rgba(100,140,255,0.05)", color2: "rgba(70,100,220,0.015)", size: 450, blur: 85, speed: 28 },
  { x: "12%", y: "75%", color1: "rgba(140,80,220,0.06)", color2: "rgba(100,50,180,0.015)", size: 430, blur: 80, speed: 32 },
  { x: "82%", y: "78%", color1: "rgba(120,70,200,0.05)", color2: "rgba(90,40,170,0.015)", size: 410, blur: 85, speed: 26 },
  { x: "50%", y: "92%", color1: "rgba(60,100,200,0.04)", color2: "rgba(40,70,160,0.01)", size: 550, blur: 100, speed: 40 },
  { x: "50%", y: "5%", color1: "rgba(90,60,180,0.04)", color2: "rgba(70,40,150,0.01)", size: 500, blur: 90, speed: 22 },
];

// ═══ LIGHT THEME CONFIG ═══
const LIGHT_STAR_LAYERS = [
  { count: 120, sizeRange: [0.3, 0.8], opacity: 0.2, parallax: 0.008 },
  { count: 80, sizeRange: [0.6, 1.2], opacity: 0.3, parallax: 0.02 },
  { count: 40, sizeRange: [0.8, 1.6], opacity: 0.4, parallax: 0.045 },
];
const LIGHT_STAR_COLORS = [
  [180, 160, 220], [160, 140, 200], [200, 170, 230],
  [140, 120, 190], [190, 160, 210], [170, 150, 210], [210, 180, 230],
];
const LIGHT_SMOKE_CYCLE = [
  [200, 170, 240], [190, 160, 250], [180, 150, 230], [170, 140, 245],
  [160, 150, 250], [150, 160, 240], [160, 170, 235], [170, 180, 245],
  [180, 170, 235], [190, 165, 240], [200, 160, 235], [200, 170, 240],
];
const LIGHT_NEBULAE = [
  { x: "8%", y: "15%", color1: "rgba(139,92,246,0.1)", color2: "rgba(139,92,246,0.03)", size: 500, blur: 100, speed: 35 },
  { x: "88%", y: "20%", color1: "rgba(196,181,253,0.12)", color2: "rgba(196,181,253,0.03)", size: 450, blur: 90, speed: 28 },
  { x: "12%", y: "75%", color1: "rgba(167,139,250,0.1)", color2: "rgba(167,139,250,0.03)", size: 430, blur: 85, speed: 32 },
  { x: "82%", y: "78%", color1: "rgba(139,92,246,0.08)", color2: "rgba(139,92,246,0.02)", size: 410, blur: 90, speed: 26 },
  { x: "50%", y: "92%", color1: "rgba(196,181,253,0.06)", color2: "rgba(196,181,253,0.015)", size: 550, blur: 110, speed: 40 },
  { x: "50%", y: "5%", color1: "rgba(167,139,250,0.07)", color2: "rgba(167,139,250,0.02)", size: 500, blur: 95, speed: 22 },
];

// ═══ SHARED CONFIG ═══
const SMOKE_CONFIGS = [
  { size: 350, opacity: 0.09, speedMult: 1.0, colorSpeed: 0.015, colorOffset: 0, pathFreqX: [0.13, 0.31], pathFreqY: [0.17, 0.23], pathAmpX: [0.38, 0.12], pathAmpY: [0.35, 0.10] },
  { size: 300, opacity: 0.07, speedMult: 1.3, colorSpeed: 0.02, colorOffset: 3, pathFreqX: [0.19, 0.41], pathFreqY: [0.23, 0.29], pathAmpX: [0.35, 0.15], pathAmpY: [0.32, 0.08] },
  { size: 250, opacity: 0.06, speedMult: 1.7, colorSpeed: 0.025, colorOffset: 6, pathFreqX: [0.29, 0.53], pathFreqY: [0.31, 0.37], pathAmpX: [0.33, 0.18], pathAmpY: [0.30, 0.12] },
  { size: 420, opacity: 0.05, speedMult: 0.6, colorSpeed: 0.01, colorOffset: 9, pathFreqX: [0.07, 0.19], pathFreqY: [0.11, 0.17], pathAmpX: [0.40, 0.10], pathAmpY: [0.38, 0.14] },
  { size: 280, opacity: 0.065, speedMult: 1.1, colorSpeed: 0.018, colorOffset: 4.5, pathFreqX: [0.17, 0.37], pathFreqY: [0.21, 0.43], pathAmpX: [0.36, 0.14], pathAmpY: [0.33, 0.11] },
];

function lerpColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function getSmokeColor(timeOffset, cycle) {
  const len = cycle.length;
  const idx = timeOffset % len;
  const floor = Math.floor(idx);
  return lerpColor(cycle[floor % len], cycle[(floor + 1) % len], idx - floor);
}

function generateStars(layer, w, h, colors) {
  const stars = [];
  for (let i = 0; i < layer.count; i++) {
    stars.push({
      x: Math.random() * w, y: Math.random() * h,
      size: layer.sizeRange[0] + Math.random() * (layer.sizeRange[1] - layer.sizeRange[0]),
      baseOpacity: layer.opacity * (0.4 + Math.random() * 0.6),
      twinkleSpeed: 0.3 + Math.random() * 2.5,
      twinkleOffset: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  return stars;
}

function generateShootingStar(w, h) {
  const edge = Math.floor(Math.random() * 3);
  let x, y, angle;
  if (edge === 0) { x = Math.random() * w; y = -20; angle = Math.PI * 0.3 + Math.random() * Math.PI * 0.4; }
  else if (edge === 1) { x = -20; y = Math.random() * h * 0.6; angle = Math.PI * 0.05 + Math.random() * Math.PI * 0.3; }
  else { x = w * 0.5 + Math.random() * w * 0.5; y = -20; angle = Math.PI * 0.4 + Math.random() * Math.PI * 0.3; }
  const speed = 5 + Math.random() * 8;
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, length: 80 + Math.random() * 140, life: 1, decay: 0.005 + Math.random() * 0.01, size: 0.8 + Math.random() * 1.8, warmth: Math.random() };
}

function buildNebulaKeyframes(nebulae) {
  return nebulae.map((neb, i) => {
    const dx1 = (Math.random() - 0.5) * 10;
    const dy1 = (Math.random() - 0.5) * 10;
    const dx2 = (Math.random() - 0.5) * 10;
    const dy2 = (Math.random() - 0.5) * 10;
    const s1 = 1 + Math.random() * 0.06;
    const o1 = 0.8 + Math.random() * 0.2;
    const s2 = 1 - Math.random() * 0.04;
    const o2 = 0.85 + Math.random() * 0.15;
    return `
      .dp-neb-${i} { animation: dpNF${i} ${neb.speed}s ease-in-out infinite; }
      @keyframes dpNF${i} {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        33% { transform: translate(calc(-50% + ${dx1}px), calc(-50% + ${dy1}px)) scale(${s1}); opacity: ${o1}; }
        66% { transform: translate(calc(-50% + ${dx2}px), calc(-50% + ${dy2}px)) scale(${s2}); opacity: ${o2}; }
      }
    `;
  }).join("\n");
}

const darkNebulaKeyframes = buildNebulaKeyframes(DARK_NEBULAE);
const lightNebulaKeyframes = buildNebulaKeyframes(LIGHT_NEBULAE);

export default function CosmicBackground() {
  const { resolved } = useTheme();
  const isLight = resolved === "light";

  const starCanvasRef = useRef(null);
  const smokeCanvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const driftRef = useRef({ x: 0, y: 0, angle: 0 });
  const starsRef = useRef([]);
  const shootingStarsRef = useRef([]);
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const themeRef = useRef(resolved);

  useEffect(() => { themeRef.current = resolved; }, [resolved]);

  const initStars = useCallback((w, h) => {
    const light = themeRef.current === "light";
    const layers = light ? LIGHT_STAR_LAYERS : DARK_STAR_LAYERS;
    const colors = light ? LIGHT_STAR_COLORS : DARK_STAR_COLORS;
    starsRef.current = layers.map((layer) => ({
      config: layer,
      stars: generateStars(layer, w * 1.3, h * 1.3, colors),
    }));
  }, []);

  useEffect(() => {
    const { w, h } = sizeRef.current;
    if (w > 0) initStars(w, h);
  }, [resolved, initStars]);

  useEffect(() => {
    const starCanvas = starCanvasRef.current;
    const smokeCanvas = smokeCanvasRef.current;
    if (!starCanvas || !smokeCanvas) return;
    const starCtx = starCanvas.getContext("2d");
    const smokeCtx = smokeCanvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      [starCanvas, smokeCanvas].forEach((c) => {
        c.width = w * dpr; c.height = h * dpr;
        c.style.width = w + "px"; c.style.height = h + "px";
      });
      starCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      smokeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      initStars(w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e) => {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      mouseRef.current.targetX = (e.clientX - cx) / cx;
      mouseRef.current.targetY = (e.clientY - cy) / cy;
    };
    const handleTouch = (e) => {
      if (e.touches.length > 0) {
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        mouseRef.current.targetX = (e.touches[0].clientX - cx) / cx * 0.5;
        mouseRef.current.targetY = (e.touches[0].clientY - cy) / cy * 0.5;
      }
    };
    const handleTouchEnd = () => { mouseRef.current.targetX = 0; mouseRef.current.targetY = 0; };

    window.addEventListener("mousemove", handleMouse);
    window.addEventListener("touchmove", handleTouch, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    const animate = () => {
      const { w, h } = sizeRef.current;
      const light = themeRef.current === "light";
      const smokeCycle = light ? LIGHT_SMOKE_CYCLE : DARK_SMOKE_CYCLE;
      const smokeOpMult = light ? 0.6 : 1;
      timeRef.current += 0.016;
      const t = timeRef.current;

      const drift = driftRef.current;
      drift.angle += 0.0008;
      drift.x = Math.sin(drift.angle * 0.7) * 0.15 + Math.sin(drift.angle * 1.3) * 0.08;
      drift.y = Math.cos(drift.angle * 0.5) * 0.12 + Math.cos(drift.angle * 1.1) * 0.06;

      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.03;
      m.y += (m.targetY - m.y) * 0.03;
      const moveX = drift.x + m.x * 0.4;
      const moveY = drift.y + m.y * 0.4;

      smokeCtx.clearRect(0, 0, w, h);
      SMOKE_CONFIGS.forEach((cfg) => {
        const st = t * cfg.speedMult;
        const px = 0.5 + cfg.pathAmpX[0] * Math.sin(st * cfg.pathFreqX[0]) + cfg.pathAmpX[1] * Math.sin(st * cfg.pathFreqX[1]);
        const py = 0.5 + cfg.pathAmpY[0] * Math.cos(st * cfg.pathFreqY[0]) + cfg.pathAmpY[1] * Math.cos(st * cfg.pathFreqY[1]);
        const sx = px * w, sy = py * h;
        const [cr, cg, cb] = getSmokeColor(cfg.colorOffset + t * cfg.colorSpeed, smokeCycle);
        const op = cfg.opacity * smokeOpMult;

        const gradient = smokeCtx.createRadialGradient(sx, sy, 0, sx, sy, cfg.size);
        gradient.addColorStop(0, `rgba(${cr | 0},${cg | 0},${cb | 0},${op})`);
        gradient.addColorStop(0.3, `rgba(${cr | 0},${cg | 0},${cb | 0},${op * 0.6})`);
        gradient.addColorStop(0.6, `rgba(${cr | 0},${cg | 0},${cb | 0},${op * 0.2})`);
        gradient.addColorStop(1, `rgba(${cr | 0},${cg | 0},${cb | 0},0)`);
        smokeCtx.fillStyle = gradient;
        smokeCtx.beginPath();
        smokeCtx.arc(sx, sy, cfg.size, 0, Math.PI * 2);
        smokeCtx.fill();

        const innerR = cfg.size * 0.4;
        const innerGrad = smokeCtx.createRadialGradient(sx, sy, 0, sx, sy, innerR);
        innerGrad.addColorStop(0, `rgba(${Math.min(cr + 40, 255) | 0},${Math.min(cg + 30, 255) | 0},${Math.min(cb + 30, 255) | 0},${op * 0.8})`);
        innerGrad.addColorStop(1, `rgba(${cr | 0},${cg | 0},${cb | 0},0)`);
        smokeCtx.fillStyle = innerGrad;
        smokeCtx.beginPath();
        smokeCtx.arc(sx, sy, innerR, 0, Math.PI * 2);
        smokeCtx.fill();
      });

      starCtx.clearRect(0, 0, w, h);
      starsRef.current.forEach(({ config, stars }) => {
        const offsetX = moveX * config.parallax * w + (w * 0.15);
        const offsetY = moveY * config.parallax * h + (h * 0.15);
        const fieldW = w * 1.3, fieldH = h * 1.3;

        stars.forEach((star) => {
          const twinkle = Math.sin(t * star.twinkleSpeed + star.twinkleOffset) * 0.35 + 0.65;
          const alpha = star.baseOpacity * twinkle;
          const sx = ((star.x - offsetX) % fieldW + fieldW) % fieldW - w * 0.15;
          const sy = ((star.y - offsetY) % fieldH + fieldH) % fieldH - h * 0.15;
          if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) return;
          const [r, g, b] = star.color;

          if (star.size > 1.5) {
            const grd = starCtx.createRadialGradient(sx, sy, 0, sx, sy, star.size * 4);
            grd.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.25})`);
            grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
            starCtx.fillStyle = grd;
            starCtx.beginPath();
            starCtx.arc(sx, sy, star.size * 4, 0, Math.PI * 2);
            starCtx.fill();
          }
          if (star.size > 2.2 && !light) {
            starCtx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.15})`;
            starCtx.lineWidth = 0.5;
            const fl = star.size * 6 * twinkle;
            starCtx.beginPath();
            starCtx.moveTo(sx - fl, sy); starCtx.lineTo(sx + fl, sy);
            starCtx.moveTo(sx, sy - fl); starCtx.lineTo(sx, sy + fl);
            starCtx.stroke();
          }
          starCtx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          starCtx.beginPath();
          starCtx.arc(sx, sy, star.size, 0, Math.PI * 2);
          starCtx.fill();
        });
      });

      const shootChance = light ? 0.008 : 0.025;
      if (Math.random() < shootChance) shootingStarsRef.current.push(generateShootingStar(w, h));
      if (!light && Math.random() < 0.003) {
        for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) shootingStarsRef.current.push(generateShootingStar(w, h));
      }

      shootingStarsRef.current = shootingStarsRef.current.filter((s) => {
        s.x += s.vx; s.y += s.vy; s.life -= s.decay;
        if (s.life <= 0) return false;
        const alpha = s.life * s.life;
        const mag = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        const dx = s.vx / mag, dy = s.vy / mag;
        const tailX = s.x - dx * s.length * alpha, tailY = s.y - dy * s.length * alpha;
        const cr = light ? 160 : (s.warmth > 0.5 ? 255 : 200);
        const cg = light ? 140 : (s.warmth > 0.5 ? 220 : 210);
        const cb = light ? 220 : (s.warmth > 0.5 ? 200 : 255);

        const grd = starCtx.createLinearGradient(tailX, tailY, s.x, s.y);
        grd.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
        grd.addColorStop(0.5, `rgba(${cr},${cg},${cb},${alpha * 0.25})`);
        grd.addColorStop(1, `rgba(${light ? 139 : 255},${light ? 92 : 255},${light ? 246 : 255},${alpha * (light ? 0.5 : 0.9)})`);
        starCtx.strokeStyle = grd; starCtx.lineWidth = s.size * (light ? 0.6 : 1); starCtx.lineCap = "round";
        starCtx.beginPath(); starCtx.moveTo(tailX, tailY); starCtx.lineTo(s.x, s.y); starCtx.stroke();

        if (!light) {
          const headGlow = starCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 5);
          headGlow.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
          headGlow.addColorStop(0.5, `rgba(${cr},${cg},${cb},${alpha * 0.3})`);
          headGlow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          starCtx.fillStyle = headGlow;
          starCtx.beginPath(); starCtx.arc(s.x, s.y, 5, 0, Math.PI * 2); starCtx.fill();
        }
        return true;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [initStars]);

  const nebulae = isLight ? LIGHT_NEBULAE : DARK_NEBULAE;
  const bgGradient = isLight
    ? "radial-gradient(ellipse at 50% 50%, #f0ecff 0%, #e8e0ff 35%, #f5f3ff 70%, #faf8ff 100%)"
    : "radial-gradient(ellipse at 50% 50%, #0c081a 0%, #070412 35%, #03010a 70%, #000005 100%)";
  const vignette = isLight
    ? "radial-gradient(ellipse at center, transparent 40%, rgba(232,224,255,0.4) 80%, rgba(240,236,255,0.6) 100%)"
    : "radial-gradient(ellipse at center, transparent 30%, rgba(3,1,10,0.5) 70%, rgba(0,0,5,0.8) 100%)";

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: bgGradient, zIndex: 0, transition: "background 0.5s ease" }}>
      {nebulae.map((neb, i) => (
        <div key={`${resolved}-${i}`} className={`dp-neb-${i}`} style={{
          position: "absolute", left: neb.x, top: neb.y, width: neb.size, height: neb.size,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${neb.color1} 0%, ${neb.color2} 40%, transparent 70%)`,
          filter: `blur(${neb.blur}px)`, pointerEvents: "none",
        }} />
      ))}
      <canvas ref={smokeCanvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: isLight ? "soft-light" : "screen", opacity: isLight ? 0.3 : 1 }} />
      <canvas ref={starCanvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: isLight ? 0.3 : 1 }} />
      {!isLight && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", opacity: 0.5,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
        }} />
      )}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: vignette }} />
      <style>{isLight ? lightNebulaKeyframes : darkNebulaKeyframes}</style>
    </div>
  );
}
