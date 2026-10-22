/**
 * Shared UI kit for the admin and vendor dashboards.
 * Brand: #329AD4 (primary), #2884b8 (hover/dark), #EAF5FB / #f0f8fd (tints), #dbeefb / #b8e0f6 (borders).
 * Every dashboard page should compose these instead of hand-rolling cards, tables, buttons and inputs.
 */
"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ── Icons (24px stroke paths) ── */
export const ICONS = {
  dashboard: "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z",
  orders: "M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4m0-10v10m9-14v10l-9 4",
  services: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z",
  products: "M4 6h16M4 12h16M4 18h7",
  grid: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
  templates: "M4 5a1 1 0 011-1h14a1 1 0 011 1v4H4V5zm0 8h7v7H5a1 1 0 01-1-1v-6zm11 0h5v6a1 1 0 01-1 1h-4v-7z",
  vendors: "M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6",
  users: "M17 20h5v-1a4 4 0 00-5-3.9M9 20H2v-1a5 5 0 0110 0v1m-3-9a4 4 0 100-8 4 4 0 000 8zm8 0a3 3 0 100-6 3 3 0 000 6z",
  subscription: "M12 2l3 6 6 .9-4.5 4.4 1 6.2L12 16.6 6.5 19.5l1-6.2L3 8.9 9 8l3-6z",
  wallet: "M3 7a2 2 0 012-2h13v4M3 7v10a2 2 0 002 2h15V9H5a2 2 0 01-2-2zm14 7h.01",
  banners: "M4 5h16v14H4V5zm0 10l4-4 4 4 3-3 5 5",
  quotes: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h4",
  analytics: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  settings: "M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 002.6 1.1c1.6-1 3.4.8 2.4 2.4a1.7 1.7 0 001 2.6c1.9.4 1.9 3 0 3.4a1.7 1.7 0 00-1 2.6c1 1.6-.8 3.4-2.4 2.4a1.7 1.7 0 00-2.6 1c-.4 1.9-3 1.9-3.4 0a1.7 1.7 0 00-2.6-1c-1.6 1-3.4-.8-2.4-2.4a1.7 1.7 0 00-1-2.6c-1.9-.4-1.9-3 0-3.4a1.7 1.7 0 001-2.6c-1-1.6.8-3.4 2.4-2.4a1.7 1.7 0 002.6-1.1zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  messages: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.4-4 8-9 8a9.9 9.9 0 01-4.3-.9L3 20l1.4-3.7A7.4 7.4 0 013 12c0-4.4 4-8 9-8s9 3.6 9 8z",
  mail: "M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  star: "M11.5 3.5l2.3 4.7 5.2.8-3.8 3.6.9 5.2-4.6-2.4-4.6 2.4.9-5.2L4 9l5.2-.8 2.3-4.7z",
  tag: "M7 7h.01M3 3h8l10 10-8 8L3 11V3z",
  pages: "M7 3h7l5 5v13H7V3zm7 0v5h5",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  plus: "M12 5v14M5 12h14",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.6a2 2 0 112.8 2.8L11.8 15H9v-2.8l8.6-8.6z",
  trash: "M19 7l-.9 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6M4 7h16M9 7V4h6v3",
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0zm-3-7c-4.5 0-8.3 2.9-9.5 7 1.2 4.1 5 7 9.5 7s8.3-2.9 9.5-7c-1.2-4.1-5-7-9.5-7z",
  check: "M5 13l4 4L19 7",
  close: "M6 18L18 6M6 6l12 12",
  chevronLeft: "M15 19l-7-7 7-7",
  chevronRight: "M9 5l7 7-7 7",
  arrowLeft: "M10 19l-7-7m0 0l7-7m-7 7h18",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  menu: "M4 6h16M4 12h16M4 18h16",
  clock: "M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
  ban: "M18.4 5.6L5.6 18.4M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  dollar: "M12 3v18m4-14.5c-.8-1-2.2-1.5-4-1.5-2.5 0-4 1.2-4 3s1.5 2.6 4 3 4 1.2 4 3-1.5 3-4 3c-1.8 0-3.3-.6-4-1.6",
  upload: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12",
  image: "M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 3.5-5.5 3.5-9S14.5 5.5 12 3m0 18c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3M3.5 9h17M3.5 15h17",
  truck: "M3 7h11v9H3V7zm11 3h4l3 3v3h-7v-6zM7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z",
  inbox: "M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v6H4v-6z",
  layers: "M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5m-18 4l9 5 9-5",
  refresh: "M4 4v5h5M20 20v-5h-5M5.1 15a7 7 0 0012.9 2M18.9 9A7 7 0 006 7",
  download: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4 4-4M12 4v12",
  filter: "M3 5h18l-7 8v6l-4 2v-8L3 5z",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "w-5 h-5", strokeWidth = 1.8 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[name]} />
    </svg>
  );
}

