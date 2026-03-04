import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../services/api";
import { CALENDAR } from "../../services/endpoints";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard } from "../../components/shared/Skeleton";
import ErrorState from "../../components/shared/ErrorState";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GlassCard from "../../components/shared/GlassCard";
import GlassModal from "../../components/shared/GlassModal";
import GradientButton from "../../components/shared/GradientButton";
import GlassInput from "../../components/shared/GlassInput";
import ThemeBackground from "../../components/shared/ThemeBackground";
import { BRAND } from "../../styles/colors";
import {
  ArrowLeft, Calendar, Clock, MapPin, ChevronLeft, ChevronRight,
  MessageSquare, Send, User, Loader2, AlertCircle, Eye
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * SharedCalendarView
 * Read-only view of a shared calendar, accessed via /calendar/shared/:token
 * ═══════════════════════════════════════════════════════════════════ */

var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
var MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function formatTime(isoStr) {
  if (!isoStr) return "";
  var d = new Date(isoStr);
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + String(m).padStart(2, "0") + " " + ampm;
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  var d = new Date(isoStr);
  return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDow(y, m) { var d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function getKey(y, m, d) { return y + "-" + (m + 1) + "-" + d; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

export default function SharedCalendarView() {
  var { token } = useParams();
  var navigate = useNavigate();
  var { resolved, uiOpacity } = useTheme();
  var isLight = resolved === "light";
  var { showToast } = useToast();

  var NOW = new Date();
  var [viewY, setViewY] = useState(NOW.getFullYear());
  var [viewM, setViewM] = useState(NOW.getMonth());
  var [selDay, setSelDay] = useState(null);
  var [suggestOpen, setSuggestOpen] = useState(false);
  var [suggestDate, setSuggestDate] = useState("");
  var [suggestStartTime, setSuggestStartTime] = useState("10:00");
  var [suggestEndTime, setSuggestEndTime] = useState("11:00");
  var [suggestNote, setSuggestNote] = useState("");

  // Fetch shared calendar data
  var calendarQuery = useQuery({
    queryKey: ["shared-calendar", token],
    queryFn: function () { return apiGet(CALENDAR.SHARING.SHARED(token)); },
    staleTime: 60000,
    retry: 1,
  });

  // Suggest time mutation
  var suggestMut = useMutation({
    mutationFn: function (data) { return apiPost(CALENDAR.SHARING.SUGGEST(token), data); },
    onSuccess: function () {
      showToast("Time suggestion sent!", "success");
      setSuggestOpen(false);
      setSuggestNote("");
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to send suggestion", "error");
    },
  });

  var data = calendarQuery.data;
  var owner = data ? data.owner : null;
  var permission = data ? data.permission : "view";
  var events = data ? (data.events || []) : [];

  // Build event map by date
  var eventMap = useMemo(function () {
    var map = {};
    for (var i = 0; i < events.length; i++) {
      var evt = events[i];
      var d = new Date(evt.startTime);
      var key = getKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    }
    return map;
  }, [events]);

  // Day's events for selected day
  var dayEvents = selDay ? (eventMap[getKey(viewY, viewM, selDay)] || []) : [];

  // Navigation
  function prevMonth() {
    if (viewM === 0) { setViewM(11); setViewY(viewY - 1); }
    else { setViewM(viewM - 1); }
    setSelDay(null);
  }
  function nextMonth() {
    if (viewM === 11) { setViewM(0); setViewY(viewY + 1); }
    else { setViewM(viewM + 1); }
    setSelDay(null);
  }

  // Build calendar grid
  var daysInMonth = getDaysInMonth(viewY, viewM);
  var firstDow = getFirstDow(viewY, viewM);
  var calCells = [];
  for (var blank = 0; blank < firstDow; blank++) {
    calCells.push(null);
  }
  for (var day = 1; day <= daysInMonth; day++) {
    calCells.push(day);
  }

  function handleSuggest() {
    if (!suggestDate || !suggestStartTime || !suggestEndTime) {
      showToast("Please fill in all time fields", "warning");
      return;
    }
    var startISO = suggestDate + "T" + suggestStartTime + ":00Z";
    var endISO = suggestDate + "T" + suggestEndTime + ":00Z";
    suggestMut.mutate({
      suggestedStart: startISO,
      suggestedEnd: endISO,
      note: suggestNote,
    });
  }

  function openSuggest(dayNum) {
    var dateStr = viewY + "-" + String(viewM + 1).padStart(2, "0") + "-" + String(dayNum).padStart(2, "0");
    setSuggestDate(dateStr);
    setSuggestStartTime("10:00");
    setSuggestEndTime("11:00");
    setSuggestNote("");
    setSuggestOpen(true);
  }

  // Loading state
  if (calendarQuery.isLoading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <ThemeBackground />
        <GlassAppBar
          leading={<button onClick={function () { navigate(-1); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dp-text)" }}><ArrowLeft size={22} /></button>}
          title="Shared Calendar"
        />
        <div style={{ flex: 1, padding: 16, opacity: uiOpacity }}>
          <SkeletonCard lines={3} style={{ marginBottom: 12 }} />
          <SkeletonCard lines={8} />
        </div>
      </div>
    );
  }

  // Error state
  if (calendarQuery.isError || !data) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <ThemeBackground />
        <GlassAppBar
          leading={<button onClick={function () { navigate(-1); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dp-text)" }}><ArrowLeft size={22} /></button>}
          title="Shared Calendar"
        />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ErrorState
            title="Calendar Not Found"
            message="This shared calendar link may have been revoked or is no longer available."
            action={{ label: "Go Back", onClick: function () { navigate(-1); } }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", position: "relative" }}>
      <ThemeBackground />

      <GlassAppBar
        leading={
          <button onClick={function () { navigate(-1); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dp-text)", display: "flex", alignItems: "center" }}>
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
        }
        title={(owner ? (owner.displayName || "User") : "User") + "'s Calendar"}
        trailing={
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: "rgba(139,92,246,0.08)" }}>
            <Eye size={14} color={BRAND.purple} strokeWidth={2} />
            <span style={{ fontSize: 11, fontWeight: 600, color: BRAND.purple }}>
              {permission === "suggest" ? "Can Suggest" : "View Only"}
            </span>
          </div>
        }
      />

      <main style={{ flex: 1, overflowY: "auto", padding: "16px 16px 40px", opacity: uiOpacity, transition: "opacity 0.3s ease", zIndex: 10 }}>

        {/* Owner info card */}
        <GlassCard padding="14px" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "linear-gradient(135deg, " + BRAND.purple + ", " + BRAND.teal + ")",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 18, flexShrink: 0,
            }}>
              {owner && owner.avatar
                ? <img src={owner.avatar} alt="" style={{ width: 44, height: 44, borderRadius: 14, objectFit: "cover" }} />
                : (owner ? (owner.displayName || "?").charAt(0).toUpperCase() : "?")
              }
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dp-text-primary)" }}>
                {owner ? (owner.displayName || "User") : "User"}'s Schedule
              </div>
              <div style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                {events.length} events visible
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Month Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dp-text)", padding: 8 }}>
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--dp-text-primary)" }}>
            {MONTHS[viewM]} {viewY}
          </span>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dp-text)", padding: 8 }}>
            <ChevronRight size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {DAYS.map(function (d) {
            return (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--dp-text-muted)", padding: "4px 0" }}>
                {d}
              </div>
            );
          })}
        </div>

        {/* Calendar grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 16 }}>
          {calCells.map(function (d, i) {
            if (d === null) {
              return <div key={"b" + i} style={{ aspectRatio: "1", padding: 4 }} />;
            }
            var key = getKey(viewY, viewM, d);
            var dayEvts = eventMap[key] || [];
            var hasEvents = dayEvts.length > 0;
            var isToday = sameDay(new Date(viewY, viewM, d), NOW);
            var isSel = selDay === d;
            return (
              <button
                key={d}
                onClick={function () { setSelDay(d); }}
                style={{
                  aspectRatio: "1",
                  padding: 4,
                  borderRadius: 10,
                  border: isSel ? "1.5px solid " + BRAND.purple : isToday ? "1px solid " + BRAND.teal : "1px solid transparent",
                  background: isSel
                    ? "rgba(139,92,246,0.12)"
                    : isToday
                      ? "rgba(20,184,166,0.06)"
                      : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  transition: "all 0.15s",
                }}
              >
                <span style={{
                  fontSize: 13,
                  fontWeight: isToday ? 700 : 500,
                  color: isSel ? BRAND.purple : isToday ? BRAND.teal : "var(--dp-text-primary)",
                }}>
                  {d}
                </span>
                {hasEvents && (
                  <div style={{ display: "flex", gap: 2 }}>
                    {dayEvts.slice(0, 3).map(function (_, ei) {
                      return <div key={ei} style={{ width: 4, height: 4, borderRadius: 2, background: BRAND.purple }} />;
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        {selDay && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dp-text-primary)" }}>
                {MONTHS[viewM]} {selDay}
              </div>
              {permission === "suggest" && (
                <GradientButton size="sm" onClick={function () { openSuggest(selDay); }} icon={MessageSquare}>
                  Suggest Time
                </GradientButton>
              )}
            </div>

            {dayEvents.length === 0 && (
              <GlassCard padding="20px" style={{ textAlign: "center" }}>
                <Calendar size={24} color="var(--dp-text-muted)" strokeWidth={1.5} style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 13, color: "var(--dp-text-muted)" }}>No events on this day</div>
              </GlassCard>
            )}

            {dayEvents.map(function (evt) {
              return (
                <GlassCard key={evt.id} padding="12px 14px" style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 4, height: "100%", minHeight: 36, borderRadius: 2,
                      background: BRAND.purple, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text-primary)", marginBottom: 4 }}>
                        {evt.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} color="var(--dp-text-muted)" strokeWidth={2} />
                          <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                            {formatTime(evt.startTime)} - {formatTime(evt.endTime)}
                          </span>
                        </div>
                        {evt.location && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={12} color="var(--dp-text-muted)" strokeWidth={2} />
                            <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>{evt.location}</span>
                          </div>
                        )}
                      </div>
                      {evt.description && (
                        <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 4 }}>
                          {evt.description}
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* No day selected prompt */}
        {!selDay && (
          <GlassCard padding="24px" style={{ textAlign: "center" }}>
            <Calendar size={28} color="var(--dp-text-muted)" strokeWidth={1.5} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text-primary)", marginBottom: 4 }}>
              Select a Day
            </div>
            <div style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
              Tap on a date to see scheduled events
            </div>
          </GlassCard>
        )}
      </main>

      {/* Suggest Time Modal */}
      <GlassModal open={suggestOpen} onClose={function () { setSuggestOpen(false); }} title="Suggest a Time" maxWidth={400}>
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{ fontSize: 13, color: "var(--dp-text-muted)", marginBottom: 14 }}>
            Suggest a time for {owner ? (owner.displayName || "this user") : "this user"}'s calendar on {suggestDate}.
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 4 }}>
              Start Time
            </label>
            <input
              type="time"
              value={suggestStartTime}
              onChange={function (e) { setSuggestStartTime(e.target.value); }}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: "1px solid var(--dp-input-border)",
                background: "var(--dp-input-bg)",
                color: "var(--dp-text-primary)",
                fontSize: 14, fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 4 }}>
              End Time
            </label>
            <input
              type="time"
              value={suggestEndTime}
              onChange={function (e) { setSuggestEndTime(e.target.value); }}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: "1px solid var(--dp-input-border)",
                background: "var(--dp-input-bg)",
                color: "var(--dp-text-primary)",
                fontSize: 14, fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", display: "block", marginBottom: 4 }}>
              Note (optional)
            </label>
            <textarea
              value={suggestNote}
              onChange={function (e) { setSuggestNote(e.target.value); }}
              placeholder="E.g., How about we study together?"
              maxLength={500}
              rows={2}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: "1px solid var(--dp-input-border)",
                background: "var(--dp-input-bg)",
                color: "var(--dp-text-primary)",
                fontSize: 13, fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          <GradientButton
            onClick={handleSuggest}
            loading={suggestMut.isPending}
            icon={Send}
            fullWidth
          >
            Send Suggestion
          </GradientButton>
        </div>
      </GlassModal>
    </div>
  );
}
