import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Check, RefreshCw, Settings } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { apiGet, apiPost } from "../../services/api";
import { CALENDAR } from "../../services/endpoints";
import { BRAND, adaptColor } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GlassCard from "../../components/shared/GlassCard";

/* ── Toggle switch (matches GoogleCalendarConnect pattern) ── */
function Toggle({ on, onToggle, color }) {
  return (
    <button onClick={onToggle} style={{
      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
      background: on ? (color || BRAND.purple) : "rgba(255,255,255,0.1)",
      position: "relative", transition: "background 0.25s",
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3,
        left: on ? 23 : 3, transition: "left 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

/* ── Direction option button ── */
function DirectionOption({ label, value, selected, onSelect, isLight }) {
  var active = value === selected;
  return (
    <button
      onClick={function () { onSelect(value); }}
      style={{
        flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
        background: active ? "var(--dp-accent-soft)" : "transparent",
        color: active ? "var(--dp-accent)" : "var(--dp-text-secondary)",
        fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer",
        fontFamily: "inherit", transition: "all 0.2s",
      }}
    >
      {label}
    </button>
  );
}

export default function GoogleSyncSettings() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { showToast } = useToast();
  var queryClient = useQueryClient();

  // ── Local form state ──
  var [syncDirection, setSyncDirection] = useState("both");
  var [syncTasks, setSyncTasks] = useState(true);
  var [syncEvents, setSyncEvents] = useState(true);
  var [syncedDreamIds, setSyncedDreamIds] = useState([]);
  var [dreams, setDreams] = useState([]);
  var [lastSyncAt, setLastSyncAt] = useState(null);
  var [connected, setConnected] = useState(false);
  var [dirty, setDirty] = useState(false);

  // ── Fetch sync settings ──
  var settingsQuery = useQuery({
    queryKey: ["google-sync-settings"],
    queryFn: function () { return apiGet(CALENDAR.GOOGLE.SYNC_SETTINGS); },
  });

  // Hydrate local state from server
  useEffect(function () {
    if (!settingsQuery.data) return;
    var d = settingsQuery.data;
    setConnected(!!d.connected);
    if (d.connected) {
      setSyncDirection(d.syncDirection || "both");
      setSyncTasks(d.syncTasks !== false);
      setSyncEvents(d.syncEvents !== false);
      setSyncedDreamIds(d.syncedDreamIds || []);
      setDreams(d.dreams || []);
      if (d.lastSyncAt) setLastSyncAt(new Date(d.lastSyncAt));
    }
  }, [settingsQuery.data]);

  // ── Save mutation ──
  var saveMut = useMutation({
    mutationFn: function (payload) { return apiPost(CALENDAR.GOOGLE.SYNC_SETTINGS, payload); },
    onSuccess: function () {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["google-sync-settings"] });
      showToast("Sync settings saved", "success");
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Failed to save settings", "error");
    },
  });

  // ── Sync now mutation ──
  var syncMut = useMutation({
    mutationFn: function () { return apiPost(CALENDAR.GOOGLE.SYNC); },
    onSuccess: function () {
      setLastSyncAt(new Date());
      queryClient.invalidateQueries({ queryKey: ["google-sync-settings"] });
      showToast("Sync started", "success");
    },
    onError: function (err) {
      showToast(err.userMessage || err.message || "Sync failed", "error");
    },
  });

  // ── Helpers ──
  var handleDirectionChange = function (val) {
    setSyncDirection(val);
    setDirty(true);
  };

  var handleToggleTasks = function () {
    setSyncTasks(function (p) { return !p; });
    setDirty(true);
  };

  var handleToggleEvents = function () {
    setSyncEvents(function (p) { return !p; });
    setDirty(true);
  };

  var handleToggleDream = function (dreamId) {
    setSyncedDreamIds(function (prev) {
      var idx = prev.indexOf(dreamId);
      if (idx >= 0) {
        var next = prev.slice();
        next.splice(idx, 1);
        return next;
      }
      return prev.concat([dreamId]);
    });
    setDirty(true);
  };

  var handleSelectAll = function () {
    setSyncedDreamIds([]);
    setDirty(true);
  };

  var handleDeselectAll = function () {
    // Empty array = sync all (per model convention). To deselect all dreams,
    // set a nil UUID sentinel so no real dream IDs match.
    setSyncedDreamIds(["00000000-0000-0000-0000-000000000000"]);
    setDirty(true);
  };

  var handleSave = function () {
    saveMut.mutate({
      synced_dream_ids: syncedDreamIds,
      sync_direction: syncDirection,
      sync_tasks: syncTasks,
      sync_events: syncEvents,
    });
  };

  var handleSyncNow = function () { syncMut.mutate(); };

  // Check if a dream is currently selected for sync
  var isDreamSynced = function (dreamId) {
    if (!syncedDreamIds || syncedDreamIds.length === 0) return true; // empty = all
    return syncedDreamIds.indexOf(dreamId) >= 0;
  };

  var allSelected = !syncedDreamIds || syncedDreamIds.length === 0;

  var syncing = syncMut.isPending;
  var saving = saveMut.isPending;
  var loading = settingsQuery.isLoading;

  return (
    <PageLayout showNav={false} header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate("/calendar"); }} />}
        title="Google Calendar Sync"
      />
    }>
      <style>{"\n        @keyframes gsSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\n      "}</style>

      <div style={{ paddingBottom: 40, minHeight: "100vh" }}>

        {/* Header icon */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, margin: "0 auto 14px",
            background: "var(--dp-accent-soft)",
            border: "1px solid var(--dp-glass-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Settings size={32} color={adaptColor(BRAND.blueLight, isLight)} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 4px" }}>
            {connected ? "Sync Settings" : "Google Calendar"}
          </h2>
          <p style={{
            fontSize: 13, color: "var(--dp-text-tertiary)", margin: 0,
            lineHeight: 1.5, maxWidth: 280, marginLeft: "auto", marginRight: "auto",
          }}>
            {connected
              ? "Choose what syncs with Google Calendar"
              : "Connect your Google Calendar to configure sync"}
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div className="dp-spin" style={{
              width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)",
              borderTopColor: BRAND.purple, borderRadius: "50%",
              margin: "0 auto",
            }} />
          </div>
        )}

        {!loading && !connected && (
          /* ── Not Connected State ── */
          <>
            <GlassCard padding={18} mb={16}>
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <Calendar size={40} color="var(--dp-text-muted)" strokeWidth={1.5} style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, color: "var(--dp-text-secondary)", margin: "0 0 16px", lineHeight: 1.6 }}>
                  You need to connect your Google Calendar before configuring sync settings.
                </p>
                <button
                  onClick={function () { navigate("/calendar-connect"); }}
                  style={{
                    padding: "12px 28px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #4285F4, #3367D6)",
                    color: "#fff", fontSize: 14, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "inline-flex", alignItems: "center", gap: 8,
                    boxShadow: "0 4px 16px rgba(66,133,244,0.3)",
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Connect Google Calendar
                </button>
              </div>
            </GlassCard>
          </>
        )}

        {!loading && connected && (
          <>
            {/* ── Connection Status ── */}
            <GlassCard padding={14} mb={12} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: "linear-gradient(135deg, #4285F4, #3367D6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Calendar size={18} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>Google Calendar</div>
                <div style={{ fontSize: 12, color: adaptColor(BRAND.green, isLight), fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                  <Check size={11} strokeWidth={3} /> Connected
                </div>
              </div>
              <button
                onClick={function () { navigate("/calendar-connect"); }}
                style={{
                  padding: "6px 12px", borderRadius: 8, border: "1px solid var(--dp-glass-border)",
                  background: "transparent", color: "var(--dp-text-secondary)",
                  fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Manage
              </button>
            </GlassCard>

            {/* ── Sync Direction ── */}
            <GlassCard mb={12} style={{ overflow: "hidden" }}>
              <div style={{
                padding: "13px 16px 8px",
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Sync Direction
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, padding: "4px 12px 12px" }}>
                <DirectionOption label="Both ways" value="both" selected={syncDirection} onSelect={handleDirectionChange} isLight={isLight} />
                <DirectionOption label="Push only" value="push_only" selected={syncDirection} onSelect={handleDirectionChange} isLight={isLight} />
                <DirectionOption label="Pull only" value="pull_only" selected={syncDirection} onSelect={handleDirectionChange} isLight={isLight} />
              </div>
              <div style={{ padding: "0 16px 12px" }}>
                <p style={{ fontSize: 12, color: "var(--dp-text-muted)", margin: 0, lineHeight: 1.5 }}>
                  {syncDirection === "both" && "Events sync in both directions between DreamPlanner and Google Calendar."}
                  {syncDirection === "push_only" && "Only push DreamPlanner events to Google Calendar. Google changes won't sync back."}
                  {syncDirection === "pull_only" && "Only pull events from Google Calendar into DreamPlanner. Local changes won't push."}
                </p>
              </div>
            </GlassCard>

            {/* ── What to Sync ── */}
            <GlassCard mb={12} style={{ overflow: "hidden" }}>
              <div style={{
                padding: "13px 16px 0",
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  What to Sync
                </span>
              </div>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid var(--dp-glass-border)",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--dp-text)" }}>Dream tasks</div>
                  <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 2 }}>Sync tasks from your dreams as calendar events</div>
                </div>
                <Toggle on={syncTasks} onToggle={handleToggleTasks} color={BRAND.purple} />
              </div>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--dp-text)" }}>Calendar events</div>
                  <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 2 }}>Sync standalone calendar events</div>
                </div>
                <Toggle on={syncEvents} onToggle={handleToggleEvents} color={BRAND.blueLight} />
              </div>
            </GlassCard>

            {/* ── Dreams to Sync ── */}
            {syncTasks && dreams.length > 0 && (
              <GlassCard mb={12} style={{ overflow: "hidden" }}>
                <div style={{
                  padding: "13px 16px 0",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dp-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Dreams to Sync
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleSelectAll}
                      style={{
                        padding: "4px 10px", borderRadius: 6, border: "none",
                        background: allSelected ? "var(--dp-accent-soft)" : "transparent",
                        color: allSelected ? "var(--dp-accent)" : "var(--dp-text-muted)",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      style={{
                        padding: "4px 10px", borderRadius: 6, border: "none",
                        background: !allSelected && syncedDreamIds.length === 1 && syncedDreamIds[0] === "00000000-0000-0000-0000-000000000000" ? "var(--dp-accent-soft)" : "transparent",
                        color: "var(--dp-text-muted)",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div style={{ padding: "8px 0 4px" }}>
                  {dreams.map(function (dream, i) {
                    var synced = isDreamSynced(dream.id);
                    return (
                      <div key={dream.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "11px 16px",
                        borderBottom: i < dreams.length - 1 ? "1px solid var(--dp-glass-border)" : "none",
                      }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%",
                          background: dream.color || BRAND.purple,
                          boxShadow: "0 0 6px " + (dream.color || BRAND.purple) + "40",
                          flexShrink: 0,
                        }} />
                        <span style={{
                          flex: 1, fontSize: 14, fontWeight: 500,
                          color: synced ? "var(--dp-text)" : "var(--dp-text-muted)",
                          transition: "color 0.2s",
                        }}>
                          {dream.title}
                        </span>
                        <Toggle
                          on={synced}
                          onToggle={function () { handleToggleDream(dream.id); }}
                          color={dream.color || BRAND.purple}
                        />
                      </div>
                    );
                  })}
                </div>

                {allSelected && (
                  <div style={{ padding: "0 16px 12px" }}>
                    <p style={{ fontSize: 12, color: "var(--dp-text-muted)", margin: 0, fontStyle: "italic" }}>
                      All dreams are synced. Toggle individual dreams to sync selectively.
                    </p>
                  </div>
                )}
              </GlassCard>
            )}

            {syncTasks && dreams.length === 0 && (
              <GlassCard padding={16} mb={12}>
                <p style={{ fontSize: 13, color: "var(--dp-text-muted)", margin: 0, textAlign: "center" }}>
                  No active dreams found. Create a dream to configure selective sync.
                </p>
              </GlassCard>
            )}

            {/* ── Last Synced + Sync Now ── */}
            <GlassCard padding={16} mb={12}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text)" }}>Last synced</div>
                  <div style={{ fontSize: 12, color: "var(--dp-text-muted)", marginTop: 2 }}>
                    {lastSyncAt
                      ? lastSyncAt.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "Never synced"}
                  </div>
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  style={{
                    padding: "8px 16px", borderRadius: 10, border: "none",
                    background: "var(--dp-accent-soft)",
                    color: "var(--dp-accent)",
                    fontSize: 13, fontWeight: 600, cursor: syncing ? "default" : "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                    opacity: syncing ? 0.7 : 1, transition: "opacity 0.2s",
                  }}
                >
                  <RefreshCw size={14} style={syncing ? { animation: "gsSpin 1s linear infinite" } : {}} />
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
            </GlassCard>

            {/* ── Save Button ── */}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
                background: dirty
                  ? "linear-gradient(135deg, " + BRAND.purple + ", " + BRAND.blueLight + ")"
                  : "var(--dp-accent-soft)",
                color: dirty ? "#fff" : "var(--dp-text-muted)",
                fontSize: 15, fontWeight: 600, cursor: dirty ? "pointer" : "default",
                fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: dirty ? "0 4px 16px rgba(139,92,246,0.3)" : "none",
                transition: "all 0.3s",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <>
                  <RefreshCw size={16} style={{ animation: "gsSpin 1s linear infinite" }} />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  {dirty ? "Save Settings" : "Settings Saved"}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </PageLayout>
  );
}
