"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { mediaSrc } from "@/lib/mediaUrl";
import { IVariation } from "@/models/Product";
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
  StatTile,
  Tabs,
  Toolbar,
  cx,
  type IconName,
} from "@/components/admin/ui";

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

type StatusFilter = "all" | "active" | "disabled";

const iconLinkClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-[#EAF5FB] hover:text-[#2884b8]";

function IconLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className={iconLinkClass}>
      <Icon name={icon} className="w-4 h-4" />
    </Link>
  );
}

function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-zinc-100">
          <div className="aspect-[4/3] animate-pulse bg-zinc-100" />
          <div className="space-y-2.5 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-zinc-100" />
            <div className="h-3 w-1/3 animate-pulse rounded-md bg-zinc-100" />
            <div className="flex gap-2 pt-1">
              <div className="h-5 w-20 animate-pulse rounded-md bg-zinc-100" />
              <div className="h-5 w-16 animate-pulse rounded-md bg-zinc-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

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

  const activeCount = categories.filter((c) => c.isActive).length;
  const totalTemplates = categories.reduce((sum, c) => sum + (c.templateCount ?? 0), 0);
  const withTemplates = categories.filter((c) => (c.templateCount ?? 0) > 0).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((c) => {
      if (status === "active" && !c.isActive) return false;
      if (status === "disabled" && c.isActive) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    });
  }, [categories, query, status]);

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      <PageHeader
        icon="grid"
        title="Product Management"
        description="Configure canvas dimensions, bleed margins, safe areas, templates, and variations for each product category."
        actions={
          <>
            <Button variant="secondary" icon="sparkle" onClick={handleSeedDefaults} disabled={seeding}>
              {seeding ? "Seeding..." : "Seed Standard Presets"}
            </Button>
            <ButtonLink href="/admin/categories/new" icon="plus">
              New Category
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Categories" icon="grid" tone="brand" loading={loading} value={<span className="tabular-nums">{categories.length}</span>} />
        <StatTile label="Active" icon="check" tone="green" loading={loading} value={<span className="tabular-nums">{activeCount}</span>} />
        <StatTile label="With templates" icon="layers" tone="violet" loading={loading} value={<span className="tabular-nums">{withTemplates}</span>} />
        <StatTile label="Templates" icon="templates" tone="indigo" loading={loading} value={<span className="tabular-nums">{totalTemplates}</span>} />
      </div>

      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search categories…" />
          <Tabs<StatusFilter>
            value={status}
            onChange={setStatus}
            items={[
              { value: "all", label: "All", count: categories.length },
              { value: "active", label: "Active", count: activeCount },
              { value: "disabled", label: "Disabled", count: categories.length - activeCount },
            ]}
          />
        </Toolbar>

        {loading ? (
          <CategoryGridSkeleton />
        ) : categories.length === 0 ? (
          <EmptyState
            icon="grid"
            title="No product categories found"
            description="Initialize default product categories (Business Cards, Flyers, Invitations, Posters, etc.) to start designing templates."
            action={
              <Button icon="sparkle" onClick={handleSeedDefaults}>
                Seed Standard Categories Now
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="search"
            title="No categories match"
            description="Try a different search term or status filter."
            action={
              <Button variant="soft" onClick={() => { setQuery(""); setStatus("all"); }}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            {visible.map((cat) => {
              const aspect = (cat.canvas_width || 105) / (cat.canvas_height || 60);
              const templateCount = cat.templateCount ?? 0;

              return (
                <article
                  key={cat._id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#b8e0f6] hover:shadow-lg hover:shadow-[#329AD4]/10"
                >
                  {/* Thumbnail */}
                  <Link
                    href={`/admin/categories/${cat._id}/templates`}
                    className="relative block aspect-[4/3] overflow-hidden bg-[#f0f8fd]"
                  >
                    {cat.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaSrc(cat.image)}
                        alt={cat.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1b5b80] to-[#0f1117]"
                        title={`${cat.name} Aspect: ${aspect.toFixed(2)}`}
                      >
                        <div
                          className="rounded-sm border border-sky-300/80 shadow-lg transition-transform duration-300 group-hover:scale-105"
                          style={{
                            width: aspect >= 1 ? "120px" : `${Math.round(120 * aspect)}px`,
                            height: aspect >= 1 ? `${Math.round(120 / aspect)}px` : "120px",
                            backgroundColor: cat.background_color || "#18181b",
                          }}
                        />
                      </div>
                    )}

                    {/* Overlays */}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      <Badge tone={cat.isActive ? "green" : "gray"} dot className="shadow-sm">
                        {cat.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    {cat.variations && cat.variations.length > 0 && (
                      <div className="absolute right-3 top-3">
                        <Badge tone="brand" className="shadow-sm normal-case">
                          {cat.variations.length} Variations
                        </Badge>
                      </div>
                    )}
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-lg bg-zinc-900/70 px-2 py-1 font-mono text-[11px] font-medium text-white backdrop-blur tabular-nums">
                      {cat.canvas_width} × {cat.canvas_height} {cat.unit}
                    </span>
                  </Link>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/categories/${cat._id}/templates`}
                        className="block truncate text-sm font-semibold text-zinc-900 transition-colors hover:text-[#2884b8]"
                      >
                        {cat.name}
                      </Link>
                      <code className="mt-0.5 block truncate font-mono text-xs text-zinc-400">/{cat.slug}</code>
                      {cat.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">{cat.description}</p>
                      )}
                    </div>

                    {/* Canvas Specifications */}
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 capitalize text-zinc-600">{cat.orientation}</span>
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-rose-700 tabular-nums">Bleed: {cat.bleed}mm</span>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700 tabular-nums">Safe: {cat.safe_area}mm</span>
                      <span className="rounded-md bg-[#EAF5FB] px-2 py-0.5 text-[#2884b8]">
                        {cat.supports_back_side ? "2-Sided" : "1-Sided"}
                      </span>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                      <Link
                        href={`/admin/categories/${cat._id}/templates`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 transition-colors hover:bg-[#EAF5FB] hover:text-[#2884b8]"
                      >
                        <Icon name="templates" className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{templateCount}</span> Templates
                        <Icon name="chevronRight" className="w-3 h-3" strokeWidth={2.2} />
                      </Link>

                      <div className="flex items-center gap-0.5">
                        <IconLink href={`/admin/templates/new?categoryId=${cat._id}`} icon="plus" label="Create Template" />
                        <IconLink href={`/admin/categories/${cat._id}/templates`} icon="layers" label="View Templates" />
                        <IconLink href={`/admin/categories/${cat._id}/edit`} icon="settings" label="Configure" />
                        <IconButton
                          icon="trash"
                          label="Delete Category"
                          tone="danger"
                          onClick={() => handleDelete(cat._id, cat.name)}
                          disabled={deleting === cat._id}
                          className={cx(deleting === cat._id && "animate-pulse")}
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
    </div>
  );
}
