// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Sound Manager
//
// Plays notification sounds and UI feedback sounds.
// Uses Web Audio API for low-latency synthesized playback.
// No audio files needed — all sounds are generated on the fly.
// ═══════════════════════════════════════════════════════════════

var SOUNDS = {
  notification: { freq: 880, duration: 0.15, type: "sine" },
  success: { freq: [523, 659, 784], duration: 0.12, type: "sine" },           // C-E-G chord
  error: { freq: 220, duration: 0.3, type: "sawtooth" },
  tap: { freq: 1200, duration: 0.05, type: "sine" },
  send: { freq: [600, 900], duration: 0.1, type: "sine" },
  achievement: { freq: [523, 659, 784, 1047], duration: 0.15, type: "sine" }, // ascending
  streak: { freq: [440, 554, 659], duration: 0.1, type: "triangle" },
};

var LS_KEY = "dp-sounds-enabled";

var _audioCtx = null;

// ── Lazy AudioContext init (must be after user gesture) ────────

function getAudioContext() {
  if (!_audioCtx) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    _audioCtx = new Ctx();
  }
  // Resume if suspended (browsers require user gesture)
  if (_audioCtx.state === "suspended") {
    _audioCtx.resume().catch(function () {});
  }
  return _audioCtx;
}

// ── Preference helpers ────────────────────────────────────────

function isSoundEnabled() {
  try {
    var stored = localStorage.getItem(LS_KEY);
    if (stored === null) return true; // default on
    return stored === "true";
  } catch (e) {
    return true;
  }
}

function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(LS_KEY, enabled ? "true" : "false");
  } catch (e) {
    // storage unavailable — ignore
  }
}

// ── Core synth engine ─────────────────────────────────────────

function playTone(ctx, freq, duration, type, startTime, volume) {
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();

  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, startTime);

  // Envelope: quick attack, sustain, smooth fade-out
  var vol = volume !== undefined ? volume : 0.15;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.005);
  gain.gain.setValueAtTime(vol, startTime + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

// ── Play a named sound ────────────────────────────────────────

function playSound(name) {
  if (!isSoundEnabled()) return;

  var def = SOUNDS[name];
  if (!def) return;

  var ctx = getAudioContext();
  if (!ctx) return;

  var now = ctx.currentTime;
  var freqs = Array.isArray(def.freq) ? def.freq : [def.freq];

  if (freqs.length === 1) {
    // Single tone
    playTone(ctx, freqs[0], def.duration, def.type, now, 0.15);
  } else {
    // Sequence/chord: stagger each note slightly for arpeggio effect
    var delay = def.duration * 0.4; // overlap between notes
    for (var i = 0; i < freqs.length; i++) {
      playTone(ctx, freqs[i], def.duration, def.type, now + i * delay, 0.12);
    }
  }
}

// ── Get available sound names (for settings preview) ──────────

function getSoundNames() {
  return Object.keys(SOUNDS);
}

// ═══════════════════════════════════════════════════════════════

export { playSound, setSoundEnabled, isSoundEnabled, getSoundNames, SOUNDS };
