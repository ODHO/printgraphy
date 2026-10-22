"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge, Button, Card, CardHeader, cx, EmptyState, Field, Icon, IconButton, inputClass, Notice, PageHeader, SkeletonRows, StatTile, table } from "@/components/admin/ui";

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

  const activeCount = coupons.filter((c) => c.isActive).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon="tag"
        title="Coupons & Promotional Discounts"
        description={<span className="tabular-nums">{coupons.length} promotional codes configured</span>}
        actions={
          <Button icon="plus" onClick={() => setShowModal(true)}>
            Create New Coupon
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="Total coupons" value={<span className="tabular-nums">{coupons.length}</span>} icon="tag" tone="brand" loading={loading} />
        <StatTile label="Active" value={<span className="tabular-nums">{activeCount}</span>} icon="check" tone="green" loading={loading} />
        <StatTile label="Redemptions" value={<span className="tabular-nums">{totalRedemptions}</span>} icon="sparkle" tone="violet" loading={loading} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader icon="tag" title="All coupons" subtitle="Click a status badge to enable or disable a code" />
        {loading ? (
          <SkeletonRows rows={5} />
        ) : coupons.length === 0 ? (
          <EmptyState
            icon="tag"
            title="No coupons yet"
            description={<>No active coupons found. Click &quot;Create New Coupon&quot; to configure one.</>}
            action={
              <Button icon="plus" onClick={() => setShowModal(true)}>
                Create New Coupon
              </Button>
            }
          />
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Coupon Code</th>
                  <th className={table.th}>Discount Value</th>
                  <th className={table.th}>Min Subtotal</th>
                  <th className={table.th}>Used / Limit</th>
                  <th className={table.th}>Status</th>
                  <th className={cx(table.th, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {coupons.map((c) => {
                  const pct = c.usageLimit ? Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100)) : 0;
                  return (
                    <tr key={c._id} className={table.tr}>
                      <td className={table.td}>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#b8e0f6] bg-[#f0f8fd] px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-[#1b5b80]">
                          <Icon name="tag" className="w-3.5 h-3.5 text-[#329AD4]" />
                          {c.code}
                        </span>
                      </td>
                      <td className={cx(table.td, "whitespace-nowrap font-semibold text-[#2884b8] tabular-nums")}>
                        {c.type === "percentage" ? `${c.value}% OFF` : `$${c.value.toFixed(2)} OFF`}
                      </td>
                      <td className={cx(table.td, "whitespace-nowrap tabular-nums text-zinc-600")}>
                        ${(c.minOrderValue || 0).toFixed(2)}
                      </td>
                      <td className={cx(table.td, "whitespace-nowrap")}>
                        <span className="text-zinc-700 tabular-nums">
                          {c.usedCount} / {c.usageLimit ? c.usageLimit : "∞"}
                        </span>
                        {c.usageLimit ? (
                          <span className="mt-1.5 block h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100">
                            <span className="block h-full rounded-full bg-[#329AD4]" style={{ width: `${pct}%` }} />
                          </span>
                        ) : null}
                      </td>
                      <td className={table.td}>
                        <button onClick={() => handleToggle(c._id, c.isActive)} className="cursor-pointer rounded-full transition-opacity hover:opacity-80" title={c.isActive ? "Click to disable" : "Click to enable"}>
                          <Badge tone={c.isActive ? "green" : "gray"} dot className="uppercase tracking-wide">
                            {c.isActive ? "ACTIVE" : "DISABLED"}
                          </Badge>
                        </button>
                      </td>
                      <td className={cx(table.td, "text-right")}>
                        <Button variant="danger" size="sm" icon="trash" onClick={() => handleDelete(c._id, c.code)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#2884b8]">
                  <Icon name="tag" className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-semibold text-zinc-900">Create New Coupon</h2>
              </div>
              <IconButton icon="close" label="Close" onClick={() => setShowModal(false)} />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <div className="space-y-4 px-5 sm:px-6 py-5 overflow-y-auto">
                {error && <Notice tone="red">{error}</Notice>}

                <Field label="Coupon Code *">
                  <input required type="text" value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="e.g. WELCOME15" className={cx(inputClass, "font-mono font-semibold uppercase tracking-wider")} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type *">
                    <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as any }))} className={inputClass}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat ($)</option>
                    </select>
                  </Field>
                  <Field label="Value *">
                    <input required type="number" step="0.01" value={form.value} onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))} className={cx(inputClass, "tabular-nums")} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Min Subtotal ($)">
                    <input type="number" value={form.minOrderValue} onChange={(e) => setForm((prev) => ({ ...prev, minOrderValue: e.target.value }))} className={cx(inputClass, "tabular-nums")} />
                  </Field>
                  <Field label="Usage Limit">
                    <input type="number" value={form.usageLimit} onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))} placeholder="100" className={cx(inputClass, "tabular-nums")} />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-2 px-5 sm:px-6 py-4 border-t border-zinc-100 bg-zinc-50/60">
                <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} icon="check">{saving ? "Creating..." : "Save Coupon"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
