import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../services/api";
import { USERS, NOTIFICATIONS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import ErrorState from "../../components/shared/ErrorState";
import { getAvatarEquipProps } from "../../utils/equippedItems";
import { SkeletonCard } from "../../components/shared/Skeleton";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import Avatar from "../../components/shared/Avatar";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GradientButton from "../../components/shared/GradientButton";
import GlassModal from "../../components/shared/GlassModal";
import BottomNav from "../../components/shared/BottomNav";
import { adaptColor, GRADIENTS, BRAND } from "../../styles/colors";
import {
  ArrowLeft, Settings, Star, Zap, Flame, ChevronRight,
  MessageCircle, Crown, ShoppingBag, Trophy, Bell, Eye,
  Calendar, LogOut, Heart, Briefcase, Brain, Palette,
  Edit3, Shield, Award, Target, TrendingUp, Bookmark
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
  "health": BRAND.green,
  "health & fitness": BRAND.green,
  "career": BRAND.purpleLight,
  "career & work": BRAND.purpleLight,
  "relationships": BRAND.red,
  "personal growth": BRAND.yellow,
  "personal": BRAND.yellow,
  "hobbies": BRAND.tealLight,
  "hobbies & creativity": BRAND.tealLight,
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
  "streak": BRAND.red,
  "level": BRAND.yellow,
  "dream": BRAND.purpleLight,
  "task": BRAND.green,
  "social": BRAND.tealLight,
};

function buildMenu(t) {
  return [
    { icon: MessageCircle, label: t("profile.conversations"), color: BRAND.purpleLight, path: "/conversations" },
    { icon: Bookmark, label: t("profile.savedPosts"), color: BRAND.blueLight, path: "/social/saved" },
    { icon: Crown, label: t("profile.subscription"), color: BRAND.yellow, path: "/subscription" },
    { icon: ShoppingBag, label: t("profile.store"), color: BRAND.tealLight, path: "/store" },
    { icon: Trophy, label: t("profile.leaderboard"), color: BRAND.red, path: "/leaderboard" },
    { icon: Bell, label: t("notifications.title"), isNotif: true, color: BRAND.purpleLight, path: "/notifications" },
    { icon: Eye, label: t("profile.visionBoard"), color: BRAND.green, path: "/vision-board" },
    { icon: Calendar, label: t("profile.calendarSync"), color: BRAND.blueLight, path: "/calendar" },
  ];
}

var lc = adaptColor;

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
  var userStats = statsQuery.data || {};

  // ── Level/XP/Streak from stats API (real data), with user context fallback ──
  var level = userStats.level || (user && user.level) || 1;
  var xp = userStats.xp || (user && user.xp) || 0;
  var xpToNext = userStats.xp_to_next_level || (100 - (xp % 100));
  var streak = userStats.streak_days || (user && user.streakDays) || 0;
  var renewDate = (user && user.renewDate) || (user && user.subscriptionRenewDate) || "";

  var lvlProgress = xpToNext > 0 ? (xp % 100) / 100 : 0;

  // ── Derive skills from gamification API response (skill_radar) ──
  var rawSkills = gamif.skill_radar || gamif.skillRadar || [];
  var skills = rawSkills.map(function (s) {
    var key = (s.label || s.category || "").toLowerCase();
    return {
      label: s.label || s.category || "Skill",
      level: s.level || 1,
      xp: s.xp || 0,
      maxXp: 100,
      color: SKILL_COLOR_MAP[key] || BRAND.purpleLight,
      Icon: SKILL_ICON_MAP[key] || Star,
    };
  });

  // ── Derive achievements/badges from gamification API response ──
  var rawBadges = gamif.badges || gamif.achievements || [];
  var achievements = (Array.isArray(rawBadges) ? rawBadges : []).slice(0, 5).map(function (b) {
    var key = (b.type || b.category || "").toLowerCase();
    return {
      label: b.label || b.name || b.title || "Badge",
      icon: BADGE_ICON_MAP[key] || Award,
      color: BADGE_COLOR_MAP[key] || BRAND.purpleLight,
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

  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
    transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
  });

  if (isErrorData) {
    return (
      <div className="dp-desktop-main" style={{ position: "absolute", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ErrorState
            message={(gamifQuery.error && (gamifQuery.error.userMessage || gamifQuery.error.message)) || (statsQuery.error && (statsQuery.error.userMessage || statsQuery.error.message)) || t("profile.failedLoad")}
            onRetry={function () { gamifQuery.refetch(); statsQuery.refetch(); }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="dp-desktop-main" style={{ position: "absolute", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* APPBAR */}
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={() => navigate("/")} label="Go back" size="md" />}
        title={t("profile.title")}
        right={<IconButton icon={Settings} onClick={() => navigate("/settings")} label="Settings" size="md" />}
      />

      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", zIndex: 10, padding: "16px 16px 100px", opacity: uiOpacity, transition: "opacity 0.3s ease" }}>
        <div className="dp-content-area">

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
            <GlassCard padding="16px 10px" style={{
              ...stagger(0),
              gridRow: "1 / 3",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {/* Avatar with Double Ring Orbit */}
              <div style={{ position: "relative", width: 90, height: 90, marginBottom: 10, flexShrink: 0 }}>
                {/* Outer orbit ring (dotted, rotating) */}
                <div className="dp-orbit-outer" style={{
                  position: "absolute", inset: -4,
                  borderRadius: "50%",
                  border: "1.5px dashed var(--dp-accent-border)",
                }} />
                {/* Orbital dots */}
                <div className="dp-orbit-outer" style={{ position: "absolute", inset: -4, borderRadius: "50%" }}>
                  {[0, 90, 180, 270].map((deg, i) => (
                    <div key={i} style={{
                      position: "absolute", top: "50%", left: "50%",
                      width: 5, height: 5, borderRadius: "50%",
                      background: [BRAND.purple, BRAND.green, BRAND.purpleLight, BRAND.teal][i],
                      boxShadow: `0 0 6px ${[BRAND.purple, BRAND.green, BRAND.purpleLight, BRAND.teal][i]}60`,
                      transform: `rotate(${deg}deg) translateX(${49}px) translateY(-50%)`,
                    }} />
                  ))}
                </div>

                {/* XP Progress ring (inner) */}
                <svg width={90} height={90} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
                  <defs>
                    <linearGradient id="orbitGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={BRAND.purple} />
                      <stop offset="50%" stopColor={BRAND.purpleLight} />
                      <stop offset="100%" stopColor={BRAND.green} />
                    </linearGradient>
                  </defs>
                  <circle cx={45} cy={45} r={39} fill="none"
                    stroke="var(--dp-glass-border)"
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
                  background: "radial-gradient(circle, var(--dp-accent-soft) 0%, transparent 70%)",
                  filter: "blur(4px)",
                }} />

                {/* Circle Avatar */}
                <div style={{ position: "absolute", inset: 12 }}>
                  {(function () {
                    var ep = getAvatarEquipProps(user);
                    var frameColor = ep.badgeFrame ? ep.badgeFrame.borderColor : "var(--dp-accent-border)";
                    var glowStyle = ep.badgeFrame && ep.badgeFrame.glow
                      ? "inset 0 2px 8px var(--dp-accent-soft), 0 4px 20px " + (ep.badgeFrame.glowColor || "var(--dp-accent-soft)")
                      : "inset 0 2px 8px var(--dp-accent-soft), 0 4px 20px var(--dp-accent-soft)";
                    return (
                      <Avatar
                        name={displayName}
                        size={66}
                        color="var(--dp-accent)"
                        shape="circle"
                        decoration={ep.decoration}
                        style={{
                          border: "2.5px solid " + frameColor,
                          boxShadow: glowStyle,
                          fontSize: 26, fontWeight: 800, letterSpacing: "-1px",
                        }}
                      />
                    );
                  })()}
                </div>

                {/* Level badge */}
                <div style={{
                  position: "absolute", top: 0, right: -2, zIndex: 2,
                  padding: "2px 7px", borderRadius: 8,
                  background: GRADIENTS.primaryDark,
                  fontSize: 10, fontWeight: 700, color: BRAND.white,
                  boxShadow: "0 2px 10px rgba(139,92,246,0.5)",
                  border: "2px solid var(--dp-glass-bg)",
                }}>Lv.{level}</div>

                {/* Edit button */}
                <button onClick={() => navigate("/edit-profile")} style={{
                  position: "absolute", bottom: 0, right: -2, zIndex: 2,
                  width: 26, height: 26, borderRadius: "50%",
                  background: "var(--dp-card-solid)",
                  border: "1.5px solid var(--dp-accent-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                  color: "var(--dp-accent)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  fontFamily: "inherit",
                }}>
                  <Edit3 size={11} strokeWidth={2.5} />
                </button>
              </div>

              {/* Name + Badge */}
              <div style={{ textAlign: "center", width: "100%", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 2 }}>
                  <h1 style={{
                    fontSize: 15, fontWeight: 700, color: "var(--dp-text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                    margin: 0,
                  }}>{displayName}</h1>
                  {isPremium && (
                    <span style={{
                      padding: "1px 6px", borderRadius: 6, flexShrink: 0,
                      background: "var(--dp-warning-soft)",
                      border: "1px solid var(--dp-warning-soft)",
                      fontSize: 9, fontWeight: 700, color: "var(--dp-warning)",
                      display: "flex", alignItems: "center", gap: 2,
                    }}>
                      <Crown size={8} strokeWidth={2.5} />{subscriptionLabel}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 11, color: "var(--dp-text-tertiary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{email}</div>
              </div>
            </GlassCard>

            {/* XP + Level Tile */}
            <GlassCard padding={16} style={{ ...stagger(1), display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Zap size={14} color={lc(BRAND.green, isLight)} strokeWidth={2.5} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)" }}>{t("profile.level")} {level}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--dp-text)", marginBottom: 2 }}>
                {xp.toLocaleString()} XP
              </div>
              <div style={{ fontSize: 11, color: "var(--dp-text-muted)", marginBottom: 10 }}>
                {xp % 100} / 100 to next level
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--dp-glass-border)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.green})`,
                  width: mounted ? `${lvlProgress * 100}%` : "0%",
                  transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
                  boxShadow: "0 0 8px rgba(139,92,246,0.4)",
                }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--dp-text-muted)", marginTop: 4 }}>
                {xpToNext} XP {t("profile.toNext")}
              </div>
            </GlassCard>

            {/* Streak + Rank Tile */}
            <GlassCard padding={16} style={{ ...stagger(2), display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: 12 }}>
                {/* Streak */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12, marginBottom: 8,
                    background: "var(--dp-danger-soft)", border: "1px solid var(--dp-danger-soft)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Flame size={18} color={lc(BRAND.red, isLight)} strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--dp-text)" }}>{streak}</div>
                  <div style={{ fontSize: 11, color: "var(--dp-text-tertiary)" }}>{t("profile.streak")}</div>
                </div>
                {/* Rank */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12, marginBottom: 8,
                    background: "var(--dp-accent-soft)", border: "1px solid var(--dp-accent-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <TrendingUp size={18} color={lc(BRAND.purpleLight, isLight)} strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--dp-text)" }}>{userStats.total_tasks_completed || 0}</div>
                  <div style={{ fontSize: 11, color: "var(--dp-text-tertiary)" }}>Tasks done</div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* ══ SKILLS TILE ══ */}
          {skills.length > 0 && (
          <GlassCard padding={18} mb={10} style={{ ...stagger(3) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <Shield size={15} color={lc(BRAND.purpleLight, isLight)} strokeWidth={2.5} />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>{t("profile.skillRadar")}</h2>
            </div>
            {skills.map(function (s, i) {
              var prog = s.maxXp > 0 ? s.xp / s.maxXp : 0;
              var sc = lc(s.color, isLight);
              return (
                <div key={i} style={{ marginBottom: i < skills.length - 1 ? 12 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <s.Icon size={12} color={sc} strokeWidth={2.5} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text)" }}>{s.label}</span>
                    </div>
                    <span style={{
                      padding: "1px 6px", borderRadius: 5,
                      background: `${s.color}12`, fontSize: 11, fontWeight: 700, color: sc,
                    }}>Lv.{s.level}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--dp-surface)", overflow: "hidden" }}>
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
          </GlassCard>
          )}

          {/* ══ ACHIEVEMENTS TILE ══ */}
          {achievements.length > 0 && (
          <GlassCard padding={18} mb={10} style={{ ...stagger(4) }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Award size={15} color={lc(BRAND.yellow, isLight)} strokeWidth={2.5} />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)", margin: 0 }}>{t("profile.achievements")}</h2>
              </div>
              <span
                onClick={() => navigate("/achievements")}
                style={{ fontSize: 12, color: "var(--dp-accent)", cursor: "pointer", fontWeight: 500 }}
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
                      color: "var(--dp-text-secondary)",
                    }}>{a.label}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
          )}

          {/* ══ QUICK LINKS ══ */}
          <GlassCard mb={10} style={{ ...stagger(5), overflow: "hidden" }}>
            {MENU.map((item, i) => {
              const mc = lc(item.color, isLight);
              return (
                <div
                  key={i}
                  className="dp-gh"
                  onClick={() => navigate(item.path)}
                  style={{
                    padding: "13px 18px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 14,
                    borderBottom: i < MENU.length - 1 ? "1px solid var(--dp-divider)" : "none",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: `${item.color}10`, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <item.icon size={16} color={mc} strokeWidth={2} />
                  </div>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--dp-text)" }}>{item.label}</span>
                  {item.isNotif && notifUnread > 0 && (
                    <span style={{
                      padding: "2px 8px", borderRadius: 8,
                      background: "var(--dp-danger-soft)",
                      fontSize: 12, fontWeight: 600, color: "var(--dp-danger)",
                    }}>{notifUnread}</span>
                  )}
                  <ChevronRight size={16} color="var(--dp-text-muted)" strokeWidth={2} />
                </div>
              );
            })}
          </GlassCard>

          {/* ══ SUBSCRIPTION INFO ══ */}
          {isPremium && renewDate && (
            <div style={{ ...stagger(6), textAlign: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                {subscriptionLabel} {t("profile.renews")} {renewDate}
              </span>
            </div>
          )}

          {/* ══ SIGN OUT ══ */}
          <div style={stagger(7)}>
            <button
              onClick={handleSignOut}
              className="dp-gh"
              style={{
                width: "100%", padding: "14px 0", borderRadius: 16,
                border: "1px solid var(--dp-danger-soft)",
                background: "var(--dp-danger-soft)",
                color: "var(--dp-danger)",
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.2s",
              }}
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
