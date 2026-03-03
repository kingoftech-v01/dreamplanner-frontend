import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { joinRTMChannel } from "../../services/agora";
import useAgoraPresence from "../../hooks/useAgoraPresence";
import { CONVERSATIONS, BUDDIES, USERS } from "../../services/endpoints";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import { clipboardWrite } from "../../services/native";
import { sanitizeText } from "../../utils/sanitize";
import { GRADIENTS } from "../../styles/colors";
import ErrorState from "../../components/shared/ErrorState";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GlassCard from "../../components/shared/GlassCard";
import IconButton from "../../components/shared/IconButton";
import Avatar from "../../components/shared/Avatar";
import GlassInput from "../../components/shared/GlassInput";
import {
  ArrowLeft, Users, Send, ChevronDown, MoreVertical, Pin,
  Heart, Copy, Check, CheckCheck, Search, X, Phone, Video,
  Smile, Target, Loader
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

// ─── HELPERS ─────────────────────────────────────────────────────
function formatTime(d){return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
function fmtMd(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\*\*(.*?)\*\*/g,`<strong style="color:var(--dp-text);font-weight:600">$1</strong>`).replace(/\n/g,"<br/>");}
function dateLabel(d,t){const now=new Date(),td=new Date(now.getFullYear(),now.getMonth(),now.getDate()),md=new Date(d.getFullYear(),d.getMonth(),d.getDate()),diff=Math.floor((td-md)/(864e5));if(!diff)return t("chat.today");if(diff===1)return t("chat.yesterday");if(diff<7)return d.toLocaleDateString([],{weekday:'long'});return d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});}
function showDate(msgs,i){if(!i)return true;return msgs[i-1].time.toDateString()!==msgs[i].time.toDateString();}

