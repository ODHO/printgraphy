"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThreeDCardPreview from "@/components/ThreeDCardPreview";

interface TemplateItem {
  _id: string;
  title: string;
  slug?: string;
  description: string;
  category: string;
  categoryId?: string;
  isPaid: boolean;
  price: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isActive: boolean;
  thumbnail: string;
  backThumbnail?: string;
  tags: string[];
  canvas_config?: any;
  front_design?: any;
  back_design?: any;
  createdAt: string;
}

interface CategoryInfo {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  canvas_width: number;
  canvas_height: number;
  unit: string;
  orientation: string;
  bleed: number;
  safe_area: number;
  background_color: string;
  supports_back_side: boolean;
}

export default function CategoryTemplatesClient({ category }: { category: CategoryInfo }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | "PUBLISHED" | "DRAFT" | "ARCHIVED">("");
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");
  const [preview3D, setPreview3D] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        categoryId: category._id,
        limit: "50",
      });
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/templates?${params}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  }, [category._id, statusFilter, search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Duplicate Template Action
  const handleDuplicate = async (templateId: string) => {
    setActionLoadingId(templateId);
    try {
      const res = await fetch(`/api/admin/templates/${templateId}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchTemplates();
      } else {
        alert(data.message || "Failed to duplicate.");
      }
    } catch (_) {
      alert("Failed to duplicate template.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Status Change Action (Publish, Unpublish/Draft, Archive)
  const handleStatusChange = async (templateId: string, newStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED") => {
    setActionLoadingId(templateId);
    try {
      const res = await fetch(`/api/admin/templates/${templateId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) =>
          prev.map((t) => (t._id === templateId ? { ...t, status: newStatus, isActive: newStatus === "PUBLISHED" } : t))
        );
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Template Action
  const handleDelete = async (templateId: string, title: string) => {
    if (!confirm(`Delete template "${title}"? This action cannot be undone.`)) return;
    setActionLoadingId(templateId);
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) => prev.filter((t) => t._id !== templateId));
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const aspect = (category.canvas_width || 105) / (category.canvas_height || 60);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Category Specifications Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/categories"
              className="text-base text-zinc-400 hover:text-white transition-colors"
            >
              ← All Categories
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-base font-mono text-sky-400 font-bold">{category.name}</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            {category.name} Templates
          </h1>

          {category.description && (
            <p className="text-base text-zinc-300 max-w-xl">{category.description}</p>
          )}

          {/* Canvas Specs Bar */}
          <div className="flex items-center gap-2 flex-wrap text-base pt-1">
            <span className="px-2.5 py-1 bg-white/10 rounded-lg font-mono font-bold">
              📐 {category.canvas_width} × {category.canvas_height} {category.unit}
            </span>
            <span className="px-2.5 py-1 bg-white/10 rounded-lg capitalize">
              {category.orientation}
            </span>
            <span className="px-2.5 py-1 bg-red-500/20 text-red-300 rounded-lg border border-red-500/30">
              Bleed: {category.bleed}{category.unit}
            </span>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
              Safe: {category.safe_area}{category.unit}
            </span>
            <span className="px-2.5 py-1 bg-white/10 rounded-lg">
              {category.supports_back_side ? "2-Sided Print" : "1-Sided"}
            </span>
          </div>
        </div>

        {/* Create Template Button */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/admin/templates/new?categoryId=${category._id}`}
            className="flex items-center gap-2 px-5 py-3 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-2xl transition-all shadow-lg shadow-[#064FE0]/25 cursor-pointer"
          >
            <span className="text-base leading-none">+</span>
            <span>Create New Template</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="inline-flex p-1 bg-white rounded-2xl border border-zinc-200/80 text-base font-bold shadow-xs">
          {(["", "PUBLISHED", "DRAFT", "ARCHIVED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                statusFilter === s
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {s === "" ? "All Templates" : s === "PUBLISHED" ? "Published" : s === "DRAFT" ? "Drafts" : "Archived"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-zinc-200/80 rounded-2xl pl-9 pr-4 py-2 text-base text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#064FE0] shadow-xs"
          />
          <svg className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="py-24 text-center bg-white rounded-3xl border border-zinc-200/80">
          <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" />
          <p className="text-base text-zinc-400 mt-2">Loading {category.name} templates...</p>
        </div>
      ) : templates.length === 0 ? (
        /* Empty State */
        <div className="py-24 text-center bg-white rounded-3xl border border-zinc-200/80 space-y-4 p-6">
          <div className="w-14 h-14 rounded-3xl bg-sky-50 text-sky-600 flex items-center justify-center text-2xl mx-auto">
            🎨
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900">No templates yet</h3>
            <p className="text-base text-zinc-400 mt-1 max-w-sm mx-auto">
              Create your first dynamic design template for <strong>{category.name}</strong> using the canvas editor.
            </p>
          </div>
          <Link
            href={`/admin/templates/new?categoryId=${category._id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#064FE0]/20"
          >
            + Create Template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div
              key={t._id}
              className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
            >
              {/* Card Thumbnail Box with exact aspect ratio */}
              <div
                className="relative bg-[#0f1117] overflow-hidden flex items-center justify-center p-4 border-b border-zinc-100"
                style={{ minHeight: "180px" }}
              >
                <div
                  className="rounded-lg overflow-hidden shadow-xl relative border border-white/10"
                  style={{
                    width: aspect >= 1 ? "220px" : `${Math.round(220 * aspect)}px`,
                    height: aspect >= 1 ? `${Math.round(220 / aspect)}px` : "220px",
                    backgroundColor: t.front_design?.bgColor || "#18181b",
                  }}
                >
                  {t.thumbnail ? (
                    <img src={t.thumbnail} alt={t.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/50 text-base font-bold p-2 text-center">
                      <span>{t.title}</span>
                      <span className="text-base text-white/30 font-mono mt-1">
                        {category.canvas_width}×{category.canvas_height}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Badge overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-base font-extrabold uppercase tracking-wider shadow-xs ${
                      t.status === "PUBLISHED"
                        ? "bg-emerald-500 text-white"
                        : t.status === "ARCHIVED"
                        ? "bg-red-500 text-white"
                        : "bg-amber-400 text-zinc-900"
                    }`}
                  >
                    {t.status || "DRAFT"}
                  </span>
                </div>
              </div>

              {/* Card Meta & Actions */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-zinc-900 group-hover:text-[#064FE0] transition-colors line-clamp-1">
                      {t.title}
                    </h3>
                    <span className="text-base font-bold font-mono text-zinc-600 shrink-0">
                      {t.price > 0 ? `$${t.price}` : "Free"}
                    </span>
                  </div>

                  {t.description && (
                    <p className="text-base text-zinc-400 line-clamp-1 mt-0.5">{t.description}</p>
                  )}
                </div>

                {/* Action Buttons Grid */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/admin/templates/${t._id}/edit`}
                      className="py-2 text-center rounded-xl bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold transition-all shadow-xs"
                    >
                      Edit Canvas
                    </Link>

                    <button
                      onClick={() => {
                        setPreviewTemplate(t);
                        setPreviewSide("front");
                        setPreview3D(false);
                      }}
                      className="py-2 text-center rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-base font-bold transition-all cursor-pointer"
                    >
                      Preview
                    </button>
                  </div>

                  {/* Secondary Actions: Duplicate, Status toggle, Delete */}
                  <div className="flex items-center justify-between text-base text-zinc-500 pt-1">
                    <button
                      onClick={() => handleDuplicate(t._id)}
                      disabled={actionLoadingId === t._id}
                      className="hover:text-zinc-900 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Duplicate
                    </button>

                    {t.status === "PUBLISHED" ? (
                      <button
                        onClick={() => handleStatusChange(t._id, "DRAFT")}
                        disabled={actionLoadingId === t._id}
                        className="hover:text-amber-600 font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(t._id, "PUBLISHED")}
                        disabled={actionLoadingId === t._id}
                        className="hover:text-emerald-600 font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Publish
                      </button>
                    )}

                    <button
                      onClick={() => handleStatusChange(t._id, t.status === "ARCHIVED" ? "DRAFT" : "ARCHIVED")}
                      disabled={actionLoadingId === t._id}
                      className="hover:text-zinc-900 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {t.status === "ARCHIVED" ? "Restore" : "Archive"}
                    </button>

                    <button
                      onClick={() => handleDelete(t._id, t.title)}
                      disabled={actionLoadingId === t._id}
                      className="text-red-500 hover:text-red-700 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CLEAN PREVIEW MODAL (Without Editor Controls) ──────────── */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between text-white">
              <div>
                <h2 className="text-base font-bold">{previewTemplate.title}</h2>
                <p className="text-base text-zinc-400">
                  {category.name} • {category.canvas_width} × {category.canvas_height} {category.unit}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* 2D / 3D Toggle */}
                <div className="inline-flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-base font-bold">
                  <button
                    onClick={() => setPreview3D(false)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      !preview3D ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    2D View
                  </button>
                  <button
                    onClick={() => setPreview3D(true)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      preview3D ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    ✨ 3D Realistic
                  </button>
                </div>

                {/* Side Toggle if 2-sided */}
                {category.supports_back_side && !preview3D && (
                  <div className="inline-flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 text-base font-bold">
                    <button
                      onClick={() => setPreviewSide("front")}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        previewSide === "front" ? "bg-[#064FE0] text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Front
                    </button>
                    <button
                      onClick={() => setPreviewSide("back")}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        previewSide === "back" ? "bg-[#064FE0] text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Back
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="w-8 h-8 rounded-full hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Canvas Viewport */}
            <div className="p-8 flex items-center justify-center bg-[#090a0f] min-h-[420px]">
              {preview3D ? (
                <div className="w-full h-[400px]">
                  <ThreeDCardPreview
                    canvasConfig={{
                      width: category.canvas_width,
                      height: category.canvas_height,
                      unit: category.unit,
                      orientation: category.orientation as any,
                      bleed: category.bleed,
                      safe_area: category.safe_area,
                      supports_back_side: category.supports_back_side,
                    }}
                    frontDesign={previewTemplate.front_design}
                    backDesign={previewTemplate.back_design}
                    side={previewSide}
                    onSideChange={(s) => setPreviewSide(s)}
                  />
                </div>
              ) : (
                /* Clean 2D Display */
                <div
                  className="relative shadow-2xl rounded-xl overflow-hidden border border-white/10 select-none"
                  style={{
                    width: aspect >= 1 ? "520px" : `${Math.round(520 * aspect)}px`,
                    height: aspect >= 1 ? `${Math.round(520 / aspect)}px` : "520px",
                    backgroundColor:
                      (previewSide === "front"
                        ? previewTemplate.front_design?.bgColor
                        : previewTemplate.back_design?.bgColor) || "#18181b",
                  }}
                >
                  {/* Render Objects without editor controls */}
                  {(previewSide === "front"
                    ? previewTemplate.front_design?.objects
                    : previewTemplate.back_design?.objects
                  )?.map((obj: any) => {
                    if (obj.isVisible === false) return null;
                    return (
                      <div
                        key={obj.id}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${obj.x}%`,
                          top: `${obj.y}%`,
                          width: obj.width ? `${obj.width}%` : undefined,
                          height: obj.height ? `${obj.height}%` : undefined,
                          opacity: obj.opacity ?? 1,
                        }}
                      >
                        {obj.type === "shape" && (
                          <div
                            className="w-full h-full"
                            style={{
                              backgroundColor: obj.fill || "#3b82f6",
                              border: obj.stroke && obj.strokeWidth ? `${obj.strokeWidth}px solid ${obj.stroke}` : "none",
                              borderRadius:
                                obj.shapeType === "circle"
                                  ? "9999px"
                                  : obj.shapeType === "rounded-rect"
                                  ? `${obj.borderRadius || 12}px`
                                  : "0px",
                            }}
                          />
                        )}

                        {obj.type === "text" && (
                          <div
                            style={{
                              fontSize: `${(obj.fontSize || 14) * 1.1}px`,
                              color: obj.color || "#ffffff",
                              fontWeight: obj.fontWeight || "normal",
                              fontStyle: obj.fontStyle || "normal",
                              fontFamily: obj.fontFamily || "inherit",
                              textAlign: obj.textAlign || "left",
                              lineHeight: 1.25,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {obj.text}
                          </div>
                        )}

                        {obj.type === "image" && obj.src && (
                          <img src={obj.src} alt="" className="w-full h-full object-contain" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-zinc-800 bg-[#161821] flex items-center justify-between text-base text-zinc-400">
              <span>Status: <strong className="text-white">{previewTemplate.status}</strong></span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/templates/${previewTemplate._id}/edit`}
                  className="px-4 py-1.5 rounded-xl bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold transition-all"
                >
                  Open in Canvas Editor →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
