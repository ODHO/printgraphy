import Image from "next/image";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import { catalogImageFor } from "@/lib/catalogImages";
import type { HomepageContent } from "@/lib/homepageContent";

function resolveImage(label: string, category: string, image?: string) {
  const trimmed = (image || "").trim();
  if (
    trimmed &&
    !trimmed.includes("placeholder") &&
    trimmed !== "/slide.png" &&
    trimmed !== "/placeholder.jpg"
  ) {
    return mediaSrc(trimmed);
  }
  return catalogImageFor(label, category);
}

export default function AmbassadorSpotlight({
  spotlight,
}: {
  spotlight: HomepageContent["spotlight"];
}) {
  const items = spotlight.items || [];

  return (
    <section className="bg-white py-12 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <h2 className="max-w-3xl text-2xl font-extrabold tracking-tight text-[#042E7B] sm:text-3xl md:text-[2rem]">
            {spotlight.title}
          </h2>
          <Link
            href={spotlight.seeAllHref || "/business-cards"}
            className="shrink-0 pt-1 text-sm font-semibold text-[#004EE0] underline decoration-[#004EE0]/50 underline-offset-4 transition hover:text-[#042E7B]"
          >
            {spotlight.seeAllLabel || "Read More"}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {items.map((item, idx) => {
            const src = resolveImage(item.label, item.category, item.image);
            const local = src.startsWith("/") && !src.startsWith("/api/");

            return (
              <Link
                key={`${item.label}-${idx}`}
                href={item.href || "/business-cards"}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white transition hover:border-[#99CAFF]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#E3F2FF]">
                  {local ? (
                    <Image
                      src={src}
                      alt={item.label}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
                <div className="flex flex-col gap-1.5 px-4 py-4">
                  <p className="text-[11px] font-bold tracking-[0.08em] text-[#1883FF] uppercase">
                    {item.category}
                  </p>
                  <h3 className="text-[15px] font-bold leading-snug text-[#111827] transition group-hover:text-[#004EE0]">
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
