"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const WEBSITE_ITEMS = [
  { label: "Home page", href: "/admin/website/home" },
  { label: "Header & Footer Menu", href: "/admin/header-menu" },
  { label: "Custom Pages (CMS)", href: "/admin/pages" },
  { label: "Quotes", href: "/admin/quotes" },
  { label: "Coupons & Promos", href: "/admin/coupons" },
  { label: "Email", href: "/admin/email" },
];

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    label: "Messages",
    href: "/admin/messages",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    label: "Wallet",
    href: "/admin/wallet",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    label: "Vendors",
    href: "/admin/vendors",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4" />
      </svg>
    ),
  },
  // {
  //   label: "Catalog",
  //   href: "/admin/products",
  //   icon: (
  //     <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
  //       <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  //     </svg>
  //   ),
  // },
  {
    label: "Templates",
    href: "/admin/templates",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    label: "Product Management",
    href: "/admin/categories",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: "Pricing & Gating",
    href: "/admin/pricing",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "User Reviews",
    href: "/admin/reviews",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    label: "Team / Admin Management",
    href: "/admin/users",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const websiteActive = WEBSITE_ITEMS.some((item) => pathname.startsWith(item.href)) || pathname.startsWith("/admin/website");

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  const [websiteOpen, setWebsiteOpen] = useState(websiteActive);
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(() => {
    fetch("/api/admin/messages/unread")
      .then((response) => response.json())
      .then((data) => setUnread(data.success ? data.total || 0 : 0))
      .catch(() => setUnread(0));
  }, []);

  useEffect(() => {
    loadUnread();
    const onLive = () => window.setTimeout(loadUnread, 400);
    window.addEventListener("xprints-live", onLive);
    const onCount = (event: Event) => setUnread((event as CustomEvent<number>).detail || 0);
    window.addEventListener("xprints-unread", onCount);
    return () => {
      window.removeEventListener("xprints-live", onLive);
      window.removeEventListener("xprints-unread", onCount);
    };
  }, [loadUnread, pathname]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/auth/signin");
  };

  return (
    <>
    <button
      type="button"
      onClick={() => setMenuOpen(true)}
      className="lg:hidden fixed top-3 left-3 z-40 rounded-xl bg-white border border-zinc-200 px-3 py-2 text-base font-bold text-zinc-800 shadow-sm cursor-pointer"
    >
      Menu
    </button>
    {menuOpen && (
      <button type="button" aria-label="Close menu" className="lg:hidden fixed inset-0 z-40 bg-black/40 cursor-pointer" onClick={() => setMenuOpen(false)} />
    )}
    <aside className={`${menuOpen ? "fixed inset-y-0 left-0 z-50 flex rounded-none my-0 ml-0 min-h-screen" : "hidden"} lg:flex w-64 bg-[#eef4f8] p-4 flex-col justify-between shrink-0 lg:rounded-3xl lg:my-2 lg:ml-4 lg:min-h-[calc(100vh-120px)] border border-sky-100/60 shadow-xs`}>
      <div className="space-y-6">
        {/* Navigation items */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-bold transition-all ${
                    isActive
                      ? "bg-[#064FE0] text-white shadow-md shadow-[#064FE0]/20"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate flex-1">{item.label}</span>
                  {item.href === "/admin/messages" && unread > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-base font-bold ${isActive ? "bg-white text-[#064FE0]" : "bg-[#064FE0] text-white"}`}>{unread > 99 ? "99+" : unread}</span>
                  )}
                </Link>
                {item.href === "/admin/categories" && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setWebsiteOpen((open) => !open)}
                      className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-base font-bold transition-all cursor-pointer ${
                        websiteActive
                          ? "bg-[#064FE0] text-white shadow-md shadow-[#064FE0]/20"
                          : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="flex-1 text-left">Website</span>
                      <svg className={`w-3.5 h-3.5 transition-transform ${websiteOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {websiteOpen && (
                      <div className="mt-1 ml-4 space-y-0.5 border-l border-sky-200 pl-2">
                        {WEBSITE_ITEMS.map((link) => {
                          const active = pathname.startsWith(link.href);
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              className={`block rounded-xl px-3 py-2 text-base font-bold ${
                                active ? "bg-white text-[#064FE0]" : "text-zinc-600 hover:bg-white/70 hover:text-zinc-900"
                              }`}
                            >
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer User Badge & Sign out */}
      <div className="space-y-2 pt-4 border-t border-zinc-200/60">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-base font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
        </button>

        <div className="bg-white/80 p-3 rounded-2xl border border-sky-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-700 text-base font-bold">
            👤
          </div>
          <div className="min-w-0">
            <p className="text-base font-black text-zinc-900 truncate">Printgraphy Admin</p>
            <p className="text-base text-zinc-400 font-medium truncate">Enterprise Control</p>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
