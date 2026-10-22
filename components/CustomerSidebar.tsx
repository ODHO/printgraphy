"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type CustomerSidebarItem =
  | "Dashboard"
  | "Recent Projects"
  | "My Orders"
  | "Notifications"
  | "Account Settings"
  | "Payments methods"
  | "Sign Out";

interface CustomerSidebarProps {
  activeItem?: CustomerSidebarItem;
}

export default function CustomerSidebar({
  activeItem,
}: CustomerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, startSignOut] = useTransition();

  let resolvedActive = activeItem;
  if (!resolvedActive) {
    if (pathname?.startsWith("/dashboard/payments") || pathname?.startsWith("/dashboard/payment")) resolvedActive = "Payments methods";
    else if (pathname?.startsWith("/dashboard/projects") || pathname?.startsWith("/dashboard/recent-projects")) resolvedActive = "Recent Projects";
    else if (pathname?.startsWith("/dashboard/orders")) resolvedActive = "My Orders";
    else if (pathname?.startsWith("/dashboard/notifications") || pathname === "/notifications") resolvedActive = "Notifications";
    else if (pathname?.startsWith("/profile") || pathname?.startsWith("/dashboard/account") || pathname?.startsWith("/dashboard/settings")) resolvedActive = "Account Settings";
    else if (pathname === "/dashboard") resolvedActive = "Dashboard";
    else resolvedActive = "Dashboard";
  }

  const handleSignOut = () => {
    startSignOut(async () => {
      try {
        await fetch("/api/auth/signout", { method: "POST" });
        router.push("/auth/signin");
        router.refresh();
      } catch (err) {
        console.error("Sign out error:", err);
      }
    });
  };

  const navItems: { label: CustomerSidebarItem; href: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Recent Projects", href: "/dashboard/projects" },
    { label: "My Orders", href: "/dashboard/orders" },
    { label: "Notifications", href: "/dashboard/notifications" },
    { label: "Account Settings", href: "/profile" },
    { label: "Payments methods", href: "/dashboard/payments" },
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
      <div className="bg-[#fff1eb] rounded-3xl p-5 sm:p-6 md:p-7 space-y-1.5 sm:space-y-2">
        {navItems.map((item) => {
          const isActive = resolvedActive === item.label;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`block px-4 py-3 rounded-2xl text-[15px] sm:text-base font-medium transition-all ${
                isActive
                  ? "bg-[#e74b2d] text-white font-semibold shadow-sm"
                  : "text-zinc-600 hover:text-[#e74b2d] hover:bg-white/60"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full text-left px-4 py-3 rounded-2xl text-[15px] sm:text-base font-medium text-zinc-600 hover:text-red-600 hover:bg-white/60 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSigningOut ? "Signing Out..." : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
