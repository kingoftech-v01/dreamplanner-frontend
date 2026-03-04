import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Trash2, Send, Play, Pause, X } from "lucide-react";

/* ================================================================
 * VoiceRecorder — Record, preview, and send voice messages.
 *
 * Props:
 *   onSend(blob, durationSec)  — called with the recorded audio blob + duration
 *   accentGradient             — CSS gradient for the send button
 *   disabled                   — disable the recorder
 * ================================================================ */

var MIME_PRIORITIES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function getSupportedMime() {
  if (typeof MediaRecorder === "undefined") return "";
  for (var i = 0; i < MIME_PRIORITIES.length; i++) {
    if (MediaRecorder.isTypeSupported(MIME_PRIORITIES[i])) return MIME_PRIORITIES[i];
  }
  return "";
}

function fmtTimer(sec) {
  var m = Math.floor(sec / 60);
  var s = sec % 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

export default function VoiceRecorder({ onSend, accentGradient, disabled }) {
  var [state, setState] = useState("idle"); // idle | recording | preview
  var [duration, setDuration] = useState(0);
  var [previewPlaying, setPreviewPlaying] = useState(false);
  var [previewTime, setPreviewTime] = useState(0);
  var [waveform, setWaveform] = useState([]);

  var mediaRecorderRef = useRef(null);
  var streamRef = useRef(null);
  var chunksRef = useRef([]);
  var timerRef = useRef(null);
  var blobRef = useRef(null);
  var audioRef = useRef(null);
  var analyserRef = useRef(null);
  var animFrameRef = useRef(null);
  var waveformDataRef = useRef([]);

  // Cleanup on unmount
  useEffect(function () {
    return function () {
      stopEverything();
    };
  }, []);

  var stopEverything = useCallback(function () {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(function (t) { t.stop(); });
      streamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  var startRecording = useCallback(function () {
    if (disabled) return;
    var mimeType = getSupportedMime();
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      streamRef.current = stream;
      chunksRef.current = [];
      waveformDataRef.current = [];
      setDuration(0);
      setWaveform([]);

      // Set up analyser for waveform
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var source = audioCtx.createMediaStreamSource(stream);
      var analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      var options = mimeType ? { mimeType: mimeType } : {};
      var recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = function () {
        var type = mimeType || "audio/webm";
        blobRef.current = new Blob(chunksRef.current, { type: type });
        // Build final waveform snapshot (downsample to ~40 bars)
        var raw = waveformDataRef.current;
        var bars = [];
        var step = Math.max(1, Math.floor(raw.length / 40));
        for (var i = 0; i < raw.length; i += step) {
          bars.push(raw[i]);
        }
        if (bars.length > 40) bars = bars.slice(0, 40);
        setWaveform(bars);
        // Cleanup audio context
        try { audioCtx.close(); } catch (e) { /* ignore */ }
      };

      recorder.start(250); // collect data every 250ms
      setState("recording");

      // Duration timer
      var sec = 0;
      timerRef.current = setInterval(function () {
        sec++;
        setDuration(sec);
        // Max 2 minutes
        if (sec >= 120) {
          stopRecording();
        }
      }, 1000);

      // Waveform sampling
      var dataArray = new Uint8Array(analyser.frequencyBinCount);
      function sampleWaveform() {
        analyser.getByteTimeDomainData(dataArray);
        // Compute RMS amplitude
        var sum = 0;
        for (var i = 0; i < dataArray.length; i++) {
          var v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        var rms = Math.sqrt(sum / dataArray.length);
        var normalized = Math.min(1, rms * 3); // amplify for visual
        waveformDataRef.current.push(normalized);
        animFrameRef.current = requestAnimationFrame(sampleWaveform);
      }
      sampleWaveform();
    }).catch(function () {
      // Microphone permission denied or not available
      setState("idle");
    });
  }, [disabled]);

  var stopRecording = useCallback(function () {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(function (t) { t.stop(); });
      streamRef.current = null;
    }
    setState("preview");
  }, []);

  var cancelRecording = useCallback(function () {
    stopEverything();
    blobRef.current = null;
    chunksRef.current = [];
    setDuration(0);
    setWaveform([]);
    setPreviewPlaying(false);
    setPreviewTime(0);
    setState("idle");
  }, [stopEverything]);

  var togglePreviewPlay = useCallback(function () {
    if (!blobRef.current) return;
    if (previewPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setPreviewPlaying(false);
      return;
    }
    var url = URL.createObjectURL(blobRef.current);
    var audio = new Audio(url);
    audioRef.current = audio;
    audio.ontimeupdate = function () { setPreviewTime(Math.floor(audio.currentTime)); };
    audio.onended = function () {
      setPreviewPlaying(false);
      setPreviewTime(0);
      URL.revokeObjectURL(url);
    };
    audio.play();
    setPreviewPlaying(true);
  }, [previewPlaying]);

  var handleSend = useCallback(function () {
    if (!blobRef.current || !onSend) return;
    onSend(blobRef.current, duration);
    // Reset
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    blobRef.current = null;
    chunksRef.current = [];
    setDuration(0);
    setWaveform([]);
    setPreviewPlaying(false);
    setPreviewTime(0);
    setState("idle");
  }, [onSend, duration]);

  var handleMicClick = useCallback(function () {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  }, [state, startRecording, stopRecording]);

  // ─── IDLE state: just a mic button ─────────────────────────────
  if (state === "idle") {
    return (
      <button
        aria-label="Record voice message"
        onClick={handleMicClick}
        disabled={disabled}
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          border: "none",
          cursor: disabled ? "default" : "pointer",
          background: "var(--dp-surface)",
          color: "var(--dp-text-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
          flexShrink: 0,
          opacity: disabled ? 0.4 : 0.7,
        }}
      >
        <Mic size={18} strokeWidth={2} />
      </button>
    );
  }

  // ─── RECORDING state: pulsing indicator + timer + stop ─────────
  if (state === "recording") {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flex: 1,
        padding: "6px 12px",
        borderRadius: 22,
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.15)",
      }}>
        {/* Pulsing red dot */}
        <div style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#ef4444",
          flexShrink: 0,
          animation: "dpVoicePulse 1.2s ease-in-out infinite",
        }} />
        {/* Timer */}
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#ef4444",
          fontFamily: "monospace",
          minWidth: 42,
        }}>
          {fmtTimer(duration)}
        </span>
        {/* Live waveform mini bars */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 2,
          height: 24,
          overflow: "hidden",
        }}>
          {waveformDataRef.current.slice(-30).map(function (v, i) {
            return (
              <div key={i} style={{
                width: 3,
                borderRadius: 2,
                background: "rgba(239,68,68,0.5)",
                height: Math.max(3, v * 22) + "px",
                transition: "height 0.1s ease",
              }} />
            );
          })}
        </div>
        {/* Cancel */}
        <button
          aria-label="Cancel recording"
          onClick={cancelRecording}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "none",
            background: "rgba(239,68,68,0.08)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        {/* Stop (send to preview) */}
        <button
          aria-label="Stop recording"
          onClick={stopRecording}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "none",
            background: "rgba(239,68,68,0.12)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Square size={14} strokeWidth={2.5} fill="#ef4444" />
        </button>
        <style>{`
          @keyframes dpVoicePulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.85); }
          }
        `}</style>
      </div>
    );
  }

  // ─── PREVIEW state: waveform + play/delete/send ────────────────
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      flex: 1,
      padding: "6px 10px",
      borderRadius: 22,
      background: "var(--dp-surface)",
      border: "1px solid var(--dp-glass-border)",
    }}>
      {/* Play / Pause */}
      <button
        aria-label={previewPlaying ? "Pause preview" : "Play preview"}
        onClick={togglePreviewPlay}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "none",
          background: "var(--dp-accent-soft)",
          color: "var(--dp-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {previewPlaying ? <Pause size={15} strokeWidth={2.5} /> : <Play size={15} strokeWidth={2.5} />}
      </button>
      {/* Waveform bars */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: 28,
        overflow: "hidden",
      }}>
        {(waveform.length > 0 ? waveform : Array(20).fill(0.15)).map(function (v, i) {
          var progress = duration > 0 ? previewTime / duration : 0;
          var barProgress = waveform.length > 0 ? i / waveform.length : 0;
          var isPlayed = barProgress <= progress;
          return (
            <div key={i} style={{
              flex: 1,
              maxWidth: 5,
              borderRadius: 2,
              background: isPlayed ? "var(--dp-accent)" : "var(--dp-text-muted)",
              opacity: isPlayed ? 0.9 : 0.3,
              height: Math.max(4, v * 24) + "px",
              transition: "background 0.15s, opacity 0.15s",
            }} />
          );
        })}
      </div>
      {/* Duration */}
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        color: "var(--dp-text-primary)",
        fontFamily: "monospace",
        minWidth: 36,
        textAlign: "center",
      }}>
        {fmtTimer(previewPlaying ? previewTime : duration)}
      </span>
      {/* Delete */}
      <button
        aria-label="Delete recording"
        onClick={cancelRecording}
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          border: "none",
          background: "rgba(239,68,68,0.06)",
          color: "#ef4444",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Trash2 size={15} strokeWidth={2} />
      </button>
      {/* Send */}
      <button
        aria-label="Send voice message"
        onClick={handleSend}
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          border: "none",
          cursor: "pointer",
          background: accentGradient || "linear-gradient(135deg, #14b8a6, #0d9488)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 4px 16px rgba(20,184,166,0.35)",
          transition: "transform 0.2s",
        }}
      >
        <Send size={15} strokeWidth={2} style={{ transform: "translateX(1px)" }} />
      </button>
    </div>
  );
}
