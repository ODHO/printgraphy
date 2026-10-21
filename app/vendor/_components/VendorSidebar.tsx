"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type VendorTab = "dashboard" | "incoming" | "jobs" | "catalog" | "earnings" | "messages";

interface VendorSidebarProps {
  currentTab: VendorTab;
  onSelectTab: (tab: VendorTab) => void;
  vendorName?: string;
  isAvailable?: boolean;
  onToggleAvailability?: (newStatus: boolean) => void;
  unreadCount?: number;
  incomingCount?: number;
  jobsCount?: number;
}

export default function VendorSidebar({
  currentTab,
  onSelectTab,
  vendorName = "Vendor Facility",
  isAvailable = true,
  onToggleAvailability,
  unreadCount = 0,
  incomingCount = 0,
  jobsCount = 0,
}: VendorSidebarProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      localStorage.removeItem("vendorId");
      localStorage.removeItem("vendorName");
      router.push("/auth/signin");
      router.refresh();
    } catch (err) {
      console.error("Vendor sign out error:", err);
      setSigningOut(false);
    }
  };

  const navItems: { id: VendorTab; label: string; badge?: number; icon: ReactNode }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "incoming",
      label: "Incoming Orders",
      badge: incomingCount > 0 ? incomingCount : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      id: "jobs",
      label: "My Production Jobs",
      badge: jobsCount > 0 ? jobsCount : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "catalog",
      label: "Catalog Costs & Pricing",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: "earnings",
      label: "Earnings & Payouts",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: "messages",
      label: "Live Messages",
      badge: unreadCount > 0 ? unreadCount : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden w-full mb-3 flex items-center justify-between bg-[#EAF5FB] p-3 rounded-xl border border-sky-100">
        <span className="font-semibold text-sm text-zinc-800">Vendor Navigation</span>
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
            <span className="font-bold text-zinc-900 text-sm">Printgraphy Vendor</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-lg hover:bg-white/60 text-zinc-600 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? "bg-[#329AD4] text-white shadow-xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? "bg-white text-[#329AD4]" : "bg-[#329AD4] text-white"
                      }`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Availability Toggle, Vendor Info & Logout */}
        <div className="pt-6 space-y-3">
          {/* Availability Status Toggle */}
          {onToggleAvailability && (
            <button
              type="button"
              onClick={() => onToggleAvailability(!isAvailable)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isAvailable
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isAvailable ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span>{isAvailable ? "Accepting Orders" : "Orders Paused"}</span>
            </button>
          )}

          {/* Vendor Profile Info Box */}
          <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#329AD4]/10 text-[#329AD4] font-bold text-xs flex items-center justify-center shrink-0">
              V
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-900 truncate">{vendorName}</p>
              <p className="text-[10px] text-zinc-500 truncate">Print Vendor Facility</p>
            </div>
          </div>

          {/* Logout Button */}
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
