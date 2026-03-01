import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../services/api";
import { USERS, NOTIFICATIONS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import BottomNav from "../../components/shared/BottomNav";
import ErrorState from "../../components/shared/ErrorState";
import { SkeletonCard } from "../../components/shared/Skeleton";
import {
  ArrowLeft, Settings, Star, Zap, Flame, ChevronRight,
  MessageCircle, Crown, ShoppingBag, Trophy, Bell, Eye,
  Calendar, LogOut, Heart, Briefcase, Brain, Palette,
  Edit3, Shield, Award, Target, TrendingUp
} from "lucide-react";

// ─── Icon map for skill categories returned by API ────────────────
var SKILL_ICON_MAP = {
  "health": Heart,
  "health & fitness": Heart,
  "career": Briefcase,
  "career & work": Briefcase,
  "relationships": Heart,
  "personal growth": Brain,
  "personal": Brain,
  "hobbies": Palette,
  "hobbies & creativity": Palette,
};

var SKILL_COLOR_MAP = {
  "health": "#5DE5A8",
  "health & fitness": "#5DE5A8",
  "career": "#C4B5FD",
  "career & work": "#C4B5FD",
  "relationships": "#F69A9A",
  "personal growth": "#FCD34D",
  "personal": "#FCD34D",
  "hobbies": "#5EEAD4",
  "hobbies & creativity": "#5EEAD4",
};

// ─── Icon map for achievement/badge types returned by API ─────────
var BADGE_ICON_MAP = {
  "streak": Flame,
  "level": Star,
  "dream": Target,
  "task": Award,
  "social": Heart,
};

var BADGE_COLOR_MAP = {
  "streak": "#F69A9A",
  "level": "#FCD34D",
  "dream": "#C4B5FD",
  "task": "#5DE5A8",
  "social": "#5EEAD4",
};

function buildMenu(t) {
  return [
    { icon: MessageCircle, label: t("profile.conversations"), color: "#C4B5FD", path: "/conversations" },
    { icon: Crown, label: t("profile.subscription"), color: "#FCD34D", path: "/subscription" },
    { icon: ShoppingBag, label: t("profile.store"), color: "#5EEAD4", path: "/store" },
    { icon: Trophy, label: t("profile.leaderboard"), color: "#F69A9A", path: "/leaderboard" },
    { icon: Bell, label: t("notifications.title"), isNotif: true, color: "#C4B5FD", path: "/notifications" },
    { icon: Eye, label: t("profile.visionBoard"), color: "#5DE5A8", path: "/vision-board" },
    { icon: Calendar, label: t("profile.calendarSync"), color: "#93C5FD", path: "/calendar" },
  ];
}

const LIGHT_MAP = {
  "#C4B5FD": "#6D28D9", "#FCD34D": "#B45309", "#5DE5A8": "#059669",
  "#F69A9A": "#DC2626", "#5EEAD4": "#0D9488", "#93C5FD": "#2563EB",
};

function lc(color, isLight) {
  return isLight && LIGHT_MAP[color] ? LIGHT_MAP[color] : color;
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { resolved, uiOpacity } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  var { user, logout } = useAuth();
  var { showToast } = useToast();
  var { t } = useT();
  var MENU = buildMenu(t);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  // ── Fetch gamification data from API ──
  var gamifQuery = useQuery({
    queryKey: ["gamification"],
    queryFn: function () { return apiGet(USERS.GAMIFICATION); },
  });

  // ── Fetch stats data from API ──
  var statsQuery = useQuery({
    queryKey: ["user-stats"],
    queryFn: function () { return apiGet(USERS.STATS); },
  });

  // ── Notification unread count ──
  var unreadQuery = useQuery({
    queryKey: ["notif-unread"],
    queryFn: function () { return apiGet(NOTIFICATIONS.UNREAD_COUNT); },
  });
  var notifUnread = (unreadQuery.data && (unreadQuery.data.unreadCount || unreadQuery.data.count)) || 0;

  // ── Derive profile values from auth user + gamification data ──
  var displayName = (user && (user.displayName || user.firstName || user.username)) || "User";
  var initial = displayName.charAt(0).toUpperCase();
  var email = (user && user.email) || "";
  var subscription = (user && user.subscription) || "free";
  var isPremium = subscription.toLowerCase() !== "free";
  var subscriptionLabel = subscription.toUpperCase();

  var gamif = gamifQuery.data || {};
  var level = gamif.level || 1;
  var xp = gamif.xp || 0;
  var xpToNext = gamif.xpToNext || gamif.xpToNextLevel || 1000;
  var streak = gamif.streak || gamif.currentStreak || 0;
  var rank = gamif.rank || gamif.leaderboardRank || null;
  var renewDate = (user && user.renewDate) || (user && user.subscriptionRenewDate) || "";

  var lvlProgress = xpToNext > 0 ? xp / xpToNext : 0;

  // ── Derive skills from gamification API response ──
  var rawSkills = gamif.skills || gamif.categorySkills || [];
  var skills = rawSkills.map(function (s) {
    var key = (s.label || s.name || s.category || "").toLowerCase();
    return {
      label: s.label || s.name || s.category || "Skill",
      level: s.level || 1,
      xp: s.xp || 0,
      maxXp: s.maxXp || s.xpToNext || 1000,
      color: SKILL_COLOR_MAP[key] || "#C4B5FD",
      Icon: SKILL_ICON_MAP[key] || Star,
    };
  });

  // ── Derive achievements/badges from gamification API response ──
  var rawBadges = gamif.badges || gamif.achievements || [];
  var achievements = rawBadges.slice(0, 5).map(function (b) {
    var key = (b.type || b.category || "").toLowerCase();
    return {
      label: b.label || b.name || b.title || "Badge",
      icon: BADGE_ICON_MAP[key] || Award,
      color: BADGE_COLOR_MAP[key] || "#C4B5FD",
    };
  });

  var isLoadingData = gamifQuery.isLoading || statsQuery.isLoading;
  var isErrorData = gamifQuery.isError || statsQuery.isError;

  // ── Sign out handler ──
  var handleSignOut = function () {
    logout().then(function () {
      showToast(t("profile.signedOut"), "success");
    }).catch(function () {
      showToast(t("profile.signOutFailed"), "error");
    });
  };

  const tile = {
    borderRadius: 20,
    background: isLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.03)",
    border: isLight ? "1px solid rgba(139,92,246,0.1)" : "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  };

  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
    transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
  });

  if (isErrorData) {
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ErrorState
            message={(gamifQuery.error && gamifQuery.error.message) || (statsQuery.error && statsQuery.error.message) || t("profile.failedLoad")}
            onRetry={function () { gamifQuery.refetch(); statsQuery.refetch(); }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>

      {/* APPBAR */}
      <header style={{
        position: "relative", zIndex: 100, height: 64, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px",
        background: isLight ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.03)",
        backdropFilter: "blur(40px) saturate(1.4)", WebkitBackdropFilter: "blur(40px) saturate(1.4)",
        borderBottom: isLight ? "1px solid rgba(139,92,246,0.1)" : "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="dp-ib" aria-label="Go back" onClick={() => navigate(-1)}><ArrowLeft size={20} strokeWidth={2} /></button>
          <span style={{ fontSize: 17, fontWeight: 700, color: isLight ? "#1a1535" : "#fff", letterSpacing: "-0.3px" }}>{t("profile.title")}</span>
        </div>
        <button className="dp-ib" aria-label="Settings" onClick={() => navigate("/settings")}><Settings size={18} strokeWidth={2} /></button>
      </header>

      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", zIndex: 10, padding: "16px 16px 100px", opacity: uiOpacity, transition: "opacity 0.3s ease" }}>
        <div style={{ width: "100%" }}>

          {/* ══ Loading skeleton while data is fetching ══ */}
          {isLoadingData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SkeletonCard height={220} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <SkeletonCard height={140} />
                <SkeletonCard height={140} />
              </div>
              <SkeletonCard height={180} />
              <SkeletonCard height={120} />
              <SkeletonCard height={280} />
            </div>
          ) : (
          <>
          {/* ══ BENTO ROW 1: Avatar tile + Stats tiles ══ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>

            {/* Avatar Tile (tall, spans 2 rows on left) */}
            <div style={{
              ...tile, ...stagger(0),
              gridRow: "1 / 3", padding: "16px 10px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {/* Avatar with Double Ring Orbit */}
              <div style={{ position: "relative", width: 90, height: 90, marginBottom: 10, flexShrink: 0 }}>
                {/* Outer orbit ring (dotted, rotating) */}
                <div className="dp-orbit-outer" style={{
                  position: "absolute", inset: -4,
                  borderRadius: "50%",
                  border: isLight ? "1.5px dashed rgba(139,92,246,0.2)" : "1.5px dashed rgba(196,181,253,0.15)",
                }} />
                {/* Orbital dots */}
                <div className="dp-orbit-outer" style={{ position: "absolute", inset: -4, borderRadius: "50%" }}>
                  {[0, 90, 180, 270].map((deg, i) => (
                    <div key={i} style={{
                      position: "absolute", top: "50%", left: "50%",
                      width: 5, height: 5, borderRadius: "50%",
                      background: ["#8B5CF6", "#5DE5A8", "#C4B5FD", "#14B8A6"][i],
                      boxShadow: `0 0 6px ${["#8B5CF6", "#5DE5A8", "#C4B5FD", "#14B8A6"][i]}60`,
                      transform: `rotate(${deg}deg) translateX(${49}px) translateY(-50%)`,
                    }} />
                  ))}
                </div>

                {/* XP Progress ring (inner) */}
                <svg width={90} height={90} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
                  <defs>
                    <linearGradient id="orbitGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="50%" stopColor="#C4B5FD" />
                      <stop offset="100%" stopColor="#5DE5A8" />
                    </linearGradient>
                  </defs>
                  <circle cx={45} cy={45} r={39} fill="none"
                    stroke={isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.06)"}
                    strokeWidth={3} />
                  <circle cx={45} cy={45} r={39} fill="none"
                    stroke="url(#orbitGrad)" strokeWidth={3} strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 39}
                    strokeDashoffset={mounted ? 2 * Math.PI * 39 * (1 - lvlProgress) : 2 * Math.PI * 39}
                    style={{
                      transition: "stroke-dashoffset 1.8s cubic-bezier(0.16,1,0.3,1) 0.3s",
                      filter: "drop-shadow(0 0 6px rgba(139,92,246,0.5))",
                    }} />
                </svg>

                {/* Glow backdrop */}
                <div style={{
                  position: "absolute", inset: 12,
                  borderRadius: "50%",
                  background: isLight
                    ? "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
                  filter: "blur(4px)",
                }} />

                {/* Circle Avatar */}
                <div style={{
                  position: "absolute", inset: 12,
                  borderRadius: "50%",
                  background: isLight
                    ? "linear-gradient(145deg, rgba(139,92,246,0.12), rgba(109,40,217,0.08))"
                    : "linear-gradient(145deg, rgba(139,92,246,0.2), rgba(20,16,40,0.8))",
                  border: isLight ? "2.5px solid rgba(139,92,246,0.2)" : "2.5px solid rgba(139,92,246,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: isLight
                    ? "inset 0 2px 8px rgba(139,92,246,0.1), 0 4px 20px rgba(139,92,246,0.15)"
                    : "inset 0 2px 8px rgba(139,92,246,0.15), 0 4px 20px rgba(139,92,246,0.2)",
                }}>
                  <span style={{
                    fontSize: 26, fontWeight: 800, letterSpacing: "-1px",
                    color: isLight ? "#6D28D9" : "#C4B5FD",
                    textShadow: isLight ? "none" : "0 0 20px rgba(196,181,253,0.3)",
                  }}>{initial}</span>
                </div>

                {/* Level badge */}
                <div style={{
                  position: "absolute", top: 0, right: -2, zIndex: 2,
                  padding: "2px 7px", borderRadius: 8,
                  background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                  fontSize: 10, fontWeight: 700, color: "#fff",
                  boxShadow: "0 2px 10px rgba(139,92,246,0.5)",
                  border: isLight ? "2px solid rgba(255,255,255,0.8)" : "2px solid rgba(20,16,40,0.6)",
                }}>Lv.{level}</div>

                {/* Edit button */}
                <button onClick={() => navigate("/edit-profile")} style={{
                  position: "absolute", bottom: 0, right: -2, zIndex: 2,
                  width: 26, height: 26, borderRadius: "50%",
                  background: isLight ? "rgba(255,255,255,0.9)" : "rgba(30,24,55,0.9)",
                  border: isLight ? "1.5px solid rgba(139,92,246,0.2)" : "1.5px solid rgba(139,92,246,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                  color: isLight ? "#6D28D9" : "#C4B5FD",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}>
                  <Edit3 size={11} strokeWidth={2.5} />
                </button>
              </div>

              {/* Name + Badge */}
              <div style={{ textAlign: "center", width: "100%", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 15, fontWeight: 700, color: isLight ? "#1a1535" : "#fff",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                  }}>{displayName}</span>
                  {isPremium && (
                    <span style={{
                      padding: "1px 6px", borderRadius: 6, flexShrink: 0,
                      background: isLight ? "linear-gradient(135deg, rgba(180,130,20,0.15), rgba(180,130,20,0.08))" : "linear-gradient(135deg, rgba(252,211,77,0.15), rgba(252,211,77,0.08))",
                      border: isLight ? "1px solid rgba(180,130,20,0.3)" : "1px solid rgba(252,211,77,0.25)",
                      fontSize: 9, fontWeight: 700, color: isLight ? "#92400E" : "#FCD34D",
                      display: "flex", alignItems: "center", gap: 2,
                    }}>
                      <Crown size={8} strokeWidth={2.5} />{subscriptionLabel}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 11, color: isLight ? "rgba(26,21,53,0.55)" : "rgba(255,255,255,0.5)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{email}</div>
              </div>
            </div>

            {/* XP + Level Tile */}
            <div style={{ ...tile, ...stagger(1), padding: 16, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Zap size={14} color={lc("#5DE5A8", isLight)} strokeWidth={2.5} />
                <span style={{ fontSize: 12, fontWeight: 600, color: isLight ? "rgba(26,21,53,0.65)" : "rgba(255,255,255,0.6)" }}>{t("profile.level")} {level}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: isLight ? "#1a1535" : "#fff", marginBottom: 2 }}>
                {xp.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.45)", marginBottom: 10 }}>
                / {xpToNext.toLocaleString()} XP
              </div>
              <div style={{ height: 5, borderRadius: 3, background: isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  background: "linear-gradient(90deg, #8B5CF6, #5DE5A8)",
                  width: mounted ? `${lvlProgress * 100}%` : "0%",
                  transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
                  boxShadow: "0 0 8px rgba(139,92,246,0.4)",
                }} />
              </div>
              <div style={{ fontSize: 11, color: isLight ? "rgba(26,21,53,0.45)" : "rgba(255,255,255,0.4)", marginTop: 4 }}>
                {(xpToNext - xp).toLocaleString()} {t("profile.toNext")}
              </div>
            </div>

            {/* Streak + Rank Tile */}
            <div style={{ ...tile, ...stagger(2), padding: 16, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: 12 }}>
                {/* Streak */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12, marginBottom: 8,
                    background: "rgba(246,154,154,0.1)", border: "1px solid rgba(246,154,154,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Flame size={18} color={lc("#F69A9A", isLight)} strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? "#1a1535" : "#fff" }}>{streak}</div>
                  <div style={{ fontSize: 11, color: isLight ? "rgba(26,21,53,0.55)" : "rgba(255,255,255,0.5)" }}>{t("profile.streak")}</div>
                </div>
                {/* Rank */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12, marginBottom: 8,
                    background: "rgba(196,181,253,0.1)", border: "1px solid rgba(196,181,253,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <TrendingUp size={18} color={lc("#C4B5FD", isLight)} strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: isLight ? "#1a1535" : "#fff" }}>{rank ? "#" + rank : "—"}</div>
                  <div style={{ fontSize: 11, color: isLight ? "rgba(26,21,53,0.55)" : "rgba(255,255,255,0.5)" }}>{t("profile.rank")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ══ SKILLS TILE ══ */}
          {skills.length > 0 && (
          <div style={{ ...tile, ...stagger(3), padding: 18, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <Shield size={15} color={lc("#C4B5FD", isLight)} strokeWidth={2.5} />
              <span style={{ fontSize: 14, fontWeight: 700, color: isLight ? "#1a1535" : "#fff" }}>{t("profile.skillRadar")}</span>
            </div>
            {skills.map(function (s, i) {
              var prog = s.maxXp > 0 ? s.xp / s.maxXp : 0;
              var sc = lc(s.color, isLight);
              return (
                <div key={i} style={{ marginBottom: i < skills.length - 1 ? 12 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <s.Icon size={12} color={sc} strokeWidth={2.5} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: isLight ? "#1a1535" : "#fff" }}>{s.label}</span>
                    </div>
                    <span style={{
                      padding: "1px 6px", borderRadius: 5,
                      background: `${s.color}12`, fontSize: 11, fontWeight: 700, color: sc,
                    }}>Lv.{s.level}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: isLight ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      background: `linear-gradient(90deg, ${s.color}90, ${s.color})`,
                      width: mounted ? `${prog * 100}%` : "0%",
                      transition: `width 1s cubic-bezier(0.16,1,0.3,1) ${300 + i * 100}ms`,
                      boxShadow: `0 0 6px ${s.color}30`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* ══ ACHIEVEMENTS TILE ══ */}
          {achievements.length > 0 && (
          <div style={{ ...tile, ...stagger(4), padding: 18, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Award size={15} color={lc("#FCD34D", isLight)} strokeWidth={2.5} />
                <span style={{ fontSize: 14, fontWeight: 700, color: isLight ? "#1a1535" : "#fff" }}>{t("profile.achievements")}</span>
              </div>
              <span
                onClick={() => navigate("/achievements")}
                style={{ fontSize: 12, color: isLight ? "#6D28D9" : "#C4B5FD", cursor: "pointer", fontWeight: 500 }}
              >{t("profile.seeAll")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {achievements.map(function (a, i) {
                var ac = lc(a.color, isLight);
                var BadgeIcon = a.icon;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 14,
                      background: `${a.color}10`, border: `1px solid ${a.color}15`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <BadgeIcon size={20} color={ac} strokeWidth={1.8} />
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 500, textAlign: "center", lineHeight: 1.2,
                      color: isLight ? "rgba(26,21,53,0.65)" : "rgba(255,255,255,0.6)",
                    }}>{a.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* ══ QUICK LINKS ══ */}
          <div style={{ ...tile, ...stagger(5), overflow: "hidden", marginBottom: 10 }}>
            {MENU.map((item, i) => {
              const mc = lc(item.color, isLight);
              return (
                <div
                  key={i}
                  onClick={() => navigate(item.path)}
                  style={{
                    padding: "13px 18px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 14,
                    borderBottom: i < MENU.length - 1 ? (isLight ? "1px solid rgba(139,92,246,0.06)" : "1px solid rgba(255,255,255,0.04)") : "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isLight ? "rgba(139,92,246,0.04)" : "rgba(255,255,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: `${item.color}10`, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <item.icon size={16} color={mc} strokeWidth={2} />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: isLight ? "#1a1535" : "#fff" }}>{item.label}</span>
                  {item.isNotif && notifUnread > 0 && (
                    <span style={{
                      padding: "2px 8px", borderRadius: 8,
                      background: "rgba(246,154,154,0.12)",
                      fontSize: 12, fontWeight: 600, color: isLight ? "#DC2626" : "#F69A9A",
                    }}>{notifUnread}</span>
                  )}
                  <ChevronRight size={16} color={isLight ? "rgba(26,21,53,0.3)" : "rgba(255,255,255,0.25)"} strokeWidth={2} />
                </div>
              );
            })}
          </div>

          {/* ══ SUBSCRIPTION INFO ══ */}
          {isPremium && renewDate && (
            <div style={{ ...stagger(6), textAlign: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: isLight ? "rgba(26,21,53,0.45)" : "rgba(255,255,255,0.35)" }}>
                {subscriptionLabel} {t("profile.renews")} {renewDate}
              </span>
            </div>
          )}

          {/* ══ SIGN OUT ══ */}
          <div style={stagger(7)}>
            <button
              onClick={handleSignOut}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 16,
                border: isLight ? "1px solid rgba(246,154,154,0.2)" : "1px solid rgba(246,154,154,0.15)",
                background: "rgba(246,154,154,0.06)",
                color: isLight ? "#DC2626" : "#F69A9A",
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(246,154,154,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(246,154,154,0.06)"}
            >
              <LogOut size={16} strokeWidth={2} />{t("settings.signOut")}
            </button>
          </div>

          </>
          )}
        </div>
      </main>

      <BottomNav />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        .dp-orbit-outer{animation:dpOrbitSpin 12s linear infinite;}
        @keyframes dpOrbitSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
      `}</style>
    </div>
  );
}
