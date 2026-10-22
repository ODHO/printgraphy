import Image from "next/image";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import type { HomepageContent } from "@/lib/homepageContent";

export default function ComplimentaryLogoBanner({ banner }: { banner: HomepageContent["logoBanner"] }) {
  const src = mediaSrc(banner.image) || banner.image;
  const local = src.startsWith("/") && !src.startsWith("/api/");
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full bg-[#1e1d1b] rounded-[2rem] flex flex-col md:flex-row items-center gap-0 overflow-hidden">

        {/* Left: Text Content */}
        <div className="flex-1 px-8 sm:px-12 py-10 md:py-12 flex flex-col items-start gap-5">
          <h2 className="text-2xl sm:text-[28px] font-extrabold text-white leading-snug">
            {banner.title}
          </h2>
          <p className="text-base sm:text-[15px] text-white/70 leading-relaxed max-w-[300px]">
            {banner.body}
          </p>
          <Link
            href={banner.ctaHref || "/quote"}
            className="inline-flex items-center px-7 py-3 bg-[#e74b2d] hover:bg-white hover:text-[#1e1d1b] text-white text-base font-semibold rounded-full shadow-md shadow-black/20 transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            {banner.ctaLabel}
          </Link>
        </div>

        {/* Right: Image with internal rounded corners + margin */}
        <div className="w-full md:w-[58%] flex-shrink-0 p-4 pl-0">
          <div className="relative w-full h-[220px] md:h-[280px] rounded-[1.4rem] overflow-hidden">
            {local ? (
              <Image src={src} alt={banner.imageAlt} fill sizes="(max-width: 768px) 100vw, 58vw" className="object-cover object-center" priority />
            ) : (
              <img src={src} alt={banner.imageAlt} className="absolute inset-0 h-full w-full object-cover object-center" />
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
