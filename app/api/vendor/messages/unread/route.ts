import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Message from "@/models/Message";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";

export async function GET() {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;
  const total = await Message.countDocuments({
    partyType: "vendor",
    partyId: vendor._id,
    senderRole: "admin",
    readAt: null,
  });
  return NextResponse.json({ success: true, total });
}
