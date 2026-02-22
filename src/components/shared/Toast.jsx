import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";

var ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

var COLORS = {
  success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", icon: "#10B981", text: "#5DE5A8" },
  error: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", icon: "#EF4444", text: "#F87171" },
  warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", icon: "#F59E0B", text: "#FBBF24" },
  info: { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.25)", icon: "#8B5CF6", text: "#C4B5FD" },
};

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
      zIndex: 10000, display: "flex", flexDirection: "column-reverse", gap: 8,
      pointerEvents: "none", maxWidth: "calc(100vw - 32px)", width: 380,
    }}>
      {toasts.map(function (toast, i) {
        var c = COLORS[toast.type] || COLORS.info;
        var Icon = ICONS[toast.type] || Info;
        return (
          <div key={toast.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
            borderRadius: 14, background: c.bg, border: "1px solid " + c.border,
            backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
            animation: "dpToastIn 0.25s cubic-bezier(0.16,1,0.3,1)",
            pointerEvents: "auto", overflow: "hidden", position: "relative",
          }}>
            <Icon size={18} color={c.icon} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{
              flex: 1, fontSize: 13, fontWeight: 500, color: c.text,
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}>{toast.message}</span>
            <button onClick={function () { onDismiss(toast.id); }} style={{
              width: 24, height: 24, borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}>
              <X size={12} strokeWidth={2.5} />
            </button>
            {/* Progress bar */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, height: 2,
              background: c.icon, borderRadius: 1, opacity: 0.4,
              animation: "dpToastProgress " + toast.duration + "ms linear forwards",
            }} />
          </div>
        );
      })}
      <style>{`
        @keyframes dpToastIn{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes dpToastProgress{from{width:100%;}to{width:0%;}}
      `}</style>
    </div>
  );
}
