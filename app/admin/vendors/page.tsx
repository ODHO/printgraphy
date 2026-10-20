"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLiveRefresh } from "@/components/useMessageStream";

interface Vendor {
  _id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  marketsCovered: string[];
  categoriesFulfilled: string[];
  status: "active" | "paused" | "deactivated";
  isAvailable: boolean;
  capacityPerWeek: number;
  earnedBalance?: number;
  metrics: {
    acceptanceRate: number;
    onTimePercentage: number;
    reprintRate: number;
  };
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    marketsCovered: "",
    categoriesFulfilled: "",
    capacityPerWeek: "500",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");

  const fetchVendors = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await fetch("/api/admin/vendors");
    const data = await res.json();
    if (data.success) {
      setVendors(data.vendors || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useLiveRefresh(() => {
    fetchVendors(true);
  });

  const openCreateModal = () => {
    setEditingVendor(null);
    setForm({ name: "", contactName: "", email: "", phone: "", marketsCovered: "NY, LA, TX", categoriesFulfilled: "Business Cards, Packaging", capacityPerWeek: "500" });
    setError("");
    setNotice("");
    setShowModal(true);
  };

  const openEditModal = (v: Vendor) => {
    setEditingVendor(v);
    setForm({
      name: v.name,
      contactName: v.contactName,
      email: v.email,
      phone: v.phone,
      marketsCovered: v.marketsCovered.join(", "),
      categoriesFulfilled: v.categoriesFulfilled.join(", "),
      capacityPerWeek: String(v.capacityPerWeek),
    });
    setError("");
    setNotice("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    const payload = {
      name: form.name,
      contactName: form.contactName,
      email: form.email,
      phone: form.phone,
      marketsCovered: form.marketsCovered.split(",").map((s) => s.trim()).filter(Boolean),
      categoriesFulfilled: form.categoriesFulfilled.split(",").map((s) => s.trim()).filter(Boolean),
      capacityPerWeek: Number(form.capacityPerWeek),
    };

    try {
      const url = editingVendor ? `/api/admin/vendors/${editingVendor._id}` : "/api/admin/vendors";
      const method = editingVendor ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed.");

      if (data.message) setNotice(data.message);
      setTimeout(() => setShowModal(false), 1200);
      fetchVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving vendor.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/vendors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchVendors();
  };

  const recordPayout = async () => {
    if (!editingVendor) return;
    setError("");
    const res = await fetch(`/api/admin/vendors/${editingVendor._id}/payout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(payoutAmount), note: payoutNote }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.message || "Could not record the payout.");
      return;
    }
    setNotice(`Payout of $${Number(payoutAmount).toFixed(2)} recorded.`);
    setPayoutAmount("");
    setPayoutNote("");
    fetchVendors();
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Vendor Directory & Onboarding</h1>
          <p className="text-zinc-500 text-base mt-0.5">{vendors.length} registered partner facilities</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all shadow-md shadow-[#064FE0]/20 cursor-pointer"
        >
          + Onboard New Vendor
        </button>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-base">
            No vendors registered yet. Click &quot;Onboard New Vendor&quot; to add one.
          </div>
        ) : (
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-zinc-100 bg-[#edf4f9]/50 text-zinc-500">
                <th className="text-left px-5 py-3.5 font-bold">Vendor Name</th>
                <th className="text-left px-5 py-3.5 font-bold">Markets Covered</th>
                <th className="text-left px-5 py-3.5 font-bold">Categories</th>
                <th className="text-left px-5 py-3.5 font-bold">Status</th>
                <th className="text-left px-5 py-3.5 font-bold">Capacity / wk</th>
                <th className="text-left px-5 py-3.5 font-bold">On-Time %</th>
                <th className="text-right px-5 py-3.5 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {vendors.map((v) => (
                <tr key={v._id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/vendors/${v._id}`} className="font-bold text-[#064FE0] hover:underline">{v.name}</Link>
                    <p className="text-zinc-400 text-base">{v.contactName} · {v.email}</p>
                    <p className="text-base text-zinc-500 mt-1">
                      Accept {v.metrics?.acceptanceRate ?? 100}% · On time {v.metrics?.onTimePercentage ?? 100}% · Reprint {v.metrics?.reprintRate ?? 0}% · Balance ${Number(v.earnedBalance || 0).toFixed(2)}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {v.marketsCovered.map((m) => (
                        <span key={m} className="px-2 py-0.5 bg-zinc-100 text-zinc-700 font-semibold text-base rounded-md border border-zinc-200">
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {v.categoriesFulfilled.map((c) => (
                        <span key={c} className="px-2 py-0.5 bg-zinc-100 text-zinc-700 font-semibold text-base rounded-md border border-zinc-200">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={v.status}
                      onChange={(event) => handleStatus(v._id, event.target.value)}
                      className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-base font-bold uppercase cursor-pointer"
                    >
                      <option value="active">active</option>
                      <option value="paused">paused</option>
                      <option value="deactivated">removed</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-zinc-800">{v.capacityPerWeek}</td>
                  <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 text-base">
                    {v.metrics?.onTimePercentage ?? 100}%
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openEditModal(v)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50 transition-all cursor-pointer"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200/80 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">
                {editingVendor ? "Edit Vendor Profile" : "Onboard New Vendor"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-800 cursor-pointer">✕</button>
            </div>

            {error && <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 font-semibold text-base rounded-xl">{error}</div>}
            {notice && <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-base rounded-xl">{notice}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Company / Facility Name *</label>
                <input required type="text" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Primary Contact Name *</label>
                <input required type="text" value={form.contactName} onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))} className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
                </div>
                <div>
                  <label className="text-base font-bold text-zinc-700 block mb-1">Phone *</label>
                  <input required type="text" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
                </div>
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Markets Covered (comma separated)</label>
                <input type="text" value={form.marketsCovered} onChange={(e) => setForm((prev) => ({ ...prev, marketsCovered: e.target.value }))} placeholder="NY, LA, TX" className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Categories Fulfilled (comma separated)</label>
                <input type="text" value={form.categoriesFulfilled} onChange={(e) => setForm((prev) => ({ ...prev, categoriesFulfilled: e.target.value }))} placeholder="Business Cards, Packaging" className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]" />
              </div>

              {editingVendor && (
                <div className="rounded-xl border border-zinc-200 p-3 space-y-2">
                  <p className="text-base font-bold text-zinc-700">Record a payout from the earned balance</p>
                  <input value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} type="number" step="0.01" placeholder="Amount" className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base" />
                  <input value={payoutNote} onChange={(event) => setPayoutNote(event.target.value)} placeholder="Note" className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base" />
                  <button type="button" onClick={recordPayout} className="px-3 py-2 rounded-xl border border-zinc-200 text-base font-bold cursor-pointer">Record payout</button>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-base text-zinc-600 font-bold border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60">{saving ? "Saving..." : "Save Vendor"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
