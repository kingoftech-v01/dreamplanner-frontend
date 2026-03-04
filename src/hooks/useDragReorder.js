/**
 * useDragReorder — touch/pointer-based drag-and-drop reorder hook.
 *
 * Long-press (400ms) activates drag mode.
 * Dragged item elevates (scale + shadow).
 * Other items shift with animation to make room.
 * On drop, calls onReorder(newItems) with the reordered array.
 * Haptic feedback on drag start and drop.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { hapticImpact } from "../services/native";

var LONG_PRESS_MS = 400;
var DRAG_DEAD_ZONE = 4;

export default function useDragReorder(options) {
  var items = options.items;
  var onReorder = options.onReorder;

  var [dragIndex, setDragIndex] = useState(-1);
  var [overIndex, setOverIndex] = useState(-1);
  var [isDragging, setIsDragging] = useState(false);
  var [dragY, setDragY] = useState(0);

  var itemRefs = useRef([]);
  var itemRectsRef = useRef([]);
  var longPressTimer = useRef(null);
  var startY = useRef(0);
  var startX = useRef(0);
  var currentY = useRef(0);
  var dragActive = useRef(false);
  var dragIndexRef = useRef(-1);
  var overIndexRef = useRef(-1);
  var orderedRef = useRef(items);
  var scrollContainerRef = useRef(null);

  // Keep orderedRef in sync when not dragging
  useEffect(function () {
    if (!dragActive.current) {
      orderedRef.current = items;
    }
  }, [items]);

  var captureRects = useCallback(function () {
    var rects = [];
    for (var i = 0; i < itemRefs.current.length; i++) {
      var el = itemRefs.current[i];
      if (el) {
        var r = el.getBoundingClientRect();
        rects.push({ top: r.top, bottom: r.bottom, height: r.height, midY: r.top + r.height / 2 });
      } else {
        rects.push(null);
      }
    }
    itemRectsRef.current = rects;
  }, []);

  var computeOverIndex = useCallback(function (clientY) {
    var rects = itemRectsRef.current;
    var from = dragIndexRef.current;
    if (rects.length === 0 || from < 0) return from;

    // Use midpoints to determine target
    for (var i = 0; i < rects.length; i++) {
      if (!rects[i]) continue;
      if (clientY < rects[i].midY) return i;
    }
    return rects.length - 1;
  }, []);

  var clearLongPress = useCallback(function () {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  var startDrag = useCallback(function (index, clientY) {
    dragActive.current = true;
    dragIndexRef.current = index;
    overIndexRef.current = index;
    captureRects();
    setDragIndex(index);
    setOverIndex(index);
    setIsDragging(true);
    setDragY(0);
    hapticImpact("Medium");
  }, [captureRects]);

  var onPointerDown = useCallback(function (index, e) {
    // Only handle primary pointer (left button / single touch)
    if (e.button && e.button !== 0) return;

    var clientY = e.clientY != null ? e.clientY : (e.touches ? e.touches[0].clientY : 0);
    var clientX = e.clientX != null ? e.clientX : (e.touches ? e.touches[0].clientX : 0);
    startY.current = clientY;
    startX.current = clientX;
    currentY.current = clientY;

    clearLongPress();
    longPressTimer.current = setTimeout(function () {
      startDrag(index, clientY);
    }, LONG_PRESS_MS);
  }, [clearLongPress, startDrag]);

  var onPointerMove = useCallback(function (e) {
    var clientY = e.clientY != null ? e.clientY : (e.touches ? e.touches[0].clientY : 0);
    var clientX = e.clientX != null ? e.clientX : (e.touches ? e.touches[0].clientX : 0);
    currentY.current = clientY;

    // Cancel long press if moved too far before activation
    if (!dragActive.current) {
      var dx = Math.abs(clientX - startX.current);
      var dy = Math.abs(clientY - startY.current);
      if (dx > DRAG_DEAD_ZONE || dy > DRAG_DEAD_ZONE) {
        clearLongPress();
      }
      return;
    }

    // Prevent scrolling while dragging
    if (e.cancelable) {
      e.preventDefault();
    }

    var deltaY = clientY - startY.current;
    setDragY(deltaY);

    var newOver = computeOverIndex(clientY);
    if (newOver !== overIndexRef.current) {
      overIndexRef.current = newOver;
      setOverIndex(newOver);
    }
  }, [clearLongPress, computeOverIndex]);

  var onPointerUp = useCallback(function () {
    clearLongPress();

    if (!dragActive.current) return;
    dragActive.current = false;

    var from = dragIndexRef.current;
    var to = overIndexRef.current;

    // Clamp
    if (to < 0) to = 0;
    if (to >= items.length) to = items.length - 1;

    setIsDragging(false);
    setDragIndex(-1);
    setOverIndex(-1);
    setDragY(0);

    if (from !== to && from >= 0 && to >= 0) {
      // Build reordered array
      var newItems = items.slice();
      var moved = newItems.splice(from, 1)[0];
      newItems.splice(to, 0, moved);
      hapticImpact("Light");
      if (onReorder) onReorder(newItems);
    }

    dragIndexRef.current = -1;
    overIndexRef.current = -1;
  }, [items, onReorder, clearLongPress]);

  // Attach global move/up listeners when dragging
  useEffect(function () {
    if (isDragging) {
      var moveHandler = function (e) { onPointerMove(e); };
      var upHandler = function () { onPointerUp(); };

      window.addEventListener("pointermove", moveHandler, { passive: false });
      window.addEventListener("pointerup", upHandler);
      window.addEventListener("pointercancel", upHandler);
      window.addEventListener("touchmove", moveHandler, { passive: false });
      window.addEventListener("touchend", upHandler);
      window.addEventListener("touchcancel", upHandler);

      return function () {
        window.removeEventListener("pointermove", moveHandler);
        window.removeEventListener("pointerup", upHandler);
        window.removeEventListener("pointercancel", upHandler);
        window.removeEventListener("touchmove", moveHandler);
        window.removeEventListener("touchend", upHandler);
        window.removeEventListener("touchcancel", upHandler);
      };
    }
  }, [isDragging, onPointerMove, onPointerUp]);

  // Cleanup long press timer on unmount
  useEffect(function () {
    return function () { clearLongPress(); };
  }, [clearLongPress]);

  var getShiftStyle = useCallback(function (index) {
    if (!isDragging || dragIndex < 0) return {};

    var from = dragIndex;
    var to = overIndex;
    if (to < 0) to = from;

    if (index === from) return {};

    // Compute how much this item should shift
    var rects = itemRectsRef.current;
    var itemHeight = (rects[from] && rects[from].height) || 48;

    if (from < to) {
      // Dragging down: items between from+1..to shift UP
      if (index > from && index <= to) {
        return { transform: "translateY(" + (-itemHeight) + "px)", transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1)" };
      }
    } else if (from > to) {
      // Dragging up: items between to..from-1 shift DOWN
      if (index >= to && index < from) {
        return { transform: "translateY(" + itemHeight + "px)", transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1)" };
      }
    }
    return { transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1)" };
  }, [isDragging, dragIndex, overIndex]);

  var getItemProps = useCallback(function (index) {
    var isBeingDragged = isDragging && index === dragIndex;

    var style = {};
    if (isBeingDragged) {
      style = {
        transform: "translateY(" + dragY + "px) scale(1.03)",
        zIndex: 100,
        boxShadow: "0 8px 32px rgba(139, 92, 246, 0.25), 0 2px 8px rgba(0,0,0,0.15)",
        opacity: 0.95,
        transition: "box-shadow 0.2s, opacity 0.2s",
        position: "relative",
        pointerEvents: "none",
      };
    } else {
      style = Object.assign({ position: "relative" }, getShiftStyle(index));
    }

    return {
      ref: function (el) { itemRefs.current[index] = el; },
      style: style,
      onPointerDown: function (e) { onPointerDown(index, e); },
      "data-drag-index": index,
    };
  }, [isDragging, dragIndex, dragY, getShiftStyle, onPointerDown]);

  return {
    orderedItems: items,
    getItemProps: getItemProps,
    isDragging: isDragging,
    dragIndex: dragIndex,
  };
}
