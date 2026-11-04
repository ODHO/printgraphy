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
    <section className="w-full bg-[#E3F2FF]">
      <div className="grid min-h-[480px] lg:min-h-[540px] lg:grid-cols-2">
        {/* Left copy — match reference: ice bg, navy type, charcoal body, royal CTA */}
        <div className="flex flex-col justify-center bg-[#E3F2FF] px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#042E7B] px-3 py-1 text-[11px] font-bold tracking-[0.04em] text-white uppercase">
              {badge}
            </span>
            <span className="text-sm font-medium text-[#042E7B]">{offerNote}</span>
          </div>

          <h1 className="mt-5 max-w-xl text-[2rem] font-black leading-[1.08] tracking-[-0.035em] text-[#042E7B] sm:text-4xl xl:text-[2.75rem]">
            {hero.title}
          </h1>

          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[#3d4654]">
            {hero.body}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href={hero.primaryHref || "/browsedesigns"}
              className="rounded-xl bg-[#004EE0] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#042E7B]"
            >
              {hero.primaryLabel}
            </Link>
            <Link
              href={hero.secondaryHref || "/browsedesigns"}
              className="text-sm font-semibold text-[#042E7B] underline decoration-[#042E7B] decoration-1 underline-offset-4 hover:text-[#004EE0] hover:decoration-[#004EE0]"
            >
              {hero.secondaryLabel}
            </Link>
          </div>
        </div>

        {/* Right image — keep existing asset/layout treatment */}
        <div className="relative min-h-[300px] sm:min-h-[360px] lg:min-h-full">
          {local ? (
            <Image
              src={src}
              alt={hero.imageAlt}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          ) : (
            <img
              src={src}
              alt={hero.imageAlt}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </div>
      </div>
    </section>
  );
}
