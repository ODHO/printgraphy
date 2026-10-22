"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

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
    return <div className="py-16 flex justify-center"><div className="w-8 h-8 border-2 border-sky-200 border-t-[#e74b2d] rounded-full animate-spin" /></div>;
  }
  if (!vendor) {
    return <p className="text-base text-zinc-500">Vendor not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href="/admin/vendors" className="text-base font-bold text-[#e74b2d]">← Vendor directory</Link>
        <h1 className="text-2xl font-bold text-zinc-900 mt-1">{vendor.name}</h1>
        <p className="text-base text-zinc-500 mt-1">{vendor.contactName} · {vendor.email} · {vendor.phone}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Acceptance" value={`${performance?.acceptanceRate ?? 0}%`} />
        <Stat label="On time" value={`${performance?.onTimePercentage ?? 0}%`} />
        <Stat label="Reprint rate" value={`${performance?.reprintRate ?? 0}%`} />
        <Stat label="Turnaround" value={`${performance?.avgTurnaroundHours ?? 48}h`} />
      </div>

      <section className="bg-white rounded-3xl border border-zinc-200/80 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-zinc-900">Onboarding status</h2>
          <select value={vendor.status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-zinc-200 px-3 py-2 text-base font-bold">
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="deactivated">Removed</option>
          </select>
        </div>
        <p className="text-base text-zinc-600">Capacity {vendor.capacityPerWeek} / week · Availability {vendor.isAvailable ? "accepting orders" : "paused in the vendor app"} · Balance ${Number(vendor.earnedBalance || 0).toFixed(2)}</p>
        <p className="text-base text-zinc-600">Markets: {vendor.marketsCovered.join(", ") || "—"}</p>
        <p className="text-base text-zinc-600">Categories: {vendor.categoriesFulfilled.join(", ") || "—"}</p>
        <p className="text-base text-zinc-600">Stripe: {vendor.stripePublishableKey ? "Keys saved" : "Not added"}</p>
      </section>

      <section className="bg-white rounded-3xl border border-zinc-200/80 p-5 space-y-3">
        <h2 className="text-base font-bold text-zinc-900">Costs against category benchmarks</h2>
        {costs.length === 0 ? <p className="text-base text-zinc-500">This vendor has not entered any product costs.</p> : (
          <div className="overflow-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="py-2">Product</th>
                  <th className="py-2">Customer price</th>
                  <th className="py-2">Benchmark</th>
                  <th className="py-2">Vendor cost</th>
                  <th className="py-2">Gate</th>
                </tr>
              </thead>
              <tbody>
                {costs.map((cost) => {
                  const outlier = cost.vendorCost > cost.categoryBenchmarkMax;
                  return (
                    <tr key={cost._id} className="border-t border-zinc-100">
                      <td className="py-2 font-bold">{cost.productId?.name || "Product"}</td>
                      <td className="py-2">${Number(cost.productId?.price || 0).toFixed(2)}</td>
                      <td className="py-2">${cost.categoryBenchmarkMin.toFixed(2)} – ${cost.categoryBenchmarkMax.toFixed(2)}</td>
                      <td className="py-2 font-bold">${cost.vendorCost.toFixed(2)}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-full text-base font-bold ${cost.isEligible && !outlier ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {!cost.isEligible ? "Not eligible" : outlier ? "Outlier" : "In range"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-zinc-200/80 p-5 space-y-3">
        <h2 className="text-base font-bold text-zinc-900">Assigned orders ({performance?.openJobs ?? 0} open, {performance?.deliveredJobs ?? 0} delivered in view)</h2>
        {orders.length === 0 ? <p className="text-base text-zinc-500">No orders assigned yet.</p> : orders.map((order) => (
          <Link key={order._id} href={`/admin/orders/${order._id}`} className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2 text-base">
            <span className="font-bold text-[#e74b2d]">{order.orderNumber}</span>
            <span className="text-zinc-500">{order.shippingAddress?.city}, {order.shippingAddress?.state}</span>
            <span>{order.fulfillmentStatus.replaceAll("_", " ")}</span>
            {order.payoutReleasedAt ? <span className="text-emerald-700 font-bold">Paid</span> : order.fulfillmentStatus === "delivered" && order.customerConfirmedAt ? <span className="text-emerald-700 font-bold">Ready to release</span> : order.fulfillmentStatus === "delivered" ? <span className="text-amber-700 font-bold">Waiting on customer</span> : null}
            {order.reprint?.flagged && <span className="text-red-600 font-bold">Reprint</span>}
          </Link>
        ))}
      </section>

      <section className="bg-white rounded-3xl border border-zinc-200/80 p-5 space-y-2">
        <h2 className="text-base font-bold text-zinc-900">Wallet</h2>
        <p className="text-base text-zinc-600">Release payment from a delivered order. That amount goes into this vendor’s wallet, and they withdraw it with the Stripe keys they add.</p>
        <Link href="/admin/wallet" className="inline-block text-base font-bold text-[#e74b2d]">Open wallets</Link>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4">
      <p className="text-base font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-xl font-black text-zinc-900 mt-1">{value}</p>
    </div>
  );
}
