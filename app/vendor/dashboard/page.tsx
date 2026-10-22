"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import MessagePanel from "@/components/MessagePanel";
import { useLiveRefresh } from "@/components/useMessageStream";
import VendorSidebar, { type VendorTab } from "../_components/VendorSidebar";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  IconButton,
  LoadingState,
  Notice,
  PageHeader,
  StatTile,
  TONES,
  cx,
  inputClass,
  labelClass,
  table,
  type IconName,
  type Tone,
} from "@/components/admin/ui";

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
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState label="Loading vendor portal…" />
      </div>
    );
  }

  const metrics: Metric[] = [
    { label: "Available Balance", value: money(profile?.earnedBalance || 0), hint: "Ready for withdrawal", icon: "wallet", tone: "green" },
    { label: "Pending Payouts", value: money(pendingBalance), hint: "In production / delivered", icon: "clock", tone: "amber" },
    { label: "Incoming Orders", value: formatCount(orders.length, 0), hint: "Awaiting claim", icon: "inbox", tone: "brand" },
    { label: "Active Jobs", value: formatCount(jobs.length, 0), hint: "In printing / shipping", icon: "services", tone: "indigo" },
    { label: "Acceptance Rate", value: `${profile?.metrics?.acceptanceRate ?? 100}%`, hint: "Benchmark: > 95%", icon: "check", tone: "violet" },
    { label: "Reprint Rate", value: `${profile?.metrics?.reprintRate ?? 0}%`, hint: "Quality score", icon: "refresh", tone: "red" },
  ];

  const incomingActions = (order: VendorOrder) => (
    <>
      <Button variant="secondary" size="sm" onClick={() => decline(order._id)} disabled={busyId === order._id}>
        Decline
      </Button>
      <Button size="sm" icon="check" onClick={() => claim(order._id)} disabled={busyId === order._id}>
        {busyId === order._id ? "Claiming..." : "Accept Order"}
      </Button>
    </>
  );

  return (
    <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-5 lg:gap-7 items-start">
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
      <main className="flex-1 w-full min-w-0">
        {/* Single wrapper so the global `main > div` storefront rule doesn't paint white blocks over the shell gradient. */}
        <div className="admin-shell space-y-5">
          {/* ── Header: hero on the dashboard, PageHeader on every other tab ── */}
          {tab === "dashboard" ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#329AD4] to-[#2884b8] px-6 py-6 sm:px-8 text-white">
              <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" aria-hidden="true" />
              <div className="absolute right-28 -bottom-20 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
              <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white/75">
                    {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                  <h1 className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight break-words">
                    {profile?.name ? `${profile.name} — Vendor Portal` : "Vendor Portal"}
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-white/85">
                    Manage print production, fulfill incoming orders, and track your printing payouts.
                  </p>

                  {/* Fulfilled Category Badges */}
                  {profile && profile.categoriesFulfilled.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {profile.categoriesFulfilled.map((cat) => (
                        <span key={cat} className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-inset ring-white/20">
                  <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", accepting ? "bg-emerald-400/90" : "bg-amber-400/90")}>
                    <Icon name={accepting ? "check" : "clock"} className="w-[18px] h-[18px]" strokeWidth={2.2} />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium text-white/75">Facility status</p>
                    <p className="text-sm font-semibold">{accepting ? "Accepting Orders" : "Orders Paused"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : tab === "incoming" ? (
            <PageHeader
              icon="inbox"
              title={
                <span className="inline-flex items-center gap-2">
                  Incoming Orders Queue <CountPill value={orders.length} />
                </span>
              }
              description="First facility to accept the job claims it."
              actions={
                <Button variant="soft" icon="refresh" onClick={() => loadOrders()}>
                  Refresh Queue
                </Button>
              }
            />
          ) : tab === "jobs" ? (
            <PageHeader
              icon="services"
              title={
                <span className="inline-flex items-center gap-2">
                  My Production Jobs <CountPill value={jobs.length} />
                </span>
              }
              description="Track and update orders currently in production."
              actions={
                <Button variant="soft" icon="refresh" onClick={() => loadOrders()}>
                  Refresh Jobs
                </Button>
              }
            />
          ) : tab === "catalog" ? (
            <PageHeader
              icon="tag"
              title="Catalog Costs & Pricing"
              description="Set your wholesale fulfillment cost per category and check it against the benchmark."
            />
          ) : tab === "earnings" ? (
            <PageHeader
              icon="wallet"
              title="Earnings & Payouts"
              description="Withdraw available printing proceeds and manage your payout account."
            />
          ) : (
            <PageHeader
              icon="messages"
              title="Live Messages"
              description="Talk to the Printgraphy operations team about your orders."
            />
          )}

          {/* Notification alert banner */}
          {notice && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-[#dbeefb] bg-[#f0f8fd] px-4 py-3 text-sm text-[#1b5b80]" role="status">
              <span className="flex items-start gap-2.5 min-w-0">
                <Icon name="sparkle" className="mt-0.5 w-4 h-4 shrink-0 text-[#329AD4]" />
                <span className="font-medium break-words">{notice}</span>
              </span>
              <IconButton icon="close" label="Dismiss" onClick={() => setNotice("")} className="-my-1 -mr-1 shrink-0" />
            </div>
          )}

          {/* ── Key metrics: full tiles on the dashboard, a compact strip elsewhere ── */}
          {tab === "dashboard" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {metrics.map((m) => (
                <StatTile key={m.label} label={m.label} value={<span className="tabular-nums">{m.value}</span>} hint={m.hint} icon={m.icon} tone={m.tone} />
              ))}
            </div>
          ) : (
            <MetricStrip items={metrics} />
          )}

          {/* TAB: Dashboard (Overview showing recent Incoming & Active Jobs) */}
          {tab === "dashboard" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
              <div className="xl:col-span-2 space-y-5 min-w-0">
                {/* Incoming Orders Section */}
                <Card>
                  <CardHeader
                    icon="inbox"
                    title={
                      <span className="inline-flex items-center gap-2">
                        Incoming Print Orders <CountPill value={orders.length} />
                      </span>
                    }
                    subtitle="First facility to accept the job claims it."
                    action={
                      <Button variant="ghost" size="sm" onClick={() => setTab("incoming")}>
                        View All
                        <Icon name="chevronRight" className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </Button>
                    }
                  />
                  {loadingOrders ? (
                    <LoadingState label="Loading orders…" />
                  ) : orders.length === 0 ? (
                    accepting ? (
                      <EmptyState icon="inbox" title="No incoming orders in your market area currently." description="New jobs that match your markets and catalog will appear here." />
                    ) : (
                      <EmptyState icon="clock" title="Availability is paused" description="Toggle 'Accepting Orders' to receive incoming print jobs." />
                    )
                  ) : (
                    <div className="space-y-3 p-4 sm:p-5">
                      {orders.slice(0, 3).map((order) => (
                        <OrderCard
                          key={order._id}
                          order={order}
                          open={openId === order._id}
                          onToggle={() => setOpenId(openId === order._id ? null : order._id)}
                          actions={incomingActions(order)}
                        />
                      ))}
                    </div>
                  )}
                </Card>

                {/* Active Jobs Section */}
                <Card>
                  <CardHeader
                    icon="services"
                    title={
                      <span className="inline-flex items-center gap-2">
                        Active Production Jobs <CountPill value={jobs.length} />
                      </span>
                    }
                    subtitle="Orders currently in fulfillment."
                    action={
                      <Button variant="ghost" size="sm" onClick={() => setTab("jobs")}>
                        View All
                        <Icon name="chevronRight" className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </Button>
                    }
                  />
                  {jobs.length === 0 ? (
                    <EmptyState icon="services" title="No active production jobs yet" description="Accept incoming orders above to begin printing." />
                  ) : (
                    <div className="space-y-3 p-4 sm:p-5">{jobs.slice(0, 3).map((order) => renderJobCard(order))}</div>
                  )}
                </Card>
              </div>

              {/* Side column: performance + coverage */}
              <div className="space-y-5 min-w-0">
                <Card>
                  <CardHeader icon="analytics" title="Performance" subtitle="How your facility is tracking" />
                  <div className="space-y-4 p-5 sm:p-6">
                    <ProgressRow label="Acceptance rate" value={profile?.metrics?.acceptanceRate ?? 100} barClass="bg-emerald-500" caption="Benchmark: > 95%" />
                    <ProgressRow label="On-time delivery" value={profile?.metrics?.onTimePercentage} barClass="bg-[#329AD4]" />
                    <ProgressRow label="Reprint rate" value={profile?.metrics?.reprintRate ?? 0} barClass="bg-rose-500" caption="Lower is better" />
                  </div>
                </Card>

                <Card>
                  <CardHeader icon="globe" title="Coverage" subtitle="Markets and categories you fulfil" />
                  <div className="space-y-4 p-5 sm:p-6">
                    <div>
                      <p className="text-xs font-semibold text-zinc-500">Markets covered</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile?.marketsCovered?.length ? (
                          profile.marketsCovered.map((m) => (
                            <Badge key={m} tone="brand">
                              {m}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-400">None set</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-500">Categories fulfilled</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile?.categoriesFulfilled?.length ? (
                          profile.categoriesFulfilled.map((c) => (
                            <Badge key={c} tone="violet">
                              {c}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-400">None set</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB: Incoming Orders */}
          {tab === "incoming" && (
            <Card>
              {loadingOrders ? (
                <LoadingState label="Loading orders…" />
              ) : orders.length === 0 ? (
                accepting ? (
                  <EmptyState icon="inbox" title="No new orders right now" description="No new orders currently match your covered market and catalog." />
                ) : (
                  <EmptyState icon="clock" title="Availability is paused" description="Availability is currently paused. Switch on 'Accepting Orders' in the sidebar." />
                )
              ) : (
                <div className="space-y-4 p-4 sm:p-5">
                  {orders.map((order) => (
                    <OrderCard
                      key={order._id}
                      order={order}
                      open={openId === order._id}
                      onToggle={() => setOpenId(openId === order._id ? null : order._id)}
                      actions={incomingActions(order)}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB: My Jobs */}
          {tab === "jobs" && (
            <Card>
              {jobs.length === 0 ? (
                loadingOrders ? (
                  <LoadingState label="Loading jobs…" />
                ) : (
                  <EmptyState icon="services" title="No production jobs yet" description="Accepted orders show up here for printing, packing, and dispatch." />
                )
              ) : (
                <div className="space-y-4 p-4 sm:p-5">{jobs.map((order) => renderJobCard(order))}</div>
              )}
            </Card>
          )}

          {/* TAB: Catalog Costs & Benchmark Pricing */}
          {tab === "catalog" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
              {/* Form to set unit cost */}
              <Card className="lg:col-span-2">
                <CardHeader icon="edit" title="Set Category Unit Cost" subtitle="Enter your wholesale fulfillment cost for each category." />
                <div className="space-y-4 p-5 sm:p-6">
                  {costNotice && <Notice tone="brand">{costNotice}</Notice>}

                  <form onSubmit={saveCost} className="space-y-4">
                    <Field label="Select Category">
                      <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className={cx(inputClass, "cursor-pointer")}>
                        <option value="">Select category...</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} · Retail price: {money(p.price)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {selectedProduct && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[#dbeefb] bg-[#f0f8fd] px-3.5 py-3">
                          <p className="text-[11px] font-semibold text-[#2884b8]">Recommended range</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900 tabular-nums">
                            {money(benchmarkMin)} – {money(benchmarkMax)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3">
                          <p className="text-[11px] font-semibold text-amber-700">Cost Ceiling Cap</p>
                          <p className="mt-1 text-sm font-semibold text-amber-800 tabular-nums">{money(costCap)}</p>
                        </div>
                      </div>
                    )}

                    <Field label="Your Unit Production Cost ($)">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={vendorCostInput}
                        onChange={(e) => setVendorCostInput(e.target.value)}
                        placeholder="e.g. 15.50"
                        className={cx(inputClass, "tabular-nums")}
                      />
                    </Field>

                    <Button type="submit" disabled={savingCost || !selectedProductId} icon="check" className="w-full">
                      {savingCost ? "Saving Cost..." : "Save Cost Benchmark"}
                    </Button>
                  </form>
                </div>
              </Card>

              {/* Saved Catalog List */}
              <Card className="lg:col-span-3">
                <CardHeader
                  icon="layers"
                  title="Configured Catalog Margins"
                  subtitle="Your active category fulfillment rates."
                  action={<CountPill value={catalog.length} />}
                />
                {catalog.length === 0 ? (
                  <EmptyState icon="tag" title="No category costs configured yet" description="Pick a category on the left and save your unit cost to start receiving matching jobs." />
                ) : (
                  <div className={table.wrap}>
                    <table className={table.table}>
                      <thead className={table.thead}>
                        <tr>
                          <th className={table.th}>Category</th>
                          <th className={table.th}>Benchmark</th>
                          <th className={cx(table.th, "text-right")}>Your Cost</th>
                          <th className={cx(table.th, "text-right")}>Status</th>
                        </tr>
                      </thead>
                      <tbody className={table.tbody}>
                        {catalog.map((entry) => {
                          const product = typeof entry.productId === "object" ? entry.productId : null;
                          return (
                            <tr key={entry._id} className={table.tr}>
                              <td className={cx(table.td, "font-medium text-zinc-900")}>{entry.name || product?.name || "Category"}</td>
                              <td className={cx(table.td, "whitespace-nowrap text-zinc-500 tabular-nums")}>
                                {money(entry.categoryBenchmarkMin)} – {money(entry.categoryBenchmarkMax)}
                              </td>
                              <td className={cx(table.td, "whitespace-nowrap text-right font-semibold text-zinc-900 tabular-nums")}>{money(entry.vendorCost)}</td>
                              <td className={cx(table.td, "text-right")}>
                                <Badge tone={entry.isEligible ? "green" : "amber"} dot>
                                  {entry.isEligible ? "Eligible" : "Above Cap"}
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
            </div>
          )}

          {/* TAB: Earnings & Wallet */}
          {tab === "earnings" && profile && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Available Wallet & Withdrawal */}
              <Card>
                <CardHeader icon="wallet" title="Wallet & Instant Payout" subtitle="Withdraw available printing proceeds to bank." />
                <div className="space-y-5 p-5 sm:p-6">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-md shadow-emerald-500/20">
                    <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" aria-hidden="true" />
                    <p className="relative text-xs font-medium text-white/80">Available Balance</p>
                    <p className="relative mt-1 text-3xl font-bold tracking-tight tabular-nums">{money(profile.earnedBalance)}</p>
                    <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium tabular-nums">Pending release: {money(pendingBalance)}</span>
                      {reprintTotal > 0 && (
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-600 tabular-nums">
                          Reprint deductions: −{money(reprintTotal)}
                        </span>
                      )}
                    </div>
                  </div>

                  <form onSubmit={withdraw}>
                    <label htmlFor="vendor-withdraw-amount" className={labelClass}>
                      Withdraw Amount ($)
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id="vendor-withdraw-amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="Enter amount"
                        className={cx(inputClass, "tabular-nums")}
                      />
                      <button
                        type="submit"
                        disabled={!withdrawAmount || Number(withdrawAmount) <= 0}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/25 transition-all hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Icon name="download" className="w-4 h-4" strokeWidth={2.2} />
                        Withdraw
                      </button>
                    </div>
                  </form>
                </div>
              </Card>

              {/* Stripe Connected Account Keys */}
              <Card>
                <CardHeader icon="settings" title="Payout Account Settings" subtitle="Stripe keys for direct automated bank transfers." />
                <form onSubmit={saveStripe} className="space-y-4 p-5 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Account Holder Name">
                      <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Facility or Legal Name" className={inputClass} />
                    </Field>
                    <Field label="Stripe Account Email">
                      <input
                        value={stripeEmail}
                        onChange={(e) => setStripeEmail(e.target.value)}
                        type="email"
                        placeholder="payouts@facility.com"
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="Publishable Key">
                    <input
                      value={stripePublishable}
                      onChange={(e) => setStripePublishable(e.target.value)}
                      placeholder="pk_test_... or pk_live_..."
                      className={cx(inputClass, "font-mono")}
                    />
                  </Field>

                  <Field
                    label={
                      <span className="inline-flex items-center gap-2">
                        Secret Key
                        {profile.stripeSecretSaved && (
                          <Badge tone="green" dot>
                            Saved
                          </Badge>
                        )}
                      </span>
                    }
                  >
                    <input
                      value={stripeSecret}
                      onChange={(e) => setStripeSecret(e.target.value)}
                      type="password"
                      placeholder={profile.stripeSecretSaved ? "Secret key saved (enter new to update)" : "sk_test_... or sk_live_..."}
                      className={cx(inputClass, "font-mono")}
                    />
                  </Field>

                  <Button type="submit" disabled={savingStripe} className="w-full">
                    {savingStripe ? "Saving..." : "Save Payout Credentials"}
                  </Button>
                </form>
              </Card>

              {/* Wallet Activity Table */}
              <Card className="lg:col-span-2">
                <CardHeader icon="clock" title="Wallet Transactions History" action={<CountPill value={walletEntries.length} />} />
                {walletEntries.length === 0 ? (
                  <EmptyState icon="wallet" title="No wallet transactions recorded yet" description="Credits, withdrawals and reprint deductions will be listed here." />
                ) : (
                  <div className={table.wrap}>
                    <table className={table.table}>
                      <thead className={table.thead}>
                        <tr>
                          <th className={table.th}>Date</th>
                          <th className={table.th}>Description</th>
                          <th className={table.th}>Type</th>
                          <th className={cx(table.th, "text-right")}>Amount</th>
                        </tr>
                      </thead>
                      <tbody className={table.tbody}>
                        {walletEntries.map((entry, index) => (
                          <tr key={`${entry.createdAt}-${index}`} className={table.tr}>
                            <td className={cx(table.td, "whitespace-nowrap font-medium text-zinc-900 tabular-nums")}>
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </td>
                            <td className={cx(table.td, "min-w-[12rem]")}>{entry.note}</td>
                            <td className={table.td}>
                              <Badge tone={entry.type === "credit" ? "green" : entry.type === "withdrawal" ? "brand" : "red"}>{entry.type}</Badge>
                            </td>
                            <td
                              className={cx(
                                table.td,
                                "whitespace-nowrap text-right font-semibold tabular-nums",
                                entry.type === "credit" ? "text-emerald-600" : "text-rose-600"
                              )}
                            >
                              {entry.type === "credit" ? "+" : "−"}
                              {money(entry.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB: Live Messages */}
          {tab === "messages" && (
            <MessagePanel
              endpoint="/api/vendor/messages"
              title="Admin Support & Order Coordination"
              hint="Direct real-time communication channel with the Printgraphy Operations team."
            />
          )}
        </div>
      </main>
    </div>
  );

  // Helper to render an Active Job Card
  function renderJobCard(order: VendorOrder) {
    const isWorking = busyId === order._id;
    const isPast24h = order.shippedAt && Date.now() - new Date(order.shippedAt).getTime() > 24 * 60 * 60 * 1000;
    const status = order.fulfillmentStatus || "";
    const stepIndex = JOB_STEPS.indexOf(status);

    return (
      <div key={order._id} className="rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all hover:border-[#b8e0f6] hover:shadow-md">
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#2884b8]">
                <Icon name="orders" className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">#{order.orderNumber}</span>
                  <Badge tone={JOB_TONE[status] || "gray"} dot>
                    {STATUS_LABEL[status] || order.fulfillmentStatus}
                  </Badge>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Icon name="truck" className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Destination: {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}
                  </span>
                </p>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <span className="block text-xs text-zinc-500">Vendor Payout</span>
              <span className="text-lg font-semibold text-zinc-900 tabular-nums">{money(order.vendorPayment || order.totalAmount)}</span>
            </div>
          </div>

          {/* Progress through the production workflow */}
          {stepIndex >= 0 && (
            <ol className="grid grid-cols-4 gap-1.5" aria-label="Fulfilment progress">
              {JOB_STEPS.map((step, i) => {
                const done = i <= stepIndex;
                return (
                  <li key={step} className="min-w-0">
                    <span className={cx("block h-1.5 rounded-full", done ? (status === "delivered" ? "bg-emerald-500" : "bg-[#329AD4]") : "bg-zinc-200")} />
                    <span className={cx("mt-1.5 block truncate text-[11px]", i === stepIndex ? "font-semibold text-zinc-800" : done ? "text-zinc-600" : "text-zinc-400")}>
                      {STATUS_LABEL[step]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Order Items */}
          <ItemList items={order.items} />
        </div>

        {/* Action Controls for Production Workflow */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 rounded-b-2xl border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 sm:px-5">
          {order.fulfillmentStatus === "assigned" && (
            <>
              <Button variant="secondary" size="sm" onClick={() => release(order._id)} disabled={isWorking}>
                Release to Queue
              </Button>
              <Button size="sm" icon="services" onClick={() => updateStatus(order._id, "in_production")} disabled={isWorking}>
                {isWorking ? "Updating..." : "Start Production"}
              </Button>
            </>
          )}

          {order.fulfillmentStatus === "in_production" && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <input
                value={tracking[order._id]?.carrier || "UPS"}
                onChange={(e) =>
                  setTracking((prev) => ({
                    ...prev,
                    [order._id]: { number: prev[order._id]?.number || "", carrier: e.target.value },
                  }))
                }
                placeholder="Carrier"
                aria-label="Carrier"
                className={cx(compactInput, "sm:w-28")}
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
                aria-label="Tracking number"
                className={cx(compactInput, "font-mono sm:w-44")}
              />
              <Button size="sm" icon="truck" onClick={() => updateStatus(order._id, "shipped")} disabled={isWorking}>
                {isWorking ? "Updating..." : "Dispatch & Ship"}
              </Button>
            </div>
          )}

          {order.fulfillmentStatus === "shipped" && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {isPast24h && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <Icon name="clock" className="w-3.5 h-3.5" />
                  &gt;24h since dispatch. Mark delivered when completed.
                </span>
              )}
              <button
                type="button"
                onClick={() => updateStatus(order._id, "delivered")}
                disabled={isWorking}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/25 transition-all hover:bg-emerald-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.2} />
                {isWorking ? "Updating..." : "Mark Delivered"}
              </button>
            </div>
          )}

          {order.fulfillmentStatus === "delivered" && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Icon name="check" className="w-4 h-4" strokeWidth={2.2} />
              Marked Delivered. Awaiting customer confirmation for funds release.
            </span>
          )}
        </div>
      </div>
    );
  }
}

/* ── Local presentational helpers ── */

const JOB_STEPS = ["assigned", "in_production", "shipped", "delivered"];

const JOB_TONE: Record<string, Tone> = {
  assigned: "brand",
  in_production: "amber",
  shipped: "indigo",
  delivered: "green",
};

const compactInput =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-xs transition focus:outline-none focus:border-[#329AD4] focus:ring-4 focus:ring-[#329AD4]/10";

interface Metric {
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  tone: Tone;
}

function CountPill({ value }: { value: number }) {
  return <span className="rounded-full bg-[#EAF5FB] px-2 py-0.5 text-xs font-semibold text-[#2884b8] tabular-nums">{value}</span>;
}

function MetricStrip({ items }: { items: Metric[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((m) => (
        <div key={m.label} title={m.hint} className="flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white px-3.5 py-3 shadow-xs">
          <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONES[m.tone].soft)}>
            <Icon name={m.icon} className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-zinc-500">{m.label}</p>
            <p className="truncate text-sm font-semibold text-zinc-900 tabular-nums">{m.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressRow({ label, value, barClass, caption }: { label: string; value?: number; barClass: string; caption?: string }) {
  const known = typeof value === "number" && Number.isFinite(value);
  const pct = known ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-zinc-700">{label}</span>
        <span className="text-sm font-semibold text-zinc-900 tabular-nums">{known ? `${value}%` : "—"}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className={cx("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
      </div>
      {caption && <p className="mt-1 text-[11px] text-zinc-400">{caption}</p>}
    </div>
  );
}

function ItemList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100 bg-zinc-50/60">
      {items.map((item, index) => (
        <li key={index} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
          <span className="min-w-0 truncate font-medium text-zinc-800">{item.name}</span>
          <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200 tabular-nums">
            Qty: {item.quantity}
          </span>
        </li>
      ))}
    </ul>
  );
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
  const hasSpecs = order.items.some((i) => i.specs && Object.keys(i.specs).length > 0);
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all hover:border-[#b8e0f6] hover:shadow-md">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FB] text-[#2884b8]">
              <Icon name="inbox" className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="group flex flex-wrap items-center gap-x-2 gap-y-0.5 text-left cursor-pointer"
              >
                <span className="text-sm font-semibold text-zinc-900 group-hover:text-[#2884b8]">Order #{order.orderNumber}</span>
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#329AD4]">
                  {open ? "Hide details" : "Show details"}
                  <Icon name="chevronRight" className={cx("w-3.5 h-3.5 transition-transform", open && "rotate-90")} strokeWidth={2.2} />
                </span>
              </button>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                <Icon name="truck" className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Destination: {address?.city}, {address?.state} {address?.zip}
                </span>
              </p>
            </div>
          </div>
          <div className="sm:text-right shrink-0">
            <span className="block text-xs text-zinc-500">Offer Payout</span>
            <span className="text-lg font-semibold text-emerald-600 tabular-nums">{money(order.vendorPayment || order.totalAmount)}</span>
          </div>
        </div>

        <ItemList items={order.items} />

        {open && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs text-zinc-600">
            <div className="rounded-xl border border-[#dbeefb] bg-[#f0f8fd] p-3.5">
              <p className="flex items-center gap-1.5 font-semibold text-[#1b5b80]">
                <Icon name="truck" className="w-3.5 h-3.5" />
                Shipping Recipient
              </p>
              <div className="mt-1.5 space-y-0.5 text-zinc-700">
                <p className="font-medium text-zinc-900">{address?.name}</p>
                <p>
                  {address?.line1}
                  {address?.line2 ? `, ${address.line2}` : ""}
                </p>
                <p>
                  {address?.city}, {address?.state} {address?.zip}
                </p>
                {address?.phone && <p>Phone: {address.phone}</p>}
              </div>
            </div>

            {(order.notes || hasSpecs) && (
              <div className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
                {order.notes && (
                  <div>
                    <p className="flex items-center gap-1.5 font-semibold text-zinc-800">
                      <Icon name="messages" className="w-3.5 h-3.5" />
                      Special Instructions
                    </p>
                    <p className="mt-1 text-zinc-700">{order.notes}</p>
                  </div>
                )}

                {hasSpecs && (
                  <div className={cx(order.notes && "border-t border-zinc-200/60 pt-3")}>
                    <p className="flex items-center gap-1.5 font-semibold text-zinc-800">
                      <Icon name="settings" className="w-3.5 h-3.5" />
                      Technical Specs
                    </p>
                    {order.items.map((item, idx) => (
                      <dl key={idx} className="mt-1.5 space-y-0.5">
                        {Object.entries(item.specs || {}).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <dt className="text-zinc-500">{k}:</dt>
                            <dd className="font-medium text-zinc-800">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 rounded-b-2xl border-t border-zinc-100 bg-zinc-50/60 px-4 py-3 sm:px-5">{actions}</div>
    </div>
  );
}
