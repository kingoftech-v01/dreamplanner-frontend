import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../services/api";
import { createWebSocket } from "../../services/websocket";
import { CONVERSATIONS, USERS, DREAMS, WS } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import { clipboardWrite } from "../../services/native";
import { playSound } from "../../services/sounds";
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
  X, Smile, Clock, MessageSquare, GitBranch, Brain, Trash2,
  ListTodo, Mic, ChevronRight, FileText, Loader, AlertCircle
} from "lucide-react";
import GlassModal from "../../components/shared/GlassModal";
import VoicePlayer from "../../components/shared/VoicePlayer";
import NaturalTaskCreator from "../../components/shared/NaturalTaskCreator";

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

  // ─── Dream context detection ──────────────────────────────────
  var dreamId = (function () {
    if (location.state?.dreamId) return location.state.dreamId;
    if (typeof id === "string" && id.startsWith("dream-")) return id.replace("dream-", "");
    return null;
  })();

  // ─── Fetch conversation starters for dream context ────────────
  var startersQuery = useQuery({
    queryKey: ["conversation-starters", dreamId],
    queryFn: function () { return apiGet(DREAMS.CONVERSATION_STARTERS(dreamId)); },
    enabled: !!dreamId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  var dreamStarters = (startersQuery.data && startersQuery.data.starters) || [];

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
        time: new Date(m.createdAt || m.created_at || m.timestamp || Date.now()),
        pinned: !!m.pinned || !!m.is_pinned,
        liked: !!m.liked || !!m.is_liked,
        reactions: m.reactions || [],
        metadata: m.metadata || {},
        audioUrl: m.audioUrl || m.audio_url || "",
        audioDuration: m.audioDuration || m.audio_duration || null,
        transcription: m.transcription || "",
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
            showToast(err.userMessage || err.message || t("chat.failedSend"), "error");
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

  // ─── Voice summarization ──────────────────────────────────────────
  var [summarizingVoiceId, setSummarizingVoiceId] = useState(null);

  var handleSummarizeVoice = function (msgId) {
    if (!id || !msgId || summarizingVoiceId) return;
    setSummarizingVoiceId(msgId);
    apiPost(CONVERSATIONS.SUMMARIZE_VOICE(id, msgId))
      .then(function (res) {
        var summary = res.summary;
        if (summary) {
          // Update message metadata locally with the returned summary
          setMessages(function (prev) {
            return prev.map(function (m) {
              if (m.id === msgId) {
                var newMeta = Object.assign({}, m.metadata || {}, { voice_summary: summary });
                return Object.assign({}, m, { metadata: newMeta });
              }
              return m;
            });
          });
        }
        setSummarizingVoiceId(null);
        queryClient.invalidateQueries({ queryKey: ["messages", id] });
      })
      .catch(function (err) {
        setSummarizingVoiceId(null);
        showToast(err.userMessage || err.message || "Failed to summarize voice note", "error");
      });
  };

  // ─── Branch state ─────────────────────────────────────────────────
  var [activeBranch, setActiveBranch] = useState(null); // null = main, or branch object
  var [branches, setBranches] = useState([]);
  var [branchMessages, setBranchMessages] = useState([]);
  var [branchParentIdx, setBranchParentIdx] = useState(-1); // index in messages where branch diverges

  // Fetch branches for this conversation
  var branchesQuery = useQuery({
    queryKey: ["branches", id],
    queryFn: function () { return apiGet(CONVERSATIONS.BRANCHES.LIST(id)); },
    enabled: !isNewChat && !!id,
  });
  useEffect(function () {
    if (branchesQuery.data) {
      var list = branchesQuery.data.results || branchesQuery.data || [];
      if (Array.isArray(list)) setBranches(list);
    }
  }, [branchesQuery.data]);

  // Fetch branch messages when a branch is selected
  useEffect(function () {
    if (!activeBranch || !id) { setBranchMessages([]); setBranchParentIdx(-1); return; }
    apiGet(CONVERSATIONS.BRANCHES.MESSAGES(id, activeBranch.id))
      .then(function (raw) {
        var list = raw.results || raw || [];
        if (Array.isArray(list)) setBranchMessages(mapMessages(list));
      })
      .catch(function () { setBranchMessages([]); });
  }, [activeBranch, id]);

  // Compute the branch point index (where parent message is in main messages)
  useEffect(function () {
    if (!activeBranch) { setBranchParentIdx(-1); return; }
    var parentId = activeBranch.parentMessage || activeBranch.parent_message;
    var idx = messages.findIndex(function (m) { return m.id === parentId; });
    setBranchParentIdx(idx);
  }, [activeBranch, messages]);

  // Create branch mutation
  var createBranchMut = useMutation({
    mutationFn: function (data) {
      return apiPost(CONVERSATIONS.BRANCHES.CREATE(id), {
        parent_message_id: data.parentMessageId,
        name: data.name || "",
      });
    },
    onSuccess: function (branch) {
      queryClient.invalidateQueries({ queryKey: ["branches", id] });
      setActiveBranch(branch);
      showToast(t("chat.branchCreated") || "Branch created", "success");
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to create branch", "error");
    },
  });

  // Send message in branch
  var branchSendMut = useMutation({
    mutationFn: function (data) {
      return apiPost(CONVERSATIONS.BRANCHES.SEND(id, data.branchId), { content: data.content });
    },
  });

  var handleCreateBranch = function (msgId) {
    var branchName = "Branch " + (branches.length + 1);
    createBranchMut.mutate({ parentMessageId: msgId, name: branchName });
    setActiveMsg(null);
  };

  var handleSwitchBranch = function (branch) {
    setActiveBranch(branch);
  };

  var handleSwitchMain = function () {
    setActiveBranch(null);
    setBranchMessages([]);
    setBranchParentIdx(-1);
  };

  // ─── Chat Memory state ──────────────────────────────────────────
  var [memoryModalOpen, setMemoryModalOpen] = useState(false);

  var memoriesQuery = useQuery({
    queryKey: ["chat-memories"],
    queryFn: function () { return apiGet(CONVERSATIONS.MEMORIES.LIST); },
    enabled: memoryModalOpen,
  });
  var memories = memoriesQuery.data || [];

  var deleteMemoryMut = useMutation({
    mutationFn: function (memId) { return apiDelete(CONVERSATIONS.MEMORIES.DELETE(memId)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["chat-memories"] }); },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to delete memory", "error"); },
  });

  var clearMemoriesMut = useMutation({
    mutationFn: function () { return apiPost(CONVERSATIONS.MEMORIES.CLEAR); },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ["chat-memories"] });
      showToast(t("chat.memoriesCleared") || "All memories cleared", "success");
    },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to clear memories", "error"); },
  });

  const[input,setInput]=useState("");
  const[isStreaming,setIsStreaming]=useState(false);
  const[copiedId,setCopiedId]=useState(null);
  const[activeMsg,setActiveMsg]=useState(null);
  const[showScroll,setShowScroll]=useState(false);
  const[menuOpen,setMenuOpen]=useState(false);
  const[panel,setPanel]=useState(null); // 'pinned' | 'liked' | 'search' | 'history' | null
  var [searchBarOpen, setSearchBarOpen] = useState(false);
  var [searchBarQuery, setSearchBarQuery] = useState("");
  var [searchBarResults, setSearchBarResults] = useState([]);
  var [searchBarLoading, setSearchBarLoading] = useState(false);
  var searchBarInputRef = useRef(null);

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
  var [naturalTaskOpen, setNaturalTaskOpen] = useState(false);
  var [naturalTaskText, setNaturalTaskText] = useState("");
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
    playSound("send");

    // If in a branch, send to branch endpoint
    if (activeBranch) {
      setBranchMessages(function (prev) { return [...prev, { id: Date.now() + "u", content: text, isUser: true, time: new Date(), pinned: false, liked: false, reactions: [] }]; });
      setInput(""); if (inputRef.current) inputRef.current.style.height = "auto";
      setIsStreaming(true);
      apiPost(CONVERSATIONS.BRANCHES.SEND(id, activeBranch.id), { content: text })
        .then(function (res) {
          var aiMsg = res.assistantMessage || res.assistant_message;
          if (aiMsg) {
            setBranchMessages(function (prev) {
              var isDupe = prev.some(function (m) { return m.id === aiMsg.id || (!m.isUser && m.content === (aiMsg.content || "")); });
              if (isDupe) return prev;
              return [...prev, {
                id: aiMsg.id || Date.now() + "a",
                content: aiMsg.content || "",
                isUser: false,
                time: aiMsg.createdAt ? new Date(aiMsg.createdAt) : new Date(),
                pinned: false, liked: false, reactions: []
              }];
            });
          }
          setIsStreaming(false);
          setStreamingContent("");
          queryClient.invalidateQueries({ queryKey: ["branches", id] });
        })
        .catch(function (err) {
          setIsStreaming(false);
          showToast(err.userMessage || err.message || t("chat.failedSend"), "error");
        });
      return;
    }

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
        showToast(err.userMessage || err.message || t("chat.failedSend"), "error");
      });
  };

  // ─── Send a starter directly as first message ────────────────
  var handleStarterSend = function (text) {
    var sanitized = sanitizeText(text, 4000); if (!sanitized) return;
    playSound("send");
    setMessages(function (prev) { return [...prev, { id: Date.now() + "u", content: sanitized, isUser: true, time: new Date(), pinned: false, liked: false, reactions: [] }]; });
    setInput(""); if (inputRef.current) inputRef.current.style.height = "auto";
    setIsStreaming(true);
    apiPost(CONVERSATIONS.SEND_MESSAGE(id), { content: sanitized })
      .then(function (res) {
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
        showToast(err.userMessage || err.message || t("chat.failedSend"), "error");
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
  var handleCreateTask = function (content) {
    setNaturalTaskText(content || "");
    setNaturalTaskOpen(true);
    setActiveMsg(null);
  };
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

  // ─── Debounced search bar API call (300ms) ─────────────────────
  useEffect(function () {
    if (!searchBarOpen || !searchBarQuery || searchBarQuery.length < 2 || !id || id === "new") {
      setSearchBarResults([]);
      setSearchBarLoading(false);
      return;
    }
    setSearchBarLoading(true);
    var timer = setTimeout(function () {
      apiGet(CONVERSATIONS.SEARCH_MESSAGES(id, searchBarQuery))
        .then(function (r) {
          var list = Array.isArray(r) ? r : (r.results || []);
          setSearchBarResults(list);
        })
        .catch(function () { setSearchBarResults([]); })
        .finally(function () { setSearchBarLoading(false); });
    }, 300);
    return function () { clearTimeout(timer); };
  }, [searchBarQuery, searchBarOpen, id]);

  // Focus search input when bar opens
  useEffect(function () {
    if (searchBarOpen && searchBarInputRef.current) {
      setTimeout(function () { searchBarInputRef.current.focus(); }, 100);
    }
  }, [searchBarOpen]);

  var handleSearchBarToggle = function () {
    setSearchBarOpen(function (prev) { return !prev; });
    setSearchBarQuery("");
    setSearchBarResults([]);
    setSearchBarLoading(false);
  };

  var handleSearchResultClick = function (msgId) {
    setSearchBarOpen(false);
    setSearchBarQuery("");
    setSearchBarResults([]);
    // Scroll to the message in the chat
    var el = document.getElementById("msg-" + msgId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = "2px solid var(--dp-accent)";
      el.style.outlineOffset = "4px";
      el.style.borderRadius = "18px";
      el.style.transition = "outline-color 1.5s ease";
      setTimeout(function () {
        el.style.outlineColor = "transparent";
        setTimeout(function () { el.style.outline = "none"; }, 1500);
      }, 1200);
    }
  };

  var highlightExcerpt = function (html) {
    // The backend returns <mark> tags for highlights; DOMPurify will keep them safe
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: ["mark"], ALLOWED_ATTR: [] });
  };

  const isEmpty=messages.length===0;

  return(
    <div className="dp-desktop-main" style={{position:"fixed",inset:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>

      {/* ═══ APP BAR ═══ */}
      <GlassAppBar
        className="dp-desktop-header"
        left={
          <>
            <IconButton icon={ArrowLeft} onClick={()=>navigate("/conversations")} label="Go back" />
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
            <IconButton icon={Brain} onClick={function () { setMemoryModalOpen(true); }} label="Chat memory" style={{background:memoryModalOpen?"var(--dp-accent-soft)":undefined,color:memoryModalOpen?"var(--dp-accent)":undefined}} />
            <IconButton icon={Search} onClick={handleSearchBarToggle} label="Search messages" style={{background:searchBarOpen?"var(--dp-accent-soft)":undefined,color:searchBarOpen?"var(--dp-accent)":undefined}} />
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

      {/* ═══ SEARCH BAR (slides down from app bar) ═══ */}
      <div style={{
        maxHeight: searchBarOpen ? 200 : 0,
        opacity: searchBarOpen ? 1 : 0,
        overflow: searchBarOpen ? "visible" : "hidden",
        transition: "max-height 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease",
        zIndex: 150,
        position: "relative",
      }}>
        <div style={{
          padding: "10px 16px 12px",
          background: "var(--dp-header-bg)",
          backdropFilter: "blur(40px) saturate(1.4)",
          WebkitBackdropFilter: "blur(40px) saturate(1.4)",
          borderBottom: "1px solid var(--dp-glass-border)",
        }}>
          <div style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 14px",
              borderRadius: 16,
              background: "var(--dp-glass-bg)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
              border: "1px solid var(--dp-glass-border)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}>
              <Search size={16} color="var(--dp-text-muted)" strokeWidth={2} />
              <input
                ref={searchBarInputRef}
                value={searchBarQuery}
                onChange={function (e) { setSearchBarQuery(e.target.value); }}
                onKeyDown={function (e) { if (e.key === "Escape") { handleSearchBarToggle(); } }}
                placeholder={t("chat.searchPlaceholder") || "Search messages..."}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "var(--dp-text)", fontSize: 14, fontFamily: "inherit",
                }}
              />
              {searchBarQuery && (
                <button onClick={function () { setSearchBarQuery(""); setSearchBarResults([]); }} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--dp-text-muted)", display: "flex", alignItems: "center",
                  padding: 2, borderRadius: 8,
                }}>
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Search results overlay ─── */}
        {searchBarOpen && searchBarQuery && searchBarQuery.length >= 2 && (
          <div style={{
            position: "absolute", left: 0, right: 0, top: "100%",
            zIndex: 160, maxHeight: 320, overflowY: "auto",
            padding: "8px 16px 12px",
            background: "var(--dp-modal-bg)",
            backdropFilter: "blur(40px) saturate(1.3)",
            WebkitBackdropFilter: "blur(40px) saturate(1.3)",
            borderBottom: "1px solid var(--dp-glass-border)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            animation: "dpFS 0.2s ease-out",
          }}>
            <div style={{ maxWidth: 560, margin: "0 auto" }}>
              {searchBarLoading ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--dp-text-tertiary)", fontSize: 13 }}>
                  {t("chat.loading") || "Searching..."}
                </div>
              ) : searchBarResults.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--dp-text-tertiary)", fontSize: 13 }}>
                  {t("chat.noResults") || "No results found"}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {searchBarResults.length + " " + (searchBarResults.length === 1 ? "result" : "results")}
                  </div>
                  {searchBarResults.map(function (r) {
                    var isUser = r.role === "user";
                    var time = r.createdAt || r.created_at;
                    var timeStr = time ? formatTime(new Date(time)) : "";
                    var dateStr = time ? getDateLabel(new Date(time), t) : "";
                    return (
                      <button
                        key={r.id}
                        onClick={function () { handleSearchResultClick(r.id); }}
                        className="dp-gh"
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          width: "100%", padding: "10px 12px", marginBottom: 6,
                          borderRadius: 12, border: "1px solid var(--dp-glass-border)",
                          background: "var(--dp-glass-bg)",
                          backdropFilter: "blur(20px)",
                          WebkitBackdropFilter: "blur(20px)",
                          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                          transition: "background 0.15s",
                        }}
                      >
                        {isUser ? (
                          <Avatar name={userInitial} size={24} color="rgba(200,120,200,0.8)" style={{ borderRadius: 8, flexShrink: 0 }} />
                        ) : (
                          <div style={{
                            width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                            background: "var(--dp-accent-soft)", border: "1px solid var(--dp-accent-border)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Bot size={13} color="var(--dp-accent)" strokeWidth={2} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--dp-text-primary)" }}>
                              {isUser ? (t("chat.you") || "You") : (t("chat.aiCoach") || "AI Coach")}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--dp-text-muted)" }}>{dateStr} {timeStr}</span>
                          </div>
                          <div
                            style={{
                              fontSize: 12, color: "var(--dp-text-primary)", lineHeight: 1.5,
                              display: "-webkit-box", WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical", overflow: "hidden",
                            }}
                            dangerouslySetInnerHTML={{ __html: highlightExcerpt(r.excerpt || r.content || "") }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click-away backdrop for search results */}
      {searchBarOpen && searchBarQuery && searchBarQuery.length >= 2 && searchBarResults.length > 0 && (
        <div onClick={function () { setSearchBarOpen(false); setSearchBarQuery(""); setSearchBarResults([]); }} style={{
          position: "fixed", inset: 0, zIndex: 140, background: "transparent",
        }} />
      )}

      {/* ═══ BRANCH SELECTOR BAR ═══ */}
      {branches.length > 0 && (
        <div style={{
          zIndex: 20, flexShrink: 0,
          padding: "8px 16px",
          background: "var(--dp-header-bg)",
          backdropFilter: "blur(40px) saturate(1.4)",
          WebkitBackdropFilter: "blur(40px) saturate(1.4)",
          borderBottom: "1px solid var(--dp-glass-border)",
        }}>
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
            {/* Main conversation pill */}
            <button
              onClick={handleSwitchMain}
              style={{
                padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                border: !activeBranch ? "1.5px solid var(--dp-accent)" : "1px solid var(--dp-glass-border)",
                background: !activeBranch ? "var(--dp-accent-soft)" : "var(--dp-glass-bg)",
                color: !activeBranch ? "var(--dp-accent)" : "var(--dp-text-primary)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <MessageSquare size={12} strokeWidth={2.2} />
              {t("chat.main") || "Main"}
            </button>
            {/* Branch pills */}
            {branches.map(function (b) {
              var isActive = activeBranch && activeBranch.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={function () { handleSwitchBranch(b); }}
                  style={{
                    padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    border: isActive ? "1.5px solid var(--dp-accent)" : "1px solid var(--dp-glass-border)",
                    background: isActive ? "var(--dp-accent-soft)" : "var(--dp-glass-bg)",
                    color: isActive ? "var(--dp-accent)" : "var(--dp-text-primary)",
                    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    transition: "all 0.2s ease",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <GitBranch size={12} strokeWidth={2.2} />
                  {b.name || ("Branch " + (branches.indexOf(b) + 1))}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ MESSAGES AREA ═══ */}
      <div ref={scrollRef} onScroll={handleScroll} onClick={()=>setActiveMsg(null)} style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"12px 16px 80px",display:"flex",flexDirection:"column",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{maxWidth:560,margin:"0 auto",width:"100%",flex:1,display:"flex",flexDirection:"column"}}>
          {isEmpty&&!isStreaming&&!activeBranch?(
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",animationDelay:"0ms"}}>
              <div style={{width:80,height:80,borderRadius:24,margin:"0 auto 24px",background:"var(--dp-accent-soft)",border:"1px solid var(--dp-accent-border)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Sparkles size={36} color="var(--dp-accent)" strokeWidth={1.5}/>
              </div>
              <div style={{fontSize:18,fontWeight:600,color:"var(--dp-text)",marginBottom:8}}>{t("chat.startConversation")}</div>
              <div style={{fontSize:14,color:"var(--dp-text-primary)",lineHeight:1.5,maxWidth:300}}>{t("chat.aiReady")}</div>
            </div>
          ):activeBranch?(
            /* ─── Branch view: show context messages (dimmed) + branch divider + branch messages ─── */
            <>
              <div style={{flex:1,minHeight:8}}/>
              {(function () {
                // Find which messages from branchMessages are "context" (copied) vs new
                var parentId = activeBranch.parentMessage || activeBranch.parent_message;
                var contextMsgs = [];
                var newMsgs = [];
                var pastParent = false;
                branchMessages.forEach(function (m) {
                  if (m.id === parentId || (!pastParent && contextMsgs.length < (branchParentIdx >= 0 ? branchParentIdx + 1 : 999))) {
                    contextMsgs.push(m);
                    if (m.metadata && m.metadata.copied_from) {
                      // This is a copied context message
                    } else if (m.id === parentId) {
                      pastParent = true;
                    }
                  } else {
                    newMsgs.push(m);
                  }
                });
                // Simpler approach: messages with copied_from metadata are context, rest are branch-specific
                contextMsgs = [];
                newMsgs = [];
                branchMessages.forEach(function (m) {
                  if (m.metadata && m.metadata.copied_from) {
                    contextMsgs.push(m);
                  } else {
                    newMsgs.push(m);
                  }
                });

                return (
                  <>
                    {/* Context messages (dimmed) */}
                    {contextMsgs.map(function (msg, i) {
                      return (
                        <div key={msg.id} id={"msg-" + msg.id} style={{ opacity: 0.45, pointerEvents: "none" }}>
                          {shouldShowDate(contextMsgs, i) && (
                            <div style={{display:"flex",alignItems:"center",justifyContent:"center",margin:"16px 0 12px"}}>
                              <div style={{padding:"4px 14px",borderRadius:12,background:"var(--dp-surface)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid var(--dp-glass-border)",fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>{getDateLabel(msg.time,t)}</div>
                            </div>
                          )}
                          <MsgBubble msg={msg} userInitial={userInitial} showActions={false} copiedId={null}
                            onPointerDown={function(){}} onPointerUp={function(){}}
                            onCopy={function(){}} onPin={function(){}} onLike={function(){}}
                            onCreateTask={handleCreateTask}
                            reactionPicker={null} setReactionPicker={function(){}} handleReaction={function(){}} />
                        </div>
                      );
                    })}

                    {/* Branch point divider */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      margin: "20px 0 16px",
                    }}>
                      <div style={{ flex: 1, height: 1, background: "var(--dp-accent)", opacity: 0.3 }} />
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "5px 14px", borderRadius: 20,
                        background: "var(--dp-accent-soft)",
                        border: "1px solid var(--dp-accent-border)",
                        fontSize: 11, fontWeight: 600,
                        color: "var(--dp-accent)",
                        whiteSpace: "nowrap",
                      }}>
                        <GitBranch size={12} strokeWidth={2.5} />
                        {t("chat.branchPoint") || "Branch point"}
                      </div>
                      <div style={{ flex: 1, height: 1, background: "var(--dp-accent)", opacity: 0.3 }} />
                    </div>

                    {/* Branch-specific messages */}
                    {newMsgs.map(function (msg, i) {
                      return (
                        <div key={msg.id} id={"msg-" + msg.id}>
                          {shouldShowDate(newMsgs, i) && (
                            <div style={{display:"flex",alignItems:"center",justifyContent:"center",margin:"16px 0 12px"}}>
                              <div style={{padding:"4px 14px",borderRadius:12,background:"var(--dp-surface)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid var(--dp-glass-border)",fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>{getDateLabel(msg.time,t)}</div>
                            </div>
                          )}
                          <MsgBubble msg={msg} userInitial={userInitial} showActions={activeMsg===msg.id} copiedId={copiedId}
                            onPointerDown={function(){handlePointerDown(msg.id);}} onPointerUp={handlePointerUp}
                            onCopy={function(){handleCopy(msg.id,msg.content);setActiveMsg(null);}} onPin={function(){}} onLike={function(){}}
                            onCreateTask={handleCreateTask}
                            onSummarizeVoice={handleSummarizeVoice} summarizingVoiceId={summarizingVoiceId}
                            reactionPicker={reactionPicker} setReactionPicker={setReactionPicker} handleReaction={handleReaction} />
                        </div>
                      );
                    })}
                    {/* Streaming indicator in branch */}
                    {isStreaming && (
                      <div className="dp-mai" style={{display:"flex",gap:10,marginBottom:20,alignItems:"flex-end"}}>
                        <div style={{width:30,height:30,borderRadius:10,flexShrink:0,background:"var(--dp-accent-soft)",border:"1px solid var(--dp-accent-border)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Bot size={16} color="var(--dp-accent-text)" strokeWidth={2}/>
                        </div>
                        <div style={{padding:"14px 18px",borderRadius:"18px 18px 18px 6px",background:"var(--dp-glass-bg)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",border:"1px solid var(--dp-glass-border)",display:"flex",gap:4,alignItems:"center"}}>
                          {streamingContent ? (
                            <div style={{fontSize:14,color:"var(--dp-text-primary)",lineHeight:1.6,whiteSpace:"pre-wrap",wordBreak:"break-word"}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(formatMarkdown(streamingContent),{ALLOWED_TAGS:["strong","br"],ALLOWED_ATTR:["style"]})}}/>
                          ) : (
                            <><span className="dp-dot dp-d1"/><span className="dp-dot dp-d2"/><span className="dp-dot dp-d3"/></>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          ):(
            <>
              <div style={{flex:1,minHeight:8}}/>
              {hasMore && (
                <div style={{textAlign:"center",padding:"8px 0 12px"}}>
                  <button onClick={loadOlderMessages} disabled={loadingMore} style={{padding:"6px 16px",borderRadius:12,border:"1px solid var(--dp-accent-border)",background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:loadingMore?0.5:1}}>{loadingMore?t("chat.loading"):t("chat.loadOlder")}</button>
                </div>
              )}
              {messages.map((msg,i)=>(
                <div key={msg.id} id={"msg-"+msg.id}>
                  {/* Date separator */}
                  {shouldShowDate(messages,i)&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",margin:"16px 0 12px"}}>
                      <div style={{padding:"4px 14px",borderRadius:12,background:"var(--dp-surface)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid var(--dp-glass-border)",fontSize:12,fontWeight:600,color:"var(--dp-text-primary)"}}>{getDateLabel(msg.time,t)}</div>
                    </div>
                  )}
                  <MsgBubble msg={msg} userInitial={userInitial} showActions={activeMsg===msg.id} copiedId={copiedId}
                    onPointerDown={()=>handlePointerDown(msg.id)} onPointerUp={handlePointerUp}
                    onCopy={()=>{handleCopy(msg.id,msg.content);setActiveMsg(null);}} onPin={()=>{togglePin(msg.id);setActiveMsg(null);}} onLike={()=>{toggleLike(msg.id);setActiveMsg(null);}}
                    onBranch={!msg.isUser ? function(){ handleCreateBranch(msg.id); } : null}
                    onCreateTask={handleCreateTask}
                    onSummarizeVoice={handleSummarizeVoice} summarizingVoiceId={summarizingVoiceId}
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
                      <div style={{fontSize:14,color:"var(--dp-text-primary)",lineHeight:1.6,whiteSpace:"pre-wrap",wordBreak:"break-word"}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(formatMarkdown(streamingContent),{ALLOWED_TAGS:["strong","br"],ALLOWED_ATTR:["style"]})}}/>
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
      {isEmpty&&!isStreaming&&!activeBranch&&(
        <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"200ms",zIndex:10,padding:"0 16px 8px"}}>
          <div style={{maxWidth:560,margin:"0 auto",display:"flex",flexWrap:"wrap",gap:8}}>
            {dreamStarters.length > 0 ? dreamStarters.map(function (s, i) {
              return (
                <button key={"ds-" + i} onClick={function () { handleStarterSend(s.text); }} className="dp-gh" style={{
                  padding: "9px 16px", borderRadius: 20,
                  border: "1px solid var(--dp-accent-border)",
                  background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.03))",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  color: "var(--dp-accent)", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              );
            }) : SUGGESTIONS.map(function (s, i) {
              return (
                <button key={i} onClick={function () { setInput(s); }} className="dp-gh" style={{padding:"9px 16px",borderRadius:20,border:"1px solid var(--dp-accent-border)",background:"var(--dp-accent-soft)",color:"var(--dp-accent)",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",whiteSpace:"nowrap",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}
                >{s}</button>
              );
            })}
          </div>
          {startersQuery.isLoading && dreamId && (
            <div style={{ maxWidth: 560, margin: "8px auto 0", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <div style={{ width: 14, height: 14, border: "2px solid var(--dp-accent-border)", borderTopColor: "var(--dp-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>Loading suggestions for this dream...</span>
            </div>
          )}
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
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}

        [data-theme="light"] .dp-dot{background:rgba(26,21,53,0.4) !important;}
        [data-theme="light"] .dp-conn{background:rgba(26,21,53,0.1) !important;}
        [data-theme="light"] input::placeholder,
        [data-theme="light"] textarea::placeholder{color:rgba(26,21,53,0.4) !important;}

        mark{background:rgba(139,92,246,0.25);color:var(--dp-text);border-radius:3px;padding:0 2px;font-weight:600;}
        [data-theme="light"] mark{background:rgba(139,92,246,0.2);color:var(--dp-text);}
      `}</style>

      {/* ═══ MEMORY MODAL ═══ */}
      <GlassModal
        open={memoryModalOpen}
        onClose={function () { setMemoryModalOpen(false); }}
        title={t("chat.memoryTitle") || "AI Memory"}
        maxWidth={480}
      >
        <div style={{ padding: "16px 20px" }}>
          {/* Info text */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px", marginBottom: 16, borderRadius: 14,
            background: "var(--dp-accent-soft)",
            border: "1px solid var(--dp-accent-border)",
          }}>
            <Brain size={18} color="var(--dp-accent)" strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--dp-text-primary)", lineHeight: 1.5 }}>
              {t("chat.memoryInfo") || "I remember these things about you across conversations. You can delete any memory at any time."}
            </span>
          </div>

          {/* Memory list */}
          {memoriesQuery.isLoading ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--dp-text-tertiary)", fontSize: 13 }}>
              {t("chat.loading") || "Loading..."}
            </div>
          ) : memories.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
                background: "var(--dp-glass-bg)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Brain size={24} color="var(--dp-text-muted)" strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 14, color: "var(--dp-text-tertiary)", lineHeight: 1.5 }}>
                {t("chat.noMemories") || "No memories yet. As we chat, I'll remember important things you share."}
              </div>
            </div>
          ) : (
            <>
              {memories.map(function (mem) {
                var categoryColors = {
                  preference: { bg: "rgba(139,92,246,0.15)", text: "var(--dp-accent)", label: t("chat.memPreference") || "Preference" },
                  fact: { bg: "rgba(93,229,168,0.15)", text: "var(--dp-success)", label: t("chat.memFact") || "Fact" },
                  goal_context: { bg: "rgba(251,191,36,0.15)", text: "var(--dp-warning)", label: t("chat.memGoalContext") || "Goal" },
                  style: { bg: "rgba(96,165,250,0.15)", text: "rgb(96,165,250)", label: t("chat.memStyle") || "Style" },
                };
                var cat = categoryColors[mem.key] || categoryColors.fact;
                var importanceDots = [];
                for (var d = 0; d < 5; d++) {
                  importanceDots.push(
                    <div key={d} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: d < mem.importance ? cat.text : "var(--dp-glass-border)",
                      transition: "background 0.2s",
                    }} />
                  );
                }
                return (
                  <div key={mem.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "14px 16px", marginBottom: 8, borderRadius: 14,
                    background: "var(--dp-glass-bg)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid var(--dp-glass-border)",
                    transition: "all 0.2s",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Category badge + importance */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                          padding: "3px 8px", borderRadius: 8,
                          background: cat.bg, color: cat.text,
                        }}>
                          {cat.label}
                        </span>
                        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                          {importanceDots}
                        </div>
                      </div>
                      {/* Content */}
                      <div style={{ fontSize: 13, color: "var(--dp-text-primary)", lineHeight: 1.5 }}>
                        {mem.content}
                      </div>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={function () { deleteMemoryMut.mutate(mem.id); }}
                      aria-label="Delete memory"
                      style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: "none", border: "1px solid var(--dp-glass-border)",
                        color: "var(--dp-text-muted)", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.2s",
                      }}
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                );
              })}

              {/* Clear All button */}
              <button
                onClick={function () { clearMemoriesMut.mutate(); }}
                disabled={clearMemoriesMut.isPending}
                style={{
                  width: "100%", padding: "12px 16px", marginTop: 12, borderRadius: 14,
                  background: "none", border: "1px solid var(--dp-error-border, rgba(239,68,68,0.3))",
                  color: "var(--dp-error, #ef4444)", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                  opacity: clearMemoriesMut.isPending ? 0.5 : 1,
                }}
              >
                <Trash2 size={14} strokeWidth={2} style={{ verticalAlign: "middle", marginRight: 6, marginTop: -2 }} />
                {t("chat.clearAllMemories") || "Clear All Memories"}
              </button>
            </>
          )}
        </div>
      </GlassModal>

      {/* ── Natural Task Creator from AI chat ── */}
      <NaturalTaskCreator
        open={naturalTaskOpen}
        onClose={function () { setNaturalTaskOpen(false); setNaturalTaskText(""); }}
        initialText={naturalTaskText}
      />
    </div>
  );
}

// ─── MESSAGE BUBBLE ──────────────────────────────────────────────
function MsgBubble({msg,userInitial,showActions,copiedId,onPointerDown,onPointerUp,onCopy,onPin,onLike,onBranch,onCreateTask,onSummarizeVoice,summarizingVoiceId,reactionPicker,setReactionPicker,handleReaction}){
  const{resolved}=useTheme();const isLight=resolved==="light";
  const isCopied=copiedId===msg.id;
  var [summaryOpen, setSummaryOpen] = useState(false);
  var [checkedItems, setCheckedItems] = useState({});

  var voiceSummary = (msg.metadata && msg.metadata.voice_summary) || (msg.metadata && msg.metadata.voiceSummary) || null;
  var isVoice = !!(msg.audioUrl);
  var isSummarizing = summarizingVoiceId === msg.id;

  var toggleChecked = function (idx) {
    setCheckedItems(function (prev) {
      var next = Object.assign({}, prev);
      next[idx] = !next[idx];
      return next;
    });
  };

  var actionItems = [
    {icon:Pin,active:msg.pinned,activeColor:"var(--dp-accent)",action:onPin,tip:"Pin"},
    {icon:Heart,active:msg.liked,activeColor:"var(--dp-danger)",action:onLike,tip:"Like"},
    {icon:isCopied?Check:Copy,active:isCopied,activeColor:"var(--dp-success)",action:onCopy,tip:"Copy"},
  ];
  // Add branch button for AI messages only
  if (onBranch && !msg.isUser) {
    actionItems.push({icon:GitBranch,active:false,activeColor:"var(--dp-accent)",action:onBranch,tip:"Branch"});
  }
  // Add "Create Task" button for AI messages only
  if (onCreateTask && !msg.isUser) {
    actionItems.push({icon:ListTodo,active:false,activeColor:"var(--dp-success, #10B981)",action:function(){onCreateTask(msg.content);},tip:"Create Task"});
  }

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
      {actionItems.map(({icon:I,active,activeColor,action,tip},j)=>(
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
          <I size={15} strokeWidth={2.2} fill={active&&tip!=="Copy"&&tip!=="Branch"?activeColor:"none"}/>
        </button>
      ))}
    </div>
  );

  /* ─── Voice Summary Section (shared between user and AI voice messages) ─── */
  var voiceSummarySection = null;
  if (isVoice) {
    voiceSummarySection = (
      <div style={{ marginTop: 8 }}>
        {voiceSummary ? (
          <>
            {/* Collapsible summary toggle */}
            <button
              onClick={function (e) { e.stopPropagation(); setSummaryOpen(function (p) { return !p; }); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, width: "100%",
                padding: "6px 0", background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit", color: "var(--dp-accent)", fontSize: 12, fontWeight: 600,
                transition: "opacity 0.15s",
              }}
            >
              <FileText size={13} strokeWidth={2.2} />
              <span>Summary</span>
              {voiceSummary.mood && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 8,
                  background: "var(--dp-accent-soft)", color: "var(--dp-accent)",
                  textTransform: "capitalize", marginLeft: 2,
                }}>{voiceSummary.mood}</span>
              )}
              <ChevronRight size={13} strokeWidth={2.5} style={{
                marginLeft: "auto", transition: "transform 0.2s",
                transform: summaryOpen ? "rotate(90deg)" : "rotate(0deg)",
              }} />
            </button>

            {/* Expanded summary content */}
            <div style={{
              maxHeight: summaryOpen ? 600 : 0,
              opacity: summaryOpen ? 1 : 0,
              overflow: "hidden",
              transition: "max-height 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease",
            }}>
              <div style={{
                padding: "10px 12px", borderRadius: 12, marginTop: 4,
                background: "var(--dp-glass-bg)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid var(--dp-glass-border)",
              }}>
                {/* Summary text */}
                <div style={{ fontSize: 13, color: "var(--dp-text-primary)", lineHeight: 1.5, marginBottom: 8 }}>
                  {voiceSummary.summary}
                </div>

                {/* Key points */}
                {voiceSummary.key_points && voiceSummary.key_points.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dp-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                      Key Points
                    </div>
                    {voiceSummary.key_points.map(function (pt, idx) {
                      return (
                        <div key={idx} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--dp-accent)", marginTop: 6, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: "var(--dp-text-primary)", lineHeight: 1.45 }}>{pt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action items */}
                {voiceSummary.action_items && voiceSummary.action_items.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dp-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                      Action Items
                    </div>
                    {voiceSummary.action_items.map(function (ai, idx) {
                      var priorityColors = {
                        high: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
                        medium: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24" },
                        low: { bg: "rgba(93,229,168,0.15)", text: "var(--dp-success)" },
                      };
                      var pc = priorityColors[ai.priority] || priorityColors.medium;
                      var isChecked = !!checkedItems[idx];
                      return (
                        <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <button
                            onClick={function (e) { e.stopPropagation(); toggleChecked(idx); }}
                            style={{
                              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                              border: isChecked ? "none" : "1.5px solid var(--dp-glass-border)",
                              background: isChecked ? "var(--dp-success)" : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", transition: "all 0.2s",
                            }}
                          >
                            {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                          </button>
                          <span style={{
                            fontSize: 12, color: "var(--dp-text-primary)", lineHeight: 1.45, flex: 1,
                            textDecoration: isChecked ? "line-through" : "none",
                            opacity: isChecked ? 0.5 : 1,
                          }}>{ai.item}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                            background: pc.bg, color: pc.text, textTransform: "uppercase",
                            flexShrink: 0,
                          }}>{ai.priority}</span>
                        </div>
                      );
                    })}

                    {/* Create Tasks button */}
                    {onCreateTask && (
                      <button
                        onClick={function (e) {
                          e.stopPropagation();
                          var taskText = voiceSummary.action_items.map(function (ai) { return ai.item; }).join("\n");
                          onCreateTask(taskText);
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "6px 12px", marginTop: 6, borderRadius: 10,
                          background: "var(--dp-accent-soft)",
                          border: "1px solid var(--dp-accent-border)",
                          color: "var(--dp-accent)", fontSize: 11, fontWeight: 600,
                          cursor: "pointer", fontFamily: "inherit",
                          transition: "all 0.2s",
                        }}
                      >
                        <ListTodo size={12} strokeWidth={2.2} />
                        Create Tasks
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* No summary yet -- show Summarize button */
          <button
            onClick={function (e) { e.stopPropagation(); if (onSummarizeVoice) onSummarizeVoice(msg.id); }}
            disabled={isSummarizing || !onSummarizeVoice}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 10, marginTop: 4,
              background: "var(--dp-glass-bg)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--dp-glass-border)",
              color: "var(--dp-accent)", fontSize: 12, fontWeight: 600,
              cursor: isSummarizing ? "default" : "pointer", fontFamily: "inherit",
              opacity: isSummarizing ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {isSummarizing ? (
              <>
                <Loader size={12} strokeWidth={2.5} style={{ animation: "spin 0.8s linear infinite" }} />
                <span>Summarizing...</span>
              </>
            ) : (
              <>
                <FileText size={12} strokeWidth={2.2} />
                <span>Summarize</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

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
            {isVoice ? (
              <>
                <VoicePlayer audioUrl={msg.audioUrl} duration={msg.audioDuration} isUser={true} />
                {msg.transcription && msg.content !== msg.transcription && (
                  <div style={{ fontSize: 12, color: "var(--dp-text-primary)", lineHeight: 1.45, marginTop: 6, fontStyle: "italic", opacity: 0.8 }}>{msg.transcription}</div>
                )}
              </>
            ) : (
              <div style={{fontSize:14,color:"var(--dp-text)",lineHeight:1.55,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{msg.content}</div>
            )}
            {voiceSummarySection}
            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6,marginTop:6}}>
              {isVoice && <Mic size={10} color="var(--dp-text-tertiary)" strokeWidth={2.5} />}
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
          <div style={{fontSize:14,color:"var(--dp-text-primary)",lineHeight:1.6,whiteSpace:"pre-wrap",wordBreak:"break-word"}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(formatMarkdown(msg.content),{ALLOWED_TAGS:["strong","br"],ALLOWED_ATTR:["style"]})}}/>
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
