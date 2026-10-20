"use client";

import { useEffect, useRef } from "react";

export function useMessageStream(url: string, onMessage: () => void) {
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    if (!url) return;
    const source = new EventSource(url);
    source.onmessage = () => handler.current();
    return () => source.close();
  }, [url]);
}

export function useLiveRefresh(onRefresh: () => void) {
  const handler = useRef(onRefresh);
  handler.current = onRefresh;

  useEffect(() => {
    const run = () => handler.current();
    window.addEventListener("xprints-live", run);
    return () => window.removeEventListener("xprints-live", run);
  }, []);
}
