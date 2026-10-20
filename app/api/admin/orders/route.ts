import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import { remindVendorsToMarkDelivered } from "@/lib/vendorPayout";

// GET /api/admin/orders
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  void remindVendorsToMarkDelivered(req.nextUrl.origin).catch((error) => {
    console.error("[Delivery] Reminder failed:", error);
  });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const status = searchParams.get("status") ?? "";
  const paymentStatus = searchParams.get("paymentStatus") ?? "";
  const search = searchParams.get("search") ?? "";

  const market = searchParams.get("market") ?? "";
  const category = searchParams.get("category") ?? "";
  const sla = searchParams.get("sla") ?? "";

  const filter: Record<string, unknown> = {};
  const clauses: Record<string, unknown>[] = [];
  if (status) filter.fulfillmentStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) clauses.push({ orderNumber: { $regex: search, $options: "i" } });
  if (market) clauses.push({ "shippingAddress.state": { $regex: market, $options: "i" } });
  if (category) clauses.push({ "items.name": { $regex: category, $options: "i" } });
  if (sla === "risk") {
    const acceptBy = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const produceBy = new Date(Date.now() - 48 * 60 * 60 * 1000);
    clauses.push({
      $or: [
        { fulfillmentStatus: "pending", createdAt: { $lt: acceptBy } },
        { fulfillmentStatus: { $in: ["assigned", "in_production"] }, createdAt: { $lt: produceBy } },
      ],
    });
  }
  if (clauses.length) filter.$and = clauses;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "firstName lastName email")
      .populate("vendorId", "name")
      .lean(),
    Order.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
