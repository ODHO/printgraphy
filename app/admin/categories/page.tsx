"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import { IVariation } from "@/models/Product";

export interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
  sortOrder: number;
  canvas_width: number;
  canvas_height: number;
  unit: "mm" | "cm" | "in" | "px";
  orientation: "landscape" | "portrait";
  bleed: number;
  safe_area: number;
  background_color: string;
  supports_back_side: boolean;
  variations?: IVariation[];
  templateCount?: number;
  createdAt: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (data.success) setCategories(data.categories);
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
      } else {
        setCategories((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (err) {
      alert("Failed to delete category.");
    } finally {
      setDeleting(null);
    }
  };

  const handleSeedDefaults = async () => {
    if (
      !confirm(
        "Seed or update standard product categories (Business Cards, Flyers, Invitations, Brochures, Postcards, etc.)?"
      )
    )
      return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
      }
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Product Categories & Canvas Setup</h1>
          <p className="text-zinc-500 text-base mt-0.5">
            Configure dynamic canvas dimensions, bleed margins, safe areas, templates, and variations for each category.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="px-3.5 py-2 text-base font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {seeding ? "Seeding..." : "⚡ Seed Standard Presets"}
          </button>

          <Link
            href="/admin/categories/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#e74b2d]/20 cursor-pointer"
          >
            <span className="text-base">+</span> New Category
          </Link>
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-sky-200 border-t-[#e74b2d] rounded-full animate-spin mx-auto" />
            <p className="text-base text-zinc-400 mt-2">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="text-zinc-500 text-base font-semibold">No product categories found.</p>
            <p className="text-zinc-400 text-base max-w-md mx-auto">
              Initialize default product categories (Business Cards, Flyers, Invitations, Posters, etc.) to start designing templates.
            </p>
            <button
              onClick={handleSeedDefaults}
              className="px-5 py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-md"
            >
              Seed Standard Categories Now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {categories.map((cat) => {
              const aspect = (cat.canvas_width || 105) / (cat.canvas_height || 60);

              return (
                <div
                  key={cat._id}
                  className="p-5 hover:bg-sky-50/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* Left Column: Category Info & Dimensions */}
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Mini card image, or aspect preview when none is uploaded */}
                    {cat.image ? (
                      <img
                        src={mediaSrc(cat.image)}
                        alt={cat.name}
                        className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-zinc-200 bg-white"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-2xl bg-[#0f1117] flex items-center justify-center p-2 shrink-0 border border-zinc-200"
                        title={`${cat.name} Aspect: ${aspect.toFixed(2)}`}
                      >
                        <div
                          className="rounded-xs border border-sky-400/80 shadow-xs transition-all"
                          style={{
                            width: aspect >= 1 ? "36px" : `${Math.round(36 * aspect)}px`,
                            height: aspect >= 1 ? `${Math.round(36 / aspect)}px` : "36px",
                            backgroundColor: cat.background_color || "#18181b",
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Link
                          href={`/admin/categories/${cat._id}/templates`}
                          className="font-bold text-zinc-900 hover:text-[#e74b2d] transition-colors text-base"
                        >
                          {cat.name}
                        </Link>
                        <code className="text-base text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded font-mono">
                          /{cat.slug}
                        </code>
                        <span
                          className={`px-2 py-0.5 rounded-full text-base font-bold ${
                            cat.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {cat.isActive ? "Active" : "Disabled"}
                        </span>
                        {cat.variations && cat.variations.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-base font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {cat.variations.length} Variations
                          </span>
                        )}
                      </div>

                      {cat.description && (
                        <p className="text-zinc-500 text-base line-clamp-1">{cat.description}</p>
                      )}

                      {/* Canvas Specifications Pills */}
                      <div className="flex items-center gap-2 flex-wrap text-base pt-0.5">
                        <span className="px-2 py-0.5 bg-sky-50 text-sky-800 font-mono font-bold rounded-md border border-sky-200/60">
                          📐 {cat.canvas_width} × {cat.canvas_height} {cat.unit}
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 font-semibold rounded-md capitalize">
                          {cat.orientation}
                        </span>
                        <span className="px-2 py-0.5 bg-red-50 text-red-700 font-semibold rounded-md">
                          Bleed: {cat.bleed}mm
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-md">
                          Safe: {cat.safe_area}mm
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 font-semibold rounded-md">
                          {cat.supports_back_side ? "2-Sided" : "1-Sided"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Templates Count & Actions */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {/* Template Count Badge / Link */}
                    <Link
                      href={`/admin/categories/${cat._id}/templates`}
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-base font-bold transition-all"
                    >
                      🎨 {cat.templateCount ?? 0} Templates →
                    </Link>

                    {/* New Template Shortcut */}
                    <Link
                      href={`/admin/templates/new?categoryId=${cat._id}`}
                      className="px-3 py-1.5 rounded-xl bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold transition-all shadow-xs"
                    >
                      + Create Template
                    </Link>

                    {/* Configure / Edit Button Link to Full Page */}
                    <Link
                      href={`/admin/categories/${cat._id}/edit`}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-base font-bold transition-all cursor-pointer"
                    >
                      Configure
                    </Link>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(cat._id, cat.name)}
                      disabled={deleting === cat._id}
                      className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer text-base"
                      title="Delete Category"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
