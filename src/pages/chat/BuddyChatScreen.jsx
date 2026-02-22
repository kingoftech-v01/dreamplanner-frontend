import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  ArrowLeft, Users, Send, ChevronDown, MoreVertical, Pin,
  Heart, Copy, Check, CheckCheck, Search, X, Phone, Video,
  Smile, Target
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Buddy Chat Screen v1
 * 
 * P2P real-time chat between dream buddies.
 * Differences from AI Chat:
 * - Two real people with avatars and online status
 * - Buddy profile in appbar (name, online, mutual dream)
 * - Read receipts (double check marks)
 * - Teal-tinted glass for buddy messages (vs purple AI)
 * - Pink-tinted glass for user messages (same as AI chat)
 * - Shared dream context banner
 * - Typing indicator ("Alex is typing...")
 * - Same features: date separators, pin/like/copy, panels
 * ═══════════════════════════════════════════════════════════════════ */

// ─── MOCK DATA ───────────────────────────────────────────────────
const ME = { displayName:"Stephane", initial:"S" };
const BUDDY = { displayName:"Alex", initial:"A", online:true, mutualDream:"Run a Half Marathon" };

const MOCK_MESSAGES = [
  { id:"1", content:"Hey Alex! How's your training going this week?", isUser:true, time:new Date(Date.now()-1000*60*60*26), pinned:false, liked:false, read:true, reactions:[] },
  { id:"2", content:"Pretty good! I managed to run 8km yesterday without stopping 🏃‍♂️", isUser:false, time:new Date(Date.now()-1000*60*60*26+120000), pinned:false, liked:true, read:true, reactions:[] },
  { id:"3", content:"That's amazing progress! Last month you could barely do 3km", isUser:true, time:new Date(Date.now()-1000*60*60*25), pinned:false, liked:false, read:true, reactions:[] },
  { id:"4", content:"I know right! The interval training plan really helped. Are you following the same one?", isUser:false, time:new Date(Date.now()-1000*60*60*25+60000), pinned:true, liked:false, read:true, reactions:[] },
  { id:"5", content:"Yeah I started it this week. Did my first 5km today morning, felt great!", isUser:true, time:new Date(Date.now()-1000*60*30), pinned:false, liked:false, read:true, reactions:[] },
  { id:"6", content:"Let's gooo! 💪 We should do a practice run together this weekend. There's a nice trail near the park.", isUser:false, time:new Date(Date.now()-1000*60*25), pinned:false, liked:true, read:true, reactions:[] },
  { id:"7", content:"I'm down! Saturday morning works for me. 7am?", isUser:true, time:new Date(Date.now()-1000*60*12), pinned:true, liked:false, read:true, reactions:[] },
  { id:"8", content:"Perfect! I'll send you the location pin. Bring water and good shoes 😄", isUser:false, time:new Date(Date.now()-1000*60*8), pinned:false, liked:false, read:true, reactions:[] },
];

// ─── HELPERS ─────────────────────────────────────────────────────
function formatTime(d){return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
function fmtMd(t,isLight){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\*\*(.*?)\*\*/g,`<strong style="color:${isLight?'#1a1535':'#fff'};font-weight:600">$1</strong>`).replace(/\n/g,"<br/>");}
function dateLabel(d){const now=new Date(),td=new Date(now.getFullYear(),now.getMonth(),now.getDate()),md=new Date(d.getFullYear(),d.getMonth(),d.getDate()),diff=Math.floor((td-md)/(864e5));if(!diff)return"Today";if(diff===1)return"Yesterday";if(diff<7)return d.toLocaleDateString([],{weekday:'long'});return d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});}
function showDate(msgs,i){if(!i)return true;return msgs[i-1].time.toDateString()!==msgs[i].time.toDateString();}

