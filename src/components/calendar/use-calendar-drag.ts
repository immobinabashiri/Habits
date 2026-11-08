"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import type { Occurrence } from "@/lib/domain/calendar";
import type { DateKey } from "@/types/common";

// Drag-to-reschedule for calendar items, on Pointer Events (mouse, touch and pen),
// with no library.
//
//  - Mouse and pen: the drag starts after the pointer moves a few pixels, so a plain
//    click still opens the item.
//  - Touch: the drag starts after a short press-and-hold, so swiping still scrolls
//    the page. Once it starts, scrolling is held off until the finger lifts.
//
// Drop zones are elements with data-drop-date="YYYY-MM-DD". A zone that also has
// data-drop-timed is a 24-hour column: the drop time comes from the pointer's height
// in it, snapped to 15 minutes. A copy of the item follows the pointer; Escape cancels.

export interface DropTarget {
  date: DateKey;
  minutes: number | null; // null = dropped on a day (month cell, all-day row)
}

interface Session {
  occurrence: Occurrence;
  pointerId: number;
  touch: boolean;
  startX: number;
  startY: number;
  x: number;
  y: number;
  started: boolean;
  holdTimer: number;
  frame: number;
  source: HTMLElement;
  ghost: HTMLElement | null;
  grabX: number; // where in the item it was grabbed
  grabY: number;
  grabMinutes: number; // for timed items: minutes between the item's start and the pointer
  target: DropTarget | null;
  cleanup: () => void; // removes this drag's window listeners
}

const MOVE_THRESHOLD = 5; // px before a mouse press becomes a drag
const HOLD_MS = 320; // press-and-hold before a touch becomes a drag
const HOLD_SLOP = 8; // px a finger may wander during the hold
const SNAP = 15;
const EDGE = 56;
const SPEED = 16;

const sameTarget = (a: DropTarget | null, b: DropTarget | null) =>
  a === b || (!!a && !!b && a.date === b.date && a.minutes === b.minutes);

