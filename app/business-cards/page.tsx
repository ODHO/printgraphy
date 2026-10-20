"use client";

import { useEffect, useState, Suspense } from "react";
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

  // Sort categories alphabetically A to Z by name
  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  // Collect all unique variations across all categories for bottom options section
  const allCategoryFinishes = sortedCategories.flatMap((cat) =>
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
    <aside className="w-full bg-white rounded-2xl shadow-xl shadow-zinc-300/40 border border-zinc-200/60 p-5 sticky top-24">
      <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-800">
        <h2 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
          <span>Categories & Canvas</span>
        </h2>
        {selectedCategory !== "all" && (
          <button
            onClick={() => onSelectCategory("all")}
            className="text-base font-bold text-[#064FE0] hover:underline cursor-pointer"
          >
            Show All
          </button>
        )}
      </div>

      {/* Dynamic Product Categories & Variations list */}
      <div className="flex flex-col gap-1.5 mt-4">
        <button
          onClick={() => onSelectCategory("all")}
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-base font-bold transition-all text-left cursor-pointer ${
            selectedCategory === "all"
              ? "bg-[#064FE0] text-white shadow-md shadow-[#064FE0]/25"
              : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>✨</span>
            <span>All Categories</span>
          </span>
          <span className={`text-base px-1.5 py-0.5 rounded-full ${selectedCategory === "all" ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"}`}>
            {sortedCategories.length}
          </span>
        </button>

        {sortedCategories.map((cat) => {
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-base transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-[#064FE0] text-white font-bold shadow-md shadow-[#064FE0]/25"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 font-medium"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  {cat.image ? (
                    <img
                      src={mediaSrc(cat.image)}
                      alt=""
                      className="w-7 h-7 rounded-lg object-cover shrink-0 border border-white/20 bg-white"
                    />
                  ) : (
                    <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${isSelected ? "bg-white" : "bg-zinc-300 group-hover:bg-[#064FE0]"}`} />
                  )}
                  <span className="truncate text-base font-semibold">{cat.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {hasVariations && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-300 ${
                        isExpanded
                          ? "rotate-90 " + (isSelected ? "text-white" : "text-[#064FE0]")
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
                    <span className="w-2 h-2 rounded-full bg-sky-300 shrink-0" />
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
                    <div className="ml-3.5 pl-3 border-l-2 border-[#064FE0]/40 space-y-2 py-1.5 bg-slate-50/70 rounded-r-xl pr-2">
                      {cat.variations!.map((vGroup) => (
                        <div key={vGroup.name} className="space-y-1">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                            {vGroup.name}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {vGroup.values.map((val) => {
                              const specsObj = JSON.stringify({ [vGroup.name]: val.name });
                              return (
                                <Link
                                  key={val.name}
                                  href={`/browsedesigns?category=${encodeURIComponent(cat.name)}&specs=${encodeURIComponent(specsObj)}`}
                                  className="text-zinc-700 hover:text-white px-2 py-1 rounded-lg text-xs font-bold border transition-all inline-flex items-center gap-1.5 bg-white hover:bg-[#064FE0] border-zinc-200/90 hover:border-[#064FE0] shadow-2xs group/val cursor-pointer"
                                  title={`Design ${cat.name} with ${vGroup.name}: ${val.name}`}
                                >
                                  <span>{val.name}</span>
                                  {val.price > 0 ? (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 group-hover/val:bg-white/20 group-hover/val:text-white px-1 py-0.2 rounded border border-amber-200/60 group-hover/val:border-white/30 transition-colors">
                                      +${val.price.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-600 group-hover/val:text-emerald-200 transition-colors">
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

      <hr className="my-5 border-zinc-200" />

      {/* Dynamic Finishes & Variations Shortcuts */}
      <div className="space-y-3">
        <h3 className="text-base font-black uppercase tracking-wider text-zinc-400">
          Card Options & Finishes
        </h3>
        {allCategoryFinishes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 text-base text-zinc-600">
            {allCategoryFinishes.map((item, idx) => {
              const specsObj = JSON.stringify({ [item.groupName]: item.optionName });
              return (
                <Link
                  key={`${item.categoryName}-${item.optionName}-${idx}`}
                  href={`/browsedesigns?category=${encodeURIComponent(item.categoryName)}&specs=${encodeURIComponent(specsObj)}`}
                  className="px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-[#064FE0] hover:text-white text-zinc-700 font-bold text-base transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="text-zinc-400">•</span>
                  <span>{item.optionName}</span>
                  {item.price > 0 && <span className="text-base opacity-75">(+${item.price.toFixed(2)})</span>}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1 text-base text-zinc-600">
            {["Matte Finish", "Glossy Finish", "Soft Touch Premium", "Foil Accent", "Rounded Corners"].map((finish) => (
              <Link
                key={finish}
                href="/browsedesigns"
                className="hover:text-theme-blue transition-colors flex items-center gap-1.5 py-1"
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
      className="group bg-white rounded-3xl border border-zinc-200/80 overflow-hidden shadow-xs hover:shadow-2xl hover:border-[#064FE0] transition-all duration-300 flex flex-col justify-between text-left cursor-pointer"
    >
      {/* Mini Studio Presentation Frame */}
      <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-[#181b26] to-[#0f1118] p-3.5 flex items-center justify-center overflow-hidden">
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
          className="relative rounded-lg overflow-hidden shadow-[0_12px_28px_-6px_rgba(0,0,0,0.65)] border border-white/15 transition-all duration-300 group-hover:scale-[1.05] group-hover:-translate-y-1"
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
            <span className="px-2 py-0.5 rounded-full text-base font-extrabold bg-amber-500 text-white shadow-md">
              ${t.price}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-base font-extrabold bg-emerald-500 text-white shadow-md">
              FREE
            </span>
          )}
        </div>

        {/* Hover Action Layer */}
        <div className="absolute inset-0 bg-[#064FE0]/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-20">
          <span className="bg-white text-[#064FE0] text-base font-black px-3.5 py-1.5 rounded-full shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1">
            <span>Customize Design</span>
            <span>→</span>
          </span>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3 bg-white flex items-center justify-between gap-2 border-t border-zinc-100">
        <div className="min-w-0">
          <h4 className="font-extrabold text-base text-zinc-900 truncate group-hover:text-[#064FE0] transition-colors">
            {t.title}
          </h4>
          <p className="text-base text-zinc-400 font-medium mt-0.5 flex items-center gap-1">
            <span>{width}×{height}{cfg.unit || "mm"}</span>
            {cfg.orientation && <span className="capitalize">• {cfg.orientation}</span>}
          </p>
        </div>
        <span className="w-6 h-6 rounded-full bg-zinc-100 group-hover:bg-[#064FE0] group-hover:text-white flex items-center justify-center text-base font-bold text-zinc-600 transition-all shrink-0">
          →
        </span>
      </div>
    </button>
  );
}

/* ── Hero Banner Component ───────────────────── */
function HeroBanner() {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 w-full py-4">
      {/* Left Text */}
      <div className="flex-1 space-y-4 max-w-xl">
        <h1 className="text-2xl sm:text-3xl md:text-[26px] font-extrabold text-zinc-900 leading-tight">
          Empowering your brand with high-quality printing solutions.
        </h1>
        <div className="space-y-2 text-base sm:text-base text-zinc-700 leading-relaxed font-normal">
          <p>Time-saving, budget-thanking, easy-to-customize business cards? Must be Printgraphy</p>
          <p>Try 50 standard business cards for just $10.</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/customize"
            className="px-5 py-2.5 bg-[#064FE0] hover:bg-theme-darkblue text-white text-base sm:text-base font-semibold rounded-lg shadow-sm transition-all duration-200 cursor-pointer"
          >
            Upload Your Design
          </Link>
          <Link
            href="/browsedesigns"
            className="px-5 py-2.5 border border-zinc-700 hover:border-zinc-900 text-zinc-900 text-base sm:text-base font-semibold rounded-lg bg-transparent transition-all duration-200 cursor-pointer"
          >
            Browse Templates
          </Link>
          <Link
            href="/dashboard"
            className="text-base sm:text-base font-semibold text-zinc-800 hover:text-theme-blue transition-colors duration-200 ml-2"
          >
            Reorders
          </Link>
        </div>
      </div>

      {/* Right Image */}
      <div className="w-full lg:w-[45%] flex-shrink-0">
        <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-sm">
          <Image
            src="/banners/buisiness-card-banner.png"
            alt="Business Cards Showcase"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
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
  const [imgSrc, setImgSrc] = useState(image ? mediaSrc(image) : "/placeholder.jpg");

  useEffect(() => {
    if (image) {
      setImgSrc(mediaSrc(image));
    }
  }, [image]);

  return (
    <div className="bg-[#EEEEEE] rounded-md p-4 flex flex-col justify-between group hover:shadow-md transition-all duration-200 border border-transparent hover:border-zinc-200">
      <div>
        {/* Product Image */}
        <Link href={targetHref} className="block relative w-full aspect-[16/10] rounded-md overflow-hidden mb-4 bg-zinc-200">
          <img
            src={imgSrc}
            alt={title}
            onError={() => setImgSrc("/placeholder.jpg")}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        {/* Title */}
        <h3 className="text-base font-bold text-zinc-900 leading-snug line-clamp-1">
          <Link href={targetHref} className="hover:text-[#064FE0] transition-colors">
            {title}
          </Link>
        </h3>

        {/* Description */}
        <p className="text-base text-zinc-600 mt-2 leading-relaxed line-clamp-2">
          {subtitle}
        </p>
      </div>

      {/* Price & Action */}
      <div className="mt-5 pt-2">
        <div className="text-base font-bold text-zinc-900">{price}</div>
        <div className="text-base text-zinc-500 font-medium mb-3">{unitPrice}</div>

        <Link href={targetHref} className="inline-block px-4 py-2 border border-zinc-800 text-zinc-900 hover:bg-zinc-900 hover:text-white text-base font-semibold rounded-lg bg-white transition-all duration-200 cursor-pointer">
          Shop Standard
        </Link>
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
  const [imgSrc, setImgSrc] = useState(image ? mediaSrc(image) : "/placeholder.jpg");

  useEffect(() => {
    if (image) {
      setImgSrc(mediaSrc(image));
    }
  }, [image]);

  return (
    <Link href={targetHref} className="flex flex-col group cursor-pointer">
      {/* Image */}
      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-zinc-200 border border-transparent group-hover:border-zinc-300 transition-all duration-200">
        <img
          src={imgSrc}
          alt={title}
          onError={() => setImgSrc("/placeholder.jpg")}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h3 className="text-base sm:text-base font-bold text-zinc-900 leading-tight line-clamp-1 group-hover:text-[#064FE0] transition-colors">
          {title}
        </h3>

        {/* Stars */}
        <Stars rating={rating} count={count} />

        {/* Price */}
        <div className="pt-1">
          <div className="text-base sm:text-base font-bold text-zinc-900">{price}</div>
          <div className="text-base text-zinc-500 font-medium">{unitPrice}</div>
        </div>
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
    <div className="min-h-screen bg-white font-sans relative z-10">

      {/* 1. Full-Width Top Bar / Breadcrumb */}
      <div className="w-full bg-[#064FE0] py-2.5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-base text-white/80">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-white/40">›</span>
            <span className="text-white font-medium">Business Cards & Categories</span>
          </nav>
        </div>
      </div>

      {/* 2. Main Page Layout with Dynamic Hero Background */}
      <div className="relative w-full overflow-hidden">

        {/* Grid Container holding Sidebar on the left and Main Content on the right */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Sidebar (Dynamic categories with real-time template filter) */}
            <div className="lg:col-span-3 z-10 mt-4">
              <CategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={handleSelectCategory}
              />
            </div>

            {/* Right Column: Hero Banner + Product Sections */}
            <div className="lg:col-span-9 space-y-10">

              {/* Hero Banner */}
              <div className="relative pt-2 pb-6">
                <div className="absolute inset-y-0 -left-[100vw] -right-[100vw] bg-[#D4E3F0] -z-10" />
                <HeroBanner />
              </div>

              {/* Dynamic Category Templates Filter Showcase Section */}
              <section id="category-templates-section" className="pt-2 bg-gradient-to-b from-[#f7f9fc] to-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-zinc-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                        {selectedCategory === "all" ? "All Product Templates" : `${selectedCategory} Templates`}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-base font-bold bg-[#064FE0]/10 text-[#064FE0]">
                        {templatesLoading ? "Loading..." : `${templates.length} Designs`}
                      </span>
                    </div>
                    <p className="text-base text-zinc-500 mt-1">
                      {selectedCategory === "all"
                        ? "Showing templates across all categories. Pick any design to customize in 2D/3D studio."
                        : `Showing designs specifically configured for ${selectedCategory}. Click any template to customize in 3D realistic studio.`}
                    </p>
                  </div>

                  <Link
                    href={selectedCategory === "all" ? "/browsedesigns" : `/browsedesigns?category=${encodeURIComponent(selectedCategory)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl shadow-sm transition-all shrink-0"
                  >
                    <span>Open in Studio</span>
                    <span>→</span>
                  </Link>
                </div>

                {templatesLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="rounded-2xl bg-zinc-200/60 animate-pulse aspect-[1.5/1]" />
                    ))}
                  </div>
                ) : templates.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-sky-100 p-8 text-center">
                    <p className="text-base font-bold text-zinc-800">No templates found for {selectedCategory} yet.</p>
                    <p className="text-base text-zinc-500 mt-1 mb-4">You can start with a blank canvas configured for this category in our 2D/3D Studio.</p>
                    <Link
                      href={`/browsedesigns?category=${encodeURIComponent(selectedCategory)}`}
                      className="inline-block px-5 py-2 bg-[#064FE0] text-white text-base font-bold rounded-xl shadow hover:bg-[#287ba8] transition-all"
                    >
                      Design {selectedCategory} from Scratch
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
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

              {/* Section 1: Explore our all Product Categories */}
              <section className="pt-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 mb-6">
                  Explore our all Product Categories
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {categories.length > 0
                    ? categories.map((cat) => (
                      <CategoryCard
                        key={cat._id}
                        id={cat._id}
                        slug={cat._id}
                        title={cat.name}
                        subtitle={cat.description || `${cat.canvas_width} × ${cat.canvas_height} ${cat.unit}`}
                        price={cat.price ? `$${cat.price.toFixed(2)}` : "$14.99"}
                        unitPrice={cat.unitPrice || "$0.15 Each / 100 Units"}
                        image={cat.image}
                      />
                    ))
                    : products.length > 0
                    ? products.slice(0, 3).map((prod) => (
                      <CategoryCard
                        key={prod._id}
                        id={prod._id}
                        slug={prod.slug}
                        title={prod.name}
                        subtitle={prod.description || "High quality customizable card product."}
                        price={`$${prod.price.toFixed(2)}`}
                        unitPrice={prod.unitPrice || "$0.15 Each / 100 Units"}
                        image={prod.image}
                      />
                    ))
                    : defaultCategoryList.map((item, idx) => (
                      <CategoryCard key={idx} {...item} />
                    ))}
                </div>
              </section>

              {/* Section 2: Shop Custom Business Cards By Shape & Created Products */}
              <section className="pt-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 mb-1">
                  Shop Custom Business Cards
                </h2>
                <p className="text-base sm:text-base text-zinc-500 mb-6 font-normal">
                  Go for standard cards or try an interesting, unexpected shape created in store.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
                  {products.length > 0
                    ? products.map((prod) => (
                      <ShapeCard
                        key={prod._id}
                        id={prod._id}
                        slug={prod.slug}
                        title={prod.name}
                        price={`$${prod.price.toFixed(2)}`}
                        unitPrice={prod.unitPrice || "$0.20 Each / 100 Units"}
                        rating={prod.rating || 4.7}
                        count={prod.reviewCount || 120}
                        image={prod.image}
                      />
                    ))
                    : defaultShapeList.map((item, idx) => (
                      <ShapeCard key={idx} {...item} />
                    ))}
                </div>
              </section>

              {/* Section 3: Interactive Square Cards Showcase */}
              <SquareCardsShowcase />

              {/* Section 4: Shop Custom Cards By Business Use */}
              <ShopByBusinessUse />

            </div>
          </div>
        </div>
      </div>

      {previewTemplate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewTemplate(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-zinc-900">{previewTemplate.title}</h3>
                <p className="text-base text-zinc-500">{previewTemplate.category}</p>
              </div>
              <div className="inline-flex rounded-xl bg-zinc-100 p-1 text-base font-bold">
                <button type="button" onClick={() => setPreviewSide("front")} className={`cursor-pointer rounded-lg px-3 py-1.5 ${previewSide === "front" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}>Front</button>
                <button type="button" onClick={() => setPreviewSide("back")} className={`cursor-pointer rounded-lg px-3 py-1.5 ${previewSide === "back" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}>Back</button>
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
            <div className="flex items-center justify-end gap-3 px-5 py-4">
              <button type="button" onClick={() => setPreviewTemplate(null)} className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-base font-bold text-zinc-700 hover:bg-zinc-50">
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
                  className="cursor-pointer rounded-xl bg-amber-500 px-4 py-2.5 text-base font-bold text-white hover:bg-amber-600"
                >
                  Pay ${previewTemplate.price}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(`/browsedesigns?templateId=${previewTemplate._id}`)}
                  className="cursor-pointer rounded-xl bg-[#064FE0] px-4 py-2.5 text-base font-bold text-white hover:bg-[#0439A8]"
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
          router.push(`/browsedesigns?templateId=${template._id}`);
        }}
      />
    </div>
  );
}

export default function BusinessCardsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin" />
      </div>
    }>
      <BusinessCardsContent />
    </Suspense>
  );
}
