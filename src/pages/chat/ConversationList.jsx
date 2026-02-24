import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../../services/api";
import useInfiniteList from "../../hooks/useInfiniteList";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import BottomNav from "../../components/shared/BottomNav";
import ErrorState from "../../components/shared/ErrorState";
import { ConversationSkeleton } from "../../components/shared/Skeleton";
import {
  ArrowLeft, Search, Bot, Sparkles, Flag, Heart, Brain,
  Users, MessageCircle, ChevronRight, Trash2, Plus, X,
  Clock, MoreVertical, Pin, Archive
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
const CONV_TYPES = {
  dream_coaching:  { Icon: Bot,      color: "#C4B5FD", bg: "#8B5CF6", label: "AI Coach" },
  dream_creation:  { Icon: Sparkles, color: "#FCD34D", bg: "#F59E0B", label: "Creation" },
  planning:        { Icon: Flag,     color: "#5DE5A8", bg: "#10B981", label: "Planning" },
  motivation:      { Icon: Heart,    color: "#F69A9A", bg: "#EF4444", label: "Motivation" },
  check_in:        { Icon: Brain,    color: "#93C5FD", bg: "#3B82F6", label: "Check-in" },
  buddy_chat:      { Icon: Users,    color: "#5EEAD4", bg: "#14B8A6", label: "Buddy" },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "dream_coaching", label: "AI Coach" },
  { key: "planning", label: "Planning" },
  { key: "check_in", label: "Check-in" },
  { key: "buddy_chat", label: "Buddy" },
];

