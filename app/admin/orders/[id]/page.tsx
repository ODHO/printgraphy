"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import VendorSelect from "../../_components/VendorSelect";
import {
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Icon,
  LoadingState,
  Notice,
  PageHeader,
  cx,
  inputClass,
  labelClass,
  statusTone,
  table,
} from "@/components/admin/ui";
import type { ReactNode } from "react";

/** Definition-list row: muted label on the left, value on the right. */
function InfoRow({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-start justify-between gap-4 py-2 text-sm", className)}>
      <dt className="text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-right font-medium text-zinc-900 min-w-0 break-words">{children}</dd>
    </div>
  );
}

interface EmployeeRow {
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  extras?: Record<string, string>;
}

interface OrderItem {
  name: string;
  thumbnail: string;
  backThumbnail?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specs: Record<string, string>;
}

interface OrderDetail {
  _id: string;
  orderNumber: string;
  guestEmail?: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  paidAt?: string;
  notes?: string;
  couponCode?: string;
  productionNotes?: string;
  assignedAt?: string;
  payoutQualifiedAt?: string;
  payoutAmount?: number;
  vendorPayment?: number;
  vendorAgreedAt?: string;
  payoutReleasedAt?: string;
  customerConfirmedAt?: string;
  vendorId?: { _id: string; name: string; email?: string; phone?: string; status?: string } | null;
  messages?: { author: string; body: string; createdAt: string }[];
  reprint?: { flagged: boolean; amount: number; note: string; createdAt: string };
  trackingNumber?: string;
  trackingCarrier?: string;
  userId?: { firstName?: string; lastName?: string; email?: string; phone?: string } | null;
  items: OrderItem[];
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
}

