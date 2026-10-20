"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import MessagePanel from "@/components/MessagePanel";
import { useLiveRefresh } from "@/components/useMessageStream";

type Tab = "incoming" | "jobs" | "catalog" | "earnings" | "messages";

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
  assigned: "Accepted",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("incoming");
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [jobs, setJobs] = useState<VendorOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/vendor/profile");
    const data = await res.json();
    if (!res.ok || !data.success) {
      router.push("/vendor/login");
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
  }, [router]);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoadingOrders(true);
    const [availableRes, mineRes] = await Promise.all([
      fetch("/api/vendor/orders/available"),
      fetch("/api/vendor/orders/mine"),
    ]);
    const available = await availableRes.json();
    const mine = await mineRes.json();
    if (available.success) setOrders(available.orders || []);
    if (mine.success) setJobs(mine.orders || []);
    setLoadingOrders(false);
  }, []);

  const loadCatalog = useCallback(async () => {
    const catalogRes = await fetch("/api/vendor/catalog");
    const catalogData = await catalogRes.json();
    if (catalogData.success) {
      setProducts(catalogData.categories || []);
      setCatalog(catalogData.vendorProducts || []);
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
  };

  const claim = async (orderId: string) => {
    setBusyId(orderId);
    setNotice("");
    const res = await fetch(`/api/vendor/orders/${orderId}/accept`, { method: "POST" });
    const data = await res.json();
    setNotice(data.success ? `Order ${data.order.orderNumber} is yours.` : data.message || "Could not accept.");
    setBusyId(null);
    loadOrders();
    if (data.success) setTab("jobs");
  };

  const decline = async (orderId: string) => {
    setBusyId(orderId);
    await fetch(`/api/vendor/orders/${orderId}/decline`, { method: "POST" });
    setBusyId(null);
    loadOrders();
  };

  const updateStatus = async (orderId: string, status: string) => {
    setBusyId(orderId);
    setNotice("");
    const ship = tracking[orderId] || { number: "", carrier: "UPS" };
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
    setNotice(data.success ? "Job updated." : data.message || "Could not update the job.");
    setBusyId(null);
    if (data.success && status === "delivered") loadProfile();
    loadOrders();
  };

  const release = async (orderId: string) => {
    setBusyId(orderId);
    const res = await fetch(`/api/vendor/orders/${orderId}/release`, { method: "POST" });
    const data = await res.json();
    setNotice(data.success ? "Order returned to the queue." : data.message || "Could not release the order.");
    setBusyId(null);
    loadOrders();
  };

  const saveCost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProductId || !vendorCostInput) return;
    setSavingCost(true);
    setCostNotice("");
    const res = await fetch("/api/vendor/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: selectedProductId, vendorCost: parseFloat(vendorCostInput) }),
    });
    const data = await res.json();
    setCostNotice(data.marginNotice || data.message || "Saved.");
    setSavingCost(false);
    if (data.success) loadCatalog();
  };

  const saveStripe = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingStripe(true);
    setNotice("");
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
    setNotice(data.success ? "Stripe keys saved." : data.message || "Could not save the Stripe keys.");
    if (data.success) setStripeSecret("");
    if (data.success) {
      setProfile(data.vendor);
      setPendingBalance(data.wallet?.pending || 0);
      setReprintTotal(data.wallet?.reprintTotal || 0);
      setWalletEntries(data.wallet?.entries || []);
    }
    setSavingStripe(false);
  };

  const withdraw = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice("");
    const response = await fetch("/api/vendor/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(withdrawAmount) }),
    });
    const data = await response.json();
    setNotice(data.message || (data.success ? "Withdrawal sent." : "Could not withdraw."));
    if (data.success) {
      setWithdrawAmount("");
      loadProfile();
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    localStorage.removeItem("vendorId");
    localStorage.removeItem("vendorName");
    router.push("/vendor/login");
  };

  const accepting = Boolean(profile?.isAvailable && profile.status === "active");
  const field = "w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#064FE0]";

  const nav: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "incoming", label: "Incoming", icon: <NavIcon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> },
    { id: "jobs", label: "My jobs", icon: <NavIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
    { id: "catalog", label: "Catalog costs", icon: <NavIcon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
    { id: "earnings", label: "Earnings", icon: <NavIcon d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
    { id: "messages", label: "Messages", icon: <NavIcon d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f8fbfd] text-zinc-900 font-sans flex flex-col justify-between">
      <div>
        <div className="flex container mx-auto">
          <button type="button" onClick={() => setMenuOpen(true)} className="lg:hidden fixed top-20 left-3 z-40 rounded-xl bg-white border border-zinc-200 px-3 py-2 text-base font-bold text-zinc-800 shadow-sm cursor-pointer">Menu</button>
          {menuOpen && <button type="button" aria-label="Close menu" className="lg:hidden fixed inset-0 z-40 bg-black/40 cursor-pointer" onClick={() => setMenuOpen(false)} />}
          <aside className={`${menuOpen ? "fixed inset-y-0 left-0 z-50 flex rounded-none my-0 ml-0 min-h-screen" : "hidden"} lg:flex w-64 bg-[#eef4f8] p-4 flex-col justify-between shrink-0 lg:rounded-3xl lg:my-2 lg:ml-4 lg:min-h-[calc(100vh-120px)] border border-sky-100/60 shadow-xs`}>
            <nav className="space-y-1">
              {nav.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setTab(item.id); setMenuOpen(false); }}
                  className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-base font-bold transition-all cursor-pointer ${tab === item.id ? "bg-[#064FE0] text-white shadow-md shadow-[#064FE0]/20" : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"}`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.id === "messages" && unread > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-base font-bold ${tab === item.id ? "bg-white text-[#064FE0]" : "bg-[#064FE0] text-white"}`}>{unread > 99 ? "99+" : unread}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="space-y-2 pt-4 border-t border-zinc-200/60">
              <button
                type="button"
                onClick={() => setAvailability(!accepting)}
                disabled={profile?.status !== "active"}
                className={`w-full px-4 py-2.5 rounded-xl text-base font-bold cursor-pointer disabled:opacity-50 ${accepting ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}
              >
                {accepting ? "Accepting orders" : "Paused"}
              </button>
              <button type="button" onClick={signOut} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-base font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign out
              </button>
              <div className="bg-white/80 p-3 rounded-2xl border border-sky-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-700 text-base font-bold">V</div>
                <div className="min-w-0">
                  <p className="text-base font-black text-zinc-900 truncate">{profile?.name || "Vendor"}</p>
                  <p className="text-base text-zinc-400 font-medium truncate">Vendor portal</p>
                </div>
              </div>
            </div>
          </aside>
          <main className="flex-1 p-4 pt-14 sm:p-6 lg:pt-6 overflow-y-auto min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{profile?.name || "Vendor"}</h1>
          <p className="text-base text-zinc-500 mt-1">First vendor to accept an eligible order keeps it. Pausing stops new alerts without closing the account.</p>
          {profile && profile.categoriesFulfilled.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.categoriesFulfilled.map((category) => (
                <span key={category} className="rounded-full bg-white border border-zinc-200 px-3 py-1 text-base font-bold text-zinc-600">{category}</span>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Available" value={money(profile?.earnedBalance || 0)} tone="bg-[#0284c7]" />
          <StatCard label="Pending" value={money(pendingBalance)} tone="bg-[#7e22ce]" />
          <StatCard label="Incoming" value={String(orders.length)} tone="bg-[#1e3a8a]" />
          <StatCard label="Reprint rate" value={`${profile?.metrics?.reprintRate ?? 0}%`} tone="bg-[#16a34a]" />
        </div>

        {notice && <div className="p-4 bg-sky-50 border border-sky-200 text-[#064FE0] text-base rounded-2xl font-bold">{notice}</div>}

        {tab === "incoming" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Incoming orders ({orders.length})</h2>
              <button type="button" onClick={() => loadOrders()} className="text-base font-bold text-[#064FE0] cursor-pointer">Refresh</button>
            </div>
            {loadingOrders ? <Spinner /> : orders.length === 0 ? (
              <Empty text={accepting ? "No new orders match your market and catalog." : "Availability is paused, so new orders are hidden."} />
            ) : orders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                open={openId === order._id}
                onToggle={() => setOpenId(openId === order._id ? null : order._id)}
                actions={
                  <>
                    <button type="button" onClick={() => decline(order._id)} disabled={busyId === order._id} className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-base font-bold text-zinc-700 cursor-pointer">Decline</button>
                    <button type="button" onClick={() => claim(order._id)} disabled={busyId === order._id} className="px-6 py-2.5 bg-[#064FE0] hover:bg-[#0439A8] text-white font-bold text-base rounded-xl cursor-pointer disabled:opacity-50">
                      {busyId === order._id ? "Working..." : "Accept"}
                    </button>
                  </>
                }
              />
            ))}
          </section>
        )}

        {tab === "jobs" && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold">My jobs ({jobs.length})</h2>
            {jobs.length === 0 ? <Empty text="Accepted orders show up here for production and shipping." /> : jobs.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                open={openId === order._id}
                onToggle={() => setOpenId(openId === order._id ? null : order._id)}
                status={STATUS_LABEL[order.fulfillmentStatus || ""] || order.fulfillmentStatus}
                actions={
                  <>
                    {order.fulfillmentStatus === "pending" && (
                      <>
                        <p className="text-base font-bold text-amber-700">Admin offered {money(order.vendorPayment || 0)}. Accept if you agree.</p>
                        <button type="button" onClick={() => decline(order._id)} disabled={busyId === order._id} className="px-4 py-2.5 border border-zinc-200 bg-white text-base font-bold rounded-xl cursor-pointer">Decline</button>
                        <button type="button" onClick={() => claim(order._id)} disabled={busyId === order._id} className="px-4 py-2.5 bg-[#064FE0] text-white text-base font-bold rounded-xl cursor-pointer">Accept</button>
                      </>
                    )}
                    {order.fulfillmentStatus === "assigned" && (
                      <button type="button" onClick={() => updateStatus(order._id, "in_production")} disabled={busyId === order._id} className="px-4 py-2.5 bg-[#064FE0] text-white text-base font-bold rounded-xl cursor-pointer">Start production</button>
                    )}
                    {(order.fulfillmentStatus === "assigned" || order.fulfillmentStatus === "in_production") && (
                      <button type="button" onClick={() => release(order._id)} disabled={busyId === order._id} className="px-4 py-2.5 border border-zinc-200 bg-white text-base font-bold rounded-xl cursor-pointer">Release</button>
                    )}
                    {order.fulfillmentStatus === "in_production" && (
                      <div className="flex flex-wrap gap-2">
                        <input
                          value={tracking[order._id]?.carrier || "UPS"}
                          onChange={(event) => setTracking((prev) => ({ ...prev, [order._id]: { number: prev[order._id]?.number || "", carrier: event.target.value } }))}
                          className={`w-24 ${field}`}
                          placeholder="Carrier"
                        />
                        <input
                          value={tracking[order._id]?.number || ""}
                          onChange={(event) => setTracking((prev) => ({ ...prev, [order._id]: { carrier: prev[order._id]?.carrier || "UPS", number: event.target.value } }))}
                          className={`w-40 ${field}`}
                          placeholder="Tracking number"
                        />
                        <button type="button" onClick={() => updateStatus(order._id, "shipped")} disabled={busyId === order._id} className="px-4 py-2.5 bg-[#064FE0] text-white text-base font-bold rounded-xl cursor-pointer">Mark shipped</button>
                      </div>
                    )}
                    {order.fulfillmentStatus === "shipped" && (
                      <div className="flex flex-col items-end gap-2">
                        {order.shippedAt && Date.now() - new Date(order.shippedAt).getTime() > 24 * 60 * 60 * 1000 && (
                          <p className="text-base font-bold text-amber-700 max-w-xs text-right">This shipment is past 24 hours. Mark it delivered so it can qualify for payout.</p>
                        )}
                        <button type="button" onClick={() => updateStatus(order._id, "delivered")} disabled={busyId === order._id} className="px-4 py-2.5 bg-[#16a34a] text-white text-base font-bold rounded-xl cursor-pointer">Mark delivered</button>
                      </div>
                    )}
                    {order.fulfillmentStatus === "delivered" && (
                      <p className="text-base font-bold text-emerald-700">Marked delivered. Your payment is {money(order.vendorPayment || 0)}. Admin releases it after the customer confirms.</p>
                    )}
                    {order.reprint?.flagged && (
                      <p className="text-base font-bold text-red-600">Fault reprint −{money(order.reprint.amount || 0)} deducted from your wallet.</p>
                    )}
                  </>
                }
              />
            ))}
          </section>
        )}

        {tab === "catalog" && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={saveCost} className="bg-white rounded-3xl border border-zinc-200 p-5 space-y-3">
              <h2 className="text-base font-bold">Your categories</h2>
              <p className="text-base text-zinc-500">These are the categories sold on the site. Enter your cost for each one. The customer price stays fixed.</p>
              {costNotice && <p className="text-base text-[#064FE0] font-bold">{costNotice}</p>}
              <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className={field}>
                <option value="">Select category...</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>{product.name} · customer price {money(product.price)}</option>
                ))}
              </select>
              {selectedProduct && (
                <p className="text-base text-zinc-600">
                  Typical cost range {money(benchmarkMin)} – {money(benchmarkMax)}. Costs above {money(costCap)} are not eligible.
                </p>
              )}
              <input type="number" step="0.01" required value={vendorCostInput} onChange={(event) => setVendorCostInput(event.target.value)} placeholder="Your unit cost for this category" className={field} />
              <button type="submit" disabled={savingCost} className="w-full py-2.5 bg-[#064FE0] text-white text-base font-bold rounded-xl cursor-pointer disabled:opacity-50">{savingCost ? "Saving..." : "Save cost"}</button>
            </form>
            <div className="bg-white rounded-3xl border border-zinc-200 p-5 space-y-3">
              <h2 className="text-base font-bold">Saved costs</h2>
              {catalog.length === 0 ? <p className="text-base text-zinc-500">No category costs saved yet.</p> : catalog.map((entry) => {
                const product = typeof entry.productId === "object" ? entry.productId : null;
                return (
                  <div key={entry._id} className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                    <div>
                      <p className="text-base font-bold">{entry.name || product?.name || "Category"}</p>
                      <p className="text-base text-zinc-500">Benchmark {money(entry.categoryBenchmarkMin)} – {money(entry.categoryBenchmarkMax)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold">{money(entry.vendorCost)}</p>
                      <p className={`text-base font-bold ${entry.isEligible ? "text-emerald-700" : "text-amber-700"}`}>{entry.isEligible ? "Eligible" : "Not eligible"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "messages" && (
          <MessagePanel endpoint="/api/vendor/messages" title="Admin" hint="Messages here go to the admin team. They are separate from customer messages." />
        )}

        {tab === "earnings" && profile && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-zinc-200 p-5 space-y-3">
              <h2 className="text-base font-bold">Available</h2>
              <p className="text-3xl font-black text-emerald-700">{money(profile.earnedBalance)}</p>
              <p className="text-base text-zinc-500">Pending {money(pendingBalance)}. Fault reprints {money(reprintTotal)} are deducted here and returned to the admin wallet.</p>
              <form onSubmit={withdraw} className="flex gap-2 pt-2">
                <input value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} type="number" step="0.01" min="0" placeholder="Withdraw amount" className={`flex-1 ${field}`} />
                <button type="submit" className="px-4 py-2 bg-[#16a34a] text-white text-base font-bold rounded-xl cursor-pointer">Withdraw</button>
              </form>
            </div>
            <form onSubmit={saveStripe} className="bg-white rounded-3xl border border-zinc-200 p-5 space-y-3">
              <h2 className="text-base font-bold">Stripe keys</h2>
              <p className="text-base text-zinc-500">Paste the keys from your Stripe dashboard, under Developers, then API keys. A withdrawal pays out from that Stripe account to the bank saved there.</p>
              <input value={accountHolder} onChange={(event) => setAccountHolder(event.target.value)} placeholder="Account holder name" className={field} />
              <input value={stripeEmail} onChange={(event) => setStripeEmail(event.target.value)} type="email" placeholder="Stripe account email" className={field} />
              <input value={stripePublishable} onChange={(event) => setStripePublishable(event.target.value)} placeholder="pk_test_... or pk_live_..." className={field} />
              <input value={stripeSecret} onChange={(event) => setStripeSecret(event.target.value)} type="password" placeholder={profile.stripeSecretSaved ? "Secret key saved — paste a new one to replace it" : "sk_test_... or sk_live_..."} className={field} />
              <button type="submit" disabled={savingStripe} className="px-4 py-2.5 bg-[#064FE0] text-white text-base font-bold rounded-xl cursor-pointer">{savingStripe ? "Saving..." : "Save Stripe keys"}</button>
            </form>
            <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-200 p-5 space-y-3">
              <h2 className="text-base font-bold">Wallet activity</h2>
              {walletEntries.length === 0 ? <p className="text-base text-zinc-500">No wallet activity yet.</p> : walletEntries.map((entry, index) => (
                <div key={`${entry.createdAt}-${index}`} className="flex justify-between text-base border-b border-zinc-100 pb-2">
                  <span className="text-zinc-600">{new Date(entry.createdAt).toLocaleDateString()} · {entry.note}</span>
                  <span className={`font-bold ${entry.type === "credit" ? "text-emerald-700" : "text-red-600"}`}>
                    {entry.type === "credit" ? "+" : "−"}{money(entry.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
          </main>
        </div>
      </div>
      <footer className="bg-[#eef4f8] border-t border-zinc-200/60 py-4 px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-base text-zinc-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900">PRINTGRAPHY</span>
            <span>© 2026 Printgraphy Enterprise. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-base">
            <span>Vendor portal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`${tone} text-white p-5 rounded-3xl shadow-md`}>
      <p className="text-base font-bold opacity-90">{label}</p>
      <p className="text-2xl font-black tracking-tight mt-2">{value}</p>
    </div>
  );
}

function Spinner() {
  return <div className="py-16 text-center"><div className="w-8 h-8 border-2 border-sky-200 border-t-[#064FE0] rounded-full animate-spin mx-auto" /></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="bg-white rounded-3xl border border-zinc-200 p-10 text-center text-base text-zinc-500">{text}</div>;
}

function OrderCard({
  order,
  open,
  onToggle,
  actions,
  status,
}: {
  order: VendorOrder;
  open: boolean;
  onToggle: () => void;
  actions: ReactNode;
  status?: string;
}) {
  const address = order.shippingAddress;
  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button type="button" onClick={onToggle} className="font-mono font-black text-base text-[#064FE0] cursor-pointer">{order.orderNumber}</button>
          <p className="text-base text-zinc-500 mt-0.5">{address?.city}, {address?.state} {address?.zip}</p>
        </div>
        <div className="text-right">
          <p className="font-black text-zinc-900">{money(order.vendorPayment || order.totalAmount)}</p>
          {status && <p className="text-base font-bold text-[#064FE0]">{status}</p>}
        </div>
      </div>
      <div className="space-y-1">
        {order.items.map((item, index) => (
          <p key={index} className="text-base text-zinc-600">{item.name} × {item.quantity}</p>
        ))}
      </div>
      {open && (
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3 text-base text-zinc-600 space-y-2">
          <p>{address?.name}<br />{address?.line1}{address?.line2 ? `, ${address.line2}` : ""}<br />{address?.city}, {address?.state} {address?.zip}</p>
          {address?.phone && <p>Phone: {address.phone}</p>}
          {order.notes && <p>Notes: {order.notes}</p>}
          {order.trackingNumber && <p>Tracking: {order.trackingCarrier} {order.trackingNumber}</p>}
          {order.items.map((item, index) => (
            <div key={`spec-${index}`}>
              {Object.entries(item.specs || {}).map(([key, value]) => (
                <p key={key}>{item.name}: {key} — {value}</p>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">{actions}</div>
    </div>
  );
}
