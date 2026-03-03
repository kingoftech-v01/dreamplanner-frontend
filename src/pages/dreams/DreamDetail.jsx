import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import BottomNav from "../../components/shared/BottomNav";
import ErrorState from "../../components/shared/ErrorState";
import { StatsSkeleton, SkeletonCard, SkeletonLine } from "../../components/shared/Skeleton";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import Avatar from "../../components/shared/Avatar";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";
import GradientButton from "../../components/shared/GradientButton";
import AchievementShareModal from "../../components/shared/AchievementShareModal";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../services/api";
import { DREAMS, SOCIAL } from "../../services/endpoints";
import { exportDreamCard } from "../../utils/exportDreamCard";
import { saveBlobFile, nativeShare, isNative } from "../../services/native";
import {
  ArrowLeft, MoreVertical, MessageCircle, Target, Clock,
  ChevronDown, ChevronUp, Plus, Check, Circle, Trash2,
  Edit3, Share2, FileText, Copy, Zap, Flame, Star,
  X, CheckCircle, AlertTriangle, Sparkles, Flag,
  Globe, Lock, Tag, UserPlus, TrendingUp, Download, Search, Rocket
} from "lucide-react";
import { adaptColor, GRADIENTS, STATUS } from "../../styles/colors";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Dream Detail Screen v1
 * ═══════════════════════════════════════════════════════════════════ */

const STATUS_COLORS=STATUS;

/* ── Reusable truncated text with "Read more" ── */
function TruncText({ text, maxLen, isLight, style, t }) {
  var [exp, setExp] = useState(false);
  if (!text) return null;
  var need = text.length > maxLen;
  return (
    <div style={Object.assign({ fontSize: 12, color: "var(--dp-text-tertiary)", lineHeight: 1.5 }, style || {})}>
      {need && !exp ? text.slice(0, maxLen) + "..." : text}
      {need && (
        <span onClick={function (e) { e.stopPropagation(); setExp(!exp); }} style={{ color: "var(--dp-accent)", fontWeight: 600, cursor: "pointer", marginLeft: 4, fontSize: 11 }}>
          {exp ? t("dreams.showLess") : t("dreams.readMore")}
        </span>
      )}
    </div>
  );
}

/* ── "See More" / "Show Less" button ── */
function SeeMoreBtn({ shown, total, onToggle, isLight, expanded, t }) {
  if (!expanded && total <= shown) return null;
  var isExpanded = expanded || shown >= total;
  return (
    <button onClick={onToggle} style={{
      width: "100%", padding: "10px 0", marginTop: 4, borderRadius: 12,
      border: "1px solid var(--dp-glass-border)",
      background: "var(--dp-pill-bg)",
      color: "var(--dp-accent)", fontSize: 13, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 6, transition: "all 0.2s ease",
    }}>
      {isExpanded ? t("dreams.showLess") : t("dreams.seeAll") + " (" + total + ")"}
      <ChevronDown size={14} strokeWidth={2.5} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
    </button>
  );
}

