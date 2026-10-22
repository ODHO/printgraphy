"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import VendorSelect from "../_components/VendorSelect";
import { useLiveRefresh } from "@/components/useMessageStream";
import {
  Avatar,
  Badge,
  Button,
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
  Tabs,
  Toolbar,
  cx,
  inputClass,
  labelClass,
  statusTone,
  table,
} from "@/components/admin/ui";

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

const STATUS_TAB_LABELS: Record<string, string> = {
  "": "All",
  pending: "Pending",
  assigned: "Assigned",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const selectClass = cx(inputClass, "cursor-pointer capitalize");

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
    <Badge tone={risk ? "red" : label === "Closed" ? "gray" : "green"} dot>
      {label}
    </Badge>
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

  // Derived from the page of orders already loaded — no extra requests.
  const countWhere = (statuses: string[]) => orders.filter((order) => statuses.includes(order.fulfillmentStatus)).length;
  const openCount = countWhere(["pending", "assigned", "in_production"]);
  const shippedCount = countWhere(["shipped", "delivered"]);
  const riskCount = orders.filter((order) => slaText(order).includes("overdue")).length;
  const statsLoading = loading && !pagination;
  const statusTabs = ["", ...FULFILLMENT_STATUSES].map((value) => ({
    value,
    label: STATUS_TAB_LABELS[value] ?? value.replace("_", " "),
    // The API only returns the total for the active filter, so the count sits on the active tab.
    count: value === statusFilter && pagination && !loading ? pagination.total : undefined,
  }));

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon="orders"
        title="Order Queue & Oversight"
        description={pagination ? `${pagination.total} total orders` : "Loading orders..."}
        actions={
          <>
            <ButtonLink href="/admin/vendors" variant="secondary" icon="vendors">
              Vendors
            </ButtonLink>
            <Button icon="refresh" onClick={() => fetchOrders()} disabled={loading}>
              Refresh
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile
          label="Total orders"
          icon="orders"
          tone="brand"
          loading={statsLoading}
          value={<span className="tabular-nums">{pagination?.total ?? 0}</span>}
          hint="Matching the current filters"
        />
        <StatTile
          label="In progress"
          icon="layers"
          tone="violet"
          loading={statsLoading}
          value={<span className="tabular-nums">{openCount}</span>}
          hint="Pending, assigned or in production on this page"
        />
        <StatTile
          label="Shipped & delivered"
          icon="truck"
          tone="green"
          loading={statsLoading}
          value={<span className="tabular-nums">{shippedCount}</span>}
          hint="On this page"
        />
        <StatTile
          label="SLA at risk"
          icon="clock"
          tone={riskCount > 0 ? "red" : "amber"}
          loading={statsLoading}
          value={<span className="tabular-nums">{riskCount}</span>}
          hint="Overdue on this page"
        />
      </div>

      {/* Orders */}
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder="Search order number..."
          />
          <Tabs
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
            items={statusTabs}
          />
        </Toolbar>

        {/* Secondary filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-5 sm:px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <label className="block">
            <span className={labelClass}>Payment</span>
            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
              className={selectClass}
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Market</span>
            <input
              value={market}
              onChange={(e) => { setMarket(e.target.value); setPage(1); }}
              placeholder="Market / state"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Category</span>
            <input
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              placeholder="Category / product"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>SLA</span>
            <select
              value={sla}
              onChange={(e) => { setSla(e.target.value); setPage(1); }}
              className={selectClass}
            >
              <option value="">All SLA</option>
              <option value="risk">SLA risk</option>
            </select>
          </label>
        </div>

        {loading ? (
          <SkeletonRows rows={6} />
        ) : orders.length === 0 ? (
          <EmptyState icon="orders" title="No orders found" description="No orders found matching your filters." />
        ) : (
          <>
            <div className={table.wrap}>
              <table className={table.table}>
                <thead className={table.thead}>
                  <tr>
                    <th className={table.th}>Order Ref</th>
                    <th className={table.th}>Customer</th>
                    <th className={table.th}>Vendor</th>
                    <th className={table.th}>SLA</th>
                    <th className={table.th}>Items</th>
                    <th className={table.th}>Payment</th>
                    <th className={table.th}>Fulfillment</th>
                    <th className={cx(table.th, "text-right")}>Total</th>
                    <th className={cx(table.th, "text-right")}>Manage</th>
                  </tr>
                </thead>
                <tbody className={table.tbody}>
                  {orders.map((order) => {
                    const customerName = order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : order.shippingAddress.name;
                    const vendorName = typeof order.vendorId === "object" && order.vendorId ? order.vendorId.name : "";
                    return (
                      <tr key={order._id} className={table.tr}>
                        <td className={cx(table.td, "whitespace-nowrap")}>
                          <Link href={`/admin/orders/${order._id}`} className="font-mono text-sm font-semibold text-[#2884b8] hover:text-[#1b5b80] hover:underline">
                            {order.orderNumber}
                          </Link>
                          <p className="mt-0.5 text-xs text-zinc-400">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </td>

                        <td className={table.td}>
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <Avatar name={customerName || "?"} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-900 truncate">{customerName}</p>
                              <p className="text-xs text-zinc-400 truncate">{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                            </div>
                          </div>
                        </td>

                        <td className={cx(table.td, "whitespace-nowrap")}>
                          {vendorName ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-800">
                              <Icon name="vendors" className="w-3.5 h-3.5 text-[#329AD4]" />
                              {vendorName}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className={table.td}>
                          <SlaBadge order={order} />
                        </td>
                        <td className={cx(table.td, "whitespace-nowrap tabular-nums text-zinc-600")}>
                          {order.items.length} item(s)
                        </td>

                        <td className={table.td}>
                          <Badge tone={statusTone(order.paymentStatus)} dot>
                            {order.paymentStatus}
                          </Badge>
                        </td>

                        <td className={table.td}>
                          <Badge tone={statusTone(order.fulfillmentStatus)}>
                            {order.fulfillmentStatus.replace("_", " ")}
                          </Badge>
                        </td>

                        <td className={cx(table.td, "text-right font-semibold text-zinc-900 tabular-nums whitespace-nowrap")}>
                          ${order.totalAmount.toFixed(2)}
                        </td>

                        <td className={cx(table.td, "text-right")}>
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/admin/orders/${order._id}`}
                              aria-label="View order"
                              title="View order"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-[#EAF5FB] hover:text-[#2884b8]"
                            >
                              <Icon name="eye" className="w-4 h-4" />
                            </Link>
                            <IconButton icon="edit" label="Edit Status" onClick={() => openEditModal(order)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200/80 rounded-2xl w-full max-w-md shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#2884b8]">
                  <Icon name="edit" className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-900">Update Order</h2>
                  <p className="font-mono text-xs text-[#2884b8] truncate">{editingOrder.orderNumber}</p>
                </div>
              </div>
              <IconButton icon="close" label="Close" onClick={() => setEditingOrder(null)} />
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-4 px-5 sm:px-6 py-5">
              <div>
                <label className={labelClass}>Fulfillment Status</label>
                <select
                  value={editForm.fulfillmentStatus}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fulfillmentStatus: e.target.value }))}
                  className={selectClass}
                >
                  {FULFILLMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Assigned vendor</label>
                <VendorSelect
                  vendors={vendors}
                  value={editForm.vendorId}
                  onChange={(vendorId) => setEditForm((prev) => ({ ...prev, vendorId }))}
                />
              </div>

              <div>
                <label className={labelClass}>Vendor payment</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.vendorPayment}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, vendorPayment: e.target.value }))}
                    placeholder="Amount the vendor receives"
                    className={cx(inputClass, "pl-7 tabular-nums")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Carrier</label>
                  <input
                    type="text"
                    value={editForm.trackingCarrier}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, trackingCarrier: e.target.value }))}
                    placeholder="e.g. UPS, FedEx, DHL"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Tracking Number</label>
                  <input
                    type="text"
                    value={editForm.trackingNumber}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                    placeholder="e.g. 1Z9999999999999999"
                    className={cx(inputClass, "font-mono")}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setEditingOrder(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating} className="flex-1" icon={updating ? undefined : "check"}>
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
