import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";
import { remindVendorsToMarkDelivered } from "@/lib/vendorPayout";

function plainSpecs(specs: unknown): Record<string, string> {
  if (!specs) return {};
  const entries = specs instanceof Map ? [...specs.entries()] : Object.entries(specs as Record<string, unknown>);
  return Object.fromEntries(entries.map(([key, value]) => [String(key), value == null ? "" : String(value)]));
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;
  void remindVendorsToMarkDelivered(req.nextUrl.origin).catch((error) => {
    console.error("[Delivery] Reminder failed:", error);
  });

  const orders = await Order.find({ vendorId: vendor._id }).sort({ updatedAt: -1 }).lean();
  return NextResponse.json({
    success: true,
    orders: orders.map((order) => ({
      ...order,
      items: (order.items || []).map((item) => ({ ...item, specs: plainSpecs(item.specs) })),
    })),
  });
}
