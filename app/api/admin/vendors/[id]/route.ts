import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import VendorProduct from "@/models/VendorProduct";
import Order from "@/models/Order";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";

// GET /api/admin/vendors/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;
  const vendor = await Vendor.findById(id).lean();
  if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found." }, { status: 404 });

  const [orders, costs] = await Promise.all([
    Order.find({ vendorId: vendor._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("orderNumber fulfillmentStatus totalAmount createdAt shippingAddress reprint customerConfirmedAt payoutQualifiedAt payoutReleasedAt payoutAmount")
      .lean(),
    VendorProduct.find({ vendorId: vendor._id }).lean(),
  ]);
  const costIds = costs.map((cost) => cost.productId);
  const [categoryNames, productNames] = await Promise.all([
    Category.find({ _id: { $in: costIds } }).select("name price").lean(),
    Product.find({ _id: { $in: costIds } }).select("name price").lean(),
  ]);
  const named = new Map<string, { name: string; price: number }>();
  categoryNames.forEach((category) => named.set(String(category._id), { name: category.name, price: category.price || 0 }));
  productNames.forEach((product) => named.set(String(product._id), { name: product.name, price: product.price }));
  const namedCosts = costs.map((cost) => ({
    ...cost,
    productId: named.get(String(cost.productId)) || { name: "Category", price: 0 },
  }));

  const accepted = await Order.countDocuments({ vendorId: vendor._id });
  const declined = vendor.declinedOrderIds?.length || 0;
  const delivered = orders.filter((order) => order.fulfillmentStatus === "delivered");
  const reprints = await Order.countDocuments({ vendorId: vendor._id, "reprint.flagged": true });

  return NextResponse.json({
    success: true,
    vendor,
    orders,
    costs: namedCosts,
    performance: {
      acceptanceRate: accepted + declined === 0 ? 100 : Math.round((accepted / (accepted + declined)) * 100),
      onTimePercentage: vendor.metrics?.onTimePercentage ?? 100,
      reprintRate: accepted === 0 ? 0 : Math.round((reprints / accepted) * 100),
      avgTurnaroundHours: vendor.metrics?.avgTurnaroundHours ?? 48,
      openJobs: orders.filter((order) => !["delivered", "cancelled"].includes(order.fulfillmentStatus)).length,
      deliveredJobs: delivered.length,
    },
  });
}

// PUT /api/admin/vendors/[id] — Update vendor status, markets, categories
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;
  const body = await req.json();

  const allowed = ["name", "contactName", "email", "phone", "marketsCovered", "categoriesFulfilled", "status", "isAvailable", "capacityPerWeek", "stripeAccountId"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }

  const vendor = await Vendor.findByIdAndUpdate(id, updates, { new: true });
  if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found." }, { status: 404 });

  return NextResponse.json({ success: true, vendor });
}

// DELETE /api/admin/vendors/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  const { id } = await params;
  await Vendor.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
