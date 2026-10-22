"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Stats {
  totalOrders: number;
  newOrders: number;
  cancelledOrders: number;
  earnings: number;
  totalUsers: number;
  totalVendors: number;
  totalProducts: number;
  totalTemplates: number;
}

interface RecentUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

interface RecentVendor {
  _id: string;
  name?: string;
  contactName?: string;
  email: string;
}

type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type FulfillmentStatus = "pending" | "assigned" | "in_production" | "shipped" | "delivered" | "cancelled";

interface RecentOrder {
  _id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: string;
  guestEmail?: string;
  shippingAddress?: { name?: string };
}

interface DailyPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface TopProduct {
  name: string;
  revenue: number;
  quantity: number;
}

interface DashboardData {
  stats: Stats;
  recentUsers: RecentUser[];
  recentVendors: RecentVendor[];
  recentOrders: RecentOrder[];
  daily: DailyPoint[];
  ordersByStatus: Partial<Record<FulfillmentStatus, number>>;
  topProducts: TopProduct[];
}

const BRAND = "#329AD4";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const compactCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const number = new Intl.NumberFormat("en-US");
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
  failed: "bg-red-50 text-red-700 ring-red-600/15",
  refunded: "bg-zinc-100 text-zinc-600 ring-zinc-500/15",
};

const FULFILLMENT_BADGE: Record<FulfillmentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/15",
  assigned: "bg-[#EAF5FB] text-[#2884b8] ring-[#329AD4]/20",
  in_production: "bg-[#EAF5FB] text-[#2884b8] ring-[#329AD4]/20",
  shipped: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  cancelled: "bg-red-50 text-red-700 ring-red-600/15",
};

const STATUS_ORDER: FulfillmentStatus[] = ["pending", "assigned", "in_production", "shipped", "delivered", "cancelled"];

const ICONS = {
  orders: "M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4m0-10v10m9-14v10l-9 4",
  new: "M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
  cancelled: "M18.364 5.636l-12.728 12.728M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  earnings: "M12 3v18m4-14.5c-.8-1-2.2-1.5-4-1.5-2.5 0-4 1.2-4 3s1.5 2.6 4 3 4 1.2 4 3-1.5 3-4 3c-1.8 0-3.3-.6-4-1.6",
  users: "M17 20h5v-1a4 4 0 00-5-3.9M9 20H2v-1a5 5 0 0110 0v1m-3-9a4 4 0 100-8 4 4 0 000 8zm8 0a3 3 0 100-6 3 3 0 000 6z",
  vendors: "M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6",
};

const TONES = {
  green: { card: "from-emerald-50 to-white border-emerald-100", chip: "bg-emerald-500 text-white", line: "#10b981" },
  blue: { card: "from-[#EAF5FB] to-white border-[#dbeefb]", chip: "bg-[#329AD4] text-white", line: BRAND },
  sky: { card: "from-sky-50 to-white border-sky-100", chip: "bg-sky-500 text-white", line: "#0ea5e9" },
  red: { card: "from-rose-50 to-white border-rose-100", chip: "bg-rose-500 text-white", line: "#f43f5e" },
  violet: { card: "from-violet-50 to-white border-violet-100", chip: "bg-violet-500 text-white", line: "#8b5cf6" },
  amber: { card: "from-amber-50 to-white border-amber-100", chip: "bg-amber-500 text-white", line: "#f59e0b" },
} as const;

type Tone = keyof typeof TONES;

function Icon({ d, className = "w-5 h-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function label(status: string) {
  return status.replace(/_/g, " ");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/* ── Sparkline: tiny trend line inside a stat card ── */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const w = 96;
  const h = 32;
  const max = Math.max(...values);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StatCard({
  title,
  value,
  caption,
  icon,
  href,
  tone,
  loading,
  trend,
}: {
  title: string;
  value: string;
  caption: string;
  icon: string;
  href: string;
  tone: Tone;
  loading: boolean;
  trend?: number[];
}) {
  const t = TONES[tone];
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${t.card}`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${t.chip}`}>
          <Icon d={icon} className="w-[18px] h-[18px]" />
        </span>
        <p className="text-sm font-semibold text-zinc-700">{title}</p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          {loading ? (
            <div className="h-9 w-24 rounded-lg bg-zinc-200/60 animate-pulse" />
          ) : (
            <p className="text-3xl font-bold tracking-tight text-zinc-900">{value}</p>
          )}
          <p className="mt-1 text-xs text-zinc-500">{caption}</p>
        </div>
        {trend && <Sparkline values={trend} color={t.line} />}
      </div>
    </Link>
  );
}

