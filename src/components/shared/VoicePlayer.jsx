import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";

/* ================================================================
 * VoicePlayer — Playback UI for voice messages in chat bubbles.
 *
 * Props:
 *   audioUrl        — URL to the audio file
 *   duration        — duration in seconds (from server, used as fallback)
 *   isUser          — whether this is the current user's message (for tinting)
 * ================================================================ */

function fmtTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

var SPEEDS = [1, 1.5, 2];

export default function VoicePlayer({ audioUrl, duration, isUser }) {
  var [playing, setPlaying] = useState(false);
  var [currentTime, setCurrentTime] = useState(0);
  var [totalDuration, setTotalDuration] = useState(duration || 0);
  var [speedIdx, setSpeedIdx] = useState(0);
  var [loaded, setLoaded] = useState(false);

  var audioRef = useRef(null);
  var progressRef = useRef(null);

  // Create audio element on mount
  useEffect(function () {
    if (!audioUrl) return;
    var audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioUrl;
    audioRef.current = audio;

    audio.onloadedmetadata = function () {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
      setLoaded(true);
    };
    audio.ontimeupdate = function () {
      setCurrentTime(audio.currentTime);
    };
    audio.onended = function () {
      setPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    audio.onerror = function () {
      setLoaded(false);
    };

    return function () {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Sync playback speed
  useEffect(function () {
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[speedIdx];
    }
  }, [speedIdx]);

  var togglePlay = useCallback(function () {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(function () {
        setPlaying(true);
      }).catch(function () {
        setPlaying(false);
      });
    }
  }, [playing]);

  var handleSeek = useCallback(function (e) {
    if (!audioRef.current || !progressRef.current) return;
    var rect = progressRef.current.getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    var seekTo = ratio * (totalDuration || 0);
    audioRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  }, [totalDuration]);

  var cycleSpeed = useCallback(function () {
    setSpeedIdx(function (prev) { return (prev + 1) % SPEEDS.length; });
  }, []);

  var progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  var accentColor = isUser ? "rgba(200,120,200,0.7)" : "var(--dp-teal)";
  var trackBg = isUser ? "rgba(200,120,200,0.15)" : "rgba(20,184,166,0.15)";
  var fillBg = isUser ? "rgba(200,120,200,0.6)" : "rgba(20,184,166,0.6)";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      minWidth: 180,
      maxWidth: 260,
    }}>
      {/* Play / Pause */}
      <button
        aria-label={playing ? "Pause" : "Play"}
        onClick={togglePlay}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: "none",
          background: accentColor,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          transition: "transform 0.15s",
        }}
      >
        {playing
          ? <Pause size={14} strokeWidth={2.5} />
          : <Play size={14} strokeWidth={2.5} style={{ transform: "translateX(1px)" }} />
        }
      </button>

      {/* Progress bar + time */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Seekable progress bar */}
        <div
          ref={progressRef}
          onClick={handleSeek}
          style={{
            height: 6,
            borderRadius: 3,
            background: trackBg,
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: progress + "%",
            borderRadius: 3,
            background: fillBg,
            transition: playing ? "none" : "width 0.15s ease",
          }} />
        </div>
        {/* Time label */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{
            fontSize: 11,
            color: isUser ? "var(--dp-text-primary)" : "var(--dp-text-primary)",
            fontFamily: "monospace",
            opacity: 0.7,
          }}>
            {playing || currentTime > 0 ? fmtTime(currentTime) : fmtTime(totalDuration)}
          </span>
          {/* Speed control */}
          <button
            aria-label="Playback speed"
            onClick={cycleSpeed}
            style={{
              background: "none",
              border: "none",
              padding: "1px 5px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              color: accentColor,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: 0.8,
            }}
          >
            {SPEEDS[speedIdx]}x
          </button>
        </div>
      </div>
    </div>
  );
}
