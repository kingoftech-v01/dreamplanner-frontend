/**
 * useSwipeAction — horizontal swipe gesture handler for list items.
 *
 * Returns touch handlers and transform state.
 * - Swipe left reveals a "danger" action (e.g., archive)
 * - Swipe right reveals a "success" action (e.g., mark progress)
 * - Threshold to trigger: 80px
 * - Snaps back if not past threshold
 */

import { useState, useRef, useCallback } from "react";
import { hapticImpact } from "../services/native";

var THRESHOLD = 80;
var MAX_DRAG = 140;
var DAMPING = 0.45;

export default function useSwipeAction(options) {
  var onSwipeLeft = options.onSwipeLeft;
  var onSwipeRight = options.onSwipeRight;

  var [offsetX, setOffsetX] = useState(0);
  var [swiping, setSwiping] = useState(false);
  var [triggered, setTriggered] = useState(null); // "left" | "right" | null

  var startX = useRef(0);
  var startY = useRef(0);
  var active = useRef(false);
  var locked = useRef(false);       // true once we decide horizontal vs vertical
  var isHorizontal = useRef(false);  // was the gesture horizontal?
  var hapticFired = useRef(false);

  var onTouchStart = useCallback(function (e) {
    if (triggered) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    active.current = true;
    locked.current = false;
    isHorizontal.current = false;
    hapticFired.current = false;
  }, [triggered]);

  var onTouchMove = useCallback(function (e) {
    if (!active.current || triggered) return;

    var dx = e.touches[0].clientX - startX.current;
    var dy = e.touches[0].clientY - startY.current;

    // Lock direction on first significant movement
    if (!locked.current) {
      var absDx = Math.abs(dx);
      var absDy = Math.abs(dy);
      if (absDx < 8 && absDy < 8) return; // wait for more movement
      locked.current = true;
      isHorizontal.current = absDx > absDy;
    }

    // If vertical scroll, bail out
    if (!isHorizontal.current) {
      active.current = false;
      setOffsetX(0);
      setSwiping(false);
      return;
    }

    // Prevent vertical scrolling while swiping horizontally
    e.preventDefault();

    // Apply damping — slower as you drag further
    var sign = dx > 0 ? 1 : -1;
    var absDelta = Math.abs(dx);
    var damped = Math.min(MAX_DRAG, absDelta * DAMPING);
    var finalOffset = sign * damped;

    // Disable directions without handlers
    if (finalOffset > 0 && !onSwipeRight) finalOffset = 0;
    if (finalOffset < 0 && !onSwipeLeft) finalOffset = 0;

    setOffsetX(finalOffset);
    setSwiping(Math.abs(finalOffset) > 4);

    // Fire haptic feedback when crossing threshold
    if (Math.abs(finalOffset) >= THRESHOLD * DAMPING && !hapticFired.current) {
      hapticFired.current = true;
      hapticImpact("Medium");
    }
  }, [triggered, onSwipeLeft, onSwipeRight]);

  var onTouchEnd = useCallback(function () {
    if (!active.current) return;
    active.current = false;

    var absOffset = Math.abs(offsetX);

    if (absOffset >= THRESHOLD * DAMPING) {
      // Threshold reached — trigger action
      var direction = offsetX > 0 ? "right" : "left";
      setTriggered(direction);
      hapticImpact("Heavy");

      // Slide out briefly then snap back
      var slideTarget = direction === "right" ? MAX_DRAG : -MAX_DRAG;
      setOffsetX(slideTarget);

      setTimeout(function () {
        if (direction === "right" && onSwipeRight) {
          onSwipeRight();
        } else if (direction === "left" && onSwipeLeft) {
          onSwipeLeft();
        }
        // Snap back after callback
        setOffsetX(0);
        setSwiping(false);
        setTriggered(null);
      }, 300);
    } else {
      // Didn't reach threshold — snap back
      setOffsetX(0);
      setSwiping(false);
    }
  }, [offsetX, onSwipeLeft, onSwipeRight]);

  // Determine which action indicator to show
  var revealDirection = offsetX > 4 ? "right" : offsetX < -4 ? "left" : null;
  var pastThreshold = Math.abs(offsetX) >= THRESHOLD * DAMPING;

  return {
    handlers: {
      onTouchStart: onTouchStart,
      onTouchMove: onTouchMove,
      onTouchEnd: onTouchEnd,
    },
    offsetX: offsetX,
    swiping: swiping,
    revealDirection: revealDirection,
    pastThreshold: pastThreshold,
    triggered: triggered,
    cardStyle: {
      transform: offsetX !== 0 ? "translateX(" + offsetX + "px)" : "none",
      transition: swiping ? "none" : "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
    },
  };
}
