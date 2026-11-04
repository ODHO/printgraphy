"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import { catalogImageFor } from "@/lib/catalogImages";

interface CategoryItem {
  _id?: string;
  name: string;
  image?: string;
  slug?: string;
}

const CATEGORY_FALLBACKS: Record<string, string> = {
  "business cards": "/card-design.png",
  "business-cards": "/card-design.png",
  flyers: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80",
  "flyers (a5)": "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80",
  invitations: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
  "invitations & stationery": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
  brochures: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
  postcards: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
  posters: "https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&w=600&q=80",
  "signs, banners & posters": "https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&w=600&q=80",
  stickers: "/new-in-stickers-labels.png",
  "stickers & labels": "/new-in-stickers-labels.png",
  "clothing & bags": "/new-in-clothing.png",
  "t-shirts": "/new-in-clothing.png",
  "promotional products": "/new-in-promo-products.png",
  mugs: "/new-in-promo-products.png",
  "mailer boxes": "/new-in-packaging.png",
  packaging: "/new-in-packaging.png",
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

function isUsableImage(img?: string | null): boolean {
  if (!img || typeof img !== "string") return false;
  const trimmed = img.trim();
  if (!trimmed) return false;
  if (trimmed.includes("placeholder")) return false;
  if (trimmed.includes("slide.png") || trimmed === "/slide.png" || trimmed === "/placeholder.jpg") {
    return false;
  }
  return true;
}

/** Prefer DB/API image; fall back to catalog sample, then name-based fallbacks. */
function resolveImageSrc(img?: string, name: string = "", slug?: string): string {
  if (isUsableImage(img)) {
    return mediaSrc(img!.trim()) || img!.trim();
  }
  // Catalog samples (local /catalog/*) are preferred when DB has no image
  const catalog = catalogImageFor(name, slug);
  if (isUsableImage(catalog)) return catalog;
  return getCategoryFallbackImage(name, slug);
}

function CategoryCardItem({ cat }: { cat: CategoryItem }) {
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
      className="flex w-[148px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-[#dce3ec] bg-white transition hover:border-[#99CAFF] sm:w-[168px] md:w-[180px]"
    >
      <div className="relative aspect-[4/3.6] w-full overflow-hidden bg-[#E3F2FF]">
        <img
          src={imgSrc}
          alt={cat.name}
          onError={handleImgError}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>
      <div className="flex min-h-[52px] items-center justify-center border-t border-[#e8eef5] bg-white px-2.5 py-3">
        <h3 className="line-clamp-2 text-center text-[13px] font-bold leading-snug text-[#111827] sm:text-sm">
          {cat.name}
        </h3>
      </div>
    </Link>
  );
}

function NavArrow({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#d7e0eb] bg-[#f4f7fb] text-[#042E7B] transition hover:border-[#99CAFF] hover:bg-[#E3F2FF] active:scale-95"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        {direction === "left" ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        )}
      </svg>
    </button>
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
      const scrollAmount = 360;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="bg-white py-12 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#042E7B] sm:text-3xl md:text-[2rem]">
            Explore all categories
          </h2>

          <div className="hidden items-center gap-2.5 sm:flex">
            <NavArrow direction="left" onClick={() => scroll("left")} />
            <NavArrow direction="right" onClick={() => scroll("right")} />
          </div>
        </div>

        <div className="relative">
          <div className="absolute top-1/2 left-0 z-10 flex -translate-y-1/2 sm:hidden">
            <NavArrow direction="left" onClick={() => scroll("left")} />
          </div>

          <div
            ref={scrollRef}
            className="flex w-full gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide py-1"
          >
            {categories.map((cat, idx) => (
              <CategoryCardItem key={cat._id || cat.slug || idx} cat={cat} />
            ))}
          </div>

          <div className="absolute top-1/2 right-0 z-10 flex -translate-y-1/2 sm:hidden">
            <NavArrow direction="right" onClick={() => scroll("right")} />
          </div>
        </div>
      </div>
    </section>
  );
}
