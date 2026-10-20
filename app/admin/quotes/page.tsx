"use client";

import { useEffect, useState, useCallback } from "react";

interface Quote {
  _id: string;
  referenceNumber: string;
  contactName: string;
  email: string;
  companyName?: string;
  category: string;
  quantity: number;
  description: string;
  targetTimeline?: string;
  status: string;
  quotedPrice?: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  pages: number;
  total: number;
}

const STATUSES = ["submitted", "under_review", "quoted", "approved", "declined"];

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editStatus, setEditStatus] = useState("quoted");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      ...(statusFilter && { status: statusFilter }),
    });

    const res = await fetch(`/api/admin/quotes?${params}`);
    const data = await res.json();
    if (data.success) {
      setQuotes(data.quotes || []);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const openQuoteModal = (q: Quote) => {
    setActiveQuote(q);
    setEditPrice(q.quotedPrice ? String(q.quotedPrice) : "");
    setEditStatus(q.status);
    setEditNotes("");
  };

  const handleUpdateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote) return;

    setSaving(true);
    const res = await fetch(`/api/admin/quotes/${activeQuote._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: editStatus,
        quotedPrice: editPrice ? parseFloat(editPrice) : undefined,
        adminNotes: editNotes,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setActiveQuote(null);
      fetchQuotes();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Custom Quotes Oversight</h1>
          <p className="text-zinc-500 text-base mt-0.5">
            {pagination ? `${pagination.total} total custom quote requests` : "Loading..."}
          </p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="max-w-xs">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="w-full bg-white border border-zinc-200/80 rounded-xl px-4 py-2.5 text-base text-zinc-700 font-semibold focus:outline-none focus:border-[#064FE0] cursor-pointer shadow-xs"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-base">
            No quote requests found.
          </div>
        ) : (
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-zinc-100 bg-[#edf4f9]/50 text-zinc-500">
                <th className="text-left px-5 py-3.5 font-bold">Ref Number</th>
                <th className="text-left px-5 py-3.5 font-bold">Contact</th>
                <th className="text-left px-5 py-3.5 font-bold">Category</th>
                <th className="text-left px-5 py-3.5 font-bold">Qty</th>
                <th className="text-left px-5 py-3.5 font-bold">Status</th>
                <th className="text-left px-5 py-3.5 font-bold">Quoted Price</th>
                <th className="text-right px-5 py-3.5 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {quotes.map((q) => (
                <tr key={q._id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-zinc-900">{q.referenceNumber}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-zinc-900">{q.contactName}</p>
                    <p className="text-zinc-400 text-base">{q.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-700 font-semibold">{q.category}</td>
                  <td className="px-5 py-3.5 text-zinc-900 font-mono font-bold">{q.quantity.toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-base font-bold uppercase ${
                      q.status === "approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      q.status === "quoted" ? "bg-sky-50 text-sky-700 border border-sky-200" :
                      q.status === "under_review" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "bg-zinc-100 text-zinc-600 border border-zinc-200"
                    }`}>
                      {q.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-zinc-900 font-mono">
                    {q.quotedPrice ? `$${q.quotedPrice.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openQuoteModal(q)}
                      className="px-3 py-1.5 bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold text-base rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Review / Quote
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quote Review Modal */}
      {activeQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200/80 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">
                Review Quote <span className="font-mono text-[#064FE0]">{activeQuote.referenceNumber}</span>
              </h2>
              <button onClick={() => setActiveQuote(null)} className="text-zinc-400 hover:text-zinc-800 cursor-pointer">✕</button>
            </div>

            <div className="bg-[#f8fbfd] p-4 rounded-2xl border border-sky-100 space-y-2 text-base text-zinc-700">
              <p><strong>Customer:</strong> {activeQuote.contactName} ({activeQuote.email})</p>
              <p><strong>Company:</strong> {activeQuote.companyName || "N/A"}</p>
              <p><strong>Category & Qty:</strong> {activeQuote.category} × {activeQuote.quantity.toLocaleString()}</p>
              <p><strong>Timeline:</strong> {activeQuote.targetTimeline || "N/A"}</p>
              <div className="mt-2 pt-2 border-t border-zinc-200">
                <p className="text-zinc-500 font-bold mb-1">Description:</p>
                <p className="text-zinc-900 whitespace-pre-wrap">{activeQuote.description}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateQuote} className="space-y-4">
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0] cursor-pointer"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Quote Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="Enter custom quoted total..."
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base font-mono text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveQuote(null)}
                  className="flex-1 py-2.5 text-base text-zinc-600 font-bold border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Update Quote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
