import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { setupKeyboard } from './services/native';
import { initToken } from './services/api';
import { setupPushListeners, createTaskCallChannel, createDefaultNotificationChannel, createBuddyCallChannel, registerTaskCallActions, requestLocalNotificationPermission, showForegroundNotification } from './services/nativeNotifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { ThemeProvider } from './context/ThemeContext';
import { TaskCallProvider } from './context/TaskCallContext';
import { ToastProvider } from './context/ToastContext';
import { NetworkProvider } from './context/NetworkContext';
import App from './App';
import './styles/globals.css';

var queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,    // 2 minutes before refetch
      gcTime: 1000 * 60 * 5,        // Garbage collect unused queries after 5 min
      retry: 1,                      // Retry failed requests once
      refetchOnWindowFocus: false,   // Don't refetch on tab focus
    },
  },
});

// Native platform setup
if (Capacitor.isNativePlatform()) {
  // Android hardware back button handler
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else CapApp.exitApp();
  });

  // Deep link handler — OAuth callbacks, Stripe returns, notification taps
  CapApp.addListener('appUrlOpen', ({ url }) => {
    if (!url) return;
    try {
      var parsed = new URL(url);
      var path = parsed.host + parsed.pathname;
      var hash = parsed.hash || "";
      var search = parsed.search || "";

      if (path.includes("auth/google/callback")) {
        var params = new URLSearchParams(hash.replace("#", "") || search.replace("?", ""));
        var accessToken = params.get("access_token");
        if (accessToken) {
          window.dispatchEvent(new CustomEvent("dp-oauth-callback", { detail: { provider: "google", token: accessToken } }));
        }
      } else if (path.includes("auth/apple/callback")) {
        var appleParams = new URLSearchParams(search.replace("?", ""));
        var idToken = appleParams.get("id_token");
        if (idToken) {
          window.dispatchEvent(new CustomEvent("dp-oauth-callback", { detail: { provider: "apple", token: idToken } }));
        }
      } else if (path.includes("stripe/return")) {
        window.location.hash = "#/subscription";
      } else if (path.includes("calendar/callback")) {
        var calParams = new URLSearchParams(search.replace("?", ""));
        var code = calParams.get("code");
        if (code) window.location.hash = "#/calendar-connect?code=" + code;
      } else if (path.includes("notification")) {
        var notifParams = new URLSearchParams(search.replace("?", ""));
        var route = notifParams.get("route");
        if (route) window.location.hash = "#" + route;
      }
    } catch (e) {
      console.warn("Deep link parse error:", e);
    }
  });

  // App lifecycle events for WebSocket reconnection
  CapApp.addListener('appStateChange', ({ isActive }) => {
    window.dispatchEvent(new CustomEvent(isActive ? "dp-app-resume" : "dp-app-pause"));
  });

  // Setup native keyboard
  setupKeyboard();

  // Setup native push notification listeners
  setupPushListeners({
    onNotification: function (n) {
      // Handle incoming call notification while app is in foreground
      if (n.data && n.data.type === "incoming_call") {
        window.dispatchEvent(new CustomEvent("dp-incoming-call", {
          detail: {
            callId: n.data.call_id,
            callerId: n.data.caller_id,
            callerName: n.data.caller_name,
            callType: n.data.call_type,
          },
        }));
        // Also show local notification with ringtone sound + vibration
        showForegroundNotification(n);
        return;
      }
      // Show local notification with sound for all other push types in foreground
      showForegroundNotification(n);
    },
    onAction: function (a) {
      // Handle incoming call notification tap (app was in background)
      if (a.data && a.data.type === "incoming_call") {
        var callType = a.data.call_type || "voice";
        var route = callType === "video"
          ? "/video-call/" + a.data.call_id + "?answering=true&buddyName=" + encodeURIComponent(a.data.caller_name || "")
          : "/voice-call/" + a.data.call_id + "?answering=true&buddyName=" + encodeURIComponent(a.data.caller_name || "");
        window.location.hash = "#" + route;
        return;
      }
      if (a.data && a.data.route) window.location.hash = "#" + a.data.route;
    },
  });

  // Setup notification channels + actions (local notifications)
  requestLocalNotificationPermission().then(function () {
    createDefaultNotificationChannel();
    createBuddyCallChannel();
    createTaskCallChannel();
    registerTaskCallActions();
  });
}

// Load token from Capacitor Preferences before rendering
initToken().then(function () {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <I18nProvider>
              <ThemeProvider>
                <TaskCallProvider>
                  <ToastProvider>
                    <NetworkProvider>
                      <App />
                    </NetworkProvider>
                  </ToastProvider>
                </TaskCallProvider>
              </ThemeProvider>
            </I18nProvider>
          </AuthProvider>
        </QueryClientProvider>
      </HashRouter>
    </React.StrictMode>
  );
});
