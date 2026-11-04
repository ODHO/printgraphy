"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import AuthHeader from "./AuthHeader";
import { useMessageStream } from "./useMessageStream";

interface User {
  firstName: string;
  lastName: string;
  email: string;
  isAdmin?: boolean;
  isVendor?: boolean;
}

// ─── Blue My Account Dropdown ─────────────────────────────────────────────────
function MyAccountDropdown({
  user,
  onClose,
  onSignOut,
  isSigningOut,
}: {
  user: User | null;
  onClose: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  return (
    <div
      className="absolute right-0 top-12 w-52 rounded-2xl p-2.5 text-white shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
      style={{ background: "linear-gradient(135deg, #004EE0, #042E7B)" }}
    >
      <div className="flex flex-col gap-1">
        {/* If Admin */}
        {user?.isAdmin && (
          <>
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Admin Portal
            </Link>

            <Link
              href="/vendor/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4" />
              </svg>
              Vendor Portal
            </Link>

            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Customer View
            </Link>
          </>
        )}

        {/* If Vendor */}
        {user && user.isVendor && !user.isAdmin && (
          <>
            <Link
              href="/vendor/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4" />
              </svg>
              Vendor Portal
            </Link>

            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Customer Dashboard
            </Link>
          </>
        )}

        {/* If Regular Customer */}
        {user && !user.isAdmin && !user.isVendor && (
          <>
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Dashboard
            </Link>

            <Link
              href="/dashboard/orders"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              My Orders
            </Link>
          </>
        )}

        {/* If Guest (Not logged in) */}
        {!user && (
          <>
            <Link
              href="/auth/signin"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Sign Up
            </Link>
          </>
        )}

        {/* Setting */}
        {user && (
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
          >
            <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Setting
          </Link>
        )}

        {/* Line divider */}
        {user && <div className="border-t border-white/20 my-1" />}

        {/* Logout / Sign In */}
        {user ? (
          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
            disabled={isSigningOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors cursor-pointer text-left"
          >
            <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isSigningOut ? "Signing out..." : "Logout"}
          </button>
        ) : (
          <Link
            href="/auth"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-colors"
          >
            <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Logout
          </Link>
        )}
      </div>
    </div>
  );
}

const MENU_ITEMS = [
  { name: "Home", href: "/" },
  { name: "Deals", href: "/browsedesigns" },
  { name: "Business Cards", href: "/browsedesigns?category=business-cards" },
  { name: "Post Cards", href: "/browsedesigns?category=Postcards" },
  { name: "Signs & Banners", href: "/browsedesigns?category=Banners" },
  // { name: "Clothing & Bags", href: "/clothing-bags" },
  { name: "Promotion Printing", href: "/browsedesigns?category=Promotion" },
  { name: "Booklets", href: "/browsedesigns?category=Booklets" },
  { name: "Books", href: "/browsedesigns?category=Books" },
  { name: "Calenders", href: "/browsedesigns?category=Calendars" },
  { name: "Shopping Bags", href: "/browsedesigns?category=Bags" },
];

const ANNOUNCEMENTS = [
  "Premium print for brands that want to be remembered.",
  "Thoughtful materials. Sharp detail. Beautifully delivered.",
  "Bring your next big idea to life, one print at a time.",
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const [searchQuery, setSearchQuery] = useState("");
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const liveUrl = pathname?.startsWith("/admin")
    ? "/api/admin/messages/stream"
    : pathname?.startsWith("/vendor")
      ? "/api/vendor/messages/stream"
      : user
        ? "/api/messages/stream"
        : "";

  useMessageStream(liveUrl, () => {
    window.dispatchEvent(new Event("xprints-live"));
  });

  // Fetch current user on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    if (isAdmin) return;
    const timer = window.setInterval(() => {
      setAnnouncementIndex((current) => (current + 1) % ANNOUNCEMENTS.length);
    }, 4600);
    return () => window.clearInterval(timer);
  }, [isAdmin]);

  // Messages count
  useEffect(() => {
    if (!user || pathname?.startsWith("/admin") || pathname?.startsWith("/vendor")) {
      setUnread(0);
      return;
    }
    const loadUnread = () => {
      fetch("/api/messages/unread")
        .then((response) => response.json())
        .then((data) => setUnread(data.total || 0))
        .catch(() => setUnread(0));
    };
    loadUnread();
    const onLive = () => window.setTimeout(loadUnread, 400);
    window.addEventListener("xprints-live", onLive);
    const onCount = (event: Event) => setUnread((event as CustomEvent<number>).detail || 0);
    window.addEventListener("xprints-unread", onCount);
    return () => {
      window.removeEventListener("xprints-live", onLive);
      window.removeEventListener("xprints-unread", onCount);
    };
  }, [user, pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = () => {
    startSignOut(async () => {
      try {
        await fetch("/api/auth/signout", { method: "POST" });
        setUser(null);
        setDropdownOpen(false);
        router.refresh();
      } catch (err) {
        console.error("Sign-out error:", err);
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browsedesigns?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (pathname?.startsWith("/vendor") || pathname?.startsWith("/customize")) {
    return null;
  }

  if (
    pathname?.startsWith("/auth") ||
    pathname === "/login" ||
    pathname === "/signin"
  ) {
    return <AuthHeader />;
  }

  return (
    <header className="w-full bg-white font-sans sticky top-0 z-40">
      {/* 1 · Top utility bar */}
      {!isAdmin && (
        <div className="bg-[#042E7B] text-white">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-1.5 text-[11px] sm:px-6 sm:text-xs lg:px-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="truncate font-medium text-white/95">Professional Online Printing Services</span>
              <span className="hidden text-white/40 sm:inline" aria-hidden>
                |
              </span>
              <Link href="/quote" className="hidden font-medium text-white/90 hover:text-white sm:inline">
                Help Center
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <a href="tel:18005550190" className="hidden font-medium hover:text-[#99CAFF] sm:inline">
                Call 1-800-555-0190
              </a>
              <span className="hidden items-center gap-1.5 text-white/90 sm:inline-flex" title="Region / language">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" strokeLinecap="round" />
                </svg>
                US / EN
              </span>
              <Link href="/dashboard/projects" className="font-semibold hover:text-[#99CAFF]">
                My Projects
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2 · Logo + search + account */}
      <div className="border-b border-[#E3F2FF] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle mobile menu"
              className="p-1 text-[#042E7B] transition hover:text-[#004EE0] md:hidden"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo/logo.png"
                alt="Printgraphy"
                width={378}
                height={108}
                priority
                className="h-9 w-auto object-contain sm:h-10"
              />
            </Link>
          </div>

          <form onSubmit={handleSearchSubmit} className="mx-1 hidden max-w-2xl flex-1 sm:mx-4 sm:block">
            <div className="flex w-full overflow-hidden rounded-full border border-[#99CAFF]/70 bg-[#E3F2FF]/40 focus-within:border-[#004EE0] focus-within:ring-2 focus-within:ring-[#004EE0]/15">
              <div className="relative flex min-w-0 flex-1 items-center">
                <svg
                  className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#042E7B]/50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  placeholder="Search for business cards, banners, invitations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent py-2.5 pl-10 pr-3 text-sm text-[#042E7B] placeholder:text-[#042E7B]/45 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 bg-[#042E7B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004EE0]"
              >
                Search
              </button>
            </div>
          </form>

          <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/dashboard/notifications"
              aria-label="Notifications"
              className="relative p-2 text-[#042E7B] transition-colors hover:text-[#004EE0]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#004EE0]" />
              )}
            </Link>

            {!isAdmin && (
              <Link
                href="/cart"
                aria-label="Shopping Cart"
                className="p-2 text-[#042E7B] transition-colors hover:text-[#004EE0]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </Link>
            )}

            <div className="mx-0.5 hidden h-5 w-px bg-[#99CAFF]/60 sm:block" />

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((open) => !open)}
                className="flex cursor-pointer items-center gap-2 py-1 text-sm font-medium text-[#004EE0] transition hover:opacity-90"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-[1.8px] border-[#004EE0] text-[#004EE0]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="hidden text-[13px] font-semibold sm:inline sm:text-sm">
                  {isAdmin ? (user?.firstName ? user.firstName : "Login") : "My Account"}
                </span>
              </button>

              {dropdownOpen && (
                <MyAccountDropdown
                  user={user}
                  onClose={() => setDropdownOpen(false)}
                  onSignOut={handleSignOut}
                  isSigningOut={isSigningOut}
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearchSubmit} className="border-t border-[#E3F2FF] px-4 py-2.5 sm:hidden">
          <div className="flex overflow-hidden rounded-full border border-[#99CAFF]/70 bg-[#E3F2FF]/50">
            <input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-[#042E7B] placeholder:text-[#042E7B]/45 focus:outline-none"
            />
            <button type="submit" className="bg-[#042E7B] px-4 text-sm font-semibold text-white">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* 3 · Category nav */}
      {!isAdmin && (
        <nav className="border-b border-[#E3F2FF] bg-white">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <ul className="scrollbar-none flex items-center justify-between gap-x-4 overflow-x-auto whitespace-nowrap py-2.5 text-xs font-semibold text-[#042E7B] sm:gap-x-5 sm:text-[13px] lg:gap-x-6">
              {MENU_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const isDeals = item.name === "Deals";
                return (
                  <li key={item.name} className="flex-shrink-0">
                    <Link
                      href={item.href}
                      className={`transition-colors hover:text-[#004EE0] ${
                        isActive || isDeals ? "font-bold text-[#004EE0]" : ""
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      )}

      {/* 4 · Promo strip */}
      {!isAdmin && (
        <div className="bg-[#004EE0] text-white">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-[11px] sm:px-6 sm:text-xs lg:px-8">
            <Link href="/browsedesigns" className="font-medium hover:underline">
              Explore our latest offers
            </Link>
            <span className="text-white/50" aria-hidden>
              |
            </span>
            <span key={announcementIndex} className="printgraphi-announcement-copy font-medium">
              Plus, get <strong className="font-bold">free economy shipping</strong> on all orders $100+
            </span>
            <span className="text-white/50" aria-hidden>
              |
            </span>
            <Link href="/browsedesigns" className="font-semibold underline underline-offset-2 hover:text-[#E3F2FF]">
              Shop all deals
            </Link>
          </div>
        </div>
      )}

      {mobileMenuOpen && !isAdmin && (
        <div className="space-y-1 border-b border-[#E3F2FF] bg-white px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150 md:hidden">
          {MENU_ITEMS.map((item) => (
            <Link
              key={`m-${item.name}`}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block border-b border-[#E3F2FF] py-2.5 text-sm font-semibold text-[#042E7B] hover:text-[#004EE0]"
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
