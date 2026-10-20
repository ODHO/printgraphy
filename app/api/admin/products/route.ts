import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";
import Product from "@/models/Product";

// GET /api/admin/products
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId");

  const filter: Record<string, unknown> = {};
  if (search) filter.name = { $regex: search, $options: "i" };
  if (categoryId) filter.categoryId = categoryId;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("categoryId", "name slug")
      .lean(),
    Product.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/admin/products
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  try {
    const body = await req.json();
    const {
      name,
      slug,
      description,
      categoryId,
      price,
      unitPrice,
      image,
      rating,
      reviewCount,
      isActive,
      tags,
      variations,
    } = body;

    if (!name || !slug || price === undefined) {
      return NextResponse.json(
        { success: false, message: "name, slug, and price are required." },
        { status: 400 }
      );
    }

    const product = await Product.create({
      name,
      slug: slug.toLowerCase().replace(/\s+/g, "-"),
      description: description ?? "",
      categoryId: categoryId ?? undefined,
      price,
      unitPrice: unitPrice ?? "",
      image: image ?? "",
      rating: rating ?? 4.5,
      reviewCount: reviewCount ?? 0,
      isActive: isActive ?? true,
      tags: tags ?? [],
      variations: variations ?? [],
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { success: false, message: "A product with that slug already exists." },
        { status: 409 }
      );
    }
    console.error("[Admin/Products POST]", err);
    return NextResponse.json(
      { success: false, message: "Failed to create product." },
      { status: 500 }
    );
  }
}
