import { createContext, useContext, useState, useCallback, useRef } from "react";
import CelebrationOverlay from "../components/shared/CelebrationOverlay";
import { apiPost } from "../services/api";
import { USERS } from "../services/endpoints";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — CelebrationContext
 *
 * Provides a `celebrate(type, context)` function available anywhere
 * in the app. Calls the backend for AI-generated celebration messages
 * and renders CelebrationOverlay overlays.
 *
 * Also stores recent celebrations for history/review.
 * ═══════════════════════════════════════════════════════════════════ */

var CelebrationContext = createContext(null);

var MAX_RECENT = 20;

export function useCelebration() {
  var ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error("useCelebration must be used within CelebrationProvider");
  return ctx;
}

export function CelebrationProvider({ children }) {
  var [current, setCurrent] = useState(null);
  var [recent, setRecent] = useState([]);
  var queueRef = useRef([]);
  var activeRef = useRef(false);

  var processQueue = useCallback(function () {
    if (activeRef.current || queueRef.current.length === 0) return;
    activeRef.current = true;
    var next = queueRef.current.shift();
    setCurrent(next);
  }, []);

  var handleDismiss = useCallback(function () {
    setCurrent(null);
    activeRef.current = false;
    // Process any queued celebrations
    setTimeout(function () {
      if (queueRef.current.length > 0) {
        activeRef.current = true;
        var next = queueRef.current.shift();
        setCurrent(next);
      }
    }, 300);
  }, []);

  var celebrate = useCallback(function (type, context) {
    // Build an optimistic/immediate fallback celebration
    var fallbacks = {
      task_completed: {
        message: "Task complete! You are unstoppable!",
        emoji: "\u2728",
        animation_type: "stars",
        share_text: "Just completed a task on my journey! #DreamPlanner",
      },
      goal_completed: {
        message: "Goal achieved! Another step closer to your dream!",
        emoji: "\uD83C\uDFAF",
        animation_type: "confetti",
        share_text: "Just achieved a major goal! #DreamPlanner",
      },
      milestone_reached: {
        message: "Milestone unlocked! You are writing history!",
        emoji: "\uD83D\uDE80",
        animation_type: "fireworks",
        share_text: "Hit a major milestone on my journey! #DreamPlanner",
      },
      dream_completed: {
        message: "DREAM COMPLETE! You turned your vision into reality!",
        emoji: "\uD83C\uDFC6",
        animation_type: "trophy",
        share_text: "I just completed my dream! #DreamPlanner",
      },
      streak_milestone: {
        message: "Streak on fire! Your consistency is legendary!",
        emoji: "\uD83D\uDD25",
        animation_type: "fireworks",
        share_text: "My streak is on fire! #DreamPlanner",
      },
      level_up: {
        message: "LEVEL UP! You just evolved into something greater!",
        emoji: "\uD83C\uDF1F",
        animation_type: "trophy",
        share_text: "Just leveled up! #DreamPlanner",
      },
    };

    var fallback = fallbacks[type] || fallbacks.task_completed;

    // Show immediate fallback celebration
    var celebrationData = Object.assign({}, fallback, { type: type, context: context, timestamp: Date.now() });

    // Add to recent list
    setRecent(function (prev) {
      var updated = [celebrationData].concat(prev);
      if (updated.length > MAX_RECENT) updated = updated.slice(0, MAX_RECENT);
      return updated;
    });

    // Queue the celebration for display
    queueRef.current.push(celebrationData);
    processQueue();

    // Fire async request to get AI-generated message — update overlay if still showing
    apiPost(USERS.CELEBRATE, { type: type, context: context || {} }).then(function (data) {
      if (data && data.message) {
        var aiCelebration = Object.assign({}, celebrationData, data);
        // Update current if it is still showing the same celebration
        setCurrent(function (prev) {
          if (prev && prev.timestamp === celebrationData.timestamp) {
            return aiCelebration;
          }
          return prev;
        });
        // Also update recent
        setRecent(function (prev) {
          return prev.map(function (c) {
            if (c.timestamp === celebrationData.timestamp) return aiCelebration;
            return c;
          });
        });
      }
    }).catch(function () {
      // Fallback already showing — no action needed
    });
  }, [processQueue]);

  return (
    <CelebrationContext.Provider value={{
      celebrate: celebrate,
      recentCelebrations: recent,
    }}>
      {children}
      <CelebrationOverlay celebration={current} onDismiss={handleDismiss} />
    </CelebrationContext.Provider>
  );
}
