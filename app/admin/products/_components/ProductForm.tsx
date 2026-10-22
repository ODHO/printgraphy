"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IVariation } from "@/models/Product";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Icon,
  IconButton,
  Notice,
  PageHeader,
  Spinner,
  buttonClass,
  cx,
  inputClass,
} from "@/components/admin/ui";

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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
      <PageHeader
        icon="services"
        back={{ href: "/admin/products", label: "Back to Print Services" }}
        title={mode === "create" ? "New Catalog Product" : "Edit Product"}
        description={
          isApparelCategory
            ? "Link this SKU to a Clothing & Bags category — colors, sizes, and decoration come from the category."
            : "Configure product metadata, custom variations (Paper Stock, Corners, etc.), and pricing"
        }
      />

      {error && <Notice tone="red" title="Couldn't save product">{error}</Notice>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Product Info Card */}
        <Card className="lg:col-span-2">
          <CardHeader icon="products" title="Product Info" subtitle="Name, URL slug, description and catalog placement" />
          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Product Name *">
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    const n = e.target.value;
                    setForm((prev) => ({ ...prev, name: n, slug: generateSlug(n) }));
                  }}
                  className={inputClass}
                  placeholder="e.g., Standard Business Cards"
                />
              </Field>

              <Field label="Slug *" hint="Used in the storefront URL">
                <input
                  required
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  className={cx(inputClass, "font-mono")}
                  placeholder="standard-business-cards"
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
                className={cx(inputClass, "resize-none")}
                placeholder="Brief product description..."
              />
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Field label="Category">
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className={cx(inputClass, "cursor-pointer")}
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
                </Field>
                {isApparelCategory && (
                  <p className="mt-2 rounded-xl border border-[#dbeefb] bg-[#f0f8fd] px-3 py-2 text-xs leading-relaxed text-[#1b5b80]">
                    Apparel colors, sizes, placements, and decoration methods are configured on the{" "}
                    <a
                      href={`/admin/categories/${form.categoryId}/edit`}
                      className="font-semibold text-[#2884b8] underline-offset-2 hover:underline"
                    >
                      category
                    </a>
                    . This product is the storefront SKU linked to that mockup category.
                  </p>
                )}
              </div>

              <Field label="Tags (comma separated)">
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  className={inputClass}
                  placeholder="matte, standard, business"
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Product Image */}
          <Card>
            <CardHeader
              icon="image"
              title="Product Image"
              subtitle="S3 upload or URL"
              action={
                <label className={cx(buttonClass("soft", "sm"), uploadingImage && "pointer-events-none opacity-60")}>
                  <Icon name="upload" className="w-3.5 h-3.5" strokeWidth={2.2} />
                  {uploadingImage ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProductImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              }
            />
            <div className="space-y-3 p-5 sm:p-6">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#b8e0f6] bg-[#f0f8fd]">
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="Product preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#329AD4]">
                    {uploadingImage ? <Spinner /> : <Icon name="image" className="w-8 h-8" />}
                    <span className="text-xs text-zinc-500">{uploadingImage ? "Uploading..." : "No image yet"}</span>
                  </div>
                )}
              </div>
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                placeholder="https://... or /custom-business.png"
                aria-label="Product image URL"
                className={inputClass}
              />
            </div>
          </Card>

          {/* Pricing Card */}
          <Card>
            <CardHeader icon="dollar" title="Base Pricing" />
            <div className="space-y-5 p-5 sm:p-6">
              <Field label="Base Price (USD) *">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">$</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    className={cx(inputClass, "pl-8 font-semibold tabular-nums")}
                  />
                </div>
              </Field>
              <Field label="Unit Price Label">
                <input
                  type="text"
                  value={form.unitPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. $0.15 Each / 100 Units"
                />
              </Field>
            </div>
          </Card>
        </div>
      </div>

      {/* Product Variations Card (Vistaprint style) */}
      <Card>
        <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
              <Icon name="layers" className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-900">
                {isApparelCategory ? "Extra paid options (optional)" : "Product Variations & Options"}
              </h2>
              <p className="mt-0.5 max-w-2xl text-xs text-zinc-500">
                {isApparelCategory
                  ? "Colors, sizes, and decoration methods come from the Clothing & Bags category. Add optional paid extras here if needed (e.g. rush print)."
                  : "Add multiple variation groups (e.g. Paper Stock, Finish, Corner Style). Each variation contains options with name, image, price ($0 = Free), and description."}
              </p>
            </div>
          </div>
          <Button variant="primary" size="sm" icon="plus" onClick={addVariation} className="shrink-0 self-start sm:self-center">
            Add Variation Group
          </Button>
        </div>

        <div className="p-5 sm:p-6">
          {variations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#dbeefb] bg-[#f0f8fd]/60 px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#329AD4] shadow-xs">
                <Icon name="layers" className="w-6 h-6" />
              </span>
              <p className="mt-3 text-sm font-medium text-zinc-600">No product variations created yet.</p>
              <button
                type="button"
                onClick={addVariation}
                className="mt-1 text-sm font-semibold text-[#329AD4] hover:text-[#2884b8] hover:underline cursor-pointer"
              >
                + Click here to add your first variation (e.g. Paper Stock)
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {variations.map((v, varIdx) => (
                <div
                  key={v._id || `var-${varIdx}`}
                  className="relative overflow-hidden rounded-2xl border border-[#dbeefb] bg-gradient-to-b from-[#f0f8fd] to-white"
                >
                  {/* Variation Header */}
                  <div className="flex flex-col gap-3 border-b border-[#dbeefb] bg-white/70 p-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex w-full flex-1 items-end gap-3 sm:w-auto">
                      <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#329AD4] text-xs font-semibold text-white tabular-nums">
                        {varIdx + 1}
                      </span>
                      <Field label="Variation Group Name *" className="flex-1">
                        <input
                          type="text"
                          required
                          value={v.name}
                          onChange={(e) => updateVariationField(varIdx, "name", e.target.value)}
                          placeholder="e.g. Paper Stock, Corners, Finish"
                          className={cx(inputClass, "py-2 font-semibold")}
                        />
                      </Field>
                    </div>

                    <div className="flex items-center gap-2 self-end">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 cursor-pointer hover:border-[#b8e0f6]">
                        <input
                          type="checkbox"
                          checked={v.required}
                          onChange={(e) => updateVariationField(varIdx, "required", e.target.checked)}
                          className="rounded border-zinc-300 text-[#329AD4] focus:ring-[#329AD4] w-4 h-4 cursor-pointer accent-[#329AD4]"
                        />
                        Required Selection
                      </label>

                      <IconButton
                        icon="trash"
                        label="Delete variation group"
                        tone="danger"
                        onClick={() => removeVariation(varIdx)}
                        className="h-9 w-9 border border-zinc-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Values List */}
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Option Values for &ldquo;{v.name || "Variation"}&rdquo;
                      </h3>
                      <button
                        type="button"
                        onClick={() => addVariationValue(varIdx)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#329AD4] hover:text-[#2884b8] cursor-pointer"
                      >
                        <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.2} />
                        Add Option Value
                      </button>
                    </div>

                    {v.values.map((val, valIdx) => {
                      const uploadKey = `${varIdx}-${valIdx}`;
                      const isUploadingThis = uploadingValImage === uploadKey;
                      const isFree = parseFloat(val.price) === 0 || val.price === "" || val.price === "0";

                      return (
                        <div
                          key={val._id || `val-${varIdx}-${valIdx}`}
                          className="space-y-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-xs transition-colors hover:border-[#b8e0f6]"
                        >
                          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-12">
                            {/* Option Name */}
                            <div className="sm:col-span-5">
                              <Field label="Option Name *">
                                <input
                                  type="text"
                                  required
                                  value={val.name}
                                  onChange={(e) => updateVariationValue(varIdx, valIdx, "name", e.target.value)}
                                  placeholder="e.g. Standard Matte (14 pt)"
                                  className={cx(inputClass, "py-2")}
                                />
                              </Field>
                            </div>

                            {/* Extra Cost / Price */}
                            <div className="sm:col-span-3">
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-zinc-700">Price (USD)</span>
                                <span
                                  className={cx(
                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset tabular-nums",
                                    isFree
                                      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
                                      : "bg-[#EAF5FB] text-[#2884b8] ring-[#329AD4]/20"
                                  )}
                                >
                                  {isFree ? "FREE ($0)" : `+$${parseFloat(val.price || "0").toFixed(2)}`}
                                </span>
                              </div>
                              <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
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
                                  aria-label="Option price"
                                  className={cx(inputClass, "py-2 pl-7 font-semibold tabular-nums")}
                                />
                              </div>
                            </div>

                            {/* Image Field */}
                            <div className="sm:col-span-3">
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-zinc-700">Image</span>
                                <label
                                  className={cx(
                                    "inline-flex items-center gap-1 text-xs font-semibold text-[#329AD4] hover:text-[#2884b8] cursor-pointer",
                                    isUploadingThis && "pointer-events-none opacity-60"
                                  )}
                                >
                                  <Icon name="upload" className="w-3.5 h-3.5" strokeWidth={2.2} />
                                  {isUploadingThis ? "Uploading..." : "Upload"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={isUploadingThis}
                                    onChange={(e) => handleValueImageUpload(varIdx, valIdx, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={val.image}
                                  onChange={(e) =>
                                    updateVariationValue(varIdx, valIdx, "image", e.target.value)
                                  }
                                  placeholder="Image URL / S3"
                                  aria-label="Option image URL"
                                  className={cx(inputClass, "py-2 min-w-0")}
                                />
                                {val.image && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={val.image}
                                    alt="Variation value preview"
                                    className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 bg-white object-cover shadow-xs"
                                  />
                                )}
                              </div>
                            </div>

                            {/* Delete option value button */}
                            <div className="flex items-center justify-end sm:col-span-1 sm:justify-center sm:pt-6">
                              <IconButton
                                icon="close"
                                label="Remove option"
                                tone="danger"
                                onClick={() => removeVariationValue(varIdx, valIdx)}
                              />
                            </div>
                          </div>

                          {/* Description field */}
                          <input
                            type="text"
                            value={val.description}
                            onChange={(e) =>
                              updateVariationValue(varIdx, valIdx, "description", e.target.value)
                            }
                            placeholder="Optional description (e.g., Smooth coated paper with subtle sheen)"
                            aria-label="Option description"
                            className="w-full rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-1.5 text-xs text-zinc-600 placeholder-zinc-400 transition focus:outline-none focus:border-[#329AD4] focus:bg-white"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Reviews & Status Card */}
      <Card>
        <CardHeader icon="star" title="Reviews & Visibility" />
        <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-3">
          <Field label="Rating (0–5)">
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
              className={cx(inputClass, "tabular-nums")}
            />
          </Field>
          <Field label="Review Count">
            <input
              type="number"
              min="0"
              value={form.reviewCount}
              onChange={(e) => setForm((prev) => ({ ...prev, reviewCount: e.target.value }))}
              className={cx(inputClass, "tabular-nums")}
            />
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-[#dbeefb] bg-[#f0f8fd] px-4 py-3 md:self-end">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">Active Visibility</p>
              <p className="text-xs text-zinc-500">Display this product live in storefront catalog</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isActive}
              aria-label="Active Visibility"
              onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
              className={cx(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer",
                form.isActive ? "bg-[#329AD4]" : "bg-zinc-300"
              )}
            >
              <span
                className={cx(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  form.isActive ? "left-[22px]" : "left-0.5"
                )}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Sticky action bar */}
      <div className="sticky bottom-4 z-20">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#dbeefb] bg-white/90 px-4 py-3 shadow-lg shadow-[#329AD4]/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <span className={cx("h-2 w-2 rounded-full", form.isActive ? "bg-emerald-500" : "bg-zinc-300")} />
            {form.isActive ? "Will be visible in the storefront" : "Hidden from the storefront"}
          </p>
          <div className="flex items-center gap-2 sm:justify-end">
            <Button variant="secondary" onClick={() => router.push("/admin/products")} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon="check" disabled={saving} className="flex-1 sm:flex-none">
              {saving ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
