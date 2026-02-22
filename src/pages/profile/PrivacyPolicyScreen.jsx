import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    text: "We collect information you provide directly: your name, email address, profile information, dreams, goals, and task data. We also automatically collect usage data including app interactions, device information, and performance metrics to improve our services.",
  },
  {
    title: "2. How We Use Your Information",
    text: "Your information is used to: provide and personalize the DreamPlanner experience; power the AI Coach with context about your goals; track your progress and generate insights; send notifications and reminders you've opted into; improve our services through aggregated, anonymized analytics.",
  },
  {
    title: "3. AI Data Processing",
    text: "Your dreams, goals, and conversations with the AI Coach are processed to provide personalized guidance. This data is encrypted in transit and at rest. AI interactions are not used to train models shared with other users. You can delete your AI conversation history at any time.",
  },
  {
    title: "4. Data Sharing",
    text: "We do not sell your personal data. We may share information with: service providers who help operate our platform (hosting, analytics); other users only when you explicitly choose to share (social features, circles, buddy system); law enforcement when required by valid legal process.",
  },
  {
    title: "5. Social Features",
    text: "When you use social features like circles, buddy matching, or the leaderboard, certain profile information becomes visible to other users. You can control your visibility in the privacy settings. Shared dreams and progress are only visible to connections you approve.",
  },
  {
    title: "6. Data Security",
    text: "We implement industry-standard security measures including AES-256 encryption at rest, TLS 1.3 for data in transit, and regular security audits. Access to user data is restricted to authorized personnel on a need-to-know basis. We maintain SOC 2 Type II compliance.",
  },
  {
    title: "7. Data Retention",
    text: "We retain your account data as long as your account is active. After account deletion, personal data is purged within 30 days, except where retention is required by law. Anonymized, aggregated data may be retained indefinitely for analytics purposes.",
  },
  {
    title: "8. Your Rights",
    text: "You have the right to: access and download your personal data; correct inaccurate information; delete your account and associated data; opt out of non-essential communications; restrict processing of your data; port your data to another service. Exercise these rights through Settings or by contacting privacy@dreamplanner.app.",
  },
  {
    title: "9. Children's Privacy",
    text: "DreamPlanner is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover such data has been collected, we will delete it promptly.",
  },
  {
    title: "10. Contact Us",
    text: "For privacy-related questions or concerns, contact our Data Protection Officer at privacy@dreamplanner.app. We will respond to all privacy inquiries within 30 days.",
  },
];

export default function PrivacyPolicyScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme();
  const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const stagger = (i) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `all 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 60}ms`,
  });

  return (
    <PageLayout showNav={false}>
      <div style={{ paddingTop: 20, paddingBottom: 40, fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, ...stagger(0) }}>
          <button className="dp-ib" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>Privacy Policy</span>
        </div>

        {/* Last Updated */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
          padding: "10px 14px", borderRadius: 12,
          background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.15)",
          ...stagger(1),
        }}>
          <Shield size={15} color={isLight ? "#0D9488" : "#5EEAD4"} />
          <span style={{ fontSize: 12, color: "var(--dp-text-secondary)" }}>Last updated: January 15, 2026</span>
        </div>

        {/* Sections */}
        {SECTIONS.map((s, i) => (
          <div key={i} style={{
            ...stagger(2 + i),
            marginBottom: 12, padding: 16, borderRadius: 16,
            background: "var(--dp-glass-bg)",
            border: "1px solid var(--dp-glass-border)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", marginBottom: 8 }}>{s.title}</div>
            <div style={{ fontSize: 13, color: "var(--dp-text-tertiary)", lineHeight: 1.7 }}>{s.text}</div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
