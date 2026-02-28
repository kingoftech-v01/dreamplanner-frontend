import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { joinRTMChannel } from "../../services/agora";
import { CIRCLES, CONVERSATIONS } from "../../services/endpoints";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { clipboardWrite } from "../../services/native";
import { sanitizeText } from "../../utils/sanitize";
import ErrorState from "../../components/shared/ErrorState";
import {
  ArrowLeft, Users, Send, ChevronDown, MoreVertical,
  Copy, Check, Search, X, Phone, Video,
  Smile, Loader, MessageCircle
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
 * DreamPlanner — Circle Chat Screen
 *
 * Real-time group chat for circles using Agora RTM.
 * Dual-write: RTM for instant delivery + REST for DB persistence.
 * ═══════════════════════════════════════════════════════════════ */

var MEMBER_COLORS = ["#8B5CF6","#14B8A6","#EC4899","#3B82F6","#F59E0B","#10B981","#6366F1","#F97316"];

function formatTime(d){return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
function dateLabel(d){const now=new Date(),td=new Date(now.getFullYear(),now.getMonth(),now.getDate()),md=new Date(d.getFullYear(),d.getMonth(),d.getDate()),diff=Math.floor((td-md)/(864e5));if(!diff)return"Today";if(diff===1)return"Yesterday";if(diff<7)return d.toLocaleDateString([],{weekday:'long'});return d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});}
function showDate(msgs,i){if(!i)return true;return msgs[i-1].time.toDateString()!==msgs[i].time.toDateString();}
function getMemberColor(id){return MEMBER_COLORS[Math.abs(hashCode(String(id||"")))%MEMBER_COLORS.length];}
function hashCode(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return h;}

