import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, UserPlus, MessageCircle, Trophy, Flame, Star,
  Zap, Target, Check, Users, Heart, Briefcase, Palette,
  Brain, Wallet, TrendingUp
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { MOCK_LEADERBOARD, MOCK_BUDDY_SUGGESTIONS, CATEGORIES } from "../../data/mockData";
import { useTheme } from "../../context/ThemeContext";

const ALL_USERS = [
  { id: "l1", name: "Jade", initial: "J", level: 15, xp: 3800, streak: 28, bio: "Dreaming big and achieving bigger. Passionate about fitness and tech.", mutualFriends: 3, dreams: ["Run a Marathon", "Learn Japanese"], categories: ["health", "personal"], joinedDate: "Jun 2025" },
  { id: "l2", name: "Marco", initial: "M", level: 14, xp: 3200, streak: 21, bio: "Building the future one dream at a time. Full-stack developer.", mutualFriends: 5, dreams: ["Launch a Startup", "Learn Piano"], categories: ["career", "hobbies"], joinedDate: "Jul 2025" },
  { id: "l3", name: "Lisa", initial: "L", level: 12, xp: 2900, streak: 18, bio: "Creative soul on a journey of self-improvement and artistic growth.", mutualFriends: 2, dreams: ["Write a Novel", "Get in Shape"], categories: ["hobbies", "health"], joinedDate: "Aug 2025" },
  { id: "l5", name: "Alex", initial: "A", level: 10, xp: 2200, streak: 12, bio: "Fitness enthusiast training for my first half marathon.", mutualFriends: 4, dreams: ["Run a Half Marathon", "Learn Cooking"], categories: ["health", "hobbies"], joinedDate: "Sep 2025" },
  { id: "l6", name: "Sophie", initial: "S", level: 9, xp: 1950, streak: 14, bio: "Triathlon training while building a freelance career.", mutualFriends: 3, dreams: ["Complete a Triathlon", "Freelance Business"], categories: ["health", "career"], joinedDate: "Aug 2025" },
  { id: "l7", name: "Daniel", initial: "D", level: 8, xp: 1700, streak: 9, bio: "Financial freedom is the goal. One step at a time.", mutualFriends: 1, dreams: ["Save $20K", "Start Investing"], categories: ["finance"], joinedDate: "Oct 2025" },
  { id: "fr1", name: "Emma", initial: "E", level: 7, xp: 1200, streak: 5, bio: "New to DreamPlanner, excited to achieve my goals!", mutualFriends: 2, dreams: ["Learn Guitar", "Read 24 Books"], categories: ["hobbies", "personal"], joinedDate: "Dec 2025" },
  { id: "fr2", name: "Noah", initial: "N", level: 11, xp: 2600, streak: 16, bio: "Tech entrepreneur with a passion for personal growth.", mutualFriends: 4, dreams: ["Launch SaaS Product", "Meditate Daily"], categories: ["career", "personal"], joinedDate: "Jul 2025" },
  { id: "om1", name: "Omar", initial: "O", level: 8, xp: 1600, streak: 10, bio: "Aspiring podcaster and storyteller. Love connecting with people.", mutualFriends: 2, dreams: ["Start a Podcast", "Write a Blog"], categories: ["hobbies", "career"], joinedDate: "Oct 2025" },
  { id: "ma1", name: "Maya", initial: "M", level: 9, xp: 1850, streak: 11, bio: "Graphic designer exploring new creative horizons.", mutualFriends: 1, dreams: ["Launch Design Portfolio", "Learn 3D Modeling"], categories: ["hobbies", "career"], joinedDate: "Nov 2025" },
  { id: "za1", name: "Zara", initial: "Z", level: 13, xp: 3100, streak: 20, bio: "Finance nerd on a mission to build wealth and share knowledge.", mutualFriends: 3, dreams: ["Build Investment Portfolio", "Start Finance Blog"], categories: ["finance", "career"], joinedDate: "Jul 2025" },
  { id: "et1", name: "Ethan", initial: "E", level: 11, xp: 2400, streak: 13, bio: "Health-conscious foodie who loves meal prepping and fitness.", mutualFriends: 2, dreams: ["Run a 5K", "Master Meal Prep"], categories: ["health", "hobbies"], joinedDate: "Sep 2025" },
];

const CAT_ICONS = { career: Briefcase, hobbies: Palette, health: Heart, finance: Wallet, personal: Brain, relationships: Users };
const CAT_COLORS = { career: "#8B5CF6", hobbies: "#EC4899", health: "#10B981", finance: "#FCD34D", personal: "#6366F1", relationships: "#14B8A6" };

const LIGHT_COLOR_MAP = {
  "#C4B5FD": "#6D28D9",
  "#5DE5A8": "#059669",
  "#FCD34D": "#B45309",
  "#F69A9A": "#DC2626",
};

