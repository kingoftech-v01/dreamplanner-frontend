import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CONVERSATIONS } from "../../services/endpoints";
import useInfiniteList from "../../hooks/useInfiniteList";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/shared/BottomNav";
import ErrorState from "../../components/shared/ErrorState";
import {
  ArrowLeft, Phone, Video, PhoneIncoming, PhoneOutgoing,
  PhoneMissed, Clock
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Call History Screen
 *
 * Shows all past calls: outgoing, incoming, missed.
 * Tap on a call to start a new call or navigate to buddy chat.
 * ═══════════════════════════════════════════════════════════════════ */

function formatDuration(seconds) {
  if (!seconds) return "";
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return m > 0 ? m + "m " + s + "s" : s + "s";
}

function formatDate(dateStr) {
  var d = new Date(dateStr);
  var now = new Date();
  var td = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var cd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var diff = Math.floor((td - cd) / 86400000);
  var time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return "Today " + time;
  if (diff === 1) return "Yesterday " + time;
  if (diff < 7) return d.toLocaleDateString([], { weekday: "short" }) + " " + time;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + time;
}

export default function CallHistoryScreen() {
  var navigate = useNavigate();
  var { resolved, uiOpacity } = useTheme();
  var isLight = resolved === "light";
  var { user } = useAuth();
  var [mounted, setMounted] = useState(false);

  useEffect(function () { setTimeout(function () { setMounted(true); }, 100); }, []);

  var callsInf = useInfiniteList({ queryKey: ["call-history"], url: CONVERSATIONS.CALLS.HISTORY, limit: 20 });

  var calls = callsInf.items;

  var iconBtnStyle = {
    width: 40, height: 40, borderRadius: 12,
    border: isLight ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(255,255,255,0.08)",
    background: isLight ? "rgba(139,92,246,0.06)" : "rgba(255,255,255,0.05)",
    color: isLight ? "#1a1535" : "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all 0.2s",
  };

  function getCallInfo(call) {
    var isOutgoing = String(call.callerId) === String(user?.id);
    var name = isOutgoing ? (call.calleeName || "Unknown") : (call.callerName || "Unknown");
    var isMissed = call.status === "missed";
    var isRejected = call.status === "rejected";
    var isCancelled = call.status === "cancelled";

    var Icon = PhoneOutgoing;
    var color = isLight ? "#059669" : "#5DE5A8";
    var label = "Outgoing";

    if (!isOutgoing) {
      if (isMissed) {
        Icon = PhoneMissed;
        color = isLight ? "#DC2626" : "#F69A9A";
        label = "Missed";
      } else {
        Icon = PhoneIncoming;
        color = isLight ? "#2563EB" : "#93C5FD";
        label = "Incoming";
      }
    } else {
      if (isMissed || isCancelled) {
        Icon = PhoneMissed;
        color = isLight ? "#DC2626" : "#F69A9A";
        label = isCancelled ? "Cancelled" : "No answer";
      } else if (isRejected) {
        Icon = PhoneMissed;
        color = isLight ? "#DC2626" : "#F69A9A";
        label = "Declined";
      }
    }

    var buddyId = isOutgoing ? call.calleeId : call.callerId;

    return { name: name, Icon: Icon, color: color, label: label, isOutgoing: isOutgoing, buddyId: buddyId };
  }

  if (callsInf.isLoading) return (
    <div style={{ width: "100%", padding: "80px 16px 0", display: "flex", justifyContent: "center" }}>
      <div style={{ color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading calls...</div>
    </div>
  );

  if (callsInf.isError) return (
    <div style={{ width: "100%", padding: "80px 16px 0", display: "flex", justifyContent: "center" }}>
      <ErrorState message={callsInf.error?.message} onRetry={function () { callsInf.refetch(); }} />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif" }}>

      {/* APP BAR */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 64,
        background: isLight ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.03)",
        backdropFilter: "blur(40px) saturate(1.4)", WebkitBackdropFilter: "blur(40px) saturate(1.4)",
        borderBottom: isLight ? "1px solid rgba(139,92,246,0.1)" : "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
      }}>
        <button style={iconBtnStyle} onClick={function () { navigate(-1); }} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div style={{ fontSize: 17, fontWeight: 700, color: isLight ? "#1a1535" : "#fff", letterSpacing: "-0.3px" }}>
          Call History
        </div>
      </header>

      {/* CONTENT */}
      <main style={{
        position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden",
        zIndex: 10, paddingTop: 72, paddingBottom: 100,
        transition: "opacity 0.3s ease", opacity: uiOpacity,
      }}>
        <div style={{ width: "100%", padding: "0 16px" }}>

          {calls.length === 0 ? (
            <div className={mounted ? "dp-a dp-s" : "dp-a"} style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px",
                background: "rgba(139,92,246,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Phone size={36} color={isLight ? "rgba(26,21,53,0.72)" : "rgba(255,255,255,0.85)"} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: isLight ? "#1a1535" : "#fff", marginBottom: 8 }}>
                No calls yet
              </div>
              <div style={{ fontSize: 14, color: isLight ? "rgba(26,21,53,0.72)" : "rgba(255,255,255,0.85)", lineHeight: 1.5, maxWidth: 280, margin: "0 auto" }}>
                Your call history will appear here once you make or receive a call
              </div>
            </div>
          ) : (
            calls.map(function (call, i) {
              var info = getCallInfo(call);
              var DirectionIcon = info.Icon;
              var CallTypeIcon = call.callType === "video" ? Video : Phone;

              return (
                <div
                  key={call.id}
                  className={mounted ? "dp-a dp-s" : "dp-a"}
                  style={{ animationDelay: (80 + i * 50) + "ms" }}
                >
                  <div
                    className="dp-g dp-gh"
                    style={{ padding: 14, marginBottom: 8, cursor: "pointer", position: "relative" }}
                    onClick={function () { navigate("/buddy-chat/" + info.buddyId); }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>

                      {/* Direction icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: info.color + "15", border: "1px solid " + info.color + "25",
                      }}>
                        <DirectionIcon size={20} color={info.color} strokeWidth={2} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600, color: isLight ? "#1a1535" : "#fff",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3,
                        }}>
                          {info.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: info.color }}>
                            {info.label}
                          </span>
                          <span style={{ fontSize: 12, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)" }}>
                            {call.callType === "video" ? "Video" : "Voice"}
                          </span>
                          {call.durationSeconds > 0 && (
                            <span style={{
                              display: "flex", alignItems: "center", gap: 3,
                              fontSize: 12, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)",
                            }}>
                              <Clock size={11} strokeWidth={2} /> {formatDuration(call.durationSeconds)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Time + callback button */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)" }}>
                          {formatDate(call.createdAt)}
                        </span>
                        <button
                          onClick={function (e) {
                            e.stopPropagation();
                            navigate("/" + (call.callType || "voice") + "-call/" + info.buddyId);
                          }}
                          style={{
                            width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
                            background: isLight ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.15)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                          aria-label={"Call " + info.name}
                        >
                          <CallTypeIcon size={16} color={isLight ? "#7C3AED" : "#C4B5FD"} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Infinite scroll sentinel */}
          <div ref={callsInf.sentinelRef} />
          {callsInf.loadingMore && (
            <div style={{ textAlign: "center", padding: "12px 0", fontSize: 13, color: isLight ? "rgba(26,21,53,0.5)" : "rgba(255,255,255,0.4)" }}>Loading more...</div>
          )}
        </div>
      </main>

      <BottomNav />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        ::-webkit-scrollbar{width:0;}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
      `}</style>
    </div>
  );
}
