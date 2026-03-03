import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Target, Calendar, ChevronRight } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { DREAMS } from "../../services/endpoints";
import { SkeletonCard } from "../../components/shared/Skeleton";
import useInfiniteList from "../../hooks/useInfiniteList";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";


export default function SharedDreamsScreen() {
  var navigate = useNavigate();
  var [mounted, setMounted] = useState(false);

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  var sharedInf = useInfiniteList({ queryKey: ["shared-dreams"], url: DREAMS.SHARED_WITH_ME, limit: 20 });
  var dreams = sharedInf.items;

  var stagger = function (index) {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.6s cubic-bezier(0.4,0,0.2,1) " + (index * 0.07) + "s, transform 0.6s cubic-bezier(0.4,0,0.2,1) " + (index * 0.07) + "s",
    };
  };

  /* ─── Loading ──────────────────────────────────────── */
  if (sharedInf.isLoading) {
    return (
      <PageLayout header={
        <GlassAppBar
          left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} />}
          title="Shared With Me"
        />
      }>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3].map(function (i) { return <SkeletonCard key={i} height={140} />; })}
          </div>
        </div>
      </PageLayout>
    );
  }

  /* ─── Content ──────────────────────────────────────── */
  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} />}
        title="Shared With Me"
        subtitle="Dreams others have shared with you"
      />
    }>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingBottom: 24 }}>

        {/* Empty state */}
        {dreams.length === 0 && (
          <div style={{
            ...stagger(1),
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "80px 20px", textAlign: "center",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
            }}>
              <Share2 size={28} color="#8B5CF6" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--dp-text)", margin: 0 }}>
              No shared dreams yet
            </p>
            <p style={{ fontSize: 13, color: "var(--dp-text-muted)", marginTop: 8, maxWidth: 260, lineHeight: 1.5 }}>
              When someone shares a dream with you, it will appear here.
            </p>
          </div>
        )}

        {/* Dream cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {dreams.map(function (dream, idx) {
            var progress = dream.progress || 0;
            var description = dream.description || "";
            if (description.length > 100) description = description.slice(0, 100) + "...";
            var sharedBy = dream.sharedBy?.displayName || dream.sharedBy?.username || dream.owner?.displayName || dream.owner?.username || "Someone";

            return (
              <GlassCard
                key={dream.id}
                hover
                padding={18}
                onClick={function () { navigate("/dream/" + dream.id); }}
                style={{
                  ...stagger(1 + idx),
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease, opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {/* Top row: title + chevron */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", margin: 0, flex: 1 }}>
                    {dream.title}
                  </h3>
                  <ChevronRight size={18} color="var(--dp-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>

                {/* Description */}
                {description && (
                  <p style={{ fontSize: 13, color: "var(--dp-text-tertiary)", margin: "6px 0 0", lineHeight: 1.5 }}>
                    {description}
                  </p>
                )}

                {/* Meta row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                  {/* Category badge */}
                  {dream.category && (
                    <div style={{
                      padding: "3px 10px", borderRadius: 50,
                      background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-accent)" }}>
                        {dream.category}
                      </span>
                    </div>
                  )}

                  {dream.targetDate && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={12} color="var(--dp-text-muted)" />
                      <span style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>
                        {new Date(dream.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Share2 size={12} color="var(--dp-text-muted)" />
                    <span style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>{sharedBy}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Target size={12} color="#8B5CF6" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)" }}>
                        Progress
                      </span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-accent)" }}>
                      {progress}%
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(139,92,246,0.1)" }}>
                    <div style={{
                      width: progress + "%", height: "100%", borderRadius: 3,
                      background: "linear-gradient(90deg, #8B5CF6, #C4B5FD)",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              </GlassCard>
            );
          })}
          <div ref={sharedInf.sentinelRef} />
          {sharedInf.loadingMore && (
            <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, color: "var(--dp-text-tertiary)" }}>Loading more...</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
