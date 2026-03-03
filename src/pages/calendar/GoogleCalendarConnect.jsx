import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Check, RefreshCw, LogOut, ChevronRight } from "lucide-react";
import PageLayout from "../../components/shared/PageLayout";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useT } from "../../context/I18nContext";
import { apiGet, apiPost } from "../../services/api";
import { CALENDAR } from "../../services/endpoints";
import { openBrowser, isNative } from "../../services/native";
import { BRAND, adaptColor } from "../../styles/colors";
import IconButton from "../../components/shared/IconButton";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GlassCard from "../../components/shared/GlassCard";

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

export default function GoogleCalendarConnect() {
  var navigate = useNavigate();
  var { resolved } = useTheme();
  var isLight = resolved === "light";
  var { showToast } = useToast();
  var { t } = useT();
  var queryClient = useQueryClient();

  var [connected, setConnected] = useState(false);
  var [connecting, setConnecting] = useState(false);
  var [calendars, setCalendars] = useState([]);
  var [lastSync, setLastSync] = useState(null);

  // ── Query connection status ──
  var statusQuery = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: function () { return apiGet(CALENDAR.GOOGLE.STATUS); },
  });

  // Sync local state from status query
  useEffect(function () {
    if (statusQuery.data) {
      var data = statusQuery.data;
      if (data.connected) {
        setConnected(true);
        if (data.calendars && data.calendars.length > 0) {
          setCalendars(data.calendars);
        }
        if (data.lastSync) {
          setLastSync(new Date(data.lastSync));
        }
      } else {
        setConnected(false);
      }
    }
  }, [statusQuery.data]);

  // ── Handle OAuth callback code on mount ──
  var callbackMut = useMutation({
    mutationFn: function (payload) { return apiPost(CALENDAR.GOOGLE.CALLBACK, payload); },
    onSuccess: function () {
      setConnecting(false);
      queryClient.invalidateQueries({ queryKey: ["google-calendar-status"] });
      showToast(t("calendar.connectedToast"), "success");
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: function (err) {
      setConnecting(false);
      showToast(err.message || t("calendar.connectFailed"), "error");
    },
  });

  useEffect(function () {
    // On HashRouter the query string is inside the hash: #/calendar-connect?code=xxx
    var hash = window.location.hash || "";
    var hashQuery = hash.indexOf("?") !== -1 ? hash.substring(hash.indexOf("?")) : "";
    var params = new URLSearchParams(hashQuery || window.location.search);
    var code = params.get("code");
    if (code) {
      setConnecting(true);
      // On native, pass the native redirect_uri so the backend uses the correct one for token exchange
      var payload = { code: code };
      if (isNative) {
        payload.redirect_uri = (import.meta.env.VITE_API_BASE || "") + CALENDAR.GOOGLE.NATIVE_CALLBACK;
      }
      callbackMut.mutate(payload);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync mutation ──
  var syncMut = useMutation({
    mutationFn: function () { return apiPost(CALENDAR.GOOGLE.SYNC); },
    onSuccess: function () {
      setLastSync(new Date());
      queryClient.invalidateQueries({ queryKey: ["google-calendar-status"] });
      showToast(t("calendar.syncedToast"), "success");
    },
    onError: function (err) {
      showToast(err.message || t("calendar.syncFailed"), "error");
    },
  });

  // ── Disconnect mutation ──
  var disconnectMut = useMutation({
    mutationFn: function () { return apiPost(CALENDAR.GOOGLE.DISCONNECT); },
    onSuccess: function () {
      setConnected(false);
      setLastSync(null);
      setCalendars([]);
      queryClient.invalidateQueries({ queryKey: ["google-calendar-status"] });
      showToast(t("calendar.disconnectedToast"), "info");
    },
    onError: function (err) {
      showToast(err.message || t("calendar.disconnectFailed"), "error");
    },
  });

  var handleConnect = function () {
    setConnecting(true);
    // On native, use the backend's native-callback endpoint as redirect_uri
    // so Google redirects there, and it redirects to the custom scheme
    var authUrl = CALENDAR.GOOGLE.AUTH;
    if (isNative) {
      var nativeRedirect = (import.meta.env.VITE_API_BASE || "") + CALENDAR.GOOGLE.NATIVE_CALLBACK;
      authUrl += "?redirect_uri=" + encodeURIComponent(nativeRedirect);
    }
    apiGet(authUrl)
      .then(function (data) {
        if (data.authUrl && (function(u){ try { var p = new URL(u); return p.protocol === "https:" && (p.hostname === "accounts.google.com" || p.hostname.endsWith(".accounts.google.com")); } catch(e){ return false; } })(data.authUrl)) {
          if (isNative) {
            openBrowser(data.authUrl);
          } else {
            window.location.href = data.authUrl;
          }
        } else {
          setConnecting(false);
          showToast(t("calendar.authFailed"), "error");
        }
      })
      .catch(function (err) {
        setConnecting(false);
        var msg = (err.message || "").toLowerCase().includes("501")
          ? t("calendar.notAvailable")
          : (err.message || t("calendar.authFailed"));
        showToast(msg, "error");
      });
  };

  var handleSync = function () { syncMut.mutate(); };

  var handleDisconnect = function () { disconnectMut.mutate(); };

  var syncing = syncMut.isPending;
  var disconnecting = disconnectMut.isPending;

  var toggleCalendar = function (id) {
    setCalendars(function (prev) {
      return prev.map(function (c) {
        return c.id === id ? Object.assign({}, c, { enabled: !c.enabled }) : c;
      });
    });
  };

  return (
    <PageLayout showNav={false} header={
      <GlassAppBar
        left={<IconButton icon={ArrowLeft} onClick={function () { navigate(-1); }} />}
        title={t("calendar.googleCalendar")}
      />
    }>
      <style>{`
        @keyframes gcSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes gcPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <div style={{ paddingBottom: 40, minHeight: "100vh" }}>

        {/* Calendar Icon */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24, margin: "0 auto 16px",
            background: "var(--dp-accent-soft)",
            border: "1px solid var(--dp-glass-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Calendar size={36} color={adaptColor(BRAND.blueLight, isLight)} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--dp-text)", margin: "0 0 6px" }}>
            {connected ? t("calendar.calendarConnected") : t("calendar.syncCalendar")}
          </h2>
          <p style={{ fontSize: 13, color: "var(--dp-text-tertiary)", margin: 0, lineHeight: 1.5, maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
            {connected
              ? t("calendar.connectedDesc")
              : t("calendar.connectDesc")}
          </p>
        </div>

        {!connected ? (
          /* NOT CONNECTED STATE */
          <>
            {/* Features list */}
            <GlassCard padding={18} mb={16}>
              {[
                { text: t("calendar.syncDeadlines"), color: BRAND.purple },
                { text: t("calendar.seeTasks"), color: BRAND.greenSolid },
                { text: t("calendar.getReminders"), color: BRAND.orange },
              ].map(function (f, i) {
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: i < 2 ? ("1px solid var(--dp-glass-border)") : "none",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: f.color + "15", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Check size={14} color={f.color} strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 13, color: "var(--dp-text-primary)", fontWeight: 500 }}>{f.text}</span>
                  </div>
                );
              })}
            </GlassCard>

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={connecting}
              style={{
                width: "100%", padding: "15px 0", borderRadius: 16, border: "none",
                background: connecting
                  ? "var(--dp-accent-soft)"
                  : "linear-gradient(135deg, #4285F4, #3367D6)",
                color: connecting ? "var(--dp-text-muted)" : "#fff",
                fontSize: 15, fontWeight: 600, cursor: connecting ? "default" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: connecting ? "none" : "0 4px 16px rgba(66,133,244,0.3)",
                transition: "all 0.3s",
              }}
            >
              {connecting ? (
                <>
                  <RefreshCw size={18} style={{ animation: "gcSpin 1s linear infinite" }} />
                  {t("calendar.connecting")}
                </>
              ) : (
                <>
                  <svg width={18} height={18} viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  {t("calendar.connectWithGoogle")}
                </>
              )}
            </button>
          </>
        ) : (
          /* CONNECTED STATE */
          <>
            {/* Account info */}
            <GlassCard padding={16} mb={12} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 14,
                background: "linear-gradient(135deg, #4285F4, #3367D6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: "#fff",
              }}>{(statusQuery.data?.email || "G")[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dp-text)" }}>{statusQuery.data?.email || t("calendar.googleAccount")}</div>
                <div style={{ fontSize: 12, color: adaptColor(BRAND.green, isLight), fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                  <Check size={12} strokeWidth={3} /> {t("calendar.connected")}
                </div>
              </div>
            </GlassCard>

            {/* Calendars */}
            <GlassCard mb={12} style={{ overflow: "hidden" }}>
              <div style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--dp-glass-border)",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dp-text-secondary)" }}>{t("calendar.syncCalendars")}</span>
              </div>
              {calendars.map(function (cal, i) {
                return (
                  <div key={cal.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "13px 18px",
                    borderBottom: i < calendars.length - 1 ? ("1px solid var(--dp-glass-border)") : "none",
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: cal.color, boxShadow: "0 0 6px " + cal.color + "40",
                    }} />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--dp-text)" }}>{cal.name}</span>
                    <Toggle on={cal.enabled} onToggle={function () { toggleCalendar(cal.id); }} color={cal.color} />
                  </div>
                );
              })}
            </GlassCard>

            {/* Sync button + last synced */}
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 16, border: "none",
                background: "var(--dp-accent-soft)",
                color: "var(--dp-accent)",
                fontSize: 14, fontWeight: 600, cursor: syncing ? "default" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginBottom: 8, transition: "all 0.2s",
              }}
            >
              <RefreshCw size={16} style={syncing ? { animation: "gcSpin 1s linear infinite" } : {}} />
              {syncing ? t("calendar.syncing") : t("calendar.syncNow")}
            </button>

            {lastSync && (
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <span style={{ fontSize: 12, color: "var(--dp-text-muted)" }}>
                  {t("calendar.lastSynced")} {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )}

            {/* Disconnect */}
            <button
              className="dp-gh"
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 16,
                border: "1px solid var(--dp-glass-border)",
                background: "rgba(246,154,154,0.06)",
                color: adaptColor(BRAND.red, isLight),
                fontSize: 13, fontWeight: 600, cursor: disconnecting ? "default" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: disconnecting ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {disconnecting ? (
                <>
                  <RefreshCw size={14} style={{ animation: "gcSpin 1s linear infinite" }} />
                  {t("calendar.disconnecting")}
                </>
              ) : (
                <>
                  <LogOut size={14} strokeWidth={2} /> {t("calendar.disconnect")}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </PageLayout>
  );
}
