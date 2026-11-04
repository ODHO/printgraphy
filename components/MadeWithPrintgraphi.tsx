import Image from "next/image";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import { catalogImageFor } from "@/lib/catalogImages";
import type { HomepageContent } from "@/lib/homepageContent";

const FALLBACK_PHOTOS = [
  { image: "/catalog/business-stationery-v2.png", handle: "@bloom_boutique", href: "/business-cards" },
  { image: "/catalog/promo-products-v2.png", handle: "@roasters_den", href: "/business-cards" },
  { image: "/catalog/packaging-v2.png", handle: "@clay_studio", href: "/business-cards" },
  { image: "/catalog/stickers-labels-v2.png", handle: "@paper_crafts", href: "/business-cards" },
  { image: "/catalog/apparel-totes-v2.png", handle: "@wear_art", href: "/clothing-bags" },
];

function resolveSrc(image?: string, handle?: string) {
  const trimmed = (image || "").trim();
  if (
    trimmed &&
    !trimmed.includes("placeholder") &&
    trimmed !== "/slide.png" &&
    trimmed !== "/placeholder.jpg"
  ) {
    return mediaSrc(trimmed) || trimmed;
  }
  return catalogImageFor(handle);
}

export default function MadeWithPrintgraphi({
  madeWith,
}: {
  madeWith: HomepageContent["madeWith"];
}) {
  const photos =
    Array.isArray(madeWith.photos) && madeWith.photos.length > 0
      ? madeWith.photos
      : FALLBACK_PHOTOS;

  return (
    <section className="bg-white py-12 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#042E7B] sm:text-3xl md:text-[2rem]">
            {madeWith.titleBefore}{" "}
            <span className="text-[#042E7B]">{madeWith.titleAccent}</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#5b6472] sm:text-base">
            {madeWith.body}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-5">
          {photos.map((photo, idx) => {
            const src = resolveSrc(photo.image, photo.handle);
            const local = src.startsWith("/") && !src.startsWith("/api/");

            return (
              <Link
                key={`${photo.handle}-${idx}`}
                href={photo.href || "/business-cards"}
                className="group flex flex-col"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#E3F2FF]">
                  {local ? (
                    <Image
                      src={src}
                      alt={photo.handle}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <img
                      src={src}
                      alt={photo.handle}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                </div>
                <p className="mt-2.5 text-sm font-medium text-[#4b5563] transition group-hover:text-[#004EE0]">
                  {photo.handle}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
