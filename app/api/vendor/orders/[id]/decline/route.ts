import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";
import { publishLive } from "@/lib/messageBus";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;

  const { id } = await params;
  const offer = await Order.findOne({
    _id: id,
    vendorId: vendor._id,
    fulfillmentStatus: "pending",
  });
  if (offer) {
    await Order.updateOne({ _id: offer._id }, { $unset: { vendorId: "", vendorAgreedAt: "" }, $set: { fulfillmentStatus: "pending" } });
    if (!vendor.declinedOrderIds.some((entry) => String(entry) === String(offer._id))) {
      vendor.declinedOrderIds.push(offer._id);
    }
    await vendor.save();
    publishLive();
    return NextResponse.json({ success: true });
  }

  const order = await Order.findOne({
    _id: id,
    fulfillmentStatus: "pending",
    $or: [{ vendorId: { $exists: false } }, { vendorId: null }],
  }).select("_id");

  if (!order) {
    return NextResponse.json({ success: false, message: "That order is no longer available." }, { status: 409 });
  }

  if (!vendor.declinedOrderIds.some((entry) => String(entry) === String(order._id))) {
    vendor.declinedOrderIds.push(order._id);
  }
  await vendor.save();
  publishLive();
  return NextResponse.json({ success: true });
}
