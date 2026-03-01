import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { SOCIAL, LEAGUES } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import BottomNav from "../../components/shared/BottomNav";
import ErrorState from "../../components/shared/ErrorState";
import { FeedItemSkeleton, SkeletonCard } from "../../components/shared/Skeleton";
import {
  ArrowLeft, Users, UserPlus, Search, Trophy, Flame, Star,
  Zap, Heart, MessageCircle, ChevronRight, CheckCircle,
  Sparkles, ArrowUpCircle, Target, Crown, Medal, X, UserCheck,
  CircleDot, Calendar, Handshake
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Social Hub Screen v1
 *
 * Combines from Flutter:
 * - Social feed (dream_created, task_completed, level_up, streak)
 * - Leaderboard (top 3 podium + full list)
 * - Friends list with online status
 * - Friend requests with pending count
 * - Find buddy CTA
 *
 * UX Improvements:
 * - All in one scrollable hub (no separate screens)
 * - Horizontal online friends row
 * - Leaderboard podium (gold/silver/bronze)
 * - Activity feed with interaction (like, comment)
 * - Friend request banner with accept/decline
 * - Quick stats card (rank, friends, streak)
 * - Search overlay
 * - All 9:1+ contrast
 * ═══════════════════════════════════════════════════════════════════ */

var LB_COLORS = ["#EC4899","#F59E0B","#8B5CF6","#14B8A6","#14B8A6","#3B82F6","#10B981","#6366F1"];
var FRIEND_COLORS = ["#14B8A6","#EC4899","#F59E0B","#8B5CF6","#3B82F6","#10B981","#6366F1"];

const FEED_CONFIG = {
  level_up:    { Icon:ArrowUpCircle, color:"#C4B5FD", text:(d,t)=>`${t("social.reachedLevel")} ${(d&&d.level)||"?"}` },
  task_completed:{ Icon:CheckCircle, color:"#5DE5A8", text:(d,t)=>(d&&d.task)||t("social.completedTask") },
  dream_created: { Icon:Sparkles,    color:"#FCD34D", text:(d,t)=>`${t("social.createdDream")} "${(d&&d.dream)||"a dream"}"` },
  streak:      { Icon:Flame,         color:"#F69A9A", text:(d,t)=>`${(d&&d.days)||0} ${t("social.dayStreak")}! 🔥` },
};


function timeAgo(d){const s=Math.floor((Date.now()-d.getTime())/1000);if(s<60)return"now";if(s<3600)return`${Math.floor(s/60)}m`;if(s<86400)return`${Math.floor(s/3600)}h`;return`${Math.floor(s/86400)}d`;}

// ═══════════════════════════════════════════════════════════════════
export default function SocialHubScreen(){
  const navigate=useNavigate();
  const { t } = useT();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  var { user } = useAuth();
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  const[mounted,setMounted]=useState(false);
  const[lbTab,setLbTab]=useState("weekly");
  const[showSearch,setShowSearch]=useState(false);
  const[searchQ,setSearchQ]=useState("");
  const[searchResults,setSearchResults]=useState([]);
  const[searchLoading,setSearchLoading]=useState(false);
  const[expandedComments,setExpandedComments]=useState(null);
  const[commentInput,setCommentInput]=useState("");

  var ME = {
    displayName: user?.displayName || user?.username || "You",
    initial: (user?.displayName || user?.username || "U")[0].toUpperCase(),
    rank: user?.rank || 0, xp: user?.xp || 0, level: user?.level || 1,
    friends: user?.friendsCount || 0, streak: user?.streakDays || 0,
  };

  var feedInf = useInfiniteList({ queryKey: ["feed"], url: SOCIAL.FEED.FRIENDS, limit: 20 });
  var feedData = feedInf.items.map(function (item) {
    return Object.assign({}, item, {
      time: new Date(item.time || item.createdAt || Date.now()),
      user: Object.assign({}, item.user, { color: item.user?.color || FRIEND_COLORS[0] }),
      comments: (item.comments || []).map(function (c) {
        return Object.assign({}, c, { time: new Date(c.time || c.createdAt || Date.now()) });
      }),
    });
  });
  var [feed, setFeed] = useState([]);
  useEffect(function () { if (feedData.length > 0) setFeed(feedData); }, [feedInf.items]); // eslint-disable-line react-hooks/exhaustive-deps

  var requestsQuery = useQuery({ queryKey: ["friend-requests"], queryFn: function () { return apiGet(SOCIAL.FRIENDS.PENDING); } });
  var requests = (requestsQuery.data && requestsQuery.data.results) || requestsQuery.data || [];
  if (!Array.isArray(requests)) requests = [];
  requests = requests.map(function (r) {
    var s = r.sender || {};
    var senderName = s.displayName || s.username || r.name || r.displayName || "User";
    return Object.assign({}, r, { name: senderName, initial: senderName[0].toUpperCase(), level: s.level || r.level || 1 });
  });

  var onlineQuery = useQuery({ queryKey: ["friends-online"], queryFn: function () { return apiGet(SOCIAL.FRIENDS.ONLINE); } });
  var rawOnline = (onlineQuery.data && onlineQuery.data.results) || onlineQuery.data || [];
  if (!Array.isArray(rawOnline)) rawOnline = [];
  var ONLINE_FRIENDS = rawOnline.map(function (f, i) {
    var fName = f.displayName || f.username || "Friend";
    return { id: f.id, name: fName, initial: fName[0].toUpperCase(), level: f.currentLevel || f.level || 1, color: FRIEND_COLORS[i % FRIEND_COLORS.length], dream: f.currentDream || "", streak: f.currentStreak || 0 };
  });

  var lbQuery = useQuery({ queryKey: ["leaderboard", lbTab], queryFn: function () { return apiGet(LEAGUES.LEADERBOARD.FRIENDS + "?period=" + lbTab); } });
  var LEADERBOARD = ((lbQuery.data && lbQuery.data.results) || lbQuery.data || []).map(function (entry, i) {
    return Object.assign({}, entry, {
      name: entry.userDisplayName || entry.name || "User",
      initial: (entry.userDisplayName || entry.name || "U")[0].toUpperCase(),
      level: entry.userLevel || entry.level || 1,
      color: LB_COLORS[i % LB_COLORS.length],
      isMe: entry.isCurrentUser || String(entry.userId || entry.id) === String(user?.id),
    });
  });

  var loading = feedInf.isLoading;

  useEffect(() => {
    if (!searchQ || searchQ.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    var cancelled = false;
    var timer = setTimeout(function () {
      apiGet(SOCIAL.USER_SEARCH + "?q=" + encodeURIComponent(searchQ)).then(function (data) {
        if (cancelled) return;
        var results = (data && data.results) || data || [];
        setSearchResults(results.map(function (u, i) {
          var displayName = u.username || u.displayName || u.display_name || "User";
          return { id: u.id, name: displayName, title: u.title || "", initial: (displayName[0] || "U").toUpperCase(), level: u.currentLevel || u.level || 1, color: FRIEND_COLORS[i % FRIEND_COLORS.length], isFriend: u.isFriend || false, isFollowing: u.isFollowing || false, friendshipStatus: u.isFriend ? "accepted" : null };
        }));
        setSearchLoading(false);
      }).catch(function () { if (!cancelled) { setSearchResults([]); setSearchLoading(false); } });
    }, 300);
    return function () { cancelled = true; clearTimeout(timer); };
  }, [searchQ]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  const toggleFeedLike=function(id){
    setFeed(p=>p.map(f=>f.id===id?{...f,liked:!f.liked,likes:f.liked?f.likes-1:f.likes+1}:f));
    apiPost(SOCIAL.FEED.LIKE(id)).catch(function () {});
  };
  const toggleComments=(id)=>{setExpandedComments(prev=>prev===id?null:id);setCommentInput("");};
  const addComment=function(feedId){
    const text=commentInput.trim();if(!text)return;
    setFeed(p=>p.map(f=>f.id===feedId?{...f,comments:[...f.comments,{id:Date.now()+"c",user:{name:ME.displayName,initial:ME.initial,color:"#8B5CF6"},text:text,time:new Date()}]}:f));
    setCommentInput("");
    apiPost(SOCIAL.FEED.COMMENT(feedId), { text: text }).catch(function () {});
  };
  const acceptReq=function(id){
    apiPost(SOCIAL.FRIENDS.ACCEPT(id)).then(function () {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      showToast(t("social.requestAccepted"), "success");
    }).catch(function (err) { showToast(err.message || "Failed", "error"); });
  };
  const declineReq=function(id){
    apiPost(SOCIAL.FRIENDS.REJECT(id)).then(function () {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    }).catch(function (err) { showToast(err.message || "Failed", "error"); });
  };


  const RANK_STYLES=[
    {bg:"linear-gradient(135deg,#FCD34D,#F59E0B)",border:"rgba(252,211,77,0.4)",shadow:"rgba(252,211,77,0.25)",icon:Crown,size:52},
    {bg:"linear-gradient(135deg,#D1D5DB,#9CA3AF)",border:"rgba(209,213,219,0.4)",shadow:"rgba(209,213,219,0.2)",icon:Medal,size:44},
    {bg:"linear-gradient(135deg,#D4A574,#B8860B)",border:"rgba(212,165,116,0.4)",shadow:"rgba(212,165,116,0.2)",icon:Medal,size:44},
  ];

  if (loading) return (
      <div style={{ width: "100%", padding: "60px 16px 0" }}>
        <SkeletonCard height={80} style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1,2,3].map(i => <FeedItemSkeleton key={i} isLight={isLight} />)}
        </div>
      </div>
  );

  if (feedInf.isError) {
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ErrorState
            message={(feedInf.error && feedInf.error.message) || "Failed to load social feed"}
            onRetry={function () { feedInf.refetch(); }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  return(
    <div style={{width:"100%",height:"100%",overflow:"hidden",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>

      {/* ═══ APP BAR ═══ */}
      <header style={{position:"relative",zIndex:100,height:64,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="dp-ib" onClick={()=>navigate(-1)} aria-label="Go back"><ArrowLeft size={20} strokeWidth={2}/></button>
          <Users size={20} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/>
          <span style={{fontSize:17,fontWeight:700,color:isLight?"#1a1535":"#fff",letterSpacing:"-0.3px"}}>{t("social.title")}</span>
        </div>
        <div style={{display:"flex",gap:6}}>
          <div style={{position:"relative"}}>
            <button className="dp-ib" onClick={()=>setShowSearch(!showSearch)} aria-label={showSearch?"Close search":"Search"}>
              {showSearch?<X size={18} strokeWidth={2}/>:<Search size={18} strokeWidth={2}/>}
            </button>
          </div>
          <button className="dp-ib" onClick={()=>navigate("/friend-requests")} style={{position:"relative"}} aria-label="Friend requests">
            <UserPlus size={18} strokeWidth={2}/>
            {requests.length>0&&<div style={{position:"absolute",top:4,right:4,width:8,height:8,borderRadius:"50%",background:"#F69A9A",border:"2px solid #0c081a"}}/>}
          </button>
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"16px 16px 100px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{width:"100%"}}>

          {/* ── Quick Stats ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <div className="dp-g" style={{padding:16,marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-around"}}>
                {[
                  {Icon:Trophy,value:`#${ME.rank}`,label:t("social.rank"),color:"#FCD34D"},
                  {Icon:Users,value:ME.friends,label:t("social.friends"),color:"#C4B5FD"},
                  {Icon:Flame,value:ME.streak,label:t("social.streak"),color:"#F69A9A"},
                  {Icon:Zap,value:ME.xp.toLocaleString(),label:t("social.xp"),color:"#8B5CF6"},
                ].map(({Icon:I,value,label,color},i)=>{
                  const iconColor=color==="#FCD34D"?(isLight?"#B45309":"#FCD34D"):color==="#C4B5FD"?(isLight?"#6D28D9":"#C4B5FD"):color==="#F69A9A"?(isLight?"#DC2626":"#F69A9A"):color;
                  return(
                  <div key={i} style={{textAlign:"center"}}>
                    <I size={20} color={iconColor} strokeWidth={2} style={{marginBottom:4,filter:`drop-shadow(0 0 6px ${color}40)`}}/>
                    <div style={{fontSize:16,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{value}</div>
                    <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{label}</div>
                  </div>
                );})}
              </div>
            </div>
          </div>

          {/* ── Quick Access Grid ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"50ms"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[
                {Icon:CircleDot,label:t("social.circles"),color:"#8B5CF6",path:"/circles"},
                {Icon:Trophy,label:t("social.leaderboard"),color:"#FCD34D",path:"/leaderboard"},
                {Icon:Calendar,label:t("social.seasons"),color:"#14B8A6",path:"/seasons"},
                {Icon:Sparkles,label:t("social.dreamFeed"),color:"#EC4899",path:"/social/feed"},
                {Icon:Handshake,label:t("social.buddyRequests"),color:"#F59E0B",path:"/buddy-requests"},
                {Icon:Target,label:t("social.findBuddy"),color:"#10B981",path:"/find-buddy"},
              ].map(function(item,i){
                var iconColor = item.color === "#FCD34D" ? (isLight?"#B45309":"#FCD34D") : item.color;
                return(
                <button key={i} onClick={function(){navigate(item.path);}} className="dp-g dp-gh" style={{
                  padding:"14px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                  cursor:"pointer",border:"none",textAlign:"center",
                }}>
                  <item.Icon size={20} color={iconColor} strokeWidth={2} style={{filter:"drop-shadow(0 0 6px "+item.color+"40)"}}/>
                  <span style={{fontSize:11,fontWeight:600,color:isLight?"#1a1535":"rgba(255,255,255,0.85)"}}>{item.label}</span>
                </button>
              );})}
            </div>
          </div>

          {/* ── Friend Requests ── */}
          {requests.length>0&&(
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <UserPlus size={14} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2.5}/>
                  <span style={{fontSize:13,fontWeight:600,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)"}}>{t("social.friendRequests")}</span>
                  <span style={{fontSize:12,fontWeight:600,color:isLight?"#7C3AED":"#C4B5FD",background:"rgba(139,92,246,0.12)",padding:"2px 7px",borderRadius:8}}>{requests.length}</span>
                </div>
                <span onClick={()=>navigate("/friend-requests")} style={{fontSize:12,color:isLight?"#7C3AED":"#C4B5FD",cursor:"pointer",fontWeight:500}}>See All</span>
              </div>
              {requests.map((req,i)=>(
                <div key={req.id} className="dp-g" style={{padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:42,height:42,borderRadius:14,background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:isLight?"#7C3AED":"#C4B5FD"}}>{req.initial}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{req.name}</div>
                    <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>Level {req.level} · {req.mutualFriends} mutual</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>acceptReq(req.id)} aria-label="Accept friend request" style={{width:34,height:34,borderRadius:10,border:"none",background:"rgba(93,229,168,0.12)",color:isLight?"#059669":"#5DE5A8",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(93,229,168,0.25)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(93,229,168,0.12)"}>
                      <UserCheck size={16} strokeWidth={2.5}/>
                    </button>
                    <button onClick={()=>declineReq(req.id)} aria-label="Decline friend request" style={{width:34,height:34,borderRadius:10,border:"none",background:isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)",color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.1)":"rgba(255,255,255,0.1)"}
                      onMouseLeave={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)"}>
                      <X size={16} strokeWidth={2.5}/>
                    </button>
                  </div>
                </div>
              ))}
              <div style={{height:8}}/>
            </div>
          )}

          {/* ── Online Friends ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"160ms"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:"#5DE5A8",boxShadow:"0 0 6px rgba(93,229,168,0.5)"}}/>
                <span style={{fontSize:13,fontWeight:600,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)"}}>{t("social.onlineNow")}</span>
              </div>
              <button onClick={()=>navigate("/online-friends")} style={{fontSize:12,color:isLight?"#7C3AED":"#C4B5FD",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>See All</button>
            </div>
            <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:8,marginBottom:8}}>
              {ONLINE_FRIENDS.map(f=>(
                <div key={f.id} onClick={()=>navigate("/user/"+f.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:64,cursor:"pointer"}}>
                  <div style={{position:"relative"}}>
                    <div style={{width:48,height:48,borderRadius:16,background:`${f.color}18`,border:`1px solid ${f.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:f.color}}>{f.initial}</div>
                    <div style={{position:"absolute",bottom:-1,right:-1,width:10,height:10,borderRadius:"50%",background:"#5DE5A8",border:isLight?"2px solid #f0ecff":"2px solid #0c081a"}}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:500,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",textAlign:"center",maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Leaderboard Podium ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"240ms"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Trophy size={15} color={isLight?"#B45309":"#FCD34D"} strokeWidth={2.5}/>
                <span style={{fontSize:15,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{t("social.leaderboard")}</span>
              </div>
              <div style={{display:"flex",gap:4}}>
                {["weekly","monthly","all"].map(tab=>(
                  <button key={tab} onClick={()=>setLbTab(tab)} style={{padding:"4px 10px",borderRadius:12,border:"none",fontSize:12,fontWeight:lbTab===tab?600:500,background:lbTab===tab?"rgba(139,92,246,0.15)":"transparent",color:lbTab===tab?(isLight?"#7C3AED":"#C4B5FD"):(isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"),cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",outline:lbTab===tab?"1px solid rgba(139,92,246,0.2)":"1px solid transparent"}}>
                    {tab==="all"?t("social.allTime"):tab==="weekly"?t("social.weekly"):t("social.monthly")}
                  </button>
                ))}
              </div>
            </div>

            {/* Podium */}
            {LEADERBOARD.length>=3&&(<div className="dp-g" style={{padding:20,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:12,marginBottom:16}}>
                {[1,0,2].map(idx=>{
                  const p=LEADERBOARD[idx];const rs=RANK_STYLES[idx];const isFirst=idx===0;
                  if(!p)return null;
                  return(
                    <div key={p.id||idx} onClick={()=>!p.isMe&&navigate("/user/"+p.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,cursor:p.isMe?"default":"pointer"}}>
                      <div style={{width:rs.size,height:rs.size,borderRadius:Math.round(rs.size*0.3),background:rs.bg,border:`2px solid ${rs.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(rs.size*0.38),fontWeight:700,color:"#fff",boxShadow:`0 4px 16px ${rs.shadow}`,marginBottom:8}}>{p.initial||"?"}</div>
                      <div style={{fontSize:13,fontWeight:600,color:isLight?"#1a1535":"#fff",marginBottom:2}}>{p.name||"—"}</div>
                      <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{(p.xp||0).toLocaleString()} XP</div>
                      <div style={{marginTop:6,padding:"3px 10px",borderRadius:10,background:`${rs.border}20`,fontSize:12,fontWeight:700,color:isFirst?(isLight?"#B45309":"#FCD34D"):idx===1?"#D1D5DB":"#D4A574"}}>
                        #{idx+1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rest of leaderboard */}
              {LEADERBOARD.slice(3).map((entry,i)=>{if(!entry)return null;
                const rank=i+4;
                return(
                  <div key={entry.id} onClick={()=>!entry.isMe&&navigate("/user/"+entry.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderTop:i===0?(isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"):"none",cursor:entry.isMe?"default":"pointer"}}>
                    <span style={{width:24,textAlign:"center",fontSize:13,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{rank}</span>
                    <div style={{width:32,height:32,borderRadius:10,background:`${entry.color}15`,border:`1px solid ${entry.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:entry.color}}>{entry.initial}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:entry.isMe?700:500,color:entry.isMe?(isLight?"#7C3AED":"#C4B5FD"):(isLight?"#1a1535":"#fff")}}>{entry.name}{entry.isMe?" (You)":""}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:600,color:isLight?"#059669":"#5DE5A8"}}>{entry.xp.toLocaleString()}</div>
                      <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{entry.streak}d streak</div>
                    </div>
                  </div>
                );
              })}
            </div>)}
          </div>

          {/* ── Activity Feed ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"320ms"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
              <Sparkles size={15} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2.5}/>
              <span style={{fontSize:15,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{t("social.activity")}</span>
            </div>
          </div>

          {feed.map((item,i)=>{
            const cfg=FEED_CONFIG[item.type]||FEED_CONFIG.task_completed;
            const FIcon=cfg.Icon;
            const isExpanded=expandedComments===item.id;
            return(
              <div key={item.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${400+i*80}ms`}}>
                <div className="dp-g" style={{padding:14,marginBottom:10,transition:"all 0.3s cubic-bezier(0.16,1,0.3,1)"}}>
                  <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    {/* User avatar */}
                    <div onClick={()=>{const u=[...ONLINE_FRIENDS,...LEADERBOARD].find(x=>x.name===item.user.name&&!x.isMe);if(u)navigate("/user/"+u.id);}} style={{width:40,height:40,borderRadius:14,flexShrink:0,background:`${item.user.color}15`,border:`1px solid ${item.user.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:item.user.color,cursor:"pointer"}}>{item.user.initial}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                        <span style={{fontSize:14,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{item.user.name}</span>
                        <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{timeAgo(item.time)}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <FIcon size={14} color={cfg.color==="#C4B5FD"?(isLight?"#6D28D9":"#C4B5FD"):cfg.color==="#5DE5A8"?(isLight?"#059669":"#5DE5A8"):cfg.color==="#FCD34D"?(isLight?"#B45309":"#FCD34D"):cfg.color==="#F69A9A"?(isLight?"#DC2626":"#F69A9A"):cfg.color} strokeWidth={2}/>
                        <span style={{fontSize:13,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",lineHeight:1.4,wordBreak:"break-word"}}>{cfg.text(item.data,t)}</span>
                      </div>
                    </div>
                    {/* Actions — right side, same row */}
                    <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center"}}>
                      <button onClick={()=>toggleFeedLike(item.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:12,background:item.liked?"rgba(246,154,154,0.1)":(isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)"),border:item.liked?"1px solid rgba(246,154,154,0.15)":(isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"),cursor:"pointer",color:item.liked?(isLight?"#DC2626":"#F69A9A"):(isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"),fontSize:13,fontWeight:500,fontFamily:"inherit",transition:"all 0.2s"}}
                        onMouseEnter={e=>{if(!item.liked)e.currentTarget.style.background=isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.07)";}}
                        onMouseLeave={e=>{if(!item.liked)e.currentTarget.style.background=isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)";}}>
                        <Heart size={16} strokeWidth={2} fill={item.liked?"#F69A9A":"none"}/>{item.likes}
                      </button>
                      <button onClick={()=>toggleComments(item.id)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:12,background:isExpanded?"rgba(196,181,253,0.1)":(isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)"),border:isExpanded?"1px solid rgba(196,181,253,0.15)":(isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"),cursor:"pointer",color:isExpanded?(isLight?"#7C3AED":"#C4B5FD"):(isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"),fontSize:13,fontWeight:500,fontFamily:"inherit",transition:"all 0.2s"}}
                        onMouseEnter={e=>{if(!isExpanded)e.currentTarget.style.background=isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.07)";}}
                        onMouseLeave={e=>{if(!isExpanded)e.currentTarget.style.background=isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)";}}>
                        <MessageCircle size={16} strokeWidth={2} fill={isExpanded?"rgba(196,181,253,0.15)":"none"}/>{item.comments.length||""}
                      </button>
                    </div>
                  </div>

                  {/* ── Inline Comments Section ── */}
                  <div style={{overflow:"hidden",maxHeight:isExpanded?600:0,opacity:isExpanded?1:0,transition:"all 0.35s cubic-bezier(0.16,1,0.3,1)",marginTop:isExpanded?12:0}}>
                    {/* Existing comments */}
                    {item.comments.length>0&&(
                      <div style={{borderTop:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",paddingTop:10}}>
                        {item.comments.map(c=>(
                          <div key={c.id} style={{display:"flex",gap:8,marginBottom:10}}>
                            <div style={{width:26,height:26,borderRadius:8,flexShrink:0,background:`${c.user.color}15`,border:`1px solid ${c.user.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:c.user.color}}>{c.user.initial}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:2}}>
                                <span style={{fontSize:12,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{c.user.name}</span>
                                <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{timeAgo(c.time)}</span>
                              </div>
                              <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",lineHeight:1.4,wordBreak:"break-word"}}>{c.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Comment input */}
                    <div style={{display:"flex",gap:8,alignItems:"center",marginTop:item.comments.length?4:0,paddingTop:item.comments.length?0:10,borderTop:item.comments.length?"none":(isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)")}}>
                      <div style={{width:26,height:26,borderRadius:8,flexShrink:0,background:"rgba(139,92,246,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isLight?"#7C3AED":"#C4B5FD"}}>S</div>
                      <div style={{flex:1,display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:14,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"}}>
                        <input value={isExpanded?commentInput:""} onChange={e=>setCommentInput(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addComment(item.id);}}}
                          placeholder="Write a comment..." style={{flex:1,background:"none",border:"none",outline:"none",color:isLight?"#1a1535":"#fff",fontSize:12,fontFamily:"inherit"}}/>
                        {commentInput.trim()&&(
                          <button onClick={()=>addComment(item.id)} aria-label="Send comment" style={{background:"none",border:"none",cursor:"pointer",color:isLight?"#7C3AED":"#C4B5FD",display:"flex",alignItems:"center",transition:"all 0.15s"}}>
                            <ArrowUpCircle size={18} strokeWidth={2}/>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={feedInf.sentinelRef} style={{height:1}} />
          {feedInf.loadingMore && <div style={{textAlign:"center",padding:16,color:isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.4)",fontSize:13}}>Loading more…</div>}

          {/* ── Find a Buddy CTA ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${400+feed.length*80+80}ms`}}>
            <div className="dp-g" style={{padding:20,textAlign:"center",marginTop:8}}>
              <div style={{width:56,height:56,borderRadius:18,margin:"0 auto 12px",background:"rgba(20,184,166,0.1)",border:"1px solid rgba(20,184,166,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Target size={26} color={isLight?"#0D9488":"#5EEAD4"} strokeWidth={1.5}/>
              </div>
              <div style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff",marginBottom:4}}>{t("social.findBuddy")}</div>
              <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:14,lineHeight:1.5}}>{t("social.findBuddyDesc")}</div>
              <button onClick={()=>navigate("/find-buddy")} style={{padding:"10px 24px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#14B8A6,#0D9488)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(20,184,166,0.3)",transition:"all 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"}
                onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                {t("social.findMyBuddy")}
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {/* ═══ SEARCH OVERLAY ═══ */}
      {showSearch&&(
        <div style={{position:"fixed",inset:0,zIndex:300}}>
          <div onClick={()=>{setShowSearch(false);setSearchQ("");}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"relative",maxWidth:420,margin:"80px auto 0",padding:"0 16px",animation:"dpFS 0.2s ease-out"}}>
            <div style={{background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:18,border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",boxShadow:"0 12px 40px rgba(0,0,0,0.5)",overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"}}>
                <Search size={18} color={isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"} strokeWidth={2}/>
                <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={t("social.searchPeople")} autoFocus style={{flex:1,background:"none",border:"none",outline:"none",color:isLight?"#1a1535":"#fff",fontSize:15,fontFamily:"inherit"}}/>
                <button onClick={()=>{setShowSearch(false);setSearchQ("");}} aria-label="Close search" style={{background:"none",border:"none",color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",cursor:"pointer"}}><X size={18}/></button>
              </div>
              {searchQ&&searchQ.length>=2&&(
                <div style={{padding:12,maxHeight:300,overflowY:"auto"}}>
                  {searchLoading&&<div style={{padding:20,textAlign:"center",color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",fontSize:13}}>{t("social.searching")}</div>}
                  {!searchLoading&&searchResults.map(f=>(
                    <div key={f.id} onClick={()=>{setShowSearch(false);setSearchQ("");navigate("/user/"+f.id);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 8px",borderRadius:10,cursor:"pointer",transition:"background 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.06)":"rgba(255,255,255,0.04)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{width:32,height:32,borderRadius:10,background:`${f.color||"#8B5CF6"}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:f.color||"#8B5CF6"}}>{f.initial}</div>
                      <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{f.name}</div><div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{f.title} · Level {f.level}{f.isFriend?" · Friend":""}</div></div>
                      {!f.isFriend&&f.friendshipStatus!=="pending"&&(
                        <button onClick={function(e){e.stopPropagation();apiPost(SOCIAL.FRIENDS.REQUEST,{targetUserId:f.id}).then(function(){showToast("Friend request sent!","success");setSearchResults(function(prev){return prev.map(function(s){return s.id===f.id?Object.assign({},s,{friendshipStatus:"pending"}):s;});});}).catch(function(err){showToast(err.message||"Failed to send request","error");});}} style={{padding:"6px 12px",borderRadius:10,border:"none",background:"rgba(139,92,246,0.15)",color:isLight?"#7C3AED":"#C4B5FD",fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>
                          <UserPlus size={14} style={{verticalAlign:"middle",marginRight:4}} strokeWidth={2.5}/>{t("social.add")}
                        </button>
                      )}
                      {f.friendshipStatus==="pending"&&(
                        <span style={{padding:"6px 12px",borderRadius:10,background:"rgba(93,229,168,0.1)",color:isLight?"#059669":"#5DE5A8",fontSize:12,fontWeight:500,flexShrink:0}}>{t("social.pending")}</span>
                      )}
                    </div>
                  ))}
                  {!searchLoading&&searchResults.length===0&&<div style={{padding:20,textAlign:"center",color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",fontSize:13}}>{t("social.noResults")}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        input::placeholder{color:rgba(255,255,255,0.35);}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        @keyframes dpFS{from{opacity:0;transform:scale(0.95) translateY(-8px);}to{opacity:1;transform:scale(1) translateY(0);}}
        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
      `}</style>
    </div>
  );
}
