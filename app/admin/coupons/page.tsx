"use client";

import { useEffect, useState, useCallback } from "react";

interface CouponItem {
  _id: string;
  code: string;
  type: "percentage" | "flat";
  value: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  expiryDate?: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "percentage",
    value: "15",
    minOrderValue: "50",
    maxDiscountAmount: "",
    expiryDate: "",
    usageLimit: "100",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/coupons");
    const data = await res.json();
    if (data.success) setCoupons(data.coupons || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to create coupon.");

      setShowModal(false);
      setForm({ code: "", type: "percentage", value: "15", minOrderValue: "50", maxDiscountAmount: "", expiryDate: "", usageLimit: "100" });
      fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    const res = await fetch(`/api/admin/coupons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    if (res.ok) fetchCoupons();
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete coupon ${code}?`)) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    fetchCoupons();
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Coupons & Promotional Discounts</h1>
          <p className="text-zinc-500 text-base mt-0.5">{coupons.length} promotional codes configured</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#e74b2d]/20 cursor-pointer"
        >
          + Create New Coupon
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-sky-200 border-t-[#e74b2d] rounded-full animate-spin mx-auto" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-base">
            No active coupons found. Click &quot;Create New Coupon&quot; to configure one.
          </div>
        ) : (
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-zinc-100 bg-[#fff7f3]/50 text-zinc-500">
                <th className="text-left px-5 py-3.5 font-bold">Coupon Code</th>
                <th className="text-left px-5 py-3.5 font-bold">Discount Value</th>
                <th className="text-left px-5 py-3.5 font-bold">Min Subtotal</th>
                <th className="text-left px-5 py-3.5 font-bold">Used / Limit</th>
                <th className="text-left px-5 py-3.5 font-bold">Status</th>
                <th className="text-right px-5 py-3.5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {coupons.map((c) => (
                <tr key={c._id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-black text-zinc-900 text-base">{c.code}</td>
                  <td className="px-5 py-3.5 font-bold text-[#e74b2d]">
                    {c.type === "percentage" ? `${c.value}% OFF` : `$${c.value.toFixed(2)} OFF`}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-zinc-600">
                    ${(c.minOrderValue || 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-zinc-600">
                    {c.usedCount} / {c.usageLimit ? c.usageLimit : "∞"}
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => handleToggle(c._id, c.isActive)} className="cursor-pointer">
                      <span className={`px-2.5 py-1 rounded-full text-base font-bold ${
                        c.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                      }`}>
                        {c.isActive ? "ACTIVE" : "DISABLED"}
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(c._id, c.code)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200/80 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">Create New Coupon</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-800 cursor-pointer">✕</button>
            </div>

            {error && <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 font-semibold text-base rounded-xl">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Coupon Code *</label>
                <input required type="text" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="e.g. WELCOME15" className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base font-mono font-bold text-zinc-900 uppercase focus:outline-none focus:border-[#e74b2d]" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Type *</label>
                  <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as any }))} className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base text-zinc-900 focus:outline-none">
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat ($)</option>
                  </select>
                </div>
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Value *</label>
                  <input required type="number" step="0.01" value={form.value} onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))} className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Min Subtotal ($)</label>
                  <input type="number" value={form.minOrderValue} onChange={(e) => setForm((prev) => ({ ...prev, minOrderValue: e.target.value }))} className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none" />
                </div>
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Usage Limit</label>
                  <input type="number" value={form.usageLimit} onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))} placeholder="100" className="w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-base text-zinc-600 font-bold border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60">{saving ? "Creating..." : "Save Coupon"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
