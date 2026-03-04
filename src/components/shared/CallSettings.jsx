import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Monitor, Mic, Volume2, Camera, FlipHorizontal,
  Sparkles, Eye, EyeOff, ChevronDown, Check
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Call Settings Panel
 *
 * Pre-call and in-call settings for voice/video calls:
 * - Virtual backgrounds (blur levels, preset replacements)
 * - Noise suppression toggle
 * - Audio settings (mic/speaker selection, volume indicator)
 * - Video settings (camera selection, mirror mode, quality)
 *
 * Uses Agora SDK extensions where available, graceful fallback.
 * ═══════════════════════════════════════════════════════════════════ */

var BLUR_LEVELS = [
  { key: "off", label: "Off", value: 0 },
  { key: "light", label: "Light", value: 1 },
  { key: "heavy", label: "Heavy", value: 2 },
];

var PRESET_BACKGROUNDS = [
  { key: "none", label: "None", color: null, gradient: null },
  { key: "purple", label: "Purple", color: "#6D28D9", gradient: null },
  { key: "teal", label: "Teal", color: "#0D9488", gradient: null },
  { key: "midnight", label: "Midnight", color: "#1E1B4B", gradient: null },
  { key: "sunset", label: "Sunset", color: null, gradient: "linear-gradient(135deg, #F59E0B, #EC4899)" },
  { key: "ocean", label: "Ocean", color: null, gradient: "linear-gradient(135deg, #3B82F6, #06B6D4)" },
  { key: "aurora", label: "Aurora", color: null, gradient: "linear-gradient(135deg, #8B5CF6, #10B981)" },
];

var QUALITY_OPTIONS = [
  { key: "auto", label: "Auto" },
  { key: "hd", label: "HD (720p)" },
  { key: "sd", label: "SD (480p)" },
];

