import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { publishLive } from "@/lib/messageBus";
import Order from "@/models/Order";
import Vendor from "@/models/Vendor";
import { isErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { syncVendorBalance } from "@/lib/vendorWallet";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;
  const { amount, note } = await req.json();
  const cost = Number(amount);
  if (!cost || cost <= 0) {
    return NextResponse.json({ success: false, message: "Enter the reprint cost." }, { status: 400 });
  }

  const order = await Order.findById(id);
  if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
  if (!order.vendorId) {
    return NextResponse.json({ success: false, message: "Assign a vendor before flagging a reprint." }, { status: 400 });
  }
  if (order.reprint?.flagged) {
    return NextResponse.json({ success: false, message: "This order already has a vendor-fault reprint." }, { status: 400 });
  }

  const vendor = await Vendor.findById(order.vendorId);
  if (!vendor) return NextResponse.json({ success: false, message: "Assigned vendor was not found." }, { status: 404 });

  vendor.wallet.push({
    type: "debit",
    amount: cost,
    orderNumber: order.orderNumber,
    note: `Reprint on ${order.orderNumber}`,
    transferId: "",
    createdAt: new Date(),
  });
  const delivered = await Order.countDocuments({ vendorId: vendor._id, fulfillmentStatus: "delivered" });
  const reprints = await Order.countDocuments({ vendorId: vendor._id, "reprint.flagged": true });
  vendor.metrics.reprintRate = Math.round(((reprints + 1) / Math.max(1, delivered)) * 100);
  await syncVendorBalance(vendor);

  order.reprint = { flagged: true, amount: cost, note: String(note || ""), createdAt: new Date() };
  order.messages = order.messages || [];
  order.messages.push({
    author: auth.email,
    body: `Vendor-fault reprint of $${cost.toFixed(2)} deducted from ${vendor.name}. ${note || ""}`.trim(),
    createdAt: new Date(),
  });
  await order.save();

  publishLive();
  return NextResponse.json({ success: true, order });
}
