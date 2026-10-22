import Image from "next/image";
import { mediaSrc } from "@/lib/mediaUrl";
import type { HomepageContent } from "@/lib/homepageContent";
import Link from "next/link";
import { catalogImageFor } from "@/lib/catalogImages";

function SectionImage({ src, alt, sizes, className }: { src: string; alt: string; sizes: string; className: string }) {
  const resolved = mediaSrc(src) || src;
  const local = resolved.startsWith("/") && !resolved.startsWith("/api/");
  if (local) return <Image src={resolved} alt={alt} fill sizes={sizes} className={className} />;
  return <img src={resolved} alt={alt} className={`absolute inset-0 h-full w-full ${className}`} />;
}

/* ─────────────────────────────────────────────
   Section 1 — Tools Grid
───────────────────────────────────────────── */
function ToolsGrid({ tools }: { tools: HomepageContent["tools"] }) {
  const [left, social, corporate, right] = tools.items;
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-900 text-center leading-tight mb-10">
        {tools.title}
      </h2>

      {/* 3-column bento-style grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Cell 1 — Logo Design (tall, spans full left) */}
        <Link href={left?.href || "/"} className="group relative rounded-2xl border border-zinc-200 bg-white overflow-hidden flex flex-col cursor-pointer hover:border-theme-blue/40 hover:shadow-lg transition-all duration-300">
          <div className="relative flex-1 min-h-[220px]">
              {left && <SectionImage src={catalogImageFor(left.label)} alt={left.label} sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
          </div>
          <div className="px-5 py-4 bg-white border-t border-zinc-100">
            <p className="text-[15px] font-bold text-zinc-900 group-hover:text-theme-blue transition-colors duration-200">
              {left?.label}
            </p>
          </div>
        </Link>

        {/* Cell 2 — Two stacked cards: Social Media + Printgraphy Corporate */}
        <div className="flex flex-col gap-4">
          {/* Social Media */}
          <Link href={social?.href || "/"} className="group relative rounded-2xl border border-zinc-200 bg-white overflow-hidden flex items-center gap-4 px-5 py-4 cursor-pointer hover:border-theme-blue/40 hover:shadow-md transition-all duration-300 flex-1">
            <p className="text-base font-bold text-zinc-900 group-hover:text-theme-blue transition-colors duration-200 leading-snug w-[120px] flex-shrink-0">
              {social?.label}
            </p>
            <div className="relative flex-1 h-[110px] rounded-xl overflow-hidden">
              {social && <SectionImage src={catalogImageFor(social.label)} alt={social.label} sizes="200px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
            </div>
          </Link>

          {/* Printgraphy Corporate Services */}
          <Link href={corporate?.href || "/"} className="group relative rounded-2xl border border-zinc-200 bg-white overflow-hidden flex items-center gap-4 px-5 py-4 cursor-pointer hover:border-theme-blue/40 hover:shadow-md transition-all duration-300 flex-1">
            <p className="text-base font-bold text-zinc-900 group-hover:text-theme-blue transition-colors duration-200 leading-snug w-[120px] flex-shrink-0">
              {corporate?.label}
            </p>
            <div className="relative flex-1 h-[110px] rounded-xl overflow-hidden">
              {corporate && <SectionImage src={catalogImageFor(corporate.label)} alt={corporate.label} sizes="200px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
            </div>
          </Link>
        </div>

        {/* Cell 3 — Custom Business Websites (tall, spans full right) */}
        <Link href={right?.href || "/"} className="group relative rounded-2xl border border-zinc-200 bg-white overflow-hidden flex flex-col cursor-pointer hover:border-theme-blue/40 hover:shadow-lg transition-all duration-300">
          <div className="relative flex-1 min-h-[220px]">
              {right && <SectionImage src={catalogImageFor(right.label)} alt={right.label} sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
          </div>
          <div className="px-5 py-4 bg-white border-t border-zinc-100">
            <p className="text-[15px] font-bold text-zinc-900 group-hover:text-theme-blue transition-colors duration-200">
              {right?.label}
            </p>
          </div>
        </Link>

      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Section 2 — New In (4-column grid)
───────────────────────────────────────────── */
function NewInGrid({ newIn }: { newIn: HomepageContent["newIn"] }) {
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* Two-column header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-8">
        <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 leading-snug max-w-xs">
          {newIn.title}
        </h2>
        <p className="text-base text-zinc-500 leading-relaxed max-w-xs sm:max-w-sm sm:text-right">
          {newIn.subtitle}
        </p>
      </div>

      {/* 4-column grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {newIn.items.map((item, idx) => (
          <Link key={idx} href={item.href || "/"} className="flex flex-col group cursor-pointer">
            {/* Image */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-100 shadow-sm group-hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
              <SectionImage src={catalogImageFor(item.label)} alt={item.label} sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            {/* Label */}
            <p className="mt-3 text-base sm:text-base font-semibold text-zinc-800 leading-snug group-hover:text-theme-blue transition-colors duration-200">
              {item.label}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Combined Export
───────────────────────────────────────────── */
export default function GrowthSections({ tools, newIn }: { tools: HomepageContent["tools"]; newIn: HomepageContent["newIn"] }) {
  return (
    <>
      <ToolsGrid tools={tools} />
      <NewInGrid newIn={newIn} />
    </>
  );
}
