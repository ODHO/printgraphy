"use client";

import React, { useState } from "react";

export interface CardOptions {
  cornerStyle: "standard" | "rounded";
  quantity: number;
  price: number;
}

interface CardOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (options: CardOptions) => void;
}

export default function CardOptionsModal({
  isOpen,
  onClose,
  onNext,
}: CardOptionsModalProps) {
  const [cornerStyle, setCornerStyle] = useState<"standard" | "rounded">("rounded");
  const [quantity, setQuantity] = useState<number>(100);

  if (!isOpen) return null;

  // Base price per quantity
  const getBasePrice = (qty: number, corners: "standard" | "rounded") => {
    let base = 25.99;
    if (qty === 250) base = 48.99;
    if (qty === 500) base = 79.99;
    if (qty === 1000) base = 129.99;
    if (qty === 2500) base = 249.99;
    if (qty === 5000) base = 449.99;

    const cornerFee = corners === "rounded" ? 17.99 : 0;
    return (base + cornerFee).toFixed(2);
  };

  const currentPrice = parseFloat(getBasePrice(quantity, cornerStyle));

  const handleNext = () => {
    onNext({
      cornerStyle,
      quantity,
      price: currentPrice,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-100 flex flex-col my-auto">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              Square Business Cards
            </h2>
            <p className="text-base text-zinc-500 mt-1">
              Please select all required options.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-6">
          
          {/* Corners Section */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Corners*</h3>
              <p className="text-base text-zinc-500">Choose Your preferred corner style</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Option 1: Standard */}
              <button
                type="button"
                onClick={() => setCornerStyle("standard")}
                className={`relative flex flex-col items-center justify-center p-6 h-36 rounded-xl border-2 transition-all cursor-pointer bg-white ${
                  cornerStyle === "standard"
                    ? "border-[#e74b2d] bg-sky-50/20 shadow-sm"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                {/* Checkmark Badge if selected */}
                {cornerStyle === "standard" && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#e74b2d] text-white flex items-center justify-center shadow-xs">
                    <svg className="w-3 h-3 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {/* Standard Corner Icon Outline */}
                <div className="w-20 h-14 border-2 border-zinc-400 rounded-none bg-white shadow-xs" />
                <span className="mt-3 text-base font-semibold text-zinc-700">Standard</span>
              </button>

              {/* Option 2: Rounded */}
              <button
                type="button"
                onClick={() => setCornerStyle("rounded")}
                className={`relative flex flex-col items-center justify-center p-6 h-36 rounded-xl border-2 transition-all cursor-pointer ${
                  cornerStyle === "rounded"
                    ? "border-[#e74b2d] bg-sky-50/30 shadow-sm"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                {/* Checkmark Badge if selected */}
                {cornerStyle === "rounded" && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#e74b2d] text-white flex items-center justify-center shadow-xs">
                    <svg className="w-3 h-3 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {/* Rounded Corner Icon Outline */}
                <div className="w-20 h-14 border-2 border-[#e74b2d] rounded-xl bg-white shadow-xs" />
                <div className="mt-2 text-center">
                  <span className="block text-base font-bold text-[#e74b2d]">Rounded</span>
                  <span className="block text-base font-medium text-[#e74b2d]">$17.99</span>
                </div>
              </button>
            </div>
          </div>

          {/* Quantity Section */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Quantity</h3>
              <p className="text-base text-zinc-500">Select the quantity you need</p>
            </div>

            {/* Dropdown */}
            <div className="relative">
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full appearance-none bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-base text-zinc-800 font-medium focus:outline-none focus:border-[#e74b2d] focus:ring-1 focus:ring-[#e74b2d] cursor-pointer shadow-2xs"
              >
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
                <option value={2500}>2500</option>
                <option value={5000}>5000</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Price Tag Pill */}
            <div className="flex items-center gap-2 border border-zinc-200 rounded-lg p-2.5 bg-zinc-50 text-base font-medium text-zinc-700">
              <svg className="w-4 h-4 text-[#e74b2d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>
                {quantity} starting at <span className="font-bold text-[#e74b2d]">${currentPrice.toFixed(2)}</span>
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-zinc-100">
          <button
            type="button"
            onClick={handleNext}
            className="w-full py-3 bg-[#e74b2d] hover:bg-[#c93e23] text-white font-semibold text-base rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Next
          </button>
        </div>

      </div>
    </div>
  );
}
