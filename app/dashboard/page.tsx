"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "@/components/useMessageStream";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DraftCardPreview from "@/components/DraftCardPreview";
import CustomerSidebar from "@/components/CustomerSidebar";

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
      fetch("/api/orders?limit=4").then((r) => r.json()),
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
    fetch("/api/orders?limit=4")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setRecentOrders(data.orders || []);
      })
      .catch(() => {});
  }, []);

  useLiveRefresh(refreshOrders);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-160px)] bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-[#329AD4] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full bg-white min-h-[calc(100vh-160px)] font-sans">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row items-start gap-8 lg:gap-12">
          {/* Uniform Left Customer Sidebar */}
          <CustomerSidebar activeItem="Dashboard" />

          {/* Main Dashboard Content */}
          <main className="flex-1 w-full min-w-0 space-y-8 sm:space-y-10">
            {/* Header: Title & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-100">
              <div>
                <h1 className="text-2xl sm:text-[32px] font-extrabold text-zinc-900 tracking-tight">
                  Dashboard
                </h1>
                <p className="text-sm sm:text-base text-zinc-500 mt-1">
                  Welcome back,{" "}
                  <span className="font-semibold text-zinc-800">
                    {user ? `${user.firstName} ${user.lastName}` : "Customer"}
                  </span>
                  ! Here is an overview of your recent print orders and projects.
                </p>
              </div>
              <Link
                href="/browsedesigns"
                className="px-6 py-3 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm sm:text-base font-semibold rounded-full shadow-sm transition-all self-start sm:self-center whitespace-nowrap cursor-pointer"
              >
                + New Order
              </Link>
            </div>

            {/* Clean Summary Metric Cards (Matching light-blue palette) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/dashboard/orders"
                className="bg-[#EAF5FB] hover:bg-[#EAF5FB] border border-sky-100/70 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#329AD4]">
                    Orders
                  </span>
                  <span className="text-xl">📦</span>
                </div>
                <p className="text-2xl font-extrabold text-zinc-900">
                  {recentOrders.length}
                </p>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium group-hover:text-[#329AD4] transition-colors">
                  View order history →
                </p>
              </Link>

              <a
                href="#projects"
                className="bg-[#EAF5FB] hover:bg-[#EAF5FB] border border-sky-100/70 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#329AD4]">
                    Projects
                  </span>
                  <span className="text-xl">🎨</span>
                </div>
                <p className="text-2xl font-extrabold text-zinc-900">
                  {savedDesigns.length}
                </p>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium group-hover:text-[#329AD4] transition-colors">
                  View saved drafts →
                </p>
              </a>

              <Link
                href="/dashboard/notifications"
                className="bg-[#EAF5FB] hover:bg-[#EAF5FB] border border-sky-100/70 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#329AD4]">
                    Updates
                  </span>
                  <span className="text-xl">🔔</span>
                </div>
                <p className="text-2xl font-extrabold text-zinc-900">5</p>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium group-hover:text-[#329AD4] transition-colors">
                  View notifications →
                </p>
              </Link>

              <Link
                href="/profile"
                className="bg-[#EAF5FB] hover:bg-[#EAF5FB] border border-sky-100/70 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#329AD4]">
                    Settings
                  </span>
                  <span className="text-xl">⚙️</span>
                </div>
                <p className="text-base font-bold text-zinc-900 truncate">
                  {user?.firstName || "Account"}
                </p>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium group-hover:text-[#329AD4] transition-colors">
                  Manage profile & address →
                </p>
              </Link>
            </div>

            {/* ── Recent Orders Section ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
                  Recent Orders
                </h2>
                <Link
                  href="/dashboard/orders"
                  className="text-sm font-semibold text-[#329AD4] hover:underline"
                >
                  View All Orders →
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="bg-[#EAF5FB] rounded-2xl border border-sky-100 p-8 text-center space-y-3">
                  <p className="text-base text-zinc-600 font-medium">
                    You haven&apos;t placed any print orders yet.
                  </p>
                  <Link
                    href="/browsedesigns"
                    className="inline-block px-6 py-2.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm font-semibold rounded-full shadow-sm transition-all"
                  >
                    Create Your First Card
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order._id}
                      className="bg-white rounded-2xl border border-zinc-300/80 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-base text-zinc-900">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase ${
                              order.fulfillmentStatus === "delivered"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : order.fulfillmentStatus === "shipped"
                                ? "bg-sky-50 text-[#329AD4] border border-sky-200"
                                : order.fulfillmentStatus === "in_production"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                            }`}
                          >
                            {order.fulfillmentStatus.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-500">
                          Placed on {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                          {order.items.length} item(s)
                        </p>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <span className="font-mono font-bold text-zinc-900 text-base sm:text-lg">
                          ${order.totalAmount.toFixed(2)}
                        </span>
                        <Link
                          href={`/dashboard/orders/${order._id}`}
                          className="px-6 py-2.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm font-semibold rounded-full shadow-sm transition-all"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Recent Projects / Saved Designs Section ── */}
            <div id="projects" className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
                  Recent Projects
                </h2>
                <Link
                  href="/browsedesigns"
                  className="text-sm font-semibold text-[#329AD4] hover:underline"
                >
                  Browse Templates →
                </Link>
              </div>

              {savedDesigns.length === 0 ? (
                <div className="bg-[#EAF5FB] rounded-2xl border border-sky-100 p-8 text-center space-y-3">
                  <p className="text-base text-zinc-600 font-medium">
                    No saved projects or custom drafts found yet.
                  </p>
                  <p className="text-sm text-zinc-400">
                    Custom designs created in the 3D studio will automatically be saved here.
                  </p>
                  <Link
                    href="/browsedesigns"
                    className="inline-block px-6 py-2.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm font-semibold rounded-full shadow-sm transition-all mt-2"
                  >
                    Start a New Project
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {savedDesigns.map((d) => {
                    const studioHref = `/customize?designId=${d._id}`;
                    const draftCategory =
                      (d.designData as any)?.category || "Business Cards";
                    const isPurchased = Boolean((d.designData as any)?.isPurchased);

                    return (
                      <div
                        key={d._id}
                        className="bg-white rounded-2xl border border-zinc-300/80 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-[#329AD4] transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Design Preview Frame */}
                          <div className="relative w-full overflow-hidden bg-zinc-50">
                            <DraftCardPreview design={d} />

                            <div className="absolute top-3 left-3 z-10">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                                  isPurchased
                                    ? "bg-amber-400 text-zinc-900"
                                    : "bg-black/60 text-white backdrop-blur-xs"
                                }`}
                              >
                                {isPurchased ? "PURCHASED" : "DRAFT"}
                              </span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="p-5 space-y-1.5">
                            <h3 className="font-bold text-zinc-900 text-base group-hover:text-[#329AD4] transition-colors truncate">
                              <Link href={studioHref}>{d.name}</Link>
                            </h3>
                            <p className="text-xs text-zinc-500">
                              {draftCategory} · Saved {formatDate(d.updatedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-5 pt-0 flex items-center gap-2">
                          <Link
                            href={studioHref}
                            className="flex-1 py-2.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-sm font-semibold rounded-full text-center shadow-sm transition-all"
                          >
                            Open Studio →
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(d._id, d.name)}
                            disabled={deletingDraftId === d._id}
                            className="p-2.5 bg-zinc-100 hover:bg-red-50 text-zinc-500 hover:text-red-600 rounded-full transition-all cursor-pointer"
                            title="Delete Draft"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
