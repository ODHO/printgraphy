"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Products Catalog</h1>
          <p className="text-zinc-500 text-base mt-0.5">{pagination ? `${pagination.total} total products` : "Loading..."}</p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#064FE0]/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Product
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search catalog products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-white border border-zinc-200/80 rounded-xl pl-10 pr-4 py-2.5 text-base text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#064FE0] shadow-xs"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-zinc-400 text-base">No products found.</p>
            <Link href="/admin/products/new" className="text-[#064FE0] text-base font-bold hover:underline inline-block">Add your first product →</Link>
          </div>
        ) : (
          <>
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-zinc-100 bg-[#edf4f9]/50 text-zinc-500">
                  <th className="text-left px-5 py-3.5 font-bold">Product Name</th>
                  <th className="text-left px-5 py-3.5 font-bold hidden md:table-cell">Category</th>
                  <th className="text-left px-5 py-3.5 font-bold">Base Price</th>
                  <th className="text-left px-5 py-3.5 font-bold hidden lg:table-cell">Rating</th>
                  <th className="text-left px-5 py-3.5 font-bold">Status</th>
                  <th className="text-right px-5 py-3.5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-zinc-900">{p.name}</p>
                      <p className="text-zinc-400 text-base font-mono">{p.slug}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 font-semibold rounded-md text-base">{p.categoryId?.name ?? "General"}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-zinc-900">${p.price.toFixed(2)}</p>
                      {p.unitPrice && <p className="text-zinc-400 text-base">{p.unitPrice}</p>}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-zinc-600 font-medium">{p.rating} ({p.reviewCount.toLocaleString()})</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggle(p._id, p.isActive)}
                        disabled={toggling === p._id}
                        className="flex items-center gap-2 text-base font-bold cursor-pointer"
                      >
                        <div className={`w-8 h-4.5 rounded-full transition-colors relative ${p.isActive ? "bg-[#064FE0]" : "bg-zinc-300"}`}>
                          <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${p.isActive ? "left-4" : "left-0.5"}`} />
                        </div>
                        <span className={p.isActive ? "text-[#064FE0]" : "text-zinc-400"}>{p.isActive ? "Active" : "Off"}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/products/${p._id}/edit`}
                          className="px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50 transition-all text-base"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(p._id, p.name)}
                          disabled={deleting === p._id}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all text-base cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-100 bg-[#edf4f9]/30">
                <p className="text-base text-zinc-500 font-medium">Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-zinc-200 rounded-xl text-base font-bold text-zinc-600 hover:bg-white disabled:opacity-40 cursor-pointer">
                    Previous
                  </button>
                  <span className="text-base font-mono font-bold text-zinc-800 px-2">{page} / {pagination.pages}</span>
                  <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="px-3 py-1.5 border border-zinc-200 rounded-xl text-base font-bold text-zinc-600 hover:bg-white disabled:opacity-40 cursor-pointer">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
