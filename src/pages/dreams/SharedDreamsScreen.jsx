import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Target, Calendar, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PageLayout from "../../components/shared/PageLayout";
import { apiGet } from "../../services/api";
import { DREAMS } from "../../services/endpoints";
import { SkeletonCard } from "../../components/shared/Skeleton";

var glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
};

var font = "Inter, sans-serif";

export default function SharedDreamsScreen() {
  var navigate = useNavigate();
  var [mounted, setMounted] = useState(false);

  useEffect(function () {
    var timer = setTimeout(function () { setMounted(true); }, 50);
    return function () { clearTimeout(timer); };
  }, []);

  var query = useQuery({
    queryKey: ["shared-dreams"],
    queryFn: function () { return apiGet(DREAMS.SHARED_WITH_ME); },
  });

  var dreams = query.data?.results || query.data || [];

  var stagger = function (index) {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.6s cubic-bezier(0.4,0,0.2,1) " + (index * 0.07) + "s, transform 0.6s cubic-bezier(0.4,0,0.2,1) " + (index * 0.07) + "s",
    };
  };

  /* ─── Loading ──────────────────────────────────────── */
  if (query.isLoading) {
    return (
      <PageLayout>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingTop: 20, paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <button className="dp-ib" onClick={function () { navigate(-1); }}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--dp-text)", fontFamily: font, margin: 0, letterSpacing: "-0.5px" }}>
              Shared With Me
            </h1>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3].map(function (i) { return <SkeletonCard key={i} height={140} />; })}
          </div>
        </div>
      </PageLayout>
    );
  }

  /* ─── Content ──────────────────────────────────────── */
  return (
    <PageLayout>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", paddingTop: 20, paddingBottom: 24 }}>
        {/* Header */}
        <div style={{ ...stagger(0), display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <button className="dp-ib" onClick={function () { navigate(-1); }}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--dp-text)", fontFamily: font, margin: 0, letterSpacing: "-0.5px" }}>
              Shared With Me
            </h1>
            <p style={{ fontSize: 13, color: "var(--dp-text-tertiary)", fontFamily: font, margin: 0, marginTop: 2 }}>
              Dreams others have shared with you
            </p>
          </div>
        </div>

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
            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--dp-text)", fontFamily: font, margin: 0 }}>
              No shared dreams yet
            </p>
            <p style={{ fontSize: 13, color: "var(--dp-text-muted)", fontFamily: font, marginTop: 8, maxWidth: 260, lineHeight: 1.5 }}>
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
              <div
                key={dream.id}
                onClick={function () { navigate("/dream/" + dream.id); }}
                style={{
                  ...stagger(1 + idx), ...glass,
                  padding: 18, cursor: "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease, opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {/* Top row: title + chevron */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", fontFamily: font, margin: 0, flex: 1 }}>
                    {dream.title}
                  </h3>
                  <ChevronRight size={18} color="var(--dp-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>

                {/* Description */}
                {description && (
                  <p style={{ fontSize: 13, color: "var(--dp-text-tertiary)", fontFamily: font, margin: "6px 0 0", lineHeight: 1.5 }}>
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
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#C4B5FD", fontFamily: font }}>
                        {dream.category}
                      </span>
                    </div>
                  )}

                  {dream.targetDate && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={12} color="var(--dp-text-muted)" />
                      <span style={{ fontSize: 12, color: "var(--dp-text-tertiary)", fontFamily: font }}>
                        {new Date(dream.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Share2 size={12} color="var(--dp-text-muted)" />
                    <span style={{ fontSize: 12, color: "var(--dp-text-tertiary)", fontFamily: font }}>{sharedBy}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Target size={12} color="#8B5CF6" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", fontFamily: font }}>
                        Progress
                      </span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#C4B5FD", fontFamily: font }}>
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
              </div>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
