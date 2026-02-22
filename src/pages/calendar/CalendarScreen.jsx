import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import BottomNav from "../../components/shared/BottomNav";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Clock,
  Target, CheckCircle, Circle, X, Check, Calendar,
  Zap, MoreVertical, Edit3, Trash2
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Calendar Screen v1
 * Custom month grid, event dots, tasks per day, add event modal
 * ═══════════════════════════════════════════════════════════════════ */

const NOW=new Date();const TODAY={y:NOW.getFullYear(),m:NOW.getMonth(),d:NOW.getDate()};
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];

const EVENTS = {
  [`${TODAY.y}-${TODAY.m}-${TODAY.d}`]:[
    {id:"e1",title:"Morning Run (8km)",time:"6:30 AM",color:"#5DE5A8",type:"task",done:false,dream:"Half Marathon"},
    {id:"e2",title:"AI Coach Check-in",time:"12:00 PM",color:"#C4B5FD",type:"event",dream:"Half Marathon"},
    {id:"e3",title:"Piano Practice",time:"7:00 PM",color:"#FCD34D",type:"task",done:false,dream:"Learn Piano"},
  ],
  [`${TODAY.y}-${TODAY.m}-${TODAY.d-1}`]:[
    {id:"e4",title:"Complete Coursera Module",time:"10:00 AM",color:"#C4B5FD",type:"task",done:true,dream:"Launch SaaS"},
    {id:"e5",title:"Stretching Routine",time:"6:00 PM",color:"#5DE5A8",type:"task",done:true,dream:"Half Marathon"},
  ],
  [`${TODAY.y}-${TODAY.m}-${TODAY.d+1}`]:[
    {id:"e6",title:"Long Run (10km)",time:"7:00 AM",color:"#5DE5A8",type:"task",done:false,dream:"Half Marathon"},
    {id:"e7",title:"Budget Review",time:"3:00 PM",color:"#5EEAD4",type:"event",dream:"Save $15K"},
  ],
  [`${TODAY.y}-${TODAY.m}-${TODAY.d+3}`]:[
    {id:"e8",title:"Buddy Chat with Alex",time:"5:00 PM",color:"#14B8A6",type:"event",dream:"Half Marathon"},
  ],
  [`${TODAY.y}-${TODAY.m}-${TODAY.d+5}`]:[
    {id:"e9",title:"Race Day Registration Deadline",time:"All Day",color:"#F69A9A",type:"event",dream:"Half Marathon"},
  ],
  [`${TODAY.y}-${TODAY.m}-${TODAY.d-3}`]:[
    {id:"e10",title:"5km Easy Run",time:"6:30 AM",color:"#5DE5A8",type:"task",done:true,dream:"Half Marathon"},
  ],
};

function getKey(y,m,d){return `${y}-${m}-${d}`;}
function getDaysInMonth(y,m){return new Date(y,m+1,0).getDate();}
function getFirstDow(y,m){const d=new Date(y,m,1).getDay();return d===0?6:d-1;}

