import { Routes, Route } from "react-router-dom";
import { lazy, Suspense, useState, useCallback, useEffect } from "react";
import PageTransition from "./components/shared/PageTransition";
import ThemeBackground from "./components/shared/ThemeBackground";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import SplashScreen from "./components/shared/SplashScreen";
import OfflineBanner from "./components/shared/OfflineBanner";
import TaskCallOverlay from "./components/shared/TaskCallOverlay";
import IncomingCallOverlay from "./components/shared/IncomingCallOverlay";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./context/ToastContext";
import { useTaskCall } from "./context/TaskCallContext";
import useNotificationSocket from "./hooks/useNotificationSocket";
import { Capacitor } from "@capacitor/core";
import { apiGet } from "./services/api";
import { CALENDAR } from "./services/endpoints";
import { scheduleTaskNotifications } from "./services/taskScheduler";

// Always loaded — core screen
import HomeScreen from "./pages/home/HomeScreen";

// Lazy — Auth
var LoginScreen = lazy(function () { return import("./pages/auth/LoginScreen"); });
var RegisterScreen = lazy(function () { return import("./pages/auth/RegisterScreen"); });
var ForgotPasswordScreen = lazy(function () { return import("./pages/auth/ForgotPasswordScreen"); });
var ChangePasswordScreen = lazy(function () { return import("./pages/auth/ChangePasswordScreen"); });

// Lazy — Chat
var ConversationList = lazy(function () { return import("./pages/chat/ConversationList"); });
var AIChatScreen = lazy(function () { return import("./pages/chat/AIChatScreen"); });
var BuddyChatScreen = lazy(function () { return import("./pages/chat/BuddyChatScreen"); });
var NewChatScreen = lazy(function () { return import("./pages/chat/NewChatScreen"); });
var VoiceCallScreen = lazy(function () { return import("./pages/chat/VoiceCallScreen"); });
var VideoCallScreen = lazy(function () { return import("./pages/chat/VideoCallScreen"); });
var CallHistoryScreen = lazy(function () { return import("./pages/chat/CallHistoryScreen"); });

// Lazy — Dreams
var DreamCreateScreen = lazy(function () { return import("./pages/dreams/DreamCreateScreen"); });
var DreamEditScreen = lazy(function () { return import("./pages/dreams/DreamEditScreen"); });
var DreamDetail = lazy(function () { return import("./pages/dreams/DreamDetail"); });
var DreamTemplatesScreen = lazy(function () { return import("./pages/dreams/DreamTemplatesScreen"); });
var CalibrationScreen = lazy(function () { return import("./pages/dreams/CalibrationScreen"); });
var VisionBoardScreen = lazy(function () { return import("./pages/dreams/VisionBoardScreen"); });
var MicroStartScreen = lazy(function () { return import("./pages/dreams/MicroStartScreen"); });
var SharedDreamsScreen = lazy(function () { return import("./pages/dreams/SharedDreamsScreen"); });

// Lazy — Social
var SocialHub = lazy(function () { return import("./pages/social/SocialHub"); });
var FindBuddy = lazy(function () { return import("./pages/social/FindBuddy"); });
var LeaderboardScreen = lazy(function () { return import("./pages/social/LeaderboardScreen"); });
var UserSearchScreen = lazy(function () { return import("./pages/social/UserSearchScreen"); });
var FriendRequestsScreen = lazy(function () { return import("./pages/social/FriendRequestsScreen"); });
var OnlineFriendsScreen = lazy(function () { return import("./pages/social/OnlineFriendsScreen"); });
var UserProfileScreen = lazy(function () { return import("./pages/social/UserProfileScreen"); });
var CirclesScreen = lazy(function () { return import("./pages/social/CirclesScreen"); });
var CircleDetailScreen = lazy(function () { return import("./pages/social/CircleDetailScreen"); });
var CircleCreateScreen = lazy(function () { return import("./pages/social/CircleCreateScreen"); });
var CircleInvitationsScreen = lazy(function () { return import("./pages/social/CircleInvitationsScreen"); });
var CircleChatScreen = lazy(function () { return import("./pages/chat/CircleChatScreen"); });
var SeasonsScreen = lazy(function () { return import("./pages/social/SeasonsScreen"); });
var BuddyRequestsScreen = lazy(function () { return import("./pages/social/BuddyRequestsScreen"); });
var DreamPostsFeedScreen = lazy(function () { return import("./pages/social/DreamPostsFeedScreen"); });

