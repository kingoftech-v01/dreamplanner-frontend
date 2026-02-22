import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Award, Flame, Star, Target, Heart, Sparkles,
  Sun, Moon, Users, CheckCircle, Zap, Eye, BookOpen, Trophy,
  Lock,
} from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";

const ACHIEVEMENTS = [
  { id: "a1", label: "7-Day Streak", desc: "Maintain a 7-day activity streak", icon: Flame, color: "#F69A9A", xp: 50, unlocked: true, date: "Dec 3, 2025" },
  { id: "a2", label: "Level 10", desc: "Reach level 10 in your journey", icon: Star, color: "#FCD34D", xp: 100, unlocked: true, date: "Jan 8, 2026" },
  { id: "a3", label: "Dream Master", desc: "Create and actively pursue 5 dreams", icon: Target, color: "#C4B5FD", xp: 75, unlocked: true, date: "Jan 15, 2026" },
  { id: "a4", label: "50 Tasks", desc: "Complete 50 tasks across all dreams", icon: Award, color: "#5DE5A8", xp: 120, unlocked: true, date: "Feb 1, 2026" },
  { id: "a5", label: "Social Butterfly", desc: "Connect with 10 accountability buddies", icon: Heart, color: "#5EEAD4", xp: 60, unlocked: true, date: "Feb 10, 2026" },
  { id: "a6", label: "First Dream", desc: "Create your very first dream", icon: Sparkles, color: "#C4B5FD", xp: 25, unlocked: true, date: "Nov 12, 2025" },
  { id: "a7", label: "Early Bird", desc: "Complete a task before 7 AM", icon: Sun, color: "#FCD34D", xp: 30, unlocked: true, date: "Dec 18, 2025" },
  { id: "a8", label: "Night Owl", desc: "Complete a task after midnight", icon: Moon, color: "#818CF8", xp: 30, unlocked: true, date: "Jan 22, 2026" },
  { id: "a9", label: "Team Player", desc: "Join 3 circles or communities", icon: Users, color: "#60A5FA", xp: 50, unlocked: false },
  { id: "a10", label: "Perfectionist", desc: "Complete all tasks in a goal with 100%", icon: CheckCircle, color: "#5DE5A8", xp: 80, unlocked: false },
  { id: "a11", label: "Speed Runner", desc: "Complete 5 micro-start challenges in one day", icon: Zap, color: "#FBBF24", xp: 60, unlocked: false },
  { id: "a12", label: "Visionary", desc: "Add 10 images to your vision board", icon: Eye, color: "#F472B6", xp: 40, unlocked: false },
  { id: "a13", label: "Mentor", desc: "Help 5 buddies by sending encouragement", icon: BookOpen, color: "#34D399", xp: 70, unlocked: false },
  { id: "a14", label: "Century Club", desc: "Complete 100 tasks total", icon: Trophy, color: "#F59E0B", xp: 200, unlocked: false },
  { id: "a15", label: "30-Day Streak", desc: "Maintain a 30-day activity streak", icon: Flame, color: "#EF4444", xp: 150, unlocked: false },
];

const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length;
const totalXP = ACHIEVEMENTS.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0);

