import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Users, MessageSquare, Trophy, Flame,
  Heart, MessageCircle, Send, Crown, Shield, Star,
  User, ChevronRight, Target, Zap
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { MOCK_CIRCLES } from "../../data/mockData";

// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Circle Detail Screen
// ═══════════════════════════════════════════════════════════════

const CATEGORY_COLORS = {
  Health: "#10B981",
  Career: "#8B5CF6",
  Growth: "#6366F1",
  Finance: "#FCD34D",
  Hobbies: "#EC4899",
};

const MOCK_POSTS = [
  {
    id: "p1",
    user: { name: "Alex", initial: "A", color: "#14B8A6" },
    content:
      "Just completed my morning run - 8K in 38 minutes! Feeling amazing. This circle keeps me accountable every single day.",
    timeAgo: "2h ago",
    likes: 12,
    comments: 4,
    liked: false,
  },
  {
    id: "p2",
    user: { name: "Sophie", initial: "S", color: "#EC4899" },
    content:
      "Anyone else doing the weekly challenge? I'm on day 3 and already feeling the difference. Let's push through together!",
    timeAgo: "5h ago",
    likes: 8,
    comments: 6,
    liked: true,
  },
  {
    id: "p3",
    user: { name: "Marco", initial: "M", color: "#3B82F6" },
    content:
      "Pro tip: Break your big goals into daily micro-actions. I've been shipping one small feature every day this week. Momentum is everything.",
    timeAgo: "1d ago",
    likes: 23,
    comments: 9,
    liked: false,
  },
];

const MOCK_MEMBERS = [
  { id: "m1", name: "Stephane", initial: "S", color: "#8B5CF6", role: "Admin", level: 12 },
  { id: "m2", name: "Alex", initial: "A", color: "#14B8A6", role: "Moderator", level: 10 },
  { id: "m3", name: "Sophie", initial: "S", color: "#EC4899", role: "Member", level: 9 },
  { id: "m4", name: "Marco", initial: "M", color: "#3B82F6", role: "Member", level: 14 },
  { id: "m5", name: "Lisa", initial: "L", color: "#F59E0B", role: "Member", level: 12 },
];

const MOCK_CHALLENGE = {
  title: "Ship a feature this week",
  description: "Build and deploy at least one meaningful feature to your project by Sunday.",
  progress: 65,
  participants: 42,
  daysLeft: 3,
  leaderboard: [
    { name: "Marco", initial: "M", color: "#3B82F6", points: 340 },
    { name: "Stephane", initial: "S", color: "#8B5CF6", points: 280 },
    { name: "Alex", initial: "A", color: "#14B8A6", points: 215 },
  ],
};

const ROLE_CONFIG = {
  Admin: { color: "#FCD34D", icon: Crown },
  Moderator: { color: "#8B5CF6", icon: Shield },
  Member: { color: "var(--dp-text-tertiary)", icon: User },
};

const glass = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

