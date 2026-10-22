"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { mediaSrc } from "@/lib/mediaUrl";
import { catalogImageFor } from "@/lib/catalogImages";
import type { HomepageContent, HomepageLinkItem } from "@/lib/homepageContent";

interface TopSellerItem {
  _id?: string;
  label: string;
  img: string;
  href: string;
}

const defaultTopSellers: TopSellerItem[] = [
  { label: "Standard Business Cards", img: "/card-design.png", href: "/product/business-cards" },
  { label: "Flyers & Leaflets", img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80", href: "/product/flyers" },
  { label: "Invitations & Cards", img: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80", href: "/product/invitations" },
  { label: "Stickers & Labels", img: "/new-in-stickers-labels.png", href: "/product/stickers" },
  { label: "Clothing & Apparel", img: "/new-in-clothing.png", href: "/product/t-shirts" },
  { label: "Packaging & Boxes", img: "/new-in-packaging.png", href: "/product/mailer-boxes" },
];

function getSafeImageSrc(img?: any, label?: string) {
  if (label) return catalogImageFor(label);
  if (!img) return "/placeholder.jpg";
  if (typeof img === "object" && img.src) return img.src;
  if (typeof img === "string") {
    const trimmed = img.trim();
    if (!trimmed) return "/placeholder.jpg";
    return mediaSrc(trimmed);
  }
  return "/placeholder.jpg";
}

function TopSellerCard({ item }: { item: TopSellerItem }) {
  const [imgSrc, setImgSrc] = useState<string>(getSafeImageSrc(item.img, item.label));

  useEffect(() => {
    setImgSrc(getSafeImageSrc(item.img, item.label));
  }, [item.img, item.label]);

  return (
    <Link href={item.href || "/"} className="flex flex-col group cursor-pointer">
      <div className="relative w-full aspect-square rounded-[1.4rem] overflow-hidden bg-zinc-100 border border-black/5 group-hover:border-theme-blue/30 shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
        <Image
          src={imgSrc}
          alt={item.label || "Product Image"}
          fill
          unoptimized
          onError={() => setImgSrc("/placeholder.jpg")}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <p className="mt-3 text-base font-semibold text-[#1e1d1b] leading-snug group-hover:text-theme-blue transition-colors duration-200 line-clamp-2">
        {item.label}
      </p>
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
  const heading = topSellers?.title || title || "Our Top Sellers";
  const cmsItems = topSellers?.items;

  const [items, setItems] = useState<TopSellerItem[]>(() => {
    if (Array.isArray(cmsItems) && cmsItems.length > 0) {
      return cmsItems.map((it) => ({
        label: it.label,
        img: it.image,
        href: it.href || "/",
      }));
    }
    return defaultTopSellers;
  });

  useEffect(() => {
    if (Array.isArray(cmsItems) && cmsItems.length > 0) {
      setItems(
        cmsItems.map((it) => ({
          label: it.label,
          img: it.image,
          href: it.href || "/",
        }))
      );
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
              img: p.image || "/placeholder.jpg",
              href: `/product/${p._id}`,
            }))
          );
        }
      })
      .catch(() => {});
  }, [cmsItems]);

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-16">
      {/* Section Title */}
      <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 mb-7">
        {heading}
      </h2>

      {/* 6-column grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-5">
        {items.map((item, idx) => (
          <TopSellerCard key={item._id || idx} item={item} />
        ))}
      </div>
    </section>
  );
}
