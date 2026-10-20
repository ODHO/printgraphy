"use client";

import React, { useEffect, useRef, useState } from "react";

/** Keeps a fixed-pixel card design inside the preview column without squashing it. */
export default function ScaledCardStage({
  width,
  height,
  children,
  className = "",
  fill = false,
}: {
  width: number;
  height: number;
  children: React.ReactNode;
  className?: string;
  fill?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const update = () => {
      const available = frame.clientWidth;
      const availableHeight = frame.clientHeight;
      if (!available || !width) return;
      const widthScale = available / width;
      const heightScale = fill && availableHeight ? availableHeight / height : 1;
      setScale(fill ? Math.min(widthScale, heightScale) : Math.min(1, widthScale));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [width, height, fill]);

  return (
    <div
      ref={frameRef}
      className={`${fill ? "absolute inset-0" : "w-full"} flex items-center justify-center ${className}`}
      style={fill ? undefined : { height: Math.max(1, Math.round(height * scale)) }}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
