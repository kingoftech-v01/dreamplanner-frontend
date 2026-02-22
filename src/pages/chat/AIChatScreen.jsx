import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import DOMPurify from "dompurify";
import {
  ArrowLeft, Bot, Sparkles, RotateCw, Copy, Check,
  Send, ChevronDown, MoreVertical, Pin, Heart, Search,
  X, MessageCircle, Smile
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — AI Chat Screen v3
 * 
 * Changes from v2:
 * - User avatar (initial) on user messages
 * - User bubbles: liquid glass with pink-violet tint (not solid gradient)
 * - AI avatar on AI messages
 * - WhatsApp-style date separators ("Today", "Yesterday", etc.)
 * - 3-dot menu in appbar: Pinned Messages, Liked Messages, Search
 * - Message actions on hover: Pin, Like, Copy (3 small buttons)
 * - Pinned messages slide panel
 * - Liked messages slide panel
 * - Search messages panel with filtering
 * - All 9:1+ contrast
 * ═══════════════════════════════════════════════════════════════════ */

// ─── MOCK DATA ───────────────────────────────────────────────────
const MOCK_USER = { displayName:"Stephane", initial:"S" };

const MOCK_MESSAGES = [
  { id:"1", content:"Hi! I want to make progress on my SaaS platform today. What should I focus on?", isUser:true, time:new Date(Date.now()-1000*60*60*25), pinned:false, liked:false, reactions:[] },
  { id:"2", content:"Great to see you motivated! Based on your current progress, you've completed the authentication system and the database models. I'd recommend focusing on these two areas today:\n\n1. **API Endpoints** — You have 3 remaining endpoints for the user management module. These are critical for the frontend integration.\n\n2. **Testing** — Write unit tests for the auth flow you completed yesterday. This will save you debugging time later.\n\nWhich one would you like to start with?", isUser:false, time:new Date(Date.now()-1000*60*60*25+60000), pinned:true, liked:true, reactions:[] },
  { id:"3", content:"Let's go with the API endpoints first. Can you help me plan the structure?", isUser:true, time:new Date(Date.now()-1000*60*15), pinned:false, liked:false, reactions:[] },
  { id:"4", content:"Here's a solid structure for your user management endpoints:\n\n**GET /api/users/** — List users with pagination and filtering\n**POST /api/users/** — Create new user with validation\n**GET /api/users/:id/** — Retrieve user detail\n**PATCH /api/users/:id/** — Update user fields\n**DELETE /api/users/:id/** — Soft delete user\n\nFor each endpoint, you'll want to implement:\n- Serializer validation\n- Permission checks (is_admin vs is_owner)\n- Proper error responses\n\nShall I help you with the serializer code first?", isUser:false, time:new Date(Date.now()-1000*60*14), pinned:true, liked:false, reactions:[] },
  { id:"5", content:"Yes please! Start with the user list serializer and the create endpoint. I want proper validation.", isUser:true, time:new Date(Date.now()-1000*60*10), pinned:false, liked:false, reactions:[] },
  { id:"6", content:"Here's the serializer for the user list and create:\n\n**UserSerializer** handles both read and write. For create, it validates:\n- Email uniqueness\n- Password strength (min 8 chars, mixed case, number)\n- Required fields (first_name, last_name)\n\nThe list endpoint uses **pagination** with cursor-based navigation for performance at scale. I've also added **filtering** by role, status, and date joined.\n\nWant me to also include the permission classes?", isUser:false, time:new Date(Date.now()-1000*60*8), pinned:false, liked:true, reactions:[] },
];

const SUGGESTIONS = [
  "Help me plan my goals",
  "What should I focus on today?",
  "I need motivation",
  "Review my progress",
];

// ─── HELPERS ─────────────────────────────────────────────────────
function formatTime(d){return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
function formatMarkdown(text,isLight){
  return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.*?)\*\*/g,`<strong style="color:${isLight?'#1a1535':'#fff'};font-weight:600">$1</strong>`)
    .replace(/\n/g,"<br/>");
}
function getDateLabel(date){
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const msgDay=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  const diff=Math.floor((today-msgDay)/(1000*60*60*24));
  if(diff===0) return "Today";
  if(diff===1) return "Yesterday";
  if(diff<7) return date.toLocaleDateString([],{weekday:'long'});
  return date.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});
}
function shouldShowDate(msgs,i){
  if(i===0)return true;
  const prev=msgs[i-1].time,curr=msgs[i].time;
  return prev.toDateString()!==curr.toDateString();
}

