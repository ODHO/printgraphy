"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "@/components/useMessageStream";
import Link from "next/link";
import { Avatar, Badge, Card, CardHeader, cx, EmptyState, LoadingState, Notice, PageHeader, SkeletonRows, StatTile, table } from "@/components/admin/ui";

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
      <PageHeader
        icon="wallet"
        title="Wallets"
        description="Admin keeps what the customer paid, minus the vendor payment. A vendor-fault reprint is taken from the vendor and added back here."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Customer paid" value={<span className="tabular-nums">{money(platform.collected)}</span>} icon="dollar" tone="brand" loading={loading} />
        <StatTile label="Vendor share" value={<span className="tabular-nums">{money(platform.vendorShare)}</span>} icon="vendors" tone="violet" loading={loading} />
        <StatTile label="Reprints recovered" value={<span className="tabular-nums">{money(platform.reprints)}</span>} icon="refresh" tone="amber" loading={loading} />
        <StatTile label="Admin wallet" value={<span className="tabular-nums">{money(platform.adminWallet)}</span>} icon="wallet" tone="green" loading={loading} />
      </div>

      <Notice tone="brand" title="How the admin wallet is calculated">
        Admin wallet = customer paid − vendor payment + fault reprints. A $120 order assigned at $40 leaves $80 here. A later $10 reprint makes it $90.
      </Notice>

      <Card className="overflow-hidden">
        <CardHeader icon="orders" title="Order money flow" subtitle="Per-order split between vendor and admin" />
        {loading ? (
          <SkeletonRows rows={4} />
        ) : orders.length === 0 ? (
          <EmptyState icon="orders" title="No orders yet" description="Paid orders will appear here with their vendor and admin split." />
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Order</th>
                  <th className={cx(table.th, "text-right")}>Customer paid</th>
                  <th className={cx(table.th, "text-right")}>Vendor payment</th>
                  <th className={cx(table.th, "text-right")}>Reprint</th>
                  <th className={cx(table.th, "text-right")}>Vendor gets</th>
                  <th className={cx(table.th, "text-right")}>Admin keeps</th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {orders.map((order) => (
                  <tr key={order._id} className={table.tr}>
                    <td className={table.td}>
                      <Link href={`/admin/orders/${order._id}`} className="font-semibold text-[#329AD4] hover:text-[#2884b8]">{order.orderNumber}</Link>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 whitespace-nowrap">
                        {order.vendor || "Unassigned"}
                        {order.released ? <Badge tone="green" className="!px-1.5 !py-0 text-[10px]">released</Badge> : ""}
                      </p>
                    </td>
                    <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap")}>{money(order.customerPaid)}</td>
                    <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap")}>{money(order.vendorPayment)}</td>
                    <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap", order.reprint ? "text-rose-600" : "text-zinc-400")}>{order.reprint ? `−${money(order.reprint)}` : "—"}</td>
                    <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap font-semibold text-zinc-900")}>{money(order.vendorNet)}</td>
                    <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap")}>
                      <span className="inline-flex rounded-lg bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">{money(order.adminKeeps)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader icon="vendors" title="Vendor wallets" subtitle="Balances and Stripe payout setup per vendor" />
        {loading ? <LoadingState label="Loading wallets..." /> : rows.length === 0 ? (
          <EmptyState icon="wallet" title="No vendor wallets yet" />
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Vendor</th>
                  <th className={table.th}>Stripe</th>
                  <th className={cx(table.th, "text-right")}>Available</th>
                  <th className={cx(table.th, "text-right")}>Pending</th>
                  <th className={cx(table.th, "text-right")}>Withdrawn</th>
                </tr>
              </thead>
              <tbody className={table.tbody}>
                {rows.map((row) => (
                  <tr key={row._id} className={table.tr}>
                    <td className={table.td}>
                      <div className="flex items-center gap-3">
                        <Avatar name={row.name || row.email || "?"} />
                        <div className="min-w-0">
                          <Link href={`/admin/vendors/${row._id}`} className="font-semibold text-[#329AD4] hover:text-[#2884b8]">{row.name}</Link>
                          <p className="text-xs text-zinc-500 truncate">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={table.td}>
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={row.stripePublishableKey ? "green" : "gray"} dot>{row.stripePublishableKey ? "Keys saved" : "Not added"}</Badge>
                        {row.accountHolderName ? <span className="text-xs text-zinc-500">{row.accountHolderName}</span> : null}
                      </div>
                    </td>
                    <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap font-semibold text-emerald-700")}>{money(row.available)}</td>
                    <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap")}>{money(row.pending)}</td>
                    <td className={cx(table.td, "text-right tabular-nums whitespace-nowrap")}>{money(row.withdrawn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
