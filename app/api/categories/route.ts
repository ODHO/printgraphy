import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";

// GET /api/categories — public endpoint
export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = req.nextUrl;
  const canvasType = searchParams.get("canvas_type");

  const filter: Record<string, unknown> = { isActive: true };
  if (canvasType === "flat" || canvasType === "dieline" || canvasType === "mockup") {
    filter.canvas_type = canvasType;
  }

  const categories = await Category.find(filter)
    .sort({ sortOrder: 1, name: 1 })
    .select("-__v")
    .lean();

  return NextResponse.json({ success: true, categories });
}
