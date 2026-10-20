"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { mediaSrc } from "@/lib/mediaUrl";
import type { HomepageContent } from "@/lib/homepageContent";
import Link from "next/link";

interface PhotoItem {
  src: string;
  handle: string;
  href?: string;
}

const BASE_PHOTOS: PhotoItem[] = [
  { src: "/photo-1.png", handle: "@thelotsflowerscove", href: "/business-cards" },
  { src: "/photo-2.png", handle: "@partysparklebyjen", href: "/business-cards" },
  { src: "/photo-3.png", handle: "@shimmy.shimmy.bang", href: "/business-cards" },
  { src: "/photo-4.png", handle: "@chickaandco", href: "/business-cards" },
];

// Triple-clone for seamless infinite loop: [copy1] [copy2=real] [copy3]
export default function MadeWithXPrintz({ madeWith }: { madeWith: HomepageContent["madeWith"] }) {
  const base: PhotoItem[] = madeWith.photos.length
    ? madeWith.photos.map((photo) => ({ src: mediaSrc(photo.image) || photo.image, handle: photo.handle, href: photo.href }))
    : BASE_PHOTOS;
  const photos = [...base, ...base, ...base];
  const [index, setIndex] = useState(base.length);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasTransition, setHasTransition] = useState(true);

  // Drag / swipe state
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Responsive: 2 on mobile, 4 on desktop
  const [visible, setVisible] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setVisible(window.innerWidth < 640 ? 2 : 4);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Navigation ──────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (isAnimating) return;
    setHasTransition(true);
    setIsAnimating(true);
    setIndex((i) => i + 1);
  }, [isAnimating]);

  const goPrev = useCallback(() => {
    if (isAnimating) return;
    setHasTransition(true);
    setIsAnimating(true);
    setIndex((i) => i - 1);
  }, [isAnimating]);

  // After slide ends — silently snap back to middle copy if at boundary
  const handleTransitionEnd = useCallback(() => {
    setIsAnimating(false);
    setDragDelta(0);
    if (index >= base.length * 2) {
      setHasTransition(false);
      setIndex((i) => i - base.length);
    } else if (index < base.length) {
      setHasTransition(false);
      setIndex((i) => i + base.length);
    }
  }, [index, base.length]);

  // ── Drag / Touch handlers ────────────────────────────────────
  const onDragStart = (clientX: number) => {
    if (isAnimating) return;
    setDragStartX(clientX);
    setIsDragging(true);
    setHasTransition(false);
  };

  const onDragMove = (clientX: number) => {
    if (!isDragging || dragStartX === null || !containerRef.current) return;
    const delta = clientX - dragStartX;
    setDragDelta(delta);
  };

  const onDragEnd = () => {
    if (!isDragging || !containerRef.current) return;
    setIsDragging(false);
    setHasTransition(true);
    const threshold = containerRef.current.clientWidth / visible / 3;
    if (dragDelta < -threshold) {
      goNext();
    } else if (dragDelta > threshold) {
      goPrev();
    } else {
      // Snap back
      setDragDelta(0);
      setIsAnimating(true);
    }
    setDragStartX(null);
  };

  // ── Transform calculation ────────────────────────────────────
  // Each card occupies (1/PHOTOS.length * 100)% of the track
  // Track width = (PHOTOS.length / visible) * 100% of container
  const trackWidthFactor = photos.length / visible;
  const baseTranslatePct = -(index / photos.length) * 100; // as % of track
  // Add drag offset (pixels → % of track)
  const dragOffsetPct = containerRef.current
    ? (dragDelta / (containerRef.current.clientWidth * trackWidthFactor)) * 100
    : 0;
  const translateX = baseTranslatePct + dragOffsetPct;

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-16">

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-8">
        <div className="max-w-sm">
          <h2 className="text-xl md:text-[22px] font-extrabold text-zinc-900 leading-snug">
            {madeWith.titleBefore}{" "}
            <span className="text-theme-blue">{madeWith.titleAccent}</span>
          </h2>
          <p className="mt-2 text-base text-zinc-500 leading-relaxed">
            {madeWith.body}
          </p>
        </div>

        {/* Arrow Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
          <button
            onClick={goPrev}
            aria-label="Previous photos"
            className="w-9 h-9 border border-zinc-300 hover:border-theme-blue text-zinc-600 hover:text-theme-blue rounded-lg flex items-center justify-center bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            aria-label="Next photos"
            className="w-9 h-9 border border-zinc-300 hover:border-theme-blue text-zinc-600 hover:text-theme-blue rounded-lg flex items-center justify-center bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Carousel Viewport */}
      <div
        ref={containerRef}
        className="overflow-hidden w-full rounded-2xl select-none"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        /* Mouse drag */
        onMouseDown={(e) => onDragStart(e.clientX)}
        onMouseMove={(e) => onDragMove(e.clientX)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        /* Touch drag */
        onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
        onTouchEnd={onDragEnd}
      >
        {/* Sliding Track */}
        <div
          onTransitionEnd={handleTransitionEnd}
          className="flex"
          style={{
            width: `${trackWidthFactor * 100}%`,
            transform: `translateX(${translateX}%)`,
            transition: hasTransition && !isDragging
              ? "transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
              : "none",
          }}
        >
          {photos.map((photo, idx) => (
            <div
              key={idx}
              className="relative flex-shrink-0 px-2"
              style={{ width: `${100 / photos.length}%` }}
            >
              <Link href={photo.href || "/business-cards"} className="relative w-full aspect-square rounded-2xl overflow-hidden group block">
                {photo.src.startsWith("/") && !photo.src.startsWith("/api/") ? (
                  <Image src={photo.src} alt={photo.handle} fill draggable={false} sizes="(max-width: 640px) 50vw, 25vw" className="object-cover pointer-events-none" />
                ) : (
                  <img src={photo.src} alt={photo.handle} draggable={false} className="absolute inset-0 h-full w-full object-cover pointer-events-none" />
                )}
                {/* Handle badge */}
                <div className="absolute bottom-0 left-0 right-0 px-3 py-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                  <span className="text-white text-base font-semibold tracking-wide drop-shadow">
                    {photo.handle}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
