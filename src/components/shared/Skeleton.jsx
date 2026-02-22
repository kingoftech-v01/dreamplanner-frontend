import { useTheme } from "../../context/ThemeContext";

function SkeletonBase({ style, ...props }) {
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  return (
    <div
      style={{
        background: isLight
          ? "linear-gradient(90deg, rgba(26,21,53,0.06) 25%, rgba(26,21,53,0.12) 50%, rgba(26,21,53,0.06) 75%)"
          : "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
        backgroundSize: "200% 100%",
        animation: "dpShimmer 2s infinite",
        borderRadius: 8,
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonLine({ width = "100%", height = 14, style }) {
  return <SkeletonBase style={{ width, height, borderRadius: 6, ...style }} />;
}

export function SkeletonCircle({ size = 40, style }) {
  return <SkeletonBase style={{ width: size, height: size, borderRadius: "50%", ...style }} />;
}

export function SkeletonCard({ height = 120, style }) {
  return <SkeletonBase style={{ width: "100%", height, borderRadius: 16, ...style }} />;
}

// Pre-built skeleton layouts
export function DreamCardSkeleton({ isLight }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: 16,
      background: isLight ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.03)",
      borderRadius: 16, border: `1px solid ${isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.05)"}`,
    }}>
      <SkeletonCircle size={44} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <SkeletonLine width="70%" height={16} />
        <SkeletonLine width="90%" height={12} />
        <SkeletonLine width="100%" height={6} style={{ marginTop: 4 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <SkeletonLine width="30%" height={11} />
          <SkeletonLine width="20%" height={11} />
        </div>
      </div>
    </div>
  );
}

export function ConversationSkeleton({ isLight }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: 14,
      background: isLight ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.03)",
      borderRadius: 14, border: `1px solid ${isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.05)"}`,
    }}>
      <SkeletonCircle size={42} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <SkeletonLine width="60%" height={15} />
          <SkeletonLine width="15%" height={11} />
        </div>
        <SkeletonLine width="85%" height={12} />
      </div>
    </div>
  );
}

export function FeedItemSkeleton({ isLight }) {
  return (
    <div style={{
      padding: 16,
      background: isLight ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.03)",
      borderRadius: 16, border: `1px solid ${isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.05)"}`,
    }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <SkeletonCircle size={36} />
        <div style={{ flex: 1 }}>
          <SkeletonLine width="50%" height={14} />
          <SkeletonLine width="30%" height={10} style={{ marginTop: 4 }} />
        </div>
      </div>
      <SkeletonLine width="100%" height={12} />
      <SkeletonLine width="80%" height={12} style={{ marginTop: 6 }} />
    </div>
  );
}

export function StatsSkeleton({ isLight }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          flex: 1, padding: 16, textAlign: "center",
          background: isLight ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.03)",
          borderRadius: 16, border: `1px solid ${isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.05)"}`,
        }}>
          <SkeletonCircle size={28} style={{ margin: "0 auto 8px" }} />
          <SkeletonLine width="60%" height={20} style={{ margin: "0 auto 4px" }} />
          <SkeletonLine width="40%" height={11} style={{ margin: "0 auto" }} />
        </div>
      ))}
    </div>
  );
}
