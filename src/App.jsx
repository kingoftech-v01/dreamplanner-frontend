import { Routes, Route } from "react-router-dom";
import { lazy, Suspense, useState, useCallback } from "react";
import PageTransition from "./components/shared/PageTransition";
import ThemeBackground from "./components/shared/ThemeBackground";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import SplashScreen from "./components/shared/SplashScreen";
import OfflineBanner from "./components/shared/OfflineBanner";
import TaskCallOverlay from "./components/shared/TaskCallOverlay";

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

// Lazy — Dreams
var DreamCreateScreen = lazy(function () { return import("./pages/dreams/DreamCreateScreen"); });
var DreamEditScreen = lazy(function () { return import("./pages/dreams/DreamEditScreen"); });
var DreamDetail = lazy(function () { return import("./pages/dreams/DreamDetail"); });
var DreamTemplatesScreen = lazy(function () { return import("./pages/dreams/DreamTemplatesScreen"); });
var CalibrationScreen = lazy(function () { return import("./pages/dreams/CalibrationScreen"); });
var VisionBoardScreen = lazy(function () { return import("./pages/dreams/VisionBoardScreen"); });
var MicroStartScreen = lazy(function () { return import("./pages/dreams/MicroStartScreen"); });

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

// Lazy — Calendar
var CalendarScreen = lazy(function () { return import("./pages/calendar/CalendarScreen"); });
var GoogleCalendarConnect = lazy(function () { return import("./pages/calendar/GoogleCalendarConnect"); });

// Lazy — Profile
var ProfileScreen = lazy(function () { return import("./pages/profile/ProfileScreen"); });
var SettingsScreen = lazy(function () { return import("./pages/profile/SettingsScreen"); });
var EditProfileScreen = lazy(function () { return import("./pages/profile/EditProfileScreen"); });
var AchievementsScreen = lazy(function () { return import("./pages/profile/AchievementsScreen"); });
var TermsOfServiceScreen = lazy(function () { return import("./pages/profile/TermsOfServiceScreen"); });
var PrivacyPolicyScreen = lazy(function () { return import("./pages/profile/PrivacyPolicyScreen"); });
var AppVersionScreen = lazy(function () { return import("./pages/profile/AppVersionScreen"); });

// Lazy — Store
var StoreScreen = lazy(function () { return import("./pages/store/StoreScreen"); });
var SubscriptionScreen = lazy(function () { return import("./pages/store/SubscriptionScreen"); });

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
    <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
    <PageTransition>
      <Routes>
        {/* Onboarding */}
        <Route path="/onboarding" element={<OnboardingScreen />} />

        {/* Auth */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/change-password" element={<ChangePasswordScreen />} />

        {/* Main */}
        <Route path="/" element={<HomeScreen />} />

        {/* Chat */}
        <Route path="/conversations" element={<ConversationList />} />
        <Route path="/chat" element={<NewChatScreen />} />
        <Route path="/chat/:id" element={<AIChatScreen />} />
        <Route path="/buddy-chat/:id" element={<BuddyChatScreen />} />
        <Route path="/voice-call/:id" element={<VoiceCallScreen />} />
        <Route path="/video-call/:id" element={<VideoCallScreen />} />

        {/* Dreams */}
        <Route path="/dream/create" element={<DreamCreateScreen />} />
        <Route path="/dream/templates" element={<DreamTemplatesScreen />} />
        <Route path="/dream/:id" element={<DreamDetail />} />
        <Route path="/dream/:id/edit" element={<DreamEditScreen />} />
        <Route path="/dream/:id/calibration" element={<CalibrationScreen />} />
        <Route path="/vision-board" element={<VisionBoardScreen />} />
        <Route path="/micro-start/:dreamId" element={<MicroStartScreen />} />

        {/* Social */}
        <Route path="/social" element={<SocialHub />} />
        <Route path="/find-buddy" element={<FindBuddy />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="/search" element={<UserSearchScreen />} />
        <Route path="/friend-requests" element={<FriendRequestsScreen />} />
        <Route path="/online-friends" element={<OnlineFriendsScreen />} />
        <Route path="/user/:id" element={<UserProfileScreen />} />
        <Route path="/circles" element={<CirclesScreen />} />
        <Route path="/circle/:id" element={<CircleDetailScreen />} />

        {/* Calendar */}
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="/calendar-connect" element={<GoogleCalendarConnect />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/edit-profile" element={<EditProfileScreen />} />
        <Route path="/achievements" element={<AchievementsScreen />} />
        <Route path="/app-version" element={<AppVersionScreen />} />
        <Route path="/terms" element={<TermsOfServiceScreen />} />
        <Route path="/privacy" element={<PrivacyPolicyScreen />} />

        {/* Store */}
        <Route path="/store" element={<StoreScreen />} />
        <Route path="/subscription" element={<SubscriptionScreen />} />

        {/* Notifications */}
        <Route path="/notifications" element={<NotificationsScreen />} />
      </Routes>
    </PageTransition>
    </Suspense>
    </ErrorBoundary>
    <TaskCallOverlay />
    </>
  );
}
