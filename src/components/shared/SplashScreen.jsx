import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

export default function SplashScreen({ onDone }) {
  var [phase, setPhase] = useState("show"); // show → fade → done

  useEffect(function () {
    var t1 = setTimeout(function () { setPhase("fade"); }, 1200);
    var t2 = setTimeout(function () { setPhase("done"); if (onDone) onDone(); }, 1600);
    return function () { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  if (phase === "done") return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(180deg, #0c081a 0%, #1A1535 50%, #0c081a 100%)",
      opacity: phase === "fade" ? 0 : 1,
      transition: "opacity 0.4s ease-out",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 22,
        background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.15))",
        border: "1px solid rgba(139,92,246,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, animation: "dpSplashPulse 2s ease-in-out infinite",
        boxShadow: "0 0 40px rgba(139,92,246,0.2)",
      }}>
        <Sparkles size={32} color="#C4B5FD" strokeWidth={2} />
      </div>
      <div style={{
        fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px",
        fontFamily: "'Inter', -apple-system, sans-serif",
        animation: "dpSplashText 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both",
      }}>
        DreamPlanner
      </div>
      <div style={{
        fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8,
        fontFamily: "'Inter', -apple-system, sans-serif",
        animation: "dpSplashText 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both",
      }}>
        Plan your dreams. Achieve your goals.
      </div>
      <style>{`
        @keyframes dpSplashPulse{0%,100%{transform:scale(1);box-shadow:0 0 40px rgba(139,92,246,0.2);}50%{transform:scale(1.05);box-shadow:0 0 60px rgba(139,92,246,0.35);}}
        @keyframes dpSplashText{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
      `}</style>
    </div>
  );
}
