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
  const order = await Order.findOneAndUpdate(
    {
      _id: id,
      vendorId: vendor._id,
      fulfillmentStatus: { $in: ["assigned", "in_production"] },
    },
    { $set: { fulfillmentStatus: "pending" }, $unset: { vendorId: "" } },
    { new: true }
  );

  if (!order) {
    return NextResponse.json({ success: false, message: "This job can no longer be released." }, { status: 409 });
  }

  if (!vendor.declinedOrderIds.some((entry) => String(entry) === String(order._id))) {
    vendor.declinedOrderIds.push(order._id);
  }
  await vendor.save();
  publishLive();
  return NextResponse.json({ success: true });
}
