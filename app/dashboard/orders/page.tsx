"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLiveRefresh } from "@/components/useMessageStream";

interface Order {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  shippingAddress: { name: string; city: string; state: string };
  trackingNumber?: string;
  customerConfirmedAt?: string;
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await fetch("/api/orders");
    const data = await res.json();
    if (data.success) {
      setOrders(data.orders || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useLiveRefresh(() => {
    fetchOrders(true);
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-zinc-900 pb-20">
      {/* Top Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
           <Link href="/" className="inline-block">
            <img src="/logo/logo.png" alt="Printgraphy Logo" className="h-10 w-auto mx-auto object-contain" />
          </Link>
            <span className="text-zinc-300">/</span>
            <Link href="/dashboard" className="text-base font-semibold text-zinc-500 hover:text-zinc-900">Dashboard</Link>
            <span className="text-zinc-300">/</span>
            <span className="text-base font-semibold text-zinc-900">Orders</span>
          </div>
          <Link href="/browsedesigns" className="px-4 py-2 bg-zinc-900 text-white text-base font-semibold rounded-xl hover:bg-zinc-700 transition-all">
            New Order
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">Order History</h1>
          <p className="text-base text-zinc-500 mt-0.5">Track the status of all your print and packaging orders.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-2xl">
              📦
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-lg">No orders found</h3>
              <p className="text-base text-zinc-500 mt-1">When you place orders, they will appear here with live tracking.</p>
            </div>
            <Link href="/browsedesigns" className="inline-block px-6 py-2.5 bg-zinc-900 text-white text-base font-bold rounded-xl hover:bg-zinc-700 transition-all">
              Browse Designs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-4 shadow-sm hover:border-zinc-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-zinc-900 text-base">{order.orderNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-base font-extrabold uppercase ${
                        order.fulfillmentStatus === "delivered" ? "bg-emerald-100 text-emerald-700" :
                        order.fulfillmentStatus === "shipped" ? "bg-blue-100 text-blue-700" :
                        order.fulfillmentStatus === "in_production" ? "bg-amber-100 text-amber-700" :
                        "bg-zinc-100 text-zinc-600"
                      }`}>
                        {order.fulfillmentStatus.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-base text-zinc-400 mt-1">
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-base text-zinc-400 font-medium">Total</p>
                      <p className="font-black text-zinc-900 text-base">${order.totalAmount.toFixed(2)}</p>
                    </div>
                    {order.fulfillmentStatus === "delivered" && !order.customerConfirmedAt && (
                      <Link href={`/dashboard/orders/${order._id}`} className="px-4 py-2 bg-emerald-700 text-white text-base font-bold rounded-xl">
                        Confirm delivery
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/orders/${order._id}`}
                      className="px-4 py-2 border border-zinc-200 hover:border-zinc-900 text-zinc-900 text-base font-bold rounded-xl transition-all"
                    >
                      View Details
                    </Link>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-base text-zinc-700">
                      <span className="font-semibold">{item.name} × {item.quantity}</span>
                      <span className="font-mono">${item.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {order.trackingNumber && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between text-base text-blue-700">
                    <span>Tracking Number: <strong className="font-mono">{order.trackingNumber}</strong></span>
                    <span className="font-bold">Shipped</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