export default function CallSettings({
  open,
  onClose,
  isVideo,
  settings,
  onSettingsChange,
  session,
}) {
  var s = settings || {};
  var [activeTab, setActiveTab] = useState(isVideo ? "background" : "audio");
  var [micDevices, setMicDevices] = useState([]);
  var [speakerDevices, setSpeakerDevices] = useState([]);
  var [cameraDevices, setCameraDevices] = useState([]);
  var [micLevel, setMicLevel] = useState(0);
  var micLevelRef = useRef(null);
  var animFrameRef = useRef(null);

  // Enumerate available devices
  useEffect(function () {
    if (!open) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then(function (devices) {
      var mics = [];
      var speakers = [];
      var cameras = [];
      for (var i = 0; i < devices.length; i++) {
        var d = devices[i];
        if (d.kind === "audioinput") mics.push({ id: d.deviceId, label: d.label || "Microphone " + (mics.length + 1) });
        if (d.kind === "audiooutput") speakers.push({ id: d.deviceId, label: d.label || "Speaker " + (speakers.length + 1) });
        if (d.kind === "videoinput") cameras.push({ id: d.deviceId, label: d.label || "Camera " + (cameras.length + 1) });
      }
      setMicDevices(mics);
      setSpeakerDevices(speakers);
      setCameraDevices(cameras);
    }).catch(function () {});
  }, [open]);

  // Mic level visualization
  useEffect(function () {
    if (!open || activeTab !== "audio") {
      setMicLevel(0);
      return;
    }

    var audioCtx = null;
    var analyser = null;
    var stream = null;
    var cancelled = false;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      if (cancelled) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      var source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      var dataArray = new Uint8Array(analyser.frequencyBinCount);

      function tick() {
        if (cancelled) return;
        analyser.getByteFrequencyData(dataArray);
        var sum = 0;
        for (var i = 0; i < dataArray.length; i++) sum += dataArray[i];
        var avg = sum / dataArray.length;
        setMicLevel(Math.min(avg / 128, 1));
        animFrameRef.current = requestAnimationFrame(tick);
      }
      tick();
    }).catch(function () {});

    return function () {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close().catch(function () {});
    };
  }, [open, activeTab]);

  var handleChange = useCallback(function (key, value) {
    if (onSettingsChange) {
      var next = Object.assign({}, s);
      next[key] = value;
      onSettingsChange(next);
    }
  }, [s, onSettingsChange]);

  if (!open) return null;

  var tabs = [];
  if (isVideo) tabs.push({ key: "background", label: "Background", icon: Monitor });
  tabs.push({ key: "audio", label: "Audio", icon: Mic });
  if (isVideo) tabs.push({ key: "video", label: "Video", icon: Camera });

  // If current tab isn't valid for mode, reset
  if (!tabs.some(function (t) { return t.key === activeTab; })) {
    setActiveTab(tabs[0].key);
  }

  var vbSupported = typeof window !== "undefined";
  var nsSupported = true; // Agora AI noise suppression is widely supported

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      animation: "csOverlayIn 0.2s ease-out",
    }} onClick={function (e) { if (e.target === e.currentTarget) onClose(); }}>

      <style>{"\
        @keyframes csOverlayIn { from { opacity: 0; } to { opacity: 1; } }\
        @keyframes csSlideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }\
      "}</style>

      <div style={{
        width: "100%", maxWidth: 480, maxHeight: "80vh",
        background: "var(--dp-modal-bg)",
        backdropFilter: "blur(40px) saturate(1.4)",
        WebkitBackdropFilter: "blur(40px) saturate(1.4)",
        borderRadius: "22px 22px 0 0",
        border: "1px solid var(--dp-glass-border)",
        borderBottom: "none",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        animation: "csSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--dp-divider)",
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>
            Call Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--dp-surface)",
              border: "1px solid var(--dp-input-border)",
              color: "var(--dp-text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 4, padding: "12px 20px 0",
          flexShrink: 0,
        }}>
          {tabs.map(function (tab) {
            var active = activeTab === tab.key;
            var TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={function () { setActiveTab(tab.key); }}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, padding: "10px 12px", borderRadius: 12,
                  background: active ? "var(--dp-accent-soft)" : "transparent",
                  border: active ? "1px solid var(--dp-accent-border)" : "1px solid transparent",
                  color: active ? "var(--dp-accent)" : "var(--dp-text-tertiary)",
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  cursor: "pointer", transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
              >
                <TabIcon size={15} strokeWidth={2} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>

          {/* ── BACKGROUND TAB ── */}
          {activeTab === "background" && isVideo && (
            <div>
              {/* Background Blur */}
              <SectionLabel text="Background Blur" />
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {BLUR_LEVELS.map(function (level) {
                  var active = (s.blurLevel || "off") === level.key;
                  return (
                    <button
                      key={level.key}
                      onClick={function () { handleChange("blurLevel", level.key); handleChange("bgPreset", "none"); }}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 12,
                        background: active ? "var(--dp-accent-soft)" : "var(--dp-surface)",
                        border: active ? "1px solid var(--dp-accent-border)" : "1px solid var(--dp-glass-border)",
                        color: active ? "var(--dp-accent)" : "var(--dp-text-secondary)",
                        fontSize: 13, fontWeight: active ? 600 : 500,
                        cursor: "pointer", transition: "all 0.2s",
                        fontFamily: "inherit",
                      }}
                    >
                      {level.label}
                    </button>
                  );
                })}
              </div>

              {/* Background Replacement */}
              <SectionLabel text="Virtual Background" />
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
              }}>
                {PRESET_BACKGROUNDS.map(function (bg) {
                  var active = (s.bgPreset || "none") === bg.key;
                  var bgStyle = bg.color
                    ? bg.color
                    : bg.gradient
                      ? bg.gradient
                      : "var(--dp-surface)";

                  return (
                    <button
                      key={bg.key}
                      onClick={function () {
                        handleChange("bgPreset", bg.key);
                        if (bg.key !== "none") handleChange("blurLevel", "off");
                      }}
                      title={bg.label}
                      style={{
                        position: "relative",
                        width: "100%", aspectRatio: "16/10",
                        borderRadius: 10,
                        background: bg.key === "none" ? "var(--dp-surface)" : bgStyle,
                        border: active
                          ? "2px solid var(--dp-accent)"
                          : "1px solid var(--dp-glass-border)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        overflow: "hidden",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "inherit",
                        padding: 0,
                      }}
                    >
                      {bg.key === "none" && (
                        <EyeOff size={16} color="var(--dp-text-tertiary)" />
                      )}
                      {active && (
                        <div style={{
                          position: "absolute", top: 4, right: 4,
                          width: 18, height: 18, borderRadius: "50%",
                          background: "var(--dp-accent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Check size={10} color="#fff" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {!vbSupported && (
                <div style={{
                  marginTop: 12, padding: "8px 12px", borderRadius: 10,
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.15)",
                  fontSize: 12, color: "var(--dp-text-tertiary)",
                }}>
                  Virtual backgrounds will be applied when supported by your browser.
                </div>
              )}
            </div>
          )}

          {/* ── AUDIO TAB ── */}
          {activeTab === "audio" && (
            <div>
              {/* Noise Suppression */}
              <SectionLabel text="AI Noise Suppression" />
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 14,
                background: "var(--dp-surface)",
                border: "1px solid var(--dp-glass-border)",
                marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Sparkles size={18} color={s.noiseSuppression ? "var(--dp-accent)" : "var(--dp-text-tertiary)"} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--dp-text)" }}>
                      Noise Suppression
                    </div>
                    <div style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>
                      Reduce background noise with AI
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  value={!!s.noiseSuppression}
                  onChange={function (v) { handleChange("noiseSuppression", v); }}
                />
              </div>

              {s.noiseSuppression && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 8,
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.15)",
                  marginBottom: 16,
                }}>
                  <Sparkles size={12} color="var(--dp-accent)" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-accent)" }}>
                    Noise suppression active
                  </span>
                </div>
              )}

              {/* Microphone Selection */}
              <SectionLabel text="Microphone" />
              <DeviceSelect
                devices={micDevices}
                value={s.micDevice || ""}
                onChange={function (v) { handleChange("micDevice", v); }}
                placeholder="Default microphone"
              />

              {/* Mic Level */}
              <div style={{ marginTop: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "var(--dp-text-tertiary)", marginBottom: 6 }}>
                  Input Level
                </div>
                <div style={{
                  height: 6, borderRadius: 3,
                  background: "var(--dp-surface)",
                  border: "1px solid var(--dp-glass-border)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: Math.round(micLevel * 100) + "%",
                    background: micLevel > 0.7
                      ? "linear-gradient(90deg, #10B981, #EF4444)"
                      : micLevel > 0.3
                        ? "linear-gradient(90deg, #10B981, #F59E0B)"
                        : "linear-gradient(90deg, #10B981, #10B981)",
                    transition: "width 0.1s ease-out",
                  }} />
                </div>
              </div>

              {/* Speaker Selection */}
              {speakerDevices.length > 0 && (
                <>
                  <SectionLabel text="Speaker" />
                  <DeviceSelect
                    devices={speakerDevices}
                    value={s.speakerDevice || ""}
                    onChange={function (v) { handleChange("speakerDevice", v); }}
                    placeholder="Default speaker"
                  />
                </>
              )}
            </div>
          )}

          {/* ── VIDEO TAB ── */}
          {activeTab === "video" && isVideo && (
            <div>
              {/* Camera Selection */}
              <SectionLabel text="Camera" />
              <DeviceSelect
                devices={cameraDevices}
                value={s.cameraDevice || ""}
                onChange={function (v) { handleChange("cameraDevice", v); }}
                placeholder="Default camera"
              />

              {/* Mirror Mode */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 14,
                background: "var(--dp-surface)",
                border: "1px solid var(--dp-glass-border)",
                marginTop: 16, marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FlipHorizontal size={18} color={s.mirrorMode ? "var(--dp-accent)" : "var(--dp-text-tertiary)"} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--dp-text)" }}>
                      Mirror Mode
                    </div>
                    <div style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>
                      Flip your video horizontally
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  value={s.mirrorMode !== false}
                  onChange={function (v) { handleChange("mirrorMode", v); }}
                />
              </div>

              {/* Video Quality */}
              <SectionLabel text="Video Quality" />
              <div style={{ display: "flex", gap: 8 }}>
                {QUALITY_OPTIONS.map(function (q) {
                  var active = (s.videoQuality || "auto") === q.key;
                  return (
                    <button
                      key={q.key}
                      onClick={function () { handleChange("videoQuality", q.key); }}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 12,
                        background: active ? "var(--dp-accent-soft)" : "var(--dp-surface)",
                        border: active ? "1px solid var(--dp-accent-border)" : "1px solid var(--dp-glass-border)",
                        color: active ? "var(--dp-accent)" : "var(--dp-text-secondary)",
                        fontSize: 13, fontWeight: active ? 600 : 500,
                        cursor: "pointer", transition: "all 0.2s",
                        fontFamily: "inherit",
                      }}
                    >
                      {q.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ─── Sub-components ────────────────────────────────────────────── */

function SectionLabel({ text }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, color: "var(--dp-text-tertiary)",
      textTransform: "uppercase", letterSpacing: "0.5px",
      marginBottom: 8,
    }}>
      {text}
    </div>
  );
}

function ToggleSwitch({ value, onChange }) {
  return (
    <button
      onClick={function () { onChange(!value); }}
      aria-pressed={value}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value
          ? "linear-gradient(135deg, #8B5CF6, #7C3AED)"
          : "var(--dp-surface)",
        border: value
          ? "1px solid rgba(139,92,246,0.4)"
          : "1px solid var(--dp-glass-border)",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        padding: 0,
        flexShrink: 0,
        fontFamily: "inherit",
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        background: "#fff",
        position: "absolute",
        top: 2,
        left: value ? 22 : 3,
        transition: "left 0.25s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function DeviceSelect({ devices, value, onChange, placeholder }) {
  var [selectOpen, setSelectOpen] = useState(false);
  var ref = useRef(null);

  useEffect(function () {
    if (!selectOpen) return;
    var handler = function (e) {
      if (ref.current && !ref.current.contains(e.target)) setSelectOpen(false);
    };
    var t = setTimeout(function () { document.addEventListener("click", handler); }, 0);
    return function () { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [selectOpen]);

  var selected = devices.find(function (d) { return d.id === value; });
  var label = selected ? selected.label : placeholder;

  return (
    <div ref={ref} style={{ position: "relative", marginBottom: 8 }}>
      <button
        onClick={function () { setSelectOpen(!selectOpen); }}
        style={{
          width: "100%", padding: "10px 14px",
          borderRadius: 12,
          background: "var(--dp-surface)",
          border: "1px solid var(--dp-glass-border)",
          color: selected ? "var(--dp-text)" : "var(--dp-text-tertiary)",
          fontSize: 13, fontWeight: 500,
          cursor: "pointer", transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <span style={{
          overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap", flex: 1,
        }}>
          {label}
        </span>
        <ChevronDown
          size={14}
          color="var(--dp-text-tertiary)"
          style={{
            transform: selectOpen ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
            flexShrink: 0,
            marginLeft: 8,
          }}
        />
      </button>

      {selectOpen && devices.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          marginTop: 4, zIndex: 100,
          background: "var(--dp-card-solid)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          borderRadius: 12,
          border: "1px solid var(--dp-glass-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          padding: 4,
          maxHeight: 180, overflowY: "auto",
          animation: "csSlideUp 0.15s ease-out",
        }}>
          {devices.map(function (d) {
            var isActive = d.id === value;
            return (
              <button
                key={d.id}
                onClick={function () { onChange(d.id); setSelectOpen(false); }}
                style={{
                  width: "100%", padding: "8px 12px",
                  borderRadius: 8, border: "none",
                  background: isActive ? "var(--dp-accent-soft)" : "transparent",
                  color: isActive ? "var(--dp-accent)" : "var(--dp-text-primary)",
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  cursor: "pointer", transition: "background 0.15s",
                  textAlign: "left",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <span style={{
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", flex: 1,
                }}>
                  {d.label}
                </span>
                {isActive && <Check size={14} color="var(--dp-accent)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
