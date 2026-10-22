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
      style={{ background: "linear-gradient(135deg, #2196d2, #2d51a4)" }}
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
  { name: "Business Cards", href: "/business-cards" },
  { name: "Post Cards", href: "/browsedesigns?category=Postcards" },
  { name: "Signs & Banners", href: "/browsedesigns?category=Banners" },
  { name: "Clothing & Bags", href: "/clothing-bags" },
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
    <header className="w-full bg-[#ffffff]/95 backdrop-blur-md font-sans border-b border-black/10 sticky top-0 z-40">
      {/* ── Editorial announcement bar ── */}
      {!isAdmin && (
        <div className="printgraphi-announcement relative isolate overflow-hidden bg-gradient-to-r from-[#2196d2] to-[#2d51a4] px-4 py-2 text-white sm:py-2.5">
          <div className="relative mx-auto flex max-w-[1440px] items-center justify-center gap-2.5 text-center sm:gap-3">
            <span className="printgraphi-announcement-pulse hidden h-2 w-2 shrink-0 rounded-full bg-[#88c9ef] sm:block" aria-hidden="true" />
            <span className="hidden text-[10px] font-bold tracking-[0.16em] text-[#b8e0f6] sm:inline">
              PRINTGRAPHY STUDIO
            </span>
            <span className="hidden h-3.5 w-px bg-white/20 sm:block" aria-hidden="true" />
            <Link
              href="/browsedesigns"
              className="group inline-flex min-w-0 items-center justify-center gap-1.5 text-xs font-medium tracking-[0.01em] text-white transition-colors hover:text-[#b8e0f6] sm:text-[13px]"
            >
              <span key={announcementIndex} className="printgraphi-announcement-copy">
                {ANNOUNCEMENTS[announcementIndex]}
              </span>
              <svg className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* ── Main Navbar: Logo + Search + Notification/Cart/My Account ── */}
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 sm:gap-6 px-4 py-3 sm:px-6 lg:px-8">

        {/* Mobile menu toggle & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle mobile menu"
            className="md:hidden p-1 text-zinc-700 hover:text-[#329AD4] transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
              className="h-9 sm:h-10 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Search Bar (Pill with magnifying glass inside on the left) */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl mx-2 sm:mx-6">
          <div className="relative flex items-center w-full">
            <svg
              className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none"
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
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-800 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#329AD4]/20 focus:border-[#329AD4] border border-black/10 transition-all"
            />
          </div>
        </form>

        {/* Right Action Icons: Notification, Cart, Divider, My Account */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Notification Bell */}
          <Link
            href="/dashboard/notifications"
            aria-label="Notifications"
            className="relative p-2 text-zinc-800 hover:text-[#329AD4] transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#329AD4]" />
            )}
          </Link>

          {/* Cart Icon (only on non-admin routes) */}
          {!isAdmin && (
            <Link
              href="/cart"
              aria-label="Shopping Cart"
              className="p-2 text-zinc-800 hover:text-[#329AD4] transition-colors"
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

          {/* Vertical Divider */}
          <div className="h-5 w-[1px] bg-zinc-300 mx-0.5 sm:mx-1" />

          {/* My Account with Circular User Icon and Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((open) => !open)}
              className="flex items-center gap-2 text-sm font-medium text-[#329AD4] hover:opacity-90 transition cursor-pointer py-1"
            >
              <div className="w-7 h-7 rounded-full border-[1.8px] border-[#329AD4] flex items-center justify-center text-[#329AD4] flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="hidden sm:inline font-semibold text-[13px] sm:text-sm">
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

      {/* ── Sub Navigation Menu (Hidden on Admin) ── */}
      {!isAdmin && (
        <nav className="relative border-t border-black/5 bg-[#ffffff]">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <ul className="flex items-center gap-x-4 sm:gap-x-6 lg:gap-x-8 overflow-x-auto py-2.5 text-xs sm:text-[13px] font-medium whitespace-nowrap text-zinc-700 scrollbar-none justify-between">
              {MENU_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name} className="flex-shrink-0">
                    <Link
                      href={item.href}
                      className={`transition-colors hover:text-[#329AD4] ${
                        isActive ? "text-[#329AD4] font-semibold" : ""
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

      {/* ── Mobile Drawer (Slide down on small screens) ── */}
      {mobileMenuOpen && !isAdmin && (
        <div className="md:hidden border-t border-black/10 bg-[#ffffff] px-4 py-4 space-y-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          {MENU_ITEMS.map((item) => (
            <Link
              key={`m-${item.name}`}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-zinc-800 hover:text-[#329AD4] border-b border-black/5"
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
