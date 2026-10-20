import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";
import { notifyAdmin } from "@/lib/adminNotify";
import Product from "@/models/Product";
import Category from "@/models/Category";
import User from "@/models/User";
import { getSession } from "@/lib/session";
import mongoose from "mongoose";

/**
 * Resolves all database variants for a given productId (ObjectId, string ID, slug).
 */
async function getProductOrs(productId: string) {
  const isObjectId = mongoose.Types.ObjectId.isValid(productId);
  const ors: any[] = [{ productId: String(productId) }];
  if (isObjectId) {
    ors.push({ productId: new mongoose.Types.ObjectId(productId) });
  }

  try {
    const objId = isObjectId ? new mongoose.Types.ObjectId(productId) : null;
    const query = objId ? { $or: [{ _id: objId }, { slug: productId }] } : { slug: productId };

    const [prod, cat] = await Promise.all([
      Product.findOne(query).lean(),
      Category.findOne(query).lean(),
    ]);

    const found = prod || cat;
    if (found) {
      if (found._id) {
        ors.push({ productId: String(found._id) });
        if (mongoose.Types.ObjectId.isValid(found._id)) {
          ors.push({ productId: new mongoose.Types.ObjectId(found._id) });
        }
      }
      if ((found as any).slug) {
        ors.push({ productId: String((found as any).slug) });
      }
    }
  } catch {
    /* ignore lookup failure */
  }

  return ors;
}

export async function GET(req: NextRequest) {
  await dbConnect();
  const session = await getSession();
  const { searchParams } = req.nextUrl;
  const productId = searchParams.get("productId") || "business-cards";

  const productOrs = await getProductOrs(productId);
  const query = { $or: productOrs, isApproved: true };
  const reviews = await Review.find(query).sort({ createdAt: -1 }).lean();

  let hasUserReviewed = false;
  if (session?.userId) {
    const existing = await Review.findOne({
      $and: [
        { $or: productOrs },
        {
          $or: [
            { userId: session.userId },
            { userId: new mongoose.Types.ObjectId(session.userId) },
            { userId: String(session.userId) },
          ],
        },
      ],
    });
    if (existing) hasUserReviewed = true;
  }

  return NextResponse.json({ success: true, reviews, hasUserReviewed });
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const session = await getSession();

  // Require user authentication for submitting reviews
  if (!session?.userId) {
    return NextResponse.json(
      {
        success: false,
        message: "You must be signed in to post a review. Guest users cannot post reviews.",
      },
      { status: 401 }
    );
  }

  const user = await User.findById(session.userId).lean();
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "User account not found. Please sign in to write a review.",
      },
      { status: 401 }
    );
  }

  const userId = user._id;
  let userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Verified Customer";

  const body = await req.json();
  const { productId, rating, title, comment, role, name } = body;

  if (name && name.trim()) {
    userName = name.trim();
  }

  if (!productId || !rating || !comment) {
    return NextResponse.json(
      { success: false, message: "Product ID, rating (1-5), and review comment are required." },
      { status: 400 }
    );
  }

  const productOrs = await getProductOrs(String(productId));

  // Build query to check if user has already submitted a review for this product
  const userCheckOrs: any[] = [
    { userId },
    { userId: new mongoose.Types.ObjectId(userId) },
    { userId: String(userId) },
  ];
  if (userName) {
    userCheckOrs.push({
      userName: { $regex: new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
  }

  const existingReview = await Review.findOne({
    $and: [
      { $or: productOrs },
      { $or: userCheckOrs },
    ],
  });

  if (existingReview) {
    return NextResponse.json(
      {
        success: false,
        message: "You have already submitted a review for this product. Only one review per user is allowed.",
      },
      { status: 400 }
    );
  }

  // Create new review document
  const review = await Review.create({
    productId,
    userId,
    userName,
    role: role || "Verified Customer",
    rating: Number(rating),
    title: title || "",
    comment,
    isApproved: true,
  });

  void notifyAdmin("review", {
    userName: String(userName || ""),
    rating: String(rating),
    title: String(title || ""),
    comment: String(comment || ""),
    productId: String(productId || ""),
  });

  // Recalculate Product Rating Average if productId corresponds to a valid Product
  const isObjectId = mongoose.Types.ObjectId.isValid(productId);
  if (isObjectId) {
    const allReviews = await Review.find({ $or: productOrs, isApproved: true }).lean();
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / (allReviews.length || 1);
    await Product.findByIdAndUpdate(productId, {
      rating: Number(avgRating.toFixed(1)),
      reviewCount: allReviews.length,
    });
  }

  return NextResponse.json(
    { success: true, review, message: "Thank you! Your review has been published." },
    { status: 201 }
  );
}
