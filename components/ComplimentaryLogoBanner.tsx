import Image from "next/image";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import type { HomepageContent } from "@/lib/homepageContent";

export default function ComplimentaryLogoBanner({ banner }: { banner: HomepageContent["logoBanner"] }) {
  const src = mediaSrc(banner.image) || banner.image || "/catalog/promo-products-v2.png";
  const local = src.startsWith("/") && !src.startsWith("/api/");

  return (
    <section className="bg-white pt-4 pb-3 sm:pt-6 sm:pb-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-[1.5rem] bg-[#E3F2FF] md:grid-cols-2">
          <div className="flex flex-col justify-center px-8 py-10 sm:px-12 sm:py-14 lg:px-14">
            <h2 className="max-w-md text-2xl font-extrabold leading-tight tracking-tight text-[#042E7B] sm:text-3xl md:text-[2rem]">
              {banner.title}
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#3d4654]">
              {banner.body}
            </p>
            <div className="mt-7">
              <Link
                href={banner.ctaHref || "/business-cards"}
                className="inline-flex items-center rounded-lg bg-[#042E7B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#004EE0]"
              >
                {banner.ctaLabel}
              </Link>
            </div>
          </div>

          <div className="relative min-h-[240px] sm:min-h-[300px] md:min-h-full">
            {local ? (
              <Image
                src={src}
                alt={banner.imageAlt || banner.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center"
              />
            ) : (
              <img
                src={src}
                alt={banner.imageAlt || banner.title}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