// ═══════════════════════════════════════════════════════════════════
export default function BuddyChatScreen(){
  const navigate=useNavigate();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  const[mounted,setMounted]=useState(false);
  const[messages,setMessages]=useState(MOCK_MESSAGES);
  const[input,setInput]=useState("");
  const[copiedId,setCopiedId]=useState(null);
  const[activeMsg,setActiveMsg]=useState(null);
  const[showScroll,setShowScroll]=useState(false);
  const[menuOpen,setMenuOpen]=useState(false);
  const[panel,setPanel]=useState(null);
  const[searchQ,setSearchQ]=useState("");
  const[buddyTyping,setBuddyTyping]=useState(false);
  const[reactionPicker,setReactionPicker]=useState(null); // null or message id
  const[emojiOpen,setEmojiOpen]=useState(false);
  const endRef=useRef(null);const scrollRef=useRef(null);const inputRef=useRef(null);
  const longPressRef=useRef(null);
  const autoDismissRef=useRef(null);

  // Long-press handlers
  const handlePointerDown=(msgId)=>{
    longPressRef.current=setTimeout(()=>{setActiveMsg(msgId);longPressRef.current=null;},500);
  };
  const handlePointerUp=()=>{if(longPressRef.current){clearTimeout(longPressRef.current);longPressRef.current=null;}};
  // Auto-dismiss after 4s
  useEffect(()=>{
    if(autoDismissRef.current)clearTimeout(autoDismissRef.current);
    if(activeMsg){autoDismissRef.current=setTimeout(()=>setActiveMsg(null),4000);}
    return()=>{if(autoDismissRef.current)clearTimeout(autoDismissRef.current);};
  },[activeMsg]);

  const insertEmoji=(emoji)=>{setInput(prev=>prev+emoji);setEmojiOpen(false);inputRef.current?.focus();};
  useEffect(()=>{
    if(!emojiOpen)return;
    const handler=()=>setEmojiOpen(false);
    const t=setTimeout(()=>document.addEventListener("click",handler),0);
    return()=>{clearTimeout(t);document.removeEventListener("click",handler);};
  },[emojiOpen]);

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);
  useEffect(()=>{
    if(!reactionPicker)return;
    const handler=()=>setReactionPicker(null);
    const t=setTimeout(()=>document.addEventListener("click",handler),0);
    return()=>{clearTimeout(t);document.removeEventListener("click",handler);};
  },[reactionPicker]);
  useEffect(()=>{if(!panel)endRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  const handleScroll=()=>{if(!scrollRef.current)return;const{scrollTop,scrollHeight,clientHeight}=scrollRef.current;setShowScroll(scrollHeight-scrollTop-clientHeight>100);};

  const handleSend=()=>{
    const text=input.trim();if(!text)return;
    setMessages(prev=>[...prev,{id:Date.now()+"u",content:text,isUser:true,time:new Date(),pinned:false,liked:false,read:false,reactions:[]}]);
    setInput("");if(inputRef.current)inputRef.current.style.height="auto";
    // Simulate buddy typing + reply
    setBuddyTyping(true);
    setTimeout(()=>{
      setBuddyTyping(false);
      setMessages(prev=>{
        const updated=prev.map(m=>m.read===false?{...m,read:true}:m);
        return[...updated,{id:Date.now()+"b",content:"Sounds good! I'll check on that and get back to you 👍",isUser:false,time:new Date(),pinned:false,liked:false,read:true,reactions:[]}];
      });
    },2000);
  };

  const togglePin=(id)=>setMessages(p=>p.map(m=>m.id===id?{...m,pinned:!m.pinned}:m));
  const toggleLike=(id)=>setMessages(p=>p.map(m=>m.id===id?{...m,liked:!m.liked}:m));
  const handleCopy=(id,c)=>{navigator.clipboard?.writeText(c);setCopiedId(id);setTimeout(()=>setCopiedId(null),2000);};
  const handleInput=(e)=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";};
  const handleReaction=(msgId,emoji)=>{
    setMessages(prev=>prev.map(m=>{
      if(m.id!==msgId)return m;
      const reactions=[...(m.reactions||[])];
      const existing=reactions.findIndex(r=>r.emoji===emoji);
      if(existing>=0){reactions.splice(existing,1);}
      else{reactions.push({emoji,count:1});}
      return{...m,reactions};
    }));
    setReactionPicker(null);
  };

  const pinnedMsgs=messages.filter(m=>m.pinned);
  const likedMsgs=messages.filter(m=>m.liked);
  const searchedMsgs=searchQ?messages.filter(m=>m.content.toLowerCase().includes(searchQ.toLowerCase())):[];

  return(
    <div style={{width:"100%",height:"100vh",overflow:"hidden",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>

      {/* ═══ APP BAR ═══ */}
      <header style={{position:"relative",zIndex:100,flexShrink:0,background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{height:64,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button className="dp-ib" onClick={()=>navigate(-1)} aria-label="Go back"><ArrowLeft size={20} strokeWidth={2}/></button>
            {/* Buddy avatar */}
            <div style={{position:"relative"}}>
              <div style={{width:38,height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(20,184,166,0.15)",border:"1px solid rgba(20,184,166,0.25)",fontSize:16,fontWeight:700,color:isLight?"#0D9488":"#5EEAD4"}}>
                {BUDDY.initial}
              </div>
              {BUDDY.online&&<div style={{position:"absolute",bottom:-1,right:-1,width:10,height:10,borderRadius:"50%",background:"#5DE5A8",border:isLight?"2px solid #fff":"2px solid #0c081a",boxShadow:"0 0 6px rgba(93,229,168,0.5)"}}/>}
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{BUDDY.displayName}</div>
              <div style={{fontSize:12,color:BUDDY.online?(isLight?"#059669":"#5DE5A8"):isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{BUDDY.online?"Online":"Offline"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button className="dp-ib" aria-label="Call" onClick={()=>navigate("/voice-call/alex")}><Phone size={17} strokeWidth={2}/></button>
            <button className="dp-ib" aria-label="Video call" onClick={()=>navigate("/video-call/alex")}><Video size={17} strokeWidth={2}/></button>
            <div style={{position:"relative"}}>
              <button className="dp-ib" onClick={()=>setMenuOpen(!menuOpen)} aria-label="More options"><MoreVertical size={18} strokeWidth={2}/></button>
              {menuOpen&&(
                <div style={{position:"absolute",top:44,right:0,zIndex:200,background:isLight?"rgba(255,255,255,0.95)":"rgba(20,16,35,0.95)",backdropFilter:"blur(30px)",WebkitBackdropFilter:"blur(30px)",borderRadius:14,border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",boxShadow:"0 12px 40px rgba(0,0,0,0.5)",padding:6,minWidth:180,animation:"dpFS 0.15s ease-out"}}>
                  {[
                    {icon:Pin,label:"Pinned Messages",count:pinnedMsgs.length,act:()=>{setPanel("pinned");setMenuOpen(false);}},
                    {icon:Heart,label:"Liked Messages",count:likedMsgs.length,act:()=>{setPanel("liked");setMenuOpen(false);}},
                    {icon:Search,label:"Search Messages",count:null,act:()=>{setPanel("search");setMenuOpen(false);setSearchQ("");}},
                  ].map(({icon:I,label,count,act},i)=>(
                    <button key={i} onClick={act} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",background:"none",border:"none",borderRadius:10,cursor:"pointer",color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",fontSize:13,fontWeight:500,fontFamily:"inherit",transition:"background 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)"}
                      onMouseLeave={e=>e.currentTarget.style.background="none"}>
                      <I size={16} strokeWidth={2}/>{label}
                      {count!==null&&<span style={{marginLeft:"auto",fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",background:isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)",padding:"2px 7px",borderRadius:8}}>{count}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Shared dream banner */}
        <div style={{padding:"0 16px 10px",display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:10,background:"rgba(20,184,166,0.06)",border:"1px solid rgba(20,184,166,0.1)"}}>
            <Target size={13} color={isLight?"#0D9488":"#5EEAD4"} strokeWidth={2.5}/>
            <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>Shared dream:</span>
            <span style={{fontSize:12,fontWeight:600,color:isLight?"#0D9488":"#5EEAD4"}}>{BUDDY.mutualDream}</span>
          </div>
        </div>
      </header>

      {/* ═══ MESSAGES ═══ */}
      <div ref={scrollRef} onScroll={handleScroll} onClick={()=>setActiveMsg(null)} style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"12px 16px 80px",display:"flex",flexDirection:"column",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{maxWidth:560,margin:"0 auto",width:"100%",flex:1,display:"flex",flexDirection:"column"}}>
          {messages.length===0?(
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
              <div style={{width:80,height:80,borderRadius:24,margin:"0 auto 24px",background:"rgba(20,184,166,0.08)",border:"1px solid rgba(20,184,166,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Users size={36} color={isLight?"#0D9488":"#5EEAD4"} strokeWidth={1.5}/>
              </div>
              <div style={{fontSize:18,fontWeight:600,color:isLight?"#1a1535":"#fff",marginBottom:8}}>Start chatting with {BUDDY.displayName}!</div>
              <div style={{fontSize:14,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",lineHeight:1.5,maxWidth:300}}>You're both working towards "{BUDDY.mutualDream}"</div>
            </div>
          ):(
            <>
              <div style={{flex:1,minHeight:8}}/>
              {messages.map((msg,i)=>(
                <div key={msg.id}>
                  {showDate(messages,i)&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",margin:"16px 0 12px"}}>
                      <div style={{padding:"4px 14px",borderRadius:12,background:isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{dateLabel(msg.time)}</div>
                    </div>
                  )}
                  <BuddyBubble msg={msg} showActions={activeMsg===msg.id} copiedId={copiedId}
                    onPointerDown={()=>handlePointerDown(msg.id)} onPointerUp={handlePointerUp}
                    onCopy={()=>{handleCopy(msg.id,msg.content);setActiveMsg(null);}} onPin={()=>{togglePin(msg.id);setActiveMsg(null);}} onLike={()=>{toggleLike(msg.id);setActiveMsg(null);}}
                    reactionPicker={reactionPicker} setReactionPicker={setReactionPicker} handleReaction={handleReaction}/>
                </div>
              ))}
              {/* Buddy typing */}
              {buddyTyping&&(
                <div className="dp-mai" style={{display:"flex",gap:8,marginBottom:20,alignItems:"flex-end"}}>
                  <div style={{width:30,height:30,borderRadius:10,flexShrink:0,background:"rgba(20,184,166,0.12)",border:"1px solid rgba(20,184,166,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isLight?"#0D9488":"#5EEAD4"}}>{BUDDY.initial}</div>
                  <div style={{padding:"12px 16px",borderRadius:"18px 18px 18px 6px",background:"rgba(20,184,166,0.06)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",border:"1px solid rgba(20,184,166,0.1)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",fontStyle:"italic"}}>{BUDDY.displayName} is typing</span>
                      <span className="dp-dot dp-d1"/><span className="dp-dot dp-d2"/><span className="dp-dot dp-d3"/>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={endRef}/>
        </div>
      </div>

      {showScroll&&<button aria-label="Scroll to bottom" onClick={()=>endRef.current?.scrollIntoView({behavior:"smooth"})} style={{position:"fixed",bottom:162,left:"50%",transform:"translateX(-50%)",zIndex:50,width:36,height:36,borderRadius:"50%",border:isLight?"1px solid rgba(139,92,246,0.18)":"1px solid rgba(255,255,255,0.1)",background:isLight?"rgba(255,255,255,0.95)":"rgba(20,16,35,0.85)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",color:isLight?"#1a1535":"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}><ChevronDown size={18} strokeWidth={2}/></button>}

      {/* ═══ INPUT ═══ */}
      <div style={{position:"relative",zIndex:100,flexShrink:0,padding:"8px 12px 14px",background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderTop:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"flex-end",gap:8}}>
          <div style={{position:"relative"}}>
            <button className="dp-ib" style={{width:38,height:38,borderRadius:12,flexShrink:0,background:emojiOpen?(isLight?"rgba(139,92,246,0.12)":"rgba(255,255,255,0.1)"):undefined}} onClick={e=>{e.stopPropagation();setEmojiOpen(!emojiOpen);}} aria-label="Emoji"><Smile size={18} strokeWidth={2}/></button>
            {emojiOpen&&(
              <div onClick={e=>e.stopPropagation()} style={{position:"absolute",bottom:"100%",left:0,marginBottom:8,padding:10,background:isLight?"rgba(255,255,255,0.97)":"rgba(20,16,35,0.97)",backdropFilter:"blur(30px)",WebkitBackdropFilter:"blur(30px)",borderRadius:16,border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.08)",boxShadow:"0 8px 32px rgba(0,0,0,0.2)",display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,width:280,animation:"dpFadeScale 0.2s ease-out",zIndex:200}}>
                {['😀','😂','🥹','😍','🤩','😎','🥳','🤔','😅','😢','😤','🔥','💪','👏','❤️','💜','⭐','✨','🎯','🏆','🚀','💡','📝','🌟','👍','👎','🙏','🎉','💯','🌈','🍀','☕','🧠','💭','🎵','✅','🤝','💫','🌙','☀️','🦋','🌻'].map(emoji=>(
                  <button key={emoji} onClick={()=>insertEmoji(emoji)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,padding:6,borderRadius:8,transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=isLight?"rgba(139,92,246,0.1)":"rgba(255,255,255,0.08)";e.currentTarget.style.transform="scale(1.2)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.transform="scale(1)";}}
                  >{emoji}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{flex:1,display:"flex",alignItems:"flex-end",padding:"8px 14px",borderRadius:22,background:isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"}}>
            <textarea ref={inputRef} value={input} onChange={handleInput}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
              placeholder="Type a message..." rows={1}
              style={{flex:1,background:"none",border:"none",outline:"none",resize:"none",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",lineHeight:1.5,maxHeight:120,minHeight:20}}/>
          </div>
          <button aria-label="Send message" onClick={handleSend} disabled={!input.trim()} style={{width:42,height:42,borderRadius:14,border:"none",cursor:input.trim()?"pointer":"default",background:input.trim()?"linear-gradient(135deg,#14B8A6,#0D9488)":isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",flexShrink:0,boxShadow:input.trim()?"0 4px 16px rgba(20,184,166,0.35)":"none",transform:input.trim()?"scale(1)":"scale(0.9)",opacity:input.trim()?1:0.4}}>
            <Send size={18} strokeWidth={2} style={{transform:"translateX(1px)"}}/>
          </button>
        </div>
      </div>


      {/* ═══ PANELS ═══ */}
      {panel&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",flexDirection:"column"}}>
          <div onClick={()=>{setPanel(null);setSearchQ("");}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"absolute",top:0,right:0,bottom:0,width:"100%",maxWidth:420,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderLeft:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",animation:"dpSI 0.3s cubic-bezier(0.16,1,0.3,1)"}}>
            <div style={{height:64,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",borderBottom:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {panel==="pinned"&&<><Pin size={18} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Pinned Messages</span></>}
                {panel==="liked"&&<><Heart size={18} color={isLight?"#DC2626":"#F69A9A"} strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Liked Messages</span></>}
                {panel==="search"&&<><Search size={18} color={isLight?"#0D9488":"#5EEAD4"} strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Search</span></>}
              </div>
              <button className="dp-ib" onClick={()=>{setPanel(null);setSearchQ("");}} aria-label="Close"><X size={18} strokeWidth={2}/></button>
            </div>
            {panel==="search"&&(
              <div style={{padding:"12px 16px",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:14,background:"var(--dp-surface)",border:"1px solid var(--dp-input-border)"}}>
                  <Search size={16} color={isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"} strokeWidth={2}/>
                  <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search messages..." autoFocus style={{flex:1,background:"none",border:"none",outline:"none",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit"}}/>
                </div>
              </div>
            )}
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {panel==="pinned"&&(pinnedMsgs.length===0?<EmptyP icon={Pin} text="No pinned messages"/>:pinnedMsgs.map(m=><PanelMsg key={m.id} msg={m}/>))}
              {panel==="liked"&&(likedMsgs.length===0?<EmptyP icon={Heart} text="No liked messages"/>:likedMsgs.map(m=><PanelMsg key={m.id} msg={m}/>))}
              {panel==="search"&&(searchQ?searchedMsgs.length===0?<EmptyP icon={Search} text="No results"/>:searchedMsgs.map(m=><PanelMsg key={m.id} msg={m}/>):<div style={{textAlign:"center",paddingTop:40,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",fontSize:14}}>Type to search</div>)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        textarea::placeholder,input::placeholder{color:rgba(255,255,255,0.35);}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        .dp-mai{animation:dpMI 0.35s cubic-bezier(0.16,1,0.3,1) forwards;}
        @keyframes dpMI{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .dp-mu{animation:dpMU 0.35s cubic-bezier(0.16,1,0.3,1) forwards;}
        @keyframes dpMU{from{opacity:0;transform:translateX(12px);}to{opacity:1;transform:translateX(0);}}
        .dp-mb{animation:dpMB 0.35s cubic-bezier(0.16,1,0.3,1) forwards;}
        @keyframes dpMB{from{opacity:0;transform:translateX(-12px);}to{opacity:1;transform:translateX(0);}}
        .dp-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.5);animation:dpBn 1.4s ease-in-out infinite;display:inline-block;}
        .dp-d1{animation-delay:0s;}.dp-d2{animation-delay:0.2s;}.dp-d3{animation-delay:0.4s;}
        @keyframes dpBn{0%,80%,100%{transform:translateY(0);opacity:0.4;}40%{transform:translateY(-4px);opacity:1;}}
        .dp-acts{transition:all 0.2s cubic-bezier(0.16,1,0.3,1);}
        @keyframes dpFS{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
        @keyframes dpFadeScale{from{opacity:0;transform:scale(0.9);}to{opacity:1;transform:scale(1);}}
        @keyframes dpSI{from{transform:translateX(100%);}to{transform:translateX(0);}}
        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] .dp-conn{background:rgba(26,21,53,0.1) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
      `}</style>
    </div>
  );
}

// ─── BUDDY BUBBLE ────────────────────────────────────────────────
function BuddyBubble({msg,showActions,copiedId,onPointerDown,onPointerUp,onCopy,onPin,onLike,reactionPicker,setReactionPicker,handleReaction}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  const isCopied=copiedId===msg.id;
  const actionBar=(
    <div className="dp-acts" style={{
      display:"flex",gap:4,padding:"4px 6px",
      background:isLight?"rgba(255,255,255,0.95)":"rgba(20,16,35,0.95)",
      backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
      borderRadius:14,
      border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.08)",
      boxShadow:"0 4px 16px rgba(0,0,0,0.12)",
      position:"absolute",bottom:"100%",marginBottom:6,
      ...(msg.isUser?{right:0}:{left:0}),
      zIndex:20,
      opacity:showActions?1:0,
      transform:showActions?"scale(1) translateY(0)":"scale(0.9) translateY(4px)",
      pointerEvents:showActions?"auto":"none",
      transition:"all 0.2s cubic-bezier(0.16,1,0.3,1)",
    }}>
      {[
        {icon:Pin,active:msg.pinned,activeColor:isLight?"#7C3AED":"#C4B5FD",action:onPin,tip:"Pin"},
        {icon:Heart,active:msg.liked,activeColor:isLight?"#DC2626":"#F69A9A",action:onLike,tip:"Like"},
        {icon:isCopied?Check:Copy,active:isCopied,activeColor:isLight?"#059669":"#5DE5A8",action:onCopy,tip:"Copy"},
      ].map(({icon:I,active,activeColor,action,tip},j)=>(
        <button key={j} title={tip} aria-label={tip} onClick={e=>{e.stopPropagation();action();}} style={{
          width:32,height:32,borderRadius:10,border:"none",
          background:active?(isLight?"rgba(139,92,246,0.12)":"rgba(255,255,255,0.1)"):"transparent",
          color:active?activeColor:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.6)",
          display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
          transition:"all 0.15s ease",
        }}
          onMouseEnter={e=>{if(!active)e.currentTarget.style.background=isLight?"rgba(139,92,246,0.08)":"rgba(255,255,255,0.06)";}}
          onMouseLeave={e=>{if(!active)e.currentTarget.style.background="transparent";}}
        >
          <I size={15} strokeWidth={2.2} fill={active&&tip!=="Copy"?activeColor:"none"}/>
        </button>
      ))}
    </div>
  );

  if(msg.isUser){
    return(
      <div className="dp-mu dp-bw" style={{display:"flex",justifyContent:"flex-end",marginBottom:16,gap:8,alignItems:"flex-end"}} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",maxWidth:"75%"}}>
          <div style={{position:"relative",padding:"12px 16px",borderRadius:"18px 18px 6px 18px",background:isLight?"rgba(200,120,200,0.1)":"rgba(200,120,200,0.07)",backdropFilter:"blur(40px) saturate(1.3)",WebkitBackdropFilter:"blur(40px) saturate(1.3)",border:"1px solid rgba(220,140,220,0.12)",boxShadow:"0 2px 12px rgba(200,120,200,0.08),inset 0 1px 0 rgba(255,200,230,0.05)"}} onDoubleClick={()=>setReactionPicker(reactionPicker===msg.id?null:msg.id)}>
            {actionBar}
            {reactionPicker===msg.id&&(
              <div style={{
                display:"flex",gap:4,padding:"6px 10px",
                background:isLight?"rgba(255,255,255,0.9)":"rgba(20,15,40,0.9)",
                backdropFilter:"blur(20px)",
                borderRadius:20,
                border:`1px solid ${isLight?"rgba(139,92,246,0.15)":"rgba(255,255,255,0.1)"}`,
                boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
                animation:"dpFadeScale 0.2s ease-out",
                position:"absolute",
                bottom:"100%",
                right:0,
                marginBottom:6,
                zIndex:10,
              }}>
                {['👍','❤️','😂','😮','😢','🔥'].map(emoji=>(
                  <button key={emoji} onClick={(e)=>{e.stopPropagation();handleReaction(msg.id,emoji);}} style={{
                    background:"none",border:"none",cursor:"pointer",
                    fontSize:20,padding:"4px 6px",borderRadius:8,
                    transition:"transform 0.15s",
                  }}
                    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.3)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                  >{emoji}</button>
                ))}
              </div>
            )}
            <div style={{fontSize:14,color:isLight?"#1a1535":"#fff",lineHeight:1.55,whiteSpace:"pre-wrap"}}>{msg.content}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,marginTop:6}}>
              {msg.pinned&&<Pin size={10} color={isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"} strokeWidth={2.5}/>}
              {msg.liked&&<Heart size={10} color={isLight?"#DC2626":"#F69A9A"} strokeWidth={2.5} fill={isLight?"#DC2626":"#F69A9A"}/>}
              <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{formatTime(msg.time)}</span>
              {msg.read?<CheckCheck size={13} color={isLight?"#0D9488":"#5EEAD4"} strokeWidth={2}/>:<Check size={13} color={isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"} strokeWidth={2}/>}
            </div>
          </div>
          {msg.reactions&&msg.reactions.length>0&&(
            <div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-end"}}>
              {msg.reactions.map((r,i)=>(
                <span key={i} style={{
                  fontSize:14,padding:"2px 6px",
                  background:isLight?"rgba(139,92,246,0.1)":"rgba(139,92,246,0.2)",
                  borderRadius:10,cursor:"pointer",
                }} onClick={()=>handleReaction(msg.id,r.emoji)}>{r.emoji}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{width:30,height:30,borderRadius:10,flexShrink:0,background:"linear-gradient(135deg,rgba(200,120,200,0.2),rgba(160,80,200,0.2))",border:"1px solid rgba(200,140,220,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{ME.initial}</div>
      </div>
    );
  }

  return(
    <div className="dp-mb dp-bw" style={{display:"flex",gap:8,marginBottom:16,alignItems:"flex-end"}} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
      <div style={{width:30,height:30,borderRadius:10,flexShrink:0,background:"rgba(20,184,166,0.12)",border:"1px solid rgba(20,184,166,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isLight?"#0D9488":"#5EEAD4"}}>{BUDDY.initial}</div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",maxWidth:"75%"}}>
        <div style={{position:"relative",padding:"12px 16px",borderRadius:"18px 18px 18px 6px",background:isLight?"rgba(255,255,255,0.72)":"rgba(20,184,166,0.06)",backdropFilter:"blur(40px) saturate(1.3)",WebkitBackdropFilter:"blur(40px) saturate(1.3)",border:"1px solid rgba(20,184,166,0.1)",boxShadow:"0 2px 12px rgba(20,184,166,0.06),inset 0 1px 0 rgba(94,234,212,0.04)"}} onDoubleClick={()=>setReactionPicker(reactionPicker===msg.id?null:msg.id)}>
          {actionBar}
          {reactionPicker===msg.id&&(
            <div style={{
              display:"flex",gap:4,padding:"6px 10px",
              background:isLight?"rgba(255,255,255,0.9)":"rgba(20,15,40,0.9)",
              backdropFilter:"blur(20px)",
              borderRadius:20,
              border:`1px solid ${isLight?"rgba(139,92,246,0.15)":"rgba(255,255,255,0.1)"}`,
              boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
              animation:"dpFadeScale 0.2s ease-out",
              position:"absolute",
              bottom:"100%",
              left:0,
              marginBottom:6,
              zIndex:10,
            }}>
              {['👍','❤️','😂','😮','😢','🔥'].map(emoji=>(
                <button key={emoji} onClick={(e)=>{e.stopPropagation();handleReaction(msg.id,emoji);}} style={{
                  background:"none",border:"none",cursor:"pointer",
                  fontSize:20,padding:"4px 6px",borderRadius:8,
                  transition:"transform 0.15s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.transform="scale(1.3)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                >{emoji}</button>
              ))}
            </div>
          )}
          <div style={{fontSize:14,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.9)",lineHeight:1.55,whiteSpace:"pre-wrap"}}>{msg.content}</div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:6}}>
            {msg.pinned&&<Pin size={10} color={isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"} strokeWidth={2.5}/>}
            {msg.liked&&<Heart size={10} color={isLight?"#DC2626":"#F69A9A"} strokeWidth={2.5} fill={isLight?"#DC2626":"#F69A9A"}/>}
            <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{formatTime(msg.time)}</span>
          </div>
        </div>
        {msg.reactions&&msg.reactions.length>0&&(
          <div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-start"}}>
            {msg.reactions.map((r,i)=>(
              <span key={i} style={{
                fontSize:14,padding:"2px 6px",
                background:isLight?"rgba(139,92,246,0.1)":"rgba(139,92,246,0.2)",
                borderRadius:10,cursor:"pointer",
              }} onClick={()=>handleReaction(msg.id,r.emoji)}>{r.emoji}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PANEL MSG ───────────────────────────────────────────────────
function PanelMsg({msg}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  return(
    <div style={{padding:12,marginBottom:8,borderRadius:14,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        {msg.isUser?(
          <div style={{width:22,height:22,borderRadius:7,background:"rgba(200,120,200,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{ME.initial}</div>
        ):(
          <div style={{width:22,height:22,borderRadius:7,background:"rgba(20,184,166,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isLight?"#0D9488":"#5EEAD4"}}>{BUDDY.initial}</div>
        )}
        <span style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{msg.isUser?"You":BUDDY.displayName}</span>
        <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",marginLeft:"auto"}}>{formatTime(msg.time)}</span>
      </div>
      <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{msg.content}</div>
    </div>
  );
}

function EmptyP({icon:I,text}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  return(<div style={{textAlign:"center",paddingTop:60}}>
    <div style={{width:56,height:56,borderRadius:16,margin:"0 auto 16px",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center"}}><I size={24} color={isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"} strokeWidth={1.5}/></div>
    <div style={{fontSize:14,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{text}</div>
  </div>);
}
