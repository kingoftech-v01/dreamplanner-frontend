import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../../services/api";
import { CIRCLES } from "../../../services/endpoints";
import GlassModal from "../../../components/shared/GlassModal";
import GradientButton from "../../../components/shared/GradientButton";
import Avatar from "../../../components/shared/Avatar";
import { Trophy, Flame, Target } from "lucide-react";

export default function CircleChallengeSheet({ open, onClose, challenge, circleId, userId, showToast, onJoined }) {
  var [leaderboard, setLeaderboard] = useState([]);
  var [loading, setLoading] = useState(false);
  var [joining, setJoining] = useState(false);

  var hasJoined = challenge && (challenge.hasJoined || challenge.has_joined);
  var [joined, setJoined] = useState(hasJoined);

  useEffect(function () {
    setJoined(hasJoined);
  }, [hasJoined]);

  useEffect(function () {
    if (!open || !challenge || !circleId) return;
    setLoading(true);
    apiGet(CIRCLES.CHALLENGE_LEADERBOARD(circleId, challenge.id)).then(function (data) {
      setLeaderboard(data.results || data || []);
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, [open, challenge, circleId]);

  function handleJoin() {
    if (!challenge) return;
    setJoining(true);
    apiPost(CIRCLES.CHALLENGE_JOIN(challenge.id)).then(function () {
      setJoined(true);
      setJoining(false);
      showToast && showToast("Joined challenge!", "success");
      onJoined && onJoined();
    }).catch(function (err) {
      setJoining(false);
      showToast && showToast(err.message || "Failed to join", "error");
    });
  }

  if (!challenge) return null;

  var daysLeft = "";
  if (challenge.endDate || challenge.end_date) {
    var end = new Date(challenge.endDate || challenge.end_date);
    var diff = Math.max(0, Math.ceil((end - Date.now()) / 86400000));
    daysLeft = diff + " day" + (diff !== 1 ? "s" : "") + " left";
  }

  return (
    <GlassModal open={open} onClose={onClose} variant="bottom" title="Challenge" maxWidth={420}>
      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)",
          }}>
            <Flame size={20} color="#FB923C" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text)" }}>{challenge.title}</div>
            {daysLeft && <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 2 }}>{daysLeft}</div>}
          </div>
        </div>

        {challenge.description && (
          <div style={{ fontSize: 13, color: "var(--dp-text-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
            {challenge.description}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "var(--dp-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <Target size={12} /> {challenge.participantCount || challenge.participant_count || 0} participants
          </span>
          <span style={{
            padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: challenge.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.08)",
            color: challenge.status === "active" ? "#10B981" : "var(--dp-accent)",
            border: "1px solid " + (challenge.status === "active" ? "rgba(16,185,129,0.2)" : "rgba(139,92,246,0.15)"),
          }}>
            {challenge.status === "active" ? "Active" : challenge.status || "Upcoming"}
          </span>
        </div>

        {!joined && (
          <GradientButton gradient="primaryDark" onClick={handleJoin} disabled={joining} fullWidth style={{ marginBottom: 16 }}>
            {joining ? "Joining..." : "Join Challenge"}
          </GradientButton>
        )}

        {/* Leaderboard */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Trophy size={14} color="#FCD34D" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-text)" }}>Leaderboard</span>
        </div>

        {loading && <div style={{ textAlign: "center", padding: 12, color: "var(--dp-text-muted)", fontSize: 13 }}>Loading...</div>}

        {!loading && leaderboard.length === 0 && (
          <div style={{ textAlign: "center", padding: 12, color: "var(--dp-text-muted)", fontSize: 13 }}>No progress recorded yet</div>
        )}

        {leaderboard.map(function (entry, i) {
          var name = entry.userName || entry.user_name || entry.username || "User";
          var val = entry.progress_value || entry.totalProgress || entry.total_progress || 0;
          return (
            <div key={entry.user || i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
              borderBottom: i < leaderboard.length - 1 ? "1px solid var(--dp-divider)" : "none",
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                background: i === 0 ? "rgba(252,211,77,0.15)" : i === 1 ? "rgba(192,192,192,0.12)" : i === 2 ? "rgba(205,127,50,0.12)" : "var(--dp-surface)",
                fontSize: 11, fontWeight: 700,
                color: i === 0 ? "#FCD34D" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--dp-text-muted)",
              }}>
                {i + 1}
              </span>
              <Avatar src={entry.userAvatar || entry.user_avatar} name={name} size={28} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>{name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dp-accent)" }}>{Math.round(val)}</span>
            </div>
          );
        })}
      </div>
    </GlassModal>
  );
}
