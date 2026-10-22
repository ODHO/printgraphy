"use client";

import { useState } from "react";
import Image from "next/image";
import CardOptionsModal, { CardOptions } from "./CardOptionsModal";
import CardStudioModal from "./CardStudioModal";

export default function SquareCardsShowcase() {
  const [mainImage, setMainImage] = useState("/square-cards.png");
  const [thumbnails, setThumbnails] = useState([
    "/square-cards-1.png",
    "/square-cards-2.png",
    "/square-cards-3.png",
    "/square-cards-4.png",
  ]);

  // Modal Flow States
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [cardOptions, setCardOptions] = useState<CardOptions | null>(null);

  const handleThumbnailClick = (clickedIdx: number) => {
    const currentMain = mainImage;
    const clickedImage = thumbnails[clickedIdx];

    setMainImage(clickedImage);
    setThumbnails((prev) => {
      const updated = [...prev];
      updated[clickedIdx] = currentMain;
      return updated;
    });
  };

  const handleOpenOptionsModal = () => {
    setIsOptionsModalOpen(true);
  };

  const handleOptionsNext = (options: CardOptions) => {
    setCardOptions(options);
    setIsOptionsModalOpen(false);
    window.location.href = "/browsedesigns";
  };

  const handleStudioBack = () => {
    setIsStudioOpen(false);
    setIsOptionsModalOpen(true);
  };

  return (
    <section className="my-10 bg-gradient-to-br from-white via-slate-50/60 to-sky-50/30 rounded-3xl border border-zinc-200/80 p-6 sm:p-8 shadow-xs font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        
        {/* Left & Middle: Image Gallery (LG: 7 cols) */}
        <div className="lg:col-span-7 flex md:flex-row flex-col-reverse gap-4 items-stretch">
          
          {/* Thumbnails Column */}
          <div className="flex md:flex-col flex-row gap-3 md:w-28 w-full flex-shrink-0 justify-between">
            {thumbnails.map((thumb, idx) => (
              <button
                key={`${thumb}-${idx}`}
                onClick={() => handleThumbnailClick(idx)}
                className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-100 border-2 border-transparent hover:border-[#e74b2d] transition-all duration-200 cursor-pointer shadow-xs group"
                aria-label={`Select image ${idx + 1}`}
              >
                <Image
                  src={thumb}
                  alt={`Square Cards Thumbnail ${idx + 1}`}
                  fill
                  sizes="100px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>

          {/* Main Large Image Display */}
          <div className="relative flex-1 aspect-square rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/80 shadow-lg">
            <Image
              src={mainImage}
              alt="Square Cards Showcase Main Image"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-all duration-300"
            />
          </div>
        </div>

        {/* Right Info Column (LG: 5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-4 pl-0 lg:pl-2">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e74b2d]/10 text-[#e74b2d] text-xs font-bold w-fit">
            <span>✨ Featured Format</span>
            <span>•</span>
            <span>65 × 65 mm</span>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight leading-tight">
            Square Business Cards
          </h2>

          {/* Ratings */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="font-bold text-zinc-900">5.0</span>
            <span className="text-zinc-500 font-medium">(56 Verified Reviews)</span>
          </div>

          {/* Paragraph Description */}
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-normal">
            Stand out instantly with an unexpected geometric silhouette. Perfect for creative agencies, boutiques, photographers, and modern professionals.
          </p>

          {/* Highlights List */}
          <div className="space-y-2 pt-1 bg-white/80 rounded-2xl p-4 border border-zinc-200/70">
            <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
              Product Highlights
            </h3>
            <ul className="text-sm text-zinc-600 space-y-1.5 list-disc pl-4 leading-relaxed font-medium">
              <li>Coated and classic, with a smooth, shine-free finish</li>
              <li>Feel: Silky front and back with optional soft-touch</li>
              <li>Thickness: 14pt standard, 16pt premium or 18pt premium plus</li>
            </ul>
          </div>

          {/* Price */}
          <div className="pt-1 flex items-baseline gap-2">
            <div className="text-2xl font-black text-zinc-900">$22.99</div>
            <div className="text-sm text-zinc-500 font-medium">$0.23 Each / 100 Units</div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="/customize"
              className="px-6 py-3 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-sm sm:text-base font-bold rounded-xl shadow-md shadow-[#e74b2d]/25 transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              <span>Design in 3D Studio</span>
              <span>→</span>
            </a>
            <button
              onClick={handleOpenOptionsModal}
              className="px-6 py-3 border border-zinc-800 text-zinc-900 hover:bg-zinc-900 hover:text-white text-sm sm:text-base font-bold rounded-xl bg-white transition-all duration-200 cursor-pointer shadow-2xs"
            >
              Browse Templates
            </button>
          </div>

        </div>

      </div>

      {/* Card Customization Options Modal (Image 1) */}
      <CardOptionsModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        onNext={handleOptionsNext}
      />

      {/* Interactive Card Creation Studio Screen (Image 2) */}
      <CardStudioModal
        isOpen={isStudioOpen}
        cardOptions={cardOptions}
        onClose={() => setIsStudioOpen(false)}
        onBack={handleStudioBack}
      />

    </section>
  );
}