export function useCalendarDrag({
  disabled,
  canDrag,
  onDrop,
}: {
  disabled: boolean;
  canDrag: (occurrence: Occurrence) => boolean;
  onDrop: (occurrence: Occurrence, target: DropTarget) => void;
}) {
  const session = useRef<Session | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState<{ id: string; date: DateKey } | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  // The drop handler from the latest render, so a long drag never drops with stale data.
  const dropRef = useRef(onDrop);
  useLayoutEffect(() => {
    dropRef.current = onDrop;
  });

  // Once a touch drag has started, the finger moves the item, not the page. The
  // listener must exist BEFORE the touch begins: the browser decides at touchstart
  // whether a touch may be stopped from scrolling, so adding it later is ignored.
  useEffect(() => {
    const holdScroll = (event: TouchEvent) => {
      if (session.current?.started) event.preventDefault();
    };
    document.addEventListener("touchmove", holdScroll, { passive: false });
    return () => document.removeEventListener("touchmove", holdScroll);
  }, []);

  function zoneAt(s: Session): DropTarget | null {
    const zone = document.elementFromPoint(s.x, s.y)?.closest<HTMLElement>("[data-drop-date]");
    const date = zone?.dataset.dropDate;
    if (!zone || !date) return null;
    if (zone.dataset.dropTimed === undefined) return { date, minutes: null };
    const rect = zone.getBoundingClientRect();
    const raw = ((s.y - rect.top) / rect.height) * 1440 - s.grabMinutes;
    const snapped = Math.round(raw / SNAP) * SNAP;
    return { date, minutes: Math.max(0, Math.min(1440 - SNAP, snapped)) };
  }

  function placeGhost(s: Session) {
    if (s.ghost) s.ghost.style.transform = `translate(${s.x - s.grabX}px, ${s.y - s.grabY}px)`;
  }

  function update(s: Session) {
    placeGhost(s);
    const next = zoneAt(s);
    if (!sameTarget(next, s.target)) {
      s.target = next;
      setTarget(next);
    }
  }

  function scroller(s: Session): HTMLElement | null {
    return s.source.closest<HTMLElement>("[data-drop-scroll]");
  }

  // Near an edge, scroll the time grid (or the page) so far days and hours are reachable.
  function autoScroll() {
    const s = session.current;
    if (!s || !s.started) return;
    const box = scroller(s);
    let moved = false;
    if (box) {
      const rect = box.getBoundingClientRect();
      if (s.y < rect.top + EDGE && s.y > rect.top - EDGE) {
        box.scrollTop -= SPEED * (1 - Math.max(0, s.y - rect.top) / EDGE);
        moved = true;
      } else if (s.y > rect.bottom - EDGE && s.y < rect.bottom + EDGE) {
        box.scrollTop += SPEED * (1 - Math.max(0, rect.bottom - s.y) / EDGE);
        moved = true;
      }
    }
    if (!moved) {
      if (s.y < EDGE) window.scrollBy(0, -SPEED * (1 - s.y / EDGE));
      else if (s.y > window.innerHeight - EDGE) window.scrollBy(0, SPEED * (1 - (window.innerHeight - s.y) / EDGE));
    }
    update(s);
    s.frame = requestAnimationFrame(autoScroll);
  }

  function begin(s: Session) {
    s.started = true;
    const rect = s.source.getBoundingClientRect();
    s.grabX = Math.max(0, Math.min(rect.width, s.startX - rect.left));
    s.grabY = Math.max(0, Math.min(rect.height, s.startY - rect.top));
    const minutesTall = Number(s.source.dataset.durationMinutes ?? 0);
    s.grabMinutes = minutesTall > 0 && rect.height > 0 ? Math.round((s.grabY / rect.height) * minutesTall) : 0;

    const ghost = s.source.cloneNode(true) as HTMLElement;
    ghost.removeAttribute("id");
    ghost.setAttribute("aria-hidden", "true");
    ghost.removeAttribute("data-cal-dragging");
    ghost.classList.add("cal-ghost");
    ghost.style.position = "fixed";
    ghost.style.inset = "auto";
    ghost.style.top = "0";
    ghost.style.left = "0";
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    document.body.appendChild(ghost);
    s.ghost = ghost;

    if (!s.touch && s.source.isConnected) s.source.setPointerCapture(s.pointerId);
    document.body.style.userSelect = "none";
    if (s.touch) navigator.vibrate?.(8);
    setDragging({ id: s.occurrence.item.id, date: s.occurrence.date });
    update(s);
    s.frame = requestAnimationFrame(autoScroll);
  }

  function finish(drop: boolean) {
    const s = session.current;
    if (!s) return;
    session.current = null;
    window.clearTimeout(s.holdTimer);
    cancelAnimationFrame(s.frame);
    s.cleanup();
    s.ghost?.remove();
    document.body.style.removeProperty("user-select");
    if (!s.started) return;
    // The click that follows the drag must not open the item.
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    setDragging(null);
    setTarget(null);
    if (drop && s.target) dropRef.current(s.occurrence, s.target);
  }

  // Window listeners, so the drag survives the item re-rendering under the pointer.
  // Made once per drag and kept on the session, so the very same functions are removed.
  function listen(s: Session) {
    const onMove = (event: PointerEvent) => {
      if (session.current !== s || event.pointerId !== s.pointerId) return;
      s.x = event.clientX;
      s.y = event.clientY;
      const distance = Math.hypot(s.x - s.startX, s.y - s.startY);
      if (!s.started) {
        if (s.touch) {
          if (distance > HOLD_SLOP) finish(false); // it is a scroll, not a drag
        } else if (distance > MOVE_THRESHOLD) {
          begin(s);
        }
        return;
      }
      update(s);
    };
    const onUp = (event: PointerEvent) => {
      if (session.current === s && event.pointerId === s.pointerId) finish(true);
    };
    const onCancel = (event: PointerEvent) => {
      if (session.current === s && event.pointerId === s.pointerId) finish(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && session.current === s && s.started) {
        event.preventDefault();
        finish(false);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    s.cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
    };
  }

  function dragProps(occurrence: Occurrence) {
    const allowed = !disabled && canDrag(occurrence);
    const isDragging = dragging?.id === occurrence.item.id && dragging.date === occurrence.date;
    return {
      "data-cal-draggable": allowed ? "" : undefined,
      "data-cal-dragging": isDragging ? "" : undefined,
      onPointerDown(event: ReactPointerEvent<HTMLElement>) {
        if (!allowed || session.current || (event.pointerType === "mouse" && event.button !== 0)) return;
        const touch = event.pointerType === "touch";
        const s: Session = {
          occurrence,
          pointerId: event.pointerId,
          touch,
          startX: event.clientX,
          startY: event.clientY,
          x: event.clientX,
          y: event.clientY,
          started: false,
          holdTimer: 0,
          frame: 0,
          source: event.currentTarget,
          ghost: null,
          grabX: 0,
          grabY: 0,
          grabMinutes: 0,
          target: null,
          cleanup: () => {},
        };
        session.current = s;
        listen(s);
        if (touch) {
          s.holdTimer = window.setTimeout(() => {
            if (session.current === s) begin(s);
          }, HOLD_MS);
        }
      },
      onClickCapture(event: ReactMouseEvent<HTMLElement>) {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      // A long press on touch would otherwise open the context menu.
      onContextMenu(event: ReactMouseEvent<HTMLElement>) {
        if (allowed && event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === "touch") {
          event.preventDefault();
        }
      },
    };
  }

  return { dragProps, dragging, target };
}
