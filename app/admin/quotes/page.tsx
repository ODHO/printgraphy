"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar, Badge, Button, Card, cx, EmptyState, Field, Icon, IconButton, inputClass, PageHeader, Pagination as Pager, SkeletonRows, statusTone, table, Tabs, Toolbar, type Tone } from "@/components/admin/ui";

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
      <PageHeader
        icon="quotes"
        title="Custom Quotes Oversight"
        description={<span className="tabular-nums">{pagination ? `${pagination.total} total custom quote requests` : "Loading..."}</span>}
      />

      <Card className="overflow-hidden">
        <Toolbar>
          <Tabs
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
            items={[{ value: "", label: "All Statuses" }, ...STATUSES.map((s) => ({ value: s, label: <span className="capitalize">{s.replace("_", " ")}</span> }))]}
          />
          {pagination && !loading && (
            <p className="text-xs text-zinc-500 tabular-nums shrink-0">
              Page {pagination.page} of {Math.max(pagination.pages, 1)}
            </p>
          )}
        </Toolbar>

        {loading ? (
          <SkeletonRows rows={6} />
        ) : quotes.length === 0 ? (
          <EmptyState icon="quotes" title="No quote requests found." description={statusFilter ? "Try a different status filter." : undefined} />
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Ref Number</th>
                  <th className={table.th}>Contact</th>
                  <th className={table.th}>Category</th>
                  <th className={cx(table.th, "text-right")}>Qty</th>
                  <th className={table.th}>Status</th>
                  <th className={cx(table.th, "text-right")}>Quoted Price</th>
                  <th className={cx(table.th, "text-right")}>Action</th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {quotes.map((q) => (
                  <tr key={q._id} className={table.tr}>
                    <td className={table.td}>
                      <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700 whitespace-nowrap">{q.referenceNumber}</span>
                    </td>
                    <td className={table.td}>
                      <div className="flex items-center gap-3 min-w-[12rem]">
                        <Avatar name={q.contactName || q.email || "?"} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">{q.contactName}</p>
                          <p className="text-xs text-zinc-500 truncate">{q.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={cx(table.td, "whitespace-nowrap")}>{q.category}</td>
                    <td className={cx(table.td, "text-right font-semibold text-zinc-900 tabular-nums")}>{q.quantity.toLocaleString()}</td>
                    <td className={table.td}>
                      <Badge tone={quoteTone(q.status)} dot>{q.status.replace("_", " ")}</Badge>
                    </td>
                    <td className={cx(table.td, "text-right whitespace-nowrap tabular-nums", q.quotedPrice ? "font-semibold text-zinc-900" : "text-zinc-400")}>
                      {q.quotedPrice ? `$${q.quotedPrice.toFixed(2)}` : "—"}
                    </td>
                    <td className={cx(table.td, "text-right")}>
                      <Button size="sm" variant="soft" icon="edit" onClick={() => openQuoteModal(q)} className="whitespace-nowrap">
                        Review / Quote
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && !loading && (
          <Pager page={page} pages={pagination.pages} total={pagination.total} limit={20} onPage={setPage} />
        )}
      </Card>

      {/* Quote Review Modal */}
      {activeQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#2884b8]">
                  <Icon name="quotes" className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-semibold text-zinc-900 truncate">
                  Review Quote <span className="font-mono text-[#329AD4]">{activeQuote.referenceNumber}</span>
                </h2>
              </div>
              <IconButton icon="close" label="Close" onClick={() => setActiveQuote(null)} />
            </div>

            <form onSubmit={handleUpdateQuote} className="flex flex-col min-h-0">
              <div className="space-y-5 px-5 sm:px-6 py-5 overflow-y-auto">
                <div className="rounded-xl border border-[#dbeefb] bg-[#f0f8fd] p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={activeQuote.contactName || activeQuote.email || "?"} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{activeQuote.contactName}</p>
                      <p className="text-xs text-zinc-500 truncate">{activeQuote.email}</p>
                    </div>
                    <Badge tone={quoteTone(activeQuote.status)} dot className="ml-auto">{activeQuote.status.replace("_", " ")}</Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-zinc-500">Company</dt>
                      <dd className="font-medium text-zinc-900">{activeQuote.companyName || "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Category & Qty</dt>
                      <dd className="font-medium text-zinc-900">{activeQuote.category} × <span className="tabular-nums">{activeQuote.quantity.toLocaleString()}</span></dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-500">Timeline</dt>
                      <dd className="font-medium text-zinc-900">{activeQuote.targetTimeline || "N/A"}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 pt-3 border-t border-[#dbeefb]">
                    <p className="text-xs font-semibold text-[#1b5b80] mb-1">Description</p>
                    <p className="text-sm text-zinc-800 whitespace-pre-wrap">{activeQuote.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Status">
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={cx(inputClass, "cursor-pointer capitalize")}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Quote Price (USD)">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="Enter custom quoted total..."
                        className={cx(inputClass, "pl-7 tabular-nums")}
                      />
                    </div>
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-2 px-5 sm:px-6 py-4 border-t border-zinc-100 bg-zinc-50/60">
                <Button variant="secondary" onClick={() => setActiveQuote(null)}>Cancel</Button>
                <Button type="submit" disabled={saving} icon="check">{saving ? "Saving..." : "Update Quote"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function quoteTone(status: string): Tone {
  switch (status) {
    case "approved":
      return "green";
    case "quoted":
      return "brand";
    case "under_review":
      return "amber";
    case "declined":
      return "red";
    default:
      return statusTone(status);
  }
}
