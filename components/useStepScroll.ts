"use client";

import { useEffect, useRef } from "react";

function scrollToY(y: number) {
  window.scrollTo(0, y);
  document.documentElement.scrollTop = y;
}

/** Moving forward opens the step at the top. Going back returns to the saved place. */
export function useStepScroll(step: string, order: readonly string[]) {
  const positions = useRef<Record<string, number>>({});
  const previous = useRef(step);

  const orderKey = order.join("|");

  useEffect(() => {
    const from = previous.current;
    if (from === step) return;
    const steps = orderKey.split("|");
    positions.current[from] = window.scrollY;
    const goingBack = steps.indexOf(step) < steps.indexOf(from);
    const top = goingBack ? positions.current[step] ?? 0 : 0;
    scrollToY(top);
    const frame = requestAnimationFrame(() => scrollToY(top));
    previous.current = step;
    return () => cancelAnimationFrame(frame);
  }, [step, orderKey]);
}