// ═══════════════════════════════════════════════════════════════════
export default function AIChatScreen(){
  const navigate=useNavigate();
  const location=useLocation();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  const[mounted,setMounted]=useState(false);
  const[messages,setMessages]=useState(()=>{
    if(location.state?.initialMessage&&typeof location.state.initialMessage==="string"){
      var msg=location.state.initialMessage.trim().slice(0,5000);
      if(msg)return[{id:"new-1",content:msg,isUser:true,time:new Date(),pinned:false,liked:false,reactions:[]}];
    }
    return MOCK_MESSAGES;
  });
  const[input,setInput]=useState("");
  const[isStreaming,setIsStreaming]=useState(false);
  const[copiedId,setCopiedId]=useState(null);
  const[activeMsg,setActiveMsg]=useState(null);
  const[showScroll,setShowScroll]=useState(false);
  const[menuOpen,setMenuOpen]=useState(false);
  const[panel,setPanel]=useState(null); // 'pinned' | 'liked' | 'search' | null
  const[searchQ,setSearchQ]=useState("");
  const[reactionPicker,setReactionPicker]=useState(null); // null or message id
  const[emojiOpen,setEmojiOpen]=useState(false);
  const messagesEndRef=useRef(null);
  const scrollRef=useRef(null);
  const inputRef=useRef(null);
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
  useEffect(()=>{if(!panel)messagesEndRef.current?.scrollIntoView({behavior:"smooth"});},[messages,isStreaming]);
  useEffect(()=>{setTimeout(()=>messagesEndRef.current?.scrollIntoView({behavior:"smooth"}),200);},[]);

  const handleScroll=()=>{if(!scrollRef.current)return;const{scrollTop,scrollHeight,clientHeight}=scrollRef.current;setShowScroll(scrollHeight-scrollTop-clientHeight>100);};

  const handleSend=()=>{
    const text=input.trim();if(!text)return;
    setMessages(prev=>[...prev,{id:Date.now()+"u",content:text,isUser:true,time:new Date(),pinned:false,liked:false,reactions:[]}]);
    setInput("");if(inputRef.current)inputRef.current.style.height="auto";
    setIsStreaming(true);
    setTimeout(()=>{setIsStreaming(false);setMessages(prev=>[...prev,{id:Date.now()+"a",isUser:false,time:new Date(),pinned:false,liked:false,reactions:[],content:"That's a great question! Let me think about the best approach for this. Based on your progress so far, I'd suggest breaking this down into smaller tasks. Would you like me to create a specific plan?"}]);},2500);
  };

  const togglePin=(id)=>setMessages(prev=>prev.map(m=>m.id===id?{...m,pinned:!m.pinned}:m));
  const toggleLike=(id)=>setMessages(prev=>prev.map(m=>m.id===id?{...m,liked:!m.liked}:m));
  const handleCopy=(id,content)=>{navigator.clipboard?.writeText(content);setCopiedId(id);setTimeout(()=>setCopiedId(null),2000);};
  const handleInputChange=(e)=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";};
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

  const isEmpty=messages.length===0;

  return(
    <div style={{width:"100%",height:"100vh",overflow:"hidden",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>

      {/* ═══ APP BAR ═══ */}
      <header style={{position:"relative",zIndex:100,height:64,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="dp-ib" onClick={()=>navigate(-1)} aria-label="Go back"><ArrowLeft size={20} strokeWidth={2}/></button>
          <div style={{width:36,height:36,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.2)"}}>
            <Bot size={18} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/>
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>AI Coach</div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div className="dp-conn" style={{width:6,height:6,borderRadius:"50%",background:"#5DE5A8",boxShadow:"0 0 6px rgba(93,229,168,0.5)"}}/>
              <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>Connected</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button className="dp-ib" aria-label="Reset conversation"><RotateCw size={17} strokeWidth={2}/></button>
          <div style={{position:"relative"}}>
            <button className="dp-ib" onClick={()=>setMenuOpen(!menuOpen)} aria-label="More options"><MoreVertical size={18} strokeWidth={2}/></button>
            {menuOpen&&(
              <div style={{position:"absolute",top:44,right:0,zIndex:200,background:isLight?"rgba(255,255,255,0.95)":"rgba(20,16,35,0.95)",backdropFilter:"blur(30px)",WebkitBackdropFilter:"blur(30px)",borderRadius:14,border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",boxShadow:"0 12px 40px rgba(0,0,0,0.5)",padding:6,minWidth:180,animation:"dpFS 0.15s ease-out"}}>
                {[
                  {icon:Pin,label:"Pinned Messages",count:pinnedMsgs.length,action:()=>{setPanel("pinned");setMenuOpen(false);}},
                  {icon:Heart,label:"Liked Messages",count:likedMsgs.length,action:()=>{setPanel("liked");setMenuOpen(false);}},
                  {icon:Search,label:"Search Messages",count:null,action:()=>{setPanel("search");setMenuOpen(false);setSearchQ("");}},
                ].map(({icon:I,label,count,action},i)=>(
                  <button key={i} onClick={action} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",background:"none",border:"none",borderRadius:10,cursor:"pointer",color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",fontSize:13,fontWeight:500,fontFamily:"inherit",transition:"background 0.15s"}}
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
      </header>

      {/* ═══ MESSAGES AREA ═══ */}
      <div ref={scrollRef} onScroll={handleScroll} onClick={()=>setActiveMsg(null)} style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"12px 16px 80px",display:"flex",flexDirection:"column",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{maxWidth:560,margin:"0 auto",width:"100%",flex:1,display:"flex",flexDirection:"column"}}>
          {isEmpty&&!isStreaming?(
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",animationDelay:"0ms"}}>
              <div style={{width:80,height:80,borderRadius:24,margin:"0 auto 24px",background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Sparkles size={36} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={1.5}/>
              </div>
              <div style={{fontSize:18,fontWeight:600,color:isLight?"#1a1535":"#fff",marginBottom:8}}>Start a conversation</div>
              <div style={{fontSize:14,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",lineHeight:1.5,maxWidth:300}}>Your AI coach is ready to help you achieve your dreams</div>
            </div>
          ):(
            <>
              <div style={{flex:1,minHeight:8}}/>
              {messages.map((msg,i)=>(
                <div key={msg.id}>
                  {/* Date separator */}
                  {shouldShowDate(messages,i)&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",margin:"16px 0 12px"}}>
                      <div style={{padding:"4px 14px",borderRadius:12,background:isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{getDateLabel(msg.time)}</div>
                    </div>
                  )}
                  <MsgBubble msg={msg} showActions={activeMsg===msg.id} copiedId={copiedId}
                    onPointerDown={()=>handlePointerDown(msg.id)} onPointerUp={handlePointerUp}
                    onCopy={()=>{handleCopy(msg.id,msg.content);setActiveMsg(null);}} onPin={()=>{togglePin(msg.id);setActiveMsg(null);}} onLike={()=>{toggleLike(msg.id);setActiveMsg(null);}}
                    reactionPicker={reactionPicker} setReactionPicker={setReactionPicker} handleReaction={handleReaction}/>
                </div>
              ))}
              {isStreaming&&(
                <div className="dp-mai" style={{display:"flex",gap:10,marginBottom:20,alignItems:"flex-end"}}>
                  <div style={{width:30,height:30,borderRadius:10,flexShrink:0,background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Bot size={16} color={isLight?"#6D28D9":"#C4B5FD"} strokeWidth={2}/>
                  </div>
                  <div style={{padding:"14px 18px",borderRadius:"18px 18px 18px 6px",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",display:"flex",gap:4,alignItems:"center"}}>
                    <span className="dp-dot dp-d1"/><span className="dp-dot dp-d2"/><span className="dp-dot dp-d3"/>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef}/>
        </div>
      </div>

      {/* Scroll to bottom */}
      {showScroll&&<button aria-label="Scroll to bottom" onClick={()=>messagesEndRef.current?.scrollIntoView({behavior:"smooth"})} style={{position:"fixed",bottom:162,left:"50%",transform:"translateX(-50%)",zIndex:50,width:36,height:36,borderRadius:"50%",border:isLight?"1px solid rgba(139,92,246,0.18)":"1px solid rgba(255,255,255,0.1)",background:isLight?"rgba(255,255,255,0.95)":"rgba(20,16,35,0.85)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",color:isLight?"#1a1535":"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}><ChevronDown size={18} strokeWidth={2}/></button>}

      {/* ═══ SUGGESTION CHIPS ═══ */}
      {isEmpty&&!isStreaming&&(
        <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"200ms",zIndex:10,padding:"0 16px 8px"}}>
          <div style={{maxWidth:560,margin:"0 auto",display:"flex",flexWrap:"wrap",gap:8}}>
            {SUGGESTIONS.map((s,i)=>(
              <button key={i} onClick={()=>{setInput(s);}} style={{padding:"9px 16px",borderRadius:20,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.08)",color:isLight?"#7C3AED":"#C4B5FD",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",whiteSpace:"nowrap",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(139,92,246,0.18)";e.currentTarget.style.borderColor="rgba(139,92,246,0.35)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(139,92,246,0.08)";e.currentTarget.style.borderColor="rgba(139,92,246,0.2)";}}
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ INPUT BAR ═══ */}
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
          <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:8,padding:"8px 14px",borderRadius:22,background:isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)"}}>
            <textarea ref={inputRef} value={input} onChange={handleInputChange}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
              placeholder="Type a message..." rows={1}
              style={{flex:1,background:"none",border:"none",outline:"none",resize:"none",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit",lineHeight:1.5,maxHeight:120,minHeight:20}}/>
          </div>
          <button aria-label="Send message" onClick={handleSend} disabled={!input.trim()} style={{width:44,height:44,borderRadius:14,border:"none",cursor:input.trim()?"pointer":"default",background:input.trim()?"linear-gradient(135deg,#8B5CF6,#6D28D9)":isLight?"rgba(139,92,246,0.1)":"rgba(255,255,255,0.05)",color:input.trim()?"#fff":(isLight?"rgba(139,92,246,0.3)":"rgba(255,255,255,0.3)"),display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",flexShrink:0,boxShadow:input.trim()?"0 4px 16px rgba(139,92,246,0.35)":"none",transform:input.trim()?"scale(1)":"scale(0.9)",opacity:input.trim()?1:0.4}}>
            <Send size={18} strokeWidth={2} style={{transform:"translateX(1px)"}}/>
          </button>
        </div>
      </div>


      {/* ═══ SLIDE PANELS (Pinned / Liked / Search) ═══ */}
      {panel&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",flexDirection:"column"}}>
          {/* Backdrop */}
          <div onClick={()=>{setPanel(null);setSearchQ("");}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          {/* Panel */}
          <div style={{position:"absolute",top:0,right:0,bottom:0,width:"100%",maxWidth:420,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderLeft:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",animation:"dpSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)"}}>
            {/* Panel header */}
            <div style={{height:64,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",borderBottom:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {panel==="pinned"&&<><Pin size={18} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Pinned Messages</span></>}
                {panel==="liked"&&<><Heart size={18} color={isLight?"#DC2626":"#F69A9A"} strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Liked Messages</span></>}
                {panel==="search"&&<><Search size={18} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>Search</span></>}
              </div>
              <button className="dp-ib" onClick={()=>{setPanel(null);setSearchQ("");}} aria-label="Close"><X size={18} strokeWidth={2}/></button>
            </div>
            {/* Search input */}
            {panel==="search"&&(
              <div style={{padding:"12px 16px",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:14,background:"var(--dp-surface)",border:"1px solid var(--dp-input-border)"}}>
                  <Search size={16} color={isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"} strokeWidth={2}/>
                  <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search messages..." autoFocus
                    style={{flex:1,background:"none",border:"none",outline:"none",color:isLight?"#1a1535":"#fff",fontSize:14,fontFamily:"inherit"}}/>
                </div>
              </div>
            )}
            {/* Panel content */}
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {panel==="pinned"&&(pinnedMsgs.length===0?<EmptyPanel icon={Pin} text="No pinned messages"/>:pinnedMsgs.map(m=><PanelMsg key={m.id} msg={m}/>))}
              {panel==="liked"&&(likedMsgs.length===0?<EmptyPanel icon={Heart} text="No liked messages"/>:likedMsgs.map(m=><PanelMsg key={m.id} msg={m}/>))}
              {panel==="search"&&(searchQ?searchedMsgs.length===0?<EmptyPanel icon={Search} text="No results found"/>:searchedMsgs.map(m=><PanelMsg key={m.id} msg={m}/>):<div style={{textAlign:"center",paddingTop:40,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",fontSize:14}}>Type to search messages</div>)}
            </div>
          </div>
        </div>
      )}

      {/* ═══ STYLES ═══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        ::-webkit-scrollbar{width:0;}
        textarea::placeholder,input::placeholder{color:rgba(255,255,255,0.35);}

        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}

        .dp-mai{animation:dpMI 0.35s cubic-bezier(0.16,1,0.3,1) forwards;}
        @keyframes dpMI{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .dp-mu{animation:dpMU 0.35s cubic-bezier(0.16,1,0.3,1) forwards;}
        @keyframes dpMU{from{opacity:0;transform:translateX(12px);}to{opacity:1;transform:translateX(0);}}
        .dp-ma{animation:dpMA 0.35s cubic-bezier(0.16,1,0.3,1) forwards;}
        @keyframes dpMA{from{opacity:0;transform:translateX(-12px);}to{opacity:1;transform:translateX(0);}}

        .dp-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.5);animation:dpB 1.4s ease-in-out infinite;}
        .dp-d1{animation-delay:0s;}.dp-d2{animation-delay:0.2s;}.dp-d3{animation-delay:0.4s;}
        @keyframes dpB{0%,80%,100%{transform:translateY(0);opacity:0.4;}40%{transform:translateY(-6px);opacity:1;}}

        .dp-conn{animation:dpCP 2s ease-in-out infinite;}
        @keyframes dpCP{0%,100%{box-shadow:0 0 6px rgba(93,229,168,0.5);}50%{box-shadow:0 0 10px rgba(93,229,168,0.3);}}

        .dp-actions{transition:all 0.2s cubic-bezier(0.16,1,0.3,1);}

        @keyframes dpFS{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
        @keyframes dpFadeScale{from{opacity:0;transform:scale(0.9);}to{opacity:1;transform:scale(1);}}
        @keyframes dpSlideIn{from{transform:translateX(100%);}to{transform:translateX(0);}}

        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] .dp-conn{background:rgba(26,21,53,0.1) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
      `}</style>
    </div>
  );
}

// ─── MESSAGE BUBBLE ──────────────────────────────────────────────
function MsgBubble({msg,showActions,copiedId,onPointerDown,onPointerUp,onCopy,onPin,onLike,reactionPicker,setReactionPicker,handleReaction}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  const isCopied=copiedId===msg.id;

  const actionBar=(
    <div className="dp-actions" style={{
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
          <div style={{
            position:"relative",
            padding:"12px 16px",borderRadius:"18px 18px 6px 18px",
            background:isLight?"rgba(200,120,200,0.1)":"rgba(200,120,200,0.07)",
            backdropFilter:"blur(40px) saturate(1.3)",WebkitBackdropFilter:"blur(40px) saturate(1.3)",
            border:"1px solid rgba(220,140,220,0.12)",
            boxShadow:"0 2px 12px rgba(200,120,200,0.08),inset 0 1px 0 rgba(255,200,230,0.05)",
          }} onDoubleClick={()=>setReactionPicker(reactionPicker===msg.id?null:msg.id)}>
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
            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,marginTop:6}}>
              {msg.pinned&&<Pin size={10} color={isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"} strokeWidth={2.5}/>}
              {msg.liked&&<Heart size={10} color={isLight?"#DC2626":"#F69A9A"} strokeWidth={2.5} fill={isLight?"#DC2626":"#F69A9A"}/>}
              <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{formatTime(msg.time)}</span>
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
        {/* User avatar */}
        <div style={{width:30,height:30,borderRadius:10,flexShrink:0,background:"linear-gradient(135deg,rgba(200,120,200,0.2),rgba(160,80,200,0.2))",border:"1px solid rgba(200,140,220,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>
          {MOCK_USER.initial}
        </div>
      </div>
    );
  }

  return(
    <div className="dp-ma dp-bw" style={{display:"flex",gap:8,marginBottom:16,alignItems:"flex-end"}} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
      {/* AI Avatar */}
      <div style={{width:30,height:30,borderRadius:10,flexShrink:0,background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.15)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 12px rgba(139,92,246,0.1)"}}>
        <Bot size={16} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",maxWidth:"75%"}}>
        <div style={{position:"relative",padding:"12px 16px",borderRadius:"18px 18px 18px 6px",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",backdropFilter:"blur(40px) saturate(1.3)",WebkitBackdropFilter:"blur(40px) saturate(1.3)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",boxShadow:"0 2px 12px rgba(0,0,0,0.1),inset 0 1px 0 rgba(255,255,255,0.03)"}} onDoubleClick={()=>setReactionPicker(reactionPicker===msg.id?null:msg.id)}>
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
          <div style={{fontSize:14,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.9)",lineHeight:1.6,whiteSpace:"pre-wrap"}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(formatMarkdown(msg.content,isLight))}}/>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
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

// ─── PANEL MESSAGE CARD ──────────────────────────────────────────
function PanelMsg({msg}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  return(
    <div style={{padding:12,marginBottom:8,borderRadius:14,background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        {msg.isUser?(
          <div style={{width:22,height:22,borderRadius:7,background:"rgba(200,120,200,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{MOCK_USER.initial}</div>
        ):(
          <div style={{width:22,height:22,borderRadius:7,background:"rgba(139,92,246,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}><Bot size={12} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={2}/></div>
        )}
        <span style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{msg.isUser?"You":"AI Coach"}</span>
        <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)",marginLeft:"auto"}}>{formatTime(msg.time)}</span>
      </div>
      <div style={{fontSize:13,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.85)",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{msg.content.replace(/\*\*/g,"")}</div>
    </div>
  );
}

// ─── EMPTY PANEL STATE ───────────────────────────────────────────
function EmptyPanel({icon:I,text}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  return(
    <div style={{textAlign:"center",paddingTop:60}}>
      <div style={{width:56,height:56,borderRadius:16,margin:"0 auto 16px",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <I size={24} color={isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"} strokeWidth={1.5}/>
      </div>
      <div style={{fontSize:14,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{text}</div>
    </div>
  );
}

const MOCK_USER_REF = MOCK_USER; // for PanelMsg access
