import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { BUDDIES } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { adaptColor } from "../../styles/colors";
import BottomNav from "../../components/shared/BottomNav";
import ErrorState from "../../components/shared/ErrorState";
import SubscriptionGate from "../../components/shared/SubscriptionGate";
import GlassAppBar from "../../components/shared/GlassAppBar";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";
import GradientButton from "../../components/shared/GradientButton";
import {
  ArrowLeft, FileText, Plus, Check, ChevronRight, ChevronLeft,
  Target, Calendar, Clock, Send, Smile, Meh, Frown, Zap,
  CheckCircle, XCircle, Trash2, Award, BarChart3, AlertCircle,
} from "lucide-react";

/* =======================================================================
 * DreamPlanner -- Buddy Accountability Contracts Screen
 *
 * Features:
 * - Contract creation wizard (4 steps)
 * - Active contract list & detail view
 * - Check-in modal with progress & mood
 * - Progress bars (both partners side-by-side)
 * - Check-in history with mood display
 * - Next check-in countdown
 * ======================================================================= */

var MOOD_OPTIONS = [
  { key: "great",   label: "Great",      emoji: "star-struck",  Icon: Zap,   color: "#FCD34D" },
  { key: "good",    label: "Good",       emoji: "smile",        Icon: Smile, color: "#5DE5A8" },
  { key: "okay",    label: "Okay",       emoji: "neutral",      Icon: Meh,   color: "#93C5FD" },
  { key: "tough",   label: "Tough",      emoji: "disappointed", Icon: Frown,  color: "#F69A9A" },
];

var FREQUENCY_OPTIONS = [
  { value: "daily",    label: "Daily" },
  { value: "weekly",   label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
];

function daysBetween(a, b) {
  var msDay = 86400000;
  return Math.ceil((new Date(b) - new Date(a)) / msDay);
}

function nextCheckInDate(lastCheckIn, frequency) {
  if (!lastCheckIn) return null;
  var d = new Date(lastCheckIn);
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "biweekly") d.setDate(d.getDate() + 14);
  else d.setDate(d.getDate() + 7);
  return d;
}

