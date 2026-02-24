import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, setToken, getToken, clearAuth } from "../services/api";

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
    return apiGet("/api/users/me/").then(function (data) {
      setUser(data);
      setIsAuthenticated(true);
      return data;
    });
  }, []);

  // ─── On mount: check for existing token ───────────────────────
  useEffect(function () {
    var token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchUser()
      .catch(function () {
        // Token invalid/expired
        clearAuth();
        setIsAuthenticated(false);
        setUser(null);
      })
      .finally(function () {
        setIsLoading(false);
      });
  }, [fetchUser]);

  // ─── Login ────────────────────────────────────────────────────
  var login = useCallback(function (email, password) {
    return apiPost("/api/auth/login/", { email: email, password: password })
      .then(function (data) {
        // Backend returns { key: "token_value" } from dj-rest-auth
        var token = data.key || data.token;
        if (!token) throw new Error("No token received");
        setToken(token);
        return fetchUser();
      });
  }, [fetchUser]);

  // ─── Register ─────────────────────────────────────────────────
  var register = useCallback(function (email, password1, password2, displayName) {
    return apiPost("/api/auth/registration/", {
      email: email,
      password1: password1,
      password2: password2,
      displayName: displayName,
    }).then(function (data) {
      var token = data.key || data.token;
      if (token) {
        setToken(token);
        return fetchUser();
      }
      return data;
    });
  }, [fetchUser]);

  // ─── Social login (Google / Apple) ────────────────────────────
  var socialLogin = useCallback(function (provider, accessToken) {
    var url = provider === "apple"
      ? "/api/auth/apple/"
      : "/api/auth/google/";
    return apiPost(url, { access_token: accessToken })
      .then(function (data) {
        var token = data.key || data.token;
        if (!token) throw new Error("No token received");
        setToken(token);
        return fetchUser();
      });
  }, [fetchUser]);

  // ─── Logout ───────────────────────────────────────────────────
  var logout = useCallback(function () {
    return apiPost("/api/auth/logout/")
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
