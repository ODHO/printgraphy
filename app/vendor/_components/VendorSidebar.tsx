"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Icon, cx, type IconName } from "@/components/admin/ui";

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

interface NavItem {
  id: VendorTab;
  label: string;
  icon: IconName;
  badge?: number;
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

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: "Overview",
      items: [{ id: "dashboard", label: "Dashboard", icon: "dashboard" }],
    },
    {
      title: "Fulfilment",
      items: [
        { id: "incoming", label: "Incoming Orders", icon: "inbox", badge: incomingCount > 0 ? incomingCount : undefined },
        { id: "jobs", label: "My Production Jobs", icon: "services", badge: jobsCount > 0 ? jobsCount : undefined },
      ],
    },
    {
      title: "Business",
      items: [
        { id: "catalog", label: "Catalog Costs & Pricing", icon: "tag" },
        { id: "earnings", label: "Earnings & Payouts", icon: "wallet" },
      ],
    },
    {
      title: "Support",
      items: [{ id: "messages", label: "Live Messages", icon: "messages", badge: unreadCount > 0 ? unreadCount : undefined }],
    },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden w-full flex items-center justify-between bg-white p-3 rounded-2xl border border-zinc-200/70 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#55b2e7] to-[#2884b8] text-white">
            <Icon name="sparkle" className="w-4 h-4" />
          </span>
          <span className="font-semibold text-sm text-zinc-800 truncate">Vendor Portal</span>
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
          "lg:flex lg:sticky lg:top-6 lg:w-64 shrink-0 flex-col justify-between gap-6",
          "bg-gradient-to-b from-[#EAF5FB] to-[#f4fafd] lg:rounded-3xl p-4 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto",
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
                <p className="text-[11px] font-medium text-[#2884b8]">Vendor Portal</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-white/60 text-zinc-600 cursor-pointer"
              aria-label="Close menu"
            >
              <Icon name="close" className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-4">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{section.title}</p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.id);
                          setMobileOpen(false);
                        }}
                        aria-current={isActive ? "page" : undefined}
                        className={cx(
                          "group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-left transition-all cursor-pointer",
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
                        <span className="truncate flex-1">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={cx(
                              "ml-1 min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums",
                              isActive ? "bg-white text-[#2884b8]" : "bg-[#329AD4] text-white"
                            )}
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Section: Availability Toggle, Vendor Info & Logout */}
        <div className="space-y-2.5">
          {/* Availability Status Toggle */}
          {onToggleAvailability && (
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              onClick={() => onToggleAvailability(!isAvailable)}
              className={cx(
                "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                isAvailable
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={cx("h-2 w-2 shrink-0 rounded-full", isAvailable ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                <span className="truncate">{isAvailable ? "Accepting Orders" : "Orders Paused"}</span>
              </span>
              <span
                className={cx(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                  isAvailable ? "bg-emerald-500" : "bg-zinc-300"
                )}
                aria-hidden="true"
              >
                <span
                  className={cx(
                    "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                    isAvailable ? "translate-x-[18px]" : "translate-x-0.5"
                  )}
                />
              </span>
            </button>
          )}

          {/* Vendor Profile Info Box */}
          <div className="flex items-center gap-2.5 rounded-xl border border-[#dbeefb] bg-white/90 p-2.5 shadow-xs">
            <Avatar name={vendorName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-900 truncate">{vendorName}</p>
              <p className="text-[11px] text-zinc-500 truncate">Print Vendor Facility</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50/80 transition-colors cursor-pointer disabled:opacity-60"
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