var CONTACT_COLORS = ["#14B8A6", "#EC4899", "#F59E0B", "#6366F1", "#10B981", "#8B5CF6", "#EF4444"];

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

  var convsUrl = (function () {
    var params = "";
    if (activeFilter !== "all") params += "?type=" + activeFilter;
    if (searchQuery) params += (params ? "&" : "?") + "search=" + searchQuery;
    return "/api/conversations/" + params;
  })();
  var convsInf = useInfiniteList({ queryKey: ["conversations", activeFilter, searchQuery], url: convsUrl, limit: 30 });
  var conversations = convsInf.items;

  var friendsQuery = useQuery({
    queryKey: ["buddy-contacts"],
    queryFn: function () { return apiGet("/api/social/friends/"); },
    enabled: showNewChat,
  });
  var buddyContacts = ((friendsQuery.data && friendsQuery.data.results) || friendsQuery.data || []).map(function (f, i) {
    return {
      id: f.id,
      name: f.displayName || f.username || "Friend",
      initial: (f.displayName || f.username || "F")[0].toUpperCase(),
      color: CONTACT_COLORS[i % CONTACT_COLORS.length],
      status: f.isOnline ? "online" : "offline",
      dream: f.currentDream || "",
    };
  });

  var pinMut = useMutation({
    mutationFn: function (id) { return apiPost("/api/conversations/" + id + "/pin/"); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["conversations"] }); },
    onError: function (err) { showToast(err.message || "Failed to pin", "error"); },
  });
  var archiveMut = useMutation({
    mutationFn: function (id) { return apiPost("/api/conversations/" + id + "/archive/"); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["conversations"] }); },
    onError: function (err) { showToast(err.message || "Failed to archive", "error"); },
  });
  var deleteMut = useMutation({
    mutationFn: function (id) { return apiDelete("/api/conversations/" + id + "/"); },
    onSuccess: function () { queryClient.invalidateQueries({ queryKey: ["conversations"] }); showToast("Conversation deleted", "success"); },
    onError: function (err) { showToast(err.message || "Failed to delete", "error"); },
  });

  var loading = convsInf.isLoading;

  const iconBtnStyle = {
    width:40,height:40,borderRadius:12,
    border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",
    background:isLight?"rgba(139,92,246,0.06)":"rgba(255,255,255,0.05)",
    color:isLight?"#1a1535":"#fff",display:"flex",alignItems:"center",justifyContent:"center",
    cursor:"pointer",transition:"all 0.2s",
  };

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
    });
  });
  const pinned = filtered.filter(c => c.pinned);
  const unpinned = filtered.filter(c => !c.pinned);
  const totalUnread = conversations.reduce(function (sum, c) { return sum + (c.unread || 0); }, 0);

  if (loading) return (
      <div style={{ width: "100%", padding: "60px 16px 0" }}>
        {[1,2,3,4].map(i => <ConversationSkeleton key={i} isLight={isLight} style={{ marginBottom: 12 }} />)}
      </div>
  );

  if (convsInf.isError) return (
    <div style={{ width: "100%", padding: "60px 16px 0", display: "flex", justifyContent: "center" }}>
      <ErrorState message={convsInf.error?.message} onRetry={function () { convsInf.refetch(); }} />
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden", fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif" }}>

      {/* ═══ APP BAR ═══ */}
      <header style={{
        position:"fixed",top:0,left:0,right:0,zIndex:100,
        background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",
        borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)",
      }}>
        {/* Top row */}
        <div style={{ height:64, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button className="dp-icon-btn" style={iconBtnStyle} onClick={()=>navigate(-1)} aria-label="Go back"><ArrowLeft size={20} strokeWidth={2} /></button>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:isLight?"#1a1535":"#fff", letterSpacing:"-0.3px" }}>Conversations</div>
              {totalUnread > 0 && <div style={{ fontSize:12, color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)" }}>{totalUnread} unread</div>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="dp-icon-btn" style={iconBtnStyle} onClick={()=>{setSearchOpen(!searchOpen);setSearchQuery("");}} aria-label={searchOpen ? "Close search" : "Search"}>
              {searchOpen ? <X size={18} strokeWidth={2}/> : <Search size={18} strokeWidth={2}/>}
            </button>
            <button className="dp-icon-btn" style={{...iconBtnStyle, background:"linear-gradient(135deg,rgba(139,92,246,0.2),rgba(109,40,217,0.2))", borderColor:"rgba(139,92,246,0.25)"}} aria-label="New conversation" onClick={()=>{setShowNewChat(true);setContactSearch("");}}>
              <Plus size={18} strokeWidth={2.5} color={isLight ? "#6D28D9" : "#C4B5FD"} />
            </button>
          </div>
        </div>

        {/* Search bar (collapsible) */}
        <div style={{
          overflow:"hidden", transition:"all 0.3s cubic-bezier(0.16,1,0.3,1)",
          maxHeight: searchOpen ? 56 : 0, opacity: searchOpen ? 1 : 0,
          padding: searchOpen ? "0 16px 12px" : "0 16px 0",
        }}>
          <div style={{
            display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
            borderRadius:14, background:"var(--dp-surface)",
            border:"1px solid var(--dp-input-border)",
          }}>
            <Search size={16} color={isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"} strokeWidth={2} />
            <input
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              style={{
                flex:1, background:"none", border:"none", outline:"none",
                color:isLight?"#1a1535":"#fff", fontSize:14, fontFamily:"inherit",
              }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{
          display:"flex", gap:6, padding:"0 16px 12px", overflowX:"auto",
        }}>
          {FILTER_TABS.map(tab => {
            const active = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={()=>setActiveFilter(tab.key)}
                style={{
                  padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer",
                  fontSize:12, fontWeight:active ? 600 : 500, whiteSpace:"nowrap",
                  background: active ? (isLight ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.18)") : isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.04)",
                  color: active ? (isLight ? "#7C3AED" : "#C4B5FD") : isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)",
                  transition:"all 0.25s",
                  outline: active ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ═══ CONTENT ═══ */}
      <main style={{ position:"absolute", inset:0, overflowY:"auto", overflowX:"hidden", zIndex:10, paddingTop: searchOpen ? 170 : 128, paddingBottom:100, transition:"padding-top 0.3s, opacity 0.3s ease",opacity:uiOpacity}}>
        <div style={{ width:"100%", padding:"0 16px" }}>

          {filtered.length === 0 ? (
            /* ── Empty State ── */
            <div className={`dp-a ${mounted?"dp-s":""}`} style={{ animationDelay:"0ms", textAlign:"center", paddingTop:60 }}>
              <div style={{
                width:80, height:80, borderRadius:"50%", margin:"0 auto 20px",
                background:"rgba(139,92,246,0.08)", display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <MessageCircle size={36} color={isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)"} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize:17, fontWeight:600, color:isLight?"#1a1535":"#fff", marginBottom:8 }}>No conversations yet</div>
              <div style={{ fontSize:14, color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)", lineHeight:1.5, maxWidth:280, margin:"0 auto" }}>
                Start a conversation from a dream's AI Coach or connect with a buddy
              </div>
            </div>
          ) : (
            <>
              {/* ── Pinned Section ── */}
              {pinned.length > 0 && (
                <>
                  <div className={`dp-a ${mounted?"dp-s":""}`} style={{ animationDelay:"0ms" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                      <Pin size={13} color={isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)"} strokeWidth={2.5} />
                      <span style={{ fontSize:12, fontWeight:600, color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)", textTransform:"uppercase", letterSpacing:"0.5px" }}>Pinned</span>
                    </div>
                  </div>
                  {pinned.map((conv, i) => (
                    <ConvCard key={conv.id} conv={conv} index={i} mounted={mounted} delay={80+i*70} isLight={isLight} onClick={()=>navigate(conv.type==="buddy_chat"?`/buddy-chat/${conv.id}`:`/chat/${conv.id}`)} onContext={(e)=>{e.preventDefault();setContextMenu({id:conv.id,x:e.clientX,y:e.clientY});}} />
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
                        <Clock size={13} color={isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)"} strokeWidth={2.5} />
                        <span style={{ fontSize:12, fontWeight:600, color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)", textTransform:"uppercase", letterSpacing:"0.5px" }}>Recent</span>
                      </div>
                    </div>
                  )}
                  {unpinned.map((conv, i) => (
                    <ConvCard key={conv.id} conv={conv} index={i} mounted={mounted} delay={80+(pinned.length+i)*70+100} isLight={isLight} onClick={()=>navigate(conv.type==="buddy_chat"?`/buddy-chat/${conv.id}`:`/chat/${conv.id}`)} onContext={(e)=>{e.preventDefault();setContextMenu({id:conv.id,x:e.clientX,y:e.clientY});}} />
                  ))}
                </>
              )}
            </>
          )}
          <div ref={convsInf.sentinelRef} style={{height:1}} />
          {convsInf.loadingMore && <div style={{textAlign:"center",padding:16,color:isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.4)",fontSize:13}}>Loading more…</div>}
        </div>
      </main>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {/* ═══ CONTEXT MENU ═══ */}
      {contextMenu && (
        <div style={{
          position:"fixed", left:contextMenu.x, top:contextMenu.y, zIndex:200,
          background:isLight?"rgba(255,255,255,0.97)":"rgba(20,16,35,0.95)", backdropFilter:"blur(30px)", WebkitBackdropFilter:"blur(30px)",
          borderRadius:14, border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",
          boxShadow:"0 12px 40px rgba(0,0,0,0.5)", padding:6, minWidth:160,
          animation:"dpFadeScale 0.15s ease-out",
        }}>
          {[
            { Icon: Pin, label:"Pin conversation", color:isLight?"rgba(26,21,53,0.85)":"rgba(255,255,255,0.85)", action: function () {
              pinMut.mutate(contextMenu.id);
            }},
            { Icon: Archive, label:"Archive", color:isLight?"rgba(26,21,53,0.85)":"rgba(255,255,255,0.85)", action: function () {
              archiveMut.mutate(contextMenu.id);
            }},
            { Icon: Trash2, label:"Delete", color:isLight?"#DC2626":"#F69A9A", action: function () {
              deleteMut.mutate(contextMenu.id);
            }},
          ].map(({Icon:I, label, color, action}, i) => (
            <button key={i} onClick={()=>{action();setContextMenu(null);}} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px",
              background:"none", border:"none", borderRadius:10, cursor:"pointer", color,
              fontSize:13, fontWeight:500, fontFamily:"inherit", transition:"background 0.15s",
            }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}
            >
              <I size={16} strokeWidth={2} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* ═══ NEW CHAT — CONTACT PICKER ═══ */}
      {showNewChat && (
        <div
          onClick={()=>setShowNewChat(false)}
          style={{
            position:"fixed", inset:0, zIndex:300,
            background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)",
            display:"flex", alignItems:"flex-end", justifyContent:"center",
            animation:"dpFadeIn 0.2s ease-out",
          }}
        >
          <div
            onClick={e=>e.stopPropagation()}
            style={{
              width:"100%",
              maxHeight:"70vh",
              borderRadius:"24px 24px 0 0",
              background:isLight?"rgba(255,255,255,0.97)":"rgba(20,16,40,0.97)",
              backdropFilter:"blur(40px)", WebkitBackdropFilter:"blur(40px)",
              border:isLight?"1px solid rgba(139,92,246,0.12)":"1px solid rgba(255,255,255,0.08)",
              borderBottom:"none",
              boxShadow:"0 -8px 40px rgba(0,0,0,0.3)",
              display:"flex", flexDirection:"column",
              animation:"dpSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Handle bar */}
            <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:isLight?"rgba(0,0,0,0.15)":"rgba(255,255,255,0.15)" }} />
            </div>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 20px 16px" }}>
              <span style={{ fontSize:17, fontWeight:700, color:isLight?"#1a1535":"#fff", letterSpacing:"-0.3px" }}>New Conversation</span>
              <button onClick={()=>setShowNewChat(false)} style={{
                width:32, height:32, borderRadius:10,
                background:isLight?"rgba(0,0,0,0.05)":"rgba(255,255,255,0.08)",
                border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                color:isLight?"rgba(26,21,53,0.6)":"rgba(255,255,255,0.5)",
              }}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding:"0 20px 12px" }}>
              <div style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                borderRadius:14, background:"var(--dp-surface)",
                border:"1px solid var(--dp-input-border)",
              }}>
                <Search size={16} color={isLight?"rgba(26,21,53,0.4)":"rgba(255,255,255,0.4)"} strokeWidth={2} />
                <input
                  value={contactSearch}
                  onChange={e=>setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  autoFocus
                  style={{
                    flex:1, background:"none", border:"none", outline:"none",
                    color:isLight?"#1a1535":"#fff", fontSize:14, fontFamily:"inherit",
                  }}
                />
              </div>
            </div>

            {/* Contact list */}
            <div style={{ flex:1, overflowY:"auto", padding:"0 12px 20px" }}>
              {buddyContacts
                .filter(c=>c.name.toLowerCase().includes(contactSearch.toLowerCase()))
                .map(contact => (
                <button
                  key={contact.id}
                  onClick={()=>{setShowNewChat(false);navigate(`/buddy-chat/${contact.id}`);}}
                  style={{
                    display:"flex", alignItems:"center", gap:14, width:"100%",
                    padding:"12px 12px", borderRadius:14, border:"none",
                    background:"none", cursor:"pointer", transition:"background 0.15s",
                    fontFamily:"inherit", textAlign:"left",
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background=isLight?"rgba(139,92,246,0.06)":"rgba(255,255,255,0.05)"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}
                >
                  {/* Avatar */}
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <div style={{
                      width:44, height:44, borderRadius:14,
                      background:`${contact.color}18`, border:`1.5px solid ${contact.color}30`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:16, fontWeight:700, color:contact.color,
                    }}>
                      {contact.initial}
                    </div>
                    {/* Online dot */}
                    {contact.status === "online" && (
                      <div style={{
                        position:"absolute", bottom:-1, right:-1,
                        width:12, height:12, borderRadius:"50%",
                        background:"#22C55E",
                        border:isLight?"2.5px solid #fff":"2.5px solid #141028",
                      }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:isLight?"#1a1535":"#fff", marginBottom:2 }}>
                      {contact.name}
                    </div>
                    <div style={{ fontSize:12, color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)" }}>
                      {contact.dream}
                    </div>
                  </div>

                  {/* Status text */}
                  <span style={{
                    fontSize:11, fontWeight:500, flexShrink:0,
                    color: contact.status === "online" ? "#22C55E" : (isLight?"rgba(26,21,53,0.4)":"rgba(255,255,255,0.3)"),
                  }}>
                    {contact.status === "online" ? "Online" : "Offline"}
                  </span>
                </button>
              ))}

              {buddyContacts.filter(c=>c.name.toLowerCase().includes(contactSearch.toLowerCase())).length === 0 && (
                <div style={{ textAlign:"center", padding:"32px 0", color:isLight?"rgba(26,21,53,0.5)":"rgba(255,255,255,0.4)", fontSize:14 }}>
                  No contacts found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
  const type = CONV_TYPES[conv.type] || CONV_TYPES.dream_coaching;
  const TypeIcon = type.Icon;

  return (
    <div className={`dp-a ${mounted?"dp-s":""}`} style={{ animationDelay:`${delay}ms` }}>
      <div
        className="dp-g dp-gh"
        style={{ padding:14, marginBottom:10, cursor:"pointer", position:"relative" }}
        onClick={onClick}
        onContextMenu={onContext}
      >
        <div style={{ display:"flex", gap:12 }}>
          {/* Type icon */}
          <div style={{
            width:44, height:44, borderRadius:14, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:`${type.bg}15`, border:`1px solid ${type.bg}20`,
          }}>
            <TypeIcon size={20} color={isLight ? ({"#C4B5FD":"#6D28D9","#FCD34D":"#B45309","#5DE5A8":"#059669","#F69A9A":"#DC2626","#5EEAD4":"#0D9488"}[type.color] || type.color) : type.color} strokeWidth={2} />
          </div>

          {/* Content */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <div style={{
                fontSize:14, fontWeight:600, color:isLight?"#1a1535":"#fff",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                flex:1, marginRight:8,
              }}>
                {conv.title}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                <span style={{ fontSize:12, color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)" }}>{timeAgo(conv.updatedAt)}</span>
                {conv.unread > 0 && (
                  <div className="dp-unread-dot" style={{
                    minWidth:18, height:18, borderRadius:9, padding:"0 5px",
                    background:"#8B5CF6", display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, fontWeight:700, color:"#fff",
                  }}>{conv.unread}</div>
                )}
              </div>
            </div>

            {/* Last message preview */}
            <div style={{
              fontSize:13, color: conv.unread > 0 ? (isLight?"rgba(26,21,53,0.85)":"rgba(255,255,255,0.85)") : (isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)"),
              fontWeight: conv.unread > 0 ? 500 : 400,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              marginBottom:6, lineHeight:1.4,
            }}>
              {conv.lastMessage}
            </div>

            {/* Meta row */}
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{
                fontSize:12, fontWeight:500, color:isLight ? ({"#C4B5FD":"#6D28D9","#FCD34D":"#B45309","#5DE5A8":"#059669","#F69A9A":"#DC2626","#5EEAD4":"#0D9488"}[type.color] || type.color) : type.color,
                padding:"2px 8px", borderRadius:8,
                background:`${type.bg}10`,
              }}>
                {type.label}
              </span>
              {conv.dreamTitle && (
                <span style={{ fontSize:12, color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {conv.dreamTitle}
                </span>
              )}
            </div>
          </div>

          {/* Chevron */}
          <div style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
            <ChevronRight size={16} color={isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)"} />
          </div>
        </div>

        {/* Pin indicator */}
        {conv.pinned && (
          <div style={{ position:"absolute", top:6, right:6 }}>
            <Pin size={11} color={isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)"} strokeWidth={2.5} style={{ transform:"rotate(45deg)" }} />
          </div>
        )}
      </div>
    </div>
  );
}

