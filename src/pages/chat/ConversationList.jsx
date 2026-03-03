import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../services/api";
import { CONVERSATIONS, SOCIAL } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import BottomNav from "../../components/shared/BottomNav";
import ErrorState from "../../components/shared/ErrorState";
import { ConversationSkeleton } from "../../components/shared/Skeleton";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import Avatar from "../../components/shared/Avatar";
import GlassInput from "../../components/shared/GlassInput";
import GlassModal from "../../components/shared/GlassModal";
import PillTabs from "../../components/shared/PillTabs";
import { sanitizeSearch } from "../../utils/sanitize";
import useAgoraPresence from "../../hooks/useAgoraPresence";
import {
  CONV_TYPES as CONV_COLORS, CONTACT_COLORS, BRAND, adaptColor,
} from "../../styles/colors";
import {
  ArrowLeft, Search, Bot, Sparkles, Flag, Heart, Brain,
  Users, MessageCircle, ChevronRight, Trash2, Plus, X,
  Clock, MoreVertical, Pin, Archive, Phone
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Conversation List Screen v1
 * 
 * Elements from Flutter original:
 * - GlassAppBar with title "Conversations"
 * - List of conversation cards with type icon, title, message count
 * - Conversation types: dream_creation, planning, motivation, check_in, buddy_chat
 * - Swipe to delete
 * - Empty state
 * 
 * UX Improvements:
 * - Search bar (glass) to filter conversations
 * - Filter tabs (All, AI Coach, Planning, Check-in, Buddy)
 * - Last message preview + time ago
 * - Unread indicator dot
 * - Pinned conversations section
 * - Context menu on long-press/right-click (Pin, Archive, Delete)
 * - New conversation button in header
 * - Staggered mount animations
 * - All text 9:1+ contrast
 * ═══════════════════════════════════════════════════════════════════ */

// ─── CONVERSATION TYPE CONFIG ────────────────────────────────────
// Icons live locally; color / bg / label pulled from centralized CONV_COLORS
const CONV_TYPES = {
  general:         { Icon: Bot,      ...CONV_COLORS.general },
  dream_creation:  { Icon: Sparkles, ...CONV_COLORS.dream_creation },
  planning:        { Icon: Flag,     ...CONV_COLORS.planning },
  motivation:      { Icon: Heart,    ...CONV_COLORS.motivation },
  check_in:        { Icon: Brain,    ...CONV_COLORS.check_in },
  buddy_chat:      { Icon: Users,    ...CONV_COLORS.buddy_chat },
};

// Only buddy / circle conversations — AI Coach is in its own screen
const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "buddy_chat", label: "Buddy" },
];

// ─── HELPERS ─────────────────────────────────────────────────────
function timeAgo(date) {
  var d = date instanceof Date ? date : new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  if (s < 604800) return `${Math.floor(s/86400)}d`;
  return `${Math.floor(s/604800)}w`;
}

