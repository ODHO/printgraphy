import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";
import Product from "@/models/Product";
import mongoose from "mongoose";
import { requireAdmin, isErrorResponse } from "@/lib/adminAuth";

async function refreshProductRating(productId: unknown) {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId.toString())) return;
  const remaining = await Review.find({ productId, isApproved: true }).lean();
  const count = remaining.length;
  const avg = count > 0 ? Number((remaining.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1)) : 0;
  await Product.findByIdAndUpdate(productId, { rating: avg, reviewCount: count });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  await dbConnect();

  try {
    const body = await req.json();
    const adminReply = String(body.adminReply ?? "").trim();
    const review = await Review.findByIdAndUpdate(
      id,
      { adminReply, adminRepliedAt: adminReply ? new Date() : null },
      { new: true }
    ).lean();

    if (!review) {
      return NextResponse.json({ success: false, message: "Review not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("[PATCH /api/admin/reviews/[id]] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to save reply." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { id } = await params;
  await dbConnect();

  try {
    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return NextResponse.json({ success: false, message: "Review not found." }, { status: 404 });
    }

    // Recalculate Product Rating & Count if productId is valid ObjectId
    await refreshProductRating(review.productId);

    return NextResponse.json({ success: true, message: "Review deleted successfully." });
  } catch (error) {
    console.error("[DELETE /api/admin/reviews/[id]] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete review." }, { status: 500 });
  }
}
