"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SquareCardsShowcase from "@/components/SquareCardsShowcase";
import ShopByBusinessUse from "@/components/ShopByBusinessUse";
import TemplateArtwork from "@/components/TemplateArtwork";
import ThreeDCardPreview from "@/components/ThreeDCardPreview";
import PurchaseTemplateModal from "@/components/PurchaseTemplateModal";
import { STUDIO_LAYOUT } from "@/lib/cardRender";
import { registerHref, viewerIsSignedIn } from "@/lib/accountGate";
import { mediaSrc } from "@/lib/mediaUrl";

/* ── Star Rating Component ───────────────────── */
function Stars({ rating = 4.5, count = 0 }: { rating?: number; count?: number }) {
  return (
    <div className="flex items-center gap-1 mt-1.5">
      <div className="flex text-yellow-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg
            key={s}
            className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "fill-current" : "text-zinc-300 fill-current"}`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-base text-zinc-500 font-medium ml-1">
        {rating} ({count.toLocaleString()})
      </span>
    </div>
  );
}

/* ── Dynamic Category Sidebar Component ──────────────────── */
interface ApiCategoryVariationValue {
  _id?: string;
  name: string;
  image?: string;
  price: number;
  description?: string;
}

interface ApiCategoryVariation {
  _id?: string;
  name: string;
  required?: boolean;
  values: ApiCategoryVariationValue[];
}

interface ApiCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  canvas_width: number;
  canvas_height: number;
  unit: string;
  orientation: string;
  bleed?: number;
  safe_area?: number;
  price?: number;
  unitPrice?: string;
  variations?: ApiCategoryVariation[];
}

interface CategorySidebarProps {
  categories: ApiCategory[];
  selectedCategory: string;
  onSelectCategory: (name: string) => void;
}

function CategorySidebar({ categories, selectedCategory, onSelectCategory }: CategorySidebarProps) {
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");

  const isSpecificCategory = Boolean(selectedCategory && selectedCategory.toLowerCase() !== "all");
  const selectedFamily = isSpecificCategory
    ? selectedCategory.trim().toLowerCase().replace(/s$/, "")
    : "";

  // Sort categories alphabetically A to Z by name
  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  // When a specific category (e.g. Postcards) is active, ONLY show matching categories in that family (e.g. Postcards, Postcards (A6))
  const familyCategories = useMemo(() => {
    if (!isSpecificCategory) return sortedCategories;
    const matches = sortedCategories.filter((cat) => {
      const lower = cat.name.toLowerCase();
      return lower.includes(selectedFamily) || selectedCategory.toLowerCase().includes(lower);
    });
    return matches.length > 0
      ? matches
      : sortedCategories.filter((c) => c.name.toLowerCase() === selectedCategory.toLowerCase());
  }, [sortedCategories, isSpecificCategory, selectedFamily, selectedCategory]);

  const filteredCategories = familyCategories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Collect finishes only for the displayed category family
  const categoryFinishes = familyCategories.flatMap((cat) =>
    (cat.variations || []).flatMap((vGroup) =>
      vGroup.values.map((val) => ({
        categoryName: cat.name,
        groupName: vGroup.name,
        optionName: val.name,
        price: val.price,
      }))
    )
  );

  return (
    <aside className="w-full bg-white rounded-3xl shadow-xs border border-zinc-200/80 p-5 sticky top-24">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
        <div>
          <h2 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <span>{isSpecificCategory ? selectedCategory : "Categories & Canvas"}</span>
          </h2>
          {isSpecificCategory && (
            <p className="text-[11px] font-semibold text-zinc-400 mt-0.5">
              {familyCategories.length > 1
                ? `${familyCategories.length} sizes & formats available`
                : "Active product format"}
            </p>
          )}
        </div>
        {isSpecificCategory && (
          <button
            onClick={() => onSelectCategory("all")}
            className="text-xs font-bold text-[#1d90cf] hover:underline cursor-pointer flex items-center gap-1"
            title="Browse all product categories"
          >
            <span>← All Categories</span>
          </button>
        )}
      </div>

      {/* Category Search Filter - only shown when more than 5 items */}
      {familyCategories.length > 5 && (
        <div className="relative mt-3">
          <svg className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Filter sizes & formats..."
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#1d90cf] transition-all"
          />
          {categorySearch && (
            <button
              type="button"
              onClick={() => setCategorySearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-[10px] font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Dynamic Product Categories & Variations list */}
      <div className="flex flex-col gap-1.5 mt-4">
        {!isSpecificCategory && (
          <button
            onClick={() => onSelectCategory("all")}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
              selectedCategory === "all"
                ? "bg-[#1d90cf] text-white shadow-md shadow-[#1d90cf]/25"
                : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>✨</span>
              <span>All Categories</span>
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === "all" ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"}`}>
              {sortedCategories.length}
            </span>
          </button>
        )}

        {filteredCategories.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
          const isHovered = hoveredCatId === cat._id;
          const isExpanded = isSelected || isHovered;
          const hasVariations = cat.variations && cat.variations.length > 0;

          return (
            <div
              key={cat._id}
              className="group relative"
              onMouseEnter={() => setHoveredCatId(cat._id)}
              onMouseLeave={() => setHoveredCatId(null)}
            >
              <button
                onClick={() => onSelectCategory(cat.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-[#1d90cf] text-white font-bold shadow-md shadow-[#1d90cf]/25"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 font-medium"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  {cat.image ? (
                    <img
                      src={mediaSrc(cat.image)}
                      alt=""
                      className="w-6 h-6 rounded-lg object-cover shrink-0 border border-white/20 bg-white"
                    />
                  ) : (
                    <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${isSelected ? "bg-white" : "bg-zinc-300 group-hover:bg-[#1d90cf]"}`} />
                  )}
                  <span className="truncate text-xs font-semibold">{cat.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {hasVariations && (
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        isExpanded
                          ? "rotate-90 " + (isSelected ? "text-white" : "text-[#1d90cf]")
                          : "rotate-0 " + (isSelected ? "text-white/60" : "text-zinc-400")
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {isSelected && !hasVariations && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-200 shrink-0" />
                  )}
                </div>
              </button>

              {/* Animated Dynamic Category Variations Dropdown */}
              {hasVariations && (
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100 my-1.5"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="ml-3 pl-2.5 border-l-2 border-[#1d90cf]/40 space-y-2 py-1 bg-slate-50/80 rounded-r-xl pr-2">
                      {cat.variations!.map((vGroup) => (
                        <div key={vGroup.name} className="space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                            {vGroup.name}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {vGroup.values.map((val) => {
                              const specsObj = JSON.stringify({ [vGroup.name]: val.name });
                              return (
                                <Link
                                  key={val.name}
                                  href={`/browsedesigns?category=${encodeURIComponent(cat.name)}&specs=${encodeURIComponent(specsObj)}`}
                                  className="text-zinc-700 hover:text-white px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all inline-flex items-center gap-1 bg-white hover:bg-[#1d90cf] border-zinc-200 hover:border-[#1d90cf] shadow-2xs group/val cursor-pointer"
                                  title={`Design ${cat.name} with ${vGroup.name}: ${val.name}`}
                                >
                                  <span>{val.name}</span>
                                  {val.price > 0 ? (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 group-hover/val:bg-white/20 group-hover/val:text-white px-1 rounded transition-colors">
                                      +${val.price.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-emerald-600 group-hover/val:text-emerald-200 transition-colors">
                                      Free
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <hr className="my-4 border-zinc-100" />

      {/* Dynamic Finishes & Variations Shortcuts */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
          {isSpecificCategory ? `${selectedCategory} Options` : "Options & Finishes"}
        </h3>
        {categoryFinishes.length > 0 ? (
          <div className="flex flex-wrap gap-1 text-xs text-zinc-600">
            {categoryFinishes.map((item, idx) => {
              const specsObj = JSON.stringify({ [item.groupName]: item.optionName });
              return (
                <Link
                  key={`${item.categoryName}-${item.optionName}-${idx}`}
                  href={`/browsedesigns?category=${encodeURIComponent(item.categoryName)}&specs=${encodeURIComponent(specsObj)}`}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-[#1d90cf] hover:text-white text-zinc-700 font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="text-zinc-400">•</span>
                  <span>{item.optionName}</span>
                  {item.price > 0 && <span className="text-[10px] opacity-75">(+${item.price.toFixed(2)})</span>}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1 text-xs text-zinc-600">
            {["Matte Finish", "Glossy Finish", "Soft Touch Premium", "Foil Accent", "Rounded Corners"].map((finish) => (
              <Link
                key={finish}
                href="/browsedesigns"
                className="hover:text-[#1d90cf] transition-colors flex items-center gap-1.5 py-0.5 font-medium"
              >
                <span className="text-zinc-300">•</span>
                <span>{finish}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/* ── Premium Template Showcase Card Component ────────────────── */
function TemplateCardShowcase({ template: t, onOpen }: { template: any; onOpen: (template: any) => void }) {
  const cfg = t.canvas_config || { width: 105, height: 60 };
  const width = cfg.width || 105;
  const height = cfg.height || 60;
  const isPortrait = cfg.orientation === "portrait" || height > width;

  const frontBg = t.front_design?.bgColor || t.templateData?.bgColor || "#18181b";

  return (
    <button
      type="button"
      onClick={() => onOpen(t)}
      className="group bg-white rounded-3xl border border-zinc-200/80 overflow-hidden shadow-xs hover:shadow-2xl hover:border-[#1d90cf] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer"
    >
      {/* Mini Studio Presentation Frame */}
      <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-[#141622] to-[#0c0d14] p-3.5 flex items-center justify-center overflow-hidden">
        {/* Subtle grid mesh background pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
            backgroundSize: "14px 14px",
          }}
        />

        {/* Floating Mini Card Container */}
        <div
          className="relative rounded-lg overflow-hidden shadow-[0_14px_30px_-6px_rgba(0,0,0,0.7)] border border-white/15 transition-all duration-300 group-hover:scale-[1.05] group-hover:-translate-y-1"
          style={{
            aspectRatio: `${width} / ${height}`,
            width: isPortrait ? "48%" : "82%",
            maxHeight: "82%",
            backgroundColor: frontBg,
          }}
        >
          <div className="absolute inset-0">
            <TemplateArtwork template={t} side="front" />
          </div>
        </div>

        {/* Top Badges: Price & Category */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white/90 border border-white/10 truncate max-w-[100px]">
            {t.category}
          </span>
          {t.isPaid ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-md">
              ${t.price}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-md">
              FREE
            </span>
          )}
        </div>

        {/* Hover Action Layer */}
        <div className="absolute inset-0 bg-[#1d90cf]/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-20">
          <span className="bg-white text-[#1d90cf] text-xs font-black px-4 py-2 rounded-full shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1.5">
            <span>Customize Design</span>
            <span>→</span>
          </span>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3.5 bg-white flex items-center justify-between gap-2 border-t border-zinc-100">
        <div className="min-w-0">
          <h4 className="font-extrabold text-sm text-zinc-900 truncate group-hover:text-[#1d90cf] transition-colors">
            {t.title}
          </h4>
          <p className="text-xs text-zinc-400 font-medium mt-0.5 flex items-center gap-1">
            <span>{width}×{height}{cfg.unit || "mm"}</span>
            {cfg.orientation && <span className="capitalize">• {cfg.orientation}</span>}
          </p>
        </div>
        <span className="w-7 h-7 rounded-full bg-zinc-100 group-hover:bg-[#1d90cf] group-hover:text-white flex items-center justify-center text-xs font-bold text-zinc-600 transition-all shrink-0">
          →
        </span>
      </div>
    </button>
  );
}

/* ── Hero Banner Component ───────────────────── */
function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-white via-sky-50/40 to-slate-100/70 p-6 sm:p-8 lg:p-10 shadow-xs">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 w-full">
        {/* Left Content */}
        <div className="flex-1 space-y-4 max-w-xl">
          <h1 className="text-2xl sm:text-3xl md:text-[30px] font-black text-zinc-900 leading-[1.2] tracking-tight">
            Empowering your brand with high-impact, tactile printing solutions.
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
            Time-saving, budget-friendly, and fully customizable in real-time 3D studio. Try 50 standard business cards starting at just $10.
          </p>

          {/* Value Badges */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-zinc-600 pt-1">
            <span className="flex items-center gap-1.5 text-zinc-700">
              <span className="text-emerald-500 font-bold">✓</span> 16pt & 18pt Premium Stocks
            </span>
            <span className="flex items-center gap-1.5 text-zinc-700">
              <span className="text-[#1d90cf] font-bold">✓</span> Real-Time 3D Studio Preview
            </span>
            <span className="flex items-center gap-1.5 text-zinc-700">
              <span className="text-amber-500 font-bold">✓</span> 24h Express Turnaround
            </span>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              href="/customize"
              className="px-6 py-3 bg-[#1d90cf] hover:bg-[#167bb3] text-white text-sm sm:text-base font-bold rounded-xl shadow-md shadow-[#1d90cf]/25 transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              <span>Design in 3D Studio</span>
              <span>→</span>
            </Link>
            <Link
              href="/browsedesigns"
              className="px-5 py-3 border border-zinc-300 hover:border-zinc-900 text-zinc-800 hover:text-zinc-950 text-sm sm:text-base font-bold rounded-xl bg-white hover:bg-zinc-50 transition-all duration-200 cursor-pointer shadow-2xs"
            >
              Browse Templates
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-bold text-zinc-600 hover:text-[#1d90cf] transition-colors duration-200 ml-1"
            >
              Reorders
            </Link>
          </div>
        </div>

        {/* Right Image Container */}
        <div className="w-full lg:w-[44%] flex-shrink-0">
          <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-xl border border-white/70 bg-white">
            <Image
              src="/banners/buisiness-card-banner.png"
              alt="Business Cards Showcase"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
            {/* Floating Glass Spec Pill */}
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-black/60 backdrop-blur-md text-white px-3.5 py-2 rounded-xl border border-white/15 flex items-center gap-2.5 shadow-lg">
              <div className="flex text-amber-400 text-xs">★★★★★</div>
              <div className="text-xs font-bold leading-tight">
                <div>50,000+ Happy Brands</div>
                <div className="text-[10px] text-white/70 font-normal">Rated 4.9/5 by verified customers</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stylized Fallback Artwork for Category Cards ── */
function CategoryCardArtwork({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#121624] via-[#0d101a] to-[#181c2e] p-4 flex flex-col justify-between overflow-hidden">
      {/* Background subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
          backgroundSize: "12px 12px",
        }}
      />
      {/* Top Tag */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
          PRINT READY
        </span>
        <span className="w-2 h-2 rounded-full bg-[#1d90cf] shadow-sm shadow-[#1d90cf]" />
      </div>

      {/* Floating Center Card Representation */}
      <div className="relative z-10 my-auto flex items-center justify-center py-2">
        <div className="w-[72%] aspect-[1.7/1] rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/20 shadow-2xl p-2.5 flex flex-col justify-between transform -rotate-3 group-hover:rotate-0 group-hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black tracking-widest text-[#1d90cf]">PRINTGRAPHY</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <div className="text-[11px] font-extrabold text-white truncate">{title}</div>
          <div className="h-0.5 w-1/2 bg-gradient-to-r from-[#1d90cf] to-transparent rounded-full" />
        </div>
      </div>

      {/* Bottom Subtitle / Format indicator */}
      <div className="relative z-10 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
        <span className="truncate max-w-[120px]">{subtitle || "Custom Dimensions"}</span>
        <span className="text-[#1d90cf] font-bold">Studio Ready →</span>
      </div>
    </div>
  );
}

/* ── Category Product Card Component ─────────── */
interface CategoryCardProps {
  id?: string;
  slug?: string;
  title: string;
  subtitle: string;
  price: string;
  unitPrice: string;
  image?: string;
}

function CategoryCard({ id, slug, title, subtitle, price, unitPrice, image }: CategoryCardProps) {
  const targetId = slug || id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const targetHref = `/product/${targetId}`;
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(image && !imageError && image !== "/placeholder.jpg");

  return (
    <div className="bg-white rounded-3xl border border-zinc-200/80 p-5 flex flex-col justify-between group hover:shadow-xl hover:border-[#1d90cf]/50 hover:-translate-y-1 transition-all duration-300">
      <div>
        {/* Product Image or Stylized Artwork */}
        <Link href={targetHref} className="block relative w-full aspect-[16/10] rounded-2xl overflow-hidden mb-4 bg-slate-100 border border-zinc-100 shadow-2xs">
          {hasImage ? (
            <img
              src={mediaSrc(image!)}
              alt={title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <CategoryCardArtwork title={title} subtitle={subtitle} />
          )}
        </Link>

        {/* Title */}
        <h3 className="text-base font-extrabold text-zinc-900 leading-snug line-clamp-1">
          <Link href={targetHref} className="hover:text-[#1d90cf] transition-colors">
            {title}
          </Link>
        </h3>

        {/* Description */}
        <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed line-clamp-2">
          {subtitle}
        </p>
      </div>

      {/* Price & Action */}
      <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between">
        <div>
          <div className="text-base font-black text-zinc-900">{price}</div>
          <div className="text-[11px] text-zinc-400 font-medium">{unitPrice}</div>
        </div>

        <Link
          href={targetHref}
          className="px-4 py-2 bg-zinc-900 hover:bg-[#1d90cf] text-white text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-2xs group/btn cursor-pointer"
        >
          <span>Shop Standard</span>
          <span className="transform group-hover/btn:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>
    </div>
  );
}

/* ── Die-Cut Shape Artwork for Shape Cards ───── */
function ShapeCardArtwork({ title }: { title: string }) {
  const isRounded = /rounded/i.test(title);
  const isSquare = /square/i.test(title);
  const isCircle = /circle/i.test(title);
  const isOval = /oval/i.test(title);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#121522] to-[#0a0d16] p-4 flex flex-col items-center justify-center overflow-hidden">
      {/* Subtle radial sheen */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(29,144,207,0.15),transparent_65%)]" />

      {/* Physical Die-cut Shape representation */}
      {isCircle ? (
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border-2 border-amber-400/50 shadow-2xl flex flex-col items-center justify-center text-center p-2 transform group-hover:scale-105 transition-all duration-300">
          <span className="text-[9px] font-black tracking-widest text-amber-400">CIRCLE</span>
          <span className="text-[10px] font-extrabold text-white mt-0.5">65 mm</span>
        </div>
      ) : isOval ? (
        <div className="relative w-26 h-16 rounded-[50%] bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border-2 border-amber-400/50 shadow-2xl flex flex-col items-center justify-center text-center p-2 transform group-hover:scale-105 transition-all duration-300">
          <span className="text-[9px] font-black tracking-widest text-amber-400">OVAL</span>
          <span className="text-[10px] font-extrabold text-white mt-0.5">85 × 55 mm</span>
        </div>
      ) : isSquare ? (
        <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border-2 border-[#1d90cf]/50 shadow-2xl flex flex-col items-center justify-between p-2 transform group-hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1d90cf]" />
            <span className="text-[8px] font-extrabold tracking-wider text-zinc-400">1:1</span>
          </div>
          <span className="text-[10px] font-extrabold text-white">65 × 65 mm</span>
          <div className="h-0.5 w-full bg-[#1d90cf]/40 rounded-full" />
        </div>
      ) : isRounded ? (
        <div className="relative w-26 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border-2 border-sky-400/50 shadow-2xl flex flex-col items-center justify-between p-2 transform group-hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between w-full">
            <span className="text-[8px] font-extrabold tracking-wider text-sky-400">ROUNDED</span>
            <span className="text-[8px] text-zinc-400 font-bold">r: 6mm</span>
          </div>
          <span className="text-[10px] font-extrabold text-white">85 × 55 mm</span>
          <div className="h-0.5 w-1/2 bg-sky-400/40 rounded-full" />
        </div>
      ) : (
        <div className="relative w-26 h-16 rounded-lg bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border border-white/20 shadow-2xl flex flex-col items-center justify-between p-2 transform group-hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between w-full">
            <span className="text-[8px] font-extrabold tracking-wider text-emerald-400">STANDARD</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[10px] font-extrabold text-white">85 × 55 mm</span>
          <div className="h-0.5 w-full bg-white/20 rounded-full" />
        </div>
      )}

      {/* Format Label */}
      <div className="absolute bottom-2 text-[9px] font-extrabold tracking-wider text-white/50 uppercase">
        Die-Cut Shape
      </div>
    </div>
  );
}

/* ── Shape Product Card Component ────────────── */
interface ShapeCardProps {
  id?: string;
  slug?: string;
  title: string;
  price: string;
  unitPrice: string;
  rating: number;
  count: number;
  image?: string;
}

function ShapeCard({ id, slug, title, price, unitPrice, rating, count, image }: ShapeCardProps) {
  const targetId = slug || id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const targetHref = `/product/${targetId}`;
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(image && !imageError && image !== "/placeholder.jpg");

  return (
    <Link
      href={targetHref}
      className="bg-white rounded-3xl border border-zinc-200/80 p-4 shadow-xs hover:shadow-xl hover:border-[#1d90cf]/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
    >
      <div>
        {/* Shape Graphic */}
        <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden mb-3.5 bg-slate-100 border border-zinc-100 shadow-2xs">
          {hasImage ? (
            <img
              src={mediaSrc(image!)}
              alt={title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <ShapeCardArtwork title={title} />
          )}
        </div>

        {/* Content */}
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-zinc-900 leading-snug line-clamp-1 group-hover:text-[#1d90cf] transition-colors">
            {title}
          </h3>

          {/* Stars */}
          <Stars rating={rating} count={count} />
        </div>
      </div>

      {/* Price & Action */}
      <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between">
        <div>
          <div className="text-sm font-black text-zinc-900">{price}</div>
          <div className="text-[11px] text-zinc-400 font-medium">{unitPrice}</div>
        </div>
        <span className="w-7 h-7 rounded-full bg-zinc-100 group-hover:bg-[#1d90cf] group-hover:text-white flex items-center justify-center text-zinc-600 font-bold text-xs transition-all shadow-2xs">
          →
        </span>
      </div>
    </Link>
  );
}

/* ── Fallback Data ────────────────────────────── */
const defaultCategoryList = [
  {
    id: "matte-business-cards",
    slug: "matte-business-cards",
    title: "Matte Business Cards",
    subtitle: "Introducing: The very-best-for-your-budget business cards. Easily create cards you can't wait to hand out.",
    price: "$14.99",
    unitPrice: "$0.15 Each / 100 Units",
    image: "/placeholder.jpg",
  },
  {
    id: "glossy-business-cards",
    slug: "glossy-business-cards",
    title: "Glossy Business Cards",
    subtitle: "Introducing: The very-best-for-your-budget business cards. Easily create cards you can't wait to hand out.",
    price: "$14.99",
    unitPrice: "$0.15 Each / 100 Units",
    image: "/placeholder.jpg",
  },
  {
    id: "deluxe-business-cards",
    slug: "deluxe-business-cards",
    title: "Deluxe Business Cards",
    subtitle: "Introducing: The very-best-for-your-budget business cards. Easily create cards you can't wait to hand out.",
    price: "$14.99",
    unitPrice: "$0.15 Each / 100 Units",
    image: "/placeholder.jpg",
  },
];

const defaultShapeList = [
  { id: "rounded-corner-business-cards", slug: "rounded-corner-business-cards", title: "Rounded Corner Business Cards", price: "$20.30", unitPrice: "$0.20 Each / 100 Units", rating: 4.6, count: 23811 },
  { id: "square-business-cards", slug: "square-business-cards", title: "Square Business Cards", price: "$23.06", unitPrice: "$0.23 Each / 100 Units", rating: 4.5, count: 16961 },
  { id: "circle-business-cards", slug: "circle-business-cards", title: "Circle Business Cards", price: "$23.06", unitPrice: "$0.23 Each / 100 Units", rating: 4.8, count: 8809 },
  { id: "oval-business-cards", slug: "oval-business-cards", title: "Oval Business Cards", price: "$23.06", unitPrice: "$0.23 Each / 100 Units", rating: 4.7, count: 37261 },
];

interface ApiProduct {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  unitPrice?: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

interface ApiTemplateItem {
  _id: string;
  title: string;
  category: string;
  isPaid: boolean;
  price: number;
  thumbnail?: string;
  canvas_config?: {
    width?: number;
    height?: number;
    unit?: string;
    orientation?: string;
  };
}

/* ── Main Page Component Content ─────────────────────── */
function BusinessCardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get("category");

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || "all");
  const [templates, setTemplates] = useState<ApiTemplateItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [purchasedTemplateIds, setPurchasedTemplateIds] = useState<string[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");
  const [purchaseTemplate, setPurchaseTemplate] = useState<any>(null);

  const isSpecificCategory = Boolean(selectedCategory && selectedCategory.toLowerCase() !== "all");
  const selectedFamily = isSpecificCategory
    ? selectedCategory.trim().toLowerCase().replace(/s$/, "")
    : "";

  const displayedGridCategories = useMemo(() => {
    if (!isSpecificCategory) return categories;
    const matches = categories.filter((cat) => {
      const lower = cat.name.toLowerCase();
      return lower.includes(selectedFamily) || selectedCategory.toLowerCase().includes(lower);
    });
    return matches.length > 0
      ? matches
      : categories.filter((c) => c.name.toLowerCase() === selectedCategory.toLowerCase());
  }, [categories, isSpecificCategory, selectedFamily, selectedCategory]);

  const isBusinessCardCategory =
    !isSpecificCategory || selectedCategory.toLowerCase().includes("business card");

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    const newUrl = catName === "all" ? "/business-cards" : `/business-cards?category=${encodeURIComponent(catName)}`;
    router.replace(newUrl, { scroll: false });
    const target = document.getElementById("category-templates-section");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Fetch products & categories on load
  useEffect(() => {
    fetch("/api/products?limit=20")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      })
      .catch(() => { });

    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories)) {
          const printOnly = data.categories.filter(
            (c: { canvas_type?: string }) => c.canvas_type !== "mockup"
          );
          const sorted = [...printOnly].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );
          setCategories(sorted);
        }
      })
      .catch(() => { });
  }, []);

  // Fetch templates filtered by selectedCategory
  useEffect(() => {
    setTemplatesLoading(true);
    const catQuery = selectedCategory !== "all" ? `&category=${encodeURIComponent(selectedCategory)}` : "";
    fetch(`/api/templates?limit=16${catQuery}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.templates)) {
          setTemplates(data.templates);
        }
      })
      .catch(() => { })
      .finally(() => setTemplatesLoading(false));
  }, [selectedCategory]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.user?.purchasedTemplates)) {
          setPurchasedTemplateIds(data.user.purchasedTemplates.map(String));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans relative z-10">

      {/* Main Page Layout */}
      <div className="relative w-full overflow-hidden">

        {/* Grid Container holding Sidebar on the left and Main Content on the right */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Sidebar (Dynamic categories with real-time template filter) */}
            <div className="lg:col-span-3 z-10">
              <CategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
              />
            </div>

            {/* Right Column: Hero Banner + Product Sections */}
            <div className="lg:col-span-9 space-y-10">

              {/* Hero Banner */}
              <HeroBanner />

              {/* Dynamic Category Templates Filter Showcase Section */}
              <section id="category-templates-section" className="bg-gradient-to-b from-[#f8fafc] to-white rounded-3xl p-6 sm:p-7 border border-zinc-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-200/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                        {selectedCategory === "all" ? "All Product Templates" : `${selectedCategory} Templates`}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#1d90cf]/10 text-[#1d90cf] border border-[#1d90cf]/20">
                        {templatesLoading ? "Loading..." : `${templates.length} Designs`}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                      {selectedCategory === "all"
                        ? "Showing templates across all categories. Pick any design to customize in 2D/3D studio."
                        : `Showing designs specifically configured for ${selectedCategory}. Click any template to customize in 3D realistic studio.`}
                    </p>
                  </div>

                  <Link
                    href={selectedCategory === "all" ? "/browsedesigns" : `/browsedesigns?category=${encodeURIComponent(selectedCategory)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1d90cf] hover:bg-[#167bb3] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                  >
                    <span>Open in Studio</span>
                    <span>→</span>
                  </Link>
                </div>

                {templatesLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="rounded-3xl bg-zinc-200/60 animate-pulse aspect-[1.5/1]" />
                    ))}
                  </div>
                ) : templates.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-sky-100 p-8 text-center">
                    <p className="text-sm font-bold text-zinc-800">No templates found for {selectedCategory} yet.</p>
                    <p className="text-xs text-zinc-500 mt-1 mb-4">You can start with a blank canvas configured for this category in our 2D/3D Studio.</p>
                    <Link
                      href={`/browsedesigns?category=${encodeURIComponent(selectedCategory)}`}
                      className="inline-block px-5 py-2.5 bg-[#1d90cf] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#167bb3] transition-all cursor-pointer"
                    >
                      Design {selectedCategory} from Scratch
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {templates.map((t) => (
                      <TemplateCardShowcase
                        key={t._id}
                        template={t}
                        onOpen={(template) => {
                          setPreviewSide("front");
                          setPreviewTemplate(template);
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Section 1: Explore Product Categories or Sizes */}
              <section className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                      {isSpecificCategory ? `${selectedCategory} Formats & Sizes` : "Explore all Product Categories"}
                    </h2>
                    <p className="text-sm sm:text-base text-zinc-500 mt-1 font-normal">
                      {isSpecificCategory
                        ? `Available configurations and canvas specifications for ${selectedCategory}.`
                        : "Browse our extensive collection of print products, from classic cardstocks to specialty formats."}
                    </p>
                  </div>
                  {isSpecificCategory && (
                    <button
                      onClick={() => handleSelectCategory("all")}
                      className="text-xs sm:text-sm font-bold text-[#1d90cf] hover:underline cursor-pointer self-start sm:self-auto"
                    >
                      Browse All Categories →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayedGridCategories.length > 0
                    ? displayedGridCategories.map((cat) => (
                      <CategoryCard
                        key={cat._id}
                        id={cat._id}
                        slug={cat._id}
                        title={cat.name}
                        subtitle={cat.description || `${cat.canvas_width || 105} × ${cat.canvas_height || 60} ${cat.unit || "mm"}`}
                        price={cat.price ? `$${cat.price.toFixed(2)}` : "$14.99"}
                        unitPrice={cat.unitPrice || "$0.15 Each / 100 Units"}
                        image={cat.image}
                      />
                    ))
                    : defaultCategoryList.map((item, idx) => (
                      <CategoryCard key={idx} {...item} />
                    ))}
                </div>
              </section>

              {/* Sections 2, 3, 4: Only shown for business cards or general overview */}
              {isBusinessCardCategory && (
                <>
                  {/* Section 2: Shop Custom Business Cards By Shape */}
                  <section className="pt-2">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                          Shop Custom Business Cards by Shape
                        </h2>
                        <p className="text-sm sm:text-base text-zinc-500 mt-1 font-normal">
                          Go for classic standard cards or try an unexpected, tactile die-cut silhouette.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                      {defaultShapeList.map((item, idx) => (
                        <ShapeCard key={idx} {...item} />
                      ))}
                    </div>
                  </section>

                  {/* Section 3: Interactive Square Cards Showcase */}
                  <SquareCardsShowcase />

                  {/* Section 4: Shop Custom Cards By Business Use */}
                  <ShopByBusinessUse />
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      {previewTemplate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setPreviewTemplate(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-zinc-200" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-6 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-zinc-900">{previewTemplate.title}</h3>
                <p className="text-xs text-zinc-500">{previewTemplate.category}</p>
              </div>
              <div className="inline-flex rounded-xl bg-zinc-100 p-1 text-xs font-bold">
                <button type="button" onClick={() => setPreviewSide("front")} className={`cursor-pointer rounded-lg px-3 py-1.5 transition-all ${previewSide === "front" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}>Front</button>
                <button type="button" onClick={() => setPreviewSide("back")} className={`cursor-pointer rounded-lg px-3 py-1.5 transition-all ${previewSide === "back" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}>Back</button>
              </div>
            </div>
            <div className="bg-[#111318] px-4 py-4">
              <div className="relative h-[460px] overflow-hidden rounded-2xl">
                <ThreeDCardPreview
                  canvasConfig={previewTemplate.canvas_config}
                  frontDesign={previewTemplate.front_design}
                  backDesign={previewTemplate.back_design}
                  bgColor={previewTemplate.front_design?.bgColor || "#18181b"}
                  backBgColor={previewTemplate.back_design?.bgColor || "#141414"}
                  logoText=""
                  textLayers={[]}
                  side={previewSide}
                  onSideChange={setPreviewSide}
                  cardLayout={STUDIO_LAYOUT}
                  cornerRadius={0}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
              <button type="button" onClick={() => setPreviewTemplate(null)} className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              {previewTemplate.isPaid && (previewTemplate.price || 0) > 0 && !purchasedTemplateIds.includes(String(previewTemplate._id)) ? (
                <button
                  type="button"
                  onClick={async () => {
                    const template = previewTemplate;
                    if (!(await viewerIsSignedIn())) {
                      router.push(registerHref(`/business-cards?templateId=${template._id}`, "paid"));
                      return;
                    }
                    setPreviewTemplate(null);
                    setPurchaseTemplate(template);
                  }}
                  className="cursor-pointer rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors shadow-xs"
                >
                  Pay ${previewTemplate.price}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(`/customize?templateId=${previewTemplate._id}`)}
                  className="cursor-pointer rounded-xl bg-[#1d90cf] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#167bb3] transition-colors shadow-xs"
                >
                  Use Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <PurchaseTemplateModal
        isOpen={!!purchaseTemplate}
        template={purchaseTemplate}
        onClose={() => setPurchaseTemplate(null)}
        onSuccess={({ template }) => {
          setPurchasedTemplateIds((current) => [...current, String(template._id)]);
          setPurchaseTemplate(null);
          router.push(`/customize?templateId=${template._id}`);
        }}
      />
    </div>
  );
}

export default function BusinessCardsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-[#1d90cf] rounded-full animate-spin" />
      </div>
    }>
      <BusinessCardsContent />
    </Suspense>
  );
}
