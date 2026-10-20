"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "@/components/useMessageStream";
import Link from "next/link";

interface WalletRow {
  _id: string;
  name: string;
  email: string;
  stripeAccountId: string;
  stripePublishableKey?: string;
  accountHolderName: string;
  available: number;
  pending: number;
  withdrawn: number;
}

interface MoneyOrder {
  _id: string;
  orderNumber: string;
  vendor: string;
  released: boolean;
  customerPaid: number;
  vendorPayment: number;
  reprint: number;
  vendorNet: number;
  adminKeeps: number;
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function AdminWalletPage() {
  const [rows, setRows] = useState<WalletRow[]>([]);
  const [orders, setOrders] = useState<MoneyOrder[]>([]);
  const [platform, setPlatform] = useState({ collected: 0, vendorShare: 0, adminWallet: 0, reprints: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/wallet")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setRows(data.vendors || []);
          setOrders(data.orders || []);
          setPlatform(data.platform || { collected: 0, vendorShare: 0, adminWallet: 0, reprints: 0 });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(load);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Wallets</h1>
        <p className="text-base text-zinc-500 mt-1">Admin keeps what the customer paid, minus the vendor payment. A vendor-fault reprint is taken from the vendor and added back here.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Customer paid" value={money(platform.collected)} />
        <Stat label="Vendor share" value={money(platform.vendorShare)} />
        <Stat label="Reprints recovered" value={money(platform.reprints)} />
        <Stat label="Admin wallet" value={money(platform.adminWallet)} />
      </div>
      <p className="text-base text-zinc-500">Admin wallet = customer paid − vendor payment + fault reprints. A $120 order assigned at $40 leaves $80 here. A later $10 reprint makes it $90.</p>
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-zinc-500 bg-zinc-50">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer paid</th>
              <th className="px-4 py-3">Vendor payment</th>
              <th className="px-4 py-3">Reprint</th>
              <th className="px-4 py-3">Vendor gets</th>
              <th className="px-4 py-3">Admin keeps</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order._id}`} className="font-bold text-[#064FE0]">{order.orderNumber}</Link>
                  <p className="text-zinc-400">{order.vendor || "Unassigned"}{order.released ? " · released" : ""}</p>
                </td>
                <td className="px-4 py-3">{money(order.customerPaid)}</td>
                <td className="px-4 py-3">{money(order.vendorPayment)}</td>
                <td className="px-4 py-3 text-red-600">{order.reprint ? `−${money(order.reprint)}` : "—"}</td>
                <td className="px-4 py-3 font-bold">{money(order.vendorNet)}</td>
                <td className="px-4 py-3 font-bold text-emerald-700">{money(order.adminKeeps)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
        {loading ? <p className="p-8 text-base text-zinc-500">Loading wallets...</p> : (
          <table className="w-full text-base">
            <thead>
              <tr className="text-left text-zinc-500 bg-zinc-50">
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Stripe</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Withdrawn</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-t border-zinc-100">
                  <td className="px-4 py-3">
                    <Link href={`/admin/vendors/${row._id}`} className="font-bold text-[#064FE0]">{row.name}</Link>
                    <p className="text-zinc-400">{row.email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{row.stripePublishableKey ? "Keys saved" : "Not added"}{row.accountHolderName ? ` · ${row.accountHolderName}` : ""}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">{money(row.available)}</td>
                  <td className="px-4 py-3">{money(row.pending)}</td>
                  <td className="px-4 py-3">{money(row.withdrawn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4">
      <p className="text-base font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-xl font-black text-zinc-900 mt-1">{value}</p>
    </div>
  );
}
