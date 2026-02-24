import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { clipboardWrite } from "../../services/native";
import { apiGet } from "../../services/api";
import useInfiniteList from "../../hooks/useInfiniteList";
import BottomNav from "../../components/shared/BottomNav";
import { DreamCardSkeleton, SkeletonCard } from "../../components/shared/Skeleton";
import GlobalSearch from "../../components/shared/GlobalSearch";
import { useTaskCall } from "../../context/TaskCallContext";
import { useToast } from "../../context/ToastContext";
import {
  Home, CalendarDays, Users, User, Bell, Plus, Sparkles,
  Bot, MessageCircle, Trophy, ShoppingBag, Briefcase,
  Palette, Heart, Wallet, Brain, Target, Clock, Flame,
  Star, Zap, ChevronRight, MoreHorizontal, Share2, Pencil,
  Search
} from "lucide-react";

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
const CATS = {
  career:   { Icon: Briefcase, color:"#8B5CF6", label:"Career" },
  hobbies:  { Icon: Palette,   color:"#EC4899", label:"Hobbies" },
  health:   { Icon: Heart,     color:"#10B981", label:"Health" },
  finance:  { Icon: Wallet,    color:"#FCD34D", label:"Finance" },
  personal: { Icon: Brain,     color:"#6366F1", label:"Growth" },
  relationships: { Icon: Users, color:"#14B8A6", label:"Social" },
};

// ─── CATEGORY COLORS (for sparklines) ───────────────────────────
const CATEGORY_COLORS = {
  career: "#8B5CF6",
  hobbies: "#EC4899",
  health: "#10B981",
  finance: "#FCD34D",
  personal: "#6366F1",
  relationships: "#14B8A6",
};

var DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];


const ACTIONS = [
  { Icon: Bot,            label:"AI Coach",       color:"#8B5CF6", path:"/chat" },
  { Icon: MessageCircle,  label:"Conversations",  color:"#14B8A6", path:"/conversations" },
  { Icon: Trophy,         label:"Leaderboard",    color:"#FCD34D", path:"/leaderboard" },
  { Icon: ShoppingBag,    label:"Store",          color:"#10B981", path:"/store" },
];

