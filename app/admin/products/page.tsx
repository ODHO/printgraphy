"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  SkeletonRows,
  StatTile,
  Toolbar,
  cx,
  table,
} from "@/components/admin/ui";

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  unitPrice: string;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
  categoryId?: { _id: string; name: string; slug: string };
  createdAt: string;
}

interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20", ...(search && { search }) });
    const res = await fetch(`/api/admin/products?${params}`);
    const data = await res.json();
    if (data.success) {
      setProducts(data.products);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete product "${name}"?`)) return;
    setDeleting(id);
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p._id !== id));
    setDeleting(null);
  };

  const handleToggle = async (id: string, current: boolean) => {
    setToggling(id);
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    const data = await res.json();
    if (data.success) setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, isActive: !current } : p)));
    setToggling(null);
  };

  const activeOnPage = products.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon="services"
        title="Print Services"
        description={pagination ? `${pagination.total} total products in the catalog` : "Loading catalog…"}
        actions={<ButtonLink href="/admin/products/new" icon="plus">New Product</ButtonLink>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total products" icon="services" tone="brand" loading={!pagination} value={<span className="tabular-nums">{pagination?.total ?? 0}</span>} />
        <StatTile label="Active on this page" icon="check" tone="green" loading={loading} value={<span className="tabular-nums">{activeOnPage}</span>} />
        <StatTile label="Hidden on this page" icon="eye" tone="amber" loading={loading} value={<span className="tabular-nums">{products.length - activeOnPage}</span>} />
      </div>

      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder="Search catalog products…"
            className="sm:max-w-sm"
          />
          {pagination && (
            <p className="text-xs text-zinc-500">
              Page <span className="font-semibold text-zinc-700 tabular-nums">{page}</span> of <span className="tabular-nums">{Math.max(1, pagination.pages)}</span>
            </p>
          )}
        </Toolbar>

        {loading ? (
          <SkeletonRows rows={6} />
        ) : products.length === 0 ? (
          <EmptyState
            icon="services"
            title="No products found"
            description={search ? "Try a different search term." : "Products you add will appear here."}
            action={<ButtonLink href="/admin/products/new" icon="plus" variant="soft">Add your first product</ButtonLink>}
          />
        ) : (
          <>
            <div className={table.wrap}>
              <table className={table.table}>
                <thead className={table.thead}>
                  <tr>
                    <th className={table.th}>Product</th>
                    <th className={cx(table.th, "hidden md:table-cell")}>Category</th>
                    <th className={table.th}>Base Price</th>
                    <th className={cx(table.th, "hidden lg:table-cell")}>Rating</th>
                    <th className={table.th}>Status</th>
                    <th className={cx(table.th, "text-right")}>Actions</th>
                  </tr>
                </thead>
                <tbody className={table.tbody}>
                  {products.map((p) => (
                    <tr key={p._id} className={table.tr}>
                      <td className={table.td}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#2884b8]">
                            <Icon name="services" className="w-[18px] h-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <Link href={`/admin/products/${p._id}/edit`} className="block truncate font-semibold text-zinc-900 hover:text-[#2884b8]">
                              {p.name}
                            </Link>
                            <p className="truncate font-mono text-xs text-zinc-400">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className={cx(table.td, "hidden md:table-cell")}>
                        <Badge tone="brand">{p.categoryId?.name ?? "General"}</Badge>
                      </td>
                      <td className={table.td}>
                        <p className="font-semibold text-zinc-900 tabular-nums">${p.price.toFixed(2)}</p>
                        {p.unitPrice && <p className="text-xs text-zinc-400">{p.unitPrice}</p>}
                      </td>
                      <td className={cx(table.td, "hidden lg:table-cell")}>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-medium text-zinc-700 tabular-nums">{p.rating}</span>
                          <span className="text-xs text-zinc-400 tabular-nums">({p.reviewCount.toLocaleString()})</span>
                        </div>
                      </td>
                      <td className={table.td}>
                        <button
                          type="button"
                          onClick={() => handleToggle(p._id, p.isActive)}
                          disabled={toggling === p._id}
                          className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
                          aria-label={p.isActive ? "Deactivate product" : "Activate product"}
                        >
                          <span className={cx("relative h-5 w-9 rounded-full transition-colors", p.isActive ? "bg-[#329AD4]" : "bg-zinc-300")}>
                            <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", p.isActive ? "left-[18px]" : "left-0.5")} />
                          </span>
                          <span className={p.isActive ? "text-[#2884b8]" : "text-zinc-400"}>{p.isActive ? "Active" : "Off"}</span>
                        </button>
                      </td>
                      <td className={cx(table.td, "text-right")}>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/products/${p._id}/edit`}
                            aria-label="Edit product"
                            title="Edit"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-[#EAF5FB] hover:text-[#2884b8]"
                          >
                            <Icon name="edit" className="w-4 h-4" />
                          </Link>
                          <IconButton
                            icon="trash"
                            label="Delete"
                            tone="danger"
                            onClick={() => handleDelete(p._id, p.name)}
                            disabled={deleting === p._id}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
    </div>
  );
}
