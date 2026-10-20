import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Quote from "@/models/Quote";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";

// GET /api/admin/quotes — Admin list quotes
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (category) filter.category = category;

  const [quotes, total] = await Promise.all([
    Quote.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Quote.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    quotes,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
