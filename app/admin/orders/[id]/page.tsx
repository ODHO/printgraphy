"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import VendorSelect from "../../_components/VendorSelect";

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
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-[#e74b2d] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-white rounded-3xl border border-zinc-200 p-8 max-w-lg">
        <p className="text-base font-semibold text-red-600">{error || "Order not found."}</p>
        <Link href="/admin/orders" className="inline-block mt-4 text-base font-bold text-[#e74b2d]">
          Back to orders
        </Link>
      </div>
    );
  }

  const customerName = order.userId
    ? `${order.userId.firstName || ""} ${order.userId.lastName || ""}`.trim()
    : order.shippingAddress.name;
  const customerEmail = order.userId?.email || order.guestEmail || "";

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-base font-bold text-[#e74b2d]">
            ← Order queue
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 mt-1">{order.orderNumber}</h1>
          <p className="text-base text-zinc-500 mt-1">
            Placed {new Date(order.createdAt).toLocaleString()}
            {order.paidAt ? ` · Paid ${new Date(order.paidAt).toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-base font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            {order.paymentStatus}
          </span>
          <span className="px-2.5 py-1 rounded-full text-base font-bold uppercase bg-zinc-100 text-zinc-700 border border-zinc-200">
            {order.fulfillmentStatus.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-zinc-200/80 p-5 space-y-1">
          <p className="text-base font-bold uppercase tracking-wide text-zinc-400">Customer</p>
          <p className="text-base font-bold text-zinc-900">{customerName || "Guest"}</p>
          {customerEmail && <p className="text-base text-zinc-500">{customerEmail}</p>}
          {order.userId?.phone && <p className="text-base text-zinc-500">{order.userId.phone}</p>}
        </div>
        <div className="bg-white rounded-3xl border border-zinc-200/80 p-5 space-y-1">
          <p className="text-base font-bold uppercase tracking-wide text-zinc-400">Ship to</p>
          <p className="text-base font-bold text-zinc-900">{order.shippingAddress.name}</p>
          <p className="text-base text-zinc-600">
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
          </p>
          <p className="text-base text-zinc-600">
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip} {order.shippingAddress.country}
          </p>
          {order.shippingAddress.phone && <p className="text-base text-zinc-500">{order.shippingAddress.phone}</p>}
        </div>
        <div className="bg-white rounded-3xl border border-zinc-200/80 p-5 space-y-2 text-base text-zinc-600">
          <p className="text-base font-bold uppercase tracking-wide text-zinc-400">Payment</p>
          <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold text-zinc-900">${order.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span className="font-semibold text-zinc-900">{order.shippingCost === 0 ? "Free" : `$${order.shippingCost.toFixed(2)}`}</span></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span><span>-${order.discount.toFixed(2)}</span></div>
          )}
          <div className="flex justify-between pt-2 border-t border-zinc-100 text-base font-black text-zinc-900">
            <span>Total</span><span>${order.totalAmount.toFixed(2)}</span>
          </div>
          {order.trackingNumber && (
            <p className="pt-1 text-zinc-500">
              Tracking: {order.trackingCarrier ? `${order.trackingCarrier} ` : ""}{order.trackingNumber}
            </p>
          )}
          {order.notes && <p className="text-zinc-500">Note: {order.notes}</p>}
        </div>
      </div>

      <section className="bg-white rounded-3xl border border-zinc-200/80 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-zinc-900">Vendor assignment and production</h2>
          {notice && <p className="text-base font-bold text-[#e74b2d]">{notice}</p>}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="text-base font-bold text-zinc-700">Assigned vendor
            <VendorSelect vendors={vendors} value={vendorId} onChange={setVendorId} />
          </div>
          <label className="text-base font-bold text-zinc-700">Vendor payment
            <input value={vendorPayment} onChange={(event) => setVendorPayment(event.target.value)} type="number" step="0.01" min="0" placeholder="Amount the vendor receives" className="mt-1 w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base font-normal" />
          </label>
          <div className="text-base text-zinc-600 space-y-1">
            <p className="font-bold text-zinc-700">Current vendor</p>
            <p>{order.vendorId?.name || "No vendor is assigned."}</p>
            {order.vendorId?.email && <p>{order.vendorId.email}</p>}
            {order.assignedAt && <p>Assigned {new Date(order.assignedAt).toLocaleString()}</p>}
            <p>Offered payment: {order.vendorPayment ? `$${order.vendorPayment.toFixed(2)}` : "not set"}</p>
            <p>{order.vendorAgreedAt ? `Vendor accepted ${new Date(order.vendorAgreedAt).toLocaleString()}` : order.vendorId && order.fulfillmentStatus === "pending" ? "Waiting for the vendor to accept this payment." : ""}</p>
            <p>Vendor delivered: {order.fulfillmentStatus === "delivered" ? "yes" : "not yet"}</p>
            <p>Customer confirmed: {order.customerConfirmedAt ? new Date(order.customerConfirmedAt).toLocaleString() : "not yet"}</p>
            {order.payoutReleasedAt ? (
              <p className="font-bold text-emerald-700">Payment released {new Date(order.payoutReleasedAt).toLocaleString()}{order.payoutAmount ? ` · $${order.payoutAmount.toFixed(2)}` : ""}</p>
            ) : order.fulfillmentStatus === "delivered" && order.customerConfirmedAt ? (
              <p className="font-bold text-emerald-700">Ready to release{order.payoutAmount ? ` · $${order.payoutAmount.toFixed(2)}` : ""}</p>
            ) : (
              <p>Payment waits until the vendor marks it delivered and the customer confirms it.</p>
            )}
            {order.reprint?.flagged && <p className="font-bold text-red-600">Vendor-fault reprint ${order.reprint.amount.toFixed(2)} deducted from the vendor and added to the admin wallet.</p>}
            <p className="font-bold text-zinc-800">
              Customer paid ${order.totalAmount.toFixed(2)} − vendor ${Number(order.vendorPayment || 0).toFixed(2)}
              {order.reprint?.flagged ? ` + reprint $${order.reprint.amount.toFixed(2)}` : ""}
              {" = admin "}
              ${(order.totalAmount - Number(order.vendorPayment || 0) + (order.reprint?.flagged ? order.reprint.amount : 0)).toFixed(2)}
            </p>
          </div>
          <label className="text-base font-bold text-zinc-700 lg:col-span-2">Production notes
            <textarea value={productionNotes} onChange={(event) => setProductionNotes(event.target.value)} rows={3} className="mt-1 w-full bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base font-normal" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveFulfillment} disabled={saving} className="rounded-xl bg-[#e74b2d] px-4 py-2 text-base font-bold text-white cursor-pointer disabled:opacity-60">
            {saving ? "Saving..." : "Save assignment and notes"}
          </button>
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
            className="rounded-xl bg-emerald-700 px-4 py-2 text-base font-bold text-white cursor-pointer disabled:opacity-50"
          >
            Release payment to vendor
          </button>
        </div>

        <div className="border-t border-zinc-100 pt-4 space-y-3">
          <p className="text-base font-bold text-zinc-700">Communication history</p>
          {(order.messages || []).length === 0 ? (
            <p className="text-base text-zinc-500">No internal notes yet.</p>
          ) : (order.messages || []).map((entry, index) => (
            <div key={`${entry.createdAt}-${index}`} className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
              <p className="text-base font-bold text-zinc-500">{entry.author} · {new Date(entry.createdAt).toLocaleString()}</p>
              <p className="text-base text-zinc-800 mt-1">{entry.body}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add an internal note" className="flex-1 bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base" />
            <button type="button" onClick={sendMessage} disabled={saving} className="rounded-xl border border-zinc-200 px-3 py-2 text-base font-bold cursor-pointer">Add</button>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-4 space-y-2">
          <p className="text-base font-bold text-zinc-700">Vendor-fault reprint</p>
          <p className="text-base text-zinc-500">The reprint cost is taken from this vendor’s payout balance, not the platform margin.</p>
          <div className="flex flex-wrap gap-2">
            <input value={reprintAmount} onChange={(event) => setReprintAmount(event.target.value)} type="number" step="0.01" placeholder="Cost" className="w-28 bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base" />
            <input value={reprintNote} onChange={(event) => setReprintNote(event.target.value)} placeholder="What went wrong" className="flex-1 min-w-[180px] bg-[#fbfaf7] border border-zinc-200 rounded-xl px-3 py-2 text-base" />
            <button type="button" onClick={flagReprint} disabled={saving || order.reprint?.flagged} className="rounded-xl bg-red-600 px-3 py-2 text-base font-bold text-white cursor-pointer disabled:opacity-50">Flag reprint</button>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {order.items.map((item, index) => {
          const employees = readEmployees(item.specs || {});
          const specs = visibleSpecs(item.specs || {});
          return (
            <section key={`${item.name}-${index}`} className="bg-white rounded-3xl border border-zinc-200/80 p-5 sm:p-6 space-y-5">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-[560px] shrink-0">
                  <p className="text-base font-bold uppercase tracking-wide text-zinc-400 mb-2">Card design</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      ["Front", item.thumbnail],
                      ["Back", item.backThumbnail || ""],
                    ].map(([label, src]) => (
                      <div key={label}>
                        <p className="text-base font-bold text-zinc-500 mb-1.5">{label}</p>
                        <div className="rounded-2xl bg-[#111318] p-4 flex items-center justify-center min-h-[180px]">
                          {src ? (
                            <img src={src} alt={`${item.name} ${label}`} className="max-w-full max-h-[220px] object-contain rounded-lg shadow-xl" />
                          ) : (
                            <p className="text-base text-zinc-400 text-center px-2">
                              {label === "Back" ? "Back was not saved with this order." : "No preview saved."}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900">{item.name}</h2>
                      <p className="text-base text-zinc-500 mt-1">
                        {item.quantity} cards · ${item.unitPrice.toFixed(2)} each · ${item.totalPrice.toFixed(2)} line total
                      </p>
                    </div>
                  </div>
                  {specs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {specs.map(([key, value]) => (
                        <span key={key} className="px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-base text-zinc-700">
                          <span className="font-bold capitalize">{key}:</span> {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-base font-bold uppercase tracking-wide text-zinc-400">Employee sheet</p>
                  <span className="text-base font-semibold text-zinc-500">
                    {employees.length ? `${employees.length} people` : "No sheet uploaded"}
                  </span>
                </div>
                {employees.length > 0 ? (
                  <div className="overflow-auto rounded-2xl border border-zinc-200">
                    <table className="w-full text-left text-base">
                      <thead className="bg-zinc-50 text-zinc-500">
                        <tr>
                          {["Name", "Title", "Phone", "Email", "Address", "Website", ...[...new Set(employees.flatMap((person) => Object.keys(person.extras || {})))]
                            ].map((label) => (
                            <th key={label} className="px-3 py-2 font-semibold whitespace-nowrap">{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((person, personIndex) => {
                          const extraLabels = [...new Set(employees.flatMap((row) => Object.keys(row.extras || {})))];
                          const cells = [person.name, person.title, person.phone, person.email, person.address, person.website, ...extraLabels.map((label) => person.extras?.[label])];
                          return (
                            <tr key={`${person.email || person.name}-${personIndex}`} className="border-t border-zinc-100">
                              {cells.map((value, cellIndex) => (
                                <td key={cellIndex} className={`px-3 py-2 whitespace-nowrap ${cellIndex === 0 ? "font-semibold text-zinc-900" : "text-zinc-600"}`}>
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
                  <p className="text-base text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2">
                    This order was placed without an employee spreadsheet.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