/* ── Tones: one place for the dashboard colour language ── */
export const TONES = {
  brand: { chip: "bg-[#329AD4] text-white", soft: "bg-[#EAF5FB] text-[#2884b8]", card: "from-[#EAF5FB] to-white border-[#dbeefb]", badge: "bg-[#EAF5FB] text-[#2884b8] ring-[#329AD4]/20", dot: "bg-[#329AD4]" },
  green: { chip: "bg-emerald-500 text-white", soft: "bg-emerald-50 text-emerald-600", card: "from-emerald-50 to-white border-emerald-100", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", dot: "bg-emerald-500" },
  amber: { chip: "bg-amber-500 text-white", soft: "bg-amber-50 text-amber-600", card: "from-amber-50 to-white border-amber-100", badge: "bg-amber-50 text-amber-700 ring-amber-600/15", dot: "bg-amber-500" },
  red: { chip: "bg-rose-500 text-white", soft: "bg-rose-50 text-rose-600", card: "from-rose-50 to-white border-rose-100", badge: "bg-rose-50 text-rose-700 ring-rose-600/15", dot: "bg-rose-500" },
  violet: { chip: "bg-violet-500 text-white", soft: "bg-violet-50 text-violet-600", card: "from-violet-50 to-white border-violet-100", badge: "bg-violet-50 text-violet-700 ring-violet-600/15", dot: "bg-violet-500" },
  indigo: { chip: "bg-indigo-500 text-white", soft: "bg-indigo-50 text-indigo-600", card: "from-indigo-50 to-white border-indigo-100", badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/15", dot: "bg-indigo-500" },
  sky: { chip: "bg-sky-500 text-white", soft: "bg-sky-50 text-sky-600", card: "from-sky-50 to-white border-sky-100", badge: "bg-sky-50 text-sky-700 ring-sky-600/15", dot: "bg-sky-500" },
  gray: { chip: "bg-zinc-700 text-white", soft: "bg-zinc-100 text-zinc-600", card: "from-zinc-50 to-white border-zinc-200", badge: "bg-zinc-100 text-zinc-600 ring-zinc-500/15", dot: "bg-zinc-400" },
} as const;

export type Tone = keyof typeof TONES;

/* ── Page header: gradient icon chip + title + description + actions ── */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="space-y-3">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[#2884b8] transition-colors">
          <Icon name="arrowLeft" className="w-3.5 h-3.5" strokeWidth={2.2} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          {icon && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#55b2e7] to-[#2884b8] text-white shadow-md shadow-[#329AD4]/25">
              <Icon name={icon} className="w-5 h-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 truncate">{title}</h1>
            {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/* ── Cards ── */
export function Card({ children, className, padded = false }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx("bg-white rounded-2xl border border-zinc-200/70 shadow-xs", padded && "p-5 sm:p-6", className)}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, icon, action, className }: { title: ReactNode; subtitle?: ReactNode; icon?: IconName; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-zinc-100", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
            <Icon name={icon} className="w-4 h-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ── Stat tile: coloured gradient card with icon chip ── */
export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  href,
  loading,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon: IconName;
  tone?: Tone;
  href?: string;
  loading?: boolean;
}) {
  const t = TONES[tone];
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm", t.chip)}>
          <Icon name={icon} className="w-[18px] h-[18px]" />
        </span>
        <p className="text-sm font-semibold text-zinc-700">{label}</p>
      </div>
      {loading ? (
        <div className="mt-4 h-8 w-20 rounded-lg bg-zinc-200/60 animate-pulse" />
      ) : (
        <p className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </>
  );
  const cls = cx("block rounded-2xl border bg-gradient-to-br p-5 shadow-xs transition-all", t.card, href && "hover:-translate-y-0.5 hover:shadow-md");
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/* ── Buttons ── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type ButtonSize = "sm" | "md";

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#329AD4]/40";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm" };
  const variants = {
    primary: "bg-[#329AD4] text-white shadow-sm shadow-[#329AD4]/25 hover:bg-[#2884b8]",
    secondary: "bg-white text-zinc-700 border border-zinc-200 hover:border-[#329AD4] hover:text-[#2884b8]",
    ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
    danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
    soft: "bg-[#EAF5FB] text-[#2884b8] hover:bg-[#dbeefb]",
  };
  return cx(base, sizes[size], variants[variant]);
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; icon?: IconName }) {
  return (
    <button type="button" className={cx(buttonClass(variant, size), className)} {...props}>
      {icon && <Icon name={icon} className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(buttonClass(variant, size), className)}>
      {icon && <Icon name={icon} className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={2.2} />}
      {children}
    </Link>
  );
}

export function IconButton({ icon, label, tone = "default", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-40",
        tone === "danger" ? "text-zinc-400 hover:bg-rose-50 hover:text-rose-600" : "text-zinc-400 hover:bg-[#EAF5FB] hover:text-[#2884b8]",
        className
      )}
      {...props}
    >
      <Icon name={icon} className="w-4 h-4" />
    </button>
  );
}

/* ── Badge ── */
export function Badge({ tone = "gray", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize whitespace-nowrap ring-1 ring-inset", t.badge, className)}>
      {dot && <span className={cx("h-1.5 w-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}

/** Maps common order/payment/account statuses to a tone. */
export function statusTone(status?: string): Tone {
  switch ((status || "").toLowerCase()) {
    case "paid":
    case "active":
    case "delivered":
    case "approved":
    case "published":
    case "completed":
    case "verified":
    case "available":
      return "green";
    case "pending":
    case "draft":
    case "awaiting":
    case "paused":
    case "review":
      return "amber";
    case "failed":
    case "cancelled":
    case "canceled":
    case "rejected":
    case "inactive":
    case "suspended":
    case "blocked":
      return "red";
    case "shipped":
      return "indigo";
    case "assigned":
    case "in_production":
    case "processing":
    case "quoted":
      return "brand";
    default:
      return "gray";
  }
}

/* ── Form fields ── */
export const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-xs transition focus:outline-none focus:border-[#329AD4] focus:ring-4 focus:ring-[#329AD4]/10 disabled:bg-zinc-50 disabled:text-zinc-500";

export const labelClass = "block text-xs font-semibold text-zinc-700 mb-1.5";

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx("relative w-full sm:max-w-xs", className)}>
      <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(inputClass, "pl-10")} />
    </div>
  );
}

/* ── Segmented tabs / filter pills ── */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cx("inline-flex flex-wrap gap-1 rounded-xl bg-zinc-100/80 p-1", className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              active ? "bg-white text-[#2884b8] shadow-xs" : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cx("rounded-full px-1.5 text-[10px]", active ? "bg-[#EAF5FB] text-[#2884b8]" : "bg-zinc-200 text-zinc-600")}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Toolbar: sits above a table, holds search + filters + actions ── */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 sm:px-6 py-4 border-b border-zinc-100", className)}>{children}</div>;
}

/* ── Table class tokens ── */
export const table = {
  wrap: "overflow-x-auto",
  table: "w-full text-left text-sm",
  thead: "bg-zinc-50/80 border-b border-zinc-100",
  th: "px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 whitespace-nowrap",
  tbody: "divide-y divide-zinc-100",
  tr: "hover:bg-[#f0f8fd]/70 transition-colors",
  td: "px-5 py-3.5 text-zinc-700 align-middle",
};

/* ── Avatar ── */
export function Avatar({ name, src, size = "md" }: { name: string; src?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cx("shrink-0 rounded-full object-cover", sizes[size])} />;
  }
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#55b2e7] to-[#2884b8] font-bold text-white", sizes[size])}>
      {initials}
    </span>
  );
}

/* ── Loading / empty states ── */
export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block h-5 w-5 rounded-full border-2 border-[#dbeefb] border-t-[#329AD4] animate-spin", className)} />;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-zinc-400">
      <Spinner className="h-7 w-7" />
      {label}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5 sm:p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-zinc-100 animate-pulse" />
      ))}
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, description, action }: { icon?: IconName; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF5FB] text-[#329AD4]">
        <Icon name={icon} className="w-7 h-7" />
      </span>
      <p className="mt-4 text-sm font-semibold text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Pagination footer ── */
export function Pagination({
  page,
  pages,
  total,
  limit,
  onPage,
}: {
  page: number;
  pages: number;
  total?: number;
  limit?: number;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 sm:px-6 py-3.5 border-t border-zinc-100">
      <p className="text-xs text-zinc-500">
        {total !== undefined && limit !== undefined
          ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
          : `Page ${page} of ${pages}`}
      </p>
      <div className="flex items-center gap-1.5">
        <IconButton icon="chevronLeft" label="Previous page" onClick={() => onPage(page - 1)} disabled={page <= 1} className="border border-zinc-200" />
        <span className="px-2 text-xs font-semibold text-zinc-700 tabular-nums">
          {page} / {pages}
        </span>
        <IconButton icon="chevronRight" label="Next page" onClick={() => onPage(page + 1)} disabled={page >= pages} className="border border-zinc-200" />
      </div>
    </div>
  );
}

/* ── Alert / notice ── */
export function Notice({ tone = "brand", title, children }: { tone?: "brand" | "green" | "amber" | "red"; title?: ReactNode; children?: ReactNode }) {
  const styles = {
    brand: "bg-[#f0f8fd] border-[#dbeefb] text-[#1b5b80]",
    green: "bg-emerald-50 border-emerald-100 text-emerald-800",
    amber: "bg-amber-50 border-amber-100 text-amber-800",
    red: "bg-rose-50 border-rose-100 text-rose-800",
  };
  return (
    <div className={cx("rounded-xl border px-4 py-3 text-sm", styles[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cx(title ? "mt-0.5" : "", "opacity-90")}>{children}</div>}
    </div>
  );
}
