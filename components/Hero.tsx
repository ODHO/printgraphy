import Image from "next/image";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import type { HomepageContent } from "@/lib/homepageContent";

export default function Hero({ hero }: { hero: HomepageContent["hero"] }) {
  const src = mediaSrc(hero.image) || hero.image;
  const local = src.startsWith("/") && !src.startsWith("/api/");
  const badge = hero.accent || "UP TO 50% OFF";
  const offerNote = hero.highlight || "Code: SAVEVP • Ends Nov. 8";

  return (
    <section className="bg-[#EAF5FB]">
      <div className="grid min-h-[520px] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#329AD4] px-3 py-1 text-[11px] font-bold tracking-wide text-white">
              {badge}
            </span>
            <span className="text-sm text-zinc-600">{offerNote}</span>
          </div>
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-[#329AD4] sm:text-5xl">
            {hero.title}
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-zinc-600">
            {hero.body}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href={hero.primaryHref || "/browsedesigns"}
              className="rounded-lg bg-[#329AD4] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2884b8]"
            >
              {hero.primaryLabel}
            </Link>
            <Link
              href={hero.secondaryHref || "/browsedesigns"}
              className="text-sm font-semibold text-[#329AD4] underline underline-offset-4 hover:text-[#2884b8]"
            >
              {hero.secondaryLabel}
            </Link>
          </div>
        </div>
        <div className="relative h-full min-h-[320px]">
          {local ? (
            <Image src={src} alt={hero.imageAlt} fill priority className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
          ) : (
            <img src={src} alt={hero.imageAlt} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
      </div>
    </section>
  );
}
