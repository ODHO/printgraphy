import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { catalogImageFor } from "@/lib/catalogImages";

// GET /api/products — public endpoint
export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search") ?? "";

  const filter: Record<string, unknown> = { isActive: true };
  if (categoryId) filter.categoryId = categoryId;
  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: pattern }, { description: pattern }, { slug: pattern }];
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("categoryId", "name slug")
      .lean(),
    Product.countDocuments(filter),
  ]);

  const themedProducts = products.map((product) => ({
    ...product,
    image: catalogImageFor(product.name, product.slug),
  }));

  return NextResponse.json({
    success: true,
    products: themedProducts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
