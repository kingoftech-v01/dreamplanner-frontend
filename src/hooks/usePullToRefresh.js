/**
 * usePullToRefresh — touch-based pull-to-refresh for mobile lists.
 *
 * Usage:
 *   var ptr = usePullToRefresh({ onRefresh: fetchData, scrollRef });
 *   <div {...ptr.handlers} style={{ transform: ptr.style.transform }}>
 *     {ptr.indicator}
 *     {children}
 *   </div>
 */

import { useState, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

var THRESHOLD = 70;
var MAX_PULL = 120;
var isNative = Capacitor.isNativePlatform();

export default function usePullToRefresh({ onRefresh, scrollRef, disabled }) {
  var [pulling, setPulling] = useState(false);
  var [refreshing, setRefreshing] = useState(false);
  var [pullDistance, setPullDistance] = useState(0);
  var startY = useRef(0);
  var active = useRef(false);

  var canPull = useCallback(function () {
    if (disabled || refreshing) return false;
    if (scrollRef && scrollRef.current) return scrollRef.current.scrollTop <= 0;
    return window.scrollY <= 0;
  }, [disabled, refreshing, scrollRef]);

  var onTouchStart = useCallback(function (e) {
    if (!canPull()) return;
    startY.current = e.touches[0].clientY;
    active.current = true;
  }, [canPull]);

  var onTouchMove = useCallback(function (e) {
    if (!active.current || refreshing) return;
    var delta = e.touches[0].clientY - startY.current;
    if (delta < 0) { active.current = false; setPullDistance(0); return; }
    // Damped pull (logarithmic feel)
    var damped = Math.min(MAX_PULL, delta * 0.45);
    setPullDistance(damped);
    setPulling(damped > 10);
    if (damped > 30) e.preventDefault();
  }, [refreshing]);

  var onTouchEnd = useCallback(function () {
    if (!active.current) return;
    active.current = false;
    if (pullDistance >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.6);
      // Haptic feedback on native
      if (isNative) {
        import("@capacitor/haptics").then(function (m) {
          m.Haptics.impact({ style: "MEDIUM" });
        }).catch(function () {});
      }
      Promise.resolve(onRefresh()).finally(function () {
        setRefreshing(false);
        setPullDistance(0);
        setPulling(false);
      });
    } else {
      setPullDistance(0);
      setPulling(false);
    }
  }, [pullDistance, onRefresh]);

  var progress = Math.min(1, pullDistance / THRESHOLD);

  var indicator = (pulling || refreshing) ? (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      height: pullDistance, overflow: "hidden",
      transition: refreshing ? "height 0.3s ease" : "none",
    }}>
      <div style={{
        width: 28, height: 28,
        border: "2.5px solid var(--dp-glass-border)",
        borderTopColor: "var(--dp-accent)",
        borderRadius: "50%",
        opacity: refreshing ? 1 : progress,
        transform: "rotate(" + (progress * 360) + "deg)",
        transition: refreshing ? "none" : "transform 0.05s linear",
        animation: refreshing ? "dpSpin 0.8s linear infinite" : "none",
      }} />
    </div>
  ) : null;

  return {
    handlers: {
      onTouchStart: onTouchStart,
      onTouchMove: onTouchMove,
      onTouchEnd: onTouchEnd,
    },
    indicator: indicator,
    refreshing: refreshing,
    pulling: pulling,
    style: {
      transform: pullDistance > 0 && !refreshing ? "translateY(" + (pullDistance * 0.3) + "px)" : "none",
      transition: pulling ? "none" : "transform 0.3s ease",
    },
  };
}
