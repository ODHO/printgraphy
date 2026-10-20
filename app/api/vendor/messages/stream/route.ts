import dbConnect from "@/lib/mongodb";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";
import { messageStream } from "@/lib/messageBus";

export const dynamic = "force-dynamic";

export async function GET() {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;
  const vendorId = String(vendor._id);
  return messageStream((event) => event.partyType === "vendor" && event.partyId === vendorId);
}
