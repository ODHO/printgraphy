import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";
import Product from "@/models/Product";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";

// GET /api/admin/pricing — Get all product benchmarks vs vendor costs
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const [products, vendorProducts] = await Promise.all([
    Product.find({ isActive: true }).select("name price slug categoryId").lean(),
    VendorProduct.find().populate("vendorId", "name email").populate("productId", "name price").lean(),
  ]);

  return NextResponse.json({
    success: true,
    products,
    vendorProducts,
  });
}
