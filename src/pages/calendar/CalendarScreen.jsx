import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../services/api";
import { CALENDAR, DREAMS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard } from "../../components/shared/Skeleton";
import ErrorState from "../../components/shared/ErrorState";
import BottomNav from "../../components/shared/BottomNav";
import { sanitizeText, validateRequired } from "../../utils/sanitize";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Clock,
  Target, CheckCircle, Circle, X, Check, Calendar,
  Zap, MoreVertical, Edit3, Trash2, LayoutGrid, Link
} from "lucide-react";
import { BRAND, GRADIENTS, adaptColor } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GradientButton from "../../components/shared/GradientButton";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Calendar Screen v1
 * Custom month grid, event dots, tasks per day, add event modal
 * ═══════════════════════════════════════════════════════════════════ */

const NOW=new Date();const TODAY={y:NOW.getFullYear(),m:NOW.getMonth(),d:NOW.getDate()};
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];

var TYPE_COLORS = { task: BRAND.green, event: BRAND.purpleLight, reminder: BRAND.yellow, deadline: BRAND.red };

function getKey(y,m,d){return `${y}-${m}-${d}`;}
function getDaysInMonth(y,m){return new Date(y,m+1,0).getDate();}
function getFirstDow(y,m){const d=new Date(y,m,1).getDay();return d===0?6:d-1;}

