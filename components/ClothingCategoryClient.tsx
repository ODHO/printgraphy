"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import type { ApparelColor, ApparelSize, DecorationMethod } from "@/lib/mockupCanvas";

export type ClothingVariationValue = {
  _id?: string;
  name: string;
  image?: string;
  price: number;
  description?: string;
};

export type ClothingVariation = {
  _id?: string;
  name: string;
  required?: boolean;
  values: ClothingVariationValue[];
};

type Props = {
  category: {
    _id: string;
    name: string;
    slug?: string;
    description?: string;
    price?: number;
    unitPrice?: string;
    image?: string;
    mockup_image?: string;
  };
  coverFallback: string;
  colors: ApparelColor[];
  sizes: ApparelSize[];
  methods: DecorationMethod[];
  variations: ClothingVariation[];
  products: Array<{
    _id: string;
    name: string;
    image?: string;
    price?: number;
  }>;
};

export default function ClothingCategoryClient({
  category,
  coverFallback,
  colors,
  sizes,
  methods,
  variations,
  products,
}: Props) {
  const [selectedColorId, setSelectedColorId] = useState(colors[0]?.id || "");
  const [selectedVars, setSelectedVars] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    variations.forEach((g) => {
      if (g.values[0]?.name) init[g.name] = g.values[0].name;
    });
    return init;
  });

  const selectedColor = colors.find((c) => c.id === selectedColorId) || colors[0];

  const displaySrc = useMemo(() => {
    // Color mockup wins; else storefront banner (image), then design mockup
    const raw =
      selectedColor?.mockupImage ||
      category.image ||
      category.mockup_image ||
      coverFallback;
    return mediaSrc(raw) || raw;
  }, [selectedColor, category.mockup_image, category.image, coverFallback]);

  const variationAddOn = useMemo(() => {
    let sum = 0;
    variations.forEach((g) => {
      const picked = selectedVars[g.name];
      const val = g.values.find((v) => v.name === picked);
      if (val) sum += Number(val.price) || 0;
    });
    return sum;
  }, [variations, selectedVars]);

  const basePrice = Number(category.price) || 0;
  const fromPrice = basePrice + variationAddOn;

  const designQuery = new URLSearchParams({
    category: category.slug || category._id,
  });
  // Pass selected variation names so design flow can apply them
  if (Object.keys(selectedVars).length) {
    designQuery.set("variations", JSON.stringify(selectedVars));
  }
  if (selectedColorId) designQuery.set("color", selectedColorId);
  const designHref = `/clothing-bags/design?${designQuery.toString()}`;

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="w-full bg-[#f8fbfd] border-b border-zinc-100 py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 mb-2">
            <Link href="/" className="hover:text-[#064FE0]">
              Home
            </Link>
            <span>›</span>
            <Link href="/clothing-bags" className="hover:text-[#064FE0]">
              Clothing & Bags
            </Link>
            <span>›</span>
            <span className="text-zinc-900 font-medium">{category.name}</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
            {category.name}
          </h1>
          {category.description ? (
            <p className="mt-2 text-base text-zinc-500 max-w-2xl">{category.description}</p>
          ) : null}
        </div>
      </div>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
          {/* Framed cover — same language as design page */}
          <div className="rounded-3xl border border-zinc-200 bg-[#f8fbfd] aspect-square relative overflow-hidden shadow-sm">
            {displaySrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displaySrc}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-contain p-6 sm:p-10 drop-shadow-lg transition-opacity duration-300"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-400 font-medium">
                Add a cover or mockup in admin
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900">
                Customize {category.name}
              </h2>
              <p className="text-zinc-500 mt-1">
                {fromPrice > 0
                  ? `From $${fromPrice.toFixed(2)}${category.unitPrice ? ` · ${category.unitPrice}` : ""}`
                  : "Choose options, then design on the mockup"}
                {variationAddOn > 0 && (
                  <span className="text-zinc-400"> · options +${variationAddOn.toFixed(2)}</span>
                )}
              </p>
            </div>

            {colors.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  Color — {selectedColor?.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.name}
                      onClick={() => setSelectedColorId(c.id)}
                      className={`w-10 h-10 rounded-full border-2 transition-all cursor-pointer ${
                        selectedColorId === c.id
                          ? "border-[#064FE0] ring-2 ring-[#064FE0]/30 scale-110"
                          : "border-zinc-200 hover:border-zinc-400"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Preview updates when a color has its own mockup image
                </p>
              </div>
            )}

            {/* Category Default Variations & Options */}
            {variations.map((group) => (
              <div key={group._id || group.name}>
                <h3 className="text-sm font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  {group.name}
                  {group.required ? (
                    <span className="text-red-400 font-medium normal-case tracking-normal ml-1">*</span>
                  ) : null}
                </h3>
                <div className="space-y-2">
                  {group.values.map((val) => {
                    const active = selectedVars[group.name] === val.name;
                    return (
                      <button
                        key={val._id || val.name}
                        type="button"
                        onClick={() =>
                          setSelectedVars((prev) => ({ ...prev, [group.name]: val.name }))
                        }
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                          active
                            ? "border-[#064FE0] bg-sky-50/60"
                            : "border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        {val.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaSrc(val.image) || val.image}
                            alt=""
                            className="w-12 h-12 rounded-xl object-contain bg-white border border-zinc-100"
                          />
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-zinc-900 block">{val.name}</span>
                          {val.description ? (
                            <span className="text-sm text-zinc-500">{val.description}</span>
                          ) : null}
                        </div>
                        <span className="text-sm font-bold text-zinc-600 shrink-0">
                          {val.price > 0 ? `+$${Number(val.price).toFixed(2)}` : "Included"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <p className="text-sm text-zinc-400">
              {sizes.map((s) => s.name).join(" · ")}
              {methods.length > 0 && ` · ${methods.length} decoration options`}
            </p>

            <Link
              href={designHref}
              className="inline-flex w-full sm:w-auto justify-center px-6 py-3 bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold rounded-xl shadow-md shadow-[#064FE0]/25 transition-colors"
            >
              Start designing
            </Link>
          </div>
        </div>

        {products.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-black text-zinc-900 mb-5">More in this category</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => {
                const pImg =
                  mediaSrc(p.image || category.image || displaySrc) ||
                  p.image ||
                  displaySrc;
                return (
                  <Link
                    key={p._id}
                    href={`/clothing-bags/design?category=${encodeURIComponent(category.slug || category._id)}&productId=${p._id}`}
                    className="group rounded-3xl border border-zinc-200 overflow-hidden hover:border-[#064FE0]/40 hover:shadow-md transition-all bg-white"
                  >
                    <div className="aspect-square bg-[#f8fbfd] relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pImg}
                        alt={p.name}
                        className="absolute inset-0 w-full h-full object-contain p-6"
                      />
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-zinc-900">{p.name}</p>
                      {p.price != null && (
                        <p className="text-sm text-zinc-500 mt-0.5">${Number(p.price).toFixed(2)}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
