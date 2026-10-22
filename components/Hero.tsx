import Image from "next/image";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import type { HomepageContent } from "@/lib/homepageContent";

export default function Hero({ hero }: { hero: HomepageContent["hero"] }) {
  const src = hero.image?.includes("hero-invitations.png")
    ? "/banners/hero-invitations-v2.png"
    : mediaSrc(hero.image) || hero.image;
  const local = src.startsWith("/") && !src.startsWith("/api/");
  const badge = hero.accent || "UP TO 50% OFF";
  const offerNote = hero.highlight || "Code: SAVEVP • Ends Nov. 8";

  return (
    <section className="bg-[#EAF5FB] px-3 pb-3 sm:px-5 sm:pb-5 lg:px-7 lg:pb-7">
      <div className="grid min-h-[520px] overflow-hidden rounded-b-[2rem] bg-[#EAF5FB] lg:grid-cols-2 lg:rounded-b-[2.5rem]">
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#329AD4] px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-white">
              {badge}
            </span>
            <span className="text-sm text-zinc-600">{offerNote}</span>
          </div>
          <h1 className="mt-5 max-w-xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-[#1e1d1b] sm:text-5xl xl:text-6xl">
            {hero.title}
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-zinc-700">
            {hero.body}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href={hero.primaryHref || "/browsedesigns"}
              className="rounded-full bg-[#329AD4] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2884b8]"
            >
              {hero.primaryLabel}
            </Link>
            <Link
              href={hero.secondaryHref || "/browsedesigns"}
              className="text-sm font-semibold text-[#1e1d1b] underline decoration-[#329AD4] decoration-2 underline-offset-4 hover:text-[#329AD4]"
            >
              {hero.secondaryLabel}
            </Link>
          </div>
        </div>
        <div className="relative m-3 min-h-[320px] overflow-hidden rounded-[1.5rem] lg:m-5 lg:ml-0 lg:rounded-[2rem]">
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
