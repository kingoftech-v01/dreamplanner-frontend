import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    text: "By accessing or using DreamPlanner, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. We reserve the right to update these terms at any time, and your continued use constitutes acceptance of any changes.",
  },
  {
    title: "2. User Accounts",
    text: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate, current, and complete information during registration. You may not share your account with others or create multiple accounts.",
  },
  {
    title: "3. Dream Content & Data",
    text: "You retain ownership of all dreams, goals, and personal content you create within DreamPlanner. By using our services, you grant us a limited license to process and store your content for the purpose of providing our services. We will not sell or share your personal dream data with third parties for advertising purposes.",
  },
  {
    title: "4. AI Coach Disclaimer",
    text: "The AI Coach feature provides motivational guidance and goal-tracking assistance only. It is not a substitute for professional advice including but not limited to medical, financial, legal, or psychological counseling. DreamPlanner and its AI features are tools to help you organize and pursue your personal goals.",
  },
  {
    title: "5. Acceptable Use",
    text: "You agree not to use DreamPlanner to: (a) violate any applicable laws or regulations; (b) harass, abuse, or harm other users; (c) upload malicious content or attempt to compromise system security; (d) create fake accounts or misrepresent your identity; (e) use automated systems to access the service without permission.",
  },
  {
    title: "6. Virtual Currency & Store",
    text: "XP points and virtual items earned or purchased within DreamPlanner have no real-world monetary value and cannot be exchanged for cash. We reserve the right to modify, limit, or discontinue virtual items and currencies at any time. Purchases of premium features are non-refundable except where required by law.",
  },
  {
    title: "7. Community Guidelines",
    text: "When interacting with other users through circles, buddy features, or social functions, you must treat others with respect. Content that is hateful, discriminatory, sexually explicit, or promotes violence is strictly prohibited and may result in immediate account termination.",
  },
  {
    title: "8. Termination",
    text: "We may suspend or terminate your account at any time for violations of these terms. You may delete your account at any time through the app settings. Upon termination, your right to use the service ceases immediately, though we may retain certain data as required by law.",
  },
  {
    title: "9. Limitation of Liability",
    text: "DreamPlanner is provided \"as is\" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount you paid for premium services in the 12 months preceding the claim.",
  },
  {
    title: "10. Contact",
    text: "If you have questions about these Terms of Service, please contact us at legal@dreamplanner.app or through the in-app support feature.",
  },
];

export default function TermsOfServiceScreen() {
  const navigate = useNavigate();
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
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>Terms of Service</span>
        </div>

        {/* Last Updated */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
          padding: "10px 14px", borderRadius: 12,
          background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)",
          ...stagger(1),
        }}>
          <FileText size={15} color="#C4B5FD" />
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
