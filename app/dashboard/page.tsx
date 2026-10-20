"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "@/components/useMessageStream";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DraftCardPreview from "@/components/DraftCardPreview";

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
}

interface OrderSummary {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  customerConfirmedAt?: string;
  items: { name: string; quantity: number }[];
}

interface SavedDesign {
  _id: string;
  name: string;
  thumbnail?: string;
  updatedAt: string;
  designData?: any;
}

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  const handleDeleteDraft = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete draft "${name}"?`)) return;

    setDeletingDraftId(id);
    try {
      const res = await fetch(`/api/designs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSavedDesigns((prev) => prev.filter((d) => d._id !== id));
      }
    } catch {} finally {
      setDeletingDraftId(null);
    }
  };

  const formatDate = (rawDate?: string) => {
    if (!rawDate) return "Recently";
    try {
      return new Date(rawDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/orders?limit=3").then((r) => r.json()),
      fetch("/api/designs").then((r) => r.json()),
    ])
      .then(([meData, ordersData, designsData]) => {
        if (!meData.user) {
          router.push("/auth?tab=signin");
          return;
        }
        setUser(meData.user);
        if (ordersData.success) {
          setRecentOrders(ordersData.orders || []);
        }
        if (designsData.success) {
          setSavedDesigns(designsData.designs || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const refreshOrders = useCallback(() => {
    fetch("/api/orders?limit=3")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setRecentOrders(data.orders || []);
      })
      .catch(() => {});
  }, []);

  useLiveRefresh(refreshOrders);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-[#064FE0] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-zinc-900 pb-20">
      {/* Header Bar */}
      <div className="bg-white border-b border-zinc-200">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img src="/logo/logo.png" alt="Printgraphy Logo" className="h-8 w-auto object-contain" />
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-base font-bold text-zinc-600">Customer Account Dashboard</span>
          </div>
          <Link
            href="/browsedesigns"
            className="px-4 py-2 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all shadow-xs"
          >
            + New Design Order
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <p className="text-base font-semibold text-zinc-400 uppercase tracking-wider">Account Overview</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Welcome back, {user ? `${user.firstName} ${user.lastName}` : "Customer"}!
          </h1>
          <p className="text-zinc-400 text-base mt-1">{user?.email}</p>
        </div>

        {/* Quick Nav Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/orders"
            className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-[#064FE0] hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#064FE0] flex items-center justify-center mb-3 group-hover:bg-[#064FE0] group-hover:text-white transition-colors font-bold text-lg">
              📦
            </div>
            <h3 className="font-bold text-zinc-900 text-base">Order History</h3>
            <p className="text-base text-zinc-500 mt-1">Track live printing & delivery</p>
          </Link>

          <Link
            href="/cart"
            className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-[#064FE0] hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#064FE0] flex items-center justify-center mb-3 group-hover:bg-[#064FE0] group-hover:text-white transition-colors font-bold text-lg">
              🛒
            </div>
            <h3 className="font-bold text-zinc-900 text-base">Your Cart</h3>
            <p className="text-base text-zinc-500 mt-1">View pending customized items</p>
          </Link>

          <Link
            href="/dashboard/messages"
            className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-[#064FE0] hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#064FE0] flex items-center justify-center mb-3 group-hover:bg-[#064FE0] group-hover:text-white transition-colors font-bold text-lg">
              💬
            </div>
            <h3 className="font-bold text-zinc-900 text-base">Messages</h3>
            <p className="text-base text-zinc-500 mt-1">Talk with the Printgraphy team</p>
          </Link>

          <Link
            href="/browsedesigns"
            className="p-5 rounded-2xl bg-white border border-zinc-200 hover:border-[#064FE0] hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#064FE0] flex items-center justify-center mb-3 group-hover:bg-[#064FE0] group-hover:text-white transition-colors font-bold text-lg">
              🎨
            </div>
            <h3 className="font-bold text-zinc-900 text-base">Browse Templates</h3>
            <p className="text-base text-zinc-500 mt-1">Select & customize card designs</p>
          </Link>
        </div>

        {/* Saved Designs & Purchased Templates Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">Saved Designs & Purchased Templates</h2>
            <Link href="/browsedesigns" className="text-base font-bold text-[#064FE0] hover:underline">
              Browse All Templates →
            </Link>
          </div>

          {savedDesigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center text-base text-zinc-400">
              No saved designs or purchased templates found yet. Designs you customize or templates you unlock will appear here for instant 1-click reorders.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {savedDesigns.map((d) => {
                const studioHref = `/browsedesigns?designId=${d._id}`;
                const draftCategory = (d.designData as any)?.category || "Business Cards";
                const isPurchased = Boolean((d.designData as any)?.isPurchased);

                return (
                  <div
                    key={d._id}
                    className="group bg-white rounded-3xl border border-zinc-200/80 overflow-hidden shadow-xs hover:shadow-2xl hover:border-[#064FE0] transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Design Studio Frame Preview */}
                      <div className="relative w-full overflow-hidden">
                        <DraftCardPreview design={d} />
                        
                        <div className="absolute top-3 left-3 z-10">
                          <span className={`px-2.5 py-1 rounded-full text-base font-black uppercase tracking-wider shadow-md ${
                            isPurchased 
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950" 
                              : "bg-white/10 backdrop-blur-md border border-white/20 text-white"
                          }`}>
                            {isPurchased ? "★ PURCHASED" : "DRAFT"}
                          </span>
                        </div>

                        <div className="absolute top-3 right-3 z-10">
                          <span className="px-2.5 py-1 rounded-full text-base font-extrabold bg-[#064FE0]/90 text-white shadow-md">
                            {draftCategory}
                          </span>
                        </div>
                      </div>

                      {/* Title & Details */}
                      <div className="p-5 space-y-2">
                        <h3 className="text-base font-extrabold text-zinc-900 group-hover:text-[#064FE0] transition-colors truncate">
                          <Link href={studioHref}>{d.name}</Link>
                        </h3>

                        <p className="text-base text-zinc-500 font-medium">
                          Category: <span className="text-zinc-800 font-bold">{draftCategory}</span>
                        </p>

                        <div className="pt-2 flex items-center justify-between text-base border-t border-zinc-100">
                          <span className="text-base text-zinc-400">Saved {formatDate(d.updatedAt)}</span>
                          <span className="text-base font-bold text-[#064FE0] flex items-center gap-1">
                            <span>✨</span> 3D Studio Ready
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-5 pt-0 flex items-center gap-2">
                      <Link
                        href={studioHref}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl transition-all shadow-xs"
                      >
                        <span>Open in 3D Studio</span>
                        <span>→</span>
                      </Link>

                      <button
                        onClick={() => handleDeleteDraft(d._id, d.name)}
                        disabled={deletingDraftId === d._id}
                        className="p-2.5 bg-zinc-100 hover:bg-red-50 text-zinc-500 hover:text-red-600 rounded-xl transition-all cursor-pointer border border-zinc-200/80"
                        title="Delete Draft"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-base font-bold text-[#064FE0] hover:underline">
              View All Orders →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-3">
              <p className="text-base text-zinc-500 font-medium">You haven&apos;t placed any print orders yet.</p>
              <Link
                href="/browsedesigns"
                className="inline-block px-4 py-2 bg-[#064FE0] hover:bg-[#0439A8] text-white text-base font-bold rounded-xl"
              >
                Create Your First Card
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order._id}
                  href={`/dashboard/orders/${order._id}`}
                  className="block bg-white rounded-2xl border border-zinc-200 p-5 hover:border-[#064FE0] transition-all hover:shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-base text-zinc-900">{order.orderNumber}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-base font-bold uppercase ${
                          order.fulfillmentStatus === "delivered" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          order.fulfillmentStatus === "shipped" ? "bg-sky-50 text-sky-700 border border-sky-200" :
                          order.fulfillmentStatus === "in_production" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        }`}>
                          {order.fulfillmentStatus.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-base text-zinc-400 mt-1">
                        {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item(s)
                        {order.fulfillmentStatus === "delivered" && !order.customerConfirmedAt ? " · Confirm delivery" : ""}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="font-mono font-black text-zinc-900 text-base">${order.totalAmount.toFixed(2)}</span>
                      <span className="text-base font-bold text-[#064FE0]">View Details →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
