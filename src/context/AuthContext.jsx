import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { apiGet, apiPost, apiDelete, setToken, getToken, clearAuth, initToken, refreshAccessToken } from "../services/api";
import { AUTH, USERS } from "../services/endpoints";
import { subscribeToPush } from "../services/pushNotifications";

var AuthContext = createContext(null);

// Subscription tier order for comparison
var TIER_ORDER = { free: 0, premium: 1, pro: 2 };

export function AuthProvider({ children }) {
  var [user, setUser] = useState(null);
  var [isLoading, setIsLoading] = useState(true);
  var [isAuthenticated, setIsAuthenticated] = useState(false);
  var navigate = useNavigate();

  // ─── Fetch current user profile ───────────────────────────────
  var fetchUser = useCallback(function () {
    return apiGet(USERS.ME).then(function (data) {
      setUser(data);
      setIsAuthenticated(true);
      // Register for push notifications after auth
      try {
        subscribeToPush().catch(function () {});
      } catch (e) {
        // Push registration is non-critical — silent fallback
      }
      return data;
    });
  }, []);

  // ─── On mount: restore session ─────────────────────────────────
  useEffect(function () {
    if (Capacitor.isNativePlatform()) {
      // Native: load access token from Preferences, then fetch user
      initToken().then(function (token) {
        if (token) return fetchUser();
        throw new Error("No token");
      }).catch(function () {
        // Try refreshing with stored refresh token
        return refreshAccessToken().then(function () {
          return fetchUser();
        });
      }).catch(function () {
        setIsAuthenticated(false);
        setUser(null);
      }).finally(function () {
        setIsLoading(false);
      });
    } else {
      // Web: access token is memory-only, attempt silent refresh via httpOnly cookie
      initToken().then(function (legacyToken) {
        if (legacyToken) {
          // Legacy token found during migration — try using it directly
          return fetchUser();
        }
        // No legacy token — try silent refresh via httpOnly refresh cookie
        return refreshAccessToken().then(function () {
          return fetchUser();
        });
      }).catch(function () {
        setIsAuthenticated(false);
        setUser(null);
      }).finally(function () {
        setIsLoading(false);
      });
    }
  }, [fetchUser]);

  // ─── Login ────────────────────────────────────────────────────
  var login = useCallback(function (email, password) {
    return apiPost(AUTH.LOGIN, { email: email, password: password })
      .then(function (data) {
        // 2FA required — backend returns challenge token instead of JWT
        if (data.tfaRequired) {
          return { tfaRequired: true, challengeToken: data.challengeToken };
        }
        // JWT mode: backend returns { access: "...", refresh?: "..." }
        // Refresh token is also set as httpOnly cookie on web
        // Legacy fallback: { key: "..." } from DRF Token auth
        var access = data.access || data.accessToken || data.key || data.token;
        if (!access) throw new Error("No token received");
        setToken(access, data.refresh);
        return fetchUser();
      });
  }, [fetchUser]);

  // ─── Register ─────────────────────────────────────────────────
  var register = useCallback(function (email, password1, password2, displayName) {
    return apiPost(AUTH.REGISTER, {
      email: email,
      password1: password1,
      password2: password2,
      display_name: displayName,
    }).then(function (data) {
      var access = data.access || data.accessToken || data.key || data.token;
      if (access) {
        setToken(access, data.refresh);
        return fetchUser();
      }
      return data;
    });
  }, [fetchUser]);

  // ─── Social login (Google / Apple) ────────────────────────────
  var socialLogin = useCallback(function (provider, accessToken) {
    var url = provider === "apple" ? AUTH.APPLE : AUTH.GOOGLE;
    return apiPost(url, { access_token: accessToken })
      .then(function (data) {
        var access = data.access || data.accessToken || data.key || data.token;
        if (!access) throw new Error("No token received");
        setToken(access, data.refresh);
        return fetchUser();
      });
  }, [fetchUser]);

  // ─── Logout ───────────────────────────────────────────────────
  var logout = useCallback(function () {
    return apiPost(AUTH.LOGOUT)
      .catch(function () { /* ignore errors on logout */ })
      .finally(function () {
        clearAuth();
        setUser(null);
        setIsAuthenticated(false);
        navigate("/login");
      });
  }, [navigate]);

  // ─── Refresh user data ────────────────────────────────────────
  var refreshUser = useCallback(function () {
    return fetchUser().catch(function () {});
  }, [fetchUser]);

  // ─── Optimistic user update ───────────────────────────────────
  var updateUser = useCallback(function (partial) {
    setUser(function (prev) {
      if (!prev) return prev;
      return Object.assign({}, prev, partial);
    });
  }, []);

  // ─── Subscription check helper ────────────────────────────────
  var hasSubscription = useCallback(function (requiredTier) {
    if (!user) return false;
    var userTier = (user.subscription || "free").toLowerCase();
    return (TIER_ORDER[userTier] || 0) >= (TIER_ORDER[requiredTier] || 0);
  }, [user]);

  // ─── Complete onboarding ──────────────────────────────────────
  var completeOnboarding = useCallback(function () {
    return apiPost(USERS.COMPLETE_ONBOARDING).then(function () {
      setUser(function (prev) {
        if (!prev) return prev;
        return Object.assign({}, prev, { hasOnboarded: true });
      });
    });
  }, []);

  // ─── Change email ─────────────────────────────────────────────
  var changeEmail = useCallback(function (newEmail, password) {
    return apiPost(USERS.CHANGE_EMAIL, { new_email: newEmail, password: password });
  }, []);

  // ─── Delete account (GDPR) ────────────────────────────────────
  var deleteAccount = useCallback(function (password) {
    return apiDelete(USERS.DELETE_ACCOUNT, { body: { password: password } })
      .then(function () {
        clearAuth();
        setUser(null);
        setIsAuthenticated(false);
        navigate("/login");
      });
  }, [navigate]);

  // Expose the current auth token so consumers can use it (e.g. WebSocket connections)
  var token = isAuthenticated ? getToken() : null;

  var value = {
    user: user,
    token: token,
    isLoading: isLoading,
    isAuthenticated: isAuthenticated,
    login: login,
    register: register,
    socialLogin: socialLogin,
    logout: logout,
    refreshUser: refreshUser,
    updateUser: updateUser,
    hasSubscription: hasSubscription,
    completeOnboarding: completeOnboarding,
    changeEmail: changeEmail,
    deleteAccount: deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  var ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