export default function CircleDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [composerText, setComposerText] = useState("");
  const [challengeJoined, setChallengeJoined] = useState(false);

  const circle = MOCK_CIRCLES.find((c) => c.id === id) || MOCK_CIRCLES[0];
  const categoryColor = CATEGORY_COLORS[circle.category] || "#C4B5FD";

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  const toggleLike = (postId) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? p.likes - 1 : p.likes + 1,
            }
          : p
      )
    );
  };

  const handlePost = () => {
    if (!composerText.trim()) return;
    const newPost = {
      id: `p${Date.now()}`,
      user: { name: "Stephane", initial: "S", color: "#8B5CF6" },
      content: composerText.trim(),
      timeAgo: "Just now",
      likes: 0,
      comments: 0,
      liked: false,
    };
    setPosts((prev) => [newPost, ...prev]);
    setComposerText("");
  };

  const tabs = [
    { key: "posts", label: "Posts", icon: MessageSquare },
    { key: "members", label: "Members", icon: Users },
    { key: "challenges", label: "Challenges", icon: Trophy },
  ];

  return (
    <PageLayout>
      <div
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: "100vh",
          paddingBottom: 80,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 0 16px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--dp-text)",
              letterSpacing: "-0.3px",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {circle.name}
          </span>
        </div>

        {/* Circle header card */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
          }}
        >
          <div
            style={{
              ...glass,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--dp-text)",
                    marginBottom: 6,
                  }}
                >
                  {circle.name}
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--dp-text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {circle.description}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "var(--dp-text-secondary)",
                }}
              >
                <Users size={14} color={isLight ? "#6D28D9" : "#C4B5FD"} strokeWidth={2} />
                {circle.memberCount} members
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "var(--dp-text-secondary)",
                }}
              >
                <MessageSquare size={14} color="#14B8A6" strokeWidth={2} />
                {circle.posts} posts
              </span>
            </div>

            {/* Category badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  padding: "5px 12px",
                  borderRadius: 10,
                  background: `${categoryColor}12`,
                  border: `1px solid ${categoryColor}20`,
                  fontSize: 12,
                  fontWeight: 600,
                  color: isLight ? ({ "#FCD34D": "#B45309", "#C4B5FD": "#6D28D9" }[categoryColor] || categoryColor) : categoryColor,
                }}
              >
                {circle.category}
              </span>
            </div>

            {/* Active challenge banner */}
            {circle.activeChallenge && (
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(249,115,22,0.06)",
                  border: "1px solid rgba(249,115,22,0.12)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Flame size={18} color="#FB923C" strokeWidth={2} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#FB923C",
                    }}
                  >
                    Active Challenge
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--dp-text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    {circle.activeChallenge}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  color="var(--dp-text-muted)"
                  strokeWidth={2}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            borderRadius: 14,
            background: "var(--dp-glass-bg)",
            border: "1px solid var(--dp-glass-border)",
            marginBottom: 18,
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 11,
                  border: "none",
                  background:
                    activeTab === tab.key
                      ? "rgba(139,92,246,0.15)"
                      : "transparent",
                  color:
                    activeTab === tab.key
                      ? "var(--dp-text)"
                      : "var(--dp-text-tertiary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <Icon size={14} strokeWidth={2} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══ POSTS TAB ═══ */}
        {activeTab === "posts" && (
          <div>
            {posts.map((post, i) => (
              <div
                key={post.id}
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(16px)",
                  transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.25 + i * 0.08}s`,
                }}
              >
                <div
                  style={{
                    ...glass,
                    padding: 18,
                    marginBottom: 12,
                    borderRadius: 18,
                  }}
                >
                  {/* User header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: `${post.user.color}18`,
                        border: `2px solid ${post.user.color}25`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 700,
                        color: post.user.color,
                        flexShrink: 0,
                      }}
                    >
                      {post.user.initial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--dp-text)",
                        }}
                      >
                        {post.user.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--dp-text-muted)",
                        }}
                      >
                        {post.timeAgo}
                      </div>
                    </div>
                  </div>

                  {/* Post content */}
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--dp-text-primary)",
                      lineHeight: 1.6,
                      marginBottom: 14,
                    }}
                  >
                    {post.content}
                  </p>

                  {/* Action buttons */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      paddingTop: 10,
                      borderTop: "1px solid var(--dp-surface)",
                    }}
                  >
                    <button
                      onClick={() => toggleLike(post.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 0",
                        border: "none",
                        background: "transparent",
                        color: post.liked
                          ? "#EF4444"
                          : "var(--dp-text-tertiary)",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "color 0.2s",
                      }}
                    >
                      <Heart
                        size={15}
                        strokeWidth={2}
                        fill={post.liked ? "#EF4444" : "none"}
                      />
                      {post.likes}
                    </button>
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 0",
                        border: "none",
                        background: "transparent",
                        color: "var(--dp-text-tertiary)",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <MessageCircle size={15} strokeWidth={2} />
                      {post.comments}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ MEMBERS TAB ═══ */}
        {activeTab === "members" && (
          <div>
            {MOCK_MEMBERS.map((member, i) => {
              const roleConfig = ROLE_CONFIG[member.role];
              const RoleIcon = roleConfig.icon;
              return (
                <div
                  key={member.id}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(16px)",
                    transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.25 + i * 0.06}s`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderRadius: 16,
                      background:
                        member.role === "Admin"
                          ? "rgba(252,211,77,0.04)"
                          : "var(--dp-glass-bg)",
                      border:
                        member.role === "Admin"
                          ? "1px solid rgba(252,211,77,0.08)"
                          : "1px solid var(--dp-surface)",
                      marginBottom: 8,
                      transition: "all 0.2s",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        background: `${member.color}15`,
                        border: `2px solid ${member.color}25`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 17,
                        fontWeight: 700,
                        color: member.color,
                        flexShrink: 0,
                      }}
                    >
                      {member.initial}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--dp-text)",
                          }}
                        >
                          {member.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--dp-text-muted)",
                          }}
                        >
                          Lv.{member.level}
                        </span>
                      </div>
                    </div>

                    {/* Role badge */}
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: `${roleConfig.color}10`,
                        border: `1px solid ${roleConfig.color}20`,
                        fontSize: 11,
                        fontWeight: 600,
                        color: isLight ? ({ "#FCD34D": "#B45309" }[roleConfig.color] || roleConfig.color) : roleConfig.color,
                      }}
                    >
                      <RoleIcon size={12} strokeWidth={2.5} />
                      {member.role}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ CHALLENGES TAB ═══ */}
        {activeTab === "challenges" && (
          <div>
            {/* Active challenge card */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s",
              }}
            >
              <div
                style={{
                  ...glass,
                  padding: 20,
                  marginBottom: 16,
                  border: "1px solid rgba(249,115,22,0.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: "rgba(249,115,22,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Flame size={20} color="#FB923C" strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--dp-text)",
                      }}
                    >
                      {MOCK_CHALLENGE.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--dp-text-tertiary)",
                        marginTop: 2,
                      }}
                    >
                      {MOCK_CHALLENGE.daysLeft} days left
                      &middot; {MOCK_CHALLENGE.participants} participants
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: "var(--dp-text-secondary)",
                    lineHeight: 1.5,
                    marginBottom: 16,
                  }}
                >
                  {MOCK_CHALLENGE.description}
                </p>

                {/* Progress bar */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--dp-text-secondary)",
                      }}
                    >
                      Progress
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#FB923C",
                      }}
                    >
                      {MOCK_CHALLENGE.progress}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "var(--dp-glass-border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: mounted
                          ? `${MOCK_CHALLENGE.progress}%`
                          : "0%",
                        borderRadius: 3,
                        background:
                          "linear-gradient(90deg, #FB923C, #F59E0B)",
                        transition:
                          "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                        boxShadow: "0 0 8px rgba(249,115,22,0.3)",
                      }}
                    />
                  </div>
                </div>

                {/* Join button */}
                <button
                  onClick={() => setChallengeJoined(true)}
                  disabled={challengeJoined}
                  style={{
                    width: "100%",
                    padding: "13px 0",
                    borderRadius: 14,
                    border: challengeJoined
                      ? "1px solid rgba(16,185,129,0.2)"
                      : "none",
                    background: challengeJoined
                      ? "rgba(16,185,129,0.08)"
                      : "linear-gradient(135deg, #FB923C, #F59E0B)",
                    color: challengeJoined ? "#10B981" : "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: challengeJoined ? "default" : "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: challengeJoined
                      ? "none"
                      : "0 4px 16px rgba(249,115,22,0.3)",
                    transition: "all 0.25s",
                  }}
                >
                  {challengeJoined ? (
                    <>
                      <Target size={16} strokeWidth={2.5} />
                      Joined!
                    </>
                  ) : (
                    <>
                      <Flame size={16} strokeWidth={2} />
                      Join Challenge
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Leaderboard */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.35s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                <Trophy size={15} color={isLight ? "#B45309" : "#FCD34D"} strokeWidth={2.5} />
                <span
                  style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}
                >
                  Leaderboard
                </span>
              </div>

              {MOCK_CHALLENGE.leaderboard.map((entry, i) => {
                const medals = ["#FCD34D", "#C0C0C0", "#CD7F32"];
                const medalColor = medals[i] || "rgba(255,255,255,0.3)";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderRadius: 16,
                      background:
                        i === 0
                          ? "rgba(252,211,77,0.04)"
                          : "var(--dp-glass-bg)",
                      border:
                        i === 0
                          ? "1px solid rgba(252,211,77,0.1)"
                          : "1px solid var(--dp-surface)",
                      marginBottom: 8,
                      opacity: mounted ? 1 : 0,
                      transform: mounted
                        ? "translateY(0)"
                        : "translateY(10px)",
                      transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + i * 0.08}s`,
                    }}
                  >
                    {/* Rank */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        background: `${medalColor}15`,
                        border: `1px solid ${medalColor}25`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: isLight ? ({ "#FCD34D": "#B45309", "#C0C0C0": "#6B7280" }[medalColor] || medalColor) : medalColor,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>

                    {/* Avatar */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: `${entry.color}15`,
                        border: `2px solid ${entry.color}25`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 700,
                        color: entry.color,
                        flexShrink: 0,
                      }}
                    >
                      {entry.initial}
                    </div>

                    {/* Name */}
                    <span
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--dp-text)",
                      }}
                    >
                      {entry.name}
                    </span>

                    {/* Points */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Zap size={13} color={isLight ? "#B45309" : "#FCD34D"} strokeWidth={2.5} />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: isLight ? "#B45309" : "#FCD34D",
                        }}
                      >
                        {entry.points}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Post composer (always visible at bottom for posts tab) */}
        {activeTab === "posts" && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px 16px",
              background: "var(--dp-modal-bg)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              borderTop: "1px solid var(--dp-glass-border)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.5s ease 0.4s",
            }}
          >
            <div
              style={{
                flex: 1,

                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <input
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePost()}
                placeholder="Share with the circle..."
                style={{
                  flex: 1,
                  padding: "11px 16px",
                  borderRadius: 14,
                  border: "1px solid var(--dp-input-border)",
                  background: "var(--dp-glass-bg)",
                  color: "var(--dp-text)",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <button
                onClick={handlePost}
                disabled={!composerText.trim()}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: "none",
                  background: composerText.trim()
                    ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                    : "var(--dp-glass-bg)",
                  color: composerText.trim()
                    ? "#fff"
                    : "var(--dp-text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: composerText.trim() ? "pointer" : "not-allowed",
                  flexShrink: 0,
                  transition: "all 0.2s",
                  boxShadow: composerText.trim()
                    ? "0 2px 10px rgba(139,92,246,0.3)"
                    : "none",
                }}
              >
                <Send size={17} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        <style>{`
          input::placeholder { color: var(--dp-text-muted); }
        `}</style>
      </div>
    </PageLayout>
  );
}
