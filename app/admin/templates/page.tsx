"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThreeDCardPreview from "@/components/ThreeDCardPreview";
import { calculateFitDimensions } from "@/lib/canvasUtils";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  IconButton,
  PageHeader,
  Pagination as PaginationBar,
  SearchInput,
  StatTile,
  Tabs,
  Toolbar,
  cx,
  inputClass,
} from "@/components/admin/ui";

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

  const publishedOnPage = templates.filter((t) => t.status === "PUBLISHED").length;

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon="templates"
        title="Templates Management"
        description={pagination ? `${pagination.total} total product templates across all categories` : "Loading..."}
        actions={<ButtonLink href="/admin/templates/new" icon="plus">New Template</ButtonLink>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total templates" icon="templates" tone="brand" loading={!pagination} value={<span className="tabular-nums">{pagination?.total ?? 0}</span>} />
        <StatTile label="Categories" icon="grid" tone="violet" value={<span className="tabular-nums">{categories.length}</span>} />
        <StatTile label="Published on this page" icon="check" tone="green" loading={loading} value={<span className="tabular-nums">{publishedOnPage}</span>} />
      </div>

      <Card className="overflow-hidden">
        {/* Search & Filters */}
        <Toolbar className="lg:flex-row lg:flex-wrap">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:flex-1">
            <SearchInput
              value={search}
              onChange={(value) => { setSearch(value); setPage(1); }}
              placeholder="Search templates…"
              className="sm:max-w-sm"
            />
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                aria-label="Filter by category"
                className={cx(inputClass, "cursor-pointer sm:w-44")}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <select
                value={filterPaid}
                onChange={(e) => { setFilterPaid(e.target.value); setPage(1); }}
                aria-label="Filter by price"
                className={cx(inputClass, "cursor-pointer sm:w-40")}
              >
                <option value="">All Prices</option>
                <option value="false">Free Templates</option>
                <option value="true">Paid Templates</option>
              </select>
            </div>
          </div>
          <Tabs
            value={filterStatus}
            onChange={(value) => { setFilterStatus(value); setPage(1); }}
            items={[
              { value: "", label: "All" },
              { value: "PUBLISHED", label: "Published" },
              { value: "DRAFT", label: "Drafts" },
              { value: "ARCHIVED", label: "Archived" },
            ]}
          />
        </Toolbar>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-zinc-100">
                <div className="aspect-[4/3] animate-pulse bg-zinc-100" />
                <div className="space-y-2.5 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded-md bg-zinc-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded-md bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon="templates"
            title="No templates found"
            description="No templates found matching your criteria."
            action={<ButtonLink href="/admin/templates/new" icon="plus" variant="soft">Create your first template</ButtonLink>}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 2xl:grid-cols-4">
              {templates.map((t) => (
                <article
                  key={t._id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#b8e0f6] hover:shadow-lg hover:shadow-[#329AD4]/10"
                >
                  {/* Thumbnail */}
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewTemplate(t);
                      setPreviewSide("front");
                      setPreview3D(false);
                    }}
                    className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#1b5b80] to-[#0f1117] cursor-pointer"
                    aria-label={`Preview ${t.title}`}
                  >
                    {t.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.thumbnail}
                        alt={t.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/50">
                        <Icon name="templates" className="w-8 h-8" />
                        <span className="text-[11px] font-semibold tracking-widest">CANVAS</span>
                      </span>
                    )}

                    <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/0 opacity-0 transition-all group-hover:bg-zinc-950/35 group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-md">
                        <Icon name="eye" className="w-3.5 h-3.5" />
                        Preview
                      </span>
                    </span>

                    <span className="absolute left-3 top-3">
                      <Badge tone={t.status === "PUBLISHED" ? "green" : t.status === "ARCHIVED" ? "red" : "amber"} dot className="shadow-sm uppercase tracking-wide text-[10px]">
                        {t.status || "DRAFT"}
                      </Badge>
                    </span>
                    <span className="absolute right-3 top-3">
                      {t.isPaid ? (
                        <Badge tone="amber" className="shadow-sm tabular-nums">PAID ${t.price}</Badge>
                      ) : (
                        <Badge tone="green" className="shadow-sm">FREE</Badge>
                      )}
                    </span>
                  </button>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/templates/${t._id}/edit`}
                        className="block truncate text-sm font-semibold text-zinc-900 transition-colors hover:text-[#2884b8]"
                      >
                        {t.title}
                      </Link>
                      {t.description && <p className="mt-0.5 truncate text-xs text-zinc-500">{t.description}</p>}
                    </div>

                    <div>
                      {t.categoryId?._id ? (
                        <Link
                          href={`/admin/categories/${t.categoryId._id}/templates`}
                          className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-[#EAF5FB] px-2 py-0.5 text-xs font-medium text-[#2884b8] transition-colors hover:bg-[#dbeefb]"
                        >
                          <Icon name="grid" className="w-3 h-3 shrink-0" />
                          <span className="truncate">{t.categoryId.name}</span>
                        </Link>
                      ) : (
                        <span className="inline-flex max-w-full truncate rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                          {t.category}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                      <ButtonLink href={`/admin/templates/${t._id}/edit`} size="sm" variant="soft" icon="edit">
                        Edit
                      </ButtonLink>
                      <div className="flex items-center gap-0.5">
                        <IconButton
                          icon="eye"
                          label="Preview"
                          onClick={() => {
                            setPreviewTemplate(t);
                            setPreviewSide("front");
                            setPreview3D(false);
                          }}
                        />
                        <IconButton
                          icon="layers"
                          label="Duplicate"
                          onClick={() => handleDuplicate(t._id)}
                          disabled={actionLoading === t._id}
                        />
                        <IconButton
                          icon="trash"
                          label="Delete template"
                          tone="danger"
                          onClick={() => handleDelete(t._id, t.title)}
                          disabled={deleting === t._id}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {pagination && (
              <PaginationBar
                page={page}
                pages={pagination.pages}
                total={pagination.total}
                limit={pagination.limit}
                onPage={(next) => setPage(Math.min(pagination.pages, Math.max(1, next)))}
              />
            )}
          </>
        )}
      </Card>

      {/* ── CLEAN PREVIEW MODAL ────────────────────────────────────── */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#2884b8]">
                  <Icon name="templates" className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-zinc-900">{previewTemplate.title}</h2>
                  <p className="truncate text-xs text-zinc-500">{previewTemplate.category}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="inline-flex gap-1 rounded-xl bg-zinc-100/80 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPreview3D(false)}
                    className={cx(
                      "rounded-lg px-3 py-1.5 transition-all cursor-pointer",
                      !preview3D ? "bg-white text-[#2884b8] shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                    )}
                  >
                    2D View
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview3D(true)}
                    className={cx(
                      "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 transition-all cursor-pointer",
                      preview3D ? "bg-white text-[#2884b8] shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                    )}
                  >
                    <Icon name="sparkle" className="w-3.5 h-3.5" />
                    3D Realistic
                  </button>
                </div>

                <IconButton icon="close" label="Close preview" onClick={() => setPreviewTemplate(null)} />
              </div>
            </div>

            <div className="flex min-h-[320px] flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_center,#1b5b80_0%,#0b0d14_75%)] p-4 sm:min-h-[420px] sm:p-8">
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
                              backgroundColor: obj.fill || "#329AD4",
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
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={obj.src} alt="" className="w-full h-full object-contain" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                <span>Status:</span>
                <select
                  value={previewTemplate.status}
                  onChange={(e) => handleStatusChange(previewTemplate._id, e.target.value as any)}
                  className={cx(inputClass, "w-auto py-1.5 text-xs font-semibold cursor-pointer")}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>

              <ButtonLink href={`/admin/templates/${previewTemplate._id}/edit`} icon="edit">
                Open in Canvas Editor
              </ButtonLink>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
