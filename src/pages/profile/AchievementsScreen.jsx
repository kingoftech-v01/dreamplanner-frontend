import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../services/api";
import {
  ArrowLeft, Award, Flame, Star, Target, Heart, Sparkles,
  Sun, Moon, Users, CheckCircle, Zap, Eye, BookOpen, Trophy,
  Lock,
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { SkeletonCard } from "../../components/shared/Skeleton";
import { useTheme } from "../../context/ThemeContext";

var ICON_MAP = {
  flame: Flame, star: Star, target: Target, award: Award,
  heart: Heart, sparkles: Sparkles, sun: Sun, moon: Moon,
  users: Users, check_circle: CheckCircle, zap: Zap, eye: Eye,
  book_open: BookOpen, trophy: Trophy, lock: Lock,
};

var CATEGORY_COLORS = {
  streaks: "#F69A9A",
  dreams: "#C4B5FD",
  social: "#5EEAD4",
  tasks: "#5DE5A8",
  special: "#FCD34D",
};

function resolveIcon(name) {
  if (!name) return Award;
  var lower = name.toLowerCase().replace(/-/g, "_");
  return ICON_MAP[lower] || Award;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function normalizeAchievement(raw) {
  return Object.assign({}, {
    id: raw.id,
    label: raw.name || raw.title || "Achievement",
    desc: raw.description || "",
    icon: resolveIcon(raw.icon),
    color: raw.color || CATEGORY_COLORS[raw.category] || "#C4B5FD",
    xp: raw.xpReward || raw.xp || 0,
    unlocked: Boolean(raw.unlocked || raw.unlockedAt),
    date: formatDate(raw.unlockedAt || raw.date),
    progress: raw.progress != null ? raw.progress : null,
  });
}

export default function AchievementsScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);

  var achievementsQuery = useQuery({
    queryKey: ["achievements"],
    queryFn: function () {
      return apiGet("/api/users/achievements/");
    },
  });

  var rawData = achievementsQuery.data;
  var achievements = Array.isArray(rawData)
    ? rawData.map(normalizeAchievement)
    : Array.isArray(rawData && rawData.results)
      ? rawData.results.map(normalizeAchievement)
      : [];

  var unlockedCount = achievements.filter(function (a) { return a.unlocked; }).length;
  var totalXP = achievements.filter(function (a) { return a.unlocked; }).reduce(function (s, a) { return s + a.xp; }, 0);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 60}ms`,
  });

  return (
    <PageLayout>
      <div style={{ paddingTop: 20, paddingBottom: 40, fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, ...stagger(0) }}>
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>Achievements</span>
          <span style={{
            marginLeft: "auto", padding: "4px 10px", borderRadius: 10,
            background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)",
            fontSize: 12, fontWeight: 600, color: isLight ? "#6D28D9" : "#C4B5FD",
          }}>
            {unlockedCount}/{achievements.length}
          </span>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, ...stagger(1) }}>
          {[
            { icon: Award, val: unlockedCount, label: "Unlocked", color: "#FCD34D" },
            { icon: Zap, val: totalXP, label: "XP Earned", color: "#5DE5A8" },
            { icon: Flame, val: "8 days", label: "Streak", color: "#F69A9A" },
          ].map(({ icon: I, val, label, color }, i) => (
            <div key={i} style={{
              flex: 1, padding: "14px 8px", textAlign: "center", borderRadius: 16,
              background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            }}>
              <I size={18} color={isLight ? ({ "#FCD34D": "#B45309", "#5DE5A8": "#059669", "#F69A9A": "#DC2626" }[color] || color) : color} strokeWidth={2} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)" }}>{val}</div>
              <div style={{ fontSize: 10, color: "var(--dp-text-tertiary)", fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Loading State */}
        {achievementsQuery.isLoading && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[1, 2, 3, 4, 5, 6].map(function (n) {
              return <SkeletonCard key={n} height={180} style={{ borderRadius: 18 }} />;
            })}
          </div>
        )}

        {/* Empty State */}
        {!achievementsQuery.isLoading && achievements.length === 0 && (
          <div style={{
            textAlign: "center", padding: "48px 24px",
            background: "var(--dp-glass-bg)", borderRadius: 20,
            border: "1px solid var(--dp-glass-border)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            ...stagger(2),
          }}>
            <Trophy size={40} color="var(--dp-text-muted)" strokeWidth={1.5} style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6 }}>
              No achievements yet
            </div>
            <div style={{ fontSize: 13, color: "var(--dp-text-muted)", lineHeight: 1.5 }}>
              Keep working on your dreams and tasks to unlock achievements!
            </div>
          </div>
        )}

        {/* Unlocked Section */}
        {!achievementsQuery.isLoading && achievements.filter(function (a) { return a.unlocked; }).length > 0 && (
          <>
            <div style={{ marginBottom: 8, ...stagger(2) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Trophy size={14} color={isLight ? "#B45309" : "#FCD34D"} strokeWidth={2.5} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}>Unlocked</span>
                <span style={{ fontSize: 12, color: "var(--dp-text-muted)", fontWeight: 500 }}>
                  ({achievements.filter(function (a) { return a.unlocked; }).length})
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
              {achievements.filter(function (a) { return a.unlocked; }).map(function (a, i) {
                var Icon = a.icon;
                return (
                  <div key={a.id} style={{
                    ...stagger(3 + i),
                    padding: 16, borderRadius: 18,
                    background: "var(--dp-glass-bg)",
                    border: "1px solid var(--dp-glass-border)",
                    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 10, textAlign: "center",
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 16,
                      background: `${a.color}15`, border: `1px solid ${a.color}25`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 0 20px ${a.color}15`,
                    }}>
                      <Icon size={24} color={isLight ? ({ "#C4B5FD": "#6D28D9", "#5DE5A8": "#059669", "#5EEAD4": "#0D9488", "#FCD34D": "#B45309", "#F69A9A": "#DC2626" }[a.color] || a.color) : a.color} strokeWidth={1.8} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", marginBottom: 3 }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: "var(--dp-text-tertiary)", lineHeight: 1.4 }}>{a.desc}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
                      <span style={{
                        padding: "3px 8px", borderRadius: 8,
                        background: "rgba(93,229,168,0.1)", border: "1px solid rgba(93,229,168,0.15)",
                        fontSize: 11, fontWeight: 600, color: isLight ? "#059669" : "#5DE5A8",
                      }}>
                        +{a.xp} XP
                      </span>
                      <span style={{ fontSize: 10, color: "var(--dp-text-muted)" }}>{a.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Locked Section */}
        {!achievementsQuery.isLoading && achievements.filter(function (a) { return !a.unlocked; }).length > 0 && (
          <>
            <div style={{ marginBottom: 8, ...stagger(3 + achievements.filter(function (a) { return a.unlocked; }).length) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Lock size={14} color="var(--dp-text-muted)" strokeWidth={2.5} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text-tertiary)" }}>Locked</span>
                <span style={{ fontSize: 12, color: "var(--dp-text-muted)", fontWeight: 500 }}>
                  ({achievements.filter(function (a) { return !a.unlocked; }).length})
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {achievements.filter(function (a) { return !a.unlocked; }).map(function (a, i) {
                var Icon = a.icon;
                var base = 4 + achievements.filter(function (x) { return x.unlocked; }).length;
                return (
                  <div key={a.id} style={{
                    ...stagger(base + i),
                    padding: 16, borderRadius: 18,
                    background: "var(--dp-glass-bg)",
                    border: "1px solid var(--dp-glass-bg)",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 10, textAlign: "center", opacity: mounted ? 0.55 : 0,
                    transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${(base + i) * 60}ms`,
                  }}>
                    <div style={{ position: "relative" }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={24} color="var(--dp-text-muted)" strokeWidth={1.8} />
                      </div>
                      <div style={{
                        position: "absolute", bottom: -3, right: -3,
                        width: 20, height: 20, borderRadius: 7,
                        background: "var(--dp-modal-bg)", border: "1px solid var(--dp-surface-hover)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Lock size={10} color="var(--dp-text-muted)" />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-tertiary)", marginBottom: 3 }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: "var(--dp-text-muted)", lineHeight: 1.4 }}>{a.desc}</div>
                    </div>
                    <span style={{
                      padding: "3px 8px", borderRadius: 8, marginTop: "auto",
                      background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
                      fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)",
                    }}>
                      +{a.xp} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
