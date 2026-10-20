"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import AuthHeader from "./AuthHeader";
import { useMessageStream } from "@/components/useMessageStream";
import { mediaSrc } from "@/lib/mediaUrl";

interface User {
  firstName: string;
  lastName: string;
  email: string;
  isAdmin?: boolean;
  isVendor?: boolean;
}

function UserAvatar({ user, onClick }: { user: User; onClick: () => void }) {
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  return (
    <button
      onClick={onClick}
      aria-label="My Profile"
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br from-[#064FE0] to-[#064FE0] text-base font-bold text-white shadow-md shadow-[#064FE0]/30 transition-all duration-200 hover:scale-105 active:scale-95"
    >
      {initials}
    </button>
  );
}

// ─── Profile dropdown ─────────────────────────────────────────────────────────
function ProfileDropdown({
  user,
  onClose,
  onSignOut,
  isSigningOut,
}: {
  user: User;
  onClose: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  return (
    <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      {/* User info */}
      <div className="px-4 py-4 border-b border-zinc-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#064FE0] to-[#064FE0] text-white font-bold text-base flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-zinc-900 truncate">{user.firstName} {user.lastName}</p>
          <p className="text-base text-zinc-400 truncate">{user.email}</p>
        </div>
      </div>

        {/* Menu items */}
      <div className="p-2">
        <Link
          href={user.isAdmin ? "/admin" : "/dashboard"}
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium text-zinc-700 hover:bg-zinc-50 hover:text-[#064FE0] transition-colors group"
        >
          <svg className="w-4 h-4 text-zinc-400 group-hover:text-[#064FE0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {user.isAdmin ? "Admin Dashboard" : "Dashboard"}
        </Link>

        {user.isVendor && (
          <Link
            href="/vendor/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium text-zinc-700 hover:bg-zinc-50 hover:text-[#064FE0] transition-colors group"
          >
            <svg className="w-4 h-4 text-zinc-400 group-hover:text-[#064FE0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Vendor Dashboard
          </Link>
        )}

        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium text-zinc-700 hover:bg-zinc-50 hover:text-[#064FE0] transition-colors group"
        >
          <svg className="w-4 h-4 text-zinc-400 group-hover:text-[#064FE0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Profile
        </Link>

        <Link
          href="/wishlist"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium text-zinc-700 hover:bg-zinc-50 hover:text-[#064FE0] transition-colors group"
        >
          <svg className="w-4 h-4 text-zinc-400 group-hover:text-[#064FE0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Wishlist & Saved Drafts
        </Link>

        <Link
          href="/profile/change-password"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium text-zinc-700 hover:bg-zinc-50 hover:text-[#064FE0] transition-colors group"
        >
          <svg className="w-4 h-4 text-zinc-400 group-hover:text-[#064FE0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Change Password
        </Link>

        <div className="border-t border-zinc-100 my-1.5" />

        <button
          onClick={onSignOut}
          disabled={isSigningOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-base font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isSigningOut ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
          {isSigningOut ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </div>
  );
}

interface MenuLink {
  title: string;
  url: string;
}

interface MenuDropdown {
  columns: { title: string; links: MenuLink[] }[];
  feature: { image: string; title: string; text: string; url: string; linkLabel: string } | null;
}

interface NavLinkItem {
  name: string;
  href: string;
  target?: string;
  loginOnly?: boolean;
  dropdown?: MenuDropdown | null;
}

const DEFAULT_NAV_LINKS: NavLinkItem[] = [
  { name: "Home", href: "/" },
  { name: "Business Cards", href: "/business-cards" },
  { name: "Browse Templates", href: "/browsedesigns" },
  { name: "Design Studio", href: "/customize" },
  { name: "Marketing", href: "/marketing" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Shopping Cart", href: "/cart" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();
  const [navLinks, setNavLinks] = useState<NavLinkItem[]>(DEFAULT_NAV_LINKS);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
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
  }, [pathname]); // re-check on every route change

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

  useEffect(() => {
    fetch("/api/header-menu")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.items) && data.items.length > 0) {
          const mapped: NavLinkItem[] = data.items.map(
            (item: {
              title: string;
              url: string;
              openInNewTab?: boolean;
              loginOnly?: boolean;
              dropdown?: MenuDropdown | null;
            }) => ({
              name: item.title,
              href: item.url,
              target: item.openInNewTab ? "_blank" : undefined,
              loginOnly: Boolean(item.loginOnly),
              dropdown: item.dropdown || null,
            })
          );
          if (!mapped.some((l) => l.href === "/clothing-bags" || /clothing/i.test(l.name))) {
            const insertAt = Math.max(
              0,
              mapped.findIndex((l) => /business.?card/i.test(l.name) || l.href === "/business-cards") + 1
            );
            mapped.splice(insertAt || 1, 0, {
              name: "Clothing & Bags",
              href: "/clothing-bags",
            });
          }
          setNavLinks(mapped);
        }
      })
      .catch(() => setNavLinks(DEFAULT_NAV_LINKS));
  }, [pathname]);

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
      await fetch("/api/auth/signout", { method: "POST" });
      setUser(null);
      setDropdownOpen(false);
      router.push("/");
      router.refresh();
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browsedesigns?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (pathname?.startsWith("/auth")) {
    return <AuthHeader />;
  }

  return (
    <header className="w-full bg-white font-sans">
      <div className="bg-[#064FE0] text-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-2 text-[13px] sm:px-6 lg:px-8">
          <div className="flex items-center gap-5">
            <Link href="/" className="hidden hover:underline sm:inline">Professional Online Printing Services</Link>
            <Link href="/contact" className="hover:underline">Help Center</Link>
          </div>
          <div className="flex items-center gap-4 sm:gap-5">
            <a href="tel:18005550180" className="hover:underline">Call 1-800-555-0180</a>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
              </svg>
              US / EN
            </span>
            <Link href={user ? "/dashboard" : "/auth"} className="font-medium hover:underline">My Projects</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
        <Link href="/" className="shrink-0">
          <Image src="/logo/logo.png" alt="Printgraphy" width={180} height={48} priority className="h-9 w-auto object-contain" />
        </Link>
        <form onSubmit={handleSearchSubmit} className="w-full lg:mx-8 lg:max-w-4xl lg:flex-1">
          <div className="flex items-center rounded-full border border-zinc-200 bg-[#f4f5f7] pl-4 pr-1.5 focus-within:border-[#064FE0] focus-within:bg-white">
            <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search for business cards, banners, invitations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
            />
            <button type="submit" className="shrink-0 rounded-full bg-[#064FE0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0439A8]">
              Search
            </button>
          </div>
        </form>
        <div className="flex items-center justify-end gap-2">
          {user && !pathname?.startsWith("/admin") && !pathname?.startsWith("/vendor") && (
            <Link href="/dashboard/messages" aria-label="Messages" title="Messages" className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8EEFD] text-[#064FE0] transition hover:bg-[#D4E2FC]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unread > 0 && <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          )}
          <Link href={user?.isAdmin ? "/admin" : "/dashboard"} aria-label={user?.isAdmin ? "Admin Dashboard" : "Dashboard"} title={user?.isAdmin ? "Admin Dashboard" : "Dashboard"} className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8EEFD] text-[#064FE0] transition hover:bg-[#D4E2FC]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <Link href="/cart" aria-label="Shopping Cart" title="Cart" className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8EEFD] text-[#064FE0] transition hover:bg-[#D4E2FC]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </Link>
          <Link href="/wishlist" aria-label="Favorites" title="Wishlist & Drafts" className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8EEFD] text-[#064FE0] transition hover:bg-[#D4E2FC]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </Link>
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <UserAvatar user={user} onClick={() => setDropdownOpen((open) => !open)} />
              {dropdownOpen && (
                <ProfileDropdown
                  user={user}
                  onClose={() => setDropdownOpen(false)}
                  onSignOut={handleSignOut}
                  isSigningOut={isSigningOut}
                />
              )}
            </div>
          ) : (
            <Link href="/auth" aria-label="Sign In" className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#064FE0] text-white shadow-md shadow-[#064FE0]/20 transition hover:bg-[#0439A8]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      <nav className="relative border-t border-zinc-100" onMouseLeave={() => setOpenMenu(null)}>
        <ul className="scrollbar-hide mx-auto flex max-w-[1440px] items-center gap-x-5 overflow-x-auto px-4 py-3 text-[13px] font-medium whitespace-nowrap text-zinc-800 sm:px-6 lg:px-8 justify-between">
          {navLinks.filter((link) => !link.loginOnly || user).map((link) => (
            <li key={`${link.name}-${link.href}`} onMouseEnter={() => setOpenMenu(link.dropdown ? link.name : null)}>
              <Link
                href={link.href}
                target={link.target}
                rel={link.target === "_blank" ? "noopener noreferrer" : undefined}
                onClick={(event) => {
                  if (link.dropdown && openMenu !== link.name) {
                    event.preventDefault();
                    setOpenMenu(link.name);
                  }
                }}
                className={`relative py-1 hover:text-[#064FE0] ${openMenu === link.name ? "text-[#064FE0]" : ""}`}
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
        {navLinks.filter((link) => !link.loginOnly || user).map((link) =>
          openMenu === link.name && link.dropdown ? (
            <div key={`menu-${link.name}`} className="absolute left-0 right-0 top-full z-50 border-t border-zinc-100 bg-white shadow-xl">
              <div className="mx-auto flex max-w-[1440px] gap-8 px-6 py-6">
                <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                  {link.dropdown.columns.map((column) => (
                    <div key={column.title}>
                      <p className="mb-2 text-sm font-bold text-zinc-900">{column.title}</p>
                      <ul className="space-y-1.5">
                        {column.links.map((item) => (
                          <li key={`${column.title}-${item.title}`}>
                            <Link href={item.url} onClick={() => setOpenMenu(null)} className="text-sm text-zinc-600 hover:text-[#064FE0] hover:underline">
                              {item.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {link.dropdown.feature && (link.dropdown.feature.image || link.dropdown.feature.title) && (
                  <Link href={link.dropdown.feature.url || link.href} onClick={() => setOpenMenu(null)} className="hidden w-56 shrink-0 lg:block">
                    {link.dropdown.feature.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaSrc(link.dropdown.feature.image)} alt="" className="h-36 w-full rounded-xl object-cover" />
                    )}
                    {link.dropdown.feature.title && <p className="mt-2 text-sm font-bold text-zinc-900">{link.dropdown.feature.title}</p>}
                    {link.dropdown.feature.text && <p className="mt-1 text-sm text-zinc-500">{link.dropdown.feature.text}</p>}
                    {link.dropdown.feature.linkLabel && <p className="mt-2 text-sm font-semibold text-[#064FE0]">{link.dropdown.feature.linkLabel}</p>}
                  </Link>
                )}
              </div>
            </div>
          ) : null
        )}
      </nav>

      <div className="bg-[#064FE0] text-center text-[13px] text-white sm:text-sm">
        <p className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-2 px-4 py-2.5">
          <Link href="/browsedesigns" className="hover:underline">Explore our latest offers</Link>
          <span aria-hidden="true">|</span>
          <span>Plus, get <span className="font-bold underline">free economy shipping</span> on all orders $100+</span>
          <span aria-hidden="true">|</span>
          <Link href="/browsedesigns" className="underline underline-offset-2 hover:opacity-90">Shop all deals</Link>
        </p>
      </div>
    </header>
  );
}
