import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";
import { notifyCustomerOfDelivery, qualifyOrderForPayout } from "@/lib/vendorPayout";
import { publishLive } from "@/lib/messageBus";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;

  const { id } = await params;
  const { status, trackingNumber, trackingCarrier } = await req.json();
  const allowedStatuses = ["in_production", "shipped", "delivered"];
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ success: false, message: "Invalid status update." }, { status: 400 });
  }
  if (status === "shipped" && !String(trackingNumber || "").trim()) {
    return NextResponse.json({ success: false, message: "Enter a tracking number before marking shipped." }, { status: 400 });
  }

  const existing = await Order.findOne({ _id: id, vendorId: vendor._id });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Order not found or unassigned to this vendor." }, { status: 404 });
  }

  existing.fulfillmentStatus = status as typeof existing.fulfillmentStatus;
  if (trackingNumber) existing.trackingNumber = String(trackingNumber);
  if (trackingCarrier) existing.trackingCarrier = String(trackingCarrier);
  if (status === "shipped") existing.shippedAt = new Date();
  if (status === "delivered") existing.deliveredAt = new Date();
  await existing.save();

  if (status === "delivered") {
    await qualifyOrderForPayout(String(existing._id));
    void notifyCustomerOfDelivery(String(existing._id), req.nextUrl.origin).catch((error) => {
      console.error("[Delivery] Customer notice failed:", error);
    });
  }

  publishLive();
  return NextResponse.json({ success: true, order: existing });
}
