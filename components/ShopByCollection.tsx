"use client";

import { useRef } from "react";
import Image from "next/image";

import { mediaSrc } from "@/lib/mediaUrl";
import type { HomepageContent } from "@/lib/homepageContent";

export default function ShopByCollection({ collections }: { collections: HomepageContent["collections"] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -320 : 320,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-7">
        <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900">
          {collections.title}
        </h2>
        <a
          href={collections.seeAllHref || "#"}
          className="flex items-center gap-1.5 text-base font-semibold text-theme-blue hover:underline transition-colors"
        >
          {collections.seeAllLabel}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Outer wrapper: light bg card */}
      <div className="relative bg-[#EFF5FA] rounded-3xl px-10 py-8">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-zinc-200 hover:border-theme-blue text-zinc-600 hover:text-theme-blue rounded-lg flex items-center justify-center shadow-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {collections.items.map((item, idx) => {
            const src = mediaSrc(item.image) || item.image || "/slide.png";
            const local = src.startsWith("/") && !src.startsWith("/api/");
            return (
            <a
              key={idx}
              href={item.href || "#"}
              className="flex-shrink-0 w-[130px] sm:w-[150px] md:w-[160px] flex flex-col group cursor-pointer"
            >
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
                {local ? (
                  <Image src={src} alt={item.label} fill sizes="160px" className="object-cover" />
                ) : (
                  <img src={src} alt={item.label} className="absolute inset-0 h-full w-full object-cover" />
                )}
              </div>
              {/* Label */}
              <p className="mt-3 text-base font-semibold text-zinc-800 leading-snug group-hover:text-theme-blue transition-colors duration-200">
                {item.label}
              </p>
            </a>
          );})}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-zinc-200 hover:border-theme-blue text-zinc-600 hover:text-theme-blue rounded-lg flex items-center justify-center shadow-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}