export default function CircleChatScreen(){
  var navigate=useNavigate();
  var{resolved,uiOpacity}=useTheme();var isLight=resolved==="light";
  var{id}=useParams();
  var{user}=useAuth();
  var{showToast}=useToast();
  var queryClient=useQueryClient();
  var userInitial=(user?.displayName||user?.username||"?")[0].toUpperCase();

  // ─── Circle info ─────────────────────────────────────────────
  var circleQuery=useQuery({
    queryKey:["circle",id],
    queryFn:function(){return apiGet(CIRCLES.DETAIL(id));},
    enabled:!!id,
  });
  var circle=circleQuery.data||{};
  var circleName=circle.name||"Circle";
  var memberCount=(circle.members&&circle.members.length)||circle.memberCount||0;

  // Build a members lookup map for sender info
  var membersMap=useRef({});
  useEffect(function(){
    if(circle.members){
      var map={};
      circle.members.forEach(function(m){
        var u=m.user||m;
        map[String(u.id)]={name:u.displayName||u.username||u.name||"Member",initial:(u.displayName||u.username||u.name||"M")[0].toUpperCase()};
      });
      membersMap.current=map;
    }
  },[circle.members]);

  function getSenderInfo(senderId){
    var m=membersMap.current[String(senderId)];
    if(m)return m;
    return{name:"Member",initial:"M"};
  }

  // ─── Messages state ──────────────────────────────────────────
  var PAGE_SIZE=50;
  var[mounted,setMounted]=useState(false);
  var[messages,setMessages]=useState([]);
  var[hasMore,setHasMore]=useState(false);
  var[loadingMore,setLoadingMore]=useState(false);
  var[nextOffset,setNextOffset]=useState(0);
  var[input,setInput]=useState("");
  var[copiedId,setCopiedId]=useState(null);
  var[showScroll,setShowScroll]=useState(false);
  var[typingUsers,setTypingUsers]=useState([]);
  var[emojiOpen,setEmojiOpen]=useState(false);
  var[initLoading,setInitLoading]=useState(true);
  var endRef=useRef(null);var scrollRef=useRef(null);var inputRef=useRef(null);
  var rtmChannelRef=useRef(null);

  function mapCircleMsg(m){
    var sender=m.sender||m.user||{};
    var sid=String(sender.id||m.senderId||m.sender_id||"");
    return{
      id:String(m.id),
      content:m.content||m.text||"",
      senderId:sid,
      senderName:sender.displayName||sender.username||sender.name||(getSenderInfo(sid).name),
      senderInitial:(sender.displayName||sender.username||sender.name||(getSenderInfo(sid).name))[0].toUpperCase(),
      senderColor:getMemberColor(sid),
      isUser:sid===String(user?.id),
      time:new Date(m.createdAt||m.created_at||m.timestamp||Date.now()),
    };
  }

  // ─── Fetch initial messages ──────────────────────────────────
  useEffect(function(){
    if(!id)return;
    setInitLoading(true);
    apiGet(CIRCLES.CHAT(id)+"?limit="+PAGE_SIZE).then(function(raw){
      var list=raw.results||raw||[];
      setMessages(list.map(mapCircleMsg));
      setNextOffset(list.length);
      setHasMore(!!raw.next);
      setInitLoading(false);
    }).catch(function(){
      setInitLoading(false);
    });
  },[id]);

  function loadOlderMessages(){
    if(loadingMore||!hasMore||!id)return;
    setLoadingMore(true);
    apiGet(CIRCLES.CHAT(id)+"?limit="+PAGE_SIZE+"&offset="+nextOffset)
      .then(function(raw){
        var list=raw.results||raw||[];
        if(list.length>0){
          setMessages(function(prev){return list.map(mapCircleMsg).concat(prev);});
          setNextOffset(function(prev){return prev+list.length;});
        }
        setHasMore(!!raw.next);
      })
      .catch(function(){})
      .finally(function(){setLoadingMore(false);});
  }

  // ─── Agora RTM for real-time group chat (instantaneous) ──────
  var typingTimersRef=useRef({});
  var rtmJoinAttemptRef=useRef(0);
  useEffect(function(){
    if(!id)return;
    var cancelled=false;
    var rtmHandle=null;
    var retryTimer=null;

    function attemptJoin(){
      if(cancelled)return;
      joinRTMChannel("circle-"+id,{
        onMessage:function(parsed,memberId){
          if(cancelled)return;
          // Skip own messages (already added optimistically)
          if(parsed.senderId&&String(parsed.senderId)===String(user?.id))return;
          setMessages(function(prev){
            // Deduplicate
            var isDupe=prev.some(function(m){return !m.isUser&&m.content===parsed.content&&Math.abs((m.time?m.time.getTime():0)-(parsed.ts||0))<2000;});
            if(isDupe)return prev;
            var senderInfo=getSenderInfo(parsed.senderId);
            return[...prev,{
              id:Date.now()+"r",
              content:parsed.content,
              senderId:String(parsed.senderId||memberId),
              senderName:parsed.senderName||senderInfo.name,
              senderInitial:(parsed.senderName||senderInfo.name)[0].toUpperCase(),
              senderColor:getMemberColor(parsed.senderId||memberId),
              isUser:false,
              time:new Date(parsed.ts||Date.now()),
            }];
          });
          // Clear typing for this sender
          setTypingUsers(function(prev){return prev.filter(function(t){return t.id!==String(parsed.senderId||memberId);});});
          // Refresh from DB
          apiGet(CIRCLES.CHAT(id)+"?limit="+PAGE_SIZE).then(function(raw){
            var list=raw.results||raw||[];
            if(list.length>0){
              setMessages(function(prev){
                var mapped=list.map(mapCircleMsg);
                var serverIds=new Set(mapped.map(function(m){return m.id;}));
                var localOnly=prev.filter(function(m){return !serverIds.has(m.id)&&(m.id+"").match(/^\d+[r]$/);});
                return mapped.concat(localOnly);
              });
            }
          }).catch(function(){});
        },
        onTyping:function(memberId,isTyping){
          if(cancelled)return;
          if(String(memberId)===String(user?.id))return;
          setTypingUsers(function(prev){
            var filtered=prev.filter(function(t){return t.id!==memberId;});
            if(isTyping){
              var info=getSenderInfo(memberId);
              filtered.push({id:memberId,name:info.name});
            }
            return filtered;
          });
          // Auto-clear typing after 4s
          if(typingTimersRef.current[memberId])clearTimeout(typingTimersRef.current[memberId]);
          if(isTyping){
            typingTimersRef.current[memberId]=setTimeout(function(){
              setTypingUsers(function(prev){return prev.filter(function(t){return t.id!==memberId;});});
            },4000);
          }
        },
      }).then(function(handle){
        if(cancelled){handle.leave();return;}
        rtmHandle=handle;
        rtmChannelRef.current=handle;
        rtmJoinAttemptRef.current=0;
        // Catch up on any messages missed
        apiGet(CIRCLES.CHAT(id)+"?limit="+PAGE_SIZE).then(function(raw){
          var list=raw.results||raw||[];
          if(list.length>0)setMessages(list.map(mapCircleMsg));
        }).catch(function(){});
      }).catch(function(err){
        console.error("Circle RTM join failed:",err);
        rtmChannelRef.current=null;
        // Auto-retry with exponential backoff
        if(!cancelled){
          var attempt=rtmJoinAttemptRef.current;
          rtmJoinAttemptRef.current=attempt+1;
          var delay=Math.min(1000*Math.pow(2,attempt),30000)+Math.floor(Math.random()*2000);
          retryTimer=setTimeout(attemptJoin,delay);
        }
      });
    }

    attemptJoin();

    return function(){
      cancelled=true;
      if(retryTimer)clearTimeout(retryTimer);
      if(rtmHandle){rtmHandle.leave();}
      rtmChannelRef.current=null;
      Object.keys(typingTimersRef.current).forEach(function(k){clearTimeout(typingTimersRef.current[k]);});
      typingTimersRef.current={};
    };
  },[id]);

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  const handleScroll=()=>{if(!scrollRef.current)return;const{scrollTop,scrollHeight,clientHeight}=scrollRef.current;setShowScroll(scrollHeight-scrollTop-clientHeight>100);};

  useEffect(()=>{
    if(!emojiOpen)return;
    const handler=()=>setEmojiOpen(false);
    const t=setTimeout(()=>document.addEventListener("click",handler),0);
    return()=>{clearTimeout(t);document.removeEventListener("click",handler);};
  },[emojiOpen]);

  var handleSend=function(){
    var text=sanitizeText(input,5000);if(!text||!id)return;
    var displayName=(user?.displayName||user?.username)||"You";
    // Optimistic update
    setMessages(function(prev){return[...prev,{
      id:Date.now()+"u",content:text,
      senderId:String(user?.id),senderName:displayName,
      senderInitial:displayName[0].toUpperCase(),
      senderColor:getMemberColor(user?.id),
      isUser:true,time:new Date(),
    }];});
    setInput("");if(inputRef.current)inputRef.current.style.height="auto";
    // Dual-write: Agora RTM for instant delivery + REST for DB persistence
    if(rtmChannelRef.current){
      rtmChannelRef.current.sendMessage(text,{
        senderId:String(user?.id),senderName:displayName,
      }).catch(function(){});
    }
    apiPost(CIRCLES.CHAT_SEND(id),{content:text})
      .catch(function(err){showToast(err.message||"Failed to send","error");});
  };

  var handleInput=function(e){
    setInput(e.target.value);
    e.target.style.height="auto";
    e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";
    if(rtmChannelRef.current&&e.target.value){
      rtmChannelRef.current.sendTyping(true);
    }
  };

  var handleCopy=function(msgId,c){clipboardWrite(c);setCopiedId(msgId);setTimeout(function(){setCopiedId(null);},2000);};
  const insertEmoji=(emoji)=>{setInput(prev=>prev+emoji);setEmojiOpen(false);inputRef.current?.focus();};

  // Typing text
  var typingText="";
  if(typingUsers.length===1)typingText=typingUsers[0].name+" is typing";
  else if(typingUsers.length===2)typingText=typingUsers[0].name+" and "+typingUsers[1].name+" are typing";
  else if(typingUsers.length>2)typingText=typingUsers[0].name+" and "+(typingUsers.length-1)+" others are typing";

  // ─── Loading state ───────────────────────────────────────────
  if(initLoading){
    return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh"}}><Loader size={32} className="dp-spin" style={{color:"var(--dp-accent)"}}/></div>);
  }

  return(
    <div style={{width:"100%",height:"100dvh",overflow:"hidden",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>

      {/* ═══ APP BAR ═══ */}
      <header style={{position:"relative",zIndex:100,flexShrink:0,background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{height:64,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button className="dp-ib" onClick={()=>navigate(-1)} aria-label="Go back"><ArrowLeft size={20} strokeWidth={2}/></button>
            <div style={{width:38,height:38,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(139,92,246,0.15)",border:"1px solid rgba(139,92,246,0.25)",fontSize:16,fontWeight:700,color:isLight?"#7C3AED":"#C4B5FD"}}>
              <Users size={18} strokeWidth={2}/>
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:isLight?"#1a1535":"#fff"}}>{circleName}</div>
              <div style={{fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>{memberCount} member{memberCount!==1?"s":""}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button className="dp-ib" aria-label="Voice call" onClick={function(){
              apiPost(CIRCLES.CALL.START(id)).then(function(data){
                navigate("/voice-call/"+(data.callId||data.id)+"?buddyName="+encodeURIComponent(circleName));
              }).catch(function(err){showToast(err.message||"Failed to start call","error");});
            }}><Phone size={17} strokeWidth={2}/></button>
            <button className="dp-ib" aria-label="Video call" onClick={function(){
              apiPost(CIRCLES.CALL.START(id),{callType:"video"}).then(function(data){
                navigate("/video-call/"+(data.callId||data.id)+"?buddyName="+encodeURIComponent(circleName));
              }).catch(function(err){showToast(err.message||"Failed to start call","error");});
            }}><Video size={17} strokeWidth={2}/></button>
          </div>
        </div>
      </header>

      {/* ═══ MESSAGES ═══ */}
      <div ref={scrollRef} onScroll={handleScroll} style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"12px 16px 80px",display:"flex",flexDirection:"column",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{maxWidth:560,margin:"0 auto",width:"100%",flex:1,display:"flex",flexDirection:"column"}}>
          {messages.length===0?(
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
              <div style={{width:80,height:80,borderRadius:24,margin:"0 auto 24px",background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <MessageCircle size={36} color={isLight?"#7C3AED":"#C4B5FD"} strokeWidth={1.5}/>
              </div>
              <div style={{fontSize:18,fontWeight:600,color:isLight?"#1a1535":"#fff",marginBottom:8}}>Start chatting in {circleName}!</div>
              <div style={{fontSize:14,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",lineHeight:1.5,maxWidth:300}}>Send a message to get the conversation going.</div>
            </div>
          ):(
            <>
              <div style={{flex:1,minHeight:8}}/>
              {hasMore && (
                <div style={{textAlign:"center",padding:"8px 0 12px"}}>
                  <button onClick={loadOlderMessages} disabled={loadingMore} style={{padding:"6px 16px",borderRadius:12,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.06)",color:isLight?"#7C3AED":"#C4B5FD",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:loadingMore?0.5:1}}>{loadingMore?"Loading...":"Load older messages"}</button>
                </div>
              )}
              {messages.map((msg,i)=>{
                var showSender=!msg.isUser&&(i===0||messages[i-1].isUser||messages[i-1].senderId!==msg.senderId);
                return(
                <div key={msg.id}>
                  {showDate(messages,i)&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",margin:"16px 0 12px"}}>
                      <div style={{padding:"4px 14px",borderRadius:12,background:isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.06)",fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)"}}>{dateLabel(msg.time)}</div>
                    </div>
                  )}
                  <CircleBubble msg={msg} showSender={showSender} copiedId={copiedId} onCopy={()=>handleCopy(msg.id,msg.content)} meInitial={userInitial}/>
                </div>
              );})}
              {/* Typing indicator */}
              {typingText&&(
                <div className="dp-mai" style={{display:"flex",gap:8,marginBottom:20,alignItems:"flex-end"}}>
                  <div style={{padding:"10px 14px",borderRadius:"18px 18px 18px 6px",background:isLight?"rgba(255,255,255,0.72)":"rgba(139,92,246,0.06)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",border:"1px solid rgba(139,92,246,0.1)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:12,color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.85)",fontStyle:"italic"}}>{typingText}</span>
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
          <button aria-label="Send message" onClick={handleSend} disabled={!input.trim()} style={{width:42,height:42,borderRadius:14,border:"none",cursor:input.trim()?"pointer":"default",background:input.trim()?"linear-gradient(135deg,#8B5CF6,#7C3AED)":isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.05)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",flexShrink:0,boxShadow:input.trim()?"0 4px 16px rgba(139,92,246,0.35)":"none",transform:input.trim()?"scale(1)":"scale(0.9)",opacity:input.trim()?1:0.4}}>
            <Send size={18} strokeWidth={2} style={{transform:"translateX(1px)"}}/>
          </button>
        </div>
      </div>

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
        @keyframes dpFadeScale{from{opacity:0;transform:scale(0.9);}to{opacity:1;transform:scale(1);}}
        .dp-spin{animation:dpSpin 1s linear infinite;}
        @keyframes dpSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}
      `}</style>
    </div>
  );
}

// ─── CIRCLE BUBBLE ─────────────────────────────────────────────
function CircleBubble({msg,showSender,copiedId,onCopy,meInitial}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  const isCopied=copiedId===msg.id;

  if(msg.isUser){
    return(
      <div className="dp-mu" style={{display:"flex",justifyContent:"flex-end",marginBottom:showSender?12:4,gap:8,alignItems:"flex-end"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",maxWidth:"75%"}}>
          <div style={{position:"relative",padding:"10px 14px",borderRadius:"16px 16px 6px 16px",background:isLight?"rgba(200,120,200,0.1)":"rgba(200,120,200,0.07)",backdropFilter:"blur(40px) saturate(1.3)",WebkitBackdropFilter:"blur(40px) saturate(1.3)",border:"1px solid rgba(220,140,220,0.12)",boxShadow:"0 2px 12px rgba(200,120,200,0.08),inset 0 1px 0 rgba(255,200,230,0.05)"}}>
            <div style={{fontSize:14,color:isLight?"#1a1535":"#fff",lineHeight:1.55,whiteSpace:"pre-wrap"}}>{msg.content}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,marginTop:4}}>
              <span style={{fontSize:11,color:isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.4)"}}>{formatTime(msg.time)}</span>
            </div>
          </div>
        </div>
        <div style={{width:28,height:28,borderRadius:9,flexShrink:0,background:"linear-gradient(135deg,rgba(200,120,200,0.2),rgba(160,80,200,0.2))",border:"1px solid rgba(200,140,220,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:isLight?"#1a1535":"#fff"}}>{meInitial}</div>
      </div>
    );
  }

  return(
    <div className="dp-mb" style={{display:"flex",gap:8,marginBottom:showSender?12:4,alignItems:"flex-end"}}>
      {showSender?(
        <div style={{width:28,height:28,borderRadius:9,flexShrink:0,background:msg.senderColor+"20",border:"1px solid "+msg.senderColor+"30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:msg.senderColor}}>{msg.senderInitial}</div>
      ):(
        <div style={{width:28,flexShrink:0}}/>
      )}
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",maxWidth:"75%"}}>
        {showSender&&(
          <div style={{fontSize:12,fontWeight:600,color:msg.senderColor,marginBottom:3,paddingLeft:2}}>{msg.senderName}</div>
        )}
        <div style={{position:"relative",padding:"10px 14px",borderRadius:"16px 16px 16px 6px",background:isLight?"rgba(255,255,255,0.72)":"rgba(255,255,255,0.04)",backdropFilter:"blur(40px) saturate(1.3)",WebkitBackdropFilter:"blur(40px) saturate(1.3)",border:"1px solid "+msg.senderColor+"18",boxShadow:"0 2px 12px "+msg.senderColor+"08,inset 0 1px 0 rgba(255,255,255,0.04)"}}>
          <div style={{fontSize:14,color:isLight?"rgba(26,21,53,0.9)":"rgba(255,255,255,0.9)",lineHeight:1.55,whiteSpace:"pre-wrap"}}>{msg.content}</div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:4}}>
            <span style={{fontSize:11,color:isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.4)"}}>{formatTime(msg.time)}</span>
            {isCopied?<Check size={11} color={isLight?"#059669":"#5DE5A8"} strokeWidth={2.5}/>:
            <button onClick={e=>{e.stopPropagation();onCopy();}} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex"}}><Copy size={11} color={isLight?"rgba(26,21,53,0.35)":"rgba(255,255,255,0.3)"} strokeWidth={2}/></button>}
          </div>
        </div>
      </div>
    </div>
  );
}
