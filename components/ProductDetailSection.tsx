"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import CardOptionsModal, { CardOptions } from "./CardOptionsModal";
import CardStudioModal from "./CardStudioModal";
import { IVariation, IVariationValue } from "@/models/Product";
import { mediaSrc } from "@/lib/mediaUrl";

interface ProductDetailSectionProps {
  productId?: string;
}

export default function ProductDetailSection({ productId }: ProductDetailSectionProps) {
  const [product, setProduct] = useState<{
    _id: string;
    name: string;
    description: string;
    price: number;
    unitPrice: string;
    image: string;
    galleryImages?: string[];
    rating: number;
    reviewCount: number;
    variations?: IVariation[];
  } | null>(null);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [galleryList, setGalleryList] = useState<string[]>([]);

  const [isFavorite, setIsFavorite] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const quantity = 100;

  // Selected variation map: { "Paper Stock": IVariationValue, "Corners": IVariationValue }
  const [selectedVariations, setSelectedVariations] = useState<Record<string, IVariationValue>>({});

  // Modal Flow States
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [cardOptions, setCardOptions] = useState<CardOptions | null>(null);

  // Sync wishlist status with localStorage
  useEffect(() => {
    const currentId = product?._id || productId || "business-cards";
    try {
      const stored = localStorage.getItem("xprints_wishlist");
      if (stored) {
        const list: string[] = JSON.parse(stored);
        setIsFavorite(list.includes(currentId));
      }
    } catch {}
  }, [product, productId]);

  const toggleFavorite = () => {
    const currentId = product?._id || productId || "business-cards";
    try {
      const stored = localStorage.getItem("xprints_wishlist");
      let list: string[] = stored ? JSON.parse(stored) : [];
      let nextState = false;
      if (list.includes(currentId)) {
        list = list.filter((id) => id !== currentId);
        nextState = false;
        setToastMessage("Removed from Wishlist");
      } else {
        list.push(currentId);
        nextState = true;
        setToastMessage("Added to Wishlist ❤️");
      }
      localStorage.setItem("xprints_wishlist", JSON.stringify(list));
      setIsFavorite(nextState);
      window.dispatchEvent(new Event("wishlistUpdated"));
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setIsFavorite(!isFavorite);
    }
  };

  useEffect(() => {
    const targetId = productId || "business-cards";
    fetch(`/api/products/${targetId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.product) {
          const prod = data.product;
          setProduct(prod);

          const images: string[] = [];
          if (prod.image) {
            const resolvedMain = mediaSrc(prod.image);
            if (resolvedMain) images.push(resolvedMain);
          }
          if (prod.galleryImages && Array.isArray(prod.galleryImages)) {
            prod.galleryImages.forEach((img: string) => {
              const resolvedGal = mediaSrc(img);
              if (resolvedGal && !images.includes(resolvedGal)) images.push(resolvedGal);
            });
          }
          if (images.length === 0) {
            images.push("/placeholder.jpg");
          }
          setGalleryList(images);

          if (prod.variations && prod.variations.length > 0) {
            const defaults: Record<string, IVariationValue> = {};
            prod.variations.forEach((vGroup: IVariation) => {
              if (vGroup.values && vGroup.values.length > 0) {
                defaults[vGroup.name] = vGroup.values[0];
              }
            });
            setSelectedVariations(defaults);
          }
        }
      })
      .catch((err) => console.error("Error loading product:", err));
  }, [productId]);

  const handleSelectOption = (groupName: string, optionValue: IVariationValue) => {
    setSelectedVariations((prev) => ({
      ...prev,
      [groupName]: optionValue,
    }));
  };

  const calculateCardUnitPrice = () => {
    const basePrice = product && typeof product.price === "number" ? product.price : 0.15;
    let extraCost = 0;
    Object.values(selectedVariations).forEach((val) => {
      if (val && typeof val.price === "number") {
        extraCost += val.price;
      }
    });
    return basePrice + extraCost;
  };

  const calculateTotalPrice = () => {
    return calculateCardUnitPrice() * quantity;
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? galleryList.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev === galleryList.length - 1 ? 0 : prev + 1));
  };

  const currentMainImage = mediaSrc(galleryList[activeImageIndex]) || mediaSrc(product?.image) || "/placeholder.jpg";

  const getFlowUrl = (basePath: string) => {
    const specsObj: Record<string, string> = {};
    Object.entries(selectedVariations).forEach(([groupName, val]) => {
      if (val && val.name) {
        specsObj[groupName] = val.name;
      }
    });

    const params = new URLSearchParams();
    const targetId = product?._id || productId;
    if (targetId) params.set("productId", targetId);
    if (product?.name) params.set("category", product.name);
    params.set("quantity", quantity.toString());
    if (Object.keys(specsObj).length > 0) {
      params.set("specs", JSON.stringify(specsObj));
    }
    return `${basePath}?${params.toString()}`;
  };

  return (
    <section className="font-sans max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-start">
        {/* Gallery */}
        <div className="lg:col-span-6 xl:col-span-7 lg:sticky lg:top-24 flex flex-col gap-3 sm:gap-4">
          <div className="relative w-full aspect-[4/3] sm:aspect-[5/4] overflow-hidden rounded-[1.35rem] bg-white border border-[#d7e8f4] shadow-[0_18px_40px_-28px_rgba(32,90,130,0.45)] group">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(50,154,212,0.12),transparent_42%),linear-gradient(160deg,rgba(255,255,255,0.35),transparent_40%)]"
            />
            <img
              src={currentMainImage}
              alt={product?.name || "Product Showcase Image"}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.jpg";
              }}
              className="relative z-[1] w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            />

            <button
              onClick={toggleFavorite}
              className="absolute top-4 right-4 z-10 grid h-11 w-11 place-items-center rounded-2xl bg-white/95 text-zinc-700 border border-white/80 shadow-sm transition hover:text-red-500 cursor-pointer"
              aria-label="Add to favorites"
            >
              <svg
                className={`w-5 h-5 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "fill-none stroke-current stroke-2"}`}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>

            {toastMessage && (
              <div className="absolute top-4 left-4 z-10 rounded-xl bg-[#1e1d1b]/92 px-3.5 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm animate-fade-in">
                {toastMessage}
              </div>
            )}

            {galleryList.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-2xl bg-white/95 text-zinc-800 border border-white/80 shadow-sm opacity-0 transition group-hover:opacity-100 cursor-pointer"
                  aria-label="Previous Image"
                >
                  <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-2xl bg-white/95 text-zinc-800 border border-white/80 shadow-sm opacity-0 transition group-hover:opacity-100 cursor-pointer"
                  aria-label="Next Image"
                >
                  <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {galleryList.map((thumb, idx) => (
              <button
                key={`${thumb}-${idx}`}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative h-[4.25rem] w-[4.25rem] sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition cursor-pointer ${
                  activeImageIndex === idx
                    ? "border-[#329AD4] shadow-[0_0_0_3px_rgba(50,154,212,0.18)]"
                    : "border-[#d7e8f4] opacity-80 hover:opacity-100 hover:border-[#88c9ef]"
                }`}
              >
                <img
                  src={thumb}
                  alt={`Thumbnail ${idx + 1}`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.jpg";
                  }}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Buy panel */}
        <div className="lg:col-span-6 xl:col-span-5">
          <div className="rounded-[1.5rem] border border-[#d7e8f4] bg-white/90 p-5 sm:p-7 shadow-[0_20px_50px_-36px_rgba(32,90,130,0.55)] backdrop-blur-sm space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#329AD4]">
                Printgraphy product
              </p>
              <h1 className="text-[1.85rem] sm:text-[2.15rem] font-black tracking-[-0.04em] leading-[1.08] text-[#1e1d1b]">
                {product?.name || "Standard Business Cards"}
              </h1>

              <div className="flex items-center gap-2.5 flex-wrap text-sm">
                <div className="flex items-center gap-1.5">
                  {product?.reviewCount && product.reviewCount > 0 ? (
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-4 h-4 ${star <= Math.round(product.rating || 5) ? "fill-current" : "text-zinc-300 fill-current"}`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  ) : null}
                  <span
                    onClick={() => document.getElementById("product-reviews-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="font-semibold text-[#1e1d1b] underline decoration-[#329AD4]/40 underline-offset-4 cursor-pointer hover:text-[#329AD4]"
                  >
                    {product?.reviewCount && product.reviewCount > 0
                      ? `${product.rating} (${product.reviewCount.toLocaleString()} ${product.reviewCount === 1 ? "review" : "reviews"})`
                      : "No reviews yet (Write a review)"}
                  </span>
                </div>

                <span className="inline-flex items-center rounded-md border border-[#d7e8f4] bg-[#f0f8fd] px-2.5 py-1 text-xs font-bold text-[#2172a0]">
                  Samples available
                </span>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 cursor-pointer hover:underline">
                  <svg className="w-3.5 h-3.5 fill-emerald-600" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
                  </svg>
                  Better by Design
                </span>
              </div>
            </div>

            <p className="text-[15px] text-zinc-600 leading-relaxed">
              {product?.description ||
                "Introducing: The very-best-for-your-budget business cards. Easily create cards you can't wait to hand out."}
            </p>

            <div className="rounded-2xl bg-[#f0f8fd] border border-[#d7e8f4] px-4 py-3.5">
              <div className="text-[2rem] font-black tracking-[-0.04em] text-[#1e1d1b] leading-none">
                ${product?.price}
              </div>
              <div className="mt-1.5 text-sm font-medium text-zinc-500">
                {product?.unitPrice}
              </div>
            </div>

            {product?.variations && product.variations.length > 0 && (
              <div className="space-y-6">
                {product.variations.map((vGroup) => {
                  const selectedVal = selectedVariations[vGroup.name];
                  const isCornerGroup = vGroup.name.toLowerCase().includes("corner");

                  return (
                    <div key={vGroup._id || vGroup.name} className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
                          {vGroup.name}*
                        </label>
                        {selectedVal && (
                          <span className="text-sm font-bold text-[#329AD4]">
                            {selectedVal.name}
                          </span>
                        )}
                      </div>

                      <div
                        className={`grid gap-2.5 ${
                          isCornerGroup
                            ? "grid-cols-2"
                            : "grid-cols-2 sm:grid-cols-3"
                        }`}
                      >
                        {vGroup.values.map((val) => {
                          const isSelected = selectedVal?.name === val.name;
                          const isFree = val.price === 0;

                          return (
                            <button
                              key={val._id || val.name}
                              type="button"
                              onClick={() => handleSelectOption(vGroup.name, val)}
                              className={`relative flex flex-col items-center justify-between p-3 min-h-[96px] rounded-2xl border transition cursor-pointer text-center bg-white group ${
                                isSelected
                                  ? "border-[#329AD4] bg-[#eef7fc] shadow-[0_0_0_3px_rgba(50,154,212,0.15)]"
                                  : "border-[#d7e8f4] hover:border-[#88c9ef]"
                              }`}
                            >
                              {val.image ? (
                                <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#d7e8f4] mb-2">
                                  <img src={mediaSrc(val.image) || val.image} alt={val.name} className="w-full h-full object-cover" />
                                </div>
                              ) : isCornerGroup ? (
                                <div
                                  className={`w-11 h-7 border-2 mb-2 bg-white ${
                                    val.name.toLowerCase().includes("rounded")
                                      ? "rounded-lg border-[#329AD4]"
                                      : "rounded-sm border-zinc-400"
                                  }`}
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-[#f0f8fd] border border-[#d7e8f4] mb-2 flex items-center justify-center text-[#55b2e7] transition-transform group-hover:scale-105">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="1.5"
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}

                              <div className="mt-auto">
                                <span className="block text-sm font-bold text-[#1e1d1b] leading-snug line-clamp-1">
                                  {val.name}
                                </span>
                                <span
                                  className={`block text-xs font-bold mt-0.5 ${
                                    isFree ? "text-emerald-700" : "text-zinc-500"
                                  }`}
                                >
                                  {isFree ? "Free" : `+$${val.price.toFixed(2)}`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-3 border-t border-[#e7f1f8] pt-5">
              <Link
                href={getFlowUrl("/browsedesigns")}
                className="w-full py-3.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-[15px] font-bold rounded-2xl transition text-center flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_24px_-12px_rgba(50,154,212,0.9)]"
              >
                <span>Browse our templates</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>

              <Link
                href={getFlowUrl("/customize")}
                className="w-full py-3.5 border border-[#1e1d1b] hover:bg-[#1e1d1b] hover:text-white text-[#1e1d1b] text-[15px] font-bold rounded-2xl bg-white transition text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Upload your design</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </Link>

              <div className="pt-1 text-center">
                <Link
                  href={getFlowUrl("/quote")}
                  className="inline-flex items-center gap-2.5 text-sm font-bold text-[#1e1d1b] hover:text-[#329AD4] transition-colors"
                >
                  <span className="flex -space-x-1.5">
                    <span className="h-6 w-6 rounded-full bg-[#55b2e7] text-[10px] font-bold text-white flex items-center justify-center border-2 border-white">
                      A
                    </span>
                    <span className="h-6 w-6 rounded-full bg-[#329AD4] text-[10px] font-bold text-white flex items-center justify-center border-2 border-white">
                      B
                    </span>
                    <span className="h-6 w-6 rounded-full bg-[#2172a0] text-[10px] font-bold text-white flex items-center justify-center border-2 border-white">
                      C
                    </span>
                  </span>
                  <span className="underline decoration-[#329AD4]/50 underline-offset-4">
                    Let us design it for you from $10.00
                  </span>
                </Link>
              </div>
            </div>

            <div>
              <img src="/merchants.png" alt="Accepted Payment Methods" className="w-full max-w-[17rem] opacity-90" />
            </div>
          </div>
        </div>
      </div>

      <CardOptionsModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        onNext={(options) => {
          setCardOptions(options);
          setIsOptionsModalOpen(false);
          window.location.href = productId ? `/browsedesigns?productId=${productId}` : "/browsedesigns";
        }}
      />

      <CardStudioModal
        isOpen={isStudioOpen}
        cardOptions={cardOptions}
        onClose={() => setIsStudioOpen(false)}
        onBack={() => {
          setIsStudioOpen(false);
          setIsOptionsModalOpen(true);
        }}
      />
    </section>
  );
}
