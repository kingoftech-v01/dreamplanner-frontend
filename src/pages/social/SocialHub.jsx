import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import BottomNav from "../../components/shared/BottomNav";
import { FeedItemSkeleton, SkeletonCard } from "../../components/shared/Skeleton";
import { MOCK_LEADERBOARD } from "../../data/mockData";
import {
  ArrowLeft, Users, UserPlus, Search, Trophy, Flame, Star,
  Zap, Heart, MessageCircle, ChevronRight, CheckCircle,
  Sparkles, ArrowUpCircle, Target, Crown, Medal, X, UserCheck
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

// ─── MOCK DATA ───────────────────────────────────────────────────
const ME = { displayName:"Stephane", initial:"S", rank:4, xp:2450, level:12, friends:8, streak:7 };

const FRIEND_REQUESTS = [
  { id:"r1", name:"Sophie", initial:"S", level:9, mutualFriends:3 },
  { id:"r2", name:"Marco", initial:"M", level:14, mutualFriends:1 },
];

const ONLINE_FRIENDS = [
  { id:"l5", name:"Alex", initial:"A", level:10, color:"#14B8A6", dream:"Half Marathon" },
  { id:"l1", name:"Jade", initial:"J", level:15, color:"#EC4899", dream:"Learn Japanese" },
  { id:"om1", name:"Omar", initial:"O", level:8, color:"#F59E0B", dream:"Start a Podcast" },
  { id:"l3", name:"Lisa", initial:"L", level:12, color:"#8B5CF6", dream:"Save $20K" },
  { id:"fr2", name:"Noah", initial:"N", level:6, color:"#3B82F6", dream:"Read 50 Books" },
];

const LB_COLORS = ["#EC4899","#F59E0B","#8B5CF6","#14B8A6","#14B8A6","#3B82F6","#10B981","#6366F1"];
const LEADERBOARD = MOCK_LEADERBOARD.map((entry,i) => ({
  ...entry,
  color: LB_COLORS[i % LB_COLORS.length],
  isMe: !!entry.isUser,
}));

const FEED = [
  { id:"a1", user:{name:"Jade",initial:"J",color:"#EC4899"}, type:"level_up", data:{level:15}, time:new Date(Date.now()-1000*60*20), likes:5, liked:false, comments:[
    {id:"c1",user:{name:"Alex",initial:"A",color:"#14B8A6"},text:"Congrats Jade! That's insane progress 🎉",time:new Date(Date.now()-1000*60*15)},
    {id:"c2",user:{name:"Stephane",initial:"S",color:"#8B5CF6"},text:"Keep it up! 💪",time:new Date(Date.now()-1000*60*10)},
  ]},
  { id:"a2", user:{name:"Alex",initial:"A",color:"#14B8A6"}, type:"task_completed", data:{task:"Ran 8km without stopping"}, time:new Date(Date.now()-1000*60*60*2), likes:3, liked:true, comments:[
    {id:"c3",user:{name:"Jade",initial:"J",color:"#EC4899"},text:"Beast mode! Saturday run is going to be great",time:new Date(Date.now()-1000*60*60)},
  ]},
  { id:"a3", user:{name:"Omar",initial:"O",color:"#F59E0B"}, type:"dream_created", data:{dream:"Start a Podcast"}, time:new Date(Date.now()-1000*60*60*5), likes:7, liked:false, comments:[] },
  { id:"a4", user:{name:"Lisa",initial:"L",color:"#8B5CF6"}, type:"streak", data:{days:18}, time:new Date(Date.now()-1000*60*60*8), likes:12, liked:true, comments:[
    {id:"c4",user:{name:"Marco",initial:"M",color:"#F59E0B"},text:"18 days is no joke! Respect 🙌",time:new Date(Date.now()-1000*60*60*6)},
    {id:"c5",user:{name:"Alex",initial:"A",color:"#14B8A6"},text:"Consistency queen!",time:new Date(Date.now()-1000*60*60*4)},
    {id:"c6",user:{name:"Omar",initial:"O",color:"#F59E0B"},text:"Inspiring me to keep mine going",time:new Date(Date.now()-1000*60*60*2)},
  ]},
  { id:"a5", user:{name:"Marco",initial:"M",color:"#F59E0B"}, type:"task_completed", data:{task:"Completed React module on Coursera"}, time:new Date(Date.now()-1000*60*60*24), likes:4, liked:false, comments:[] },
];

const FEED_CONFIG = {
  level_up:    { Icon:ArrowUpCircle, color:"#C4B5FD", text:(d)=>`Reached level ${d.level}` },
  task_completed:{ Icon:CheckCircle, color:"#5DE5A8", text:(d)=>d.task },
  dream_created: { Icon:Sparkles,    color:"#FCD34D", text:(d)=>`Created dream "${d.dream}"` },
  streak:      { Icon:Flame,         color:"#F69A9A", text:(d)=>`${d.days} day streak! 🔥` },
};


function timeAgo(d){const s=Math.floor((Date.now()-d.getTime())/1000);if(s<60)return"now";if(s<3600)return`${Math.floor(s/60)}m`;if(s<86400)return`${Math.floor(s/3600)}h`;return`${Math.floor(s/86400)}d`;}

// ═══════════════════════════════════════════════════════════════════
export default function SocialHubScreen(){
  const navigate=useNavigate();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  const[loading,setLoading]=useState(true);
  const[mounted,setMounted]=useState(false);
  const[feed,setFeed]=useState(FEED);
  const[requests,setRequests]=useState(FRIEND_REQUESTS);
  const[lbTab,setLbTab]=useState("weekly");
  const[showSearch,setShowSearch]=useState(false);
  const[searchQ,setSearchQ]=useState("");
  const[expandedComments,setExpandedComments]=useState(null); // feed item id
  const[commentInput,setCommentInput]=useState("");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);
  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  const toggleFeedLike=(id)=>setFeed(p=>p.map(f=>f.id===id?{...f,liked:!f.liked,likes:f.liked?f.likes-1:f.likes+1}:f));
  const toggleComments=(id)=>{setExpandedComments(prev=>prev===id?null:id);setCommentInput("");};
  const addComment=(feedId)=>{
    const text=commentInput.trim();if(!text)return;
    setFeed(p=>p.map(f=>f.id===feedId?{...f,comments:[...f.comments,{id:Date.now()+"c",user:{name:"Stephane",initial:"S",color:"#8B5CF6"},text,time:new Date()}]}:f));
    setCommentInput("");
  };
  const acceptReq=(id)=>setRequests(p=>p.filter(r=>r.id!==id));
  const declineReq=(id)=>setRequests(p=>p.filter(r=>r.id!==id));


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

  return(
    <div style={{width:"100%",height:"100vh",overflow:"hidden",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>

      {/* ═══ APP BAR ═══ */}
      <header style={{position:"relative",zIndex:100,height:64,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="dp-ib" onClick={()=>navigate(-1)} aria-label="Go back"><ArrowLeft size={20} strokeWidth={2}/></button>
          <Users size={20} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/>
          <span style={{fontSize:17,fontWeight:700,color:isLight?"#1a1535":"#fff",letterSpacing:"-0.3px"}}>Social Hub</span>
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
                  {Icon:Trophy,value:`#${ME.rank}`,label:"Rank",color:"#FCD34D"},
                  {Icon:Users,value:ME.friends,label:"Friends",color:"#C4B5FD"},
                  {Icon:Flame,value:ME.streak,label:"Streak",color:"#F69A9A"},
                  {Icon:Zap,value:ME.xp.toLocaleString(),label:"XP",color:"#8B5CF6"},
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

          {/* ── Friend Requests ── */}
          {requests.length>0&&(
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <UserPlus size={14} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2.5}/>
                  <span style={{fontSize:13,fontWeight:600,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)"}}>Friend Requests</span>
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
                <span style={{fontSize:13,fontWeight:600,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)"}}>Online Now</span>
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
                <span style={{fontSize:15,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>Leaderboard</span>
              </div>
              <div style={{display:"flex",gap:4}}>
                {["weekly","monthly","all"].map(tab=>(
                  <button key={tab} onClick={()=>setLbTab(tab)} style={{padding:"4px 10px",borderRadius:12,border:"none",fontSize:12,fontWeight:lbTab===tab?600:500,background:lbTab===tab?"rgba(139,92,246,0.15)":"transparent",color:lbTab===tab?(isLight?"#7C3AED":"#C4B5FD"):(isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"),cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",outline:lbTab===tab?"1px solid rgba(139,92,246,0.2)":"1px solid transparent"}}>
                    {tab==="all"?"All":tab[0].toUpperCase()+tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Podium */}
            <div className="dp-g" style={{padding:20,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:12,marginBottom:16}}>
                {[1,0,2].map(idx=>{
                  const p=LEADERBOARD[idx];const rs=RANK_STYLES[idx];const isFirst=idx===0;
                  return(
                    <div key={p.id} onClick={()=>!p.isMe&&navigate("/user/"+p.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,cursor:p.isMe?"default":"pointer"}}>
                      <div style={{width:rs.size,height:rs.size,borderRadius:Math.round(rs.size*0.3),background:rs.bg,border:`2px solid ${rs.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(rs.size*0.38),fontWeight:700,color:"#fff",boxShadow:`0 4px 16px ${rs.shadow}`,marginBottom:8}}>{p.initial}</div>
                      <div style={{fontSize:13,fontWeight:600,color:isLight?"#1a1535":"#fff",marginBottom:2}}>{p.name}</div>
                      <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{p.xp.toLocaleString()} XP</div>
                      <div style={{marginTop:6,padding:"3px 10px",borderRadius:10,background:`${rs.border}20`,fontSize:12,fontWeight:700,color:isFirst?(isLight?"#B45309":"#FCD34D"):idx===1?"#D1D5DB":"#D4A574"}}>
                        #{idx+1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rest of leaderboard */}
              {LEADERBOARD.slice(3).map((entry,i)=>{
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
            </div>
          </div>

          {/* ── Activity Feed ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"320ms"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
              <Sparkles size={15} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2.5}/>
              <span style={{fontSize:15,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>Activity</span>
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
                        <span style={{fontSize:13,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",lineHeight:1.4}}>{cfg.text(item.data)}</span>
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
                              <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",lineHeight:1.4}}>{c.text}</div>
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

          {/* ── Find a Buddy CTA ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${400+feed.length*80+80}ms`}}>
            <div className="dp-g" style={{padding:20,textAlign:"center",marginTop:8}}>
              <div style={{width:56,height:56,borderRadius:18,margin:"0 auto 12px",background:"rgba(20,184,166,0.1)",border:"1px solid rgba(20,184,166,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Target size={26} color={isLight?"#0D9488":"#5EEAD4"} strokeWidth={1.5}/>
              </div>
              <div style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff",marginBottom:4}}>Find a Dream Buddy</div>
              <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:14,lineHeight:1.5}}>Get matched with someone who shares your dream</div>
              <button onClick={()=>navigate("/find-buddy")} style={{padding:"10px 24px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#14B8A6,#0D9488)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(20,184,166,0.3)",transition:"all 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"}
                onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                Find My Buddy
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
                <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search people, dreams..." autoFocus style={{flex:1,background:"none",border:"none",outline:"none",color:isLight?"#1a1535":"#fff",fontSize:15,fontFamily:"inherit"}}/>
                <button onClick={()=>{setShowSearch(false);setSearchQ("");}} aria-label="Close search" style={{background:"none",border:"none",color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",cursor:"pointer"}}><X size={18}/></button>
              </div>
              {searchQ&&(()=>{
                const ALL_SEARCH=[...ONLINE_FRIENDS,...LEADERBOARD.filter(l=>!l.isMe&&!ONLINE_FRIENDS.some(f=>f.id===l.id))];
                const results=ALL_SEARCH.filter(f=>f.name.toLowerCase().includes(searchQ.toLowerCase()));
                return(
                <div style={{padding:12,maxHeight:300,overflowY:"auto"}}>
                  {results.map(f=>(
                    <div key={f.id} onClick={()=>{setShowSearch(false);setSearchQ("");navigate("/user/"+f.id);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 8px",borderRadius:10,cursor:"pointer",transition:"background 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.06)":"rgba(255,255,255,0.04)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{width:32,height:32,borderRadius:10,background:`${f.color||"#8B5CF6"}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:f.color||"#8B5CF6"}}>{f.initial}</div>
                      <div><div style={{fontSize:13,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{f.name}</div><div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>Level {f.level}</div></div>
                    </div>
                  ))}
                  {results.length===0&&<div style={{padding:20,textAlign:"center",color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",fontSize:13}}>No results</div>}
                </div>);
              })()}
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
