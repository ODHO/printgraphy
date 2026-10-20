"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const positions = new Map<string, number>();

function scrollToY(y: number) {
  window.scrollTo(0, y);
  document.documentElement.scrollTop = y;
}

/** New pages open at the top. The browser Back button returns to the saved place. */
export default function ScrollMemory() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  const popped = useRef(false);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    let skip = false;
    const save = () => {
      if (!skip) positions.set(pathname, window.scrollY);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      skip = true;
      positions.set(pathname, window.scrollY);
      window.removeEventListener("scroll", save);
    };
  }, [pathname]);

  useEffect(() => {
    const from = previous.current;
    const restore = popped.current;
    popped.current = false;
    if (!from || from === pathname) {
      previous.current = pathname;
      return;
    }
    const top = restore ? positions.get(pathname) ?? 0 : 0;
    scrollToY(top);
    const frame = requestAnimationFrame(() => scrollToY(top));
    const timer = window.setTimeout(() => scrollToY(top), 0);
    previous.current = pathname;
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
