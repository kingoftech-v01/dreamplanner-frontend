import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { CIRCLES } from "../../services/endpoints";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import PageLayout from "../../components/shared/PageLayout";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GlassCard from "../../components/shared/GlassCard";
import GlassModal from "../../components/shared/GlassModal";
import GlassInput from "../../components/shared/GlassInput";
import GradientButton from "../../components/shared/GradientButton";
import IconButton from "../../components/shared/IconButton";
import Avatar from "../../components/shared/Avatar";
import ErrorState from "../../components/shared/ErrorState";
import {
  ArrowLeft, Flame, Trophy, Target, Plus, Clock,
  Users, Zap, Calendar, CheckCircle2, Timer, Star
} from "lucide-react";

// ================================================================
// DreamPlanner -- Circle Challenges & Leaderboard
// Full-page view with challenge cards, leaderboard drill-down,
// create modal for admins, and glass morphism styling.
// ================================================================

var CHALLENGE_TYPE_META = {
  tasks_completed: { icon: CheckCircle2, color: "#10B981", label: "Complete Tasks" },
  streak_days:     { icon: Zap,          color: "#F59E0B", label: "Maintain Streak" },
  focus_minutes:   { icon: Timer,        color: "#3B82F6", label: "Focus Minutes" },
  dreams_progress: { icon: Star,         color: "#8B5CF6", label: "Dream Progress" },
};

var RANK_STYLES = [
  { bg: "rgba(252,211,77,0.15)", color: "#FCD34D", border: "rgba(252,211,77,0.3)" },
  { bg: "rgba(192,192,192,0.12)", color: "#C0C0C0", border: "rgba(192,192,192,0.25)" },
  { bg: "rgba(205,127,50,0.12)", color: "#CD7F32", border: "rgba(205,127,50,0.25)" },
];

function getTimeRemaining(endDate) {
  if (!endDate) return "";
  var end = new Date(endDate);
  var now = Date.now();
  var diff = end - now;
  if (diff <= 0) return "Ended";
  var days = Math.floor(diff / 86400000);
  var hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return days + "d " + hours + "h left";
  var mins = Math.floor((diff % 3600000) / 60000);
  return hours + "h " + mins + "m left";
}

function ProgressBar({ value, max, color, height }) {
  var pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{
      width: "100%", height: height || 6, borderRadius: 99,
      background: "var(--dp-surface)", overflow: "hidden",
    }}>
      <div style={{
        width: pct + "%", height: "100%", borderRadius: 99,
        background: "linear-gradient(90deg, " + (color || "var(--dp-accent)") + ", " + (color || "var(--dp-accent)") + "CC)",
        transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
      }} />
    </div>
  );
}


