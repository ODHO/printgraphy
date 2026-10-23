"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import CustomerSidebar from "@/components/CustomerSidebar";
import { STUDIO_LAYOUT } from "@/lib/cardRender";
import { mediaSrc } from "@/lib/mediaUrl";

const ThreeDCardPreview = dynamic(() => import("@/components/ThreeDCardPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-[#0a0d14] text-sm text-zinc-400">
      Loading 3D preview…
    </div>
  ),
});

interface OrderItem {
  name: string;
  thumbnail: string;
  backThumbnail?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specs: Record<string, string>;
}

interface OrderDetail {
  _id: string;
  orderNumber: string;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  items: OrderItem[];
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

function normalizeSpecs(specs: unknown): Record<string, string> {
  if (!specs) return {};
  if (specs instanceof Map) return Object.fromEntries(specs.entries());
  if (typeof specs === "object") return specs as Record<string, string>;
  return {};
}

function OrderItemCard({ item }: { item: OrderItem }) {
  const [side, setSide] = useState<"front" | "back">("front");
  const frontSrc = mediaSrc(item.thumbnail) || item.thumbnail || "";
  const backSrc = mediaSrc(item.backThumbnail) || item.backThumbnail || frontSrc;
  const specs = normalizeSpecs(item.specs);
  const hasPreview = Boolean(frontSrc);

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-zinc-900">{item.name}</h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            Qty {item.quantity} · ${item.unitPrice.toFixed(2)} each
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasPreview && (
            <div className="inline-flex rounded-xl bg-zinc-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSide("front")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${
                  side === "front" ? "bg-[#064FE0] text-white" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setSide("back")}
                className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${
                  side === "back" ? "bg-[#064FE0] text-white" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Back
              </button>
            </div>
          )}
          <span className="text-base font-black text-zinc-900">${item.totalPrice.toFixed(2)}</span>
        </div>
      </div>

      {hasPreview ? (
        <div className="relative bg-[#0a0d14]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(6,79,224,0.2),transparent_55%)]" />
          <div className="relative h-[360px] sm:h-[420px]">
            <ThreeDCardPreview
              frontDesign={{ bgImage: frontSrc, bgFit: "cover", bgColor: "#18181b" }}
              backDesign={{ bgImage: backSrc, bgFit: "cover", bgColor: "#141414" }}
              bgColor="#18181b"
              backBgColor="#141414"
              logoText=""
              textLayers={[]}
              side={side}
              onSideChange={setSide}
              cardLayout={STUDIO_LAYOUT}
              cornerRadius={0}
              canvasConfig={{
                side_mode: "double",
                sides_count: 2,
                sides_names: ["Front", "Back"],
                supports_back_side: true,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center bg-zinc-50 text-sm text-zinc-400">
          No design preview available for this item
        </div>
      )}

      {Object.keys(specs).length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 bg-zinc-50/80 px-5 py-4">
          {Object.entries(specs).map(([key, value]) => (
            <span
              key={key}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600"
            >
              <strong className="text-zinc-800">{key}:</strong> {value}
            </span>
          ))}
        </div>
      )}
    </article>
  );
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
        if (data.success) setOrder(data.order);
        else setError(data.message || "Failed to load order details.");
      })
      .catch(() => setError("Error loading order."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fbfd]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-[#064FE0]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fbfd] p-4">
        <div className="max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <p className="mb-4 text-base font-semibold text-red-500">{error || "Order not found."}</p>
          <Link href="/dashboard/orders" className="rounded-xl bg-zinc-900 px-4 py-2 text-base font-bold text-white">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { key: "pending", label: "Placed" },
    { key: "assigned", label: "Assigned" },
    { key: "in_production", label: "Production" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];
  const currentStepIdx = steps.findIndex((s) => s.key === order.fulfillmentStatus);

  return (
    <div className="min-h-screen bg-[#f8fbfd] font-sans text-zinc-900">
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <CustomerSidebar activeItem="My Orders" />

        <main className="min-w-0 flex-1 space-y-6 pb-16">
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <Link href="/dashboard" className="font-semibold hover:text-[#064FE0]">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/dashboard/orders" className="font-semibold hover:text-[#064FE0]">
              Orders
            </Link>
            <span>/</span>
            <span className="font-mono font-bold text-zinc-900">{order.orderNumber}</span>
          </div>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-4 border-b border-zinc-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#064FE0]">Order detail</p>
                <h1 className="mt-1 font-mono text-2xl font-black text-zinc-900">{order.orderNumber}</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { dateStyle: "full" })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/orders/${order._id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#064FE0] px-3.5 py-2 text-sm font-bold text-white transition hover:bg-[#0439A8]"
                >
                  Print Invoice
                </a>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${
                    order.paymentStatus === "paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  Payment: {order.paymentStatus}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Fulfillment</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {steps.map((step, idx) => {
                  const isPassed = currentStepIdx >= idx || order.fulfillmentStatus === "delivered";
                  const isCurrent = order.fulfillmentStatus === step.key;
                  return (
                    <div
                      key={step.key}
                      className={`rounded-2xl border p-3 text-center transition ${
                        isCurrent
                          ? "border-[#064FE0] bg-[#064FE0] text-white"
                          : isPassed
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-zinc-100 bg-zinc-50 text-zinc-400"
                      }`}
                    >
                      <div className="mb-1 text-sm font-bold">{isPassed ? "✓" : idx + 1}</div>
                      <p className="text-xs font-bold leading-tight sm:text-sm">{step.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {order.fulfillmentStatus === "delivered" && (
              <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold text-emerald-900">The vendor marked this order delivered.</p>
                  <p className="mt-1 text-sm text-emerald-800">
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
                    className="cursor-pointer rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {confirming ? "Confirming..." : "Confirm delivery"}
                  </button>
                )}
              </div>
            )}

            {order.trackingNumber && (
              <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold">Tracking</p>
                  <p className="mt-0.5 font-mono text-sm font-bold">
                    {order.trackingCarrier ? `${order.trackingCarrier}: ` : ""}
                    {order.trackingNumber}
                  </p>
                </div>
                <span className="self-start rounded-lg bg-[#064FE0] px-3 py-1 text-sm font-bold text-white sm:self-auto">
                  Shipped
                </span>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-8">
              <h2 className="text-lg font-bold text-zinc-900">Items Ordered ({order.items.length})</h2>
              <div className="space-y-5">
                {order.items.map((item, idx) => (
                  <OrderItemCard key={`${item.name}-${idx}`} item={item} />
                ))}
              </div>
            </div>

            <div className="space-y-5 xl:col-span-4">
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Shipping Address</h3>
                <div className="mt-3 space-y-0.5 text-sm font-medium leading-relaxed text-zinc-700">
                  <p className="mb-1 text-base font-bold text-zinc-900">{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Payment Breakdown</h3>
                <div className="mt-3 space-y-2 text-sm text-zinc-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-semibold">
                      {order.shippingCost === 0 ? "Free" : `$${order.shippingCost.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-100 pt-2 text-base font-black text-zinc-900">
                    <span>Total Paid</span>
                    <span>${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
