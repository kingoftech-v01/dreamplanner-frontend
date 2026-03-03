import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { BUDDIES } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { CATEGORIES, adaptColor, GRADIENTS } from "../../styles/colors";
import BottomNav from "../../components/shared/BottomNav";
import ErrorState from "../../components/shared/ErrorState";
import SubscriptionGate from "../../components/shared/SubscriptionGate";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import Avatar from "../../components/shared/Avatar";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";
import GradientButton from "../../components/shared/GradientButton";
import ExpandableText from "../../components/shared/ExpandableText";
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
var CAT_COLORS = {};Object.keys(CATEGORIES).forEach(function(k){CAT_COLORS[k]=CATEGORIES[k].dark;});

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
    level: user?.level || 1, xp: user?.xp || 0, streak: user?.streakDays || 0,
    dreams: user?.dreams || [],
  };

  var buddyQuery = useQuery({ queryKey: ["buddy-current"], queryFn: function () { return apiGet(BUDDIES.CURRENT); } });
  var hasBuddy = buddyQuery.data && buddyQuery.data.buddy;
  var suggestionsQuery = useQuery({
    queryKey: ["buddy-suggestions"],
    queryFn: function () { return apiPost(BUDDIES.FIND_MATCH, {}); },
    enabled: buddyQuery.isSuccess && !hasBuddy,
  });

  var CURRENT_BUDDY = (buddyQuery.data && buddyQuery.data.buddy) || null;
  var rawSuggestions = suggestionsQuery.data;
  // Backend returns {match: {...}} for a single match — normalize to array
  var suggestionsList = [];
  if (rawSuggestions) {
    if (Array.isArray(rawSuggestions.results)) suggestionsList = rawSuggestions.results;
    else if (Array.isArray(rawSuggestions)) suggestionsList = rawSuggestions;
    else if (rawSuggestions.match) suggestionsList = [rawSuggestions.match];
  }
  var SUGGESTIONS = suggestionsList.map(function (s, i) {
    if (!s) return null;
    return Object.assign({}, s, {
      name: s.name || s.displayName || s.username || "User",
      initial: (s.name || s.displayName || s.username || "?")[0].toUpperCase(),
      color: s.color || SUGGESTION_COLORS[i % SUGGESTION_COLORS.length],
      sharedDreams: s.sharedDreams || s.sharedInterests || [],
      sharedCategories: s.sharedCategories || [],
      dreams: s.dreams || [],
      achievements: s.achievements || [],
    });
  }).filter(Boolean);

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  var sendRequest=function(id){
    setSent(function(p){return Object.assign({},p,{[id]:true});});
    apiPost(BUDDIES.PAIR,{partner_id:id}).then(function(){
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
    apiPost(BUDDIES.ENCOURAGE(CURRENT_BUDDY.id),{message:encourageMsg}).then(function(){
      showToast("Encouragement sent!","success");
    }).catch(function(err){
      showToast(err.message||"Failed to send","error");
    }).finally(function(){
      setTimeout(function(){setEncourage(false);setSentEncourage(false);},1500);
    });
  };

  var _partner = CURRENT_BUDDY && CURRENT_BUDDY.partner;
  var b = {
    id: (_partner && _partner.id) || null,
    name: (_partner && (_partner.username || _partner.displayName)) || "Buddy",
    initial: ((_partner && (_partner.username || _partner.displayName)) || "B")[0].toUpperCase(),
    level: (_partner && (_partner.currentLevel || _partner.level)) || 0,
    xp: (_partner && (_partner.influenceScore || _partner.xp)) || 0,
    streak: (_partner && (_partner.currentStreak || _partner.streak)) || 0,
    color: "#14B8A6",
    online: false,
    avatar: (_partner && (_partner.avatar || _partner.avatarUrl)) || null,
    compatibility: (CURRENT_BUDDY && (CURRENT_BUDDY.compatibilityScore || CURRENT_BUDDY.compatibility_score)) || 0,
    joinedDate: (CURRENT_BUDDY && (CURRENT_BUDDY.createdAt || CURRENT_BUDDY.created_at)) ? new Date(CURRENT_BUDDY.createdAt || CURRENT_BUDDY.created_at).toLocaleDateString() : "recently",
    sharedDreams: (CURRENT_BUDDY && (CURRENT_BUDDY.sharedDreams || CURRENT_BUDDY.shared_dreams)) || (_partner && (_partner.sharedDreams || _partner.shared_dreams)) || [],
    sharedCategories: (CURRENT_BUDDY && (CURRENT_BUDDY.sharedCategories || CURRENT_BUDDY.shared_categories)) || (_partner && (_partner.sharedCategories || _partner.shared_categories)) || [],
    dreams: (_partner && _partner.dreams) || (CURRENT_BUDDY && CURRENT_BUDDY.partnerDreams) || [],
  };
  const ringR=40,ringC=2*Math.PI*ringR,ringOff=ringC*(1-(b.compatibility||0)/100);

  if (buddyQuery.isError || suggestionsQuery.isError) {
    return (
      <div style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ErrorState
            message={(buddyQuery.error && buddyQuery.error.message) || (suggestionsQuery.error && suggestionsQuery.error.message) || "Failed to load buddy data"}
            onRetry={function () { buddyQuery.refetch(); suggestionsQuery.refetch(); }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  return(
    <div style={{width:"100%",height:"100%",overflow:"hidden",display:"flex",flexDirection:"column",position:"relative"}}>

      {/* APPBAR */}
      <GlassAppBar
        left={
          <>
            <IconButton icon={ArrowLeft} onClick={()=>navigate(-1)} label="Go back" />
            <Target size={20} color={"var(--dp-teal)"} strokeWidth={2}/>
          </>
        }
        title="Dream Buddy"
        right={<IconButton icon={RefreshCw} onClick={function(){suggestionsQuery.refetch();buddyQuery.refetch();}} label="Refresh suggestions" />}
      />

      {/* CONTENT */}
      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"16px 16px 100px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
       <SubscriptionGate required="pro" feature="Dream Buddy">
        <div style={{width:"100%"}}>

          {/* ── What is Dream Buddy? ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <GlassCard padding={16} mb={14} style={{background:"linear-gradient(135deg,rgba(20,184,166,0.06),rgba(139,92,246,0.06))",border:"1px solid rgba(20,184,166,0.1)"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{width:36,height:36,borderRadius:12,flexShrink:0,background:"rgba(20,184,166,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Users size={18} color="#5EEAD4" strokeWidth={2}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--dp-text)",marginBottom:4}}>What is a Dream Buddy?</div>
                  <div style={{fontSize:12,color:"var(--dp-text-secondary)",lineHeight:1.5}}>
                    A Dream Buddy is your <strong style={{color:"var(--dp-teal)"}}>accountability partner</strong> — someone matched with you based on shared dreams and goals. Unlike friends (your social network), your buddy is a single partner focused on keeping you both motivated and on track.
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* ── Current Buddy Card ── */}
          {CURRENT_BUDDY && (()=>{
          var ringR=40,ringC=2*Math.PI*ringR,ringOff=ringC*(1-(b.compatibility||0)/100);
          return(
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <GlassCard padding={20} mb={16} style={{border:"1px solid rgba(20,184,166,0.15)"}}>
              <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:16}}>
                {/* Compatibility Ring */}
                <div style={{position:"relative",width:90,height:90,flexShrink:0}}>
                  <svg width={90} height={90} style={{transform:"rotate(-90deg)"}}>
                    <circle cx={45} cy={45} r={ringR} fill="none" stroke={"var(--dp-divider)"} strokeWidth={5}/>
                    <circle cx={45} cy={45} r={ringR} fill="none" stroke="#5EEAD4" strokeWidth={5} strokeLinecap="round"
                      strokeDasharray={ringC} strokeDashoffset={mounted?ringOff:ringC}
                      style={{transition:"stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)",filter:"drop-shadow(0 0 6px rgba(94,234,212,0.4))"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <Avatar name={b.name} size={52} color={b.color||"#14B8A6"} online={b.online} src={b.avatar} />
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:18,fontWeight:700,color:"var(--dp-text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"50%"}}>{b.name}</span>
                    <span style={{padding:"2px 8px",borderRadius:8,background:"rgba(20,184,166,0.1)",fontSize:12,fontWeight:600,color:"var(--dp-teal)"}}>Your Buddy</span>
                  </div>
                  <div style={{fontSize:13,color:"var(--dp-text-secondary)",marginBottom:6}}>Paired {b.joinedDate||"recently"}</div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <Heart size={14} color={"var(--dp-danger)"} strokeWidth={2.5}/>
                    <span style={{fontSize:14,fontWeight:700,color:"var(--dp-teal)"}}>{b.compatibility||0}% Match</span>
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
                  const ic=adaptColor(color,isLight);
                  return(
                  <div key={i} style={{flex:1,padding:"10px 8px",borderRadius:12,background:"var(--dp-header-bg)",border:"1px solid var(--dp-header-border)",textAlign:"center"}}>
                    <I size={14} color={ic} strokeWidth={2} style={{marginBottom:4}}/>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--dp-text)"}}>{typeof me==="number"&&me>999?`${(me/1000).toFixed(1)}k`:me}</div>
                    <div style={{fontSize:9,color:"var(--dp-text-tertiary)",marginBottom:4}}>You</div>
                    <div style={{height:1,background:"var(--dp-divider)",margin:"0 8px 4px"}}/>
                    <div style={{fontSize:12,fontWeight:600,color:b.color}}>{typeof them==="number"&&them>999?`${(them/1000).toFixed(1)}k`:them}</div>
                    <div style={{fontSize:9,color:"var(--dp-text-tertiary)"}}>{b.name}</div>
                  </div>
                );})}
              </div>

              {/* Shared dreams */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--dp-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>
                  {(b.sharedDreams.length > 0 || b.sharedCategories.length > 0) ? "Shared Dreams & Interests" : "Buddy's Dreams"}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {(b.sharedDreams||[]).map((d,i)=>(
                    <span key={i} style={{padding:"5px 10px",borderRadius:10,background:"rgba(20,184,166,0.08)",border:"1px solid rgba(20,184,166,0.12)",fontSize:12,fontWeight:500,color:"var(--dp-teal)"}}>{typeof d === "string" ? d : (d.title || d.name || "")}</span>
                  ))}
                  {(b.sharedCategories||[]).map((c,i)=>{
                    const CI=CAT_ICONS[c]||Target;const cc=CAT_COLORS[c]||"#C4B5FD";
                    const ccL=adaptColor(cc,isLight);
                    return <span key={`c${i}`} style={{padding:"5px 10px",borderRadius:10,background:`${cc}10`,border:`1px solid ${cc}18`,fontSize:12,fontWeight:500,color:ccL,display:"flex",alignItems:"center",gap:4}}><CI size={11} color={ccL} strokeWidth={2.5}/>{c}</span>;
                  })}
                  {b.sharedDreams.length === 0 && b.sharedCategories.length === 0 && b.dreams.length > 0 && b.dreams.map((d,i)=>(
                    <span key={`d${i}`} style={{padding:"5px 10px",borderRadius:10,background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.12)",fontSize:12,fontWeight:500,color:"var(--dp-accent)"}}>{typeof d === "string" ? d : (d.title || d.name || "")}</span>
                  ))}
                  {b.sharedDreams.length === 0 && b.sharedCategories.length === 0 && b.dreams.length === 0 && (
                    <span style={{fontSize:12,color:"var(--dp-text-muted)",fontStyle:"italic"}}>View their profile to see dreams</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{display:"flex",gap:8}}>
                {b.id && (
                  <button className="dp-gh" onClick={()=>navigate("/user/"+b.id)} style={{flex:1,padding:"11px 0",borderRadius:14,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.08)",color:"var(--dp-accent)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}}>
                    <Search size={16} strokeWidth={2}/>Profile
                  </button>
                )}
                <GradientButton gradient="teal" onClick={()=>{if(_partner&&_partner.id)navigate("/buddy-chat/"+_partner.id);}} icon={MessageCircle} style={{flex:1}}>Chat</GradientButton>
                <button className="dp-gh" onClick={()=>setEncourage(true)} style={{flex:1,padding:"11px 0",borderRadius:14,border:"1px solid rgba(246,154,154,0.2)",background:"rgba(246,154,154,0.08)",color:"var(--dp-danger)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}}>
                  <Heart size={16} strokeWidth={2}/>Encourage
                </button>
              </div>
            </GlassCard>
          </div>
          );})()}

          {/* ── Suggested Buddies ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"150ms"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Sparkles size={15} color={"var(--dp-accent)"} strokeWidth={2.5}/>
                <span style={{fontSize:15,fontWeight:700,color:"var(--dp-text)"}}>Suggested Matches</span>
              </div>
              <span style={{fontSize:12,color:"var(--dp-text-tertiary)"}}>{SUGGESTIONS.length} found</span>
            </div>
          </div>

          {SUGGESTIONS.map((s,i)=>{
            if(!s) return null;
            const isSent=sent[s.id];
            return(
              <div key={s.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${230+i*80}ms`}}>
                <GlassCard hover padding={16} mb={10} onClick={()=>setSelectedProfile(s)}>
                  <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                    {/* Avatar + score */}
                    <div style={{position:"relative",flexShrink:0}}>
                      <Avatar name={s.name} size={50} color={s.color} />
                      <div style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%)",padding:"1px 6px",borderRadius:6,background:"rgba(12,8,26,0.9)",border:"1px solid rgba(93,229,168,0.25)",fontSize:12,fontWeight:700,color:"#5DE5A8",whiteSpace:"nowrap"}}>{s.compatibility||0}%</div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{fontSize:15,fontWeight:600,color:"var(--dp-text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"40%"}}>{s.name}</span>
                        <span style={{fontSize:12,color:"var(--dp-text-tertiary)"}}>Lv.{s.level}</span>
                        {isSent&&<span style={{padding:"2px 7px",borderRadius:6,background:"rgba(93,229,168,0.1)",fontSize:12,fontWeight:600,color:"var(--dp-success)"}}>Sent ✓</span>}
                      </div>
                      <ExpandableText text={s.bio} maxLines={2} fontSize={12} color="var(--dp-text-secondary)" style={{marginBottom:8}} />
                      {/* Shared */}
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                        {s.sharedDreams.map((d,j)=>(
                          <span key={j} style={{padding:"3px 8px",borderRadius:8,background:"rgba(20,184,166,0.08)",fontSize:12,fontWeight:500,color:"var(--dp-teal)"}}>{d}</span>
                        ))}
                        {s.sharedCategories.map((c,j)=>{
                          const cc=CAT_COLORS[c]||"#C4B5FD";
                          const ccL=adaptColor(cc,isLight);
                          return <span key={`c${j}`} style={{padding:"3px 8px",borderRadius:8,background:`${cc}10`,fontSize:12,fontWeight:500,color:ccL}}>{c}</span>;
                        })}
                      </div>
                      {/* Stats row */}
                      <div style={{display:"flex",alignItems:"center",gap:12,fontSize:12,color:"var(--dp-text-tertiary)"}}>
                        <span style={{display:"flex",alignItems:"center",gap:3}}><Flame size={12} color={"var(--dp-danger)"} strokeWidth={2}/>{s.streak}d streak</span>
                        <span style={{display:"flex",alignItems:"center",gap:3}}><Star size={12} color={"var(--dp-warning)"} strokeWidth={2}/>Lv.{s.level}</span>
                        <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:3,color:"var(--dp-accent)",fontSize:12,fontWeight:500}}>View Profile<ChevronRight size={14} strokeWidth={2}/></span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}

          {/* ── How it works ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${230+(SUGGESTIONS.length||0)*80+80}ms`}}>
            <GlassCard padding={20} style={{marginTop:8}}>
              <div style={{fontSize:14,fontWeight:600,color:"var(--dp-text)",marginBottom:12}}>How Buddy Matching Works</div>
              {[
                {icon:Target,color:"#5EEAD4",title:"Shared Dreams",desc:"We match you with people who have similar goals and dream categories"},
                {icon:Star,color:"#FCD34D",title:"Similar Level",desc:"Buddies are close to your experience level for balanced motivation"},
                {icon:Heart,color:"#F69A9A",title:"Mutual Support",desc:"Send encouragements, share progress, and keep each other accountable"},
              ].map(({icon:I,color,title,desc},i)=>{
                const ic=adaptColor(color,isLight);
                return(
                <div key={i} style={{display:"flex",gap:12,marginBottom:i<2?14:0}}>
                  <div style={{width:36,height:36,borderRadius:12,flexShrink:0,background:`${color}10`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <I size={18} color={ic} strokeWidth={2}/>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--dp-text)",marginBottom:2}}>{title}</div>
                    <div style={{fontSize:12,color:"var(--dp-text-secondary)",lineHeight:1.4}}>{desc}</div>
                  </div>
                </div>
              );})}
            </GlassCard>
          </div>

        </div>
       </SubscriptionGate>
      </main>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {/* ═══ PROFILE DETAIL PANEL ═══ */}
      {selectedProfile&&(()=>{
        const s=selectedProfile;const isSent=sent[s.id];
        const sRingR=44,sRingC=2*Math.PI*sRingR,sRingOff=sRingC*(1-(s.compatibility||0)/100);
        return(
          <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",flexDirection:"column"}}>
            <div onClick={()=>setSelectedProfile(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
            <div style={{position:"absolute",top:0,right:0,bottom:0,width:"100%",maxWidth:420,background:"var(--dp-modal-bg)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderLeft:"1px solid var(--dp-glass-border)",display:"flex",flexDirection:"column",animation:"dpSI 0.3s cubic-bezier(0.16,1,0.3,1)",overflowY:"auto"}}>

              {/* Header */}
              <div style={{padding:"16px",borderBottom:"1px solid var(--dp-glass-border)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <span style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>Profile</span>
                <IconButton icon={X} size="sm" onClick={()=>setSelectedProfile(null)} label="Close" />
              </div>

              {/* Profile hero */}
              <div style={{padding:"28px 20px 20px",textAlign:"center"}}>
                {/* Compat ring + avatar */}
                <div style={{position:"relative",width:100,height:100,margin:"0 auto 16px"}}>
                  <svg width={100} height={100} style={{transform:"rotate(-90deg)"}}>
                    <circle cx={50} cy={50} r={sRingR} fill="none" stroke={"var(--dp-divider)"} strokeWidth={5}/>
                    <circle cx={50} cy={50} r={sRingR} fill="none" stroke="#5EEAD4" strokeWidth={5} strokeLinecap="round"
                      strokeDasharray={sRingC} strokeDashoffset={sRingOff}
                      style={{transition:"stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)",filter:"drop-shadow(0 0 8px rgba(94,234,212,0.4))"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Avatar name={s.name} size={62} color={s.color} />
                  </div>
                </div>
                <div style={{fontSize:20,fontWeight:700,color:"var(--dp-text)",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                <ExpandableText text={s.bio} maxLines={3} fontSize={13} color="var(--dp-text-secondary)" style={{marginBottom:6}} />
                <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:10,background:"rgba(94,234,212,0.08)",border:"1px solid rgba(94,234,212,0.12)"}}>
                  <Heart size={13} color={"var(--dp-teal)"} strokeWidth={2.5}/>
                  <span style={{fontSize:14,fontWeight:700,color:"var(--dp-teal)"}}>{s.compatibility}% Match</span>
                </div>
                <div style={{fontSize:12,color:"var(--dp-text-tertiary)",marginTop:6}}>Joined {s.joined||"recently"}{(s.mutualFriends||0)>0?` · ${s.mutualFriends} mutual friend${s.mutualFriends>1?"s":""}`:""}</div>
              </div>

              {/* Stats */}
              <div style={{display:"flex",gap:8,padding:"0 20px",marginBottom:18}}>
                {[
                  {Icon:Star,val:s.level||1,label:"Level",color:"#FCD34D"},
                  {Icon:Zap,val:(s.xp||0)>999?`${((s.xp||0)/1000).toFixed(1)}k`:(s.xp||0),label:"XP",color:"#5DE5A8"},
                  {Icon:Flame,val:s.streak||0,label:"Streak",color:"#F69A9A"},
                ].map(({Icon:I,val,label,color},i)=>{
                  const ic=adaptColor(color,isLight);
                  return(
                  <GlassCard key={i} padding="12px 8px" style={{flex:1,textAlign:"center"}}>
                    <I size={16} color={ic} strokeWidth={2} style={{marginBottom:4}}/>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--dp-text)"}}>{val}</div>
                    <div style={{fontSize:12,color:"var(--dp-text-tertiary)"}}>{label}</div>
                  </GlassCard>
                );})}
              </div>

              {/* Dreams */}
              <div style={{padding:"0 20px",marginBottom:18}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--dp-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Dreams</div>
                {s.dreams.map((d,i)=>{
                  const isShared=s.sharedDreams.includes(d);
                  return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:4,borderRadius:12,background:isShared?"rgba(20,184,166,0.06)":"var(--dp-surface)",border:isShared?"1px solid rgba(20,184,166,0.1)":"1px solid var(--dp-glass-border)"}}>
                      <Target size={14} color={isShared?("var(--dp-teal)"):("var(--dp-text-muted)")} strokeWidth={2}/>
                      <span style={{fontSize:13,color:isShared?("var(--dp-teal)"):("var(--dp-text-primary)"),fontWeight:isShared?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0}}>{d}</span>
                      {isShared&&<span style={{marginLeft:"auto",fontSize:12,fontWeight:600,color:"var(--dp-teal)",background:"rgba(20,184,166,0.1)",padding:"2px 6px",borderRadius:6}}>Shared!</span>}
                    </div>
                  );
                })}
              </div>

              {/* Categories */}
              <div style={{padding:"0 20px",marginBottom:18}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--dp-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Interests</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {s.sharedCategories.map((c,i)=>{
                    const CI=CAT_ICONS[c]||Target;const cc=CAT_COLORS[c]||"#C4B5FD";
                    const ccL=adaptColor(cc,isLight);
                    return <span key={i} style={{padding:"6px 12px",borderRadius:10,background:`${cc}10`,border:`1px solid ${cc}18`,fontSize:12,fontWeight:500,color:ccL,display:"flex",alignItems:"center",gap:5}}><CI size={13} color={ccL} strokeWidth={2}/>{c[0].toUpperCase()+c.slice(1)}</span>;
                  })}
                </div>
              </div>

              {/* Achievements */}
              <div style={{padding:"0 20px",marginBottom:24}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--dp-text-tertiary)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Achievements</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {s.achievements.map((a,i)=>(
                    <span key={i} style={{padding:"5px 10px",borderRadius:10,background:"rgba(252,211,77,0.06)",border:"1px solid rgba(252,211,77,0.1)",fontSize:12,fontWeight:500,color:"var(--dp-warning)",display:"flex",alignItems:"center",gap:4}}>
                      <Trophy size={11} strokeWidth={2.5}/>{a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons (sticky bottom) */}
              <div style={{padding:"16px 20px",borderTop:"1px solid var(--dp-glass-border)",background:"var(--dp-card-solid)",marginTop:"auto",flexShrink:0}}>
                {isSent?(
                  <div style={{padding:"14px 0",borderRadius:14,background:"rgba(93,229,168,0.08)",border:"1px solid rgba(93,229,168,0.15)",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <Check size={18} color={"var(--dp-success)"} strokeWidth={2.5}/>
                    <span style={{fontSize:15,fontWeight:600,color:"var(--dp-success)"}}>Buddy Request Sent!</span>
                  </div>
                ):(
                  <div style={{display:"flex",gap:8}}>
                    <button className="dp-gh" onClick={()=>setSelectedProfile(null)} style={{flex:1,padding:"13px 0",borderRadius:14,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
                      Maybe Later
                    </button>
                    <GradientButton gradient="primary" onClick={(e)=>{e.stopPropagation();sendRequest(s.id);}} icon={UserPlus} style={{flex:1.2}}>Send Request</GradientButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ ENCOURAGE MODAL ═══ */}
      <GlassModal open={encourage} onClose={()=>setEncourage(false)} variant="center" title={sentEncourage ? undefined : `Encourage ${b.name||"Buddy"}`} maxWidth={380}>
        <div style={{padding:24}}>
          {sentEncourage?(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{width:56,height:56,borderRadius:18,margin:"0 auto 14px",background:"rgba(93,229,168,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Check size={28} color={"var(--dp-success)"} strokeWidth={2.5}/>
              </div>
              <div style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>Encouragement Sent!</div>
              <div style={{fontSize:13,color:"var(--dp-text-secondary)",marginTop:4}}>{b.name||"Your buddy"} will appreciate it</div>
            </div>
          ):(
            <>
              {/* Preset messages */}
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                {ENCOURAGE_PRESETS.map((p,i)=>(
                  <button key={i} onClick={()=>setEncourageMsg(p)} style={{padding:"10px 14px",borderRadius:12,border:encourageMsg===p?"1px solid rgba(246,154,154,0.25)":("1px solid var(--dp-glass-border)"),background:encourageMsg===p?"rgba(246,154,154,0.08)":("var(--dp-header-bg)"),color:encourageMsg===p?("var(--dp-text)"):("var(--dp-text-secondary)"),fontSize:13,textAlign:"left",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{p}</button>
                ))}
              </div>
              {/* Custom input */}
              <div style={{display:"flex",gap:8}}>
                <GlassInput value={encourageMsg} onChange={e=>setEncourageMsg(e.target.value)} placeholder="Write a message..." style={{flex:1}} />
                <GradientButton gradient="pink" onClick={sendEncourage} icon={Send}>Send</GradientButton>
              </div>
            </>
          )}
        </div>
      </GlassModal>

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
