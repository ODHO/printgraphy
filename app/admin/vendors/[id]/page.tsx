"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  LoadingState,
  PageHeader,
  StatTile,
  cx,
  inputClass,
  statusTone,
  table,
} from "@/components/admin/ui";

interface CostRow {
  _id: string;
  vendorCost: number;
  categoryBenchmarkMin: number;
  categoryBenchmarkMax: number;
  isEligible: boolean;
  productId?: { name?: string; price?: number };
}

interface VendorOrder {
  _id: string;
  orderNumber: string;
  fulfillmentStatus: string;
  totalAmount: number;
  createdAt: string;
  shippingAddress?: { city?: string; state?: string };
  reprint?: { flagged?: boolean; amount?: number };
  customerConfirmedAt?: string;
  payoutReleasedAt?: string;
  payoutAmount?: number;
}

interface VendorDetail {
  _id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  marketsCovered: string[];
  categoriesFulfilled: string[];
  status: string;
  isAvailable: boolean;
  capacityPerWeek: number;
  earnedBalance: number;
  stripeAccountId?: string;
  stripePublishableKey?: string;
  payouts?: { amount: number; note: string; createdAt: string }[];
}

interface Performance {
  acceptanceRate: number;
  onTimePercentage: number;
  reprintRate: number;
  avgTurnaroundHours: number;
  openJobs: number;
  deliveredJobs: number;
}

