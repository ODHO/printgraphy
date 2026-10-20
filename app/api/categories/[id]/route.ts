import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";

/** GET /api/categories/[id] — public category by slug or ObjectId (apparel / cards) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const decoded = decodeURIComponent(id || "").trim();
  if (!decoded) {
    return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
  }

  const or: Record<string, unknown>[] = [{ slug: decoded }, { name: decoded }];
  if (mongoose.Types.ObjectId.isValid(decoded) && decoded.length === 24) {
    or.push({ _id: decoded });
  }

  const category = await Category.findOne({ isActive: true, $or: or })
    .select("-__v")
    .lean();

  if (!category) {
    return NextResponse.json({ success: false, message: "Category not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, category });
}
