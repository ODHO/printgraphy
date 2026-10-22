"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ThreeDCardPreview from "@/components/ThreeDCardPreview";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  IconButton,
  PageHeader,
  SearchInput,
  Tabs,
  Toolbar,
  cx,
} from "@/components/admin/ui";

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
      <PageHeader
        icon="templates"
        back={{ href: "/admin/categories", label: "All Categories" }}
        title={`${category.name} Templates`}
        description={category.description || undefined}
        actions={
          <ButtonLink href={`/admin/templates/new?categoryId=${category._id}`} icon="plus">
            Create New Template
          </ButtonLink>
        }
      />

      {/* Category Specifications Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#dbeefb] bg-gradient-to-br from-[#EAF5FB] via-white to-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1b5b80] to-[#0f1117] shadow-md">
            <div
              className="rounded-sm border border-sky-300/80"
              style={{
                width: aspect >= 1 ? "64px" : `${Math.round(64 * aspect)}px`,
                height: aspect >= 1 ? `${Math.round(64 / aspect)}px` : "64px",
                backgroundColor: category.background_color || "#18181b",
              }}
            />
          </div>
          <div className="min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wide text-[#1b5b80]">Canvas specification</span>
              <span className="text-zinc-300">/</span>
              <code className="font-mono text-zinc-500">{category.slug}</code>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbeefb] bg-white px-2.5 py-1 font-mono text-[#1b5b80] tabular-nums">
                <Icon name="grid" className="w-3.5 h-3.5" />
                {category.canvas_width} × {category.canvas_height} {category.unit}
              </span>
              <span className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 capitalize text-zinc-600">
                {category.orientation}
              </span>
              <span className="rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1 text-rose-700 tabular-nums">
                Bleed: {category.bleed}{category.unit}
              </span>
              <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-emerald-700 tabular-nums">
                Safe: {category.safe_area}{category.unit}
              </span>
              <span className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-zinc-600">
                {category.supports_back_side ? "2-Sided Print" : "1-Sided"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Filter Tabs & Search Bar */}
        <Toolbar>
          <Tabs
            value={statusFilter}
            onChange={setStatusFilter}
            items={(["", "PUBLISHED", "DRAFT", "ARCHIVED"] as const).map((s) => ({
              value: s,
              label: s === "" ? "All Templates" : s === "PUBLISHED" ? "Published" : s === "DRAFT" ? "Drafts" : "Archived",
            }))}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search templates…" />
        </Toolbar>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-zinc-100">
                <div className="h-[200px] animate-pulse bg-zinc-100" />
                <div className="space-y-2.5 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded-md bg-zinc-100" />
                  <div className="h-8 w-full animate-pulse rounded-xl bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon="templates"
            title="No templates yet"
            description={
              <>
                Create your first dynamic design template for <strong className="font-semibold text-zinc-700">{category.name}</strong> using the canvas editor.
              </>
            }
            action={
              <ButtonLink href={`/admin/templates/new?categoryId=${category._id}`} icon="plus">
                Create Template
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {templates.map((t) => {
              const busy = actionLoadingId === t._id;
              return (
                <article
                  key={t._id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#b8e0f6] hover:shadow-lg hover:shadow-[#329AD4]/10"
                >
                  {/* Card Thumbnail Box with exact aspect ratio */}
                  <div
                    className="relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#1b5b80_0%,#0f1117_80%)] p-5"
                    style={{ minHeight: "200px" }}
                  >
                    <div
                      className="relative max-w-full overflow-hidden rounded-lg border border-white/10 shadow-xl transition-transform duration-300 group-hover:scale-[1.03]"
                      style={{
                        width: aspect >= 1 ? "220px" : `${Math.round(220 * aspect)}px`,
                        height: aspect >= 1 ? `${Math.round(220 / aspect)}px` : "220px",
                        backgroundColor: t.front_design?.bgColor || "#18181b",
                      }}
                    >
                      {t.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.thumbnail} alt={t.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-xs font-semibold text-white/50">
                          <span>{t.title}</span>
                          <span className="mt-1 font-mono text-[11px] text-white/30">
                            {category.canvas_width}×{category.canvas_height}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status Badge overlay */}
                    <div className="absolute right-3 top-3 flex items-center gap-1.5">
                      <Badge
                        tone={t.status === "PUBLISHED" ? "green" : t.status === "ARCHIVED" ? "red" : "amber"}
                        dot
                        className="shadow-sm uppercase tracking-wide text-[10px]"
                      >
                        {t.status || "DRAFT"}
                      </Badge>
                    </div>
                  </div>

                  {/* Card Meta & Actions */}
                  <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900 transition-colors group-hover:text-[#2884b8]">
                          {t.title}
                        </h3>
                        <span
                          className={cx(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                            t.price > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                          )}
                        >
                          {t.price > 0 ? `$${t.price}` : "Free"}
                        </span>
                      </div>

                      {t.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{t.description}</p>
                      )}
                    </div>

                    {/* Action Buttons Grid */}
                    <div className="space-y-3 border-t border-zinc-100 pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <ButtonLink href={`/admin/templates/${t._id}/edit`} size="sm" icon="edit">
                          Edit Canvas
                        </ButtonLink>

                        <Button
                          size="sm"
                          variant="secondary"
                          icon="eye"
                          onClick={() => {
                            setPreviewTemplate(t);
                            setPreviewSide("front");
                            setPreview3D(false);
                          }}
                        >
                          Preview
                        </Button>
                      </div>

                      {/* Secondary Actions: Duplicate, Status toggle, Delete */}
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(t._id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-zinc-500 transition-colors hover:bg-[#EAF5FB] hover:text-[#2884b8] cursor-pointer disabled:opacity-50"
                        >
                          <Icon name="layers" className="w-3.5 h-3.5" />
                          Duplicate
                        </button>

                        {t.status === "PUBLISHED" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(t._id, "DRAFT")}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-zinc-500 transition-colors hover:bg-amber-50 hover:text-amber-700 cursor-pointer disabled:opacity-50"
                          >
                            <Icon name="clock" className="w-3.5 h-3.5" />
                            Unpublish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(t._id, "PUBLISHED")}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-zinc-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer disabled:opacity-50"
                          >
                            <Icon name="check" className="w-3.5 h-3.5" />
                            Publish
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStatusChange(t._id, t.status === "ARCHIVED" ? "DRAFT" : "ARCHIVED")}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer disabled:opacity-50"
                        >
                          <Icon name={t.status === "ARCHIVED" ? "refresh" : "inbox"} className="w-3.5 h-3.5" />
                          {t.status === "ARCHIVED" ? "Restore" : "Archive"}
                        </button>

                        <IconButton
                          icon="trash"
                          label="Delete"
                          tone="danger"
                          onClick={() => handleDelete(t._id, t.title)}
                          disabled={busy}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── CLEAN PREVIEW MODAL (Without Editor Controls) ──────────── */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#2884b8]">
                  <Icon name="templates" className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-zinc-900">{previewTemplate.title}</h2>
                  <p className="truncate text-xs text-zinc-500 tabular-nums">
                    {category.name} • {category.canvas_width} × {category.canvas_height} {category.unit}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {/* 2D / 3D Toggle */}
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

                {/* Side Toggle if 2-sided */}
                {category.supports_back_side && !preview3D && (
                  <div className="inline-flex gap-1 rounded-xl bg-zinc-100/80 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreviewSide("front")}
                      className={cx(
                        "rounded-lg px-3 py-1.5 transition-all cursor-pointer",
                        previewSide === "front" ? "bg-[#329AD4] text-white shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                      )}
                    >
                      Front
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewSide("back")}
                      className={cx(
                        "rounded-lg px-3 py-1.5 transition-all cursor-pointer",
                        previewSide === "back" ? "bg-[#329AD4] text-white shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                      )}
                    >
                      Back
                    </button>
                  </div>
                )}

                <IconButton icon="close" label="Close preview" onClick={() => setPreviewTemplate(null)} className="ml-auto sm:ml-0" />
              </div>
            </div>

            {/* Modal Canvas Viewport */}
            <div className="flex min-h-[320px] flex-1 items-center justify-center overflow-auto bg-[radial-gradient(circle_at_center,#1b5b80_0%,#0b0d14_75%)] p-4 sm:min-h-[420px] sm:p-8">
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
                  className="relative shrink-0 shadow-2xl rounded-xl overflow-hidden border border-white/10 select-none"
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
                              whiteSpace: "pre-wrap",
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

            {/* Modal Footer */}
            <div className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                Status:
                <Badge
                  tone={previewTemplate.status === "PUBLISHED" ? "green" : previewTemplate.status === "ARCHIVED" ? "red" : "amber"}
                  dot
                  className="uppercase tracking-wide text-[10px]"
                >
                  {previewTemplate.status}
                </Badge>
              </span>
              <div className="flex items-center gap-2">
                <ButtonLink href={`/admin/templates/${previewTemplate._id}/edit`} icon="edit">
                  Open in Canvas Editor
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
