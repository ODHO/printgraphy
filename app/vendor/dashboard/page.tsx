"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import MessagePanel from "@/components/MessagePanel";
import { useLiveRefresh } from "@/components/useMessageStream";
import VendorSidebar, { type VendorTab } from "../_components/VendorSidebar";

interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  specs?: Record<string, string>;
}

interface VendorOrder {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  createdAt: string;
  notes?: string;
  fulfillmentStatus?: string;
  vendorPayment?: number;
  reprint?: { flagged?: boolean; amount?: number };
  shippedAt?: string;
  payoutQualifiedAt?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
}

interface ProductItem {
  _id: string;
  name: string;
  price: number;
}

interface CatalogEntry {
  _id: string;
  vendorCost: number;
  categoryBenchmarkMin: number;
  categoryBenchmarkMax: number;
  isEligible: boolean;
  name?: string;
  productId?: { _id: string; name: string; price: number } | string;
}

interface VendorProfile {
  _id: string;
  name: string;
  status: string;
  isAvailable: boolean;
  stripeAccountId: string;
  stripePublishableKey?: string;
  stripeSecretSaved?: boolean;
  stripeAccountEmail?: string;
  accountHolderName?: string;
  earnedBalance: number;
  marketsCovered: string[];
  categoriesFulfilled: string[];
  payouts: { amount: number; note: string; createdAt: string }[];
  metrics: {
    acceptanceRate: number;
    onTimePercentage: number;
    reprintRate: number;
  };
}

const STATUS_LABEL: Record<string, string> = {
  assigned: "Assigned",
  in_production: "In Production",
  shipped: "Shipped",
  delivered: "Delivered",
};

function money(value: number) {
  return `$ ${Number(value || 0).toFixed(2)}`;
}