// ================================================================
// Main component
// ================================================================
export default function CircleChallenges() {
  var navigate = useNavigate();
  var { id } = useParams();
  var { user } = useAuth();
  var { showToast } = useToast();
  var { resolved } = useTheme();
  var qc = useQueryClient();

  var [mounted, setMounted] = useState(false);
  var [selectedChallenge, setSelectedChallenge] = useState(null);
  var [showCreate, setShowCreate] = useState(false);

  useEffect(function () { setTimeout(function () { setMounted(true); }, 80); }, []);

  // ── Queries ──
  var circleQuery = useQuery({
    queryKey: ["circle", id],
    queryFn: function () { return apiGet(CIRCLES.DETAIL(id)); },
    enabled: !!id,
  });
  var circle = circleQuery.data || {};
  var members = circle.members || [];
  var myRole = (function () {
    var me = members.find(function (m) { return String((m.user || m).id) === String(user?.id); });
    return me ? me.role : null;
  })();
  var isAdminOrMod = myRole === "admin" || myRole === "moderator";

  var challengesQuery = useQuery({
    queryKey: ["circle-challenges", id],
    queryFn: function () { return apiGet(CIRCLES.CHALLENGES(id)); },
    enabled: !!id,
  });
  var rawChallenges = (challengesQuery.data && challengesQuery.data.results) || challengesQuery.data || [];
  if (!Array.isArray(rawChallenges)) rawChallenges = [];

  var activeChallenges = useMemo(function () {
    return rawChallenges.filter(function (c) { return c.status === "active"; });
  }, [rawChallenges]);

  var upcomingChallenges = useMemo(function () {
    return rawChallenges.filter(function (c) { return c.status === "upcoming"; });
  }, [rawChallenges]);

  // ── Mutations ──
  var joinMut = useMutation({
    mutationFn: function (challengeId) { return apiPost(CIRCLES.CHALLENGE_JOIN(challengeId)); },
    onSuccess: function () {
      qc.invalidateQueries({ queryKey: ["circle-challenges", id] });
      showToast("Joined challenge!", "success");
    },
    onError: function (err) { showToast(err.userMessage || err.message || "Failed to join", "error"); },
  });

  // Loading / error states
  if (circleQuery.isError || challengesQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          message="Failed to load challenges"
          onRetry={function () { challengesQuery.refetch(); circleQuery.refetch(); }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate("/circle/" + id); }} />}
        title={<span style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Challenges</span>}
        right={isAdminOrMod ? (
          <IconButton icon={Plus} onClick={function () { setShowCreate(true); }} label="Create" />
        ) : null}
      />
    }>
      <div style={{ paddingBottom: 32, opacity: mounted ? 1 : 0, transition: "opacity 0.4s ease" }}>

        {/* ============ CIRCLE HEADER MINI ============ */}
        <GlassCard padding={14} mb={14}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Flame size={20} color="#FB923C" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}>{circle.name || "Circle"} Challenges</div>
              <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 2 }}>
                {rawChallenges.length} active & upcoming
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ============ LOADING ============ */}
        {challengesQuery.isLoading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--dp-text-muted)", fontSize: 13 }}>
            Loading challenges...
          </div>
        )}

        {/* ============ EMPTY ============ */}
        {!challengesQuery.isLoading && rawChallenges.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <Flame size={44} color="var(--dp-text-muted)" strokeWidth={1.2} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)", marginTop: 16 }}>No challenges yet</p>
            <p style={{ fontSize: 13, color: "var(--dp-text-muted)", marginTop: 6, maxWidth: 260, margin: "6px auto 0" }}>
              {isAdminOrMod
                ? "Create a challenge to motivate your circle members!"
                : "Check back soon for new challenges from your circle admins."}
            </p>
            {isAdminOrMod && (
              <GradientButton gradient="primaryDark" icon={Plus} onClick={function () { setShowCreate(true); }} style={{ marginTop: 20 }}>
                Create Challenge
              </GradientButton>
            )}
          </div>
        )}

        {/* ============ ACTIVE CHALLENGES ============ */}
        {activeChallenges.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingLeft: 4 }}>
              <Zap size={14} color="#10B981" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>Active</span>
            </div>
            {activeChallenges.map(function (ch) {
              return <ChallengeCard key={ch.id} ch={ch} onSelect={setSelectedChallenge} onJoin={joinMut} userId={user?.id} />;
            })}
          </>
        )}

        {/* ============ UPCOMING CHALLENGES ============ */}
        {upcomingChallenges.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, marginTop: activeChallenges.length > 0 ? 20 : 0, paddingLeft: 4 }}>
              <Clock size={14} color="var(--dp-accent)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>Upcoming</span>
            </div>
            {upcomingChallenges.map(function (ch) {
              return <ChallengeCard key={ch.id} ch={ch} onSelect={setSelectedChallenge} onJoin={joinMut} userId={user?.id} />;
            })}
          </>
        )}
      </div>

      {/* ============ LEADERBOARD MODAL ============ */}
      <LeaderboardModal
        open={!!selectedChallenge}
        onClose={function () { setSelectedChallenge(null); }}
        challenge={selectedChallenge}
        circleId={id}
        userId={user?.id}
        showToast={showToast}
        onJoin={function () { joinMut.mutate(selectedChallenge?.id); }}
        joinLoading={joinMut.isPending}
      />

      {/* ============ CREATE MODAL ============ */}
      <CreateChallengeModal
        open={showCreate}
        onClose={function () { setShowCreate(false); }}
        circleId={id}
        showToast={showToast}
        onCreated={function () {
          qc.invalidateQueries({ queryKey: ["circle-challenges", id] });
          setShowCreate(false);
        }}
      />
    </PageLayout>
  );
}