// Lazy — Calendar
var CalendarScreen = lazy(function () { return import("./pages/calendar/CalendarScreen"); });
var GoogleCalendarConnect = lazy(function () { return import("./pages/calendar/GoogleCalendarConnect"); });
var TimeBlocksScreen = lazy(function () { return import("./pages/calendar/TimeBlocksScreen"); });

// Lazy — Profile
var ProfileScreen = lazy(function () { return import("./pages/profile/ProfileScreen"); });
var SettingsScreen = lazy(function () { return import("./pages/profile/SettingsScreen"); });
var EditProfileScreen = lazy(function () { return import("./pages/profile/EditProfileScreen"); });
var AchievementsScreen = lazy(function () { return import("./pages/profile/AchievementsScreen"); });
var TermsOfServiceScreen = lazy(function () { return import("./pages/profile/TermsOfServiceScreen"); });
var PrivacyPolicyScreen = lazy(function () { return import("./pages/profile/PrivacyPolicyScreen"); });
var AppVersionScreen = lazy(function () { return import("./pages/profile/AppVersionScreen"); });
var TwoFactorScreen = lazy(function () { return import("./pages/profile/TwoFactorScreen"); });
var DataExportScreen = lazy(function () { return import("./pages/profile/DataExportScreen"); });
var BlockedUsersScreen = lazy(function () { return import("./pages/profile/BlockedUsersScreen"); });

// Lazy — Store
var StoreScreen = lazy(function () { return import("./pages/store/StoreScreen"); });
var SubscriptionScreen = lazy(function () { return import("./pages/store/SubscriptionScreen"); });
var GiftingScreen = lazy(function () { return import("./pages/store/GiftingScreen"); });

// Lazy — Other
var NotificationsScreen = lazy(function () { return import("./pages/notifications/NotificationsScreen"); });
var OnboardingScreen = lazy(function () { return import("./pages/onboarding/OnboardingScreen"); });

function LoadingFallback() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100dvh", color: "rgba(255,255,255,0.5)",
      fontFamily: "Inter, sans-serif", fontSize: 14,
    }}>
      <div className="dp-spin" style={{
        width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)",
        borderTopColor: "#8B5CF6", borderRadius: "50%",
      }} />
    </div>
  );
}