function formatCount(num: number | undefined, defaultVal: number): string {
  const val = num !== undefined && num !== null && num >= 0 ? num : defaultVal;
  return val < 10 ? `0${val}` : `${val}`;
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<VendorTab>("dashboard");
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [jobs, setJobs] = useState<VendorOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, { number: string; carrier: string }>>({});

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [vendorCostInput, setVendorCostInput] = useState("");
  const [costNotice, setCostNotice] = useState("");
  const [savingCost, setSavingCost] = useState(false);
  const [stripePublishable, setStripePublishable] = useState("");
  const [stripeSecret, setStripeSecret] = useState("");
  const [stripeEmail, setStripeEmail] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletEntries, setWalletEntries] = useState<{ type: string; amount: number; note: string; createdAt: string }[]>([]);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [reprintTotal, setReprintTotal] = useState(0);
  const [savingStripe, setSavingStripe] = useState(false);
  const [unread, setUnread] = useState(0);

  // ── Role-based Access Control & Profile loading ──
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor/profile");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfile({
          _id: "default-facility",
          name: "Print Facility Portal",
          status: "active",
          isAvailable: true,
          stripeAccountId: "",
          earnedBalance: 0,
          marketsCovered: ["All Markets"],
          categoriesFulfilled: ["Business Cards", "Post Cards", "Signs & Banners"],
          payouts: [],
          metrics: { acceptanceRate: 100, onTimePercentage: 100, reprintRate: 0 },
        });
        return null;
      }
      setProfile(data.vendor);
      setStripePublishable(data.vendor.stripePublishableKey || "");
      setStripeSecret("");
      setStripeEmail(data.vendor.stripeAccountEmail || "");
      setAccountHolder(data.vendor.accountHolderName || "");
      setPendingBalance(data.wallet?.pending || 0);
      setReprintTotal(data.wallet?.reprintTotal || 0);
      setWalletEntries(data.wallet?.entries || []);
      return data.vendor as VendorProfile;
    } catch {
      setProfile({
        _id: "default-facility",
        name: "Print Facility Portal",
        status: "active",
        isAvailable: true,
        stripeAccountId: "",
        earnedBalance: 0,
        marketsCovered: ["All Markets"],
        categoriesFulfilled: ["Business Cards", "Post Cards", "Signs & Banners"],
        payouts: [],
        metrics: { acceptanceRate: 100, onTimePercentage: 100, reprintRate: 0 },
      });
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, [router]);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoadingOrders(true);
    try {
      const [availableRes, mineRes] = await Promise.all([
        fetch("/api/vendor/orders/available"),
        fetch("/api/vendor/orders/mine"),
      ]);
      const available = await availableRes.json();
      const mine = await mineRes.json();
      if (available.success) setOrders(available.orders || []);
      if (mine.success) setJobs(mine.orders || []);
    } catch (err) {
      console.error("Error loading vendor orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const catalogRes = await fetch("/api/vendor/catalog");
      const catalogData = await catalogRes.json();
      if (catalogData.success) {
        setProducts(catalogData.categories || []);
        setCatalog(catalogData.vendorProducts || []);
      }
    } catch (err) {
      console.error("Error loading catalog:", err);
    }
  }, []);

  const loadUnread = useCallback(() => {
    fetch("/api/vendor/messages/unread")
      .then((response) => response.json())
      .then((data) => setUnread(data.success ? data.total || 0 : 0))
      .catch(() => setUnread(0));
  }, []);

  useEffect(() => {
    loadProfile();
    loadOrders();
    loadCatalog();
    loadUnread();
  }, [loadProfile, loadOrders, loadCatalog, loadUnread]);

  useLiveRefresh(() => {
    loadProfile();
    loadOrders(true);
    loadCatalog();
  });

  useEffect(() => {
    const onCount = (event: Event) => setUnread((event as CustomEvent<number>).detail || 0);
    const onLive = () => window.setTimeout(loadUnread, 400);
    window.addEventListener("xprints-unread", onCount);
    window.addEventListener("xprints-live", onLive);
    return () => {
      window.removeEventListener("xprints-unread", onCount);
      window.removeEventListener("xprints-live", onLive);
    };
  }, [loadUnread]);

  const selectedProduct = products.find((product) => product._id === selectedProductId);
  const benchmarkMin = selectedProduct ? selectedProduct.price * 0.4 : 0;
  const benchmarkMax = selectedProduct ? selectedProduct.price * 0.6 : 0;
  const costCap = selectedProduct ? selectedProduct.price * 0.75 : 0;

  const setAvailability = async (isAvailable: boolean) => {
    setNotice("");
    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.vendor);
        loadOrders();
      } else {
        setNotice(data.message || "Could not update availability.");
      }
    } catch {
      setNotice("Failed to update availability.");
    }
  };

  const claim = async (orderId: string) => {
    setBusyId(orderId);
    setNotice("");
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/accept`, { method: "POST" });
      const data = await res.json();
      setNotice(data.success ? `Order ${data.order?.orderNumber || ""} accepted successfully.` : data.message || "Could not accept order.");
      if (data.success) setTab("jobs");
    } catch {
      setNotice("Error claiming order.");
    } finally {
      setBusyId(null);
      loadOrders();
    }
  };

  const decline = async (orderId: string) => {
    setBusyId(orderId);
    try {
      await fetch(`/api/vendor/orders/${orderId}/decline`, { method: "POST" });
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
      loadOrders();
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    setBusyId(orderId);
    setNotice("");
    const ship = tracking[orderId] || { number: "", carrier: "UPS" };
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          trackingNumber: ship.number,
          trackingCarrier: ship.carrier,
        }),
      });
      const data = await res.json();
      setNotice(data.success ? "Job updated successfully." : data.message || "Could not update the job.");
      if (data.success && status === "delivered") loadProfile();
    } catch {
      setNotice("Failed to update job status.");
    } finally {
      setBusyId(null);
      loadOrders();
    }
  };

  const release = async (orderId: string) => {
    setBusyId(orderId);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/release`, { method: "POST" });
      const data = await res.json();
      setNotice(data.success ? "Order returned to queue." : data.message || "Could not release order.");
    } catch {
      setNotice("Failed to release order.");
    } finally {
      setBusyId(null);
      loadOrders();
    }
  };

  const saveCost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProductId || !vendorCostInput) return;
    setSavingCost(true);
    setCostNotice("");
    try {
      const res = await fetch("/api/vendor/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedProductId, vendorCost: parseFloat(vendorCostInput) }),
      });
      const data = await res.json();
      setCostNotice(data.marginNotice || data.message || "Cost saved.");
      if (data.success) {
        setVendorCostInput("");
        loadCatalog();
      }
    } catch {
      setCostNotice("Failed to save cost.");
    } finally {
      setSavingCost(false);
    }
  };

  const saveStripe = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingStripe(true);
    setNotice("");
    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripePublishableKey: stripePublishable,
          stripeSecretKey: stripeSecret,
          stripeAccountEmail: stripeEmail,
          accountHolderName: accountHolder,
        }),
      });
      const data = await res.json();
      setNotice(data.success ? "Stripe settings updated successfully." : data.message || "Could not save Stripe keys.");
      if (data.success) {
        setStripeSecret("");
        setProfile(data.vendor);
        setPendingBalance(data.wallet?.pending || 0);
        setReprintTotal(data.wallet?.reprintTotal || 0);
        setWalletEntries(data.wallet?.entries || []);
      }
    } catch {
      setNotice("Error updating Stripe settings.");
    } finally {
      setSavingStripe(false);
    }
  };

  const withdraw = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice("");
    try {
      const response = await fetch("/api/vendor/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(withdrawAmount) }),
      });
      const data = await response.json();
      setNotice(data.message || (data.success ? "Withdrawal processed." : "Could not withdraw."));
      if (data.success) {
        setWithdrawAmount("");
        loadProfile();
      }
    } catch {
      setNotice("Withdrawal failed.");
    }
  };

  const accepting = Boolean(profile?.isAvailable && profile.status === "active");

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-sky-100 border-t-[#329AD4] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 flex flex-col justify-between">
      <div className="w-full">
        {/* Main Body: Left Sidebar + Right Content matching Admin Layout */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Vendor Navigation Sidebar */}
          <VendorSidebar
            currentTab={tab}
            onSelectTab={setTab}
            vendorName={profile?.name || "Vendor Facility"}
            isAvailable={accepting}
            onToggleAvailability={setAvailability}
            unreadCount={unread}
            incomingCount={orders.length}
            jobsCount={jobs.length}
          />

          {/* Right Main Content */}
          <main className="flex-1 w-full min-w-0 space-y-6">
            {/* Header Title & Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
                  {profile?.name ? `${profile.name} — Vendor Portal` : "Vendor Portal"}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                  Manage print production, fulfill incoming orders, and track your printing payouts.
                </p>
              </div>

              {/* Fulfilled Category Badges */}
              {profile && profile.categoriesFulfilled.length > 0 && (
                <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
                  {profile.categoriesFulfilled.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-[#EAF5FB] border border-sky-100 px-3 py-1 text-xs font-semibold text-[#329AD4]"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notification alert banner */}
            {notice && (
              <div className="p-3.5 bg-sky-50 border border-sky-200 text-[#329AD4] text-xs sm:text-sm rounded-xl font-semibold flex items-center justify-between">
                <span>{notice}</span>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  className="text-zinc-400 hover:text-zinc-700 cursor-pointer ml-3"
                >
                  ✕
                </button>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                THE 6 SIGNATURE STAT CARDS (Exact Admin Dimensions & Colors)
            ───────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* 1. Available Balance */}
              <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
                <p className="text-sm font-semibold text-zinc-800">Available Balance</p>
                <p className="text-3xl lg:text-4xl font-normal text-zinc-900 text-center my-3">
                  {money(profile?.earnedBalance || 0)}
                </p>
                <p className="text-[11px] text-zinc-500 text-center">Ready for withdrawal</p>
              </div>

              {/* 2. Pending Payouts */}
              <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
                <p className="text-sm font-semibold text-zinc-800">Pending Payouts</p>
                <p className="text-3xl lg:text-4xl font-normal text-zinc-900 text-center my-3">
                  {money(pendingBalance)}
                </p>
                <p className="text-[11px] text-zinc-500 text-center">In production / delivered</p>
              </div>

              {/* 3. Incoming Orders */}
              <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
                <p className="text-sm font-semibold text-zinc-800">Incoming Orders</p>
                <p className="text-4xl lg:text-5xl font-normal text-zinc-900 text-center my-3">
                  {formatCount(orders.length, 0)}
                </p>
                <p className="text-[11px] text-zinc-500 text-center">Awaiting claim</p>
              </div>

              {/* 4. Active Jobs */}
              <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
                <p className="text-sm font-semibold text-zinc-800">Active Jobs</p>
                <p className="text-4xl lg:text-5xl font-normal text-zinc-900 text-center my-3">
                  {formatCount(jobs.length, 0)}
                </p>
                <p className="text-[11px] text-zinc-500 text-center">In printing / shipping</p>
              </div>

              {/* 5. Acceptance Rate */}
              <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
                <p className="text-sm font-semibold text-zinc-800">Acceptance Rate</p>
                <p className="text-4xl lg:text-5xl font-normal text-zinc-900 text-center my-3">
                  {profile?.metrics?.acceptanceRate ?? 100}%
                </p>
                <p className="text-[11px] text-emerald-600 font-medium text-center">Benchmark: &gt; 95%</p>
              </div>

              {/* 6. Reprint Rate */}
              <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
                <p className="text-sm font-semibold text-zinc-800">Reprint Rate</p>
                <p className="text-4xl lg:text-5xl font-normal text-zinc-900 text-center my-3">
                  {profile?.metrics?.reprintRate ?? 0}%
                </p>
                <p className="text-[11px] text-zinc-500 text-center">Quality score</p>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                MAIN TABS CONTENT (Dashboard, Incoming, Jobs, Catalog, Earnings, Messages)
            ───────────────────────────────────────────────────────────── */}

            {/* TAB: Dashboard (Overview showing recent Incoming & Active Jobs side-by-side) */}
            {tab === "dashboard" && (
              <div className="space-y-6">
                {/* Incoming Orders Section */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-100 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-zinc-900">
                        Incoming Print Orders ({orders.length})
                      </h2>
                      <p className="text-xs text-zinc-500">First facility to accept the job claims it.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab("incoming")}
                      className="text-xs font-semibold text-[#329AD4] hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div className="py-8 text-center">
                      <div className="w-6 h-6 border-2 border-sky-100 border-t-[#329AD4] rounded-full animate-spin mx-auto" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-8 text-center text-xs sm:text-sm text-zinc-500 bg-[#F9FAFB] rounded-xl border border-zinc-100">
                      {accepting
                        ? "No incoming orders in your market area currently."
                        : "Availability is paused. Toggle 'Accepting Orders' to receive incoming print jobs."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 3).map((order) => (
                        <OrderCard
                          key={order._id}
                          order={order}
                          open={openId === order._id}
                          onToggle={() => setOpenId(openId === order._id ? null : order._id)}
                          actions={
                            <>
                              <button
                                type="button"
                                onClick={() => decline(order._id)}
                                disabled={busyId === order._id}
                                className="px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                              >
                                Decline
                              </button>
                              <button
                                type="button"
                                onClick={() => claim(order._id)}
                                disabled={busyId === order._id}
                                className="px-5 py-2 bg-[#329AD4] hover:bg-[#2884b8] text-white font-semibold text-xs rounded-full shadow-sm transition cursor-pointer disabled:opacity-50"
                              >
                                {busyId === order._id ? "Claiming..." : "Accept Order"}
                              </button>
                            </>
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Jobs Section */}
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-100 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-zinc-900">
                        Active Production Jobs ({jobs.length})
                      </h2>
                      <p className="text-xs text-zinc-500">Orders currently in fulfillment.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab("jobs")}
                      className="text-xs font-semibold text-[#329AD4] hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  {jobs.length === 0 ? (
                    <div className="py-8 text-center text-xs sm:text-sm text-zinc-500 bg-[#F9FAFB] rounded-xl border border-zinc-100">
                      No active production jobs yet. Accept incoming orders above to begin printing.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.slice(0, 3).map((order) => renderJobCard(order))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Incoming Orders */}
            {tab === "incoming" && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-zinc-900">
                      Incoming Orders Queue ({orders.length})
                    </h2>
                    <p className="text-xs text-zinc-500">First facility to accept the job claims it.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadOrders()}
                    className="px-4 py-2 bg-[#EAF5FB] hover:bg-sky-100 text-[#329AD4] text-xs font-semibold rounded-full transition cursor-pointer"
                  >
                    Refresh Queue
                  </button>
                </div>

                {loadingOrders ? (
                  <div className="py-12 text-center">
                    <div className="w-8 h-8 border-2 border-sky-100 border-t-[#329AD4] rounded-full animate-spin mx-auto" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-12 text-center text-sm text-zinc-500 bg-[#F9FAFB] rounded-2xl border border-zinc-100 p-8">
                    {accepting
                      ? "No new orders currently match your covered market and catalog."
                      : "Availability is currently paused. Switch on 'Accepting Orders' in the sidebar."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        open={openId === order._id}
                        onToggle={() => setOpenId(openId === order._id ? null : order._id)}
                        actions={
                          <>
                            <button
                              type="button"
                              onClick={() => decline(order._id)}
                              disabled={busyId === order._id}
                              className="px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => claim(order._id)}
                              disabled={busyId === order._id}
                              className="px-6 py-2 bg-[#329AD4] hover:bg-[#2884b8] text-white font-semibold text-xs rounded-full shadow-sm transition cursor-pointer disabled:opacity-50"
                            >
                              {busyId === order._id ? "Claiming..." : "Accept Order"}
                            </button>
                          </>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: My Jobs */}
            {tab === "jobs" && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-100 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-zinc-900">
                      My Production Jobs ({jobs.length})
                    </h2>
                    <p className="text-xs text-zinc-500">Track and update orders currently in production.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadOrders()}
                    className="px-4 py-2 bg-[#EAF5FB] hover:bg-sky-100 text-[#329AD4] text-xs font-semibold rounded-full transition cursor-pointer"
                  >
                    Refresh Jobs
                  </button>
                </div>

                {jobs.length === 0 ? (
                  <div className="py-12 text-center text-sm text-zinc-500 bg-[#F9FAFB] rounded-2xl border border-zinc-100 p-8">
                    Accepted orders show up here for printing, packing, and dispatch.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.map((order) => renderJobCard(order))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Catalog Costs & Benchmark Pricing */}
            {tab === "catalog" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form to set unit cost */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Set Category Unit Cost</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Enter your wholesale fulfillment cost for each category.
                    </p>
                  </div>

                  {costNotice && (
                    <div className="p-3 bg-[#EAF5FB] border border-sky-100 text-[#329AD4] text-xs rounded-xl font-semibold">
                      {costNotice}
                    </div>
                  )}

                  <form onSubmit={saveCost} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">Select Category</label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-[#329AD4] focus:ring-2 focus:ring-[#329AD4]/20"
                      >
                        <option value="">Select category...</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} · Retail price: {money(p.price)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedProduct && (
                      <div className="bg-[#EAF5FB] rounded-xl p-3 border border-sky-100 text-xs text-zinc-700 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-semibold">Recommended range:</span>
                          <span>{money(benchmarkMin)} – {money(benchmarkMax)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">Cost Ceiling Cap:</span>
                          <span className="text-amber-700 font-bold">{money(costCap)}</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">Your Unit Production Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={vendorCostInput}
                        onChange={(e) => setVendorCostInput(e.target.value)}
                        placeholder="e.g. 15.50"
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-[#329AD4] focus:ring-2 focus:ring-[#329AD4]/20 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingCost || !selectedProductId}
                      className="w-full py-2.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-xs font-semibold rounded-full shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      {savingCost ? "Saving Cost..." : "Save Cost Benchmark"}
                    </button>
                  </form>
                </div>

                {/* Saved Catalog List */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Configured Catalog Margins</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Your active category fulfillment rates.</p>
                  </div>

                  {catalog.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 bg-[#F9FAFB] rounded-xl border border-zinc-100">
                      No category costs configured yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5 divide-y divide-zinc-100">
                      {catalog.map((entry) => {
                        const product = typeof entry.productId === "object" ? entry.productId : null;
                        return (
                          <div key={entry._id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-zinc-900">
                                {entry.name || product?.name || "Category"}
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                Benchmark: {money(entry.categoryBenchmarkMin)} – {money(entry.categoryBenchmarkMax)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-zinc-900 font-mono">
                                {money(entry.vendorCost)}
                              </p>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  entry.isEligible
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {entry.isEligible ? "Eligible" : "Above Cap"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Earnings & Wallet */}
            {tab === "earnings" && profile && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Wallet & Withdrawal */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Wallet & Instant Payout</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Withdraw available printing proceeds to bank.</p>
                  </div>

                  <div className="bg-[#EAF5FB] rounded-2xl p-5 border border-sky-100">
                    <p className="text-xs font-semibold text-zinc-700">Available Balance</p>
                    <p className="text-3xl font-bold text-emerald-600 my-1 font-mono">
                      {money(profile.earnedBalance)}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-600 pt-1">
                      <span>Pending release: {money(pendingBalance)}</span>
                      {reprintTotal > 0 && <span className="text-red-500 font-medium">Reprint deductions: −{money(reprintTotal)}</span>}
                    </div>
                  </div>

                  <form onSubmit={withdraw} className="space-y-3 pt-2">
                    <label className="block text-xs font-semibold text-zinc-700">Withdraw Amount ($)</label>
                    <div className="flex gap-2">
                      <input
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="Enter amount"
                        className="flex-1 bg-white border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 font-mono focus:outline-none focus:border-[#329AD4] focus:ring-2 focus:ring-[#329AD4]/20"
                      />
                      <button
                        type="submit"
                        disabled={!withdrawAmount || Number(withdrawAmount) <= 0}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-full shadow-sm transition cursor-pointer disabled:opacity-50"
                      >
                        Withdraw
                      </button>
                    </div>
                  </form>
                </div>

                {/* Stripe Connected Account Keys */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900">Payout Account Settings</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Stripe keys for direct automated bank transfers.</p>
                  </div>

                  <form onSubmit={saveStripe} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">Account Holder Name</label>
                      <input
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        placeholder="Facility or Legal Name"
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-[#329AD4]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">Stripe Account Email</label>
                      <input
                        value={stripeEmail}
                        onChange={(e) => setStripeEmail(e.target.value)}
                        type="email"
                        placeholder="payouts@facility.com"
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-[#329AD4]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">Publishable Key</label>
                      <input
                        value={stripePublishable}
                        onChange={(e) => setStripePublishable(e.target.value)}
                        placeholder="pk_test_... or pk_live_..."
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 font-mono focus:outline-none focus:border-[#329AD4]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">Secret Key</label>
                      <input
                        value={stripeSecret}
                        onChange={(e) => setStripeSecret(e.target.value)}
                        type="password"
                        placeholder={profile.stripeSecretSaved ? "Secret key saved (enter new to update)" : "sk_test_... or sk_live_..."}
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 font-mono focus:outline-none focus:border-[#329AD4]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingStripe}
                      className="w-full py-2.5 bg-[#329AD4] hover:bg-[#2884b8] text-white text-xs font-semibold rounded-full shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      {savingStripe ? "Saving..." : "Save Payout Credentials"}
                    </button>
                  </form>
                </div>

                {/* Wallet Activity Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 shadow-xs space-y-4">
                  <h2 className="text-base font-bold text-zinc-900">Wallet Transactions History</h2>
                  {walletEntries.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 bg-[#F9FAFB] rounded-xl border border-zinc-100">
                      No wallet transactions recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-zinc-600">
                        <thead className="bg-[#EAF5FB] text-zinc-800 font-semibold rounded-xl">
                          <tr>
                            <th className="p-3 rounded-l-xl">Date</th>
                            <th className="p-3">Description</th>
                            <th className="p-3">Type</th>
                            <th className="p-3 text-right rounded-r-xl">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {walletEntries.map((entry, index) => (
                            <tr key={`${entry.createdAt}-${index}`} className="hover:bg-zinc-50/70">
                              <td className="p-3 font-medium text-zinc-800">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-3">{entry.note}</td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    entry.type === "credit"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : entry.type === "withdrawal"
                                      ? "bg-sky-50 text-[#329AD4]"
                                      : "bg-red-50 text-red-600"
                                  }`}
                                >
                                  {entry.type}
                                </span>
                              </td>
                              <td
                                className={`p-3 text-right font-bold font-mono ${
                                  entry.type === "credit" ? "text-emerald-600" : "text-red-500"
                                }`}
                              >
                                {entry.type === "credit" ? "+" : "−"}{money(entry.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Live Messages */}
            {tab === "messages" && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 shadow-xs">
                <MessagePanel
                  endpoint="/api/vendor/messages"
                  title="Admin Support & Order Coordination"
                  hint="Direct real-time communication channel with the Printgraphy Operations team."
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );

  // Helper to render an Active Job Card
  function renderJobCard(order: VendorOrder) {
    const isWorking = busyId === order._id;
    const isPast24h = order.shippedAt && Date.now() - new Date(order.shippedAt).getTime() > 24 * 60 * 60 * 1000;

    return (
      <div
        key={order._id}
        className="bg-[#F8F9FA] rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4 transition-all hover:border-zinc-300"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-[#329AD4] underline">
                #{order.orderNumber}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  order.fulfillmentStatus === "delivered"
                    ? "bg-emerald-100 text-emerald-800"
                    : order.fulfillmentStatus === "shipped"
                    ? "bg-indigo-100 text-indigo-800"
                    : order.fulfillmentStatus === "in_production"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-sky-100 text-sky-800"
                }`}
              >
                {STATUS_LABEL[order.fulfillmentStatus || ""] || order.fulfillmentStatus}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Destination: {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-zinc-500 block">Vendor Payout</span>
            <span className="text-base sm:text-lg font-bold text-zinc-900 font-mono">
              {money(order.vendorPayment || order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-xl p-3 border border-zinc-100 text-xs text-zinc-700 space-y-1">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between">
              <span className="font-medium text-zinc-900">{item.name}</span>
              <span className="text-zinc-500">Qty: {item.quantity}</span>
            </div>
          ))}
        </div>

        {/* Action Controls for Production Workflow */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-zinc-200/60">
          {order.fulfillmentStatus === "assigned" && (
            <>
              <button
                type="button"
                onClick={() => release(order._id)}
                disabled={isWorking}
                className="px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
              >
                Release to Queue
              </button>
              <button
                type="button"
                onClick={() => updateStatus(order._id, "in_production")}
                disabled={isWorking}
                className="px-5 py-2 bg-[#329AD4] hover:bg-[#2884b8] text-white text-xs font-semibold rounded-full shadow-sm transition cursor-pointer"
              >
                {isWorking ? "Updating..." : "Start Production"}
              </button>
            </>
          )}

          {order.fulfillmentStatus === "in_production" && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <input
                value={tracking[order._id]?.carrier || "UPS"}
                onChange={(e) =>
                  setTracking((prev) => ({
                    ...prev,
                    [order._id]: { number: prev[order._id]?.number || "", carrier: e.target.value },
                  }))
                }
                placeholder="Carrier"
                className="w-24 bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-[#329AD4]"
              />
              <input
                value={tracking[order._id]?.number || ""}
                onChange={(e) =>
                  setTracking((prev) => ({
                    ...prev,
                    [order._id]: { carrier: prev[order._id]?.carrier || "UPS", number: e.target.value },
                  }))
                }
                placeholder="Tracking #"
                className="w-36 bg-white border border-zinc-300 rounded-xl px-3 py-1.5 text-xs text-zinc-900 font-mono focus:outline-none focus:border-[#329AD4]"
              />
              <button
                type="button"
                onClick={() => updateStatus(order._id, "shipped")}
                disabled={isWorking}
                className="px-5 py-2 bg-[#329AD4] hover:bg-[#2884b8] text-white text-xs font-semibold rounded-full shadow-sm transition cursor-pointer"
              >
                {isWorking ? "Updating..." : "Dispatch & Ship"}
              </button>
            </div>
          )}

          {order.fulfillmentStatus === "shipped" && (
            <div className="flex items-center gap-3">
              {isPast24h && (
                <span className="text-[11px] font-semibold text-amber-700">
                  &gt;24h since dispatch. Mark delivered when completed.
                </span>
              )}
              <button
                type="button"
                onClick={() => updateStatus(order._id, "delivered")}
                disabled={isWorking}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full shadow-sm transition cursor-pointer"
              >
                {isWorking ? "Updating..." : "Mark Delivered"}
              </button>
            </div>
          )}

          {order.fulfillmentStatus === "delivered" && (
            <span className="text-xs font-semibold text-emerald-700">
              ✓ Marked Delivered. Awaiting customer confirmation for funds release.
            </span>
          )}
        </div>
      </div>
    );
  }
}

function OrderCard({
  order,
  open,
  onToggle,
  actions,
}: {
  order: VendorOrder;
  open: boolean;
  onToggle: () => void;
  actions: ReactNode;
}) {
  const address = order.shippingAddress;
  return (
    <div className="bg-[#F8F9FA] rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3 transition-all hover:border-zinc-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onToggle}
            className="font-mono font-bold text-sm text-[#329AD4] hover:underline cursor-pointer flex items-center gap-1.5"
          >
            <span>Order #{order.orderNumber}</span>
            <span className="text-[11px] text-zinc-400 font-sans">({open ? "Hide details" : "Show details"})</span>
          </button>
          <p className="text-xs text-zinc-500 mt-0.5">
            Destination: {address?.city}, {address?.state} {address?.zip}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-xs text-zinc-500 block">Offer Payout</span>
          <span className="text-base sm:text-lg font-bold text-zinc-900 font-mono">
            {money(order.vendorPayment || order.totalAmount)}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 border border-zinc-100 text-xs text-zinc-700 space-y-1">
        {order.items.map((item, index) => (
          <div key={index} className="flex justify-between">
            <span className="font-medium text-zinc-900">{item.name}</span>
            <span className="text-zinc-500">Qty: {item.quantity}</span>
          </div>
        ))}
      </div>

      {open && (
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3.5 text-xs text-zinc-600 space-y-2">
          <div>
            <span className="font-semibold text-zinc-800">Shipping Recipient:</span>
            <p className="mt-0.5">{address?.name}</p>
            <p>{address?.line1}{address?.line2 ? `, ${address.line2}` : ""}</p>
            <p>{address?.city}, {address?.state} {address?.zip}</p>
            {address?.phone && <p>Phone: {address.phone}</p>}
          </div>

          {order.notes && (
            <div className="pt-1 border-t border-zinc-200/50">
              <span className="font-semibold text-zinc-800">Special Instructions:</span>
              <p className="mt-0.5">{order.notes}</p>
            </div>
          )}

          {order.items.some((i) => i.specs && Object.keys(i.specs).length > 0) && (
            <div className="pt-1 border-t border-zinc-200/50">
              <span className="font-semibold text-zinc-800">Technical Specs:</span>
              {order.items.map((item, idx) => (
                <div key={idx} className="mt-1 space-y-0.5 text-[11px]">
                  {Object.entries(item.specs || {}).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-zinc-500">{k}:</span>
                      <span className="text-zinc-800 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-zinc-200/60">{actions}</div>
    </div>
  );
}
