import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import BottomNav from "../../components/shared/BottomNav";
import SubscriptionGate from "../../components/shared/SubscriptionGate";
import {
  ArrowLeft, Target, Heart, MessageCircle, Users, Star,
  Zap, ChevronRight, UserPlus, RefreshCw, Sparkles,
  Send, X, Check, Flame, Trophy, Brain, Briefcase,
  Palette, Wallet, Search
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Find My Buddy Screen v1
 * 
 * From Flutter:
 * - Current buddy card (if paired)
 * - Find match CTA (if not paired)
 * - Suggested buddies list
 * - Compatibility score, shared categories
 * - Request buddy, encourage dialog
 *
 * UX Upgrades:
 * - Animated compatibility ring (SVG)
 * - Card-based suggested buddies (not list)
 * - Shared dreams displayed with category icons
 * - Match animation when requesting
 * - Encourage modal with preset messages
 * - Stats comparison between you and buddy
 * - "How matching works" section
 * - All 9:1+ contrast
 * ═══════════════════════════════════════════════════════════════════ */

var SUGGESTION_COLORS = ["#EC4899","#3B82F6","#F59E0B","#8B5CF6","#14B8A6","#10B981","#6366F1","#EF4444"];

const CAT_ICONS = { career:Briefcase, hobbies:Palette, health:Heart, finance:Wallet, personal:Brain };
const CAT_COLORS = { career:"#C4B5FD", hobbies:"#FCD34D", health:"#5DE5A8", finance:"#5EEAD4", personal:"#F69A9A" };

const ENCOURAGE_PRESETS = [
  "Keep going, you're crushing it! 💪",
  "One step at a time — you've got this!",
  "Your streak is inspiring! Don't stop now 🔥",
  "Remember why you started. You're doing great!",
  "Proud of your progress this week! ⭐",
];


// ═══════════════════════════════════════════════════════════════════
export default function FindBuddyScreen(){
  const navigate=useNavigate();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  var { user } = useAuth();
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  const[mounted,setMounted]=useState(false);
  const[encourage,setEncourage]=useState(false);
  const[encourageMsg,setEncourageMsg]=useState(ENCOURAGE_PRESETS[0]);
  const[sent,setSent]=useState({});
  const[sentEncourage,setSentEncourage]=useState(false);
  const[selectedProfile,setSelectedProfile]=useState(null);

  var ME = {
    name: user?.displayName || user?.username || "You",
    initial: (user?.displayName || user?.username || "U")[0].toUpperCase(),
    level: user?.level || 1, xp: user?.xp || 0, streak: user?.streak || 0,
    dreams: user?.dreams || [],
  };

  var buddyQuery = useQuery({ queryKey: ["buddy-current"], queryFn: function () { return apiGet("/api/buddies/current/"); } });
  var suggestionsQuery = useQuery({ queryKey: ["buddy-suggestions"], queryFn: function () { return apiGet("/api/buddies/find-match/"); } });

  var CURRENT_BUDDY = buddyQuery.data || null;
  var SUGGESTIONS = ((suggestionsQuery.data && suggestionsQuery.data.results) || suggestionsQuery.data || []).map(function (s, i) {
    return Object.assign({}, s, {
      initial: (s.name || s.displayName || "?")[0].toUpperCase(),
      color: s.color || SUGGESTION_COLORS[i % SUGGESTION_COLORS.length],
      sharedDreams: s.sharedDreams || [],
      sharedCategories: s.sharedCategories || [],
      dreams: s.dreams || [],
      achievements: s.achievements || [],
    });
  });

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  var sendRequest=function(id){
    setSent(function(p){return Object.assign({},p,{[id]:true});});
    apiPost("/api/buddies/pair/",{buddyId:id}).then(function(){
      showToast("Buddy request sent!","success");
      queryClient.invalidateQueries({queryKey:["buddy-current"]});
      queryClient.invalidateQueries({queryKey:["buddy-suggestions"]});
    }).catch(function(err){
      showToast(err.message||"Failed to send request","error");
      setSent(function(p){var n=Object.assign({},p);delete n[id];return n;});
    });
  };
  var sendEncourage=function(){
    if(!CURRENT_BUDDY)return;
    setSentEncourage(true);
    apiPost("/api/buddies/"+CURRENT_BUDDY.id+"/encourage/",{message:encourageMsg}).then(function(){
      showToast("Encouragement sent!","success");
    }).catch(function(err){
      showToast(err.message||"Failed to send","error");
    }).finally(function(){
      setTimeout(function(){setEncourage(false);setSentEncourage(false);},1500);
    });
  };

  var b=CURRENT_BUDDY || {};
  const ringR=40,ringC=2*Math.PI*ringR,ringOff=ringC*(1-b.compatibility/100);

  return(
    <div style={{width:"100%",height:"100dvh",overflow:"hidden",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>

      {/* APPBAR */}
      <header style={{position:"relative",zIndex:100,height:64,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="dp-ib" onClick={()=>navigate(-1)} aria-label="Go back"><ArrowLeft size={20} strokeWidth={2}/></button>
          <Target size={20} color={isLight?"#0D9488":"#5EEAD4"} strokeWidth={2}/>
          <span style={{fontSize:17,fontWeight:700,color:isLight?"#1a1535":"#fff",letterSpacing:"-0.3px"}}>Dream Buddy</span>
        </div>
        <button className="dp-ib" onClick={function(){suggestionsQuery.refetch();buddyQuery.refetch();}} aria-label="Refresh suggestions"><RefreshCw size={17} strokeWidth={2}/></button>
      </header>

      {/* CONTENT */}
      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"16px 16px 100px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
       <SubscriptionGate required="pro" feature="Dream Buddy">
        <div style={{width:"100%"}}>

          {/* ── Current Buddy Card ── */}
          {CURRENT_BUDDY && (()=>{
          var ringR=40,ringC=2*Math.PI*ringR,ringOff=ringC*(1-(b.compatibility||0)/100);
          return(
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <div className="dp-g" style={{padding:20,marginBottom:16,border:"1px solid rgba(20,184,166,0.15)"}}>
              <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:16}}>
                {/* Compatibility Ring */}
                <div style={{position:"relative",width:90,height:90,flexShrink:0}}>
                  <svg width={90} height={90} style={{transform:"rotate(-90deg)"}}>
                    <circle cx={45} cy={45} r={ringR} fill="none" stroke={isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)"} strokeWidth={5}/>
                    <circle cx={45} cy={45} r={ringR} fill="none" stroke="#5EEAD4" strokeWidth={5} strokeLinecap="round"
                      strokeDasharray={ringC} strokeDashoffset={mounted?ringOff:ringC}
                      style={{transition:"stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)",filter:"drop-shadow(0 0 6px rgba(94,234,212,0.4))"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div style={{width:52,height:52,borderRadius:16,background:`${b.color||"#14B8A6"}18`,border:`2px solid ${b.color||"#14B8A6"}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:b.color||"#14B8A6"}}>{b.initial||(b.name||"B")[0].toUpperCase()}</div>
                  </div>
                  {b.online&&<div style={{position:"absolute",bottom:8,right:8,width:12,height:12,borderRadius:"50%",background:"#5DE5A8",border:isLight?"3px solid #f0ecff":"3px solid #0c081a",boxShadow:"0 0 8px rgba(93,229,168,0.5)"}}/>}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:18,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{b.name}</span>
                    <span style={{padding:"2px 8px",borderRadius:8,background:"rgba(20,184,166,0.1)",fontSize:12,fontWeight:600,color:isLight?"#0D9488":"#5EEAD4"}}>Your Buddy</span>
                  </div>
                  <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:6}}>Paired {b.joinedDate||"recently"}</div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <Heart size={14} color={isLight?"#DC2626":"#F69A9A"} strokeWidth={2.5}/>
                    <span style={{fontSize:14,fontWeight:700,color:isLight?"#0D9488":"#5EEAD4"}}>{b.compatibility||0}% Match</span>
                  </div>
                </div>
              </div>

              {/* Stats comparison */}
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                {[
                  {label:"Level",me:ME.level,them:b.level,Icon:Star,color:"#FCD34D"},
                  {label:"Streak",me:ME.streak,them:b.streak,Icon:Flame,color:"#F69A9A"},
                  {label:"XP",me:ME.xp,them:b.xp,Icon:Zap,color:"#5DE5A8"},
                ].map(({label,me,them,Icon:I,color},i)=>{
                  const ic=color==="#FCD34D"?(isLight?"#B45309":"#FCD34D"):color==="#F69A9A"?(isLight?"#DC2626":"#F69A9A"):color==="#5DE5A8"?(isLight?"#059669":"#5DE5A8"):color;
                  return(
                  <div key={i} style={{flex:1,padding:"10px 8px",borderRadius:12,background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",border:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)",textAlign:"center"}}>
                    <I size={14} color={ic} strokeWidth={2} style={{marginBottom:4}}/>
                    <div style={{fontSize:12,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{typeof me==="number"&&me>999?`${(me/1000).toFixed(1)}k`:me}</div>
                    <div style={{fontSize:9,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",marginBottom:4}}>You</div>
                    <div style={{height:1,background:isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)",margin:"0 8px 4px"}}/>
                    <div style={{fontSize:12,fontWeight:600,color:b.color}}>{typeof them==="number"&&them>999?`${(them/1000).toFixed(1)}k`:them}</div>
                    <div style={{fontSize:9,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{b.name}</div>
                  </div>
                );})}
              </div>

              {/* Shared dreams */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Shared Dreams</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {(b.sharedDreams||[]).map((d,i)=>(
                    <span key={i} style={{padding:"5px 10px",borderRadius:10,background:"rgba(20,184,166,0.08)",border:"1px solid rgba(20,184,166,0.12)",fontSize:12,fontWeight:500,color:isLight?"#0D9488":"#5EEAD4"}}>{d}</span>
                  ))}
                  {(b.sharedCategories||[]).map((c,i)=>{
                    const CI=CAT_ICONS[c]||Target;const cc=CAT_COLORS[c]||"#C4B5FD";
                    const ccL=cc==="#C4B5FD"?(isLight?"#6D28D9":"#C4B5FD"):cc==="#FCD34D"?(isLight?"#B45309":"#FCD34D"):cc==="#5DE5A8"?(isLight?"#059669":"#5DE5A8"):cc==="#5EEAD4"?(isLight?"#0D9488":"#5EEAD4"):cc==="#F69A9A"?(isLight?"#DC2626":"#F69A9A"):cc;
                    return <span key={`c${i}`} style={{padding:"5px 10px",borderRadius:10,background:`${cc}10`,border:`1px solid ${cc}18`,fontSize:12,fontWeight:500,color:ccL,display:"flex",alignItems:"center",gap:4}}><CI size={11} color={ccL} strokeWidth={2.5}/>{c}</span>;
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>navigate("/buddy-chat/"+(CURRENT_BUDDY&&CURRENT_BUDDY.id||"buddy1"))} style={{flex:1,padding:"11px 0",borderRadius:14,border:"none",background:"linear-gradient(135deg,#14B8A6,#0D9488)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 16px rgba(20,184,166,0.25)",transition:"all 0.2s"}}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                  <MessageCircle size={16} strokeWidth={2}/>Chat
                </button>
                <button onClick={()=>setEncourage(true)} style={{flex:1,padding:"11px 0",borderRadius:14,border:"1px solid rgba(246,154,154,0.2)",background:"rgba(246,154,154,0.08)",color:isLight?"#DC2626":"#F69A9A",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(246,154,154,0.15)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(246,154,154,0.08)"}>
                  <Heart size={16} strokeWidth={2}/>Encourage
                </button>
              </div>
            </div>
          </div>
          );})()}

          {/* ── Suggested Buddies ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"150ms"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Sparkles size={15} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2.5}/>
                <span style={{fontSize:15,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>Suggested Matches</span>
              </div>
              <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{SUGGESTIONS.length} found</span>
            </div>
          </div>

          {SUGGESTIONS.map((s,i)=>{
            const isSent=sent[s.id];
            return(
              <div key={s.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${230+i*80}ms`}}>
                <div className="dp-g dp-gh" style={{padding:16,marginBottom:10,cursor:"pointer"}} onClick={()=>setSelectedProfile(s)}>
                  <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                    {/* Avatar + score */}
                    <div style={{position:"relative",flexShrink:0}}>
                      <div style={{width:50,height:50,borderRadius:16,background:`${s.color}15`,border:`2px solid ${s.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:s.color}}>{s.initial}</div>
                      <div style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%)",padding:"1px 6px",borderRadius:6,background:"rgba(12,8,26,0.9)",border:"1px solid rgba(93,229,168,0.25)",fontSize:12,fontWeight:700,color:"#5DE5A8",whiteSpace:"nowrap"}}>{s.compatibility}%</div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{fontSize:15,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{s.name}</span>
                        <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>Lv.{s.level}</span>
                        {isSent&&<span style={{padding:"2px 7px",borderRadius:6,background:"rgba(93,229,168,0.1)",fontSize:12,fontWeight:600,color:isLight?"#059669":"#5DE5A8"}}>Sent ✓</span>}
                      </div>
                      <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:8,lineHeight:1.4}}>{s.bio}</div>
                      {/* Shared */}
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                        {s.sharedDreams.map((d,j)=>(
                          <span key={j} style={{padding:"3px 8px",borderRadius:8,background:"rgba(20,184,166,0.08)",fontSize:12,fontWeight:500,color:isLight?"#0D9488":"#5EEAD4"}}>{d}</span>
                        ))}
                        {s.sharedCategories.map((c,j)=>{
                          const cc=CAT_COLORS[c]||"#C4B5FD";
                          const ccL=cc==="#C4B5FD"?(isLight?"#6D28D9":"#C4B5FD"):cc==="#FCD34D"?(isLight?"#B45309":"#FCD34D"):cc==="#5DE5A8"?(isLight?"#059669":"#5DE5A8"):cc==="#5EEAD4"?(isLight?"#0D9488":"#5EEAD4"):cc==="#F69A9A"?(isLight?"#DC2626":"#F69A9A"):cc;
                          return <span key={`c${j}`} style={{padding:"3px 8px",borderRadius:8,background:`${cc}10`,fontSize:12,fontWeight:500,color:ccL}}>{c}</span>;
                        })}
                      </div>
                      {/* Stats row */}
                      <div style={{display:"flex",alignItems:"center",gap:12,fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>
                        <span style={{display:"flex",alignItems:"center",gap:3}}><Flame size={12} color={isLight?"#DC2626":"#F69A9A"} strokeWidth={2}/>{s.streak}d streak</span>
                        <span style={{display:"flex",alignItems:"center",gap:3}}><Star size={12} color={isLight?"#B45309":"#FCD34D"} strokeWidth={2}/>Lv.{s.level}</span>
                        <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:3,color:isLight?"#7C3AED":"#C4B5FD",fontSize:12,fontWeight:500}}>View Profile<ChevronRight size={14} strokeWidth={2}/></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── How it works ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${230+(SUGGESTIONS.length||0)*80+80}ms`}}>
            <div className="dp-g" style={{padding:20,marginTop:8}}>
              <div style={{fontSize:14,fontWeight:600,color:isLight?"#1a1535":"#fff",marginBottom:12}}>How Buddy Matching Works</div>
              {[
                {icon:Target,color:"#5EEAD4",title:"Shared Dreams",desc:"We match you with people who have similar goals and dream categories"},
                {icon:Star,color:"#FCD34D",title:"Similar Level",desc:"Buddies are close to your experience level for balanced motivation"},
                {icon:Heart,color:"#F69A9A",title:"Mutual Support",desc:"Send encouragements, share progress, and keep each other accountable"},
              ].map(({icon:I,color,title,desc},i)=>{
                const ic=color==="#5EEAD4"?(isLight?"#0D9488":"#5EEAD4"):color==="#FCD34D"?(isLight?"#B45309":"#FCD34D"):color==="#F69A9A"?(isLight?"#DC2626":"#F69A9A"):color;
                return(
                <div key={i} style={{display:"flex",gap:12,marginBottom:i<2?14:0}}>
                  <div style={{width:36,height:36,borderRadius:12,flexShrink:0,background:`${color}10`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <I size={18} color={ic} strokeWidth={2}/>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:isLight?"#1a1535":"#fff",marginBottom:2}}>{title}</div>
                    <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",lineHeight:1.4}}>{desc}</div>
                  </div>
                </div>
              );})}
            </div>
          </div>

        </div>
       </SubscriptionGate>
      </main>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {/* ═══ PROFILE DETAIL PANEL ═══ */}
      {selectedProfile&&(()=>{
        const s=selectedProfile;const isSent=sent[s.id];
        const sRingR=44,sRingC=2*Math.PI*sRingR,sRingOff=sRingC*(1-s.compatibility/100);
        return(
          <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",flexDirection:"column"}}>
            <div onClick={()=>setSelectedProfile(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
            <div style={{position:"absolute",top:0,right:0,bottom:0,width:"100%",maxWidth:420,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderLeft:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",animation:"dpSI 0.3s cubic-bezier(0.16,1,0.3,1)",overflowY:"auto"}}>

              {/* Header */}
              <div style={{padding:"16px",borderBottom:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Profile</span>
                <button className="dp-ib" style={{width:34,height:34}} onClick={()=>setSelectedProfile(null)} aria-label="Close"><X size={16} strokeWidth={2}/></button>
              </div>

              {/* Profile hero */}
              <div style={{padding:"28px 20px 20px",textAlign:"center"}}>
                {/* Compat ring + avatar */}
                <div style={{position:"relative",width:100,height:100,margin:"0 auto 16px"}}>
                  <svg width={100} height={100} style={{transform:"rotate(-90deg)"}}>
                    <circle cx={50} cy={50} r={sRingR} fill="none" stroke={isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)"} strokeWidth={5}/>
                    <circle cx={50} cy={50} r={sRingR} fill="none" stroke="#5EEAD4" strokeWidth={5} strokeLinecap="round"
                      strokeDasharray={sRingC} strokeDashoffset={sRingOff}
                      style={{transition:"stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)",filter:"drop-shadow(0 0 8px rgba(94,234,212,0.4))"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{width:62,height:62,borderRadius:20,background:`${s.color}18`,border:`2px solid ${s.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:700,color:s.color}}>{s.initial}</div>
                  </div>
                </div>
                <div style={{fontSize:20,fontWeight:700,color:isLight?"#1a1535":"#fff",marginBottom:4}}>{s.name}</div>
                <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:6}}>{s.bio}</div>
                <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:10,background:"rgba(94,234,212,0.08)",border:"1px solid rgba(94,234,212,0.12)"}}>
                  <Heart size={13} color={isLight?"#0D9488":"#5EEAD4"} strokeWidth={2.5}/>
                  <span style={{fontSize:14,fontWeight:700,color:isLight?"#0D9488":"#5EEAD4"}}>{s.compatibility}% Match</span>
                </div>
                <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",marginTop:6}}>Joined {s.joined}{s.mutualFriends>0?` · ${s.mutualFriends} mutual friend${s.mutualFriends>1?"s":""}`:""}</div>
              </div>

              {/* Stats */}
              <div style={{display:"flex",gap:8,padding:"0 20px",marginBottom:18}}>
                {[
                  {Icon:Star,val:s.level,label:"Level",color:"#FCD34D"},
                  {Icon:Zap,val:s.xp>999?`${(s.xp/1000).toFixed(1)}k`:s.xp,label:"XP",color:"#5DE5A8"},
                  {Icon:Flame,val:s.streak,label:"Streak",color:"#F69A9A"},
                ].map(({Icon:I,val,label,color},i)=>{
                  const ic=color==="#FCD34D"?(isLight?"#B45309":"#FCD34D"):color==="#5DE5A8"?(isLight?"#059669":"#5DE5A8"):color==="#F69A9A"?(isLight?"#DC2626":"#F69A9A"):color;
                  return(
                  <div key={i} style={{flex:1,padding:"12px 8px",borderRadius:14,background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",border:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)",textAlign:"center"}}>
                    <I size={16} color={ic} strokeWidth={2} style={{marginBottom:4}}/>
                    <div style={{fontSize:16,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{val}</div>
                    <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{label}</div>
                  </div>
                );})}
              </div>

              {/* Dreams */}
              <div style={{padding:"0 20px",marginBottom:18}}>
                <div style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Dreams</div>
                {s.dreams.map((d,i)=>{
                  const isShared=s.sharedDreams.includes(d);
                  return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:4,borderRadius:12,background:isShared?"rgba(20,184,166,0.06)":(isLight?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.02)"),border:isShared?"1px solid rgba(20,184,166,0.1)":(isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.04)")}}>
                      <Target size={14} color={isShared?(isLight?"#0D9488":"#5EEAD4"):(isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)")} strokeWidth={2}/>
                      <span style={{fontSize:13,color:isShared?(isLight?"#0D9488":"#5EEAD4"):(isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)"),fontWeight:isShared?600:400}}>{d}</span>
                      {isShared&&<span style={{marginLeft:"auto",fontSize:12,fontWeight:600,color:isLight?"#0D9488":"#5EEAD4",background:"rgba(20,184,166,0.1)",padding:"2px 6px",borderRadius:6}}>Shared!</span>}
                    </div>
                  );
                })}
              </div>

              {/* Categories */}
              <div style={{padding:"0 20px",marginBottom:18}}>
                <div style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Interests</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {s.sharedCategories.map((c,i)=>{
                    const CI=CAT_ICONS[c]||Target;const cc=CAT_COLORS[c]||"#C4B5FD";
                    const ccL=cc==="#C4B5FD"?(isLight?"#6D28D9":"#C4B5FD"):cc==="#FCD34D"?(isLight?"#B45309":"#FCD34D"):cc==="#5DE5A8"?(isLight?"#059669":"#5DE5A8"):cc==="#5EEAD4"?(isLight?"#0D9488":"#5EEAD4"):cc==="#F69A9A"?(isLight?"#DC2626":"#F69A9A"):cc;
                    return <span key={i} style={{padding:"6px 12px",borderRadius:10,background:`${cc}10`,border:`1px solid ${cc}18`,fontSize:12,fontWeight:500,color:ccL,display:"flex",alignItems:"center",gap:5}}><CI size={13} color={ccL} strokeWidth={2}/>{c[0].toUpperCase()+c.slice(1)}</span>;
                  })}
                </div>
              </div>

              {/* Achievements */}
              <div style={{padding:"0 20px",marginBottom:24}}>
                <div style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Achievements</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {s.achievements.map((a,i)=>(
                    <span key={i} style={{padding:"5px 10px",borderRadius:10,background:"rgba(252,211,77,0.06)",border:"1px solid rgba(252,211,77,0.1)",fontSize:12,fontWeight:500,color:isLight?"#B45309":"#FCD34D",display:"flex",alignItems:"center",gap:4}}>
                      <Trophy size={11} strokeWidth={2.5}/>{a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons (sticky bottom) */}
              <div style={{padding:"16px 20px",borderTop:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",background:isLight?"rgba(255,255,255,0.95)":"rgba(12,8,26,0.95)",marginTop:"auto",flexShrink:0}}>
                {isSent?(
                  <div style={{padding:"14px 0",borderRadius:14,background:"rgba(93,229,168,0.08)",border:"1px solid rgba(93,229,168,0.15)",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <Check size={18} color={isLight?"#059669":"#5DE5A8"} strokeWidth={2.5}/>
                    <span style={{fontSize:15,fontWeight:600,color:isLight?"#059669":"#5DE5A8"}}>Buddy Request Sent!</span>
                  </div>
                ):(
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setSelectedProfile(null)} style={{flex:1,padding:"13px 0",borderRadius:14,border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.06)":"rgba(255,255,255,0.08)"}
                      onMouseLeave={e=>e.currentTarget.style.background=isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)"}>
                      Maybe Later
                    </button>
                    <button onClick={(e)=>{e.stopPropagation();sendRequest(s.id);}} style={{flex:1.2,padding:"13px 0",borderRadius:14,border:"none",background:"linear-gradient(135deg,#8B5CF6,#6D28D9)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 16px rgba(139,92,246,0.3)",transition:"all 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
                      onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                      <UserPlus size={16} strokeWidth={2}/>Send Request
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ ENCOURAGE MODAL ═══ */}
      {encourage&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={()=>setEncourage(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"relative",width:"90%",maxWidth:380,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:22,border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",padding:24,animation:"dpFS 0.25s ease-out"}}>
            {sentEncourage?(
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{width:56,height:56,borderRadius:18,margin:"0 auto 14px",background:"rgba(93,229,168,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Check size={28} color={isLight?"#059669":"#5DE5A8"} strokeWidth={2.5}/>
                </div>
                <div style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Encouragement Sent!</div>
                <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginTop:4}}>{b.name||"Your buddy"} will appreciate it</div>
              </div>
            ):(
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Heart size={18} color={isLight?"#DC2626":"#F69A9A"} strokeWidth={2}/>
                    <span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Encourage {b.name||"Buddy"}</span>
                  </div>
                  <button onClick={()=>setEncourage(false)} className="dp-ib" style={{width:32,height:32}} aria-label="Close"><X size={16} strokeWidth={2}/></button>
                </div>
                {/* Preset messages */}
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                  {ENCOURAGE_PRESETS.map((p,i)=>(
                    <button key={i} onClick={()=>setEncourageMsg(p)} style={{padding:"10px 14px",borderRadius:12,border:encourageMsg===p?"1px solid rgba(246,154,154,0.25)":(isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"),background:encourageMsg===p?"rgba(246,154,154,0.08)":(isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)"),color:encourageMsg===p?(isLight?"#1a1535":"#fff"):(isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"),fontSize:13,textAlign:"left",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{p}</button>
                  ))}
                </div>
                {/* Custom input */}
                <div style={{display:"flex",gap:8}}>
                  <input value={encourageMsg} onChange={e=>setEncourageMsg(e.target.value)} style={{flex:1,padding:"10px 14px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",color:isLight?"#1a1535":"#fff",fontSize:13,fontFamily:"inherit",outline:"none"}}/>
                  <button onClick={sendEncourage} style={{padding:"10px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#F69A9A,#EC4899)",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 12px rgba(246,154,154,0.25)"}}>
                    <Send size={14} strokeWidth={2}/>Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        input::placeholder{color:rgba(255,255,255,0.35);}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        @keyframes dpFS{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
        @keyframes dpSI{from{transform:translateX(100%);}to{transform:translateX(0);}}
        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
      `}</style>
    </div>
  );
}
