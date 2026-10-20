import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import VendorProduct from "@/models/VendorProduct";
import { isVendorError, requireVendor } from "@/lib/vendorAuth";

function plainSpecs(specs: unknown): Record<string, string> {
  if (!specs) return {};
  const entries = specs instanceof Map ? [...specs.entries()] : Object.entries(specs as Record<string, unknown>);
  return Object.fromEntries(entries.map(([key, value]) => [String(key), value == null ? "" : String(value)]));
}

function matchesMarket(city: string, state: string, zip: string, markets: string[]) {
  if (!markets.length) return true;
  const hay = `${city} ${state} ${zip}`.toLowerCase();
  return markets.some((market) => {
    const token = market.trim().toLowerCase();
    return token && (hay.includes(token) || token.includes(state.toLowerCase()));
  });
}

export async function GET() {
  await dbConnect();
  const vendor = await requireVendor();
  if (isVendorError(vendor)) return vendor;

  if (vendor.status !== "active" || !vendor.isAvailable) {
    return NextResponse.json({ success: true, orders: [] });
  }

  const declined = new Set((vendor.declinedOrderIds || []).map((id) => String(id)));
  const eligibleProducts = await VendorProduct.find({ vendorId: vendor._id, isEligible: true }).select("productId").lean();
  const eligibleIds = new Set(eligibleProducts.map((entry) => String(entry.productId)));

  const orders = await Order.find({
    fulfillmentStatus: "pending",
    paymentStatus: "paid",
    $or: [{ vendorId: { $exists: false } }, { vendorId: null }],
  })
    .sort({ createdAt: -1 })
    .lean();

  const visible = orders.filter((order) => {
    if (declined.has(String(order._id))) return false;
    const address = order.shippingAddress;
    if (!matchesMarket(address?.city || "", address?.state || "", address?.zip || "", vendor.marketsCovered || [])) {
      return false;
    }
    if (!eligibleIds.size) return true;
    const productIds = (order.items || []).map((item) => item.productId).filter(Boolean).map(String);
    if (!productIds.length) return true;
    return productIds.some((id) => eligibleIds.has(id));
  });

  return NextResponse.json({
    success: true,
    orders: visible.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      notes: order.notes || "",
      shippingAddress: order.shippingAddress,
      items: (order.items || []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        specs: plainSpecs(item.specs),
      })),
    })),
  });
}