// ================================================================
// Challenge Card
// ================================================================
function ChallengeCard({ ch, onSelect, onJoin, userId }) {
  var hasJoined = ch.hasJoined || ch.has_joined;
  var typeMeta = CHALLENGE_TYPE_META[ch.challengeType || ch.challenge_type] || CHALLENGE_TYPE_META.tasks_completed;
  var TypeIcon = typeMeta.icon;
  var timeLeft = getTimeRemaining(ch.endDate || ch.end_date);
  var targetVal = ch.targetValue || ch.target_value || 0;
  var myProg = ch.myProgress || ch.my_progress || 0;
  var pct = targetVal > 0 ? Math.min(100, Math.round((myProg / targetVal) * 100)) : 0;

  return (
    <GlassCard padding={0} mb={10} hover onClick={function () { onSelect(ch); }} style={{ cursor: "pointer" }}>
      <div style={{ padding: 16 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0,
            background: typeMeta.color + "12", border: "1px solid " + typeMeta.color + "25",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TypeIcon size={20} color={typeMeta.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ch.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--dp-text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                <Users size={11} /> {ch.participantCount || ch.participant_count || 0}
              </span>
              {timeLeft && (
                <span style={{ fontSize: 11, color: "var(--dp-text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                  <Clock size={11} /> {timeLeft}
                </span>
              )}
              <span style={{
                padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                background: ch.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.08)",
                color: ch.status === "active" ? "#10B981" : "var(--dp-accent)",
              }}>
                {ch.status === "active" ? "Active" : ch.status || "Upcoming"}
              </span>
            </div>
          </div>
          {!hasJoined && (
            <button onClick={function (e) { e.stopPropagation(); onJoin.mutate(ch.id); }} disabled={onJoin.isPending} style={{
              padding: "6px 14px", borderRadius: 10, border: "none", flexShrink: 0,
              background: "var(--dp-accent)", color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              opacity: onJoin.isPending ? 0.6 : 1,
            }}>
              Join
            </button>
          )}
          {hasJoined && (
            <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600, flexShrink: 0 }}>Joined</span>
          )}
        </div>

        {/* Description */}
        {ch.description && (
          <p style={{ fontSize: 12, color: "var(--dp-text-secondary)", marginTop: 10, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {ch.description}
          </p>
        )}

        {/* Progress bar (only if joined and has target) */}
        {hasJoined && targetVal > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>Your progress</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: typeMeta.color }}>{myProg} / {targetVal} ({pct}%)</span>
            </div>
            <ProgressBar value={myProg} max={targetVal} color={typeMeta.color} height={6} />
          </div>
        )}

        {/* Challenge type badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: hasJoined && targetVal > 0 ? 10 : 12 }}>
          <span style={{
            padding: "3px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600,
            background: typeMeta.color + "10", color: typeMeta.color,
            border: "1px solid " + typeMeta.color + "20",
          }}>
            {typeMeta.label}
          </span>
          {targetVal > 0 && (
            <span style={{ fontSize: 11, color: "var(--dp-text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
              <Target size={11} /> Target: {targetVal}
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}


// ================================================================
// Leaderboard Modal
// ================================================================
function LeaderboardModal({ open, onClose, challenge, circleId, userId, showToast, onJoin, joinLoading }) {
  var [leaderboard, setLeaderboard] = useState([]);
  var [loading, setLoading] = useState(false);

  useEffect(function () {
    if (!open || !challenge || !circleId) return;
    setLoading(true);
    apiGet(CIRCLES.CHALLENGE_LEADERBOARD(circleId, challenge.id)).then(function (data) {
      var lb = data.leaderboard || data.results || data || [];
      if (!Array.isArray(lb)) lb = [];
      setLeaderboard(lb);
      setLoading(false);
    }).catch(function () {
      setLeaderboard([]);
      setLoading(false);
    });
  }, [open, challenge, circleId]);

  if (!challenge) return null;

  var hasJoined = challenge.hasJoined || challenge.has_joined;
  var targetVal = challenge.targetValue || challenge.target_value || 0;
  var typeMeta = CHALLENGE_TYPE_META[challenge.challengeType || challenge.challenge_type] || CHALLENGE_TYPE_META.tasks_completed;
  var TypeIcon = typeMeta.icon;
  var timeLeft = getTimeRemaining(challenge.endDate || challenge.end_date);

  // Find current user's rank
  var myRank = -1;
  for (var i = 0; i < leaderboard.length; i++) {
    if (String(leaderboard[i].user_id) === String(userId) || leaderboard[i].is_current_user) {
      myRank = i;
      break;
    }
  }

  return (
    <GlassModal open={open} onClose={onClose} variant="bottom" title="" maxWidth={440}>
      <div style={{ padding: "0 20px 24px" }}>

        {/* Challenge header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: typeMeta.color + "12", border: "1px solid " + typeMeta.color + "25",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TypeIcon size={22} color={typeMeta.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--dp-text)" }}>{challenge.title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              {timeLeft && <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>{timeLeft}</span>}
              <span style={{ fontSize: 12, color: "var(--dp-text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                <Users size={12} /> {challenge.participantCount || challenge.participant_count || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {challenge.description && (
          <div style={{
            fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.6, marginBottom: 14,
            padding: 12, borderRadius: 12,
            background: "var(--dp-surface)", border: "1px solid var(--dp-glass-border)",
          }}>
            {challenge.description}
          </div>
        )}

        {/* Challenge meta */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{
            padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: typeMeta.color + "10", color: typeMeta.color,
            border: "1px solid " + typeMeta.color + "20",
          }}>
            {typeMeta.label}
          </span>
          {targetVal > 0 && (
            <span style={{
              padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: "var(--dp-surface)", color: "var(--dp-text-secondary)",
              border: "1px solid var(--dp-glass-border)",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <Target size={11} /> Target: {targetVal}
            </span>
          )}
          <span style={{
            padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: challenge.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.08)",
            color: challenge.status === "active" ? "#10B981" : "var(--dp-accent)",
            border: "1px solid " + (challenge.status === "active" ? "rgba(16,185,129,0.2)" : "rgba(139,92,246,0.15)"),
          }}>
            {challenge.status === "active" ? "Active" : challenge.status || "Upcoming"}
          </span>
        </div>

        {/* Join button */}
        {!hasJoined && (
          <GradientButton gradient="primaryDark" onClick={onJoin} disabled={joinLoading} fullWidth style={{ marginBottom: 18 }}>
            {joinLoading ? "Joining..." : "Join Challenge"}
          </GradientButton>
        )}

        {/* Your progress */}
        {hasJoined && targetVal > 0 && (
          <div style={{
            padding: 14, borderRadius: 14, marginBottom: 18,
            background: typeMeta.color + "08", border: "1px solid " + typeMeta.color + "18",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text)" }}>Your Progress</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: typeMeta.color }}>
                {challenge.myProgress || challenge.my_progress || 0} / {targetVal}
              </span>
            </div>
            <ProgressBar
              value={challenge.myProgress || challenge.my_progress || 0}
              max={targetVal}
              color={typeMeta.color}
              height={8}
            />
            {myRank >= 0 && (
              <div style={{ fontSize: 11, color: "var(--dp-text-muted)", marginTop: 8, textAlign: "center" }}>
                You are ranked #{myRank + 1} of {leaderboard.length}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard heading */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Trophy size={15} color="#FCD34D" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text)" }}>Leaderboard</span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 24, color: "var(--dp-text-muted)", fontSize: 13 }}>
            Loading leaderboard...
          </div>
        )}

        {/* Empty */}
        {!loading && leaderboard.length === 0 && (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Trophy size={32} color="var(--dp-text-muted)" strokeWidth={1.2} />
            <p style={{ fontSize: 13, color: "var(--dp-text-muted)", marginTop: 8 }}>
              No progress recorded yet. Be the first!
            </p>
          </div>
        )}

        {/* Leaderboard entries */}
        {!loading && leaderboard.length > 0 && (
          <div style={{
            borderRadius: 14, overflow: "hidden",
            background: "var(--dp-surface)", border: "1px solid var(--dp-glass-border)",
          }}>
            {leaderboard.map(function (entry, idx) {
              var name = entry.user_display_name || entry.userName || entry.username || "User";
              var val = entry.total_progress || entry.progress_value || entry.totalProgress || 0;
              var isMe = entry.is_current_user || String(entry.user_id) === String(userId);
              var rankStyle = idx < 3 ? RANK_STYLES[idx] : null;

              return (
                <div key={entry.user_id || idx} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px",
                  borderBottom: idx < leaderboard.length - 1 ? "1px solid var(--dp-divider)" : "none",
                  background: isMe ? "var(--dp-accent)" + "08" : "transparent",
                }}>
                  {/* Rank badge */}
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: rankStyle ? rankStyle.bg : "var(--dp-surface)",
                    border: rankStyle ? "1px solid " + rankStyle.border : "1px solid var(--dp-glass-border)",
                    fontSize: 12, fontWeight: 800,
                    color: rankStyle ? rankStyle.color : "var(--dp-text-muted)",
                  }}>
                    {idx + 1}
                  </div>

                  {/* Avatar */}
                  <Avatar
                    src={entry.user_avatar_url || entry.userAvatar}
                    name={name}
                    size={32}
                  />

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: isMe ? 700 : 600,
                      color: isMe ? "var(--dp-accent)" : "var(--dp-text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {name} {isMe ? "(you)" : ""}
                    </div>
                    {/* Progress bar per participant */}
                    {targetVal > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <ProgressBar value={val} max={targetVal} color={rankStyle ? rankStyle.color : typeMeta.color} height={4} />
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <span style={{
                    fontSize: 14, fontWeight: 800, flexShrink: 0,
                    color: rankStyle ? rankStyle.color : "var(--dp-accent)",
                  }}>
                    {Math.round(val)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassModal>
  );
}


// ================================================================
// Create Challenge Modal
// ================================================================
function CreateChallengeModal({ open, onClose, circleId, showToast, onCreated }) {
  var [title, setTitle] = useState("");
  var [description, setDescription] = useState("");
  var [challengeType, setChallengeType] = useState("tasks_completed");
  var [targetValue, setTargetValue] = useState("");
  var [startDate, setStartDate] = useState("");
  var [endDate, setEndDate] = useState("");
  var [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setTitle(""); setDescription(""); setChallengeType("tasks_completed");
    setTargetValue(""); setStartDate(""); setEndDate("");
  }

  function handleSubmit() {
    if (!title.trim()) { showToast("Title is required", "error"); return; }
    if (!targetValue || Number(targetValue) < 1) { showToast("Target value must be at least 1", "error"); return; }
    if (!startDate || !endDate) { showToast("Start and end dates are required", "error"); return; }
    if (new Date(endDate) <= new Date(startDate)) { showToast("End date must be after start date", "error"); return; }

    setSubmitting(true);
    apiPost(CIRCLES.CHALLENGE_CREATE(circleId), {
      title: title.trim(),
      description: description.trim(),
      challengeType: challengeType,
      targetValue: Number(targetValue),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    }).then(function () {
      showToast("Challenge created!", "success");
      resetForm();
      onCreated();
    }).catch(function (err) {
      showToast(err.userMessage || err.message || "Failed to create challenge", "error");
    }).finally(function () {
      setSubmitting(false);
    });
  }

  var typeOptions = [
    { value: "tasks_completed", label: "Complete Tasks", icon: CheckCircle2, color: "#10B981" },
    { value: "streak_days", label: "Maintain Streak", icon: Zap, color: "#F59E0B" },
    { value: "focus_minutes", label: "Focus Minutes", icon: Timer, color: "#3B82F6" },
    { value: "dreams_progress", label: "Dream Progress", icon: Star, color: "#8B5CF6" },
  ];

  return (
    <GlassModal open={open} onClose={onClose} variant="center" title="Create Challenge" maxWidth={420}>
      <div style={{ padding: 20 }}>
        {/* Title */}
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 6 }}>
          Title
        </label>
        <GlassInput
          value={title}
          onChange={function (e) { setTitle(e.target.value); }}
          placeholder="e.g. 30-Day Focus Sprint"
          maxLength={200}
          style={{ marginBottom: 14 }}
        />

        {/* Description */}
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 6 }}>
          Description (optional)
        </label>
        <GlassInput
          value={description}
          onChange={function (e) { setDescription(e.target.value); }}
          placeholder="Describe the challenge..."
          multiline
          style={{ marginBottom: 14, minHeight: 60 }}
        />

        {/* Challenge type */}
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 8 }}>
          Challenge Type
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {typeOptions.map(function (opt) {
            var Icon = opt.icon;
            var isSelected = challengeType === opt.value;
            return (
              <button key={opt.value} onClick={function () { setChallengeType(opt.value); }} style={{
                padding: "10px 12px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                border: isSelected ? "2px solid " + opt.color : "1px solid var(--dp-glass-border)",
                background: isSelected ? opt.color + "10" : "var(--dp-surface)",
                display: "flex", alignItems: "center", gap: 8,
                transition: "all 0.2s",
              }}>
                <Icon size={16} color={isSelected ? opt.color : "var(--dp-text-muted)"} />
                <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? opt.color : "var(--dp-text-secondary)" }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Target value */}
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 6 }}>
          Target Value
        </label>
        <GlassInput
          value={targetValue}
          onChange={function (e) { setTargetValue(e.target.value.replace(/\D/g, "")); }}
          placeholder={challengeType === "focus_minutes" ? "e.g. 600" : challengeType === "streak_days" ? "e.g. 30" : "e.g. 50"}
          type="number"
          style={{ marginBottom: 14 }}
        />

        {/* Dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 6 }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={function (e) { setStartDate(e.target.value); }}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 12, fontSize: 13,
                border: "1px solid var(--dp-input-border)", background: "var(--dp-input-bg)",
                color: "var(--dp-text)", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 6 }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={function (e) { setEndDate(e.target.value); }}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 12, fontSize: 13,
                border: "1px solid var(--dp-input-border)", background: "var(--dp-input-bg)",
                color: "var(--dp-text)", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={function () { resetForm(); onClose(); }} style={{
            flex: 1, padding: 12, borderRadius: 12, border: "1px solid var(--dp-input-border)",
            background: "var(--dp-surface)", color: "var(--dp-text-secondary)",
            fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <GradientButton gradient="primaryDark" onClick={handleSubmit} disabled={submitting} style={{ flex: 1 }}>
            {submitting ? "Creating..." : "Create"}
          </GradientButton>
        </div>
      </div>
    </GlassModal>
  );
}
