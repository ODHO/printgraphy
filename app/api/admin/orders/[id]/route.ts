import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import { Types } from "mongoose";
import { qualifyOrderForPayout } from "@/lib/vendorPayout";
import Vendor from "@/models/Vendor";
import { sendVendorOfferEmail } from "@/lib/mailer";
import { publishLive } from "@/lib/messageBus";

function plainSpecs(specs: unknown): Record<string, string> {
  if (!specs) return {};
  const entries = specs instanceof Map ? [...specs.entries()] : Object.entries(specs as Record<string, unknown>);
  return Object.fromEntries(entries.map(([key, value]) => [String(key), value == null ? "" : String(value)]));
}

// GET /api/admin/orders/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  await dbConnect();

  const { id } = await params;
  const order = await Order.findById(id)
    .populate("userId", "firstName lastName email phone")
    .populate("vendorId", "name email phone marketsCovered status")
    .lean();

  if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });

  const items = (order.items || []).map((item) => ({
    ...item,
    specs: plainSpecs(item.specs),
  }));

  return NextResponse.json({ success: true, order: { ...order, items } });
}

// PUT /api/admin/orders/[id] — update fulfillment status, tracking, notes, vendor
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;
  await dbConnect();

  const { id } = await params;
  const body = await req.json();

  const allowed = ["fulfillmentStatus", "trackingNumber", "trackingCarrier", "notes", "productionNotes", "shippedAt", "deliveredAt"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  const payment = Number(body.vendorPayment);
  if ("vendorId" in body) {
    if (!body.vendorId) {
      updates.vendorId = null;
      updates.vendorAgreedAt = null;
    } else if (Types.ObjectId.isValid(body.vendorId)) {
      updates.vendorId = new Types.ObjectId(body.vendorId);
    }
  }
  if (Number.isFinite(payment) && payment > 0) {
    updates.vendorPayment = payment;
    updates.payoutAmount = payment;
  }

  const current = await Order.findById(id).select("vendorId fulfillmentStatus payoutReleasedAt");
  if (!current) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
  if (current.payoutReleasedAt) {
    delete updates.payoutAmount;
    delete updates.vendorPayment;
  }

  const vendorChanged = updates.vendorId && String(updates.vendorId) !== String(current.vendorId || "");
  const stillEarly = current.fulfillmentStatus === "pending" || current.fulfillmentStatus === "assigned";
  if (vendorChanged && stillEarly) {
    if (!(Number(updates.vendorPayment) > 0)) {
      return NextResponse.json({ success: false, message: "Enter the payment the vendor will receive for this order." }, { status: 400 });
    }
    updates.fulfillmentStatus = "pending";
    updates.vendorAgreedAt = null;
    updates.assignedAt = null;
  }

  if (updates.fulfillmentStatus === "delivered" && !updates.deliveredAt) {
    updates.deliveredAt = new Date();
  }

  const order = await Order.findByIdAndUpdate(id, updates, { new: true });
  if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
  if (order.fulfillmentStatus === "delivered") await qualifyOrderForPayout(id);

  if (vendorChanged && order.vendorId && order.fulfillmentStatus === "pending") {
    const vendor = await Vendor.findById(order.vendorId).select("email name").lean();
    if (vendor?.email) {
      void sendVendorOfferEmail(
        vendor.email,
        vendor.name,
        order.orderNumber,
        Number(order.vendorPayment || 0),
        `${req.nextUrl.origin}/vendor/dashboard`
      );
    }
  }

  publishLive();
  return NextResponse.json({ success: true, order });
}