function Panel({
  title,
  subtitle,
  href,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-2xl border border-zinc-100 shadow-xs overflow-hidden flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
        {href && (
          <Link href={href} className="shrink-0 text-xs font-semibold text-[#329AD4] hover:text-[#2884b8] transition-colors">
            View all →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 sm:px-6 py-10 text-center text-sm text-zinc-400">{text}</p>;
}

function Skeleton({ className }: { className: string }) {
  return <div className={`rounded-lg bg-zinc-100 animate-pulse ${className}`} />;
}

/* ── Trend chart: one measure at a time, one y-axis ── */
function TrendChart({ data, metric }: { data: DailyPoint[]; metric: "revenue" | "orders" }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const height = 220;
  const pad = { top: 12, right: 8, bottom: 26, left: metric === "revenue" ? 52 : 32 };
  const innerW = Math.max(width - pad.left - pad.right, 0);
  const innerH = height - pad.top - pad.bottom;

  const values = data.map((d) => d[metric]);
  const rawMax = Math.max(...values, 0);
  const step = niceStep(rawMax / 4 || 1);
  const max = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);

  const x = (i: number) => pad.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : 0);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d[metric])}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const fmt = (v: number) => (metric === "revenue" ? compactCurrency.format(v) : number.format(v));

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - bounds.left) / bounds.width;
    setHover(Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1)))));
  };

  const hovered = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${metric === "revenue" ? "Revenue" : "Orders"} per day, last 30 days`}>
          <defs>
            <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity="0.22" />
              <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="#f1f1f3" />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-zinc-400 text-[10px]">
                {fmt(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            i % 7 === 0 || i === data.length - 1 ? (
              <text key={d.date} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-zinc-400 text-[10px]">
                {dayLabel.format(new Date(d.date))}
              </text>
            ) : null
          )}

          <path d={area} fill={`url(#fill-${metric})`} />
          <path d={line} fill="none" stroke={BRAND} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {hovered && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="#d4d4d8" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(hovered[metric])} r="5" fill={BRAND} stroke="#fff" strokeWidth="2" />
            </g>
          )}

          <rect
            x={pad.left}
            y={pad.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: Math.min(Math.max(x(hover), 70), width - 70), top: y(hovered[metric]) - 10 }}
        >
          <p className="text-zinc-400">{dayLabel.format(new Date(hovered.date))}</p>
          <p className="font-semibold">
            {metric === "revenue" ? currency.format(hovered.revenue) : `${number.format(hovered.orders)} orders`}
          </p>
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

