import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, Crown, Star, Zap, CreditCard, XCircle, Receipt, Tag, Loader } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import ErrorState from "../../components/shared/ErrorState";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard } from "../../components/shared/Skeleton";
import { apiGet, apiPost } from "../../services/api";
import { SUBSCRIPTIONS } from "../../services/endpoints";
import { openBrowser, isNative } from "../../services/native";

const PLAN_ACCENTS = {
  free: { color: "#9CA3AF", gradient: "linear-gradient(135deg, #6B7280, #4B5563)", glow: "none" },
  premium: { color: "#8B5CF6", gradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)", glow: "0 0 30px rgba(139,92,246,0.3)" },
  pro: { color: "#FCD34D", gradient: "linear-gradient(135deg, #FCD34D, #F59E0B)", glow: "0 0 30px rgba(252,211,77,0.3)" },
};

const glassStyle = {
  background: "var(--dp-glass-bg)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid var(--dp-input-border)",
  borderRadius: 20,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

const ALL_FEATURES = [
  "Active Dreams", "AI Coaching", "Daily Check-ins", "Community Access",
  "Stats & Analytics", "Unlimited Conversations", "Buddy Matching",
  "Store Access", "Custom Themes", "Priority Support", "Vision Board",
  "Dream Collaboration", "Advanced Analytics", "API Access",
];

const FEATURE_MATRIX = {
  free: [true, "Basic", true, true, "Basic", false, false, false, false, false, false, false, false, false],
  premium: [true, "Advanced", true, true, true, true, true, true, true, true, false, false, false, false],
  pro: [true, "Premium (GPT-4)", true, true, true, true, true, true, true, true, true, true, true, true],
};

export default function SubscriptionScreen() {
  const navigate = useNavigate();
  const { resolved } = useTheme(); const isLight = resolved === "light";
  const [mounted, setMounted] = useState(false);
  var { user } = useAuth();
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  var [couponCode, setCouponCode] = useState("");
  var [showInvoices, setShowInvoices] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────────
  var plansQuery = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: function () { return apiGet(SUBSCRIPTIONS.PLANS); },
  });

  var subQuery = useQuery({
    queryKey: ["subscription-current"],
    queryFn: function () { return apiGet(SUBSCRIPTIONS.CURRENT); },
  });

  var plans = plansQuery.data || [];
  var subscription = subQuery.data || null;
  var currentPlan = (subscription && subscription.plan ? subscription.plan : (user && user.subscription ? user.subscription : "free")).toLowerCase();
  var renewalDate = subscription && subscription.renewalDate ? subscription.renewalDate : null;

  // ─── Mutations ────────────────────────────────────────────────────
  var checkoutMut = useMutation({
    mutationFn: function (planSlug) {
      var payload = { planSlug: planSlug };
      if (isNative) {
        payload.successUrl = "com.dreamplanner.app://stripe/return";
        payload.cancelUrl = "com.dreamplanner.app://stripe/return?cancelled=true";
      }
      return apiPost(SUBSCRIPTIONS.CHECKOUT, payload);
    },
    onSuccess: function (data) {
      var url = data && (data.checkoutUrl || data.url);
      if (url && /^https:\/\/(checkout\.stripe\.com|billing\.stripe\.com)\b/.test(url)) {
        if (isNative) {
          openBrowser(url);
        } else {
          window.location.href = url;
        }
      } else {
        showToast("Checkout session created", "success");
      }
    },
    onError: function (err) { showToast(err.message || "Failed to start checkout", "error"); },
  });

  var portalMut = useMutation({
    mutationFn: function () { return apiPost(SUBSCRIPTIONS.PORTAL); },
    onSuccess: function (data) {
      if (data && data.url && /^https:\/\/(billing\.stripe\.com|checkout\.stripe\.com)\b/.test(data.url)) {
        if (isNative) {
          openBrowser(data.url);
        } else {
          window.location.href = data.url;
        }
      } else {
        showToast("Billing portal opened", "success");
      }
    },
    onError: function (err) { showToast(err.message || "Failed to open billing portal", "error"); },
  });

  var cancelMut = useMutation({
    mutationFn: function () { return apiPost(SUBSCRIPTIONS.CANCEL); },
    onSuccess: function () {
      showToast("Subscription cancelled", "success");
      subQuery.refetch();
    },
    onError: function (err) { showToast(err.message || "Failed to cancel subscription", "error"); },
  });

  var couponMut = useMutation({
    mutationFn: function (code) { return apiPost(SUBSCRIPTIONS.CURRENT + "apply-coupon/", { couponCode: code }); },
    onSuccess: function (data) {
      showToast(data.message || "Coupon applied!", "success");
      setCouponCode("");
      subQuery.refetch();
    },
    onError: function (err) { showToast(err.message || "Invalid coupon code", "error"); },
  });

  var invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: function () { return apiGet(SUBSCRIPTIONS.INVOICES); },
    enabled: showInvoices,
  });
  var invoices = (invoicesQuery.data && invoicesQuery.data.results) || invoicesQuery.data || [];

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // ─── Loading state ────────────────────────────────────────────────
  var isLoading = plansQuery.isLoading || subQuery.isLoading;

  if (plansQuery.isError || subQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          message={((plansQuery.error && plansQuery.error.message) || (subQuery.error && subQuery.error.message)) || "Failed to load subscription data"}
          onRetry={function () { plansQuery.refetch(); subQuery.refetch(); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <style>{`
        @keyframes shimmerBadge {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes planGlow {
          0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 20px rgba(252,211,77,0.15); }
          50% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 35px rgba(252,211,77,0.25); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        paddingTop: 16, paddingBottom: 20,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <button className="dp-ib" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: "var(--dp-text)",
          fontFamily: "Inter, sans-serif", margin: 0,
        }}>
          Subscription
        </h1>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <>
          <SkeletonCard height={80} style={{ marginBottom: 20, borderRadius: 20 }} />
          <SkeletonCard height={280} style={{ marginBottom: 16, borderRadius: 20 }} />
          <SkeletonCard height={280} style={{ marginBottom: 16, borderRadius: 20 }} />
          <SkeletonCard height={280} style={{ marginBottom: 16, borderRadius: 20 }} />
        </>
      )}

      {/* Current Plan Indicator */}
      {!isLoading && (
        <div style={{
          ...glassStyle, padding: "16px 20px",
          marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(252,211,77,0.06)",
          border: "1px solid rgba(252,211,77,0.15)",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg, #FCD34D, #F59E0B)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Crown size={20} color="#000" />
            </div>
            <div>
              <div style={{
                fontSize: 12, color: "var(--dp-text-tertiary)",
                fontFamily: "Inter, sans-serif", fontWeight: 500,
              }}>
                Current Plan
              </div>
              <div style={{
                fontSize: 18, fontWeight: 800, fontFamily: "Inter, sans-serif",
                background: "linear-gradient(90deg, #FCD34D, #F59E0B, #FCD34D, #F59E0B)",
                backgroundSize: "200% 100%",
                animation: "shimmerBadge 3s linear infinite",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                {currentPlan.toUpperCase()}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 12, color: "var(--dp-text-tertiary)",
            fontFamily: "Inter, sans-serif",
          }}>
            {renewalDate ? "Renews " + renewalDate : ""}
          </div>
        </div>
      )}

      {/* Coupon Code Input */}
      {!isLoading && currentPlan !== "free" && (
        <div style={{
          ...glassStyle, padding: "16px 20px", marginBottom: 16,
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.12s",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Tag size={16} color={isLight ? "#6D28D9" : "#C4B5FD"} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", fontFamily: "Inter, sans-serif" }}>Have a coupon?</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={couponCode} onChange={function (e) { setCouponCode(e.target.value); }} placeholder="Enter coupon code"
              style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: "var(--dp-input-bg)", border: "1px solid var(--dp-input-border)", color: "var(--dp-text)", fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none" }} />
            <button disabled={!couponCode.trim() || couponMut.isPending} onClick={function () { couponMut.mutate(couponCode.trim()); }}
              style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: couponCode.trim() ? "linear-gradient(135deg, #8B5CF6, #6D28D9)" : "var(--dp-surface-hover)", color: couponCode.trim() ? "#fff" : "var(--dp-text-muted)", fontSize: 14, fontWeight: 600, fontFamily: "Inter, sans-serif", cursor: couponCode.trim() ? "pointer" : "not-allowed" }}>
              {couponMut.isPending ? "..." : "Apply"}
            </button>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      {!isLoading && plans.map(function (plan, index) {
        var accent = PLAN_ACCENTS[plan.slug] || PLAN_ACCENTS.free;
        var isCurrent = plan.slug === currentPlan;
        var isPopular = plan.popular;

        return (
          <div
            key={plan.slug}
            style={{
              ...glassStyle,
              marginBottom: 16,
              padding: 0,
              overflow: "hidden",
              border: isCurrent
                ? `1px solid ${accent.color}40`
                : isPopular
                ? `1px solid ${accent.color}30`
                : "1px solid var(--dp-input-border)",
              boxShadow: isCurrent
                ? `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 25px ${accent.color}20`
                : glassStyle.boxShadow,
              ...(isCurrent && plan.slug === "pro" ? { animation: "planGlow 4s ease-in-out infinite" } : {}),
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${0.15 + index * 0.1}s`,
              position: "relative",
            }}
          >
            {/* Popular badge */}
            {isPopular && !isCurrent && (
              <div style={{
                position: "absolute", top: 14, right: 14,
                padding: "4px 10px", borderRadius: 8,
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                fontSize: 10, fontWeight: 700, color: "#fff",
                fontFamily: "Inter, sans-serif", letterSpacing: "0.3px",
              }}>
                Most Popular
              </div>
            )}

            {/* Current plan badge */}
            {isCurrent && (
              <div style={{
                position: "absolute", top: 14, right: 14,
                padding: "4px 10px", borderRadius: 8,
                background: accent.gradient,
                fontSize: 10, fontWeight: 700,
                color: plan.slug === "pro" ? "#000" : "#fff",
                fontFamily: "Inter, sans-serif", letterSpacing: "0.3px",
              }}>
                Current Plan
              </div>
            )}

            {/* Top colored accent line */}
            <div style={{
              height: 3, width: "100%",
              background: accent.gradient,
            }} />

            <div style={{ padding: "20px 20px 24px" }}>
              {/* Plan name and price */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
                }}>
                  {plan.slug === "pro" && <Crown size={18} color={isLight ? "#B45309" : "#FCD34D"} />}
                  {plan.slug === "premium" && <Star size={18} color="#8B5CF6" />}
                  {plan.slug === "free" && <Zap size={18} color={isLight ? "#4B5563" : "#9CA3AF"} />}
                  <span style={{
                    fontSize: 20, fontWeight: 700, color: "var(--dp-text)",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    {plan.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{
                    fontSize: 32, fontWeight: 800, color: isLight
                      ? (accent.color === "#9CA3AF" ? "#4B5563" : accent.color === "#FCD34D" ? "#B45309" : accent.color)
                      : accent.color,
                    fontFamily: "Inter, sans-serif",
                  }}>
                    ${plan.price === 0 ? "0" : plan.price.toFixed(2)}
                  </span>
                  <span style={{
                    fontSize: 14, color: "var(--dp-text-muted)",
                    fontFamily: "Inter, sans-serif",
                  }}>
                    /{plan.period === "forever" ? "forever" : "mo"}
                  </span>
                </div>
              </div>

              {/* Features list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {plan.features.map((feature, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6,
                      background: "rgba(16,185,129,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Check size={12} color="#10B981" strokeWidth={3} />
                    </div>
                    <span style={{
                      fontSize: 13, color: "var(--dp-text-primary)",
                      fontFamily: "Inter, sans-serif",
                    }}>
                      {feature}
                    </span>
                  </div>
                ))}
                {(plan.limitations || []).map((limitation, i) => (
                  <div key={`lim-${i}`} style={{
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6,
                      background: "rgba(239,68,68,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <X size={12} color="rgba(239,68,68,0.5)" strokeWidth={3} />
                    </div>
                    <span style={{
                      fontSize: 13, color: "var(--dp-text-muted)",
                      fontFamily: "Inter, sans-serif",
                      textDecoration: "line-through",
                      textDecorationColor: "rgba(255,255,255,0.15)",
                    }}>
                      {limitation}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              {isCurrent ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={function () { portalMut.mutate(); }}
                    disabled={portalMut.isPending}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "14px 0", width: "100%", borderRadius: 14,
                      background: "var(--dp-surface-hover)",
                      border: `1px solid ${accent.color}30`,
                      color: isLight
                        ? (accent.color === "#9CA3AF" ? "#4B5563" : accent.color === "#FCD34D" ? "#B45309" : accent.color)
                        : accent.color, fontSize: 14, fontWeight: 700,
                      fontFamily: "Inter, sans-serif", cursor: portalMut.isPending ? "wait" : "pointer",
                      transition: "all 0.25s ease",
                      opacity: portalMut.isPending ? 0.6 : 1,
                    }}>
                    <CreditCard size={16} />
                    {portalMut.isPending ? "Opening..." : "Manage Billing"}
                  </button>
                  {currentPlan !== "free" && (
                    <button
                      onClick={function () { cancelMut.mutate(); }}
                      disabled={cancelMut.isPending}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "12px 0", width: "100%", borderRadius: 14,
                        background: "transparent",
                        border: "1px solid rgba(239,68,68,0.25)",
                        color: "#EF4444", fontSize: 13, fontWeight: 600,
                        fontFamily: "Inter, sans-serif", cursor: cancelMut.isPending ? "wait" : "pointer",
                        transition: "all 0.25s ease",
                        opacity: cancelMut.isPending ? 0.6 : 1,
                      }}>
                      <XCircle size={15} />
                      {cancelMut.isPending ? "Cancelling..." : "Cancel Subscription"}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={function () {
                    if (plan.slug === "free") {
                      cancelMut.mutate();
                    } else {
                      checkoutMut.mutate(plan.slug);
                    }
                  }}
                  disabled={checkoutMut.isPending || cancelMut.isPending}
                  style={{
                    padding: "14px 0", width: "100%", borderRadius: 14,
                    background: plan.slug === "free"
                      ? "var(--dp-surface-hover)"
                      : accent.gradient,
                    border: plan.slug === "free"
                      ? "1px solid var(--dp-input-border)"
                      : "none",
                    color: plan.slug === "pro" ? "#000" : plan.slug === "free" ? (isLight ? "#1a1535" : "#fff") : "#fff",
                    fontSize: 14, fontWeight: 700, fontFamily: "Inter, sans-serif",
                    cursor: (checkoutMut.isPending || cancelMut.isPending) ? "wait" : "pointer",
                    transition: "all 0.25s ease",
                    opacity: (checkoutMut.isPending || cancelMut.isPending) ? 0.6 : 1,
                  }}>
                  {(checkoutMut.isPending || cancelMut.isPending)
                    ? "Processing..."
                    : plan.slug === "free" ? "Downgrade" : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Feature Comparison */}
      <div style={{
        marginTop: 8, marginBottom: 40,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.5s",
      }}>
        <h3 style={{
          fontSize: 18, fontWeight: 700, color: "var(--dp-text)",
          fontFamily: "Inter, sans-serif", marginBottom: 16,
        }}>
          Feature Comparison
        </h3>
        <div style={{ ...glassStyle, overflow: "hidden" }}>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 50px 50px 50px",
            padding: "14px 16px", gap: 8,
            borderBottom: "1px solid var(--dp-input-border)",
            background: "var(--dp-glass-bg)",
          }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: "var(--dp-text-tertiary)",
              fontFamily: "Inter, sans-serif",
            }}>
              Feature
            </div>
            {["Free", "Pro", "Pro+"].map((label, i) => (
              <div key={label} style={{
                fontSize: 10, fontWeight: 700, textAlign: "center",
                color: isLight
                  ? [("#4B5563"), PLAN_ACCENTS.premium.color, ("#B45309")][i]
                  : [PLAN_ACCENTS.free.color, PLAN_ACCENTS.premium.color, PLAN_ACCENTS.pro.color][i],
                fontFamily: "Inter, sans-serif",
              }}>
                {["Free", "Prem", "Pro"][i]}
              </div>
            ))}
          </div>

          {/* Feature rows */}
          {ALL_FEATURES.map((feature, i) => (
            <div
              key={feature}
              style={{
                display: "grid", gridTemplateColumns: "1fr 50px 50px 50px",
                padding: "10px 16px", gap: 8,
                borderBottom: i < ALL_FEATURES.length - 1 ? "1px solid var(--dp-glass-bg)" : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
              }}
            >
              <div style={{
                fontSize: 12, color: "var(--dp-text-secondary)",
                fontFamily: "Inter, sans-serif",
              }}>
                {feature}
              </div>
              {["free", "premium", "pro"].map((planId) => {
                const val = FEATURE_MATRIX[planId][i];
                return (
                  <div key={planId} style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {val === true ? (
                      <Check size={14} color="#10B981" />
                    ) : val === false ? (
                      <X size={14} color="rgba(239,68,68,0.35)" />
                    ) : (
                      <span style={{
                        fontSize: 9, color: "var(--dp-text-tertiary)",
                        fontFamily: "Inter, sans-serif", fontWeight: 500,
                      }}>
                        {val}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Invoice History */}
      {!isLoading && currentPlan !== "free" && (
        <div style={{
          marginBottom: 40,
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.55s",
        }}>
          <button onClick={function () { setShowInvoices(!showInvoices); }} style={{
            display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: showInvoices ? 16 : 0,
          }}>
            <Receipt size={16} color={isLight ? "#6D28D9" : "#C4B5FD"} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", fontFamily: "Inter, sans-serif" }}>Invoice History</span>
          </button>
          {showInvoices && (
            <div style={{ ...glassStyle, overflow: "hidden" }}>
              {invoicesQuery.isLoading && (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <Loader size={20} color="var(--dp-accent)" style={{ animation: "shimmerBadge 1s linear infinite" }} />
                </div>
              )}
              {!invoicesQuery.isLoading && invoices.length === 0 && (
                <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--dp-text-muted)", fontFamily: "Inter, sans-serif" }}>No invoices yet</div>
              )}
              {!invoicesQuery.isLoading && invoices.map(function (inv, i) {
                return (
                  <div key={inv.id || i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px",
                    borderBottom: i < invoices.length - 1 ? "1px solid var(--dp-glass-border)" : "none",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", fontFamily: "Inter, sans-serif" }}>
                        {inv.description || inv.planName || "Subscription"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--dp-text-muted)", fontFamily: "Inter, sans-serif", marginTop: 2 }}>
                        {inv.date || inv.createdAt || ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)", fontFamily: "Inter, sans-serif" }}>
                        ${inv.amount || inv.total || "0.00"}
                      </span>
                      <span style={{
                        padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: inv.status === "paid" ? "rgba(16,185,129,0.1)" : "rgba(252,211,77,0.1)",
                        color: inv.status === "paid" ? "#10B981" : (isLight ? "#B45309" : "#FCD34D"),
                        fontFamily: "Inter, sans-serif",
                      }}>
                        {inv.status || "paid"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
