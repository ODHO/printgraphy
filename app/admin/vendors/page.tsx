"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  IconButton,
  Notice,
  PageHeader,
  Spinner,
  SkeletonRows,
  StatTile,
  Toolbar,
  cx,
  inputClass,
  labelClass,
  statusTone,
  table,
} from "@/components/admin/ui";
import { useLiveRefresh } from "@/components/useMessageStream";

interface Vendor {
  _id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  marketsCovered?: string[];
  categoriesFulfilled?: string[];
  status: "active" | "paused" | "deactivated";
  isAvailable?: boolean;
  capacityPerWeek?: number;
  earnedBalance?: number;
  metrics?: {
    acceptanceRate?: number;
    onTimePercentage?: number;
    reprintRate?: number;
  };
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [statusNotice, setStatusNotice] = useState("");

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

  const fetchVendors = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/vendors");
      const data = await res.json();
      if (data.success && Array.isArray(data.vendors)) {
        setVendors(data.vendors);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useLiveRefresh(() => {
    fetchVendors(true);
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === vendors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(vendors.map((v) => v._id));
    }
  };

  const handleAction = async (action: "approve" | "suspend" | "details" | "services") => {
    if (selectedIds.length === 0) {
      setStatusNotice("Please select at least one vendor.");
      setTimeout(() => setStatusNotice(""), 3000);
      return;
    }

    if (action === "approve") {
      for (const id of selectedIds) {
        await fetch(`/api/admin/vendors/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        }).catch(() => {});
      }
      setStatusNotice(`Approved ${selectedIds.length} vendor(s).`);
      fetchVendors(true);
      setTimeout(() => setStatusNotice(""), 3000);
    } else if (action === "suspend") {
      for (const id of selectedIds) {
        await fetch(`/api/admin/vendors/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "paused" }),
        }).catch(() => {});
      }
      setStatusNotice(`Suspended ${selectedIds.length} vendor(s).`);
      fetchVendors(true);
      setTimeout(() => setStatusNotice(""), 3000);
    } else if (action === "details") {
      const selected = vendors.find((v) => v._id === selectedIds[0]);
      if (selected) {
        setEditingVendor(selected);
        setForm({
          name: selected.name,
          contactName: selected.contactName || selected.name,
          email: selected.email,
          phone: selected.phone || "",
          marketsCovered: selected.marketsCovered?.join(", ") || "",
          categoriesFulfilled: selected.categoriesFulfilled?.join(", ") || "",
          capacityPerWeek: String(selected.capacityPerWeek || 500),
        });
        setShowModal(true);
      }
    } else if (action === "services") {
      setStatusNotice(`Managing services for ${selectedIds.length} vendor(s).`);
      setTimeout(() => setStatusNotice(""), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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

      setStatusNotice("Vendor saved successfully.");
      setTimeout(() => {
        setShowModal(false);
        setStatusNotice("");
      }, 1200);
      fetchVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving vendor.");
    } finally {
      setSaving(false);
    }
  };

  const allSelected = selectedIds.length === vendors.length && vendors.length > 0;
  const checkboxClass = "h-4 w-4 rounded border-zinc-300 accent-[#329AD4] text-[#329AD4] focus:ring-[#329AD4] cursor-pointer";

  const withMetrics = vendors.filter((v) => typeof v.metrics?.acceptanceRate === "number");
  const stats = {
    active: vendors.filter((v) => v.status === "active").length,
    available: vendors.filter((v) => v.status === "active" && v.isAvailable !== false).length,
    inactive: vendors.filter((v) => v.status !== "active").length,
    acceptance: withMetrics.length
      ? `${Math.round(withMetrics.reduce((sum, v) => sum + (v.metrics?.acceptanceRate ?? 0), 0) / withMetrics.length)}%`
      : "—",
    balance: `$${vendors.reduce((sum, v) => sum + (v.earnedBalance ?? 0), 0).toFixed(2)}`,
  };

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        icon="vendors"
        title="Vendor Management"
        description="Onboard print partners, review their performance and manage their status."
        actions={
          <Button
            icon="plus"
            onClick={() => {
              setEditingVendor(null);
              setForm({
                name: "",
                contactName: "",
                email: "",
                phone: "",
                marketsCovered: "NY, LA, TX",
                categoriesFulfilled: "Business Cards, Packaging",
                capacityPerWeek: "500",
              });
              setError("");
              setShowModal(true);
            }}
          >
            Add Vendor
          </Button>
        }
      />

      {statusNotice && <Notice tone="brand">{statusNotice}</Notice>}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatTile label="Total Vendors" icon="vendors" tone="brand" loading={loading} value={<span className="tabular-nums">{vendors.length}</span>} />
        <StatTile label="Active" icon="check" tone="green" loading={loading} value={<span className="tabular-nums">{stats.active}</span>} />
        <StatTile label="Accepting Orders" icon="clock" tone="sky" loading={loading} value={<span className="tabular-nums">{stats.available}</span>} hint="Availability switched on" />
        <StatTile label="Paused / Deactivated" icon="ban" tone="amber" loading={loading} value={<span className="tabular-nums">{stats.inactive}</span>} />
        <StatTile label="Avg. Acceptance Rate" icon="analytics" tone="violet" loading={loading} value={<span className="tabular-nums">{stats.acceptance}</span>} />
        <StatTile label="Wallet Balances" icon="wallet" tone="indigo" loading={loading} value={<span className="tabular-nums">{stats.balance}</span>} hint="Owed to vendors" />
      </div>

      {/* Vendors table */}
      <Card className="overflow-hidden">
        <Toolbar>
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
              <Icon name="vendors" className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                Vendors
                {loading && <Spinner className="h-3.5 w-3.5" />}
              </h2>
              <p className="text-xs text-zinc-500 tabular-nums">
                {selectedIds.length > 0 ? `${selectedIds.length} of ${vendors.length} selected` : `${vendors.length} vendor${vendors.length === 1 ? "" : "s"} · select rows to run an action`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" icon="eye" onClick={() => handleAction("details")}>
              View Details
            </Button>
            <Button size="sm" variant="soft" icon="services" onClick={() => handleAction("services")}>
              Manage Services
            </Button>
            <button
              type="button"
              onClick={() => handleAction("approve")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/25 transition-all hover:bg-emerald-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            >
              <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.2} />
              Approve
            </button>
            <Button size="sm" variant="danger" icon="ban" onClick={() => handleAction("suspend")}>
              Suspend
            </Button>
          </div>
        </Toolbar>

        {loading && vendors.length === 0 ? (
          <SkeletonRows rows={5} />
        ) : vendors.length === 0 ? (
          <EmptyState icon="vendors" title="No vendors yet" description="Add your first print partner to start assigning orders." />
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.thead}>
                <tr>
                  <th className={cx(table.th, "w-10 pr-2")}>
                    <input
                      type="checkbox"
                      aria-label="Select all vendors"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className={checkboxClass}
                    />
                  </th>
                  <th className={table.th}>Vendor Name/Email</th>
                  <th className={table.th}>Status</th>
                  <th className={cx(table.th, "text-center")}>Acceptance</th>
                  <th className={cx(table.th, "text-center")}>On-time</th>
                  <th className={cx(table.th, "text-center")}>Categories</th>
                  <th className={cx(table.th, "text-right")}>Wallet</th>
                  <th className={cx(table.th, "text-right")}>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {vendors.map((v) => {
                  const isChecked = selectedIds.includes(v._id);
                  return (
                    <tr key={v._id} className={cx(table.tr, isChecked && "bg-[#EAF5FB]/60")}>
                      <td className={cx(table.td, "pr-2")}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${v.name}`}
                          checked={isChecked}
                          onChange={() => toggleSelect(v._id)}
                          className={checkboxClass}
                        />
                      </td>

                      <td className={cx(table.td, "whitespace-nowrap")}>
                        <div className="flex items-center gap-3">
                          <Avatar name={v.name} />
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900">{v.name}</p>
                            <p className="text-xs text-zinc-500">{v.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className={table.td}>
                        <Badge tone={statusTone(v.status)} dot>
                          {v.status}
                        </Badge>
                      </td>

                      <td className={cx(table.td, "text-center font-semibold text-zinc-900 tabular-nums")}>
                        {typeof v.metrics?.acceptanceRate === "number" ? `${v.metrics.acceptanceRate}%` : "—"}
                      </td>

                      <td className={cx(table.td, "text-center text-zinc-900 tabular-nums")}>
                        {typeof v.metrics?.onTimePercentage === "number" ? `${v.metrics.onTimePercentage}%` : "—"}
                      </td>

                      <td className={cx(table.td, "text-center")}>
                        <span
                          className="inline-flex min-w-8 justify-center rounded-full bg-[#EAF5FB] px-2 py-0.5 text-xs font-semibold text-[#2884b8] tabular-nums"
                          title={(v.categoriesFulfilled ?? []).join(", ")}
                        >
                          {v.categoriesFulfilled?.length ?? 0}
                        </span>
                      </td>

                      <td className={cx(table.td, "text-right font-semibold text-zinc-900 tabular-nums whitespace-nowrap")}>
                        ${(v.earnedBalance ?? 0).toFixed(2)}
                      </td>

                      <td className={cx(table.td, "text-right")}>
                        <Link
                          href={`/admin/vendors/${v._id}`}
                          aria-label={`Open ${v.name}`}
                          title="Open vendor"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-[#EAF5FB] hover:text-[#2884b8]"
                        >
                          <Icon name="chevronRight" className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal for Details / Edit / Create */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-zinc-200/80 max-h-[calc(100vh-2rem)] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#2884b8]">
                  <Icon name={editingVendor ? "edit" : "plus"} className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {editingVendor ? "Vendor Details & Edit" : "Onboard New Vendor"}
                  </h3>
                  {editingVendor && <p className="text-xs text-zinc-500 truncate">{editingVendor.email}</p>}
                </div>
              </div>
              <IconButton icon="close" label="Close" onClick={() => setShowModal(false)} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 sm:px-6 py-5">
              {error && <Notice tone="red">{error}</Notice>}

              <div>
                <label className={labelClass}>Company / Facility Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Contact Person Name</label>
                <input
                  type="text"
                  required
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Categories Fulfilled (comma-separated)</label>
                <input
                  type="text"
                  value={form.categoriesFulfilled}
                  onChange={(e) => setForm({ ...form, categoriesFulfilled: e.target.value })}
                  placeholder="Business Cards, Postcards, Banners"
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} icon={saving ? undefined : "check"}>
                  {saving ? "Saving..." : "Save Vendor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