export default function UserProfileScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const user = ALL_USERS.find(u => u.id === id);
  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(18px)",
    transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms`,
  });

  if (!user) {
    return (
      <PageLayout>
        <div style={{ paddingTop: 20, paddingBottom: 40, fontFamily: "'Inter', sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <button className="dp-ib" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>Profile</span>
          </div>
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px",
              background: "var(--dp-glass-bg)", border: "1px solid var(--dp-input-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Users size={32} color="var(--dp-text-muted)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 8px" }}>User Not Found</h2>
            <p style={{ fontSize: 14, color: "var(--dp-text-muted)", margin: 0 }}>This profile doesn't exist or may have been removed.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ paddingTop: 20, paddingBottom: 40, fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, ...stagger(0) }}>
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>Profile</span>
        </div>

        {/* Avatar + Name */}
        <div style={{ textAlign: "center", marginBottom: 28, ...stagger(1) }}>
          <div style={{
            width: 88, height: 88, borderRadius: "50%", margin: "0 auto 16px",
            background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))",
            border: "3px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 34, fontWeight: 700, color: "#fff",
            boxShadow: "0 0 30px rgba(139,92,246,0.2)",
          }}>
            {user.initial}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 4px", letterSpacing: "-0.5px" }}>{user.name}</h1>
          <p style={{ fontSize: 13, color: "var(--dp-text-tertiary)", margin: 0 }}>Joined {user.joinedDate}</p>
          {user.mutualFriends > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 8 }}>
              <Users size={13} color="var(--dp-text-tertiary)" />
              <span style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>{user.mutualFriends} mutual friends</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, ...stagger(2) }}>
          <button
            onClick={() => setRequestSent(!requestSent)}
            style={{
              flex: 1, height: 46, borderRadius: 14, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: 14, fontWeight: 600, transition: "all 0.3s",
              background: requestSent ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              color: requestSent ? (isLight ? "#059669" : "#5DE5A8") : "#fff",
              border: requestSent ? "1px solid rgba(93,229,168,0.3)" : "none",
            }}
          >
            {requestSent ? <Check size={18} /> : <UserPlus size={18} />}
            {requestSent ? "Request Sent" : "Add Friend"}
          </button>
          <button onClick={() => navigate("/buddy-chat/" + user.id)} style={{
            flex: 1, height: 46, borderRadius: 14, background: "var(--dp-glass-bg)",
            border: "1px solid var(--dp-input-border)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontSize: 14, fontWeight: 600, color: "var(--dp-text-primary)", transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--dp-surface-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--dp-glass-bg)"}
          >
            <MessageCircle size={18} /> Message
          </button>
        </div>

        {/* Bio */}
        {user.bio && (
          <div style={{
            ...stagger(3), padding: 16, borderRadius: 16,
            background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
            marginBottom: 20,
          }}>
            <p style={{ fontSize: 14, color: "var(--dp-text-secondary)", lineHeight: 1.6, margin: 0 }}>{user.bio}</p>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24, ...stagger(4) }}>
          {[
            { icon: Star, label: "Level", value: user.level, color: isLight ? "#B45309" : "#FCD34D" },
            { icon: Zap, label: "XP", value: user.xp.toLocaleString(), color: isLight ? "#6D28D9" : "#C4B5FD" },
            { icon: Flame, label: "Streak", value: `${user.streak}d`, color: isLight ? "#DC2626" : "#F69A9A" },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: "14px 10px", borderRadius: 16, textAlign: "center",
              background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
            }}>
              <stat.icon size={18} color={stat.color} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)" }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "var(--dp-text-tertiary)", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Dreams */}
        {user.dreams && user.dreams.length > 0 && (
          <div style={{ marginBottom: 24, ...stagger(5) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Target size={16} color={isLight ? "#6D28D9" : "#C4B5FD"} />
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)" }}>Dreams</span>
            </div>
            {user.dreams.map((dream, i) => (
              <div key={i} style={{
                padding: "12px 14px", borderRadius: 14, marginBottom: 8,
                background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <Target size={14} color="var(--dp-text-muted)" />
                <span style={{ fontSize: 13, color: "var(--dp-text-primary)" }}>{dream}</span>
              </div>
            ))}
          </div>
        )}

        {/* Interests */}
        {user.categories && user.categories.length > 0 && (
          <div style={{ ...stagger(6) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Heart size={16} color="#EC4899" />
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)" }}>Interests</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {user.categories.map((cat, i) => {
                const CatIcon = CAT_ICONS[cat] || Star;
                const color = CAT_COLORS[cat] || "#8B5CF6";
                const textColor = isLight && LIGHT_COLOR_MAP[color] ? LIGHT_COLOR_MAP[color] : color;
                const label = CATEGORIES[cat]?.label || cat;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                    borderRadius: 20, background: `${color}12`, border: `1px solid ${color}25`,
                  }}>
                    <CatIcon size={14} color={textColor} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
