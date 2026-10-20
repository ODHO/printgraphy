import { NextRequest, NextResponse } from "next/server";
import { publishLive } from "@/lib/messageBus";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;

  if (vendor.status !== "active" || !vendor.isAvailable) {
    return NextResponse.json({ success: false, message: "Turn availability on before accepting orders." }, { status: 403 });
  }

  const { id } = await params;
  const offer = await Order.findOne({
    _id: id,
    vendorId: vendor._id,
    fulfillmentStatus: "pending",
    vendorPayment: { $gt: 0 },
  });
  if (offer) {
    offer.fulfillmentStatus = "assigned";
    offer.assignedAt = new Date();
    offer.vendorAgreedAt = new Date();
    offer.payoutAmount = offer.vendorPayment;
    await offer.save();
    publishLive();
    return NextResponse.json({ success: true, message: "You accepted this order.", order: offer });
  }

  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: id,
      fulfillmentStatus: "pending",
      paymentStatus: "paid",
      $or: [{ vendorId: { $exists: false } }, { vendorId: null }],
    },
    {
      $set: {
        vendorId: vendor._id,
        fulfillmentStatus: "assigned",
        assignedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!updatedOrder) {
    return NextResponse.json(
      { success: false, message: "Order already claimed by another vendor or unavailable." },
      { status: 409 }
    );
  }

  publishLive();
  return NextResponse.json({
    success: true,
    message: "Order successfully claimed!",
    order: updatedOrder,
  });
}
