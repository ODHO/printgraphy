"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IVariation } from "@/models/Product";

interface Category {
  _id: string;
  name: string;
  slug: string;
  canvas_type?: "flat" | "dieline" | "mockup";
}

export interface FormVariationValue {
  _id?: string;
  name: string;
  image: string;
  price: string;
  description: string;
}

export interface FormVariation {
  _id?: string;
  name: string;
  required: boolean;
  values: FormVariationValue[];
}

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initialData?: {
    name: string;
    slug: string;
    description: string;
    categoryId: string;
    price: string;
    unitPrice: string;
    image: string;
    rating: string;
    reviewCount: string;
    isActive: boolean;
    tags: string;
    variations?: IVariation[];
  };
}

export default function ProductForm({ mode, productId, initialData }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingValImage, setUploadingValImage] = useState<string | null>(null); // "varIdx-valIdx"
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    description: initialData?.description ?? "",
    categoryId: initialData?.categoryId ?? "",
    price: initialData?.price ?? "14.99",
    unitPrice: initialData?.unitPrice ?? "",
    image: initialData?.image ?? "",
    rating: initialData?.rating ?? "4.5",
    reviewCount: initialData?.reviewCount ?? "0",
    isActive: initialData?.isActive ?? true,
    tags: initialData?.tags ?? "",
  });

  const [variations, setVariations] = useState<FormVariation[]>(() => {
    if (initialData?.variations && initialData.variations.length > 0) {
      return initialData.variations.map((v) => ({
        _id: v._id,
        name: v.name,
        required: v.required ?? true,
        values: (v.values || []).map((val) => ({
          _id: val._id,
          name: val.name,
          image: val.image ?? "",
          price: String(val.price ?? 0),
          description: val.description ?? "",
        })),
      }));
    }
    return [];
  });

  const selectedCategory = categories.find((c) => c._id === form.categoryId);
  const isApparelCategory = selectedCategory?.canvas_type === "mockup";

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.categories);
      });
  }, []);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setForm((prev) => ({ ...prev, image: data.url }));
      } else {
        setError(data.message || "Failed to upload image");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleValueImageUpload = async (
    varIdx: number,
    valIdx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = `${varIdx}-${valIdx}`;
    setUploadingValImage(key);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        updateVariationValue(varIdx, valIdx, "image", data.url);
      } else {
        setError(data.message || "Failed to upload variation image");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload variation image");
    } finally {
      setUploadingValImage(null);
    }
  };

  // Variations state helpers
  const addVariation = () => {
    setVariations((prev) => [
      ...prev,
      {
        name: "",
        required: true,
        values: [
          { name: "Standard", image: "", price: "0", description: "" },
        ],
      },
    ]);
  };

  const removeVariation = (varIdx: number) => {
    setVariations((prev) => prev.filter((_, idx) => idx !== varIdx));
  };

  const updateVariationField = (varIdx: number, field: keyof FormVariation, value: unknown) => {
    setVariations((prev) => {
      const next = [...prev];
      next[varIdx] = { ...next[varIdx], [field]: value };
      return next;
    });
  };

  const addVariationValue = (varIdx: number) => {
    setVariations((prev) => {
      const next = [...prev];
      const currentValues = next[varIdx].values;
      next[varIdx] = {
        ...next[varIdx],
        values: [...currentValues, { name: "", image: "", price: "0", description: "" }],
      };
      return next;
    });
  };

  const removeVariationValue = (varIdx: number, valIdx: number) => {
    setVariations((prev) => {
      const next = [...prev];
      next[varIdx] = {
        ...next[varIdx],
        values: next[varIdx].values.filter((_, idx) => idx !== valIdx),
      };
      return next;
    });
  };

  const updateVariationValue = (
    varIdx: number,
    valIdx: number,
    field: keyof FormVariationValue,
    value: string
  ) => {
    setVariations((prev) => {
      const next = [...prev];
      const currentValues = [...next[varIdx].values];
      currentValues[valIdx] = { ...currentValues[valIdx], [field]: value };
      next[varIdx] = { ...next[varIdx], values: currentValues };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const formattedVariations = variations
      .filter((v) => v.name.trim().length > 0)
      .map((v) => ({
        name: v.name.trim(),
        required: v.required,
        values: v.values
          .filter((val) => val.name.trim().length > 0)
          .map((val) => ({
            name: val.name.trim(),
            image: val.image.trim(),
            price: isNaN(parseFloat(val.price)) ? 0 : parseFloat(val.price),
            description: val.description.trim(),
          })),
      }));

    const payload = {
      name: form.name,
      slug: form.slug || generateSlug(form.name),
      description: form.description,
      categoryId: form.categoryId || undefined,
      price: parseFloat(form.price),
      unitPrice: form.unitPrice,
      image: form.image,
      rating: parseFloat(form.rating),
      reviewCount: parseInt(form.reviewCount),
      isActive: form.isActive,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      variations: formattedVariations,
    };

    try {
      const url = mode === "create" ? "/api/admin/products" : `/api/admin/products/${productId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {mode === "create" ? "New Catalog Product" : "Edit Product"}
          </h1>
          <p className="text-zinc-500 text-base mt-0.5">
            {isApparelCategory
              ? "Link this SKU to a Clothing & Bags category — colors, sizes, and decoration come from the category."
              : "Configure product metadata, custom variations (Paper Stock, Corners, etc.), and pricing"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="px-4 py-2 text-base font-bold text-zinc-600 border border-zinc-200 rounded-xl hover:bg-white transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#e74b2d]/20 disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-base">
          {error}
        </div>
      )}

      {/* Product Info Card */}
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">Product Info</h2>

        <div>
          <label className="text-base font-bold text-zinc-700 block mb-1">Product Name *</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => {
              const n = e.target.value;
              setForm((prev) => ({ ...prev, name: n, slug: generateSlug(n) }));
            }}
            className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
            placeholder="e.g., Standard Business Cards"
          />
        </div>

        <div>
          <label className="text-base font-bold text-zinc-700 block mb-1">Slug *</label>
          <input
            required
            type="text"
            value={form.slug}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 font-mono focus:outline-none focus:border-[#e74b2d]"
            placeholder="standard-business-cards"
          />
        </div>

        <div>
          <label className="text-base font-bold text-zinc-700 block mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d] resize-none"
            placeholder="Brief product description..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1">Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
              className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d] cursor-pointer"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.canvas_type === "mockup"
                    ? " (Clothing & Bags)"
                    : c.canvas_type === "dieline"
                      ? " (Packaging)"
                      : ""}
                </option>
              ))}
            </select>
            {isApparelCategory && (
              <p className="mt-2 text-sm text-zinc-500">
                Apparel colors, sizes, placements, and decoration methods are configured on the{" "}
                <a
                  href={`/admin/categories/${form.categoryId}/edit`}
                  className="font-bold text-[#e74b2d] hover:underline"
                >
                  category
                </a>
                . This product is the storefront SKU linked to that mockup category.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-base font-bold text-zinc-700">Product Image (S3 Upload or URL)</label>
              <label className="text-base font-bold text-[#e74b2d] hover:underline cursor-pointer">
                {uploadingImage ? "Uploading..." : "↑ Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                placeholder="https://... or /custom-business.png"
                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              />
              {form.image && (
                <img
                  src={form.image}
                  alt="Product preview"
                  className="w-9 h-9 rounded-lg object-cover border border-zinc-200 shadow-xs flex-shrink-0 bg-white"
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="text-base font-bold text-zinc-700 block mb-1">Tags (comma separated)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
            className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
            placeholder="matte, standard, business"
          />
        </div>
      </div>

      {/* Pricing Card */}
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">Base Pricing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1">Base Price (USD) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-base">$</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl pl-8 pr-4 py-2 text-base font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              />
            </div>
          </div>
          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1">Unit Price Label</label>
            <input
              type="text"
              value={form.unitPrice}
              onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
              className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
              placeholder="e.g. $0.15 Each / 100 Units"
            />
          </div>
        </div>
      </div>

      {/* Product Variations Card (Vistaprint style) */}
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {isApparelCategory ? "Extra paid options (optional)" : "Product Variations & Options"}
            </h2>
            <p className="text-base text-zinc-500 mt-0.5">
              {isApparelCategory
                ? "Colors, sizes, and decoration methods come from the Clothing & Bags category. Add optional paid extras here if needed (e.g. rush print)."
                : "Add multiple variation groups (e.g. Paper Stock, Finish, Corner Style). Each variation contains options with name, image, price ($0 = Free), and description."}
            </p>
          </div>
          <button
            type="button"
            onClick={addVariation}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-base font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Variation Group
          </button>
        </div>

        {variations.length === 0 ? (
          <div className="text-center py-8 bg-[#fbfaf7] border-2 border-dashed border-zinc-200 rounded-2xl">
            <p className="text-base font-medium text-zinc-500 mb-2">No product variations created yet.</p>
            <button
              type="button"
              onClick={addVariation}
              className="text-base font-bold text-[#e74b2d] hover:underline cursor-pointer"
            >
              + Click here to add your first variation (e.g. Paper Stock)
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {variations.map((v, varIdx) => (
              <div
                key={v._id || `var-${varIdx}`}
                className="border border-zinc-200/80 rounded-2xl p-5 bg-[#fafcfd] space-y-4 relative"
              >
                {/* Variation Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-zinc-200/60 shadow-2xs">
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="text-base font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Variation Group Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={v.name}
                      onChange={(e) => updateVariationField(varIdx, "name", e.target.value)}
                      placeholder="e.g. Paper Stock, Corners, Finish"
                      className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-lg px-3 py-1.5 text-base font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                    />
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <label className="flex items-center gap-2 text-base font-bold text-zinc-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={v.required}
                        onChange={(e) => updateVariationField(varIdx, "required", e.target.checked)}
                        className="rounded border-zinc-300 text-[#e74b2d] focus:ring-[#e74b2d] w-4 h-4 cursor-pointer"
                      />
                      Required Selection
                    </label>

                    <button
                      type="button"
                      onClick={() => removeVariation(varIdx)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete variation group"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Values List */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-zinc-700 uppercase tracking-wider">
                      Option Values for &ldquo;{v.name || "Variation"}&rdquo;
                    </h3>
                    <button
                      type="button"
                      onClick={() => addVariationValue(varIdx)}
                      className="text-base font-bold text-[#e74b2d] hover:underline cursor-pointer"
                    >
                      + Add Option Value
                    </button>
                  </div>

                  {v.values.map((val, valIdx) => {
                    const uploadKey = `${varIdx}-${valIdx}`;
                    const isUploadingThis = uploadingValImage === uploadKey;
                    const isFree = parseFloat(val.price) === 0 || val.price === "" || val.price === "0";

                    return (
                      <div
                        key={val._id || `val-${varIdx}-${valIdx}`}
                        className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-3 shadow-2xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                          {/* Option Name */}
                          <div className="sm:col-span-5">
                            <label className="text-base font-bold text-zinc-500 block mb-1">
                              Option Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={val.name}
                              onChange={(e) => updateVariationValue(varIdx, valIdx, "name", e.target.value)}
                              placeholder="e.g. Standard Matte (14 pt)"
                              className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-lg px-3 py-1.5 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                            />
                          </div>

                          {/* Extra Cost / Price */}
                          <div className="sm:col-span-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-base font-bold text-zinc-500">Price (USD)</label>
                              <span
                                className={`text-base font-extrabold px-1.5 py-0.5 rounded-full ${
                                  isFree ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                {isFree ? "FREE ($0)" : `+$${parseFloat(val.price || "0").toFixed(2)}`}
                              </span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-base font-bold">
                                $
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={val.price}
                                onChange={(e) =>
                                  updateVariationValue(varIdx, valIdx, "price", e.target.value)
                                }
                                placeholder="0 (Free)"
                                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-lg pl-6 pr-3 py-1.5 text-base font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                              />
                            </div>
                          </div>

                          {/* Image Field */}
                          <div className="sm:col-span-3">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-base font-bold text-zinc-500">Image</label>
                              <label className="text-base font-bold text-[#e74b2d] hover:underline cursor-pointer">
                                {isUploadingThis ? "Uploading..." : "↑ Upload"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={isUploadingThis}
                                  onChange={(e) => handleValueImageUpload(varIdx, valIdx, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={val.image}
                                onChange={(e) =>
                                  updateVariationValue(varIdx, valIdx, "image", e.target.value)
                                }
                                placeholder="Image URL / S3"
                                className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-lg px-2.5 py-1.5 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
                              />
                              {val.image && (
                                <img
                                  src={val.image}
                                  alt="Variation value preview"
                                  className="w-7 h-7 rounded-md object-cover border border-zinc-200 shadow-2xs flex-shrink-0 bg-white"
                                />
                              )}
                            </div>
                          </div>

                          {/* Delete option value button */}
                          <div className="sm:col-span-1 flex items-center justify-center pt-5">
                            <button
                              type="button"
                              onClick={() => removeVariationValue(varIdx, valIdx)}
                              className="text-zinc-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove option"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Description field */}
                        <div>
                          <input
                            type="text"
                            value={val.description}
                            onChange={(e) =>
                              updateVariationValue(varIdx, valIdx, "description", e.target.value)
                            }
                            placeholder="Optional description (e.g., Smooth coated paper with subtle sheen)"
                            className="w-full bg-[#fbfaf7] border border-zinc-100 rounded-lg px-3 py-1 text-base text-zinc-600 focus:outline-none focus:border-[#e74b2d]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews & Status Card */}
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-zinc-500 uppercase tracking-wider">Reviews & Visibility</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1">Rating (0–5)</label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
              className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
            />
          </div>
          <div>
            <label className="text-base font-bold text-zinc-700 block mb-1">Review Count</label>
            <input
              type="number"
              min="0"
              value={form.reviewCount}
              onChange={(e) => setForm((prev) => ({ ...prev, reviewCount: e.target.value }))}
              className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#e74b2d]"
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
          <div>
            <p className="text-base font-bold text-zinc-900">Active Visibility</p>
            <p className="text-base text-zinc-400">Display this product live in storefront catalog</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
              form.isActive ? "bg-[#e74b2d]" : "bg-zinc-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                form.isActive ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    </form>
  );
}
