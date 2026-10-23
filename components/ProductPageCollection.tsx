import Image from "next/image";
import { catalogImageFor } from "@/lib/catalogImages";

const collectionItems = [
  { label: "Top products, starting at $10", img: catalogImageFor("business cards") },
  { label: "Gifts for clients & employees", img: catalogImageFor("promo products") },
  { label: "Prepare for professional events", img: catalogImageFor("brochures") },
  { label: "Prepare for local & community events", img: catalogImageFor("signs posters") },
  { label: "2-day delivery", img: catalogImageFor("packaging") },
  { label: "Launch my business", img: catalogImageFor("stickers labels") },
];

export default function ProductPageCollection() {
  return (
    <section className="relative">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#329AD4]">Collections</p>
          <h2 className="mt-1.5 text-2xl sm:text-[1.75rem] font-black tracking-[-0.035em] text-[#1e1d1b]">
            Shop by collection
          </h2>
        </div>
        <a
          href="#"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e1d1b] hover:text-[#329AD4] transition-colors underline decoration-[#329AD4]/40 underline-offset-4"
        >
          See all collections
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-5">
        {collectionItems.map((item, idx) => (
          <div key={idx} className="flex flex-col group cursor-pointer">
            <div className="relative w-full aspect-square overflow-hidden rounded-[1.15rem] bg-[#eef7fc] border border-[#d7e8f4] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#88c9ef]">
              <Image
                src={item.img}
                alt={item.label}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1e1d1b]/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100"
              />
            </div>
            <p className="mt-3 text-sm font-bold text-[#1e1d1b] leading-snug group-hover:text-[#329AD4] transition-colors">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <a
        href="#"
        className="mt-5 sm:hidden inline-flex items-center gap-1.5 text-sm font-semibold text-[#329AD4]"
      >
        See all collections
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </section>
  );
}
