import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { createWebSocket } from "../../services/websocket";
import { CONVERSATIONS, USERS, WS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import { clipboardWrite } from "../../services/native";
import { sanitizeText } from "../../utils/sanitize";
import DOMPurify from "dompurify";
import { GRADIENTS } from "../../styles/colors";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GlassCard from "../../components/shared/GlassCard";
import IconButton from "../../components/shared/IconButton";
import Avatar from "../../components/shared/Avatar";
import GlassInput from "../../components/shared/GlassInput";
import {
  ArrowLeft, Bot, Sparkles, RotateCw, Copy, Check,
  Send, ChevronDown, MoreVertical, Pin, Heart, Search,
  X, Smile, Clock, MessageSquare
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


// ─── HELPERS ─────────────────────────────────────────────────────
function formatTime(d){return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
function formatMarkdown(text){
  // Escape HTML first to prevent injection
  var escaped = text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  // Apply markdown formatting on escaped content (safe since all HTML entities are escaped)
  return escaped
    .replace(/\*\*(.*?)\*\*/g,'<strong style="color:var(--dp-text);font-weight:600">$1</strong>')
    .replace(/\n/g,"<br/>");
}
function getDateLabel(date,t){
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const msgDay=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  const diff=Math.floor((today-msgDay)/(1000*60*60*24));
  if(diff===0) return t("chat.today");
  if(diff===1) return t("chat.yesterday");
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
  var { id } = useParams();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  var { user } = useAuth();
  var { showToast } = useToast();
  var { t } = useT();
  var queryClient = useQueryClient();
  var isNewChat = id === "new";
  var userInitial = (user?.displayName || user?.email || "U")[0].toUpperCase();
  var SUGGESTIONS = [
    t("chat.helpPlan"),
    t("chat.focusToday"),
    t("chat.needMotivation"),
    t("chat.reviewProgress"),
  ];
  const[mounted,setMounted]=useState(false);

  // ─── AI usage quota ─────────────────────────────────────────────
  var aiUsageQuery = useQuery({
    queryKey: ["ai-usage"],
    queryFn: function () { return apiGet(USERS.AI_USAGE); },
  });
  var aiUsage = aiUsageQuery.data || {};

  // ─── Fetch messages from API (paginated) ────────────────────────
  var MSG_PAGE_SIZE = 50;
  var messagesQuery = useQuery({
    queryKey: ["messages", id],
    queryFn: function () { return apiGet(CONVERSATIONS.MESSAGES(id) + "?limit=" + MSG_PAGE_SIZE); },
    enabled: !isNewChat && !!id,
  });

  // ─── Messages state ─────────────────────────────────────────────
  const[messages,setMessages]=useState(function () {
    if (location.state?.initialMessage && typeof location.state.initialMessage === "string") {
      var msg = location.state.initialMessage.trim().slice(0, 5000);
      if (msg) return [{ id: "new-1", content: msg, isUser: true, time: new Date(), pinned: false, liked: false, reactions: [] }];
    }
    return [];
  });
  var [hasMore, setHasMore] = useState(false);
  var [loadingMore, setLoadingMore] = useState(false);
  var [nextOffset, setNextOffset] = useState(0);

  function mapMessages(list) {
    return list.map(function (m) {
      return {
        id: String(m.id),
        content: m.content || "",
        isUser: m.isUser || m.role === "user",
        time: new Date(m.createdAt || m.timestamp || Date.now()),
        pinned: !!m.pinned,
        liked: !!m.liked,
        reactions: m.reactions || [],
      };
    });
  }

  // Sync from server when query data arrives
  useEffect(function () {
    if (messagesQuery.data) {
      var raw = messagesQuery.data;
      var list = raw.results || raw || [];
      if (Array.isArray(list) && list.length > 0) {
        setMessages(mapMessages(list));
        setNextOffset(list.length);
        setHasMore(!!raw.next);
      }
    }
  }, [messagesQuery.data]);

  function loadOlderMessages() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    apiGet(CONVERSATIONS.MESSAGES(id) + "?limit=" + MSG_PAGE_SIZE + "&offset=" + nextOffset)
      .then(function (raw) {
        var list = raw.results || raw || [];
        if (Array.isArray(list) && list.length > 0) {
          setMessages(function (prev) { return mapMessages(list).concat(prev); });
          setNextOffset(function (prev) { return prev + list.length; });
        }
        setHasMore(!!raw.next);
      })
      .catch(function () {})
      .finally(function () { setLoadingMore(false); });
  }

  // ─── WebSocket for streaming ────────────────────────────────────
  var wsRef = useRef(null);
  var [streamingContent, setStreamingContent] = useState("");

  useEffect(function () {
    if (isNewChat || !id) return;
    var cancelled = false;
    var ws = createWebSocket(WS.AI_CHAT(id), {
      onMessage: function (data) {
        if (cancelled) return;
        // Backend sends: stream_start, stream_chunk, stream_end, message
        if (data.type === "stream_chunk" || data.type === "ai_response_chunk" || data.type === "stream") {
          setStreamingContent(function (prev) {
            if (prev.length > 50000) return prev; // Cap at 50KB to prevent memory issues
            return prev + (data.chunk || data.content || data.text || "");
          });
        }
        if (data.type === "stream_end" || data.type === "ai_response_complete" || data.type === "message_complete") {
          setStreamingContent("");
          setIsStreaming(false);
          queryClient.invalidateQueries({ queryKey: ["messages", id] });
        }
        if (data.type === "stream_start") {
          setStreamingContent("");
          setIsStreaming(true);
        }
        if (data.type === "message" || data.type === "new_message") {
          // Stop streaming if this is an assistant message from WS
          var msg = data.message;
          if (msg && msg.role === "assistant") {
            setIsStreaming(false);
            setStreamingContent("");
          }
          // Refresh from server — the REST .then() already added the message optimistically
          queryClient.invalidateQueries({ queryKey: ["messages", id] });
        }
        if (data.type === "error") {
          setIsStreaming(false);
          setStreamingContent("");
          showToast(data.error || t("chat.chatError"), "error");
        }
        if (data.type === "quota_exceeded") {
          setIsStreaming(false);
          setStreamingContent("");
          showToast(data.message || t("chat.quotaExceeded"), "error");
        }
        if (data.type === "moderation") {
          setIsStreaming(false);
          setStreamingContent("");
          showToast(data.message || t("chat.moderationError"), "error");
        }
      },
    });
    wsRef.current = ws;
    return function () { cancelled = true; ws.close(); };
  }, [id, isNewChat, queryClient]);

  // ─── Send initial message for new conversations ─────────────────
  useEffect(function () {
    if (location.state?.initialMessage && typeof location.state.initialMessage === "string" && !isNewChat && id) {
      var msg = location.state.initialMessage.trim().slice(0, 5000);
      if (msg) {
        setIsStreaming(true);
        apiPost(CONVERSATIONS.SEND_MESSAGE(id), { content: msg })
          .then(function (res) {
            var aiMsg = res.assistantMessage || res.assistant_message;
            if (aiMsg) {
              setMessages(function (prev) {
                // Only add AI response — user message already in state from init
                var isDupe = prev.some(function (m) { return m.id === aiMsg.id || (!m.isUser && m.content === (aiMsg.content || "")); });
                if (isDupe) return prev;
                return [...prev, {
                  id: aiMsg.id || Date.now() + "a",
                  content: aiMsg.content || "",
                  isUser: false,
                  time: aiMsg.createdAt ? new Date(aiMsg.createdAt) : new Date(),
                  pinned: !!aiMsg.isPinned, liked: !!aiMsg.isLiked, reactions: aiMsg.reactions || []
                }];
              });
            }
            setIsStreaming(false);
            setStreamingContent("");
            queryClient.invalidateQueries({ queryKey: ["messages", id] });
          })
          .catch(function (err) {
            setIsStreaming(false);
            showToast(err.message || t("chat.failedSend"), "error");
          });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Mutations for pin / like / reaction ────────────────────────
  var pinMsgMut = useMutation({
    mutationFn: function (msgId) { return apiPost(CONVERSATIONS.PIN_MESSAGE(id, msgId)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["messages", id] }); },
  });
  var likeMsgMut = useMutation({
    mutationFn: function (msgId) { return apiPost(CONVERSATIONS.LIKE_MESSAGE(id, msgId)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["messages", id] }); },
  });
  var reactMsgMut = useMutation({
    mutationFn: function (data) { return apiPost(CONVERSATIONS.REACT_MESSAGE(id, data.msgId), { emoji: data.emoji }); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["messages", id] }); },
  });

  const[input,setInput]=useState("");
  const[isStreaming,setIsStreaming]=useState(false);
  const[copiedId,setCopiedId]=useState(null);
  const[activeMsg,setActiveMsg]=useState(null);
  const[showScroll,setShowScroll]=useState(false);
  const[menuOpen,setMenuOpen]=useState(false);
  const[panel,setPanel]=useState(null); // 'pinned' | 'liked' | 'search' | 'history' | null

  // ─── AI Conversation History ──────────────────────────────────
  var aiHistoryQuery = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: function () {
      return apiGet(CONVERSATIONS.LIST + "?ordering=-updated_at&limit=50").then(function (data) {
        var list = (data && data.results) || data || [];
        if (!Array.isArray(list)) list = [];
        return list.filter(function (c) { return c.conversationType !== "buddy_chat"; });
      });
    },
    enabled: panel === "history",
  });
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

  // ─── Safety: auto-clear streaming indicator after 90s ──────────
  useEffect(function () {
    if (!isStreaming) return;
    var timer = setTimeout(function () {
      setIsStreaming(false);
      setStreamingContent("");
    }, 90000);
    return function () { clearTimeout(timer); };
  }, [isStreaming]);

  // ─── Send message via API ───────────────────────────────────────
  var handleSend = function () {
    var text = sanitizeText(input, 4000); if (!text) return;
    setMessages(function (prev) { return [...prev, { id: Date.now() + "u", content: text, isUser: true, time: new Date(), pinned: false, liked: false, reactions: [] }]; });
    setInput(""); if (inputRef.current) inputRef.current.style.height = "auto";
    setIsStreaming(true);
    apiPost(CONVERSATIONS.SEND_MESSAGE(id), { content: text })
      .then(function (res) {
        // Use the REST response directly — it contains the AI reply
        var aiMsg = res.assistantMessage || res.assistant_message;
        if (aiMsg) {
          setMessages(function (prev) {
            var isDupe = prev.some(function (m) { return m.id === aiMsg.id || (!m.isUser && m.content === (aiMsg.content || "")); });
            if (isDupe) return prev;
            return [...prev, {
              id: aiMsg.id || Date.now() + "a",
              content: aiMsg.content || "",
              isUser: false,
              time: aiMsg.createdAt ? new Date(aiMsg.createdAt) : new Date(),
              pinned: !!aiMsg.isPinned,
              liked: !!aiMsg.isLiked,
              reactions: aiMsg.reactions || []
            }];
          });
        }
        setIsStreaming(false);
        setStreamingContent("");
        queryClient.invalidateQueries({ queryKey: ["messages", id] });
      })
      .catch(function (err) {
        setIsStreaming(false);
        showToast(err.message || t("chat.failedSend"), "error");
      });
  };

  // ─── Pin / Like / Copy / Reaction handlers ─────────────────────
  var togglePin = function (msgId) {
    setMessages(function (prev) { return prev.map(function (m) { return m.id === msgId ? { ...m, pinned: !m.pinned } : m; }); });
    pinMsgMut.mutate(msgId);
  };
  var toggleLike = function (msgId) {
    setMessages(function (prev) { return prev.map(function (m) { return m.id === msgId ? { ...m, liked: !m.liked } : m; }); });
    likeMsgMut.mutate(msgId);
  };
  const handleCopy=(cid,content)=>{clipboardWrite(content);setCopiedId(cid);setTimeout(()=>setCopiedId(null),2000);};
  const handleInputChange=(e)=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";};
  var handleReaction = function (msgId, emoji) {
    setMessages(function (prev) { return prev.map(function (m) {
      if (m.id !== msgId) return m;
      var reactions = [].concat(m.reactions || []);
      var existing = reactions.findIndex(function (r) { return r.emoji === emoji; });
      if (existing >= 0) { reactions.splice(existing, 1); }
      else { reactions.push({ emoji: emoji, count: 1 }); }
      return { ...m, reactions: reactions };
    }); });
    setReactionPicker(null);
    reactMsgMut.mutate({ msgId: msgId, emoji: emoji });
  };

  const pinnedMsgs=messages.filter(m=>m.pinned);
  const likedMsgs=messages.filter(m=>m.liked);
  // ES-backed search: query backend when searchQ changes
  const [searchedMsgs,setSearchedMsgs]=useState([]);
  useEffect(()=>{
    if(!searchQ||searchQ.length<2||!id||id==="new"){setSearchedMsgs([]);return;}
    const t=setTimeout(()=>{
      apiGet(CONVERSATIONS.SEARCH(id)+"?q="+encodeURIComponent(searchQ))
        .then(r=>{setSearchedMsgs(Array.isArray(r)?r:r.results||[]);})
        .catch(()=>{setSearchedMsgs([]);});
    },300);
    return ()=>clearTimeout(t);
  },[searchQ,id]);

  const isEmpty=messages.length===0;

  return(
    <div style={{position:"fixed",inset:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>

      {/* ═══ APP BAR ═══ */}
      <GlassAppBar
        left={
          <>
            <IconButton icon={ArrowLeft} onClick={()=>navigate(-1)} label="Go back" />
            <div style={{width:36,height:36,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--dp-accent-soft)",border:"1px solid var(--dp-accent-border)",flexShrink:0}}>
              <Bot size={18} color="var(--dp-accent)" strokeWidth={2}/>
            </div>
          </>
        }
        title={
          <div>
            <div style={{fontSize:15,fontWeight:600,color:"var(--dp-text)"}}>{t("chat.aiCoach")}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div className="dp-conn" style={{width:6,height:6,borderRadius:"50%",background:"var(--dp-success)",boxShadow:"0 0 6px rgba(93,229,168,0.5)"}}/>
                <span style={{fontSize:12,color:"var(--dp-text-primary)"}}>{t("chat.connected")}</span>
              </div>
              {aiUsage.remaining !== undefined && (
                <span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:8,background:aiUsage.remaining>10?"var(--dp-success-soft)":"var(--dp-warning-soft)",color:aiUsage.remaining>10?"var(--dp-success)":"var(--dp-warning)"}}>{aiUsage.remaining}/{aiUsage.limit||"--"}</span>
              )}
            </div>
          </div>
        }
        right={
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <IconButton icon={RotateCw} label="Reset conversation" />
            <div style={{position:"relative"}}>
              <IconButton icon={MoreVertical} onClick={()=>setMenuOpen(!menuOpen)} label="More options" />
              {menuOpen&&(
                <div style={{position:"absolute",top:44,right:0,zIndex:200,background:"var(--dp-card-solid)",backdropFilter:"blur(30px)",WebkitBackdropFilter:"blur(30px)",borderRadius:14,border:"1px solid var(--dp-glass-border)",boxShadow:"0 12px 40px rgba(0,0,0,0.5)",padding:6,minWidth:180,animation:"dpFS 0.15s ease-out"}}>
                  {[
                    {icon:Clock,label:t("chat.conversationHistory"),count:null,action:()=>{setPanel("history");setMenuOpen(false);}},
                    {icon:Pin,label:t("chat.pinnedMessages"),count:pinnedMsgs.length,action:()=>{setPanel("pinned");setMenuOpen(false);}},
                    {icon:Heart,label:t("chat.likedMessages"),count:likedMsgs.length,action:()=>{setPanel("liked");setMenuOpen(false);}},
                    {icon:Search,label:t("chat.searchMessages"),count:null,action:()=>{setPanel("search");setMenuOpen(false);setSearchQ("");}},
                  ].map(({icon:I,label,count,action},i)=>(
                    <button key={i} onClick={action} className="dp-gh" style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",background:"none",border:"none",borderRadius:10,cursor:"pointer",color:"var(--dp-text-primary)",fontSize:13,fontWeight:500,fontFamily:"inherit",transition:"background 0.15s"}}>
                      <I size={16} strokeWidth={2}/>{label}
                      {count!==null&&<span style={{marginLeft:"auto",fontSize:12,color:"var(--dp-text-tertiary)",background:"var(--dp-surface)",padding:"2px 7px",borderRadius:8}}>{count}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* ═══ MESSAGES AREA ═══ */}
      <div ref={scrollRef} onScroll={handleScroll} onClick={()=>setActiveMsg(null)} style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"12px 16px 80px",display:"flex",flexDirection:"column",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{maxWidth:560,margin:"0 auto",width:"100%",flex:1,display:"flex",flexDirection:"column"}}>
          {isEmpty&&!isStreaming?(
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",animationDelay:"0ms"}}>
              <div style={{width:80,height:80,borderRadius:24,margin:"0 auto 24px",background:"var(--dp-accent-soft)",border:"1px solid var(--dp-accent-border)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Sparkles size={36} color="var(--dp-accent)" strokeWidth={1.5}/>
              </div>
              <div style={{fontSize:18,fontWeight:600,color:"var(--dp-text)",marginBottom:8}}>{t("chat.startConversation")}</div>
              <div style={{fontSize:14,color:"var(--dp-text-primary)",lineHeight:1.5,maxWidth:300}}>{t("chat.aiReady")}</div>
            </div>
          ):(
            <>
              <div style={{flex:1,minHeight:8}}/>
              {hasMore && (
                <div style={{textAlign:"center",padding:"8px 0 12px"}}>
                  <button onClick={loadOlderMessages} disabled={loadingMore} style={{padding:"6px 16px",borderRadius:12,border:"1px solid var(--dp-accent-border)",background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:loadingMore?0.5:1}}>{loadingMore?t("chat.loading"):t("chat.loadOlder")}</button>
                </div>
              )}
              {messages.map((msg,i)=>(
                <div key={msg.id}>
                  {/* Date separator */}
                  {shouldShowDate(messages,i)&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",margin:"16px 0 12px"}}>
                      <div style={{padding:"4px 14px",borderRadius:12,background:"var(--dp-surface)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid var(--dp-glass-border)",fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>{getDateLabel(msg.time,t)}</div>
                    </div>
                  )}
                  <MsgBubble msg={msg} userInitial={userInitial} showActions={activeMsg===msg.id} copiedId={copiedId}
                    onPointerDown={()=>handlePointerDown(msg.id)} onPointerUp={handlePointerUp}
                    onCopy={()=>{handleCopy(msg.id,msg.content);setActiveMsg(null);}} onPin={()=>{togglePin(msg.id);setActiveMsg(null);}} onLike={()=>{toggleLike(msg.id);setActiveMsg(null);}}
                    reactionPicker={reactionPicker} setReactionPicker={setReactionPicker} handleReaction={handleReaction}/>
                </div>
              ))}
              {isStreaming&&(
                <div className="dp-mai" style={{display:"flex",gap:10,marginBottom:20,alignItems:"flex-end"}}>
                  <div style={{width:30,height:30,borderRadius:10,flexShrink:0,background:"var(--dp-accent-soft)",border:"1px solid var(--dp-accent-border)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Bot size={16} color="var(--dp-accent-text)" strokeWidth={2}/>
                  </div>
                  <div style={{padding:"14px 18px",borderRadius:"18px 18px 18px 6px",background:"var(--dp-glass-bg)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",border:"1px solid var(--dp-glass-border)",display:"flex",gap:4,alignItems:"center"}}>
                    {streamingContent ? (
                      <div style={{fontSize:14,color:"var(--dp-text-primary)",lineHeight:1.6,whiteSpace:"pre-wrap",wordBreak:"break-word"}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(formatMarkdown(streamingContent))}}/>
                    ) : (
                      <><span className="dp-dot dp-d1"/><span className="dp-dot dp-d2"/><span className="dp-dot dp-d3"/></>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef}/>
        </div>
      </div>

      {/* Scroll to bottom */}
      {showScroll&&<button aria-label="Scroll to bottom" onClick={()=>messagesEndRef.current?.scrollIntoView({behavior:"smooth"})} style={{position:"fixed",bottom:162,left:"50%",transform:"translateX(-50%)",zIndex:50,width:36,height:36,borderRadius:"50%",border:"1px solid var(--dp-glass-border)",background:"var(--dp-card-solid)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",color:"var(--dp-text)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}><ChevronDown size={18} strokeWidth={2}/></button>}

      {/* ═══ SUGGESTION CHIPS ═══ */}
      {isEmpty&&!isStreaming&&(
        <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"200ms",zIndex:10,padding:"0 16px 8px"}}>
          <div style={{maxWidth:560,margin:"0 auto",display:"flex",flexWrap:"wrap",gap:8}}>
            {SUGGESTIONS.map((s,i)=>(
              <button key={i} onClick={()=>{setInput(s);}} className="dp-gh" style={{padding:"9px 16px",borderRadius:20,border:"1px solid var(--dp-accent-border)",background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",whiteSpace:"nowrap",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ INPUT BAR ═══ */}
      <div style={{position:"relative",zIndex:100,flexShrink:0,padding:"8px 12px 14px",background:"var(--dp-header-bg)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderTop:"1px solid var(--dp-header-border)"}}>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"flex-end",gap:8}}>
          <div style={{position:"relative"}}>
            <button className="dp-ib" style={{width:38,height:38,borderRadius:12,flexShrink:0,background:emojiOpen?"var(--dp-surface-hover)":undefined}} onClick={e=>{e.stopPropagation();setEmojiOpen(!emojiOpen);}} aria-label="Emoji"><Smile size={18} strokeWidth={2}/></button>
            {emojiOpen&&(
              <div onClick={e=>e.stopPropagation()} style={{position:"absolute",bottom:"100%",left:0,marginBottom:8,padding:10,background:"var(--dp-modal-bg)",backdropFilter:"blur(30px)",WebkitBackdropFilter:"blur(30px)",borderRadius:16,border:"1px solid var(--dp-glass-border)",boxShadow:"0 8px 32px rgba(0,0,0,0.2)",display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,width:280,animation:"dpFadeScale 0.2s ease-out",zIndex:200}}>
                {['😀','😂','🥹','😍','🤩','😎','🥳','🤔','😅','😢','😤','🔥','💪','👏','❤️','💜','⭐','✨','🎯','🏆','🚀','💡','📝','🌟','👍','👎','🙏','🎉','💯','🌈','🍀','☕','🧠','💭','🎵','✅','🤝','💫','🌙','☀️','🦋','🌻'].map(emoji=>(
                  <button key={emoji} onClick={()=>insertEmoji(emoji)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,padding:6,borderRadius:8,transition:"all 0.15s",display:"flex",alignItems:"center",justifyContent:"center"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="var(--dp-surface-hover)";e.currentTarget.style.transform="scale(1.2)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.transform="scale(1)";}}
                  >{emoji}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:8,padding:"8px 14px",borderRadius:22,background:"var(--dp-surface)",border:"1px solid var(--dp-glass-border)"}}>
            <textarea ref={inputRef} value={input} onChange={handleInputChange}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
              placeholder={t("chat.typeMessage")} rows={1}
              style={{flex:1,background:"none",border:"none",outline:"none",resize:"none",color:"var(--dp-text)",fontSize:14,fontFamily:"inherit",lineHeight:1.5,maxHeight:120,minHeight:20}}/>
          </div>
          <button aria-label="Send message" onClick={handleSend} disabled={!input.trim()} style={{width:44,height:44,borderRadius:14,border:"none",cursor:input.trim()?"pointer":"default",background:input.trim()?GRADIENTS.primaryDark:"var(--dp-surface)",color:input.trim()?"#fff":"var(--dp-text-muted)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",flexShrink:0,boxShadow:input.trim()?"0 4px 16px rgba(139,92,246,0.35)":"none",transform:input.trim()?"scale(1)":"scale(0.9)",opacity:input.trim()?1:0.4}}>
            <Send size={18} strokeWidth={2} style={{transform:"translateX(1px)"}}/>
          </button>
        </div>
      </div>


      {/* ═══ SLIDE PANELS (Pinned / Liked / Search) ═══ */}
      {panel&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",flexDirection:"column"}}>
          {/* Backdrop */}
          <div onClick={()=>{setPanel(null);setSearchQ("");}} style={{position:"absolute",inset:0,background:"var(--dp-overlay-blur)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          {/* Panel */}
          <div style={{position:"absolute",top:0,right:0,bottom:0,width:"100%",maxWidth:420,background:"var(--dp-modal-bg)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderLeft:"1px solid var(--dp-glass-border)",display:"flex",flexDirection:"column",animation:"dpSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)"}}>
            {/* Panel header */}
            <div style={{height:64,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",borderBottom:"1px solid var(--dp-glass-border)",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {panel==="history"&&<><Clock size={18} color="var(--dp-accent)" strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>{t("chat.conversationHistory")}</span></>}
                {panel==="pinned"&&<><Pin size={18} color="var(--dp-accent)" strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>{t("chat.pinnedMessages")}</span></>}
                {panel==="liked"&&<><Heart size={18} color="var(--dp-danger)" strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>{t("chat.likedMessages")}</span></>}
                {panel==="search"&&<><Search size={18} color="var(--dp-accent)" strokeWidth={2}/><span style={{fontSize:16,fontWeight:600,color:"var(--dp-text)"}}>{t("chat.search")}</span></>}
              </div>
              <IconButton icon={X} onClick={()=>{setPanel(null);setSearchQ("");}} label="Close" />
            </div>
            {/* Search input */}
            {panel==="search"&&(
              <div style={{padding:"12px 16px",borderBottom:"1px solid var(--dp-divider)"}}>
                <GlassInput value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={t("chat.searchPlaceholder")} autoFocus icon={Search} />
              </div>
            )}
            {/* Panel content */}
            <div style={{flex:1,overflowY:"auto",padding:16}}>
              {panel==="history"&&(function(){
                var convs = aiHistoryQuery.data || [];
                if(!Array.isArray(convs)) convs = [];
                if(aiHistoryQuery.isLoading) return <div style={{textAlign:"center",paddingTop:40,color:"var(--dp-text-tertiary)",fontSize:14}}>{t("chat.loading")}</div>;
                if(convs.length===0) return <EmptyPanel icon={Clock} text={t("chat.noConversations")}/>;
                return convs.map(function(c){
                  var isCurrent = c.id === id;
                  var lastMsg = c.lastMessage;
                  var preview = typeof lastMsg === "object" && lastMsg !== null ? (lastMsg.content || "").slice(0,80) : (typeof lastMsg === "string" ? lastMsg.slice(0,80) : "");
                  var ago = c.updatedAt ? (function(d){var s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<60)return"now";if(s<3600)return Math.floor(s/60)+"m";if(s<86400)return Math.floor(s/3600)+"h";return Math.floor(s/86400)+"d";})(c.updatedAt) : "";
                  return (
                    <button key={c.id} onClick={function(){if(!isCurrent){setPanel(null);navigate("/chat/"+c.id);}}} style={{
                      display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 14px",marginBottom:8,
                      borderRadius:14,border:isCurrent?"1.5px solid var(--dp-accent-border)":"1px solid var(--dp-glass-border)",
                      background:isCurrent?"var(--dp-accent-soft)":"var(--dp-glass-bg)",
                      cursor:isCurrent?"default":"pointer",fontFamily:"inherit",textAlign:"left",transition:"background 0.15s",
                    }}
                      className={isCurrent ? "" : "dp-gh"}
                    >
                      <div style={{width:36,height:36,borderRadius:12,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--dp-accent-soft)",border:"1px solid var(--dp-accent-border)"}}>
                        <Bot size={16} color="var(--dp-accent)" strokeWidth={2}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                          <span style={{fontSize:13,fontWeight:600,color:"var(--dp-text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:8}}>{c.title || t("chat.aiCoach")}</span>
                          <span style={{fontSize:11,color:"var(--dp-text-muted)",flexShrink:0}}>{ago}</span>
                        </div>
                        {preview && <div style={{fontSize:12,color:"var(--dp-text-tertiary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{preview}</div>}
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                          <span style={{fontSize:11,color:"var(--dp-text-muted)"}}>{(c.totalMessages || 0) + " " + t("chat.messages")}</span>
                          {isCurrent && <span style={{fontSize:10,fontWeight:600,color:"var(--dp-accent)",background:"var(--dp-accent-soft)",padding:"1px 7px",borderRadius:6}}>{t("chat.current")}</span>}
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
              {panel==="pinned"&&(pinnedMsgs.length===0?<EmptyPanel icon={Pin} text={t("chat.noPinned")}/>:pinnedMsgs.map(m=><PanelMsg key={m.id} msg={m} userInitial={userInitial}/>))}
              {panel==="liked"&&(likedMsgs.length===0?<EmptyPanel icon={Heart} text={t("chat.noLiked")}/>:likedMsgs.map(m=><PanelMsg key={m.id} msg={m} userInitial={userInitial}/>))}
              {panel==="search"&&(searchQ?searchedMsgs.length===0?<EmptyPanel icon={Search} text={t("chat.noResults")}/>:searchedMsgs.map(m=><PanelMsg key={m.id} msg={m} userInitial={userInitial}/>):<div style={{textAlign:"center",paddingTop:40,color:"var(--dp-text-tertiary)",fontSize:14}}>{t("chat.typeToSearch")}</div>)}
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
function MsgBubble({msg,userInitial,showActions,copiedId,onPointerDown,onPointerUp,onCopy,onPin,onLike,reactionPicker,setReactionPicker,handleReaction}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  const isCopied=copiedId===msg.id;

  const actionBar=(
    <div className="dp-actions" style={{
      display:"flex",gap:4,padding:"4px 6px",
      background:"var(--dp-card-solid)",
      backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
      borderRadius:14,
      border:"1px solid var(--dp-glass-border)",
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
          background:active?"var(--dp-surface-hover)":"transparent",
          color:active?activeColor:"var(--dp-text-tertiary)",
          display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
          transition:"all 0.15s ease",
        }}
          onMouseEnter={e=>{if(!active)e.currentTarget.style.background="var(--dp-surface)";}}
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
            background:"rgba(200,120,200,0.08)",
            backdropFilter:"blur(40px) saturate(1.3)",WebkitBackdropFilter:"blur(40px) saturate(1.3)",
            border:"1px solid rgba(220,140,220,0.12)",
            boxShadow:"0 2px 12px rgba(200,120,200,0.08),inset 0 1px 0 rgba(255,200,230,0.05)",
          }} onDoubleClick={()=>setReactionPicker(reactionPicker===msg.id?null:msg.id)}>
            {actionBar}
            {reactionPicker===msg.id&&(
              <div style={{
                display:"flex",gap:4,padding:"6px 10px",
                background:"var(--dp-card-solid)",
                backdropFilter:"blur(20px)",
                borderRadius:20,
                border:"1px solid var(--dp-glass-border)",
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
            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,marginTop:6}}>
              {msg.pinned&&<Pin size={10} color="var(--dp-text-tertiary)" strokeWidth={2.5}/>}
              {msg.liked&&<Heart size={10} color="var(--dp-danger)" strokeWidth={2.5} fill="var(--dp-danger)"/>}
              <span style={{fontSize:12,color:"var(--dp-text-primary)"}}>{formatTime(msg.time)}</span>
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
        {/* User avatar */}
        <Avatar name={userInitial} size={30} color="rgba(200,120,200,0.8)" style={{borderRadius:10}} />
      </div>
    );
  }

  return(
    <div className="dp-ma dp-bw" style={{display:"flex",gap:8,marginBottom:16,alignItems:"flex-end"}} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
      {/* AI Avatar */}
      <div style={{width:30,height:30,borderRadius:10,flexShrink:0,background:"var(--dp-accent-soft)",border:"1px solid var(--dp-accent-border)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 12px rgba(139,92,246,0.1)"}}>
        <Bot size={16} color="var(--dp-accent)" strokeWidth={2}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",maxWidth:"75%"}}>
        <div style={{position:"relative",padding:"12px 16px",borderRadius:"18px 18px 18px 6px",background:"var(--dp-glass-bg)",backdropFilter:"blur(40px) saturate(1.3)",WebkitBackdropFilter:"blur(40px) saturate(1.3)",border:"1px solid var(--dp-glass-border)",boxShadow:"0 2px 12px rgba(0,0,0,0.1),inset 0 1px 0 rgba(255,255,255,0.03)"}} onDoubleClick={()=>setReactionPicker(reactionPicker===msg.id?null:msg.id)}>
          {actionBar}
          {reactionPicker===msg.id&&(
            <div style={{
              display:"flex",gap:4,padding:"6px 10px",
              background:"var(--dp-card-solid)",
              backdropFilter:"blur(20px)",
              borderRadius:20,
              border:"1px solid var(--dp-glass-border)",
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
          <div style={{fontSize:14,color:"var(--dp-text-primary)",lineHeight:1.6,whiteSpace:"pre-wrap",wordBreak:"break-word"}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(formatMarkdown(msg.content))}}/>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
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

// ─── PANEL MESSAGE CARD ──────────────────────────────────────────
function PanelMsg({msg,userInitial}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  var{t}=useT();
  return(
    <GlassCard padding={12} mb={8} radius={14}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        {msg.isUser?(
          <Avatar name={userInitial} size={22} color="rgba(200,120,200,0.8)" style={{borderRadius:7}} />
        ):(
          <div style={{width:22,height:22,borderRadius:7,background:"var(--dp-accent-soft)",display:"flex",alignItems:"center",justifyContent:"center"}}><Bot size={12} color="var(--dp-accent)" strokeWidth={2}/></div>
        )}
        <span style={{fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>{msg.isUser?t("chat.you"):t("chat.aiCoach")}</span>
        <span style={{fontSize:12,color:"var(--dp-text-tertiary)",marginLeft:"auto"}}>{formatTime(msg.time)}</span>
      </div>
      <div style={{fontSize:13,color:"var(--dp-text-primary)",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{msg.content.replace(/\*\*/g,"")}</div>
    </GlassCard>
  );
}

// ─── EMPTY PANEL STATE ───────────────────────────────────────────
function EmptyPanel({icon:I,text}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  return(
    <div style={{textAlign:"center",paddingTop:60}}>
      <div style={{width:56,height:56,borderRadius:16,margin:"0 auto 16px",background:"var(--dp-glass-bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <I size={24} color="var(--dp-text-muted)" strokeWidth={1.5}/>
      </div>
      <div style={{fontSize:14,color:"var(--dp-text-tertiary)"}}>{text}</div>
    </div>
  );
}
