import { WifiOff } from "lucide-react";
import { useNetwork } from "../../context/NetworkContext";

export default function OfflineBanner() {
  var { isOnline } = useNetwork();

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 10001,
      transform: isOnline ? "translateY(-100%)" : "translateY(0)",
      transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
      pointerEvents: isOnline ? "none" : "auto",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "10px 16px",
        background: "rgba(245,158,11,0.12)",
        backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
        borderBottom: "1px solid rgba(245,158,11,0.2)",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <WifiOff size={14} color="#FBBF24" strokeWidth={2.5} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#FBBF24" }}>
          You're offline — some features may not work
        </span>
      </div>
    </div>
  );
}