export default function AchievementsScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 60}ms`,
  });

  return (
    <PageLayout>
      <div style={{ paddingTop: 20, paddingBottom: 40, fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, ...stagger(0) }}>
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>Achievements</span>
          <span style={{
            marginLeft: "auto", padding: "4px 10px", borderRadius: 10,
            background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)",
            fontSize: 12, fontWeight: 600, color: isLight ? "#6D28D9" : "#C4B5FD",
          }}>
            {unlockedCount}/{ACHIEVEMENTS.length}
          </span>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, ...stagger(1) }}>
          {[
            { icon: Award, val: unlockedCount, label: "Unlocked", color: "#FCD34D" },
            { icon: Zap, val: totalXP, label: "XP Earned", color: "#5DE5A8" },
            { icon: Flame, val: "8 days", label: "Streak", color: "#F69A9A" },
          ].map(({ icon: I, val, label, color }, i) => (
            <div key={i} style={{
              flex: 1, padding: "14px 8px", textAlign: "center", borderRadius: 16,
              background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            }}>
              <I size={18} color={isLight ? ({ "#FCD34D": "#B45309", "#5DE5A8": "#059669", "#F69A9A": "#DC2626" }[color] || color) : color} strokeWidth={2} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)" }}>{val}</div>
              <div style={{ fontSize: 10, color: "var(--dp-text-tertiary)", fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Unlocked Section */}
        <div style={{ marginBottom: 8, ...stagger(2) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Trophy size={14} color={isLight ? "#B45309" : "#FCD34D"} strokeWidth={2.5} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}>Unlocked</span>
            <span style={{ fontSize: 12, color: "var(--dp-text-muted)", fontWeight: 500 }}>
              ({ACHIEVEMENTS.filter(a => a.unlocked).length})
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
          {ACHIEVEMENTS.filter(a => a.unlocked).map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={a.id} style={{
                ...stagger(3 + i),
                padding: 16, borderRadius: 18,
                background: "var(--dp-glass-bg)",
                border: "1px solid var(--dp-glass-border)",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 10, textAlign: "center",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: `${a.color}15`, border: `1px solid ${a.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 20px ${a.color}15`,
                }}>
                  <Icon size={24} color={isLight ? ({ "#C4B5FD": "#6D28D9", "#5DE5A8": "#059669", "#5EEAD4": "#0D9488", "#FCD34D": "#B45309", "#F69A9A": "#DC2626" }[a.color] || a.color) : a.color} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", marginBottom: 3 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: "var(--dp-text-tertiary)", lineHeight: 1.4 }}>{a.desc}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
                  <span style={{
                    padding: "3px 8px", borderRadius: 8,
                    background: "rgba(93,229,168,0.1)", border: "1px solid rgba(93,229,168,0.15)",
                    fontSize: 11, fontWeight: 600, color: isLight ? "#059669" : "#5DE5A8",
                  }}>
                    +{a.xp} XP
                  </span>
                  <span style={{ fontSize: 10, color: "var(--dp-text-muted)" }}>{a.date}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Locked Section */}
        <div style={{ marginBottom: 8, ...stagger(3 + ACHIEVEMENTS.filter(a => a.unlocked).length) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Lock size={14} color="var(--dp-text-muted)" strokeWidth={2.5} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text-tertiary)" }}>Locked</span>
            <span style={{ fontSize: 12, color: "var(--dp-text-muted)", fontWeight: 500 }}>
              ({ACHIEVEMENTS.filter(a => !a.unlocked).length})
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {ACHIEVEMENTS.filter(a => !a.unlocked).map((a, i) => {
            const Icon = a.icon;
            const base = 4 + ACHIEVEMENTS.filter(x => x.unlocked).length;
            return (
              <div key={a.id} style={{
                ...stagger(base + i),
                padding: 16, borderRadius: 18,
                background: "var(--dp-glass-bg)",
                border: "1px solid var(--dp-glass-bg)",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 10, textAlign: "center", opacity: mounted ? 0.55 : 0,
                transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${(base + i) * 60}ms`,
              }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={24} color="var(--dp-text-muted)" strokeWidth={1.8} />
                  </div>
                  <div style={{
                    position: "absolute", bottom: -3, right: -3,
                    width: 20, height: 20, borderRadius: 7,
                    background: "var(--dp-modal-bg)", border: "1px solid var(--dp-surface-hover)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Lock size={10} color="var(--dp-text-muted)" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-tertiary)", marginBottom: 3 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: "var(--dp-text-muted)", lineHeight: 1.4 }}>{a.desc}</div>
                </div>
                <span style={{
                  padding: "3px 8px", borderRadius: 8, marginTop: "auto",
                  background: "var(--dp-glass-bg)", border: "1px solid var(--dp-glass-border)",
                  fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)",
                }}>
                  +{a.xp} XP
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