export default function CalendarScreen(){
  const navigate=useNavigate();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  const[mounted,setMounted]=useState(false);
  const[viewY,setViewY]=useState(TODAY.y);
  const[viewM,setViewM]=useState(TODAY.m);
  const[selDay,setSelDay]=useState(null);
  const[events,setEvents]=useState(EVENTS);
  const[addEvt,setAddEvt]=useState(false);
  const[newTitle,setNewTitle]=useState("");
  const[newTime,setNewTime]=useState("9:00 AM");
  const[confirmDel,setConfirmDel]=useState(null);

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  const prevMonth=()=>{if(viewM===0){setViewM(11);setViewY(viewY-1);}else setViewM(viewM-1);setSelDay(1);};
  const nextMonth=()=>{if(viewM===11){setViewM(0);setViewY(viewY+1);}else setViewM(viewM+1);setSelDay(1);};
  const goToday=()=>{setViewY(TODAY.y);setViewM(TODAY.m);setSelDay(null);};
  const toggleTask=(evtKey,evtId)=>{setEvents(p=>{const up={...p};up[evtKey]=up[evtKey].map(e=>e.id===evtId?{...e,done:!e.done}:e);return up;});};
  const deleteEvent=(evtKey,evtId)=>{setEvents(p=>{const up={...p};up[evtKey]=up[evtKey].filter(e=>e.id!==evtId);if(up[evtKey].length===0)delete up[evtKey];return up;});setConfirmDel(null);};
  const handleAddEvt=()=>{if(!newTitle.trim())return;const day=selDay||TODAY.d;const k=getKey(viewY,viewM,day);setEvents(p=>{const up={...p};if(!up[k])up[k]=[];up[k]=[...up[k],{id:`e${Date.now()}`,title:newTitle.trim(),time:newTime,color:"#C4B5FD",type:"event",done:false,dream:""}];return up;});setNewTitle("");setAddEvt(false);};

  const daysInMonth=getDaysInMonth(viewY,viewM);

  const renderEventCard=(evt,evtKey)=>(
    <div className="dp-g" style={{marginBottom:8,overflow:"hidden"}}>
      <div style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:4,alignSelf:"stretch",minHeight:40,borderRadius:2,background:evt.color,flexShrink:0,boxShadow:`0 0 8px ${evt.color}30`}}/>
        {evt.type==="task"?(
          <button onClick={()=>toggleTask(evtKey,evt.id)} style={{width:24,height:24,borderRadius:8,border:evt.done?"none":(isLight?"2px solid rgba(139,92,246,0.2)":"2px solid rgba(255,255,255,0.15)"),background:evt.done?"rgba(93,229,168,0.2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.2s"}}>
            {evt.done&&<Check size={13} color={isLight?"#059669":"#5DE5A8"} strokeWidth={3}/>}
          </button>
        ):(
          <div style={{width:24,height:24,borderRadius:8,background:`${evt.color}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Clock size={12} color={isLight?(evt.color==="#5DE5A8"?"#059669":evt.color==="#C4B5FD"?"#6D28D9":evt.color==="#FCD34D"?"#B45309":evt.color==="#5EEAD4"?"#0D9488":evt.color==="#F69A9A"?"#DC2626":evt.color):evt.color} strokeWidth={2.5}/>
          </div>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:500,color:evt.done?(isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"):(isLight?"#1a1535":"#fff"),textDecoration:evt.done?"line-through":"none",transition:"all 0.2s"}}>{evt.title}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
            <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{evt.time}</span>
            {evt.dream&&<span style={{fontSize:12,color:isLight?(evt.color==="#5DE5A8"?"#059669":evt.color==="#C4B5FD"?"#6D28D9":evt.color==="#FCD34D"?"#B45309":evt.color==="#5EEAD4"?"#0D9488":evt.color==="#F69A9A"?"#DC2626":evt.color):evt.color,fontWeight:500}}>{evt.dream}</span>}
          </div>
        </div>
        <button aria-label="Delete event" onClick={()=>setConfirmDel({key:evtKey,id:evt.id,title:evt.title})} style={{width:30,height:30,borderRadius:9,border:"none",background:"rgba(239,68,68,0.06)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all 0.15s",opacity:0.5}}
          onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.background="rgba(239,68,68,0.12)";}}
          onMouseLeave={e=>{e.currentTarget.style.opacity="0.5";e.currentTarget.style.background="rgba(239,68,68,0.06)";}}>
          <Trash2 size={14} color="rgba(239,68,68,0.8)" strokeWidth={2}/>
        </button>
      </div>
    </div>
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
    <div style={{width:"100%",height:"100vh",overflow:"hidden",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>

      <header style={{position:"relative",zIndex:100,height:64,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="dp-ib" aria-label="Go back" onClick={()=>navigate(-1)}><ArrowLeft size={20} strokeWidth={2}/></button>
          <Calendar size={18} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/>
          <span style={{fontSize:17,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>Calendar</span>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={goToday} style={{padding:"6px 12px",borderRadius:10,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.08)",color:isLight?"#7C3AED":"#C4B5FD",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Today</button>
          <button className="dp-ib" aria-label="Add event" onClick={()=>{setNewTitle("");setAddEvt(true);}}><Plus size={18} strokeWidth={2}/></button>
        </div>
      </header>

      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"16px 16px 100px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{width:"100%"}}>

          {/* ── Month Nav ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <button aria-label="Previous month" onClick={prevMonth} className="dp-ib" style={{width:36,height:36}}><ChevronLeft size={18} strokeWidth={2}/></button>
              <span style={{fontSize:18,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{MONTHS[viewM]} {viewY}</span>
              <button aria-label="Next month" onClick={nextMonth} className="dp-ib" style={{width:36,height:36}}><ChevronRight size={18} strokeWidth={2}/></button>
            </div>
          </div>

          {/* ── Calendar Grid ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"80ms"}}>
            <div className="dp-g" style={{padding:12,marginBottom:16}}>
              {/* Day headers */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
                {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)",padding:"4px 0"}}>{d}</div>)}
              </div>
              {/* Date cells */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {cells.map((d,i)=>{
                  if(d===null)return <div key={`e${i}`}/>;
                  const k=getKey(viewY,viewM,d);
                  const hasEvt=events[k]&&events[k].length>0;
                  const evtColors=(events[k]||[]).slice(0,3).map(e=>e.color);
                  return(
                    <button key={d} onClick={()=>setSelDay(d)} style={{
                      position:"relative",aspectRatio:"1",borderRadius:12,border:"none",cursor:"pointer",
                      background:isSel(d)?"rgba(139,92,246,0.2)":isToday(d)?"rgba(93,229,168,0.08)":"transparent",
                      outline:isSel(d)?"2px solid rgba(139,92,246,0.4)":isToday(d)?"1px solid rgba(93,229,168,0.15)":"none",
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
                      transition:"all 0.15s",
                    }}
                      onMouseEnter={e=>{if(!isSel(d))e.currentTarget.style.background=isLight?"rgba(139,92,246,0.06)":"rgba(255,255,255,0.04)";}}
                      onMouseLeave={e=>{if(!isSel(d)&&!isToday(d))e.currentTarget.style.background="transparent";else if(isToday(d)&&!isSel(d))e.currentTarget.style.background="rgba(93,229,168,0.08)";}}>
                      <span style={{fontSize:14,fontWeight:isToday(d)||isSel(d)?700:400,color:isSel(d)?(isLight?"#7C3AED":"#C4B5FD"):isToday(d)?(isLight?"#059669":"#5DE5A8"):(isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)")}}>{d}</span>
                      {hasEvt&&(
                        <div style={{display:"flex",gap:2}}>
                          {evtColors.map((c,j)=><div key={j} style={{width:4,height:4,borderRadius:2,background:c}}/>)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Events Section ── */}
          {selDay===null?(
            /* ── DEFAULT: Today + Tomorrow ── */
            <>
              {[{label:"Today",evts:todayEvents,key:todayKey,dayNum:TODAY.d},{label:"Tomorrow",evts:tomorrowEvents,key:tomorrowKey,dayNum:tomorrowD.getDate()}].map(({label,evts,key,dayNum},si)=>(
                <div key={label}>
                  <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${160+si*120}ms`}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,marginTop:si>0?8:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:8,height:8,borderRadius:4,background:label==="Today"?"#5DE5A8":"#C4B5FD"}}/>
                        <span style={{fontSize:15,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{label}</span>
                        <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"}}>{new Date(label==="Today"?Date.now():Date.now()+86400000).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                      </div>
                      <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{evts.length} item{evts.length!==1?"s":""}</span>
                    </div>
                  </div>
                  {evts.length===0?(
                    <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:`${200+si*120}ms`}}>
                      <div style={{padding:"16px 20px",borderRadius:14,background:isLight?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.02)",border:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.04)",textAlign:"center",marginBottom:8}}>
                        <span style={{fontSize:13,color:isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"}}>No events scheduled</span>
                      </div>
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
                    <span style={{fontSize:15,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>
                      {isToday(selDay)?"Today":new Date(viewY,viewM,selDay).toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}
                    </span>
                    {selDay!==null&&<button onClick={()=>setSelDay(null)} style={{padding:"3px 8px",borderRadius:6,border:"1px solid var(--dp-input-border)",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.6)",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Clear</button>}
                  </div>
                  <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{selEvents.length} item{selEvents.length!==1?"s":""}</span>
                </div>
              </div>
              {selEvents.length===0?(
                <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"240ms"}}>
                  <div className="dp-g" style={{padding:32,textAlign:"center"}}>
                    <Calendar size={32} color={isLight?"rgba(26,21,53,0.15)":"rgba(255,255,255,0.15)"} strokeWidth={1.5} style={{margin:"0 auto 10px"}}/>
                    <div style={{fontSize:14,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>No events for this day</div>
                    <button onClick={()=>{setNewTitle("");setAddEvt(true);}} style={{marginTop:12,padding:"8px 16px",borderRadius:10,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.08)",color:isLight?"#7C3AED":"#C4B5FD",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:4}}>
                      <Plus size={13} strokeWidth={2}/>Add Event
                    </button>
                  </div>
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
      {confirmDel&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={()=>setConfirmDel(null)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"relative",width:"85%",maxWidth:340,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:22,border:"1px solid rgba(239,68,68,0.12)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",padding:24,animation:"dpFS 0.2s ease-out"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:36,height:36,borderRadius:12,background:"rgba(239,68,68,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Trash2 size={18} color="rgba(239,68,68,0.8)" strokeWidth={2}/>
              </div>
              <div style={{fontSize:15,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Delete Event?</div>
            </div>
            <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:16,lineHeight:1.5}}>
              Are you sure you want to delete "<span style={{color:isLight?"#1a1535":"#fff",fontWeight:500}}>{confirmDel.title}</span>"? This cannot be undone.
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:"11px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>deleteEvent(confirmDel.key,confirmDel.id)} style={{flex:1,padding:"11px",borderRadius:12,border:"none",background:"rgba(239,68,68,0.15)",color:"rgba(239,68,68,0.9)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.25)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,0.15)"}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD EVENT MODAL ═══ */}
      {addEvt&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={()=>setAddEvt(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"relative",width:"90%",maxWidth:380,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:22,border:"1px solid var(--dp-input-border)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",padding:24,animation:"dpFS 0.25s ease-out"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>New Event</span>
              <button className="dp-ib" aria-label="Close" style={{width:32,height:32}} onClick={()=>setAddEvt(false)}><X size={16} strokeWidth={2}/></button>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:6,display:"block"}}>Title</label>
              <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} autoFocus placeholder="Event name..." style={{width:"100%",padding:"10px 14px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:"1px solid var(--dp-input-border)",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:6,display:"block"}}>Date</label>
              <div style={{padding:"10px 14px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:"1px solid var(--dp-input-border)",color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",fontSize:14,display:"flex",alignItems:"center",gap:8}}>
                <Calendar size={14} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/>
                {new Date(viewY,viewM,selDay||TODAY.d).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",marginBottom:6,display:"block"}}>Time</label>
              <input value={newTime} onChange={e=>setNewTime(e.target.value)} placeholder="9:00 AM" style={{width:"100%",padding:"10px 14px",borderRadius:12,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:"1px solid var(--dp-input-border)",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setAddEvt(false)} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid var(--dp-input-border)",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={handleAddEvt} disabled={!newTitle.trim()} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:newTitle.trim()?"linear-gradient(135deg,#8B5CF6,#6D28D9)":(isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)"),color:newTitle.trim()?"#fff":(isLight?"rgba(26,21,53,0.3)":"rgba(255,255,255,0.25)"),fontSize:14,fontWeight:600,cursor:newTitle.trim()?"pointer":"not-allowed",fontFamily:"inherit"}}>Create</button>
            </div>
          </div>
        </div>
      )}

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
