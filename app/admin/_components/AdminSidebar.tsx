"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, cx, type IconName } from "@/components/admin/ui";

interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  matchPrefix?: boolean;
}

const SIDEBAR_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: "dashboard", matchPrefix: false },
      // Hidden until /admin/analytics exists.
      // { label: "Analytics & Reports", href: "/admin/analytics", icon: "analytics", matchPrefix: true },
    ],
  },
  {
    title: "Commerce",
    items: [
      { label: "Order Management", href: "/admin/orders", icon: "orders", matchPrefix: true },
      { label: "Print Services", href: "/admin/products", icon: "services", matchPrefix: true },
      { label: "Product Management", href: "/admin/categories", icon: "grid", matchPrefix: true },
      { label: "Templates", href: "/admin/templates", icon: "templates", matchPrefix: true },
      { label: "Request For Supplies", href: "/admin/quotes", icon: "quotes", matchPrefix: true },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Vendor Management", href: "/admin/vendors", icon: "vendors", matchPrefix: true },
      { label: "Customer Management", href: "/admin/users", icon: "users", matchPrefix: true },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Subscriptions", href: "/admin/pricing", icon: "subscription", matchPrefix: true },
      { label: "Payments", href: "/admin/wallet", icon: "wallet", matchPrefix: true },
    ],
  },
  // {
  //   title: "Content",
  //   items: [
  //     { label: "Banners", href: "/admin/website/home", icon: "banners", matchPrefix: true },
  //     { label: "Settings", href: "/admin/header-menu", icon: "settings", matchPrefix: true },
  //   ],
  // },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/auth/signin");
      router.refresh();
    } catch (err) {
      console.error(err);
      setSigningOut(false);
    }
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden w-full flex items-center justify-between bg-white p-3 rounded-2xl border border-zinc-200/70 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#55b2e7] to-[#2884b8] text-white">
            <Icon name="dashboard" className="w-4 h-4" />
          </span>
          <span className="font-semibold text-sm text-zinc-800">Admin Panel</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#329AD4] text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-[#2884b8] transition cursor-pointer"
        >
          <Icon name={mobileOpen ? "close" : "menu"} className="w-4 h-4" strokeWidth={2} />
          <span>{mobileOpen ? "Close" : "Menu"}</span>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cx(
          mobileOpen ? "fixed inset-y-0 left-0 z-50 flex w-72 overflow-y-auto rounded-none shadow-2xl" : "hidden",
          "lg:flex lg:sticky lg:top-24 lg:w-64 shrink-0 flex-col justify-between",
          "bg-gradient-to-b from-[#EAF5FB] to-[#f4fafd] lg:rounded-3xl p-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto",
          "border border-[#dbeefb] scrollbar-hide"
        )}
      >
        <div>
          {/* Brand block */}
          <div className="flex items-center justify-between gap-2 px-2 pb-4 mb-2 border-b border-[#cfe7f6]">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#55b2e7] to-[#2884b8] text-white shadow-md shadow-[#329AD4]/25">
                <Icon name="sparkle" className="w-[18px] h-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 leading-tight">Printgraphy</p>
                <p className="text-[11px] font-medium text-[#2884b8]">Admin Console</p>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-white/60 text-zinc-600 cursor-pointer"
              aria-label="Close menu"
            >
              <Icon name="close" className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-4">
            {SIDEBAR_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{section.title}</p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const isActive = item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cx(
                          "group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all",
                          isActive
                            ? "bg-[#329AD4] text-white font-semibold shadow-md shadow-[#329AD4]/25"
                            : "text-zinc-600 hover:text-zinc-900 hover:bg-white/80"
                        )}
                      >
                        <span
                          className={cx(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                            isActive ? "bg-white/20 text-white" : "bg-white text-[#329AD4] shadow-xs group-hover:bg-[#EAF5FB]"
                          )}
                        >
                          <Icon name={item.icon} className="w-4 h-4" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Logout */}
        <div className="pt-6">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50/80 transition-colors cursor-pointer"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-xs">
              <Icon name="logout" className="w-4 h-4" />
            </span>
            {signingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
