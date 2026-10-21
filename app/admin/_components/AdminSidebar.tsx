"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  matchPrefix?: boolean;
}

const SIDEBAR_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", matchPrefix: false },
  { label: "Order Management", href: "/admin/orders", matchPrefix: true },
  { label: "Print Services Management", href: "/admin/products", matchPrefix: true },
  { label: "Vendor Management", href: "/admin/vendors", matchPrefix: true },
  { label: "Customer Management", href: "/admin/users", matchPrefix: true },
  { label: "Subscription Management", href: "/admin/pricing", matchPrefix: true },
  { label: "Payments Management", href: "/admin/wallet", matchPrefix: true },
  { label: "Banners Management", href: "/admin/website/home", matchPrefix: true },
  { label: "Request For Supplies", href: "/admin/quotes", matchPrefix: true },
  { label: "Analytics & Reports", href: "/admin/analytics", matchPrefix: true },
  { label: "Settings", href: "/admin/header-menu", matchPrefix: true },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
      <div className="lg:hidden w-full mb-3 flex items-center justify-between bg-[#EAF5FB] p-3 rounded-xl border border-sky-100">
        <span className="font-semibold text-sm text-zinc-800">Admin Navigation</span>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#329AD4] text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-[#2884b8] transition cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
          <span>{mobileOpen ? "Close Menu" : "Menu"}</span>
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
        className={`
          ${mobileOpen ? "fixed inset-y-0 left-0 z-50 flex w-72 p-4 shadow-2xl" : "hidden"}
          lg:flex lg:w-60 xl:w-64 shrink-0 flex-col justify-between
          bg-[#EAF5FB] rounded-2xl p-3 sm:p-4 min-h-[580px] lg:min-h-[620px]
          border border-sky-100/80 transition-all duration-200
        `}
      >
        <div className="space-y-1">
          {/* Mobile close icon */}
          <div className="lg:hidden flex items-center justify-between pb-3 mb-2 border-b border-sky-200/60">
            <span className="font-bold text-zinc-900 text-sm">Printgraphy Admin</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-lg hover:bg-white/60 text-zinc-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = item.matchPrefix
                ? pathname.startsWith(item.href)
                : pathname === item.href;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all block ${
                    isActive
                      ? "bg-[#329AD4] text-white shadow-xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Logout */}
        <div className="pt-8">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full text-left px-3.5 py-2 rounded-xl text-xs sm:text-[13px] font-medium text-red-500 hover:text-red-600 hover:bg-red-50/70 transition-colors cursor-pointer"
          >
            {signingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
