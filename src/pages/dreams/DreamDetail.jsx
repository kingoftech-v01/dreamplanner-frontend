import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import BottomNav from "../../components/shared/BottomNav";
import { StatsSkeleton, SkeletonCard, SkeletonLine } from "../../components/shared/Skeleton";
import { MOCK_DREAMS, MOCK_DREAM_DETAILS } from "../../data/mockData";
import { exportDreamCard } from "../../utils/exportDreamCard";
import {
  ArrowLeft, MoreVertical, MessageCircle, Target, Clock,
  ChevronDown, ChevronUp, Plus, Check, Circle, Trash2,
  Edit3, Share2, FileText, Copy, Zap, Flame, Star,
  X, CheckCircle, AlertTriangle, Sparkles, Flag,
  Globe, Lock
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Dream Detail Screen v1
 * ═══════════════════════════════════════════════════════════════════ */

const STATUS_COLORS={active:"#5DE5A8",paused:"#FCD34D",completed:"#C4B5FD",archived:"rgba(255,255,255,0.4)"};


export default function DreamDetailScreen(){
  const navigate=useNavigate();
  const { id } = useParams();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";

  // Look up the dream by route param id, with fallback to dream "3"
  const DREAM = MOCK_DREAM_DETAILS[id] || MOCK_DREAMS.find(d => d.id === id) || MOCK_DREAM_DETAILS["3"];
  const MILESTONES = (DREAM.milestones || []).map(m => ({ label: m.title, date: m.date, done: m.completed, active: m.active || false }));
  const initialGoals = (DREAM.goals || []).map((g, i) => ({ ...g, order: g.order !== undefined ? g.order : i, completed: g.completed || false, tasks: (g.tasks || []).map(t => ({ ...t, completed: t.completed || false })) }));

  const[loading,setLoading]=useState(true);
  const[mounted,setMounted]=useState(false);
  const[goals,setGoals]=useState(initialGoals);
  const[expanded,setExpanded]=useState(()=>{const first=initialGoals.find(g=>!g.completed);return first?{[first.id]:true}:{}});
  const[menu,setMenu]=useState(false);
  const[showDeleteConfirm,setShowDeleteConfirm]=useState(false);
  const[addGoal,setAddGoal]=useState(false);
  const[addTask,setAddTask]=useState(null);
  const[newTitle,setNewTitle]=useState("");
  const[newDesc,setNewDesc]=useState("");
  const[celebration,setCelebration]=useState(null); // null or { milestone: 25|50|75|100, xp }
  const [shareModal, setShareModal] = useState(false);
  const [shareImage, setShareImage] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);
  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  const toggleExpand=(id)=>setExpanded(p=>({...p,[id]:!p[id]}));
  const toggleTask=(gId,tId)=>{
    setGoals(prev=>{
      const next=prev.map(g=>g.id===gId?{...g,tasks:g.tasks.map(t=>t.id===tId?{...t,completed:!t.completed}:t)}:g);
      // Check for milestone celebration
      const total=next.reduce((s,g)=>s+g.tasks.length,0);
      if(total>0){
        const prevDone=prev.reduce((s,g)=>s+g.tasks.filter(t=>t.completed).length,0);
        const nextDone=next.reduce((s,g)=>s+g.tasks.filter(t=>t.completed).length,0);
        if(nextDone>prevDone){
          const prevPct=Math.round((prevDone/total)*100);
          const nextPct=Math.round((nextDone/total)*100);
          const milestones=[25,50,75,100];
          for(const m of milestones){
            if(nextPct>=m&&prevPct<m){
              setCelebration({milestone:m,xp:m===100?500:m===75?200:m===50?100:50});
              setTimeout(()=>setCelebration(null),4000);
              break;
            }
          }
        }
      }
      return next;
    });
  };
  const handleAddGoal=()=>{if(!newTitle.trim())return;setGoals(p=>[...p,{id:`g${Date.now()}`,title:newTitle.trim(),order:p.length,completed:false,tasks:[]}]);setNewTitle("");setNewDesc("");setAddGoal(false);};
  const handleAddTask=(gId)=>{if(!newTitle.trim())return;setGoals(p=>p.map(g=>g.id===gId?{...g,tasks:[...g.tasks,{id:`t${Date.now()}`,title:newTitle.trim(),completed:false,xp:20}]}:g));setNewTitle("");setNewDesc("");setAddTask(null);};

  const handleShare = async () => {
    setShareModal(true);
    setShareLoading(true);
    try {
      const blob = await exportDreamCard({
        title: DREAM.title,
        category: DREAM.category,
        progress: DREAM.progress,
        goalCount: DREAM.goals?.length || DREAM.totalTasks || 0,
        completedGoals: DREAM.completedTasks || 0,
        daysLeft: DREAM.daysLeft || 0,
        status: DREAM.status || "active",
      });
      setShareImage(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Export failed:", err);
    }
    setShareLoading(false);
  };

  const totalTasks=goals.reduce((s,g)=>s+g.tasks.length,0);
  const doneTasks=goals.reduce((s,g)=>s+g.tasks.filter(t=>t.completed).length,0);
  const progress=totalTasks?Math.round(doneTasks/totalTasks*100):0;
  const ringR=38,ringC=2*Math.PI*ringR,ringOff=ringC*(1-progress/100);


  const Modal=({title,onClose,onSubmit,submitLabel})=>(
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
      <div style={{position:"relative",width:"90%",maxWidth:380,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:22,border:"1px solid var(--dp-input-border)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",padding:24,animation:"dpFS 0.25s ease-out"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{title}</span>
          <button className="dp-ib" aria-label="Close" style={{width:32,height:32}} onClick={onClose}><X size={16} strokeWidth={2}/></button>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:6,display:"block"}}>Title</label>
          <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} autoFocus placeholder="Enter title..." style={{width:"100%",padding:"10px 14px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:"1px solid var(--dp-input-border)",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:6,display:"block"}}>Description (optional)</label>
          <textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)} rows={2} placeholder="Add details..." style={{width:"100%",padding:"10px 14px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:"1px solid var(--dp-input-border)",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",outline:"none",resize:"none"}}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={onSubmit} disabled={!newTitle.trim()} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:newTitle.trim()?"linear-gradient(135deg,#8B5CF6,#6D28D9)":(isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.04)"),color:newTitle.trim()?"#fff":(isLight?"rgba(26,21,53,0.3)":"rgba(255,255,255,0.25)"),fontSize:14,fontWeight:600,cursor:newTitle.trim()?"pointer":"not-allowed",fontFamily:"inherit"}}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );

  if (loading) return (
      <div style={{ width: "100%", padding: "60px 16px 0" }}>
        <SkeletonCard height={200} style={{ marginBottom: 16 }} />
        <StatsSkeleton isLight={isLight} />
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonCard height={60} />
          <SkeletonCard height={60} />
        </div>
      </div>
  );

  return(
    <div style={{width:"100%",height:"100dvh",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>

      <header style={{position:"relative",zIndex:100,height:64,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="dp-ib" aria-label="Go back" onClick={()=>navigate(-1)}><ArrowLeft size={20} strokeWidth={2}/></button>
          <span style={{fontSize:16,fontWeight:700,color:isLight?"#1a1535":"#fff",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{DREAM.title}</span>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={handleShare} style={{
            background: isLight ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${isLight ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.06)"}`,
            borderRadius: 12, padding: 8, cursor: "pointer",
          }}>
            <Share2 size={18} style={{ color: isLight ? "rgba(26,21,53,0.7)" : "rgba(255,255,255,0.7)" }} />
          </button>
          <button className="dp-ib" aria-label="Chat" onClick={()=>navigate("/chat/dream-"+DREAM.id)}><MessageCircle size={17} strokeWidth={2}/></button>
          <div style={{position:"relative"}}>
            <button className="dp-ib" aria-label="More options" onClick={()=>setMenu(!menu)}><MoreVertical size={17} strokeWidth={2}/></button>
            {menu&&<div style={{position:"absolute",top:44,right:0,width:180,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:14,border:"1px solid var(--dp-input-border)",boxShadow:"0 12px 40px rgba(0,0,0,0.4)",padding:6,zIndex:200,animation:"dpFS 0.15s ease-out"}}>
              {[{icon:Edit3,label:"Edit Dream",action:()=>{setMenu(false);navigate(`/dream/${DREAM.id}/edit`);}},{icon:Sparkles,label:"Generate Plan",action:()=>{setMenu(false);navigate(`/dream/${DREAM.id}/calibration`);}},{icon:Share2,label:"Share Dream",action:()=>{setMenu(false);handleShare();}},{icon:FileText,label:"Export PDF",action:()=>{setMenu(false);handleShare();}},{icon:Copy,label:"Duplicate",action:()=>{setMenu(false);navigate("/dream/create");}},{icon:Trash2,label:"Delete",danger:true,action:()=>{setMenu(false);setShowDeleteConfirm(true);}}].map(({icon:I,label,danger,action},i)=>(
                <button key={i} onClick={action||(()=>setMenu(false))} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"none",background:"transparent",display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:500,color:danger?"rgba(239,68,68,0.8)":(isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)"),transition:"background 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <I size={15} strokeWidth={2}/>{label}
                </button>
              ))}
            </div>}
          </div>
        </div>
      </header>

      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"16px 16px 100px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{width:"100%"}}>

          {/* ── Hero Card ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <div className="dp-g" style={{padding:20,marginBottom:16}}>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <div style={{position:"relative",width:86,height:86,flexShrink:0}}>
                  <svg width={86} height={86} style={{transform:"rotate(-90deg)"}}>
                    <circle cx={43} cy={43} r={ringR} fill="none" stroke={isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)"} strokeWidth={5}/>
                    <circle cx={43} cy={43} r={ringR} fill="none" stroke="url(#progGrad)" strokeWidth={5} strokeLinecap="round"
                      strokeDasharray={ringC} strokeDashoffset={mounted?ringOff:ringC}
                      style={{transition:"stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)",filter:"drop-shadow(0 0 6px rgba(93,229,168,0.4))"}}/>
                    <defs><linearGradient id="progGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#5DE5A8"/><stop offset="100%" stopColor="#14B8A6"/></linearGradient></defs>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:22,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{progress}%</span>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <span style={{padding:"3px 9px",borderRadius:8,background:`${STATUS_COLORS[DREAM.status]}15`,fontSize:12,fontWeight:700,color:isLight?(STATUS_COLORS[DREAM.status]==="#5DE5A8"?"#059669":STATUS_COLORS[DREAM.status]==="#FCD34D"?"#B45309":STATUS_COLORS[DREAM.status]==="#C4B5FD"?"#6D28D9":STATUS_COLORS[DREAM.status]):STATUS_COLORS[DREAM.status],textTransform:"uppercase"}}>{DREAM.status}</span>
                  <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginTop:8,lineHeight:1.5}}>{DREAM.description}</div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,flexWrap:"wrap"}}>
                    <span style={{padding:"3px 9px",borderRadius:8,background:"rgba(196,181,253,0.1)",fontSize:12,fontWeight:500,color:isLight?"#7C3AED":"#C4B5FD"}}>{DREAM.categoryLabel}</span>
                    <span style={{display:"flex",alignItems:"center",gap:3,fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}><Clock size={11} strokeWidth={2}/>{DREAM.timeframe}</span>
                    <button onClick={()=>setIsPublic(!isPublic)} style={{
                      display:"flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:"inherit",
                      background:isPublic?(isLight?"rgba(16,185,129,0.1)":"rgba(93,229,168,0.1)"):(isLight?"rgba(26,21,53,0.06)":"rgba(255,255,255,0.06)"),
                      transition:"all 0.25s ease",
                    }}>
                      {isPublic?<Globe size={11} strokeWidth={2.5} color={isLight?"#059669":"#5DE5A8"}/>:<Lock size={11} strokeWidth={2.5} color={isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.45)"}/>}
                      <span style={{fontSize:12,fontWeight:600,color:isPublic?(isLight?"#059669":"#5DE5A8"):(isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.45)")}}>{isPublic?"Public":"Private"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Stats ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms"}}>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[
                {Icon:Target,val:totalTasks,label:"Tasks",color:isLight?"#7C3AED":"#C4B5FD"},
                {Icon:CheckCircle,val:doneTasks,label:"Done",color:isLight?"#059669":"#5DE5A8"},
                {Icon:Zap,val:DREAM.xpEarned,label:"XP",color:isLight?"#B45309":"#FCD34D"},
              ].map(({Icon:I,val,label,color},i)=>(
                <div key={i} className="dp-g" style={{flex:1,padding:"12px 8px",textAlign:"center"}}>
                  <I size={16} color={color} strokeWidth={2} style={{marginBottom:4}}/>
                  <div style={{fontSize:18,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{val}</div>
                  <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Milestones Timeline ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"160ms"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
              <Flag size={14} color={isLight?"#B45309":"#FCD34D"} strokeWidth={2.5}/>
              <span style={{fontSize:14,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>Milestones</span>
            </div>
            <div className="dp-g" style={{padding:16,marginBottom:16}}>
              {MILESTONES.map((m,i)=>(
                <div key={i} style={{display:"flex",gap:12,position:"relative"}}>
                  {/* Line */}
                  {i<MILESTONES.length-1&&<div style={{position:"absolute",left:11,top:24,bottom:-4,width:2,background:m.done?"rgba(93,229,168,0.2)":(isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)")}}/>}
                  {/* Dot */}
                  <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:m.done?"rgba(93,229,168,0.15)":m.active?"rgba(252,211,77,0.12)":(isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)"),border:m.done?"2px solid rgba(93,229,168,0.3)":m.active?"2px solid rgba(252,211,77,0.3)":(isLight?"2px solid rgba(139,92,246,0.15)":"2px solid rgba(255,255,255,0.08)")}}>
                    {m.done?<Check size={12} color={isLight?"#059669":"#5DE5A8"} strokeWidth={3}/>:m.active?<div style={{width:6,height:6,borderRadius:3,background:"#FCD34D"}}/>:null}
                  </div>
                  <div style={{flex:1,paddingBottom:i<MILESTONES.length-1?16:0}}>
                    <div style={{fontSize:13,fontWeight:m.active?600:m.done?500:400,color:m.done?(isLight?"#059669":"#5DE5A8"):m.active?(isLight?"#B45309":"#FCD34D"):(isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)")}}>{m.label}</div>
                    <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"}}>{m.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Goals ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"240ms"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Star size={14} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2.5}/>
                <span style={{fontSize:14,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>Goals ({goals.length})</span>
              </div>
              <button onClick={()=>{setNewTitle("");setNewDesc("");setAddGoal(true);}} style={{padding:"5px 12px",borderRadius:10,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.08)",color:isLight?"#7C3AED":"#C4B5FD",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                <Plus size={13} strokeWidth={2.5}/>Add Goal
              </button>
            </div>
          </div>

          {goals.map((g,gi)=>{
            const isExp=expanded[g.id];
            const gDone=g.tasks.filter(t=>t.completed).length;
            const gTotal=g.tasks.length;
            const gProg=gTotal?gDone/gTotal:0;
            const allDone=gDone===gTotal&&gTotal>0;
            return(
              <div key={g.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${320+gi*60}ms`}}>
                <div className="dp-g" style={{marginBottom:8,overflow:"hidden"}}>
                  {/* Goal header */}
                  <div onClick={()=>toggleExpand(g.id)} style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                    <div style={{width:30,height:30,borderRadius:10,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:allDone?"rgba(93,229,168,0.15)":"rgba(139,92,246,0.1)",border:allDone?"1px solid rgba(93,229,168,0.25)":"1px solid rgba(139,92,246,0.15)"}}>
                      {allDone?<Check size={14} color={isLight?"#059669":"#5DE5A8"} strokeWidth={2.5}/>:<span style={{fontSize:12,fontWeight:700,color:isLight?"#7C3AED":"#C4B5FD"}}>{gi+1}</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:allDone?(isLight?"#059669":"#5DE5A8"):(isLight?"#1a1535":"#fff"),textDecoration:allDone?"line-through":"none"}}>{g.title}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
                        <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{gDone}/{gTotal} tasks</span>
                        <div style={{flex:1,maxWidth:80,height:3,borderRadius:2,background:isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)"}}>
                          <div style={{height:"100%",borderRadius:2,background:allDone?"#5DE5A8":"#C4B5FD",width:`${gProg*100}%`,transition:"width 0.5s ease"}}/>
                        </div>
                      </div>
                    </div>
                    {isExp?<ChevronUp size={18} color={isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"} strokeWidth={2}/>:<ChevronDown size={18} color={isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"} strokeWidth={2}/>}
                  </div>

                  {/* Tasks */}
                  <div style={{maxHeight:isExp?1000:0,opacity:isExp?1:0,transition:"all 0.35s cubic-bezier(0.16,1,0.3,1)",overflow:"hidden"}}>
                    <div style={{padding:"0 14px 12px",borderTop:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
                      {g.tasks.map((t,ti)=>(
                        <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:ti<g.tasks.length-1?(isLight?"1px solid rgba(139,92,246,0.06)":"1px solid rgba(255,255,255,0.03)"):"none"}}>
                          <button onClick={()=>toggleTask(g.id,t.id)} style={{width:22,height:22,borderRadius:7,border:t.completed?"none":(isLight?"2px solid rgba(139,92,246,0.2)":"2px solid rgba(255,255,255,0.15)"),background:t.completed?"rgba(93,229,168,0.2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s",flexShrink:0}}>
                            {t.completed&&<Check size={12} color={isLight?"#059669":"#5DE5A8"} strokeWidth={3}/>}
                          </button>
                          <span style={{flex:1,fontSize:13,color:t.completed?(isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"):(isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)"),textDecoration:t.completed?"line-through":"none",transition:"all 0.2s"}}>{t.title}</span>
                          <span style={{fontSize:12,color:t.completed?"rgba(93,229,168,0.5)":"rgba(252,211,77,0.6)",fontWeight:600}}>+{t.xp}</span>
                        </div>
                      ))}
                      <button onClick={()=>{setNewTitle("");setNewDesc("");setAddTask(g.id);}} style={{width:"100%",marginTop:8,padding:"8px",borderRadius:10,border:"1px dashed rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.04)",color:isLight?"#7C3AED":"#C4B5FD",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                        <Plus size={13} strokeWidth={2}/>Add Task
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </main>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {addGoal&&<Modal title="Add Goal" onClose={()=>setAddGoal(false)} onSubmit={handleAddGoal} submitLabel="Add Goal"/>}
      {addTask&&<Modal title="Add Task" onClose={()=>setAddTask(null)} onSubmit={()=>handleAddTask(addTask)} submitLabel="Add Task"/>}

      {showDeleteConfirm&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={()=>setShowDeleteConfirm(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div className="dp-g" style={{position:"relative",width:"90%",maxWidth:360,padding:24,animation:"dpFS 0.25s ease-out"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:12}}>
              <div style={{width:48,height:48,borderRadius:14,background:"rgba(239,68,68,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Trash2 size={22} color="#EF4444" strokeWidth={2}/>
              </div>
              <span style={{fontSize:18,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>Delete Dream?</span>
              <span style={{fontSize:14,lineHeight:1.5,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.6)"}}>This action cannot be undone. All goals and progress will be lost.</span>
            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={()=>setShowDeleteConfirm(false)} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",color:isLight?"rgba(26,21,53,0.7)":"rgba(255,255,255,0.85)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>{setShowDeleteConfirm(false);navigate(-1);}} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#EF4444,#DC2626)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {celebration && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
        }}
          onClick={() => setCelebration(null)}
        >
          {/* Confetti particles */}
          {Array.from({ length: 40 }, (_, i) => {
            const colors = ["#8B5CF6", "#EC4899", "#10B981", "#FCD34D", "#6366F1", "#F59E0B", "#14B8A6", "#EF4444"];
            const color = colors[i % colors.length];
            const left = Math.random() * 100;
            const delay = Math.random() * 2;
            const size = 6 + Math.random() * 8;
            const duration = 2 + Math.random() * 2;
            return (
              <div key={i} style={{
                position: "fixed",
                top: -20,
                left: `${left}%`,
                width: size,
                height: size,
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                background: color,
                animation: `dpConfetti ${duration}s ${delay}s ease-in forwards`,
                zIndex: 1001,
              }} />
            );
          })}

          {/* Modal card */}
          <div style={{
            background: isLight ? "rgba(255,255,255,0.9)" : "rgba(20,15,40,0.9)",
            backdropFilter: "blur(40px)",
            borderRadius: 24,
            padding: "40px 32px",
            textAlign: "center",
            maxWidth: 320,
            width: "90%",
            border: `1px solid ${isLight ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.1)"}`,
            boxShadow: "0 20px 60px rgba(139,92,246,0.3)",
            animation: "dpCelebPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            zIndex: 1002,
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#127881;</div>
            <h2 style={{
              fontSize: 24, fontWeight: 800, margin: "0 0 8px",
              color: isLight ? "#1A1535" : "rgba(255,255,255,0.95)",
            }}>
              {celebration.milestone === 100 ? "Dream Complete!" : "Milestone Reached!"}
            </h2>
            <p style={{
              fontSize: 16, margin: "0 0 16px",
              color: isLight ? "rgba(26,21,53,0.6)" : "rgba(255,255,255,0.6)",
            }}>
              {celebration.milestone}% of your dream achieved
            </p>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))",
              borderRadius: 12, padding: "8px 16px",
            }}>
              <span style={{ fontSize: 16 }}>&#9889;</span>
              <span style={{
                fontSize: 18, fontWeight: 700,
                color: "#8B5CF6",
              }}>+{celebration.xp} XP</span>
            </div>
          </div>
        </div>
      )}

      {shareModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)",
        }} onClick={() => { setShareModal(false); if (shareImage) URL.revokeObjectURL(shareImage); setShareImage(null); }}>
          <div style={{
            background: isLight ? "rgba(255,255,255,0.9)" : "rgba(20,15,40,0.95)",
            borderRadius: 24, padding: 24, maxWidth: 340, width: "90%",
            border: `1px solid ${isLight ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.1)"}`,
            animation: "dpFadeScale 0.3s ease-out",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{
              fontSize: 18, fontWeight: 700, marginBottom: 16, textAlign: "center",
              color: isLight ? "#1A1535" : "rgba(255,255,255,0.95)",
            }}>Share Your Progress</h3>

            {shareLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div className="dp-spin" style={{
                  width: 32, height: 32, border: "3px solid rgba(139,92,246,0.2)",
                  borderTopColor: "#8B5CF6", borderRadius: "50%", margin: "0 auto",
                }} />
                <p style={{ marginTop: 12, fontSize: 13, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)" }}>Generating card...</p>
              </div>
            ) : shareImage ? (
              <div>
                <img src={shareImage} alt="Dream progress card" style={{
                  width: "100%", borderRadius: 12, marginBottom: 16,
                }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href={shareImage}
                    download="dream-progress.png"
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                      color: "#fff", borderRadius: 14, padding: "12px 0",
                      textDecoration: "none", fontSize: 14, fontWeight: 600,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >Download</a>
                  {navigator.share && (
                    <button onClick={async () => {
                      try {
                        const res = await fetch(shareImage);
                        const blob = await res.blob();
                        const file = new File([blob], "dream-progress.png", { type: "image/png" });
                        await navigator.share({ files: [file], title: "My Dream Progress" });
                      } catch {}
                    }} style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      background: isLight ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.2)",
                      color: "#8B5CF6", borderRadius: 14, padding: "12px 0",
                      border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                      fontFamily: "Inter, sans-serif",
                    }}>Share</button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.3);}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        @keyframes dpFS{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
        @keyframes dpConfetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
        }
        @keyframes dpCelebPop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dpFadeScale {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes dpSpin {
          to { transform: rotate(360deg); }
        }
        .dp-spin { animation: dpSpin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