// ═══════════════════════════════════════════════════════════════════
export default function ConversationListScreen() {
  const navigate=useNavigate();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  var { user } = useAuth();
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // {id, x, y}
  const [showNewChat, setShowNewChat] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // AI conversation types to exclude from this list (shown in AI Coach screen instead)
  var AI_TYPES = ["general", "dream_creation", "planning", "motivation", "check_in", "adjustment", "rescue"];

  var convsUrl = (function () {
    var params = "";
    if (activeFilter !== "all") params += "?conversation_type=" + activeFilter;
    else params += "?conversation_type=buddy_chat";
    if (searchQuery) params += "&search=" + sanitizeSearch(searchQuery);
    return CONVERSATIONS.LIST + params;
  })();
  var convsInf = useInfiniteList({ queryKey: ["conversations", activeFilter, searchQuery], url: convsUrl, limit: 30 });
  var conversations = convsInf.items;

  // Missed calls count for badge
  var callHistoryQuery = useQuery({
    queryKey: ["call-history"],
    queryFn: function () { return apiGet(CONVERSATIONS.CALLS.HISTORY); },
  });
  var missedCallCount = ((callHistoryQuery.data && callHistoryQuery.data.results) || callHistoryQuery.data || []).filter(function (c) {
    return c.status === "missed" && c.calleeId === (user && user.id);
  }).length;

  var friendsQuery = useQuery({
    queryKey: ["buddy-contacts"],
    queryFn: function () { return apiGet(SOCIAL.FRIENDS.LIST); },
  });
  var allFriendsList = (friendsQuery.data && friendsQuery.data.results) || friendsQuery.data || [];
  if (!Array.isArray(allFriendsList)) allFriendsList = [];
  var buddyContacts = allFriendsList.map(function (f, i) {
    return {
      id: f.id,
      name: f.displayName || f.username || "Friend",
      avatar: f.avatar || f.avatarUrl || null,
      initial: (f.displayName || f.username || "F")[0].toUpperCase(),
      color: CONTACT_COLORS[i % CONTACT_COLORS.length],
      status: f.isOnline ? "online" : "offline",
      dream: f.currentDream || "",
    };
  });

  // Agora presence tracking for friend story bar
  var friendIdStrings = allFriendsList.map(function (f) { return String(f.id); });
  var presenceMap = useAgoraPresence(friendIdStrings);
  var onlineFriends = buddyContacts.filter(function (f) { return presenceMap[String(f.id)]; });

  var pinMut = useMutation({
    mutationFn: function (id) { return apiPost(CONVERSATIONS.PIN(id)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["conversations"] }); },
    onError: function (err) { showToast(err.message || "Failed to pin", "error"); },
  });
  var archiveMut = useMutation({
    mutationFn: function (id) { return apiPost(CONVERSATIONS.ARCHIVE(id)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["conversations"] }); },
    onError: function (err) { showToast(err.message || "Failed to archive", "error"); },
  });
  var deleteMut = useMutation({
    mutationFn: function (id) { return apiDelete(CONVERSATIONS.DETAIL(id)); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["conversations"] }); showToast("Conversation deleted", "success"); },
    onError: function (err) { showToast(err.message || "Failed to delete", "error"); },
  });

  var loading = convsInf.isLoading;

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  // Close context menu on outside click
  useEffect(()=>{
    const close = ()=>setContextMenu(null);
    if(contextMenu) window.addEventListener("click",close);
    return()=>window.removeEventListener("click",close);
  },[contextMenu]);

  // ─── Filter & Search ───
  var filtered = conversations.filter(function (c) {
    if (searchQuery && !(c.title || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).map(function (c) {
    return Object.assign({}, c, {
      updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      unread: c.unreadCount || c.unread || 0,
    });
  });
  const pinned = filtered.filter(c => c.isPinned);
  const unpinned = filtered.filter(c => !c.isPinned);
  const totalUnread = conversations.reduce(function (sum, c) { return sum + (c.unreadCount || 0); }, 0);

  if (loading) return (
      <div style={{ width: "100%", padding: "60px 16px 0" }}>
        {[1,2,3,4].map(i => <ConversationSkeleton key={i} style={{ marginBottom: 12 }} />)}
      </div>
  );

  if (convsInf.isError) return (
    <div style={{ width: "100%", padding: "60px 16px 0", display: "flex", justifyContent: "center" }}>
      <ErrorState message={convsInf.error?.message} onRetry={function () { convsInf.refetch(); }} />
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden" }}>

      {/* ═══ APP BAR ═══ */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100 }}>
        <GlassAppBar
          left={
            <IconButton icon={ArrowLeft} onClick={()=>navigate(-1)} label="Go back" />
          }
          title={
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:"var(--dp-text)", letterSpacing:"-0.3px" }}>Messages</div>
              {totalUnread > 0 && <div style={{ fontSize:12, color:"var(--dp-text-secondary)" }}>{totalUnread} unread</div>}
            </div>
          }
          right={
            <div style={{ display:"flex", gap:8 }}>
              <IconButton icon={Phone} onClick={()=>navigate("/calls/history")} label="Call history" badge={missedCallCount > 0 ? (missedCallCount > 9 ? "9+" : missedCallCount) : undefined} />
              <IconButton icon={searchOpen ? X : Search} onClick={()=>{setSearchOpen(!searchOpen);setSearchQuery("");}} label={searchOpen ? "Close search" : "Search"} />
              <IconButton icon={Plus} onClick={()=>{setShowNewChat(true);setContactSearch("");}} label="New conversation" variant="accent" />
            </div>
          }
        />

        {/* Search bar (collapsible) */}
        <div style={{
          overflow:"hidden", transition:"all 0.3s cubic-bezier(0.16,1,0.3,1)",
          maxHeight: searchOpen ? 56 : 0, opacity: searchOpen ? 1 : 0,
          padding: searchOpen ? "0 16px 12px" : "0 16px 0",
          background:"var(--dp-header-bg)", backdropFilter:"blur(40px) saturate(1.4)", WebkitBackdropFilter:"blur(40px) saturate(1.4)",
        }}>
          <GlassInput
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            icon={Search}
          />
        </div>

        {/* Filter tabs */}
        <div style={{
          padding:"0 16px 12px",
          background:"var(--dp-header-bg)", backdropFilter:"blur(40px) saturate(1.4)", WebkitBackdropFilter:"blur(40px) saturate(1.4)",
          borderBottom: onlineFriends.length > 0 ? "none" : "1px solid var(--dp-header-border)",
        }}>
          <PillTabs tabs={FILTER_TABS} active={activeFilter} onChange={setActiveFilter} size="sm" />
        </div>

        {/* ── Online Friends Story Bar ── */}
        {onlineFriends.length > 0 && (
          <div style={{
            padding:"10px 16px 12px",
            background:"var(--dp-header-bg)", backdropFilter:"blur(40px) saturate(1.4)", WebkitBackdropFilter:"blur(40px) saturate(1.4)",
            borderBottom:"1px solid var(--dp-header-border)",
          }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#22C55E", boxShadow:"0 0 6px rgba(34,197,94,0.5)" }} />
                <span style={{ fontSize:12, fontWeight:600, color:"var(--dp-text-secondary)", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                  Online ({onlineFriends.length})
                </span>
              </div>
              <button onClick={function(){navigate("/online-friends");}} style={{
                background:"none", border:"none", cursor:"pointer", padding:"2px 0",
                fontSize:12, fontWeight:600, color:"var(--dp-accent)",
                fontFamily:"inherit",
              }}>
                See All
              </button>
            </div>
            <div style={{
              display:"flex", gap:14, overflowX:"auto", scrollbarWidth:"none",
              WebkitOverflowScrolling:"touch", paddingBottom:2,
            }}>
              {onlineFriends.map(function(friend) {
                return (
                  <div key={friend.id} onClick={function(){navigate("/buddy-chat/" + friend.id);}} style={{
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                    cursor:"pointer", flexShrink:0, width:60,
                  }}>
                    <div style={{ position:"relative" }}>
                      <Avatar name={friend.name} src={friend.avatar} size={48} color={friend.color} />
                      <div style={{
                        position:"absolute", bottom:1, right:1,
                        width:12, height:12, borderRadius:"50%",
                        background:"#22C55E", border:"2px solid var(--dp-bg)",
                        boxShadow:"0 0 6px rgba(34,197,94,0.4)",
                      }} />
                    </div>
                    <span style={{
                      fontSize:11, fontWeight:500, color:"var(--dp-text-secondary)",
                      maxWidth:58, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                      textAlign:"center",
                    }}>
                      {friend.name.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ CONTENT ═══ */}
      <main style={{ position:"absolute", inset:0, overflowY:"auto", overflowX:"hidden", zIndex:10, paddingTop: (searchOpen ? 170 : 128) + (onlineFriends.length > 0 ? 100 : 0), paddingBottom:100, transition:"padding-top 0.3s, opacity 0.3s ease",opacity:uiOpacity}}>
        <div style={{ width:"100%", padding:"0 16px" }}>

          {filtered.length === 0 ? (
            /* ── Empty State ── */
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{ animationDelay:"0ms", textAlign:"center", paddingTop:60 }}>
              <div style={{
                width:80, height:80, borderRadius:"50%", margin:"0 auto 20px",
                background:"rgba(139,92,246,0.08)", display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <MessageCircle size={36} color="var(--dp-text-secondary)" strokeWidth={1.5} />
              </div>
              <div style={{ fontSize:17, fontWeight:600, color:"var(--dp-text)", marginBottom:8 }}>No messages yet</div>
              <div style={{ fontSize:14, color:"var(--dp-text-secondary)", lineHeight:1.5, maxWidth:280, margin:"0 auto" }}>
                Connect with a buddy or join a circle to start chatting
              </div>
            </div>
          ) : (
            <>
              {/* ── Pinned Section ── */}
              {pinned.length > 0 && (
                <>
                  <div className={`dp-a ${mounted?"dp-s":""}`} style={{ animationDelay:"0ms" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                      <Pin size={13} color="var(--dp-text-secondary)" strokeWidth={2.5} />
                      <span style={{ fontSize:12, fontWeight:600, color:"var(--dp-text-secondary)", textTransform:"uppercase", letterSpacing:"0.5px" }}>Pinned</span>
                    </div>
                  </div>
                  {pinned.map((conv, i) => (
                    <ConvCard key={conv.id} conv={conv} index={i} mounted={mounted} delay={80+i*70} isLight={isLight} onClick={()=>navigate(conv.conversationType==="buddy_chat"?`/buddy-chat/${conv.id}`:`/chat/${conv.id}`)} onContext={(e)=>{e.preventDefault();setContextMenu({id:conv.id,x:e.clientX,y:e.clientY});}} />
                  ))}
                  <div style={{ height:16 }} />
                </>
              )}

              {/* ── All / Recent ── */}
              {unpinned.length > 0 && (
                <>
                  {pinned.length > 0 && (
                    <div className={`dp-a ${mounted?"dp-s":""}`} style={{ animationDelay:`${80+pinned.length*70+50}ms` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                        <Clock size={13} color="var(--dp-text-secondary)" strokeWidth={2.5} />
                        <span style={{ fontSize:12, fontWeight:600, color:"var(--dp-text-secondary)", textTransform:"uppercase", letterSpacing:"0.5px" }}>Recent</span>
                      </div>
                    </div>
                  )}
                  {unpinned.map((conv, i) => (
                    <ConvCard key={conv.id} conv={conv} index={i} mounted={mounted} delay={80+(pinned.length+i)*70+100} isLight={isLight} onClick={()=>navigate(conv.conversationType==="buddy_chat"?`/buddy-chat/${conv.id}`:`/chat/${conv.id}`)} onContext={(e)=>{e.preventDefault();setContextMenu({id:conv.id,x:e.clientX,y:e.clientY});}} />
                  ))}
                </>
              )}
            </>
          )}
          <div ref={convsInf.sentinelRef} style={{height:1}} />
          {convsInf.loadingMore && <div style={{textAlign:"center",padding:16,color:"var(--dp-text-muted)",fontSize:13}}>Loading more…</div>}
        </div>
      </main>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {/* ═══ CONTEXT MENU ═══ */}
      {contextMenu && (
        <div style={{
          position:"fixed", left:contextMenu.x, top:contextMenu.y, zIndex:200,
          background:"var(--dp-modal-bg)", backdropFilter:"blur(30px)", WebkitBackdropFilter:"blur(30px)",
          borderRadius:14, border:"1px solid var(--dp-glass-border)",
          boxShadow:"var(--dp-shadow)", padding:6, minWidth:160,
          animation:"dpFadeScale 0.15s ease-out",
        }}>
          {[
            { Icon: Pin, label:"Pin conversation", color:"var(--dp-text-primary)", action: function () {
              pinMut.mutate(contextMenu.id);
            }},
            { Icon: Archive, label:"Archive", color:"var(--dp-text-primary)", action: function () {
              archiveMut.mutate(contextMenu.id);
            }},
            { Icon: Trash2, label:"Delete", color:"var(--dp-danger)", action: function () {
              deleteMut.mutate(contextMenu.id);
            }},
          ].map(({Icon:I, label, color, action}, i) => (
            <button key={i} onClick={()=>{action();setContextMenu(null);}} className="dp-gh" style={{
              display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px",
              background:"none", border:"none", borderRadius:10, cursor:"pointer", color,
              fontSize:13, fontWeight:500, fontFamily:"inherit", transition:"background 0.15s",
            }}>
              <I size={16} strokeWidth={2} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* ═══ NEW CHAT — CONTACT PICKER ═══ */}
      <GlassModal open={showNewChat} onClose={()=>setShowNewChat(false)} variant="bottom" title="New Conversation">
        {/* Search */}
        <div style={{ padding:"12px 20px" }}>
          <GlassInput
            value={contactSearch}
            onChange={e=>setContactSearch(e.target.value)}
            placeholder="Search contacts..."
            icon={Search}
            autoFocus
          />
        </div>

        {/* Contact list */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 12px 20px" }}>
          {buddyContacts
            .filter(c=>c.name.toLowerCase().includes(contactSearch.toLowerCase()))
            .map(contact => (
            <button
              key={contact.id}
              onClick={()=>{setShowNewChat(false);navigate(`/buddy-chat/${contact.id}`);}}
              className="dp-gh"
              style={{
                display:"flex", alignItems:"center", gap:14, width:"100%",
                padding:"12px 12px", borderRadius:14, border:"none",
                background:"none", cursor:"pointer", transition:"background 0.15s",
                fontFamily:"inherit", textAlign:"left",
              }}
            >
              {/* Avatar */}
              <Avatar name={contact.name} size={44} color={contact.color} online={contact.status === "online"} />

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--dp-text)", marginBottom:2 }}>
                  {contact.name}
                </div>
                <div style={{ fontSize:12, color:"var(--dp-text-muted)" }}>
                  {contact.dream}
                </div>
              </div>

              {/* Status text */}
              <span style={{
                fontSize:11, fontWeight:500, flexShrink:0,
                color: contact.status === "online" ? "var(--dp-online)" : "var(--dp-text-muted)",
              }}>
                {contact.status === "online" ? "Online" : "Offline"}
              </span>
            </button>
          ))}

          {buddyContacts.filter(c=>c.name.toLowerCase().includes(contactSearch.toLowerCase())).length === 0 && (
            <div style={{ textAlign:"center", padding:"32px 0", color:"var(--dp-text-muted)", fontSize:14 }}>
              No contacts found
            </div>
          )}
        </div>
      </GlassModal>

      {/* ═══ STYLES ═══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        ::-webkit-scrollbar{width:0;}
        input::placeholder{color:rgba(255,255,255,0.35);}

        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}

        .dp-icon-btn{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.05);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;}
        .dp-icon-btn:hover{background:rgba(255,255,255,0.1);}

        .dp-unread-dot{animation:dpPulse 2s ease-in-out infinite;}
        @keyframes dpPulse{0%,100%{opacity:1;box-shadow:0 0 6px rgba(139,92,246,0.5);}50%{opacity:0.7;box-shadow:0 0 10px rgba(139,92,246,0.3);}}
        @keyframes dpFadeScale{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
        @keyframes dpFadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes dpSlideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}

      `}</style>
    </div>
  );
}

// ─── CONVERSATION CARD ───────────────────────────────────────────
function ConvCard({ conv, index, mounted, delay, isLight, onContext, onClick }) {
  const type = CONV_TYPES[conv.conversationType] || CONV_TYPES.general;
  const TypeIcon = type.Icon;

  return (
    <div className={`dp-a ${mounted?"dp-s":""}`} style={{ animationDelay:`${delay}ms` }}>
      <div onContextMenu={onContext}>
      <GlassCard
        hover
        padding={14}
        mb={10}
        style={{ cursor:"pointer", position:"relative" }}
        onClick={onClick}
      >
        <div style={{ display:"flex", gap:12 }}>
          {/* Type icon */}
          <div style={{
            width:44, height:44, borderRadius:14, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:`${type.bg}15`, border:`1px solid ${type.bg}20`,
          }}>
            <TypeIcon size={20} color={adaptColor(type.color, isLight)} strokeWidth={2} />
          </div>

          {/* Content */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <div style={{
                fontSize:14, fontWeight:600, color:"var(--dp-text)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                flex:1, marginRight:8,
              }}>
                {(conv.title || "").replace(/^Chat with\s+/i, "")}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                <span style={{ fontSize:12, color:"var(--dp-text-secondary)" }}>{timeAgo(conv.updatedAt)}</span>
                {conv.unread > 0 && (
                  <div className="dp-unread-dot" style={{
                    minWidth:18, height:18, borderRadius:9, padding:"0 5px",
                    background:BRAND.purple, display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, fontWeight:700, color:BRAND.white,
                  }}>{conv.unread}</div>
                )}
              </div>
            </div>

            {/* Last message preview */}
            <div style={{
              fontSize:13, color: conv.unread > 0 ? "var(--dp-text-primary)" : "var(--dp-text-secondary)",
              fontWeight: conv.unread > 0 ? 500 : 400,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              marginBottom:6, lineHeight:1.4,
            }}>
              {typeof conv.lastMessage === "object" && conv.lastMessage !== null ? (conv.lastMessage.content || "") : (conv.lastMessage || "")}
            </div>

            {/* Meta row */}
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{
                fontSize:12, fontWeight:500, color:adaptColor(type.color, isLight),
                padding:"2px 8px", borderRadius:8,
                background:`${type.bg}10`,
              }}>
                {type.label}
              </span>
              {conv.dreamTitle && (
                <span style={{ fontSize:12, color:"var(--dp-text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {conv.dreamTitle}
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <div style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
            <ChevronRight size={16} color="var(--dp-text-secondary)" />
          </div>
        </div>

        {/* Pin indicator */}
        {conv.isPinned && (
          <div style={{ position:"absolute", top:6, right:6 }}>
            <Pin size={11} color="var(--dp-text-secondary)" strokeWidth={2.5} style={{ transform:"rotate(45deg)" }} />
          </div>
        )}
      </GlassCard>
      </div>
    </div>
  );
}

