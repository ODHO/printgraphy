"use client";

import Image from "next/image";
import Link from "next/link";

import { mediaSrc } from "@/lib/mediaUrl";
import { catalogImageFor } from "@/lib/catalogImages";
import type { HomepageContent } from "@/lib/homepageContent";

function resolveCollectionImage(label: string, image?: string) {
  const trimmed = (image || "").trim();
  if (
    trimmed &&
    !trimmed.includes("placeholder") &&
    trimmed !== "/slide.png" &&
    trimmed !== "/placeholder.jpg"
  ) {
    return mediaSrc(trimmed);
  }
  return catalogImageFor(label);
}

export default function ShopByCollection({
  collections,
}: {
  collections: HomepageContent["collections"];
}) {
  const items = collections.items || [];

  return (
    <section className="bg-[#f3f5f8] py-12 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#042E7B] sm:text-3xl md:text-[2rem]">
            {collections.title}
          </h2>
          <Link
            href={collections.seeAllHref || "/business-cards"}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#004EE0] transition hover:text-[#042E7B] sm:text-base"
          >
            {collections.seeAllLabel}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {items.map((item, idx) => {
            const src = resolveCollectionImage(item.label, item.image);
            const local = src.startsWith("/") && !src.startsWith("/api/");

            return (
              <Link
                key={`${item.href}-${item.label}-${idx}`}
                href={item.href || "/business-cards"}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white transition hover:border-[#99CAFF]"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#E3F2FF]">
                  {local ? (
                    <Image
                      src={src}
                      alt={item.label}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <img
                      src={src}
                      alt={item.label}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                </div>
                <div className="flex items-center px-4 py-4 sm:px-5 sm:py-5">
                  <h3 className="text-[15px] font-bold leading-snug text-[#1f2937] transition group-hover:text-[#004EE0] sm:text-base">
                    {item.label}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
