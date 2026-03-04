/**
 * useDragReschedule — pointer-based drag-and-drop reschedule hook for the calendar grid.
 *
 * Supports both month view (drag event dot to a different day) and week view
 * (drag event block to a different day+time slot).
 *
 * Droppable cells must have `data-date="YYYY-MM-DD"` and optionally `data-hour="HH"`.
 * Draggable event elements must have `data-drag-event-id` set to the event ID.
 *
 * Returns { dragHandlers, isDragging, draggedEvent, ghostStyle, targetCell }.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { hapticImpact } from "../services/native";

var LONG_PRESS_MS = 350;
var DRAG_DEAD_ZONE = 6;

export default function useDragReschedule(options) {
  var onReschedule = options.onReschedule;
  var events = options.events;

  var [isDragging, setIsDragging] = useState(false);
  var [draggedEvent, setDraggedEvent] = useState(null);
  var [targetCell, setTargetCell] = useState(null);
  var [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

  var dragActive = useRef(false);
  var longPressTimer = useRef(null);
  var startX = useRef(0);
  var startY = useRef(0);
  var draggedRef = useRef(null);       // the event object being dragged
  var originCell = useRef(null);       // { date, hour } of the source cell
  var targetCellRef = useRef(null);
  var ghostRef = useRef(null);         // reference element for ghost sizing
  var pointerIdRef = useRef(null);     // track pointer ID for multi-touch safety

  // ── Helpers ──────────────────────────────────────────────────

  function findCellFromPoint(x, y) {
    // Temporarily hide the ghost so elementFromPoint lands on the grid cell
    var ghost = document.getElementById("dp-drag-ghost");
    if (ghost) ghost.style.pointerEvents = "none";

    var el = document.elementFromPoint(x, y);

    if (ghost) ghost.style.pointerEvents = "";

    // Walk up to find the element with data-date
    var limit = 8;
    while (el && limit > 0) {
      if (el.dataset && el.dataset.date) {
        return {
          date: el.dataset.date,
          hour: el.dataset.hour != null ? el.dataset.hour : null,
          element: el,
        };
      }
      el = el.parentElement;
      limit--;
    }
    return null;
  }

  function highlightCell(cell) {
    // Remove previous highlight
    var prev = document.querySelector("[data-dp-drop-target]");
    if (prev) {
      prev.removeAttribute("data-dp-drop-target");
      prev.style.removeProperty("box-shadow");
      prev.style.removeProperty("outline");
    }
    if (cell && cell.element) {
      cell.element.setAttribute("data-dp-drop-target", "true");
      cell.element.style.boxShadow = "inset 0 0 0 2px rgba(139,92,246,0.45)";
      cell.element.style.outline = "none";
    }
  }

  function clearHighlight() {
    var prev = document.querySelector("[data-dp-drop-target]");
    if (prev) {
      prev.removeAttribute("data-dp-drop-target");
      prev.style.removeProperty("box-shadow");
      prev.style.removeProperty("outline");
    }
  }

  function findEventById(eventId) {
    if (!events) return null;
    var keys = Object.keys(events);
    for (var i = 0; i < keys.length; i++) {
      var list = events[keys[i]];
      if (!list) continue;
      for (var j = 0; j < list.length; j++) {
        if (String(list[j].id) === String(eventId)) {
          return { evt: list[j], dateKey: keys[i] };
        }
      }
    }
    return null;
  }

  // ── Clear long press timer ─────────────────────────────────

  var clearLongPress = useCallback(function () {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ── Activate drag mode ─────────────────────────────────────

  var activateDrag = useCallback(function (eventId, clientX, clientY) {
    var found = findEventById(eventId);
    if (!found) return;

    var evt = found.evt;
    var sourceCell = findCellFromPoint(clientX, clientY);

    dragActive.current = true;
    draggedRef.current = evt;
    originCell.current = sourceCell ? { date: sourceCell.date, hour: sourceCell.hour } : null;

    setDraggedEvent(evt);
    setIsDragging(true);
    setGhostPos({ x: clientX, y: clientY });
    setTargetCell(null);
    targetCellRef.current = null;

    hapticImpact("Medium");
  }, [events]);

  // ── Pointer handlers ───────────────────────────────────────

  var onPointerDown = useCallback(function (eventId, e) {
    // Only primary pointer
    if (e.button && e.button !== 0) return;

    var clientX = e.clientX != null ? e.clientX : 0;
    var clientY = e.clientY != null ? e.clientY : 0;

    startX.current = clientX;
    startY.current = clientY;
    pointerIdRef.current = e.pointerId != null ? e.pointerId : null;

    clearLongPress();
    longPressTimer.current = setTimeout(function () {
      activateDrag(eventId, clientX, clientY);
    }, LONG_PRESS_MS);
  }, [clearLongPress, activateDrag]);

  var onPointerMove = useCallback(function (e) {
    var clientX = e.clientX != null ? e.clientX : 0;
    var clientY = e.clientY != null ? e.clientY : 0;

    // Cancel long press if pointer moved too far before activation
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

    setGhostPos({ x: clientX, y: clientY });

    // Determine which cell is under the pointer
    var cell = findCellFromPoint(clientX, clientY);

    var prevTarget = targetCellRef.current;
    var changed = false;

    if (cell) {
      if (!prevTarget || prevTarget.date !== cell.date || prevTarget.hour !== cell.hour) {
        changed = true;
        targetCellRef.current = { date: cell.date, hour: cell.hour };
        setTargetCell({ date: cell.date, hour: cell.hour });
        highlightCell(cell);
        hapticImpact("Light");
      }
    } else {
      if (prevTarget) {
        targetCellRef.current = null;
        setTargetCell(null);
        clearHighlight();
      }
    }
  }, [clearLongPress]);

  var onPointerUp = useCallback(function () {
    clearLongPress();

    if (!dragActive.current) return;
    dragActive.current = false;

    var evt = draggedRef.current;
    var target = targetCellRef.current;
    var origin = originCell.current;

    // Clean up state
    setIsDragging(false);
    setDraggedEvent(null);
    setTargetCell(null);
    setGhostPos({ x: 0, y: 0 });
    clearHighlight();
    draggedRef.current = null;
    originCell.current = null;
    targetCellRef.current = null;
    pointerIdRef.current = null;

    if (!evt || !target) return;

    // Check if actually moved to a different cell
    var sameCell = origin && origin.date === target.date && origin.hour === target.hour;
    if (sameCell) return;

    // For month view (no hour data), check if just date changed
    if (!target.hour && origin && origin.date === target.date) return;

    hapticImpact("Medium");

    if (onReschedule) {
      onReschedule({
        event: evt,
        targetDate: target.date,
        targetHour: target.hour,
        originDate: origin ? origin.date : null,
        originHour: origin ? origin.hour : null,
      });
    }
  }, [clearLongPress, onReschedule]);

  // ── Global listener management ─────────────────────────────

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

      // Prevent context menu while dragging
      var ctxHandler = function (e) { e.preventDefault(); };
      window.addEventListener("contextmenu", ctxHandler);

      return function () {
        window.removeEventListener("pointermove", moveHandler);
        window.removeEventListener("pointerup", upHandler);
        window.removeEventListener("pointercancel", upHandler);
        window.removeEventListener("touchmove", moveHandler);
        window.removeEventListener("touchend", upHandler);
        window.removeEventListener("touchcancel", upHandler);
        window.removeEventListener("contextmenu", ctxHandler);
      };
    }
  }, [isDragging, onPointerMove, onPointerUp]);

  // ── Cleanup on unmount ─────────────────────────────────────

  useEffect(function () {
    return function () {
      clearLongPress();
      clearHighlight();
    };
  }, [clearLongPress]);

  // ── Build drag handler factory ─────────────────────────────

  var dragHandlers = useCallback(function (eventId) {
    return {
      onPointerDown: function (e) {
        onPointerDown(eventId, e);
      },
      "data-drag-event-id": String(eventId),
      style: {
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      },
    };
  }, [onPointerDown]);

  // ── Ghost element styles ───────────────────────────────────

  var ghostStyle = {
    position: "fixed",
    left: ghostPos.x - 60,
    top: ghostPos.y - 20,
    width: 120,
    minHeight: 36,
    zIndex: 9999,
    pointerEvents: "none",
    opacity: isDragging ? 0.9 : 0,
    transform: isDragging ? "scale(1.05)" : "scale(0.95)",
    transition: "opacity 0.15s ease, transform 0.15s ease",
    background: "rgba(139,92,246,0.18)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderRadius: 10,
    border: "1.5px solid rgba(139,92,246,0.35)",
    boxShadow: "0 8px 32px rgba(139,92,246,0.25), 0 2px 8px rgba(0,0,0,0.15)",
    padding: "6px 10px",
    color: "var(--dp-accent)",
    fontSize: 12,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  return {
    dragHandlers: dragHandlers,
    isDragging: isDragging,
    draggedEvent: draggedEvent,
    ghostStyle: ghostStyle,
    targetCell: targetCell,
  };
}
