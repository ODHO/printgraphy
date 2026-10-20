"use client";

import { useEffect, useRef } from "react";

export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

export function useEditorHistory<T>() {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);

  const push = (snapshot: T) => {
    past.current.push(snapshot);
    if (past.current.length > 40) past.current.shift();
    future.current = [];
  };

  const undo = (current: T) => {
    const prev = past.current.pop();
    if (!prev) return null;
    future.current.push(current);
    return prev;
  };

  const redo = (current: T) => {
    const next = future.current.pop();
    if (!next) return null;
    past.current.push(current);
    return next;
  };

  return { push, undo, redo };
}

export type ShortcutHandlers = {
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  duplicate: () => void;
  nudge: (dx: number, dy: number) => void;
  remove: () => void;
};

/** Keyboard controls for the 2D card editor. Ignored while typing in a field. */
export function use2dShortcuts(enabled: boolean, handlers: ShortcutHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z" && !event.shiftKey) {
        event.preventDefault();
        ref.current.undo();
        return;
      }
      if (mod && (key === "y" || (key === "z" && event.shiftKey))) {
        event.preventDefault();
        ref.current.redo();
        return;
      }
      if (mod && key === "c") {
        event.preventDefault();
        ref.current.copy();
        return;
      }
      if (mod && key === "v") {
        event.preventDefault();
        ref.current.paste();
        return;
      }
      if (mod && key === "d") {
        event.preventDefault();
        ref.current.duplicate();
        return;
      }
      const step = event.shiftKey ? 5 : 1;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        ref.current.nudge(-step, 0);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        ref.current.nudge(step, 0);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        ref.current.nudge(0, -step);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        ref.current.nudge(0, step);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        ref.current.remove();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

export function clampPercent(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value * 100) / 100));
}