/* ── Horizontal bar list: label, bar, value ── */
function BarList({ rows }: { rows: { key: string; label: string; value: number; display: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3.5 px-5 sm:px-6 pb-5">
      {rows.map((r) => (
        <li key={r.key} className="group" title={`${r.label}: ${r.display}`}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium text-zinc-700 capitalize">{r.label}</span>
            <span className="shrink-0 font-semibold text-zinc-900 tabular-nums">{r.display}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-zinc-100">
            <div
              className="h-2 rounded-full bg-[#329AD4] transition-all group-hover:bg-[#2884b8]"
              style={{ width: `${Math.max((r.value / max) * 100, r.value > 0 ? 2 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PersonList({ people, loading, empty }: { people: { id: string; name: string; email: string }[]; loading: boolean; empty: string }) {
  if (loading) {
    return (
      <div className="space-y-3 px-5 sm:px-6 pb-5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
      </div>
    );
  }
  if (people.length === 0) return <Empty text={empty} />;
  return (
    <ul className="px-3 sm:px-4 pb-3">
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[#f0f8fd] transition-colors">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#55b2e7] to-[#2884b8] text-xs font-bold text-white">
            {initials(person.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 capitalize">{person.name}</p>
            <p className="truncate text-xs text-zinc-500">{person.email}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error || "Failed to load dashboard");
        setData({
          stats: json.stats,
          recentUsers: json.recentUsers ?? [],
          recentVendors: json.recentVendors ?? [],
          recentOrders: json.recentOrders ?? [],
          daily: json.daily ?? [],
          ordersByStatus: json.ordersByStatus ?? {},
          topProducts: json.topProducts ?? [],
        });
      })
      .catch((err) => {
        console.error("Error fetching stats:", err);
        setError(true);
      });
  }, []);

  const loading = !data && !error;
  const stats = data?.stats;
  const daily = data?.daily ?? [];
  const revenue30 = daily.reduce((sum, d) => sum + d.revenue, 0);
  const orders30 = daily.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#329AD4] to-[#2884b8] px-6 py-6 sm:px-8 text-white">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute right-24 -bottom-20 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-white/75">{shortDate.format(new Date())}</p>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-white/85">
              {loading
                ? "Loading your store overview…"
                : `${number.format(orders30)} orders and ${currency.format(revenue30)} in paid revenue over the last 30 days.`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/orders" className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors">
              View orders
            </Link>
            <Link href="/admin/products" className="px-4 py-2 rounded-xl text-sm font-semibold text-[#2884b8] bg-white hover:bg-[#EAF5FB] shadow-sm transition-colors">
              Manage services
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
          Couldn&apos;t load dashboard data. Refresh the page to try again.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Earnings" value={stats ? currency.format(stats.earnings) : "—"} caption="From paid orders" icon={ICONS.earnings} href="/admin/wallet" tone="green" loading={loading} trend={daily.map((d) => d.revenue)} />
        <StatCard title="Total Orders" value={stats ? number.format(stats.totalOrders) : "—"} caption="All time" icon={ICONS.orders} href="/admin/orders" tone="blue" loading={loading} trend={daily.map((d) => d.orders)} />
        <StatCard title="New Orders" value={stats ? number.format(stats.newOrders) : "—"} caption="Last 7 days or awaiting fulfilment" icon={ICONS.new} href="/admin/orders" tone="sky" loading={loading} />
        <StatCard title="Cancelled Orders" value={stats ? number.format(stats.cancelledOrders) : "—"} caption="All time" icon={ICONS.cancelled} href="/admin/orders" tone="red" loading={loading} />
        <StatCard title="Customers" value={stats ? number.format(stats.totalUsers) : "—"} caption="Registered accounts" icon={ICONS.users} href="/admin/users" tone="violet" loading={loading} />
        <StatCard title="Vendors" value={stats ? number.format(stats.totalVendors) : "—"} caption="Print partners" icon={ICONS.vendors} href="/admin/vendors" tone="amber" loading={loading} />
      </div>

      {/* Trend + status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel
          className="xl:col-span-2"
          title={metric === "revenue" ? "Revenue" : "Orders"}
          subtitle="Last 30 days"
          action={
            <div className="flex rounded-lg bg-zinc-100 p-0.5 text-xs font-semibold" role="tablist">
              {(["revenue", "orders"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={metric === m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1.5 rounded-md capitalize transition-colors cursor-pointer ${metric === m ? "bg-white text-[#2884b8] shadow-xs" : "text-zinc-500 hover:text-zinc-800"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          }
        >
          <div className="px-3 sm:px-4 pb-4">
            {loading ? <Skeleton className="h-[220px] mx-2" /> : daily.length > 0 ? <TrendChart data={daily} metric={metric} /> : <Empty text="No data yet." />}
          </div>
        </Panel>

        <Panel title="Orders by Status" subtitle="All time" href="/admin/orders">
          {loading ? (
            <div className="space-y-4 px-5 sm:px-6 pb-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7" />)}</div>
          ) : (
            <BarList
              rows={STATUS_ORDER.map((s) => {
                const count = data?.ordersByStatus[s] ?? 0;
                return { key: s, label: label(s), value: count, display: number.format(count) };
              })}
            />
          )}
        </Panel>
      </div>

      {/* Recent orders + top services */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title="Recent Orders" href="/admin/orders">
          {loading ? (
            <div className="space-y-3 px-5 sm:px-6 pb-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9" />)}</div>
          ) : !data || data.recentOrders.length === 0 ? (
            <Empty text="No orders yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-y border-zinc-100 bg-zinc-50/70 text-xs text-zinc-500">
                    <th className="px-5 sm:px-6 py-2.5 font-medium">Order</th>
                    <th className="px-4 py-2.5 font-medium">Customer</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-5 sm:px-6 py-2.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.recentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-[#f0f8fd] transition-colors">
                      <td className="px-5 sm:px-6 py-3 whitespace-nowrap">
                        <Link href={`/admin/orders/${order._id}`} className="font-semibold text-[#2884b8] hover:underline">
                          #{order.orderNumber}
                        </Link>
                        <p className="text-xs text-zinc-400">{shortDate.format(new Date(order.createdAt))}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 max-w-[180px] truncate">
                        {order.shippingAddress?.name || order.guestEmail || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${PAYMENT_BADGE[order.paymentStatus] ?? PAYMENT_BADGE.refunded}`}>
                            {label(order.paymentStatus)}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize whitespace-nowrap ring-1 ring-inset ${FULFILLMENT_BADGE[order.fulfillmentStatus] ?? FULFILLMENT_BADGE.pending}`}>
                            {label(order.fulfillmentStatus)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 sm:px-6 py-3 text-right font-semibold text-zinc-900 whitespace-nowrap tabular-nums">
                        {currency.format(order.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Top Services" subtitle="By paid revenue" href="/admin/products">
          {loading ? (
            <div className="space-y-4 px-5 sm:px-6 pb-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7" />)}</div>
          ) : !data || data.topProducts.length === 0 ? (
            <Empty text="No paid orders yet." />
          ) : (
            <BarList rows={data.topProducts.map((p) => ({ key: p.name, label: p.name, value: p.revenue, display: currency.format(p.revenue) }))} />
          )}
        </Panel>
      </div>

      {/* Recent customers + vendors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="New Customers" href="/admin/users">
          <PersonList
            loading={loading}
            empty="No customers yet."
            people={(data?.recentUsers ?? []).map((u) => ({
              id: u._id,
              name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email.split("@")[0],
              email: u.email,
            }))}
          />
        </Panel>
        <Panel title="New Vendors" href="/admin/vendors">
          <PersonList
            loading={loading}
            empty="No vendors yet."
            people={(data?.recentVendors ?? []).map((v) => ({
              id: v._id,
              name: v.contactName || v.name || v.email.split("@")[0],
              email: v.email,
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}
