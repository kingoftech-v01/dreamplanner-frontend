import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { clipboardWrite } from "../../services/native";
import { apiGet, apiPost, apiPatch } from "../../services/api";
import { DREAMS, USERS, NOTIFICATIONS } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import BottomNav from "../../components/shared/BottomNav";
import ErrorState from "../../components/shared/ErrorState";
import { DreamCardSkeleton, SkeletonCard } from "../../components/shared/Skeleton";
import GlobalSearch from "../../components/shared/GlobalSearch";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import DailyQuote from "../../components/shared/DailyQuote";
import StreakWidget from "../../components/shared/StreakWidget";
import Avatar from "../../components/shared/Avatar";
import SeasonBanner from "../../components/shared/SeasonBanner";
import MorningBriefing from "../../components/shared/MorningBriefing";
import QuickAddTask from "../../components/shared/QuickAddTask";
import TodayWidget from "../../components/shared/TodayWidget";
import SmartAnalysisPanel from "../../components/shared/SmartAnalysisPanel";
import MoodMotivation from "../../components/shared/MoodMotivation";
import DailyPrioritiesPanel from "../../components/shared/DailyPrioritiesPanel";
import WeeklyReportPanel from "../../components/shared/WeeklyReportPanel";
import DifficultyCalibrationPanel from "../../components/shared/DifficultyCalibrationPanel";
import AccountabilityCheckin from "../../components/shared/AccountabilityCheckin";
import { useTaskCall } from "../../context/TaskCallContext";
import { useToast } from "../../context/ToastContext";
import { CATEGORIES, catColor, catSolid, adaptColor, GRADIENTS, BRAND } from "../../styles/colors";
import {
  Home, CalendarDays, Users, User, Bell, Plus, Sparkles,
  Bot, MessageCircle, Trophy, ShoppingBag, Briefcase,
  Palette, Heart, Wallet, Brain, Target, Clock, Flame,
  Star, Zap, ChevronRight, MoreHorizontal, Share2, Pencil,
  Search, Archive, CheckCircle, Timer, BarChart3
} from "lucide-react";
import useSwipeAction from "../../hooks/useSwipeAction";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Home Screen v2
 * 
 * Changes from v1:
 * - Lucide React icons everywhere (clean, consistent, colorable)
 * - Removed duplicate "New Dream" pill button from dreams header
 * - Added rank badge + level progress bar in welcome card
 * - Dream cards: pulsing status dot, hover action bar (Coach/Edit/Share)
 * - Notification bell with badge count
 * - Better visual hierarchy and spacing
 * - Bottom nav with proper Lucide icons + active glow
 * - Dreams header now shows count + filter hint
 * - FAB is the single entry point for creating dreams
 * ═══════════════════════════════════════════════════════════════════ */



// ─── CATEGORY CONFIG ─────────────────────────────────────────────
var CAT_ICONS = {
  career: Briefcase,
  hobbies: Palette,
  health: Heart,
  finance: Wallet,
  personal: Brain,
  relationships: Users,
};

var DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];


const ACTIONS = [
  { Icon: Bot,            label:"AI Coach",       color:BRAND.purple, path:"/chat" },
  { Icon: Timer,          label:"Focus",          color:BRAND.pink, path:"/focus" },
  { Icon: Target,         label:"Vision Board",   color:BRAND.teal, path:"/vision-board" },
  { Icon: Users,          label:"Circles",         color:BRAND.yellow, path:"/circles" },
];

