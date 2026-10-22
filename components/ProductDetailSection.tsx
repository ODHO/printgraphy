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
    <section className="py-4 font-sans max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Column: Image Gallery (LG: 6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4 sticky top-20">
          
          {/* Main Showcase Image */}
          <div className="relative w-full aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-[#ffffff] border border-zinc-200/80 shadow-xs group">
            <img
              src={currentMainImage}
              alt={product?.name || "Product Showcase Image"}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.jpg";
              }}
              className="w-full h-full object-cover transition-all duration-300"
            />

            {/* Favorite Heart Button */}
            <button
              onClick={toggleFavorite}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-md transition-all cursor-pointer text-zinc-700 hover:text-red-500 z-10"
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

            {/* Toast Notification */}
            {toastMessage && (
              <div className="absolute top-4 left-4 bg-zinc-900/90 text-white text-base font-bold px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-xs animate-fade-in z-10">
                {toastMessage}
              </div>
            )}

            {/* Previous Image Chevron Button */}
            {galleryList.length > 1 && (
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-zinc-700 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                aria-label="Previous Image"
              >
                <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next Image Chevron Button */}
            {galleryList.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-zinc-700 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                aria-label="Next Image"
              >
                <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Carousel Row */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {galleryList.map((thumb, idx) => (
              <button
                key={`${thumb}-${idx}`}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer bg-white ${
                  activeImageIndex === idx
                    ? "border-[#329AD4] ring-2 ring-[#329AD4]/30 scale-95"
                    : "border-zinc-200 hover:border-zinc-300 opacity-80 hover:opacity-100"
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

        {/* Right Column: Vistaprint Product Details & Variations (LG: 6 cols) */}
        <div className="lg:col-span-6 flex flex-col space-y-6">
          
          {/* Header Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight leading-snug">
              {product?.name || "Standard Business Cards"}
            </h1>

            {/* Ratings & Badges */}
            <div className="flex items-center gap-3 flex-wrap text-base mt-2">
              <div className="flex items-center gap-1.5">
                {product?.reviewCount && product.reviewCount > 0 ? (
                  <div className="flex text-yellow-400">
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
                  className="font-bold text-zinc-900 underline cursor-pointer hover:text-[#329AD4]"
                >
                  {product?.reviewCount && product.reviewCount > 0
                    ? `${product.rating} (${product.reviewCount.toLocaleString()} ${product.reviewCount === 1 ? "review" : "reviews"})`
                    : "No reviews yet (Write a review)"}
                </span>
              </div>

              <span className="px-2.5 py-0.5 rounded-full border border-zinc-300 text-base font-bold text-zinc-700 bg-white shadow-2xs">
                Samples available
              </span>

              <span className="text-base font-bold text-emerald-700 flex items-center gap-1 cursor-pointer hover:underline">
                <svg className="w-3.5 h-3.5 fill-emerald-600" viewBox="0 0 20 20">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
                </svg>
                Better by Design 🛈
              </span>
            </div>
          </div>

          {/* Subtitle / Description */}
          <p className="text-base sm:text-base text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3">
            {product?.description ||
              "Introducing: The very-best-for-your-budget business cards. Easily create cards you can't wait to hand out."}
          </p>

          {/* Fast Shipping Callout */}
          {/* <div className="text-base text-zinc-700 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3">
            Need your business cards right away? Explore next-day and 2-day delivery options with{" "}
            <Link href="/browsedesigns" className="text-[#329AD4] font-bold hover:underline">
              fast-shipping business cards
            </Link>
            . <span className="underline cursor-pointer">See details</span>
          </div> */}

          {/* Price Header */}
          <div>
            <div className="text-3xl font-black text-zinc-900 tracking-tight">
              ${product?.price}
            </div>
            <div className="text-base text-zinc-500 font-semibold mt-0.5">
              {product?.unitPrice}
            </div>
          </div>

          {/* Delivery Estimate Box */}
          {/* <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 space-y-2.5 text-base text-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between font-bold border-b border-zinc-100 pb-2">
              <span className="flex items-center gap-1.5">
                <span>📍 Delivery to 02451</span>
              </span>
              <button className="text-base font-bold text-[#329AD4] hover:underline cursor-pointer">
                More options
              </button>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span className="flex items-center gap-2 font-semibold">
                <span>🚚 Friday, Sep 25th</span>
              </span>
              <span className="font-bold text-zinc-900">$23.99 <span className="text-base text-zinc-500 font-normal">Fastest delivery</span></span>
            </div>
            <div className="flex items-center justify-between text-emerald-700 font-medium">
              <span className="flex items-center gap-2 font-bold">
                <span>📦 Wednesday, Oct 7th</span>
              </span>
              <span className="font-extrabold">$5.99 <span className="text-emerald-600 text-base font-bold">(Free over $100.00)</span></span>
            </div>
          </div> */}

          {/* Product Variations (Vistaprint Style Grid) */}
          {product?.variations && product.variations.length > 0 && (
            <div className="space-y-6 pt-2">
              {product.variations.map((vGroup) => {
                const selectedVal = selectedVariations[vGroup.name];
                const isCornerGroup = vGroup.name.toLowerCase().includes("corner");

                return (
                  <div key={vGroup._id || vGroup.name} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-base font-black text-zinc-900 uppercase tracking-wide">
                        {vGroup.name}*
                      </label>
                      {selectedVal && (
                        <span className="text-base font-bold text-[#329AD4]">
                          {selectedVal.name}
                        </span>
                      )}
                    </div>

                    {/* Vistaprint Card Grid */}
                    <div
                      className={`grid gap-3 ${
                        isCornerGroup
                          ? "grid-cols-2"
                          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
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
                            className={`relative flex flex-col items-center justify-between p-3 min-h-[100px] rounded-xl border-2 transition-all cursor-pointer text-center bg-white group ${
                              isSelected
                                ? "border-[#329AD4] bg-[#e0f2fe]/40 shadow-xs ring-1 ring-[#329AD4]"
                                : "border-zinc-200 hover:border-zinc-300"
                            }`}
                          >
                            {/* Slanted Card Texture Thumbnail / Image Icon */}
                            {val.image ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 mb-2 shadow-2xs">
                                <img src={mediaSrc(val.image) || val.image} alt={val.name} className="w-full h-full object-cover" />
                              </div>
                            ) : isCornerGroup ? (
                              <div
                                className={`w-12 h-8 border-2 rounded-md mb-2 bg-white flex items-center justify-center shadow-2xs ${
                                  val.name.toLowerCase().includes("rounded")
                                    ? "rounded-lg border-[#329AD4]"
                                    : "border-zinc-400 rounded-none"
                                }`}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-zinc-100 border border-zinc-200 mb-2 flex items-center justify-center text-zinc-400 group-hover:scale-105 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            )}

                            {/* Option Name & Price */}
                            <div className="mt-auto">
                              <span className="block text-base font-bold text-zinc-900 leading-snug line-clamp-1">
                                {val.name}
                              </span>
                              <span
                                className={`block text-base font-extrabold mt-0.5 ${
                                  isFree ? "text-emerald-700 font-bold" : "text-zinc-600 font-semibold"
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

          {/* Action CTA Buttons (Vistaprint Exact Design) */}
          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <Link
              href={getFlowUrl("/browsedesigns")}
              className="w-full py-3.5 bg-[#55b2e7] hover:bg-[#55b2e7] text-white text-base font-extrabold rounded-xl shadow-md transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Browse our templates</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>

            <Link
              href={getFlowUrl("/customize")}
              className="w-full py-3.5 border-2 border-zinc-800 hover:bg-zinc-900 hover:text-white text-zinc-900 text-base font-extrabold rounded-xl bg-white transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Upload your design</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </Link>

            {/* Design Help Link */}
            <div className="pt-2 text-center">
              <Link
                href={getFlowUrl("/quote")}
                className="inline-flex items-center gap-2 text-base font-bold text-zinc-800 hover:text-[#329AD4] transition-colors"
              >
                <div className="flex -space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-base font-bold text-white flex items-center justify-center border border-white">
                    👩
                  </span>
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-base font-bold text-white flex items-center justify-center border border-white">
                    👨
                  </span>
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-base font-bold text-white flex items-center justify-center border border-white">
                    👩‍🦰
                  </span>
                </div>
                <span className="underline">Let us design it for you from $10.00</span>
              </Link>
            </div>
          </div>

          {/* Payment Method Badges */}
          <div className="pt-2">
            <img src="/merchants.png" alt="Accepted Payment Methods" className="w-full max-w-xs" />
          </div>

        </div>

      </div>

      {/* Card Customization Options Modal */}
      <CardOptionsModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        onNext={(options) => {
          setCardOptions(options);
          setIsOptionsModalOpen(false);
          window.location.href = productId ? `/browsedesigns?productId=${productId}` : "/browsedesigns";
        }}
      />

      {/* Interactive Card Creation Studio Screen */}
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
