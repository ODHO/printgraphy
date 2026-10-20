"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import VendorSelect from "../_components/VendorSelect";
import { useLiveRefresh } from "@/components/useMessageStream";

interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  vendorId?: string | { _id: string; name: string };
  userId?: { firstName: string; lastName: string; email: string };
  shippingAddress: { name: string; city: string; state: string; zip: string; line1: string };
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
}

interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

const FULFILLMENT_STATUSES = [
  "pending",
  "assigned",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
];

function slaText(order: Order) {
  const age = Date.now() - new Date(order.createdAt).getTime();
  if (order.fulfillmentStatus === "pending" && age > 24 * 60 * 60 * 1000) return "Accept overdue";
  if ((order.fulfillmentStatus === "assigned" || order.fulfillmentStatus === "in_production") && age > 48 * 60 * 60 * 1000) return "Production overdue";
  if (order.fulfillmentStatus === "delivered" || order.fulfillmentStatus === "cancelled") return "Closed";
  return "On track";
}

function SlaBadge({ order }: { order: Order }) {
  const label = slaText(order);
  const risk = label.includes("overdue");
  return (
    <span className={`block w-max px-2.5 py-1 rounded-full text-base font-bold ${risk ? "bg-red-50 text-red-700 border border-red-200" : "bg-zinc-100 text-zinc-600 border border-zinc-200"}`}>
      {label}
    </span>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [market, setMarket] = useState("");
  const [category, setCategory] = useState("");
  const [sla, setSla] = useState("");

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [vendors, setVendors] = useState<{ _id: string; name: string; status: string; isAvailable?: boolean }[]>([]);
  const [editForm, setEditForm] = useState({
    fulfillmentStatus: "pending",
    trackingNumber: "",
    trackingCarrier: "UPS",
    vendorId: "",
    vendorPayment: "",
  });

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      ...(search && { search }),
      ...(statusFilter && { status: statusFilter }),
      ...(paymentFilter && { paymentStatus: paymentFilter }),
      ...(market && { market }),
      ...(category && { category }),
      ...(sla && { sla }),
    });

    const res = await fetch(`/api/admin/orders?${params}`);
    const data = await res.json();
    if (data.success) {
      setOrders(data.orders || []);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [page, search, statusFilter, paymentFilter, market, category, sla]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useLiveRefresh(() => {
    fetchOrders(true);
  });

  useEffect(() => {
    fetch("/api/admin/vendors?limit=50")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setVendors(data.vendors || []);
      });
  }, []);

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditForm({
      fulfillmentStatus: order.fulfillmentStatus,
      trackingNumber: order.trackingNumber || "",
      trackingCarrier: order.trackingCarrier || "UPS",
      vendorId: typeof order.vendorId === "object" && order.vendorId ? order.vendorId._id : order.vendorId || "",
      vendorPayment: "",
    });
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setUpdating(true);
    const res = await fetch(`/api/admin/orders/${editingOrder._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (data.success) {
      setEditingOrder(null);
      fetchOrders();
    }
    setUpdating(false);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Order Queue & Oversight</h1>
          <p className="text-zinc-500 text-base mt-0.5">
            {pagination ? `${pagination.total} total orders` : "Loading orders..."}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search order number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white border border-zinc-200/80 rounded-xl pl-10 pr-4 py-2.5 text-base text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#064FE0] shadow-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white border border-zinc-200/80 rounded-xl px-4 py-2.5 text-base text-zinc-700 font-semibold focus:outline-none focus:border-[#064FE0] cursor-pointer shadow-xs"
        >
          <option value="">All Fulfillment Statuses</option>
          {FULFILLMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>

        <input
          value={market}
          onChange={(e) => { setMarket(e.target.value); setPage(1); }}
          placeholder="Market / state"
          className="bg-white border border-zinc-200/80 rounded-xl px-4 py-2.5 text-base text-zinc-700 focus:outline-none focus:border-[#064FE0] shadow-xs"
        />
        <input
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          placeholder="Category / product"
          className="bg-white border border-zinc-200/80 rounded-xl px-4 py-2.5 text-base text-zinc-700 focus:outline-none focus:border-[#064FE0] shadow-xs"
        />
        <select
          value={sla}
          onChange={(e) => { setSla(e.target.value); setPage(1); }}
          className="bg-white border border-zinc-200/80 rounded-xl px-4 py-2.5 text-base text-zinc-700 font-semibold focus:outline-none focus:border-[#064FE0] cursor-pointer shadow-xs"
        >
          <option value="">All SLA</option>
          <option value="risk">SLA risk</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
          className="bg-white border border-zinc-200/80 rounded-xl px-4 py-2.5 text-base text-zinc-700 font-semibold focus:outline-none focus:border-[#064FE0] cursor-pointer shadow-xs"
        >
          <option value="">All Payment Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-base">
            No orders found matching your filters.
          </div>
        ) : (
          <>
            <table className="w-full text-base overflow-auto block">
              <thead>
                <tr className="border-b border-zinc-100 bg-[#edf4f9]/50 text-zinc-500">
                  <th className="text-left px-5 py-3.5 font-bold">Order Ref</th>
                  <th className="text-left px-5 py-3.5 font-bold">Customer</th>
                  <th className="text-left px-5 py-3.5 font-bold">Vendor</th>
                  <th className="text-left px-5 py-3.5 font-bold">SLA</th>
                  <th className="text-left px-5 py-3.5 font-bold">Items</th>
                  <th className="text-left px-5 py-3.5 font-bold">Payment</th>
                  <th className="text-left px-5 py-3.5 font-bold">Fulfillment</th>
                  <th className="text-left px-5 py-3.5 font-bold">Total</th>
                  <th className="text-right px-5 py-3.5 font-bold">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-zinc-900">
                      <Link href={`/admin/orders/${order._id}`} className="text-[#064FE0] hover:underline">
                        {order.orderNumber}
                      </Link>
                      <p className="text-base font-sans font-normal text-zinc-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-bold text-zinc-900">
                        {order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : order.shippingAddress.name}
                      </p>
                      <p className="text-zinc-400 text-base">{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                    </td>

                    <td className="px-5 py-3.5 font-semibold text-zinc-800">
                      {typeof order.vendorId === "object" && order.vendorId ? order.vendorId.name : "Unassigned"}
                    </td>
                    <td className="px-5 py-3.5">
                      <SlaBadge order={order} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-zinc-700 font-semibold">
                        {order.items.length} item(s)
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-base font-bold uppercase ${
                        order.paymentStatus === "paid"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-base font-bold uppercase ${
                        order.fulfillmentStatus === "delivered" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        order.fulfillmentStatus === "shipped" ? "bg-sky-50 text-sky-700 border border-sky-200" :
                        order.fulfillmentStatus === "in_production" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-zinc-100 text-zinc-600 border border-zinc-200"
                      }`}>
                        {order.fulfillmentStatus.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-bold text-zinc-900 font-mono">
                      ${order.totalAmount.toFixed(2)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/orders/${order._id}`}
                          className="px-3 py-1.5 border border-zinc-200 text-zinc-700 font-bold text-base rounded-xl hover:bg-white"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => openEditModal(order)}
                          className="px-3 py-1.5 bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold text-base rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          Edit Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-100 bg-[#edf4f9]/30">
                <p className="text-base text-zinc-500 font-medium">
                  Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-zinc-200 rounded-xl text-base font-bold text-zinc-600 hover:bg-white disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-base font-mono font-bold text-zinc-800 px-2">{page} / {pagination.pages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="px-3 py-1.5 border border-zinc-200 rounded-xl text-base font-bold text-zinc-600 hover:bg-white disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200/80 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">
                Update Order <span className="font-mono text-[#064FE0]">{editingOrder.orderNumber}</span>
              </h2>
              <button onClick={() => setEditingOrder(null)} className="text-zinc-400 hover:text-zinc-800 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-4">
              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Fulfillment Status</label>
                <select
                  value={editForm.fulfillmentStatus}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fulfillmentStatus: e.target.value }))}
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0] cursor-pointer"
                >
                  {FULFILLMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Assigned vendor</label>
                <VendorSelect
                  vendors={vendors}
                  value={editForm.vendorId}
                  onChange={(vendorId) => setEditForm((prev) => ({ ...prev, vendorId }))}
                />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Vendor payment</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.vendorPayment}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, vendorPayment: e.target.value }))}
                  placeholder="Amount the vendor receives"
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Carrier</label>
                <input
                  type="text"
                  value={editForm.trackingCarrier}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, trackingCarrier: e.target.value }))}
                  placeholder="e.g. UPS, FedEx, DHL"
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                />
              </div>

              <div>
                <label className="text-base font-bold text-zinc-700 block mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={editForm.trackingNumber}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                  placeholder="e.g. 1Z9999999999999999"
                  className="w-full bg-[#f8fbfd] border border-zinc-200 rounded-xl px-3.5 py-2 text-base font-mono text-zinc-900 focus:outline-none focus:border-[#064FE0]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="flex-1 py-2.5 text-base text-zinc-600 font-bold border border-zinc-200 rounded-xl hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all disabled:opacity-60 cursor-pointer"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
