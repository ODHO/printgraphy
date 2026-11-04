"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { mediaSrc } from "@/lib/mediaUrl";
import { catalogImageFor } from "@/lib/catalogImages";
import type { HomepageContent } from "@/lib/homepageContent";

interface TopSellerItem {
  _id?: string;
  label: string;
  img: string;
  href: string;
  ctaLabel: string;
}

const defaultTopSellers: TopSellerItem[] = [
  { label: "Custom T-Shirts", img: "/catalog/apparel-totes-v2.png", href: "/clothing-bags", ctaLabel: "Customize" },
  { label: "Shipping Packaging", img: "/catalog/packaging-v2.png", href: "/product/mailer-boxes", ctaLabel: "Customize" },
  { label: "Outdoor Banners", img: "/catalog/signs-posters-v2.png", href: "/product/posters", ctaLabel: "Customize" },
  { label: "Shopping Bags", img: "/catalog/apparel-totes-v2.png", href: "/clothing-bags", ctaLabel: "Customize" },
  { label: "Celebration Invitations", img: "/catalog/print-collateral-v2.png", href: "/product/invitations", ctaLabel: "Customize" },
  { label: "Feather Flags", img: "/catalog/signs-posters-v2.png", href: "/product/posters", ctaLabel: "Customize" },
];

function resolveImage(img?: string, label?: string) {
  const trimmed = (img || "").trim();
  if (
    trimmed &&
    !trimmed.includes("placeholder") &&
    trimmed !== "/slide.png" &&
    trimmed !== "/placeholder.jpg"
  ) {
    return mediaSrc(trimmed);
  }
  return catalogImageFor(label);
}

function TopSellerCard({ item }: { item: TopSellerItem }) {
  const [imgSrc, setImgSrc] = useState(() => resolveImage(item.img, item.label));

  useEffect(() => {
    setImgSrc(resolveImage(item.img, item.label));
  }, [item.img, item.label]);

  const local = imgSrc.startsWith("/") && !imgSrc.startsWith("/api/");

  return (
    <Link
      href={item.href || "/"}
      className="group flex flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white transition hover:border-[#99CAFF]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#E3F2FF]">
        {local ? (
          <Image
            src={imgSrc}
            alt={item.label || "Product"}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            onError={() => setImgSrc(catalogImageFor(item.label))}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <img
            src={imgSrc}
            alt={item.label || "Product"}
            onError={() => setImgSrc(catalogImageFor(item.label))}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-3.5 py-3.5 sm:px-4 sm:py-4">
        <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-[#111827] sm:text-sm">
          {item.label}
        </h3>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#004EE0] transition group-hover:text-[#042E7B]">
          {item.ctaLabel || "Customize"}
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export default function TopSellers({
  topSellers,
  title,
}: {
  topSellers?: HomepageContent["topSellers"];
  title?: string;
}) {
  const heading = topSellers?.title || title || "Ready for your next idea";
  const cmsItems = topSellers?.items;

  const mapCms = (list: NonNullable<typeof cmsItems>): TopSellerItem[] =>
    list.map((it) => ({
      label: it.label,
      img: it.image,
      href: it.href || "/",
      ctaLabel: it.ctaLabel?.trim() || "Customize",
    }));

  const [items, setItems] = useState<TopSellerItem[]>(() => {
    if (Array.isArray(cmsItems) && cmsItems.length > 0) return mapCms(cmsItems);
    return defaultTopSellers;
  });

  useEffect(() => {
    if (Array.isArray(cmsItems) && cmsItems.length > 0) {
      setItems(mapCms(cmsItems));
      return;
    }

    fetch("/api/products?limit=6")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.products) && data.products.length > 0) {
          setItems(
            data.products.map((p: any) => ({
              _id: p._id,
              label: p.name,
              img: p.image || "",
              href: `/product/${p._id}`,
              ctaLabel: "Customize",
            }))
          );
        }
      })
      .catch(() => {});
  }, [cmsItems]);

  return (
    <section className="bg-white py-12 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-[#042E7B] sm:text-3xl md:text-[2rem]">
          {heading}
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-6 md:gap-4">
          {items.map((item, idx) => (
            <TopSellerCard key={item._id || `${item.label}-${idx}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
