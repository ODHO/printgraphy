"use client";

import { useEffect, useState, useRef } from "react";

export default function GlobalApiLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeRequestsRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Attempt auto-play video
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Ignore video autoplay policy restrictions if any
      });
    }

    const checkStateAndFinish = () => {
      if (activeRequestsRef.current <= 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setIsLoading(false);
            setIsFadingOut(false);
          }, 500); // 500ms fade transition
        }, 400); // 400ms minimum display threshold to avoid rapid flicker
      }
    };

    // Override window.fetch to monitor pending API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";
      const isStream = url.includes("/stream") || url.includes("events");

      if (!isStream) {
        activeRequestsRef.current += 1;
        setIsLoading(true);
        setIsFadingOut(false);
      }

      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        if (!isStream) {
          activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
          checkStateAndFinish();
        }
      }
    };

    // Safety timeout: stop loader after 6s in case an API hangs indefinitely
    const safetyTimer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsFadingOut(false);
      }, 500);
    }, 6000);

    // Initial check after mount in case no APIs are immediately fetched
    const initialCheckTimer = setTimeout(() => {
      checkStateAndFinish();
    }, 800);

    return () => {
      window.fetch = originalFetch;
      clearTimeout(safetyTimer);
      clearTimeout(initialCheckTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Lock body scroll while loader is active
  useEffect(() => {
    if (isLoading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white dark:bg-white transition-opacity duration-500 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="Loading site content..."
      role="status"
    >
      <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl">
        <video
          ref={videoRef}
          src="/logo/loader.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-2xl"
        />
      </div>
    </div>
  );
}