// ═══════════════════════════════════════════════════════════════════
export default function DreamPlannerHome() {
  var navigate = useNavigate();
  var{resolved,uiOpacity}=useTheme();var isLight=resolved==="light";
  var { requestNotificationPermission } = useTaskCall();
  var { showToast } = useToast();
  var { user } = useAuth();

  // ── Fetch dreams from API (infinite scroll) ──
  var dreamsInf = useInfiniteList({ queryKey: ["dreams"], url: DREAMS.LIST, limit: 30 });

  // ── Fetch dashboard stats ──
  var dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: function () { return apiGet(USERS.DASHBOARD); },
  });

  // ── Fetch unread notification count ──
  var notifQuery = useQuery({
    queryKey: ["unread-count"],
    queryFn: function () { return apiGet(NOTIFICATIONS.UNREAD_COUNT); },
    refetchInterval: 30000, // refresh every 30s
  });

  // Redirect to onboarding if user hasn't completed it
  useEffect(function () {
    if (user && !user.hasOnboarded && !localStorage.getItem("dp-onboarded")) {
      navigate("/onboarding", { replace: true });
    }
  }, [user]);

  // ── Request notification permission once ──
  useEffect(function () {
    if (localStorage.getItem("dp-notif-asked")) return;
    var t = setTimeout(function () {
      requestNotificationPermission().then(function () {
        localStorage.setItem("dp-notif-asked", "true");
      });
    }, 5000);
    return function () { clearTimeout(t); };
  }, []);

  var scrollRef = useRef(null);
  var ptr = usePullToRefresh({
    onRefresh: function() { return Promise.all([dreamsInf.refetch(), dashboardQuery.refetch(), notifQuery.refetch()]); },
    scrollRef: scrollRef,
  });

  var [mounted, setMounted] = useState(false);
  var [hoveredDream, setHoveredDream] = useState(null);
  var [searchOpen, setSearchOpen] = useState(false);
  var [smartAnalysisOpen, setSmartAnalysisOpen] = useState(false);
  var [moodOpen, setMoodOpen] = useState(false);
  var [prioritiesOpen, setPrioritiesOpen] = useState(false);
  var [weeklyReportOpen, setWeeklyReportOpen] = useState(false);
  var [difficultyCalibrationOpen, setDifficultyCalibrationOpen] = useState(false);

  useEffect(function () { setTimeout(function () { setMounted(true); }, 100); }, []);

  // ── Derive data from queries ──
  var dreams = dreamsInf.items;
  var dashboard = dashboardQuery.data || {};
  var notifCount = (notifQuery.data && notifQuery.data.count) || notifQuery.data || 0;
  if (typeof notifCount === "object") notifCount = notifCount.unreadCount || 0;

  // ── User data from dashboard.stats (real API) with auth user fallbacks ──
  var dStats = (dashboard && dashboard.stats) || {};
  var u = {
    displayName: (user && user.displayName) || (user && user.email) || "Dreamer",
    email: (user && user.email) || "",
    level: dStats.level || (user && user.level) || 1,
    xp: dStats.xp || (user && user.xp) || 0,
    xpToNext: dStats.xp_to_next_level || 100 - ((dStats.xp || (user && user.xp) || 0) % 100),
    streakDays: dStats.streak_days || (user && user.streakDays) || 0,
  };
  var levelPct = u.xpToNext > 0 ? Math.round((u.xp % 100) / 100 * 100) : 0;

  var streak = u.streakDays;

  // ── Activity heatmap from dashboard (real API) ──
  var rawHeatmap = (dashboard && dashboard.heatmap) || [];
  var activityData = rawHeatmap.length > 0
    ? rawHeatmap.map(function (d) { var t = d.tasks_completed || 0; return t >= 5 ? 4 : t >= 3 ? 3 : t >= 2 ? 2 : t >= 1 ? 1 : 0; })
    : Array.from({ length: 28 }, function () { return 0; });

  var loading = dreamsInf.isLoading;

  if (loading) return (
      <div style={{ width: "100%", padding: "20px 16px" }}>
        <SkeletonCard height={100} style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1,2,3].map(i => <DreamCardSkeleton key={i} />)}
        </div>
      </div>
  );

  if (dreamsInf.isError || dashboardQuery.isError) {
    return (
      <div className="dp-desktop-main" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ErrorState
          message={(dreamsInf.error && (dreamsInf.error.userMessage || dreamsInf.error.message)) || (dashboardQuery.error && (dashboardQuery.error.userMessage || dashboardQuery.error.message)) || "Failed to load home screen"}
          onRetry={function () { dreamsInf.refetch(); dashboardQuery.refetch(); }}
        />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="dp-desktop-main" style={{ position:"absolute", inset:0, overflow:"hidden" }}>

      {/* ═══ APP BAR ═══ */}
      <GlassAppBar
        className="dp-desktop-header"
        style={{position:"fixed",top:0,left:0,right:0}}
        left={
          <div onClick={()=>navigate("/")} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <Sparkles size={20} color="var(--dp-accent)" strokeWidth={2.5} />
            <span style={{fontSize:17,fontWeight:700,color:"var(--dp-text)",letterSpacing:"-0.3px"}}>DreamPlanner</span>
          </div>
        }
        right={
          <>
            <IconButton icon={Search} label="Search" onClick={()=>setSearchOpen(true)} />
            <IconButton icon={Bell} label="Notifications" badge={notifCount} onClick={()=>navigate("/notifications")} />
          </>
        }
      />

      {/* ═══ CONTENT ═══ */}
      <main id="main-content" ref={scrollRef} {...ptr.handlers} style={{position:"absolute",inset:0,overflowY:"auto",overflowX:"hidden",zIndex:10,paddingTop:80,paddingBottom:140,opacity:uiOpacity,transition:"opacity 0.3s ease",...ptr.style}}>
        {ptr.indicator}
        <div className="dp-content-area" style={{padding:"0 16px"}}>

          {/* ── Morning Briefing ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <MorningBriefing />
          </div>

          {/* ── Accountability Check-in ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"30ms"}}>
            <AccountabilityCheckin />
          </div>

          {/* ── Welcome Card ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"60ms"}}>
            <GlassCard padding={20} mb={20}>
              {/* User row */}
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
                <Avatar name={u.displayName} size={52} shape="circle" />
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:"var(--dp-text-secondary)",marginBottom:2}}>Welcome back!</div>
                  <div style={{fontSize:19,fontWeight:700,color:"var(--dp-text)",letterSpacing:"-0.3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.displayName}</div>
                </div>
                {/* Rank badge */}
                <div style={{
                  padding:"5px 12px",borderRadius:20,
                  background:"linear-gradient(135deg,rgba(139,92,246,0.15),rgba(236,72,153,0.1))",
                  border:"1px solid rgba(139,92,246,0.2)",
                  display:"flex",alignItems:"center",gap:5,
                }}>
                  <Target size={13} color="var(--dp-accent)" strokeWidth={2.5} />
                  <span style={{fontSize:12,fontWeight:600,color:"var(--dp-accent)"}}>Level {u.level}</span>
                </div>
              </div>

              {/* Level progress */}
              <div style={{marginBottom:18,padding:"0 4px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:12,color:"var(--dp-text-secondary)"}}>Level {u.level}</span>
                  <span style={{fontSize:12,color:"var(--dp-text-tertiary)"}}>{u.xp % 100} / 100 XP</span>
                </div>
                <div style={{height:4,borderRadius:2,background:"var(--dp-glass-border)",overflow:"hidden"}}>
                  <div className="dp-level-bar" style={{
                    height:"100%",borderRadius:2,width:`${levelPct}%`,
                    background:GRADIENTS.xp,
                    boxShadow:"0 0 10px rgba(139,92,246,0.3)",
                  }}/>
                </div>
              </div>

              {/* Stats row */}
              <div style={{display:"flex",justifyContent:"space-around",alignItems:"center"}}>
                <StatBlock Icon={Star} value={u.level} label="Level" color="var(--dp-warning)" />
                <Divider />
                <StatBlock Icon={Zap} value={u.xp.toLocaleString()} label="XP" color={BRAND.purple} />
                <Divider />
                <StatBlock Icon={Flame} value={u.streakDays} label="Streak" color="var(--dp-danger)" />
              </div>

              {/* Streak Tracker */}
              <div style={{
                marginTop: 16, paddingTop: 14,
                borderTop: "1px solid var(--dp-divider)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 18, animation: "dpPulse 2s ease-in-out infinite" }}>🔥</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}>{streak}</span>
                  <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>day streak</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>Active dreams:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-accent)" }}>{dStats.active_dreams || 0}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* ── Today Widget ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"120ms"}}>
            <TodayWidget variant="full" />
          </div>

          {/* ── Today's Priorities Card ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"130ms"}}>
            <GlassCard hover onClick={function () { setPrioritiesOpen(true); }} padding={0} mb={20} style={{
              position: "relative", overflow: "hidden",
            }}>
              {/* Gradient accent bar */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: "linear-gradient(90deg, #F59E0B, #8B5CF6, #10B981)",
                borderRadius: "22px 22px 0 0",
              }} />
              <div style={{
                display: "flex", alignItems: "center", gap: 14, padding: "18px 16px 16px",
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 13,
                  background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(139,92,246,0.10))",
                  border: "1px solid rgba(245,158,11,0.20)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Brain size={20} color={BRAND.orange} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: "var(--dp-text)",
                    letterSpacing: "-0.2px", marginBottom: 2,
                  }}>
                    Today's Priorities
                  </div>
                  <div style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                    AI-powered task order for peak productivity
                  </div>
                </div>
                <ChevronRight size={18} color="var(--dp-text-muted)" strokeWidth={2} />
              </div>
            </GlassCard>
          </div>

          {/* ── Daily Quote ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"140ms"}}>
            <DailyQuote />
          </div>

          {/* ── Mood Check-in / Motivation ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"160ms"}}>
            {!moodOpen && (
              <GlassCard hover padding={0} mb={20} onClick={function () { setMoodOpen(true); }} style={{ overflow: "hidden", position: "relative" }}>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "inherit",
                  background: "linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(139,92,246,0.06) 50%, rgba(59,130,246,0.04) 100%)",
                  pointerEvents: "none",
                }} />
                <div style={{ position: "relative", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: "rgba(236,72,153,0.10)",
                    border: "1px solid rgba(236,72,153,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {"\uD83D\uDE0A"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)", marginBottom: 2 }}>How are you feeling?</div>
                    <div style={{ fontSize: 12, color: "var(--dp-text-secondary)" }}>Get a personalized motivational message</div>
                  </div>
                  <ChevronRight size={18} color="var(--dp-text-tertiary)" />
                </div>
              </GlassCard>
            )}
            <MoodMotivation visible={moodOpen} onClose={function () { setMoodOpen(false); }} />
          </div>

          {/* ── Streak Widget ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"180ms"}}>
            <StreakWidget />
          </div>

          {/* ── Season Banner ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"200ms"}}>
            <SeasonBanner />
          </div>

          {/* ── Weekly Report Card ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"220ms"}}>
            <GlassCard hover onClick={function () { setWeeklyReportOpen(true); }} padding={0} mb={20} style={{
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "inherit",
                background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.06) 50%, rgba(20,184,166,0.04) 100%)",
                pointerEvents: "none",
              }} />
              <div style={{
                position: "relative", display: "flex", alignItems: "center", gap: 14,
                padding: "16px 20px",
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 13,
                  background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.10))",
                  border: "1px solid rgba(139,92,246,0.20)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <BarChart3 size={20} color={BRAND.purple} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: "var(--dp-text)",
                    letterSpacing: "-0.2px", marginBottom: 2,
                  }}>
                    Weekly Report
                  </div>
                  <div style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                    AI-powered insights on your progress
                  </div>
                </div>
                <ChevronRight size={18} color="var(--dp-text-muted)" strokeWidth={2} />
              </div>
            </GlassCard>
          </div>

          {/* ── Quick Actions ── */}
          <div className="dp-stagger" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:28}}>
            {ACTIONS.map((a,i)=>(
              <div key={i} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${150+i*80}ms`}}>
                <GlassCard hover onClick={()=>navigate(a.path)} padding={0} style={{
                  width:"100%",padding:"20px 12px",display:"flex",flexDirection:"column",
                  alignItems:"center",gap:10,textAlign:"center",
                }}>
                  <div style={{
                    width:46,height:46,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",
                    background:`${a.color}15`,border:`1px solid ${a.color}20`,
                    transition:"all 0.3s",
                  }}>
                    <a.Icon size={22} color={a.color === BRAND.yellow ? adaptColor(BRAND.yellow, isLight) : a.color} strokeWidth={2} />
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>{a.label}</span>
                </GlassCard>
              </div>
            ))}
          </div>

          {/* ── Dreams Section ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"500ms"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <h2 style={{fontSize:19,fontWeight:700,color:"var(--dp-text)",letterSpacing:"-0.3px",margin:0}}>Your Dreams</h2>
                <span style={{
                  padding:"2px 8px",borderRadius:10,fontSize:12,fontWeight:600,
                  background:"var(--dp-surface)",color:"var(--dp-text-secondary)",
                }}>{dreams.length}</span>
              </div>
              <button onClick={()=>navigate("/dream/create")} className="dp-gh" style={{
                display:"flex",alignItems:"center",gap:5,padding:"7px 14px",
                borderRadius:20,border:"1px solid var(--dp-accent-border)",
                background:"var(--dp-accent-soft)",color:"var(--dp-accent)",
                fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.25s",
                fontFamily:"inherit",
              }}>
                <Plus size={15} strokeWidth={2.5} /> New Dream
              </button>
            </div>
          </div>

          {/* ── Smart Analysis Button ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"530ms"}}>
            <GlassCard hover onClick={function(){setSmartAnalysisOpen(true);}} padding={0} mb={12} style={{
              padding:"14px 16px",display:"flex",alignItems:"center",gap:12,
              background:"linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.05))",
              border:"1px solid rgba(139,92,246,0.15)",
            }}>
              <div style={{
                width:38,height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",
                background:"linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))",
                border:"1px solid rgba(139,92,246,0.2)",
              }}>
                <Brain size={20} color="var(--dp-accent)" strokeWidth={2} />
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--dp-text)",marginBottom:2}}>Smart Analysis</div>
                <div style={{fontSize:12,color:"var(--dp-text-secondary)"}}>Find patterns across all your dreams</div>
              </div>
              <ChevronRight size={18} color="var(--dp-text-tertiary)" strokeWidth={2} />
            </GlassCard>
          </div>

          {/* ── Calibrate Difficulty Button ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"540ms"}}>
            <GlassCard hover onClick={function(){setDifficultyCalibrationOpen(true);}} padding={0} mb={12} style={{
              padding:"14px 16px",display:"flex",alignItems:"center",gap:12,
              background:"linear-gradient(135deg, rgba(251,146,60,0.07), rgba(236,72,153,0.04))",
              border:"1px solid rgba(251,146,60,0.15)",
            }}>
              <div style={{
                width:38,height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",
                background:"linear-gradient(135deg, rgba(251,146,60,0.15), rgba(236,72,153,0.08))",
                border:"1px solid rgba(251,146,60,0.2)",
              }}>
                <Zap size={20} color="var(--dp-warning)" strokeWidth={2} />
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--dp-text)",marginBottom:2}}>Calibrate Difficulty</div>
                <div style={{fontSize:12,color:"var(--dp-text-secondary)"}}>AI adjusts challenge level to your pace</div>
              </div>
              <ChevronRight size={18} color="var(--dp-text-tertiary)" strokeWidth={2} />
            </GlassCard>
          </div>

          {/* ── Dream Quick Links ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"550ms"}}>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <GlassCard hover onClick={()=>navigate("/dream/templates")} style={{flex:1,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
                <Sparkles size={16} color="var(--dp-accent)" strokeWidth={2}/>
                <span style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>Templates</span>
              </GlassCard>
              <GlassCard hover onClick={()=>navigate("/dreams/shared")} style={{flex:1,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
                <Share2 size={16} color="var(--dp-accent)" strokeWidth={2}/>
                <span style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>Shared Dreams</span>
              </GlassCard>
            </div>
          </div>

          {/* ── Dream Cards ── */}
          {dreams.length === 0 && (
            <GlassCard padding={32} mb={20} style={{textAlign:"center"}}>
              <div style={{fontSize:48,marginBottom:16}}>✨</div>
              <h2 style={{fontSize:20,fontWeight:700,color:"var(--dp-text)",marginBottom:8}}>Start Your Journey</h2>
              <p style={{fontSize:14,color:"var(--dp-text-secondary)",lineHeight:1.6,marginBottom:24,maxWidth:280,margin:"0 auto 24px"}}>
                Create your first dream and begin turning your aspirations into reality.
              </p>
              <button onClick={function(){navigate("/dream/create");}} style={{
                display:"inline-flex",alignItems:"center",gap:8,padding:"12px 24px",
                borderRadius:14,border:"none",cursor:"pointer",
                background:"linear-gradient(135deg, #8B5CF6, #7C3AED)",
                color:"#fff",fontSize:15,fontWeight:600,
                boxShadow:"0 4px 20px rgba(139,92,246,0.4)",
                fontFamily:"inherit",
              }}>
                <Plus size={18} strokeWidth={2.5} /> Create Your First Dream
              </button>
            </GlassCard>
          )}
          {dreams.map(function (dream, i) {
            return(
              <SwipeableDreamCard
                key={dream.id}
                dream={dream}
                index={i}
                mounted={mounted}
                isLight={isLight}
                hoveredDream={hoveredDream}
                setHoveredDream={setHoveredDream}
                navigate={navigate}
                showToast={showToast}
                refetchDreams={dreamsInf.refetch}
              />
            );
          })}

          {/* ── Infinite scroll sentinel + loading ── */}
          <div ref={dreamsInf.sentinelRef} style={{height:1}} />
          {dreamsInf.loadingMore && <div style={{textAlign:"center",padding:16,color:"var(--dp-text-muted)",fontSize:13}}>Loading more dreams…</div>}

          {/* ═══ ACTIVITY HEATMAP ═══ */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"1000ms"}}>
            <GlassCard padding={16} mb={16}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)", margin: 0 }}>Your Activity</h2>
                <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>Last 4 weeks</span>
              </div>
              <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                {DAY_LABELS.map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: "var(--dp-text-muted)" }}>{d}</div>
                ))}
              </div>
              {[0, 1, 2, 3].map(week => (
                <div key={week} style={{ display: "flex", gap: 3, marginBottom: 3 }}>
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    var level = activityData[week * 7 + day] || 0;
                    var heatColors = isLight
                      ? ["rgba(139,92,246,0.06)", "rgba(139,92,246,0.15)", "rgba(139,92,246,0.3)", "rgba(139,92,246,0.5)", "rgba(139,92,246,0.75)"]
                      : ["rgba(139,92,246,0.08)", "rgba(139,92,246,0.2)", "rgba(139,92,246,0.35)", "rgba(139,92,246,0.55)", "rgba(139,92,246,0.8)"];
                    return (
                      <div key={day} style={{
                        flex: 1, aspectRatio: "1", borderRadius: 4,
                        background: heatColors[level],
                        transition: "background 0.2s",
                      }} />
                    );
                  })}
                </div>
              ))}
            </GlassCard>
          </div>

        </div>
      </main>

      {/* ── Floating Add Dream Button ── */}
      <button onClick={function () { navigate("/dream/create"); }} className="dp-gh" style={{
        position:"fixed", bottom:90, right:20, zIndex:90,
        width:56, height:56, borderRadius:18,
        background:"linear-gradient(135deg, #8B5CF6, #7C3AED)",
        border:"none", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 4px 20px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.15)",
        transition:"transform 0.2s, box-shadow 0.2s",
        fontFamily:"inherit",
      }}>
        <Plus size={26} color="#fff" strokeWidth={2.5} />
      </button>

      {/* ── Quick Add Task Bar ── */}
      <QuickAddTask dreams={dreams} />

      <BottomNav />

      {/* ═══ STYLES ═══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        ::-webkit-scrollbar{width:0;}

        .dp-a{opacity:0;transform:translateY(20px);transition:opacity 0.6s cubic-bezier(0.16,1,0.3,1),transform 0.6s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}

        .dp-pulse{animation:dpPulse 2s ease-in-out infinite;}
        @keyframes dpPulse{0%,100%{opacity:1;box-shadow:0 0 6px rgba(16,185,129,0.5);}50%{opacity:0.6;box-shadow:0 0 12px rgba(16,185,129,0.3);}}

        .dp-level-bar{animation:dpLevelGrow 1.5s cubic-bezier(0.16,1,0.3,1) forwards;}
        @keyframes dpLevelGrow{from{width:0;}}

        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
      `}</style>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <SmartAnalysisPanel open={smartAnalysisOpen} onClose={function(){setSmartAnalysisOpen(false);}} />
      <DailyPrioritiesPanel open={prioritiesOpen} onClose={function(){setPrioritiesOpen(false);}} />
      <WeeklyReportPanel open={weeklyReportOpen} onClose={function(){setWeeklyReportOpen(false);}} />
      <DifficultyCalibrationPanel open={difficultyCalibrationOpen} onClose={function(){setDifficultyCalibrationOpen(false);}} />
    </div>
  );
}

// ─── SWIPEABLE DREAM CARD ────────────────────────────────────────
function SwipeableDreamCard({ dream, index, mounted, isLight, hoveredDream, setHoveredDream, navigate, showToast, refetchDreams }) {
  var catDef = CATEGORIES[dream.category];
  var CatIcon = CAT_ICONS[dream.category] || Sparkles;
  var solidColor = catSolid(dream.category);
  var isHovered = hoveredDream === dream.id;
  var daysLeft = dream.daysLeft || (dream.targetDate ? Math.max(0, Math.ceil((new Date(dream.targetDate) - new Date()) / 86400000)) : null);

  var swipe = useSwipeAction({
    onSwipeRight: function () {
      // Mark the first incomplete task as complete
      apiGet(DREAMS.DETAIL(dream.id)).then(function (detail) {
        var tasks = (detail && detail.tasks) || [];
        var incomplete = null;
        for (var t = 0; t < tasks.length; t++) {
          if (!tasks[t].isCompleted && !tasks[t].is_completed) {
            incomplete = tasks[t];
            break;
          }
        }
        if (incomplete) {
          return apiPost(DREAMS.TASKS.COMPLETE(incomplete.id)).then(function () {
            showToast("Task completed!", "success");
            refetchDreams();
          });
        } else {
          showToast("No incomplete tasks", "info");
        }
      }).catch(function (err) {
        showToast(err.userMessage || "Could not complete task", "error");
      });
    },
    onSwipeLeft: function () {
      // Archive the dream
      if (window.confirm("Archive \"" + dream.title + "\"?")) {
        apiPatch(DREAMS.DETAIL(dream.id), { status: "archived" }).then(function () {
          showToast("Dream archived", "success");
          refetchDreams();
        }).catch(function (err) {
          showToast(err.userMessage || "Could not archive dream", "error");
        });
      }
    },
  });

  return (
    <div key={dream.id} className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: (600 + index * 100) + "ms" }} onMouseEnter={function () { setHoveredDream(dream.id); }} onMouseLeave={function () { setHoveredDream(null); }}>
      {/* Swipe container — positions action indicators behind the card */}
      <div style={{ position: "relative", marginBottom: 16, borderRadius: 16, overflow: "hidden" }}>

        {/* ── Left action indicator (swipe right → complete task) ── */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0, width: "100%",
          borderRadius: 16,
          background: swipe.revealDirection === "right"
            ? (swipe.pastThreshold ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.12)")
            : "transparent",
          display: "flex", alignItems: "center", justifyContent: "flex-start",
          paddingLeft: 20,
          transition: "background 0.2s ease",
        }}>
          {swipe.revealDirection === "right" && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              opacity: swipe.pastThreshold ? 1 : 0.6,
              transform: swipe.pastThreshold ? "scale(1.1)" : "scale(0.9)",
              transition: "all 0.2s ease",
            }}>
              <CheckCircle size={24} color="#10B981" strokeWidth={2.5} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#10B981" }}>Complete</span>
            </div>
          )}
        </div>

        {/* ── Right action indicator (swipe left → archive) ── */}
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0, width: "100%",
          borderRadius: 16,
          background: swipe.revealDirection === "left"
            ? (swipe.pastThreshold ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.12)")
            : "transparent",
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          paddingRight: 20,
          transition: "background 0.2s ease",
        }}>
          {swipe.revealDirection === "left" && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              opacity: swipe.pastThreshold ? 1 : 0.6,
              transform: swipe.pastThreshold ? "scale(1.1)" : "scale(0.9)",
              transition: "all 0.2s ease",
            }}>
              <Archive size={24} color="#EF4444" strokeWidth={2.5} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#EF4444" }}>Archive</span>
            </div>
          )}
        </div>

        {/* ── The actual card (slides horizontally) ── */}
        <div {...swipe.handlers} style={swipe.cardStyle}>
          <GlassCard
            hover
            padding={16}
            mb={0}
            onClick={function () { if (!swipe.swiping && !swipe.triggered) navigate("/dream/" + dream.id); }}
            style={{ position: "relative", overflow: "hidden" }}
          >
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: solidColor + "12", border: "1px solid " + solidColor + "18",
              }}>
                <CatIcon size={20} color={catColor(dream.category, isLight)} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dream.title}</div>
              </div>
              {/* Status dot */}
              {(function () {
                var s = dream.status || "active";
                var dotColor = s === "completed" ? "#14B8A6"
                  : s === "paused" ? "#EAB308"
                  : s === "archived" ? "#6B7280"
                  : BRAND.greenSolid;
                var dotShadow = s === "completed" ? "0 0 6px rgba(20,184,166,0.5)"
                  : s === "paused" ? "0 0 6px rgba(234,179,8,0.5)"
                  : s === "archived" ? "none"
                  : "0 0 6px rgba(16,185,129,0.5)";
                var dotLabel = s.charAt(0).toUpperCase() + s.slice(1);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div className={s === "active" ? "dp-pulse" : undefined} style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, boxShadow: dotShadow }} />
                    <span style={{ fontSize: 12, color: "var(--dp-text-tertiary)", fontWeight: 500 }}>{dotLabel}</span>
                  </div>
                );
              })()}
            </div>

            {/* Description */}
            <div style={{ fontSize: 13, color: "var(--dp-text-secondary)", marginBottom: 14, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dream.description}</div>

            {/* Progress */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--dp-glass-border)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3, width: (dream.progressPercentage || 0) + "%",
                  background: (dream.progressPercentage || 0) >= 80 ? GRADIENTS.highProgress : "linear-gradient(90deg," + solidColor + "," + solidColor + "bb)",
                  transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
                  boxShadow: "0 0 8px " + ((dream.progressPercentage || 0) >= 80 ? "rgba(16,185,129,0.3)" : solidColor + "30"),
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: (dream.progressPercentage || 0) >= 80 ? "var(--dp-success)" : "var(--dp-text-primary)", minWidth: 36, textAlign: "right" }}>{dream.progressPercentage || 0}%</span>
            </div>

            {/* Meta row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--dp-text-tertiary)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Target size={12} strokeWidth={2.5} /> {dream.completedGoalsCount || 0}/{dream.goalsCount || 0} goals
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} strokeWidth={2.5} /> {daysLeft != null ? daysLeft + "d left" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Sparkline */}
                {(function () {
                  var prog = Number(dream.progressPercentage) || 0;
                  var sparklineRaw = dream.sparklineData || dream.progressHistory;
                  var data;
                  if (sparklineRaw && sparklineRaw.length >= 2) {
                    data = sparklineRaw.map(function (p) {
                      return Number(p.progress || p.progressPercentage || p) || 0;
                    });
                  } else {
                    data = [0, Math.round(prog * 0.5), prog];
                  }
                  data = data.map(function (v) { var n = Number(v); return isNaN(n) ? 0 : n; });
                  if (data.length < 2) data = [0, prog];
                  var max = Math.max.apply(null, data);
                  var min = Math.min.apply(null, data);
                  var range = max - min || 1;
                  var w = 60, h = 20;
                  var points = data.map(function (v, idx) { return (idx / (data.length - 1)) * w + "," + (h - ((v - min) / range) * h); }).join(" ");
                  var sparkColor = catSolid(dream.category);
                  return (
                    <svg width={w} height={h} style={{ flexShrink: 0 }}>
                      <defs>
                        <linearGradient id={"sp-" + dream.id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={sparkColor} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={sparkColor} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={"0," + h + " " + points + " " + w + "," + h} fill={"url(#sp-" + dream.id + ")"} />
                      <polyline points={points} fill="none" stroke={sparkColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  );
                })()}
                <ChevronRight size={16} color="var(--dp-text-tertiary)" />
              </div>
            </div>

            {/* Action bar — always visible on mobile, hover on desktop */}
            <div style={{
              position: "absolute", top: 12, right: 12, display: "flex", gap: 6,
              opacity: isHovered ? 1 : 0.7,
              transform: isHovered ? "translateX(0)" : "translateX(0)",
              transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)", pointerEvents: "auto",
            }}>
              {[
                { I: Bot, t: "Coach", action: function () { navigate("/chat?dream=" + dream.id); } },
                { I: Pencil, t: "Edit", action: function () { navigate("/dream/" + dream.id + "/edit"); } },
                { I: Share2, t: "Share", action: function () { clipboardWrite("Check out my dream on DreamPlanner: " + dream.title); showToast("Copied!", "success"); } },
              ].map(function (btn, j) {
                return (
                  <button key={j} title={btn.t} aria-label={btn.t} className="dp-gh" style={{
                    width: 44, height: 44, borderRadius: 12, border: "1px solid var(--dp-glass-border)",
                    background: "var(--dp-glass-hover)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    color: "var(--dp-accent)", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
                  }}
                    onClick={function (e) { e.stopPropagation(); btn.action(); }}
                  >
                    <btn.I size={14} strokeWidth={2} />
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────
function StatBlock({Icon,value,label,color}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
      <div style={{filter:`drop-shadow(0 0 6px ${color}40)`}}>
        <Icon size={22} color={color} strokeWidth={2.5} />
      </div>
      <span style={{fontSize:18,fontWeight:700,color:"var(--dp-text)"}}>{value}</span>
      <span style={{fontSize:12,color:"var(--dp-text-tertiary)"}}>{label}</span>
    </div>
  );
}

function Divider(){
  return <div style={{width:1,height:40,background:"var(--dp-divider)"}}/>;
}
