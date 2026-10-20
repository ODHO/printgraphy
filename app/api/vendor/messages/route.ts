import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";
import { addMessage, prepareMessage, readThread } from "@/lib/messaging";

export async function GET() {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;
  const messages = await readThread("vendor", String(vendor._id), "vendor");
  return NextResponse.json({ success: true, messages });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;
  const body = await req.json();
  const cleaned = prepareMessage(body.body, body.attachmentUrl, body.attachmentName);
  if ("error" in cleaned) return NextResponse.json({ success: false, message: cleaned.error }, { status: 400 });
  const message = await addMessage("vendor", String(vendor._id), "vendor", cleaned.text, cleaned.attachment);
  return NextResponse.json({ success: true, message });
}