export default function AdminVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/vendors/${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setVendor(data.vendor);
          setOrders(data.orders || []);
          setCosts(data.costs || []);
          setPerformance(data.performance);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const setStatus = async (status: string) => {
    await fetch(`/api/admin/vendors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  if (loading) {
    return (
      <Card className="max-w-6xl">
        <LoadingState label="Loading vendor…" />
      </Card>
    );
  }
  if (!vendor) {
    return (
      <Card className="max-w-lg">
        <EmptyState
          icon="vendors"
          title="Vendor not found."
          action={<ButtonLink href="/admin/vendors" variant="secondary" size="sm" icon="arrowLeft">Vendor directory</ButtonLink>}
        />
      </Card>
    );
  }

  const statusLabel = vendor.status === "deactivated" ? "Removed" : vendor.status;

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        back={{ href: "/admin/vendors", label: "Vendor directory" }}
        icon="vendors"
        title={vendor.name}
        description={`${vendor.contactName} · ${vendor.email} · ${vendor.phone}`}
        actions={
          <>
            <Badge tone={vendor.status === "deactivated" ? "gray" : statusTone(vendor.status)} dot>
              {statusLabel}
            </Badge>
            <Badge tone={vendor.isAvailable ? "green" : "amber"}>
              {vendor.isAvailable ? "accepting orders" : "paused in the vendor app"}
            </Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Acceptance" icon="check" tone="green" value={<span className="tabular-nums">{`${performance?.acceptanceRate ?? 0}%`}</span>} />
        <StatTile label="On time" icon="clock" tone="brand" value={<span className="tabular-nums">{`${performance?.onTimePercentage ?? 0}%`}</span>} />
        <StatTile label="Reprint rate" icon="refresh" tone="red" value={<span className="tabular-nums">{`${performance?.reprintRate ?? 0}%`}</span>} />
        <StatTile label="Turnaround" icon="truck" tone="violet" value={<span className="tabular-nums">{`${performance?.avgTurnaroundHours ?? 48}h`}</span>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Card className="overflow-hidden">
            <CardHeader icon="tag" title="Costs against category benchmarks" />
            {costs.length === 0 ? (
              <EmptyState icon="tag" title="No product costs" description="This vendor has not entered any product costs." />
            ) : (
              <div className={table.wrap}>
                <table className={table.table}>
                  <thead className={table.thead}>
                    <tr>
                      <th className={table.th}>Product</th>
                      <th className={cx(table.th, "text-right")}>Customer price</th>
                      <th className={cx(table.th, "text-right")}>Benchmark</th>
                      <th className={cx(table.th, "text-right")}>Vendor cost</th>
                      <th className={table.th}>Gate</th>
                    </tr>
                  </thead>
                  <tbody className={table.tbody}>
                    {costs.map((cost) => {
                      const outlier = cost.vendorCost > cost.categoryBenchmarkMax;
                      return (
                        <tr key={cost._id} className={table.tr}>
                          <td className={cx(table.td, "font-semibold text-zinc-900")}>{cost.productId?.name || "Product"}</td>
                          <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap")}>${Number(cost.productId?.price || 0).toFixed(2)}</td>
                          <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap text-zinc-500")}>${cost.categoryBenchmarkMin.toFixed(2)} – ${cost.categoryBenchmarkMax.toFixed(2)}</td>
                          <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap font-semibold text-zinc-900")}>${cost.vendorCost.toFixed(2)}</td>
                          <td className={table.td}>
                            <Badge tone={cost.isEligible && !outlier ? "green" : "red"} dot>
                              {!cost.isEligible ? "Not eligible" : outlier ? "Outlier" : "In range"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              icon="orders"
              title="Assigned orders"
              subtitle={`${performance?.openJobs ?? 0} open, ${performance?.deliveredJobs ?? 0} delivered in view`}
            />
            {orders.length === 0 ? (
              <EmptyState icon="orders" title="No orders assigned yet." />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {orders.map((order) => (
                  <li key={order._id}>
                    <Link href={`/admin/orders/${order._id}`} className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 sm:px-6 py-3.5 text-sm transition-colors hover:bg-[#f0f8fd]/70">
                      <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
                          <Icon name="orders" className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono font-semibold text-[#2884b8] group-hover:text-[#1b5b80]">{order.orderNumber}</p>
                          <p className="text-xs text-zinc-500 truncate">{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                        <Badge tone={statusTone(order.fulfillmentStatus)}>{order.fulfillmentStatus.replaceAll("_", " ")}</Badge>
                        {order.payoutReleasedAt ? <Badge tone="green" dot>Paid</Badge> : order.fulfillmentStatus === "delivered" && order.customerConfirmedAt ? <Badge tone="green" dot>Ready to release</Badge> : order.fulfillmentStatus === "delivered" ? <Badge tone="amber" dot>Waiting on customer</Badge> : null}
                        {order.reprint?.flagged && <Badge tone="red" dot>Reprint</Badge>}
                        <Icon name="chevronRight" className="hidden sm:block w-4 h-4 text-zinc-300 group-hover:text-[#329AD4]" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-6 min-w-0">
          <Card>
            <CardHeader
              icon="settings"
              title="Onboarding status"
              action={
                <select value={vendor.status} onChange={(event) => setStatus(event.target.value)} className={cx(inputClass, "w-auto py-1.5 text-xs font-semibold cursor-pointer")}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="deactivated">Removed</option>
                </select>
              }
            />
            <dl className="px-5 sm:px-6 py-2 divide-y divide-zinc-100">
              <InfoRow label="Capacity"><span className="tabular-nums">{vendor.capacityPerWeek} / week</span></InfoRow>
              <InfoRow label="Availability">
                <Badge tone={vendor.isAvailable ? "green" : "amber"}>{vendor.isAvailable ? "accepting orders" : "paused in the vendor app"}</Badge>
              </InfoRow>
              <InfoRow label="Balance"><span className="font-semibold tabular-nums">${Number(vendor.earnedBalance || 0).toFixed(2)}</span></InfoRow>
              <InfoRow label="Stripe">
                <Badge tone={vendor.stripePublishableKey ? "green" : "gray"}>{vendor.stripePublishableKey ? "Keys saved" : "Not added"}</Badge>
              </InfoRow>
              <ChipRow label="Markets" items={vendor.marketsCovered} />
              <ChipRow label="Categories" items={vendor.categoriesFulfilled} />
            </dl>
          </Card>

          <Card padded className="bg-gradient-to-br from-[#EAF5FB] to-white border-[#dbeefb]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#329AD4] text-white shadow-sm">
                <Icon name="wallet" className="w-[18px] h-[18px]" />
              </span>
              <h2 className="text-sm font-semibold text-zinc-900">Wallet</h2>
            </div>
            <p className="mt-3 text-sm text-zinc-600">Release payment from a delivered order. That amount goes into this vendor’s wallet, and they withdraw it with the Stripe keys they add.</p>
            <ButtonLink href="/admin/wallet" size="sm" icon="wallet" className="mt-4">Open wallets</ButtonLink>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <dt className="text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-right font-medium text-zinc-900 min-w-0">{children}</dd>
    </div>
  );
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="py-2.5 text-sm">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-1.5 flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-zinc-400">—</span>
        ) : (
          items.map((item, index) => (
            <span key={`${item}-${index}`} className="rounded-md bg-[#f0f8fd] border border-[#dbeefb] px-2 py-0.5 text-xs font-medium text-[#1b5b80]">
              {item}
            </span>
          ))
        )}
      </dd>
    </div>
  );
}
