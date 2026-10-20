"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThreeDCardPreview from "@/components/ThreeDCardPreview";
import { calculateFitDimensions } from "@/lib/canvasUtils";

interface Template {
  _id: string;
  title: string;
  description: string;
  category: string;
  categoryId?: { _id: string; name: string; canvas_width: number; canvas_height: number; unit: string; orientation: string; bleed: number; safe_area: number; supports_back_side: boolean };
  isPaid: boolean;
  price: number;
  isActive: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  thumbnail: string;
  tags: string[];
  canvas_config?: any;
  front_design?: any;
  back_design?: any;
  createdAt: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  slug: string;
}

interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPaid, setFilterPaid] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");
  const [preview3D, setPreview3D] = useState(false);

  // Load Categories for filter dropdown
  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      ...(search && { search }),
      ...(filterCategory && { categoryId: filterCategory }),
      ...(filterStatus && { status: filterStatus }),
      ...(filterPaid && { isPaid: filterPaid }),
    });

    const res = await fetch(`/api/admin/templates?${params}`);
    const data = await res.json();

    if (data.success) {
      setTemplates(data.templates);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [page, search, filterCategory, filterStatus, filterPaid]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete template "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t._id !== id));
    setDeleting(null);
  };

  const handleDuplicate = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/templates/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchTemplates();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED") => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/templates/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates((prev) =>
          prev.map((t) =>
            t._id === id
              ? { ...t, status: newStatus, isActive: newStatus === "PUBLISHED" }
              : t
          )
        );
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Templates Management</h1>
          <p className="text-zinc-500 text-base mt-0.5">
            {pagination ? `${pagination.total} total product templates across all categories` : "Loading..."}
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#064FE0]/20 w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white border border-zinc-200/80 rounded-xl pl-10 pr-4 py-2.5 text-base text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#064FE0] shadow-xs"
          />
        </div>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="bg-white border border-zinc-200/80 rounded-xl px-4 py-2.5 text-base text-zinc-700 font-semibold focus:outline-none focus:border-[#064FE0] cursor-pointer shadow-xs"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-white border border-zinc-200/80 rounded-xl px-4 py-2.5 text-base text-zinc-700 font-semibold focus:outline-none focus:border-[#064FE0] cursor-pointer shadow-xs"
        >
          <option value="">All Statuses</option>
          <option value="PUBLISHED">Published Only</option>
          <option value="DRAFT">Drafts Only</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        {/* Pricing Filter */}
        <select
          value={filterPaid}
          onChange={(e) => { setFilterPaid(e.target.value); setPage(1); }}
          className="bg-white border border-zinc-200/80 rounded-xl px-4 py-2.5 text-base text-zinc-700 font-semibold focus:outline-none focus:border-[#064FE0] cursor-pointer shadow-xs"
        >
          <option value="">All Prices</option>
          <option value="false">Free Templates</option>
          <option value="true">Paid Templates</option>
        </select>
      </div>

      {/* Main Templates Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" />
          </div>
        ) : templates.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-zinc-400 text-base">No templates found matching your criteria.</p>
            <Link href="/admin/templates/new" className="text-[#064FE0] text-base font-bold hover:underline inline-block">
              Create your first template →
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-zinc-100 bg-[#edf4f9]/50 text-zinc-500">
                  <th className="text-left px-5 py-3.5 font-bold">Template Title</th>
                  <th className="text-left px-5 py-3.5 font-bold hidden md:table-cell">Category</th>
                  <th className="text-left px-5 py-3.5 font-bold">Pricing</th>
                  <th className="text-left px-5 py-3.5 font-bold">Status</th>
                  <th className="text-right px-5 py-3.5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {templates.map((t) => (
                  <tr key={t._id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-zinc-200 flex items-center justify-center">
                          {t.thumbnail ? (
                            <img src={t.thumbnail} alt={t.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-base text-zinc-400 font-bold">CANVAS</div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{t.title}</p>
                          {t.description && (
                            <p className="text-zinc-400 text-base truncate max-w-[220px]">{t.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {t.categoryId?._id ? (
                        <Link
                          href={`/admin/categories/${t.categoryId._id}/templates`}
                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 font-semibold rounded-md text-base transition-colors"
                        >
                          {t.categoryId.name}
                        </Link>
                      ) : (
                        <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 font-semibold rounded-md text-base">
                          {t.category}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {t.isPaid ? (
                        <span className="px-2.5 py-1 rounded-full text-base font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          PAID ${t.price}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-base font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          FREE
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-base font-extrabold uppercase tracking-wider ${
                          t.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : t.status === "ARCHIVED"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {t.status || "DRAFT"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setPreviewTemplate(t);
                            setPreviewSide("front");
                            setPreview3D(false);
                          }}
                          className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50 transition-all text-base cursor-pointer"
                        >
                          Preview
                        </button>

                        <button
                          onClick={() => handleDuplicate(t._id)}
                          disabled={actionLoading === t._id}
                          className="px-2.5 py-1.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50 transition-all text-base cursor-pointer disabled:opacity-50"
                        >
                          Duplicate
                        </button>

                        <Link
                          href={`/admin/templates/${t._id}/edit`}
                          className="px-3 py-1.5 rounded-xl bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold transition-all text-base"
                        >
                          Edit
                        </Link>

                        <button
                          onClick={() => handleDelete(t._id, t.title)}
                          disabled={deleting === t._id}
                          className="p-1.5 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all text-base cursor-pointer"
                          title="Delete template"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-100 bg-[#edf4f9]/30">
                <p className="text-base text-zinc-500 font-medium">
                  Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-zinc-200 rounded-xl text-base font-bold text-zinc-600 hover:bg-white disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-base font-mono font-bold text-zinc-800 px-2">{page} / {pagination.pages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="px-3 py-1.5 border border-zinc-200 rounded-xl text-base font-bold text-zinc-600 hover:bg-white disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CLEAN PREVIEW MODAL ────────────────────────────────────── */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4">
          <div className="bg-[#12141c] border border-zinc-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between text-white">
              <div>
                <h2 className="text-base font-bold">{previewTemplate.title}</h2>
                <p className="text-base text-zinc-400">
                  {previewTemplate.category}
                </p>
              </div>

              <div className="flex items-center gap-3">
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

                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="w-8 h-8 rounded-full hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 flex items-center justify-center bg-[#090a0f] min-h-[420px]">
              {preview3D ? (
                <div className="w-full h-[400px]">
                  <ThreeDCardPreview
                    canvasConfig={previewTemplate.canvas_config}
                    frontDesign={previewTemplate.front_design}
                    backDesign={previewTemplate.back_design}
                    side={previewSide}
                    onSideChange={(s) => setPreviewSide(s)}
                  />
                </div>
              ) : (
                <div
                  className="relative shadow-2xl rounded-xl overflow-hidden border border-white/10 select-none max-w-full"
                  style={{
                    width: `${calculateFitDimensions(previewTemplate.canvas_config || { width: 105, height: 60, unit: "mm" }, 520, 380).renderWidth}px`,
                    height: `${calculateFitDimensions(previewTemplate.canvas_config || { width: 105, height: 60, unit: "mm" }, 520, 380).renderHeight}px`,
                    backgroundColor:
                      (previewSide === "front"
                        ? previewTemplate.front_design?.bgColor
                        : previewTemplate.back_design?.bgColor) || "#18181b",
                  }}
                >
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

            <div className="px-6 py-3 border-t border-zinc-800 bg-[#161821] flex items-center justify-between text-base text-zinc-400">
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <select
                  value={previewTemplate.status}
                  onChange={(e) => handleStatusChange(previewTemplate._id, e.target.value as any)}
                  className="bg-zinc-800 text-white font-bold px-2 py-0.5 rounded border border-zinc-700"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <Link
                href={`/admin/templates/${previewTemplate._id}/edit`}
                className="px-4 py-1.5 rounded-xl bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold transition-all"
              >
                Open in Canvas Editor →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