// ═══════════════════════════════════════════════════════════════════
export default function BuddyChatScreen(){
  var navigate=useNavigate();
  var{resolved,uiOpacity}=useTheme();var isLight=resolved==="light";
  var{id}=useParams();
  var{user}=useAuth();
  var{showToast}=useToast();
  var{t}=useT();
  var queryClient=useQueryClient();
  var userInitial=(user?.displayName||user?.username||"?")[0].toUpperCase();

  // ─── Resolve buddy info + conversation ID ─────────────────────
  var [convId, setConvId] = useState(null);
  var [buddyInfo, setBuddyInfo] = useState(null);
  var [initLoading, setInitLoading] = useState(true);
  var [initError, setInitError] = useState(null);

  useEffect(function () {
    if (!id || id === "undefined") {
      setInitError(t("chat.noBuddySelected"));
      setInitLoading(false);
      return;
    }
    var cancelled = false;
    setInitLoading(true);
    setInitError(null);
    // Call POST /api/buddies/chat/ with the id as userId to get/create conversation
    apiPost(BUDDIES.CHAT, { userId: id }).then(function (data) {
      if (cancelled) return;
      setConvId(data.conversationId);
      setBuddyInfo(data.buddy || {});
      setInitLoading(false);
    }).catch(function () {
      if (cancelled) return;
      // id might already be a conversation ID, try fetching messages directly
      setConvId(id);
      // Try to get buddy info from /api/buddies/current/
      apiGet(BUDDIES.CURRENT).then(function (d) {
        if (cancelled) return;
        var b = d && d.buddy;
        var p = b && b.partner;
        if (p) {
          setBuddyInfo({ id: p.id, displayName: p.username || p.displayName || t("chat.buddy"), isOnline: false, level: p.currentLevel, streak: p.currentStreak });
        }
      }).catch(function () {});
      // Also try to fetch the user profile
      apiGet(USERS.PROFILE(id)).then(function (u) {
        if (cancelled) return;
        if (u && u.displayName) {
          setBuddyInfo(function (prev) { return prev || { id: u.id, displayName: u.displayName || u.name || t("chat.buddy"), isOnline: u.isOnline || false }; });
        }
      }).catch(function () {});
      setInitLoading(false);
    });
    return function () { cancelled = true; };
  }, [id]);

  var buddyName = (buddyInfo && buddyInfo.displayName) || t("chat.buddy");
  var buddyInitial = (buddyName[0] || "B").toUpperCase();
  var mutualDream = (buddyInfo && buddyInfo.mutualDream) || "";

  // Real-time online status via Agora RTM Presence
  var buddyIdForPresence = useMemo(function () {
    return buddyInfo && buddyInfo.id ? [String(buddyInfo.id)] : [];
  }, [buddyInfo && buddyInfo.id]);
  var presenceMap = useAgoraPresence(buddyIdForPresence);
  var buddyOnline = buddyInfo && buddyInfo.id ? !!presenceMap[String(buddyInfo.id)] : false;

  // ─── Fetch messages (paginated) ────────────────────────────────
  var BUDDY_PAGE_SIZE=50;
  var messagesQuery=useQuery({
    queryKey:["buddy-messages",convId],
    queryFn:function(){return apiGet(CONVERSATIONS.MESSAGES(convId)+"?limit="+BUDDY_PAGE_SIZE);},
    enabled: !!convId,
  });

  // Local ME/BUDDY so the rest of the UI code works with minimal changes
  var ME={initial:userInitial};
  var BUDDY={initial:buddyInitial,displayName:buddyName,online:buddyOnline,mutualDream:mutualDream};

  var[mounted,setMounted]=useState(false);
  var[messages,setMessages]=useState([]);
  var[hasMore,setHasMore]=useState(false);
  var[loadingMore,setLoadingMore]=useState(false);
  var[nextOffset,setNextOffset]=useState(0);
  var[input,setInput]=useState("");
  var[copiedId,setCopiedId]=useState(null);
  var[activeMsg,setActiveMsg]=useState(null);
  var[showScroll,setShowScroll]=useState(false);
  var[menuOpen,setMenuOpen]=useState(false);
  var[panel,setPanel]=useState(null);
  var[searchQ,setSearchQ]=useState("");
  var[buddyTyping,setBuddyTyping]=useState(false);
  var[reactionPicker,setReactionPicker]=useState(null); // null or message id
  var[emojiOpen,setEmojiOpen]=useState(false);
  var endRef=useRef(null);var scrollRef=useRef(null);var inputRef=useRef(null);
  var longPressRef=useRef(null);
  var autoDismissRef=useRef(null);
  var rtmChannelRef=useRef(null);

  function mapBuddyMsg(m){
    var sid=m.senderId||(m.metadata&&m.metadata.senderId)||(m.metadata&&m.metadata.sender_id)||"";
    return{
      id:String(m.id),
      content:m.content||m.text||"",
      isUser:m.isUser===true||String(sid)===String(user?.id),
      time:new Date(m.createdAt||m.created_at||m.time),
      pinned:!!(m.pinned||m.isPinned),
      liked:!!(m.liked||m.isLiked),
      read:m.read!==false,
      reactions:m.reactions||[],
    };
  }

  // ─── Sync messages from query ──────────────────────────────────
  useEffect(function(){
    if(messagesQuery.data){
      var raw=messagesQuery.data;
      var list=raw.results||raw||[];
      setMessages(list.map(mapBuddyMsg));
      setNextOffset(list.length);
      setHasMore(!!raw.next);
    }
  },[messagesQuery.data]);

  function loadOlderBuddyMessages(){
    if(loadingMore||!hasMore||!convId)return;
    setLoadingMore(true);
    apiGet(CONVERSATIONS.MESSAGES(convId)+"?limit="+BUDDY_PAGE_SIZE+"&offset="+nextOffset)
      .then(function(raw){
        var list=raw.results||raw||[];
        if(list.length>0){
          setMessages(function(prev){return list.map(mapBuddyMsg).concat(prev);});
          setNextOffset(function(prev){return prev+list.length;});
        }
        setHasMore(!!raw.next);
      })
      .catch(function(){})
      .finally(function(){setLoadingMore(false);});
  }

  // ─── Mark conversation as read (debounced) ─────────────────────
  var markReadTimerRef=useRef(null);
  function markAsRead(){
    if(!convId)return;
    if(markReadTimerRef.current)clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current=setTimeout(function(){
      // Notify buddy in real-time via RTM
      if(rtmChannelRef.current){
        rtmChannelRef.current.sendMarkRead();
      }
      apiPost(CONVERSATIONS.MARK_READ(convId)).then(function(){
        queryClient.invalidateQueries({queryKey:["conversations"]});
      }).catch(function(){});
    },500);
  }

  // Mark read when the screen opens with a valid convId
  useEffect(function(){
    if(convId){markAsRead();}
    return function(){if(markReadTimerRef.current)clearTimeout(markReadTimerRef.current);};
  },[convId]);

  // ─── Agora RTM for real-time P2P (instantaneous, no polling) ──
  var typingTimerRef=useRef(null);
  var rtmJoinAttemptRef=useRef(0);
  useEffect(function(){
    if(!convId)return;
    var cancelled=false;
    var rtmHandle=null;
    var retryTimer=null;

    function attemptJoin(){
      if(cancelled)return;
      joinRTMChannel(convId,{
        onMessage:function(parsed,memberId){
          if(cancelled)return;
          // Add message directly to state for instant display
          setMessages(function(prev){
            // Deduplicate by checking if content+timestamp already exists
            var isDupe=prev.some(function(m){return !m.isUser && m.content===parsed.content && Math.abs((m.time?m.time.getTime():0)-(parsed.ts||0))<2000;});
            if(isDupe)return prev;
            return[...prev,{id:Date.now()+"r",content:parsed.content,isUser:false,time:new Date(parsed.ts||Date.now()),pinned:false,liked:false,read:true,reactions:[]}];
          });
          // Also refresh from DB to get server IDs
          queryClient.invalidateQueries({queryKey:["buddy-messages",convId]});
          setBuddyTyping(false);
          if(typingTimerRef.current){clearTimeout(typingTimerRef.current);typingTimerRef.current=null;}
          // Mark as read since user is viewing the chat
          markAsRead();
        },
        onTyping:function(memberId,isTyping){
          if(cancelled)return;
          setBuddyTyping(isTyping);
          if(typingTimerRef.current)clearTimeout(typingTimerRef.current);
          if(isTyping){
            typingTimerRef.current=setTimeout(function(){setBuddyTyping(false);},3000);
          }
        },
        onMarkRead:function(memberId){
          if(cancelled)return;
          // Buddy has read our messages — update all user messages to read
          setMessages(function(prev){
            return prev.map(function(m){
              if(m.isUser&&!m.read)return Object.assign({},m,{read:true});
              return m;
            });
          });
        },
      }).then(function(handle){
        if(cancelled){handle.leave();return;}
        rtmHandle=handle;
        rtmChannelRef.current=handle;
        rtmJoinAttemptRef.current=0;
        // Catch up on any messages missed while disconnected
        queryClient.invalidateQueries({queryKey:["buddy-messages",convId]});
      }).catch(function(err){
        console.error("RTM channel join failed:",err.userMessage || err.message ||err.code||"unknown");
        rtmChannelRef.current=null;
        // Auto-retry with exponential backoff (max 30s)
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
      if(typingTimerRef.current){clearTimeout(typingTimerRef.current);typingTimerRef.current=null;}
    };
  },[convId]);

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

  var handleSend=function(){
    var text=sanitizeText(input,2000);if(!text||!convId)return;
    setMessages(function(prev){return[...prev,{id:Date.now()+"u",content:text,isUser:true,time:new Date(),pinned:false,liked:false,read:false,reactions:[]}];});
    setInput("");if(inputRef.current)inputRef.current.style.height="auto";
    // Dual-write: send via Agora RTM for real-time delivery + REST for DB persistence
    if(rtmChannelRef.current){
      rtmChannelRef.current.sendMessage(text).catch(function(){});
    }
    apiPost(BUDDIES.SEND_MESSAGE,{conversationId:convId,content:text})
      .catch(function(err){showToast(err.userMessage || err.message ||t("chat.failedSend"),"error");});
  };

  // ─── Pin / Like mutations ─────────────────────────────────────
  var pinMsgMut=useMutation({
    mutationFn:function(msgId){return apiPost(CONVERSATIONS.PIN_MESSAGE(convId,msgId));},
    onSuccess:function(){queryClient.invalidateQueries({queryKey:["buddy-messages",convId]});},
  });
  var likeMsgMut=useMutation({
    mutationFn:function(msgId){return apiPost(CONVERSATIONS.LIKE_MESSAGE(convId,msgId));},
    onSuccess:function(){queryClient.invalidateQueries({queryKey:["buddy-messages",convId]});},
  });

  var togglePin=function(msgId){setMessages(function(p){return p.map(function(m){return m.id===msgId?{...m,pinned:!m.pinned}:m;});});pinMsgMut.mutate(msgId);};
  var toggleLike=function(msgId){setMessages(function(p){return p.map(function(m){return m.id===msgId?{...m,liked:!m.liked}:m;});});likeMsgMut.mutate(msgId);};
  var handleCopy=function(msgId,c){clipboardWrite(c);setCopiedId(msgId);setTimeout(function(){setCopiedId(null);},2000);};
  var handleInput=function(e){setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";if(rtmChannelRef.current&&e.target.value){rtmChannelRef.current.sendTyping(true);}};
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

  var pinnedMsgs=messages.filter(function(m){return m.pinned;});
  var likedMsgs=messages.filter(function(m){return m.liked;});
  // ES-backed search: query backend when searchQ changes
  var[searchedMsgs,setSearchedMsgs]=useState([]);
  useEffect(function(){
    if(!searchQ||searchQ.length<2||!convId){setSearchedMsgs([]);return;}
    var t=setTimeout(function(){
      apiGet(CONVERSATIONS.SEARCH(convId)+"?q="+encodeURIComponent(searchQ))
        .then(function(r){setSearchedMsgs(Array.isArray(r)?r:r.results||[]);})
        .catch(function(){setSearchedMsgs([]);});
    },300);
    return function(){clearTimeout(t);};
  },[searchQ,convId]);

  // ─── Loading / Error states ────────────────────────────────────
  if(initLoading||messagesQuery.isLoading){
    return(
      <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Loader size={28} color="var(--dp-accent)" strokeWidth={2} style={{animation:"spin 1s linear infinite"}}/>
        <style>{"@keyframes spin{to{transform:rotate(360deg);}}"}</style>
      </div>
    );
  }
  if(initError){
    return <ErrorState message={initError} onRetry={function(){window.location.reload();}}/>;
  }

  return(
    <div style={{position:"fixed",inset:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>

      {/* ═══ APP BAR ═══ */}
      <div style={{flexShrink:0}}>
        <GlassAppBar
          left={
            <>
              <IconButton icon={ArrowLeft} onClick={()=>navigate("/conversations")} label="Go back" />
              <Avatar name={BUDDY.displayName} size={38} color="var(--dp-teal)" online={BUDDY.online} />
            </>
          }
          title={
            <div>
              <div style={{fontSize:15,fontWeight:600,color:"var(--dp-text)"}}>{BUDDY.displayName}</div>
              <div style={{fontSize:12,color:BUDDY.online?"var(--dp-success)":"var(--dp-text-tertiary)"}}>{BUDDY.online?t("chat.online"):t("chat.offline")}</div>
            </div>
          }
          right={
            <div style={{display:"flex",gap:6}}>
              <IconButton icon={Phone} label="Call" onClick={function(){
                apiPost(CONVERSATIONS.CALLS.INITIATE,{callee_id:buddyInfo&&buddyInfo.id||id,call_type:"voice"}).then(function(data){
                  navigate("/voice-call/"+(data.callId||data.id)+"?buddyName="+encodeURIComponent(buddyName));
                }).catch(function(err){showToast(err.userMessage || err.message ||t("chat.failedCall"),"error");});
              }} />
              <IconButton icon={Video} label="Video call" onClick={function(){
                apiPost(CONVERSATIONS.CALLS.INITIATE,{callee_id:buddyInfo&&buddyInfo.id||id,call_type:"video"}).then(function(data){
                  navigate("/video-call/"+(data.callId||data.id)+"?buddyName="+encodeURIComponent(buddyName));
                }).catch(function(err){showToast(err.userMessage || err.message ||t("chat.failedCall"),"error");});
              }} />
              <div style={{position:"relative"}}>
                <IconButton icon={MoreVertical} onClick={()=>setMenuOpen(!menuOpen)} label="More options" />
                {menuOpen&&(
                  <div style={{position:"absolute",top:44,right:0,zIndex:200,background:"var(--dp-card-solid)",backdropFilter:"blur(30px)",WebkitBackdropFilter:"blur(30px)",borderRadius:14,border:"1px solid var(--dp-accent-border)",boxShadow:"0 12px 40px rgba(0,0,0,0.5)",padding:6,minWidth:180,animation:"dpFS 0.15s ease-out"}}>
                    {[
                      {icon:Pin,label:t("chat.pinnedMessages"),count:pinnedMsgs.length,act:()=>{setPanel("pinned");setMenuOpen(false);}},
                      {icon:Heart,label:t("chat.likedMessages"),count:likedMsgs.length,act:()=>{setPanel("liked");setMenuOpen(false);}},
                      {icon:Search,label:t("chat.searchMessages"),count:null,act:()=>{setPanel("search");setMenuOpen(false);setSearchQ("");}},
                    ].map(({icon:I,label,count,act},i)=>(
                      <button key={i} onClick={act} className="dp-gh" style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",background:"none",border:"none",borderRadius:10,cursor:"pointer",color:"var(--dp-text-primary)",fontSize:13,fontWeight:500,fontFamily:"inherit",transition:"background 0.15s"}}>
                        <I size={16} strokeWidth={2}/>{label}
                        {count!==null&&<span style={{marginLeft:"auto",fontSize:12,color:"var(--dp-text-tertiary)",background:"var(--dp-accent-soft)",padding:"2px 7px",borderRadius:8}}>{count}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          }
        />
        {/* Shared dream banner */}
        {BUDDY.mutualDream ? (
        <div style={{padding:"0 16px 10px",display:"flex",alignItems:"center",gap:8,background:"var(--dp-header-bg)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:"1px solid var(--dp-header-border)"}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:10,background:"rgba(20,184,166,0.06)",border:"1px solid rgba(20,184,166,0.1)"}}>
            <Target size={13} color="var(--dp-teal)" strokeWidth={2.5}/>
            <span style={{fontSize:12,color:"var(--dp-text-primary)"}}>{t("chat.sharedDream")}</span>
            <span style={{fontSize:12,fontWeight:600,color:"var(--dp-teal)"}}>{BUDDY.mutualDream}</span>
          </div>
        </div>
        ) : null}
      </div>

      {/* ═══ MESSAGES ═══ */}
      <div ref={scrollRef} onScroll={handleScroll} onClick={()=>setActiveMsg(null)} style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"12px 16px 80px",display:"flex",flexDirection:"column",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{maxWidth:560,margin:"0 auto",width:"100%",flex:1,display:"flex",flexDirection:"column"}}>
          {messages.length===0?(
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
              <div style={{width:80,height:80,borderRadius:24,margin:"0 auto 24px",background:"rgba(20,184,166,0.08)",border:"1px solid rgba(20,184,166,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Users size={36} color="var(--dp-teal)" strokeWidth={1.5}/>
              </div>
              <div style={{fontSize:18,fontWeight:600,color:"var(--dp-text)",marginBottom:8}}>{t("chat.startChatWith")}</div>
              <div style={{fontSize:14,color:"var(--dp-text-primary)",lineHeight:1.5,maxWidth:300}}>{BUDDY.mutualDream ? t("chat.workingTowards") : t("chat.encourageEachOther")}</div>
            </div>
          ):(
            <>
              <div style={{flex:1,minHeight:8}}/>
              {hasMore && (
                <div style={{textAlign:"center",padding:"8px 0 12px"}}>
                  <button onClick={loadOlderBuddyMessages} disabled={loadingMore} style={{padding:"6px 16px",borderRadius:12,border:"1px solid var(--dp-accent-border)",background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:loadingMore?0.5:1}}>{loadingMore?t("chat.loading"):t("chat.loadOlder")}</button>
                </div>
              )}
              {messages.map((msg,i)=>(
                <div key={msg.id}>
                  {showDate(messages,i)&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",margin:"16px 0 12px"}}>
                      <div style={{padding:"4px 14px",borderRadius:12,background:"var(--dp-pill-bg)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid var(--dp-glass-border)",fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>{dateLabel(msg.time,t)}</div>
                    </div>
                  )}
                  <BuddyBubble msg={msg} showActions={activeMsg===msg.id} copiedId={copiedId}
                    onPointerDown={()=>handlePointerDown(msg.id)} onPointerUp={handlePointerUp}
                    onCopy={()=>{handleCopy(msg.id,msg.content);setActiveMsg(null);}} onPin={()=>{togglePin(msg.id);setActiveMsg(null);}} onLike={()=>{toggleLike(msg.id);setActiveMsg(null);}}
                    reactionPicker={reactionPicker} setReactionPicker={setReactionPicker} handleReaction={handleReaction}
                    meInitial={ME.initial} buddyInitial={BUDDY.initial}/>
                </div>
              ))}
              {/* Buddy typing */}
              {buddyTyping&&(
                <div className="dp-mai" style={{display:"flex",gap:8,marginBottom:20,alignItems:"flex-end"}}>
                  <Avatar name={BUDDY.initial} size={30} color="var(--dp-teal)" style={{borderRadius:10}} />
                  <div style={{padding:"12px 16px",borderRadius:"18px 18px 18px 6px",background:"rgba(20,184,166,0.06)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",border:"1px solid rgba(20,184,166,0.1)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:12,color:"var(--dp-text-primary)",fontStyle:"italic"}}>{BUDDY.displayName + " " + t("chat.isTyping")}</span>
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

      {showScroll&&<button aria-label="Scroll to bottom" onClick={()=>endRef.current?.scrollIntoView({behavior:"smooth"})} style={{position:"fixed",bottom:162,left:"50%",transform:"translateX(-50%)",zIndex:50,width:36,height:36,borderRadius:"50%",border:"1px solid var(--dp-glass-border)",background:"var(--dp-card-solid)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",color:"var(--dp-text)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}><ChevronDown size={18} strokeWidth={2}/></button>}

      {/* ═══ INPUT ═══ */}
      <div style={{position:"relative",zIndex:100,flexShrink:0,padding:"8px 12px 14px",background:"var(--dp-header-bg)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderTop:"1px solid var(--dp-header-border)"}}>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"flex-end",gap:8}}>
          <div style={{position:"relative"}}>
            <button className="dp-ib" style={{width:38,height:38,borderRadius:12,flexShrink:0,background:emojiOpen?"var(--dp-accent-soft)":undefined}} onClick={e=>{e.stopPropagation();setEmojiOpen(!emojiOpen);}} aria-label="Emoji"><Smile size={18} strokeWidth={2}/></button>
            {emojiOpen&&(
              <div onClick={e=>e.stopPropagation()} style={{position:"absolute",bottom:"100%",left:0,marginBottom:8,padding:10,background:"var(--dp-modal-bg)",backdropFilter:"blur(30px)",WebkitBackdropFilter:"blur(30px)",borderRadius:16,border:"1px solid var(--dp-accent-border)",boxShadow:"0 8px 32px rgba(0,0,0,0.2)",display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,width:280,animation:"dpFadeScale 0.2s ease-out",zIndex:200}}>
                {['😀','😂','🥹','😍','🤩','😎','🥳','🤔','😅','😢','😤','🔥','💪','👏','❤️','💜','⭐','✨','🎯','🏆','🚀','💡','📝','🌟','👍','👎','🙏','🎉','💯','🌈','🍀','☕','🧠','💭','🎵','✅','🤝','💫','🌙','☀️','🦋','🌻'].map(emoji=>(
                  <button key={emoji} onClick={()=>insertEmoji(emoji)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,padding:6,borderRadius:8,transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="var(--dp-surface-hover)";e.currentTarget.style.transform="scale(1.2)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.transform="scale(1)";}}
                  >{emoji}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{flex:1,display:"flex",alignItems:"flex-end",padding:"8px 14px",borderRadius:22,background:"var(--dp-surface)",border:"1px solid var(--dp-glass-border)"}}>
            <textarea ref={inputRef} value={input} onChange={handleInput}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
              placeholder={t("chat.typeMessage")} rows={1}
              style={{flex:1,background:"none",border:"none",outline:"none",resize:"none",color:"var(--dp-text)",fontSize:14,fontFamily:"inherit",lineHeight:1.5,maxHeight:120,minHeight:20}}/>
          </div>
          <button aria-label="Send message" onClick={handleSend} disabled={!input.trim()} style={{width:42,height:42,borderRadius:14,border:"none",cursor:input.trim()?"pointer":"default",background:input.trim()?GRADIENTS.teal:"var(--dp-surface)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",flexShrink:0,boxShadow:input.trim()?"0 4px 16px rgba(20,184,166,0.35)":"none",transform:input.trim()?"scale(1)":"scale(0.9)",opacity:input.trim()?1:0.4}}>
            <Send size={18} strokeWidth={2} style={{transform:"translateX(1px)"}}/>
          </button>
        </div>
      </div>


      {/* ═══ PANELS ═══ */}
      {panel&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",flexDirection:"column"}}>
          <div onClick={()=>{setPanel(null);setSearchQ("");}} style={{position:"absolute",inset:0,background:"var(--dp-overlay-blur)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"absolute",top:0,right:0,bottom:0,width:"100%",maxWidth:420,background:"var(--dp-modal-bg)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderLeft:"1px solid var(--dp-glass-border)",display:"flex",flexDirection:"column",animation:"dpSI 0.3s cubic-bezier(0.16,1,0.3,1)"}}>
            <div style={{height:64,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",borderBottom:"1px solid var(--dp-glass-border)",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {panel==="pinned"&&<><Pin size={18} color="var(--dp-accent)" strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>{t("chat.pinnedMessages")}</span></>}
                {panel==="liked"&&<><Heart size={18} color="var(--dp-danger)" strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>{t("chat.likedMessages")}</span></>}
                {panel==="search"&&<><Search size={18} color="var(--dp-teal)" strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>{t("chat.search")}</span></>}
              </div>
              <IconButton icon={X} onClick={()=>{setPanel(null);setSearchQ("");}} label="Close" />
            </div>
            {panel==="search"&&(
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--dp-divider)"}}>
                <GlassInput value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={t("chat.searchPlaceholder")} autoFocus icon={Search} />
              </div>
            )}
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {panel==="pinned"&&(pinnedMsgs.length===0?<EmptyP icon={Pin} text={t("chat.noPinned")}/>:pinnedMsgs.map(m=><PanelMsg key={m.id} msg={m} meInitial={ME.initial} buddyInitial={BUDDY.initial} buddyName={BUDDY.displayName}/>))}
              {panel==="liked"&&(likedMsgs.length===0?<EmptyP icon={Heart} text={t("chat.noLiked")}/>:likedMsgs.map(m=><PanelMsg key={m.id} msg={m} meInitial={ME.initial} buddyInitial={BUDDY.initial} buddyName={BUDDY.displayName}/>))}
              {panel==="search"&&(searchQ?searchedMsgs.length===0?<EmptyP icon={Search} text={t("chat.noResults")}/>:searchedMsgs.map(m=><PanelMsg key={m.id} msg={m} meInitial={ME.initial} buddyInitial={BUDDY.initial} buddyName={BUDDY.displayName}/>):<div style={{textAlign:"center",paddingTop:40,color:"var(--dp-text-tertiary)",fontSize:14}}>{t("chat.typeToSearch")}</div>)}
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
function BuddyBubble({msg,showActions,copiedId,onPointerDown,onPointerUp,onCopy,onPin,onLike,reactionPicker,setReactionPicker,handleReaction,meInitial,buddyInitial}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  const isCopied=copiedId===msg.id;
  const actionBar=(
    <div className="dp-acts" style={{
      display:"flex",gap:4,padding:"4px 6px",
      background:"var(--dp-card-solid)",
      backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
      borderRadius:14,
      border:"1px solid var(--dp-accent-border)",
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
        {icon:Pin,active:msg.pinned,activeColor:"var(--dp-accent)",action:onPin,tip:"Pin"},
        {icon:Heart,active:msg.liked,activeColor:"var(--dp-danger)",action:onLike,tip:"Like"},
        {icon:isCopied?Check:Copy,active:isCopied,activeColor:"var(--dp-success)",action:onCopy,tip:"Copy"},
      ].map(({icon:I,active,activeColor,action,tip},j)=>(
        <button key={j} title={tip} aria-label={tip} onClick={e=>{e.stopPropagation();action();}} style={{
          width:32,height:32,borderRadius:10,border:"none",
          background:active?"var(--dp-accent-soft)":"transparent",
          color:active?activeColor:"var(--dp-text-tertiary)",
          display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
          transition:"all 0.15s ease",
        }}
          onMouseEnter={e=>{if(!active)e.currentTarget.style.background="var(--dp-surface-hover)";}}
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
          <div style={{position:"relative",padding:"12px 16px",borderRadius:"18px 18px 6px 18px",background:"rgba(200,120,200,0.08)",backdropFilter:"blur(40px) saturate(1.3)",WebkitBackdropFilter:"blur(40px) saturate(1.3)",border:"1px solid rgba(220,140,220,0.12)",boxShadow:"0 2px 12px rgba(200,120,200,0.08),inset 0 1px 0 rgba(255,200,230,0.05)"}} onDoubleClick={()=>setReactionPicker(reactionPicker===msg.id?null:msg.id)}>
            {actionBar}
            {reactionPicker===msg.id&&(
              <div style={{
                display:"flex",gap:4,padding:"6px 10px",
                background:"var(--dp-card-solid)",
                backdropFilter:"blur(20px)",
                borderRadius:20,
                border:"1px solid var(--dp-accent-border)",
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
            <div style={{fontSize:14,color:"var(--dp-text)",lineHeight:1.55,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{msg.content}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:5,marginTop:6}}>
              {msg.pinned&&<Pin size={10} color="var(--dp-text-tertiary)" strokeWidth={2.5}/>}
              {msg.liked&&<Heart size={10} color="var(--dp-danger)" strokeWidth={2.5} fill="var(--dp-danger)"/>}
              <span style={{fontSize:12,color:"var(--dp-text-primary)"}}>{formatTime(msg.time)}</span>
              {msg.read?<CheckCheck size={13} color="var(--dp-teal)" strokeWidth={2}/>:<Check size={13} color="var(--dp-text-muted)" strokeWidth={2}/>}
            </div>
          </div>
          {msg.reactions&&msg.reactions.length>0&&(
            <div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-end"}}>
              {msg.reactions.map((r,i)=>(
                <span key={i} style={{
                  fontSize:14,padding:"2px 6px",
                  background:"var(--dp-accent-soft)",
                  borderRadius:10,cursor:"pointer",
                }} onClick={()=>handleReaction(msg.id,r.emoji)}>{r.emoji}</span>
              ))}
            </div>
          )}
        </div>
        <Avatar name={meInitial} size={30} color="rgba(200,120,200,0.8)" style={{borderRadius:10}} />
      </div>
    );
  }

  return(
    <div className="dp-mb dp-bw" style={{display:"flex",gap:8,marginBottom:16,alignItems:"flex-end"}} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
      <Avatar name={buddyInitial} size={30} color="var(--dp-teal)" style={{borderRadius:10}} />
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",maxWidth:"75%"}}>
        <div style={{position:"relative",padding:"12px 16px",borderRadius:"18px 18px 18px 6px",background:"var(--dp-glass-bg)",backdropFilter:"blur(40px) saturate(1.3)",WebkitBackdropFilter:"blur(40px) saturate(1.3)",border:"1px solid rgba(20,184,166,0.1)",boxShadow:"0 2px 12px rgba(20,184,166,0.06),inset 0 1px 0 rgba(94,234,212,0.04)"}} onDoubleClick={()=>setReactionPicker(reactionPicker===msg.id?null:msg.id)}>
          {actionBar}
          {reactionPicker===msg.id&&(
            <div style={{
              display:"flex",gap:4,padding:"6px 10px",
              background:"var(--dp-card-solid)",
              backdropFilter:"blur(20px)",
              borderRadius:20,
              border:"1px solid var(--dp-accent-border)",
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
          <div style={{fontSize:14,color:"var(--dp-text-primary)",lineHeight:1.55,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{msg.content}</div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:6}}>
            {msg.pinned&&<Pin size={10} color="var(--dp-text-tertiary)" strokeWidth={2.5}/>}
            {msg.liked&&<Heart size={10} color="var(--dp-danger)" strokeWidth={2.5} fill="var(--dp-danger)"/>}
            <span style={{fontSize:12,color:"var(--dp-text-primary)"}}>{formatTime(msg.time)}</span>
          </div>
        </div>
        {msg.reactions&&msg.reactions.length>0&&(
          <div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-start"}}>
            {msg.reactions.map((r,i)=>(
              <span key={i} style={{
                fontSize:14,padding:"2px 6px",
                background:"var(--dp-accent-soft)",
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
function PanelMsg({msg,meInitial,buddyInitial,buddyName}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  var{t}=useT();
  return(
    <GlassCard padding={12} mb={8} radius={14}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        {msg.isUser?(
          <Avatar name={meInitial} size={22} color="rgba(200,120,200,0.8)" style={{borderRadius:7}} />
        ):(
          <Avatar name={buddyInitial} size={22} color="var(--dp-teal)" style={{borderRadius:7}} />
        )}
        <span style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>{msg.isUser?t("chat.you"):buddyName}</span>
        <span style={{fontSize:12,color:"var(--dp-text-tertiary)",marginLeft:"auto"}}>{formatTime(msg.time)}</span>
      </div>
      <div style={{fontSize:13,color:"var(--dp-text-primary)",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{msg.content}</div>
    </GlassCard>
  );
}

function EmptyP({icon:I,text}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  return(<div style={{textAlign:"center",paddingTop:60}}>
    <div style={{width:56,height:56,borderRadius:16,margin:"0 auto 16px",background:"var(--dp-glass-bg)",display:"flex",alignItems:"center",justifyContent:"center"}}><I size={24} color="var(--dp-text-muted)" strokeWidth={1.5}/></div>
    <div style={{fontSize:14,color:"var(--dp-text-tertiary)"}}>{text}</div>
  </div>);
}
