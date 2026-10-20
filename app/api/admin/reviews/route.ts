import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";
import Product from "@/models/Product";
import mongoose from "mongoose";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  try {
    const reviews = await Review.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error("[GET /api/admin/reviews] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch reviews." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  await dbConnect();
  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id)) : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: false, message: "Select at least one review." }, { status: 400 });
    }

    const reviews = await Review.find({ _id: { $in: ids } }).select("productId").lean();
    await Review.deleteMany({ _id: { $in: ids } });

    const productIds = [...new Set(reviews.map((review) => String(review.productId || "")).filter(Boolean))];
    for (const productId of productIds) {
      if (!mongoose.Types.ObjectId.isValid(productId)) continue;
      const remaining = await Review.find({ productId, isApproved: true }).lean();
      const count = remaining.length;
      const avg = count > 0 ? Number((remaining.reduce((sum, review) => sum + review.rating, 0) / count).toFixed(1)) : 0;
      await Product.findByIdAndUpdate(productId, { rating: avg, reviewCount: count });
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error("[DELETE /api/admin/reviews] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete reviews." }, { status: 500 });
  }
}
