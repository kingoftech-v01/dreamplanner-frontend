import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../../services/api";
import { CIRCLES } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import {
  ArrowLeft, Users, Plus, Flame, Search, UserPlus, Check, X
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import PillTabs from "../../components/shared/PillTabs";
import ErrorState from "../../components/shared/ErrorState";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { adaptColor, catSolid, BRAND } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GlassInput from "../../components/shared/GlassInput";
import GradientButton from "../../components/shared/GradientButton";
import ExpandableText from "../../components/shared/ExpandableText";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Circles Screen
// Category-filtered discover + horizontal My Circles row
// ═══════════════════════════════════════════════════════════════

var CIRCLE_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "career", label: "Career" },
  { key: "health", label: "Health" },
  { key: "fitness", label: "Fitness" },
  { key: "education", label: "Education" },
  { key: "finance", label: "Finance" },
  { key: "creativity", label: "Creativity" },
  { key: "relationships", label: "Social" },
  { key: "personal_growth", label: "Growth" },
  { key: "hobbies", label: "Hobbies" },
];

// Extra categories not in colors.js CATEGORIES map
var EXTRA_CAT_COLORS = {
  fitness: "#3B82F6", education: "#6366F1", creativity: "#EC4899",
  personal_growth: "#6366F1", other: "#9CA3AF",
};

function getCatColor(key) {
  if (!key) return BRAND.purple;
  var k = key.toLowerCase().replace(/\s+/g, "_");
  return catSolid(k) || EXTRA_CAT_COLORS[k] || BRAND.purple;
}

function normalizeCircles(data) {
  var list = Array.isArray(data) ? data : (data && data.results ? data.results : []);
  return list.map(function (c) {
    return {
      id: c.id,
      name: c.name || "",
      description: c.description || "",
      category: c.category || "other",
      memberCount: c.memberCount != null ? c.memberCount : (c.member_count || 0),
      activeChallenge: c.activeChallenge || c.active_challenge || null,
      isJoined: c.isJoined != null ? c.isJoined : (c.is_joined || false),
    };
  });
}

