import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../../services/api";
import { SOCIAL, DREAMS } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import PageLayout from "../../components/shared/PageLayout";
import { SkeletonCard } from "../../components/shared/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { sanitizeText, sanitizeUrl } from "../../utils/sanitize";
import { Heart, MessageCircle, Send, Plus, Sparkles, Share2, ArrowLeft, MoreVertical, Pencil, Trash2, Flame, Star, Zap, ArrowRight, ThumbsUp } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Dream Posts Feed Screen
 * Social feed of dream posts with create, like, comment, encourage.
 * ═══════════════════════════════════════════════════════════════════ */

var AVATAR_COLORS = ["#8B5CF6","#14B8A6","#EC4899","#3B82F6","#10B981","#FCD34D","#6366F1","#EF4444"];
var F = "Inter, sans-serif";

var glass = {
  background:"var(--dp-glass-bg)", backdropFilter:"blur(40px)", WebkitBackdropFilter:"blur(40px)",
  border:"1px solid var(--dp-input-border)", borderRadius:20,
  boxShadow:"inset 0 1px 0 rgba(255,255,255,0.06)",
};

function avatarColor(name) {
  var h = 0;
  for (var i = 0; i < (name||"").length; i++) h = (name.charCodeAt(i) + ((h << 5) - h)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function timeAgo(ds) {
  var s = Math.floor((Date.now() - new Date(ds).getTime()) / 1000);
  if (s < 60) return "now"; if (s < 3600) return Math.floor(s/60)+"m";
  if (s < 86400) return Math.floor(s/3600)+"h"; return Math.floor(s/86400)+"d";
}

var VIS = [{value:"public",label:"Public"},{value:"friends",label:"Friends"},{value:"private",label:"Private"}];

var ENCOURAGE_TYPES = [
  { type: "you_got_this", icon: ThumbsUp, label: "You got this!", color: "#3B82F6" },
  { type: "keep_going", icon: ArrowRight, label: "Keep going!", color: "#10B981" },
  { type: "inspired", icon: Sparkles, label: "Inspired!", color: "#A855F7" },
  { type: "proud", icon: Star, label: "Proud!", color: "#FCD34D" },
  { type: "fire", icon: Flame, label: "Fire!", color: "#EF4444" },
];

// ── Action button helper ────────────────────────────────────────
function ActionBtn(props) {
  var active = props.active; var ml = props.ml;
  return (
    <button onClick={props.onClick} style={{
      display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:12,
      background:active ? props.activeBg||"transparent" : "transparent",
      border:active ? "1px solid "+(props.activeBorder||"transparent") : "1px solid transparent",
      color:active ? (props.activeColor||"var(--dp-text-tertiary)") : "var(--dp-text-tertiary)",
      fontSize:13,fontWeight:500,fontFamily:F,cursor:"pointer",transition:"all 0.2s",
      marginLeft:ml?"auto":undefined,
    }}>
      {props.children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function DreamPostsFeedScreen() {
  var navigate = useNavigate();
  var qc = useQueryClient();
  var { user } = useAuth();
  var { showToast } = useToast();
  var [mounted, setMounted] = useState(false);
  var [showCreate, setShowCreate] = useState(false);
  var [postMenu, setPostMenu] = useState(null);
  var [editingPost, setEditingPost] = useState(null);
  var [editText, setEditText] = useState("");
  var [content, setContent] = useState("");
  var [dreamId, setDreamId] = useState("");
  var [visibility, setVisibility] = useState("public");
  var [openComments, setOpenComments] = useState(null);
  var [cInputs, setCInputs] = useState({});
  var [encouragePickerFor, setEncouragePickerFor] = useState(null);

  useEffect(function () { var t = setTimeout(function () { setMounted(true); }, 50); return function () { clearTimeout(t); }; }, []);

  // ── Feed (infinite scroll) ────────────────────────────────
  var feedInf = useInfiniteList({ queryKey: ["dream-posts-feed"], url: SOCIAL.POSTS.FEED, limit: 20 });
  var posts = feedInf.items;

  // ── Dreams for create modal ─────────────────────────────────
  var dreamsQ = useQuery({
    queryKey: ["my-dreams-for-post"],
    queryFn: function () { return apiGet(DREAMS.LIST); },
    enabled: showCreate,
  });
  var myDreams = (dreamsQ.data && dreamsQ.data.results) || dreamsQ.data || [];
  if (!Array.isArray(myDreams)) myDreams = [];

  // ── Mutations ───────────────────────────────────────────────
  var createMut = useMutation({
    mutationFn: function (b) { return apiPost(SOCIAL.POSTS.LIST, b); },
    onSuccess: function () {
      showToast("Post published!", "success");
      setShowCreate(false); setContent(""); setDreamId(""); setVisibility("public");
      qc.invalidateQueries({ queryKey: ["dream-posts-feed"] });
    },
    onError: function (e) { showToast(e.message || "Failed to create post", "error"); },
  });

  var likeMut = useMutation({
    mutationFn: function (id) { return apiPost(SOCIAL.POSTS.LIKE(id)); },
    onSuccess: function () { qc.invalidateQueries({ queryKey: ["dream-posts-feed"] }); },
  });

  var encourageMut = useMutation({
    mutationFn: function (d) { return apiPost(SOCIAL.POSTS.ENCOURAGE(d.id), { encouragementType: d.type, message: "" }); },
    onSuccess: function () { showToast("Encouragement sent!", "success"); setEncouragePickerFor(null); qc.invalidateQueries({ queryKey: ["dream-posts-feed"] }); },
    onError: function (e) { showToast(e.message || "Failed to encourage", "error"); },
  });

  // ── Comments ────────────────────────────────────────────────
  var commQ = useQuery({
    queryKey: ["post-comments", openComments],
    queryFn: function () { return apiGet(SOCIAL.POSTS.COMMENTS(openComments)); },
    enabled: !!openComments,
  });
  var comments = (commQ.data && commQ.data.results) || commQ.data || [];
  if (!Array.isArray(comments)) comments = [];

  var commentMut = useMutation({
    mutationFn: function (d) { return apiPost(SOCIAL.POSTS.COMMENT(d.postId), { content: d.content }); },
    onSuccess: function (_, v) {
      setCInputs(function (p) { var n = Object.assign({}, p); n[v.postId] = ""; return n; });
      qc.invalidateQueries({ queryKey: ["post-comments", v.postId] });
      qc.invalidateQueries({ queryKey: ["dream-posts-feed"] });
    },
    onError: function (e) { showToast(e.message || "Failed to add comment", "error"); },
  });

  var editMut = useMutation({
    mutationFn: function (d) { return apiPut(SOCIAL.POSTS.DETAIL(d.id), { content: d.content }); },
    onSuccess: function () {
      showToast("Post updated", "success");
      setEditingPost(null);
      qc.invalidateQueries({ queryKey: ["dream-posts-feed"] });
    },
    onError: function (e) { showToast(e.message || "Failed to update post", "error"); },
  });

  var deleteMut = useMutation({
    mutationFn: function (id) { return apiDelete(SOCIAL.POSTS.DETAIL(id)); },
    onSuccess: function () {
      showToast("Post deleted", "success");
      qc.invalidateQueries({ queryKey: ["dream-posts-feed"] });
    },
    onError: function (e) { showToast(e.message || "Failed to delete post", "error"); },
  });

  // ── Handlers ────────────────────────────────────────────────
  var handleCreate = function () {
    var c = sanitizeText(content, 2000); if (!c) return;
    var body = { content: c, visibility: visibility };
    if (dreamId) body.dreamId = dreamId;
    createMut.mutate(body);
  };

  var handleShare = function (post) {
    if (navigator.share) {
      navigator.share({ title: "Dream Post", text: post.content, url: window.location.href }).catch(function () {});
    } else {
      navigator.clipboard.writeText(post.content || "").then(function () { showToast("Copied to clipboard", "success"); });
    }
  };

  var handleAddComment = function (postId) {
    var t = sanitizeText(cInputs[postId] || "", 1000); if (!t) return;
    commentMut.mutate({ postId: postId, content: t });
  };

  var handleEditPost = function (postId) {
    var c = sanitizeText(editText, 2000); if (!c) return;
    editMut.mutate({ id: postId, content: c });
  };

  var handleDeletePost = function (postId) {
    setPostMenu(null);
    if (!confirm("Delete this post?")) return;
    deleteMut.mutate(postId);
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <PageLayout>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:16,paddingTop:16,paddingBottom:16,opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(-10px)",transition:"all 0.5s cubic-bezier(0.4,0,0.2,1)"}}>
        <button className="dp-ib" onClick={function(){navigate(-1);}}><ArrowLeft size={20} strokeWidth={2}/></button>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Sparkles size={20} color="#C4B5FD" strokeWidth={2}/>
          <h1 style={{fontSize:24,fontWeight:700,color:"var(--dp-text)",fontFamily:F,margin:0}}>Dream Feed</h1>
        </div>
      </div>

      {/* Loading */}
      {feedInf.isLoading && <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {[1,2,3].map(function(i){return <SkeletonCard key={i} height={180} style={{borderRadius:20}}/>;})}</div>}

      {/* Error */}
      {feedInf.isError && (
        <div style={{textAlign:"center",padding:"60px 20px",opacity:mounted?1:0,transition:"opacity 0.5s ease 0.2s"}}>
          <div style={{fontSize:16,fontWeight:600,color:"var(--dp-text-tertiary)",fontFamily:F,marginBottom:8}}>Failed to load feed</div>
          <div style={{fontSize:13,color:"var(--dp-text-secondary)",fontFamily:F,marginBottom:16}}>{(feedInf.error&&feedInf.error.message)||"Something went wrong"}</div>
          <button onClick={function(){feedInf.refetch();}} style={{padding:"10px 24px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#8B5CF6,#6D28D9)",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:F}}>Try Again</button>
        </div>
      )}

      {/* Empty */}
      {!feedInf.isLoading && !feedInf.isError && posts.length===0 && (
        <div style={{textAlign:"center",padding:"60px 20px",opacity:mounted?1:0,transition:"opacity 0.5s ease 0.3s"}}>
          <div style={{width:72,height:72,borderRadius:20,background:"var(--dp-glass-bg)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <Sparkles size={32} color="var(--dp-text-secondary)"/>
          </div>
          <div style={{fontSize:16,fontWeight:600,color:"var(--dp-text-tertiary)",fontFamily:F,marginBottom:6}}>No dream posts yet</div>
          <div style={{fontSize:13,color:"var(--dp-text-secondary)",fontFamily:F}}>Be the first to share your dream journey</div>
        </div>
      )}

      {/* Posts */}
      {!feedInf.isLoading && !feedInf.isError && posts.map(function(post, idx) {
        var a = post.author || post.user || {};
        var aName = a.displayName || a.username || "User";
        var aInit = (aName[0]||"U").toUpperCase();
        var aColor = avatarColor(aName);
        var isOpen = openComments === post.id;
        var dTitle = (post.dream&&(post.dream.title||post.dream.name))||post.dreamTitle||"";
        var lc = post.likesCount!=null ? post.likesCount : (post.likes||0);
        var cc = post.commentsCount!=null ? post.commentsCount : (post.comments||0);
        var liked = post.isLiked||post.liked||false;
        var encour = post.isEncouraged||post.encouraged||false;

        return (
          <div key={post.id} style={{...glass,padding:16,marginBottom:12,opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(20px)",transition:"all 0.5s cubic-bezier(0.4,0,0.2,1) "+(0.1+idx*0.06)+"s"}}>
            {/* Author */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div onClick={function(){if(a.id)navigate("/user/"+a.id);}} style={{width:42,height:42,borderRadius:14,flexShrink:0,background:"linear-gradient(135deg,"+aColor+","+aColor+"88)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",fontFamily:F,boxShadow:"0 4px 12px "+aColor+"30",cursor:a.id?"pointer":"default",overflow:"hidden"}}>
                {a.avatarUrl ? <img src={a.avatarUrl} alt="" style={{width:42,height:42,borderRadius:14,objectFit:"cover"}}/> : aInit}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:600,color:"var(--dp-text)",fontFamily:F}}>{aName}</div>
                <div style={{fontSize:12,color:"var(--dp-text-tertiary)",fontFamily:F}}>
                  {timeAgo(post.createdAt||post.created||Date.now())}
                  {post.visibility&&post.visibility!=="public"?" \u00B7 "+post.visibility:""}
                </div>
              </div>
              {/* Owner menu */}
              {user && a.id && String(a.id) === String(user.id) && (
                <div style={{position:"relative"}}>
                  <button onClick={function(){setPostMenu(postMenu===post.id?null:post.id);}}
                    style={{background:"transparent",border:"none",color:"var(--dp-text-tertiary)",cursor:"pointer",padding:4}}>
                    <MoreVertical size={16} strokeWidth={2}/>
                  </button>
                  {postMenu===post.id && (
                    <div style={{position:"absolute",right:0,top:28,zIndex:20,background:"var(--dp-body-bg)",border:"1px solid var(--dp-input-border)",borderRadius:12,padding:4,minWidth:120,boxShadow:"0 8px 24px rgba(0,0,0,0.3)"}}>
                      <button onClick={function(){setEditingPost(post.id);setEditText(post.content||"");setPostMenu(null);}}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",border:"none",background:"transparent",color:"var(--dp-text)",fontSize:13,fontWeight:500,textAlign:"left",cursor:"pointer",borderRadius:8}}>
                        <Pencil size={14} strokeWidth={2}/>Edit
                      </button>
                      <button onClick={function(){handleDeletePost(post.id);}}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",border:"none",background:"transparent",color:"#EF4444",fontSize:13,fontWeight:500,textAlign:"left",cursor:"pointer",borderRadius:8}}>
                        <Trash2 size={14} strokeWidth={2}/>Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            {editingPost===post.id ? (
              <div style={{marginBottom:12}}>
                <textarea value={editText} onChange={function(e){setEditText(e.target.value);}} rows={3}
                  style={{width:"100%",padding:"10px 12px",borderRadius:12,background:"var(--dp-glass-bg)",border:"1px solid var(--dp-input-border)",color:"var(--dp-text)",fontSize:14,lineHeight:1.5,fontFamily:F,outline:"none",resize:"vertical"}}/>
                <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
                  <button onClick={function(){setEditingPost(null);}}
                    style={{padding:"6px 14px",borderRadius:10,border:"1px solid var(--dp-input-border)",background:"transparent",color:"var(--dp-text-secondary)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>Cancel</button>
                  <button onClick={function(){handleEditPost(post.id);}} disabled={editMut.isPending}
                    style={{padding:"6px 14px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#8B5CF6,#6D28D9)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>{editMut.isPending?"Saving...":"Save"}</button>
                </div>
              </div>
            ) : (
            <div style={{fontSize:14,lineHeight:1.6,color:"var(--dp-text)",fontFamily:F,marginBottom:12,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{post.content}</div>
            )}

            {/* Dream badge */}
            {dTitle && (
              <div onClick={function(){var did=(post.dream&&post.dream.id)||post.dreamId;if(did)navigate("/dream/"+did);}} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:12,marginBottom:12,background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",cursor:"pointer",transition:"all 0.2s"}}>
                <Sparkles size={13} color="#C4B5FD" strokeWidth={2}/>
                <span style={{fontSize:12,fontWeight:600,color:"#C4B5FD",fontFamily:F}}>{dTitle}</span>
              </div>
            )}

            {/* Encouragement summary */}
            {post.encouragementSummary && Object.keys(post.encouragementSummary).length > 0 && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                {ENCOURAGE_TYPES.filter(function (et) { return post.encouragementSummary[et.type] > 0; }).map(function (et) {
                  var EIcon = et.icon;
                  return (
                    <span key={et.type} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:10,background:et.color + "15",fontSize:11,fontWeight:600,color:et.color}}>
                      <EIcon size={12} strokeWidth={2}/>{post.encouragementSummary[et.type]}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div style={{display:"flex",alignItems:"center",gap:6,borderTop:"1px solid var(--dp-input-border)",paddingTop:12}}>
              <ActionBtn onClick={function(){likeMut.mutate(post.id);}} active={liked} activeBg="rgba(239,68,68,0.1)" activeBorder="rgba(239,68,68,0.2)" activeColor="#EF4444">
                <Heart size={16} strokeWidth={2} fill={liked?"#EF4444":"none"}/>{lc>0?lc:""}
              </ActionBtn>
              <ActionBtn onClick={function(){setOpenComments(function(p){return p===post.id?null:post.id;});}} active={isOpen} activeBg="rgba(139,92,246,0.1)" activeBorder="rgba(139,92,246,0.2)" activeColor="#C4B5FD">
                <MessageCircle size={16} strokeWidth={2} fill={isOpen?"rgba(196,181,253,0.15)":"none"}/>{cc>0?cc:""}
              </ActionBtn>
              <ActionBtn onClick={function(){setEncouragePickerFor(function(p){return p===post.id?null:post.id;});}} active={encour || encouragePickerFor===post.id} activeBg="rgba(16,185,129,0.1)" activeBorder="rgba(16,185,129,0.2)" activeColor="#10B981">
                <Sparkles size={16} strokeWidth={2}/>
              </ActionBtn>
              <ActionBtn onClick={function(){handleShare(post);}} ml>
                <Share2 size={16} strokeWidth={2}/>
              </ActionBtn>
            </div>

            {/* Encouragement type picker */}
            {encouragePickerFor===post.id && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,paddingTop:8,borderTop:"1px solid var(--dp-input-border)",flexWrap:"wrap"}}>
                {ENCOURAGE_TYPES.map(function (et) {
                  var EIcon = et.icon;
                  return (
                    <button key={et.type} onClick={function(){encourageMut.mutate({id:post.id,type:et.type});}} disabled={encourageMut.isPending}
                      title={et.label}
                      style={{display:"flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:12,border:"1px solid "+et.color+"30",background:et.color+"10",color:et.color,fontSize:11,fontWeight:600,fontFamily:F,cursor:"pointer",transition:"all 0.2s"}}>
                      <EIcon size={14} strokeWidth={2}/>{et.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Comments panel */}
            {isOpen && (
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--dp-input-border)"}}>
                {commQ.isLoading && <div style={{padding:"12px 0",textAlign:"center",fontSize:13,color:"var(--dp-text-tertiary)",fontFamily:F}}>Loading comments...</div>}
                {!commQ.isLoading && comments.map(function(c) {
                  var ca = c.author||c.user||{}; var cn = ca.displayName||ca.username||"User";
                  var ci = (cn[0]||"U").toUpperCase(); var cc2 = avatarColor(cn);
                  return (
                    <div key={c.id} style={{display:"flex",gap:8,marginBottom:10}}>
                      <div style={{width:28,height:28,borderRadius:9,flexShrink:0,background:"linear-gradient(135deg,"+cc2+"25,"+cc2+"15)",border:"1px solid "+cc2+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:cc2,fontFamily:F}}>{ci}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:2}}>
                          <span style={{fontSize:12,fontWeight:600,color:"var(--dp-text)",fontFamily:F}}>{cn}</span>
                          <span style={{fontSize:11,color:"var(--dp-text-tertiary)",fontFamily:F}}>{timeAgo(c.createdAt||c.created||Date.now())}</span>
                        </div>
                        <div style={{fontSize:13,color:"var(--dp-text-secondary)",fontFamily:F,lineHeight:1.4}}>{c.content||c.text}</div>
                      </div>
                    </div>
                  );
                })}
                {/* Comment input */}
                <div style={{display:"flex",gap:8,alignItems:"center",marginTop:comments.length>0?4:0}}>
                  <input value={cInputs[post.id]||""} onChange={function(e){setCInputs(function(p){return Object.assign({},p,{[post.id]:e.target.value});});}}
                    onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();handleAddComment(post.id);}}}
                    placeholder="Write a comment..." style={{flex:1,padding:"9px 14px",borderRadius:14,background:"var(--dp-glass-bg)",border:"1px solid var(--dp-input-border)",color:"var(--dp-text)",fontSize:13,fontFamily:F,outline:"none"}}/>
                  <button onClick={function(){handleAddComment(post.id);}} disabled={!(cInputs[post.id]||"").trim()}
                    style={{width:36,height:36,borderRadius:12,border:"none",background:(cInputs[post.id]||"").trim()?"linear-gradient(135deg,#8B5CF6,#6D28D9)":"var(--dp-glass-bg)",color:(cInputs[post.id]||"").trim()?"#fff":"var(--dp-text-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:(cInputs[post.id]||"").trim()?"pointer":"default",transition:"all 0.2s",flexShrink:0}}>
                    <Send size={16} strokeWidth={2}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Infinite scroll sentinel */}
      <div ref={feedInf.sentinelRef} />
      {feedInf.loadingMore && (
        <div style={{display:"flex",justifyContent:"center",padding:"16px 0"}}>
          <div style={{fontSize:13,color:"var(--dp-text-tertiary)",fontFamily:F}}>Loading more...</div>
        </div>
      )}

      {/* FAB create button */}
      <button onClick={function(){setShowCreate(true);}} style={{position:"fixed",bottom:90,right:20,zIndex:50,width:56,height:56,borderRadius:18,border:"none",background:"linear-gradient(135deg,#8B5CF6,#6D28D9)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 8px 24px rgba(139,92,246,0.4)",transition:"all 0.3s cubic-bezier(0.4,0,0.2,1)",opacity:mounted?1:0,transform:mounted?"scale(1)":"scale(0.5)"}}>
        <Plus size={24} strokeWidth={2.5}/>
      </button>

      {/* Create post modal */}
      {showCreate && (
        <div style={{position:"fixed",inset:0,zIndex:200}}>
          <div onClick={function(){setShowCreate(false);}} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"relative",maxWidth:440,margin:"80px auto 0",padding:"0 16px"}}>
            <div style={{...glass,background:"var(--dp-body-bg)",borderRadius:24,padding:24,overflow:"hidden",boxShadow:"0 16px 48px rgba(0,0,0,0.4)"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <h2 style={{fontSize:18,fontWeight:700,color:"var(--dp-text)",fontFamily:F,margin:0}}>New Post</h2>
                <button onClick={function(){setShowCreate(false);}} className="dp-ib" style={{width:32,height:32}}>
                  <Plus size={18} strokeWidth={2} style={{transform:"rotate(45deg)"}}/>
                </button>
              </div>

              {/* Textarea */}
              <textarea value={content} onChange={function(e){setContent(e.target.value);}} placeholder="Share your dream journey..." rows={4}
                style={{width:"100%",padding:"12px 14px",borderRadius:16,background:"var(--dp-glass-bg)",border:"1px solid var(--dp-input-border)",color:"var(--dp-text)",fontSize:14,lineHeight:1.5,fontFamily:F,outline:"none",resize:"vertical",minHeight:100}}/>

              {/* Dream selector */}
              <div style={{marginTop:14}}>
                <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-secondary)",fontFamily:F,marginBottom:6,display:"block"}}>Link a dream (optional)</label>
                <select value={dreamId} onChange={function(e){setDreamId(e.target.value);}}
                  style={{width:"100%",padding:"10px 14px",borderRadius:14,background:"var(--dp-glass-bg)",border:"1px solid var(--dp-input-border)",color:"var(--dp-text)",fontSize:13,fontFamily:F,outline:"none",appearance:"none",WebkitAppearance:"none"}}>
                  <option value="">No dream linked</option>
                  {myDreams.map(function(d){return <option key={d.id} value={d.id}>{d.title||d.name||"Untitled Dream"}</option>;})}
                </select>
              </div>

              {/* Visibility */}
              <div style={{marginTop:14}}>
                <label style={{fontSize:12,fontWeight:600,color:"var(--dp-text-secondary)",fontFamily:F,marginBottom:6,display:"block"}}>Visibility</label>
                <div style={{display:"flex",gap:8}}>
                  {VIS.map(function(o){var act=visibility===o.value;return(
                    <button key={o.value} onClick={function(){setVisibility(o.value);}} style={{flex:1,padding:"9px 0",borderRadius:12,border:act?"1px solid rgba(139,92,246,0.4)":"1px solid var(--dp-input-border)",background:act?"rgba(139,92,246,0.15)":"transparent",color:act?"#C4B5FD":"var(--dp-text-secondary)",fontSize:13,fontWeight:600,fontFamily:F,cursor:"pointer",transition:"all 0.2s"}}>{o.label}</button>
                  );})}
                </div>
              </div>

              {/* Submit */}
              <button onClick={handleCreate} disabled={!content.trim()||createMut.isPending}
                style={{width:"100%",marginTop:20,padding:"13px 0",borderRadius:16,border:"none",background:content.trim()?"linear-gradient(135deg,#8B5CF6,#6D28D9)":"var(--dp-glass-bg)",color:content.trim()?"#fff":"var(--dp-text-tertiary)",fontSize:15,fontWeight:700,fontFamily:F,cursor:content.trim()?"pointer":"default",transition:"all 0.25s ease",boxShadow:content.trim()?"0 4px 16px rgba(139,92,246,0.3)":"none"}}>
                {createMut.isPending ? "Publishing..." : "Publish Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{height:32}}/>
    </PageLayout>
  );
}
