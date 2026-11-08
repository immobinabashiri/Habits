"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { moveId } from "@/lib/domain/habit-order";

// Drag-to-reorder for a vertical list, built on Pointer Events so mouse, touch and pen
// all work the same way, with no library. Only the handle starts a drag (it has
// touch-action: none), so the rest of each row scrolls and clicks as before.
//
// Items are found by their data-reorder-id attribute inside the list element.
// While dragging, the dragged row follows the pointer, the rows it passes slide out of
// the way, and a slot marks where it will land. On drop the new order is reported
// once, and every row glides from where it was to its new place (FLIP).

interface Slot {
  top: number;
  height: number;
}

interface DragState {
  id: string;
  from: number;
  to: number;
  startY: number;
  startScroll: number;
  lastClientY: number;
  tops: number[]; // each row's top, relative to the list
  heights: number[];
  gap: number;
  handle: HTMLElement;
  pointerId: number;
  frame: number;
  onKey: (event: KeyboardEvent) => void; // Escape cancels, wherever focus is
}

const EDGE = 72; // px from the top/bottom of the window where the page starts scrolling
const SPEED = 14; // px per frame at the very edge
const ease = "cubic-bezier(0.23, 1, 0.32, 1)";

function rowsOf(list: HTMLElement | null): HTMLElement[] {
  return [...(list?.querySelectorAll<HTMLElement>(":scope > [data-reorder-id]") ?? [])];
}

function reducedMotion() {
  return (
    document.documentElement.dataset.motion === "reduce" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useDragReorder({
  ids,
  disabled,
  onReorder,
}: {
  ids: readonly string[];
  disabled: boolean;
  onReorder: (next: string[], movedId: string) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const drag = useRef<DragState | null>(null);
  const firstRects = useRef<Map<string, number> | null>(null); // FLIP "first" positions
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const rows = () => rowsOf(listRef.current);

  // After the new order renders, slide every row from its old place to its new one.
  useLayoutEffect(() => {
    const first = firstRects.current;
    if (!first) return;
    firstRects.current = null;
    if (reducedMotion()) return;
    for (const row of rowsOf(listRef.current)) {
      const before = first.get(row.dataset.reorderId ?? "");
      if (before === undefined) continue;
      const delta = before - row.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) continue;
      row.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], {
        duration: 220,
        easing: ease,
      });
    }
  }, [ids]);

  function remember() {
    firstRects.current = new Map(rows().map((row) => [row.dataset.reorderId ?? "", row.getBoundingClientRect().top]));
  }

  function commit(from: number, to: number) {
    if (from === to) return;
    remember();
    onReorder(moveId(ids, from, to), ids[from]);
  }

  function layout(state: DragState) {
    const list = rows();
    const dy = state.lastClientY - state.startY + (window.scrollY - state.startScroll);
    const height = state.heights[state.from];
    const center = state.tops[state.from] + height / 2 + dy;

    // The new index is the number of other rows whose middle is above the dragged middle.
    let to = 0;
    state.tops.forEach((top, index) => {
      if (index !== state.from && top + state.heights[index] / 2 < center) to += 1;
    });

    const shift = height + state.gap;
    list.forEach((row, index) => {
      if (index === state.from) {
        row.style.transform = `translateY(${dy}px) scale(1.02)`;
        return;
      }
      let offset = 0;
      if (state.from < to && index > state.from && index <= to) offset = -shift;
      if (to < state.from && index >= to && index < state.from) offset = shift;
      row.style.transform = offset ? `translateY(${offset}px)` : "";
    });

    if (to !== state.to) {
      state.to = to;
      const top =
        to > state.from ? state.tops[to] + state.heights[to] - height : state.tops[to];
      setSlot({ top, height });
    }
  }

  function autoScroll() {
    const state = drag.current;
    if (!state) return;
    const y = state.lastClientY;
    let step = 0;
    if (y < EDGE) step = -SPEED * (1 - y / EDGE);
    else if (y > window.innerHeight - EDGE) step = SPEED * (1 - (window.innerHeight - y) / EDGE);
    if (step) {
      window.scrollBy(0, step);
      layout(state);
    }
    state.frame = requestAnimationFrame(autoScroll);
  }

  function end(cancelled: boolean) {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    cancelAnimationFrame(state.frame);
    window.removeEventListener("keydown", state.onKey);
    if (state.handle.hasPointerCapture(state.pointerId)) state.handle.releasePointerCapture(state.pointerId);
    document.body.style.removeProperty("user-select");
    setDraggingId(null);
    setSlot(null);

    const list = rows();
    const to = cancelled ? state.from : state.to;
    if (to === state.from) {
      // Nothing moved: the row glides back into its place.
      list.forEach((row) => {
        row.style.transition = reducedMotion() ? "" : `transform 200ms ${ease}`;
        row.style.transform = "";
      });
      window.setTimeout(() => list.forEach((row) => row.style.removeProperty("transition")), 220);
      return;
    }
    remember(); // includes the transforms, so rows start exactly where they are on screen
    list.forEach((row) => {
      row.style.removeProperty("transition");
      row.style.removeProperty("transform");
    });
    onReorder(moveId(ids, state.from, to), state.id);
  }

  function handleProps(index: number) {
    return {
      onPointerDown(event: ReactPointerEvent<HTMLElement>) {
        if (disabled || drag.current || event.button !== 0) return;
        const list = rows();
        const listTop = listRef.current?.getBoundingClientRect().top ?? 0;
        const rects = list.map((row) => row.getBoundingClientRect());
        if (!rects[index]) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const state: DragState = {
          id: list[index].dataset.reorderId ?? "",
          from: index,
          to: -1, // set by the first layout() below
          startY: event.clientY,
          startScroll: window.scrollY,
          lastClientY: event.clientY,
          tops: rects.map((rect) => rect.top - listTop),
          heights: rects.map((rect) => rect.height),
          gap: rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0,
          handle: event.currentTarget,
          pointerId: event.pointerId,
          frame: 0,
          onKey: (key) => {
            if (key.key === "Escape") end(true);
          },
        };
        window.addEventListener("keydown", state.onKey);
        list.forEach((row, i) => {
          row.style.transition = i === index ? "none" : reducedMotion() ? "" : `transform 200ms ${ease}`;
        });
        document.body.style.userSelect = "none";
        drag.current = state;
        setDraggingId(state.id);
        layout(state);
        state.frame = requestAnimationFrame(autoScroll);
      },
      onPointerMove(event: ReactPointerEvent<HTMLElement>) {
        const state = drag.current;
        if (!state || event.pointerId !== state.pointerId) return; // ignore a second finger
        state.lastClientY = event.clientY;
        layout(state);
      },
      onPointerUp: () => end(false),
      onPointerCancel: () => end(true),
    };
  }

  return {
    listRef,
    draggingId,
    slot,
    handleProps,
    move: (index: number, by: -1 | 1) => commit(index, index + by),
  };
}
