"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";

interface CategoryItem {
  _id?: string;
  name: string;
  image?: string;
  slug?: string;
}

const CATEGORY_FALLBACKS: Record<string, string> = {
  "business cards": "/card-design.png",
  "business-cards": "/card-design.png",
  "flyers": "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80",
  "flyers (a5)": "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80",
  "invitations": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
  "invitations & stationery": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
  "brochures": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
  "postcards": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
  "posters": "https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&w=600&q=80",
  "signs, banners & posters": "https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&w=600&q=80",
  "stickers": "/new-in-stickers-labels.png",
  "stickers & labels": "/new-in-stickers-labels.png",
  "clothing & bags": "/new-in-clothing.png",
  "t-shirts": "/new-in-clothing.png",
  "promotional products": "/new-in-promo-products.png",
  "mugs": "/new-in-promo-products.png",
  "mailer boxes": "/new-in-packaging.png",
  "packaging": "/new-in-packaging.png",
  "booklets & magazines": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
};

const defaultCategories: CategoryItem[] = [
  { name: "Business Cards", image: "/card-design.png", slug: "business-cards" },
  { name: "Flyers & Leaflets", image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80", slug: "flyers" },
  { name: "Invitations & Cards", image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80", slug: "invitations" },
  { name: "Brochures & Folders", image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80", slug: "brochures" },
  { name: "Postcards", image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80", slug: "postcards" },
  { name: "Signs, Banners & Posters", image: "https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&w=600&q=80", slug: "posters" },
  { name: "Stickers & Labels", image: "/new-in-stickers-labels.png", slug: "stickers" },
  { name: "Clothing & Apparel", image: "/new-in-clothing.png", slug: "t-shirts" },
  { name: "Promotional Products", image: "/new-in-promo-products.png", slug: "mugs" },
  { name: "Packaging & Boxes", image: "/new-in-packaging.png", slug: "mailer-boxes" },
];

function getCategoryFallbackImage(name: string, slug?: string): string {
  const key = (slug || name).toLowerCase().trim();
  for (const [pattern, imgUrl] of Object.entries(CATEGORY_FALLBACKS)) {
    if (key.includes(pattern) || pattern.includes(key)) {
      return imgUrl;
    }
  }
  return "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80";
}

function resolveImageSrc(img?: string, name: string = "", slug?: string): string {
  if (!img || typeof img !== "string") {
    return getCategoryFallbackImage(name, slug);
  }
  const trimmed = img.trim();
  if (
    !trimmed ||
    trimmed.includes("placeholder") ||
    trimmed.includes("slide.png") ||
    trimmed === "/slide.png" ||
    trimmed === "/placeholder.jpg"
  ) {
    return getCategoryFallbackImage(name, slug);
  }
  return mediaSrc(trimmed);
}

function CategoryCardItem({ cat, idx }: { cat: CategoryItem; idx: number }) {
  const fallback = getCategoryFallbackImage(cat.name, cat.slug);
  const initialSrc = resolveImageSrc(cat.image, cat.name, cat.slug);
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(resolveImageSrc(cat.image, cat.name, cat.slug));
    setHasError(false);
  }, [cat.image, cat.name, cat.slug]);

  const handleImgError = () => {
    if (!hasError && imgSrc !== fallback) {
      setHasError(true);
      setImgSrc(fallback);
    }
  };

  const href = cat._id
    ? `/product/${cat._id}`
    : cat.slug
    ? `/product/${cat.slug}`
    : "/product/business-cards";

  return (
    <Link
      href={href}
      className="flex-shrink-0 w-[160px] sm:w-[185px] md:w-[210px] snap-start flex flex-col group cursor-pointer transition-all duration-300"
    >
      {/* Card Image Container */}
      <div className="relative aspect-[4/3.5] w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-sm group-hover:shadow-xl group-hover:shadow-slate-300/40 group-hover:border-theme-blue/50 transition-all duration-300 group-hover:-translate-y-1.5">
        <img
          src={imgSrc}
          alt={cat.name}
          onError={handleImgError}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Hover Dark Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Explore Pill Badge */}
        <div className="absolute bottom-3 right-3 px-3 py-1 text-xs font-semibold bg-white/95 text-slate-900 rounded-full shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1 border border-slate-100">
          <span>Explore</span>
          <svg className="w-3 h-3 text-theme-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>

      {/* Card Text Label */}
      <div className="mt-3.5 px-1 flex flex-col">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-theme-blue transition-colors duration-200 leading-snug line-clamp-2">
          {cat.name}
        </h3>
      </div>
    </Link>
  );
}

export default function CategoryCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<CategoryItem[]>(defaultCategories);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(
            data.categories.map((c: any) => ({
              _id: c._id,
              name: c.name,
              image: c.image,
              slug: c.slug,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      <div className="flex items-center justify-between mb-6 px-1">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Explore all categories
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse our wide range of custom print products and materials
          </p>
        </div>

        {/* Carousel Buttons (Desktop Top Right) */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="w-9 h-9 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="w-9 h-9 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative group/carousel">
        {/* Left Floating Arrow Button */}
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 hover:text-white hover:bg-slate-900 hover:border-slate-900 rounded-full flex sm:hidden items-center justify-center shadow-lg transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Scrollable Cards Container */}
        <div
          ref={scrollRef}
          className="w-full flex gap-4 sm:gap-5 md:gap-6 overflow-x-auto scroll-smooth scrollbar-hide py-3 px-1 snap-x snap-mandatory"
        >
          {categories.map((cat, idx) => (
            <CategoryCardItem key={cat._id || cat.slug || idx} cat={cat} idx={idx} />
          ))}
        </div>

        {/* Right Floating Arrow Button */}
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 hover:text-white hover:bg-slate-900 hover:border-slate-900 rounded-full flex sm:hidden items-center justify-center shadow-lg transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}