export default function DreamDetailScreen(){
  const navigate=useNavigate();
  const { id } = useParams();
  var queryClient = useQueryClient();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  var { user: currentUser } = useAuth();
  var { showToast } = useToast();
  var { t } = useT();

  var dreamQuery = useQuery({ queryKey: ["dream", id], queryFn: function () { return apiGet(DREAMS.DETAIL(id)); } });
  var DREAM = dreamQuery.data || {};
  var isOwner = currentUser && DREAM.user && (String(currentUser.id) === String(DREAM.user));
  var MILESTONES = (DREAM.milestones || []).map(function (m, i) {
    var isDone = m.status === "completed" || m.completed;
    var isActive = !isDone && i === 0 || (!isDone && (DREAM.milestones || []).slice(0, i).every(function (pm) { return pm.status === "completed" || pm.completed; }));
    return {
      id: m.id,
      label: m.title,
      description: m.description,
      order: m.order != null ? m.order : i,
      done: isDone,
      active: isActive,
      progressPercentage: m.progressPercentage || 0,
      expectedDate: m.expectedDate,
      deadlineDate: m.deadlineDate,
      date: m.deadlineDate ? new Date(m.deadlineDate).toLocaleDateString() : (m.expectedDate ? new Date(m.expectedDate).toLocaleDateString() : ""),
      goals: m.goals || [],
    };
  });

  // ── Mutations ──
  var taskCompleteMut = useMutation({
    mutationFn: function (taskId) { return apiPost(DREAMS.TASKS.COMPLETE(taskId)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["dream", id] }); queryClient.invalidateQueries({ queryKey: ["dreams"] }); },
  });
  var addGoalMut = useMutation({
    mutationFn: function (data) { return apiPost(DREAMS.GOALS.LIST, data); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["dream", id] }); },
  });
  var addTaskMut = useMutation({
    mutationFn: function (data) { return apiPost(DREAMS.TASKS.LIST, data); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["dream", id] }); },
  });
  var deleteDreamMut = useMutation({
    mutationFn: function () { return apiDelete(DREAMS.DETAIL(id)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["dreams"] }); showToast("Dream deleted", "success"); navigate("/"); },
    onError: function (err) { showToast(err.message || "Failed to delete dream", "error"); },
  });
  var duplicateDreamMut = useMutation({
    mutationFn: function () { return apiPost(DREAMS.DUPLICATE(id)); },
    onSuccess: function (data) { showToast("Dream duplicated!", "success"); navigate("/dream/" + data.id); },
    onError: function (err) { showToast(err.message || "Failed to duplicate", "error"); },
  });
  var milestoneCompleteMut = useMutation({
    mutationFn: function (milestoneId) { return apiPost(DREAMS.MILESTONES.COMPLETE(milestoneId)); },
    onSuccess: function (_data, milestoneId) {
      queryClient.invalidateQueries({ queryKey: ["dream", id] });
      showToast("Milestone completed!", "success");
      var ms = MILESTONES.find(function (m) { return m.id === milestoneId; });
      setAchievementShare({ type: "milestone", title: ms ? ms.label : "Milestone", milestoneId: milestoneId });
    },
    onError: function (err) { showToast(err.message || "Failed to complete milestone", "error"); },
  });

  // ── Obstacles query & mutations ──
  var obstaclesQuery = useQuery({ queryKey: ["obstacles", id], queryFn: function () { return apiGet(DREAMS.OBSTACLES.LIST + "?dream=" + id); } });
  var obstacles = (obstaclesQuery.data && obstaclesQuery.data.results) || obstaclesQuery.data || [];

  var addObstacleMut = useMutation({
    mutationFn: function (data) { return apiPost(DREAMS.OBSTACLES.LIST, data); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["obstacles", id] }); showToast("Obstacle added", "success"); },
    onError: function (err) { showToast(err.message || "Failed to add obstacle", "error"); },
  });
  var resolveObstacleMut = useMutation({
    mutationFn: function (obstacleId) { return apiPost(DREAMS.OBSTACLES.RESOLVE(obstacleId)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["obstacles", id] }); showToast("Obstacle resolved!", "success"); },
    onError: function (err) { showToast(err.message || "Failed to resolve obstacle", "error"); },
  });
  var deleteObstacleMut = useMutation({
    mutationFn: function (obstacleId) { return apiDelete(DREAMS.OBSTACLES.DETAIL(obstacleId)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["obstacles", id] }); showToast("Obstacle removed", "success"); },
    onError: function (err) { showToast(err.message || "Failed to delete obstacle", "error"); },
  });

  // ── Tags mutations ──
  var addTagMut = useMutation({
    mutationFn: function (tagName) { return apiPost(DREAMS.TAGS(id), { tag_name: tagName }); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["dream", id] }); showToast("Tag added", "success"); },
    onError: function (err) { showToast(err.message || "Failed to add tag", "error"); },
  });
  var removeTagMut = useMutation({
    mutationFn: function (tagName) { return apiDelete(DREAMS.TAG_DELETE(id, tagName)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["dream", id] }); showToast("Tag removed", "success"); },
    onError: function (err) { showToast(err.message || "Failed to remove tag", "error"); },
  });

  // ── Collaborators query & mutations ──
  var collabsQuery = useQuery({ queryKey: ["collaborators", id], queryFn: function () { return apiGet(DREAMS.COLLABORATORS_LIST(id)); } });
  var collaborators = (collabsQuery.data && collabsQuery.data.collaborators) || collabsQuery.data || [];

  var inviteCollabMut = useMutation({
    mutationFn: function (userId) { return apiPost(DREAMS.COLLABORATORS(id), { user_id: userId }); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["collaborators", id] }); showToast("Collaborator invited!", "success"); },
    onError: function (err) { showToast(err.message || "Failed to invite collaborator", "error"); },
  });
  var removeCollabMut = useMutation({
    mutationFn: function (userId) { return apiDelete(DREAMS.COLLABORATOR_DELETE(id, userId)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["collaborators", id] }); showToast("Collaborator removed", "success"); },
    onError: function (err) { showToast(err.message || "Failed to remove collaborator", "error"); },
  });

  // ── Progress history query ──
  var progressQuery = useQuery({
    queryKey: ["progress-history", id],
    queryFn: function () { return apiGet(DREAMS.PROGRESS_HISTORY(id)); },
  });
  var progressHistory = (progressQuery.data && (progressQuery.data.snapshots || progressQuery.data.results)) || progressQuery.data || [];

  const[mounted,setMounted]=useState(false);
  const[goals,setGoals]=useState([]);
  const[expanded,setExpanded]=useState({});
  const[goalsInitialized,setGoalsInitialized]=useState(false);
  const[menu,setMenu]=useState(false);
  const[showDeleteConfirm,setShowDeleteConfirm]=useState(false);
  const[addGoal,setAddGoal]=useState(false);
  const[addTask,setAddTask]=useState(null);
  const[newTitle,setNewTitle]=useState("");
  const[newDesc,setNewDesc]=useState("");
  const[celebration,setCelebration]=useState(null); // null or { milestone: 25|50|75|100, xp }
  const[achievementShare,setAchievementShare]=useState(null); // null or { type, title, goalId, milestoneId }
  const [shareModal, setShareModal] = useState(false);
  const [shareImage, setShareImage] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [privacyConfirm, setPrivacyConfirm] = useState(null); // null or "public" | "private"

  // ── Obstacles state ──
  var [showAddObstacle, setShowAddObstacle] = useState(false);
  var [obstacleTitle, setObstacleTitle] = useState("");
  var [obstacleDesc, setObstacleDesc] = useState("");

  // ── Tags state ──
  var [showTagInput, setShowTagInput] = useState(false);
  var [newTag, setNewTag] = useState("");

  // ── "See More" state ──
  var [showAllMilestones, setShowAllMilestones] = useState(false);
  var [showAllGoals, setShowAllGoals] = useState(false);
  var [showAllObstacles, setShowAllObstacles] = useState(false);
  var [showAllCollabs, setShowAllCollabs] = useState(false);
  var [showAllProgress, setShowAllProgress] = useState(false);
  var [expandedDescs, setExpandedDescs] = useState({});
  var toggleDesc = function (key) { setExpandedDescs(function (p) { var n = {}; n[key] = !p[key]; return Object.assign({}, p, n); }); };

  // ── Sharing / Collaborators state ──
  var [showShareModal, setShowShareModal] = useState(false);
  var [collabSearch, setCollabSearch] = useState("");

  var friendsQuery = useQuery({
    queryKey: ["friends-list"],
    queryFn: function () { return apiGet(SOCIAL.FRIENDS.LIST); },
    enabled: showShareModal,
    staleTime: 30000,
  });
  var allFriends = friendsQuery.data || [];
  var filteredFriends = collabSearch.trim().length > 0
    ? allFriends.filter(function (f) { return (f.username || "").toLowerCase().includes(collabSearch.trim().toLowerCase()); })
    : allFriends;

  useEffect(function () {
    if (!showShareModal) setCollabSearch("");
  }, [showShareModal]);

  useEffect(function () {
    if (dreamQuery.data && !goalsInitialized) {
      // Prefer milestone-nested goals (properly ordered by milestone) over flat top-level goals
      var allGoals = [];
      var milestones = dreamQuery.data.milestones || [];
      if (milestones.length > 0) {
        // Extract goals from milestones in order — preserves milestone→goal hierarchy
        milestones
          .slice()
          .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
          .forEach(function (ms) {
            (ms.goals || [])
              .slice()
              .sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
              .forEach(function (g) { allGoals.push(g); });
          });
      }
      // Fall back to top-level goals if no milestones
      if (allGoals.length === 0) {
        allGoals = dreamQuery.data.goals || [];
      }
      var initGoals = allGoals.map(function (g, i) { return { ...g, order: g.order !== undefined ? g.order : i, completed: g.completed || false, tasks: (g.tasks || []).map(function (t) { return { ...t, completed: t.completed || false }; }) }; });
      setGoals(initGoals);
      var first = initGoals.find(function (g) { return !g.completed; });
      setExpanded(first ? { [first.id]: true } : {});
      setIsPublic(dreamQuery.data.is_public || false);
      setGoalsInitialized(true);
    }
  }, [dreamQuery.data, goalsInitialized]);
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
    // Persist task toggle to API
    apiPost(DREAMS.TASKS.COMPLETE(tId)).catch(function () { queryClient.invalidateQueries({ queryKey: ["dream", id] }); });
  };
  const handleAddGoal=()=>{if(!newTitle.trim())return;var tempId="g"+Date.now();setGoals(p=>[...p,{id:tempId,title:newTitle.trim(),order:p.length,completed:false,tasks:[]}]);apiPost(DREAMS.GOALS.LIST,{dream:id,title:newTitle.trim(),description:newDesc.trim()}).then(function(){queryClient.invalidateQueries({queryKey:["dream",id]});}).catch(function(err){showToast(err.message||"Failed to add goal","error");queryClient.invalidateQueries({queryKey:["dream",id]});});setNewTitle("");setNewDesc("");setAddGoal(false);};
  const handleAddTask=(gId)=>{if(!newTitle.trim())return;var tempId="t"+Date.now();setGoals(p=>p.map(g=>g.id===gId?{...g,tasks:[...g.tasks,{id:tempId,title:newTitle.trim(),completed:false,xp:20}]}:g));apiPost(DREAMS.TASKS.LIST,{goal:gId,title:newTitle.trim(),description:newDesc.trim()}).then(function(){queryClient.invalidateQueries({queryKey:["dream",id]});}).catch(function(err){showToast(err.message||"Failed to add task","error");queryClient.invalidateQueries({queryKey:["dream",id]});});setNewTitle("");setNewDesc("");setAddTask(null);};

  const handleShare = async () => {
    setShareModal(true);
    setShareLoading(true);
    try {
      const blob = await exportDreamCard({
        title: DREAM.title,
        category: DREAM.category,
        progress: DREAM.progressPercentage || progress,
        goalCount: DREAM.goals?.length || DREAM.goalsCount || 0,
        completedGoals: DREAM.completedGoalCount || doneTasks,
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
    <GlassModal open={true} onClose={onClose} variant="center" title={title} maxWidth={380}>
      <div style={{padding:24}}>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-secondary)",marginBottom:6,display:"block"}}>Title</label>
          <GlassInput value={newTitle} onChange={e=>setNewTitle(e.target.value)} autoFocus placeholder="Enter title..." />
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-secondary)",marginBottom:6,display:"block"}}>Description (optional)</label>
          <GlassInput value={newDesc} onChange={e=>setNewDesc(e.target.value)} multiline placeholder="Add details..." />
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-pill-bg)",color:"var(--dp-text-secondary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <GradientButton gradient="primaryDark" onClick={onSubmit} disabled={!newTitle.trim()} style={{flex:1}}>{submitLabel}</GradientButton>
        </div>
      </div>
    </GlassModal>
  );

  if (dreamQuery.isLoading) return (
      <div style={{ width: "100%", padding: "60px 16px 0" }}>
        <SkeletonCard height={200} style={{ marginBottom: 16 }} />
        <StatsSkeleton />
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonCard height={60} />
          <SkeletonCard height={60} />
        </div>
      </div>
  );

  if (dreamQuery.isError) return (
    <div style={{ width: "100%", padding: "60px 16px 0" }}>
      <ErrorState message={dreamQuery.error?.message} onRetry={function () { dreamQuery.refetch(); }} />
    </div>
  );

  return(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",position:"relative"}}>

      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={()=>navigate(-1)} label="Go back" />}
        title={<h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{DREAM.title}</h1>}
        right={
          <div style={{display:"flex",gap:6}}>
            <IconButton icon={Share2} onClick={handleShare} label="Share" />
            {isOwner && <IconButton icon={MessageCircle} onClick={()=>navigate("/chat/dream-"+DREAM.id)} label="Chat" />}
            {isOwner && <div style={{position:"relative"}}>
              <IconButton icon={MoreVertical} onClick={()=>setMenu(!menu)} label="More options" />
              {menu&&<div style={{position:"absolute",top:44,right:0,width:180,background:"var(--dp-modal-bg)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:14,border:"1px solid var(--dp-input-border)",boxShadow:"0 12px 40px rgba(0,0,0,0.4)",padding:6,zIndex:200,animation:"dpFS 0.15s ease-out"}}>
                {[{icon:Edit3,label:t("dreams.edit"),action:()=>{setMenu(false);navigate(`/dream/${DREAM.id}/edit`);}},{icon:Sparkles,label:t("dreams.generatePlan"),action:()=>{setMenu(false);navigate(`/dream/${DREAM.id}/calibration`);}},{icon:Share2,label:t("dreams.shareDream"),action:()=>{setMenu(false);handleShare();}},{icon:Sparkles,label:t("dreams.generateVision"),action:function(){setMenu(false);apiPost(DREAMS.GENERATE_VISION(id)).then(function(data){showToast("Vision image generated!","success");queryClient.invalidateQueries({queryKey:["dream",id]});}).catch(function(err){showToast(err.message||"Failed to generate vision","error");});}},{icon:FileText,label:t("dreams.exportPdf"),action:()=>{setMenu(false);apiGet(DREAMS.EXPORT_PDF(id),{responseType:"blob"}).then(function(blob){saveBlobFile(blob,"dream-"+id+".pdf");}).catch(function(){showToast("PDF export failed","error");});}},{icon:Rocket,label:t("dreams.microStart")||"Micro Start",action:()=>{setMenu(false);navigate(`/micro-start/${DREAM.id}`);}},{icon:Copy,label:t("dreams.duplicate"),action:()=>{setMenu(false);duplicateDreamMut.mutate();}},{icon:Trash2,label:t("common.delete"),danger:true,action:()=>{setMenu(false);setShowDeleteConfirm(true);}}].map(({icon:I,label,danger,action},i)=>(
                  <button key={i} onClick={action||(()=>setMenu(false))} className="dp-gh" style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"none",background:"transparent",display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:500,color:danger?"rgba(239,68,68,0.8)":("var(--dp-text-primary)"),transition:"background 0.15s"}}>
                    <I size={15} strokeWidth={2}/>{label}
                  </button>
                ))}
              </div>}
            </div>}
          </div>
        }
      />

      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"16px 16px 100px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{width:"100%"}}>

          {/* ── Public dream banner for non-owners ── */}
          {!isOwner && DREAM.owner_name && (
            <div style={{
              padding: "10px 16px", borderRadius: 14, marginBottom: 12,
              background: "var(--dp-accent-soft)", border: "1px solid var(--dp-accent-border)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Globe size={14} color="var(--dp-accent)" />
              <span style={{ fontSize: 13, color: "var(--dp-text-secondary)" }}>
                Public dream by <strong style={{ color: "var(--dp-text)" }}>{DREAM.owner_name}</strong>
              </span>
            </div>
          )}

          {/* ── Hero Card ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <GlassCard padding={20} mb={16}>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                <div style={{position:"relative",width:86,height:86,flexShrink:0}}>
                  <svg width={86} height={86} style={{transform:"rotate(-90deg)"}}>
                    <circle cx={43} cy={43} r={ringR} fill="none" stroke={"var(--dp-divider)"} strokeWidth={5}/>
                    <circle cx={43} cy={43} r={ringR} fill="none" stroke="url(#progGrad)" strokeWidth={5} strokeLinecap="round"
                      strokeDasharray={ringC} strokeDashoffset={mounted?ringOff:ringC}
                      style={{transition:"stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)",filter:"drop-shadow(0 0 6px rgba(93,229,168,0.4))"}}/>
                    <defs><linearGradient id="progGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#5DE5A8"/><stop offset="100%" stopColor="#14B8A6"/></linearGradient></defs>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:22,fontWeight:700,color:"var(--dp-text)"}}>{progress}%</span>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <span style={{padding:"3px 9px",borderRadius:8,background:`${STATUS_COLORS[DREAM.status]}15`,fontSize:12,fontWeight:700,color:adaptColor(STATUS_COLORS[DREAM.status],isLight),textTransform:"uppercase"}}>{DREAM.status}</span>
                  <TruncText text={DREAM.description} maxLen={120} isLight={isLight} style={{fontSize:13,color:"var(--dp-text-secondary)",marginTop:8}} t={t} />
                  <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,flexWrap:"wrap"}}>
                    <span style={{padding:"3px 9px",borderRadius:8,background:"rgba(196,181,253,0.1)",fontSize:12,fontWeight:500,color:"var(--dp-accent)"}}>{DREAM.category}</span>
                    {DREAM.expectedDate && <span style={{display:"flex",alignItems:"center",gap:3,fontSize:12,color:"var(--dp-accent)",fontWeight:500}}><Clock size={11} strokeWidth={2}/>Expected: {new Date(DREAM.expectedDate).toLocaleDateString()}</span>}
                    {DREAM.deadlineDate && <span style={{display:"flex",alignItems:"center",gap:3,fontSize:12,color:"var(--dp-danger)",fontWeight:500}}><Clock size={11} strokeWidth={2}/>Deadline: {new Date(DREAM.deadlineDate).toLocaleDateString()}</span>}
                    {!DREAM.expectedDate && !DREAM.deadlineDate && DREAM.targetDate && <span style={{display:"flex",alignItems:"center",gap:3,fontSize:12,color:"var(--dp-text-tertiary)"}}><Clock size={11} strokeWidth={2}/>{DREAM.daysLeft != null ? DREAM.daysLeft + " days left" : new Date(DREAM.targetDate).toLocaleDateString()}</span>}
                    {isOwner && <button aria-label={isPublic?"Make dream private":"Make dream public"} onClick={function(){setPrivacyConfirm(isPublic?"private":"public");}} style={{
                      display:"flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:"inherit",
                      background:isPublic?"var(--dp-success-soft)":"var(--dp-surface)",
                      transition:"all 0.25s ease",
                    }}>
                      {isPublic?<Globe size={11} strokeWidth={2.5} color={"var(--dp-success)"}/>:<Lock size={11} strokeWidth={2.5} color={"var(--dp-text-muted)"}/>}
                      <span style={{fontSize:12,fontWeight:600,color:isPublic?("var(--dp-success)"):("var(--dp-text-muted)")}}>{isPublic?"Public":"Private"}</span>
                    </button>}
                  </div>
                </div>
              </div>

              {/* ── Tags ── */}
              <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6,marginTop:14,paddingTop:14,borderTop:"1px solid var(--dp-header-border)"}}>
                <Tag size={12} color={"var(--dp-accent)"} strokeWidth={2.5} style={{marginRight:2}}/>
                {(DREAM.tags || []).map(function (t, ti) {
                  return (
                    <span key={ti} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,background:"var(--dp-divider)",fontSize:11,fontWeight:600,color:"var(--dp-accent)"}}>
                      {t.name}
                      {isOwner && <button aria-label={"Remove tag " + t.name} onClick={function () { removeTagMut.mutate(t.name); }} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",fontFamily:"inherit"}}>
                        <X size={10} strokeWidth={2.5} color={"var(--dp-accent)"}/>
                      </button>}
                    </span>
                  );
                })}
                {isOwner && showTagInput ? (
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                    <GlassInput value={newTag} onChange={function (e) { setNewTag(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter" && newTag.trim()) { addTagMut.mutate(newTag.trim()); setNewTag(""); setShowTagInput(false); } if (e.key === "Escape") { setNewTag(""); setShowTagInput(false); } }} autoFocus placeholder="Tag name..." style={{width:90}} inputStyle={{padding:"3px 8px",fontSize:11}} />
                    <button aria-label="Confirm add tag" onClick={function () { if (newTag.trim()) { addTagMut.mutate(newTag.trim()); setNewTag(""); setShowTagInput(false); } }} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",fontFamily:"inherit"}}>
                      <Check size={12} strokeWidth={2.5} color={"var(--dp-success)"}/>
                    </button>
                    <button aria-label="Cancel add tag" onClick={function () { setNewTag(""); setShowTagInput(false); }} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",fontFamily:"inherit"}}>
                      <X size={12} strokeWidth={2.5} color={"var(--dp-text-muted)"}/>
                    </button>
                  </span>
                ) : isOwner ? (
                  <button aria-label="Add tag" onClick={function () { setShowTagInput(true); }} style={{width:22,height:22,borderRadius:"50%",border:"1px dashed rgba(139,92,246,0.25)",background:"rgba(139,92,246,0.04)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontFamily:"inherit"}}>
                    <Plus size={11} strokeWidth={2.5} color={"var(--dp-accent)"}/>
                  </button>
                ) : null}
              </div>
          </GlassCard>
          </div>

          {/* ── Quick Stats ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms"}}>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[
                {Icon:Target,val:totalTasks,label:t("dreams.tasks"),color:"var(--dp-accent)"},
                {Icon:CheckCircle,val:doneTasks,label:t("dreams.done"),color:"var(--dp-success)"},
                {Icon:Zap,val:0,label:t("profile.xp"),color:"var(--dp-warning)"},
              ].map(({Icon:I,val,label,color},i)=>(
                <GlassCard key={i} padding="12px 8px" style={{flex:1,textAlign:"center"}}>
                  <I size={16} color={color} strokeWidth={2} style={{marginBottom:4}}/>
                  <div style={{fontSize:18,fontWeight:700,color:"var(--dp-text)"}}>{val}</div>
                  <div style={{fontSize:12,color:"var(--dp-text-secondary)"}}>{label}</div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* ── Milestones Timeline ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"160ms"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Flag size={14} color={"var(--dp-warning)"} strokeWidth={2.5}/>
                <h2 style={{fontSize:14,fontWeight:700,color:"var(--dp-text)",margin:0}}>{t("dreams.milestones")} ({MILESTONES.length})</h2>
              </div>
              {DREAM.milestonesCount > 0 && <span style={{fontSize:12,color:"var(--dp-text-tertiary)"}}>{DREAM.completedMilestonesCount || 0}/{DREAM.milestonesCount} done</span>}
            </div>
            <GlassCard padding={16} mb={16}>
              {MILESTONES.length === 0 ? (
                <div style={{textAlign:"center",padding:"16px 0"}}>
                  <span style={{fontSize:13,color:"var(--dp-text-muted)",display:"block",marginBottom:12}}>No milestones yet</span>
                  <GradientButton gradient="primaryDark" onClick={function () { navigate("/dream/" + id + "/calibration"); }} icon={Sparkles}>
                    {DREAM.calibrationStatus === "completed" ? t("dreams.generatePlan") : t("dreams.startCalibration")}
                  </GradientButton>
                </div>
              ) : (function () {
                var MILESTONE_LIMIT = 3;
                var visibleMs = showAllMilestones ? MILESTONES : MILESTONES.slice(0, MILESTONE_LIMIT);
                return visibleMs.map(function (m, i) {
                return (
                <div key={m.id || i} style={{display:"flex",gap:12,position:"relative"}}>
                  {i<visibleMs.length-1&&<div style={{position:"absolute",left:11,top:24,bottom:-4,width:2,background:m.done?"rgba(93,229,168,0.2)":("var(--dp-divider)")}}/>}
                  <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:!m.done&&m.active?"pointer":"default",background:m.done?"rgba(93,229,168,0.15)":m.active?"rgba(252,211,77,0.12)":("var(--dp-pill-bg)"),border:m.done?"2px solid rgba(93,229,168,0.3)":m.active?"2px solid rgba(252,211,77,0.3)":("2px solid var(--dp-input-border)")}} onClick={function () { if (!m.done && m.active && m.id) milestoneCompleteMut.mutate(m.id); }}>
                    {m.done?<Check size={12} color={"var(--dp-success)"} strokeWidth={3}/>:m.active?<div style={{width:6,height:6,borderRadius:3,background:"#FCD34D"}}/>:null}
                  </div>
                  <div style={{flex:1,paddingBottom:i<visibleMs.length-1?16:0}}>
                    <div style={{fontSize:13,fontWeight:m.active?600:m.done?500:400,color:m.done?("var(--dp-success)"):m.active?("var(--dp-warning)"):("var(--dp-text-tertiary)"),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</div>
                    {m.description && <TruncText text={m.description} maxLen={80} isLight={isLight} style={{marginTop:2,color:"var(--dp-text-muted)"}} t={t} />}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3,flexWrap:"wrap"}}>
                      {m.expectedDate && <span style={{fontSize:11,color:"var(--dp-accent)",fontWeight:500}}>Expected: {new Date(m.expectedDate).toLocaleDateString()}</span>}
                      {m.deadlineDate && <span style={{fontSize:11,color:"var(--dp-danger)",fontWeight:500}}>Deadline: {new Date(m.deadlineDate).toLocaleDateString()}</span>}
                      {!m.expectedDate && !m.deadlineDate && m.date && <div style={{fontSize:12,color:"var(--dp-text-muted)"}}>{m.date}</div>}
                    </div>
                    {m.progressPercentage > 0 && (
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                        <div style={{flex:1,maxWidth:100,height:3,borderRadius:2,background:"var(--dp-divider)"}}>
                          <div style={{height:"100%",borderRadius:2,background:m.done?"var(--dp-success)":"var(--dp-accent)",width:m.progressPercentage+"%",transition:"width 0.5s ease"}}/>
                        </div>
                        <span style={{fontSize:11,color:"var(--dp-text-muted)"}}>{m.progressPercentage}%</span>
                      </div>
                    )}
                  </div>
                </div>
                );
              }); })()}
              <SeeMoreBtn expanded={showAllMilestones} shown={showAllMilestones ? MILESTONES.length : Math.min(3, MILESTONES.length)} total={MILESTONES.length} onToggle={function () { setShowAllMilestones(!showAllMilestones); }} isLight={isLight} t={t} />
            </GlassCard>
          </div>

          {/* ── Goals ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"240ms"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Star size={14} color={"var(--dp-accent)"} strokeWidth={2.5}/>
                <h2 style={{fontSize:14,fontWeight:700,color:"var(--dp-text)",margin:0}}>{t("dreams.goals")} ({goals.length})</h2>
              </div>
              {isOwner && <button onClick={()=>{setNewTitle("");setNewDesc("");setAddGoal(true);}} style={{padding:"5px 12px",borderRadius:10,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.08)",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                <Plus size={13} strokeWidth={2.5}/>Add Goal
              </button>}
            </div>
          </div>

          {(function () {
            var GOAL_LIMIT = 4;
            var visibleGoals = showAllGoals ? goals : goals.slice(0, GOAL_LIMIT);
            return visibleGoals.map(function (g, gi) {
            var isExp=expanded[g.id];
            var gDone=g.tasks.filter(function(t){return t.completed;}).length;
            var gTotal=g.tasks.length;
            var gProg=gTotal?gDone/gTotal:0;
            var allDone=gDone===gTotal&&gTotal>0;
            var TASK_LIMIT = 5;
            var showAllTasks = expanded["tasks_" + g.id];
            var visibleTasks = showAllTasks ? g.tasks : g.tasks.slice(0, TASK_LIMIT);
            return(
              <div key={g.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:(320+gi*60)+"ms"}}>
                <GlassCard mb={8} style={{overflow:"hidden"}}>
                  {/* Goal header */}
                  <div onClick={function(){toggleExpand(g.id);}} style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                    <div style={{width:30,height:30,borderRadius:10,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:allDone?"rgba(93,229,168,0.15)":"rgba(139,92,246,0.1)",border:allDone?"1px solid rgba(93,229,168,0.25)":"1px solid rgba(139,92,246,0.15)"}}>
                      {allDone?<Check size={14} color={"var(--dp-success)"} strokeWidth={2.5}/>:<span style={{fontSize:12,fontWeight:700,color:"var(--dp-accent)"}}>{gi+1}</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:allDone?("var(--dp-success)"):("var(--dp-text)"),textDecoration:allDone?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.title}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
                        <span style={{fontSize:12,color:"var(--dp-text-tertiary)"}}>{gDone}/{gTotal} tasks</span>
                        <div style={{flex:1,maxWidth:80,height:3,borderRadius:2,background:"var(--dp-divider)"}}>
                          <div style={{height:"100%",borderRadius:2,background:allDone?"var(--dp-success)":"var(--dp-accent)",width:(gProg*100)+"%",transition:"width 0.5s ease"}}/>
                        </div>
                      </div>
                    </div>
                    {isExp?<ChevronUp size={18} color={"var(--dp-text-muted)"} strokeWidth={2}/>:<ChevronDown size={18} color={"var(--dp-text-muted)"} strokeWidth={2}/>}
                  </div>

                  {/* Tasks — only visible to owner */}
                  {isOwner ? (
                  <div style={{maxHeight:isExp?5000:0,opacity:isExp?1:0,transition:"all 0.35s cubic-bezier(0.16,1,0.3,1)",overflow:"hidden"}}>
                    <div style={{padding:"0 14px 12px",borderTop:"1px solid var(--dp-header-border)"}}>
                      {visibleTasks.map(function(t,ti){return(
                        <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:ti<visibleTasks.length-1?("1px solid var(--dp-header-border)"):"none"}}>
                          <button aria-label={t.completed ? "Mark task incomplete" : "Mark task complete"} onClick={function(){toggleTask(g.id,t.id);}} style={{width:22,height:22,borderRadius:7,border:t.completed?"none":("2px solid var(--dp-input-border)"),background:t.completed?"rgba(93,229,168,0.2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",flexShrink:0}}>
                            {t.completed&&<Check size={12} color={"var(--dp-success)"} strokeWidth={3}/>}
                          </button>
                          <span style={{flex:1,fontSize:13,color:t.completed?("var(--dp-text-muted)"):("var(--dp-text-primary)"),textDecoration:t.completed?"line-through":"none",transition:"all 0.2s",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{t.title}</span>
                          <span style={{fontSize:12,color:t.completed?"rgba(93,229,168,0.5)":"rgba(252,211,77,0.6)",fontWeight:600}}>+{t.xp}</span>
                        </div>
                      );})}
                      {g.tasks.length > TASK_LIMIT && (
                        <button onClick={function(e){e.stopPropagation();setExpanded(function(p){var n={};n["tasks_"+g.id]=!p["tasks_"+g.id];return Object.assign({},p,n);});}} style={{width:"100%",padding:"8px",marginTop:4,borderRadius:10,border:"none",background:"transparent",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                          {showAllTasks ? t("dreams.showFewerTasks") : t("dreams.seeAllTasks") + " (" + g.tasks.length + ")"}
                        </button>
                      )}
                      <button onClick={function(){setNewTitle("");setNewDesc("");setAddTask(g.id);}} style={{width:"100%",marginTop:4,padding:"8px",borderRadius:10,border:"1px dashed rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.04)",color:"var(--dp-accent)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                        <Plus size={13} strokeWidth={2}/>Add Task
                      </button>
                    </div>
                  </div>
                  ) : null}
                </GlassCard>
              </div>
            );
          }); })()}
          {goals.length > 4 && (
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"380ms"}}>
              <SeeMoreBtn expanded={showAllGoals} shown={showAllGoals ? goals.length : Math.min(4, goals.length)} total={goals.length} onToggle={function () { setShowAllGoals(!showAllGoals); }} isLight={isLight} t={t} />
            </div>
          )}

          {/* ── Obstacles ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"400ms",marginTop:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <AlertTriangle size={14} color={"var(--dp-warning)"} strokeWidth={2.5}/>
                <h2 style={{fontSize:14,fontWeight:700,color:"var(--dp-text)",margin:0}}>{t("dreams.obstacles")} ({obstacles.length})</h2>
              </div>
              {isOwner && <button onClick={function () { setObstacleTitle(""); setObstacleDesc(""); setShowAddObstacle(true); }} style={{padding:"5px 12px",borderRadius:10,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.08)",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                <Plus size={13} strokeWidth={2.5}/>Add
              </button>}
            </div>
          </div>

          {(function () {
            var OBS_LIMIT = 3;
            var visibleObs = showAllObstacles ? obstacles : obstacles.slice(0, OBS_LIMIT);
            return visibleObs.map(function (ob, oi) {
            var isResolved = ob.resolved || ob.status === "resolved";
            return (
              <div key={ob.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:(420 + oi * 60) + "ms"}}>
                <GlassCard mb={8} padding="12px 14px">
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                    <div style={{width:30,height:30,borderRadius:10,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:isResolved?"rgba(93,229,168,0.15)":"rgba(252,211,77,0.1)",border:isResolved?"1px solid rgba(93,229,168,0.25)":"1px solid rgba(252,211,77,0.2)"}}>
                      {isResolved ? <Check size={14} color={"var(--dp-success)"} strokeWidth={2.5}/> : <AlertTriangle size={14} color={"var(--dp-warning)"} strokeWidth={2}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:14,fontWeight:600,color:isResolved?("var(--dp-text-muted)"):("var(--dp-text)"),textDecoration:isResolved?"line-through":"none",wordBreak:"break-word"}}>{ob.title}</span>
                        <span style={{padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700,textTransform:"uppercase",background:isResolved?"rgba(93,229,168,0.12)":"rgba(252,211,77,0.12)",color:isResolved?("var(--dp-success)"):("var(--dp-warning)"),flexShrink:0}}>{isResolved?"Resolved":"Active"}</span>
                      </div>
                      {ob.description && <TruncText text={ob.description} maxLen={100} isLight={isLight} style={{marginTop:4}} t={t} />}
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      {!isResolved && (
                        <button aria-label="Resolve obstacle" onClick={function () { resolveObstacleMut.mutate(ob.id); }} title="Resolve" style={{width:28,height:28,borderRadius:8,border:"1px solid rgba(93,229,168,0.2)",background:"rgba(93,229,168,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontFamily:"inherit"}}>
                          <CheckCircle size={13} color={"var(--dp-success)"} strokeWidth={2}/>
                        </button>
                      )}
                      {isOwner && <button aria-label="Delete obstacle" onClick={function () { deleteObstacleMut.mutate(ob.id); }} title="Delete" style={{width:28,height:28,borderRadius:8,border:"1px solid rgba(239,68,68,0.15)",background:"rgba(239,68,68,0.04)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontFamily:"inherit"}}>
                        <Trash2 size={13} color="rgba(239,68,68,0.7)" strokeWidth={2}/>
                      </button>}
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          }); })()}
          {obstacles.length > 3 && (
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"480ms"}}>
              <SeeMoreBtn expanded={showAllObstacles} shown={showAllObstacles ? obstacles.length : Math.min(3, obstacles.length)} total={obstacles.length} onToggle={function () { setShowAllObstacles(!showAllObstacles); }} isLight={isLight} t={t} />
            </div>
          )}

          {/* ── Collaborators ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"480ms",marginTop:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <UserPlus size={14} color={"var(--dp-accent)"} strokeWidth={2.5}/>
                <h2 style={{fontSize:14,fontWeight:700,color:"var(--dp-text)",margin:0}}>{t("dreams.collaborators")} ({collaborators.length})</h2>
              </div>
              {isOwner && <button onClick={function () { setCollabSearch(""); setShowShareModal(true); }} style={{padding:"5px 12px",borderRadius:10,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.08)",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                <Plus size={13} strokeWidth={2.5}/>Invite
              </button>}
            </div>
            <GlassCard padding={collaborators.length > 0 ? 14 : 16} mb={16}>
              {collaborators.length === 0 ? (
                <div style={{textAlign:"center",padding:"8px 0"}}>
                  <span style={{fontSize:13,color:"var(--dp-text-muted)"}}>No collaborators yet</span>
                </div>
              ) : (function () {
                var COLLAB_LIMIT = 5;
                var visibleCollabs = showAllCollabs ? collaborators : collaborators.slice(0, COLLAB_LIMIT);
                return visibleCollabs.map(function (c, ci) {
                return (
                  <div key={c.id || ci} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:ci < visibleCollabs.length - 1 ? ("1px solid var(--dp-header-border)") : "none"}}>
                    <Avatar name={c.username || c.email || "U"} size={30} shape="circle" color={GRADIENTS.primaryDark} />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--dp-text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.username || c.email || "User " + (c.id || ci + 1)}</div>
                      {c.role && <div style={{fontSize:11,color:"var(--dp-text-muted)"}}>{c.role}</div>}
                    </div>
                    {isOwner && <button aria-label="Remove collaborator" onClick={function () { removeCollabMut.mutate(c.id || c.userId); }} title="Remove" style={{width:28,height:28,borderRadius:8,border:"1px solid rgba(239,68,68,0.15)",background:"rgba(239,68,68,0.04)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontFamily:"inherit"}}>
                      <X size={13} color="rgba(239,68,68,0.7)" strokeWidth={2}/>
                    </button>}
                  </div>
                );
              }); })()}
              <SeeMoreBtn expanded={showAllCollabs} shown={showAllCollabs ? collaborators.length : Math.min(5, collaborators.length)} total={collaborators.length} onToggle={function () { setShowAllCollabs(!showAllCollabs); }} isLight={isLight} t={t} />
            </GlassCard>
          </div>

          {/* ── Progress History Chart ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"560ms",marginTop:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <TrendingUp size={14} color={"var(--dp-accent)"} strokeWidth={2.5}/>
                <h2 style={{fontSize:14,fontWeight:700,color:"var(--dp-text)",margin:0}}>{t("dreams.progressHistory")}</h2>
              </div>
              {progressHistory.length > 0 && (
                <span style={{fontSize:12,fontWeight:600,color:"var(--dp-accent)"}}>{Math.round(DREAM.progress_percentage || DREAM.progressPercentage || 0)}%</span>
              )}
            </div>
            <GlassCard padding={16} mb={16}>
              {progressHistory.length === 0 ? (
                <div style={{textAlign:"center",padding:"8px 0"}}>
                  <span style={{fontSize:13,color:"var(--dp-text-muted)"}}>No progress entries yet</span>
                </div>
              ) : (function () {
                var data = progressHistory.map(function (e) {
                  return { pct: e.progressPercentage != null ? Number(e.progressPercentage) : e.progress != null ? Number(e.progress) : 0, date: e.createdAt || e.date || "" };
                }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
                if (data.length < 2) data = [{ pct: 0, date: "" }].concat(data);
                var W = 280, H = 100, padX = 30, padY = 10;
                var cW = W - padX * 2, cH = H - padY * 2;
                var maxP = Math.max(100, Math.max.apply(null, data.map(function (d) { return d.pct; })));
                var pts = data.map(function (d, i) {
                  var x = padX + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2);
                  var y = padY + cH - (d.pct / maxP) * cH;
                  return { x: x, y: y, pct: d.pct, date: d.date };
                });
                var line = pts.map(function (p) { return p.x + "," + p.y; }).join(" ");
                var area = padX + "," + (padY + cH) + " " + line + " " + pts[pts.length - 1].x + "," + (padY + cH);
                var gridLines = [0, 25, 50, 75, 100];
                return (
                  <div>
                    <svg viewBox={"0 0 " + W + " " + H} width="100%" height={120} style={{display:"block"}}>
                      <defs>
                        <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--dp-accent)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--dp-accent)" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {gridLines.map(function (v) {
                        var y = padY + cH - (v / maxP) * cH;
                        return (
                          <g key={v}>
                            <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="var(--dp-divider)" strokeWidth="0.5" strokeDasharray="3,3" />
                            <text x={padX - 4} y={y + 3} textAnchor="end" fontSize="8" fill="var(--dp-text-muted)" fontFamily="inherit">{v}%</text>
                          </g>
                        );
                      })}
                      <polygon points={area} fill="url(#progGrad)" />
                      <polyline points={line} fill="none" stroke="var(--dp-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map(function (p, i) {
                        return <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--dp-accent)" stroke="var(--dp-card-bg)" strokeWidth="1.5" />;
                      })}
                    </svg>
                    {data.length >= 2 && (
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:4,paddingLeft:padX,paddingRight:padX}}>
                        <span style={{fontSize:10,color:"var(--dp-text-muted)"}}>{data[0].date ? new Date(data[0].date).toLocaleDateString(undefined, {month:"short",day:"numeric"}) : ""}</span>
                        <span style={{fontSize:10,color:"var(--dp-text-muted)"}}>{data[data.length-1].date ? new Date(data[data.length-1].date).toLocaleDateString(undefined, {month:"short",day:"numeric"}) : ""}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </GlassCard>
          </div>

          {/* ── Export PDF ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"640ms",marginTop:8,marginBottom:16}}>
            <button onClick={function () { apiGet(DREAMS.EXPORT_PDF(id), { responseType: "blob" }).then(function (blob) { saveBlobFile(blob, "dream-" + id + ".pdf"); }).catch(function () { showToast("PDF export failed", "error"); }); }} style={{width:"100%",padding:"12px 0",borderRadius:14,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.06)",color:"var(--dp-accent)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.25s ease"}}>
              <Download size={15} strokeWidth={2}/>Export as PDF
            </button>
          </div>

        </div>
      </main>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {addGoal&&<Modal title="Add Goal" onClose={()=>setAddGoal(false)} onSubmit={handleAddGoal} submitLabel="Add Goal"/>}
      {addTask&&<Modal title="Add Task" onClose={()=>setAddTask(null)} onSubmit={()=>handleAddTask(addTask)} submitLabel="Add Task"/>}

      {/* ── Add Obstacle Modal ── */}
      <GlassModal open={showAddObstacle} onClose={function () { setShowAddObstacle(false); }} variant="center" title="Add Obstacle" maxWidth={380}>
        <div style={{padding:24}}>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-secondary)",marginBottom:6,display:"block"}}>Title</label>
            <GlassInput value={obstacleTitle} onChange={function (e) { setObstacleTitle(e.target.value); }} autoFocus placeholder="Obstacle title..." />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-secondary)",marginBottom:6,display:"block"}}>Description (optional)</label>
            <GlassInput value={obstacleDesc} onChange={function (e) { setObstacleDesc(e.target.value); }} multiline placeholder="Describe the obstacle..." />
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={function () { setShowAddObstacle(false); }} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-pill-bg)",color:"var(--dp-text-secondary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <GradientButton gradient="primaryDark" onClick={function () { if (!obstacleTitle.trim()) return; addObstacleMut.mutate({ dream: id, title: obstacleTitle.trim(), description: obstacleDesc.trim() }); setObstacleTitle(""); setObstacleDesc(""); setShowAddObstacle(false); }} disabled={!obstacleTitle.trim()} style={{flex:1}}>Add Obstacle</GradientButton>
          </div>
        </div>
      </GlassModal>

      {/* ── Invite Collaborator Modal ── */}
      <GlassModal open={showShareModal} onClose={function () { setShowShareModal(false); }} variant="center" title="Invite Collaborator" maxWidth={380}>
        <div style={{padding:24}}>
          <div style={{marginBottom:12}}>
            <GlassInput icon={Search} value={collabSearch} onChange={function (e) { setCollabSearch(e.target.value); }} autoFocus placeholder="Search friends..." />
          </div>
          {friendsQuery.isLoading && <div style={{textAlign:"center",padding:12,color:"var(--dp-text-muted)",fontSize:13}}>Loading friends...</div>}
          {!friendsQuery.isLoading && allFriends.length === 0 && (
            <div style={{textAlign:"center",padding:16,color:"var(--dp-text-muted)",fontSize:13}}>No friends yet. Add friends to invite them as collaborators.</div>
          )}
          {!friendsQuery.isLoading && allFriends.length > 0 && filteredFriends.length === 0 && (
            <div style={{textAlign:"center",padding:12,color:"var(--dp-text-muted)",fontSize:13}}>No matching friends</div>
          )}
          {filteredFriends.length > 0 && (
            <div style={{maxHeight:260,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,marginBottom:8}}>
              {filteredFriends.map(function (u) {
                var alreadyCollab = collaborators.some(function (c) { return String(c.user_id || c.user) === String(u.id); });
                return (
                  <div key={u.id} onClick={function () {
                    if (alreadyCollab) return;
                    inviteCollabMut.mutate(u.id);
                    setShowShareModal(false);
                  }} style={{
                    display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,
                    background:"var(--dp-surface)",border:"1px solid var(--dp-input-border)",
                    cursor:alreadyCollab?"default":"pointer",opacity:alreadyCollab?0.5:1,
                    transition:"all 0.15s"
                  }}>
                    <Avatar src={u.avatar} name={u.username} size={34} />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:"var(--dp-text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.username}</div>
                      {u.title && <div style={{fontSize:11,color:"var(--dp-text-muted)"}}>{u.title}</div>}
                    </div>
                    {alreadyCollab ? (
                      <span style={{fontSize:11,color:"var(--dp-text-muted)",fontWeight:600}}>Already added</span>
                    ) : (
                      <UserPlus size={16} color="var(--dp-accent)" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={function () { setShowShareModal(false); }} style={{width:"100%",padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-pill-bg)",color:"var(--dp-text-secondary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>Cancel</button>
        </div>
      </GlassModal>

      <GlassModal open={showDeleteConfirm} onClose={()=>setShowDeleteConfirm(false)} variant="center" maxWidth={360}>
        <div style={{padding:24}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:12}}>
            <div style={{width:48,height:48,borderRadius:14,background:"rgba(239,68,68,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Trash2 size={22} color="#EF4444" strokeWidth={2}/>
            </div>
            <span style={{fontSize:18,fontWeight:700,color:"var(--dp-text)"}}>Delete Dream?</span>
            <span style={{fontSize:14,lineHeight:1.5,color:"var(--dp-text-secondary)"}}>This action cannot be undone. All goals and progress will be lost.</span>
          </div>
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <button onClick={()=>setShowDeleteConfirm(false)} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-pill-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <GradientButton gradient="danger" disabled={deleteDreamMut.isPending} onClick={()=>{setShowDeleteConfirm(false);deleteDreamMut.mutate();}} style={{flex:1}}>Delete</GradientButton>
          </div>
        </div>
      </GlassModal>

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
            background: "var(--dp-modal-bg)",
            backdropFilter: "blur(40px)",
            borderRadius: 24,
            padding: "40px 32px",
            textAlign: "center",
            maxWidth: 320,
            width: "90%",
            border: "1px solid var(--dp-input-border)",
            boxShadow: "0 20px 60px rgba(139,92,246,0.3)",
            animation: "dpCelebPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            zIndex: 1002,
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#127881;</div>
            <h2 style={{
              fontSize: 24, fontWeight: 800, margin: "0 0 8px",
              color: "var(--dp-text)",
            }}>
              {celebration.milestone === 100 ? t("dreams.dreamComplete") : t("dreams.milestoneReached")}
            </h2>
            <p style={{
              fontSize: 16, margin: "0 0 16px",
              color: "var(--dp-text-secondary)",
            }}>
              {celebration.milestone}% {t("dreams.ofDreamAchieved")}
            </p>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))",
              borderRadius: 12, padding: "8px 16px",
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 16 }}>&#9889;</span>
              <span style={{
                fontSize: 18, fontWeight: 700,
                color: "#8B5CF6",
              }}>+{celebration.xp} XP</span>
            </div>
            <div>
              <button onClick={function (e) {
                e.stopPropagation();
                setCelebration(null);
                setAchievementShare({ type: celebration.milestone === 100 ? "achievement" : "milestone", title: DREAM.title || "" });
              }} style={{
                padding: "10px 24px", borderRadius: 14, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #8B5CF6, #7C3AED)", color: "#fff",
                fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              }}>
                Share Achievement
              </button>
            </div>
          </div>
        </div>
      )}

      <GlassModal open={shareModal} onClose={() => { setShareModal(false); if (shareImage) URL.revokeObjectURL(shareImage); setShareImage(null); }} variant="center" title="Share Your Progress" maxWidth={340}>
        <div style={{padding:24}}>
          {shareLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div className="dp-spin" style={{
                width: 32, height: 32, border: "3px solid rgba(139,92,246,0.2)",
                borderTopColor: "#8B5CF6", borderRadius: "50%", margin: "0 auto",
              }} />
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--dp-text-muted)" }}>Generating card...</p>
            </div>
          ) : shareImage ? (
            <div>
              <img src={shareImage} alt="Dream progress card" style={{
                width: "100%", borderRadius: 12, marginBottom: 16,
              }} />
              <div style={{ display: "flex", gap: 8 }}>
                <GradientButton gradient="primary" onClick={function () {
                    fetch(shareImage).then(function (res) { return res.blob(); }).then(function (blob) {
                      saveBlobFile(blob, "dream-progress.png");
                    });
                  }} style={{flex:1}}>Download</GradientButton>
                <button onClick={function () {
                    nativeShare({ title: t("dreams.myDreamProgress"), text: t("dreams.checkProgress") }).catch(function () {});
                  }} style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "var(--dp-divider)",
                    color: "#8B5CF6", borderRadius: 14, padding: "12px 0",
                    border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                    }}>Share</button>
              </div>
            </div>
          ) : null}
        </div>
      </GlassModal>

      {/* ── Privacy Confirmation Modal ── */}
      <GlassModal open={!!privacyConfirm} onClose={function () { setPrivacyConfirm(null); }} variant="center" maxWidth={360}>
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, margin: "0 auto 16px",
            background: privacyConfirm === "public" ? "var(--dp-success-soft)" : "var(--dp-surface)",
            border: "1px solid " + (privacyConfirm === "public" ? "var(--dp-success)" : "var(--dp-input-border)"),
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {privacyConfirm === "public"
              ? <Globe size={24} color="var(--dp-success)" />
              : <Lock size={24} color="var(--dp-text-muted)" />}
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)", marginBottom: 8 }}>
            {privacyConfirm === "public" ? "Make dream public?" : "Make dream private?"}
          </h3>
          <p style={{ fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
            {privacyConfirm === "public"
              ? "Other users will be able to see this dream on your profile and in the social feed."
              : "This dream will only be visible to you. It will be hidden from your profile and social feed."}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={function () { setPrivacyConfirm(null); }} style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid var(--dp-input-border)",
              background: "var(--dp-surface)", color: "var(--dp-text-secondary)", fontSize: 14,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={function () {
              var newVal = privacyConfirm === "public";
              setIsPublic(newVal);
              setPrivacyConfirm(null);
              apiPatch(DREAMS.DETAIL(id), { is_public: newVal }).then(function () {
                showToast(newVal ? "Dream is now public" : "Dream is now private", "success");
                queryClient.invalidateQueries({ queryKey: ["dream", id] });
              }).catch(function (err) {
                setIsPublic(!newVal);
                showToast(err.message || "Failed to update privacy", "error");
              });
            }} style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
              background: privacyConfirm === "public" ? "var(--dp-success)" : "var(--dp-accent)",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>{privacyConfirm === "public" ? "Make Public" : "Make Private"}</button>
          </div>
        </div>
      </GlassModal>

      <AchievementShareModal
        open={!!achievementShare}
        onClose={function () { setAchievementShare(null); }}
        achievementType={achievementShare ? achievementShare.type : "achievement"}
        achievementTitle={achievementShare ? achievementShare.title : ""}
        dreamId={id}
        goalId={achievementShare ? achievementShare.goalId : undefined}
        milestoneId={achievementShare ? achievementShare.milestoneId : undefined}
      />

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
