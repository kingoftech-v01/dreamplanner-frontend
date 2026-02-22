import { useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Saturn Sky Background (Standalone)
 *
 * A unique cosmic background featuring:
 * - Deep space sky gradient (black → navy → orange sunset → dark)
 * - 8 deep space gas nebulae (gray/green/blue, slow drift, pulse)
 * - 3 aurora shimmer bands (subtle green/blue waves)
 * - 500 stars with warm/cool hue variation, twinkle, flicker
 * - Shooting stars (random spawn)
 * - Red/orange pulsing star (top left)
 * - Giant blue planet with atmosphere rim + rotating bands
 * - Saturn with rings (front + back) + rotating bands
 * - 5-layer volumetric clouds (42 total) with FBM noise edges
 *   and orange sunset rim lighting from below
 * - Sunset horizon glow line
 * - Film grain overlay
 *
 * Usage:
 *   <SaturnBackground />
 *   or wrap children:
 *   <SaturnBackground><YourUI /></SaturnBackground>
 * ═══════════════════════════════════════════════════════════════════ */

// ─── 2D PERLIN NOISE for realistic clouds ──────────────────────
var P = new Uint8Array(512);
(function () {
  var p = []; for (var i = 0; i < 256; i++) p[i] = i;
  for (var i2 = 255; i2 > 0; i2--) { var j = Math.floor(Math.random() * (i2 + 1)); var tmp = p[i2]; p[i2] = p[j]; p[j] = tmp; }
  for (var k = 0; k < 512; k++) P[k] = p[k & 255];
})();
function fade(t2) { return t2 * t2 * t2 * (t2 * (t2 * 6 - 15) + 10); }
function lerp2(a, b, t2) { return a + t2 * (b - a); }
function grad2(hash, x, y) {
  var h = hash & 3;
  return (h === 0 ? x + y : h === 1 ? -x + y : h === 2 ? x - y : -x - y);
}
function perlin2(x, y) {
  var xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
  var xf = x - Math.floor(x), yf = y - Math.floor(y);
  var u = fade(xf), v = fade(yf);
  var aa = P[P[xi] + yi], ab = P[P[xi] + yi + 1];
  var ba = P[P[xi + 1] + yi], bb = P[P[xi + 1] + yi + 1];
  return lerp2(
    lerp2(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u),
    lerp2(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u), v
  );
}
function fbm2(x, y, oct) {
  var v = 0, a = 0.5, f = 1;
  for (var i = 0; i < oct; i++) { v += a * perlin2(x * f, y * f); a *= 0.5; f *= 2; }
  return v;
}
// 1D fbm for aurora
function fbm(x, oct) {
  var v = 0, a = 0.5, f = 1;
  for (var i = 0; i < oct; i++) { v += a * (perlin2(x * f, 0.5) * 0.5 + 0.5); a *= 0.5; f *= 2; }
  return v;
}

// ─── STAR GENERATION ────────────────────────────────────────────
function mkStars(count, w, h) {
  var s = [];
  for (var i = 0; i < count; i++) {
    s.push({
      x: Math.random() * w * 1.1,
      y: Math.random() * h * 0.6,
      sz: 0.2 + Math.random() * 2.2,
      op: 0.15 + Math.random() * 0.75,
      ts: 0.3 + Math.random() * 2.5,
      to: Math.random() * Math.PI * 2,
      hue: Math.random(),
    });
  }
  return s;
}

// ─── SHOOTING STAR ──────────────────────────────────────────────
function mkShoot(w, h) {
  var x = Math.random() * w * 0.8, y = Math.random() * h * 0.3;
  var a = Math.PI * 0.2 + Math.random() * Math.PI * 0.4;
  var sp = 6 + Math.random() * 10;
  return { x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ln: 60 + Math.random() * 120, life: 1, dc: 0.006 + Math.random() * 0.012, sz: 0.6 + Math.random() * 1.5 };
}

// ─── DEEP SPACE GAS NEBULAE ─────────────────────────────────────
var GAS_CLOUDS = [
  { cx: 0.15, cy: 0.22, sz: 320, r: 60, g: 80, b: 70, op: 0.04, spd: 0.003 },
  { cx: 0.80, cy: 0.18, sz: 280, r: 50, g: 90, b: 80, op: 0.035, spd: 0.004 },
  { cx: 0.45, cy: 0.12, sz: 400, r: 70, g: 70, b: 90, op: 0.03, spd: 0.002 },
  { cx: 0.25, cy: 0.45, sz: 250, r: 55, g: 100, b: 75, op: 0.025, spd: 0.005 },
  { cx: 0.70, cy: 0.40, sz: 350, r: 80, g: 80, b: 100, op: 0.03, spd: 0.003 },
  { cx: 0.10, cy: 0.55, sz: 220, r: 65, g: 95, b: 70, op: 0.02, spd: 0.004 },
  { cx: 0.90, cy: 0.50, sz: 260, r: 50, g: 75, b: 95, op: 0.028, spd: 0.003 },
  { cx: 0.55, cy: 0.30, sz: 180, r: 40, g: 110, b: 60, op: 0.02, spd: 0.006 },
];

// ═══════════════════════════════════════════════════════════════════
export default function SaturnBackground({ children }) {
  var cvRef = useRef(null);
  var starsRef = useRef([]);
  var shootRef = useRef([]);
  var szRef = useRef({ w: 0, h: 0 });
  var afRef = useRef(null);
  var tRef = useRef(0);
  // Offscreen cloud buffer — re-rendered periodically, composited each frame
  var cloudCvRef = useRef(null);
  var cloudLastT = useRef(-1);

  var init = useCallback(function (w, h) { starsRef.current = mkStars(500, w, h); }, []);

  useEffect(function () {
    var cv = cvRef.current; if (!cv) return;
    var ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
    var rs = function () {
      var w = window.innerWidth, h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      szRef.current = { w: w, h: h }; init(w, h);
    };
    rs(); window.addEventListener("resize", rs);

    var go = function () {
      var w = szRef.current.w, h = szRef.current.h;
      if (w === 0) { afRef.current = requestAnimationFrame(go); return; }
      tRef.current += 0.016; var t = tRef.current;
      ctx.clearRect(0, 0, w, h);

      // ── SKY GRADIENT ──
      var sg = ctx.createLinearGradient(0, 0, 0, h);
      sg.addColorStop(0, "rgb(2,3,8)");
      sg.addColorStop(0.12, "rgb(4,7,18)");
      sg.addColorStop(0.30, "rgb(10,16,40)");
      sg.addColorStop(0.48, "rgb(16,22,55)");
      sg.addColorStop(0.58, "rgb(28,30,58)");
      sg.addColorStop(0.66, "rgb(60,42,50)");
      sg.addColorStop(0.72, "rgb(130,70,45)");
      sg.addColorStop(0.77, "rgb(195,110,50)");
      sg.addColorStop(0.81, "rgb(210,135,60)");
      sg.addColorStop(0.85, "rgb(160,85,48)");
      sg.addColorStop(0.91, "rgb(50,32,32)");
      sg.addColorStop(1.0, "rgb(8,6,10)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);

      // ── DEEP SPACE GAS / NEBULAE ──
      GAS_CLOUDS.forEach(function (gc) {
        var ox = Math.sin(t * gc.spd + gc.cx * 10) * w * 0.04;
        var oy = Math.cos(t * gc.spd * 0.7 + gc.cy * 8) * h * 0.02;
        var x = gc.cx * w + ox, y = gc.cy * h + oy;
        var pulse = 1 + Math.sin(t * gc.spd * 2 + gc.cx * 5) * 0.15;
        var sz = gc.sz * pulse;
        var gr = ctx.createRadialGradient(x, y, 0, x, y, sz);
        gr.addColorStop(0, "rgba(" + gc.r + "," + gc.g + "," + gc.b + "," + (gc.op * 1.2) + ")");
        gr.addColorStop(0.3, "rgba(" + gc.r + "," + gc.g + "," + gc.b + "," + (gc.op * 0.7) + ")");
        gr.addColorStop(0.6, "rgba(" + gc.r + "," + gc.g + "," + gc.b + "," + (gc.op * 0.25) + ")");
        gr.addColorStop(1, "rgba(" + gc.r + "," + gc.g + "," + gc.b + ",0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();
        var ig = ctx.createRadialGradient(x, y, 0, x, y, sz * 0.3);
        ig.addColorStop(0, "rgba(" + Math.min(255, gc.r + 30) + "," + Math.min(255, gc.g + 20) + "," + Math.min(255, gc.b + 20) + "," + (gc.op * 0.6) + ")");
        ig.addColorStop(1, "rgba(" + gc.r + "," + gc.g + "," + gc.b + ",0)");
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(x, y, sz * 0.3, 0, Math.PI * 2); ctx.fill();
      });

      // ── AURORA SHIMMER ──
      for (var ai = 0; ai < 3; ai++) {
        var ay = h * (0.25 + ai * 0.12);
        var aW = h * 0.08;
        for (var ax = 0; ax < w; ax += 3) {
          var n = fbm((ax * 0.003 + t * 0.02 + ai * 2), 3);
          var ay2 = ay + Math.sin(ax * 0.008 + t * 0.15 + ai) * 20 + n * 30;
          var aOp = n * 0.025 * (1 + Math.sin(t * 0.3 + ai * 1.5) * 0.4);
          if (aOp < 0.003) continue;
          var aR = ai === 0 ? 60 : (ai === 1 ? 40 : 70);
          var aG = ai === 0 ? 120 : (ai === 1 ? 90 : 60);
          var aB = ai === 0 ? 100 : (ai === 1 ? 130 : 120);
          ctx.fillStyle = "rgba(" + aR + "," + aG + "," + aB + "," + aOp + ")";
          ctx.fillRect(ax, ay2, 3, aW * n);
        }
      }

      // ── STARS ──
      starsRef.current.forEach(function (s) {
        var tw = Math.sin(t * s.ts + s.to) * 0.35 + 0.65;
        var flicker = Math.sin(t * 7 + s.to * 3) > 0.95 ? 0.3 : 1;
        var a = s.op * tw * flicker;
        if (a < 0.03) return;
        var r = s.hue > 0.7 ? 255 : (s.hue > 0.4 ? 220 : 200);
        var g = s.hue > 0.7 ? 200 : (s.hue > 0.4 ? 225 : 210);
        var b2 = s.hue > 0.7 ? 180 : (s.hue > 0.4 ? 255 : 255);
        if (s.sz > 1.3) {
          var gl = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.sz * 5);
          gl.addColorStop(0, "rgba(" + r + "," + g + "," + b2 + "," + (a * 0.2) + ")");
          gl.addColorStop(1, "rgba(" + r + "," + g + "," + b2 + ",0)");
          ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "rgba(" + r + "," + g + "," + b2 + "," + a + ")";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.sz, 0, Math.PI * 2); ctx.fill();
      });

      // ── SHOOTING STARS ──
      if (Math.random() < 0.018) shootRef.current.push(mkShoot(w, h));
      shootRef.current = shootRef.current.filter(function (s) {
        s.x += s.vx; s.y += s.vy; s.life -= s.dc;
        if (s.life <= 0) return false;
        var a = s.life * s.life, mg = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
        var dx = s.vx / mg, dy = s.vy / mg;
        var tx = s.x - dx * s.ln * a, ty = s.y - dy * s.ln * a;
        var gr = ctx.createLinearGradient(tx, ty, s.x, s.y);
        gr.addColorStop(0, "rgba(200,220,255,0)");
        gr.addColorStop(0.6, "rgba(220,235,255," + (a * 0.3) + ")");
        gr.addColorStop(1, "rgba(255,255,255," + (a * 0.85) + ")");
        ctx.strokeStyle = gr; ctx.lineWidth = s.sz; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
        return true;
      });

      // ── RED STAR (top left) ──
      var rsx = w * 0.12, rsy = h * 0.08;
      var rPulse = 3.5 + Math.sin(t * 0.8) * 0.8;
      var rGl = ctx.createRadialGradient(rsx, rsy, 0, rsx, rsy, rPulse * 14);
      rGl.addColorStop(0, "rgba(255,120,50,0.4)");
      rGl.addColorStop(0.3, "rgba(255,80,30,0.15)");
      rGl.addColorStop(1, "rgba(255,50,20,0)");
      ctx.fillStyle = rGl; ctx.beginPath(); ctx.arc(rsx, rsy, rPulse * 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,140,80,0.95)";
      ctx.beginPath(); ctx.arc(rsx, rsy, rPulse, 0, Math.PI * 2); ctx.fill();

      // ── GIANT BLUE PLANET ──
      var bpX = w * 0.68, bpY = h * 0.30, bpR = Math.min(w, h) * 0.28;
      var bpGr = ctx.createRadialGradient(bpX - bpR * 0.35, bpY - bpR * 0.3, bpR * 0.08, bpX, bpY, bpR);
      bpGr.addColorStop(0, "rgba(130,150,190,0.55)");
      bpGr.addColorStop(0.25, "rgba(80,100,150,0.50)");
      bpGr.addColorStop(0.5, "rgba(45,60,110,0.45)");
      bpGr.addColorStop(0.8, "rgba(20,30,70,0.4)");
      bpGr.addColorStop(1, "rgba(8,12,35,0.25)");
      ctx.fillStyle = bpGr; ctx.beginPath(); ctx.arc(bpX, bpY, bpR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(100,150,220,0.08)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bpX, bpY, bpR, 0, Math.PI * 2); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(bpX, bpY, bpR, 0, Math.PI * 2); ctx.clip();
      for (var bi = 0; bi < 6; bi++) {
        var boff = Math.sin(t * 0.008 + bi * 1.2) * bpR * 0.03;
        var by = bpY - bpR + bpR * 2 * ((bi + 0.5) / 7) + boff;
        ctx.fillStyle = "rgba(70,90,140," + (0.04 + bi * 0.01) + ")";
        ctx.fillRect(bpX - bpR, by, bpR * 2, bpR * (0.25 + Math.sin(bi) * 0.08));
      }
      ctx.restore();

      // ── SATURN ──
      var satX = w * 0.38, satY = h * 0.34, satR = Math.min(w, h) * 0.12;
      // Ring behind
      ctx.save(); ctx.translate(satX, satY); ctx.scale(1, 0.32);
      for (var ri = 0; ri < 5; ri++) {
        var rr = satR * (1.45 + ri * 0.18);
        var rA = [0.16, 0.13, 0.10, 0.07, 0.04][ri];
        var rW = satR * (0.10 - ri * 0.015);
        ctx.strokeStyle = "rgba(180,140,100," + rA + ")";
        ctx.lineWidth = rW;
        ctx.beginPath(); ctx.arc(0, 0, rr, Math.PI, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      // Body
      var satGr = ctx.createRadialGradient(satX - satR * 0.3, satY - satR * 0.25, satR * 0.05, satX, satY, satR);
      satGr.addColorStop(0, "rgba(210,180,140,0.88)");
      satGr.addColorStop(0.25, "rgba(180,140,100,0.82)");
      satGr.addColorStop(0.5, "rgba(145,105,72,0.78)");
      satGr.addColorStop(0.75, "rgba(100,70,48,0.72)");
      satGr.addColorStop(1, "rgba(50,35,22,0.65)");
      ctx.fillStyle = satGr; ctx.beginPath(); ctx.arc(satX, satY, satR, 0, Math.PI * 2); ctx.fill();
      // Bands
      ctx.save(); ctx.beginPath(); ctx.arc(satX, satY, satR, 0, Math.PI * 2); ctx.clip();
      var sBands = [
        { y: -0.5, h: 0.15, c: "rgba(190,130,80,0.2)" },
        { y: -0.2, h: 0.12, c: "rgba(160,90,55,0.28)" },
        { y: 0.0, h: 0.18, c: "rgba(140,75,45,0.22)" },
        { y: 0.25, h: 0.14, c: "rgba(200,160,110,0.15)" },
        { y: 0.45, h: 0.12, c: "rgba(170,120,80,0.18)" },
      ];
      sBands.forEach(function (band) {
        var bShift = Math.sin(t * 0.01 + band.y * 3) * satR * 0.02;
        ctx.fillStyle = band.c;
        ctx.fillRect(satX - satR, satY + band.y * satR + bShift, satR * 2, band.h * satR);
      });
      ctx.restore();
      // Ring in front
      ctx.save(); ctx.translate(satX, satY); ctx.scale(1, 0.32);
      for (var ri2 = 0; ri2 < 5; ri2++) {
        var rr2 = satR * (1.45 + ri2 * 0.18);
        var rA2 = [0.20, 0.16, 0.12, 0.08, 0.05][ri2];
        ctx.strokeStyle = "rgba(185,145,105," + rA2 + ")";
        ctx.lineWidth = satR * (0.10 - ri2 * 0.015);
        ctx.beginPath(); ctx.arc(0, 0, rr2, 0, Math.PI); ctx.stroke();
      }
      ctx.restore();

      // ── VOLUMETRIC CLOUDS (2D Perlin noise → offscreen buffer) ──
      // Render at 1/4 resolution every ~150ms, drawImage scaled up each frame
      var cloudInterval = 0.15;
      var needCloudUpdate = (t - cloudLastT.current > cloudInterval) || !cloudCvRef.current;

      if (needCloudUpdate) {
        cloudLastT.current = t;
        var cScale = 4; // render at 1/4 resolution
        var cw = Math.ceil(w / cScale), ch = Math.ceil(h / cScale);
        if (!cloudCvRef.current || cloudCvRef.current.width !== cw || cloudCvRef.current.height !== ch) {
          cloudCvRef.current = document.createElement("canvas");
          cloudCvRef.current.width = cw;
          cloudCvRef.current.height = ch;
        }
        var cCtx = cloudCvRef.current.getContext("2d");
        var imgData = cCtx.createImageData(cw, ch);
        var data = imgData.data;

        var cloudLayers = [
          { yStart: 0.63, yEnd: 0.78, scale: 0.0025, thresh: 0.08, opMul: 0.40, drift: t * 0.003, oct: 6, ob: 0.3 },
          { yStart: 0.70, yEnd: 0.84, scale: 0.003, thresh: 0.05, opMul: 0.55, drift: t * 0.005, oct: 5, ob: 0.5 },
          { yStart: 0.76, yEnd: 0.90, scale: 0.0035, thresh: 0.03, opMul: 0.70, drift: t * 0.008, oct: 5, ob: 0.7 },
          { yStart: 0.83, yEnd: 0.96, scale: 0.004, thresh: 0.01, opMul: 0.85, drift: t * 0.012, oct: 4, ob: 0.9 },
          { yStart: 0.90, yEnd: 1.02, scale: 0.005, thresh: -0.02, opMul: 1.0, drift: t * 0.016, oct: 4, ob: 1.0 },
        ];

        cloudLayers.forEach(function (cl) {
          var y0 = Math.max(0, Math.floor(cl.yStart * ch));
          var y1 = Math.min(ch, Math.ceil(cl.yEnd * ch));

          for (var py = y0; py < y1; py++) {
            for (var px = 0; px < cw; px++) {
              // Map back to full resolution coords for noise sampling
              var wx = px * cScale, wy = py * cScale;
              var nx = (wx + cl.drift * w) * cl.scale;
              var ny = wy * cl.scale * 1.5;
              var n = fbm2(nx, ny, cl.oct);

              var density = n - cl.thresh;
              if (density <= 0) continue;

              density = Math.min(density * 2.5, 1.0);
              density *= density;

              var hFactor = (py - y0) / Math.max(1, y1 - y0);
              var ob = cl.ob;

              // Dark top → orange-lit bottom
              var r = 15 + 165 * hFactor * ob;
              var g = 18 + 92 * hFactor * ob * 0.7;
              var b3 = 30 + 25 * hFactor * ob * 0.4;

              // Sunset rim at horizon
              var horizonDist = Math.abs(wy / h - 0.78);
              if (horizonDist < 0.06) {
                var rimStr = (1 - horizonDist / 0.06) * 0.45 * ob;
                r = Math.min(255, r + 90 * rimStr);
                g = Math.min(255, g + 55 * rimStr);
                b3 = Math.min(255, b3 + 18 * rimStr);
              }

              var alpha = density * cl.opMul * 0.85;
              if (alpha < 0.01) continue;

              // Composite (additive over existing buffer)
              var idx = (py * cw + px) * 4;
              var existA = data[idx + 3] / 255;
              var newA = alpha;
              var outA = newA + existA * (1 - newA);
              if (outA > 0) {
                data[idx] = Math.round((r * newA + data[idx] * existA * (1 - newA)) / outA);
                data[idx + 1] = Math.round((g * newA + data[idx + 1] * existA * (1 - newA)) / outA);
                data[idx + 2] = Math.round((b3 * newA + data[idx + 2] * existA * (1 - newA)) / outA);
                data[idx + 3] = Math.round(outA * 255);
              }
            }
          }
        });

        cCtx.putImageData(imgData, 0, 0);
      }

      // Composite clouds onto main canvas (scaled up, smoothed)
      if (cloudCvRef.current) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(cloudCvRef.current, 0, 0, w, h);
      }

      // ── SUNSET HORIZON GLOW ──
      var glY = h * 0.77;
      var glH = h * 0.06;
      var glG = ctx.createLinearGradient(0, glY - glH, 0, glY + glH);
      glG.addColorStop(0, "rgba(210,130,55,0)");
      glG.addColorStop(0.45, "rgba(220,140,60,0.06)");
      glG.addColorStop(0.55, "rgba(225,145,65,0.06)");
      glG.addColorStop(1, "rgba(200,120,50,0)");
      ctx.fillStyle = glG; ctx.fillRect(0, glY - glH, w, glH * 2);

      afRef.current = requestAnimationFrame(go);
    };
    afRef.current = requestAnimationFrame(go);
    return function () { cancelAnimationFrame(afRef.current); window.removeEventListener("resize", rs); };
  }, [init]);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <canvas ref={cvRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
      {/* Film grain */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")", opacity: 0.4, pointerEvents: "none", mixBlendMode: "screen" }} />
      {/* Children overlay */}
      {children && <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>{children}</div>}
    </div>
  );
}
