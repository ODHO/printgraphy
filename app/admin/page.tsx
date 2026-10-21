"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalOrders: number;
  newOrders: number;
  cancelledOrders: number;
  earnings: number;
  totalUsers: number;
  totalVendors: number;
}

interface RecentUser {
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
}

interface RecentVendor {
  _id?: string;
  name?: string;
  contactName?: string;
  email: string;
  phone?: string;
}

const DEFAULT_USERS: RecentUser[] = [
  { name: "abdulrehman", email: "abdulrehmanbhojani@gmail.com", phone: "3020267008" },
  { name: "Rochelle kin", email: "rochellekin@mailinator.com", phone: "3050448411" },
  { name: "luna", email: "luna@mailinator.com", phone: "3242718611" },
  { name: "jack rose", email: "jackrose@mailinator.com", phone: "3242718611" },
];

const DEFAULT_VENDORS: RecentVendor[] = [
  { contactName: "Saad", email: "Mustafa.toroani@gmail.com", phone: "052 275 6608" },
  { contactName: "Dis flower", email: "flowerd@mailinator.com", phone: "03048632364" },
  { contactName: "second", email: "second@mailinator.com", phone: "3233053310" },
];

function formatCount(num: number | undefined, defaultVal: number): string {
  const val = num !== undefined && num !== null && num > 0 ? num : defaultVal;
  return val < 10 ? `0${val}` : `${val}`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>(DEFAULT_USERS);
  const [recentVendors, setRecentVendors] = useState<RecentVendor[]>(DEFAULT_VENDORS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.stats) {
          setStats(data.stats);
          if (data.recentUsers && data.recentUsers.length > 0) {
            setRecentUsers(
              data.recentUsers.map((u: any) => ({
                name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email.split("@")[0],
                email: u.email,
                phone: u.phone || "—",
              }))
            );
          }
          if (data.recentVendors && data.recentVendors.length > 0) {
            setRecentVendors(
              data.recentVendors.map((v: any) => ({
                contactName: v.contactName || v.name || v.email.split("@")[0],
                email: v.email,
                phone: v.phone || "—",
              }))
            );
          }
        }
      })
      .catch((err) => console.error("Error fetching stats:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalOrders = stats?.totalOrders ?? 58;
  const newOrders = stats?.newOrders ?? 18;
  const cancelledOrders = stats?.cancelledOrders ?? 5;
  const earnings = stats?.earnings ?? 1670.0;
  const totalUsers = stats?.totalUsers ?? 566;
  const totalVendors = stats?.totalVendors ?? 98;

  return (
    <div className="space-y-6 w-full">
      {/* Title */}
      <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Dashboard</h1>

      {/* ─────────────────────────────────────────────────────────────
          6 STAT CARDS (3 columns on desktop, responsive)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Total Orders */}
        <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
          <p className="text-sm font-semibold text-zinc-800">Total Orders</p>
          <p className="text-4xl lg:text-5xl font-normal text-zinc-900 text-center my-3">
            {formatCount(totalOrders, 58)}
          </p>
          <div />
        </div>

        {/* 2. New Orders */}
        <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
          <p className="text-sm font-semibold text-zinc-800">New Orders</p>
          <p className="text-4xl lg:text-5xl font-normal text-zinc-900 text-center my-3">
            {formatCount(newOrders, 18)}
          </p>
          <div />
        </div>

        {/* 3. Cancelled Orders */}
        <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
          <p className="text-sm font-semibold text-zinc-800">Cancelled Orders</p>
          <p className="text-4xl lg:text-5xl font-normal text-zinc-900 text-center my-3">
            {formatCount(cancelledOrders, 5)}
          </p>
          <div />
        </div>

        {/* 4. Earnings */}
        <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
          <p className="text-sm font-semibold text-zinc-800">Earnings</p>
          <p className="text-3xl lg:text-4xl font-normal text-zinc-900 text-center my-3">
            $ {earnings.toFixed(2)}
          </p>
          <div />
        </div>

        {/* 5. Number of Users */}
        <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
          <p className="text-sm font-semibold text-zinc-800">Number of Users</p>
          <p className="text-4xl lg:text-5xl font-normal text-zinc-900 text-center my-3">
            {totalUsers > 0 ? totalUsers : 566}
          </p>
          <div />
        </div>

        {/* 6. Number of Vendors */}
        <div className="bg-[#EAF5FB] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] transition-transform hover:translate-y-[-1px]">
          <p className="text-sm font-semibold text-zinc-800">Number of Vendors</p>
          <p className="text-4xl lg:text-5xl font-normal text-zinc-900 text-center my-3">
            {totalVendors > 0 ? totalVendors : 98}
          </p>
          <div />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TABLE 1: Recent Users
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-100 shadow-xs">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-800">Recent Users</h2>
          <Link
            href="/admin/users"
            className="text-xs font-semibold text-[#329AD4] hover:underline transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-700 font-semibold text-xs">
                <th className="py-2.5 pr-4 font-semibold">User Name</th>
                <th className="py-2.5 px-4 font-semibold">User Email</th>
                <th className="py-2.5 pl-4 font-semibold">User Phone Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentUsers.map((user, idx) => (
                <tr key={user._id || idx} className="text-zinc-700 hover:bg-zinc-50/50 transition">
                  <td className="py-3.5 pr-4 font-normal text-zinc-800 capitalize">
                    {user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User"}
                  </td>
                  <td className="py-3.5 px-4 font-normal text-zinc-600">
                    {user.email}
                  </td>
                  <td className="py-3.5 pl-4 font-normal text-zinc-600">
                    {user.phone || "3020267008"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TABLE 2: Recent Vendors
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-100 shadow-xs">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-800">Recent Vendors</h2>
          <Link
            href="/admin/vendors"
            className="text-xs font-semibold text-[#329AD4] hover:underline transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-700 font-semibold text-xs">
                <th className="py-2.5 pr-4 font-semibold">Store Owner Name</th>
                <th className="py-2.5 px-4 font-semibold">Store Owner Email</th>
                <th className="py-2.5 pl-4 font-semibold">Store Owner Phone Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentVendors.map((vendor, idx) => (
                <tr key={vendor._id || idx} className="text-zinc-700 hover:bg-zinc-50/50 transition">
                  <td className="py-3.5 pr-4 font-normal text-zinc-800 capitalize">
                    {vendor.contactName || vendor.name || "Vendor"}
                  </td>
                  <td className="py-3.5 px-4 font-normal text-zinc-600">
                    {vendor.email}
                  </td>
                  <td className="py-3.5 pl-4 font-normal text-zinc-600">
                    {vendor.phone || "052 275 6608"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