function readEmployees(specs: Record<string, string>): EmployeeRow[] {
  if (!specs.employeeData) return [];
  try {
    const rows = JSON.parse(specs.employeeData);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function visibleSpecs(specs: Record<string, string>) {
  return Object.entries(specs).filter(([key]) => key !== "employeeData" && key !== "employees");
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vendors, setVendors] = useState<{ _id: string; name: string; status: string; isAvailable?: boolean }[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [vendorPayment, setVendorPayment] = useState("");
  const [productionNotes, setProductionNotes] = useState("");
  const [message, setMessage] = useState("");
  const [reprintAmount, setReprintAmount] = useState("");
  const [reprintNote, setReprintNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setOrder(data.order);
          setVendorId(data.order.vendorId?._id || "");
          setVendorPayment(String(data.order.vendorPayment || data.order.payoutAmount || ""));
          setProductionNotes(data.order.productionNotes || "");
        }
        else setError(data.message || "Could not load this order.");
      })
      .catch(() => setError("Could not load this order."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch("/api/admin/vendors?limit=50")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setVendors(data.vendors || []);
      });
  }, []);

  const saveFulfillment = async () => {
    if (!order) return;
    setSaving(true);
    setNotice("");
    const response = await fetch(`/api/admin/orders/${order._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, vendorPayment: Number(vendorPayment), productionNotes }),
    });
    const data = await response.json();
    setNotice(data.success ? "Fulfillment saved." : data.message || "Could not save.");
    if (data.success) {
      const fresh = await fetch(`/api/admin/orders/${order._id}`).then((res) => res.json());
      if (fresh.success) setOrder(fresh.order);
    }
    setSaving(false);
  };

  const sendMessage = async () => {
    if (!order || !message.trim()) return;
    setSaving(true);
    const response = await fetch(`/api/admin/orders/${order._id}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: message }),
    });
    const data = await response.json();
    if (data.success) {
      setMessage("");
      const fresh = await fetch(`/api/admin/orders/${order._id}`).then((res) => res.json());
      if (fresh.success) setOrder(fresh.order);
    } else {
      setNotice(data.message || "Could not add the note.");
    }
    setSaving(false);
  };

  const flagReprint = async () => {
    if (!order) return;
    setSaving(true);
    setNotice("");
    const response = await fetch(`/api/admin/orders/${order._id}/reprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(reprintAmount), note: reprintNote }),
    });
    const data = await response.json();
    setNotice(data.success ? "Reprint cost deducted from the vendor balance." : data.message || "Could not flag the reprint.");
    if (data.success) {
      setReprintAmount("");
      setReprintNote("");
      const fresh = await fetch(`/api/admin/orders/${order._id}`).then((res) => res.json());
      if (fresh.success) setOrder(fresh.order);
    }
    setSaving(false);
  };


  if (loading) {
    return (
      <Card className="max-w-6xl">
        <LoadingState label="Loading order…" />
      </Card>
    );
  }

  if (error || !order) {
    return (
      <Card padded className="max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Icon name="ban" className="w-5 h-5" />
          </span>
          <p className="text-sm font-semibold text-rose-700">{error || "Order not found."}</p>
        </div>
        <ButtonLink href="/admin/orders" variant="secondary" icon="arrowLeft" size="sm">
          Back to orders
        </ButtonLink>
      </Card>
    );
  }

  const customerName = order.userId
    ? `${order.userId.firstName || ""} ${order.userId.lastName || ""}`.trim()
    : order.shippingAddress.name;
  const customerEmail = order.userId?.email || order.guestEmail || "";
  const vendorPaid = Number(order.vendorPayment || 0);
  const reprintShare = order.reprint?.flagged ? order.reprint.amount : 0;
  const adminShare = order.totalAmount - vendorPaid + reprintShare;
  const vendorAcceptance = order.vendorAgreedAt
    ? `Vendor accepted ${new Date(order.vendorAgreedAt).toLocaleString()}`
    : order.vendorId && order.fulfillmentStatus === "pending"
      ? "Waiting for the vendor to accept this payment."
      : "";

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        back={{ href: "/admin/orders", label: "Order queue" }}
        icon="orders"
        title={<span className="font-mono">{order.orderNumber}</span>}
        description={
          <>
            Placed {new Date(order.createdAt).toLocaleString()}
            {order.paidAt ? ` · Paid ${new Date(order.paidAt).toLocaleString()}` : ""}
          </>
        }
        actions={
          <>
            <Badge tone={statusTone(order.paymentStatus)} dot>
              {order.paymentStatus}
            </Badge>
            <Badge tone={statusTone(order.fulfillmentStatus)} dot>
              {order.fulfillmentStatus.replaceAll("_", " ")}
            </Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Vendor assignment */}
          <Card>
            <CardHeader icon="vendors" title="Vendor assignment and production" subtitle="Assign a vendor, set their payment and leave production notes." />
            <div className="p-5 sm:p-6 space-y-5">
              {notice && <Notice tone="brand">{notice}</Notice>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className={labelClass}>Assigned vendor</span>
                  <VendorSelect vendors={vendors} value={vendorId} onChange={setVendorId} />
                </div>
                <label className="block">
                  <span className={labelClass}>Vendor payment</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                    <input value={vendorPayment} onChange={(event) => setVendorPayment(event.target.value)} type="number" step="0.01" min="0" placeholder="Amount the vendor receives" className={cx(inputClass, "pl-7 tabular-nums")} />
                  </div>
                </label>
                <label className="block sm:col-span-2">
                  <span className={labelClass}>Production notes</span>
                  <textarea value={productionNotes} onChange={(event) => setProductionNotes(event.target.value)} rows={3} className={cx(inputClass, "resize-y")} />
                </label>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={saveFulfillment} disabled={saving} icon={saving ? undefined : "check"}>
                  {saving ? "Saving..." : "Save assignment and notes"}
                </Button>
                <button
                  type="button"
                  disabled={saving || order.fulfillmentStatus !== "delivered" || !order.customerConfirmedAt || Boolean(order.payoutReleasedAt)}
                  onClick={async () => {
                    setSaving(true);
                    setNotice("");
                    const response = await fetch(`/api/admin/orders/${order._id}/release`, { method: "POST" });
                    const data = await response.json();
                    setNotice(data.message || (data.success ? "Payment released." : "Could not release the payment."));
                    if (data.success) {
                      const fresh = await fetch(`/api/admin/orders/${order._id}`).then((res) => res.json());
                      if (fresh.success) setOrder(fresh.order);
                    }
                    setSaving(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/25 transition-all cursor-pointer hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                >
                  <Icon name="wallet" className="w-4 h-4" strokeWidth={2.2} />
                  Release payment to vendor
                </button>
              </div>
            </div>
          </Card>

          {/* Items */}
          {order.items.map((item, index) => {
            const employees = readEmployees(item.specs || {});
            const specs = visibleSpecs(item.specs || {});
            const extraLabels = [...new Set(employees.flatMap((person) => Object.keys(person.extras || {})))];
            return (
              <Card key={`${item.name}-${index}`} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-zinc-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#2884b8]">
                      <Icon name="layers" className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-zinc-900 truncate">{item.name}</h2>
                      <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                        {item.quantity} cards · ${item.unitPrice.toFixed(2)} each
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-zinc-500">Line total</p>
                    <p className="text-sm font-semibold text-zinc-900 tabular-nums">${item.totalPrice.toFixed(2)}</p>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Card design</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        ["Front", item.thumbnail],
                        ["Back", item.backThumbnail || ""],
                      ].map(([label, src]) => (
                        <div key={label} className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-2">
                          <p className="px-1 pb-1.5 text-xs font-semibold text-zinc-500">{label}</p>
                          <div className="rounded-lg bg-[#111318] p-4 flex items-center justify-center min-h-[180px]">
                            {src ? (
                              <img src={src} alt={`${item.name} ${label}`} className="max-w-full max-h-[220px] object-contain rounded-md shadow-xl" />
                            ) : (
                              <p className="text-xs text-zinc-400 text-center px-2">
                                {label === "Back" ? "Back was not saved with this order." : "No preview saved."}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {specs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Specifications</p>
                      <div className="flex flex-wrap gap-2">
                        {specs.map(([key, value]) => (
                          <span key={key} className="inline-flex items-center gap-1 rounded-lg bg-[#f0f8fd] border border-[#dbeefb] px-2.5 py-1 text-xs text-[#1b5b80]">
                            <span className="font-semibold capitalize">{key}:</span> {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Employee sheet</p>
                      <span className="text-xs font-medium text-zinc-500 tabular-nums">
                        {employees.length ? `${employees.length} people` : "No sheet uploaded"}
                      </span>
                    </div>
                    {employees.length > 0 ? (
                      <div className={cx(table.wrap, "rounded-xl border border-zinc-200/80")}>
                        <table className={table.table}>
                          <thead className={table.thead}>
                            <tr>
                              {["Name", "Title", "Phone", "Email", "Address", "Website", ...extraLabels].map((label) => (
                                <th key={label} className={cx(table.th, "px-3 py-2.5")}>{label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className={table.tbody}>
                            {employees.map((person, personIndex) => {
                              const cells = [person.name, person.title, person.phone, person.email, person.address, person.website, ...extraLabels.map((label) => person.extras?.[label])];
                              return (
                                <tr key={`${person.email || person.name}-${personIndex}`} className={table.tr}>
                                  {cells.map((value, cellIndex) => (
                                    <td key={cellIndex} className={`px-3 py-2 whitespace-nowrap ${cellIndex === 0 ? "font-medium text-zinc-900" : "text-zinc-600"}`}>
                                      {value || "—"}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl px-3.5 py-2.5">
                        This order was placed without an employee spreadsheet.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Communication history */}
          <Card>
            <CardHeader icon="messages" title="Communication history" subtitle="Internal notes on this order." />
            <div className="p-5 sm:p-6 space-y-4">
              {(order.messages || []).length === 0 ? (
                <p className="text-sm text-zinc-500">No internal notes yet.</p>
              ) : (
                <ol className="space-y-3">
                  {(order.messages || []).map((entry, index) => (
                    <li key={`${entry.createdAt}-${index}`} className="flex gap-3">
                      <Avatar name={entry.author || "?"} size="sm" />
                      <div className="flex-1 min-w-0 rounded-xl rounded-tl-sm bg-[#f0f8fd] border border-[#dbeefb] px-3.5 py-2.5">
                        <p className="text-xs text-zinc-500">
                          <span className="font-semibold text-zinc-700">{entry.author}</span> · {new Date(entry.createdAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-zinc-800 mt-1 whitespace-pre-wrap break-words">{entry.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <div className="flex gap-2">
                <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add an internal note" className={cx(inputClass, "flex-1 min-w-0")} />
                <Button variant="secondary" onClick={sendMessage} disabled={saving} icon="plus">Add</Button>
              </div>
            </div>
          </Card>

          {/* Reprint */}
          <Card>
            <CardHeader icon="refresh" title="Vendor-fault reprint" subtitle="The reprint cost is taken from this vendor’s payout balance, not the platform margin." />
            <div className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative sm:w-32">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
                  <input value={reprintAmount} onChange={(event) => setReprintAmount(event.target.value)} type="number" step="0.01" placeholder="Cost" className={cx(inputClass, "pl-7 tabular-nums")} />
                </div>
                <input value={reprintNote} onChange={(event) => setReprintNote(event.target.value)} placeholder="What went wrong" className={cx(inputClass, "flex-1 min-w-0 sm:min-w-[180px]")} />
                <Button variant="danger" onClick={flagReprint} disabled={saving || order.reprint?.flagged} icon="ban">Flag reprint</Button>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-6 min-w-0">
          {/* Payment summary */}
          <Card>
            <CardHeader icon="dollar" title="Payment" />
            <dl className="px-5 sm:px-6 py-3 divide-y divide-zinc-100">
              <InfoRow label="Subtotal"><span className="tabular-nums">${order.subtotal.toFixed(2)}</span></InfoRow>
              <InfoRow label="Shipping"><span className="tabular-nums">{order.shippingCost === 0 ? "Free" : `$${order.shippingCost.toFixed(2)}`}</span></InfoRow>
              {order.discount > 0 && (
                <InfoRow label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}>
                  <span className="tabular-nums text-emerald-700">-${order.discount.toFixed(2)}</span>
                </InfoRow>
              )}
              <InfoRow label={<span className="font-semibold text-zinc-900">Total</span>}>
                <span className="text-base font-semibold tabular-nums">${order.totalAmount.toFixed(2)}</span>
              </InfoRow>
            </dl>
            {(order.trackingNumber || order.notes) && (
              <div className="mx-5 sm:mx-6 mb-5 space-y-2 rounded-xl bg-zinc-50 px-3.5 py-3 text-xs text-zinc-600">
                {order.trackingNumber && (
                  <p className="flex items-start gap-2">
                    <Icon name="truck" className="w-4 h-4 shrink-0 text-[#329AD4]" />
                    <span>Tracking: {order.trackingCarrier ? `${order.trackingCarrier} ` : ""}<span className="font-mono">{order.trackingNumber}</span></span>
                  </p>
                )}
                {order.notes && (
                  <p className="flex items-start gap-2">
                    <Icon name="messages" className="w-4 h-4 shrink-0 text-[#329AD4]" />
                    <span>Note: {order.notes}</span>
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader icon="users" title="Customer" />
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={customerName || "Guest"} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{customerName || "Guest"}</p>
                  {customerEmail && <p className="text-xs text-zinc-500 truncate">{customerEmail}</p>}
                  {order.userId?.phone && <p className="text-xs text-zinc-500">{order.userId.phone}</p>}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  <Icon name="truck" className="w-3.5 h-3.5" />
                  Ship to
                </p>
                <p className="mt-1.5 text-sm font-semibold text-zinc-900">{order.shippingAddress.name}</p>
                <p className="text-sm text-zinc-600">
                  {order.shippingAddress.line1}
                  {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
                </p>
                <p className="text-sm text-zinc-600">
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip} {order.shippingAddress.country}
                </p>
                {order.shippingAddress.phone && <p className="text-xs text-zinc-500 mt-1">{order.shippingAddress.phone}</p>}
              </div>
            </div>
          </Card>

          {/* Vendor & payout */}
          <Card>
            <CardHeader icon="wallet" title="Vendor & payout" />
            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-zinc-500">Current vendor</p>
                {order.vendorId ? (
                  <div className="mt-2 flex items-center gap-3 min-w-0">
                    <Avatar name={order.vendorId.name || "Vendor"} size="sm" />
                    <div className="min-w-0">
                      <Link href={`/admin/vendors/${order.vendorId._id}`} className="block text-sm font-semibold text-zinc-900 hover:text-[#2884b8] truncate">
                        {order.vendorId.name || "No vendor is assigned."}
                      </Link>
                      {order.vendorId.email && <p className="text-xs text-zinc-500 truncate">{order.vendorId.email}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-zinc-500">No vendor is assigned.</p>
                )}
              </div>

              <dl className="divide-y divide-zinc-100 border-y border-zinc-100">
                {order.assignedAt && <InfoRow label="Assigned">{new Date(order.assignedAt).toLocaleString()}</InfoRow>}
                <InfoRow label="Offered payment">
                  <span className="tabular-nums">{order.vendorPayment ? `$${order.vendorPayment.toFixed(2)}` : "not set"}</span>
                </InfoRow>
                <InfoRow label="Vendor delivered">
                  <Badge tone={order.fulfillmentStatus === "delivered" ? "green" : "gray"}>{order.fulfillmentStatus === "delivered" ? "yes" : "not yet"}</Badge>
                </InfoRow>
                <InfoRow label="Customer confirmed">
                  {order.customerConfirmedAt ? new Date(order.customerConfirmedAt).toLocaleString() : <Badge tone="gray">not yet</Badge>}
                </InfoRow>
              </dl>

              {vendorAcceptance && <p className="text-xs text-zinc-500">{vendorAcceptance}</p>}

              {order.payoutReleasedAt ? (
                <Notice tone="green">Payment released {new Date(order.payoutReleasedAt).toLocaleString()}{order.payoutAmount ? ` · $${order.payoutAmount.toFixed(2)}` : ""}</Notice>
              ) : order.fulfillmentStatus === "delivered" && order.customerConfirmedAt ? (
                <Notice tone="green">Ready to release{order.payoutAmount ? ` · $${order.payoutAmount.toFixed(2)}` : ""}</Notice>
              ) : (
                <Notice tone="brand">Payment waits until the vendor marks it delivered and the customer confirms it.</Notice>
              )}
              {order.reprint?.flagged && (
                <Notice tone="red">Vendor-fault reprint ${order.reprint.amount.toFixed(2)} deducted from the vendor and added to the admin wallet.</Notice>
              )}

              <div className="rounded-xl bg-gradient-to-br from-[#EAF5FB] to-white border border-[#dbeefb] p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1b5b80]">Margin</p>
                <dl className="mt-1 text-sm">
                  <InfoRow label="Customer paid" className="py-1"><span className="tabular-nums">${order.totalAmount.toFixed(2)}</span></InfoRow>
                  <InfoRow label="− vendor" className="py-1"><span className="tabular-nums">${vendorPaid.toFixed(2)}</span></InfoRow>
                  {order.reprint?.flagged && (
                    <InfoRow label="+ reprint" className="py-1"><span className="tabular-nums">${order.reprint.amount.toFixed(2)}</span></InfoRow>
                  )}
                  <InfoRow label={<span className="font-semibold text-[#1b5b80]">= admin</span>} className="py-1 mt-1 border-t border-[#dbeefb] pt-2">
                    <span className="font-semibold text-[#1b5b80] tabular-nums">${adminShare.toFixed(2)}</span>
                  </InfoRow>
                </dl>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
