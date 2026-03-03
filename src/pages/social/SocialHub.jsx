import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiUpload } from "../../services/api";
import { SOCIAL, DREAMS } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import useAgoraPresence from "../../hooks/useAgoraPresence";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import { CONTACT_COLORS, BRAND, GRADIENTS, adaptColor } from "../../styles/colors";
import { sanitizeText } from "../../utils/sanitize";
import BottomNav from "../../components/shared/BottomNav";
import ErrorState from "../../components/shared/ErrorState";
import { FeedItemSkeleton, SkeletonCard } from "../../components/shared/Skeleton";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import Avatar from "../../components/shared/Avatar";
import GlassInput from "../../components/shared/GlassInput";
import GradientButton from "../../components/shared/GradientButton";
import GlassModal from "../../components/shared/GlassModal";
import ExpandableText from "../../components/shared/ExpandableText";
import {
  ArrowLeft, UserPlus, Search, Heart, MessageCircle, Share2,
  Bookmark, Plus, Sparkles, ArrowUpCircle, CheckCircle, Flame,
  X, Send, Image, Video, Music, MapPin, Link2, Users as UsersIcon,
  Calendar, Trophy, Zap, MoreVertical, Handshake,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Social Hub (Instagram-style)
 *
 * Layout:
 * - Stories bar with gradient ring avatars (online friends)
 * - Mixed feed: user posts (SOCIAL.POSTS.FEED) + activity events (SOCIAL.FEED.FRIENDS)
 * - Instagram action bar: Like, Comment, Share, Save
 * - Create post FAB with media upload + event creation
 * ═══════════════════════════════════════════════════════════════════ */

var AVATAR_COLORS = CONTACT_COLORS;

var FEED_CONFIG = {
  level_up:       { Icon: ArrowUpCircle, color: BRAND.purpleLight, label: "levelUp" },
  task_completed: { Icon: CheckCircle,   color: BRAND.green,       label: "taskDone" },
  dream_created:  { Icon: Sparkles,      color: BRAND.yellow,      label: "dreamCreated" },
  dream_completed:{ Icon: Trophy,        color: BRAND.purpleLight, label: "dreamCompleted" },
  streak:         { Icon: Flame,         color: BRAND.red,         label: "streak" },
  milestone_reached:{ Icon: Zap,         color: BRAND.teal,        label: "milestone" },
  badge_earned:   { Icon: Trophy,        color: BRAND.yellow,      label: "badge" },
};

function timeAgo(d) {
  var s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

function avatarColor(name) {
  var h = 0;
  for (var i = 0; i < (name || "").length; i++) h = (name.charCodeAt(i) + ((h << 5) - h)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}


// ═══════════════════════════════════════════════════════════════════
export default function SocialHubScreen() {
  var navigate = useNavigate();
  var { t } = useT();
  var { resolved, uiOpacity } = useTheme();
  var isLight = resolved === "light";
  var { user } = useAuth();
  var { showToast } = useToast();
  var qc = useQueryClient();
  var [mounted, setMounted] = useState(false);
  var [showSearch, setShowSearch] = useState(false);
  var [searchQ, setSearchQ] = useState("");
  var [searchResults, setSearchResults] = useState([]);
  var [searchLoading, setSearchLoading] = useState(false);
  var [expandedComments, setExpandedComments] = useState(null);
  var [commentInputs, setCommentInputs] = useState({});
  var [savedPosts, setSavedPosts] = useState({});
  var [showCreate, setShowCreate] = useState(false);
  var [createContent, setCreateContent] = useState("");
  var [createDreamId, setCreateDreamId] = useState("");
  var [createVisibility, setCreateVisibility] = useState("public");
  var [createPostType, setCreatePostType] = useState("regular");
  var [createMediaFile, setCreateMediaFile] = useState(null);
  var [createMediaType, setCreateMediaType] = useState("none");
  var [createMediaPreview, setCreateMediaPreview] = useState("");
  var [showEventFields, setShowEventFields] = useState(false);
  var [eventTitle, setEventTitle] = useState("");
  var [eventType, setEventType] = useState("virtual");
  var [eventLocation, setEventLocation] = useState("");
  var [eventLink, setEventLink] = useState("");
  var [eventStart, setEventStart] = useState("");
  var [eventEnd, setEventEnd] = useState("");
  var [eventMaxPart, setEventMaxPart] = useState("");

  var mediaInputRef = useRef(null);
  var storyInputRef = useRef(null);

  // Story state
  var [showStoryCreate, setShowStoryCreate] = useState(false);
  var [storyFile, setStoryFile] = useState(null);
  var [storyPreview, setStoryPreview] = useState("");
  var [storyCaption, setStoryCaption] = useState("");
  var [storyMediaType, setStoryMediaType] = useState("image");
  // Story viewer state
  var [storyViewer, setStoryViewer] = useState(null); // { groupIndex, storyIndex }
  var [storyProgress, setStoryProgress] = useState(0);
  var storyTimerRef = useRef(null);

  var ME = {
    displayName: user?.displayName || user?.username || "You",
    initial: (user?.displayName || user?.username || "U")[0].toUpperCase(),
  };

  // ── Data sources ──────────────────────────────────────────────
  var postsFeed = useInfiniteList({ queryKey: ["social-posts-feed"], url: SOCIAL.POSTS.FEED, limit: 15 });
  var activityFeed = useInfiniteList({ queryKey: ["feed"], url: SOCIAL.FEED.FRIENDS, limit: 15 });

  var requestsQuery = useQuery({ queryKey: ["friend-requests"], queryFn: function () { return apiGet(SOCIAL.FRIENDS.PENDING); } });
  var requests = (requestsQuery.data && requestsQuery.data.results) || requestsQuery.data || [];
  if (!Array.isArray(requests)) requests = [];

  // Fetch all friends, then use Agora presence to determine who's online
  var friendsListQ = useQuery({ queryKey: ["friends-list"], queryFn: function () { return apiGet(SOCIAL.FRIENDS.LIST); } });
  var allFriendsRaw = (friendsListQ.data && friendsListQ.data.results) || friendsListQ.data || [];
  if (!Array.isArray(allFriendsRaw)) allFriendsRaw = [];
  var friendIdsForPresence = useMemo(function () {
    return allFriendsRaw.map(function (f) { return String(f.id); });
  }, [allFriendsRaw.length]);
  var presenceMap = useAgoraPresence(friendIdsForPresence);
  var ONLINE_FRIENDS = allFriendsRaw.filter(function (f) {
    return !!presenceMap[String(f.id)];
  }).map(function (f, i) {
    var fName = f.displayName || f.username || "Friend";
    return { id: f.id, name: fName, initial: fName[0].toUpperCase(), color: CONTACT_COLORS[i % CONTACT_COLORS.length] };
  });

  // Stories feed (grouped by user)
  var storiesFeedQ = useQuery({
    queryKey: ["stories-feed"],
    queryFn: function () { return apiGet(SOCIAL.STORIES.FEED); },
  });
  var storyGroups = storiesFeedQ.data || [];
  if (!Array.isArray(storyGroups)) storyGroups = [];

  // Story creation mutation
  var createStoryMut = useMutation({
    mutationFn: function (formData) { return apiUpload(SOCIAL.STORIES.LIST, formData); },
    onSuccess: function () {
      showToast(t("social.storyPublished") || "Story posted!", "success");
      setShowStoryCreate(false);
      setStoryFile(null);
      if (storyPreview && storyPreview.startsWith("blob:")) { URL.revokeObjectURL(storyPreview); }
      setStoryPreview("");
      setStoryCaption("");
      qc.invalidateQueries({ queryKey: ["stories-feed"] });
    },
    onError: function (e) { showToast(e.message || "Failed to post story", "error"); },
  });

  // Mark story as viewed
  function markStoryViewed(storyId) {
    apiPost(SOCIAL.STORIES.VIEW(storyId)).catch(function () {});
  }

  var dreamsQ = useQuery({
    queryKey: ["my-dreams-for-post"],
    queryFn: function () { return apiGet(DREAMS.LIST); },
    enabled: showCreate,
  });
  var myDreams = (dreamsQ.data && dreamsQ.data.results) || dreamsQ.data || [];
  if (!Array.isArray(myDreams)) myDreams = [];

  // ── Merge feeds ───────────────────────────────────────────────
  var posts = postsFeed.items.map(function (p) { return Object.assign({}, p, { _type: "post", _time: new Date(p.createdAt || p.created_at || Date.now()) }); });
  var events = activityFeed.items.map(function (e) { return Object.assign({}, e, { _type: "event", _time: new Date(e.time || e.createdAt || e.created_at || Date.now()) }); });
  var mixedFeed = posts.concat(events).sort(function (a, b) { return b._time - a._time; });

  var loading = postsFeed.isLoading && activityFeed.isLoading;
  var isError = postsFeed.isError && activityFeed.isError;

  // ── Create post mutation ──────────────────────────────────────
  var createMut = useMutation({
    mutationFn: function (formData) { return apiUpload(SOCIAL.POSTS.LIST, formData); },
    onSuccess: function () {
      showToast(t("feed.postPublished") || "Post published!", "success");
      _resetCreateForm();
      qc.invalidateQueries({ queryKey: ["social-posts-feed"] });
    },
    onError: function (e) { showToast(e.message || "Failed to create post", "error"); },
  });

  function _resetCreateForm() {
    setShowCreate(false);
    setCreateContent("");
    setCreateDreamId("");
    setCreateVisibility("public");
    setCreatePostType("regular");
    setCreateMediaFile(null);
    setCreateMediaType("none");
    if (createMediaPreview && createMediaPreview.startsWith("blob:")) { URL.revokeObjectURL(createMediaPreview); }
    setCreateMediaPreview("");
    setShowEventFields(false);
    setEventTitle("");
    setEventType("virtual");
    setEventLocation("");
    setEventLink("");
    setEventStart("");
    setEventEnd("");
    setEventMaxPart("");
  }

  // ── Handlers ──────────────────────────────────────────────────
  function handleLikePost(id) {
    apiPost(SOCIAL.POSTS.LIKE(id)).then(function () {
      qc.invalidateQueries({ queryKey: ["social-posts-feed"] });
    }).catch(function () {});
  }
  function handleLikeEvent(id) {
    apiPost(SOCIAL.FEED.LIKE(id)).catch(function () {});
  }
  function handleSavePost(id) {
    apiPost(SOCIAL.POSTS.SAVE(id)).then(function (res) {
      setSavedPosts(function (p) { var n = Object.assign({}, p); n[id] = res.saved; return n; });
    }).catch(function () {});
  }
  function handleShare(item) {
    var text = item.content || item.data?.dream || item.data?.task || "";
    var shareUrl = item._type === "post" && item.id ? (window.location.origin + "/post/" + item.id) : window.location.href;
    if (navigator.share) {
      navigator.share({ title: "DreamPlanner", text: text, url: shareUrl }).catch(function () {});
    } else {
      navigator.clipboard.writeText(shareUrl).then(function () { showToast("Copied!", "success"); });
    }
  }
  function handleComment(itemId, type) {
    var text = (commentInputs[itemId] || "").trim();
    if (!text) return;
    var url = type === "post" ? SOCIAL.POSTS.COMMENT(itemId) : SOCIAL.FEED.COMMENT(itemId);
    apiPost(url, { content: text }).then(function () {
      setCommentInputs(function (p) { var n = Object.assign({}, p); n[itemId] = ""; return n; });
      if (type === "post") qc.invalidateQueries({ queryKey: ["social-posts-feed"] });
    }).catch(function () {});
  }
  function handleRegisterEvent(eventId) {
    apiPost(SOCIAL.EVENTS.REGISTER(eventId)).then(function () {
      showToast("Registered!", "success");
      qc.invalidateQueries({ queryKey: ["social-posts-feed"] });
    }).catch(function (e) { showToast(e.message || "Failed", "error"); });
  }
  // ── Story handlers ───────────────────────────────────────────
  function openStoryViewer(groupIdx) {
    setStoryViewer({ groupIndex: groupIdx, storyIndex: 0 });
    setStoryProgress(0);
    var s = storyGroups[groupIdx] && storyGroups[groupIdx].stories && storyGroups[groupIdx].stories[0];
    if (s && !s.hasViewed) markStoryViewed(s.id);
  }
  function closeStoryViewer() {
    setStoryViewer(null);
    setStoryProgress(0);
    if (storyTimerRef.current) clearInterval(storyTimerRef.current);
  }
  function advanceStory(dir) {
    if (!storyViewer) return;
    var g = storyGroups[storyViewer.groupIndex];
    if (!g) { closeStoryViewer(); return; }
    var nextIdx = storyViewer.storyIndex + dir;
    if (nextIdx >= 0 && nextIdx < g.stories.length) {
      setStoryViewer({ groupIndex: storyViewer.groupIndex, storyIndex: nextIdx });
      setStoryProgress(0);
      var s = g.stories[nextIdx];
      if (s && !s.hasViewed) markStoryViewed(s.id);
    } else if (dir > 0) {
      // Next user's stories
      var nextGroup = storyViewer.groupIndex + 1;
      if (nextGroup < storyGroups.length) {
        setStoryViewer({ groupIndex: nextGroup, storyIndex: 0 });
        setStoryProgress(0);
        var s2 = storyGroups[nextGroup] && storyGroups[nextGroup].stories && storyGroups[nextGroup].stories[0];
        if (s2 && !s2.hasViewed) markStoryViewed(s2.id);
      } else {
        closeStoryViewer();
      }
    } else {
      // Previous user
      var prevGroup = storyViewer.groupIndex - 1;
      if (prevGroup >= 0) {
        var pStories = storyGroups[prevGroup].stories;
        setStoryViewer({ groupIndex: prevGroup, storyIndex: pStories.length - 1 });
        setStoryProgress(0);
      }
    }
  }
  function handleStoryFilePick(type) {
    setStoryMediaType(type);
    if (storyInputRef.current) {
      storyInputRef.current.accept = type === "image" ? "image/*" : "video/*";
      storyInputRef.current.click();
    }
  }
  function handleStoryFileSelected(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    // Validate file type
    var allowedImage = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    var allowedVideo = ["video/mp4", "video/webm", "video/quicktime"];
    var allowed = storyMediaType === "image" ? allowedImage : allowedVideo;
    if (!allowed.includes(file.type)) {
      showToast("Unsupported file type", "error");
      return;
    }
    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showToast("File too large. Max 50MB.", "error");
      return;
    }
    // Revoke previous story preview object URL if any
    if (storyPreview && storyPreview.startsWith("blob:")) {
      URL.revokeObjectURL(storyPreview);
    }
    setStoryFile(file);
    setStoryPreview(URL.createObjectURL(file));
    setShowStoryCreate(true);
  }
  function handleCreateStory() {
    if (!storyFile) return;
    var fd = new FormData();
    if (storyMediaType === "image") fd.append("image_file", storyFile);
    else fd.append("video_file", storyFile);
    if (storyCaption.trim()) fd.append("caption", storyCaption.trim());
    createStoryMut.mutate(fd);
  }

  // Story auto-advance timer
  useEffect(function () {
    if (!storyViewer) return;
    var g = storyGroups[storyViewer.groupIndex];
    if (!g) return;
    var s = g.stories[storyViewer.storyIndex];
    if (!s || s.mediaType === "video") return; // videos control their own duration
    var dur = 5000; // 5s for images
    var interval = 50;
    var elapsed = 0;
    storyTimerRef.current = setInterval(function () {
      elapsed += interval;
      setStoryProgress(elapsed / dur);
      if (elapsed >= dur) {
        clearInterval(storyTimerRef.current);
        advanceStory(1);
      }
    }, interval);
    return function () { if (storyTimerRef.current) clearInterval(storyTimerRef.current); };
  }, [storyViewer && storyViewer.groupIndex, storyViewer && storyViewer.storyIndex]);

  function handleMediaPick(type) {
    setCreateMediaType(type);
    var accept = type === "image" ? "image/*" : type === "video" ? "video/*" : "audio/*";
    if (mediaInputRef.current) {
      mediaInputRef.current.accept = accept;
      mediaInputRef.current.click();
    }
  }
  function handleMediaSelected(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    // Validate file type
    var allowedTypes = {
      image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      video: ["video/mp4", "video/webm", "video/quicktime"],
      audio: ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/mp4"],
    };
    var allowed = allowedTypes[createMediaType] || allowedTypes.image;
    if (!allowed.includes(file.type)) {
      showToast("Unsupported file type", "error");
      return;
    }
    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showToast("File too large. Max 50MB.", "error");
      return;
    }
    // Revoke previous object URL if any
    if (createMediaPreview && createMediaPreview.startsWith("blob:")) {
      URL.revokeObjectURL(createMediaPreview);
    }
    setCreateMediaFile(file);
    if (createMediaType === "image") {
      setCreateMediaPreview(URL.createObjectURL(file));
    } else {
      setCreateMediaPreview(file.name);
    }
  }
  function handleCreatePost() {
    var c = sanitizeText ? sanitizeText(createContent, 5000) : createContent.trim();
    if (!c) return;
    var fd = new FormData();
    fd.append("content", c);
    fd.append("visibility", createVisibility);
    fd.append("post_type", showEventFields ? "event" : createPostType);
    if (createDreamId) fd.append("dream_id", createDreamId);
    if (createMediaFile) {
      var fieldName = createMediaType === "image" ? "image_file" : createMediaType === "video" ? "video_file" : "audio_file";
      fd.append(fieldName, createMediaFile);
    }
    if (showEventFields) {
      fd.append("event_title", eventTitle);
      fd.append("event_type", eventType);
      fd.append("event_location", eventLocation);
      fd.append("event_meeting_link", eventLink);
      if (eventStart) fd.append("event_start_time", new Date(eventStart).toISOString());
      if (eventEnd) fd.append("event_end_time", new Date(eventEnd).toISOString());
      if (eventMaxPart) fd.append("event_max_participants", eventMaxPart);
    }
    createMut.mutate(fd);
  }

  // ── Search ────────────────────────────────────────────────────
  useEffect(function () {
    if (!searchQ || searchQ.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    var cancelled = false;
    var timer = setTimeout(function () {
      apiGet(SOCIAL.USER_SEARCH + "?q=" + encodeURIComponent(searchQ)).then(function (data) {
        if (cancelled) return;
        var results = (data && data.results) || data || [];
        setSearchResults(results.map(function (u, i) {
          var dn = u.username || u.displayName || u.display_name || "User";
          return { id: u.id, name: dn, title: u.title || "", initial: (dn[0] || "U").toUpperCase(), level: u.currentLevel || u.level || 1, color: CONTACT_COLORS[i % CONTACT_COLORS.length], isFriend: u.isFriend || false, friendshipStatus: u.isFriend ? "accepted" : null };
        }));
        setSearchLoading(false);
      }).catch(function () { if (!cancelled) { setSearchResults([]); setSearchLoading(false); } });
    }, 300);
    return function () { cancelled = true; clearTimeout(timer); };
  }, [searchQ]);

  useEffect(function () { setTimeout(function () { setMounted(true); }, 100); }, []);

  // ── Loading / Error ───────────────────────────────────────────
  if (loading) return (
    <div style={{ width: "100%", padding: "60px 16px 0" }}>
      <SkeletonCard height={80} style={{ marginBottom: 16 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3].map(function (i) { return <FeedItemSkeleton key={i} />; })}
      </div>
    </div>
  );

  if (isError) return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ErrorState
          message="Failed to load social feed"
          onRetry={function () { postsFeed.refetch(); activityFeed.refetch(); }}
        />
      </div>
      <BottomNav />
    </div>
  );

  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>

      {/* ═══ APP BAR ═══ */}
      <GlassAppBar
        style={{ justifyContent: "space-between" }}
        left={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} label="Go back" />
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--dp-text)", letterSpacing: "-0.5px" }}>DreamPlanner</span>
          </div>
        }
        right={
          <div style={{ display: "flex", gap: 6 }}>
            <IconButton icon={showSearch ? X : Search} onClick={function () { setShowSearch(!showSearch); }} label={showSearch ? "Close search" : "Search"} />
            <IconButton icon={UserPlus} onClick={function () { navigate("/friend-requests"); }} label="Friend requests" badge={requests.length} />
          </div>
        }
      />

      {/* ═══ CONTENT ═══ */}
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", zIndex: 10, padding: "8px 0 100px", opacity: uiOpacity, transition: "opacity 0.3s ease" }}>

        {/* ── Stories Bar ── */}
        <div style={{ padding: "8px 0 12px", borderBottom: "1px solid var(--dp-divider)" }}>
          <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "0 16px", scrollbarWidth: "none" }}>
            {/* You — create story */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 68, cursor: "pointer" }}
              onClick={function () {
                // Check if user has stories — tap opens viewer, plus opens create
                var myGroup = storyGroups.find(function (g) { return g.user && g.user.id === String(user?.id); });
                if (myGroup && myGroup.stories && myGroup.stories.length > 0) {
                  openStoryViewer(storyGroups.indexOf(myGroup));
                } else {
                  setShowStoryCreate(true);
                }
              }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 68, height: 68, borderRadius: "50%",
                  background: (function () {
                    var myGroup = storyGroups.find(function (g) { return g.user && g.user.id === String(user?.id); });
                    if (myGroup && myGroup.stories && myGroup.stories.length > 0) return "linear-gradient(135deg," + BRAND.purple + "," + BRAND.pink + ")";
                    return "rgba(255,255,255,0.1)";
                  })(),
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 3,
                }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--dp-body-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}>
                    <Avatar name={ME.displayName} size={56} shape="circle" color="var(--dp-accent)" />
                  </div>
                </div>
                <div onClick={function (e) { e.stopPropagation(); setShowStoryCreate(true); }} style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%", background: GRADIENTS.primary, border: "2px solid var(--dp-body-bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Plus size={12} color={BRAND.white} strokeWidth={3} />
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--dp-text-primary)", textAlign: "center", maxWidth: 68, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("social.you") || "You"}</span>
            </div>

            {/* Story groups (excluding self — already shown) */}
            {storyGroups.filter(function (g) { return g.user && g.user.id !== String(user?.id); }).map(function (group) {
              var gIdx = storyGroups.indexOf(group);
              var hasUnviewed = group.hasUnviewed;
              return (
                <div key={group.user.id} onClick={function () { openStoryViewer(gIdx); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 68, cursor: "pointer" }}>
                  <div style={{
                    width: 68, height: 68, borderRadius: "50%",
                    background: hasUnviewed ? "linear-gradient(135deg," + BRAND.purple + "," + BRAND.pink + ")" : "rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 3,
                  }}>
                    <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--dp-body-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}>
                      <Avatar name={group.user.displayName || group.user.username} src={group.user.avatar} size={56} shape="circle" color={avatarColor(group.user.username)} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: hasUnviewed ? "var(--dp-text-primary)" : "var(--dp-text-muted)", textAlign: "center", maxWidth: 68, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {(group.user.displayName || group.user.username || "").split(" ")[0]}
                  </span>
                </div>
              );
            })}

            {/* Online friends without stories */}
            {ONLINE_FRIENDS.filter(function (f) {
              return !storyGroups.some(function (g) { return g.user && g.user.id === String(f.id); });
            }).map(function (f) {
              return (
                <div key={"ol-" + f.id} onClick={function () { navigate("/user/" + f.id); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 68, cursor: "pointer" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", padding: 3 }}>
                      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--dp-body-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}>
                        <Avatar name={f.name} size={56} shape="circle" color={f.color} />
                      </div>
                    </div>
                    <div style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: "50%", background: "#22C55E", border: "2px solid var(--dp-body-bg)" }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "var(--dp-text-muted)", textAlign: "center", maxWidth: 68, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name.split(" ")[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hidden file input for story */}
        <input ref={storyInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleStoryFileSelected} />

        {/* ── Social Quick Nav ── */}
        <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", scrollbarWidth: "none" }}>
          {[
            { icon: UsersIcon, label: t("social.circles") || "Circles", path: "/circles", color: "#8B5CF6" },
            { icon: Trophy, label: t("social.leaderboard") || "Leaderboard", path: "/leaderboard", color: "#FCD34D" },
            { icon: UserPlus, label: t("social.findBuddy") || "Find Buddy", path: "/find-buddy", color: "#10B981" },
            { icon: Handshake, label: t("social.buddyRequests") || "Buddy Requests", path: "/buddy-requests", color: "#EC4899" },
            { icon: Search, label: t("social.userSearch") || "Search Users", path: "/search", color: "#6366F1" },
          ].map(function (nav) {
            return (
              <div key={nav.path} onClick={function () { navigate(nav.path); }} style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 12, cursor: "pointer",
                background: nav.color + "10", border: "1px solid " + nav.color + "20",
                transition: "all 0.2s",
              }}>
                <nav.icon size={15} color={nav.color} strokeWidth={2} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text)" }}>{nav.label}</span>
              </div>
            );
          })}
        </div>

        {/* ── Mixed Feed ── */}
        <div style={{ padding: "0 16px" }}>
          {mixedFeed.length === 0 && !postsFeed.isLoading && !activityFeed.isLoading && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: "var(--dp-glass-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Sparkles size={32} color="var(--dp-text-secondary)" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--dp-text-tertiary)", marginBottom: 6 }}>{t("feed.noPosts") || "No posts yet"}</div>
              <div style={{ fontSize: 13, color: "var(--dp-text-secondary)" }}>{t("feed.beFirst") || "Be the first to share!"}</div>
            </div>
          )}

          {mixedFeed.map(function (item, idx) {
            if (item._type === "post") return <PostCard key={"p-" + item.id} item={item} idx={idx} mounted={mounted} isLight={isLight} user={user} navigate={navigate} expandedComments={expandedComments} setExpandedComments={setExpandedComments} commentInputs={commentInputs} setCommentInputs={setCommentInputs} savedPosts={savedPosts} handleLikePost={handleLikePost} handleSavePost={handleSavePost} handleShare={handleShare} handleComment={handleComment} handleRegisterEvent={handleRegisterEvent} t={t} />;
            return <EventCard key={"e-" + item.id} item={item} idx={idx} mounted={mounted} isLight={isLight} navigate={navigate} expandedComments={expandedComments} setExpandedComments={setExpandedComments} commentInputs={commentInputs} setCommentInputs={setCommentInputs} handleLikeEvent={handleLikeEvent} handleShare={handleShare} handleComment={handleComment} t={t} />;
          })}

          <div ref={postsFeed.sentinelRef} style={{ height: 1 }} />
          <div ref={activityFeed.sentinelRef} style={{ height: 1 }} />
          {(postsFeed.loadingMore || activityFeed.loadingMore) && (
            <div style={{ textAlign: "center", padding: 16, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading more…</div>
          )}
        </div>
      </main>

      {/* ═══ CREATE POST FAB ═══ */}
      <button onClick={function () { setShowCreate(true); }} style={{ position: "fixed", bottom: 90, right: 20, zIndex: 50, width: 56, height: 56, borderRadius: 18, border: "none", background: GRADIENTS.primary, color: BRAND.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 24px rgba(139,92,246,0.4)", transition: "all 0.3s", opacity: mounted ? 1 : 0, transform: mounted ? "scale(1)" : "scale(0.5)", fontFamily: "inherit" }}>
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {/* ═══ CREATE POST MODAL ═══ */}
      <GlassModal open={showCreate} onClose={_resetCreateForm} variant="center" title={t("feed.newPost") || "New Post"} maxWidth={440}>
        <div style={{ padding: 20 }}>
          <input type="file" ref={mediaInputRef} style={{ display: "none" }} onChange={handleMediaSelected} />

          <GlassInput
            value={createContent}
            onChange={function (e) { setCreateContent(e.target.value); }}
            placeholder={t("feed.shareDreamJourney") || "Share your dream journey..."}
            multiline
            style={{ borderRadius: 16, width: "100%", marginBottom: 14 }}
            inputStyle={{ minHeight: 80, lineHeight: 1.5 }}
          />

          {/* Media buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { type: "image", Icon: Image, label: "Photo" },
              { type: "video", Icon: Video, label: "Video" },
              { type: "audio", Icon: Music, label: "Audio" },
            ].map(function (m) {
              var active = createMediaType === m.type && createMediaFile;
              return (
                <button key={m.type} onClick={function () { handleMediaPick(m.type); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, border: active ? "1px solid var(--dp-accent-border)" : "1px solid var(--dp-input-border)", background: active ? "var(--dp-accent-soft)" : "var(--dp-glass-bg)", color: active ? "var(--dp-accent)" : "var(--dp-text-secondary)", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s" }}>
                  <m.Icon size={16} strokeWidth={2} />{m.label}
                </button>
              );
            })}
          </div>

          {/* Media preview */}
          {createMediaFile && (
            <div style={{ marginBottom: 14, position: "relative" }}>
              {createMediaType === "image" && createMediaPreview && (
                <img src={createMediaPreview} alt="Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 14 }} />
              )}
              {createMediaType !== "image" && (
                <div style={{ padding: "12px 16px", borderRadius: 14, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", color: "var(--dp-text-secondary)", fontSize: 13 }}>
                  {createMediaType === "video" ? <Video size={16} style={{ verticalAlign: "middle", marginRight: 8 }} /> : <Music size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />}
                  {createMediaFile.name}
                </div>
              )}
              <button onClick={function () { if (createMediaPreview && createMediaPreview.startsWith("blob:")) { URL.revokeObjectURL(createMediaPreview); } setCreateMediaFile(null); setCreateMediaType("none"); setCreateMediaPreview(""); }} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", color: BRAND.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: "inherit" }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Dream selector */}
          <div style={{ marginBottom: 14 }}>
            <select value={createDreamId} onChange={function (e) { setCreateDreamId(e.target.value); }} style={{ width: "100%", padding: "10px 14px", borderRadius: 14, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", color: "var(--dp-text)", fontSize: 13, fontFamily: "inherit", outline: "none" }}>
              <option value="">{t("feed.noDreamLinked") || "No dream linked"}</option>
              {myDreams.map(function (d) { return <option key={d.id} value={d.id}>{d.title || d.name || "Untitled"}</option>; })}
            </select>
          </div>

          {/* Visibility */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["public", "friends", "private"].map(function (v) {
              var active = createVisibility === v;
              return (
                <button key={v} onClick={function () { setCreateVisibility(v); }} style={{ flex: 1, padding: "9px 0", borderRadius: 12, border: active ? "1px solid var(--dp-accent-border)" : "1px solid var(--dp-input-border)", background: active ? "var(--dp-accent-soft)" : "transparent", color: active ? "var(--dp-accent)" : "var(--dp-text-secondary)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s", textTransform: "capitalize" }}>{v}</button>
              );
            })}
          </div>

          {/* Event toggle */}
          <button onClick={function () { setShowEventFields(!showEventFields); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", borderRadius: 14, border: showEventFields ? "1px solid var(--dp-accent-border)" : "1px solid var(--dp-input-border)", background: showEventFields ? "var(--dp-accent-soft)" : "transparent", color: showEventFields ? "var(--dp-accent)" : "var(--dp-text-secondary)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s", marginBottom: showEventFields ? 14 : 20 }}>
            <Calendar size={16} strokeWidth={2} /> Create Event
          </button>

          {/* Event fields */}
          {showEventFields && (
            <div style={{ padding: 14, borderRadius: 16, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", marginBottom: 20 }}>
              <GlassInput value={eventTitle} onChange={function (e) { setEventTitle(e.target.value); }} placeholder="Event title" style={{ marginBottom: 10, borderRadius: 12 }} />
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {["virtual", "physical", "challenge"].map(function (et) {
                  var active = eventType === et;
                  return (
                    <button key={et} onClick={function () { setEventType(et); }} style={{ flex: 1, padding: "7px 0", borderRadius: 10, border: active ? "1px solid var(--dp-accent-border)" : "1px solid var(--dp-input-border)", background: active ? "var(--dp-accent-soft)" : "transparent", color: active ? "var(--dp-accent)" : "var(--dp-text-secondary)", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", textTransform: "capitalize" }}>{et}</button>
                  );
                })}
              </div>
              {eventType === "virtual" && (
                <GlassInput value={eventLink} onChange={function (e) { setEventLink(e.target.value); }} placeholder="Meeting link" icon={Link2} style={{ marginBottom: 10, borderRadius: 12 }} />
              )}
              {eventType === "physical" && (
                <GlassInput value={eventLocation} onChange={function (e) { setEventLocation(e.target.value); }} placeholder="Address" icon={MapPin} style={{ marginBottom: 10, borderRadius: 12 }} />
              )}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input type="datetime-local" value={eventStart} onChange={function (e) { setEventStart(e.target.value); }} style={{ flex: 1, padding: "8px 10px", borderRadius: 10, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", color: "var(--dp-text)", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                <input type="datetime-local" value={eventEnd} onChange={function (e) { setEventEnd(e.target.value); }} style={{ flex: 1, padding: "8px 10px", borderRadius: 10, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)", color: "var(--dp-text)", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
              </div>
              <GlassInput value={eventMaxPart} onChange={function (e) { setEventMaxPart(e.target.value); }} placeholder="Max participants (optional)" type="number" icon={UsersIcon} style={{ borderRadius: 12 }} />
            </div>
          )}

          {/* Submit */}
          <GradientButton gradient="primary" onClick={handleCreatePost} disabled={!createContent.trim() || createMut.isPending} loading={createMut.isPending} fullWidth size="lg">
            {createMut.isPending ? "Publishing..." : "Publish Post"}
          </GradientButton>
        </div>
      </GlassModal>

      {/* ═══ SEARCH OVERLAY ═══ */}
      <GlassModal open={showSearch} onClose={function () { setShowSearch(false); setSearchQ(""); }} variant="center" title={t("social.searchPeople")}>
        <div style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px 12px", borderBottom: "1px solid var(--dp-divider)", marginBottom: 12 }}>
            <Search size={18} color="var(--dp-text-muted)" strokeWidth={2} />
            <input value={searchQ} onChange={function (e) { setSearchQ(e.target.value); }} placeholder={t("social.searchPeople")} autoFocus style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--dp-text)", fontSize: 15, fontFamily: "inherit" }} />
          </div>
          {searchQ && searchQ.length >= 2 && (
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {searchLoading && <div style={{ padding: 20, textAlign: "center", color: "var(--dp-text-muted)", fontSize: 13 }}>{t("social.searching")}</div>}
              {!searchLoading && searchResults.map(function (f) {
                return (
                  <div key={f.id} className="dp-gh" onClick={function () { setShowSearch(false); setSearchQ(""); navigate("/user/" + f.id); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, cursor: "pointer", transition: "background 0.15s" }}>
                    <Avatar name={f.name} size={32} color={f.color || BRAND.purple} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>{f.title} · Level {f.level}</div>
                    </div>
                  </div>
                );
              })}
              {!searchLoading && searchResults.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "var(--dp-text-muted)", fontSize: 13 }}>{t("social.noResults")}</div>}
            </div>
          )}
        </div>
      </GlassModal>

      {/* ═══ STORY CREATION MODAL ═══ */}
      <GlassModal open={showStoryCreate} onClose={function () { setShowStoryCreate(false); setStoryFile(null); if (storyPreview && storyPreview.startsWith("blob:")) { URL.revokeObjectURL(storyPreview); } setStoryPreview(""); setStoryCaption(""); }} variant="bottom" title="New Story" maxWidth={440}>
        <div style={{ padding: 20 }}>
          {/* Preview */}
          {storyPreview && (
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 16, background: "#000" }}>
              {storyMediaType === "image" ? (
                <img src={storyPreview} alt="Story preview" style={{ width: "100%", maxHeight: 360, objectFit: "contain", display: "block" }} />
              ) : (
                <video src={storyPreview} controls style={{ width: "100%", maxHeight: 360, display: "block" }} />
              )}
              <button onClick={function () { if (storyPreview && storyPreview.startsWith("blob:")) { URL.revokeObjectURL(storyPreview); } setStoryFile(null); setStoryPreview(""); }} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: "inherit" }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Pick media if none selected */}
          {!storyPreview && (
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <button onClick={function () { handleStoryFilePick("image"); }} style={{ flex: 1, padding: "32px 16px", borderRadius: 16, border: "1px dashed var(--dp-input-border)", background: "var(--dp-glass-bg)", color: "var(--dp-text-secondary)", fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <Image size={28} strokeWidth={1.5} />
                Photo
              </button>
              <button onClick={function () { handleStoryFilePick("video"); }} style={{ flex: 1, padding: "32px 16px", borderRadius: 16, border: "1px dashed var(--dp-input-border)", background: "var(--dp-glass-bg)", color: "var(--dp-text-secondary)", fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <Video size={28} strokeWidth={1.5} />
                Video
              </button>
            </div>
          )}

          {/* Caption */}
          <GlassInput
            value={storyCaption}
            onChange={function (e) { setStoryCaption(e.target.value); }}
            placeholder="Add a caption..."
            style={{ borderRadius: 14, marginBottom: 16 }}
          />

          {/* Post button */}
          <GradientButton
            onClick={handleCreateStory}
            disabled={!storyFile || createStoryMut.isPending}
            style={{ width: "100%", borderRadius: 14 }}
          >
            {createStoryMut.isPending ? "Posting..." : "Share Story"}
          </GradientButton>
        </div>
      </GlassModal>

      {/* ═══ FULLSCREEN STORY VIEWER ═══ */}
      {storyViewer && (function () {
        var group = storyGroups[storyViewer.groupIndex];
        if (!group || !group.stories || group.stories.length === 0) return null;
        var story = group.stories[storyViewer.storyIndex];
        if (!story) return null;
        var storyUser = group.user;
        var isOwnStory = storyUser && storyUser.id === String(user?.id);
        var totalStories = group.stories.length;
        var currentIdx = storyViewer.storyIndex;

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000", display: "flex", flexDirection: "column" }}>
            {/* Progress bars */}
            <div style={{ display: "flex", gap: 3, padding: "8px 12px 0", zIndex: 2 }}>
              {group.stories.map(function (_, i) {
                var pct = i < currentIdx ? 1 : i === currentIdx ? storyProgress : 0;
                return (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                    <div style={{ width: (pct * 100) + "%", height: "100%", background: "#fff", borderRadius: 2, transition: i === currentIdx ? "none" : "width 0.2s" }} />
                  </div>
                );
              })}
            </div>

            {/* Header: user info + close */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={storyUser.displayName || storyUser.username} src={storyUser.avatar} size={36} shape="circle" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{storyUser.displayName || storyUser.username}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{timeAgo(story.createdAt)}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {isOwnStory && (
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                    {story.viewCount || 0} view{(story.viewCount || 0) !== 1 ? "s" : ""}
                  </span>
                )}
                <button onClick={closeStoryViewer} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: "inherit" }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Media */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
              {story.mediaType === "image" && story.imageUrl && (
                <img src={story.imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              )}
              {story.mediaType === "video" && story.videoUrl && (
                <video src={story.videoUrl} autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} onEnded={function () { advanceStory(1); }} />
              )}

              {/* Tap zones */}
              <div onClick={function () { advanceStory(-1); }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "30%", cursor: "pointer" }} />
              <div onClick={function () { advanceStory(1); }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "70%", cursor: "pointer" }} />
            </div>

            {/* Caption */}
            {story.caption && (
              <div style={{ padding: "12px 20px 24px", zIndex: 2, background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
                <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.5 }}>{story.caption}</div>
              </div>
            )}
          </div>
        );
      })()}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        input::placeholder{color:var(--dp-text-muted);}
        textarea::placeholder{color:var(--dp-text-muted);}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
      `}</style>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// Post Card (from SOCIAL.POSTS.FEED)
// ═══════════════════════════════════════════════════════════════════
function PostCard({ item, idx, mounted, isLight, user, navigate, expandedComments, setExpandedComments, commentInputs, setCommentInputs, savedPosts, handleLikePost, handleSavePost, handleShare, handleComment, handleRegisterEvent, t }) {
  var a = item.author || item.user || {};
  var aName = a.username || a.displayName || "User";
  var aColor = avatarColor(aName);
  var isOpen = expandedComments === item.id;
  var liked = item.hasLiked || item.isLiked || item.liked || false;
  var saved = savedPosts[item.id] != null ? savedPosts[item.id] : (item.hasSaved || false);
  var lc = item.likesCount != null ? item.likesCount : (item.likes_count || item.likes || 0);
  var cc = item.commentsCount != null ? item.commentsCount : (item.comments_count || 0);
  var dTitle = item.dreamTitle || (item.dream && (item.dream.title || item.dream.name)) || "";
  var postType = item.postType || item.post_type || "regular";
  var mediaType = item.mediaType || item.media_type || "none";
  var imageUrl = item.imageUrl || item.image_url || "";
  var videoUrl = item.videoUrl || item.video_url || "";
  var audioUrl = item.audioUrl || item.audio_url || "";
  var achievement = item.linkedAchievement || null;
  var eventDetail = item.eventDetail || null;

  return (
    <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: (100 + idx * 60) + "ms", marginTop: 12 }}>
      <GlassCard padding={0}>
        {/* Author row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 0" }}>
          <Avatar name={aName} size={40} color={aColor} src={a.avatar || a.avatarUrl} shape="circle" style={{ cursor: a.id ? "pointer" : "default" }} onClick={function () { if (a.id) navigate("/user/" + a.id); }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aName}</div>
            <div style={{ fontSize: 12, color: "var(--dp-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {timeAgo(item.createdAt || item.created_at)}
              {postType === "achievement" && " · Achievement"}
              {postType === "milestone" && " · Milestone"}
              {postType === "event" && " · Event"}
            </div>
          </div>
        </div>

        {/* Achievement badge */}
        {achievement && (
          <div style={{ padding: "8px 16px 0" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 10, background: "var(--dp-accent-soft)", border: "1px solid var(--dp-accent-border)" }}>
              <Trophy size={14} color="var(--dp-accent)" strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                {achievement.goalTitle || achievement.milestoneTitle || achievement.dreamTitle || "Achievement"}
              </span>
            </div>
          </div>
        )}

        {/* Media */}
        {mediaType === "image" && imageUrl && (
          <div style={{ marginTop: 10 }}>
            <img src={imageUrl} alt="" style={{ width: "100%", maxHeight: 400, objectFit: "cover" }} loading="lazy" />
          </div>
        )}
        {mediaType === "video" && videoUrl && (
          <div style={{ marginTop: 10 }}>
            <video src={videoUrl} controls style={{ width: "100%", maxHeight: 400, borderRadius: 0 }} />
          </div>
        )}
        {mediaType === "audio" && audioUrl && (
          <div style={{ margin: "10px 16px 0", padding: "10px 14px", borderRadius: 14, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)" }}>
            <audio src={audioUrl} controls style={{ width: "100%" }} />
          </div>
        )}

        {/* Content */}
        <ExpandableText text={item.content} maxLines={4} fontSize={14} color="var(--dp-text)" style={{ padding: "10px 16px" }} />

        {/* Dream badge */}
        {dTitle && (
          <div style={{ padding: "0 16px 8px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 10, background: "var(--dp-accent-soft)", border: "1px solid var(--dp-accent-border)", cursor: "pointer" }}
              onClick={function () { var did = (item.dream && item.dream.id) || item.dreamId; if (did) navigate("/dream/" + did); }}>
              <Sparkles size={13} color="var(--dp-accent)" strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{dTitle}</span>
            </div>
          </div>
        )}

        {/* Event detail */}
        {eventDetail && (
          <div style={{ margin: "0 16px 10px", padding: 14, borderRadius: 16, background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eventDetail.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 12, color: "var(--dp-text-secondary)" }}>
              {eventDetail.eventType === "virtual" && <><Link2 size={13} />{eventDetail.meetingLink ? "Online" : "Virtual"}</>}
              {eventDetail.eventType === "physical" && <><MapPin size={13} />{eventDetail.location || "TBD"}</>}
              {eventDetail.eventType === "challenge" && <><Zap size={13} />Challenge</>}
              <span>·</span>
              <Calendar size={13} />
              <span>{new Date(eventDetail.startTime).toLocaleDateString()}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--dp-text-tertiary)" }}>
                <UsersIcon size={14} />
                <span>{eventDetail.participantsCount}{eventDetail.maxParticipants ? "/" + eventDetail.maxParticipants : ""} registered</span>
              </div>
              {!eventDetail.isRegistered && (
                <button onClick={function () { handleRegisterEvent(eventDetail.id); }} style={{ padding: "6px 16px", borderRadius: 10, border: "none", background: GRADIENTS.primary, color: BRAND.white, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Register</button>
              )}
              {eventDetail.isRegistered && (
                <span style={{ padding: "6px 16px", borderRadius: 10, background: "var(--dp-accent-soft)", color: "var(--dp-accent)", fontSize: 12, fontWeight: 600 }}>Registered</span>
              )}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "8px 16px 12px", borderTop: "1px solid var(--dp-divider)" }}>
          <ActionBtn onClick={function () { handleLikePost(item.id); }} active={liked} activeColor="var(--dp-danger)">
            <Heart size={22} strokeWidth={1.8} fill={liked ? BRAND.redSolid : "none"} color={liked ? BRAND.redSolid : undefined} />
          </ActionBtn>
          <ActionBtn onClick={function () { setExpandedComments(function (p) { return p === item.id ? null : item.id; }); }}>
            <MessageCircle size={22} strokeWidth={1.8} />
          </ActionBtn>
          <ActionBtn onClick={function () { handleShare(item); }}>
            <Share2 size={22} strokeWidth={1.8} />
          </ActionBtn>
          <div style={{ flex: 1 }} />
          <ActionBtn onClick={function () { handleSavePost(item.id); }} active={saved} activeColor="var(--dp-text)">
            <Bookmark size={22} strokeWidth={1.8} fill={saved ? "var(--dp-text)" : "none"} />
          </ActionBtn>
        </div>

        {/* Like count */}
        {lc > 0 && (
          <div style={{ padding: "0 16px 8px", fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>
            {lc} {lc === 1 ? "like" : "likes"}
          </div>
        )}

        {/* Comments */}
        {isOpen && (
          <div style={{ padding: "0 16px 14px" }}>
            <div style={{ borderTop: "1px solid var(--dp-divider)", paddingTop: 12 }}>
              <CommentInput itemId={item.id} type="post" commentInputs={commentInputs} setCommentInputs={setCommentInputs} handleComment={handleComment} />
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// Event Card (from SOCIAL.FEED.FRIENDS — activity events)
// ═══════════════════════════════════════════════════════════════════
function EventCard({ item, idx, mounted, isLight, navigate, expandedComments, setExpandedComments, commentInputs, setCommentInputs, handleLikeEvent, handleShare, handleComment, t }) {
  var u = item.user || {};
  var uName = u.username || u.name || "User";
  var cfg = FEED_CONFIG[item.type] || FEED_CONFIG.task_completed;
  var FIcon = cfg.Icon;
  var isOpen = expandedComments === item.id;
  var eventText = "";
  var d = item.data || item.content || {};
  if (item.type === "level_up") eventText = "Reached Level " + (d.level || "?");
  else if (item.type === "task_completed") eventText = d.task || "Completed a task";
  else if (item.type === "dream_created") eventText = "Created dream: " + (d.dream || "a new dream");
  else if (item.type === "dream_completed") eventText = "Completed a dream!";
  else if (item.type === "streak") eventText = (d.days || 0) + " day streak!";
  else if (item.type === "milestone_reached") eventText = "Reached a milestone!";
  else if (item.type === "badge_earned") eventText = "Earned a badge!";
  else eventText = d.task || d.dream || "Activity";

  return (
    <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: (100 + idx * 60) + "ms", marginTop: 12 }}>
      <GlassCard padding={14}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar name={uName} size={36} color={u.color || avatarColor(uName)} shape="circle" style={{ cursor: u.id ? "pointer" : "default" }} onClick={function () { if (u.id) navigate("/user/" + u.id); }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "50%" }}>{uName}</span>
              <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>{timeAgo(item._time)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--dp-text-primary)" }}>
              <FIcon size={14} color={adaptColor(cfg.color, isLight)} strokeWidth={2} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{eventText}</span>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--dp-divider)" }}>
          <ActionBtn onClick={function () { handleLikeEvent(item.id); }} small>
            <Heart size={18} strokeWidth={1.8} />
          </ActionBtn>
          <ActionBtn onClick={function () { setExpandedComments(function (p) { return p === item.id ? null : item.id; }); }} small>
            <MessageCircle size={18} strokeWidth={1.8} />
          </ActionBtn>
          <ActionBtn onClick={function () { handleShare(item); }} small>
            <Share2 size={18} strokeWidth={1.8} />
          </ActionBtn>
          <div style={{ flex: 1 }} />
          <ActionBtn small>
            <Bookmark size={18} strokeWidth={1.8} />
          </ActionBtn>
        </div>

        {/* Comments */}
        {isOpen && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--dp-divider)" }}>
            <CommentInput itemId={item.id} type="event" commentInputs={commentInputs} setCommentInputs={setCommentInputs} handleComment={handleComment} />
          </div>
        )}
      </GlassCard>
    </div>
  );
}


// ── Shared Components ────────────────────────────────────────────

function ActionBtn({ onClick, active, activeColor, small, children }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: small ? 36 : 40, height: small ? 36 : 40, border: "none", background: "transparent", color: active ? (activeColor || "var(--dp-accent)") : "var(--dp-text-tertiary)", cursor: "pointer", borderRadius: 10, transition: "all 0.15s", fontFamily: "inherit", padding: 0 }}>
      {children}
    </button>
  );
}

function CommentInput({ itemId, type, commentInputs, setCommentInputs, handleComment }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <GlassInput
        value={commentInputs[itemId] || ""}
        onChange={function (e) { setCommentInputs(function (p) { return Object.assign({}, p, { [itemId]: e.target.value }); }); }}
        onKeyDown={function (e) { if (e.key === "Enter") { e.preventDefault(); handleComment(itemId, type); } }}
        placeholder="Write a comment..."
        style={{ flex: 1, borderRadius: 14 }}
        inputStyle={{ fontSize: 13 }}
      />
      <button onClick={function () { handleComment(itemId, type); }} disabled={!(commentInputs[itemId] || "").trim()} style={{ width: 36, height: 36, borderRadius: 12, border: "none", background: (commentInputs[itemId] || "").trim() ? GRADIENTS.primary : "var(--dp-glass-bg)", color: (commentInputs[itemId] || "").trim() ? BRAND.white : "var(--dp-text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: (commentInputs[itemId] || "").trim() ? "pointer" : "default", transition: "all 0.2s", flexShrink: 0, fontFamily: "inherit" }}>
        <Send size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
