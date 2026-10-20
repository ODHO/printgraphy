import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import Order from "@/models/Order";
import { isErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { orderMoneySplit, vendorWallet } from "@/lib/vendorWallet";

export async function GET() {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const vendors = await Vendor.find().sort({ name: 1 });
  const rows = await Promise.all(vendors.map(async (vendor) => {
    const wallet = await vendorWallet(vendor);
    return {
      _id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      stripeAccountId: vendor.stripeAccountId || "",
      stripePublishableKey: vendor.stripePublishableKey || "",
      accountHolderName: vendor.accountHolderName || "",
      available: wallet.available,
      pending: wallet.pending,
      withdrawn: wallet.withdrawn,
    };
  }));

  const totals = rows.reduce((sum, row) => ({
    available: sum.available + row.available,
    pending: sum.pending + row.pending,
    withdrawn: sum.withdrawn + row.withdrawn,
  }), { available: 0, pending: 0, withdrawn: 0 });

  const paidOrders = await Order.find({ paymentStatus: "paid" })
    .select("orderNumber totalAmount vendorPayment payoutAmount reprint vendorId payoutReleasedAt")
    .populate("vendorId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const orders = paidOrders.map((order) => {
    const split = orderMoneySplit(order);
    const vendor = order.vendorId && typeof order.vendorId === "object" && "name" in order.vendorId
      ? String((order.vendorId as { name?: string }).name || "")
      : "";
    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      vendor,
      released: Boolean(order.payoutReleasedAt),
      ...split,
    };
  });

  const platform = orders.reduce((sum, order) => ({
    collected: sum.collected + order.customerPaid,
    vendorShare: sum.vendorShare + order.vendorNet,
    adminWallet: sum.adminWallet + order.adminKeeps,
    reprints: sum.reprints + order.reprint,
  }), { collected: 0, vendorShare: 0, adminWallet: 0, reprints: 0 });

  return NextResponse.json({ success: true, vendors: rows, totals, orders: orders.slice(0, 40), platform });
}