export default function CirclesScreen() {
  var navigate = useNavigate();
  var { resolved } = useTheme(); var isLight = resolved === "light";
  var { showToast } = useToast();
  var qc = useQueryClient();
  var [mounted, setMounted] = useState(false);
  var [showSearch, setShowSearch] = useState(false);
  var [searchText, setSearchText] = useState("");
  var [debouncedSearch, setDebouncedSearch] = useState("");
  var [activeCategory, setActiveCategory] = useState("all");
  var [justJoinedSet, setJustJoinedSet] = useState(function () { return new Set(); });
  var debounceRef = useRef(null);

  // Debounce search input
  useEffect(function () {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(function () {
      setDebouncedSearch(searchText.trim());
    }, 300);
    return function () { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText]);

  // Build discover URL with category + search filters
  var discoverUrl = CIRCLES.LIST + "?filter=recommended";
  if (activeCategory !== "all") discoverUrl += "&category=" + activeCategory;
  if (debouncedSearch) discoverUrl += "&search=" + encodeURIComponent(debouncedSearch);

  var myCirclesInf = useInfiniteList({ queryKey: ["circles", "my"], url: CIRCLES.LIST + "?filter=my", limit: 20 });
  var discoverInf = useInfiniteList({ queryKey: ["circles", "discover", activeCategory, debouncedSearch], url: discoverUrl, limit: 20 });

  var myCircles = normalizeCircles(myCirclesInf.items);
  var discoverCircles = normalizeCircles(discoverInf.items);

  useEffect(function () { setTimeout(function () { setMounted(true); }, 100); }, []);

  var joinMut = useMutation({
    mutationFn: function (circleId) { return apiPost(CIRCLES.JOIN(circleId)); },
    onSuccess: function (_data, circleId) {
      setJustJoinedSet(function (prev) { var next = new Set(prev); next.add(circleId); return next; });
      qc.invalidateQueries({ queryKey: ["circles"] });
      showToast("Joined circle!", "success");
    },
    onError: function (err) { showToast(err.message || "Failed to join", "error"); },
  });

  if (myCirclesInf.isError || discoverInf.isError) {
    return <PageLayout><ErrorState message="Failed to load circles" onRetry={function () { myCirclesInf.refetch(); discoverInf.refetch(); }} /></PageLayout>;
  }

  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} />}
        title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><Users size={20} color="var(--dp-accent)" /><span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>Circles</span></span>}
        right={
          <div style={{ display: "flex", gap: 6 }}>
            <IconButton icon={showSearch ? X : Search} onClick={function () { setShowSearch(!showSearch); setSearchText(""); }} />
            <IconButton icon={Plus} onClick={function () { navigate("/circles/create"); }} />
          </div>
        }
      />
    }>

      <div style={{ paddingBottom: 32, opacity: mounted ? 1 : 0, transition: "opacity 0.4s ease" }}>

        {/* Search bar */}
        {showSearch && (
          <div style={{ marginBottom: 12 }}>
            <GlassInput icon={Search} value={searchText} onChange={function (e) { setSearchText(e.target.value); }} autoFocus placeholder="Search circles..." />
          </div>
        )}

        {/* ═══ MY CIRCLES — horizontal scroll row ═══ */}
        {myCircles.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}>My Circles</span>
              <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>{myCircles.length}</span>
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
              {myCircles.map(function (circle) {
                var catColor = getCatColor(circle.category);
                return (
                  <div key={circle.id} onClick={function () { navigate("/circle/" + circle.id); }} style={{
                    flexShrink: 0, width: 80, textAlign: "center", cursor: "pointer",
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 18, margin: "0 auto 6px",
                      background: catColor + "15", border: "2px solid " + catColor + "30",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: catColor }}>
                        {(circle.name || "C")[0].toUpperCase()}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: "var(--dp-text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {circle.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {myCircles.length === 0 && !myCirclesInf.isLoading && (
          <GlassCard padding={20} mb={16} style={{ textAlign: "center" }}>
            <Users size={28} color="var(--dp-text-muted)" strokeWidth={1.5} style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", marginBottom: 4 }}>No circles yet</p>
            <p style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>Join a circle below to get started!</p>
          </GlassCard>
        )}

        {/* ═══ DISCOVER ═══ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}>Discover</span>
        </div>

        {/* Category filter tabs */}
        <PillTabs
          tabs={CIRCLE_CATEGORIES}
          active={activeCategory}
          onChange={setActiveCategory}
          size="sm"
          scrollable
          style={{ marginBottom: 14 }}
        />

        {discoverInf.isLoading && (
          <div style={{ textAlign: "center", padding: 32, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading circles...</div>
        )}

        {!discoverInf.isLoading && discoverCircles.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: "var(--dp-text-muted)" }}>
            <p style={{ fontSize: 14 }}>{debouncedSearch ? "No circles match your search" : "No circles to discover"}</p>
          </div>
        )}

        {discoverCircles.map(function (circle) {
          var catColor = getCatColor(circle.category);
          var justJoined = circle.isJoined || justJoinedSet.has(circle.id);

          return (
            <GlassCard key={circle.id} hover padding={16} mb={10} onClick={function () { navigate("/circle/" + circle.id); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: catColor + "15", border: "1px solid " + catColor + "25",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: catColor }}>
                    {(circle.name || "C")[0].toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                    {circle.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      padding: "2px 7px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                      background: catColor + "12", color: adaptColor(catColor, isLight),
                      border: "1px solid " + catColor + "20",
                    }}>{circle.category}</span>
                    <span style={{ fontSize: 11, color: "var(--dp-text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                      <Users size={11} /> {circle.memberCount}
                    </span>
                    {circle.activeChallenge && (
                      <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#FB923C" }}>
                        <Flame size={10} /> Active
                      </span>
                    )}
                  </div>
                </div>
                <GradientButton
                  gradient={justJoined ? "teal" : "primaryDark"}
                  size="sm"
                  icon={justJoined ? Check : UserPlus}
                  disabled={justJoined || joinMut.isPending}
                  onClick={function (e) { e.stopPropagation(); joinMut.mutate(circle.id); }}
                >
                  {justJoined ? "Joined" : "Join"}
                </GradientButton>
              </div>
              {circle.description && (
                <ExpandableText text={circle.description} maxLines={2} fontSize={12} color="var(--dp-text-secondary)" style={{ marginTop: 8 }} />
              )}
            </GlassCard>
          );
        })}

        <div ref={discoverInf.sentinelRef} style={{ height: 1 }} />
        {discoverInf.loadingMore && <div style={{ textAlign: "center", padding: 16, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading more...</div>}
      </div>
    </PageLayout>
  );
}