function formatCountdown(targetDate) {
  if (!targetDate) return "Now";
  var now = new Date();
  var diff = targetDate - now;
  if (diff <= 0) return "Now";
  var days = Math.floor(diff / 86400000);
  var hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return days + "d " + hours + "h";
  var mins = Math.floor((diff % 3600000) / 60000);
  return hours + "h " + mins + "m";
}

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// =======================================================================
export default function AccountabilityContractScreen() {
  var navigate = useNavigate();
  var [searchParams] = useSearchParams();
  var { resolved, uiOpacity } = useTheme();
  var isLight = resolved === "light";
  var { user } = useAuth();
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  var [mounted, setMounted] = useState(false);

  // Wizard state
  var [showWizard, setShowWizard] = useState(false);
  var [wizardStep, setWizardStep] = useState(0);
  var [wizTitle, setWizTitle] = useState("");
  var [wizDesc, setWizDesc] = useState("");
  var [wizGoals, setWizGoals] = useState([{ title: "", target: "", unit: "tasks" }]);
  var [wizFreq, setWizFreq] = useState("weekly");
  var [wizStart, setWizStart] = useState(new Date().toISOString().slice(0, 10));
  var [wizEnd, setWizEnd] = useState("");
  var [wizSubmitting, setWizSubmitting] = useState(false);

  // Contract detail state
  var [selectedId, setSelectedId] = useState(searchParams.get("id") || null);

  // Check-in modal state
  var [showCheckIn, setShowCheckIn] = useState(false);
  var [ciProgress, setCiProgress] = useState({});
  var [ciNote, setCiNote] = useState("");
  var [ciMood, setCiMood] = useState("");
  var [ciSubmitting, setCiSubmitting] = useState(false);

  useEffect(function () { setTimeout(function () { setMounted(true); }, 100); }, []);

  // Fetch buddy pairing
  var buddyQuery = useQuery({
    queryKey: ["buddy-current"],
    queryFn: function () { return apiGet(BUDDIES.CURRENT); },
  });
  var pairing = buddyQuery.data && buddyQuery.data.buddy;
  var pairingId = pairing && pairing.id;

  // Fetch contracts list
  var contractsQuery = useQuery({
    queryKey: ["buddy-contracts"],
    queryFn: function () { return apiGet(BUDDIES.CONTRACTS.LIST + "?status=all"); },
    enabled: !!pairingId,
  });
  var contracts = (contractsQuery.data && contractsQuery.data.contracts) || [];

  // Fetch progress for selected contract
  var progressQuery = useQuery({
    queryKey: ["buddy-contract-progress", selectedId],
    queryFn: function () { return apiGet(BUDDIES.CONTRACTS.PROGRESS(selectedId)); },
    enabled: !!selectedId,
  });
  var progressData = progressQuery.data || null;

  var selectedContract = useMemo(function () {
    if (!progressData) return contracts.find(function (c) { return c.id === selectedId; }) || null;
    return progressData.contract || null;
  }, [progressData, contracts, selectedId]);

  // ── Wizard handlers ──
  function addGoal() {
    if (wizGoals.length >= 10) return;
    setWizGoals(wizGoals.concat([{ title: "", target: "", unit: "tasks" }]));
  }
  function removeGoal(idx) {
    if (wizGoals.length <= 1) return;
    setWizGoals(wizGoals.filter(function (_, i) { return i !== idx; }));
  }
  function updateGoal(idx, field, value) {
    setWizGoals(wizGoals.map(function (g, i) {
      if (i !== idx) return g;
      var updated = Object.assign({}, g);
      updated[field] = value;
      return updated;
    }));
  }

  function resetWizard() {
    setWizardStep(0);
    setWizTitle("");
    setWizDesc("");
    setWizGoals([{ title: "", target: "", unit: "tasks" }]);
    setWizFreq("weekly");
    setWizStart(new Date().toISOString().slice(0, 10));
    setWizEnd("");
    setWizSubmitting(false);
    setShowWizard(false);
  }

  function submitContract() {
    if (!pairingId) return;
    setWizSubmitting(true);
    var payload = {
      pairingId: pairingId,
      title: wizTitle,
      description: wizDesc,
      goals: wizGoals.map(function (g) { return { title: g.title, target: parseFloat(g.target) || 0, unit: g.unit }; }),
      checkInFrequency: wizFreq,
      startDate: wizStart,
      endDate: wizEnd,
    };
    apiPost(BUDDIES.CONTRACTS.CREATE, payload).then(function () {
      showToast("Contract created and sent to your buddy!", "success");
      queryClient.invalidateQueries({ queryKey: ["buddy-contracts"] });
      resetWizard();
    }).catch(function (err) {
      showToast(err.userMessage || err.message || "Failed to create contract", "error");
      setWizSubmitting(false);
    });
  }

  // ── Accept handler ──
  function acceptContract(id) {
    apiPost(BUDDIES.CONTRACTS.ACCEPT(id), {}).then(function () {
      showToast("Contract accepted!", "success");
      queryClient.invalidateQueries({ queryKey: ["buddy-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["buddy-contract-progress", id] });
    }).catch(function (err) {
      showToast(err.userMessage || err.message || "Failed to accept contract", "error");
    });
  }

  // ── Check-in handler ──
  function submitCheckIn() {
    if (!selectedId) return;
    setCiSubmitting(true);
    apiPost(BUDDIES.CONTRACTS.CHECK_IN(selectedId), {
      progress: ciProgress,
      note: ciNote,
      mood: ciMood,
    }).then(function () {
      showToast("Check-in submitted!", "success");
      queryClient.invalidateQueries({ queryKey: ["buddy-contract-progress", selectedId] });
      setShowCheckIn(false);
      setCiProgress({});
      setCiNote("");
      setCiMood("");
      setCiSubmitting(false);
    }).catch(function (err) {
      showToast(err.userMessage || err.message || "Failed to check in", "error");
      setCiSubmitting(false);
    });
  }

  // ── Partner info ──
  var partner = pairing && pairing.partner;
  var partnerName = (partner && (partner.username || partner.displayName)) || "Buddy";

  // ── Error state ──
  if (buddyQuery.isError || contractsQuery.isError) {
    return (
      <div className="dp-desktop-main" style={{ position: "absolute", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ErrorState
            message={(buddyQuery.error && (buddyQuery.error.userMessage || buddyQuery.error.message)) || (contractsQuery.error && (contractsQuery.error.userMessage || contractsQuery.error.message)) || "Failed to load contracts"}
            onRetry={function () { buddyQuery.refetch(); contractsQuery.refetch(); }}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Wizard step validation ──
  var wizardValid = [
    wizTitle.trim().length >= 3,
    wizGoals.every(function (g) { return g.title.trim() && parseFloat(g.target) > 0 && g.unit.trim(); }),
    wizFreq && wizStart && wizEnd && new Date(wizEnd) > new Date(wizStart),
    true, // Review step — always valid
  ];

  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="dp-desktop-main" style={{ position: "absolute", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* APPBAR */}
      <GlassAppBar
        className="dp-desktop-header"
        left={
          <>
            <IconButton icon={ArrowLeft} onClick={function () { if (selectedId) { setSelectedId(null); } else { navigate(-1); } }} label="Go back" />
            <FileText size={20} color={"var(--dp-accent)"} strokeWidth={2} />
          </>
        }
        title={selectedId ? "Contract Progress" : "Accountability Contracts"}
        right={!selectedId && pairing ? <IconButton icon={Plus} onClick={function () { setShowWizard(true); }} label="New contract" /> : null}
      />

      {/* CONTENT */}
      <main id="main-content" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", zIndex: 10, padding: "16px 0 100px", opacity: uiOpacity, transition: "opacity 0.3s ease" }}>
        <SubscriptionGate required="pro" feature="Accountability Contracts">
          <div className="dp-content-area" style={{ padding: "0 16px" }}>

            {/* ── No buddy state ── */}
            {!pairing && buddyQuery.isSuccess && (
              <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "0ms" }}>
                <GlassCard padding={24} style={{ textAlign: "center" }}>
                  <AlertCircle size={40} color={"var(--dp-text-tertiary)"} strokeWidth={1.5} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6 }}>No Buddy Paired</div>
                  <div style={{ fontSize: 13, color: "var(--dp-text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
                    You need an active buddy pairing to create accountability contracts.
                  </div>
                  <GradientButton gradient="primary" onClick={function () { navigate("/find-buddy"); }} icon={Target}>Find a Buddy</GradientButton>
                </GlassCard>
              </div>
            )}

            {/* ══════════════ CONTRACT LIST VIEW ══════════════ */}
            {pairing && !selectedId && (
              <>
                {/* Info card */}
                <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "0ms" }}>
                  <GlassCard padding={16} mb={14} style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.06),rgba(20,184,166,0.06))", border: "1px solid rgba(139,92,246,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: "rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FileText size={18} color="#A78BFA" strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)", marginBottom: 4 }}>Accountability Contracts</div>
                        <div style={{ fontSize: 12, color: "var(--dp-text-secondary)", lineHeight: 1.5 }}>
                          Set shared goals with <strong style={{ color: "var(--dp-teal)" }}>{partnerName}</strong>, track progress together, and hold each other accountable with regular check-ins.
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Contracts list */}
                {contracts.length === 0 && contractsQuery.isSuccess && (
                  <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "100ms" }}>
                    <GlassCard padding={32} style={{ textAlign: "center" }}>
                      <FileText size={40} color={"var(--dp-text-tertiary)"} strokeWidth={1.5} style={{ marginBottom: 12 }} />
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6 }}>No Contracts Yet</div>
                      <div style={{ fontSize: 13, color: "var(--dp-text-secondary)", marginBottom: 16 }}>
                        Create your first accountability contract with {partnerName}.
                      </div>
                      <GradientButton gradient="primary" onClick={function () { setShowWizard(true); }} icon={Plus}>Create Contract</GradientButton>
                    </GlassCard>
                  </div>
                )}

                {contracts.map(function (c, i) {
                  var isActive = c.status === "active";
                  var isPending = isActive && !c.acceptedByPartner;
                  var needsAccept = isPending && c.createdById !== (user && user.id);
                  var totalDays = daysBetween(c.startDate, c.endDate);
                  var elapsed = daysBetween(c.startDate, new Date());
                  var pct = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100))) : 0;
                  var statusColor = c.status === "active" ? "#5DE5A8" : c.status === "completed" ? "#93C5FD" : "var(--dp-text-tertiary)";

                  return (
                    <div key={c.id} className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: (100 + i * 80) + "ms" }}>
                      <GlassCard hover padding={16} mb={10} onClick={function () { setSelectedId(c.id); }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: isActive ? "rgba(93,229,168,0.1)" : "var(--dp-surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {c.status === "completed" ? <CheckCircle size={20} color="#93C5FD" strokeWidth={2} /> : c.status === "cancelled" ? <XCircle size={20} color="var(--dp-text-tertiary)" strokeWidth={2} /> : <FileText size={20} color="#5DE5A8" strokeWidth={2} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{c.title}</span>
                              <span style={{ padding: "2px 8px", borderRadius: 6, background: statusColor + "15", fontSize: 11, fontWeight: 600, color: statusColor, flexShrink: 0 }}>
                                {isPending ? "Pending" : c.status[0].toUpperCase() + c.status.slice(1)}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--dp-text-secondary)", marginBottom: 8 }}>
                              {(c.goals && c.goals.length) || 0} goal{(c.goals && c.goals.length) !== 1 ? "s" : ""} &middot; {c.checkInFrequency} check-ins &middot; {formatDate(c.startDate)} - {formatDate(c.endDate)}
                            </div>
                            {/* Time progress bar */}
                            {isActive && (
                              <div style={{ height: 4, borderRadius: 2, background: "var(--dp-divider)", overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #8B5CF6, #5EEAD4)", width: pct + "%", transition: "width 0.5s ease" }} />
                              </div>
                            )}
                            {/* Accept button for partner */}
                            {needsAccept && (
                              <div style={{ marginTop: 8 }}>
                                <GradientButton gradient="teal" onClick={function (e) { e.stopPropagation(); acceptContract(c.id); }} icon={Check} style={{ width: "100%" }}>Accept Contract</GradientButton>
                              </div>
                            )}
                          </div>
                          <ChevronRight size={18} color={"var(--dp-text-tertiary)"} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                        </div>
                      </GlassCard>
                    </div>
                  );
                })}
              </>
            )}

            {/* ══════════════ CONTRACT DETAIL VIEW ══════════════ */}
            {selectedId && selectedContract && (
              <>
                {/* Header card */}
                <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "0ms" }}>
                  <GlassCard padding={20} mb={14} style={{ border: "1px solid rgba(139,92,246,0.15)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <FileText size={22} color={adaptColor("#A78BFA", isLight)} strokeWidth={2} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dp-text)" }}>{selectedContract.title}</div>
                        {selectedContract.description && <div style={{ fontSize: 13, color: "var(--dp-text-secondary)", marginTop: 2 }}>{selectedContract.description}</div>}
                      </div>
                      <span style={{
                        padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: selectedContract.status === "active" ? "rgba(93,229,168,0.1)" : "var(--dp-surface)",
                        color: selectedContract.status === "active" ? "#5DE5A8" : "var(--dp-text-tertiary)",
                      }}>
                        {selectedContract.acceptedByPartner === false && selectedContract.status === "active" ? "Pending" : selectedContract.status[0].toUpperCase() + selectedContract.status.slice(1)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--dp-text-secondary)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={13} strokeWidth={2} />{formatDate(selectedContract.startDate)} - {formatDate(selectedContract.endDate)}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} strokeWidth={2} />{selectedContract.checkInFrequency} check-ins</span>
                    </div>

                    {/* Next check-in countdown */}
                    {selectedContract.status === "active" && selectedContract.acceptedByPartner && (function () {
                      var userCIs = (progressData && progressData.userCheckIns) || [];
                      var lastCI = userCIs.length > 0 ? userCIs[0].createdAt : selectedContract.startDate;
                      var nextDate = nextCheckInDate(lastCI, selectedContract.checkInFrequency);
                      var countdown = formatCountdown(nextDate);
                      return (
                        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, color: "var(--dp-text-secondary)" }}>Next check-in due:</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: countdown === "Now" ? "var(--dp-danger)" : "var(--dp-accent)" }}>{countdown}</span>
                        </div>
                      );
                    })()}
                  </GlassCard>
                </div>

                {/* Check-in button */}
                {selectedContract.status === "active" && selectedContract.acceptedByPartner && (
                  <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "80ms", marginBottom: 14 }}>
                    <GradientButton gradient="primary" onClick={function () { setShowCheckIn(true); }} icon={CheckCircle} style={{ width: "100%" }}>Check In</GradientButton>
                  </div>
                )}

                {/* Accept button if needed */}
                {selectedContract.status === "active" && !selectedContract.acceptedByPartner && selectedContract.createdById !== (user && user.id) && (
                  <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "80ms", marginBottom: 14 }}>
                    <GradientButton gradient="teal" onClick={function () { acceptContract(selectedId); }} icon={Check} style={{ width: "100%" }}>Accept Contract</GradientButton>
                  </div>
                )}

                {/* Goals progress */}
                <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "120ms" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <BarChart3 size={16} color={adaptColor("#5EEAD4", isLight)} strokeWidth={2} />
                    Goals Progress
                  </div>
                  {(selectedContract.goals || []).map(function (goal, gi) {
                    var idx = String(gi);
                    var userTotal = (progressData && progressData.userTotals && progressData.userTotals[idx]) || 0;
                    var partnerTotal = (progressData && progressData.partnerTotals && progressData.partnerTotals[idx]) || 0;
                    var target = goal.target || 1;
                    var userPct = Math.min(100, Math.round((userTotal / target) * 100));
                    var partnerPct = Math.min(100, Math.round((partnerTotal / target) * 100));

                    return (
                      <GlassCard key={gi} padding={16} mb={10}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)", marginBottom: 4 }}>{goal.title}</div>
                        <div style={{ fontSize: 12, color: "var(--dp-text-tertiary)", marginBottom: 12 }}>Target: {target} {goal.unit}</div>

                        {/* User progress */}
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: "var(--dp-accent)" }}>You</span>
                            <span style={{ color: "var(--dp-text-secondary)" }}>{userTotal}/{target} {goal.unit} ({userPct}%)</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "var(--dp-divider)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #8B5CF6, #A78BFA)", width: userPct + "%", transition: "width 0.5s ease" }} />
                          </div>
                        </div>

                        {/* Partner progress */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: "var(--dp-teal)" }}>{partnerName}</span>
                            <span style={{ color: "var(--dp-text-secondary)" }}>{partnerTotal}/{target} {goal.unit} ({partnerPct}%)</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "var(--dp-divider)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #14B8A6, #5EEAD4)", width: partnerPct + "%", transition: "width 0.5s ease" }} />
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>

                {/* Check-in history */}
                <div className={"dp-a " + (mounted ? "dp-s" : "")} style={{ animationDelay: "200ms", marginTop: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={16} color={adaptColor("#FCD34D", isLight)} strokeWidth={2} />
                    Check-In History
                  </div>

                  {(function () {
                    var allCIs = [];
                    var uCIs = (progressData && progressData.userCheckIns) || [];
                    var pCIs = (progressData && progressData.partnerCheckIns) || [];
                    for (var x = 0; x < uCIs.length; x++) allCIs.push(Object.assign({}, uCIs[x], { _isUser: true }));
                    for (var y = 0; y < pCIs.length; y++) allCIs.push(Object.assign({}, pCIs[y], { _isUser: false }));
                    allCIs.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

                    if (allCIs.length === 0) {
                      return (
                        <GlassCard padding={20} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 13, color: "var(--dp-text-secondary)" }}>No check-ins yet. Be the first to check in!</div>
                        </GlassCard>
                      );
                    }

                    return allCIs.map(function (ci, idx) {
                      var moodOpt = MOOD_OPTIONS.find(function (m) { return m.key === ci.mood; });
                      var MoodIcon = moodOpt ? moodOpt.Icon : null;
                      var moodColor = moodOpt ? moodOpt.color : "var(--dp-text-tertiary)";
                      var nameColor = ci._isUser ? "var(--dp-accent)" : "var(--dp-teal)";
                      var who = ci._isUser ? "You" : partnerName;

                      return (
                        <GlassCard key={ci.id || idx} padding={14} mb={8}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: nameColor }}>{who}</span>
                            {MoodIcon && <MoodIcon size={14} color={adaptColor(moodColor, isLight)} strokeWidth={2} />}
                            {moodOpt && <span style={{ fontSize: 12, color: adaptColor(moodColor, isLight) }}>{moodOpt.label}</span>}
                            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dp-text-tertiary)" }}>
                              {ci.createdAt ? new Date(ci.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + new Date(ci.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          {/* Progress values */}
                          {ci.progress && Object.keys(ci.progress).length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: ci.note ? 6 : 0 }}>
                              {Object.keys(ci.progress).map(function (k) {
                                var goal = selectedContract && selectedContract.goals && selectedContract.goals[parseInt(k)];
                                var goalTitle = goal ? goal.title : "Goal " + (parseInt(k) + 1);
                                return (
                                  <span key={k} style={{ padding: "3px 8px", borderRadius: 8, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.1)", fontSize: 12, fontWeight: 500, color: "var(--dp-accent)" }}>
                                    {goalTitle}: +{ci.progress[k]}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {ci.note && <div style={{ fontSize: 12, color: "var(--dp-text-secondary)", lineHeight: 1.4, marginTop: 4 }}>{ci.note}</div>}
                        </GlassCard>
                      );
                    });
                  })()}
                </div>
              </>
            )}

          </div>
        </SubscriptionGate>
      </main>

      {/* ═══ BOTTOM NAV ═══ */}
      <BottomNav />

      {/* ══════════════ CREATION WIZARD MODAL ══════════════ */}
      <GlassModal open={showWizard} onClose={resetWizard} variant="center" title="New Contract" maxWidth={440}>
        <div style={{ padding: 24 }}>
          {/* Step indicators */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {["Details", "Goals", "Schedule", "Review"].map(function (label, si) {
              var isActive = si === wizardStep;
              var isDone = si < wizardStep;
              return (
                <div key={si} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    height: 4, borderRadius: 2, marginBottom: 4,
                    background: isDone ? "#5DE5A8" : isActive ? "var(--dp-accent)" : "var(--dp-divider)",
                    transition: "background 0.3s ease",
                  }} />
                  <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? "var(--dp-text)" : "var(--dp-text-tertiary)" }}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Step 0: Title & Description */}
          {wizardStep === 0 && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6, display: "block" }}>Contract Title</label>
                <GlassInput value={wizTitle} onChange={function (e) { setWizTitle(e.target.value); }} placeholder="e.g. 30-Day Fitness Challenge" maxLength={200} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6, display: "block" }}>Description (optional)</label>
                <textarea
                  value={wizDesc}
                  onChange={function (e) { setWizDesc(e.target.value); }}
                  placeholder="Describe what you want to accomplish together..."
                  maxLength={1000}
                  rows={3}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--dp-input-border)",
                    background: "var(--dp-glass-bg)", color: "var(--dp-text)", fontSize: 14, fontFamily: "inherit",
                    resize: "vertical", outline: "none",
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 1: Goals */}
          {wizardStep === 1 && (
            <div>
              <div style={{ fontSize: 13, color: "var(--dp-text-secondary)", marginBottom: 12, lineHeight: 1.4 }}>
                Add measurable goals you both want to track. Each goal has a target number and a unit.
              </div>
              {wizGoals.map(function (g, gi) {
                return (
                  <div key={gi} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--dp-glass-border)", background: "var(--dp-header-bg)", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-tertiary)" }}>Goal {gi + 1}</span>
                      {wizGoals.length > 1 && (
                        <button onClick={function () { removeGoal(gi); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                          <Trash2 size={14} color={"var(--dp-danger)"} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                    <GlassInput value={g.title} onChange={function (e) { updateGoal(gi, "title", e.target.value); }} placeholder="Goal title" style={{ marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <GlassInput value={g.target} onChange={function (e) { updateGoal(gi, "target", e.target.value); }} placeholder="Target" type="number" style={{ flex: 1 }} />
                      <GlassInput value={g.unit} onChange={function (e) { updateGoal(gi, "unit", e.target.value); }} placeholder="Unit" style={{ flex: 1 }} />
                    </div>
                  </div>
                );
              })}
              {wizGoals.length < 10 && (
                <button onClick={addGoal} style={{
                  width: "100%", padding: "10px 0", borderRadius: 12, border: "1px dashed var(--dp-input-border)",
                  background: "transparent", color: "var(--dp-accent)", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <Plus size={14} strokeWidth={2.5} />Add Goal
                </button>
              )}
            </div>
          )}

          {/* Step 2: Frequency & Dates */}
          {wizardStep === 2 && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", marginBottom: 8, display: "block" }}>Check-In Frequency</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {FREQUENCY_OPTIONS.map(function (f) {
                    var active = wizFreq === f.value;
                    return (
                      <button key={f.value} onClick={function () { setWizFreq(f.value); }} style={{
                        flex: 1, padding: "10px 0", borderRadius: 12, border: active ? "1px solid rgba(139,92,246,0.3)" : "1px solid var(--dp-input-border)",
                        background: active ? "rgba(139,92,246,0.08)" : "var(--dp-glass-bg)", color: active ? "var(--dp-accent)" : "var(--dp-text-secondary)",
                        fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                      }}>
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6, display: "block" }}>Start Date</label>
                  <input
                    type="date"
                    value={wizStart}
                    onChange={function (e) { setWizStart(e.target.value); }}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--dp-input-border)",
                      background: "var(--dp-glass-bg)", color: "var(--dp-text)", fontSize: 14, fontFamily: "inherit", outline: "none",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6, display: "block" }}>End Date</label>
                  <input
                    type="date"
                    value={wizEnd}
                    onChange={function (e) { setWizEnd(e.target.value); }}
                    min={wizStart}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--dp-input-border)",
                      background: "var(--dp-glass-bg)", color: "var(--dp-text)", fontSize: 14, fontFamily: "inherit", outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {wizardStep === 3 && (
            <div>
              <GlassCard padding={16} mb={12} style={{ border: "1px solid rgba(139,92,246,0.1)" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", marginBottom: 4 }}>{wizTitle}</div>
                {wizDesc && <div style={{ fontSize: 12, color: "var(--dp-text-secondary)", marginBottom: 8 }}>{wizDesc}</div>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--dp-text-secondary)", marginBottom: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} strokeWidth={2} />{formatDate(wizStart)} - {formatDate(wizEnd)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} strokeWidth={2} />{wizFreq}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Goals</div>
                {wizGoals.map(function (g, gi) {
                  return (
                    <div key={gi} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 4, borderRadius: 10, background: "var(--dp-surface)", border: "1px solid var(--dp-glass-border)" }}>
                      <Target size={13} color={"var(--dp-accent)"} strokeWidth={2} />
                      <span style={{ fontSize: 13, color: "var(--dp-text)", flex: 1 }}>{g.title}</span>
                      <span style={{ fontSize: 12, color: "var(--dp-text-tertiary)" }}>{g.target} {g.unit}</span>
                    </div>
                  );
                })}
              </GlassCard>
              <div style={{ fontSize: 12, color: "var(--dp-text-secondary)", textAlign: "center", marginBottom: 8, lineHeight: 1.4 }}>
                This contract will be sent to <strong style={{ color: "var(--dp-teal)" }}>{partnerName}</strong> for acceptance.
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            {wizardStep > 0 && (
              <button onClick={function () { setWizardStep(wizardStep - 1); }} style={{
                flex: 1, padding: "13px 0", borderRadius: 14, border: "1px solid var(--dp-input-border)",
                background: "var(--dp-glass-bg)", color: "var(--dp-text-primary)", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <ChevronLeft size={16} strokeWidth={2} />Back
              </button>
            )}
            {wizardStep < 3 ? (
              <GradientButton
                gradient="primary"
                onClick={function () { setWizardStep(wizardStep + 1); }}
                icon={ChevronRight}
                disabled={!wizardValid[wizardStep]}
                style={{ flex: wizardStep > 0 ? 1.2 : 1 }}
              >
                Next
              </GradientButton>
            ) : (
              <GradientButton
                gradient="teal"
                onClick={submitContract}
                icon={Send}
                disabled={wizSubmitting}
                style={{ flex: 1.2 }}
              >
                {wizSubmitting ? "Creating..." : "Send to " + partnerName}
              </GradientButton>
            )}
          </div>
        </div>
      </GlassModal>

      {/* ══════════════ CHECK-IN MODAL ══════════════ */}
      <GlassModal open={showCheckIn} onClose={function () { setShowCheckIn(false); }} variant="center" title="Check In" maxWidth={420}>
        <div style={{ padding: 24 }}>
          {/* Progress inputs for each goal */}
          {selectedContract && (selectedContract.goals || []).map(function (goal, gi) {
            var idx = String(gi);
            return (
              <div key={gi} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6, display: "block" }}>
                  {goal.title} <span style={{ fontWeight: 400, color: "var(--dp-text-tertiary)" }}>({goal.unit})</span>
                </label>
                <GlassInput
                  type="number"
                  value={ciProgress[idx] || ""}
                  onChange={function (e) {
                    setCiProgress(function (prev) {
                      var next = Object.assign({}, prev);
                      next[idx] = e.target.value;
                      return next;
                    });
                  }}
                  placeholder={"Progress in " + goal.unit}
                />
              </div>
            );
          })}

          {/* Note */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", marginBottom: 6, display: "block" }}>Note (optional)</label>
            <textarea
              value={ciNote}
              onChange={function (e) { setCiNote(e.target.value); }}
              placeholder="How did it go? Any reflections..."
              maxLength={2000}
              rows={3}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--dp-input-border)",
                background: "var(--dp-glass-bg)", color: "var(--dp-text)", fontSize: 14, fontFamily: "inherit",
                resize: "vertical", outline: "none",
              }}
            />
          </div>

          {/* Mood selector */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)", marginBottom: 8, display: "block" }}>How are you feeling?</label>
            <div style={{ display: "flex", gap: 8 }}>
              {MOOD_OPTIONS.map(function (m) {
                var active = ciMood === m.key;
                var ic = adaptColor(m.color, isLight);
                return (
                  <button key={m.key} onClick={function () { setCiMood(active ? "" : m.key); }} style={{
                    flex: 1, padding: "10px 0", borderRadius: 12, border: active ? ("1px solid " + m.color + "40") : "1px solid var(--dp-input-border)",
                    background: active ? (m.color + "12") : "var(--dp-glass-bg)", color: active ? ic : "var(--dp-text-secondary)",
                    fontSize: 11, fontWeight: active ? 600 : 400, cursor: "pointer", fontFamily: "inherit",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all 0.15s",
                  }}>
                    <m.Icon size={18} color={active ? ic : "var(--dp-text-tertiary)"} strokeWidth={2} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <GradientButton gradient="primary" onClick={submitCheckIn} icon={CheckCircle} disabled={ciSubmitting} style={{ width: "100%" }}>
            {ciSubmitting ? "Submitting..." : "Submit Check-In"}
          </GradientButton>
        </div>
      </GlassModal>

      <style>{"\
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}\
        .dp-a.dp-s{opacity:1;transform:translateY(0);}\
      "}</style>
    </div>
  );
}