export default function CalendarScreen(){
  const navigate=useNavigate();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  const[mounted,setMounted]=useState(false);
  const[viewY,setViewY]=useState(TODAY.y);
  const[viewM,setViewM]=useState(TODAY.m);
  const[selDay,setSelDay]=useState(null);
  const[addEvt,setAddEvt]=useState(false);
  const[newTitle,setNewTitle]=useState("");
  const[newTime,setNewTime]=useState("9:00 AM");
  const[confirmDel,setConfirmDel]=useState(null);

  // Build date range for current view month
  var startDate = viewY + "-" + String(viewM + 1).padStart(2, "0") + "-01";
  var endDay = getDaysInMonth(viewY, viewM);
  var endDate = viewY + "-" + String(viewM + 1).padStart(2, "0") + "-" + String(endDay).padStart(2, "0");

  // ── Normalize backend task → calendar item ──
  function normalizeTask(t) {
    return {
      id: t.taskId || t.id,
      title: t.taskTitle || t.title || "",
      date: t.scheduledDate || t.date || "",
      time: t.scheduledTime || t.time || "",
      done: t.status === "completed" || t.done || t.completed || false,
      type: "task",
      color: TYPE_COLORS.task,
      dream: t.dreamTitle || t.dream || "",
      dreamId: t.dreamId || "",
      isTask: true,
      isDeadline: false,
    };
  }

  // ── Normalize CalendarEvent → calendar item ──
  function normalizeEvent(e) {
    var start = e.startTime || e.start || "";
    var dateStr = start ? start.split("T")[0] : "";
    var timeStr = start && start.includes("T") ? start.split("T")[1].substring(0, 5) : "";
    return {
      id: e.id,
      title: e.title || "",
      date: dateStr,
      time: timeStr,
      done: e.status === "completed" || e.completed || false,
      type: "event",
      color: TYPE_COLORS.event,
      dream: e.dreamTitle || e.taskTitle || "",
      isTask: false,
      isDeadline: false,
    };
  }

  // ── Monthly tasks query (from dreams system) ──
  var tasksQuery = useQuery({
    queryKey: ["calendar-tasks", startDate, endDate],
    queryFn: function () { return apiGet(CALENDAR.VIEW + "?start=" + startDate + "&end=" + endDate); },
  });

  // ── Monthly calendar events query (CalendarEvent model) ──
  var eventsQuery = useQuery({
    queryKey: ["calendar-events", startDate, endDate],
    queryFn: function () { return apiGet(CALENDAR.EVENTS + "?start_time__gte=" + startDate + "&start_time__lte=" + endDate + "T23:59:59"); },
  });

  // ── Today's tasks query ──
  var todayQuery = useQuery({
    queryKey: ["calendar-today"],
    queryFn: function () { return apiGet(CALENDAR.TODAY); },
  });

  // Show toast on query errors
  useEffect(function () {
    if (tasksQuery.error) showToast(tasksQuery.error.userMessage || tasksQuery.error.message || "Failed to load calendar", "error");
  }, [tasksQuery.error]);

  useEffect(function () {
    if (todayQuery.error) showToast(todayQuery.error.userMessage || todayQuery.error.message || "Failed to load today's tasks", "error");
  }, [todayQuery.error]);

  // Transform all data into keyed object by "y-m-d"
  var events = {};
  function addToMap(item) {
    if (!item.date) return;
    var d = new Date(item.date);
    if (isNaN(d.getTime())) return;
    var k = getKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!events[k]) events[k] = [];
    var exists = events[k].some(function (e) { return e.id === item.id; });
    if (!exists) events[k].push(item);
  }

  // Add tasks from monthly view
  var rawTasks = (tasksQuery.data && tasksQuery.data.results) || tasksQuery.data || [];
  if (Array.isArray(rawTasks)) rawTasks.forEach(function (t) { addToMap(normalizeTask(t)); });

  // Add calendar events from events endpoint
  var rawCalEvents = (eventsQuery.data && eventsQuery.data.results) || eventsQuery.data || [];
  if (Array.isArray(rawCalEvents)) rawCalEvents.forEach(function (e) { addToMap(normalizeEvent(e)); });

  // Add today's tasks (merge without duplicates)
  var rawToday = (todayQuery.data && todayQuery.data.results) || todayQuery.data || [];
  if (Array.isArray(rawToday)) rawToday.forEach(function (t) { addToMap(normalizeTask(t)); });

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  const prevMonth=()=>{if(viewM===0){setViewM(11);setViewY(viewY-1);}else setViewM(viewM-1);setSelDay(1);};
  const nextMonth=()=>{if(viewM===11){setViewM(0);setViewY(viewY+1);}else setViewM(viewM+1);setSelDay(1);};
  const goToday=()=>{setViewY(TODAY.y);setViewM(TODAY.m);setSelDay(null);};

  // ── Helper: invalidate all calendar queries ──
  function invalidateCalendar() {
    queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-today"] });
  }

  // ── Toggle task completion (Dream task via tasks API) ──
  var toggleTaskMut = useMutation({
    mutationFn: function (params) {
      return apiPost(DREAMS.TASKS.COMPLETE(params.id));
    },
    onSuccess: function () { invalidateCalendar(); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to update task", "error"); },
  });

  // ── Toggle calendar event completion ──
  var toggleEventMut = useMutation({
    mutationFn: function (params) {
      return apiPatch(CALENDAR.EVENT_DETAIL(params.id), { status: params.completed ? "completed" : "scheduled" });
    },
    onSuccess: function () { invalidateCalendar(); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to update task", "error"); },
  });

  // ── Delete calendar event ──
  var deleteEventMut = useMutation({
    mutationFn: function (params) {
      return apiDelete(CALENDAR.EVENT_DETAIL(params.id));
    },
    onSuccess: function () { invalidateCalendar(); showToast("Task deleted", "success"); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to delete", "error"); },
  });

  // ── Create calendar event ──
  var createMutation = useMutation({
    mutationFn: function (body) {
      return apiPost(CALENDAR.EVENTS, body);
    },
    onSuccess: function () { invalidateCalendar(); showToast("Task created", "success"); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to create task", "error"); },
  });

  var toggleTask = function (evtKey, evtId) {
    var evt = (events[evtKey] || []).find(function (e) { return e.id === evtId; });
    if (!evt) return;
    if (evt.isTask) {
      toggleTaskMut.mutate({ id: evtId });
    } else {
      toggleEventMut.mutate({ id: evtId, completed: !evt.done });
    }
  };

  var deleteEvent = function (evtKey, evtId) {
    var evt = (events[evtKey] || []).find(function (e) { return e.id === evtId; });
    if (evt && evt.isTask) {
      showToast("Tasks are managed from Dream Details", "info");
    } else {
      deleteEventMut.mutate({ id: evtId });
    }
    setConfirmDel(null);
  };

  // ── Parse time string like "9:00 AM" to "09:00:00" ──
  function parseTimeTo24h(timeStr) {
    var match = (timeStr || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return "09:00:00";
    var h = parseInt(match[1], 10);
    var m = match[2];
    var ampm = (match[3] || "").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return String(h).padStart(2, "0") + ":" + m + ":00";
  }

  var handleAddEvt = function () {
    var cleanTitle = sanitizeText(newTitle, 200);
    var missing = validateRequired({ title: cleanTitle });
    if (missing.length > 0) {
      showToast("Title is required", "error");
      return;
    }
    var day = selDay || TODAY.d;
    var dateStr = viewY + "-" + String(viewM + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    var time24 = parseTimeTo24h(newTime);
    var startTime = dateStr + "T" + time24;
    // Default 1-hour duration
    var endH = parseInt(time24.split(":")[0], 10) + 1;
    var endTime = dateStr + "T" + String(endH).padStart(2, "0") + ":" + time24.split(":")[1] + ":00";
    createMutation.mutate({ title: cleanTitle, start_time: startTime, end_time: endTime });
    setNewTitle("");
    setAddEvt(false);
  };

  var isLoading = tasksQuery.isLoading || todayQuery.isLoading;

  if (tasksQuery.isError && todayQuery.isError) {
    return (
      <div className="dp-desktop-main" style={{ position: "absolute", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ErrorState
            message={(tasksQuery.error && (tasksQuery.error.userMessage || tasksQuery.error.message)) || (todayQuery.error && (todayQuery.error.userMessage || todayQuery.error.message)) || "Failed to load calendar"}
            onRetry={function () { tasksQuery.refetch(); todayQuery.refetch(); }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  const daysInMonth=getDaysInMonth(viewY,viewM);

  const renderEventCard=(evt,evtKey)=>(
    <GlassCard mb={8} style={{overflow:"hidden"}}>
      <div style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:4,alignSelf:"stretch",minHeight:40,borderRadius:2,background:evt.color,flexShrink:0,boxShadow:`0 0 8px ${evt.color}30`}}/>
        {evt.type==="task"?(
          <button aria-label={evt.done ? "Mark task incomplete" : "Mark task complete"} onClick={()=>toggleTask(evtKey,evt.id)} style={{width:24,height:24,borderRadius:8,border:evt.done?"none":"2px solid var(--dp-accent-border)",background:evt.done?"rgba(93,229,168,0.2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.2s",fontFamily:"inherit"}}>
            {evt.done&&<Check size={13} color={"var(--dp-success)"} strokeWidth={3}/>}
          </button>
        ):(
          <div style={{width:24,height:24,borderRadius:8,background:`${evt.color}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Clock size={12} color={adaptColor(evt.color,isLight)} strokeWidth={2.5}/>
          </div>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:500,color:evt.done?"var(--dp-text-muted)":"var(--dp-text)",textDecoration:evt.done?"line-through":"none",transition:"all 0.2s"}}>{evt.title}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
            <span style={{fontSize:12,color:"var(--dp-text-secondary)"}}>{evt.time}</span>
            {evt.isDeadline&&<span style={{padding:"1px 6px",borderRadius:6,fontSize:10,fontWeight:700,textTransform:"uppercase",background:"rgba(239,68,68,0.12)",color:"var(--dp-danger)"}}>Deadline</span>}
            {evt.dream&&<span style={{fontSize:12,color:adaptColor(evt.color,isLight),fontWeight:500}}>{evt.dream}</span>}
          </div>
        </div>
        <button aria-label="Delete event" className="dp-gh" onClick={()=>setConfirmDel({key:evtKey,id:evt.id,title:evt.title})} style={{width:30,height:30,borderRadius:9,border:"none",background:"rgba(239,68,68,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.15s",opacity:0.5,fontFamily:"inherit"}}>
          <Trash2 size={14} color="rgba(239,68,68,0.8)" strokeWidth={2}/>
        </button>
      </div>
    </GlassCard>
  );

  const firstDow=getFirstDow(viewY,viewM);
  const isToday=(d)=>d===TODAY.d&&viewM===TODAY.m&&viewY===TODAY.y;
  const isSel=(d)=>selDay!==null&&d===selDay;
  const todayKey=getKey(TODAY.y,TODAY.m,TODAY.d);
  const tomorrowD=new Date(TODAY.y,TODAY.m,TODAY.d+1);
  const tomorrowKey=getKey(tomorrowD.getFullYear(),tomorrowD.getMonth(),tomorrowD.getDate());
  const todayEvents=events[todayKey]||[];
  const tomorrowEvents=events[tomorrowKey]||[];
  const selKey=selDay?getKey(viewY,viewM,selDay):null;
  const selEvents=selKey?(events[selKey]||[]):[];

  // build calendar grid
  const cells=[];
  for(let i=0;i<firstDow;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);


  return(
    <div className="dp-desktop-main" style={{position:"absolute",inset:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>

      <GlassAppBar
        left={
          <>
            <IconButton icon={ArrowLeft} onClick={()=>navigate("/")} label="Go back" />
            <Calendar size={18} color={"var(--dp-accent)"} strokeWidth={2}/>
          </>
        }
        title="Calendar"
        right={
          <>
            <button aria-label="Go to today" onClick={goToday} style={{padding:"6px 12px",borderRadius:10,border:"1px solid var(--dp-accent-border)",background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Today</button>
            <IconButton icon={Plus} label="Add task" onClick={()=>{setNewTitle("");setAddEvt(true);}} />
          </>
        }
      />

      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"16px 0 100px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div className="dp-content-area" style={{padding:"0 16px"}}>

          {/* ── Quick Access ── */}
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={function(){navigate("/calendar/timeblocks");}}>
              <LayoutGrid size={16} color={"var(--dp-accent)"} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Time Blocks</span>
            </GlassCard>
            <GlassCard hover padding="10px 12px" style={{flex:1,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={function(){navigate("/calendar-connect");}}>
              <Link size={16} color={"var(--dp-accent)"} strokeWidth={2}/>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text-primary)"}}>Google Sync</span>
            </GlassCard>
          </div>

          {/* ── Month Nav ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <IconButton icon={ChevronLeft} onClick={prevMonth} label="Previous month" size="sm" />
              <h1 style={{fontSize:18,fontWeight:700,color:"var(--dp-text)",margin:0}}>{MONTHS[viewM]} {viewY}</h1>
              <IconButton icon={ChevronRight} onClick={nextMonth} label="Next month" size="sm" />
            </div>
          </div>

          {/* ── Calendar Grid ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms"}}>
            <GlassCard padding={12} mb={16}>
              {/* Day headers */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
                {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:12,fontWeight:600,color:"var(--dp-text-muted)",padding:"4px 0"}}>{d}</div>)}
              </div>
              {/* Date cells */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {cells.map((d,i)=>{
                  if(d===null)return <div key={`e${i}`}/>;
                  const k=getKey(viewY,viewM,d);
                  const hasEvt=events[k]&&events[k].length>0;
                  const evtColors=(events[k]||[]).slice(0,3).map(e=>e.color);
                  return(
                    <button key={d} role="button" aria-label={new Date(viewY,viewM,d).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})} onClick={()=>setSelDay(d)} style={{
                      position:"relative",aspectRatio:"1",borderRadius:12,border:"none",cursor:"pointer",
                      background:isSel(d)?"rgba(139,92,246,0.2)":isToday(d)?"rgba(93,229,168,0.08)":"transparent",
                      outline:isSel(d)?"2px solid rgba(139,92,246,0.4)":isToday(d)?"1px solid rgba(93,229,168,0.15)":"none",
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
                      transition:"all 0.15s",fontFamily:"inherit",
                    }}
                      className="dp-gh">
                      <span style={{fontSize:14,fontWeight:isToday(d)||isSel(d)?700:400,color:isSel(d)?"var(--dp-accent)":isToday(d)?"var(--dp-success)":"var(--dp-text-primary)"}}>{d}</span>
                      {hasEvt&&(
                        <div style={{display:"flex",gap:2}}>
                          {evtColors.map((c,j)=><div key={j} style={{width:4,height:4,borderRadius:2,background:c}}/>)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          {/* ── Events Section ── */}
          {isLoading?(
            /* ── LOADING SKELETONS ── */
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"160ms",display:"flex",flexDirection:"column",gap:10}}>
              <SkeletonCard height={64} />
              <SkeletonCard height={64} />
              <SkeletonCard height={64} />
            </div>
          ):selDay===null?(
            /* ── DEFAULT: Today + Tomorrow ── */
            <>
              {[{label:"Today",evts:todayEvents,key:todayKey,dayNum:TODAY.d},{label:"Tomorrow",evts:tomorrowEvents,key:tomorrowKey,dayNum:tomorrowD.getDate()}].map(({label,evts,key,dayNum},si)=>(
                <div key={label}>
                  <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${160+si*120}ms`}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,marginTop:si>0?8:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:8,height:8,borderRadius:4,background:label==="Today"?BRAND.green:BRAND.purpleLight}}/>
                        <h2 style={{fontSize:15,fontWeight:700,color:"var(--dp-text)",margin:0}}>{label}</h2>
                        <span style={{fontSize:12,color:"var(--dp-text-muted)"}}>{new Date(label==="Today"?Date.now():Date.now()+86400000).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                      </div>
                      <span style={{fontSize:12,color:"var(--dp-text-secondary)"}}>{evts.length} item{evts.length!==1?"s":""}</span>
                    </div>
                  </div>
                  {evts.length===0?(
                    <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${200+si*120}ms`}}>
                      <GlassCard padding="16px 20px" mb={8} style={{textAlign:"center"}}>
                        <span style={{fontSize:13,color:"var(--dp-text-muted)"}}>No tasks scheduled</span>
                      </GlassCard>
                    </div>
                  ):(
                    evts.map((evt,i)=>(
                      <div key={evt.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${200+si*120+i*50}ms`}}>
                        {renderEventCard(evt,key)}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </>
          ):(
            /* ── SELECTED DAY VIEW ── */
            <>
              <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"160ms"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <h2 style={{fontSize:15,fontWeight:700,color:"var(--dp-text)",margin:0}}>
                      {isToday(selDay)?"Today":new Date(viewY,viewM,selDay).toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}
                    </h2>
                    {selDay!==null&&<button aria-label="Clear day selection" onClick={()=>setSelDay(null)} style={{padding:"3px 8px",borderRadius:6,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-tertiary)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Clear</button>}
                  </div>
                  <span style={{fontSize:12,color:"var(--dp-text-secondary)"}}>{selEvents.length} item{selEvents.length!==1?"s":""}</span>
                </div>
              </div>
              {selEvents.length===0?(
                <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"240ms"}}>
                  <GlassCard padding={32} style={{textAlign:"center"}}>
                    <Calendar size={32} color={"var(--dp-text-muted)"} strokeWidth={1.5} style={{margin:"0 auto 10px"}}/>
                    <div style={{fontSize:14,color:"var(--dp-text-secondary)"}}>No tasks for this day</div>
                    <button aria-label="Add task for this day" onClick={()=>{setNewTitle("");setAddEvt(true);}} style={{marginTop:12,padding:"8px 16px",borderRadius:10,border:"1px solid var(--dp-accent-border)",background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}}>
                      <Plus size={13} strokeWidth={2}/>Add Task
                    </button>
                  </GlassCard>
                </div>
              ):(
                selEvents.map((evt,i)=>(
                  <div key={evt.id} className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${240+i*60}ms`}}>
                    {renderEventCard(evt,selKey)}
                  </div>
                ))
              )}
            </>
          )}

        </div>
      </main>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {/* ═══ DELETE CONFIRM ═══ */}
      <GlassModal open={!!confirmDel} onClose={()=>setConfirmDel(null)} variant="center" maxWidth={340}>
        <div style={{padding:24}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:36,height:36,borderRadius:12,background:"rgba(239,68,68,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Trash2 size={18} color="rgba(239,68,68,0.8)" strokeWidth={2}/>
            </div>
            <div style={{fontSize:15,fontWeight:600,color:"var(--dp-text)"}}>Delete Task?</div>
          </div>
          <div style={{fontSize:13,color:"var(--dp-text-primary)",marginBottom:16,lineHeight:1.5}}>
            Are you sure you want to delete "<span style={{color:"var(--dp-text)",fontWeight:500}}>{confirmDel?.title}</span>"? This cannot be undone.
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:"11px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <button className="dp-gh" onClick={()=>deleteEvent(confirmDel.key,confirmDel.id)} style={{flex:1,padding:"11px",borderRadius:12,border:"none",background:"rgba(239,68,68,0.15)",color:"rgba(239,68,68,0.9)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>Delete</button>
          </div>
        </div>
      </GlassModal>

      {/* ═══ ADD EVENT MODAL ═══ */}
      <GlassModal open={addEvt} onClose={()=>setAddEvt(false)} variant="center" maxWidth={380} title="New Task">
        <div style={{padding:24}}>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:6,display:"block"}}>Title</label>
            <GlassInput value={newTitle} onChange={e=>setNewTitle(e.target.value)} autoFocus placeholder="Task name..." />
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:6,display:"block"}}>Date</label>
            <div style={{padding:"10px 14px",borderRadius:12,background:"var(--dp-glass-bg)",border:"1px solid var(--dp-input-border)",color:"var(--dp-text-primary)",fontSize:14,display:"flex",alignItems:"center",gap:8}}>
              <Calendar size={14} color={"var(--dp-accent)"} strokeWidth={2}/>
              {new Date(viewY,viewM,selDay||TODAY.d).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)",marginBottom:6,display:"block"}}>Time</label>
            <GlassInput value={newTime} onChange={e=>setNewTime(e.target.value)} placeholder="9:00 AM" />
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setAddEvt(false)} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:"var(--dp-glass-bg)",color:"var(--dp-text-primary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            <GradientButton gradient="primaryDark" onClick={handleAddEvt} disabled={!newTitle.trim()} fullWidth style={{flex:1,borderRadius:12,padding:"12px 0",fontSize:14}}>Create</GradientButton>
          </div>
        </div>
      </GlassModal>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        input::placeholder{color:rgba(255,255,255,0.3);}
        .dp-gh:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.1);transform:translateY(-1px);}
        [data-theme="light"] .dp-gh:hover{background:rgba(255,255,255,0.85);border-color:rgba(139,92,246,0.18);}
        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        @keyframes dpFS{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
      `}</style>
    </div>
  );
}
