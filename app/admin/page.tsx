"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalTemplates: number;
  totalCategories: number;
  totalProducts: number;
  totalOrders: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP 4 STAT CARDS (Matched to Screenshot)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-[#0284c7] text-white p-5 rounded-3xl shadow-md flex justify-between items-start">
          <div className="space-y-3">
            <p className="text-base font-bold opacity-90">Total revenue</p>
            <p className="text-3xl font-black tracking-tight">$1.2k</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
            💳
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-[#7e22ce] text-white p-5 rounded-3xl shadow-md flex justify-between items-start">
          <div className="space-y-3">
            <p className="text-base font-bold opacity-90">Total orders</p>
            <p className="text-3xl font-black tracking-tight">{stats?.totalOrders ?? 350}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
            📋
          </div>
        </div>

        {/* Orders Completed */}
        <div className="bg-[#16a34a] text-white p-5 rounded-3xl shadow-md flex justify-between items-start">
          <div className="space-y-3">
            <p className="text-base font-bold opacity-90">Orders completed</p>
            <p className="text-3xl font-black tracking-tight">130</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
            ✓
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-[#1e3a8a] text-white p-5 rounded-3xl shadow-md flex justify-between items-start">
          <div className="space-y-3">
            <p className="text-base font-bold opacity-90">Pending orders</p>
            <p className="text-3xl font-black tracking-tight">180</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
            ⏳
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MIDDLE SECTION: Charts & Recent Orders Accordion
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Volume Trends & Category Donut (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Orders Volume Trends Bar Chart Box */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">Orders Volume trends</h2>
              <select className="px-3 py-1.5 rounded-xl border border-zinc-200 text-base font-semibold text-zinc-600 bg-white cursor-pointer focus:outline-none">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>

            {/* Custom CSS Bar Chart */}
            <div className="pt-8 pb-2 px-4 flex items-end justify-between h-48 border-b border-zinc-100 relative">
              {/* Peak Badge */}
              <div className="absolute top-2 left-[58%] -translate-x-1/2 bg-[#0284c7] text-white text-base font-bold px-2 py-0.5 rounded-full shadow">
                Peak:142
              </div>

              {[
                { day: "Mon", height: "45%" },
                { day: "Tue", height: "60%" },
                { day: "Wed", height: "50%" },
                { day: "Thu", height: "85%", isPeak: true },
                { day: "Fri", height: "65%" },
                { day: "Sat", height: "60%" },
              ].map((bar) => (
                <div key={bar.day} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-8 bg-zinc-100 rounded-t-lg h-full flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        bar.isPeak ? "bg-[#0284c7]" : "bg-sky-100"
                      }`}
                      style={{ height: bar.height }}
                    />
                  </div>
                  <span className="text-base font-semibold text-zinc-500">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order by Category Donut Chart Box */}
          <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-zinc-900">Order by category</h2>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              {/* Donut Circle */}
              <div className="relative w-36 h-36 rounded-full border-12 border-zinc-900 flex items-center justify-center border-t-[#0284c7] border-r-[#0284c7]">
                <div className="text-center">
                  <p className="text-base font-bold text-zinc-800">Total</p>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-3 text-base">
                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-zinc-900" />
                    <span className="font-bold text-zinc-800">Business cards</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">45%</span>
                </div>

                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0284c7]" />
                    <span className="font-bold text-zinc-800">Packaging</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">30%</span>
                </div>

                <div className="flex items-center justify-between gap-8">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-zinc-300" />
                    <span className="font-bold text-zinc-800">Others</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">25%</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Recent Orders Accordion (4 cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-base text-[#0284c7] hover:underline font-semibold">
              View More
            </Link>
          </div>

          <div className="space-y-3">
            {/* Active Accordion Item */}
            <div className="bg-[#edf4f9] rounded-2xl p-4 border border-sky-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-base text-zinc-500 font-medium">Order ID :</span>
                <span className="text-base font-mono font-bold text-zinc-900 underline">1XIWR84DX-09</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-zinc-500 font-medium">Date Ordered :</span>
                <span className="text-base font-mono text-zinc-700">02/24/24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-zinc-500 font-medium">Order Status :</span>
                <span className="text-base font-bold text-red-500">Pending</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-zinc-500 font-medium">Amount Paid :</span>
                <span className="text-base font-mono font-black text-[#0284c7]">$ 50.45</span>
              </div>
            </div>

            {/* Collapsed Items */}
            {[1, 2].map((i) => (
              <div key={i} className="bg-[#edf4f9]/60 rounded-2xl p-4 border border-sky-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base text-zinc-500 font-medium">Order ID :</span>
                  <span className="text-base font-mono font-bold text-zinc-800">1XIWR84DX-09</span>
                </div>
                <span className="text-zinc-400 text-base">˅</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. BOTTOM SECTION: Recent Alerts List
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">Recent Alerts</h2>
          <select className="px-3 py-1.5 rounded-xl border border-zinc-200 text-base font-semibold text-zinc-600 bg-white cursor-pointer">
            <option>View All</option>
          </select>
        </div>

        <div className="space-y-3">
          {/* Alert Item 1 */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50/60 border border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-base">
                ⚠️
              </div>
              <div>
                <p className="text-base font-bold text-zinc-900">Vendor Rejection: Order #8924</p>
                <p className="text-base text-zinc-500">No vendor accepted within 4 hour window.</p>
              </div>
            </div>
            <span className="text-base text-zinc-400 font-medium">10m ago</span>
          </div>

          {/* Alert Item 2 */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-base">
                🕒
              </div>
              <div>
                <p className="text-base font-bold text-zinc-900">SLA Risk: Order #8910</p>
                <p className="text-base text-zinc-500">Approaching 48h printing deadline.</p>
              </div>
            </div>
            <span className="text-base text-zinc-400 font-medium">1h ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
