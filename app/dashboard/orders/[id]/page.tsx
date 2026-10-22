"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface OrderDetail {
  _id: string;
  orderNumber: string;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  items: {
    name: string;
    thumbnail: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specs: Record<string, string>;
  }[];
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  trackingNumber?: string;
  trackingCarrier?: string;
  customerConfirmedAt?: string;
  payoutQualifiedAt?: string;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setOrder(data.order);
        } else {
          setError(data.message || "Failed to load order details.");
        }
      })
      .catch(() => setError("Error loading order."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border border-zinc-200 text-center max-w-sm">
          <p className="text-red-500 font-semibold text-base mb-4">{error || "Order not found."}</p>
          <Link href="/dashboard/orders" className="px-4 py-2 bg-zinc-900 text-white text-base font-bold rounded-xl">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { key: "pending", label: "Order Placed" },
    { key: "assigned", label: "Vendor Assigned" },
    { key: "in_production", label: "In Production" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === order.fulfillmentStatus);

  return (
    <div className="min-h-screen bg-[#fbfaf7] font-sans text-zinc-900 pb-20">
      {/* Header Bar */}
      <div className="bg-white border-b border-zinc-200">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-block">
            <img src="/logo/printgraphy-brand-v2.png" alt="Printgraphy Logo" className="h-10 w-auto mx-auto object-contain" />
          </Link>
            <span className="text-zinc-300">/</span>
            <Link href="/dashboard/orders" className="text-base font-semibold text-zinc-500 hover:text-zinc-900">Orders</Link>
            <span className="text-zinc-300">/</span>
            <span className="text-base font-mono font-bold text-zinc-900">{order.orderNumber}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Order Header */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
            <div>
              <p className="text-base font-semibold text-zinc-400 uppercase tracking-wider">Order Detail</p>
              <h1 className="text-2xl font-black text-zinc-900 font-mono mt-0.5">{order.orderNumber}</h1>
              <p className="text-base text-zinc-500 mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { dateStyle: "full" })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/api/orders/${order._id}/invoice`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-[#e74b2d] hover:bg-[#c93e23] text-white text-base font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>Print Invoice</span>
              </a>
              <span className={`px-3 py-1 rounded-full text-base font-extrabold uppercase ${
                order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                Payment: {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Fulfillment Progress Tracker */}
          <div className="space-y-3">
            <p className="text-base font-bold text-zinc-700 uppercase tracking-wider">Fulfillment Status</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {steps.map((step, idx) => {
                const isPassed = currentStepIdx >= idx || order.fulfillmentStatus === "delivered";
                const isCurrent = order.fulfillmentStatus === step.key;

                return (
                  <div
                    key={step.key}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isCurrent
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-md"
                        : isPassed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-zinc-100 bg-zinc-50 text-zinc-400"
                    }`}
                  >
                    <div className="text-base mb-1">{isPassed ? "✓" : idx + 1}</div>
                    <p className="text-base font-bold leading-tight">{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {order.fulfillmentStatus === "delivered" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-base font-bold text-emerald-900">The vendor marked this order delivered.</p>
                <p className="text-base text-emerald-800 mt-1">
                  {order.customerConfirmedAt
                    ? `You confirmed it on ${new Date(order.customerConfirmedAt).toLocaleString()}.`
                    : "Confirm that you received it."}
                </p>
              </div>
              {!order.customerConfirmedAt && (
                <button
                  type="button"
                  disabled={confirming}
                  onClick={async () => {
                    setConfirming(true);
                    const response = await fetch(`/api/orders/${order._id}/confirm`, { method: "POST" });
                    const data = await response.json();
                    if (data.success) setOrder(data.order);
                    setConfirming(false);
                  }}
                  className="px-4 py-2 bg-emerald-700 text-white text-base font-bold rounded-xl cursor-pointer disabled:opacity-60"
                >
                  {confirming ? "Confirming..." : "Confirm delivery"}
                </button>
              )}
            </div>
          )}

          {order.trackingNumber && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-900">
              <div>
                <p className="text-base font-semibold">Tracking Information</p>
                <p className="font-mono font-bold text-base mt-0.5">
                  {order.trackingCarrier ? `${order.trackingCarrier}: ` : ""}{order.trackingNumber}
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-600 text-white text-base font-bold rounded-lg self-start sm:self-auto">
                Shipped
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-lg font-bold text-zinc-900">Items Ordered ({order.items.length})</h2>

            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-zinc-200 p-5 flex gap-4">
                  <div className="w-16 h-12 rounded-xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300 text-base">No img</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-zinc-900 text-base">{item.name}</h4>
                        <p className="text-base text-zinc-400 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-zinc-900 text-base">${item.totalPrice.toFixed(2)}</span>
                    </div>

                    {item.specs && Object.keys(item.specs).length > 0 && (
                      <div className="mt-3 bg-zinc-50 rounded-xl p-3 border border-zinc-100 flex flex-wrap gap-2 text-base text-zinc-600">
                        {Object.entries(item.specs).map(([k, v]) => (
                          <span key={k} className="bg-white px-2 py-0.5 rounded-md border border-zinc-200">
                            <strong>{k}:</strong> {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Payment Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
              <h3 className="text-base font-bold text-zinc-400 uppercase tracking-wider">Shipping Address</h3>
              <div className="text-base text-zinc-700 leading-relaxed font-medium">
                <p className="font-bold text-zinc-900 text-base mb-1">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3">
              <h3 className="text-base font-bold text-zinc-400 uppercase tracking-wider">Payment Breakdown</h3>
              <div className="space-y-2 text-base text-zinc-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold">{order.shippingCost === 0 ? "Free" : `$${order.shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="border-t border-zinc-100 pt-2 flex justify-between text-base font-black text-zinc-900">
                  <span>Total Paid</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
