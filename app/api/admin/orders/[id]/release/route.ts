import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Vendor from "@/models/Vendor";
import { isErrorResponse, requireAdmin } from "@/lib/adminAuth";
import { qualifyOrderForPayout } from "@/lib/vendorPayout";
import { syncVendorBalance } from "@/lib/vendorWallet";
import { publishLive } from "@/lib/messageBus";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;
  const ready = await qualifyOrderForPayout(id);
  if (!ready) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
  if (ready.fulfillmentStatus !== "delivered" || !ready.customerConfirmedAt) {
    return NextResponse.json({
      success: false,
      message: "Release payment after the vendor marks the order delivered and the customer confirms it.",
    }, { status: 400 });
  }
  if (ready.payoutReleasedAt) {
    return NextResponse.json({ success: false, message: "This payment was already released." }, { status: 400 });
  }

  const vendor = await Vendor.findById(ready.vendorId);
  if (!vendor) return NextResponse.json({ success: false, message: "Assigned vendor was not found." }, { status: 404 });
  const reprint = ready.reprint?.flagged ? Number(ready.reprint.amount || 0) : 0;
  const amount = Number((Number(ready.vendorPayment || ready.payoutAmount || 0) - reprint).toFixed(2));
  if (amount <= 0) {
    return NextResponse.json({ success: false, message: reprint > 0 ? "The reprint is equal to or higher than the vendor payment, so nothing is released to the vendor." : "Set the vendor payment on this order, then release it." }, { status: 400 });
  }

  ready.payoutAmount = amount;
  ready.payoutReleasedAt = new Date();
  ready.vendorCredited = true;
  await ready.save();

  await syncVendorBalance(vendor);
  publishLive();

  return NextResponse.json({
    success: true,
    message: `$${amount.toFixed(2)} added to ${vendor.name}'s wallet.`,
    order: ready,
  });
}