// Helper to wrap protected routes concisely
function P({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

// Global notification WebSocket — keeps real-time notification count updated + toasts
function NotificationSocketBridge() {
  var { token } = useAuth();
  var { showToast } = useToast();
  var { triggerTaskCall } = useTaskCall();

  useNotificationSocket(token, {
    onToast: function (title, body, data) {
      var msg = body ? title + " — " + body : title;
      // Use "info" for generic, "warning" for calls
      var type = (data && (data.type === "call_rejected" || data.type === "missed_call")) ? "warning" : "info";
      showToast(msg, type, 4000);
    },
    onTaskReminder: function (taskData) {
      triggerTaskCall(taskData);
    },
  });
  return null;
}

// Agora RTM bridge — login on auth, cleanup on logout
function AgoraRTMBridge() {
  var { isAuthenticated } = useAuth();

  useEffect(function () {
    if (!isAuthenticated) return;
    var cancelled = false;

    import("./services/agora").then(function (mod) {
      if (cancelled) return;
      mod.initRTM().catch(function (err) {
        console.error("Agora RTM init failed:", err);
      });
    });

    return function () {
      cancelled = true;
      import("./services/agora").then(function (mod) {
        mod.cleanupRTM();
      }).catch(function () {});
    };
  }, [isAuthenticated]);

  return null;
}

// Wire native push notifications to dispatch incoming call events + task reminders + route navigation
function NativePushBridge() {
  var { isAuthenticated } = useAuth();
  var { triggerTaskCall } = useTaskCall();

  useEffect(function () {
    if (!isAuthenticated) return;
    var cleanupRef = null;

    import("./services/nativeNotifications").then(function (mod) {
      mod.setupPushListeners({
        onNotification: function (notification) {
          var data = notification.data || {};
          // Incoming call from push notification
          if (data.type === "incoming_call") {
            window.dispatchEvent(new CustomEvent("dp-incoming-call", {
              detail: {
                callId: data.callId || data.call_id,
                callerName: data.callerName || data.caller_name || notification.title || "Unknown",
                callType: data.callType || data.call_type || "voice",
                callerId: data.callerId || data.caller_id,
              },
            }));
          }
          // Task reminder from push notification
          var nType = data.notification_type || data.type || "";
          if (nType === "reminder" || nType === "task_due" || nType === "overdue_tasks" || nType === "task_reminder") {
            triggerTaskCall({
              id: data.task_id || data.goal_id || data.notification_id || "",
              title: notification.title || data.title || "Task Due",
              dream: data.dream || data.dream_title || "",
              priority: data.priority || "medium",
              category: data.category || "personal",
              duration: data.duration || "",
            });
          }
        },
        onAction: function (action) {
          var data = action.data || {};
          // Notification tap — navigate to route if specified
          if (data.route) {
            window.location.hash = "#" + data.route;
          }
          // Incoming call accepted from notification tray
          if (data.type === "incoming_call") {
            window.dispatchEvent(new CustomEvent("dp-incoming-call", {
              detail: {
                callId: data.callId || data.call_id,
                callerName: data.callerName || data.caller_name || "Unknown",
                callType: data.callType || data.call_type || "voice",
                callerId: data.callerId || data.caller_id,
              },
            }));
          }
        },
      }).then(function (cleanup) {
        cleanupRef = cleanup;
      });
    }).catch(function () {});

    return function () {
      if (cleanupRef && cleanupRef.remove) cleanupRef.remove();
    };
  }, [isAuthenticated, triggerTaskCall]);

  return null;
}

// Schedule local notifications for today's tasks on login + app resume (native only)
function TaskSchedulerBridge() {
  var { isAuthenticated } = useAuth();

  useEffect(function () {
    if (!isAuthenticated || !Capacitor.isNativePlatform()) return;

    function scheduleTasks() {
      apiGet(CALENDAR.TODAY).then(function (data) {
        var tasks = (data && data.results) || (Array.isArray(data) ? data : []);
        var normalized = [];
        for (var i = 0; i < tasks.length; i++) {
          var t = tasks[i];
          normalized.push({
            id: t.id,
            title: t.title || t.name || "",
            dream: t.dream || t.dreamTitle || t.dream_title || "",
            startTime: t.startTime || t.start_time || t.time || "",
            date: t.date || t.scheduledDate || t.scheduled_date || "",
            done: t.done || t.completed || t.status === "completed",
            priority: t.priority || "medium",
            category: t.category || "personal",
            durationMins: t.durationMins || t.duration_mins || t.duration || "",
          });
        }
        scheduleTaskNotifications(normalized);
      }).catch(function () {});
    }

    scheduleTasks();

    // Re-schedule when app resumes from background
    function handleResume() { scheduleTasks(); }
    window.addEventListener("dp-app-resume", handleResume);
    return function () { window.removeEventListener("dp-app-resume", handleResume); };
  }, [isAuthenticated]);

  return null;
}

export default function App() {
  var [splashDone, setSplashDone] = useState(function () {
    return !!sessionStorage.getItem("dp-splash-shown");
  });

  var handleSplashDone = useCallback(function () {
    sessionStorage.setItem("dp-splash-shown", "1");
    setSplashDone(true);
  }, []);

  return (
    <>
    {!splashDone && <SplashScreen onDone={handleSplashDone} />}
    <ThemeBackground />
    <OfflineBanner />
    <NotificationSocketBridge />
    <AgoraRTMBridge />
    <NativePushBridge />
    <TaskSchedulerBridge />
    <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
    <PageTransition>
      <Routes>
        {/* Public routes — no auth required */}
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/change-password" element={<ChangePasswordScreen />} />
        <Route path="/terms" element={<TermsOfServiceScreen />} />
        <Route path="/privacy" element={<PrivacyPolicyScreen />} />

        {/* Protected routes — auth required */}
        <Route path="/" element={<P><HomeScreen /></P>} />

        {/* Chat */}
        <Route path="/conversations" element={<P><ConversationList /></P>} />
        <Route path="/chat" element={<P><NewChatScreen /></P>} />
        <Route path="/chat/:id" element={<P><AIChatScreen /></P>} />
        <Route path="/buddy-chat/:id" element={<P><BuddyChatScreen /></P>} />
        <Route path="/voice-call/:id" element={<P><VoiceCallScreen /></P>} />
        <Route path="/video-call/:id" element={<P><VideoCallScreen /></P>} />
        <Route path="/calls/history" element={<P><CallHistoryScreen /></P>} />

        {/* Dreams */}
        <Route path="/dream/create" element={<P><DreamCreateScreen /></P>} />
        <Route path="/dream/templates" element={<P><DreamTemplatesScreen /></P>} />
        <Route path="/dream/:id" element={<P><DreamDetail /></P>} />
        <Route path="/dream/:id/edit" element={<P><DreamEditScreen /></P>} />
        <Route path="/dream/:id/calibration" element={<P><CalibrationScreen /></P>} />
        <Route path="/vision-board" element={<P><VisionBoardScreen /></P>} />
        <Route path="/micro-start/:dreamId" element={<P><MicroStartScreen /></P>} />
        <Route path="/dreams/shared" element={<P><SharedDreamsScreen /></P>} />

        {/* Social */}
        <Route path="/social" element={<P><SocialHub /></P>} />
        <Route path="/find-buddy" element={<P><FindBuddy /></P>} />
        <Route path="/leaderboard" element={<P><LeaderboardScreen /></P>} />
        <Route path="/search" element={<P><UserSearchScreen /></P>} />
        <Route path="/friend-requests" element={<P><FriendRequestsScreen /></P>} />
        <Route path="/online-friends" element={<P><OnlineFriendsScreen /></P>} />
        <Route path="/user/:id" element={<P><UserProfileScreen /></P>} />
        <Route path="/circles" element={<P><CirclesScreen /></P>} />
        <Route path="/circle/:id" element={<P><CircleDetailScreen /></P>} />
        <Route path="/circles/create" element={<P><CircleCreateScreen /></P>} />
        <Route path="/circle/:id/invitations" element={<P><CircleInvitationsScreen /></P>} />
        <Route path="/circle-chat/:id" element={<P><CircleChatScreen /></P>} />
        <Route path="/seasons" element={<P><SeasonsScreen /></P>} />
        <Route path="/buddy-requests" element={<P><BuddyRequestsScreen /></P>} />
        <Route path="/social/feed" element={<P><DreamPostsFeedScreen /></P>} />

        {/* Calendar */}
        <Route path="/calendar" element={<P><CalendarScreen /></P>} />
        <Route path="/calendar-connect" element={<P><GoogleCalendarConnect /></P>} />
        <Route path="/calendar/timeblocks" element={<P><TimeBlocksScreen /></P>} />

        {/* Profile */}
        <Route path="/profile" element={<P><ProfileScreen /></P>} />
        <Route path="/settings" element={<P><SettingsScreen /></P>} />
        <Route path="/edit-profile" element={<P><EditProfileScreen /></P>} />
        <Route path="/achievements" element={<P><AchievementsScreen /></P>} />
        <Route path="/app-version" element={<P><AppVersionScreen /></P>} />
        <Route path="/settings/2fa" element={<P><TwoFactorScreen /></P>} />
        <Route path="/settings/export" element={<P><DataExportScreen /></P>} />
        <Route path="/settings/blocked" element={<P><BlockedUsersScreen /></P>} />

        {/* Store */}
        <Route path="/store" element={<P><StoreScreen /></P>} />
        <Route path="/subscription" element={<P><SubscriptionScreen /></P>} />
        <Route path="/store/gifts" element={<P><GiftingScreen /></P>} />

        {/* Notifications */}
        <Route path="/notifications" element={<P><NotificationsScreen /></P>} />
      </Routes>
    </PageTransition>
    </Suspense>
    </ErrorBoundary>
    <TaskCallOverlay />
    <IncomingCallOverlay />
    </>
  );
}