// ═══════════════════════════════════════════════════════════════════
export default function DreamPlannerHome() {
  var navigate = useNavigate();
  var{resolved,uiOpacity}=useTheme();var isLight=resolved==="light";
  var { requestNotificationPermission } = useTaskCall();
  var { showToast } = useToast();
  var { user } = useAuth();

  // ── Fetch dreams from API (infinite scroll) ──
  var dreamsInf = useInfiniteList({ queryKey: ["dreams"], url: "/api/dreams/dreams/", limit: 30 });

  // ── Fetch dashboard stats ──
  var dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: function () { return apiGet("/api/users/dashboard/"); },
  });

  // ── Fetch unread notification count ──
  var notifQuery = useQuery({
    queryKey: ["unread-count"],
    queryFn: function () { return apiGet("/api/notifications/unread_count/"); },
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

  var [mounted, setMounted] = useState(false);
  var [hoveredDream, setHoveredDream] = useState(null);
  var [searchOpen, setSearchOpen] = useState(false);

  useEffect(function () { setTimeout(function () { setMounted(true); }, 100); }, []);

  // ── Derive data from queries ──
  var dreams = dreamsInf.items;
  var dashboard = dashboardQuery.data || {};
  var notifCount = (notifQuery.data && notifQuery.data.count) || notifQuery.data || 0;
  if (typeof notifCount === "object") notifCount = notifCount.unreadCount || 0;

  // ── User data with fallbacks ──
  var u = {
    displayName: (user && user.displayName) || (user && user.email) || "Dreamer",
    email: (user && user.email) || "",
    level: (dashboard.level) || (user && user.level) || 1,
    xp: (dashboard.xp) || (user && user.xp) || 0,
    xpToNext: (dashboard.xpToNext) || (user && user.xpToNext) || 1000,
    streakDays: (dashboard.streakDays) || (user && user.streakDays) || 0,
    rank: (dashboard.rank && typeof dashboard.rank === "object" ? dashboard.rank.leagueName : dashboard.rank) || (user && user.rank && typeof user.rank === "object" ? user.rank.leagueName : (user && user.rank)) || "Starter",
  };
  var levelPct = u.xpToNext > 0 ? Math.round((u.xp / u.xpToNext) * 100) : 0;

  var streak = u.streakDays;
  var bestStreak = (dashboard.bestStreak) || (user && user.bestStreak) || 0;

  // ── Activity heatmap from dashboard ──
  var activityData = (dashboard.activityHeatmap) || Array.from({ length: 28 }, function () { return 0; });

  var loading = dreamsInf.isLoading;

  if (loading) return (
      <div style={{ width: "100%", padding: "20px 16px" }}>
        <SkeletonCard height={100} style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1,2,3].map(i => <DreamCardSkeleton key={i} isLight={isLight} />)}
        </div>
      </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden", fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ═══ APP BAR ═══ */}
      <header style={{
        position:"fixed",top:0,left:0,right:0,zIndex:100,height:64,
        display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",
        background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",
        borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)",
      }}>
        <div onClick={()=>navigate("/")} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
          <Sparkles size={20} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2.5} />
          <span style={{fontSize:17,fontWeight:700,color:isLight?"#1a1535":"#fff",letterSpacing:"-0.3px"}}>DreamPlanner</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button aria-label="Search" onClick={()=>setSearchOpen(true)} style={{
          position:"relative",width:40,height:40,borderRadius:12,
          border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",background:isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)",
          color:isLight?"#1a1535":"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
          backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",transition:"all 0.2s",
        }}
          onMouseEnter={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.1)":"rgba(255,255,255,0.1)"}
          onMouseLeave={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)"}
        >
          <Search size={18} strokeWidth={2} />
        </button>
        <button aria-label="Notifications" onClick={()=>navigate("/notifications")} style={{
          position:"relative",width:40,height:40,borderRadius:12,
          border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",background:isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)",
          color:isLight?"#1a1535":"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
          backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",transition:"all 0.2s",
        }}
          onMouseEnter={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.1)":"rgba(255,255,255,0.1)"}
          onMouseLeave={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)"}
        >
          <Bell size={18} strokeWidth={2} />
          {notifCount > 0 && (
            <span style={{
              position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",
              background:"#EF4444",color:"#fff",fontSize:12,fontWeight:700,
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:"0 2px 8px rgba(239,68,68,0.5)",border:isLight?"2px solid #f0ecff":"2px solid #0c081a",
            }}>{notifCount}</span>
          )}
        </button>
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <main style={{position:"absolute",inset:0,overflowY:"auto",overflowX:"hidden",zIndex:10,paddingTop:80,paddingBottom:140,opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{width:"100%",padding:"0 16px"}}>

          {/* ── Welcome Card ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <div className="dp-g" style={{padding:20,marginBottom:20}}>
              {/* User row */}
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
                <div style={{
                  width:52,height:52,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                  background:"linear-gradient(135deg,rgba(139,92,246,0.35),rgba(109,40,217,0.35))",
                  border:"2px solid rgba(139,92,246,0.4)",fontSize:22,fontWeight:700,color:isLight?"#1a1535":"#fff",
                  boxShadow:"0 0 20px rgba(139,92,246,0.15)",
                }}>
                  {u.displayName[0]}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.75)",marginBottom:2}}>Welcome back!</div>
                  <div style={{fontSize:19,fontWeight:700,color:isLight?"#1a1535":"#fff",letterSpacing:"-0.3px"}}>{u.displayName}</div>
                </div>
                {/* Rank badge */}
                <div style={{
                  padding:"5px 12px",borderRadius:20,
                  background:"linear-gradient(135deg,rgba(139,92,246,0.15),rgba(236,72,153,0.1))",
                  border:"1px solid rgba(139,92,246,0.2)",
                  display:"flex",alignItems:"center",gap:5,
                }}>
                  <Target size={13} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2.5} />
                  <span style={{fontSize:12,fontWeight:600,color:isLight?"#7C3AED":"#C4B5FD"}}>{u.rank}</span>
                </div>
              </div>

              {/* Level progress */}
              <div style={{marginBottom:18,padding:"0 4px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.72)"}}>Level {u.level}</span>
                  <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{u.xp.toLocaleString()} / {u.xpToNext.toLocaleString()} XP</span>
                </div>
                <div style={{height:4,borderRadius:2,background:isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                  <div className="dp-level-bar" style={{
                    height:"100%",borderRadius:2,width:`${levelPct}%`,
                    background:"linear-gradient(90deg,#8B5CF6,#C4B5FD)",
                    boxShadow:"0 0 10px rgba(139,92,246,0.3)",
                  }}/>
                </div>
              </div>

              {/* Stats row */}
              <div style={{display:"flex",justifyContent:"space-around",alignItems:"center"}}>
                <StatBlock Icon={Star} value={u.level} label="Level" color={isLight ? "#B45309" : "#FCD34D"} />
                <Divider />
                <StatBlock Icon={Zap} value={u.xp.toLocaleString()} label="XP" color="#8B5CF6" />
                <Divider />
                <StatBlock Icon={Flame} value={u.streakDays} label="Streak" color={isLight ? "#DC2626" : "#F69A9A"} />
              </div>

              {/* Streak Tracker */}
              <div style={{
                marginTop: 16, paddingTop: 14,
                borderTop: `1px solid ${isLight ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.06)"}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 18, animation: "dpPulse 2s ease-in-out infinite" }}>🔥</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: isLight ? "#1A1535" : "rgba(255,255,255,0.95)" }}>{streak}</span>
                  <span style={{ fontSize: 11, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)" }}>day streak</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)" }}>Best:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isLight ? "#7C3AED" : "#C4B5FD" }}>{bestStreak} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:28}}>
            {ACTIONS.map((a,i)=>(
              <div key={i} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${150+i*80}ms`}}>
                <button onClick={()=>navigate(a.path)} className="dp-g dp-gh" style={{
                  width:"100%",padding:"20px 12px",display:"flex",flexDirection:"column",
                  alignItems:"center",gap:10,cursor:"pointer",border:"none",textAlign:"center",
                }}>
                  <div style={{
                    width:46,height:46,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",
                    background:`${a.color}15`,border:`1px solid ${a.color}20`,
                    transition:"all 0.3s",
                  }}>
                    <a.Icon size={22} color={a.color === "#FCD34D" ? (isLight ? "#B45309" : "#FCD34D") : a.color} strokeWidth={2} />
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)"}}>{a.label}</span>
                </button>
              </div>
            ))}
          </div>

          {/* ── Dreams Section ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"500ms"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:19,fontWeight:700,color:isLight?"#1a1535":"#fff",letterSpacing:"-0.3px"}}>Your Dreams</span>
                <span style={{
                  padding:"2px 8px",borderRadius:10,fontSize:12,fontWeight:600,
                  background:isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)",color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.72)",
                }}>{dreams.length}</span>
              </div>
              <button onClick={()=>navigate("/dream/create")} className="dp-gh" style={{
                display:"flex",alignItems:"center",gap:5,padding:"7px 14px",
                borderRadius:20,border:"1px solid rgba(139,92,246,0.25)",
                background:"rgba(139,92,246,0.1)",color:isLight?"#7C3AED":"#C4B5FD",
                fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.25s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(139,92,246,0.22)";e.currentTarget.style.borderColor="rgba(139,92,246,0.4)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(139,92,246,0.1)";e.currentTarget.style.borderColor="rgba(139,92,246,0.25)";}}
              >
                <Plus size={15} strokeWidth={2.5} /> New Dream
              </button>
            </div>
          </div>

          {/* ── Dream Cards ── */}
          {dreams.map(function (dream, i) {
            var cat = CATS[dream.category] || {Icon:Sparkles,color:"#8B5CF6",label:"Other"};
            var CatIcon = cat.Icon;
            var isHovered = hoveredDream === dream.id;
            var daysLeft = dream.daysLeft || (dream.targetDate ? Math.max(0, Math.ceil((new Date(dream.targetDate) - new Date()) / 86400000)) : null);
            return(
              <div key={dream.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${600+i*100}ms`}}>
                <div
                  className="dp-g dp-gh"
                  style={{padding:16,marginBottom:16,cursor:"pointer",position:"relative",overflow:"hidden"}}
                  onClick={()=>navigate(`/dream/${dream.id}`)}
                  onMouseEnter={()=>setHoveredDream(dream.id)}
                  onMouseLeave={()=>setHoveredDream(null)}
                >
                  {/* Top row */}
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                    <div style={{
                      width:40,height:40,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",
                      background:`${cat.color}12`,border:`1px solid ${cat.color}18`,
                    }}>
                      <CatIcon size={20} color={cat.color === "#FCD34D" ? (isLight ? "#B45309" : "#FCD34D") : cat.color} strokeWidth={2} />
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:600,color:isLight?"#1a1535":"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dream.title}</div>
                    </div>
                    {/* Status dot */}
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div className="dp-pulse" style={{width:7,height:7,borderRadius:"50%",background:"#10B981",boxShadow:"0 0 6px rgba(16,185,129,0.5)"}}/>
                      <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",fontWeight:500}}>Active</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.72)",marginBottom:14,lineHeight:1.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dream.description}</div>

                  {/* Progress */}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <div style={{flex:1,height:5,borderRadius:3,background:isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                      <div style={{
                        height:"100%",borderRadius:3,width:`${dream.progress}%`,
                        background:dream.progress>=80?`linear-gradient(90deg,#10B981,#34D399)`:`linear-gradient(90deg,${cat.color},${cat.color}bb)`,
                        transition:"width 1.2s cubic-bezier(0.16,1,0.3,1)",
                        boxShadow:`0 0 8px ${dream.progress>=80?"rgba(16,185,129,0.3)":`${cat.color}30`}`,
                      }}/>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:dream.progress>=80?(isLight?"#059669":"#5DE5A8"):isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",minWidth:36,textAlign:"right"}}>{dream.progress}%</span>
                  </div>

                  {/* Meta row */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14,fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>
                      <span style={{display:"flex",alignItems:"center",gap:4}}>
                        <Target size={12} strokeWidth={2.5} /> {dream.completedGoalCount}/{dream.goalCount} goals
                      </span>
                      <span style={{display:"flex",alignItems:"center",gap:4}}>
                        <Clock size={12} strokeWidth={2.5} /> {daysLeft != null ? daysLeft + "d left" : ""}
                      </span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {/* Sparkline */}
                      {(function () {
                        var prog = Number(dream.progress) || 0;
                        var data = dream.progressHistory || [0, Math.round(prog * 0.5), prog];
                        data = data.map(function (v) { var n = Number(v); return isNaN(n) ? 0 : n; });
                        if (data.length < 2) data = [0, prog];
                        var max = Math.max.apply(null, data);
                        var min = Math.min.apply(null, data);
                        var range = max - min || 1;
                        var w = 60, h = 20;
                        var points = data.map(function (v, idx) { return (idx / (data.length - 1)) * w + "," + (h - ((v - min) / range) * h); }).join(" ");
                        var sparkColor = CATEGORY_COLORS[dream.category] || "#8B5CF6";
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
                      <ChevronRight size={16} color={isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"} />
                    </div>
                  </div>

                  {/* Hover action bar */}
                  <div style={{
                    position:"absolute",top:12,right:12,display:"flex",gap:6,
                    opacity:isHovered?1:0,transform:isHovered?"translateX(0)":"translateX(8px)",
                    transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",pointerEvents:isHovered?"auto":"none",
                  }}>
                    {[
                      {I:Bot,t:"Coach",action:()=>navigate("/chat/dream-"+dream.id)},
                      {I:Pencil,t:"Edit",action:()=>navigate("/dream/"+dream.id+"/edit")},
                      {I:Share2,t:"Share",action:()=>{clipboardWrite("Check out my dream on DreamPlanner: "+dream.title);showToast("Copied!","success");}},
                    ].map(({I,t,action},j)=>(
                      <button key={j} title={t} aria-label={t} style={{
                        width:32,height:32,borderRadius:10,border:isLight?"1px solid rgba(139,92,246,0.18)":"1px solid rgba(255,255,255,0.1)",
                        background:isLight?"rgba(139,92,246,0.06)":"rgba(255,255,255,0.08)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
                        color:isLight?"#7C3AED":"rgba(255,255,255,0.75)",display:"flex",alignItems:"center",justifyContent:"center",
                        cursor:"pointer",transition:"all 0.2s",
                      }}
                        onMouseEnter={e=>{e.currentTarget.style.background="rgba(139,92,246,0.2)";e.currentTarget.style.color=isLight?"#7C3AED":"#C4B5FD";e.currentTarget.style.borderColor="rgba(139,92,246,0.3)";}}
                        onMouseLeave={e=>{e.currentTarget.style.background=isLight?"rgba(139,92,246,0.06)":"rgba(255,255,255,0.08)";e.currentTarget.style.color=isLight?"#7C3AED":"rgba(255,255,255,0.6)";e.currentTarget.style.borderColor=isLight?"rgba(139,92,246,0.18)":"rgba(255,255,255,0.1)";}}
                        onClick={e=>{e.stopPropagation();action();}}
                      >
                        <I size={14} strokeWidth={2} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Infinite scroll sentinel + loading ── */}
          <div ref={dreamsInf.sentinelRef} style={{height:1}} />
          {dreamsInf.loadingMore && <div style={{textAlign:"center",padding:16,color:isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.4)",fontSize:13}}>Loading more dreams…</div>}

          {/* ═══ ACTIVITY HEATMAP ═══ */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"1000ms"}}>
            <div style={{
              background: isLight ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.04)",
              backdropFilter: "blur(40px)",
              border: `1px solid ${isLight ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 20, padding: 16, marginBottom: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: isLight ? "#1A1535" : "rgba(255,255,255,0.95)" }}>Your Activity</span>
                <span style={{ fontSize: 12, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)" }}>Last 4 weeks</span>
              </div>
              <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                {DAY_LABELS.map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: isLight ? "rgba(26,21,53,0.4)" : "rgba(255,255,255,0.3)" }}>{d}</div>
                ))}
              </div>
              {[0, 1, 2, 3].map(week => (
                <div key={week} style={{ display: "flex", gap: 3, marginBottom: 3 }}>
                  {[0, 1, 2, 3, 4, 5, 6].map(day => {
                    var level = activityData[week * 7 + day] || 0;
                    const colors = isLight
                      ? ["rgba(139,92,246,0.06)", "rgba(139,92,246,0.15)", "rgba(139,92,246,0.3)", "rgba(139,92,246,0.5)", "rgba(139,92,246,0.75)"]
                      : ["rgba(139,92,246,0.08)", "rgba(139,92,246,0.2)", "rgba(139,92,246,0.35)", "rgba(139,92,246,0.55)", "rgba(139,92,246,0.8)"];
                    return (
                      <div key={day} style={{
                        flex: 1, aspectRatio: "1", borderRadius: 4,
                        background: colors[level],
                        transition: "background 0.2s",
                      }} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

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
    </div>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────
function StatBlock({Icon,value,label,color}){
  var{resolved}=useTheme();var isLight=resolved==="light";
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
      <div style={{filter:`drop-shadow(0 0 6px ${color}40)`}}>
        <Icon size={22} color={color} strokeWidth={2.5} />
      </div>
      <span style={{fontSize:18,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{value}</span>
      <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{label}</span>
    </div>
  );
}

function Divider(){
  var{resolved}=useTheme();var isLight=resolved==="light";
  return <div style={{width:1,height:40,background:isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)"}}/>;
}
